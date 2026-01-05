export function createNotesFeature(ctx, { ensureJSZip }) {
  const { sheets, highlightColors, notesStorageKey } = ctx;
  let notesState = loadNotesState(notesStorageKey);
  let highlightEditor = null;
  let highlightMenu = null;
  let highlightCreator = null;
  let pendingHighlight = null;
  let lastSelection = null;
  let lastSelectionRect = null;
  let suppressMenuCloseOnce = false;

  function loadNotesState(key) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return { notes: {}, highlights: {} };
      const parsed = JSON.parse(raw);
      return {
        notes: parsed.notes || {},
        highlights: parsed.highlights || {},
      };
    } catch (err) {
      console.warn("Notes load failed", err);
      return { notes: {}, highlights: {} };
    }
  }

  function persistNotesState() {
    try {
      localStorage.setItem(notesStorageKey, JSON.stringify(notesState));
    } catch (err) {
      console.warn("Notes save failed", err);
    }
  }

  function ensureSheetMain(sheet) {
    return sheet;
  }

  function initSheetNotes() {
    notesState.notes = notesState.notes || {};
    notesState.highlights = notesState.highlights || {};

    sheets.forEach((sheet, idx) => {
      if (sheet.classList.contains("Titlepage")) return;
      ensureSheetMain(sheet);
      const sheetId = sheet.id || `sheet-${idx + 1}`;
      const storedNote = notesState.notes[sheetId] || "";

      let notesPane = sheet.querySelector(".sheet-notes");
      if (!notesPane) {
        notesPane = document.createElement("div");
        notesPane.className = "sheet-notes";
        notesPane.innerHTML = `
          <div class="sheet-notes__title"></div>
          <textarea class="sheet-notes__area" aria-label="Notizen"></textarea>
          <div class="sheet-notes__highlights"></div>
        `;
        sheet.appendChild(notesPane);
      }

      const title = notesPane.querySelector(".sheet-notes__title");
      if (title) title.textContent = `Notizen zu Seite ${sheet.dataset.pageNumber || idx + 1}`;

      const area = notesPane.querySelector(".sheet-notes__area");
      if (area) {
        area.value = storedNote;
        area.addEventListener("input", () => {
          notesState.notes[sheetId] = area.value;
          persistNotesState();
        });
      }

      applyStoredHighlights(sheet, sheetId);
    });

    bindGlobalToggle();
  }

  function clearHighlights(sheet, sheetId) {
    notesState.highlights[sheetId] = [];
    sheet.querySelectorAll(".highlight-note").forEach((span) => unwrapHighlight(span));
    persistNotesState();
  }

  function addHighlightForSheet(sheet, sheetId) {
    const info = getSelectionForSheet(sheet);
    if (!info) return;
    showHighlightCreator(info.range, sheet, sheetId || info.sheetId || "", null);
  }

  function createHighlightFromRange(sheet, sheetId, range, comment, color) {
    const text = (range.toString() || "").trim();
    if (!text) return;
    const entry = {
      id: `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
      text,
      comment: comment || "",
      color: highlightColors.includes(color) ? color : "yellow",
    };
    const span = applyHighlightToSheet(sheet, entry, range);
    if (!span) return;
    const list = notesState.highlights[sheetId] || [];
    list.push(entry);
    notesState.highlights[sheetId] = list;
    persistNotesState();
    closeHighlightMenu();
    closeHighlightCreator();
  }

  function applyStoredHighlights(sheet, sheetId) {
    const list = (notesState.highlights && notesState.highlights[sheetId]) || [];
    list.forEach((entry) => {
      applyHighlightToSheet(sheet, entry);
    });
  }

  function applyHighlightToSheet(sheet, entry, rangeOverride = null) {
    if (!entry || !entry.text) return null;
    if (sheet.querySelector(`[data-hl-id="${entry.id}"]`)) return null;
    let range = rangeOverride;
    if (!range) {
      const match = findTextMatch(sheet, entry.text);
      if (!match) return null;
      range = match.range;
    }
    const contents = range.extractContents();
    const span = document.createElement("span");
    span.className = "highlight-note";
    span.dataset.hlId = entry.id;
    span.dataset.hlColor = highlightColors.includes(entry.color) ? entry.color : "yellow";
    span.title = entry.comment || "Kommentar";
    span.appendChild(contents);
    range.insertNode(span);
    span.addEventListener("click", (e) => {
      e.stopPropagation();
      sheet.classList.add("notes-open");
      showHighlightCreator(range, sheet, sheet.id || "", entry);
    });
    return span;
  }

  function getHighlightIdFromRange(range) {
    const startNode =
      range.commonAncestorContainer?.nodeType === 1
        ? range.commonAncestorContainer
        : range.commonAncestorContainer?.parentElement;
    const span = startNode?.closest?.(".highlight-note");
    return span?.dataset?.hlId || "";
  }

  function unwrapHighlight(span) {
    const parent = span.parentNode;
    if (!parent) return;
    const frag = document.createDocumentFragment();
    while (span.firstChild) {
      frag.appendChild(span.firstChild);
    }
    parent.replaceChild(frag, span);
    parent.normalize();
  }

  function removeHighlight(id) {
    Object.keys(notesState.highlights || {}).forEach((sheetId) => {
      notesState.highlights[sheetId] = (notesState.highlights[sheetId] || []).filter((h) => h.id !== id);
    });
    document.querySelectorAll(`.highlight-note[data-hl-id="${id}"]`).forEach((span) => unwrapHighlight(span));
    persistNotesState();
  }

  function showHighlightEditor(span, entry, sheetId) {
    if (!span) return;
    closeHighlightEditor();
    highlightEditor = document.createElement("div");
    highlightEditor.className = "highlight-editor";
    highlightEditor.innerHTML = `
      <div style="display:flex; align-items:center; justify-content:space-between; gap:6px;">
        <div style="font-size:11px; font-weight:700;">Kommentar zur Markierung</div>
        <button type="button" class="hl-close" aria-label="Schließen">✕</button>
      </div>
      <textarea aria-label="Kommentar">${entry.comment || ""}</textarea>
      <div class="highlight-editor__actions">
        <button type="button" class="hl-save">Speichern</button>
        <button type="button" class="hl-delete">Löschen</button>
      </div>
    `;
    document.body.appendChild(highlightEditor);

    const rect = span.getBoundingClientRect();
    const editorRect = highlightEditor.getBoundingClientRect();
    let top = rect.bottom + window.scrollY + 6;
    let left = rect.left + window.scrollX;
    if (!Number.isFinite(top)) top = 20 + window.scrollY;
    if (!Number.isFinite(left)) left = 20 + window.scrollX;
    left = Math.min(left, window.scrollX + window.innerWidth - editorRect.width - 8);
    top = Math.max(8 + window.scrollY, top);
    highlightEditor.style.top = `${top}px`;
    highlightEditor.style.left = `${left}px`;

    const textarea = highlightEditor.querySelector("textarea");
    const saveBtn = highlightEditor.querySelector(".hl-save");
    const delBtn = highlightEditor.querySelector(".hl-delete");
    const closeBtn = highlightEditor.querySelector(".hl-close");

    const closeEditor = () => closeHighlightEditor();

    saveBtn?.addEventListener("click", () => {
      entry.comment = textarea.value.trim();
      span.title = entry.comment || "Kommentar";
      persistNotesState();
      upsertHighlightRow(span.closest(".sheet"), sheetId, entry);
      closeEditor();
    });

    delBtn?.addEventListener("click", () => {
      removeHighlight(entry.id);
      unwrapHighlight(span);
      closeEditor();
    });

    closeBtn?.addEventListener("click", closeEditor);
  }

  function closeHighlightEditor() {
    if (highlightEditor) {
      highlightEditor.remove();
      highlightEditor = null;
    }
  }

  function initHighlightContextMenu() {
    document.addEventListener("selectionchange", cacheSelection);
    document.addEventListener("mouseup", () => {
      cacheSelection();
      maybeShowHoverMenu();
    });
    document.addEventListener("keyup", cacheSelection);

    document.addEventListener("contextmenu", (event) => {
      const sheet = event.target.closest(".sheet");
      if (!sheet) return;
      const info = getSelectionForSheet(sheet);
      if (!info) return;
      event.preventDefault();
      const highlightId = getHighlightIdFromRange(info.range);
      pendingHighlight = { sheet: info.sheet, sheetId: info.sheetId, range: info.range, highlightId };
      showHighlightMenu(event.clientX, event.clientY);
    });

    document.addEventListener("click", (e) => {
      if (suppressMenuCloseOnce) {
        suppressMenuCloseOnce = false;
        return;
      }
      if (!highlightMenu) return;
      if (!highlightMenu.contains(e.target)) closeHighlightMenu();
    });

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        closeHighlightMenu();
        closeHighlightCreator();
      }
    });
  }

  function showHighlightMenu(x, y) {
    closeHighlightMenu({ keepPending: true });
    highlightMenu = document.createElement("div");
    highlightMenu.className = "highlight-menu";
    const addBtn = document.createElement("button");
    addBtn.type = "button";
    addBtn.textContent = "Highlight + Notiz";
    addBtn.addEventListener("click", () => {
      const ctx = pendingHighlight;
      closeHighlightMenu();
      if (ctx) {
        showHighlightCreator(ctx.range, ctx.sheet, ctx.sheetId);
      }
    });
    highlightMenu.appendChild(addBtn);

    const copyBtn = document.createElement("button");
    copyBtn.type = "button";
    copyBtn.textContent = "Text kopieren";
    copyBtn.addEventListener("click", () => {
      const ctx = pendingHighlight;
      if (!ctx) return;
      const txt = (ctx.range?.toString() || "").trim();
      if (txt) navigator.clipboard?.writeText(txt).catch(() => {});
      closeHighlightMenu();
    });
    highlightMenu.appendChild(copyBtn);

    if (pendingHighlight?.highlightId) {
      const del = document.createElement("button");
      del.type = "button";
      del.textContent = "🗑️";
      del.title = "Highlight löschen";
      del.addEventListener("click", () => {
        removeHighlight(pendingHighlight.highlightId);
        closeHighlightMenu();
      });
      highlightMenu.appendChild(del);
    }
    document.body.appendChild(highlightMenu);
    const top = y + window.scrollY + 6;
    const left = x + window.scrollX + 6;
    highlightMenu.style.top = `${top}px`;
    highlightMenu.style.left = `${left}px`;
    suppressMenuCloseOnce = true;
  }

  function closeHighlightMenu(opts = {}) {
    const { keepPending = false } = opts;
    if (highlightMenu) {
      highlightMenu.remove();
      highlightMenu = null;
    }
    if (!keepPending) pendingHighlight = null;
  }

  function maybeShowHoverMenu() {
    if (highlightMenu || highlightCreator) return;
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed) return;
    const range = sel.getRangeAt(0).cloneRange();
    const container =
      range.commonAncestorContainer.nodeType === 1
        ? range.commonAncestorContainer
        : range.commonAncestorContainer.parentElement;
    if (container?.closest?.(".sheet-notes")) return;
    const sheet = container?.closest?.(".sheet");
    if (!sheet) return;
    const highlightId = getHighlightIdFromRange(range);
    pendingHighlight = { sheet, sheetId: sheet.id || "", range, highlightId };
    const rect = range.getBoundingClientRect();
    const x = rect.right;
    const y = rect.bottom;
    showHighlightMenu(x, y);
  }

  function showHighlightCreator(range, sheet, sheetId, existingEntry = null) {
    closeHighlightCreator();
    if (!sheetId) sheetId = sheet.id || "";
    highlightCreator = document.createElement("div");
    highlightCreator.className = "highlight-create";
    highlightCreator.innerHTML = `
      <div style="display:flex; align-items:center; justify-content:space-between; gap:6px;">
        <div style="font-size:11px; font-weight:700;">Kommentar hinzufügen</div>
        <button type="button" class="hlc-close" aria-label="Schließen">✕</button>
      </div>
      <div style="font-size:11px; margin:2mm 0; color:#555;">${(range.toString() || "").slice(0, 120)}</div>
      <div class="hlc-color-row">
        ${highlightColors
          .map(
            (c) =>
              `<button type="button" class="hlc-color-btn" data-color="${c}" title="${c}" aria-label="Farbe ${c}"></button>`
          )
          .join("")}
      </div>
      <textarea class="hlc-text" aria-label="Kommentar" placeholder="Kommentar (optional)"></textarea>
      <div class="highlight-editor__actions">
        <button type="button" class="hl-save">Speichern</button>
        ${existingEntry ? `<button type="button" class="hl-delete" title="Highlight löschen">🗑️</button>` : ""}
        <button type="button" class="hl-cancel">Abbrechen</button>
      </div>
    `;
    document.body.appendChild(highlightCreator);
    const rect = range.getBoundingClientRect();
    const creatorRect = highlightCreator.getBoundingClientRect();
    let top = rect.bottom + window.scrollY + 8;
    let left = rect.left + window.scrollX;
    left = Math.min(left, window.scrollX + window.innerWidth - creatorRect.width - 8);
    top = Math.max(8 + window.scrollY, top);
    highlightCreator.style.top = `${top}px`;
    highlightCreator.style.left = `${left}px`;

    const textarea = highlightCreator.querySelector(".hlc-text");
    const colorButtons = Array.from(highlightCreator.querySelectorAll(".hlc-color-btn"));
    let selectedColor = existingEntry && highlightColors.includes(existingEntry.color) ? existingEntry.color : "yellow";
    const applyColorState = () => {
      colorButtons.forEach((btn) => {
        const c = btn.dataset.color;
        btn.classList.toggle("is-selected", c === selectedColor);
      });
    };
    applyColorState();
    colorButtons.forEach((btn) => {
      btn.addEventListener("click", () => {
        selectedColor = btn.dataset.color;
        applyColorState();
      });
    });
    if (existingEntry) {
      textarea.value = existingEntry.comment || "";
    }
    const saveBtn = highlightCreator.querySelector(".hl-save");
    const deleteBtn = highlightCreator.querySelector(".hl-delete");
    const cancelBtn = highlightCreator.querySelector(".hl-cancel");
    const closeBtn = highlightCreator.querySelector(".hlc-close");

    const close = () => closeHighlightCreator();

    saveBtn?.addEventListener("click", () => {
      const comment = textarea.value.trim();
      const color = selectedColor;
      if (existingEntry) {
        existingEntry.comment = comment;
        existingEntry.color = highlightColors.includes(color) ? color : "yellow";
        const span = sheet.querySelector(`.highlight-note[data-hl-id="${existingEntry.id}"]`);
        if (span) {
          span.title = comment || "Kommentar";
          span.dataset.hlColor = existingEntry.color;
        }
        persistNotesState();
      } else {
        createHighlightFromRange(sheet, sheetId, range, comment, color);
      }
      close();
    });
    deleteBtn?.addEventListener("click", () => {
      if (!existingEntry) return;
      removeHighlight(existingEntry.id);
      close();
    });
    cancelBtn?.addEventListener("click", close);
    closeBtn?.addEventListener("click", close);
  }

  function closeHighlightCreator() {
    if (highlightCreator) {
      highlightCreator.remove();
      highlightCreator = null;
    }
  }

  function cacheSelection() {
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed) return;
    const range = sel.getRangeAt(0);
    const sheet = (range.commonAncestorContainer.nodeType === 1
      ? range.commonAncestorContainer
      : range.commonAncestorContainer.parentElement
    )?.closest?.(".sheet");
    if (!sheet) return;
    const rect = range.getBoundingClientRect();
    lastSelection = {
      range: range.cloneRange(),
      sheet,
      sheetId: sheet.id || "",
    };
    lastSelectionRect = rect;
  }

  function getSelectionForSheet(sheet) {
    const sel = window.getSelection();
    if (sel && !sel.isCollapsed) {
      const range = sel.getRangeAt(0).cloneRange();
      if (sheet.contains(range.commonAncestorContainer)) {
        return { range, sheet, sheetId: sheet.id || "" };
      }
    }
    if (lastSelection && lastSelection.sheet === sheet) {
      return {
        range: lastSelection.range.cloneRange(),
        sheet,
        sheetId: lastSelection.sheetId || sheet.id || "",
        rect: lastSelectionRect,
      };
    }
    return null;
  }

  function findTextMatch(root, text) {
    if (!text) return null;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode: (node) => {
        if (!node.parentElement) return NodeFilter.FILTER_REJECT;
        if (node.parentElement.closest(".sheet-notes, .highlight-note")) return NodeFilter.FILTER_REJECT;
        if (!node.data || !node.data.trim()) return NodeFilter.FILTER_SKIP;
        return NodeFilter.FILTER_ACCEPT;
      },
    });
    let current;
    while ((current = walker.nextNode())) {
      const idx = current.data.indexOf(text);
      if (idx !== -1) {
        const range = document.createRange();
        range.setStart(current, idx);
        range.setEnd(current, idx + text.length);
        return { range };
      }
    }
    return null;
  }

  function initNoteExport() {
    const btn = document.getElementById("notes-export");
    if (!btn) return;
    btn.addEventListener("click", () => {
      exportNotesBundle().catch((err) => console.error("Notes export failed", err));
    });
  }

  async function exportNotesBundle() {
    const data = JSON.stringify(notesState, null, 2);
    const html = "<!DOCTYPE html>\n" + document.documentElement.outerHTML;

    const download = (name, blob) => {
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = name;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(a.href);
    };

    try {
      await ensureJSZip();
      if (!window.JSZip) throw new Error("JSZip unavailable");
      const zip = new JSZip();
      zip.file("notes.json", data);
      zip.file("document.html", html);
      const blob = await zip.generateAsync({ type: "blob" });
      download("notes_bundle.zip", blob);
    } catch (err) {
      console.warn("Zip export failed, falling back to JSON", err);
      download("notes.json", new Blob([data], { type: "application/json" }));
    }
  }

  function initNoteImport() {
    const btn = document.getElementById("notes-import");
    if (!btn) return;
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json,application/json";
    input.style.display = "none";
    input.addEventListener("change", () => {
      const file = input.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const parsed = JSON.parse(reader.result || "{}");
          notesState = {
            notes: parsed.notes || {},
            highlights: parsed.highlights || {},
          };
          persistNotesState();
          applyImportedNotes();
        } catch (err) {
          console.warn("Import failed", err);
        }
      };
      reader.readAsText(file);
      input.value = "";
    });
    document.body.appendChild(input);
    btn.addEventListener("click", () => input.click());
  }

  function applyImportedNotes() {
    sheets.forEach((sheet, idx) => {
      if (sheet.classList.contains("Titlepage")) return;
      const sheetId = sheet.id || `sheet-${idx + 1}`;
      const notesPane = sheet.querySelector(".sheet-notes");
      const area = notesPane?.querySelector(".sheet-notes__area");
      if (area) {
        area.value = notesState.notes?.[sheetId] || "";
      }
      clearHighlights(sheet, sheetId);
      applyStoredHighlights(sheet, sheetId);
    });
  }

  function upsertHighlightRow(sheet, sheetId, entry) {
    const list = sheet.querySelector(".sheet-notes__highlights");
    if (!list) return;
    let row = list.querySelector(`[data-hl-id="${entry.id}"]`);
    if (!row) {
      row = document.createElement("div");
      row.dataset.hlId = entry.id;
      row.className = "sheet-notes__highlight-row";
      list.appendChild(row);
    }
    row.innerHTML = "";
    const tag = document.createElement("span");
    tag.className = "sheet-notes__highlight-tag";
    tag.dataset.hlColor = entry.color || "yellow";
    tag.textContent = entry.comment || entry.text.slice(0, 40);
    row.appendChild(tag);

    const actions = document.createElement("div");
    actions.className = "sheet-notes__hl-actions";

    const edit = document.createElement("button");
    edit.type = "button";
    edit.className = "small";
    edit.textContent = "Bearbeiten";
    edit.addEventListener("click", () => {
      const span = sheet.querySelector(`.highlight-note[data-hl-id="${entry.id}"]`);
      if (!span) return;
      showHighlightEditor(span, entry, sheetId);
    });
    actions.appendChild(edit);

    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "small";
    remove.textContent = "Löschen";
    remove.addEventListener("click", () => {
      removeHighlight(entry.id);
      const span = sheet.querySelector(`.highlight-note[data-hl-id="${entry.id}"]`);
      if (span) unwrapHighlight(span);
      row.remove();
    });
    actions.appendChild(remove);

    row.appendChild(actions);
  }

  return {
    initSheetNotes,
    initNoteExport,
    initNoteImport,
    initHighlightContextMenu,
  };

  function bindGlobalToggle() {
    const btn = document.getElementById("notes-toggle-all");
    if (!btn) return;
    let allOpen = false;
    const updateText = () => {
      btn.textContent = allOpen ? "Alle Notizen schließen" : "Alle Notizen öffnen";
    };
    updateText();
    btn.addEventListener("click", () => {
      allOpen = !allOpen;
      sheets.forEach((sheet, idx) => {
        if (sheet.classList.contains("Titlepage")) return;
        sheet.classList.toggle("notes-open", allOpen);
      });
      updateText();
    });
  }
}
