import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { Droplet, Zap, HeartPulse, ShieldHalf, ArrowRight, Fingerprint, Hash, Bug, Share2, CheckCircle2, AlertCircle, HelpCircle, XCircle } from 'lucide-react'
import { Badge, SimDisclaimer } from '../components/ui'
import { buildBundle, matchSites, INDICATOR, type MatchResult } from '../stix/stix'
import { useT, usePick } from '../i18n/useLang'
import facilities from '@shared/facilities.json'

const SECTOR_ICON = { water: Droplet, power: Zap, healthcare: HeartPulse } as const
const RESULT_META: Record<MatchResult, { tone: 'ok' | 'threat' | 'warn' | 'neutral'; icon: typeof CheckCircle2; key: 'stix.match' | 'stix.exposure' | 'stix.nomatch' | 'stix.investigate' }> = {
  match: { tone: 'threat', icon: AlertCircle, key: 'stix.match' },
  exposure: { tone: 'warn', icon: HelpCircle, key: 'stix.exposure' },
  nomatch: { tone: 'ok', icon: CheckCircle2, key: 'stix.nomatch' },
  investigate: { tone: 'neutral', icon: XCircle, key: 'stix.investigate' },
}

export function ThreatsPage() {
  const t = useT()
  const pick = usePick()
  const [shared, setShared] = useState(false)
  const bundle = useMemo(() => buildBundle(), [])
  const matches = useMemo(() => matchSites('taweelah'), [])
  const facById = (id: string) => facilities.facilities.find((f) => f.id === id)!

  return (
    <div className="grid h-full grid-rows-[auto_1fr] gap-4 overflow-y-auto p-4">
      <div>
        <h2 className="text-lg font-semibold text-fog-50">{t('stix.title')}</h2>
        <p className="mt-1 max-w-3xl text-[12.5px] text-fog-400">
          {pick(
            'One synthetic indicator, detected at the water plant, is shared in STIX 2.1 to the simulated National SOC and matched independently against each sector’s inventory.',
            'يُشارَك مؤشر اصطناعي واحد، اكتُشف في محطة المياه، بصيغة STIX 2.1 مع المركز الوطني المحاكى، ويُطابَق بشكل مستقل مع مخزون كل قطاع.',
          )}
        </p>
      </div>

      <div className="grid min-h-0 grid-cols-[1fr_380px] gap-4">
        {/* Flow */}
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-[260px_auto_1fr] items-center gap-4">
            {/* Indicator */}
            <div className="rounded-[var(--radius-panel)] border border-threat/30 bg-threat/[0.06] p-4">
              <div className="mb-2 flex items-center gap-2">
                <Fingerprint size={15} className="text-threat" />
                <span className="eyebrow text-threat">{t('stix.indicator')}</span>
              </div>
              <Row icon={Fingerprint} label="Attacker IP" value={INDICATOR.attackerIp} />
              <Row icon={Hash} label="Malware SHA-256" value={INDICATOR.malwareSha256.slice(0, 20) + '…'} />
              <Row icon={Bug} label="Weakness" value={INDICATOR.exploitedWeakness} />
              <div className="mt-2"><Badge tone="neutral">STIX 2.1</Badge> <Badge tone="warn">{t('badge.synthetic')}</Badge></div>
            </div>

            <ArrowRight className="mx-auto text-fog-600" />

            {/* SOC + sites */}
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between rounded-[var(--radius-panel)] border border-signal/30 bg-signal/[0.07] p-3">
                <div className="flex items-center gap-2">
                  <ShieldHalf size={16} className="text-signal" />
                  <div>
                    <div className="text-sm font-semibold text-fog-50">National SOC</div>
                    <div className="text-[10px] text-fog-400">{t('badge.conceptual')}</div>
                  </div>
                </div>
                <button onClick={() => setShared(true)}
                  className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition-colors ${shared ? 'bg-ok/15 text-ok ring-1 ring-inset ring-ok/30' : 'bg-signal/15 text-signal ring-1 ring-inset ring-signal/30 hover:bg-signal/20'}`}>
                  {shared ? <><CheckCircle2 size={14} /> Shared</> : <><Share2 size={14} /> {t('stix.share')}</>}
                </button>
              </div>

              <div className="grid grid-cols-3 gap-3">
                {matches.map((m, i) => {
                  const fac = facById(m.facilityId)
                  const meta = RESULT_META[m.result]
                  const Icon = SECTOR_ICON[fac.sector as 'water']
                  const RIcon = meta.icon
                  return (
                    <motion.div key={m.facilityId}
                      initial={false}
                      animate={shared ? { opacity: 1, y: 0 } : { opacity: 0.5, y: 0 }}
                      transition={{ delay: shared ? i * 0.15 : 0 }}
                      className="rounded-[var(--radius-panel)] border border-white/[0.07] bg-ink-850 p-3">
                      <div className="flex items-center gap-2">
                        <Icon size={14} className="text-fog-300" />
                        <span className="text-[12px] font-semibold text-fog-50">{pick(fac.displayName, fac.displayNameAr)}</span>
                      </div>
                      <div className="mt-2.5">
                        {shared ? (
                          <Badge tone={meta.tone}><RIcon size={11} /> {t(meta.key)}</Badge>
                        ) : (
                          <span className="text-[10px] text-fog-600">awaiting share…</span>
                        )}
                      </div>
                      {shared && (
                        <div className="mt-2 text-[10.5px] leading-snug text-fog-400">{pick(m.reason, m.reasonAr)}</div>
                      )}
                    </motion.div>
                  )
                })}
              </div>
            </div>
          </div>

          {/* Recommendations */}
          {shared && (
            <div className="panel p-4">
              <div className="eyebrow mb-3">Site-specific recommendations</div>
              <div className="space-y-2.5">
                {matches.map((m) => {
                  const fac = facById(m.facilityId)
                  const meta = RESULT_META[m.result]
                  return (
                    <div key={m.facilityId} className="flex items-start gap-3 rounded-lg border border-white/[0.06] bg-ink-800/40 p-3">
                      <Badge tone={meta.tone}>{t(meta.key)}</Badge>
                      <div className="min-w-0">
                        <div className="text-[12px] font-medium text-fog-100">{pick(fac.displayName, fac.displayNameAr)}</div>
                        <div className="text-[11px] text-fog-400">{pick(m.recommendation, m.recommendationAr)}</div>
                      </div>
                    </div>
                  )
                })}
              </div>
              <p className="mt-3 text-[10.5px] italic text-fog-500">{t('stix.matchNote')}</p>
            </div>
          )}
        </div>

        {/* Bundle viewer */}
        <div className="flex min-h-0 flex-col gap-3">
          <div className="panel flex min-h-0 flex-1 flex-col p-0">
            <div className="flex items-center justify-between border-b border-white/[0.06] px-4 py-2.5">
              <span className="eyebrow">STIX 2.1 bundle</span>
              <Badge tone="signal">{bundle.objects.length} objects</Badge>
            </div>
            <pre className="min-h-0 flex-1 overflow-auto p-3 text-[10px] leading-relaxed text-fog-300">
              <code>{JSON.stringify(bundle, null, 2)}</code>
            </pre>
          </div>
          <SimDisclaimer />
        </div>
      </div>
    </div>
  )
}

function Row({ icon: Icon, label, value }: { icon: typeof Hash; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2 py-1 text-[11px]">
      <Icon size={12} className="shrink-0 text-fog-500" />
      <span className="text-fog-500">{label}:</span>
      <span className="num truncate text-fog-200">{value}</span>
    </div>
  )
}
