export function createMathService(ctx) {
  let ready = false;
  let loading = null;

  function ensureMathJax() {
    if (ready || (window.MathJax && typeof MathJax.typesetPromise === "function")) {
      ready = true;
      return Promise.resolve();
    }
    if (loading) return loading;

    window.MathJax = window.MathJax || {};
    window.MathJax.tex = window.MathJax.tex || { tags: "ams" };

    const sources = [
      ctx.body.dataset.mathjaxSrc,
      ...(Array.isArray(ctx.userSettings.mathJaxSources) ? ctx.userSettings.mathJaxSources : []),
      "node_modules/mathjax/es5/tex-mml-chtml.js",
      "https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-mml-chtml.js",
    ].filter(Boolean);

    loading = new Promise((resolve, reject) => {
      const tryNext = (idx) => {
        if (idx >= sources.length) {
          reject(new Error("MathJax load failed"));
          return;
        }
        const script = document.createElement("script");
        script.id = "mathjax-script";
        script.async = true;
        script.src = sources[idx];
        script.onload = () => {
          ready = true;
          resolve();
        };
        script.onerror = () => tryNext(idx + 1);
        document.head.appendChild(script);
      };
      tryNext(0);
    });

    return loading;
  }

  function typeset(targets) {
    ensureMathJax().then(() => {
      if (window.MathJax && typeof MathJax.typesetPromise === "function") {
        MathJax.typesetPromise(targets).catch(() => {});
      }
    });
  }

  return { ensureMathJax, typeset };
}
