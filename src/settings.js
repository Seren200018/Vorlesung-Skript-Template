// Global configuration consumed by src/template.js.
// Edit values here to change defaults without touching the template logic.
window.TemplateSettings = {
  lectureTitle: "Vorlagenkurs",          // Title shown in footers and headers.
  lectureChapter: "Kapitel",             // Label used for chapter headings in headers.

  // Override MathJax/JSZip sources (local first, then CDN as fallback).
  mathJaxSources: [
    "node_modules/mathjax/es5/tex-mml-chtml.js",
    "https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-mml-chtml.js",
  ],
  jsZipSources: [
    "node_modules/jszip/dist/jszip.min.js",
    "https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js",
  ],

  // Audio player defaults. Mode: "off" | "manual" | "autoplay"
  audio: {
    mode: "manual",
  },

  // Repository metadata used on the QR/build info sheet.
  repoUrl: "https://github.com/Seren200018/Vorlesung-Skript-Template",
  author: "Autor / Dozent",
  license: "CC BY-NC 4.0",
  version: "0.1.0",
};
