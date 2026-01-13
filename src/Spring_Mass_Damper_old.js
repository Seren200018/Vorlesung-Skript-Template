import { create, all } from 'mathjs';
import * as JXG from 'jsxgraph';
import Plotly from 'plotly.js-dist-min';
import anime from 'animejs/lib/anime.es.js';
import rough from 'roughjs';

// Aktiviert MathJax für JSXGraph
JXG.Options.text.useMathJax = true;

// Farbeinstellungen und MathJax-Konfiguration
const SecColor = '#FE8100';
$SmjDisplayMath = [['\\[', '\\]']];
$SmjExtraInlineMath = [['\\(', '\\)']];

// Math.js-Konfiguration
const config = {
  relTol: 1e-12,
  absTol: 1e-15,
  matrix: 'Matrix',
  number: 'number',
  precision: 64,
  predictable: false,
  randomSeed: null,
};
const math = create(all, config);

// Funktion: Erzeugt eine gleichmäßige Verteilung zwischen zwei Werten
function linspace(start, stop, num, endpoint = true) {
  const div = endpoint ? num - 1 : num;
  const step = (stop - start) / div;
  return Array.from({ length: num }, (_, i) => start + step * i);
}

// Klasse: Modelliert ein Masse-Feder-Dämpfer-System
export class mass_spring_damper {
  m = 1; // Standardmasse
  c = 0.1; // Standarddämpfungskoeffizient
  k = 1; // Standardfederkonstante
  x = [0.1, 0]; // Anfangsposition und Anfangsgeschwindigkeit
  w0 = 1; // Eigenfrequenz

  constructor(mass, damping, stiffness, initialConditions) {
    this.m = mass;
    this.c = damping;
    this.k = stiffness;
    this.x = initialConditions;
    this.w0 = math.sqrt(this.m / this.k); // Eigenfrequenz berechnen
  }

  // Erzeugt eine Zeitreihe
  gettimeseries(tstart, tstop, points) {
    return math.range(tstart, tstop, points, true);
  }

  // Simulationsfunktion: Berechnet neue Geschwindigkeit und Beschleunigung
  mathspringdamper_sim(t, x_in) {
    const xpp = -x_in[1] * this.k / this.m - x_in[0] * this.c / this.m; // Beschleunigung
    const xp = x_in[1]; // Geschwindigkeit
    return [xp, xpp];
  }

  // Führt eine Zeitschrittberechnung aus (aktuell nicht implementiert)
  dotimestep(dt) {
    this.solvemsd([0, dt], this.x);
  }

  // Löser für das Masse-Feder-Dämpfer-System
  solvemsd(t_end, x_0, max_timestep = 1) {
    const m = this.m;
    const k = this.k;
    const c = this.c;

    // Funktion zur Berechnung der Dynamik des Systems
    function mathspringdamper_sim(t, x_in) {
      const xpp = -x_in[0] * k / m - x_in[1] * c / m; // Beschleunigung
      const xp = x_in[1]; // Geschwindigkeit
      return [xp, xpp];
    }

    // Initialisierungen für die Simulation
    const returnArray = [x_0[0]]; // Anfangsposition speichern
    this.x = x_0;

    // Differentialgleichung lösen
    const OdeResultFull = math.solveODE(mathspringdamper_sim, [0, t_end], this.x, {maxStep: max_timestep});

    // Aktualisiert den Zustand auf die letzte berechnete Position
    this.x = OdeResultFull.y.at(-1);
    return OdeResultFull;
  }
}

// Funktion: Ruft die aktuelle Scroll-Position ab
document.getScroll = function () {
  if (window.pageYOffset !== undefined) {
    return [pageXOffset, pageYOffset];
  } else {
    const d = document,
        r = d.documentElement,
        b = d.body;

    const sx = r.scrollLeft || b.scrollLeft || 0;
    const sy = r.scrollTop || b.scrollTop || 0;

    console.log(sy);
    return [sy];
  }
};

