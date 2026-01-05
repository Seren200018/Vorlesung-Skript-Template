export function buildAssetLists({ sheets }) {
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
