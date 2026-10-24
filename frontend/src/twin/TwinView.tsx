import { memo, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { Canvas, useFrame } from '@react-three/fiber'
import { Html, Line, OrbitControls, Billboard, ContactShadows } from '@react-three/drei'
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing'
import { GLBoundary } from '../three/webgl'
import { FacilityModel } from './FacilityModel'
import { PlantSchematic } from './PlantSchematic'
import { useSim, useWorld } from '../store/simStore'
import { getScenario, getTopology, type AssetState, type SimNode } from '../sim'
import { STATE_COLOR, STATE_GLOW } from '../lib/theme'
import { usePick } from '../i18n/useLang'

function markerPos(n: SimNode): [number, number, number] {
  const [x, y, z] = n.scenePos ?? [0, 0, 0]
  return [x, Math.max(y, 3) + 4, z]
}

function Marker({
  node, state, selected, isTarget, onSelect,
}: {
  node: SimNode; state: AssetState; selected: boolean; isTarget: boolean; onSelect: () => void
}) {
  const pick = usePick()
  const ref = useRef<THREE.Mesh>(null)
  const col = STATE_COLOR[state]
  const active = state !== 'nominal'
  useFrame(({ clock }) => {
    if (!ref.current) return
    const base = STATE_GLOW[state]
    const pulse = active ? base * (1 + Math.sin(clock.elapsedTime * 5) * 0.4) : base
    ;(ref.current.material as THREE.MeshStandardMaterial).emissiveIntensity = pulse
  })
  const p = markerPos(node)
  return (
    <group position={p}>
      <mesh ref={ref} onClick={(e) => { e.stopPropagation(); onSelect() }}
        onPointerOver={(e) => { e.stopPropagation(); document.body.style.cursor = 'pointer' }}
        onPointerOut={() => (document.body.style.cursor = 'default')}>
        <octahedronGeometry args={[selected ? 1 : 0.75, 0]} />
        <meshStandardMaterial color={col} emissive={col} emissiveIntensity={STATE_GLOW[state]} roughness={0.3} metalness={0.5} />
      </mesh>
      {/* drop line to the ground */}
      <Line points={[[0, 0, 0], [0, -p[1] + 0.1, 0]]} color={col} lineWidth={1} transparent opacity={0.35} />
      {(active || selected || isTarget) && (
        <Billboard>
          <Html center distanceFactor={40} className="pointer-events-none select-none">
            <div className="whitespace-nowrap rounded-md border px-2 py-0.5 text-[10px] font-medium backdrop-blur"
              style={{ borderColor: `${col}66`, background: 'rgba(5,11,22,0.85)', color: col }}>
              {pick(node.label, node.labelAr)}
            </div>
          </Html>
        </Billboard>
      )}
    </group>
  )
}

function AttackPath3D() {
  const facilityId = useSim((s) => s.facilityId)
  const world = useWorld()
  const topo = getTopology(facilityId)
  const scn = getScenario(facilityId)
  const byId = useMemo(() => Object.fromEntries(topo.nodes.map((n) => [n.id, n])), [topo])
  const reachedIdx = world.attackerNodeId ? scn.path.indexOf(world.attackerNodeId) : -1
  const dot = useRef<THREE.Mesh>(null)
  const seg = useMemo(() => {
    const pts: THREE.Vector3[] = []
    for (const id of scn.path) {
      const n = byId[id]
      if (n?.scenePos) pts.push(new THREE.Vector3(n.scenePos[0], 2.2, n.scenePos[2]))
    }
    return pts
  }, [scn, byId])

  useFrame(({ clock }) => {
    if (!dot.current || reachedIdx < 1) return
    const t = (clock.elapsedTime * 0.6) % reachedIdx
    const i = Math.floor(t)
    const f = t - i
    const a = seg[i], b = seg[Math.min(i + 1, reachedIdx)]
    if (a && b) dot.current.position.lerpVectors(a, b, f)
  })

  if (seg.length < 2) return null
  const reached = seg.slice(0, Math.max(2, reachedIdx + 1))
  return (
    <group>
      <Line points={seg.map((v) => [v.x, v.y, v.z] as [number, number, number])} color={STATE_COLOR.compromised} lineWidth={1} dashed dashSize={1} gapSize={1} transparent opacity={0.3} />
      {reachedIdx >= 1 && (
        <>
          <Line points={reached.map((v) => [v.x, v.y, v.z] as [number, number, number])} color={STATE_COLOR.compromised} lineWidth={2.4} transparent opacity={0.9} />
          <mesh ref={dot}><sphereGeometry args={[0.35, 12, 12]} /><meshBasicMaterial color={STATE_COLOR.compromised} toneMapped={false} /></mesh>
        </>
      )}
    </group>
  )
}

function Markers() {
  const facilityId = useSim((s) => s.facilityId)
  const selectedId = useSim((s) => s.selectedNodeId)
  const select = useSim((s) => s.selectNode)
  const world = useWorld()
  const topo = getTopology(facilityId)
  const scn = getScenario(facilityId)
  return (
    <>
      {topo.nodes.filter((n) => n.scenePos).map((n) => (
        <Marker key={n.id} node={n} state={world.nodeStates[n.id] ?? 'nominal'} selected={selectedId === n.id}
          isTarget={scn.targetNodeId === n.id} onSelect={() => select(selectedId === n.id ? null : n.id)} />
      ))}
    </>
  )
}

function Scene() {
  const facilityId = useSim((s) => s.facilityId)
  const select = useSim((s) => s.selectNode)
  const topo = getTopology(facilityId)
  return (
    <>
      <color attach="background" args={['#030810']} />
      <fog attach="fog" args={['#030a16', 70, 210]} />
      {/* Moody key + cool fill + cyan rim for the premium dark look. */}
      <hemisphereLight args={['#5b7ea8', '#05080f', 0.28]} />
      <directionalLight position={[40, 55, 25]} intensity={0.75} color="#ffe8c4" castShadow shadow-mapSize={[2048, 2048]} shadow-bias={-0.0005} />
      <directionalLight position={[-45, 25, -35]} intensity={0.7} color="#22d3ee" />
      <directionalLight position={[20, 18, -50]} intensity={0.35} color="#2563eb" />
      <group onPointerMissed={() => select(null)}>
        <FacilityModel topo={topo} />
        <ContactShadows position={[0, 0.06, 0]} opacity={0.65} scale={240} blur={2.8} far={50} color="#010308" />
        <AttackPath3D />
        <Markers />
      </group>
      <OrbitControls enablePan minDistance={22} maxDistance={180} maxPolarAngle={Math.PI / 2.1} target={[8, 2, 6]} />
      <EffectComposer>
        <Bloom intensity={1.25} luminanceThreshold={0.3} luminanceSmoothing={0.9} mipmapBlur radius={0.8} />
        <Vignette offset={0.2} darkness={0.9} />
      </EffectComposer>
    </>
  )
}

export const TwinView = memo(function TwinView() {
  const facilityId = useSim((s) => s.facilityId)
  const selectedId = useSim((s) => s.selectedNodeId)
  const select = useSim((s) => s.selectNode)
  const world = useWorld()
  const topo = getTopology(facilityId)
  const scn = getScenario(facilityId)

  const fallback = (
    <PlantSchematic topo={topo} scenario={scn} world={world} selectedId={selectedId} onSelect={select} />
  )
  return (
    <GLBoundary fallback={fallback}>
      <Canvas shadows camera={{ position: [-44, 40, 72], fov: 40 }} dpr={[1, 1.8]}
        gl={{ antialias: true, powerPreference: 'high-performance', toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 0.95 }}
        className="h-full w-full">
        <Scene />
      </Canvas>
    </GLBoundary>
  )
})
