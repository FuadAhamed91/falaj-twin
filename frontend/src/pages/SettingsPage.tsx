import { Languages, Database, Cpu, Share2, ExternalLink, FileText } from 'lucide-react'
import { Badge, SimDisclaimer, Segmented } from '../components/ui'
import { useLang, useT, usePick } from '../i18n/useLang'
import { RULES } from '../sim'
import facilities from '@shared/facilities.json'

export function SettingsPage() {
  const t = useT()
  const pick = usePick()
  const { lang, setLang } = useLang()

  return (
    <div className="h-full overflow-y-auto p-4">
      <h2 className="mb-4 text-lg font-semibold text-fog-50">{t('nav.settings')}</h2>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Language */}
        <div className="panel p-4">
          <div className="eyebrow mb-3 flex items-center gap-2"><Languages size={13} /> Language / اللغة</div>
          <Segmented value={lang} onChange={(l) => setLang(l)}
            options={[{ value: 'en', label: 'English' }, { value: 'ar', label: 'العربية (RTL)' }]} />
          <p className="mt-2 text-[11px] text-fog-500">{pick('Switches the whole interface and the incident assistant.', 'يبدّل الواجهة بالكامل ومساعد الحوادث.')}</p>
        </div>

        {/* Detection methodology */}
        <div className="panel p-4">
          <div className="eyebrow mb-3 flex items-center gap-2"><Cpu size={13} /> Detection methodology</div>
          <div className="space-y-1.5">
            {RULES.map((r) => (
              <div key={r.id} className="flex items-center justify-between gap-2 text-[11.5px]">
                <span className="text-fog-300">{pick(r.name, r.nameAr)}</span>
                <Badge tone="signal">{r.id}</Badge>
              </div>
            ))}
          </div>
          <p className="mt-2 text-[10.5px] text-fog-500">{pick('Deterministic rules are the reliable baseline. An optional Isolation-Forest model supplements them in the backend.', 'القواعد الحتمية هي الأساس الموثوق. ونموذج اختياري يكمّلها في الخادم.')}</p>
        </div>

        {/* Data provenance */}
        <div className="panel p-4 lg:col-span-2">
          <div className="eyebrow mb-3 flex items-center gap-2"><Database size={13} /> Data provenance</div>
          <div className="grid gap-2 md:grid-cols-3">
            {facilities.facilities.map((f) => (
              <div key={f.id} className="rounded-lg border border-hair bg-ink-800/40 p-3">
                <div className="text-[12px] font-semibold text-fog-100">{pick(f.displayName, f.displayNameAr)}</div>
                <div className="num mt-1 text-[10.5px] text-fog-400">{f.coordinates.lat.toFixed(4)}, {f.coordinates.lon.toFixed(4)}</div>
                <div className="mt-0.5 text-[9.5px] text-fog-500">{f.coordinatePrecision}</div>
                <a href={f.officialUrl} target="_blank" rel="noreferrer" className="mt-1.5 inline-flex items-center gap-1 text-[10.5px] text-signal hover:underline">
                  <ExternalLink size={10} /> Official source
                </a>
              </div>
            ))}
          </div>
          <div className="mt-3 flex flex-wrap gap-2 text-[10.5px] text-fog-500">
            <Badge tone="neutral">Natural Earth 1:10m (public domain) — map geometry</Badge>
            <Badge tone="neutral">OpenStreetMap / Wikidata — coordinate cross-check</Badge>
            <Badge tone="neutral">MITRE ATT&CK for ICS — technique references</Badge>
            <Badge tone="neutral">STIX 2.1 — indicator format</Badge>
          </div>
        </div>

        {/* Standards */}
        <div className="panel p-4">
          <div className="eyebrow mb-3 flex items-center gap-2"><Share2 size={13} /> Sharing & standards</div>
          <ul className="space-y-1.5 text-[11.5px] text-fog-300">
            <li className="flex gap-2"><span className="mt-1.5 h-1 w-1 rounded-full bg-fog-600" /> STIX 2.1 indicator bundles (validated with python <code className="text-signal">stix2</code> in the backend)</li>
            <li className="flex gap-2"><span className="mt-1.5 h-1 w-1 rounded-full bg-fog-600" /> Independent per-site inventory matching</li>
            <li className="flex gap-2"><span className="mt-1.5 h-1 w-1 rounded-full bg-fog-600" /> MITRE ATT&CK for ICS playbook references</li>
          </ul>
        </div>

        {/* Ethics / scope */}
        <div className="panel p-4">
          <div className="eyebrow mb-3 flex items-center gap-2"><FileText size={13} /> Scope & ethics</div>
          <SimDisclaimer full />
        </div>
      </div>
    </div>
  )
}
