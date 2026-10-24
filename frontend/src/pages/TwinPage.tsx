import { useState } from 'react'
import { Droplet, Zap, HeartPulse, Box, Network, Layers } from 'lucide-react'
import { TwinView } from '../twin/TwinView'
import { PlantSchematic } from '../twin/PlantSchematic'
import { RunControls, ModeToggle, AssetPanel, TimelinePanel, PhaseBadge } from '../twin/panels'
import { Segmented, Badge, SimDisclaimer } from '../components/ui'
import { useSim, useWorld, type FacilityId } from '../store/simStore'
import { useT, usePick } from '../i18n/useLang'
import { getScenario, getTopology } from '../sim'
import facilities from '@shared/facilities.json'

const SECTOR_ICON = { water: Droplet, power: Zap, healthcare: HeartPulse } as const

export function TwinPage() {
  const t = useT()
  const pick = usePick()
  const facilityId = useSim((s) => s.facilityId)
  const selectFacility = useSim((s) => s.selectFacility)
  const selectedId = useSim((s) => s.selectedNodeId)
  const selectNode = useSim((s) => s.selectNode)
  const world = useWorld()
  const [view, setView] = useState<'physical' | 'cyber'>('physical')
  const [zones, setZones] = useState(true)

  const topo = getTopology(facilityId)
  const scn = getScenario(facilityId)
  const fac = facilities.facilities.find((f) => f.id === facilityId)!

  return (
    <div className="grid h-full grid-cols-[1fr_340px] gap-3 p-4">
      {/* Left: viewer + controls */}
      <div className="flex min-w-0 flex-col gap-3">
        {/* Facility tabs */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex gap-1.5">
            {facilities.facilities.map((f) => {
              const Icon = SECTOR_ICON[f.sector as 'water']
              const activeTab = f.id === facilityId
              return (
                <button key={f.id} onClick={() => selectFacility(f.id as FacilityId)}
                  className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-medium transition-colors ${activeTab ? 'border-signal/30 bg-signal/10 text-signal' : 'border-hair bg-ink-850 text-fog-400 hover:text-fog-200'}`}>
                  <Icon size={14} /> {pick(f.displayName, f.displayNameAr)}
                  {f.hero && <Badge tone="signal" className="ms-1">Hero</Badge>}
                </button>
              )
            })}
          </div>
          <div className="flex items-center gap-2">
            <Segmented size="sm" value={view} onChange={setView}
              options={[
                { value: 'physical', label: <span className="flex items-center gap-1"><Box size={12} /> {t('twin.view.physical')}</span> },
                { value: 'cyber', label: <span className="flex items-center gap-1"><Network size={12} /> {t('twin.view.cyber')}</span> },
              ]} />
          </div>
        </div>

        {/* Viewer */}
        <div className="relative min-h-0 flex-1 overflow-hidden rounded-[var(--radius-panel)] border border-hair bg-ink-900">
          {view === 'physical' ? (
            <TwinView />
          ) : (
            <PlantSchematic topo={topo} scenario={scn} world={world} selectedId={selectedId} onSelect={selectNode} showZones={zones} />
          )}
          {/* overlay header */}
          <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between p-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-fog-50">{pick(fac.displayName, fac.displayNameAr)}</span>
                <Badge tone="signal">{t('badge.realLocation')}</Badge>
              </div>
              <div className="mt-1 text-[11px] text-fog-400">{pick(fac.locality, fac.localityAr)} · {pick(fac.emirate, fac.emirateAr)}</div>
              <div className="mt-2 flex gap-1.5">
                <Badge tone="warn">{view === 'physical' ? t('badge.referenceArch') : t('badge.synthetic')}</Badge>
                <Badge tone="neutral">{t('badge.demoEnv')}</Badge>
              </div>
            </div>
            <PhaseBadge world={world} />
          </div>
          {view === 'cyber' && (
            <button onClick={() => setZones((z) => !z)}
              className="pointer-events-auto absolute right-4 top-20 inline-flex items-center gap-1.5 rounded-lg border border-hair-strong bg-ink-850/90 px-2.5 py-1.5 text-[11px] text-fog-300 hover:text-fog-100">
              <Layers size={12} /> {t('twin.zones')}
            </button>
          )}
          {/* metrics strip */}
          {world.metrics.length > 0 && (
            <div className="pointer-events-none absolute bottom-4 left-4 flex gap-2">
              {world.metrics.map((m) => (
                <div key={m.key} className="rounded-lg border border-hair-strong bg-ink-900/85 px-3 py-2 backdrop-blur">
                  <div className="text-[9px] uppercase tracking-wide text-fog-500">{pick(m.label, m.labelAr)}</div>
                  <div className="num text-lg font-semibold" style={{ color: m.value <= 0 ? 'var(--color-threat)' : m.value < 50 ? 'var(--color-warn)' : 'var(--color-ok)' }}>
                    {m.value}{m.unit}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="flex items-center gap-3">
          <RunControls />
          <ModeToggle />
        </div>
      </div>

      {/* Right rail */}
      <div className="flex min-h-0 flex-col gap-3">
        <AssetPanel />
        <div className="min-h-0 flex-1"><TimelinePanel /></div>
        <SimDisclaimer />
      </div>
    </div>
  )
}