function livemassspringdamper(plottype = "time", divid, scrollexitation = false) {
  // Initialisiere das Masse-Feder-Dämpfer-System
  const MSD = new mass_spring_damper(1, 0.3, 10);

  // Parameter und Anfangswerte
  const max_x_width = 30; // Maximal sichtbare Breite
  let x_0 = [1, 0]; // Startbedingungen: Position und Geschwindigkeit
  const axmax = max_x_width + 5; // Maximale Achsenbreite
  let t = [0], y = [x_0[0]], yp = [x_0[1]];

  // Anfangsenergie berechnen (normiert auf maximale Energie)
  let EKP = [
    (0.5 * MSD.k * x_0[0] ** 2 + 0.5 * MSD.m * x_0[1] ** 2) / (0.5 * MSD.k)
  ];

  // Grenzwerte für die Achsen
  let axmin = plottype === "energy" ? 0 : -0.1;

  // Scrollzustand initialisieren
  let scrollold = document.getScroll(), last_t = 0;

  let board, fig, p;

  // Board-Initialisierung basierend auf dem Typ der Darstellung
  if (plottype === "time" || plottype === "energy") {
    boardSetup();
  } else if (plottype === "3denergy") {
    init3DEnergyView();
  } else if (plottype === "plotly") {
    initPlotlyView();
  }

  // Zeitzyklus starten
  let lastCycle = Date.now();
  window.requestAnimationFrame(Calc_and_draw);

  /**
   * Initialisiert das 2D-Board (für Zeit- oder Energiedarstellung).
   */
  function boardSetup() {
    board = JXG.JSXGraph.initBoard(divid, {
      boundingbox: [0, 2, 40, -2],
      pan: { enabled: false },
      showNavigation: false,
      browserPan: { enabled: false },
      axis: false,
      grid: false,
    });

    // Erstelle die Kurve für Zeit- oder Energiedarstellung
    if (plottype === "time") {
      board.create('curve', [t, y], {
        strokeColor: SecColor,
        strokeWidth: '2px',
        shadow: true,
      });
    } else if (plottype === "energy") {
      board.create('curve', [y, yp], {
        strokeColor: SecColor,
        strokeWidth: '2px',
        shadow: true,
      });
    }

    // Achsen erstellen
    const xAxis = board.create('axis', [[axmin, 0], [axmax, 0]], {
      ticks: { visible: true, label: { anchorX: 'middle', offset: [0, -20] } },
    });
    const yAxis = board.create('axis', [[axmin, -2], [axmin, 2]], {
      ticks: { visible: true, label: { anchorY: 'middle', offset: [-30, 0] } },
    });
    board.create('ticks', [xAxis, 30], { ticksDistance: 5, minorTicks: 4 });

    // Passe den sichtbaren Bereich an
    adjustBoundingBox(plottype === "energy" ? [-1.1, 1.1, 1.1, -1.1] : [0 - max_x_width * 0.2, 2, max_x_width + max_x_width * 0.2, -2]);
  }

  /**
   * Initialisiert die 3D-Energiedarstellung.
   */
  function init3DEnergyView() {
    board = JXG.JSXGraph.initBoard(divid, {
      boundingbox: [-1.5, 1.5, 1.5, -1.5],
      pan: { enabled: false },
      showNavigation: false,
    });

    const view = board.create('view3d', [
      [-1, -1],
      [2, 2],
      [[-1, 1], [-1, 1], [0, 1]],
    ], {
      projection: 'parallel',
      xPlaneRear: { visible: true },
      yPlaneRear: { visible: true },
      xAxis: { strokeColor: 'red', name: "\\[ \\dot{y} \\]", withLabel: true },
      yAxis: { name: "\\[ y \\]", withLabel: true },
      zAxis: { name: "\\[ E_{GES} \\]", withLabel: true },
    });

    view.setView(0, 0, 1);

    // Energiekurve in 3D
    const g3 = view.create('curve3d', [y, yp, EKP], {
      strokeWidth: 2,
      strokeColor: SecColor,
    });
    p = view.create('point3d', [0, 0, 0]);
  }

  /**
   * Initialisiert die 3D-Darstellung mit Plotly.
   */
  function initPlotlyView() {
    fig = Plotly.newPlot(divid, [{
      type: 'scatter3d',
      mode: 'lines',
      x: y,
      y: yp,
      z: EKP,
      opacity: 1,
      line: { width: 2, colorscale: 'Viridis' },
    }]);
  }

  /**
   * Hauptberechnungs- und Darstellungsfunktion.
   */
  function Calc_and_draw() {
    let scrollnew = document.getScroll();
    if (scrollexitation) {
      x_0[0] += (scrollnew[1] - scrollold[1]) / 100;
    }
    scrollold = scrollnew;

    const cycleTime = (Date.now() - lastCycle) / 1000;
    lastCycle = Date.now();

    const out = MSD.solvemsd(cycleTime, x_0, 0.5/MSD.w0);

    // Aktualisiere Zeit, Werte und Energie
    for (let i = 1; i < out.t.length; i++) {
      let time = out.t[i] + last_t;
      t.push(time);
      y.push(out.y[i][0]);
      yp.push(out.y[i][1] * MSD.w0);
      EKP.push((0.5 * MSD.k * out.y[i][0] ** 2 + 0.5 * MSD.m * out.y[i][1] ** 2) / (0.5 * MSD.k));

      if (p) p.setPosition([y[y.length - 1], yp[yp.length - 1], EKP[EKP.length - 1]]);
      x_0 = out.y.slice(-1)[0];

      drawmsdbyhand(x_0[0])

    }

    last_t += cycleTime;

    // Passe den Bereich für Zeitplots dynamisch an
    if (plottype === "time") adjustBoundingBoxForTime();

    // Aktualisiere die Darstellung
    if (plottype !== "plotly") {
      board.update();
    } else {
      Plotly.redraw(divid);
    }

    if (EKP.slice(-1) > 0.001)
      window.requestAnimationFrame(Calc_and_draw);
    else
      console.log("Animation done!") //TO reduce load!
  }

  /**
   * Anpassung des Plots für Zeitdarstellungen bei Überschreitung der Grenzen.
   */
  function adjustBoundingBoxForTime() {
    const maxY = Math.max(...y), minY = Math.min(...y);
    if ((1 / 1.1 < maxY) || (-1 / 1.1 > minY)) {
      const range = Math.max(Math.abs(maxY), Math.abs(minY));
      adjustBoundingBox([0 - max_x_width * 0.2, range * 1.1, max_x_width + max_x_width * 0.2, range * -1.1]);
    }

    while (last_t - board.getBoundingBox()[0] > max_x_width) {
      t.shift();
      y.shift();
      yp.shift();
      adjustBoundingBox([t[0] - max_x_width * 0.2, board.getBoundingBox()[1], t[0] + max_x_width * 1.1, board.getBoundingBox()[3]]);
    }
  }

  /**
   * Aktuelle Bounding Box setzen.
   */
  function adjustBoundingBox(newBox) {
    board.setBoundingBox(newBox);
  }
}

