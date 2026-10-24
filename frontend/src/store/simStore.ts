// Single authoritative application state. The clock advances `elapsedSec`;
// world state is derived from it by the pure engine. One run = one scenario in
// one mode. The demo director scripts the whole before/after sequence.
import { useMemo } from 'react'
import { create } from 'zustand'
import {
  computeState,
  getContainments,
  getScenario,
  getTopology,
  summariseRun,
  type ContainmentAction,
  type ContainmentDecision,
  type RunMode,
  type RunOutcome,
  type WorldState,
} from '../sim'

export type FacilityId = 'taweelah' | 'cleveland-clinic' | 'dewa-nad-hessa'

export type DemoPhase =
  | 'off'
  | 'intro'
  | 'baseline'
  | 'baseline-impact'
  | 'defended'
  | 'approve'
  | 'contained'
  | 'compare'

interface SimState {
  facilityId: FacilityId
  mode: RunMode
  elapsedSec: number
  running: boolean
  speed: number
  selectedNodeId: string | null
  decision: ContainmentDecision | null
  /** Cached baseline outcome, for the comparison view. */
  baselineOutcome: RunOutcome | null
  /** t = total demo time; pt = time within the current phase. */
  demo: { active: boolean; phase: DemoPhase; t: number; pt: number }

  // derived
  world: () => WorldState
  outcome: () => RunOutcome
  containments: () => ContainmentAction[]

  // actions
  selectFacility: (id: FacilityId) => void
  setMode: (m: RunMode) => void
  selectNode: (id: string | null) => void
  start: () => void
  pause: () => void
  resume: () => void
  reset: () => void
  replay: () => void
  approve: (action: ContainmentAction) => void
  tick: (dtSec: number) => void

  startDemo: () => void
  stopDemo: () => void
}

function worldOf(s: Pick<SimState, 'facilityId' | 'mode' | 'elapsedSec' | 'decision'>): WorldState {
  const scn = getScenario(s.facilityId)
  const topo = getTopology(s.facilityId)
  return computeState(scn, topo, s.mode, s.elapsedSec, s.decision ?? undefined)
}

/* ---- Derived hooks (memoised so selectors never return fresh objects) ---- */
/** Current world state, recomputed only when its inputs change. */
export function useWorld(): WorldState {
  const facilityId = useSim((s) => s.facilityId)
  const mode = useSim((s) => s.mode)
  const elapsedSec = useSim((s) => s.elapsedSec)
  const decision = useSim((s) => s.decision)
  return useMemo(() => worldOf({ facilityId, mode, elapsedSec, decision }), [facilityId, mode, elapsedSec, decision])
}

export function useOutcome(mode?: RunMode): RunOutcome {
  const facilityId = useSim((s) => s.facilityId)
  const curMode = useSim((s) => s.mode)
  const decision = useSim((s) => s.decision)
  const m = mode ?? curMode
  return useMemo(
    () => summariseRun(getScenario(facilityId), getTopology(facilityId), m, m === 'defended' ? decision ?? undefined : undefined),
    [facilityId, m, decision],
  )
}

export function useContainments(): ContainmentAction[] {
  const facilityId = useSim((s) => s.facilityId)
  return useMemo(() => getContainments(facilityId), [facilityId])
}

