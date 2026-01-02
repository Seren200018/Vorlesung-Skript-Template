import rough from "roughjs/bundled/rough.esm.js";

/**
 * Render a sketchy SVG template into a target element.
 * @param {HTMLElement} target container element
 * @param {Object} cfg configuration
 */
export function renderRoughTemplate(target, cfg = {}) {
  if (!target) return;
  const width = cfg.width || 800;
  const height = cfg.height || 600;
  target.innerHTML = "";

  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("width", width);
  svg.setAttribute("height", height);
  svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
  svg.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  target.appendChild(svg);

  const rc = rough.svg(svg);

  const palette = {
    frame: "#222",
    accent: "#fe8100",
    text: "#111",
  };

  // outer frame
  svg.appendChild(
    rc.rectangle(10, 10, width - 20, height - 20, {
      stroke: palette.frame,
      strokeWidth: 2,
      roughness: 2.2,
      bowing: 1.5,
    })
  );

  // header box
  svg.appendChild(
    rc.rectangle(30, 30, width - 60, 90, {
      stroke: palette.accent,
      strokeWidth: 2.5,
      fill: "#fff7ec",
      fillStyle: "hachure",
      roughness: 1.7,
      bowing: 1.2,
    })
  );

  // sidebar box
  svg.appendChild(
    rc.rectangle(30, 140, 180, height - 180, {
      stroke: palette.frame,
      strokeWidth: 2,
      fill: "#f5f5f5",
      fillStyle: "cross-hatch",
      roughness: 1.5,
    })
  );

  // content box
  svg.appendChild(
    rc.rectangle(230, 140, width - 270, height - 180, {
      stroke: palette.frame,
      strokeWidth: 2,
      roughness: 1.6,
    })
  );

  // lines in sidebar
  for (let i = 0; i < 6; i++) {
    const y = 180 + i * 45;
    svg.appendChild(
      rc.line(50, y, 190, y, {
        stroke: palette.frame,
        strokeWidth: 1.5,
        roughness: 1.8,
      })
    );
  }

  // bullet lines in main content
  for (let i = 0; i < 8; i++) {
    const y = 200 + i * 40;
    svg.appendChild(
      rc.line(250, y, width - 80, y, {
        stroke: palette.frame,
        strokeWidth: 1.4,
        roughness: 1.9,
      })
    );
  }

  // title text
  const title = document.createElementNS("http://www.w3.org/2000/svg", "text");
  title.setAttribute("x", 50);
  title.setAttribute("y", 85);
  title.setAttribute("fill", palette.text);
  title.setAttribute("font-size", "36");
  title.setAttribute("font-family", "Arial, Helvetica, sans-serif");
  title.textContent = cfg.title || "Sketched Template";
  svg.appendChild(title);

  const subtitle = document.createElementNS("http://www.w3.org/2000/svg", "text");
  subtitle.setAttribute("x", 50);
  subtitle.setAttribute("y", 115);
  subtitle.setAttribute("fill", palette.text);
  subtitle.setAttribute("font-size", "18");
  subtitle.setAttribute("font-family", "Arial, Helvetica, sans-serif");
  subtitle.textContent = cfg.subtitle || "Rough.js example";
  svg.appendChild(subtitle);

  return svg;
}

/**
 * Render a simple mass-spring-damper sketch.
 * @param {HTMLElement} target container element
 * @param {Object} cfg configuration
 */
