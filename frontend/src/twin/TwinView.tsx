import { memo } from 'react'
import { GLBoundary } from '../three/webgl'
import { PlantSchematic } from './PlantSchematic'
import { TwinCanvas } from '../twin3d/TwinCanvas'
import { useDiscreteWorld, useSim } from '../store/simStore'
import { getScenario, getTopology } from '../sim'

/** Physical twin: realistic WebGL scene, or the 2D schematic when WebGL is unavailable. */
export const TwinView = memo(function TwinView() {
  const facilityId = useSim((s) => s.facilityId)
  const selectedId = useSim((s) => s.selectedNodeId)
  const select = useSim((s) => s.selectNode)
  const world = useDiscreteWorld()
  const fallback = (
    <PlantSchematic topo={getTopology(facilityId)} scenario={getScenario(facilityId)} world={world}
      selectedId={selectedId} onSelect={select} />
  )
  return (
    <GLBoundary fallback={fallback}>
      <TwinCanvas />
    </GLBoundary>
  )
})
