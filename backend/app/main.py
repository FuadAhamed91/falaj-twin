"""FALAJ Twin backend API.

SIMULATED service: no real facility systems are monitored or controlled.
Run:  uvicorn app.main:app --reload --port 8000
"""
from __future__ import annotations

import asyncio
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from . import __version__
from .data import SCENARIOS, TOPOLOGIES, CONTAINMENTS
from .engine import compute_state, summarise_run, detect
from .ml import get_model, ml_available
from .models import SimulateRequest, MatchRequest
from .stix_share import build_bundle, match_sites

app = FastAPI(
    title="FALAJ Twin API",
    version=__version__,
    description="Synthetic OT cyber digital-twin simulation. All data is simulated; "
    "no real facility systems are represented, monitored, or controlled.",
)
app.add_middleware(
    CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"],
)

DISCLAIMER = (
    "Simulated demonstration. Facility locations/exteriors are real & public; all "
    "cyber assets, telemetry, attacks, detections and outcomes are synthetic."
)


@app.get("/")
def root():
    return {"name": "FALAJ Twin API", "version": __version__, "disclaimer": DISCLAIMER}


@app.get("/health")
def health():
    return {"status": "ok"}


@app.get("/api/facilities")
def facilities():
    return [{"facilityId": t["facilityId"], "sector": t["sector"], "nodes": len(t["nodes"]), "edges": len(t["edges"])}
            for t in TOPOLOGIES.values()]


@app.get("/api/scenarios")
def scenarios():
    return [{"id": s.id, "facilityId": s.facilityId, "code": s.code, "name": s.name,
             "summary": s.summary, "durationSec": s.durationSec, "targetNodeId": s.targetNodeId}
            for s in SCENARIOS.values()]


@app.get("/api/topology/{facility_id}")
def topology(facility_id: str):
    t = TOPOLOGIES.get(facility_id)
    if not t:
        raise HTTPException(404, "Unknown facility")
    return {"facilityId": t["facilityId"], "sector": t["sector"],
            "nodes": [n.model_dump() for n in t["nodes"]],
            "edges": [{"from": e.frm, "to": e.to, "protocol": e.protocol, "guarded": e.guarded} for e in t["edges"]],
            "containments": CONTAINMENTS.get(facility_id, [])}


@app.post("/api/simulate")
def simulate(req: SimulateRequest):
    if req.facilityId not in SCENARIOS:
        raise HTTPException(404, "Unknown facility")
    return compute_state(req.facilityId, req.mode, req.elapsedSec, req.approveActionId, req.approveAt)


@app.get("/api/outcome/{facility_id}")
def outcome(facility_id: str, mode: str = "baseline"):
    if facility_id not in SCENARIOS:
        raise HTTPException(404, "Unknown facility")
    rec = CONTAINMENTS.get(facility_id, [{}])
    approve_id = rec[-1]["id"] if (mode == "defended" and rec and rec[-1].get("id")) else None
    scn = SCENARIOS[facility_id]
    impact = next((s for s in scn.stages if s.kind == "impact"), None)
    approve_at = max(0, impact.at - 6) if impact else 18
    return summarise_run(facility_id, mode, approve_id, approve_at if approve_id else None)


@app.get("/api/detections/{facility_id}")
def detections(facility_id: str):
    if facility_id not in SCENARIOS:
        raise HTTPException(404, "Unknown facility")
    return detect(SCENARIOS[facility_id])


@app.get("/api/stix/bundle")
def stix_bundle():
    return {"bundle": build_bundle(), "disclaimer": DISCLAIMER}


@app.post("/api/stix/match")
def stix_match(req: MatchRequest):
    return {"source": req.sourceFacilityId, "matches": match_sites(req.sourceFacilityId),
            "note": "A match flags exposure — not confirmed compromise."}


@app.get("/api/ml/metrics")
def ml_metrics():
    if not ml_available():
        return {"available": False, "note": "Isolation-Forest supplement not installed; "
                "deterministic rules remain the baseline."}
    return {"available": True, **get_model().metrics}


@app.websocket("/ws/sim/{facility_id}")
async def ws_sim(ws: WebSocket, facility_id: str, mode: str = "defended"):
    """Stream deterministic world states over a scenario timeline (1x real-time)."""
    await ws.accept()
    if facility_id not in SCENARIOS:
        await ws.send_json({"error": "unknown facility"})
        await ws.close()
        return
    scn = SCENARIOS[facility_id]
    rec = CONTAINMENTS.get(facility_id, [])
    approve_id = rec[-1]["id"] if rec else None
    impact = next((s for s in scn.stages if s.kind == "impact"), None)
    approve_at = max(0, impact.at - 6) if impact else 18
    try:
        t = 0.0
        step = 0.5
        while t <= scn.durationSec:
            state = compute_state(facility_id, mode, t,
                                  approve_id if mode == "defended" else None,
                                  approve_at if (mode == "defended" and approve_id) else None)
            await ws.send_json(state.model_dump())
            await asyncio.sleep(step)
            t += step
        await ws.send_json({"done": True})
    except WebSocketDisconnect:
        return
