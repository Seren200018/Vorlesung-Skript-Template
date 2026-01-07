# AVC Script Template – Functional Wiki

Quick reference for how the template’s core runtime pieces work and what you can hook into as a user.

## Entry points
- `initTemplate(options?)` (`src/runtime/init-template.js`): sets up context, math, audio, video, notes, TOC, symbols, theme switch, print dialog, and literature list. Call once after DOM is ready.
- `initJsxGraphDemo(targetId)` (`src/jsx-graph-demo.js`): optional demo initializer for the JSXGraph sample; safe to remove in production.

## Theme handling (`src/runtime/theme.js`)
- Persists theme in `localStorage` (`sheetTheme`), toggles classes `theme-light` / `theme-dark`, and sets `data-theme` on `<html>`.
- Exposes `window.sheetThemeMode` as `"light"` or `"dark"` for custom logic.
- Before/after print hooks temporarily force light mode for printing.

## Notes & highlights (`src/runtime/notes.js`)
- Per-sheet notes sidebar is created on demand; data is stored in `localStorage` under `notesStorageKey` (default `sheetNotesStateV1`).
- Exports include: `docId`, `sheetMeta` (id, slug, title, hash), `notes`, `highlights`. Export prefers zip (with `notes.json` and `document.html`) and falls back to JSON.
- Imports accept `.zip` or `.json`; remaps notes/highlights to current sheets by slug/title and warns inside note text if the sheet hash changed. Adding sheets between exports/imports won’t shift notes off their pages.
- Import confirmation modal appears if existing notes/highlights are present, offering export-first, import-only, or cancel. Works in light/dark.
- Highlights: context menu or selection to create; stored text + comment + color; clicking a highlight opens the editor.

## Audio (`src/runtime/audio.js`)
- Collects sheet-level `data-audio-src`/`data-audio-title`, renders footer controls, and syncs playback across sheets. Modes (`manual`/`autoplay`) are persisted (`sheetAudioMode`). Volume is persisted (`sheetAudioVolume`).
- Footer title toggles play/pause; progress bar and scrubber are injected per sheet/subsheet.

## TOC, headers/footers, and linking (`src/runtime/toc.js`)
- Builds TOC from `[data-toc]` markers; numbers chapters, updates inline headings, and renders per-sheet headers/footers.
- Adds self-links (`.page-number-link`) with copy-on-click behavior; generates stable slugs from `data-link` or derived titles.

## Symbols (`src/runtime/symbols.js`)
- Reads per-sheet `data-symbols` and global `SymbolSettings` to render a side column with symbol/description pairs when present.

## Asset lists (`src/runtime/asset-lists.js`)
- Auto-builds figure, table, and video lists from `data-figure` / `data-table` / video entries, with numbering and click-to-scroll behavior.

## Videos (`src/runtime/videos.js`)
- Gathers `.video-entry` items (`data-video-id`, title, caption), renders embeds, and builds a video list. Respects print by swapping embeds with QR codes.

## Python demo (`src/runtime/python-demos.js`)
- Handles expandable code blocks with preview/full script and optional copy actions for the example Python card.

## Print/export (`src/runtime/print.js`)
- Controls print modal, print/save triggers, and optional inclusion of subsheets and full code blocks when printing.

## Sub-sheets (`src/runtime/subsheet-panel.js`)
- Numbers subsheets, enables right-side slide-out panel, and handles cloning/rendering subsheet content when opened.

## Build info (`src/runtime/build-info.js`)
- Populates build metadata on the QR sheet from `data-*` attributes or settings: last modified, author, copyright.

## JSXGraph palette
- Ten colorblind-friendly CSS vars (`--jxg-color-1` … `--jxg-color-10`) defined per theme in `css/modified-paper.css`.
- JSXGraph demo reads these vars and listens to `data-theme` changes to keep stroke colors in sync with light/dark.

## Theme-aware styling notes
- Use `:root[data-theme="light"]` / `:root[data-theme="dark"]` or `body.theme-light` / `body.theme-dark` to style components.
- Shared colors: `--bg-color`, `--text-color`, `--sheet-bg`, `--code-bg`, `--code-text`.

## Extending safely
- Prefer adding data attributes on sheets instead of editing runtime code. Key ones:
  - `data-toc="Title"`: marks an element (typically an `h1`) to be included in the TOC; the first occurrence per sheet sets the page header/footer chapter label.
  - `data-symbols="F: Kraft; m: Masse"`: adds a left-side symbol column for that sheet, parsed as `symbol: description` pairs separated by semicolons.data-toc, data-symbols, data-audio-*, data-link
  - `data-audio-src="audio/file.mp3"` and `data-audio-title="Label"` on a sheet: registers sheet audio; footer controls are injected automatically.
  - `data-link="custom-slug"` on a sheet: forces the anchor slug used for self-linking and TOC jumps (otherwise derived from TOC title or sheet id).
- Use `window.sheetThemeMode` and CSS variables for theme-aware custom widgets.
- Keep new DOM injected elements outside `.sheet-notes` to avoid conflicts with text/highlight walkers.
