export function setupNavigation(root = document, view = window) {
  const header = root.querySelector("[data-header]");
  const toggle = header?.querySelector(".nav-toggle");
  const nav = header?.querySelector(".site-nav");
  if (!toggle || !nav) return;

  const mobile = view.matchMedia("(max-width: 1100px)");
  const setOpen = (open, returnFocus = false) => {
    open = mobile.matches && open;
    if (!open && (returnFocus || (mobile.matches && nav.contains(root.activeElement)))) toggle.focus();
    header.classList.toggle("is-open", open);
    toggle.setAttribute("aria-expanded", String(open));
    nav.inert = mobile.matches && !open;
    if (nav.inert) nav.setAttribute("aria-hidden", "true");
    else nav.removeAttribute("aria-hidden");
  };

  toggle.addEventListener("click", () => {
    const open = toggle.getAttribute("aria-expanded") !== "true";
    setOpen(open);
    if (open) nav.querySelector("a")?.focus();
  });
  nav.querySelectorAll("a").forEach((link) => link.addEventListener("click", () => setOpen(false)));
  root.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && mobile.matches && header.classList.contains("is-open")) {
      event.preventDefault();
      setOpen(false, true);
    }
  });
  root.addEventListener("click", (event) => {
    if (!header.contains(event.target)) setOpen(false);
  });
  root.addEventListener("focusin", (event) => {
    if (!header.contains(event.target)) setOpen(false);
  });
  mobile.addEventListener("change", () => {
    const toggleFocused = root.activeElement === toggle;
    setOpen(false);
    if (!mobile.matches && toggleFocused) nav.querySelector("a")?.focus();
  });
  setOpen(false);
}
