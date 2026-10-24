import { useMemo } from 'react'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, RadialBarChart, RadialBar, PolarAngleAxis, BarChart, Bar, Cell } from 'recharts'
import { Droplet, Zap, HeartPulse, Activity, ShieldAlert, HeartPulse as Heart } from 'lucide-react'
import { ComparePanel } from '../twin/ComparePanel'
import { Badge, SimDisclaimer } from '../components/ui'
import { useSim, useWorld } from '../store/simStore'
import { useT, usePick } from '../i18n/useLang'
import { getScenario, detectScenario } from '../sim'
import { COLORS } from '../lib/theme'
import { fmtClock } from '../lib/clock'

export function AnalyticsPage() {
  const t = useT()
  const pick = usePick()
  const facilityId = useSim((s) => s.facilityId)
  const world = useWorld()
  const scn = getScenario(facilityId)

  // Threat-activity series: cumulative detections across scenario seconds.
  const series = useMemo(() => {
    const dets = detectScenario(scn)
    const pts: { tsec: number; label: string; activity: number; stages: number }[] = []
    for (let s = 0; s <= scn.durationSec; s += 2) {
      const activity = dets.filter((d) => d.at <= s).length
      const stages = scn.stages.filter((st) => st.at <= s).length
      pts.push({ tsec: s, label: fmtClock(s), activity, stages })
    }
    return pts
  }, [scn])

  const affected = Object.values(world.nodeStates).filter((s) => s !== 'nominal').length
  const total = Object.values(world.nodeStates).length
  const health = Math.round(((total - affected) / total) * 100)

  const topThreats = [
    { name: 'Remote access (T0883)', value: 48, color: COLORS.threat },
    { name: 'Manipulation of control (T0831)', value: 22, color: COLORS.warn },
    { name: 'Spearphishing (T0865)', value: 17, color: COLORS.predict },
    { name: 'Lateral tool transfer (T0867)', value: 9, color: COLORS.signal },
  ]

  const incidents = [
    { site: 'Taweelah Desalination', sector: 'water', time: '10:24', sev: 'critical' },
    { site: 'DEWA Nad Hessa', sector: 'power', time: '08:17', sev: 'medium' },
    { site: 'Cleveland Clinic AD', sector: 'healthcare', time: '06:32', sev: 'low' },
    { site: 'Multiple sectors (STIX)', sector: 'water', time: '02:11', sev: 'medium' },
  ] as const
  const sectorIcon = { water: Droplet, power: Zap, healthcare: HeartPulse }

  return (
    <div className="h-full overflow-y-auto p-4">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-fog-50">{t('nav.analytics')}</h2>
          <p className="mt-1 text-[12px] text-fog-400">{pick('Derived from the current simulation run and scenario model.', 'مشتقة من تشغيل المحاكاة الحالي ونموذج السيناريو.')}</p>
        </div>
        <Badge tone="warn">{t('badge.synthetic')}</Badge>
      </div>

      <div className="grid grid-cols-12 gap-4">
        {/* Threat activity */}
        <div className="panel col-span-12 p-4 lg:col-span-8">
          <div className="mb-3 flex items-center justify-between">
            <span className="eyebrow flex items-center gap-2"><Activity size={13} /> Threat activity (scenario)</span>
            <span className="text-[11px] text-fog-500">{scn.code} · {pick(scn.name, scn.nameAr)}</span>
          </div>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={series} margin={{ left: -24, right: 6, top: 6 }}>
                <defs>
                  <linearGradient id="actGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={COLORS.signal} stopOpacity={0.5} />
                    <stop offset="100%" stopColor={COLORS.signal} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="label" tick={{ fill: COLORS.fog400, fontSize: 10 }} stroke="#1b304f" />
                <YAxis tick={{ fill: COLORS.fog400, fontSize: 10 }} stroke="#1b304f" allowDecimals={false} />
                <Tooltip contentStyle={{ background: COLORS.ink850, border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, fontSize: 11 }} labelStyle={{ color: COLORS.fog300 }} />
                <Area type="monotone" dataKey="activity" name="Detections" stroke={COLORS.signal} strokeWidth={2} fill="url(#actGrad)" />
                <Area type="stepAfter" dataKey="stages" name="Attack stages" stroke={COLORS.threat} strokeWidth={1.5} fill="transparent" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* System health */}
        <div className="panel col-span-12 flex flex-col items-center justify-center p-4 lg:col-span-4">
          <span className="eyebrow mb-2 flex items-center gap-2 self-start"><Heart size={13} /> System health</span>
          <div className="relative h-44 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <RadialBarChart innerRadius="72%" outerRadius="100%" data={[{ v: health, fill: health > 70 ? COLORS.ok : health > 40 ? COLORS.warn : COLORS.threat }]} startAngle={90} endAngle={-270}>
                <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
                <RadialBar dataKey="v" cornerRadius={8} background={{ fill: '#13243e' }} />
              </RadialBarChart>
            </ResponsiveContainer>
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <span className="num text-3xl font-semibold text-fog-50">{health}%</span>
              <span className="text-[10px] text-fog-400">operational</span>
            </div>
          </div>
        </div>

        {/* Top threats */}
        <div className="panel col-span-12 p-4 lg:col-span-7">
          <span className="eyebrow mb-3 flex items-center gap-2"><ShieldAlert size={13} /> Top threat techniques</span>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topThreats} layout="vertical" margin={{ left: 10, right: 16 }}>
                <XAxis type="number" hide />
                <YAxis type="category" dataKey="name" width={170} tick={{ fill: COLORS.fog300, fontSize: 10 }} stroke="transparent" />
                <Tooltip cursor={{ fill: 'rgba(255,255,255,0.03)' }} contentStyle={{ background: COLORS.ink850, border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, fontSize: 11 }} />
                <Bar dataKey="value" radius={[0, 6, 6, 0]} barSize={16}>
                  {topThreats.map((e, i) => <Cell key={i} fill={e.color} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Recent incidents */}
        <div className="panel col-span-12 p-4 lg:col-span-5">
          <span className="eyebrow mb-3 block">Recent incidents (simulated)</span>
          <div className="space-y-2">
            {incidents.map((inc, i) => {
              const Icon = sectorIcon[inc.sector]
              return (
                <div key={i} className="flex items-center gap-3 rounded-lg border border-white/[0.06] bg-ink-800/40 px-3 py-2">
                  <Icon size={15} className="text-fog-300" />
                  <span className="flex-1 text-[12px] text-fog-100">{inc.site}</span>
                  <span className="num text-[11px] text-fog-500">{inc.time}</span>
                  <Badge tone={inc.sev === 'critical' ? 'threat' : inc.sev === 'medium' ? 'warn' : 'ok'}>{inc.sev}</Badge>
                </div>
              )
            })}
          </div>
        </div>

        {/* Before/after */}
        <div className="col-span-12">
          <div className="eyebrow mb-2">{t('cmp.title')}</div>
          <ComparePanel />
        </div>
      </div>

      <div className="mt-4"><SimDisclaimer /></div>
    </div>
  )
}