function drawmassspringdamper(x, startpositionx, startpositiony, ctx, rc, shadow=true, shadowoffset = 10) {

  var masspositiony = x*100+startpositiony
  var masspositionx = startpositionx
  const Anzahl_Federelemente = 8
  const Federendposition = 200+startpositiony

  if (shadow){

    ctx.globalAlpha = 0.5;
    ctx.fillStyle = "rgba(0,0,0,1)";
    ctx.filter = "blur(2.5px)"
    ctx.fillRect(startpositionx+shadowoffset, shadowoffset+startpositiony+x*100, 100, 100);
    //Linie über Feder
    ctx.beginPath()
    ctx.moveTo(masspositionx +50+shadowoffset, 101 + masspositiony+shadowoffset)
    ctx.lineTo(masspositionx +50+shadowoffset, 121 + masspositiony+shadowoffset);
    ctx.stroke();
    //Linie Unter Feder
    ctx.beginPath()
    ctx.moveTo(masspositionx +50+shadowoffset,Federendposition+shadowoffset)
    ctx.lineTo(masspositionx +50+shadowoffset, Federendposition+20+shadowoffset);
    ctx.stroke();
    //Boden
    ctx.beginPath()
    ctx.moveTo(startpositionx+shadowoffset, Federendposition+20+shadowoffset)
    ctx.lineTo(startpositionx+120+shadowoffset, Federendposition+20+shadowoffset);
    for (let i = 0; i < 30; i++)
    {
      ctx.moveTo(startpositionx+i*4+shadowoffset, Federendposition+20+shadowoffset)
      ctx.lineTo(startpositionx+i*4+7+shadowoffset, Federendposition+27+shadowoffset);
    }
    ctx.stroke();
  }
  else
  {
    ctx.globalAlpha = 1;
    ctx.filter = "blur(0px)"
    ctx.fillStyle = "rgb(255,255,255)";
    ctx.alpha = 0
    ctx.fillRect(masspositionx, masspositiony, 100, 100);
    rc.rectangle(masspositionx, masspositiony, 100, 100, {fill: 'grey', seed: 1});
    rc.line(masspositionx +50, 101 + masspositiony,masspositionx +50, 121 + masspositiony,{seed:4})
    rc.line(masspositionx +50,Federendposition,masspositionx +50, Federendposition+20,{seed:1})
    rc.line(startpositionx, Federendposition+20,startpositionx+120,  Federendposition+20,{seed:2})
    for (let i = 0; i < 30; i++)
    {
      rc.line(startpositionx+i*4, Federendposition+20,startpositionx+i*4+7, Federendposition+27,{seed:i+1})

    }
  }
  var Equidistanter_Punktabstand = (Federendposition-(121 + masspositiony))/(Anzahl_Federelemente-1)
  for (var i = 0; i < Anzahl_Federelemente; i++) {
    if (i == 0) {
      var startposition = [masspositionx +50, 121 + masspositiony]
    }

    var endposition =
        [
            masspositionx+25 + 50 * (i % 2),
          (i+0.5)*Equidistanter_Punktabstand+(121 + masspositiony)//115+20 + masspositiony+Anzahl_Federelemente*i*5 - x*Federlementhoehe* (i+1)/Anzahl_Federelemente
        ]
    if (i==Anzahl_Federelemente-1)
      endposition =
          [
            masspositionx+50,
            Federendposition
  ]
    //Schatten
    if (shadow) {
      ctx.fillStyle = "rgba(0,0,0,1)";
      ctx.filter = "blur(2.5px)"
      ctx.beginPath()
      ctx.moveTo(startposition[0] + shadowoffset, startposition[1] + shadowoffset);
      ctx.lineTo(endposition[0]   + shadowoffset, endposition[1]   + shadowoffset);
      ctx.lineWidth = 3;
      ctx.stroke();
    }
    else
    {
      ctx.filter = "blur(0px)"
      for (var j = -1; j<1;j++ )
        for (var k = -1; k<1;k++ )
          rc.line(startposition[0]+j, startposition[1]+k, endposition[0]+k, endposition[1]+j, {seed: 10+j+k, strokeWidth: 0.5})
    }

    startposition = endposition;
  }
  //Boden



}

