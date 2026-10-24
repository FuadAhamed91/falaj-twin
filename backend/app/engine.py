"""Deterministic simulation engine + detection + NetworkX prediction.

Mirrors frontend/src/sim so the two agree. Pure functions, no randomness in
the rule baseline. An optional Isolation-Forest supplement is in ml.py.
"""
from __future__ import annotations

from typing import Optional
import networkx as nx

from .data import TOPOLOGIES, SCENARIOS, CONTAINMENTS, seed_metrics
from .models import (
    DetectionEvent, MetricReading, Prediction, Scenario, WorldState, RunOutcome,
)

# ---- Detection rules (deterministic baseline) ----
RULES = [
    {"id": "R-ACCESS-01", "kinds": ["initial-access"], "severity": "high", "latency": 2},
    {"id": "R-LATERAL-02", "kinds": ["lateral"], "severity": "high", "latency": 3},
    {"id": "R-WRITE-03", "kinds": ["impact"], "mitre": ["T0831", "T0836"], "severity": "critical", "latency": 1},
    {"id": "R-STIX-04", "kinds": ["recon"], "severity": "medium", "latency": 2},
]


def detect(scenario: Scenario) -> list[DetectionEvent]:
    events: list[DetectionEvent] = []
    for stage in scenario.stages:
        for rule in RULES:
            if stage.kind not in rule["kinds"]:
                continue
            if "mitre" in rule and stage.mitre not in rule["mitre"]:
                continue
            events.append(DetectionEvent(
                id=f"det-{scenario.id}-{stage.id}-{rule['id']}",
                at=stage.at + rule["latency"], stageId=stage.id, nodeId=stage.nodeId,
                ruleId=rule["id"], severity=rule["severity"], engine="rule",
                message=f"Rule {rule['id']}: activity at {stage.nodeId}.", mitre=stage.mitre,
            ))
    return sorted(events, key=lambda e: e.at)


def _graph(facility_id: str) -> nx.Graph:
    topo = TOPOLOGIES[facility_id]
    g = nx.Graph()
    for n in topo["nodes"]:
        g.add_node(n.id, guarded=False, critical=n.critical)
    for e in topo["edges"]:
        g.add_edge(e.frm, e.to, guarded=e.guarded)
    return g


def predict(scenario: Scenario, current_node: str, now: float) -> Optional[Prediction]:
    if current_node not in scenario.path:
        return None
    g = _graph(scenario.facilityId)
    try:
        hops = nx.shortest_path_length(g, current_node, scenario.targetNodeId)
    except nx.NetworkXNoPath:
        hops = 99
    idx = scenario.path.index(current_node)
    remaining = set(scenario.path[idx:])
    guarded_ahead = sum(
        1 for u, v, d in g.edges(data=True)
        if d.get("guarded") and u in remaining and v in remaining
    )
    progress = idx / max(1, len(scenario.path) - 1)
    confidence = min(0.95, max(0.3, 0.55 + progress * 0.45 - guarded_ahead * 0.08))
    gaps = [s.at for s in scenario.stages]
    avg_gap = (gaps[-1] - gaps[0]) / max(1, len(gaps) - 1) if len(gaps) > 1 else scenario.durationSec / max(1, len(scenario.path))
    eta_mid = max(0, hops * avg_gap)
    spread = max(2, avg_gap * 0.6)
    return Prediction(
        at=now, targetNodeId=scenario.targetNodeId,
        etaSecLow=round(max(0, eta_mid - spread)), etaSecHigh=round(eta_mid + spread),
        confidence=round(confidence, 2),
        basis=f"Attacker at hop {idx + 1}/{len(scenario.path)}; {hops} hop(s), {guarded_ahead} guarded boundary(ies) to target.",
    )


def compute_state(facility_id: str, mode: str, elapsed: float,
                  approve_action_id: Optional[str] = None, approve_at: Optional[float] = None) -> WorldState:
    scenario = SCENARIOS[facility_id]
    topo = TOPOLOGIES[facility_id]
    node_states = {n.id: "nominal" for n in topo["nodes"]}
    metrics = [MetricReading(**m) for m in seed_metrics(facility_id)]

    all_det = detect(scenario) if mode == "defended" else []
    detections = [d for d in all_det if d.at <= elapsed]
    fda = min((d.at for d in all_det), default=None)

    contained_at = None
    block_from_order = float("inf")
    if mode == "defended" and approve_action_id and approve_at is not None:
        contained_at = approve_at
        impact_stage = next((s for s in scenario.stages if s.kind == "impact"), None)
        if impact_stage and approve_at <= impact_stage.at:
            block_from_order = impact_stage.order

    attacker = None
    impact_at = None
    for stage in scenario.stages:
        if stage.at > elapsed:
            break
        blocked = stage.order >= block_from_order
        if not blocked:
            attacker = stage.nodeId
        if blocked:
            if node_states[stage.nodeId] == "nominal":
                node_states[stage.nodeId] = "contained"
            continue
        if stage.kind == "impact":
            node_states[stage.nodeId] = "compromised"
        elif node_states[stage.nodeId] == "nominal":
            node_states[stage.nodeId] = "watch" if stage.kind == "recon" else "alert"
        if stage.impact:
            node_states[stage.impact.nodeId] = stage.impact.state
            if stage.kind == "impact":
                impact_at = stage.at
            if stage.impact.metric:
                for m in metrics:
                    if m.key == stage.impact.metric.key:
                        m.value = stage.impact.metric.to

    for d in detections:
        if node_states[d.nodeId] == "nominal":
            node_states[d.nodeId] = "watch"

    prediction = None
    if mode == "defended" and attacker and fda is not None and elapsed >= fda:
        prediction = predict(scenario, attacker, elapsed)

    done = elapsed >= scenario.durationSec
    if elapsed <= 0:
        phase = "idle"
    elif block_from_order != float("inf") and contained_at is not None and elapsed >= contained_at:
        phase = "contained" if done else "running"
    elif impact_at is not None:
        phase = "impacted" if done else "running"
    else:
        phase = "complete" if done else "running"

    return WorldState(
        elapsedSec=elapsed, mode=mode, phase=phase, nodeStates=node_states,
        attackerNodeId=attacker, detections=detections, prediction=prediction,
        metrics=metrics, firstDetectionAt=fda, impactAt=impact_at,
        containedAt=contained_at if block_from_order != float("inf") else None,
    )


def summarise_run(facility_id: str, mode: str, approve_action_id=None, approve_at=None) -> RunOutcome:
    scenario = SCENARIOS[facility_id]
    end = compute_state(facility_id, mode, scenario.durationSec, approve_action_id, approve_at)
    impact_stage = next((s for s in scenario.stages if s.kind == "impact"), None)
    lead = round(impact_stage.at - end.firstDetectionAt, 1) if (end.firstDetectionAt is not None and impact_stage) else None
    affected = sum(1 for s in end.nodeStates.values() if s in ("compromised", "offline", "alert"))
    return RunOutcome(mode=mode, detectionLeadSec=lead, affectedAssets=affected,
                      impacted=end.phase == "impacted", contained=end.phase == "contained",
                      finalMetrics=end.metrics)
