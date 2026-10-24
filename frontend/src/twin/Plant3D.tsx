// Procedural 3D facility scenes. Taweelah (water) is the detailed hero; the
// hospital and substation are lighter but recognisable. Structures are an
// illustrative reconstruction of the public exterior — not the real internals.
import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { COLORS } from '../lib/theme'
import type { FacilityTopology } from '../sim'

const STEEL = '#8aa9bd'
const MAT = {
  concrete: { color: '#3b4654', roughness: 0.92, metalness: 0.05 },
  tank: { color: '#c3ccd6', roughness: 0.5, metalness: 0.35 },
  tankTop: { color: '#9aa7b4', roughness: 0.6, metalness: 0.3 },
  pipe: { color: '#7f8b99', roughness: 0.45, metalness: 0.55 },
  building: { color: '#2f3a49', roughness: 0.8, metalness: 0.1 },
  roof: { color: '#1f2733', roughness: 0.85, metalness: 0.1 },
}

function Tank({ pos, r = 4, h = 6 }: { pos: [number, number, number]; r?: number; h?: number }) {
  return (
    <group position={pos}>
      <mesh castShadow receiveShadow position={[0, h / 2, 0]}>
        <cylinderGeometry args={[r, r, h, 32]} />
        <meshStandardMaterial color={MAT.tank.color} roughness={MAT.tank.roughness} metalness={MAT.tank.metalness} />
      </mesh>
      {/* domed top */}
      <mesh castShadow position={[0, h, 0]}>
        <sphereGeometry args={[r, 32, 12, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color={MAT.tankTop.color} roughness={0.6} metalness={0.3} />
      </mesh>
      {/* banding */}
      {[0.25, 0.5, 0.75].map((f) => (
        <mesh key={f} position={[0, h * f, 0]}>
          <torusGeometry args={[r + 0.02, 0.06, 8, 40]} />
          <meshStandardMaterial color="#6b7784" metalness={0.5} roughness={0.5} />
        </mesh>
      ))}
    </group>
  )
}

function Building({
  pos, size, color = MAT.building.color, roof = MAT.roof.color, windows = true,
}: {
  pos: [number, number, number]; size: [number, number, number]; color?: string; roof?: string; windows?: boolean
}) {
  const [w, h, d] = size
  return (
    <group position={pos}>
      <mesh castShadow receiveShadow position={[0, h / 2, 0]}>
        <boxGeometry args={[w, h, d]} />
        <meshStandardMaterial color={color} roughness={0.8} metalness={0.1} />
      </mesh>
      <mesh position={[0, h + 0.1, 0]}>
        <boxGeometry args={[w + 0.3, 0.2, d + 0.3]} />
        <meshStandardMaterial color={roof} roughness={0.85} />
      </mesh>
      {windows && (
        <mesh position={[0, h * 0.55, d / 2 + 0.01]}>
          <planeGeometry args={[w * 0.82, h * 0.5]} />
          <meshStandardMaterial color="#163a54" emissive="#1d5c82" emissiveIntensity={0.5} roughness={0.2} metalness={0.5} />
        </mesh>
      )}
    </group>
  )
}

function PipeRun({ from, to, r = 0.28 }: { from: [number, number, number]; to: [number, number, number]; r?: number }) {
  const { pos, len, quat } = useMemo(() => {
    const a = new THREE.Vector3(...from)
    const b = new THREE.Vector3(...to)
    const dir = b.clone().sub(a)
    const len = dir.length()
    const mid = a.clone().add(b).multiplyScalar(0.5)
    const quat = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize())
    return { pos: mid, len, quat }
  }, [from, to])
  return (
    <mesh position={pos} quaternion={quat} castShadow>
      <cylinderGeometry args={[r, r, len, 12]} />
      <meshStandardMaterial color={MAT.pipe.color} roughness={0.45} metalness={0.55} />
    </mesh>
  )
}

function ROHall({ pos }: { pos: [number, number, number] }) {
  // Long process hall with a row of membrane-rack roof vaults.
  return (
    <group position={pos}>
      <Building pos={[0, 0, 0]} size={[26, 7, 14]} color="#323d4c" />
      {Array.from({ length: 6 }).map((_, i) => (
        <mesh key={i} position={[-10 + i * 4, 7.6, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
          <cylinderGeometry args={[1.4, 1.4, 13, 16, 1, false, 0, Math.PI]} />
          <meshStandardMaterial color="#49576a" roughness={0.6} metalness={0.2} side={THREE.DoubleSide} />
        </mesh>
      ))}
    </group>
  )
}

function PumpStation({ pos }: { pos: [number, number, number] }) {
  const spin = useRef<THREE.Group>(null)
  useFrame((_, dt) => {
    if (spin.current) spin.current.rotation.y += dt * 2
  })
  return (
    <group position={pos}>
      <mesh receiveShadow position={[0, 0.2, 0]}>
        <boxGeometry args={[10, 0.4, 7]} />
        <meshStandardMaterial {...MAT.concrete} />
      </mesh>
      {[-3, 0, 3].map((x) => (
        <group key={x} position={[x, 0.4, 0]}>
          <mesh castShadow position={[0, 0.9, 0]}>
            <cylinderGeometry args={[0.9, 1.1, 1.8, 20]} />
            <meshStandardMaterial color={COLORS.signalDeep} roughness={0.4} metalness={0.6} />
          </mesh>
          <mesh castShadow position={[0, 1.9, 0]}>
            <boxGeometry args={[1.2, 0.5, 1.2]} />
            <meshStandardMaterial color="#5a6676" metalness={0.5} roughness={0.5} />
          </mesh>
        </group>
      ))}
      <group ref={spin} position={[0, 2.3, 0]}>
        <mesh><boxGeometry args={[2.4, 0.08, 0.3]} /><meshStandardMaterial color={STEEL} metalness={0.6} /></mesh>
      </group>
    </group>
  )
}

export function TaweelahScene() {
  return (
    <group>
      {/* site pad */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[170, 150]} />
        <meshStandardMaterial color="#20262f" roughness={0.95} />
      </mesh>
      {/* sea strip to the north */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, -70]}>
        <planeGeometry args={[170, 40]} />
        <meshStandardMaterial color="#0a2236" roughness={0.3} metalness={0.4} />
      </mesh>

      {/* Intake / pretreatment basins (north) */}
      {[-30, -18, -6].map((x) => (
        <mesh key={x} position={[x, 0.3, -40]} receiveShadow>
          <boxGeometry args={[10, 0.6, 16]} />
          <meshStandardMaterial color="#13384d" roughness={0.3} metalness={0.4} />
        </mesh>
      ))}

      {/* Control room + admin */}
      <Building pos={[-54, 0, -28]} size={[12, 5, 10]} color="#2b3a4a" />
      <Building pos={[-54, 0, -14]} size={[10, 4, 8]} color="#2f3a49" />

      {/* RO process hall (hero structure) */}
      <ROHall pos={[8, 0, 2]} />

      {/* Storage tanks (potable reservoirs) */}
      <Tank pos={[52, 0, 20]} r={5} h={7} />
      <Tank pos={[64, 0, 40]} r={6} h={8} />
      <Tank pos={[44, 0, 42]} r={4} h={6} />

      {/* Pump station */}
      <PumpStation pos={[40, 0, 20]} />

      {/* Pipe corridors */}
      <PipeRun from={[-6, 1, -40]} to={[-6, 1, -6]} r={0.4} />
      <PipeRun from={[-6, 1, -6]} to={[8, 1, -6]} r={0.4} />
      <PipeRun from={[21, 1, 2]} to={[40, 1, 20]} r={0.35} />
      <PipeRun from={[40, 1.4, 20]} to={[52, 1.4, 20]} r={0.35} />
      <PipeRun from={[52, 1.4, 20]} to={[62, 1.4, 40]} r={0.3} />

      {/* small PV array detail */}
      {Array.from({ length: 10 }).map((_, i) => (
        <mesh key={i} position={[-48 + (i % 5) * 2.2, 0.8, 8 + Math.floor(i / 5) * 3]} rotation={[-Math.PI / 6, 0, 0]}>
          <boxGeometry args={[1.8, 0.08, 2.4]} />
          <meshStandardMaterial color="#0b1f3a" metalness={0.6} roughness={0.3} />
        </mesh>
      ))}
    </group>
  )
}

export function HospitalScene() {
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow><planeGeometry args={[120, 120]} /><meshStandardMaterial color="#20262f" roughness={0.95} /></mesh>
      {/* Clustered towers on a podium (Cleveland Clinic AD silhouette) */}
      <Building pos={[0, 0, 0]} size={[40, 4, 30]} color="#2b3645" />
      {[[-12, 22, 8], [0, 28, 10], [12, 24, 8], [-4, 18, -8]].map((t, i) => (
        <Building key={i} pos={[t[0], 4, t[2]]} size={[9, t[1], 9]} color="#34425a" roof="#223049" />
      ))}
      {/* sky-garden crowns */}
      {[[-12, 8], [0, 10], [12, 8]].map((t, i) => (
        <mesh key={i} position={[t[0], 4 + (i === 1 ? 28 : 22) + 0.4, 10 - i * 0]} >
          <boxGeometry args={[10, 1, 10]} />
          <meshStandardMaterial color="#1f5f4a" emissive="#1f5f4a" emissiveIntensity={0.3} roughness={0.7} />
        </mesh>
      ))}
    </group>
  )
}

export function SubstationScene() {
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow><planeGeometry args={[120, 120]} /><meshStandardMaterial color="#23282f" roughness={0.95} /></mesh>
      {/* GIS building */}
      <Building pos={[-20, 0, 0]} size={[22, 8, 14]} color="#3a4452" windows={false} />
      {/* transformers */}
      {[6, 16, 26].map((x) => (
        <group key={x} position={[x, 0, -6]}>
          <mesh castShadow position={[0, 2, 0]}><boxGeometry args={[4, 4, 5]} /><meshStandardMaterial color="#55606e" metalness={0.5} roughness={0.5} /></mesh>
          {/* bushings */}
          {[-1, 0, 1].map((b) => (
            <mesh key={b} position={[b * 1.2, 4.6, 1]}><cylinderGeometry args={[0.25, 0.35, 2, 10]} /><meshStandardMaterial color="#cfd6de" roughness={0.4} /></mesh>
          ))}
        </group>
      ))}
      {/* switchyard gantries */}
      {[0, 10, 20].map((x) => (
        <group key={x} position={[x, 0, 10]}>
          {[-3, 3].map((p) => <mesh key={p} position={[p, 5, 0]}><boxGeometry args={[0.4, 10, 0.4]} /><meshStandardMaterial color="#6b7580" metalness={0.5} /></mesh>)}
          <mesh position={[0, 10, 0]}><boxGeometry args={[7, 0.4, 0.4]} /><meshStandardMaterial color="#6b7580" metalness={0.5} /></mesh>
        </group>
      ))}
    </group>
  )
}

export function FacilityScene({ topo }: { topo: FacilityTopology }) {
  switch (topo.facilityId) {
    case 'taweelah': return <TaweelahScene />
    case 'cleveland-clinic': return <HospitalScene />
    case 'dewa-nad-hessa': return <SubstationScene />
    default: return <TaweelahScene />
  }
}
