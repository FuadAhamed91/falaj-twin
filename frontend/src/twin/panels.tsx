import { motion, AnimatePresence } from 'framer-motion'
import { Play, Pause, RotateCcw, Repeat, ShieldCheck, Crosshair, Clock, Activity, CheckCircle2, AlertTriangle } from 'lucide-react'
import { useSim, useWorld, useContainments } from '../store/simStore'
import { useT, usePick } from '../i18n/useLang'
import { fmtClock } from '../lib/clock'
import { getScenario, getTopology, type TimelineEntry, type WorldState } from '../sim'
import { Badge, StateDot, Segmented } from '../components/ui'
import { STATE_COLOR } from '../lib/theme'

/* ---- Mode toggle ---- */
export function ModeToggle() {
  const t = useT()
  const mode = useSim((s) => s.mode)
  const setMode = useSim((s) => s.setMode)
  const demoActive = useSim((s) => s.demo.active)
  return (
    <Segmented
      value={mode}
      onChange={(m) => !demoActive && setMode(m)}
      options={[
        { value: 'baseline', label: t('mode.baseline') },
        { value: 'defended', label: t('mode.defended') },
      ]}
    />
  )
}

/* ---- Run controls ---- */
export function RunControls({ compact = false }: { compact?: boolean }) {
  const t = useT()
  const running = useSim((s) => s.running)
  const elapsed = useSim((s) => s.elapsedSec)
  const facilityId = useSim((s) => s.facilityId)
  const demoActive = useSim((s) => s.demo.active)
  const { start, pause, resume, reset, replay } = useSim()
  const scn = getScenario(facilityId)
  const pct = Math.min(100, (elapsed / scn.durationSec) * 100)
  const started = elapsed > 0

  const btn = 'inline-flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition-colors disabled:opacity-40'

  return (
    <div className={`flex items-center gap-2 ${compact ? '' : 'panel p-3'}`}>
      {!running ? (
        <button disabled={demoActive} onClick={started && elapsed < scn.durationSec ? resume : start}
          className={`${btn} bg-ok/15 text-ok ring-1 ring-inset ring-ok/30 hover:bg-ok/20`}>
          <Play size={14} /> {started && elapsed < scn.durationSec ? t('ctrl.resume') : t('ctrl.start')}
        </button>
      ) : (
        <button disabled={demoActive} onClick={pause} className={`${btn} bg-warn/15 text-warn ring-1 ring-inset ring-warn/30 hover:bg-warn/20`}>
          <Pause size={14} /> {t('ctrl.pause')}
        </button>
      )}
      <button disabled={demoActive} onClick={reset} className={`${btn} bg-ink-800 text-fog-300 ring-1 ring-inset ring-hair-strong hover:text-fog-100`}>
        <RotateCcw size={14} /> {t('ctrl.reset')}
      </button>
      <button disabled={demoActive} onClick={replay} className={`${btn} bg-ink-800 text-fog-300 ring-1 ring-inset ring-hair-strong hover:text-fog-100`}>
        <Repeat size={14} /> {t('ctrl.replay')}
      </button>
      <div className="ms-2 flex flex-1 items-center gap-2">
        <Clock size={13} className="text-fog-500" />
        <span className="num text-xs text-fog-300">{fmtClock(elapsed)}</span>
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-ink-700">
          <div className="h-full rounded-full bg-signal transition-[width] duration-150" style={{ width: `${pct}%` }} />
        </div>
      </div>
    </div>
  )
}

/* ---- Phase pill ---- */
export function PhaseBadge({ world }: { world: WorldState }) {
  const t = useT()
  const map = {
    idle: { tone: 'neutral', key: 'phase.idle' },
    running: { tone: 'warn', key: 'phase.running' },
    paused: { tone: 'neutral', key: 'phase.paused' },
    contained: { tone: 'ok', key: 'phase.contained' },
    impacted: { tone: 'threat', key: 'phase.impacted' },
    complete: { tone: 'signal', key: 'phase.complete' },
  } as const
  const m = map[world.phase]
  return <Badge tone={m.tone}>{t(m.key)}</Badge>
}

