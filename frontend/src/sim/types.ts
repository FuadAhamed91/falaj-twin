// FALAJ Twin — shared simulation domain types.
// Everything here describes SYNTHETIC assets and SIMULATED events. No real
// facility systems are represented, read, or controlled.

export type Sector = 'water' | 'healthcare' | 'power'

/** Purdue-style network zones, office (IT) down to field devices. */
export type Zone = 'IT' | 'DMZ' | 'OT' | 'CONTROL' | 'FIELD'

export type NodeKind =
  | 'workstation'
  | 'server'
  | 'firewall'
  | 'historian'
  | 'hmi'
  | 'plc'
  | 'rtu'
  | 'pump'
  | 'valve'
  | 'tank'
  | 'sensor'
  | 'transformer'
  | 'breaker'

/** Live state of a synthetic asset during a scenario run. */
export type AssetState = 'nominal' | 'watch' | 'alert' | 'compromised' | 'contained' | 'offline'

export interface SimNode {
  id: string
  label: string
  labelAr?: string
  kind: NodeKind
  zone: Zone
  /** Normalised position in the facility's physical scene (metres, local frame). */
  scenePos?: [number, number, number]
  /** True for safety/service-critical assets (the things an attacker targets). */
  critical?: boolean
  /** Defensive controls present on this node (segmentation, auth, write-protect…). */
  controls?: string[]
}

export interface SimEdge {
  from: string
  to: string
  /** Protocol label for the link (synthetic). */
  protocol?: string
  /** Whether a segmentation boundary (firewall/diode) sits on this edge. */
  guarded?: boolean
}

export interface FacilityTopology {
  facilityId: string
  sector: Sector
  nodes: SimNode[]
  edges: SimEdge[]
}

export type StageKind = 'recon' | 'initial-access' | 'lateral' | 'privilege' | 'impact'

/** One scripted step of a scenario. Deterministic: same scenario → same steps. */
export interface ScenarioStage {
  id: string
  order: number
  kind: StageKind
  /** Node the attacker reaches / acts on at this stage. */
  nodeId: string
  /** MITRE ATT&CK for ICS technique id, for reference only. */
  mitre?: string
  title: string
  titleAr?: string
  /** What an analyst would observe — the evidence a rule keys on. */
  evidence: string
  evidenceAr?: string
  /** Seconds from scenario start at which this stage fires. */
  at: number
  /** Physical consequence applied to the scene when this stage lands (WITHOUT defence). */
  impact?: {
    nodeId: string
    state: AssetState
    /** e.g. water-level delta, pump offline — purely illustrative. */
    metric?: { key: string; to: number; unit?: string; label?: string; labelAr?: string }
    consequence?: string
    consequenceAr?: string
  }
}

export interface Scenario {
  id: string
  facilityId: string
  code: 'A' | 'B' | 'C'
  name: string
  nameAr?: string
  summary: string
  summaryAr?: string
  /** The attack path through the network graph (ordered node ids). */
  path: string[]
  stages: ScenarioStage[]
  /** The asset the scenario is ultimately aimed at. */
  targetNodeId: string
  durationSec: number
}

export type DetectionSeverity = 'info' | 'low' | 'medium' | 'high' | 'critical'

export interface DetectionEvent {
  id: string
  at: number
  stageId: string
  nodeId: string
  ruleId: string
  severity: DetectionSeverity
  /** 'rule' is the reliable baseline; 'ml' is the optional Isolation-Forest supplement. */
  engine: 'rule' | 'ml'
  message: string
  messageAr?: string
  mitre?: string
}

export interface Prediction {
  at: number
  targetNodeId: string
  /** Scenario-based estimate, NOT a validated real-world forecast. */
  etaSecLow: number
  etaSecHigh: number
  confidence: number
  basis: string
  basisAr?: string
}

export type RunMode = 'baseline' | 'defended'

export type RunPhase = 'idle' | 'running' | 'paused' | 'contained' | 'impacted' | 'complete'

export interface ContainmentAction {
  id: string
  label: string
  labelAr?: string
  /** Node the action is applied to. */
  nodeId: string
  /** Edge isolated, if the action is a segmentation cut. */
  isolatesEdge?: [string, string]
  description: string
  descriptionAr?: string
  /** Requires explicit simulated operator approval before it is applied. */
  requiresApproval: true
}
