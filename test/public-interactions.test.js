import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { setupNavigation } from "../navigation.js";
import { setupFaq, setupTextRotator } from "../script.js";

class NodeStub extends EventTarget {
  constructor(root) {
    super();
    this.ownerDocument = root;
    this.children = [];
    this.attributes = new Map();
    this.selectors = new Map();
    this.hidden = false;
    const classes = new Set();
    this.classList = {
      add: (name) => classes.add(name),
      remove: (name) => classes.delete(name),
      contains: (name) => classes.has(name),
      toggle: (name, force = !classes.has(name)) => force ? classes.add(name) : classes.delete(name),
    };
  }
  setAttribute(name, value) { this.attributes.set(name, value); }
  getAttribute(name) { return this.attributes.get(name) ?? null; }
  removeAttribute(name) { this.attributes.delete(name); }
  querySelector(selector) { return this.selectors.get(selector)?.[0] ?? null; }
  querySelectorAll(selector) { return this.selectors.get(selector) ?? []; }
  contains(node) { return node === this || this.children.some((child) => child.contains(node)); }
  focus() { this.ownerDocument.activeElement = this; }
  after(node) { this.control = node; }
  click() { this.dispatchEvent(new Event("click")); }
}

function fixture({ reduced = false, mobile = true } = {}) {
  const root = new NodeStub();
  root.ownerDocument = root;
  root.createElement = () => new NodeStub(root);
  let now = 0;
  let nextId = 0;
  const tasks = new Map();
  const media = new Map();
  const schedule = (callback, delay) => {
    const id = ++nextId;
    tasks.set(id, { at: now + delay, callback });
    return id;
  };
  const view = {
    matchMedia(query) {
      if (!media.has(query)) {
        const value = new EventTarget();
        value.matches = query.includes("reduced-motion") ? reduced : mobile;
        value.change = (matches) => { value.matches = matches; value.dispatchEvent(new Event("change")); };
        media.set(query, value);
      }
      return media.get(query);
    },
    setTimeout: schedule,
    clearTimeout: (id) => tasks.delete(id),
    requestAnimationFrame: (callback) => schedule(callback, 16),
    cancelAnimationFrame: (id) => tasks.delete(id),
  };
  const advance = (ms) => {
    const end = now + ms;
    while (true) {
      const entry = [...tasks].filter(([, task]) => task.at <= end).sort((a, b) => a[1].at - b[1].at)[0];
      if (!entry) break;
      const [id, task] = entry;
      now = task.at;
      tasks.delete(id);
      task.callback();
    }
    now = end;
  };
  return { root, view, advance, tasks, node: () => new NodeStub(root) };
}

test("mobile navigation hides closed links, restores focus on Escape and follows breakpoints", () => {
  const { root, view, node } = fixture();
  const header = node(), nav = node(), toggle = node(), link = node();
  root.selectors.set("[data-header]", [header]);
  header.selectors.set(".nav-toggle", [toggle]);
  header.selectors.set(".site-nav", [nav]);
  nav.selectors.set("a", [link]);
  nav.children = [link];
  header.children = [nav, toggle];
  setupNavigation(root, view);
  assert.equal(nav.inert, true);
  assert.equal(nav.getAttribute("aria-hidden"), "true");
  toggle.click();
  assert.equal(nav.inert, false);
  assert.equal(root.activeElement, link);
  assert.equal(toggle.getAttribute("aria-expanded"), "true");
  const escape = new Event("keydown", { cancelable: true });
  escape.key = "Escape";
  root.dispatchEvent(escape);
  assert.equal(root.activeElement, toggle);
  assert.equal(nav.inert, true);
  assert.equal(escape.defaultPrevented, true);
  const mobile = view.matchMedia("(max-width: 1100px)");
  mobile.change(false);
  assert.equal(nav.inert, false);
  assert.equal(nav.getAttribute("aria-hidden"), null);
  assert.equal(root.activeElement, link);
  mobile.change(true);
  assert.equal(nav.inert, true);
  assert.equal(root.activeElement, toggle);
});

