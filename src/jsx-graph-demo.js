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
    { strokeColor: "#e65100", strokeWidth: 3 }
  );

  // animate
  const step = () => {
    t += 0.05;
    curve.updateDataArray();
    board.update();
    requestAnimationFrame(step);
  };
  step();
}
