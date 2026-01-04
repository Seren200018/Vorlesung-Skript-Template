// Template runtime: builds TOC, headers/footers, symbol columns, and subsheet panel

document.addEventListener("DOMContentLoaded", () => {
  // Helper: guard execution so one failing step does not break others.
  const runSafe = (label, fn) => {
    try {
      fn();
    } catch (err) {
      console.warn(`${label} failed`, err);
    }
  };

  // User-configurable defaults (can be set via src/settings.js or data-* attributes on <body>).
  const userSettings = window.TemplateSettings || {};
  const symbolSettings = window.SymbolSettings || {};
  const audioDefaults = userSettings.audio || { mode: "manual" };
  const body = document.body;
  const lectureTitle = body.dataset.lectureTitle || userSettings.lectureTitle || "Vorlagenkurs";
  const lectureChapter = body.dataset.lectureChapter || userSettings.lectureChapter || "Kapitel";
  let mathJaxReady = false;
  let mathJaxLoading = null;
  let jsZipReady = false;
  let jsZipLoading = null;

  const sheets = Array.from(document.querySelectorAll(".sheet"));
  const markerMap = new Map();
  const videoEntries = [];
  const sheetAudio = [];
  const audioRegistry = [];
  let currentTheme = "light";
  // Audio mode respects body or settings defaults; user changes persist in localStorage.
  let audioMode = (body.dataset.audioMode || audioDefaults.mode || "manual").toLowerCase();

  sheets.forEach((sheet, idx) => {
    sheet.dataset.pageNumber = idx + 1;
    if (!sheet.id) sheet.id = `sheet-${idx + 1}`;
  });

  const requestAudioUpdate = (() => {
    let pending = null;
    return () => {
      if (pending) return;
      pending = requestAnimationFrame(() => {
        pending = null;
        updateAutoplayFocus();
      });
    };
  })();

  window.addEventListener("scroll", requestAudioUpdate, { passive: true });
  window.addEventListener("resize", requestAudioUpdate);

  runSafe("numberSubpages", numberSubpages);
  runSafe("initSubsheetPanel", initSubsheetPanel);
  runSafe("buildTocAndPageChrome", buildTocAndPageChrome);
  runSafe("buildSymbolColumns", buildSymbolColumns);
  runSafe("buildAssetLists", buildAssetLists);
  runSafe("populateBuildInfo", populateBuildInfo);
  runSafe("initAudioControls", initAudioControls);
  runSafe("initVideos", initVideos);
  runSafe("buildVideoList", buildVideoList);
  runSafe("buildLiteratureIndex", buildLiteratureIndex);
  runSafe("initPythonDemos", initPythonDemos);
  runSafe("initThemeSwitch", initThemeSwitch);
  runSafe("initPrintDialog", initPrintDialog);

  // re-run after load to catch late-added nodes or slow scripts
  window.addEventListener("load", () => {
    runSafe("initVideos (load)", initVideos);
    runSafe("buildVideoList (load)", buildVideoList);
    runSafe("buildLiteratureIndex (load)", buildLiteratureIndex);
    runSafe("renderSheetAudio (load)", renderSheetAudio);
  });

  // Ensure MathJax is loaded (local source first, CDN fallback).
  function ensureMathJax() {
    if (mathJaxReady || (window.MathJax && typeof MathJax.typesetPromise === "function")) {
      mathJaxReady = true;
      return Promise.resolve();
    }
    if (mathJaxLoading) return mathJaxLoading;

    window.MathJax = window.MathJax || {};
    window.MathJax.tex = window.MathJax.tex || { tags: "ams" };

    const sources = [
      body.dataset.mathjaxSrc,
      ...(Array.isArray(userSettings.mathJaxSources) ? userSettings.mathJaxSources : []),
      "node_modules/mathjax/es5/tex-mml-chtml.js",
      "https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-mml-chtml.js",
    ].filter(Boolean);

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

  // Ensure JSZip is loaded (local source first, CDN fallback).
  function ensureJSZip() {
    if (jsZipReady || (window.JSZip && typeof window.JSZip === "function")) {
      jsZipReady = true;
      return Promise.resolve();
    }
    if (jsZipLoading) return jsZipLoading;

    const sources = [
      body.dataset.jszipSrc,
      ...(Array.isArray(userSettings.jsZipSources) ? userSettings.jsZipSources : []),
      "node_modules/jszip/dist/jszip.min.js",
      "https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js",
    ].filter(Boolean);

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

  // Trigger MathJax typesetting for given nodes.
  function typeset(targets) {
    ensureMathJax().then(() => {
      if (window.MathJax && typeof MathJax.typesetPromise === "function") {
        MathJax.typesetPromise(targets).catch(() => {});
      }
    });
  }

  // Handle click-to-open subsheets into the right-side panel.
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
        requestAudioUpdate();
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
      requestAudioUpdate();
    });
  }

  // Assign page numbers to sheets and subsheets for headers/footers.
  function numberSubpages() {
    sheets.forEach((sheet) => {
      const mainPage = Number(sheet.dataset.pageNumber);
      const subs = Array.from(sheet.querySelectorAll(".sub-page-sheet"));
      subs.forEach((sub, idx) => {
        sub.dataset.subpageId = `${mainPage}-${idx + 1}`;
      });
    });
  }

  // Build table of contents and inject headers/footers based on markers.
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
      footer.innerHTML = `<span class="page-footer__title">${lectureTitle}</span>`;

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
        subFooter.innerHTML = `<span class="page-footer__title">${lectureTitle}</span>`;
      });
    });
  }

  // Build per-sheet symbol columns from data-symbols or by auto-extracting LaTeX tokens.
  function buildSymbolColumns() {
    const symbolColumns = [];

    const configuredSymbols = (sheet) => {
      const id = sheet.id;
      if (id && symbolSettings.byId && symbolSettings.byId[id]) return symbolSettings.byId[id];
      const tocNode = sheet.querySelector("[data-toc]");
      const title = tocNode?.dataset.toc?.trim();
      if (title && symbolSettings.byTitle && symbolSettings.byTitle[title]) return symbolSettings.byTitle[title];
      return symbolSettings.defaultSymbols || "";
    };

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

    const applyGlobalDefinitions = (symbols) => {
      const defs = symbolSettings.globalDefinitions || {};
      const described = symbols
        .map(({ symbol }) => {
          const desc = defs[symbol];
          return desc ? { symbol, desc } : null;
        })
        .filter(Boolean);
      return described.length ? described : symbols;
    };

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
      const configRaw = configuredSymbols(sheet);
      const baseSymbols = raw.trim()
        ? parseSymbols(raw)
        : configRaw.trim()
          ? parseSymbols(configRaw)
          : applyGlobalDefinitions(autoExtractSymbols(sheet));
      const symbols = applyGlobalDefinitions(baseSymbols);
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

  // Build figure/table lists and renumber captions.
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


  // Initialize YouTube embeds and collect metadata for the video list.
  function initVideos() {
    const blocks = Array.from(document.querySelectorAll(".video-entry[data-video-id]"));
    if (!blocks.length) return;

    blocks.forEach((block, idx) => {
      const sheet = block.closest(".sheet");
      const page = Number(sheet?.dataset.pageNumber || idx + 1);
      const number = videoEntries.length + 1;
      const videoId = (block.dataset.videoId || "").trim();
      if (!videoId) return;
      const title = (block.dataset.videoTitle || block.querySelector("figcaption")?.textContent || `Video ${idx + 1}`).trim();
      const caption = (block.dataset.videoCaption || block.querySelector("figcaption")?.textContent || "").trim();
      const url = `https://www.youtube-nocookie.com/embed/${videoId}`;
      const shareUrl = `https://youtu.be/${videoId}`;

      let frame = block.querySelector(".video-frame");
      if (!frame) {
        frame = document.createElement("div");
        frame.className = "video-frame";
        block.prepend(frame);
      }
      frame.innerHTML = "";
      frame.appendChild(buildVideoIframe(url, title));
      frame.appendChild(buildVideoQr(shareUrl, title));

      // normalize figcaption
      let figcap = block.querySelector("figcaption");
      if (!figcap) {
        figcap = document.createElement("figcaption");
        block.appendChild(figcap);
      }
      figcap.textContent = `Video ${number}: ${caption || title}`;

      videoEntries.push({ title, caption, videoId, url, shareUrl, sheet, page, idx, number });
    });
  }

  // Collect audio sources per sheet and render players according to mode.
  function initAudioControls() {
    sheetAudio.length = 0;
    sheets.forEach((sheet) => {
      const src = (sheet.dataset.audioSrc || "").trim();
      if (!src) return;
      const title = (sheet.dataset.audioTitle || sheet.querySelector("[data-toc]")?.textContent || "Audio").trim();
      sheetAudio.push({ sheet, src, title });
    });

    const radios = Array.from(document.querySelectorAll('input[name="audio-mode"]'));
    if (radios.length) {
      const stored = (localStorage.getItem("sheetAudioMode") || "").toLowerCase();
      if (stored === "manual" || stored === "autoplay") {
        audioMode = stored;
      } else {
        audioMode = "manual";
        localStorage.setItem("sheetAudioMode", audioMode);
      }
      radios.forEach((r) => {
        r.checked = r.value.toLowerCase() === audioMode;
        r.addEventListener("change", (e) => {
          const val = (e.target.value || "manual").toLowerCase();
          audioMode = val;
          localStorage.setItem("sheetAudioMode", audioMode);
          renderSheetAudio();
        });
      });
    }

    renderSheetAudio();
  }

  function renderSheetAudio() {
    // Remove previous injected audio blocks
    audioRegistry.forEach(({ audio }) => audio.pause());
    audioRegistry.length = 0;
    document.querySelectorAll(".sheet-audio").forEach((node) => node.remove());
    document.querySelectorAll(".sheet-audio__progress").forEach((node) => node.remove());
    if (audioMode === "off") return;

    const createControls = (targetFooter, entry) => {
      targetFooter.classList.add("has-audio");
      const wrap = document.createElement("div");
      wrap.className = "sheet-audio sheet-audio--footer";

      const button = document.createElement("button");
      button.type = "button";
      button.className = "sheet-audio__button";
      const icon = document.createElement("span");
      icon.className = "sheet-audio__icon";
      button.appendChild(icon);

      const audio = document.createElement("audio");
      audio.preload = "metadata";
      audio.src = entry.src;
      audio.setAttribute("title", entry.title);
      audio.className = "sheet-audio__hidden";
      if (audioMode === "autoplay") {
        audio.autoplay = true;
      }

      const progressBar = document.createElement("div");
      progressBar.className = "sheet-audio__progress";
      targetFooter.prepend(progressBar);

      const syncProgress = () => {
        if (!audio.duration || Number.isNaN(audio.duration)) return;
        const pct = Math.min(100, Math.max(0, (audio.currentTime / audio.duration) * 100));
        targetFooter.style.setProperty("--audio-progress", `${pct}%`);
      };

      audio.addEventListener("timeupdate", syncProgress);
      audio.addEventListener("loadedmetadata", syncProgress);
      audio.addEventListener("ended", () => {
        button.classList.remove("is-playing");
        targetFooter.style.setProperty("--audio-progress", "0%");
      });

      audio.addEventListener("play", () => {
        audioRegistry.forEach(({ audio: other }) => {
          if (other !== audio) other.pause();
        });
      });

      progressBar.addEventListener("click", (e) => {
        const rect = progressBar.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const pct = Math.min(1, Math.max(0, x / rect.width));
        if (audio.duration && !Number.isNaN(audio.duration)) {
          audio.currentTime = pct * audio.duration;
        }
        targetFooter.style.setProperty("--audio-progress", `${pct * 100}%`);
      });

      button.addEventListener("click", () => {
        if (audio.paused) {
          audio.play().catch(() => {});
          button.classList.add("is-playing");
        } else {
          audio.pause();
          button.classList.remove("is-playing");
        }
      });

      wrap.append(button, audio);
      targetFooter.appendChild(wrap);

      const container = targetFooter.closest(".sub-page-sheet") || targetFooter.closest(".sheet");
      audioRegistry.push({ audio, container });
    };

    sheetAudio.forEach((entry) => {
      const footers = [];
      // Prefer the sheet-level footer; avoid grabbing sub-sheet footers first.
      const mainFooter = entry.sheet.querySelector(":scope > .page-footer") || entry.sheet.querySelector(".page-footer");
      if (mainFooter) footers.push(mainFooter);
      entry.sheet.querySelectorAll(":scope .sub-page-sheet .page-footer").forEach((f) => footers.push(f));
      footers.forEach((footer) => createControls(footer, entry));
    });

    requestAudioUpdate();
  }

  function pickAudioCandidates(preferPanel) {
    const inPanel = audioRegistry.filter(({ container }) => container?.closest("#subsheet-content"));
    const inMain = audioRegistry.filter(({ container }) => !container?.closest("#subsheet-content"));
    if (preferPanel && inPanel.length) return inPanel;
    if (!preferPanel && inMain.length) return inMain;
    return inPanel.length ? inPanel : inMain;
  }

  function chooseActiveAudio() {
    const preferPanel = document.body.classList.contains("panel-open");
    let focus = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    if (preferPanel) {
      const centerTarget = document.getElementById("subsheet-content");
      const centerRect = centerTarget?.getBoundingClientRect();
      if (centerRect) {
        focus = {
          x: centerRect.left + centerRect.width / 2,
          y: centerRect.top + centerRect.height / 2,
        };
      }
    }

    const candidates = pickAudioCandidates(preferPanel);
    if (!candidates.length) return null;

    let best = null;
    let bestDist = Infinity;
    let foundInside = false;

    candidates.forEach((item) => {
      const rect = item.container?.getBoundingClientRect();
      if (!rect) return;
      const inside =
        focus.x >= rect.left && focus.x <= rect.right && focus.y >= rect.top && focus.y <= rect.bottom;
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const dist = Math.hypot(cx - focus.x, cy - focus.y);
      if (inside && !foundInside) {
        best = item;
        bestDist = dist;
        foundInside = true;
        return;
      }
      if (inside && dist < bestDist) {
        best = item;
        bestDist = dist;
        return;
      }
      if (!foundInside && dist < bestDist) {
        best = item;
        bestDist = dist;
      }
    });

    return best?.audio || null;
  }

  function updateAutoplayFocus() {
    if (audioMode !== "autoplay") return;
    const active = chooseActiveAudio();
    audioRegistry.forEach(({ audio }) => {
      if (audio !== active) audio.pause();
    });
    if (audioMode === "autoplay" && active) {
      active.play().catch(() => {});
    }
  }

  function initPythonDemos() {
    const blocks = Array.from(document.querySelectorAll(".python-script-block"));
    if (!blocks.length) return;

    const highlightPython = (codeNode) => {
      if (!codeNode) return;
      const raw = codeNode.textContent || codeNode.innerText || "";
      const escapeHtml = (str) =>
        str
          .replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;")
          .replace(/"/g, "&quot;");
      const patterns = [
        { type: "comment", regex: /#[^\n]*/g },
        { type: "string", regex: /(\"\"\"[\s\S]*?\"\"\"|'''[\s\S]*?'''|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*')/g },
        { type: "number", regex: /\b\d+(?:\.\d+)?\b/g },
        {
          type: "keyword",
          regex: /\b(and|as|assert|async|await|break|class|continue|def|del|elif|else|except|False|finally|for|from|global|if|import|in|is|lambda|None|nonlocal|not|or|pass|raise|return|True|try|while|with|yield)\b/g,
        },
        {
          type: "builtin",
          regex: /\b(print|len|range|enumerate|dict|list|set|tuple|float|int|str|Path|open|sum|min|max|zip|map|filter|all|any|sorted)\b/g,
        },
      ];

      let html = escapeHtml(raw);
      patterns.forEach(({ type, regex }) => {
        html = html.replace(regex, (m) => `<span class="code-token ${type}">${escapeHtml(m)}</span>`);
      });
      codeNode.innerHTML = html;
    };

    const copyText = async (text) => {
      try {
        await navigator.clipboard.writeText(text);
        return true;
      } catch (err) {
        try {
          const ta = document.createElement("textarea");
          ta.value = text;
          ta.style.position = "fixed";
          ta.style.top = "-500px";
          document.body.appendChild(ta);
          ta.focus();
          ta.select();
          const ok = document.execCommand("copy");
          ta.remove();
          return ok;
        } catch (err2) {
          console.warn("Copy failed", err2);
          return false;
        }
      }
    };

    blocks.forEach((block) => {
      const fullNode = block.querySelector(".code-full");
      const previewNode = block.querySelector(".code-preview");
      if (!fullNode) return;
      const fullText = (fullNode.textContent || "").trim();
      if (!fullText) return;

      highlightPython(fullNode.querySelector("code") || fullNode);
      if (previewNode) highlightPython(previewNode.querySelector("code") || previewNode);

      const actions = document.createElement("div");
      actions.className = "code-actions";

      const copyBtn = document.createElement("button");
      copyBtn.type = "button";
      copyBtn.textContent = "Ganzes Skript kopieren";
      copyBtn.addEventListener("click", async () => {
        const ok = await copyText(fullText);
        const label = ok ? "Kopiert!" : "Kopieren fehlgeschlagen";
        const prev = copyBtn.textContent;
        copyBtn.textContent = label;
        setTimeout(() => {
          copyBtn.textContent = prev;
        }, 1800);
      });

      let expanded = false;
      const toggleBtn = document.createElement("button");
      toggleBtn.type = "button";
      toggleBtn.className = "secondary";
      const applyState = () => {
        fullNode.hidden = !expanded;
        fullNode.classList.toggle("is-expanded", expanded);
        block.classList.toggle("is-expanded", expanded);
        toggleBtn.textContent = expanded ? "Vollständiges Skript ausblenden" : "Vollständiges Skript anzeigen";
        const sheet = block.closest(".sheet");
        if (sheet) {
          sheet.classList.toggle("is-code-expanded", expanded);
        }
      };
      applyState();
      toggleBtn.addEventListener("click", () => {
        expanded = !expanded;
        applyState();
      });

      actions.append(copyBtn, toggleBtn);
      block.appendChild(actions);
    });
  }

  function initThemeSwitch() {
    const radios = Array.from(document.querySelectorAll('input[name="theme-mode"]'));
    const stored = (localStorage.getItem("sheetTheme") || "").toLowerCase();
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

    applyTheme(stored === "dark" ? "dark" : "light", false);

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

  function buildVideoList() {
    const list = document.getElementById("video-list");
    if (!list) return;
    list.innerHTML = "";

    if (!videoEntries.length) {
      const li = document.createElement("li");
      li.textContent = "(keine Videos markiert)";
      list.appendChild(li);
      return;
    }

    videoEntries.forEach((item) => {
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
      label.textContent = `Video ${item.number}: ${item.title}`;

      const page = document.createElement("span");
      page.className = "toc-page";
      page.textContent = item.page;

      li.append(number, label, page);
      list.appendChild(li);
    });

    list.addEventListener("click", (event) => {
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
  }

  function populateBuildInfo() {
    const bodyEl = document.body;
    const repoUrl = (bodyEl.dataset.repoUrl || userSettings.repoUrl || "").trim() || "https://github.com/Seren200018/Vorlesung-Skript-Template";
    const repoTarget = document.querySelector("[data-build-target='repo']");
    if (repoTarget) {
      repoTarget.textContent = repoUrl;
      if (repoTarget.href !== undefined) {
        repoTarget.href = repoUrl;
      }
    }

    const dateTarget = document.querySelector("[data-build-target='date']");
    const dateSource = (bodyEl.dataset.gitLastMod || bodyEl.dataset.repoModified || document.lastModified || "").trim();
    if (dateTarget) {
      dateTarget.textContent = formatDate(dateSource);
    }

    const authorTarget = document.querySelector("[data-build-target='author']");
    if (authorTarget) {
      authorTarget.textContent = (bodyEl.dataset.author || userSettings.author || "Autor / Dozent").trim();
    }

    const copyrightTarget = document.querySelector("[data-build-target='copyright']");
    if (copyrightTarget) {
      const license = (bodyEl.dataset.license || userSettings.license || "CC BY-NC 4.0").trim();
      copyrightTarget.textContent = license;
    }
  }

  function formatDate(raw) {
    if (!raw) return "–";
    const parsed = new Date(raw);
    if (Number.isNaN(parsed.getTime())) return raw;
    return parsed.toLocaleDateString("de-DE", { year: "numeric", month: "2-digit", day: "2-digit" });
  }

  // Build DOI-based literature index and inline citation rendering.
  function buildLiteratureIndex() {
    const list = document.getElementById("literature-list");
    const citations = Array.from(document.querySelectorAll(".doi-citation"));
    if (!list) return;

    const entries = new Map();
    const formatInline = (author, year, pages) => {
      const cleanAuthor = author || "Autor";
      const cleanYear = year || "o.J.";
      const cleanPages = pages ? `, ${pages}` : "";
      return `(${cleanAuthor} ${cleanYear}${cleanPages})`;
    };

    citations.forEach((node, idx) => {
      const author = (node.dataset.author || "").trim();
      const year = (node.dataset.year || "").trim();
      const pages = (node.dataset.pages || "").trim();
      const title = (node.dataset.title || "").trim();
      const journal = (node.dataset.journal || "").trim();
      const doi = (node.dataset.doi || "").trim();
      const url = (node.dataset.url || "").trim();
      const link = doi ? `https://doi.org/${doi}` : url;

      const inline = document.createElement(link ? "a" : "span");
      inline.textContent = formatInline(author, year, pages);
      if (link) {
        inline.href = link;
        inline.target = "_blank";
        inline.rel = "noreferrer noopener";
      }
      node.innerHTML = "";
      node.appendChild(inline);

      const key = doi || `${author}-${year}-${title}` || `entry-${idx}`;
      if (!entries.has(key)) {
        entries.set(key, {
          author: author || "o. Autor",
          year: year || "o.J.",
          pages,
          title,
          journal,
          doi,
          link,
        });
      }
    });

    list.innerHTML = "";
    if (!entries.size) {
      const li = document.createElement("li");
      li.textContent = "(keine Einträge markiert)";
      list.appendChild(li);
      return;
    }

    entries.forEach((entry) => {
      const li = document.createElement("li");
      li.className = "literature-item";

      const parts = [];
      if (entry.author || entry.year) parts.push(`${entry.author} (${entry.year})`);
      if (entry.title) parts.push(entry.title);
      if (entry.journal) parts.push(entry.journal);
      if (entry.pages) parts.push(entry.pages);

      const infoText = parts.filter(Boolean).join(". ");
      if (entry.link) {
        const info = document.createElement("span");
        info.textContent = infoText || "Quelle";
        const anchor = document.createElement("a");
        anchor.href = entry.link;
        anchor.textContent = entry.doi ? `DOI: ${entry.doi}` : entry.link;
        anchor.target = "_blank";
        anchor.rel = "noreferrer noopener";

        li.append(info);
        li.append(" – ");
        li.append(anchor);
      } else {
        li.textContent = infoText || "Quelle";
      }

      list.appendChild(li);
    });
  }

  // Configure print/save dialog including optional sub-sheet cloning and offline export.
  function initPrintDialog() {
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

    window.addEventListener("afterprint", cleanupClones);
  }

  function buildVideoIframe(url, title) {
    const iframeWrap = document.createElement("div");
    iframeWrap.className = "video-embed";
    const iframe = document.createElement("iframe");
    iframe.src = url;
    iframe.title = title || "YouTube Video";
    iframe.loading = "lazy";
    iframe.allowFullscreen = true;
    iframe.referrerPolicy = "strict-origin-when-cross-origin";
    iframeWrap.appendChild(iframe);
    return iframeWrap;
  }

  function buildVideoQr(link, title) {
    const img = document.createElement("img");
    img.alt = title || "Video QR";
    img.className = "video-qr";
    const encoded = encodeURIComponent(link);
    img.src = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encoded}`;
    const wrapper = document.createElement("div");
    wrapper.className = "video-qr-wrapper";
    wrapper.appendChild(img);
    const linkCaption = document.createElement("div");
    linkCaption.className = "video-qr-caption";
    const linkEl = document.createElement("a");
    linkEl.href = link;
    linkEl.target = "_blank";
    linkEl.rel = "noreferrer noopener";
    linkEl.textContent = link;
    linkCaption.appendChild(linkEl);
    wrapper.appendChild(linkCaption);
    return wrapper;
  }
});
