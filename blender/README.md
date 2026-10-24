# Blender model pipeline

The three facility exteriors are authored in **Blender 5.2 LTS** and exported to
**GLB** (`frontend/public/models/*.glb`), then loaded in React Three Fiber via
`drei`'s `useGLTF` (`frontend/src/twin/FacilityModel.tsx`).

## Approach
1. Research public exterior imagery and site context for each facility
   (see `assets/references/`).
2. Identify the major visible masses and approximate proportions.
3. Build a procedural, parametric model in Blender (Python / `bpy`) — meters,
   Principled BSDF materials in the app's navy/steel palette.
4. Compare against references; correct silhouette and proportion.
5. Export optimised GLB (`export_yup=True`, `export_apply=True`).
6. Load in the browser twin; equipment markers + attack paths are layered on top
   as data‑driven overlays (so the real exterior and the synthetic cyber layer stay
   distinguishable).

The **water plant (Taweelah)** receives the most detail (RO process hall with a
membrane‑rack roof, domed storage reservoirs, pump station, pipe corridors,
pretreatment basins, PV detail). The **hospital** (clustered towers on a podium with
sky‑garden crowns) and **substation** (GIS building, transformers with bushings,
switchyard gantries) are lighter but recognisable.

## Coordinate convention
The glTF Y‑up export maps Blender `+Y` → gl `‑Z`. Models are authored with
`Blender_Y = −(scene_z)` so the exported structures line up with the equipment‑marker
`scenePos` used by the twin (water plant only; the other two carry no markers).

## Reproduce
`build_models.py` contains the authoring scripts. With Blender running and the
Blender MCP connected, each `build_*` block is executed via `execute_blender_code`;
standalone you can run them in Blender's Python console. Models export to
`frontend/public/models/`.

## Fallbacks
If a GLB is missing or WebGL is unavailable, the app degrades gracefully:
GLB → procedural R3F scene (`src/twin/Plant3D.tsx`) → 2D SCADA schematic
(`src/twin/PlantSchematic.tsx`). The hero view never blanks.
