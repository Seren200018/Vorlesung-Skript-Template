import { createTemplateContext, runSafe } from "./context.js";
import { createMathService } from "./math-service.js";
import { createZipService } from "./jszip-service.js";
import { initSubsheetPanel, numberSubpages } from "./subsheet-panel.js";
import { buildTocAndPageChrome } from "./toc.js";
import { buildSymbolColumns } from "./symbols.js";
import { buildAssetLists } from "./asset-lists.js";
import { createNotesFeature } from "./notes.js";
import { createAudioFeature } from "./audio.js";
import { createVideoFeature } from "./videos.js";
import { initPythonDemos } from "./python-demos.js";
import { initThemeSwitch } from "./theme.js";
import { initPrintDialog } from "./print.js";
import { populateBuildInfo } from "./build-info.js";
import { buildLiteratureIndex } from "./literature.js";

export function initTemplate(options = {}) {
  const ctx = createTemplateContext(options);
  const math = createMathService(ctx);
  const zip = createZipService(ctx);
  const notes = createNotesFeature(ctx, { ensureJSZip: zip.ensureJSZip });
  const audio = createAudioFeature(ctx);
  const videos = createVideoFeature(ctx);

  window.addEventListener("scroll", audio.requestAudioUpdate, { passive: true });
  window.addEventListener("resize", audio.requestAudioUpdate);

  runSafe("numberSubpages", () => numberSubpages(ctx));
  runSafe("initSubsheetPanel", () =>
    initSubsheetPanel({ typeset: math.typeset, requestAudioUpdate: audio.requestAudioUpdate })
  );
  runSafe("buildTocAndPageChrome", () => buildTocAndPageChrome(ctx));
  runSafe("buildSymbolColumns", () => buildSymbolColumns(ctx, math.typeset));
  runSafe("buildAssetLists", () => buildAssetLists(ctx));
  runSafe("populateBuildInfo", () => populateBuildInfo(ctx));
  runSafe("initAudioControls", () => {
    audio.initAudioControls();
    audio.bindVolumeControl();
  });
  runSafe("initVideos", () => videos.initVideos());
  runSafe("buildVideoList", () => videos.buildVideoList());
  runSafe("buildLiteratureIndex", () => buildLiteratureIndex());
  runSafe("initPythonDemos", initPythonDemos);
  runSafe("initThemeSwitch", () => initThemeSwitch(ctx));
  runSafe("initPrintDialog", () => initPrintDialog(ctx, { ensureJSZip: zip.ensureJSZip }));
  runSafe("initSheetNotes", () => notes.initSheetNotes());
  runSafe("initNoteExport", () => notes.initNoteExport());
  runSafe("initNoteImport", () => notes.initNoteImport());
  runSafe("initHighlightContextMenu", () => notes.initHighlightContextMenu());
  // Math tooltips disabled per request

  window.addEventListener("load", () => {
    runSafe("initVideos (load)", () => videos.initVideos());
    runSafe("buildVideoList (load)", () => videos.buildVideoList());
    runSafe("buildLiteratureIndex (load)", () => buildLiteratureIndex());
    runSafe("renderSheetAudio (load)", () => audio.renderSheetAudio());
    // Math tooltips disabled per request
  });

  return {
    context: ctx,
    math,
    zip,
    audio,
    videos,
    notes,
  };
}
