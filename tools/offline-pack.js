// Build an offline bundle: inline local CSS/JS/MathJax and zip HTML plus assets.
import fs from "fs/promises";
import path from "path";
import JSZip from "jszip";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, "..");

const readText = async (p) => fs.readFile(p, "utf8");
const exists = async (p) => fs.access(p).then(() => true).catch(() => false);

const inlineCssImports = async (cssText, base) => {
  const importRegex = /@import\s+url\(([^)]+)\)\s*;?/g;
  let match;
  let inlined = cssText;
  while ((match = importRegex.exec(cssText)) !== null) {
    const raw = match[1].replace(/['"]/g, "").trim();
    if (!raw) continue;
    try {
      const resolved = raw.startsWith("http") ? raw : path.resolve(path.dirname(base), raw);
      const imported = await readText(resolved);
      inlined = inlined.replace(match[0], imported);
    } catch {
      // ignore missing imports
    }
  }
  return inlined;
};

const inlineStyles = async (html) => {
  const linkRegex = /<link[^>]+rel=["']stylesheet["'][^>]*href=["']([^"']+)["'][^>]*>/gi;
  let match;
  let output = html;
  const replacements = [];
  while ((match = linkRegex.exec(html)) !== null) {
    const href = match[1];
    if (href.startsWith("http")) continue;
    const filePath = path.resolve(root, href);
    if (!(await exists(filePath))) continue;
    let cssText = await readText(filePath);
    cssText = await inlineCssImports(cssText, filePath);
    replacements.push({ full: match[0], cssText });
  }
  replacements.forEach(({ full, cssText }) => {
    output = output.replace(full, `<style>\n${cssText}\n</style>`);
  });
  return output;
};

const inlineScripts = async (html) => {
  const scriptRegex = /<script[^>]+src=["']([^"']+)["'][^>]*>\s*<\/script>/gi;
  let match;
  let output = html;
  const replacements = [];
  while ((match = scriptRegex.exec(html)) !== null) {
    const src = match[1];
    if (src.toLowerCase().includes("mathjax")) continue; // handled separately
    if (src.startsWith("http")) continue;
    const filePath = path.resolve(root, src);
    if (!(await exists(filePath))) continue;
    const jsText = await readText(filePath);
    replacements.push({ full: match[0], jsText });
  }
  replacements.forEach(({ full, jsText }) => {
    output = output.replace(full, `<script>\n${jsText}\n</script>`);
  });
  return output;
};

const inlineMathJax = async (html, zip) => {
  const mjRegex = /<script[^>]+src=["'][^"']*mathjax[^"']*["'][^>]*>\s*<\/script>/i;
  const match = html.match(mjRegex);
  if (!match) return html;
  const sources = [
    path.resolve(root, "node_modules/mathjax/es5/tex-mml-chtml.js"),
    "https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-mml-chtml.js",
  ];
  for (const src of sources) {
    try {
      let js;
      if (src.startsWith("http")) {
        // skip remote fetch in offline build environment
        continue;
      } else {
        js = await readText(src);
      }
      zip.file("mathjax.js", js);
      return html.replace(match[0], `<script src="mathjax.js"></script>`);
    } catch {
      continue;
    }
  }
  return html;
};

const addDirToZip = async (zip, dir) => {
  const dirPath = path.resolve(root, dir);
  if (!(await exists(dirPath))) return;
  const entries = await fs.readdir(dirPath, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name.startsWith(".")) continue;
    const fullPath = path.join(dirPath, entry.name);
    const zipPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      const folder = zip.folder(zipPath);
      if (folder) await addDirToZip(folder, zipPath);
    } else {
      const data = await fs.readFile(fullPath);
      zip.file(zipPath, data);
    }
  }
};

const build = async () => {
  const zip = new JSZip();
  const indexPath = path.resolve(root, "index.html");
  let html = await readText(indexPath);

  html = await inlineStyles(html);
  html = await inlineScripts(html);
  html = await inlineMathJax(html, zip);
  html = html.replace(
    "</body>",
    `<div class="build-stamp">Build ${buildStamp}</div></body>`
  );

  const finalHtml = "<!DOCTYPE html>\n" + html;
  zip.file("document.html", finalHtml);

  // include assets (images/dist) so references resolve
  await addDirToZip(zip, "img");
  await addDirToZip(zip, "dist");

  const outDir = path.resolve(root, "dist");
  await fs.mkdir(outDir, { recursive: true });
  const content = await zip.generateAsync({ type: "nodebuffer" });
  await fs.writeFile(path.join(outDir, "document.zip"), content);
  console.log("Offline bundle written to dist/document.zip");
};

build().catch((err) => {
  console.error("Offline bundle failed", err);
  process.exitCode = 1;
});
const pkgPath = path.resolve(root, "package.json");
const pkg = JSON.parse(await fs.readFile(pkgPath, "utf8"));
  const buildStamp = `${pkg.version} | ${new Date().toISOString()}`;
