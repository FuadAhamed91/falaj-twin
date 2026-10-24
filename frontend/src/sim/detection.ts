// Deterministic rule-based detection — the reliable baseline.
// Each stage of a scenario maps to one or more rules keyed on its evidence.
// (An optional Isolation-Forest supplement lives in the backend; the frontend
//  baseline is fully deterministic so the demo is reproducible.)
import type { DetectionEvent, DetectionSeverity, Scenario, ScenarioStage } from './types'

export interface Rule {
  id: string
  name: string
  nameAr?: string
  /** Which stage kinds / nodes this rule fires on. */
  appliesTo: (stage: ScenarioStage) => boolean
  severity: DetectionSeverity
  message: (stage: ScenarioStage) => string
  messageAr?: (stage: ScenarioStage) => string
  /** Detection latency in seconds after the stage lands (defended mode). */
  latencySec: number
}

export const RULES: Rule[] = [
  {
    id: 'R-ACCESS-01',
    name: 'Off-hours remote login without MFA',
    nameAr: 'دخول عن بُعد خارج الدوام دون مصادقة ثنائية',
    appliesTo: (s) => s.kind === 'initial-access',
    severity: 'high',
    latencySec: 2,
    message: (s) => `Rule R-ACCESS-01: anomalous access detected at ${s.nodeId}.`,
    messageAr: (s) => `القاعدة R-ACCESS-01: رُصد وصول غير طبيعي عند ${s.nodeId}.`,
  },
  {
    id: 'R-LATERAL-02',
    name: 'Unexpected east-west / cross-zone session',
    nameAr: 'جلسة غير متوقعة عبر المناطق',
    appliesTo: (s) => s.kind === 'lateral',
    severity: 'high',
    latencySec: 3,
    message: (s) => `Rule R-LATERAL-02: cross-zone movement toward ${s.nodeId}.`,
    messageAr: (s) => `القاعدة R-LATERAL-02: حركة بين المناطق نحو ${s.nodeId}.`,
  },
  {
    id: 'R-WRITE-03',
    name: 'Unauthorised control-parameter write',
    nameAr: 'كتابة تحكم غير مصرّح بها',
    appliesTo: (s) => s.kind === 'impact' && (s.mitre === 'T0831' || s.mitre === 'T0836'),
    severity: 'critical',
    latencySec: 1,
    message: (s) => `Rule R-WRITE-03: unauthorised write to controller ${s.nodeId}.`,
    messageAr: (s) => `القاعدة R-WRITE-03: كتابة غير مصرّح بها إلى ${s.nodeId}.`,
  },
  {
    id: 'R-STIX-04',
    name: 'Shared indicator match on local inventory',
    nameAr: 'تطابق مؤشر مُشترك مع المخزون المحلي',
    appliesTo: (s) => s.kind === 'recon',
    severity: 'medium',
    latencySec: 2,
    message: (s) => `Rule R-STIX-04: shared indicator matched at ${s.nodeId}.`,
    messageAr: (s) => `القاعدة R-STIX-04: تطابق مؤشر مُشترك عند ${s.nodeId}.`,
  },
]

/** Produce the detection events a scenario yields in defended mode, deterministically. */
export function detectScenario(scenario: Scenario): DetectionEvent[] {
  const events: DetectionEvent[] = []
  for (const stage of scenario.stages) {
    for (const rule of RULES) {
      if (!rule.appliesTo(stage)) continue
      events.push({
        id: `det-${scenario.id}-${stage.id}-${rule.id}`,
        at: stage.at + rule.latencySec,
        stageId: stage.id,
        nodeId: stage.nodeId,
        ruleId: rule.id,
        severity: rule.severity,
        engine: 'rule',
        message: rule.message(stage),
        messageAr: rule.messageAr?.(stage),
        mitre: stage.mitre,
      })
    }
  }
  return events.sort((a, b) => a.at - b.at)
}

/** Earliest detection time (for lead-time measurement). */
export function firstDetectionAt(events: DetectionEvent[]): number | null {
  return events.length ? Math.min(...events.map((e) => e.at)) : null
}
