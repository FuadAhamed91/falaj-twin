# FALAJ Twin — Frontend

React 19 + TypeScript + Vite + Tailwind v4 + Three.js (React Three Fiber). The full
simulation engine is in `src/sim` (deterministic, unit-tested) and runs **standalone** —
no backend required.

```bash
npm install
npm run dev       # http://localhost:5173
npm test          # vitest
npm run build     # tsc + vite build
npm run geo       # regenerate map geometry from Natural Earth
```

## Structure
- `src/sim/` — topology, scenarios, detection, prediction, engine (pure, tested)
- `src/store/` — Zustand app state + clock + demo director
- `src/three/` — national 3D map (+ 2D SVG fallback)
- `src/twin/` — facility 3D twin, Blender GLB loader, SCADA schematic, panels
- `src/stix/` — STIX 2.1 indicator + cross-sector matching
- `src/assistant/` — bilingual (EN/AR) grounded incident explainer
- `src/pages/` — the 8 application pages
- `public/models/` — Blender-authored GLB facility models
```
