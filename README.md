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
