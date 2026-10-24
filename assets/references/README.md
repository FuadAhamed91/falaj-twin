# FALAJ Twin: facility reference packs

These packs hold public-source exterior and geographic research for the three real UAE facilities shown on the FALAJ Twin map. They were retrieved on **2026-10-24**. The 3D models are recognisable *exterior* stand-ins. Everything cyber-related in the product (assets, telemetry, attacks, alerts) is **synthetic**.

> **FALAJ has no access to, connection with, or data from any of these facilities' systems, or from their owners' or operators' systems.** The packs deliberately exclude control-system vendors, protection/IT/OT architecture, network topology, interior layouts, staff and site-access arrangements. Do not add such material.

## Index

| Facility | Sector | Folder | Map coordinates (lat, lon) | Precision |
|---|---|---|---|---|
| Taweelah RO Desalination IWP (Al Taweelah, Abu Dhabi) | Water (hero) | [`taweelah/`](taweelah/README.md) | 24.7585, 54.6748 | Site-level, ~100 m (OSM plant polygon) |
| Cleveland Clinic Abu Dhabi (Al Maryah Island, Abu Dhabi) | Healthcare | [`cleveland-clinic-abu-dhabi/`](cleveland-clinic-abu-dhabi/README.md) | 24.4971, 54.3879 | Site-level, ~50 m (OSM hospital polygon) |
| DEWA 132/11 kV digital substation, Nad Hessa (Dubai) | Power | [`dewa-nad-hessa/`](dewa-nad-hessa/README.md) | 25.1219, 55.3851 | **District-level, ~2 km.** The exact site is not public; use an "approx." label |

The machine-readable version is [`facilities.metadata.json`](facilities.metadata.json). It covers the same facts, coordinates, reference links and modelling briefs, plus city anchors for map context: Abu Dhabi, Dubai, Al Ain and Sharjah, from the Wikipedia city coordinates.

Each facility README contains:

- a summary;
- a verified-facts table with sources;
- a coordinates table showing value, source and precision;
- a reference-image table;
- visual reference notes;
- a modelling brief covering massing, estimated dimensions, palette hex values, materials, surroundings and an explicit unknown/illustrative list;
- a disclaimer.

## Licensing and usage policy (the repo is public)

1. **Links only.** Do not commit, hotlink into the app, or re-host any third-party photo, render, satellite tile/export or screenshot. The packs record page URL, image URL, credit and licence so people can *look*, not redistribute.
2. **Proprietary images** (ACWA Power, IDOM, HDR, DEWA, news outlets) may be used only as *private modelling references*. Do not trace them into textures or ship them.
3. **Creative Commons images.** The one usable Commons photo here is Cleveland Clinic Abu Dhabi by Francisco Anzola, **CC BY 3.0**. It may legally be reused with attribution, a licence link and a note of changes. Our default is still to link only. If it is ever displayed, show its credit line.
4. **Esri World Imagery and Google Maps/Earth** may be viewed for reference under their terms. Never save exports or screenshots into the repo, and never use them as model textures. Required credit if a view is shown: "Esri, Vantor (formerly Maxar), Earthstar Geographics, and the GIS User Community".
5. **OpenStreetMap data** (footprints, heights, polygons) is **ODbL 1.0**. If you derive model geometry or map shapes from it, show "© OpenStreetMap contributors" with a link to https://www.openstreetmap.org/copyright.
6. **Logos and trademarks.** Do not reproduce ACWA, EWEC, CCAD/Cleveland Clinic, M42 or DEWA logos on models or in the UI unless the brand owner allows it.
7. **Labelling.** In the UI, models are "illustrative exterior models". The DEWA substation is fully generic, and its map pin is district-level ("approx.").

## Method notes

- Coordinates were rounded to 4 decimal places. Sources: Nominatim lookups (≤1 request per second), OSM Overpass geometry, Wikidata and Wikipedia.
- Each coordinate was cross-checked against Esri World Imagery. Scene dates: Taweelah 2023-11-14 (WorldView-3); Cleveland Clinic 2025-11-18 (Legion-04).
- Dimensions marked "est." were measured from that imagery (±10–15 m). Heights were estimated from shadow lengths, calibrated against Taweelah's 17.8 m tanks, whose height is published. They are approximate.
- Colour hex values were sampled from public imagery or photos where noted, otherwise estimated. Treat them as a stylised palette, not true paint colours.
- The Wikipedia and Wikidata coordinates for Cleveland Clinic Abu Dhabi are both wrong (details in its README), so the OSM coordinates are used.
- Official URLs that failed on 2026-10-24:
  - The ACWA Power Taweelah project page returned 404. Its facts were read from the Internet Archive snapshot of 2026-10-17.
  - The Aedas landscape page for Cleveland Clinic returned 404, and the Wayback Machine has no copy.