/* ---- Asset inspection panel ---- */
export function AssetPanel() {
  const t = useT()
  const pick = usePick()
  const facilityId = useSim((s) => s.facilityId)
  const selectedId = useSim((s) => s.selectedNodeId)
  const world = useWorld()
  const topo = getTopology(facilityId)
  const node = topo.nodes.find((n) => n.id === selectedId)

  if (!node) {
    return (
      <div className="panel flex h-full flex-col items-center justify-center gap-2 p-6 text-center">
        <Crosshair size={22} className="text-fog-600" />
        <div className="text-sm text-fog-400">{t('twin.selectHint')}</div>
      </div>
    )
  }
  const state = world.nodeStates[node.id] ?? 'nominal'
  return (
    <div className="panel p-4">
      <div className="mb-3 flex items-start justify-between gap-2">
        <div>
          <div className="eyebrow mb-1">{t('panel.assetStatus')}</div>
          <div className="text-sm font-semibold text-fog-50">{pick(node.label, node.labelAr)}</div>
        </div>
        <div className="flex items-center gap-1.5">
          <StateDot state={state} pulse={state === 'compromised' || state === 'alert'} />
          <span className="text-[11px] font-medium capitalize" style={{ color: STATE_COLOR[state] }}>{state}</span>
        </div>
      </div>
      <dl className="space-y-2 text-[11.5px]">
        <Row label="Zone" value={node.zone} />
        <Row label="Type" value={node.kind} />
        <Row label="Critical asset" value={node.critical ? 'Yes' : 'No'} tone={node.critical ? 'warn' : undefined} />
        {node.controls && node.controls.length > 0 && (
          <div className="flex items-start justify-between gap-2">
            <dt className="text-fog-500">Controls</dt>
            <dd className="flex flex-wrap justify-end gap-1">
              {node.controls.map((c) => <Badge key={c} tone="signal">{c}</Badge>)}
            </dd>
          </div>
        )}
      </dl>
    </div>
  )
}
function Row({ label, value, tone }: { label: string; value: string; tone?: 'warn' }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <dt className="text-fog-500">{label}</dt>
      <dd className={`font-medium capitalize ${tone === 'warn' ? 'text-warn' : 'text-fog-200'}`}>{value}</dd>
    </div>
  )
}

