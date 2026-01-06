function readText(node) {
  return (node?.textContent || "").replace(/\s+/g, " ").trim();
}

function pickTitleAuthor(sheet) {
  const explicit =
    sheet.querySelector("[data-title-author]") ||
    sheet.querySelector(".Titlepage.Author") ||
    sheet.querySelector(".titlepage-author") ||
    sheet.querySelector("#titlepage-author");
  const explicitText = readText(explicit);
  if (explicitText) return explicitText;

  const abstract = sheet.querySelector(".abstract") || sheet;
  const candidates = Array.from(abstract.querySelectorAll("p, h1, h2, h3, div, span"));
  const filtered = candidates.filter((el) => {
    if (el.closest(".Titlepage.Series, .Titlepage.Title, .Titlepage.Subtitle")) return false;
    if (el.matches(".Titlepage.Series, .Titlepage.Title, .Titlepage.Subtitle")) return false;
    return true;
  });
  for (let i = filtered.length - 1; i >= 0; i -= 1) {
    const text = readText(filtered[i]);
    if (text) return text;
  }
  return "";
}

export function syncMetadataFromTitlePage(ctx) {
  const { body } = ctx;
  const titleSheet = document.querySelector(".sheet.Titlepage") || document.querySelector(".Titlepage");
  if (!titleSheet) return;

  const series = readText(
    titleSheet.querySelector("[data-title-series]") || titleSheet.querySelector(".Titlepage.Series")
  );
  const title = readText(
    titleSheet.querySelector("[data-title-main]") || titleSheet.querySelector(".Titlepage.Title")
  );
  const subtitle = readText(
    titleSheet.querySelector("[data-title-subtitle]") || titleSheet.querySelector(".Titlepage.Subtitle")
  );
  const author = pickTitleAuthor(titleSheet);

  if (title) body.dataset.lectureTitle = title;
  if (series) body.dataset.lectureSeries = series;
  if (subtitle) body.dataset.lectureSubtitle = subtitle;
  if (author) body.dataset.author = author;

  // Mirror into ctx so downstream init steps use the updated values.
  ctx.lectureTitle = body.dataset.lectureTitle || ctx.lectureTitle;
  ctx.lectureChapter = body.dataset.lectureChapter || ctx.lectureChapter;
}

