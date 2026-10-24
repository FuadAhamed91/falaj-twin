import { useNavigate } from 'react-router-dom'
import { Droplet, Zap, HeartPulse, MapPin, ExternalLink, Box, ShieldHalf } from 'lucide-react'
import { Badge, SimDisclaimer } from '../components/ui'
import { useSim, type FacilityId } from '../store/simStore'
import { useT, usePick } from '../i18n/useLang'
import { SECTOR_COLOR } from '../lib/theme'
import facilities from '@shared/facilities.json'
import type { Sector } from '../sim'

const SECTOR_ICON = { water: Droplet, power: Zap, healthcare: HeartPulse } as const

export function FacilitiesPage() {
  const t = useT()
  const pick = usePick()
  const nav = useNavigate()
  const selectFacility = useSim((s) => s.selectFacility)

  const open = (id: string) => {
    selectFacility(id as FacilityId)
    nav('/twin')
  }

  return (
    <div className="h-full overflow-y-auto p-4">
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-fog-50">{t('nav.facilities')}</h2>
        <p className="mt-1 max-w-3xl text-[12.5px] text-fog-400">
          {pick(
            'Three real UAE facilities, placed at verified public coordinates. Exteriors are an illustrative reconstruction from public imagery; all cyber assets are synthetic.',
            'ثلاث منشآت إماراتية حقيقية بمواقع عامة موثّقة. الواجهات إعادة بناء توضيحية من صور عامة؛ وجميع الأصول السيبرانية اصطناعية.',
          )}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {facilities.facilities.map((f) => {
          const Icon = SECTOR_ICON[f.sector as Sector]
          const color = SECTOR_COLOR[f.sector as Sector]
          return (
            <div key={f.id} className="panel flex flex-col overflow-hidden p-0">
              <div className="flex items-start justify-between p-4 pb-3" style={{ background: `linear-gradient(135deg, ${color}14, transparent)` }}>
                <div className="flex items-center gap-2.5">
                  <span className="grid h-10 w-10 place-items-center rounded-xl" style={{ background: `${color}1f`, color }}><Icon size={20} /></span>
                  <div>
                    <div className="text-sm font-semibold text-fog-50">{pick(f.displayName, f.displayNameAr)}</div>
                    <div className="text-[11px] text-fog-400">{pick(f.locality, f.localityAr)} · {pick(f.emirate, f.emirateAr)}</div>
                  </div>
                </div>
                {f.hero && <Badge tone="signal">Hero</Badge>}
              </div>

              <div className="flex flex-1 flex-col gap-3 p-4 pt-1">
                <div className="flex flex-wrap gap-1.5">
                  <Badge tone="signal">{t(`sector.${f.sector}` as 'sector.water')}</Badge>
                  <Badge tone="neutral">{t('badge.realLocation')}</Badge>
                  <Badge tone="warn">{t('badge.referenceArch')}</Badge>
                </div>

                <div className="rounded-lg border border-white/[0.06] bg-ink-800/40 p-3 text-[11px]">
                  <div className="flex items-center gap-1.5 text-fog-300"><MapPin size={12} /> <span className="num">{f.coordinates.lat.toFixed(4)}, {f.coordinates.lon.toFixed(4)}</span></div>
                  <div className="mt-1 text-[10px] text-fog-500">{f.coordinatePrecision}</div>
                </div>

                <ul className="space-y-1.5 text-[11.5px] text-fog-400">
                  {f.publicFacts.slice(0, 3).map((fact, i) => (
                    <li key={i} className="flex gap-2"><span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-fog-600" />{fact}</li>
                  ))}
                </ul>

                <div className="mt-auto flex items-center gap-2 pt-2">
                  <button onClick={() => open(f.id)} className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-signal/15 px-3 py-2 text-xs font-semibold text-signal ring-1 ring-inset ring-signal/25 hover:bg-signal/20">
                    <Box size={14} /> {t('nav.twin')}
                  </button>
                  <a href={f.officialUrl} target="_blank" rel="noreferrer" className="flex items-center justify-center gap-1.5 rounded-lg border border-white/10 px-3 py-2 text-xs text-fog-300 hover:text-fog-100">
                    <ExternalLink size={13} /> Source
                  </a>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* SOC note */}
      <div className="mt-4 flex items-start gap-3 rounded-[var(--radius-panel)] border border-signal/20 bg-signal/[0.05] p-4">
        <ShieldHalf size={18} className="mt-0.5 text-signal" />
        <div>
          <div className="text-sm font-semibold text-fog-50">{facilities.soc.displayName} — {facilities.soc.role}</div>
          <p className="mt-1 text-[12px] text-fog-400">{facilities.soc.note}</p>
          <div className="mt-2"><Badge tone="signal">{t('badge.conceptual')}</Badge></div>
        </div>
      </div>

      <div className="mt-4"><SimDisclaimer full /></div>
    </div>
  )
}
