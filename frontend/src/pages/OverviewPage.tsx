import { useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { AlertTriangle, Droplet, Zap, HeartPulse, Activity, ArrowUpRight, ArrowDownRight } from 'lucide-react'
import { NationalMap } from '../three/NationalMap'
import { Badge, SimDisclaimer, StateDot } from '../components/ui'
import { useSim, useWorld } from '../store/simStore'
import { useT, usePick } from '../i18n/useLang'
import { fmtClock } from '../lib/clock'
import { getScenario } from '../sim'
import facilities from '@shared/facilities.json'

export function OverviewPage() {
  const t = useT()
  const pick = usePick()
  const nav = useNavigate()
  const facilityId = useSim((s) => s.facilityId)
  const world = useWorld()
  const demo = useSim((s) => s.demo)

  const active = world.phase === 'running' || world.phase === 'impacted' || (demo.active && demo.phase !== 'intro' && demo.phase !== 'compare')
  const fac = facilities.facilities.find((f) => f.id === facilityId)!
  const scn = getScenario(facilityId)
  const onSelect = useCallback(() => nav('/twin'), [nav])

  const risk = active ? (world.phase === 'impacted' ? 92 : Math.min(85, 35 + world.reachedStageIds.length * 16)) : 12

  return (
    <div className="grid h-full grid-rows-[1fr_auto] gap-3 p-4">
      <div className="grid min-h-0 grid-cols-[1fr_360px] gap-3">
        {/* Map */}
        <div className="relative overflow-hidden rounded-[var(--radius-panel)] border border-white/[0.06] bg-ink-900">
          <NationalMap onSelectFacility={onSelect} />
          <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between p-4">
            <div className="pointer-events-auto">
              <div className="eyebrow mb-1 text-signal">United Arab Emirates</div>
              <div className="text-lg font-semibold text-fog-50">Critical Infrastructure Grid</div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                <Badge tone="signal">{t('badge.realLocation')}</Badge>
                <Badge tone="warn">{t('badge.synthetic')}</Badge>
                <Badge tone="neutral">{t('badge.demoEnv')}</Badge>
              </div>
            </div>
          </div>
          <div className="pointer-events-none absolute inset-x-0 bottom-0 p-4">
            <div className="flex items-center gap-3 text-[11px] text-fog-400">
              <span className="inline-flex items-center gap-1.5"><Droplet size={12} className="text-signal" /> {t('sector.water')}</span>
              <span className="inline-flex items-center gap-1.5"><Zap size={12} className="text-warn" /> {t('sector.power')}</span>
              <span className="inline-flex items-center gap-1.5"><HeartPulse size={12} className="text-ok" /> {t('sector.healthcare')}</span>
              <span className="ms-auto">Drag to orbit · scroll to zoom · click a site</span>
            </div>
          </div>
        </div>

        {/* Threat rail */}
        <div className="flex min-h-0 flex-col gap-3 overflow-y-auto">
          <motion.div
            layout
            className={`rounded-[var(--radius-panel)] border p-4 ${active ? 'border-threat/40 bg-threat/[0.07]' : 'border-ok/25 bg-ok/[0.05]'}`}
          >
            <div className="flex items-center gap-2">
              {active ? <AlertTriangle size={16} className="text-threat" /> : <Activity size={16} className="text-ok" />}
              <span className={`eyebrow ${active ? 'text-threat' : 'text-ok'}`}>
                {active ? t('badge.simAttack') : t('phase.idle')}
              </span>
            </div>
            <div className="mt-2 text-sm font-medium text-fog-100">
              {active ? pick(scn.name, scn.nameAr) : 'All monitored sites nominal'}
            </div>
            {active && (
              <div className="mt-1 text-[11px] text-fog-400">
                {pick(fac.displayName, fac.displayName)} · {fmtClock(world.elapsedSec)}
              </div>
            )}
          </motion.div>

          <div className="panel p-4">
            <div className="mb-2 flex items-center justify-between">
              <span className="eyebrow">Threat propagation risk</span>
              <Badge tone={risk > 70 ? 'threat' : risk > 40 ? 'warn' : 'ok'}>
                {risk > 70 ? 'High' : risk > 40 ? 'Elevated' : 'Low'}
              </Badge>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-ink-700">
              <motion.div
                className="h-full rounded-full"
                style={{ background: risk > 70 ? 'var(--color-threat)' : risk > 40 ? 'var(--color-warn)' : 'var(--color-ok)' }}
                animate={{ width: `${risk}%` }}
                transition={{ type: 'spring', stiffness: 120, damping: 20 }}
              />
            </div>
          </div>

          <div className="panel p-4">
            <span className="eyebrow">Impacted sectors (potential)</span>
            <div className="mt-3 grid grid-cols-3 gap-2">
              {[
                { icon: Droplet, label: t('sector.water'), on: active, color: 'text-signal' },
                { icon: Zap, label: t('sector.power'), on: active && world.phase === 'impacted', color: 'text-warn' },
                { icon: HeartPulse, label: t('sector.healthcare'), on: active && world.phase === 'impacted', color: 'text-ok' },
              ].map((s, i) => (
                <div
                  key={i}
                  className={`flex flex-col items-center gap-1.5 rounded-lg border p-2.5 ${s.on ? 'border-threat/30 bg-threat/[0.06]' : 'border-white/[0.05] bg-ink-800/40'}`}
                >
                  <s.icon size={18} className={s.on ? 'text-threat' : s.color} />
                  <span className="text-[10.5px] text-fog-300">{s.label}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="panel flex-1 p-4">
            <span className="eyebrow">Live feed</span>
            <div className="mt-3 space-y-2.5">
              {world.timeline.length === 0 && (
                <div className="text-[11px] text-fog-500">Run a scenario or the demo to populate the feed.</div>
              )}
              {world.timeline.slice(-7).reverse().map((e, i) => (
                <motion.div
                  key={`${e.at}-${e.kind}-${i}`}
                  initial={{ opacity: 0, x: 8 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="flex items-start gap-2.5 text-[11.5px]"
                >
                  <span className="num mt-0.5 shrink-0 text-fog-500">{fmtClock(e.at)}</span>
                  <StateDot state={feedState(e.kind)} />
                  <span className="text-fog-200">{pick(e.title, e.titleAr)}</span>
                </motion.div>
              ))}
            </div>
          </div>
          <SimDisclaimer />
        </div>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-4 gap-3">
        <Kpi label="Monitored sites" value="3 / 3" hint="Water · Power · Healthcare" trend="ok" />
        <Kpi label="Threats detected (sim)" value={String(world.detections.length || (active ? 1 : 0))} hint="this run" trend={active ? 'up' : 'flat'} />
        <Kpi
          label="Detection lead time"
          value={world.firstDetectionAt != null ? `${(scn.stages.find((s) => s.kind === 'impact')?.at ?? 0) - world.firstDetectionAt}s` : '—'}
          hint="before simulated impact"
          trend="down"
        />
        <Kpi label="Cross-sector alerts" value="2" hint="via STIX hub" trend="up" />
      </div>
    </div>
  )
}

function Kpi({ label, value, hint, trend }: { label: string; value: string; hint: string; trend: 'up' | 'down' | 'ok' | 'flat' }) {
  return (
    <div className="panel flex items-center justify-between p-4">
      <div>
        <div className="eyebrow mb-1">{label}</div>
        <div className="num text-2xl font-semibold tracking-tight text-fog-50">{value}</div>
        <div className="mt-0.5 text-[10.5px] text-fog-500">{hint}</div>
      </div>
      <div className={`rounded-lg p-1.5 ${trend === 'up' ? 'bg-threat/10 text-threat' : trend === 'down' ? 'bg-ok/10 text-ok' : 'bg-signal/10 text-signal'}`}>
        {trend === 'up' ? <ArrowUpRight size={16} /> : trend === 'down' ? <ArrowDownRight size={16} /> : <Activity size={16} />}
      </div>
    </div>
  )
}

function feedState(kind: string) {
  switch (kind) {
    case 'detection': return 'watch' as const
    case 'impact': return 'compromised' as const
    case 'containment': return 'contained' as const
    case 'prediction': return 'alert' as const
    default: return 'nominal' as const
  }
}
