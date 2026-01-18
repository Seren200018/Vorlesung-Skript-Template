import rough from "roughjs/bundled/rough.esm.js";
import { MassSpringDamper, MultiMassSpringDamperTimeSystem,MassSpringDamperSystemTimeFreqDomainHandmade } from "./Spring_Mass_Damper_Elements.js";
import { create, all } from "mathjs";

const math = create(all);


export function initMassSpringDamperAnchorsDemo(target) {
  if (!target) return;

  if (target._msdAnchorsCleanup) {
    target._msdAnchorsCleanup();
    target._msdAnchorsCleanup = null;
  }

  target.innerHTML = "";
  const wrap = document.createElement("div");
  wrap.style.display = "flex";
  wrap.style.gap = "12px";
  wrap.style.alignItems = "stretch";
  wrap.style.height = "100%";
  wrap.style.width = "100%";
  target.appendChild(wrap);

  const canvas = document.createElement("canvas");
  canvas.style.width = "300px";
  canvas.style.height = "100%";
  canvas.style.border = "none";
  wrap.appendChild(canvas);

  const controls = document.createElement("div");
  controls.style.display = "flex";
  controls.style.flexDirection = "column";
  controls.style.gap = "8px";
  controls.style.minWidth = "160px";
  controls.style.fontFamily = "Arial, Helvetica, sans-serif";
  controls.style.fontSize = "12px";
  controls.style.color = "#111";
  wrap.appendChild(controls);

  const ctx = canvas.getContext("2d");
  const rc = rough.canvas(canvas);
  let width = 0;
  let height = 0;
  let centerX = 0;
  let groundY = 0;

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


  //Bottom Mass Setup
  const BottomMass = 1.0;
  const BottomDamping = 0.2;
  const BottomStiffness = (1.0*2*Math.PI*1.0)**2 ; //1Hz Resonance

  //initial Top Mass Setup
  let topMass = 1.0;
  let topDamping = 0.05;
  let topStiffness = 0.1;

  let C_Matrix = math.matrix([[BottomDamping + topDamping, -topDamping], [-topDamping, topDamping]]);
  let K_Matrix = math.matrix([[BottomStiffness + topStiffness, -topStiffness], [-topStiffness, topStiffness]]);
  let M_Matrix = math.matrix([[BottomMass, 0], [0, topMass]]);

  const MSDTimeSystem2 = new MassSpringDamperSystemTimeFreqDomainHandmade({Massmatrix: M_Matrix, Stiffnessmatrix: K_Matrix, Dampingmatrix: C_Matrix, StartingPositions: [0.5, 0], StartingVelocities: [0, 0], NumMasses: 2});
  
  let ForceAmplitude = math.matrix([0.1, 0]);
    
  MSDTimeSystem2.AppliedForceParameters = {ForceType:"sine",Amplitude: ForceAmplitude, ForceFrequency: 1.0};

  //Force Setup 
  let forceFrequency = 1.6;

  const formatValue = (value, step) => {
    const stepText = String(step);
    const decimals = stepText.includes(".") ? stepText.split(".")[1].length : 0;
    return value.toFixed(decimals);
  };

  
  const createSlider = ({ label, min, max, step, value, onInput }) => {
    const row = document.createElement("label");
    row.style.display = "flex";
    row.style.flexDirection = "column";
    row.style.gap = "4px";
    const title = document.createElement("span");
    title.textContent = `${label}: ${formatValue(value, step)}`;
    const input = document.createElement("input");
    input.type = "range";
    input.min = min;
    input.max = max;
    input.step = step;
    input.value = value;
    input.addEventListener("input", () => {
      const next = parseFloat(input.value);
      title.textContent = `${label}: ${formatValue(next, step)}`;
      onInput(next);
    });
    row.appendChild(title);
    row.appendChild(input);
    controls.appendChild(row);
    return input;
  };

  createSlider({
    label: "Masse Tilger",
    min: 0.01,
    max: 2,
    step: 0.01,
    value: topMass,
    onInput: (value) => {
      topMass = value;
    },
  });

  createSlider({
    label: "Top damping",
    min: 0,
    max: 2,
    step: 0.05,
    value: topDamping,
    onInput: (value) => {
      topDamping = value;
    },
  });

  createSlider({
    label: "Resonanzfrequenz Tilger",
    min: 0.5,
    max: 2,
    step: 0.01,
    value: topStiffness,

    onInput: (value) => {
      topStiffness = topMass * (2 * Math.PI * value) ** 2;
    },
  });

  createSlider({
    label: "Force frequency",
    min: 0.1,
    max: 2,
    step: 0.1,
    value: forceFrequency,
    onInput: (value) => {
      forceFrequency = value;
    },
  });

  const resize = () => {
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    width = rect.width;
    height = rect.height;
    canvas.width = Math.max(1, Math.floor(width * dpr));
    canvas.height = Math.max(1, Math.floor(height * dpr));
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

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

  resize();


  const drawAnchorPoint = (point) => {
    ctx.save();
    ctx.fillStyle = "#e65100";
    ctx.beginPath();
    ctx.arc(point.x, point.y, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  };

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

  let start = performance.now();
  let laststeptime = null;
  let animationId = null;
  let disposed = false;

  const cleanup = () => {
    disposed = true;
    if (animationId != null) {
      window.cancelAnimationFrame(animationId);
      animationId = null;
    }
  };
  target._msdAnchorsCleanup = cleanup;
  if (import.meta?.hot) {
    import.meta.hot.dispose(cleanup);
  }

  const animate = (now) => {
    if (disposed) {
      return;
    }
    const t = (now - start) / 1000;

    let C_Matrix = math.matrix([[BottomDamping + topDamping, -topDamping], [-topDamping, topDamping]]);
    let K_Matrix = math.matrix([[BottomStiffness + topStiffness, -topStiffness], [-topStiffness, topStiffness]]);
    
    //Set new parameters
    MSDTimeSystem2.setDampingmatrix(C_Matrix);
    MSDTimeSystem2.setStiffnessmatrix(K_Matrix);

    let force = MSDTimeSystem2.calcForceAtTime(t);
    
    let NewMSDState = MSDTimeSystem2.stepSimulation((now-(laststeptime || now))/1000.0);
    laststeptime = now;

    let Newposition2 = NewMSDState.position.toArray();

    ctx.clearRect(0, 0, width, height);

    const lowerTop = msdBottom.getAnchorPoint("massTop", 0.5);

    msdTop.ground.x = lowerTop.x - msdTop.ground.width / 2;
    msdTop.ground.y = lowerTop.y;

    msdBottom.setForceArrow({ length: force[0]*100 });
    msdBottom.render(ctx, rc, { shadow: true, shadowOffset: 6 }, Newposition2[0]+0.5);
    msdTop.render(ctx, rc, { shadow: true, shadowOffset: 6 }, Newposition2[1]+0.5);
    msdBottom.render(ctx, rc, {}, Newposition2[0]+0.5);
    msdTop.render(ctx, rc, {}, Newposition2[1]+0.5);
    //drawMassAnchors(msdBottom);

    animationId = window.requestAnimationFrame(animate);
  };

  animationId = window.requestAnimationFrame(animate);
}
