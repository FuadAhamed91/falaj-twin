# Data, Provenance & Ethics

FALAJ Twin is a **demonstration**. This document records what is real, what is
synthetic, and where every piece of real data comes from.

## Real vs. synthetic

| Element | Status |
|---|---|
| Facility names, sectors, emirates | **Real / public** |
| Facility geographic coordinates | **Real / public** (verified — see below) |
| Facility exterior 3D models | **Illustrative reconstruction** from public imagery |
| UAE / Gulf map geometry | **Real** — Natural Earth 1:10m (public domain) |
| Network topology, assets, PLCs, sensors | **Synthetic** |
| Telemetry, metrics, water/pressure levels | **Synthetic** |
| Attacks, detections, predictions, outcomes | **Synthetic** |
| National SOC hub | **Conceptual / locally simulated** |
| Threat indicators (IPs, hashes) | **Synthetic** (RFC 5737 TEST‑NET / zero‑hash) |

FALAJ has **no** access to the named facilities' systems. No real monitoring,
control, or integration is implied or claimed.

## Facility reference sources

See [`shared/facilities.json`](../shared/facilities.json) for machine‑readable
coordinates, precision and source URLs, and
[`assets/references/`](../assets/references) for per‑facility reference notes and
image attributions (links only — no third‑party images are redistributed in this repo).

- **Taweelah RO Desalination IWP** — ACWA Power project page; coordinates verified at
  site level on the Al Taweelah industrial coast.
- **Cleveland Clinic Abu Dhabi** — official site + architectural references; coordinates
  verified at site level on Al Maryah Island.
- **DEWA Nad Hessa Digital Substation** — DEWA media page; the precise substation parcel
  is **not** publicly confirmed, so the marker is labelled **district‑level** and the
  model is explicitly representative.

Coordinates are rounded to 4 decimal places. Where a source could not confirm a detail,
it is marked **unknown / illustrative** rather than guessed.

## Map geometry
Natural Earth 1:10m Cultural Vectors (public domain) via the `world-atlas` package,
clipped to the UAE region and projected with a latitude‑corrected equirectangular
projection so relative site positions stay geographically consistent.

## Detection & prediction methodology
- **Detection** — deterministic rules are the reliable baseline (see
  `frontend/src/sim/detection.ts` and `backend/app/engine.py`). An Isolation‑Forest model
  *supplements* them and is **evaluated** on a labelled synthetic set
  (`GET /api/ml/metrics`); it never replaces the rules.
- **Prediction** — NetworkX reachability over the synthetic graph toward the critical
  target, weighted by remaining guarded boundaries. Labelled a **scenario‑based estimate**,
  not a validated real‑world forecast.
- **Sharing** — STIX 2.1 bundles built and validated with the `stix2` library; each
  receiving site's inventory is matched independently. A match flags **exposure**, never
  confirmed compromise.

## Licensing
- Code: this repository.
- Map data: Natural Earth (public domain).
- Fonts: Inter, JetBrains Mono, IBM Plex Sans Arabic (SIL Open Font License).
- Reference photographs: **not** redistributed — recorded as source URLs + attribution only.

## Hard limits (never done)
No scanning of real infrastructure. No connection to real PLCs/controllers. No operational
commands. No unauthorised access. No presenting synthetic events as real incidents at real
hospitals, utilities, or substations.
