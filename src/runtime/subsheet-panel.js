// Handle click-to-open subsheets into the right-side panel.
export function initSubsheetPanel({ typeset, requestAudioUpdate }) {
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
export function numberSubpages({ sheets }) {
  sheets.forEach((sheet) => {
    const mainPage = Number(sheet.dataset.pageNumber);
    const subs = Array.from(sheet.querySelectorAll(".sub-page-sheet"));
    subs.forEach((sub, idx) => {
      sub.dataset.subpageId = `${mainPage}-${idx + 1}`;
    });
  });
}