/* ---- Incident timeline ---- */
const TL_COLOR: Record<TimelineEntry['kind'], string> = {
  stage: STATE_COLOR.alert, detection: STATE_COLOR.watch, prediction: '#a78bfa',
  containment: STATE_COLOR.contained, impact: STATE_COLOR.compromised,
}
export function TimelinePanel({ max = 40 }: { max?: number }) {
  const t = useT()
  const pick = usePick()
  const world = useWorld()
  const items = world.timeline.slice(-max)
  return (
    <div className="panel flex min-h-0 flex-col p-4">
      <div className="eyebrow mb-3">{t('panel.timeline')}</div>
      <div className="relative min-h-0 flex-1 space-y-3 overflow-y-auto pe-1">
        {items.length === 0 && <div className="text-[11px] text-fog-500">No events yet — start a run.</div>}
        <AnimatePresence initial={false}>
          {items.map((e, i) => (
            <motion.div key={`${e.at}-${e.kind}-${i}`} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }}
              className="flex gap-2.5">
              <div className="flex flex-col items-center">
                <span className="mt-1 h-2 w-2 shrink-0 rounded-full" style={{ background: TL_COLOR[e.kind], boxShadow: `0 0 6px ${TL_COLOR[e.kind]}` }} />
                {i < items.length - 1 && <span className="mt-1 w-px flex-1 bg-ink-700" />}
              </div>
              <div className="pb-1">
                <div className="flex items-center gap-2">
                  <span className="num text-[10px] text-fog-500">{fmtClock(e.at)}</span>
                  <span className="text-[9px] uppercase tracking-wide" style={{ color: TL_COLOR[e.kind] }}>{e.kind}</span>
                </div>
                <div className="text-[11.5px] leading-snug text-fog-200">{pick(e.title, e.titleAr)}</div>
                {e.detail && <div className="text-[10px] text-fog-500">{pick(e.detail, e.detailAr)}</div>}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  )
}

/* ---- Prediction + recommended response (with approval) ---- */
export function PredictionPanel() {
  const t = useT()
  const pick = usePick()
  const world = useWorld()
  const facilityId = useSim((s) => s.facilityId)
  const decision = useSim((s) => s.decision)
  const approve = useSim((s) => s.approve)
  const demoActive = useSim((s) => s.demo.active)
  const containments = useContainments()
  const topo = getTopology(facilityId)
  const rec = containments[0]
  const targetNode = world.prediction ? topo.nodes.find((n) => n.id === world.prediction!.targetNodeId) : null

  return (
    <div className="panel p-4">
      <div className="eyebrow mb-3 flex items-center gap-2"><Crosshair size={13} /> {t('panel.prediction')}</div>
      {!world.prediction ? (
        <div className="text-[11px] text-fog-500">
          {world.mode === 'baseline' ? 'Switch to “With FALAJ” to enable detection & prediction.' : 'Prediction appears once anomalous activity is detected.'}
        </div>
      ) : (
        <div className="space-y-3">
          <div className="rounded-lg border border-predict/25 bg-predict/[0.06] p-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase tracking-wide text-predict">{t('panel.predictedTarget')}</span>
              <Badge tone="predict">{Math.round(world.prediction.confidence * 100)}% {t('panel.confidence')}</Badge>
            </div>
            <div className="mt-1 text-sm font-semibold text-fog-50">{targetNode ? pick(targetNode.label, targetNode.labelAr) : world.prediction.targetNodeId}</div>
            <div className="mt-1 flex items-center gap-1.5 text-[11px] text-fog-400">
              <Clock size={11} /> {t('panel.eta')} {world.prediction.etaSecLow}–{world.prediction.etaSecHigh}s
            </div>
            <div className="mt-1.5 text-[10.5px] leading-snug text-fog-500">{pick(world.prediction.basis, world.prediction.basisAr)}</div>
          </div>
          <div className="text-[10px] italic text-fog-500">{t('panel.estimateNote')}</div>

          {rec && (
            <div className="rounded-lg border border-hair-strong bg-ink-800/50 p-3">
              <div className="eyebrow mb-1.5">{t('resp.recommended')}</div>
              <div className="text-[12px] font-medium text-fog-100">{pick(rec.label, rec.labelAr)}</div>
              <div className="mt-1 text-[10.5px] text-fog-400">{pick(rec.description, rec.descriptionAr)}</div>
              <div className="mt-3">
                {decision ? (
                  <div className="flex items-center gap-2 rounded-lg bg-ok/10 px-3 py-2 text-[11px] font-medium text-ok ring-1 ring-inset ring-ok/25">
                    <CheckCircle2 size={14} /> {t('resp.applied')} · {fmtClock(decision.approvedAt ?? 0)}
                  </div>
                ) : (
                  <button disabled={demoActive} onClick={() => approve(rec)}
                    className="flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-signal/25 to-signal-deep/25 px-3 py-2.5 text-xs font-semibold text-signal ring-1 ring-inset ring-signal/30 transition-colors hover:from-signal/30 hover:to-signal-deep/30 disabled:opacity-40">
                    <ShieldCheck size={15} /> {t('resp.approve')}
                  </button>
                )}
                {!decision && <div className="mt-1.5 flex items-center justify-center gap-1 text-[10px] text-warn/80"><AlertTriangle size={10} /> {t('resp.approvalNeeded')}</div>}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

/* ---- Detections list ---- */
export function DetectionsPanel() {
  const t = useT()
  const pick = usePick()
  const world = useWorld()
  return (
    <div className="panel flex min-h-0 flex-col p-4">
      <div className="eyebrow mb-3 flex items-center gap-2"><Activity size={13} /> {t('panel.detections')}</div>
      <div className="min-h-0 flex-1 space-y-2 overflow-y-auto">
        {world.detections.length === 0 && <div className="text-[11px] text-fog-500">No detections (baseline has none).</div>}
        {world.detections.map((d) => (
          <div key={d.id} className="rounded-lg border border-hair bg-ink-800/40 p-2.5">
            <div className="flex items-center justify-between gap-2">
              <span className="num text-[10px] text-fog-500">{fmtClock(d.at)}</span>
              <Badge tone={d.severity === 'critical' ? 'threat' : d.severity === 'high' ? 'warn' : 'signal'}>{d.severity}</Badge>
            </div>
            <div className="mt-1 text-[11.5px] text-fog-200">{pick(d.message, d.messageAr)}</div>
            <div className="mt-0.5 flex items-center gap-2 text-[9.5px] text-fog-500">
              <span>{d.ruleId}</span>{d.mitre && <span>· {d.mitre}</span>}<span>· {d.engine}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
