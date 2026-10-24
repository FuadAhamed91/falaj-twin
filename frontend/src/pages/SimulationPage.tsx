import { Droplet, Zap, HeartPulse, Swords } from 'lucide-react'
import { PlantSchematic } from '../twin/PlantSchematic'
import { RunControls, ModeToggle, PhaseBadge, DetectionsPanel } from '../twin/panels'
import { ComparePanel } from '../twin/ComparePanel'
import { Badge, SimDisclaimer } from '../components/ui'
import { useSim, useWorld, type FacilityId } from '../store/simStore'
import { useT, usePick } from '../i18n/useLang'
import { getScenario, getTopology } from '../sim'
import facilities from '@shared/facilities.json'

const SECTOR_ICON = { water: Droplet, power: Zap, healthcare: HeartPulse } as const

export function SimulationPage() {
  const t = useT()
  const pick = usePick()
  const facilityId = useSim((s) => s.facilityId)
  const selectFacility = useSim((s) => s.selectFacility)
  const selectedId = useSim((s) => s.selectedNodeId)
  const selectNode = useSim((s) => s.selectNode)
  const world = useWorld()
  const topo = getTopology(facilityId)
  const scn = getScenario(facilityId)

  return (
    <div className="grid h-full grid-cols-[1fr_360px] gap-3 overflow-hidden p-4">
      <div className="flex min-h-0 flex-col gap-3 overflow-y-auto">
        {/* Scenario header */}
        <div className="panel p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <Swords size={16} className="text-threat" />
                <span className="eyebrow">Scenario {scn.code}</span>
                <Badge tone="warn">{t('badge.simAttack')}</Badge>
              </div>
              <h2 className="mt-1.5 text-base font-semibold text-fog-50">{pick(scn.name, scn.nameAr)}</h2>
              <p className="mt-1 max-w-2xl text-[12px] text-fog-400">{pick(scn.summary, scn.summaryAr)}</p>
            </div>
            <PhaseBadge world={world} />
          </div>
          {/* facility picker */}
          <div className="mt-3 flex gap-1.5">
            {facilities.facilities.map((f) => {
              const Icon = SECTOR_ICON[f.sector as 'water']
              const active = f.id === facilityId
              return (
                <button key={f.id} onClick={() => selectFacility(f.id as FacilityId)}
                  className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[11px] font-medium ${active ? 'border-signal/30 bg-signal/10 text-signal' : 'border-white/[0.06] bg-ink-850 text-fog-400 hover:text-fog-200'}`}>
                  <Icon size={13} /> {pick(f.displayName, f.displayNameAr)}
                </button>
              )
            })}
          </div>
        </div>

        {/* Live schematic */}
        <div className="relative min-h-[320px] flex-1 overflow-hidden rounded-[var(--radius-panel)] border border-white/[0.06]">
          <PlantSchematic topo={topo} scenario={scn} world={world} selectedId={selectedId} onSelect={selectNode} />
        </div>

        {/* Controls */}
        <div className="flex items-center gap-3">
          <RunControls />
          <ModeToggle />
        </div>

        {/* Before / after */}
        <div>
          <div className="eyebrow mb-2">{t('cmp.title')}</div>
          <ComparePanel />
        </div>
      </div>

      {/* Right: detections + disclaimer */}
      <div className="flex min-h-0 flex-col gap-3">
        <div className="min-h-0 flex-1"><DetectionsPanel /></div>
        <SimDisclaimer full />
      </div>
    </div>
  )
}
