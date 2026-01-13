import "./settings.js";
import "./symbol-settings.js";
import initTemplate from "./template.js";
import { renderRoughTemplate, renderMassSpringDamper } from "./rough-template.js";
import { initJsxGraphDemo } from "./jsx-graph-demo.js";
import { initMassSpringDamperAnchorsDemo } from "./msd-anchors-demo.js";

window.addEventListener("DOMContentLoaded", () => {
  initTemplate();

  const target = document.getElementById("sketch-template-demo");
  if (target) {
    renderRoughTemplate(target, {
      width: 450,
      height: 300,
      title: "Rough.js Skizze",
      subtitle: "Anpassbare Vorlage",
    });
  }

  const msd = document.getElementById("msd-sketch");
  if (msd) {
    renderMassSpringDamper(msd, {
      width: 450,
      height: 180,
      massLabel: "m",
      springLabel: "k",
      damperLabel: "c",
      forceLabel: "F(t)",
    });
  }

  const msdAnchorDemo = document.getElementById("msd-anchor-demo");
  if (msdAnchorDemo) {
    initMassSpringDamperAnchorsDemo(msdAnchorDemo);
  }

  const jsxDemo = document.getElementById("jsx-graph-demo");
  if (jsxDemo) {
    initJsxGraphDemo("jsx-graph-demo");
  }
});
