export function initPrintDialog(ctx, { ensureJSZip }) {
  const { sheets, body } = ctx;
  const btnConfirm = document.getElementById("print-confirm");
  const btnSave = document.getElementById("print-save");
  const includeYes = document.getElementById("print-include-subsheets-yes");
  const includeNo = document.getElementById("print-include-subsheets-no");
  const includeFullCode = document.getElementById("print-include-fullcode");
  const includeFullCodeMain = document.getElementById("print-include-fullcode-main");
  const modal = document.getElementById("print-modal");
  const includeLegacy = document.getElementById("print-include-subsheets");
  if (!btnConfirm || !btnSave) return;
  const printDate = new Date().toISOString().slice(0, 10);

  let printClones = [];

  const includeSubsheetsSelected = () => {
    if (includeYes && includeNo) {
      return includeYes.checked || (!includeYes.checked && !includeNo.checked && includeYes.hasAttribute("checked"));
    }
    if (includeLegacy) return includeLegacy.checked;
    return true;
  };

  const includeCodeSelected = () => {
    if (includeFullCode && includeFullCode.checked) return true;
    if (includeFullCodeMain && includeFullCodeMain.checked) return true;
    return false;
  };

  const cleanupClones = () => {
    printClones.forEach((node) => node.remove());
    printClones = [];
  };

  const cloneSubsheetsForPrint = () => {
    cleanupClones();
    sheets.forEach((sheet) => {
      const subsheets = Array.from(sheet.querySelectorAll(".sub-page-sheet"));
      if (!subsheets.length) return;

      const wrap = document.createElement("div");
      wrap.className = "print-subpages";
      if (sheet.id) wrap.dataset.printSourceSheetId = sheet.id;
      subsheets.forEach((sub) => wrap.appendChild(sub.cloneNode(true)));
      sheet.insertAdjacentElement("afterend", wrap);
      printClones.push(wrap);
    });
  };

  const cloneCodePagesForPrint = () => {
    const lastForSheet = new Map();
    const codeCounters = new Map();
    const maxLinesPerPage = 45;

    document.querySelectorAll(".code-full").forEach((full) => {
      const text = (full.textContent || "").trim();
      if (!text) return;
      const sheet = full.closest(".sheet");
      if (!sheet) return;
      const sub = full.closest(".sub-page-sheet");
      const key = sheet.id || sheet.dataset.pageNumber || `sheet-${codeCounters.size + 1}`;
      let nextIdx = (codeCounters.get(key) || 0) + 1;

      const makeClone = (chunkText, chunkNumber) => {
        const clone = document.createElement("section");
        clone.className = "sheet libertinus padding-20mm code-print-sheet";

        const headerSource =
          (sub && sub.querySelector(".page-header")) || sheet.querySelector(":scope > .page-header");
        if (headerSource) {
          const header = headerSource.cloneNode(true);
          clone.appendChild(header);
        }

        const label = document.createElement("article");
        label.innerHTML = "<strong>Code (vollständig)</strong>";
        clone.appendChild(label);

        const pre = document.createElement("pre");
        const code = document.createElement("code");
        code.textContent = chunkText;
        pre.appendChild(code);
        clone.appendChild(pre);

        const footer = document.createElement("div");
        footer.className = "page-footer";
        const titleText =
          sheet.querySelector(".page-footer__title")?.textContent ||
          sheet.querySelector(":scope > .page-header")?.textContent ||
          "Code";
        const title = document.createElement("span");
        title.className = "page-footer__title";
        title.textContent = titleText;

        const codeLabel = document.createElement("span");
        codeLabel.className = "code-page-number";
        codeLabel.textContent = `c${chunkNumber}`;
        footer.append(title, codeLabel);
        clone.appendChild(footer);

        let ref = lastForSheet.get(sheet);
        if (!ref) {
          ref =
            printClones
              .slice()
              .reverse()
              .find((node) => sheet.id && node.dataset?.printSourceSheetId === sheet.id) || sheet;
        }
        ref.insertAdjacentElement("afterend", clone);
        lastForSheet.set(sheet, clone);
        printClones.push(clone);
      };

      const lines = text.split(/\r?\n/);
      for (let i = 0; i < lines.length; i += maxLinesPerPage) {
        const chunk = lines.slice(i, i + maxLinesPerPage).join("\n");
        makeClone(chunk, nextIdx);
        nextIdx += 1;
      }
      codeCounters.set(key, nextIdx - 1);
    });
  };

  btnConfirm.addEventListener("click", () => {
    if (includeSubsheetsSelected()) {
      cloneSubsheetsForPrint();
    } else {
      cleanupClones();
    }
    if (includeCodeSelected()) {
      cloneCodePagesForPrint();
    }
    modal?.setAttribute("hidden", "true");
    window.print();
  });

  const inlineAssets = async (doc) => {
    const fetchText = async (url) => {
      const res = await fetch(url);
      return res.text();
    };

    const inlineCssImports = async (cssText, base) => {
      const importRegex = /@import\\s+url\\(([^)]+)\\)\\s*;?/g;
      let match;
      let inlined = cssText;
      while ((match = importRegex.exec(cssText)) !== null) {
        const raw = match[1].replace(/['"]/g, "").trim();
        if (!raw) continue;
        try {
          const resolved = raw.startsWith("http") ? raw : new URL(raw, base).toString();
          const imported = await fetchText(resolved);
          inlined = inlined.replace(match[0], imported);
        } catch (err) {
          console.warn("Inline @import failed for", raw, err);
        }
      }
      return inlined;
    };

    // inline styles (local and remote)
    const links = Array.from(doc.querySelectorAll('link[rel="stylesheet"]'));
    for (const link of links) {
      const href = link.getAttribute("href") || "";
      try {
        const abs = href.startsWith("http") ? href : new URL(href, document.baseURI).toString();
        const cssTextRaw = await fetchText(abs);
        const cssText = await inlineCssImports(cssTextRaw, abs);
        const style = doc.createElement("style");
        style.textContent = cssText;
        link.replaceWith(style);
      } catch (err) {
        console.warn("Inline CSS failed for", href, err);
      }
    }

    // inline scripts (local and remote), but skip MathJax (handled separately)
    const scripts = Array.from(doc.querySelectorAll("script[src]"));
    for (const script of scripts) {
      const src = script.getAttribute("src") || "";
      if (src.toLowerCase().includes("mathjax")) continue;
      try {
        const abs = src.startsWith("http") ? src : new URL(src, document.baseURI).toString();
        const jsText = await fetchText(abs);
        const inline = doc.createElement("script");
        inline.textContent = jsText;
        script.replaceWith(inline);
      } catch (err) {
        console.warn("Inline JS failed for", src, err);
      }
    }
  };

  const addMathJaxToZip = async (zip, cloneDoc) => {
    const mjScripts = Array.from(cloneDoc.querySelectorAll("script[src*='mathjax']"));
    if (!mjScripts.length) return;
    mjScripts.forEach((s) => s.setAttribute("src", "mathjax.js"));
    const sources = [
      body.dataset.mathjaxSrc || "node_modules/mathjax/es5/tex-mml-chtml.js",
      "https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-mml-chtml.js",
    ];
    for (const src of sources) {
      try {
        const abs = src.startsWith("http") ? src : new URL(src, document.baseURI).toString();
        const res = await fetch(abs);
        if (!res.ok) continue;
        const js = await res.text();
        zip.file("mathjax.js", js);
        return;
      } catch (err) {
        continue;
      }
    }
  };

  const downloadOffline = async () => {
    const includeSubs = includeSubsheetsSelected();
    if (includeSubs) {
      cloneSubsheetsForPrint();
    } else {
      cleanupClones();
    }
    if (includeCodeSelected()) {
      cloneCodePagesForPrint();
    }

    const clone = document.documentElement.cloneNode(true);
    clone.querySelector("body")?.classList.add("offline-export");
    try {
      await inlineAssets(clone);
    } catch (err) {
      console.warn("Inline assets failed", err);
    }

    const html = "<!DOCTYPE html>\\n" + clone.outerHTML;

    const triggerDownload = (name, blob) => {
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = name;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(a.href);
    };

    const fallbackHtml = () => triggerDownload("document.html", new Blob([html], { type: "text/html" }));

    try {
      await Promise.race([
        ensureJSZip(),
        new Promise((_, rej) => setTimeout(() => rej(new Error("JSZip timeout")), 3000)),
      ]);
      if (!window.JSZip) throw new Error("JSZip unavailable");
      const zip = new JSZip();
      zip.file("document.html", html);
      await addMathJaxToZip(zip, clone);
      const blob = await zip.generateAsync({ type: "blob" });
      triggerDownload("document.zip", blob);
    } catch (err) {
      console.warn("Zip export failed, falling back to HTML", err);
      fallbackHtml();
    }

    document.body.classList.remove("offline-export");
    cleanupClones();
    closeModal();
  };

  // apply print date to existing footers
  sheets.forEach((sheet) => {
    sheet.querySelectorAll(".page-footer").forEach((footer) => {
      footer.setAttribute("data-print-date", printDate);
    });
    sheet.querySelectorAll(".sub-page-sheet .page-footer").forEach((footer) => {
      footer.setAttribute("data-print-date", printDate);
    });
  });

  btnSave.addEventListener("click", () => {
    downloadOffline().catch((err) => console.error("Offline export failed", err));
  });

  const closeModal = () => modal?.setAttribute("hidden", "true");
  window.addEventListener("afterprint", cleanupClones);
}
