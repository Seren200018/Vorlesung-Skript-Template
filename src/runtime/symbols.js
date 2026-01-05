export function buildSymbolColumns(ctx, typeset) {
  const { sheets, symbolSettings } = ctx;
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

  if (symbolColumns.length && typeset) typeset(symbolColumns);
}
