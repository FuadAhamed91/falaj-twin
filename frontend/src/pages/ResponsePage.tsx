import { PlantSchematic } from '../twin/PlantSchematic'
import { RunControls, ModeToggle, PredictionPanel, PhaseBadge } from '../twin/panels'
import { AssistantPanel } from '../assistant/AssistantPanel'
import { Badge } from '../components/ui'
import { useSim, useWorld } from '../store/simStore'
import { useT, usePick } from '../i18n/useLang'
import { getScenario, getTopology } from '../sim'

export function ResponsePage() {
  const t = useT()
  const pick = usePick()
  const facilityId = useSim((s) => s.facilityId)
  const selectedId = useSim((s) => s.selectedNodeId)
  const selectNode = useSim((s) => s.selectNode)
  const world = useWorld()
  const topo = getTopology(facilityId)
  const scn = getScenario(facilityId)

  return (
    <div className="grid h-full grid-cols-[1fr_340px_320px] gap-3 overflow-hidden p-4">
      {/* Viewer + controls */}
      <div className="flex min-h-0 flex-col gap-3">
        <div className="relative min-h-0 flex-1 overflow-hidden rounded-[var(--radius-panel)] border border-hair">
          <PlantSchematic topo={topo} scenario={scn} world={world} selectedId={selectedId} onSelect={selectNode} />
          <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between p-4">
            <div>
              <div className="text-sm font-semibold text-fog-50">{pick(scn.name, scn.nameAr)}</div>
              <div className="mt-1 flex gap-1.5"><Badge tone="warn">{t('badge.simAttack')}</Badge><Badge tone="neutral">{t('badge.demoEnv')}</Badge></div>
            </div>
            <PhaseBadge world={world} />
          </div>
        </div>
        <div className="flex items-center gap-3"><RunControls /><ModeToggle /></div>
      </div>

      {/* Prediction + approval */}
      <div className="min-h-0 overflow-y-auto"><PredictionPanel /></div>

      {/* Assistant */}
      <AssistantPanel className="min-h-0" />
    </div>
  )
}
