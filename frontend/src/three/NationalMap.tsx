import { memo, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import { Canvas, useFrame } from '@react-three/fiber'
import { Html, Line, OrbitControls, Billboard } from '@react-three/drei'
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing'
import { Droplet, Zap, HeartPulse, ShieldHalf } from 'lucide-react'
import { buildCountries } from './geo'
import { project } from '../lib/geo'
import { COLORS, SECTOR_COLOR } from '../lib/theme'
import facilitiesData from '@shared/facilities.json'
import { useSim } from '../store/simStore'
import { usePick } from '../i18n/useLang'
import type { Sector } from '../sim'
import { GLBoundary } from './webgl'
import { MapFallback } from './MapFallback'

const SECTOR_ICON = { water: Droplet, power: Zap, healthcare: HeartPulse } as const

interface Fac {
  id: string
  displayName: string
  displayNameAr: string
  sector: Sector
  emirate: string
  emirateAr: string
  pos: [number, number]
}

const FACS: Fac[] = facilitiesData.facilities.map((f) => ({
  id: f.id,
  displayName: f.displayName,
  displayNameAr: f.displayNameAr,
  sector: f.sector as Sector,
  emirate: f.emirate,
  emirateAr: f.emirateAr,
  pos: project(f.coordinates.lon, f.coordinates.lat),
}))
const SOC_POS = project(facilitiesData.soc.coordinates.lon, facilitiesData.soc.coordinates.lat)

/* ---------- Landmass ---------- */
function Landmass() {
  const countries = useMemo(() => buildCountries(), [])
  return (
    <group>
      {countries.map((c) => {
        const focus = c.role === 'focus'
        return (
          <group key={c.key}>
            {c.shapes.map((shape, i) => (
              <mesh key={i} rotation={[-Math.PI / 2, 0, 0]} position={[0, focus ? 0 : -0.15, 0]} receiveShadow>
                <extrudeGeometry args={[shape, { depth: focus ? 0.9 : 0.35, bevelEnabled: false }]} />
                <meshStandardMaterial
                  color={focus ? '#0d2036' : '#0a1526'}
                  emissive={focus ? '#0e2d4a' : '#060e1a'}
                  emissiveIntensity={focus ? 0.5 : 0.2}
                  roughness={0.85}
                  metalness={0.1}
                />
              </mesh>
            ))}
            {c.outlines.map((pts, i) => (
              <Line
                key={i}
                points={pts.map((p) => [p.x, focus ? 0.92 : 0.22, p.z] as [number, number, number])}
                color={focus ? COLORS.signal : '#1b3a5c'}
                lineWidth={focus ? 1.6 : 0.7}
                transparent
                opacity={focus ? 0.8 : 0.35}
              />
            ))}
          </group>
        )
      })}
    </group>
  )
}

/* ---------- Network arc ---------- */
function Arc({ from, to, color, active }: { from: [number, number]; to: [number, number]; color: string; active: boolean }) {
  const curve = useMemo(() => {
    const a = new THREE.Vector3(from[0], 1, from[1])
    const b = new THREE.Vector3(to[0], 1, to[1])
    const mid = a.clone().lerp(b, 0.5)
    mid.y += a.distanceTo(b) * 0.28 + 2
    return new THREE.QuadraticBezierCurve3(a, mid, b)
  }, [from, to])
  const pts = useMemo(() => curve.getPoints(40).map((p) => [p.x, p.y, p.z] as [number, number, number]), [curve])
  const dot = useRef<THREE.Mesh>(null)
  useFrame(({ clock }) => {
    if (!dot.current) return
    const t = (clock.elapsedTime * (active ? 0.5 : 0.22)) % 1
    const p = curve.getPoint(t)
    dot.current.position.set(p.x, p.y, p.z)
  })
  return (
    <group>
      <Line points={pts} color={color} lineWidth={active ? 2.4 : 1.2} transparent opacity={active ? 0.85 : 0.4} dashed={false} />
      <mesh ref={dot}>
        <sphereGeometry args={[active ? 0.3 : 0.2, 12, 12]} />
        <meshBasicMaterial color={color} toneMapped={false} />
      </mesh>
    </group>
  )
}

/* ---------- SOC hub ---------- */
function SocHub() {
  const ring1 = useRef<THREE.Mesh>(null)
  const ring2 = useRef<THREE.Mesh>(null)
  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    if (ring1.current) {
      const s = 1 + ((t * 0.6) % 1) * 2.2
      ring1.current.scale.setScalar(s)
      ;(ring1.current.material as THREE.MeshBasicMaterial).opacity = 0.5 * (1 - ((t * 0.6) % 1))
    }
    if (ring2.current) {
      const s = 1 + ((t * 0.6 + 0.5) % 1) * 2.2
      ring2.current.scale.setScalar(s)
      ;(ring2.current.material as THREE.MeshBasicMaterial).opacity = 0.5 * (1 - ((t * 0.6 + 0.5) % 1))
    }
  })
  return (
    <group position={[SOC_POS[0], 0, SOC_POS[1]]}>
      <mesh position={[0, 2.4, 0]}>
        <icosahedronGeometry args={[0.7, 0]} />
        <meshStandardMaterial color={COLORS.signalDeep} emissive={COLORS.signal} emissiveIntensity={0.9} roughness={0.3} metalness={0.6} />
      </mesh>
      <mesh position={[0, 1.2, 0]}>
        <cylinderGeometry args={[0.05, 0.05, 2.4, 8]} />
        <meshBasicMaterial color={COLORS.signal} transparent opacity={0.5} toneMapped={false} />
      </mesh>
      {[ring1, ring2].map((r, i) => (
        <mesh key={i} ref={r} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.05, 0]}>
          <ringGeometry args={[0.9, 1.05, 48]} />
          <meshBasicMaterial color={COLORS.signal} transparent opacity={0.4} side={THREE.DoubleSide} toneMapped={false} />
        </mesh>
      ))}
      <Billboard position={[0, 4, 0]}>
        <Html center distanceFactor={26} className="pointer-events-none select-none">
          <div className="flex items-center gap-1.5 whitespace-nowrap rounded-full border border-signal/30 bg-ink-900/90 px-2.5 py-1 text-[11px] font-semibold text-signal shadow-lg backdrop-blur">
            <ShieldHalf size={12} /> National SOC
          </div>
        </Html>
      </Billboard>
    </group>
  )
}