export function renderMassSpringDamper(target, cfg = {}) {
  if (!target) return;
  const width = cfg.width || 800;
  const height = cfg.height || 300;
  target.innerHTML = "";

  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("width", width);
  svg.setAttribute("height", height);
  svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
  svg.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  target.appendChild(svg);

  const rc = rough.svg(svg);
  const baseY = height - 40;
  const wallX = 60;
  const massX = width - 220;
  const massWidth = 140;
  const massHeight = 90;

  // ground line
  svg.appendChild(
    rc.line(20, baseY, width - 20, baseY, { stroke: "#222", strokeWidth: 2, roughness: 1.6 })
  );

  // wall
  svg.appendChild(
    rc.rectangle(20, 40, 40, baseY - 40, {
      stroke: "#222",
      fill: "#f5f5f5",
      fillStyle: "zigzag",
      strokeWidth: 2,
      roughness: 1.6,
    })
  );

  // mass block
  svg.appendChild(
    rc.rectangle(massX, baseY - massHeight, massWidth, massHeight, {
      stroke: "#0d47a1",
      fill: "#e3f2fd",
      fillStyle: "hachure",
      strokeWidth: 2.4,
      roughness: 1.4,
      bowing: 1.2,
    })
  );

  // spring as zigzag
  const springStartX = wallX + 40;
  const springEndX = massX - 10;
  const springY = baseY - massHeight / 2;
  const zigCount = 8;
  const zigSpacing = (springEndX - springStartX) / zigCount;
  let springPath = `M ${springStartX} ${springY}`;
  for (let i = 0; i < zigCount; i++) {
    const x = springStartX + (i + 0.5) * zigSpacing;
    const y = springY + (i % 2 === 0 ? -18 : 18);
    springPath += ` L ${x} ${y}`;
    springPath += ` L ${springStartX + (i + 1) * zigSpacing} ${springY}`;
  }
  const spring = document.createElementNS("http://www.w3.org/2000/svg", "path");
  spring.setAttribute("d", springPath);
  spring.setAttribute("stroke", "#e65100");
  spring.setAttribute("fill", "none");
  spring.setAttribute("stroke-width", "3");
  spring.setAttribute("stroke-linecap", "round");
  spring.setAttribute("stroke-linejoin", "round");
  svg.appendChild(spring);

  // damper (dashpot)
  const dampY = springY + 50;
  const dampStart = springStartX + 20;
  const dampEnd = massX - 20;
  svg.appendChild(
    rc.line(dampStart, dampY, dampStart + 40, dampY, { stroke: "#444", strokeWidth: 2 })
  );
  svg.appendChild(
    rc.rectangle(dampStart + 40, dampY - 12, 50, 24, {
      stroke: "#444",
      fill: "#f0f0f0",
      fillStyle: "solid",
      strokeWidth: 2,
      roughness: 1.2,
    })
  );
  svg.appendChild(
    rc.line(dampStart + 90, dampY, dampEnd - 40, dampY, { stroke: "#444", strokeWidth: 2 })
  );
  svg.appendChild(
    rc.rectangle(dampEnd - 40, dampY - 16, 26, 32, {
      stroke: "#444",
      fill: "none",
      strokeWidth: 2,
      roughness: 1.2,
    })
  );
  svg.appendChild(
    rc.line(dampEnd - 14, dampY - 16, dampEnd - 14, dampY + 16, {
      stroke: "#444",
      strokeWidth: 2,
    })
  );

  // labels
  const addText = (txt, x, y, color = "#111", size = 16) => {
    const t = document.createElementNS("http://www.w3.org/2000/svg", "text");
    t.setAttribute("x", x);
    t.setAttribute("y", y);
    t.setAttribute("fill", color);
    t.setAttribute("font-size", size);
    t.setAttribute("font-family", "Arial, Helvetica, sans-serif");
    t.textContent = txt;
    svg.appendChild(t);
  };

  addText(cfg.massLabel || "m", massX + massWidth / 2 - 6, baseY - massHeight / 2 + 6, "#0d47a1", 18);
  addText(cfg.springLabel || "k", (springStartX + springEndX) / 2, springY - 24, "#e65100", 16);
  addText(cfg.damperLabel || "c", (dampStart + dampEnd) / 2, dampY + 28, "#444", 16);
  addText(cfg.forceLabel || "F(t)", massX + massWidth + 20, baseY - massHeight / 2, "#b71c1c", 16);

  // force arrow
  svg.appendChild(
    rc.line(massX + massWidth, springY, massX + massWidth + 40, springY, {
      stroke: "#b71c1c",
      strokeWidth: 3,
      roughness: 1.4,
    })
  );
  const arrow = document.createElementNS("http://www.w3.org/2000/svg", "path");
  arrow.setAttribute(
    "d",
    `M ${massX + massWidth + 40} ${springY} L ${massX + massWidth + 30} ${springY - 8} L ${massX + massWidth + 30} ${springY + 8} Z`
  );
  arrow.setAttribute("fill", "#b71c1c");
  svg.appendChild(arrow);

  return svg;
}
