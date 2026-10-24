// Scenario-based prediction: given how far the attacker has progressed along
// the scripted path and the network reachability to critical assets, estimate
// the likely target and an ETA window. This is an ESTIMATE from the simulation
// state, NOT a validated real-world forecast.
import type { FacilityTopology, Prediction, Scenario } from './types'

/** BFS distance (in hops) from a node to every other, respecting guarded edges cost. */
function hopDistances(topo: FacilityTopology, from: string): Map<string, number> {
  const adj = new Map<string, { to: string; guarded: boolean }[]>()
  for (const n of topo.nodes) adj.set(n.id, [])
  for (const e of topo.edges) {
    adj.get(e.from)?.push({ to: e.to, guarded: !!e.guarded })
    adj.get(e.to)?.push({ to: e.from, guarded: !!e.guarded })
  }
  const dist = new Map<string, number>([[from, 0]])
  const q = [from]
  while (q.length) {
    const cur = q.shift()!
    for (const { to } of adj.get(cur) ?? []) {
      if (!dist.has(to)) {
        dist.set(to, (dist.get(cur) ?? 0) + 1)
        q.push(to)
      }
    }
  }
  return dist
}

/**
 * Predict the target from the attacker's current node.
 * Confidence rises as the attacker nears the scripted target and as fewer
 * guarded boundaries remain between them and a critical asset.
 */
export function predict(
  scenario: Scenario,
  topo: FacilityTopology,
  currentNodeId: string,
  nowSec: number,
): Prediction | null {
  const idx = scenario.path.indexOf(currentNodeId)
  if (idx < 0) return null

  const target = topo.nodes.find((n) => n.id === scenario.targetNodeId)
  if (!target) return null

  const dist = hopDistances(topo, currentNodeId)
  const hopsToTarget = dist.get(scenario.targetNodeId) ?? 99

  // Guarded boundaries still between attacker and target lower confidence.
  const remainingPath = scenario.path.slice(idx)
  const guardedAhead = topo.edges.filter(
    (e) => e.guarded && remainingPath.includes(e.from) && remainingPath.includes(e.to),
  ).length

  const progress = idx / Math.max(1, scenario.path.length - 1)
  const confidence = Math.min(0.95, Math.max(0.3, 0.55 + progress * 0.45 - guardedAhead * 0.08))

  // Average scripted gap between stages → rough per-hop time.
  const gaps = scenario.stages.map((s) => s.at)
  const avgGap =
    gaps.length > 1
      ? (gaps[gaps.length - 1] - gaps[0]) / (gaps.length - 1)
      : scenario.durationSec / Math.max(1, scenario.path.length)
  const etaMid = Math.max(0, hopsToTarget * avgGap)
  const spread = Math.max(2, avgGap * 0.6)

  return {
    at: nowSec,
    targetNodeId: scenario.targetNodeId,
    etaSecLow: Math.round(Math.max(0, etaMid - spread)),
    etaSecHigh: Math.round(etaMid + spread),
    confidence: Math.round(confidence * 100) / 100,
    basis: `Attacker at hop ${idx + 1}/${scenario.path.length}; ${hopsToTarget} hop(s) and ${guardedAhead} guarded boundary(ies) to the ${target.critical ? 'critical ' : ''}target.`,
    basisAr: `المهاجم عند الخطوة ${idx + 1}/${scenario.path.length}؛ يفصله ${hopsToTarget} قفزة و${guardedAhead} حدود محمية عن الهدف.`,
  }
}
