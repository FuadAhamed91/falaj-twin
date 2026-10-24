// Loads a Blender-authored facility GLB and turns it into a live twin:
// equipment registry (EQ_<nodeId>), anchor positions (ANCHOR_<nodeId>),
// shadows, and material fixes for the browser renderer.
import { useMemo } from 'react'
import * as THREE from 'three'
import { useGLTF } from '@react-three/drei'

export const DRACO_PATH = `${import.meta.env.BASE_URL}draco/`

export interface ModelRegistry {
  anchors: Record<string, THREE.Vector3>
  equipment: Record<string, THREE.Mesh[]>
  /** Basin / pond water materials, animated by the scene. */
  water: THREE.MeshStandardMaterial[]
  /** Materials that glow at dusk (lamps, lit windows). */
  emissive: THREE.MeshStandardMaterial[]
}

function eqAncestor(o: THREE.Object3D | null): string | null {
  while (o) {
    // GLTFLoader splits multi-material nodes into "<node>_1", "<node>_2"… children
    if (o.name.startsWith('EQ_')) return o.name.slice(3).replace(/_\d+$/, '')
    o = o.parent
  }
  return null
}

export function useFacilityModel(url: string) {
  const gltf = useGLTF(url, DRACO_PATH)

  return useMemo(() => {
    const root = gltf.scene.clone(true)
    const registry: ModelRegistry = { anchors: {}, equipment: {}, water: [], emissive: [] }
    const shared = new Map<THREE.Material, THREE.Material>()
    root.updateMatrixWorld(true)

    root.traverse((o) => {
      if (o.name.startsWith('ANCHOR_')) {
        registry.anchors[o.name.slice(7)] = o.getWorldPosition(new THREE.Vector3())
        return
      }
      const mesh = o as THREE.Mesh
      if (!mesh.isMesh) return
      const mat = mesh.material as THREE.MeshStandardMaterial
      const name = mat?.name ?? ''
      const flat = name === 'sand' || name === 'yard' || name === 'asphalt' || name.startsWith('line_') || name === 'grass'
      mesh.castShadow = !flat && name !== 'water' && name !== 'water_foam'
      mesh.receiveShadow = true

      // Layered ground surfaces: pull overlays toward the camera in depth so
      // roads, markings and lawns never z-fight with the yard at distance.
      if (!shared.has(mat)) {
        if (name === 'asphalt' || name === 'grass') {
          mat.polygonOffset = true; mat.polygonOffsetFactor = -1; mat.polygonOffsetUnits = -4
        } else if (name.startsWith('line_')) {
          mat.polygonOffset = true; mat.polygonOffsetFactor = -2; mat.polygonOffsetUnits = -8
        }
        if (name === 'water') {
          mat.roughness = 0.04
          mat.metalness = 0.0
          mat.color = new THREE.Color('#2b8c97')
          mat.envMapIntensity = 1.4
          registry.water.push(mat)
        }
        // Architectural glass → crisp, reflective curtain wall that mirrors the
        // sky and neighbouring towers.
        if (name === 'glass_blue' || name === 'glass' || name === 'diagrid' || name === 'car_glass') {
          mat.roughness = name === 'diagrid' ? 0.12 : 0.06
          mat.metalness = 0.1
          mat.envMapIntensity = 2.4
        }
        if (name === 'lamp' || name === 'window_lit') registry.emissive.push(mat)
        if (name === 'solar') {
          mat.envMapIntensity = 1.3
        }
        shared.set(mat, mat)
      }

      const eq = eqAncestor(mesh)
      if (eq) {
        // per-equipment material clones so state tints stay local
        const cloned = (Array.isArray(mesh.material) ? mesh.material : [mesh.material]).map((m) => {
          const c = (m as THREE.MeshStandardMaterial).clone()
          c.emissive = new THREE.Color('#000000')
          c.emissiveIntensity = 1
          return c
        })
        mesh.material = Array.isArray(mesh.material) ? cloned : cloned[0]
        ;(registry.equipment[eq] ??= []).push(mesh)
        mesh.userData.nodeId = eq
      }
    })
    return { scene: root, registry }
  }, [gltf])
}

export function preloadFacility(url: string) {
  useGLTF.preload(url, DRACO_PATH)
}
