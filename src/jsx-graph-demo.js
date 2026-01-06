// Animated 2D graph example using JSXGraph
export function initJsxGraphDemo(targetId) {
  const board = JXG.JSXGraph.initBoard(targetId, {
    boundingbox: [-1, 6, 10, -1],
    axis: true,
    showCopyright: false,
    showNavigation: false,
  });

  const f = (x, t) => 2 + Math.sin(x + t);
  let t = 0;

  const pickColor = (idx = 0) => {
    const style = getComputedStyle(document.documentElement);
    const val = style.getPropertyValue(`--jxg-color-${idx + 1}`) || "";
    const clean = val.trim();
    return clean || "#e65100";
  };

  const curve = board.create(
    "curve",
    [
      () => {
        const xs = [];
        for (let i = 0; i <= 100; i++) xs.push(i * 0.1);
        return xs;
      },
      () => {
        const ys = [];
        for (let i = 0; i <= 100; i++) {
          const x = i * 0.1;
          ys.push(f(x, t));
        }
        return ys;
      },
    ],
    { strokeColor: pickColor(0), strokeWidth: 3 }
  );

  const refreshCurveColor = () => {
    curve.setAttribute({ strokeColor: pickColor(0) });
    board.update();
  };

  const observer = new MutationObserver(() => refreshCurveColor());
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });

  // animate
  const step = () => {
    t += 0.05;
    curve.updateDataArray();
    board.update();
    requestAnimationFrame(step);
  };
  step();
}
