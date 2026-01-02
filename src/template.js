// Template runtime: builds TOC, headers/footers, symbol columns, and subsheet panel

document.addEventListener("DOMContentLoaded", () => {
  const body = document.body;
  const lectureTitle = body.dataset.lectureTitle || "Vorlagenkurs";
  const lectureChapter = body.dataset.lectureChapter || "Kapitel";
  let mathJaxReady = false;
  let mathJaxLoading = null;
  let jsZipReady = false;
  let jsZipLoading = null;

  const sheets = Array.from(document.querySelectorAll(".sheet"));
  const markerMap = new Map();

  sheets.forEach((sheet, idx) => {
    sheet.dataset.pageNumber = idx + 1;
    if (!sheet.id) sheet.id = `sheet-${idx + 1}`;
  });

  numberSubpages();
  initSubsheetPanel();
  buildTocAndPageChrome();
  buildSymbolColumns();
  buildAssetLists();
  initPrintDialog();

  function ensureMathJax() {
    if (mathJaxReady || (window.MathJax && typeof MathJax.typesetPromise === "function")) {
      mathJaxReady = true;
      return Promise.resolve();
    }
    if (mathJaxLoading) return mathJaxLoading;

    window.MathJax = window.MathJax || {};
    window.MathJax.tex = window.MathJax.tex || { tags: "ams" };

    const sources = [
      body.dataset.mathjaxSrc || "node_modules/mathjax/es5/tex-mml-chtml.js",
      "https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-mml-chtml.js",
    ];

    mathJaxLoading = new Promise((resolve, reject) => {
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
          mathJaxReady = true;
          resolve();
        };
        script.onerror = () => tryNext(idx + 1);
        document.head.appendChild(script);
      };
      tryNext(0);
    });

    return mathJaxLoading;
  }

  function ensureJSZip() {
    if (jsZipReady || (window.JSZip && typeof window.JSZip === "function")) {
      jsZipReady = true;
      return Promise.resolve();
    }
    if (jsZipLoading) return jsZipLoading;

    const sources = [
      body.dataset.jszipSrc || "node_modules/jszip/dist/jszip.min.js",
      "https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js",
    ];

    jsZipLoading = new Promise((resolve, reject) => {
      const tryNext = (idx) => {
        if (idx >= sources.length) {
          reject(new Error("JSZip load failed"));
          return;
        }
        const script = document.createElement("script");
        script.src = sources[idx];
        script.async = true;
        script.onload = () => {
          jsZipReady = true;
          resolve();
        };
        script.onerror = () => tryNext(idx + 1);
        document.head.appendChild(script);
      };
      tryNext(0);
    });

    return jsZipLoading;
  }

  function typeset(targets) {
    ensureMathJax().then(() => {
      if (window.MathJax && typeof MathJax.typesetPromise === "function") {
        MathJax.typesetPromise(targets).catch(() => {});
      }
    });
  }

  function initSubsheetPanel() {
    let panel;
    let content;
    let closeBtn;
    let initialized = false;

    const ensurePanel = () => {
      if (initialized) return true;
      panel = document.getElementById("subsheet-panel");
      content = document.getElementById("subsheet-content");
      closeBtn = document.getElementById("subsheet-close");
      if (!panel || !content || !closeBtn) return false;

      closeBtn.addEventListener("click", () => {
        document.body.classList.remove("panel-open");
        content.innerHTML = "";
      });

      initialized = true;
      return true;
    };

    document.addEventListener("click", (e) => {
      const wrapper = e.target.closest?.(".sub-page-wrapper");
      if (!wrapper) return;
      if (!ensurePanel()) return;

      e.stopPropagation();
      const sheet = wrapper.closest(".sheet");
      if (!sheet) return;
      const subsheets = sheet.querySelectorAll(".sub-page-sheet");

      content.innerHTML = "";
      subsheets.forEach((sub) => content.appendChild(sub.cloneNode(true)));

      document.body.classList.add("panel-open");
      panel.scrollTop = 0;
      typeset([content]);
    });
  }

  function numberSubpages() {
    sheets.forEach((sheet) => {
      const mainPage = Number(sheet.dataset.pageNumber);
      const subs = Array.from(sheet.querySelectorAll(".sub-page-sheet"));
      subs.forEach((sub, idx) => {
        sub.dataset.subpageId = `${mainPage}-${idx + 1}`;
      });
    });
  }

  function buildTocAndPageChrome() {
    const tocList = document.getElementById("toc-list");
    if (!tocList) return;

    const tocMap = new Map();

    sheets.forEach((sheet) => {
      const page = Number(sheet.dataset.pageNumber);

      sheet.querySelectorAll("[data-toc]").forEach((marker) => {
        const raw = (marker.dataset.toc || "").trim();
        if (!raw) return;

        const title = raw;
        if (!markerMap.has(title)) markerMap.set(title, []);
        markerMap.get(title).push(marker);

        const current = tocMap.get(title);
        if (!current || page < current.page) {
          tocMap.set(title, { page, sheet });
        }
      });
    });

    tocList.innerHTML = "";

    const sortedEntries = Array.from(tocMap.entries()).sort((a, b) => {
      const pageDiff = a[1].page - b[1].page;
      if (pageDiff !== 0) return pageDiff;
      return a[0].localeCompare(b[0]);
    });

    sortedEntries.forEach(([title, data], idx) => {
      data.number = idx + 1;
      const li = document.createElement("li");
      li.className = "toc-item";
      li.dataset.target = data.sheet?.id || "";
      li.setAttribute("role", "button");
      li.tabIndex = 0;

      const number = document.createElement("span");
      number.className = "toc-number";
      number.textContent = `${data.number}.`;

      const label = document.createElement("span");
      label.className = "toc-title";
      const fullTitle = `${data.number}. ${title}`;
      label.textContent = title;

      const page = document.createElement("span");
      page.className = "toc-page";
      page.textContent = data.page;

      li.append(number, label, page);
      tocList.appendChild(li);

      const markers = markerMap.get(title) || [];
      if (markers.length) {
        // Place numbered title on first marker only
        markers[0].textContent = fullTitle;
      }
    });

    if (!tocList.children.length) {
      const li = document.createElement("li");
      li.textContent = "(keine Einträge markiert)";
      tocList.appendChild(li);
    }

    tocList.addEventListener("click", (event) => {
      const item = event.target.closest(".toc-item[data-target]");
      if (!item) return;
      const targetId = item.dataset.target;
      if (!targetId) return;
      const dest = document.getElementById(targetId);
      if (dest) {
        dest.scrollIntoView({ behavior: "smooth", block: "start" });
        document.body.classList.remove("panel-open");
      }
    });

    const findChapterForPage = (page) => {
      let match = null;
      sortedEntries.forEach(([title, data]) => {
        if (data.page <= page) {
          match = { title, number: data.number };
        }
      });
      return match;
    };

    sheets.forEach((sheet) => {
      if (sheet.classList.contains("Titlepage")) return;
      const page = Number(sheet.dataset.pageNumber);
      const chapter = findChapterForPage(page);
      if (!chapter) return;

      let header = sheet.querySelector(".page-header");
      if (!header) {
        header = document.createElement("div");
        header.className = "page-header";
        sheet.appendChild(header);
      }
      header.innerHTML = `<span>${lectureChapter}</span><span>${chapter.number}. ${chapter.title}</span>`;

      let footer = sheet.querySelector(".page-footer");
      if (!footer) {
        footer = document.createElement("div");
        footer.className = "page-footer";
        sheet.appendChild(footer);
      }
      footer.textContent = lectureTitle;

      // Apply header/footer to sub-pages
      sheet.querySelectorAll(".sub-page-sheet").forEach((sub, idx) => {
        let subHeader = sub.querySelector(".page-header");
        if (!subHeader) {
          subHeader = document.createElement("div");
          subHeader.className = "page-header";
          sub.appendChild(subHeader);
        }
        subHeader.innerHTML = `<span>${lectureChapter}</span><span>${chapter.number}. ${chapter.title} – ${idx + 1}</span>`;

        let subFooter = sub.querySelector(".page-footer");
        if (!subFooter) {
          subFooter = document.createElement("div");
          subFooter.className = "page-footer";
          sub.appendChild(subFooter);
        }
        subFooter.textContent = lectureTitle;
      });
    });
  }

  function buildSymbolColumns() {
    const symbolColumns = [];

    const parseSymbols = (raw) =>
      raw
        .split(";")
        .map((entry) => {
          const [sym, ...rest] = entry.split(":");
          const symbol = (sym || "").trim();
          const desc = rest.join(":").trim();
          return symbol ? { symbol, desc } : null;
        })
        .filter(Boolean);

    const autoExtractSymbols = (sheet) => {
      const latexBlocks = [];
      const text = sheet.innerText || "";
      const pushMatches = (regex) => {
        let match;
        while ((match = regex.exec(text)) !== null) {
          latexBlocks.push(match[1]);
        }
      };
      pushMatches(/\\begin\{equation\}([\s\S]*?)\\end\{equation\}/g);
      pushMatches(/\\\(([\\s\\S]*?)\\\)/g);
      pushMatches(/\\\[([\\s\\S]*?)\\\]/g);

      const ignore = new Set([
        "begin",
        "end",
        "frac",
        "sqrt",
        "left",
        "right",
        "cdot",
        "ddot",
        "dot",
        "mathrm",
        "mathit",
        "text",
        "sin",
        "cos",
        "tan",
        "exp",
        "log",
      ]);

      const found = [];
      latexBlocks.forEach((block) => {
        (block.match(/\\?[A-Za-z][A-Za-z0-9]*/g) || []).forEach((tok) => {
          const cleaned = tok.replace(/^\\/, "");
          if (!cleaned || ignore.has(cleaned) || found.includes(cleaned)) return;
          found.push(cleaned);
        });
      });

      return found.map((sym) => ({ symbol: sym, desc: "" }));
    };

    sheets.forEach((sheet) => {
      if (sheet.classList.contains("Titlepage")) return;
      const raw = sheet.dataset.symbols || "";
      const symbols = raw.trim() ? parseSymbols(raw) : autoExtractSymbols(sheet);
      if (!symbols.length) return;

      sheet.classList.add("has-symbols");

      let column = sheet.querySelector(".symbol-column");
      if (!column) {
        column = document.createElement("div");
        column.className = "symbol-column";
        sheet.appendChild(column);
      }

      column.innerHTML = "";
      const title = document.createElement("div");
      title.className = "symbol-column-title";
      title.textContent = "Symbole";
      column.appendChild(title);

      symbols.forEach(({ symbol, desc }) => {
        const row = document.createElement("div");
        row.className = "symbol-row";

        const symEl = document.createElement("span");
        symEl.className = "symbol";
        symEl.innerHTML = `\\(${symbol}\\)`;

        const descEl = document.createElement("span");
        descEl.className = "desc";
        descEl.textContent = desc || "";

        row.append(symEl, descEl);
        column.appendChild(row);
      });

      symbolColumns.push(column);
    });

    if (symbolColumns.length) typeset(symbolColumns);
  }

  function buildAssetLists() {
    const figList = document.getElementById("fig-list");
    const tableList = document.getElementById("table-list");
    if (!figList && !tableList) return;

    const entries = { figure: [], table: [] };

    sheets.forEach((sheet) => {
      const page = Number(sheet.dataset.pageNumber);
      sheet.querySelectorAll("[data-figure]").forEach((node, idx) => {
        const title = (node.dataset.figure || node.getAttribute("data-figure") || "").trim();
        if (!title) return;
        entries.figure.push({ title, page, sheet, idx, node });
      });
      sheet.querySelectorAll("[data-table]").forEach((node, idx) => {
        const title = (node.dataset.table || node.getAttribute("data-table") || "").trim();
        if (!title) return;
        entries.table.push({ title, page, sheet, idx, node });
      });
    });

    const renderList = (targetEl, items, kind) => {
      if (!targetEl) return;
      targetEl.innerHTML = "";
      if (!items.length) {
        const li = document.createElement("li");
        li.textContent = "(keine Einträge markiert)";
        targetEl.appendChild(li);
        return;
      }
      items.sort((a, b) => {
        const pageDiff = a.page - b.page;
        if (pageDiff !== 0) return pageDiff;
        return a.title.localeCompare(b.title);
      });
      items.forEach((item, idx) => {
        item.number = idx + 1;
        const li = document.createElement("li");
        li.className = "toc-item";
        li.dataset.target = item.sheet?.id || "";
        li.setAttribute("role", "button");
        li.tabIndex = 0;

        const number = document.createElement("span");
        number.className = "toc-number";
        number.textContent = `${item.number}.`;

        const label = document.createElement("span");
        label.className = "toc-title";
        label.textContent = item.title;

        const page = document.createElement("span");
        page.className = "toc-page";
        page.textContent = item.page;

        li.append(number, label, page);
        targetEl.appendChild(li);
      });

      // Update captions for figures/tables with numbers
      if (kind === "figure") {
        items.forEach((item) => {
          const cap = item.node?.querySelector("figcaption");
          if (!cap) return;
          const note = cap.querySelector("small")?.outerHTML || "";
          const text = `<strong>Abb. ${item.number}</strong>: ${item.title}`;
          cap.innerHTML = note ? `${text} ${note}` : text;
        });
      }
      if (kind === "table") {
        items.forEach((item) => {
          const cap = item.node?.closest("div.image-caption");
          if (!cap) return;
          const text = `<strong>Tabelle ${item.number}</strong>: ${item.title}`;
          cap.innerHTML = text;
        });
      }
    };

    renderList(figList, entries.figure, "figure");
    renderList(tableList, entries.table, "table");

    const handleClick = (event) => {
      const item = event.target.closest(".toc-item[data-target]");
      if (!item) return;
      const targetId = item.dataset.target;
      if (!targetId) return;
      const dest = document.getElementById(targetId);
      if (dest) {
        dest.scrollIntoView({ behavior: "smooth", block: "start" });
        document.body.classList.remove("panel-open");
      }
    };

    if (figList) figList.addEventListener("click", handleClick);
    if (tableList) tableList.addEventListener("click", handleClick);
  }

  function initPrintDialog() {
    const btnOpen = document.getElementById("print-open");
    const modal = document.getElementById("print-modal");
    const btnCancel = document.getElementById("print-cancel");
    const btnConfirm = document.getElementById("print-confirm");
    const btnSave = document.getElementById("print-save");
    const includeSubsheets = document.getElementById("print-include-subsheets");
    if (!btnOpen || !modal || !btnCancel || !btnConfirm || !btnSave || !includeSubsheets) return;
    const printDate = new Date().toISOString().slice(0, 10);

    let printClones = [];

    const openModal = () => modal.removeAttribute("hidden");
    const closeModal = () => modal.setAttribute("hidden", "true");

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
        subsheets.forEach((sub) => wrap.appendChild(sub.cloneNode(true)));
        sheet.insertAdjacentElement("afterend", wrap);
        printClones.push(wrap);
      });
    };

    btnOpen.addEventListener("click", openModal);
    btnCancel.addEventListener("click", () => {
      closeModal();
      cleanupClones();
    });

    btnConfirm.addEventListener("click", () => {
      if (includeSubsheets.checked) {
        cloneSubsheetsForPrint();
      } else {
        cleanupClones();
      }
      closeModal();
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
      const includeSubs = includeSubsheets.checked;
      if (includeSubs) {
        cloneSubsheetsForPrint();
      } else {
        cleanupClones();
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

    window.addEventListener("afterprint", cleanupClones);
  }
});
