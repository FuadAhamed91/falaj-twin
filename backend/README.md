# FALAJ Twin — Backend (synthetic simulation API)

FastAPI service mirroring the frontend simulation engine. **Everything is simulated**;
no real facility systems are represented, monitored, or controlled.

## Run
```bash
python -m venv .venv && . .venv/Scripts/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
# docs at http://localhost:8000/docs
```

## Test
```bash
pytest -q
```

## Endpoints
- `GET /api/facilities`, `GET /api/scenarios`, `GET /api/topology/{id}`
- `POST /api/simulate` — deterministic world state at an elapsed time
- `GET /api/outcome/{id}?mode=baseline|defended` — measured run outcome
- `GET /api/detections/{id}` — rule-based detections
- `GET /api/stix/bundle` — STIX 2.1 bundle (validated with `stix2`)
- `POST /api/stix/match` — per-site inventory matching
- `GET /api/ml/metrics` — Isolation-Forest evaluation (supplementary)
- `WS /ws/sim/{id}?mode=` — live world-state stream

## Methodology
- **Detection**: deterministic rules are the reliable baseline; an Isolation Forest
  supplements them and is evaluated on a labelled synthetic set (`/api/ml/metrics`).
- **Prediction**: NetworkX reachability over the synthetic network graph toward the
  critical target. Scenario-based estimate — not a validated real-world forecast.
- **Sharing**: STIX 2.1 indicator bundles built and validated with `stix2`.
