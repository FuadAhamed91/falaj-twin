"""Pydantic models for the synthetic simulation domain (mirrors the frontend)."""
from __future__ import annotations

from typing import Literal, Optional
from pydantic import BaseModel

Zone = Literal["IT", "DMZ", "OT", "CONTROL", "FIELD"]
AssetState = Literal["nominal", "watch", "alert", "compromised", "contained", "offline"]
RunMode = Literal["baseline", "defended"]
RunPhase = Literal["idle", "running", "paused", "contained", "impacted", "complete"]
Severity = Literal["info", "low", "medium", "high", "critical"]


class SimNode(BaseModel):
    id: str
    label: str
    kind: str
    zone: Zone
    critical: bool = False
    controls: list[str] = []


class SimEdge(BaseModel):
    frm: str
    to: str
    protocol: Optional[str] = None
    guarded: bool = False


class Metric(BaseModel):
    key: str
    to: float
    unit: Optional[str] = None
    label: Optional[str] = None


class Impact(BaseModel):
    nodeId: str
    state: AssetState
    metric: Optional[Metric] = None
    consequence: Optional[str] = None


class Stage(BaseModel):
    id: str
    order: int
    kind: Literal["recon", "initial-access", "lateral", "privilege", "impact"]
    nodeId: str
    mitre: Optional[str] = None
    title: str
    evidence: str
    at: float
    impact: Optional[Impact] = None


class Scenario(BaseModel):
    id: str
    facilityId: str
    code: str
    name: str
    summary: str
    path: list[str]
    targetNodeId: str
    durationSec: float
    stages: list[Stage]


class DetectionEvent(BaseModel):
    id: str
    at: float
    stageId: str
    nodeId: str
    ruleId: str
    severity: Severity
    engine: Literal["rule", "ml"]
    message: str
    mitre: Optional[str] = None


class Prediction(BaseModel):
    at: float
    targetNodeId: str
    etaSecLow: int
    etaSecHigh: int
    confidence: float
    basis: str


class MetricReading(BaseModel):
    key: str
    value: float
    unit: Optional[str] = None
    label: Optional[str] = None


class WorldState(BaseModel):
    elapsedSec: float
    mode: RunMode
    phase: RunPhase
    nodeStates: dict[str, AssetState]
    attackerNodeId: Optional[str] = None
    detections: list[DetectionEvent]
    prediction: Optional[Prediction] = None
    metrics: list[MetricReading]
    firstDetectionAt: Optional[float] = None
    impactAt: Optional[float] = None
    containedAt: Optional[float] = None


class SimulateRequest(BaseModel):
    facilityId: str
    mode: RunMode = "baseline"
    elapsedSec: float = 0
    approveActionId: Optional[str] = None
    approveAt: Optional[float] = None


class RunOutcome(BaseModel):
    mode: RunMode
    detectionLeadSec: Optional[float] = None
    affectedAssets: int
    impacted: bool
    contained: bool
    finalMetrics: list[MetricReading]


class MatchRequest(BaseModel):
    sourceFacilityId: str = "taweelah"
