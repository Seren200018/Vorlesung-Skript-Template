# AVC Script Template

A printable lecture/script template with TOC, symbols, audio, notes, print/export, and demo sketches. Built as a Vite library with bundled CSS.

## Install from your GitHub repo

1. Push this repo to GitHub (e.g., `Seren200018/Vorlesung-Skript-Template`) and tag a release, e.g. `v0.1.0`.
2. In another project, install directly from GitHub:
   ```bash
   npm install Seren200018/Vorlesung-Skript-Template#v0.1.0
   ```
   The `prepare` script builds `dist/` on install, so you don’t need committed artifacts.

## Use in code

```js
import initTemplate from "avc-script-template";

initTemplate();
// Optional: render demos if your HTML contains the matching elements
// import { renderRoughTemplate, initJsxGraphDemo } from "avc-script-template";
```

## Use via CDN (jsDelivr)

Replace the tag with your release/tag:
```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/Seren200018/Vorlesung-Skript-Template@v0.1.0/dist/avc-script-template.css">
<script type="module">
  import initTemplate from "https://cdn.jsdelivr.net/gh/Seren200018/Vorlesung-Skript-Template@v0.1.0/dist/avc-script-template.es.js";
  initTemplate();
</script>
```

## Build locally

```bash
npm install
npm run build
```

## Notes import safety

- Exports now include a `docId` plus per-sheet metadata (slug, title, hash). Imports remap notes to sheets by slug/title, so adding new sheets between existing ones won’t misalign notes.
- If a sheet’s content hash changed since export, the imported note is prefixed with a warning to review it.
- Importing still replaces existing notes/highlights. When current notes/highlights exist, a confirmation modal appears with three choices: export then import, import directly, or cancel. The modal works in both light and dark themes.

## JSXGraph theme palette

- Ten colorblind-friendly CSS variables are exposed for JSXGraph: `--jxg-color-1` … `--jxg-color-10`. They auto-switch between light and dark palettes via the `data-theme` attribute.
- The demo graph reads these variables and updates on theme change; reuse them for your own curves to keep graphs consistent with the active theme.
