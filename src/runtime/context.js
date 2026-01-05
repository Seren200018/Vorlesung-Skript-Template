const DEFAULT_HIGHLIGHT_COLORS = ["yellow", "mint", "blue", "pink", "gray"];

// Build a shared context with DOM references and user-configurable settings.
export function createTemplateContext(options = {}) {
  const body = document.body;
  const userSettings = {
    ...(window.TemplateSettings || {}),
    ...(options.settings || {}),
  };
  const symbolSettings = {
    ...(window.SymbolSettings || {}),
    ...(options.symbolSettings || {}),
  };

  const sheets = Array.from(document.querySelectorAll(".sheet"));
  sheets.forEach((sheet, idx) => {
    sheet.dataset.pageNumber = idx + 1;
    if (!sheet.id) sheet.id = `sheet-${idx + 1}`;
  });

  return {
    body,
    sheets,
    userSettings,
    symbolSettings,
    lectureTitle: body.dataset.lectureTitle || userSettings.lectureTitle || "Vorlagenkurs",
    lectureChapter: body.dataset.lectureChapter || userSettings.lectureChapter || "Kapitel",
    highlightColors: options.highlightColors || DEFAULT_HIGHLIGHT_COLORS,
    audioDefaults: userSettings.audio || { mode: "manual" },
    markerMap: new Map(),
    videoEntries: [],
    sheetAudio: [],
    audioRegistry: [],
    notesStorageKey: options.notesStorageKey || "sheetNotesStateV1",
  };
}

// Guard individual init steps so one failure does not abort the whole runtime.
export function runSafe(label, fn) {
  try {
    fn();
  } catch (err) {
    console.warn(`${label} failed`, err);
  }
}
