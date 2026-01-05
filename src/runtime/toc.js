export function buildTocAndPageChrome(ctx) {
  const { sheets, markerMap, lectureChapter, lectureTitle } = ctx;
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
    const slug = ensureSheetSlug(sheet);

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
    sheet.appendChild(buildSelfLink(slug, page));

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
      sub.appendChild(buildSelfLink(slug, page));
    });
  });
}

function slugify(raw) {
  return (raw || "")
    .toString()
    .trim()
    .toLowerCase()
    .replace(/['"()]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function ensureSheetSlug(sheet) {
  if (sheet.dataset.linkSlug) return sheet.dataset.linkSlug;
  const explicit = sheet.dataset.link || "";
  const tocTitle = sheet.querySelector("[data-toc]")?.dataset?.toc || "";
  let slug = slugify(explicit) || slugify(tocTitle) || slugify(sheet.id) || `sheet-${sheet.dataset.pageNumber || ""}`;
  if (!slug) slug = `sheet-${Date.now()}`;
  sheet.dataset.linkSlug = slug;
  if (!document.getElementById(slug)) {
    const anchor = document.createElement("a");
    anchor.id = slug;
    anchor.className = "sheet-link-anchor";
    anchor.setAttribute("aria-hidden", "true");
    sheet.prepend(anchor);
  }
  return slug;
}

function buildSelfLink(slug, pageNumber) {
  const a = document.createElement("a");
  a.className = "page-number-link";
  a.href = `#${slug}`;
  a.textContent = pageNumber ? `${pageNumber}` : slug;
  a.title = `Link zu Seite ${pageNumber || slug} kopieren`;
  a.addEventListener("click", (e) => {
    e.preventDefault();
    const url = new URL(window.location.href);
    url.hash = slug;
    navigator.clipboard?.writeText(url.toString()).catch(() => {});
  });
  return a;
}
