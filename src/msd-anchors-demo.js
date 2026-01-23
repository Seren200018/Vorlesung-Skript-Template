import rough from "roughjs/bundled/rough.esm.js";
import * as JXG from "jsxgraph";
import { MassSpringDamper, MultiMassSpringDamperTimeSystem,MassSpringDamperSystemTimeFreqDomainHandmade } from "./Spring_Mass_Damper_Elements.js";
import { create, all } from "mathjs";

const math = create(all);


export function initMassSpringDamperAnchorsDemo(target, options = {}) {
  // Entry point: build the UI and start the animation loop.
  if (!target) return;

  const templateSettings = window.TemplateSettings || {};
  const jsxColors = templateSettings.jsxGraphColors || {};
  const pickJxgColor = (idx, fallback) => {
    const style = getComputedStyle(document.documentElement);
    const val = style.getPropertyValue(`--jxg-color-${idx}`) || "";
    const clean = val.trim();
    return clean || fallback;
  };
  const bodeColors = {
    axis: jsxColors.axis || "#333",
    m1: pickJxgColor(1, jsxColors.m1 || "#1f77b4"),
    m2: pickJxgColor(2, jsxColors.m2 || "#d62728"),
    reference: pickJxgColor(3, jsxColors.reference || "#6c757d"),
    resonance: pickJxgColor(3, jsxColors.resonance || "#6c757d"),
    antiResonance: pickJxgColor(5, jsxColors.antiResonance || "#2e7d32"),
    excitation: pickJxgColor(4, jsxColors.excitation || "#f57c00"),
    background: jsxColors.background || "#fff",
    border: jsxColors.border || "#ddd",
  };

  // Cleanup any prior instance attached to the same DOM node.
  if (target._msdAnchorsCleanup) {
    target._msdAnchorsCleanup();
    target._msdAnchorsCleanup = null;
  }

  // --- Layout: visualization + bode + controls columns ---
  const bodeTarget =
    options.bodeTarget ||
    (typeof options.bodeTargetId === "string"
      ? document.getElementById(options.bodeTargetId)
      : null);
  const controlsTarget =
    options.controlsTarget ||
    (typeof options.controlsTargetId === "string"
      ? document.getElementById(options.controlsTargetId)
      : null);

  target.innerHTML = "";
  let wrap = null;
  if (!bodeTarget || !controlsTarget || bodeTarget === target || controlsTarget === target) {
    wrap = document.createElement("div");
    wrap.style.display = "flex";
    wrap.style.gap = "9px";
    wrap.style.alignItems = "stretch";
    wrap.style.height = "100%";
    wrap.style.width = "100%";
    target.appendChild(wrap);
  }

  // Visualization column (canvas only).
  const viz = document.createElement("div");
  viz.style.display = "flex";
  viz.style.flexDirection = "column";
  viz.style.gap = "1px";
  viz.style.width = "100%";
  viz.style.height = "120%";
  viz.style.flex = "0 0 auto";
  (wrap || target).appendChild(viz);

  // Canvas for the roughjs MSD drawing.
  const canvas = document.createElement("canvas");
  canvas.style.width = "100%";
  canvas.style.height = "100%";
  canvas.style.flex = "1 1 0";
  canvas.style.border = "none";
  viz.appendChild(canvas);

  // Bode column (plot + legend).
  const bodePane = document.createElement("div");
  bodePane.style.display = "flex";
  bodePane.style.flexDirection = "column";
  bodePane.style.gap = "8px";
  bodePane.style.flex = "0 0 300px";
  bodePane.style.height = "100%";
  (wrap || bodeTarget || target).appendChild(bodePane);

  // Legend row (line legend + frequency legend).
  const bodeLegendRow = document.createElement("div");
  bodeLegendRow.style.display = "flex";
  bodeLegendRow.style.alignItems = "flex-start";
  bodeLegendRow.style.justifyContent = "flex-start";
  bodeLegendRow.style.gap = "16px";
  bodeLegendRow.style.padding = "0 6px";
  bodePane.appendChild(bodeLegendRow);

  // Line legend (left).
  const bodeLegend = document.createElement("div");
  bodeLegend.style.display = "flex";
  bodeLegend.style.flexDirection = "column";
  bodeLegend.style.gap = "6px";
  bodeLegend.style.fontSize = "11px";
  bodeLegend.style.color = "#333";
  bodeLegendRow.appendChild(bodeLegend);

  // Frequency legend (right).
  const bodeFreqLegend = document.createElement("div");
  bodeFreqLegend.style.display = "flex";
  bodeFreqLegend.style.flexDirection = "column";
  bodeFreqLegend.style.gap = "2px";
  bodeFreqLegend.style.fontSize = "11px";
  bodeFreqLegend.style.color = "#333";
  bodeFreqLegend.style.alignItems = "flex-end";
  bodeLegendRow.appendChild(bodeFreqLegend);

  // Bode plot container (jsxgraph board).
  const bodeMount = document.createElement("div");
  bodeMount.id = `msd-bode-${Math.random().toString(36).slice(2)}`;
  bodeMount.style.flex = "1 1 auto";
  bodeMount.style.height = "250px";
  bodeMount.style.border = "none";
  bodeMount.style.background = bodeColors.background;
  bodePane.appendChild(bodeMount);

  const createLegendItem = (label, color, dashed = false) => {
    const row = document.createElement("div");
    row.style.display = "flex";
    row.style.alignItems = "center";
    row.style.gap = "6px";
    const swatch = document.createElement("span");
    swatch.style.width = "18px";
    swatch.style.height = "2px";
    swatch.style.background = color;
    if (dashed) {
      swatch.style.background = "none";
      swatch.style.borderTop = `2px dashed ${color}`;
    }
    const text = document.createElement("span");
    text.textContent = label;
    row.appendChild(swatch);
    row.appendChild(text);
    bodeLegend.appendChild(row);
    return row;
  };

  const legendM1 = createLegendItem("m1", bodeColors.m1);
  const legendM2 = createLegendItem("m2", bodeColors.m2);
  const legendRef = createLegendItem("m1 ref", bodeColors.reference, true);

  // Controls column (toggle + sliders + reset).
  const controls = document.createElement("div");
  controls.style.display = "flex";
  controls.style.flexDirection = "column";
  controls.style.gap = "8px";
  controls.style.minWidth = "100px";
  controls.style.fontFamily = "Arial, Helvetica, sans-serif";
  controls.style.fontSize = "12px";
  controls.style.color = "#111";
  (wrap || controlsTarget || target).appendChild(controls);

  // Rendering state for the canvas + bode board.
  const ctx = canvas.getContext("2d");
  const rc = rough.canvas(canvas);
  let width = 0;
  let height = 0;
  let bodeWidth = 0;
  let bodeHeight = 0;
  let bodeBoard = null;
  let centerX = 0;
  let groundY = 0;

  // --- Visual MSD elements (bottom + tuned mass) ---
  const msdBottom = new MassSpringDamper({
    x: 0,
    y: 0,
    massWidth: 120,
    massHeight: 60,
    springLength: 100,
    showDamper: true,
    showGround: true,
    labels: {
      springLeft: "k1",
      damperRight: "c1",
      massCenter: "m1",
    },
    labelStyle: {
      damperOffset: 30,
    },
    forceArrow: {
      length: 60,
      label: "F(t)",
      enabled: true,
      direction: "down",
      anchor: "topRight" ,
      offset: -1,
      label: "F(t)",
      labelOffset: -15,
    },
  });
  const msdTop = new MassSpringDamper({
    x: 0,
    y: 0,
    massWidth: 50,
    massHeight: 30,
    springLength: 100,
    showDamper: true,
    showGround: false,
    useGroundAnchor: true,
    labels: {
      springLeft: "k2",
      damperRight: "c2",
      massCenter: "m2",
    },
    labelStyle: {
      damperOffset: 30,
    },
  });

  // --- Bottom mass defaults ---
  const BottomMass = 1.0;
  const BottomDamping = 0.1;
  //w^2 = k/m = w2*2*pi*f
  const BottomStiffness = (1.0 *2*Math.PI)**2*BottomMass ; //1Hz Resonance


  // --- Tuned mass defaults ---
  let topMass = 0.1;
  let topDamping = 0.001;
  let TunedMassDamperEigenFreq = 1;
  let topStiffness = topMass * (2 * Math.PI * TunedMassDamperEigenFreq) ** 2;
  let tunedMassDamperEnabled = true;
  const defaultPositions = [0, 0];
  const defaultVelocities = [0, 0];
  let forceFrequency = 1.0;
  const forceFrequencyRange = { min: 0, max: 2, step: 0.1 };

  // --- Initial matrices for the 2-DOF model ---
  let C_Matrix = math.matrix([[BottomDamping + topDamping, -topDamping], [-topDamping, topDamping]]);
  let K_Matrix = math.matrix([[BottomStiffness + topStiffness, -topStiffness], [-topStiffness, topStiffness]]);
  let M_Matrix = math.matrix([[BottomMass, 0], [0, topMass]]);




  // --- Simulation object (time + frequency domain) ---
  const MSDTimeSystem2 = new MassSpringDamperSystemTimeFreqDomainHandmade({
    Massmatrix: M_Matrix,
    Stiffnessmatrix: K_Matrix,
    Dampingmatrix: C_Matrix,
    StartingPositions: defaultPositions,
    StartingVelocities: defaultVelocities,
    NumMasses: 2,
  });
  
  // --- External force definition (applied to lower mass) ---
  let ForceAmplitude = math.matrix([1, 0]);
    
  MSDTimeSystem2.AppliedForceParameters = {
    ForceType: "sine",
    Amplitude: ForceAmplitude,
    Forcefrequency: forceFrequency,
  };

  // --- MathJax helper for inline labels ---
  const requestMathTypeset = (targets) => {
    const attempt = () => {
      if (window.MathJax && typeof window.MathJax.typesetPromise === "function") {
        window.MathJax.typesetPromise(targets).catch(() => {});
        return true;
      }
      return false;
    };
    if (attempt()) return;
    const script = document.getElementById("MathJax-script");
    if (script) {
      script.addEventListener("load", () => attempt(), { once: true });
    }
  };

  // --- UI helpers for formatted sliders ---
  const formatValue = (value, step) => {
    const stepText = String(step);
    const decimals = stepText.includes(".") ? stepText.split(".")[1].length : 0;
    return value.toFixed(decimals);
  };

  
  // --- Slider builder (label + range input) ---
  const createSlider = ({ label, min, max, step, value, onInput }) => {
    const row = document.createElement("label");
    row.style.display = "flex";
    row.style.flexDirection = "column";
    row.style.gap = "4px";
    const title = document.createElement("span");
    const labelSpan = document.createElement("span");
    const separator = document.createElement("span");
    const valueSpan = document.createElement("span");
    const isMathLabel = typeof label === "string" && /\\\(|\\\[|\$\$/.test(label);
    labelSpan.textContent = label;
    separator.textContent = ": ";
    valueSpan.textContent = formatValue(value, step);
    title.appendChild(labelSpan);
    title.appendChild(separator);
    title.appendChild(valueSpan);
    const input = document.createElement("input");
    input.type = "range";
    input.min = min;
    input.max = max;
    input.step = step;
    input.value = value;
    input.style.width = "100%";
    input.style.boxSizing = "border-box";
    input.addEventListener("input", () => {
      const next = parseFloat(input.value);
      valueSpan.textContent = formatValue(next, step);
      onInput(next);
    });
    const setValue = (next, { emit = true } = {}) => {
      const numeric = parseFloat(next);
      if (!Number.isFinite(numeric)) {
        return;
      }
      input.value = numeric;
      valueSpan.textContent = formatValue(numeric, step);
      if (emit) {
        onInput(numeric);
      }
    };
    row.appendChild(title);
    row.appendChild(input);
    controls.appendChild(row);
    if (isMathLabel) {
      requestMathTypeset([labelSpan]);
    }
    return { input, setValue };
  };

  // --- Small on/off switch (button with sliding knob) ---
  const createToggleSwitch = ({ label, checked, onChange }) => {
    const row = document.createElement("label");
    row.style.display = "flex";
    row.style.alignItems = "center";
    row.style.gap = "6px";

    const button = document.createElement("button");
    button.type = "button";
    button.setAttribute("role", "switch");
    button.style.position = "relative";
    button.style.width = "34px";
    button.style.height = "18px";
    button.style.border = "none";
    button.style.borderRadius = "999px";
    button.style.padding = "0";
    button.style.cursor = "pointer";
    button.style.background = "#999";
    button.style.transition = "background 0.15s ease";

    const knob = document.createElement("span");
    knob.style.position = "absolute";
    knob.style.top = "2px";
    knob.style.left = "2px";
    knob.style.width = "14px";
    knob.style.height = "14px";
    knob.style.borderRadius = "50%";
    knob.style.background = "#fff";
    knob.style.transition = "transform 0.15s ease";
    button.appendChild(knob);

    const title = document.createElement("span");
    title.textContent = label;

    const setState = (enabled) => {
      button.setAttribute("aria-checked", enabled ? "true" : "false");
      button.style.background = enabled ? "#2e7d32" : "#999";
      knob.style.transform = enabled ? "translateX(16px)" : "translateX(0px)";
    };
    setState(checked);

    button.addEventListener("click", () => {
      checked = !checked;
      setState(checked);
      onChange(checked);
    });

    row.appendChild(button);
    row.appendChild(title);
    controls.appendChild(row);
    return { button, setState };
  };

  // --- Toggle-aware slider enable/disable ---
  let topMassControl = null;
  let topFreqControl = null;
  let topDampingControl = null;
  const updateTmdControls = () => {
    if (!topMassControl || !topFreqControl || !topDampingControl) {
      return;
    }
    const disabled = !tunedMassDamperEnabled;
    topMassControl.input.disabled = disabled;
    topFreqControl.input.disabled = disabled;
    topDampingControl.input.disabled = disabled;
  };

  // --- Controls: TMD switch + reset + sliders ---
  createToggleSwitch({
    label: "Tilger aktivieren",
    checked: tunedMassDamperEnabled,
    onChange: (enabled) => {
      tunedMassDamperEnabled = enabled;
      MSDTimeSystem2.reinitialize([0,0],[0,0])
      updateTmdControls();
    },
  });

  // Reset the simulation state back to defaults.
  const resetButton = document.createElement("button");
  resetButton.type = "button";
  resetButton.textContent = "Reset positions";
  resetButton.style.padding = "4px 8px";
  resetButton.style.fontSize = "12px";
  resetButton.addEventListener("click", () => {
    MSDTimeSystem2.reinitialize([0, 0], [0, 0]);
  });
  controls.appendChild(resetButton);

  // Tuned mass sliders (disabled when TMD is off).
  topMassControl = createSlider({
    label: "Masse Tilger [kg]",
    min: 0.05,
    max: 1,
    step: 0.01,
    value: topMass,
    onInput: (value) => {
      topMass = value;
      topStiffness = topMass * (2 * Math.PI * TunedMassDamperEigenFreq) ** 2;
    },
  });

  topFreqControl = createSlider({
    label: "\\(F_{\\mathrm{Tilger}}\\) [Hz]",
    min: 0.5,
    max: 2,
    step: 0.1,
    value: TunedMassDamperEigenFreq,
    onInput: (value) => {
      TunedMassDamperEigenFreq = value;
      topStiffness = topMass * (2 * Math.PI * value) ** 2;
    },
  });

  topDampingControl = createSlider({
    label: "Tilgerdämpfung",
    min: 0,
    max: 0.5,
    step: 0.01,
    value: topDamping,
    onInput: (value) => {
      topDamping = value;
    },
  });
  updateTmdControls();


  // --- Cached values to avoid unnecessary recompute ---
  let lastTopMass = topMass;
  let lastTopDamping = topDamping;
  let lastTopStiffness = topStiffness;
  let lastTunedEnabled = tunedMassDamperEnabled;
  let lastForceFrequency = forceFrequency;
  let bodeDirty = true;
  let bodeSnapTargets = [];
  let fixedBodeRange = null;
  // --- Bode plot config (sampling and snap behavior) ---
  const bodeConfig = {
    freqMin: forceFrequencyRange.min,
    freqMax: forceFrequencyRange.max,
    samples: 240,
    snapHz: 0.08,
  };

  // --- Update system matrices when controls change ---
  const syncSystemParameters = () => {
    if (
      topMass === lastTopMass &&
      topDamping === lastTopDamping &&
      topStiffness === lastTopStiffness &&
      forceFrequency === lastForceFrequency &&
      tunedMassDamperEnabled === lastTunedEnabled
    ) {
      return;
    }

    const activeTopDamping = tunedMassDamperEnabled ? topDamping : 0;
    const activeTopStiffness = tunedMassDamperEnabled ? topStiffness : 0;
    const dampingMatrix = math.matrix([
      [BottomDamping + activeTopDamping, -activeTopDamping],
      [-activeTopDamping, activeTopDamping],
    ]);
    const stiffnessMatrix = math.matrix([
      [BottomStiffness + activeTopStiffness, -activeTopStiffness],
      [-activeTopStiffness, activeTopStiffness],
    ]);
    const massMatrix = math.matrix([
      [BottomMass, 0],
      [0, topMass],
    ]);

    MSDTimeSystem2.setMassmatrix(massMatrix);
    MSDTimeSystem2.setDampingmatrix(dampingMatrix);
    MSDTimeSystem2.setStiffnessmatrix(stiffnessMatrix);
    MSDTimeSystem2.AppliedForceParameters = {
      ForceType: "sine",
      Amplitude: ForceAmplitude,
      Forcefrequency: forceFrequency,
    };

    lastTopMass = topMass;
    lastTopDamping = topDamping;
    lastTopStiffness = topStiffness;
    lastForceFrequency = forceFrequency;
    lastTunedEnabled = tunedMassDamperEnabled;
    bodeDirty = true;
  };

  // Pick a nice tick spacing based on range and target tick count.
  const getNiceStep = (range, ticks) => {
    if (!isFinite(range) || range <= 0) return 1;
    const rough = range / Math.max(1, ticks);
    const pow10 = Math.pow(10, Math.floor(Math.log10(rough)));
    const fraction = rough / pow10;
    let niceFraction = 1;
    if (fraction < 1.5) {
      niceFraction = 1;
    } else if (fraction < 3) {
      niceFraction = 2;
    } else if (fraction < 7) {
      niceFraction = 5;
    } else {
      niceFraction = 10;
    }
    return niceFraction * pow10;
  };

  // Snap a frequency value to nearby markers.
  const snapFrequency = (value, targets, tolerance) => {
    let snapped = value;
    let smallestDelta = tolerance;
    targets.forEach((target) => {
      const delta = Math.abs(value - target);
      if (delta <= smallestDelta) {
        smallestDelta = delta;
        snapped = target;
      }
    });
    return snapped;
  };

  // Update the excitation frequency (optionally snapping to markers).
  const updateForceFrequency = (value, { snap = false } = {}) => {
    let next = value;
    if (snap) {
      next = snapFrequency(next, bodeSnapTargets, bodeConfig.snapHz);
    }
    const clamped = Math.min(bodeConfig.freqMax, Math.max(bodeConfig.freqMin, next));
    forceFrequency = clamped;


    bodeDirty = true;
  };

  // Eigenfrequency computation for the 2-DOF model.
  const computeEigenFrequencies = () => {
    if (!MSDTimeSystem2?.Massmatrix || !MSDTimeSystem2?.Stiffnessmatrix) {
      return [];
    }
    const systemMatrix = math.multiply(
      math.inv(MSDTimeSystem2.Massmatrix),
      MSDTimeSystem2.Stiffnessmatrix
    );
    const matrixArray = systemMatrix.toArray();
    if (matrixArray.length !== 2 || matrixArray[0].length !== 2) {
      return [];
    }
    const a = matrixArray[0][0];
    const b = matrixArray[0][1];
    const c = matrixArray[1][0];
    const d = matrixArray[1][1];
    const trace = a + d;
    const det = a * d - b * c;
    const discriminant = trace * trace - 4 * det;
    if (!isFinite(discriminant)) {
      return [];
    }
    const root = Math.sqrt(Math.max(0, discriminant));
    const lambda1 = (trace + root) / 2;
    const lambda2 = (trace - root) / 2;
    const frequencies = [];
    if (lambda1 > 0) {
      frequencies.push(Math.sqrt(lambda1) / (2 * Math.PI));
    }
    if (lambda2 > 0) {
      frequencies.push(Math.sqrt(lambda2) / (2 * Math.PI));
    }
    return frequencies.sort((aVal, bVal) => aVal - bVal);
  };

  // Choose resonance frequencies based on TMD state.
  const computeResonanceFrequencies = () => {
    if (!tunedMassDamperEnabled) {
      return [Math.sqrt(BottomStiffness / BottomMass) / (2 * Math.PI)];
    }
    return computeEigenFrequencies();
  };

  // Single-DOF magnitude response (used for TMD-off reference).
  const getSingleDofBode = (frequencies, mass, damping, stiffness) =>
    frequencies.map((freq) => {
      const omega = 2 * Math.PI * freq;
      const real = stiffness - mass * omega * omega;
      const imag = damping * omega;
      return 1 / Math.sqrt(real * real + imag * imag);
    });

  // Estimate anti-resonance between resonance peaks.
  const findAntiresonance = (frequencies, magnitudes, resonanceFreqs, minFreq, maxFreq) => {
    if (resonanceFreqs.length < 2) {
      return null;
    }
    const lower = Math.max(resonanceFreqs[0], minFreq);
    const upper = Math.min(resonanceFreqs[resonanceFreqs.length - 1], maxFreq);
    if (lower >= upper) {
      return null;
    }
    let bestFrequency = null;
    let bestMagnitude = Infinity;
    for (let i = 0; i < frequencies.length; i += 1) {
      const freq = frequencies[i];
      if (freq < lower || freq > upper) {
        continue;
      }
      const magnitude = magnitudes[i];
      if (magnitude < bestMagnitude) {
        bestMagnitude = magnitude;
        bestFrequency = freq;
      }
    }
    return bestFrequency;
  };

  // Render the Bode magnitude plot using jsxgraph.
  const drawBodePlot = () => {
    if (!bodeWidth || !bodeHeight) {
      return;
    }

    // Frequency sweep samples.
    const freqStart = bodeConfig.freqMin;
    const freqEnd = bodeConfig.freqMax;
    const samples = bodeConfig.samples;
    const frequencies = [];
    for (let i = 0; i <= samples; i += 1) {
      frequencies.push(freqStart + ((freqEnd - freqStart) * i) / samples);
    }

    // Magnitude responses for the active and reference curves.
    let magnitudeM2 = null;
    const magnitudeM1 = tunedMassDamperEnabled
      ? MSDTimeSystem2.getBodePlotData(frequencies, 0, "magnitude", 0)
      : getSingleDofBode(frequencies, BottomMass, BottomDamping, BottomStiffness);
    const referenceM1 = tunedMassDamperEnabled
      ? getSingleDofBode(frequencies, BottomMass, BottomDamping, BottomStiffness)
      : null;
    if (tunedMassDamperEnabled) {
      magnitudeM2 = MSDTimeSystem2.getBodePlotData(frequencies, 1, "magnitude", 0);
    }

    // Convert to dB and compute bounds for the y-axis.
    const toDb = (value) => 20 * Math.log10(Math.max(value, 1e-8));
    const magDb1 = magnitudeM1.map(toDb);
    const magDb2 = magnitudeM2 ? magnitudeM2.map(toDb) : [];
    const magDbRef = referenceM1 ? referenceM1.map(toDb) : [];
    const allDb = magDb2.length ? magDb1.concat(magDb2) : magDb1.slice();
    let minDb = Math.min(...allDb);
    let maxDb = Math.max(...allDb);
    if (!isFinite(minDb) || !isFinite(maxDb)) {
      return;
    }
    if (minDb === maxDb) {
      minDb -= 1;
      maxDb += 1;
    } else {
      minDb -= 5;
      maxDb += 5;
    }

    // Fixed x range, cached y range.
    const xMin = freqStart;
    const xMax = freqEnd;
    const xStep = getNiceStep(freqEnd - freqStart, 6);
    const yStep = getNiceStep(maxDb - minDb, 6);
    let yMin = -60;
    let yMax = Math.ceil(maxDb / yStep) * yStep;
    if (!fixedBodeRange) {
      fixedBodeRange = { min: yMin, max: yMax };
    }
    yMin = fixedBodeRange.min;
    yMax = fixedBodeRange.max;

    const resonanceFreqs = computeResonanceFrequencies();
    const resonanceInRange = resonanceFreqs.filter(
      (freq) => freq >= xMin && freq <= xMax
    );
    const antiResonance = findAntiresonance(
      frequencies,
      magnitudeM1,
      resonanceInRange,
      xMin,
      xMax
    );
    bodeSnapTargets = resonanceInRange.slice();
    if (antiResonance != null) {
      bodeSnapTargets.push(antiResonance);
    }

    // Rebuild the board when parameters change.
    if (bodeBoard) {
      JXG.JSXGraph.freeBoard(bodeBoard);
      bodeBoard = null;
    }

    bodeBoard = JXG.JSXGraph.initBoard(bodeMount.id, {
      boundingbox: [xMin-0.1, yMax, xMax, yMin-5],
      axis: false,
      pan: { enabled: false },
      zoom: { enabled: false },
      showNavigation: false,
      showCopyright: false,
    });

    bodeBoard.suspendUpdate();

    // Axes and tick marks.
    const axisColor = bodeColors.axis;
    const xAxis = bodeBoard.create("axis", [[xMin, yMin], [xMax, yMin]], {
      strokeColor: axisColor,
      ticks: { visible: false },
    });
    const yAxis = bodeBoard.create("axis", [[xMin, yMin], [xMin, yMax]], {
      strokeColor: axisColor,
      ticks: { visible: false },
    });

    bodeBoard.create("ticks", [xAxis, 6], {
      ticksDistance: xStep,
      minorTicks: 4,
      label: { fontSize: 11 },
      strokeColor: axisColor,
    });
    bodeBoard.create("ticks", [yAxis, 6], {
      ticksDistance: yStep,
      minorTicks: 4,
      label: { fontSize: 11 },
      strokeColor: axisColor,
    });
    bodeBoard.create("text", [xMax, yMin + (yMax - yMin) * 0.05, "Hz"], {
      anchorX: "right",
      anchorY: "bottom",
      fixed: true,
      fontSize: 11,
      strokeColor: axisColor,
    });
    bodeBoard.create("text", [xMin + (xMax - xMin) * 0.02, yMax, "dB"], {
      anchorX: "left",
      anchorY: "top",
      fixed: true,
      fontSize: 11,
      strokeColor: axisColor,
    });

    // Curves: main response, tuned mass response, and reference.
    bodeBoard.create("curve", [frequencies, magDb1], {
      strokeColor: bodeColors.m1,
      strokeWidth: 2,
    });
    if (magDb2.length) {
      bodeBoard.create("curve", [frequencies, magDb2], {
        strokeColor: bodeColors.m2,
        strokeWidth: 2,
      });
    }
    if (magDbRef.length) {
      bodeBoard.create("curve", [frequencies, magDbRef], {
        strokeColor: bodeColors.reference,
        strokeWidth: 1,
        dash: 2,
      });
    }

    // Toggle legend items based on active curves.
    legendM2.style.display = magDb2.length ? "flex" : "none";
    legendRef.style.display = magDbRef.length ? "flex" : "none";

    // Markers for resonances and anti-resonance.
    const labelY = yMax - (yMax - yMin) * 0.04;
    const formatHz = (value) => value.toFixed(2);
    const addMarker = (freq, label, color, dash = 2) => {
      bodeBoard.create("segment", [[freq, yMin], [freq, yMax]], {
        strokeColor: color,
        dash,
        strokeWidth: 1.0,
      });
      bodeBoard.create("text", [freq, labelY, label], {
        anchorX: "middle",
        anchorY: "top",
        useMathjax: true,
        fixed: true,
        fontSize: 13,
        strokeColor: color,
        background: "rgba(255, 255, 255, 0.5)",
        cssStyle: 'background: rgba(255, 255, 255, 0.7);'
      });
    };
    const addBottomMarker = (freq, label, color) => {
      const y = yMin + (yMax - yMin) * 0.015;
      bodeBoard.create("text", [freq, y, label], {
        anchorX: "middle",
        anchorY: "bottom",
        useMathjax: true,
        fixed: true,
        fontSize: 13,
        strokeColor: color,
        background: "rgba(255, 255, 255, 0.5)",
        cssStyle: "background: rgba(255, 255, 255, 0.7); padding: 0 1px; line-height: 0.4; display: inline-block;",
      });
    };

    resonanceInRange.forEach((freq, index) => {
      addMarker(freq, `$$f_{R${index + 1}}$$`, bodeColors.resonance, 1);
    });
    if (antiResonance != null) {
      addBottomMarker(antiResonance, "$$f_{AR}$$", bodeColors.antiResonance);
    }

    // Frequency list above the bode plot.
    bodeFreqLegend.innerHTML = "";
    const addFreqLabel = (label, value, color) => {
      const row = document.createElement("div");
      const labelSpan = document.createElement("span");
      labelSpan.textContent = `\\(${label}\\)`;
      const valueSpan = document.createElement("span");
      valueSpan.textContent = `=${formatHz(value)} Hz`;
      row.appendChild(labelSpan);
      row.appendChild(valueSpan);
      row.style.color = color;
      bodeFreqLegend.appendChild(row);
      requestMathTypeset([labelSpan]);
    };
    resonanceInRange.forEach((freq, index) => {
      addFreqLabel(`f_{R${index + 1}}`, freq, bodeColors.resonance);
    });
    if (antiResonance != null) {
      addFreqLabel("f_{AR}", antiResonance, bodeColors.antiResonance);
    }
    bodeFreqLegend.style.display = bodeFreqLegend.childElementCount ? "flex" : "none";

    // Current excitation frequency marker.
    const excitationFrequency = Math.min(xMax, Math.max(xMin, forceFrequency));
    bodeBoard.create("segment", [[excitationFrequency, yMin], [excitationFrequency, yMax]], {
      strokeColor: bodeColors.excitation,
      strokeWidth: 2,
    });

    // Allow clicking on the bode plot to set frequency (with snap).
    bodeBoard.on("down", (evt) => {
      const coords = bodeBoard.getUsrCoordsOfMouse(evt);
      if (!coords || coords.length < 2) {
        return;
      }
      const rawFreq = coords[0];
      if (!Number.isFinite(rawFreq)) {
        return;
      }
      const clamped = Math.min(bodeConfig.freqMax, Math.max(bodeConfig.freqMin, rawFreq));
      MSDTimeSystem2.reinitialize([0,0],[0,0]);
      updateForceFrequency(clamped, { snap: true });
    });

    bodeBoard.unsuspendUpdate();
  };

  // Resize canvas and align the masses relative to the ground.
  const resize = () => {
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    width = rect.width;
    height = rect.height;
    canvas.width = Math.max(1, Math.floor(width * dpr));
    canvas.height = Math.max(1, Math.floor(height * dpr));
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const bodeRect = bodeMount.getBoundingClientRect();
    bodeWidth = bodeRect.width;
    bodeHeight = bodeRect.height;
    if (bodeBoard) {
      bodeBoard.resizeContainer(bodeWidth, bodeHeight);
    }
    bodeDirty = true;

    centerX = width / 2;
    groundY = height - 28;
    msdBottom.ground.x = centerX - msdBottom.ground.width / 2;
    msdBottom.ground.y = groundY;
    msdBottom.mass.x = centerX - msdBottom.mass.width / 2;
    msdBottom.mass.y = msdBottom.ground.y - msdBottom.mass.height - msdBottom.springLength;
    msdTop.ground.width = msdTop.mass.width * 1.2;
    msdTop.mass.x = centerX - msdTop.mass.width / 2;
    msdTop.ground.x = msdBottom.mass.x + msdBottom.mass.width / 2 - msdTop.ground.width / 2;
    msdTop.ground.y = msdBottom.mass.y;
    msdTop.mass.y = msdTop.ground.y - msdTop.mass.height - msdTop.springLength;
  };

  // Initial sizing before the first frame.
  resize();


  // Debug helper: draw anchor points for a mass.
  const drawAnchorPoint = (point) => {
    ctx.save();
    ctx.fillStyle = "#e65100";
    ctx.beginPath();
    ctx.arc(point.x, point.y, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  };

  // Draw all anchor points for a mass (for debugging layout).
  const drawMassAnchors = (msd) => {
    drawAnchorPoint(msd.mass.getAnchorPoint("top"));
    drawAnchorPoint(msd.mass.getAnchorPoint("bottom"));
    drawAnchorPoint(msd.mass.getAnchorPoint("left"));
    drawAnchorPoint(msd.mass.getAnchorPoint("right"));
    drawAnchorPoint(msd.mass.getAnchorPoint("center"));
    drawAnchorPoint({ x: msd.mass.x, y: msd.mass.y });
    drawAnchorPoint({ x: msd.mass.x + msd.mass.width, y: msd.mass.y });
    drawAnchorPoint({ x: msd.mass.x, y: msd.mass.y + msd.mass.height });
    drawAnchorPoint({ x: msd.mass.x + msd.mass.width, y: msd.mass.y + msd.mass.height });
  };

  // --- Animation loop state ---
  let start = performance.now();
  let laststeptime = null;
  let animationId = null;
  let disposed = false;

  // Cleanup for re-init or hot reload.
  const cleanup = () => {
    disposed = true;
    if (animationId != null) {
      window.cancelAnimationFrame(animationId);
      animationId = null;
    }
    if (bodeBoard) {
      JXG.JSXGraph.freeBoard(bodeBoard);
      bodeBoard = null;
    }
  };
  target._msdAnchorsCleanup = cleanup;
  if (import.meta?.hot) {
    import.meta.hot.dispose(cleanup);
  }

  let LastTime = Date.now();
  let StartTime = LastTime;
  // Main animation loop: update state, redraw MSD + bode.
  const animate = (now) => {
    if (disposed) {
      return;
    }
    const t = (LastTime - StartTime) / 1000;

    // Sync model matrices if any inputs changed.
    syncSystemParameters();
    if (bodeDirty) {
      drawBodePlot();
      bodeDirty = false;
    }

    // Advance the simulation and fetch the new positions.
    let force = MSDTimeSystem2.calcForceAtTime(t);
    
    let NewMSDState = MSDTimeSystem2.stepSimulation(Date.now()/1000.0);
    LastTime = Date.now();

    let Newposition2 = NewMSDState.position.toArray();

    // Clear canvas for the next frame.
    ctx.clearRect(0, 0, width, height);

    const lowerTop = msdBottom.getAnchorPoint("massTop", 0.5);

    // Attach the tuned mass to the top of the lower mass.
    msdTop.ground.x = lowerTop.x - msdTop.ground.width / 2;
    msdTop.ground.y = lowerTop.y;

    // Render the masses (shadow pass then main pass).
    msdBottom.setForceArrow({ length: force[0]*100 });
    msdBottom.render(ctx, rc, { shadow: true, shadowOffset: 6 }, Newposition2[0]+0.5);
    if (tunedMassDamperEnabled) {
      msdTop.render(ctx, rc, { shadow: true, shadowOffset: 6 }, Newposition2[1]+0.5);
    }

    msdBottom.render(ctx, rc, {}, Newposition2[0]+0.5);
    if (tunedMassDamperEnabled) {
      msdTop.render(ctx, rc, {}, Newposition2[1]+0.5);
    }
    // drawMassAnchors(msdBottom); // Uncomment to visualize anchor points.

    animationId = window.requestAnimationFrame(animate);
  };

  animationId = window.requestAnimationFrame(animate);
}
