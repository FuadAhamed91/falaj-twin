import { Component, Suspense, useMemo, type ReactNode } from 'react'
import { useGLTF } from '@react-three/drei'
import { FacilityScene } from './Plant3D'
import type { FacilityTopology } from '../sim'

// Blender-authored GLBs live in /public/models. BASE_URL keeps paths correct
// in dev ("/") and in a sub-path build ("./" or "/repo/").
const MODEL_URL: Record<string, string> = {
  taweelah: `${import.meta.env.BASE_URL}models/taweelah.glb`,
  'cleveland-clinic': `${import.meta.env.BASE_URL}models/cleveland-clinic.glb`,
  'dewa-nad-hessa': `${import.meta.env.BASE_URL}models/dewa-nad-hessa.glb`,
}

function GLBModel({ url }: { url: string }) {
  const { scene } = useGLTF(url)
  const cloned = useMemo(() => scene.clone(true), [scene])
  return <primitive object={cloned} />
}

/** Falls back to the procedural scene if the GLB fails to load. */
class ModelBoundary extends Component<{ fallback: ReactNode; children: ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children
  }
}

/**
 * Physical facility model: Blender GLB when available, procedural otherwise.
 * The procedural scene is both the Suspense fallback (while loading) and the
 * error fallback (if the asset is missing).
 */
export function FacilityModel({ topo }: { topo: FacilityTopology }) {
  const url = MODEL_URL[topo.facilityId]
  const procedural = <FacilityScene topo={topo} />
  if (!url) return procedural
  return (
    <ModelBoundary fallback={procedural}>
      <Suspense fallback={procedural}>
        <GLBModel url={url} />
      </Suspense>
    </ModelBoundary>
  )
}

// Best-effort preload (ignored if unavailable).
Object.values(MODEL_URL).forEach((u) => {
  try {
    useGLTF.preload(u)
  } catch {
    /* noop */
  }
})
