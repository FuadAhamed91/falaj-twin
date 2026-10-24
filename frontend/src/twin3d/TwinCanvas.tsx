// Realistic real-time digital twin: Blender GLB + physical sky/IBL + baked sun
// shadow + N8AO + filmic tone mapping, with live simulation overlays.
import { Component, Suspense, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import * as THREE from 'three'
import { Canvas, type ThreeEvent } from '@react-three/fiber'
import { CameraControls, PerformanceMonitor, useProgress } from '@react-three/drei'
import { Bloom, EffectComposer, N8AO, SMAA, ToneMapping } from '@react-three/postprocessing'
import { ToneMappingMode } from 'postprocessing'
import { AnimatePresence, motion } from 'framer-motion'
import { b2t, sceneConfig, type FacilitySceneConfig } from './config'
import { useFacilityModel, type ModelRegistry } from './model'
import { SkyAndLight, Sea, Terrain } from './World'
import { AttackPath, Callouts, EquipmentTint, StatusPins } from './Overlays'
import { useTwinCam } from './camera'
import { useDiscreteWorld, useSim } from '../store/simStore'
import { getScenario, getTopology } from '../sim'
import { FacilityScene as ProceduralScene } from '../twin/Plant3D'

/* ------------------------------- camera rig ------------------------------- */
function CameraRig({ cfg, registry }: { cfg: FacilitySceneConfig; registry: ModelRegistry }) {
  const ref = useRef<CameraControls>(null)
  const preset = useTwinCam((s) => s.preset)
  const nonce = useTwinCam((s) => s.nonce)
  const focusId = useTwinCam((s) => s.focusId)

  // cinematic glide-in whenever the facility changes
  useEffect(() => {
    const c = ref.current
    if (!c) return
    const p = cfg.presets.find((x) => x.id === 'hero') ?? cfg.presets[0]
    const [px, py, pz] = b2t(p.pos)
    const [tx, ty, tz] = b2t(p.target)
    c.setLookAt(tx + (px - tx) * 1.9, py * 2.1, tz + (pz - tz) * 1.9, tx, ty, tz, false)
    void c.setLookAt(px, py, pz, tx, ty, tz, true)
  }, [cfg])

  useEffect(() => {
    const c = ref.current
    if (!c || nonce === 0) return
    if (focusId && registry.anchors[focusId]) {
      const a = registry.anchors[focusId]
      const cam = new THREE.Vector3()
      c.getPosition(cam)
      const dir = cam.sub(a).setY(0).normalize()
      const pos = a.clone().addScaledVector(dir, 78)
      pos.y = a.y + 52
      void c.setLookAt(pos.x, pos.y, pos.z, a.x, Math.max(0, a.y - 8), a.z, true)
      return
    }
    const p = cfg.presets.find((x) => x.id === preset)
    if (!p) return
    const [px, py, pz] = b2t(p.pos)
    const [tx, ty, tz] = b2t(p.target)
    void c.setLookAt(px, py, pz, tx, ty, tz, true)
  }, [nonce, preset, focusId, cfg, registry])

  return (
    <CameraControls
      ref={ref}
      makeDefault
      smoothTime={0.75}
      draggingSmoothTime={0.14}
      minDistance={22}
      maxDistance={cfg.maxDistance}
      maxPolarAngle={Math.PI * 0.47}
      dollySpeed={0.55}
      truckSpeed={1.4}
    />
  )
}

/* ------------------------------ facility scene ---------------------------- */
function FacilityGLB({ cfg }: { cfg: FacilitySceneConfig }) {
  const { scene, registry } = useFacilityModel(cfg.glb)
  const world = useDiscreteWorld()
  const facilityId = useSim((s) => s.facilityId)
  const selectedId = useSim((s) => s.selectedNodeId)
  const select = useSim((s) => s.selectNode)
  const focus = useTwinCam((s) => s.focus)
  const [hover, setHover] = useState<string | null>(null)
  const topo = getTopology(facilityId)
  const scenario = getScenario(facilityId)

  const onPick = (id: string | null) => {
    select(id)
    if (id) focus(id)
  }
  const nodeOf = (e: ThreeEvent<PointerEvent | MouseEvent>) => (e.object.userData?.nodeId as string | undefined) ?? null

  return (
    <>
      <primitive
        object={scene}
        onClick={(e: ThreeEvent<MouseEvent>) => {
          const id = nodeOf(e)
          if (id) { e.stopPropagation(); onPick(id) }
        }}
        onPointerOver={(e: ThreeEvent<PointerEvent>) => {
          const id = nodeOf(e)
          if (id) { e.stopPropagation(); setHover(id); document.body.style.cursor = 'pointer' }
        }}
        onPointerOut={() => { setHover(null); document.body.style.cursor = 'default' }}
      />
      <Sea cfg={cfg} basinWater={registry.water} />
      <EquipmentTint registry={registry} world={world} selectedId={selectedId} hoverId={hover} />
      <AttackPath cfg={cfg} registry={registry} scenario={scenario} world={world} />
      <Callouts cfg={cfg} registry={registry} scenario={scenario} world={world} />
      <StatusPins registry={registry} topo={topo} world={world} scenario={scenario}
        selectedId={selectedId} onSelect={onPick} onHover={setHover} />
      <CameraRig cfg={cfg} registry={registry} />
    </>
  )
}

class ModelBoundary extends Component<{ fallback: ReactNode; children: ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() { return { failed: true } }
  componentDidCatch(e: unknown) { console.warn('[FALAJ] model failed, using procedural scene', e) }
  render() { return this.state.failed ? this.props.fallback : this.props.children }
}

/* --------------------------------- canvas --------------------------------- */
export function TwinCanvas() {
  const facilityId = useSim((s) => s.facilityId)
  const select = useSim((s) => s.selectNode)
  const dusk = useTwinCam((s) => s.dusk)
  const cfg = useMemo(() => sceneConfig(facilityId), [facilityId])
  const [dpr, setDpr] = useState(1.5)

  return (
    <div className="relative h-full w-full">
      <Canvas
        shadows
        dpr={dpr}
        camera={{ position: [0, 500, 700], fov: 38, near: 2, far: 16000 }}
        gl={{ antialias: false, powerPreference: 'high-performance', logarithmicDepthBuffer: false, stencil: false }}
        onPointerMissed={() => select(null)}
        onCreated={(state) => {
          state.gl.shadowMap.type = THREE.PCFSoftShadowMap
          if (import.meta.env.DEV) (window as unknown as { __falaj3d: unknown }).__falaj3d = state
        }}
      >
        <PerformanceMonitor onDecline={() => setDpr(1)} onIncline={() => setDpr(1.5)} flipflops={3} onFallback={() => setDpr(1)} />
        <SkyAndLight cfg={cfg} dusk={dusk} />
        <Suspense fallback={null}>
          <Terrain cfg={cfg} />
          <ModelBoundary key={cfg.id} fallback={<ProceduralScene topo={getTopology(facilityId)} />}>
            <FacilityGLB cfg={cfg} />
          </ModelBoundary>
        </Suspense>
        <EffectComposer multisampling={0}>
          <N8AO halfRes aoRadius={5} distanceFalloff={1.4} intensity={3.2} quality="medium" color="#141a26" />
          <Bloom mipmapBlur intensity={0.35} luminanceThreshold={2.4} luminanceSmoothing={0.3} />
          <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
          <SMAA />
        </EffectComposer>
      </Canvas>
      <Loader />
    </div>
  )
}

function Loader() {
  const { active, progress } = useProgress()
  return (
    <AnimatePresence>
      {active && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.6 } }}
          className="pointer-events-none absolute inset-0 grid place-items-center bg-gradient-to-b from-sky-50 to-slate-100"
        >
          <div className="w-64 text-center">
            <div className="mb-3 text-[13px] font-semibold text-slate-700">Loading digital twin…</div>
            <div className="h-1.5 overflow-hidden rounded-full bg-slate-200">
              <motion.div className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-blue-600" animate={{ width: `${progress}%` }} />
            </div>
            <div className="mt-2 text-[11px] tabular-nums text-slate-500">{Math.round(progress)}%</div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