export const useSim = create<SimState>((set, get) => ({
  facilityId: 'taweelah',
  mode: 'baseline',
  elapsedSec: 0,
  running: false,
  speed: 1,
  selectedNodeId: null,
  decision: null,
  baselineOutcome: null,
  demo: { active: false, phase: 'off', t: 0, pt: 0 },

  world: () => worldOf(get()),
  outcome: () => {
    const s = get()
    return summariseRun(getScenario(s.facilityId), getTopology(s.facilityId), s.mode, s.decision ?? undefined)
  },
  containments: () => getContainments(get().facilityId),

  selectFacility: (id) =>
    set({ facilityId: id, elapsedSec: 0, running: false, decision: null, selectedNodeId: null }),
  setMode: (m) => set({ mode: m, elapsedSec: 0, running: false, decision: null }),
  selectNode: (id) => set({ selectedNodeId: id }),

  start: () => set({ running: true, elapsedSec: 0, decision: null }),
  pause: () => set({ running: false }),
  resume: () => set({ running: true }),
  reset: () => set({ running: false, elapsedSec: 0, decision: null, selectedNodeId: null }),
  replay: () => set({ running: true, elapsedSec: 0, decision: null }),

  approve: (action) => set({ decision: { action, approvedAt: get().elapsedSec } }),

  tick: (dt) => {
    const s = get()
    if (s.demo.active) {
      advanceDemo(dt, get, set)
      return
    }
    if (!s.running) return
    const scn = getScenario(s.facilityId)
    const next = s.elapsedSec + dt * s.speed
    if (next >= scn.durationSec) set({ elapsedSec: scn.durationSec, running: false })
    else set({ elapsedSec: next })
  },

  startDemo: () =>
    set({
      demo: { active: true, phase: 'intro', t: 0, pt: 0 },
      facilityId: 'taweelah',
      mode: 'baseline',
      elapsedSec: 0,
      running: false,
      decision: null,
      selectedNodeId: null,
      baselineOutcome: null,
    }),
  stopDemo: () => set({ demo: { active: false, phase: 'off', t: 0, pt: 0 }, running: false }),
}))

/* ---------------- Demo director ---------------- */
// Scripted, repeatable sequence driven by the same clock. `pt` is the elapsed
// time within the current phase and resets to 0 on every transition.
const DEMO = {
  introHold: 2.5,
  impactHold: 3,
  approveAt: 18, // scenario-seconds at which the operator approves containment
  containedHold: 2,
  compareHold: 7,
}

function advanceDemo(dt: number, get: () => SimState, set: (p: Partial<SimState>) => void) {
  const s = get()
  const scn = getScenario(s.facilityId)
  const topo = getTopology(s.facilityId)

  let phase = s.demo.phase
  let pt = s.demo.pt + dt
  let elapsed = s.elapsedSec
  let mode = s.mode
  let running = s.running
  let decision = s.decision
  let baselineOutcome = s.baselineOutcome

  const to = (p: DemoPhase) => {
    phase = p
    pt = 0
  }

  switch (phase) {
    case 'intro':
      if (pt >= DEMO.introHold) {
        to('baseline')
        mode = 'baseline'
        elapsed = 0
        running = true
      }
      break
    case 'baseline':
      elapsed = Math.min(scn.durationSec, elapsed + dt)
      if (elapsed >= scn.durationSec) {
        running = false
        baselineOutcome = summariseRun(scn, topo, 'baseline')
        to('baseline-impact')
      }
      break
    case 'baseline-impact':
      if (pt >= DEMO.impactHold) {
        to('defended')
        mode = 'defended'
        elapsed = 0
        decision = null
        running = true
      }
      break
    case 'defended':
      elapsed = Math.min(scn.durationSec, elapsed + dt)
      if (elapsed >= DEMO.approveAt && !decision) {
        const act = getContainments(s.facilityId).find((a) => a.id === 'ct-writeprotect-pump')
        if (act) decision = { action: act, approvedAt: elapsed }
        to('approve')
      }
      break
    case 'approve':
      elapsed = Math.min(scn.durationSec, elapsed + dt)
      if (elapsed >= scn.durationSec) {
        running = false
        to('contained')
      }
      break
    case 'contained':
      if (pt >= DEMO.containedHold) to('compare')
      break
    case 'compare':
      if (pt >= DEMO.compareHold) {
        // Loop back to the start — repeatable without a page refresh.
        set({
          demo: { active: true, phase: 'intro', t: s.demo.t + dt, pt: 0 },
          mode: 'baseline',
          elapsedSec: 0,
          running: false,
          decision: null,
          baselineOutcome: null,
        })
        return
      }
      break
    default:
      break
  }

  set({
    demo: { active: true, phase, t: s.demo.t + dt, pt },
    elapsedSec: elapsed,
    mode,
    running,
    decision,
    baselineOutcome,
  })
}
