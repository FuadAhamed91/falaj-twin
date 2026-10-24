// Pure deterministic engine: elapsed time → full world state.
// Shared mental model for frontend + backend. No side effects, no randomness.
import type {
  AssetState,
  ContainmentAction,
  DetectionEvent,
  FacilityTopology,
  Prediction,
  RunMode,
  RunPhase,
  Scenario,
  ScenarioStage,
} from './types'
import { detectScenario, firstDetectionAt } from './detection'
import { predict } from './prediction'

export interface MetricReading {
  key: string
  value: number
  unit?: string
  label: string
  labelAr?: string
}

export interface TimelineEntry {
  at: number
  kind: 'stage' | 'detection' | 'prediction' | 'containment' | 'impact'
  nodeId?: string
  title: string
  titleAr?: string
  detail?: string
  detailAr?: string
  severity?: DetectionEvent['severity']
}

export interface WorldState {
  elapsedSec: number
  mode: RunMode
  phase: RunPhase
  nodeStates: Record<string, AssetState>
  /** Nodes/edges the attacker currently occupies, for path animation. */
  attackerNodeId: string | null
  activeStage: ScenarioStage | null
  reachedStageIds: string[]
  detections: DetectionEvent[]
  prediction: Prediction | null
  metrics: MetricReading[]
  timeline: TimelineEntry[]
  /** Set in defended mode once an approved action neutralises the path. */
  containedAt: number | null
  firstDetectionAt: number | null
  impactAt: number | null
}

export interface ContainmentDecision {
  action: ContainmentAction
  /** Simulated operator approval timestamp (sec). Null = not yet approved. */
  approvedAt: number | null
}

function baseMetrics(scenario: Scenario): MetricReading[] {
  // Seed healthy readings per scenario so impacts have something to move.
  switch (scenario.facilityId) {
    case 'taweelah':
      return [{ key: 'supply', value: 100, unit: '%', label: 'Product-water supply', labelAr: 'إمداد المياه المنتجة' }]
    case 'cleveland-clinic':
      return [{ key: 'pressure', value: 12, unit: 'Pa', label: 'Theatre differential pressure', labelAr: 'فرق الضغط' }]
    default:
      return []
  }
}

/**
 * Compute the world state at `elapsedSec`.
 * In defended mode, if an approved containment action isolates an edge on the
 * attacker's remaining path before the impact stage, the impact is prevented.
 */
