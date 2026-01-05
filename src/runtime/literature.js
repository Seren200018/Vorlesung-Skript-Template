export function buildLiteratureIndex() {
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