/* ---------- Facility marker ---------- */
function Marker({ fac, threat, onClick }: { fac: Fac; threat: boolean; onClick: () => void }) {
  const pick = usePick()
  const [hover, setHover] = useState(false)
  const Icon = SECTOR_ICON[fac.sector]
  const color = threat ? COLORS.threat : SECTOR_COLOR[fac.sector]
  const beam = useRef<THREE.Mesh>(null)
  const core = useRef<THREE.Mesh>(null)
  useFrame(({ clock }) => {
    const pulse = 0.6 + Math.sin(clock.elapsedTime * (threat ? 6 : 2)) * (threat ? 0.4 : 0.15)
    if (core.current) (core.current.material as THREE.MeshStandardMaterial).emissiveIntensity = pulse * 1.5
    if (beam.current) (beam.current.material as THREE.MeshBasicMaterial).opacity = 0.25 + pulse * 0.25
  })
  return (
    <group
      position={[fac.pos[0], 0, fac.pos[1]]}
      onClick={onClick}
      onPointerOver={(e) => {
        e.stopPropagation()
        setHover(true)
        document.body.style.cursor = 'pointer'
      }}
      onPointerOut={() => {
        setHover(false)
        document.body.style.cursor = 'default'
      }}
    >
      <mesh ref={beam} position={[0, 1.8, 0]}>
        <cylinderGeometry args={[0.08, 0.18, 3.6, 10]} />
        <meshBasicMaterial color={color} transparent opacity={0.35} toneMapped={false} />
      </mesh>
      <mesh ref={core} position={[0, 3.6, 0]}>
        <octahedronGeometry args={[0.55, 0]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={1.4} roughness={0.25} metalness={0.5} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.06, 0]}>
        <ringGeometry args={[0.7, 0.85, 40]} />
        <meshBasicMaterial color={color} transparent opacity={threat ? 0.8 : 0.5} side={THREE.DoubleSide} toneMapped={false} />
      </mesh>
      <Billboard position={[0, 5, 0]}>
        <Html center distanceFactor={24} className="pointer-events-none select-none">
          <div
            className="flex items-center gap-2 whitespace-nowrap rounded-xl border bg-ink-900/90 px-3 py-1.5 shadow-xl backdrop-blur transition-transform"
            style={{
              borderColor: `${color}55`,
              transform: hover ? 'scale(1.06)' : 'scale(1)',
              boxShadow: threat ? `0 0 20px ${color}66` : undefined,
            }}
          >
            <Icon size={14} style={{ color }} />
            <div className="text-start leading-tight">
              <div className="text-[12px] font-semibold text-fog-50">{pick(fac.displayName, fac.displayNameAr)}</div>
              <div className="text-[9.5px] text-fog-400">{pick(fac.emirate, fac.emirateAr)}</div>
            </div>
            {threat && <span className="h-1.5 w-1.5 animate-ping rounded-full bg-threat" />}
          </div>
        </Html>
      </Billboard>
    </group>
  )
}

