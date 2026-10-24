import { describe, it, expect } from 'vitest'
import {
  computeState,
  summariseRun,
  getScenario,
  getTopology,
  getContainments,
  detectScenario,
} from './index'

const scn = getScenario('taweelah')
const topo = getTopology('taweelah')

describe('engine — baseline (no FALAJ)', () => {
  it('starts idle and healthy at t=0', () => {
    const s = computeState(scn, topo, 'baseline', 0)
    expect(s.phase).toBe('idle')
    expect(s.detections).toHaveLength(0)
    expect(Object.values(s.nodeStates).every((v) => v === 'nominal')).toBe(true)
    expect(s.metrics.find((m) => m.key === 'supply')?.value).toBe(100)
  })

  it('produces no detections in baseline mode', () => {
    const s = computeState(scn, topo, 'baseline', scn.durationSec)
    expect(s.detections).toHaveLength(0)
    expect(s.firstDetectionAt).toBeNull()
  })

  it('reaches impact: pump offline and supply drops to 0', () => {
    const s = computeState(scn, topo, 'baseline', scn.durationSec)
    expect(s.phase).toBe('impacted')
    expect(s.nodeStates['tw-pump-1']).toBe('offline')
    expect(s.metrics.find((m) => m.key === 'supply')?.value).toBe(0)
    expect(s.impactAt).not.toBeNull()
  })

  it('is deterministic — same inputs, identical output', () => {
    const a = computeState(scn, topo, 'baseline', 18)
    const b = computeState(scn, topo, 'baseline', 18)
    expect(JSON.stringify(a)).toBe(JSON.stringify(b))
  })
})

describe('engine — defended (with FALAJ)', () => {
  it('detects before the impact stage lands', () => {
    const dets = detectScenario(scn)
    const impactStage = scn.stages.find((s) => s.kind === 'impact')!
    expect(dets.length).toBeGreaterThan(0)
    expect(Math.min(...dets.map((d) => d.at))).toBeLessThan(impactStage.at)
  })

  it('yields a prediction pointing at the scripted target', () => {
    const s = computeState(scn, topo, 'defended', 20)
    expect(s.prediction).not.toBeNull()
    expect(s.prediction!.targetNodeId).toBe(scn.targetNodeId)
    expect(s.prediction!.confidence).toBeGreaterThan(0.3)
    expect(s.prediction!.confidence).toBeLessThanOrEqual(0.95)
  })

  it('prevents impact when an approved action lands before it', () => {
    const action = getContainments('taweelah').find((a) => a.id === 'ct-writeprotect-pump')!
    const s = computeState(scn, topo, 'defended', scn.durationSec, { action, approvedAt: 18 })
    expect(s.phase).toBe('contained')
    expect(s.nodeStates['tw-pump-1']).not.toBe('offline')
    expect(s.metrics.find((m) => m.key === 'supply')?.value).toBe(100)
    expect(s.containedAt).toBe(18)
  })

  it('does NOT prevent impact if approval comes too late', () => {
    const action = getContainments('taweelah').find((a) => a.id === 'ct-writeprotect-pump')!
    const s = computeState(scn, topo, 'defended', scn.durationSec, { action, approvedAt: 27 })
    expect(s.phase).toBe('impacted')
    expect(s.nodeStates['tw-pump-1']).toBe('offline')
  })
})

describe('run comparison', () => {
  it('defended run has positive detection lead time; baseline has none', () => {
    const base = summariseRun(scn, topo, 'baseline')
    const defended = summariseRun(scn, topo, 'defended', {
      action: getContainments('taweelah').find((a) => a.id === 'ct-writeprotect-pump')!,
      approvedAt: 18,
    })
    expect(base.detectionLeadSec).toBeNull()
    expect(base.impacted).toBe(true)
    expect(defended.detectionLeadSec).not.toBeNull()
    expect(defended.detectionLeadSec!).toBeGreaterThan(0)
    expect(defended.contained).toBe(true)
    expect(defended.affectedAssets).toBeLessThan(topo.nodes.length)
  })
})

describe('all facilities are runnable', () => {
  for (const id of ['taweelah', 'cleveland-clinic', 'dewa-nad-hessa']) {
    it(`${id}: scenario + topology resolve and step without error`, () => {
      const s = getScenario(id)
      const t = getTopology(id)
      expect(s.path.every((n) => t.nodes.some((x) => x.id === n))).toBe(true)
      expect(t.nodes.some((n) => n.id === s.targetNodeId)).toBe(true)
      const w = computeState(s, t, 'defended', s.durationSec)
      expect(w.timeline.length).toBeGreaterThan(0)
    })
  }
})