export function computeState(
  scenario: Scenario,
  topo: FacilityTopology,
  mode: RunMode,
  elapsedSec: number,
  containment?: ContainmentDecision,
): WorldState {
  const nodeStates: Record<string, AssetState> = {}
  for (const n of topo.nodes) nodeStates[n.id] = 'nominal'

  const metrics = baseMetrics(scenario)
  const timeline: TimelineEntry[] = []

  const detectionsAll = mode === 'defended' ? detectScenario(scenario) : []
  const detections = detectionsAll.filter((d) => d.at <= elapsedSec)
  const fda = firstDetectionAt(detectionsAll)

  // Determine whether/when containment lands and which stages it blocks.
  let containedAt: number | null = null
  let blockFromOrder = Infinity
  if (mode === 'defended' && containment?.approvedAt != null) {
    containedAt = containment.approvedAt
    // The impact stage whose node sits past the isolated edge is prevented.
    const impactStage = scenario.stages.find((s) => s.kind === 'impact')
    if (impactStage && containment.approvedAt <= impactStage.at) {
      blockFromOrder = impactStage.order
    }
  }

  // Walk stages in order up to elapsed time, applying states + impacts.
  let attackerNodeId: string | null = null
  let activeStage: ScenarioStage | null = null
  const reachedStageIds: string[] = []
  let impactAt: number | null = null

  for (const stage of scenario.stages) {
    if (stage.at > elapsedSec) break
    const blocked = stage.order >= blockFromOrder
    reachedStageIds.push(stage.id)
    activeStage = stage
    if (!blocked) attackerNodeId = stage.nodeId

    timeline.push({
      at: stage.at,
      kind: stage.kind === 'impact' ? 'impact' : 'stage',
      nodeId: stage.nodeId,
      title: stage.title,
      titleAr: stage.titleAr,
      detail: stage.evidence,
      detailAr: stage.evidenceAr,
    })

    if (blocked) {
      // Attacker reached this node but the action stops the consequence.
      if (nodeStates[stage.nodeId] === 'nominal') nodeStates[stage.nodeId] = 'contained'
      continue
    }

    // Mark the stage's own node.
    if (stage.kind === 'impact') nodeStates[stage.nodeId] = 'compromised'
    else if (nodeStates[stage.nodeId] === 'nominal')
      nodeStates[stage.nodeId] = stage.kind === 'recon' ? 'watch' : 'alert'

    // Apply physical impact.
    if (stage.impact) {
      nodeStates[stage.impact.nodeId] = stage.impact.state
      if (stage.kind === 'impact') impactAt = stage.at
      if (stage.impact.metric) {
        const m = metrics.find((x) => x.key === stage.impact!.metric!.key)
        if (m) m.value = stage.impact.metric.to
      }
      if (stage.impact.consequence) {
        timeline.push({
          at: stage.at,
          kind: 'impact',
          nodeId: stage.impact.nodeId,
          title: stage.impact.consequence,
          titleAr: stage.impact.consequenceAr,
        })
      }
    }
  }

  // Detections onto timeline + node emphasis.
  for (const d of detections) {
    timeline.push({
      at: d.at,
      kind: 'detection',
      nodeId: d.nodeId,
      title: d.message,
      titleAr: d.messageAr,
      detail: d.ruleId,
      severity: d.severity,
    })
    if (nodeStates[d.nodeId] === 'nominal') nodeStates[d.nodeId] = 'watch'
  }

  // Prediction (defended mode, after first detection, before impact).
  let prediction: Prediction | null = null
  if (mode === 'defended' && attackerNodeId && fda != null && elapsedSec >= fda) {
    prediction = predict(scenario, topo, attackerNodeId, elapsedSec)
    if (prediction) {
      timeline.push({
        at: Math.max(elapsedSec, fda),
        kind: 'prediction',
        nodeId: prediction.targetNodeId,
        title: `Predicted target: ${prediction.targetNodeId} (${prediction.etaSecLow}-${prediction.etaSecHigh}s)`,
        detail: prediction.basis,
      })
    }
  }

  if (containedAt != null && containedAt <= elapsedSec) {
    const act = containment!.action
    timeline.push({
      at: containedAt,
      kind: 'containment',
      nodeId: act.nodeId,
      title: `Containment approved: ${act.label}`,
      titleAr: act.labelAr ? `اعتُمد الإجراء: ${act.labelAr}` : undefined,
      detail: act.description,
      detailAr: act.descriptionAr,
    })
  }

  // Phase.
  let phase: RunPhase = 'idle'
  const done = elapsedSec >= scenario.durationSec
  if (elapsedSec <= 0) phase = 'idle'
  else if (blockFromOrder !== Infinity && containedAt != null && elapsedSec >= containedAt)
    phase = done ? 'contained' : 'running'
  else if (impactAt != null) phase = done ? 'impacted' : 'running'
  else phase = done ? 'complete' : 'running'

  timeline.sort((a, b) => a.at - b.at || a.kind.localeCompare(b.kind))

  return {
    elapsedSec,
    mode,
    phase,
    nodeStates,
    attackerNodeId,
    activeStage,
    reachedStageIds,
    detections,
    prediction,
    metrics,
    timeline,
    containedAt: blockFromOrder !== Infinity ? containedAt : null,
    firstDetectionAt: fda,
    impactAt,
  }
}

/** Measured outcome of a full run, for the before/after comparison. */
export interface RunOutcome {
  mode: RunMode
  detectionLeadSec: number | null
  affectedAssets: number
  impacted: boolean
  contained: boolean
  finalMetrics: MetricReading[]
}

export function summariseRun(
  scenario: Scenario,
  topo: FacilityTopology,
  mode: RunMode,
  containment?: ContainmentDecision,
): RunOutcome {
  const end = computeState(scenario, topo, mode, scenario.durationSec, containment)
  const impactStage = scenario.stages.find((s) => s.kind === 'impact')
  const lead =
    end.firstDetectionAt != null && impactStage
      ? Math.round((impactStage.at - end.firstDetectionAt) * 10) / 10
      : null
  const affected = Object.values(end.nodeStates).filter(
    (s) => s === 'compromised' || s === 'offline' || s === 'alert',
  ).length
  return {
    mode,
    detectionLeadSec: lead,
    affectedAssets: affected,
    impacted: end.phase === 'impacted',
    contained: end.phase === 'contained',
    finalMetrics: end.metrics,
  }
}
