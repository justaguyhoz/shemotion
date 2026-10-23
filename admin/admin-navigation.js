const NAV_ITEMS = [
  { key: "events", label: "Events", href: "/admin/" },
  { key: "media", label: "Media & Features", href: "/admin/media/" },
  { key: "instagram", label: "Instagram", href: "/admin/instagram/" },
  { key: "contacts", label: "Contacts", href: "/admin/contacts/" },
  { key: "outreach", label: "Outreach", href: "/admin/outreach/" },
  { key: "website", label: "View Website", href: "/" },
];

function setMenuState(navigation, toggle, isOpen) {
  navigation.classList.toggle("is-open", isOpen);
  toggle.setAttribute("aria-expanded", String(isOpen));
}

export function setupAdminNavigation(root = document) {
  const navigation = root.querySelector("[data-admin-navigation]");
  if (!navigation || navigation.dataset.navigationReady === "true") return navigation;

  const currentPage = navigation.dataset.currentPage || "";
  const menuId = `admin-navigation-links-${currentPage || "default"}`;
  const toggle = root.createElement("button");
  toggle.className = "admin-nav-toggle";
  toggle.type = "button";
  toggle.setAttribute("aria-expanded", "false");
  toggle.setAttribute("aria-controls", menuId);
  toggle.innerHTML = '<span>Menu</span><span class="admin-nav-toggle-icon" aria-hidden="true"></span>';

  const links = root.createElement("div");
  links.className = "admin-nav-links";
  links.id = menuId;

  for (const item of NAV_ITEMS) {
    const link = root.createElement("a");
    link.className = "admin-nav-link";
    link.href = item.href;
    link.textContent = item.label;
    if (item.key === currentPage) {
      link.classList.add("is-active");
      link.setAttribute("aria-current", "page");
    }
    link.addEventListener("click", () => setMenuState(navigation, toggle, false));
    links.append(link);
  }

  toggle.addEventListener("click", () => {
    setMenuState(navigation, toggle, toggle.getAttribute("aria-expanded") !== "true");
  });
  navigation.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      setMenuState(navigation, toggle, false);
      toggle.focus();
    }
  });
  root.defaultView?.matchMedia("(min-width: 761px)").addEventListener("change", (event) => {
    if (event.matches) setMenuState(navigation, toggle, false);
  });

  navigation.replaceChildren(toggle, links);
  navigation.dataset.navigationReady = "true";
  return navigation;
}

if (typeof document !== "undefined") setupAdminNavigation();
