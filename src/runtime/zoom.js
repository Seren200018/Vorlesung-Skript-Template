export function initZoomControls() {
  const root = document.documentElement;
  const controls = document.getElementById("zoom-controls");
  if (!controls) return;

  const subsheetPanel = document.getElementById("subsheet-panel");
  const subsheetZoom = document.getElementById("subsheet-zoom");
  const subsheetContent = document.getElementById("subsheet-content");

  const btnIn = document.getElementById("zoom-in");
  const btnOut = document.getElementById("zoom-out");
  const btnReset = document.getElementById("zoom-reset");
  if (!btnIn || !btnOut || !btnReset) return;

  const STORAGE_KEY = "sheetZoomScale";
  const MIN = 0.5;
  const MAX = 2.0;
  const STEP = 0.1;

  const clamp = (v) => Math.min(MAX, Math.max(MIN, v));
  const round1 = (v) => Math.round(v * 10) / 10;

  let scale = 1;
  const stored = parseFloat(localStorage.getItem(STORAGE_KEY));
  if (Number.isFinite(stored)) scale = clamp(stored);

  let basePanelWidthPx = subsheetPanel?.getBoundingClientRect().width || 0;

  const updateLabel = () => {
    btnReset.textContent = `${Math.round(scale * 100)}%`;
  };

  const updateSubsheetLayout = () => {
    if (!subsheetZoom || !subsheetContent) return;
    subsheetZoom.style.width = `${scale * 100}%`;
    subsheetContent.style.width = `${100 / scale}%`;
    const unscaledHeight = subsheetContent.scrollHeight;
    if (unscaledHeight) {
      subsheetZoom.style.height = `${unscaledHeight * scale}px`;
    }
  };

  const apply = () => {
    root.style.setProperty("--sheet-scale", String(scale));
    if (basePanelWidthPx > 0) {
      root.style.setProperty("--panel-width", `${Math.round(basePanelWidthPx * scale)}px`);
    }
    updateSubsheetLayout();
    localStorage.setItem(STORAGE_KEY, String(scale));
    updateLabel();
  };

  let resizePending = null;
  window.addEventListener("resize", () => {
    if (!subsheetPanel) return;
    if (resizePending) return;
    resizePending = requestAnimationFrame(() => {
      resizePending = null;
      const currentWidth = subsheetPanel.getBoundingClientRect().width;
      basePanelWidthPx = scale ? currentWidth / scale : currentWidth;
      apply();
    });
  });

  let subsheetPending = null;
  if (subsheetContent && subsheetZoom) {
    const observer = new MutationObserver(() => {
      if (subsheetPending) return;
      subsheetPending = requestAnimationFrame(() => {
        subsheetPending = null;
        updateSubsheetLayout();
      });
    });
    observer.observe(subsheetContent, { childList: true, subtree: true });
  }

  btnIn.addEventListener("click", () => {
    scale = clamp(round1(scale + STEP));
    apply();
  });

  btnOut.addEventListener("click", () => {
    scale = clamp(round1(scale - STEP));
    apply();
  });

  btnReset.addEventListener("click", () => {
    scale = 1;
    apply();
  });

  apply();
}