test("rapid FAQ switching and reopening cannot leave a stale visible answer or timer", () => {
  const { root, view, node, advance } = fixture();
  const list = node();
  const items = Array.from({ length: 2 }, () => {
    const item = node(), button = node(), answer = node();
    answer.hidden = true;
    button.selectors.set("span", [node()]);
    item.selectors.set("button", [button]);
    item.selectors.set(".faq-answer", [answer]);
    return { item, button, answer };
  });
  root.selectors.set("[data-faq-list]", [list]);
  list.selectors.set(".faq-item", items.map(({ item }) => item));
  setupFaq(root, view);
  items[0].button.click();
  items[1].button.click(); // Switch before the first animation frame.
  advance(20);
  assert.equal(items[0].answer.classList.contains("is-open"), false);
  assert.equal(items[0].answer.inert, true);
  assert.equal(items[0].answer.getAttribute("aria-hidden"), "true");
  advance(240);
  assert.equal(items[0].answer.hidden, true);
  assert.equal(items[1].answer.hidden, false);
  items[1].button.click();
  advance(100);
  items[1].button.click(); // Reopen before its close timer expires.
  advance(300);
  assert.equal(items[1].answer.hidden, false);
  assert.equal(items[1].answer.inert, false);
  assert.equal(items[1].button.getAttribute("aria-expanded"), "true");
  const escape = new Event("keydown");
  escape.key = "Escape";
  root.dispatchEvent(escape);
  advance(240);
  assert.equal(items[1].answer.hidden, true);
});

test("reduced motion exposes every quote and cancels rotation, including a pending fade", () => {
  const { root, view, node, advance, tasks } = fixture({ reduced: true });
  const container = node();
  container.id = "quotes";
  container.children = [node(), node(), node()];
  setupTextRotator(container, { mobileOnly: true }, view);
  assert.equal(container.classList.contains("is-rotating"), false);
  assert.equal(container.control.hidden, true);
  assert.ok(container.children.every((item) => item.getAttribute("aria-hidden") === null));
  assert.equal(tasks.size, 0);
  const preference = view.matchMedia("(prefers-reduced-motion: reduce)");
  preference.change(false);
  assert.equal(container.classList.contains("is-rotating"), true);
  advance(3601);
  container.control.click();
  assert.equal(tasks.size, 0);
  assert.ok(container.children.every((item) => item.getAttribute("aria-hidden") === null));
  advance(5000);
  assert.equal(container.classList.contains("is-rotating"), false);
  container.control.click();
  assert.equal(tasks.size, 1);
  preference.change(true);
  assert.equal(tasks.size, 0);
  assert.ok(container.children.every((item) => item.getAttribute("aria-hidden") === null));
  preference.change(false);
  view.matchMedia("(max-width: 760px)").change(false);
  assert.equal(tasks.size, 0);
  assert.equal(container.control.hidden, true);
  assert.ok(container.children.every((item) => item.getAttribute("aria-hidden") === null));
  root.hidden = true;
  root.dispatchEvent(new Event("visibilitychange"));
  assert.equal(tasks.size, 0);
});

test("private contact section participates in the existing shared reveal initialization", async () => {
  const html = await readFile(new URL("../private-groups-retreats/index.html", import.meta.url), "utf8");
  const script = await readFile(new URL("../public-page.js", import.meta.url), "utf8");
  assert.match(html, /class="contact-shell" data-reveal/);
  assert.match(script, /querySelectorAll\("\[data-reveal\]"\)/);
});

test("public typography uses shared relationship tokens and contains the Approach heading", async () => {
  const css = await readFile(new URL("../styles.css", import.meta.url), "utf8");
  assert.match(css, /--space-label-heading:\s*var\(--space-sm\)/);
  assert.match(css, /--space-heading-body:\s*var\(--space-md\)/);
  assert.match(css, /--space-body-action:\s*var\(--space-lg\)/);
  assert.match(css, /--space-content-group:\s*var\(--space-xl\)/);
  assert.match(css, /@media \(min-width: 561px\)[\s\S]*?\.guide-hero h1 \.no-wrap\s*{[\s\S]*?white-space:\s*normal/);
});

test("mobile guide callout is contained without relying on page-level overflow clipping", async () => {
  const css = await readFile(new URL("../styles.css", import.meta.url), "utf8");
  const mobileStart = css.indexOf("@media (max-width: 560px)");
  const mobileEnd = css.indexOf("@media (prefers-reduced-motion: reduce)", mobileStart);
  assert.notEqual(mobileStart, -1);
  assert.notEqual(mobileEnd, -1);
  const mobileCss = css.slice(mobileStart, mobileEnd);
  const calloutRule = mobileCss.match(/\.guide-hero-image p\s*{([^}]*)}/)?.[1] ?? "";
  assert.match(calloutRule, /right:\s*0/);
  assert.match(calloutRule, /max-width:\s*min\(240px,\s*calc\(100% - var\(--space-md\)\)\)/);
  assert.doesNotMatch(calloutRule, /right:\s*-/);
});
