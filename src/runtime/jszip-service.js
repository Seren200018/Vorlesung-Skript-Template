export function createZipService(ctx) {
  let ready = false;
  let loading = null;

  function ensureJSZip() {
    if (ready || (window.JSZip && typeof window.JSZip === "function")) {
      ready = true;
      return Promise.resolve();
    }
    if (loading) return loading;

    const sources = [
      ctx.body.dataset.jszipSrc,
      ...(Array.isArray(ctx.userSettings.jsZipSources) ? ctx.userSettings.jsZipSources : []),
      "node_modules/jszip/dist/jszip.min.js",
      "https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js",
    ].filter(Boolean);

    loading = new Promise((resolve, reject) => {
      const tryNext = (idx) => {
        if (idx >= sources.length) {
          reject(new Error("JSZip load failed"));
          return;
        }
        const script = document.createElement("script");
        script.src = sources[idx];
        script.async = true;
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

  return { ensureJSZip };
}