let k=1
let sdir = 1;
function drawmsdbyhand(x)
{
  //var canvas = document.getElementById('svg2');
  //var width = canvas.width;
  //var height = canvas.height;

  // Get SVG
  const canvas = document.getElementById('canvas');
  const ctx = canvas.getContext('2d');

  const rc = rough.canvas(canvas);
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  // Generate Rough Rectangle


  k+=0.1*sdir; 
  if (k>30) sdir=-1;
  if (k<0) sdir=1;
  drawmassspringdamper(x,20+ -1*(k*0.4), 100+ -1*(k*0.4),ctx, rc,true,k )
  drawmassspringdamper(x,20+ -1*(k*0.4), 100+ -1*(k*0.4),ctx, rc,false,k )

  //Unterer Teil Masse
 // rc.line(masspositionx+25,130+masspositiony,masspositionx+74,150+masspositiony, {seed:1})
  //rc.line(masspositionx+74,150+masspositiony,masspositionx+25,180+masspositiony, {seed:1})

}


let pos_MSD = 0;
let position = 10;
function drawmsdsvg()
{

  // Get the inline SVG element

  const svgElement = document.getElementById("svg");
  const svgElementdoc = svgElement.contentDocument;
  let mass = svgElementdoc.getElementById("rect5919");
  if (!svgElementdoc) {
    console.error("SVG element not found!");
    return;
  }
  let position = 1
  // Manipulate the 'Mass' element (rectangle)

  function animate() {

    position += 1;
    mass.setAttribute("translate", "cy", position)
    //mass.setAttributeNS("transform","translate("+ position+")");
    requestAnimationFrame(animate);
    console.log("SVG manipulation complete!");
  }

  console.log("SVG manipulation complete!");

  window.requestAnimationFrame(animate);
}




//drawmsdbyhand();
livemassspringdamper("time","app");
livemassspringdamper("energy","app2");
livemassspringdamper("3denergy","app3");
//document.querySelector('#app').innerHTML = drawnfunction;