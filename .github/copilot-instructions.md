# AI Coding Agent Instructions for Mass-Spring-Damper Visualization Project

## Project Overview
This is a React + Vite web application for interactive simulation and visualization of mass-spring-damper (MSD) systems. It combines physics simulation with multiple plotting libraries for educational/engineering purposes.

## Architecture
- **Frontend**: React components in `src/main.jsx` handle UI (e.g., folding layouts for printable documents)
- **Simulation Core**: `src/SpringMassDamper.mjs` - ESM module with `mass_spring_damper` class using mathjs ODE solver
- **Visualization**: 
  - JSXGraph for interactive 2D plots (time series, phase portraits)
  - Plotly.js for 3D energy landscapes
  - RoughJS for hand-drawn sketch style graphics
  - Canvas-based custom drawing functions for animated MSD diagrams
- **Math Rendering**: MathJax integrated with JSXGraph for LaTeX labels
- **Styling**: CSS modules in `css/` and `src/style.css`, print-optimized for A5 pages

## Key Workflows
- **Development**: `npm run dev` starts Vite dev server with hot reload
- **Build**: `npm run build` outputs to `dist/` for static hosting
- **Preview**: `npm run preview` serves built files locally
- **Simulation**: Instantiate `mass_spring_damper(m, c, k, [x0, v0])`, call `solvemsd(t_end, x0)` for ODE solution
- **Plotting**: Use `Draw_MSD_Plot_to_div(plottype, divid, canvasid)` where plottype ∈ {"time", "energy", "3denergy", "plotly"}

## Project Conventions
- **Language**: German comments in simulation code (e.g., "Anfangsposition")
- **Plot Types**: 
  - "time": Position vs time with scrolling window
  - "energy": Phase portrait (position vs velocity)
  - "3denergy": 3D energy surface using JSXGraph view3d
  - "plotly": 3D scatter plot with Plotly
- **Animation**: Real-time simulation via `requestAnimationFrame`, stops when energy < 0.001
- **Canvas Drawing**: `draw_mass_spring_damper_sketch()` uses RoughJS for sketchy style, supports shadows and parameter labels
- **Integration**: Plots render to HTML divs (e.g., id="app"), canvases for overlays

## Common Patterns
- **Adding New Plots**: Extend `Draw_MSD_Plot_to_div()` with new plottype cases, initialize board/view accordingly
- **Parameter Modification**: Update MSD instance properties (m, c, k) and re-run simulation
- **Custom Graphics**: Use RoughJS generators for lines/rectangles with seeds for consistent "hand-drawn" look
- **MathJax in Plots**: Enable with `JXG.Options.text.useMathJax = true`, use `\\[ \\]` delimiters
- **Print Layout**: HTML styled for A5 paper with folding CSS classes (`.fold-top`, `.fold-bottom`)

## Dependencies Rationale
- **mathjs**: High-precision ODE solving for physics accuracy
- **jsxgraph**: Interactive geometry for real-time plot manipulation
- **plotly.js**: Advanced 3D plotting capabilities
- **roughjs**: Educational "hand-drawn" aesthetic for diagrams
- **animejs**: Smooth animations for dynamic visualizations</content>
<parameter name="filePath">/home/Seren/Dokumente/Programming/AVC_08_V1/.github/copilot-instructions.md
