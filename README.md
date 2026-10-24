# FALAJ Twin — *Caught Once. Warned Everywhere.*

A premium, **simulated** OT‑cybersecurity **digital‑twin** platform for UAE essential
services, built for UAE Hackathon 2026. One synthetic threat, detected at a water
plant, is understood, contained, and shared across sectors — on an interactive 3D
map of three **real** UAE facilities.

> **This is a demonstration.** Facility *locations and exteriors* are real and public.
> **All** cyber assets, telemetry, attacks, detections, predictions and outcomes are
> **synthetic**. FALAJ has **no** access to, monitoring of, or integration with the
> named facilities or any National SOC. Nothing here observes or controls real systems.

---

## What it does

| Capability | How |
|---|---|
| **National 3D map** | Three real facilities at **verified public coordinates**, projected from Natural Earth geometry, with a simulated National SOC hub and live cross‑sector threat arcs. |
| **Interactive digital twin** | Blender‑authored GLB exteriors rendered in Three.js / React Three Fiber, with a physical **3D** view and a **cyber** SCADA‑mimic view sharing one state. |
| **Functional attack simulator** | Deterministic, reproducible scenarios (IT → DMZ → OT → controller → field). Start / pause / reset / replay + a one‑click demo. |
| **Early warning & prediction** | Rule‑based detection (reliable baseline) + NetworkX reachability prediction toward the critical target, labelled as a scenario‑based estimate. |
| **Human‑in‑the‑loop response** | Containment actions require **explicit simulated operator approval**; the system never acts on its own. |
| **Before / after** | The same scenario run with and without FALAJ, with measured detection lead‑time, affected assets and containment outcome. |
| **Cross‑sector sharing** | STIX 2.1 indicator bundles shared to the simulated SOC and matched independently against each sector's synthetic inventory. |
| **Bilingual assistant** | EN / AR with full RTL, grounded strictly in the live simulation state — it never invents evidence or executes actions. |

## The three real facilities

| Sector | Facility | Location | Reference |
|---|---|---|---|
| 💧 Water (hero) | **Taweelah RO Desalination IWP** | Al Taweelah, Abu Dhabi | [acwapower.com](https://acwapower.com/en/what-we-do/projects/taweelah-ro-desalination-iwp/) |
| ❤️ Healthcare | **Cleveland Clinic Abu Dhabi** | Al Maryah Island, Abu Dhabi | [clevelandclinicabudhabi.ae](https://www.clevelandclinicabudhabi.ae/en) |
| ⚡ Power | **DEWA Nad Hessa 132/11 kV Digital Substation** | Nad Hessa, Dubai | [dewa.gov.ae](https://dewa.gov.ae/en/about-us/media-publications/latest-news/2025/05/he-saeed-mohammed-al-tayer-inspects) |

Coordinates, sources and precision are recorded in [`shared/facilities.json`](shared/facilities.json)
and [`assets/references/`](assets/references). Exteriors are an **illustrative**
reconstruction from public imagery — not a claim about internal engineering.

## Tech stack

**Frontend** React 19 · TypeScript · Vite · Tailwind v4 · Three.js / React Three Fiber / Drei · Recharts · Framer Motion
**3D** Blender 5.2 → GLB/glTF → optimised browser rendering (procedural + 2D fallbacks)
**Backend** Python · FastAPI · WebSockets · Pydantic · NetworkX · STIX 2.1 (`stix2`) · scikit‑learn (Isolation Forest) · pytest
**Data** Natural Earth 1:10m (public domain) · MITRE ATT&CK for ICS references

## Run it

### Frontend (standalone — no backend required)
```bash
cd frontend
npm install
npm run dev       # http://localhost:5173
npm test          # vitest (engine is deterministic)
npm run build
```

### Backend (optional live API)
```bash
cd backend
python -m venv .venv && .venv\Scripts\activate   # macOS/Linux: source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000        # docs at /docs
pytest -q
```

## 3‑minute demo

Click **Run Demo** (sidebar) for a repeatable, refresh‑free sequence:
UAE map → fly into Taweelah → synthetic attack (without FALAJ) → reset → with FALAJ
early‑warning + predicted target → operator approval → STIX share & cross‑sector match
→ before/after outcomes. Every attack event is labelled **simulated**.

## Repository layout
```
frontend/   React + Three.js app (sim engine in src/sim, 3D in src/three & src/twin)
backend/    FastAPI service mirroring the engine (+ STIX, NetworkX, Isolation Forest)
blender/    Model-authoring scripts and notes
shared/     facilities.json — one authoritative facility dataset
assets/     references/ — facility reference URLs, coordinates, licensing
docs/       architecture, provenance, methodology
```

## Ethics & scope
See [`docs/PROVENANCE.md`](docs/PROVENANCE.md). Public research data and properly
licensed/public‑domain assets only. No real infrastructure is scanned, connected to,
or controlled. Synthetic events are never presented as real incidents.
