export function setupFloralMotion(root = document, view = window) {
  const button = root.querySelector("[data-floral-motion]");
  if (!button || !root.querySelector(".botanical")) return;
  const preference = view.matchMedia("(prefers-reduced-motion: reduce)");
  let paused = false;
  try { paused = view.localStorage.getItem("shemotion-floral-motion") === "paused"; } catch {}
  const render = () => {
    root.documentElement.dataset.flowerMotion = paused ? "paused" : "playing";
    button.hidden = preference.matches;
    button.setAttribute("aria-pressed", String(paused));
    button.textContent = paused ? "Resume floral motion" : "Pause floral motion";
  };
  button.addEventListener("click", () => {
    paused = !paused;
    try { view.localStorage.setItem("shemotion-floral-motion", paused ? "paused" : "playing"); } catch {}
    render();
  });
  preference.addEventListener("change", render);
  render();
}