/* ---------- Scene ---------- */
function Scene({ threatFacilityId, onSelect }: { threatFacilityId: string | null; onSelect: (id: string) => void }) {
  return (
    <>
      <color attach="background" args={[COLORS.ink950]} />
      <fog attach="fog" args={[COLORS.ink950, 55, 120]} />
      <ambientLight intensity={0.5} />
      <directionalLight position={[20, 40, 10]} intensity={1.1} color="#9fd0ff" />
      <directionalLight position={[-30, 20, -20]} intensity={0.4} color={COLORS.signal} />

      {/* sea plane */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.3, 0]}>
        <planeGeometry args={[400, 400]} />
        <meshStandardMaterial color="#030912" roughness={0.4} metalness={0.3} />
      </mesh>
      <gridHelper args={[200, 80, '#0d2238', '#0a1a2c']} position={[0, -0.25, 0]} />

      <Landmass />
      <SocHub />
      {FACS.map((f) => (
        <Arc
          key={`arc-${f.id}`}
          from={SOC_POS}
          to={f.pos}
          color={threatFacilityId === f.id ? COLORS.threat : COLORS.signal}
          active={threatFacilityId === f.id}
        />
      ))}
      {FACS.map((f) => (
        <Marker key={f.id} fac={f} threat={threatFacilityId === f.id} onClick={() => onSelect(f.id)} />
      ))}

      <OrbitControls
        enablePan={false}
        minDistance={30}
        maxDistance={95}
        maxPolarAngle={Math.PI / 2.15}
        minPolarAngle={0.2}
        autoRotate
        autoRotateSpeed={0.28}
        target={[6, 0, 0]}
      />
      <EffectComposer>
        <Bloom intensity={0.9} luminanceThreshold={0.35} luminanceSmoothing={0.9} mipmapBlur radius={0.7} />
        <Vignette eskil={false} offset={0.25} darkness={0.75} />
      </EffectComposer>
    </>
  )
}

export const NationalMap = memo(function NationalMap({
  onSelectFacility,
}: {
  onSelectFacility?: (id: string) => void
}) {
  // Coarse selectors only (no per-frame world recompute) so the Canvas tree
  // stays stable while the surrounding dashboard updates every frame.
  const demoActive = useSim((s) => s.demo.active)
  const demoPhase = useSim((s) => s.demo.phase)
  const running = useSim((s) => s.running)
  const facilityId = useSim((s) => s.facilityId)
  const select = useSim((s) => s.selectFacility)

  const threatened =
    running || (demoActive && ['baseline', 'baseline-impact', 'defended', 'approve'].includes(demoPhase))
  const threatFacilityId = threatened ? facilityId : null
  const onSelect = (id: string) => {
    select(id as 'taweelah')
    onSelectFacility?.(id)
  }

  return (
    <GLBoundary fallback={<MapFallback threatFacilityId={threatFacilityId} onSelect={onSelect} />}>
      <Canvas
        camera={{ position: [10, 46, 54], fov: 38 }}
        dpr={[1, 1.8]}
        gl={{ antialias: true, powerPreference: 'high-performance' }}
        className="h-full w-full"
      >
        <Scene threatFacilityId={threatFacilityId} onSelect={onSelect} />
      </Canvas>
    </GLBoundary>
  )
})
