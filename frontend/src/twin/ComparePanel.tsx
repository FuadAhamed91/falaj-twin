import { useMemo } from 'react'
import { ShieldX, ShieldCheck, Clock, Boxes, Activity } from 'lucide-react'
import { summariseRun, getScenario, getTopology, getContainments, type RunOutcome } from '../sim'
import { useSim } from '../store/simStore'
import { useT, usePick } from '../i18n/useLang'

/** Computes baseline vs defended(approved) outcomes for the current facility. */
export function useComparison(): { baseline: RunOutcome; defended: RunOutcome } {
  const facilityId = useSim((s) => s.facilityId)
  return useMemo(() => {
    const scn = getScenario(facilityId)
    const topo = getTopology(facilityId)
    const baseline = summariseRun(scn, topo, 'baseline')
    const rec = getContainments(facilityId)[0]
    const impactStage = scn.stages.find((s) => s.kind === 'impact')
    const approveAt = impactStage ? Math.max(0, impactStage.at - 6) : 18
    const defended = summariseRun(scn, topo, 'defended', rec ? { action: rec, approvedAt: approveAt } : undefined)
    return { baseline, defended }
  }, [facilityId])
}

export function ComparePanel() {
  const t = useT()
  const pick = usePick()
  const facilityId = useSim((s) => s.facilityId)
  const { baseline, defended } = useComparison()
  const topo = getTopology(facilityId)
  const isWater = facilityId === 'taweelah'

  return (
    <div className="grid grid-cols-2 gap-3">
      <OutcomeCard
        title={t('cmp.without')} tone="threat" icon={ShieldX}
        headline={isWater ? t('cmp.supplyLost') : (defended.impacted ? 'Impact reached' : 'Impact reached')}
        outcome={baseline} total={topo.nodes.length}
        verdict={pick('Attack ran to completion — simulated service impact.', 'اكتمل الهجوم — أثر محاكى على الخدمة.')}
      />
      <OutcomeCard
        title={t('cmp.with')} tone="ok" icon={ShieldCheck}
        headline={t('cmp.blocked')}
        outcome={defended} total={topo.nodes.length}
        verdict={pick('Early warning + approved action contained the attack.', 'الإنذار المبكر والإجراء المعتمد احتويا الهجوم.')}
      />
    </div>
  )
}

function OutcomeCard({
  title, tone, icon: Icon, headline, outcome, total, verdict,
}: {
  title: string; tone: 'threat' | 'ok'; icon: typeof ShieldX; headline: string; outcome: RunOutcome; total: number; verdict: string
}) {
  const t = useT()
  const pick = usePick()
  const accent = tone === 'threat' ? 'var(--color-threat)' : 'var(--color-ok)'
  return (
    <div className="rounded-[var(--radius-panel)] border p-4" style={{ borderColor: `${accent}40`, background: `color-mix(in oklab, ${accent} 6%, transparent)` }}>
      <div className="flex items-center gap-2">
        <Icon size={16} style={{ color: accent }} />
        <span className="text-[12px] font-semibold" style={{ color: accent }}>{title}</span>
      </div>
      <div className="mt-2 text-base font-semibold text-fog-50">{headline}</div>
      <div className="mt-3 space-y-2">
        <Metric icon={Clock} label={t('panel.leadTime')}
          value={outcome.detectionLeadSec != null ? `${outcome.detectionLeadSec}s` : '—'}
          hint={outcome.detectionLeadSec != null ? pick('before impact', 'قبل الأثر') : pick('no detection', 'لا اكتشاف')} />
        <Metric icon={Boxes} label={t('panel.affected')} value={`${outcome.affectedAssets} / ${total}`} />
        <Metric icon={Activity} label={pick('Outcome', 'النتيجة')}
          value={outcome.contained ? pick('Contained', 'محتوى') : outcome.impacted ? pick('Impacted', 'متأثر') : pick('Complete', 'مكتمل')} />
        {outcome.finalMetrics.map((m) => (
          <Metric key={m.key} icon={Activity} label={pick(m.label, m.labelAr)} value={`${m.value}${m.unit ?? ''}`}
            valueColor={m.value <= 0 ? 'var(--color-threat)' : m.value < 50 ? 'var(--color-warn)' : 'var(--color-ok)'} />
        ))}
      </div>
      <p className="mt-3 text-[10.5px] text-fog-400">{verdict}</p>
    </div>
  )
}

function Metric({ icon: Icon, label, value, hint, valueColor }: { icon: typeof Clock; label: string; value: string; hint?: string; valueColor?: string }) {
  return (
    <div className="flex items-center justify-between gap-2 rounded-lg bg-ink-900/40 px-3 py-2">
      <span className="flex items-center gap-1.5 text-[11px] text-fog-400"><Icon size={12} /> {label}</span>
      <span className="num text-sm font-semibold" style={{ color: valueColor ?? 'var(--color-fog-50)' }}>
        {value} {hint && <span className="text-[10px] font-normal text-fog-500">{hint}</span>}
      </span>
    </div>
  )
}
