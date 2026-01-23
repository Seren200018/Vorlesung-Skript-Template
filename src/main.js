import "./settings.js";
import "./symbol-settings.js";
import initTemplate from "./template.js";

window.addEventListener("DOMContentLoaded", () => {
  initTemplate();

  const target = document.getElementById("sketch-template-demo");
  const msd = document.getElementById("msd-sketch");
  const msdAnchorDemo = document.getElementById("msd-anchor-demo");
  const jsxDemo = document.getElementById("jsx-graph-demo");

  const roughTemplatePromise = target || msd ? import("./rough-template.js") : null;

  if (target) {
    roughTemplatePromise?.then(({ renderRoughTemplate }) => {
      renderRoughTemplate(target, {
        width: 450,
        height: 300,
        title: "Rough.js Skizze",
        subtitle: "Anpassbare Vorlage",
      });
    });
  }

  if (msd) {
    roughTemplatePromise?.then(({ renderMassSpringDamper }) => {
      renderMassSpringDamper(msd, {
        width: 450,
        height: 180,
        massLabel: "m",
        springLabel: "k",
        damperLabel: "c",
        forceLabel: "F(t)",
      });
    });
  }

  if (msdAnchorDemo) {
    import("./msd-anchors-demo.js").then(({ initMassSpringDamperAnchorsDemo }) => {
      initMassSpringDamperAnchorsDemo(msdAnchorDemo, {
        bodeTargetId: "MSD_Anchor_middle_Div",
        controlsTargetId: "MSD_Anchor_rightmost_Div",
      });
    });
  }

  if (jsxDemo) {
    import("./jsx-graph-demo.js").then(({ initJsxGraphDemo }) => {
      initJsxGraphDemo("jsx-graph-demo");
    });
  }
});
