export function initThemeSwitch(ctx) {
  const { body } = ctx;
  const radios = Array.from(document.querySelectorAll('input[name="theme-mode"]'));
  const stored = (localStorage.getItem("sheetTheme") || "").toLowerCase();
  let currentTheme = stored === "dark" ? "dark" : "light";

  const applyTheme = (mode, persist = true) => {
    const next = mode === "dark" ? "dark" : "light";
    currentTheme = next;
    body.classList.toggle("theme-dark", next === "dark");
    body.classList.toggle("theme-light", next === "light");
    document.documentElement.setAttribute("data-theme", next);
    radios.forEach((r) => {
      r.checked = (r.value || "").toLowerCase() === next;
    });
    if (persist) localStorage.setItem("sheetTheme", next);
  };

  applyTheme(currentTheme, false);

  radios.forEach((r) => {
    r.addEventListener("change", (e) => {
      const val = (e.target.value || "light").toLowerCase();
      applyTheme(val);
    });
  });

  const beforePrint = () => {
    body.dataset.prevTheme = currentTheme;
    applyTheme("light", false);
  };
  const afterPrint = () => {
    const prev = body.dataset.prevTheme || currentTheme || "light";
    applyTheme(prev, false);
  };
  window.addEventListener("beforeprint", beforePrint);
  window.addEventListener("afterprint", afterPrint);
}
