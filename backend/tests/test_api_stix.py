"""API + STIX tests."""
from fastapi.testclient import TestClient
from app.main import app
from app.stix_share import build_bundle, match_sites
import json

client = TestClient(app)


def test_root_has_disclaimer():
    r = client.get("/")
    assert r.status_code == 200
    assert "simulated" in r.json()["disclaimer"].lower()


def test_simulate_endpoint():
    r = client.post("/api/simulate", json={"facilityId": "taweelah", "mode": "baseline", "elapsedSec": 30})
    assert r.status_code == 200
    body = r.json()
    assert body["phase"] == "impacted"
    assert body["nodeStates"]["tw-pump-1"] == "offline"


def test_outcome_comparison_endpoint():
    base = client.get("/api/outcome/taweelah", params={"mode": "baseline"}).json()
    defended = client.get("/api/outcome/taweelah", params={"mode": "defended"}).json()
    assert base["impacted"] is True
    assert defended["contained"] is True
    assert defended["detectionLeadSec"] > 0


def test_stix_bundle_is_valid():
    raw = build_bundle()
    doc = json.loads(raw)
    assert doc["type"] == "bundle"
    types = {o["type"] for o in doc["objects"]}
    assert {"identity", "indicator", "attack-pattern", "relationship"} <= types
    ind = next(o for o in doc["objects"] if o["type"] == "indicator")
    assert ind["spec_version"] == "2.1"
    assert ind["pattern_type"] == "stix"


def test_stix_match_results():
    matches = match_sites("taweelah")
    by = {m["facilityId"]: m["result"] for m in matches}
    assert by["cleveland-clinic"] == "match"       # exact affected version
    assert by["dewa-nad-hessa"] == "exposure"      # same family, different patch


def test_ml_metrics_measurable():
    r = client.get("/api/ml/metrics")
    assert r.status_code == 200
    m = r.json()
    if m.get("available"):
        assert 0.0 <= m["recall"] <= 1.0 and 0.0 <= m["precision"] <= 1.0
    else:
        assert "note" in m  # degrades gracefully when sklearn is absent


def test_ws_streams_states():
    with client.websocket_connect("/ws/sim/taweelah?mode=baseline") as ws:
        first = ws.receive_json()
        assert "nodeStates" in first and first["mode"] == "baseline"
