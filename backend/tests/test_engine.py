"""Engine tests — mirror the frontend vitest suite."""
from app.engine import compute_state, summarise_run, detect
from app.data import SCENARIOS, TOPOLOGIES


def test_baseline_idle_and_healthy():
    s = compute_state("taweelah", "baseline", 0)
    assert s.phase == "idle"
    assert len(s.detections) == 0
    assert all(v == "nominal" for v in s.nodeStates.values())
    assert next(m for m in s.metrics if m.key == "supply").value == 100


def test_baseline_has_no_detections():
    s = compute_state("taweelah", "baseline", 30)
    assert s.detections == []
    assert s.firstDetectionAt is None


def test_baseline_reaches_impact():
    s = compute_state("taweelah", "baseline", 30)
    assert s.phase == "impacted"
    assert s.nodeStates["tw-pump-1"] == "offline"
    assert next(m for m in s.metrics if m.key == "supply").value == 0


def test_deterministic():
    a = compute_state("taweelah", "baseline", 18)
    b = compute_state("taweelah", "baseline", 18)
    assert a.model_dump() == b.model_dump()


def test_defended_detects_before_impact():
    dets = detect(SCENARIOS["taweelah"])
    impact = next(s for s in SCENARIOS["taweelah"].stages if s.kind == "impact")
    assert dets and min(d.at for d in dets) < impact.at


def test_prediction_targets_scripted_node():
    s = compute_state("taweelah", "defended", 20)
    assert s.prediction is not None
    assert s.prediction.targetNodeId == SCENARIOS["taweelah"].targetNodeId
    assert 0.3 < s.prediction.confidence <= 0.95


def test_approved_action_prevents_impact():
    s = compute_state("taweelah", "defended", 30, "ct-writeprotect-pump", 18)
    assert s.phase == "contained"
    assert s.nodeStates["tw-pump-1"] != "offline"
    assert next(m for m in s.metrics if m.key == "supply").value == 100
    assert s.containedAt == 18


def test_late_approval_does_not_prevent_impact():
    s = compute_state("taweelah", "defended", 30, "ct-writeprotect-pump", 27)
    assert s.phase == "impacted"
    assert s.nodeStates["tw-pump-1"] == "offline"


def test_run_comparison():
    base = summarise_run("taweelah", "baseline")
    defended = summarise_run("taweelah", "defended", "ct-writeprotect-pump", 18)
    assert base.detectionLeadSec is None and base.impacted
    assert defended.detectionLeadSec and defended.detectionLeadSec > 0
    assert defended.contained


def test_all_facilities_runnable():
    for fid in ("taweelah", "cleveland-clinic", "dewa-nad-hessa"):
        scn = SCENARIOS[fid]
        topo = TOPOLOGIES[fid]
        assert all(any(n.id == p for n in topo["nodes"]) for p in scn.path)
        w = compute_state(fid, "defended", scn.durationSec)
        assert w.phase in ("complete", "impacted", "contained", "running")
