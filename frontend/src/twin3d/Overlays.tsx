// Simulation overlays on the realistic twin: equipment tints, status pins,
// routed attack path, reference-style callouts and ground pulses.
import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { Html, Line } from '@react-three/drei'
import { AlertTriangle, Crosshair, ShieldCheck } from 'lucide-react'
import { b2t, type FacilitySceneConfig, type Vec3 } from './config'
import type { ModelRegistry } from './model'
import type { AssetState, FacilityTopology, Scenario, WorldState } from '../sim'
import { usePick } from '../i18n/useLang'

const STATE_HEX: Record<AssetState, string> = {
  nominal: '#0ea5b7', watch: '#f59e0b', alert: '#f97316', compromised: '#ef4444', contained: '#10b981', offline: '#ef4444',
}
const ATTACK = '#ff2d55'
const PREDICT = '#8b5cf6'

/* -------------------------------------------------------------------------- */
/* Equipment tint: pulses the real Blender meshes according to node state.     */
/* -------------------------------------------------------------------------- */
export function EquipmentTint({ registry, world, selectedId, hoverId }: {
  registry: ModelRegistry; world: WorldState; selectedId: string | null; hoverId: string | null
}) {
  const entries = useMemo(() => Object.entries(registry.equipment), [registry])
  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    for (const [id, meshes] of entries) {
      const st = world.nodeStates[id] ?? 'nominal'
      let color = '#000000'; let k = 0
      if (st === 'compromised' || st === 'offline') { color = '#ff1e3c'; k = 0.55 + 0.45 * Math.sin(t * 5) }
      else if (st === 'alert') { color = '#ff7a1a'; k = 0.35 + 0.25 * Math.sin(t * 4) }
      else if (st === 'watch') { color = '#ffb020'; k = 0.25 + 0.15 * Math.sin(t * 3) }
      else if (st === 'contained') { color = '#10d48e'; k = 0.35 }
      if (id === selectedId) { color = st === 'nominal' ? '#22d3ee' : color; k = Math.max(k, 0.45) }
      else if (id === hoverId && st === 'nominal') { color = '#22d3ee'; k = 0.28 }
      for (const m of meshes) {
        const mats = Array.isArray(m.material) ? m.material : [m.material]
        for (const mat of mats as THREE.MeshStandardMaterial[]) {
          mat.emissive.set(color)
          mat.emissiveIntensity = k
        }
      }
    }
  })
  return null
}

/* -------------------------------------------------------------------------- */
/* Status pins                                                                  */
/* -------------------------------------------------------------------------- */
export function StatusPins({ registry, topo, world, scenario, selectedId, onSelect, onHover }: {
  registry: ModelRegistry; topo: FacilityTopology; world: WorldState; scenario: Scenario
  selectedId: string | null; onSelect: (id: string | null) => void; onHover: (id: string | null) => void
}) {
  const pick = usePick()
  return (
    <>
      {topo.nodes.map((n) => {
        const p = registry.anchors[n.id]
        if (!p) return null
        const st = world.nodeStates[n.id] ?? 'nominal'
        const hot = st !== 'nominal'
        const sel = selectedId === n.id
        const onPath = scenario.path.includes(n.id)
        const col = STATE_HEX[st]
        return (
          <group key={n.id} position={p}>
            <Line points={[[0, 0, 0], [0, -Math.min(p.y, 10), 0]]} color={col} lineWidth={1.2} transparent opacity={hot || sel ? 0.9 : 0.45} />
            <Html center zIndexRange={[40, 0]} style={{ pointerEvents: 'none' }}>
              <div
                onClick={(e) => { e.stopPropagation(); onSelect(sel ? null : n.id) }}
                onMouseEnter={() => onHover(n.id)}
                onMouseLeave={() => onHover(null)}
                className="group pointer-events-auto relative flex cursor-pointer items-center"
                style={{ transform: 'translateY(-2px)' }}
              >
                <span
                  className="relative grid h-[18px] w-[18px] place-items-center rounded-full bg-white shadow-[0_2px_8px_rgba(15,23,42,0.35)] ring-2 transition-transform group-hover:scale-125"
                  style={{ ['--tw-ring-color' as string]: col }}
                >
                  <span className="h-2 w-2 rounded-full" style={{ background: col }} />
                  {hot && <span className="absolute inset-[-6px] animate-ping rounded-full opacity-40" style={{ background: col }} />}
                </span>
                {(hot || sel || onPath) && (
                  <span
                    className={`ms-1.5 whitespace-nowrap rounded-full px-2 py-[3px] text-[10.5px] font-semibold shadow-[0_4px_14px_rgba(15,23,42,0.18)] ring-1 transition-all ${sel ? 'bg-slate-900 text-white ring-slate-900' : 'bg-white/95 text-slate-800 ring-slate-200'}`}
                  >
                    {pick(n.label, n.labelAr)}
                    {hot && <span className="ms-1.5 font-bold uppercase" style={{ color: col }}>· {st}</span>}
                  </span>
                )}
              </div>
            </Html>
          </group>
        )
      })}
    </>
  )
}

/* -------------------------------------------------------------------------- */
/* Attack path                                                                  */
/* -------------------------------------------------------------------------- */
function routeFor(cfg: FacilitySceneConfig, registry: ModelRegistry, a: string, b: string): THREE.Vector3[] {
  const r = cfg.routes[`${a}>${b}`]
  if (r) return r.map((p: Vec3) => new THREE.Vector3(...b2t(p)))
  const pa = registry.anchors[a]; const pb = registry.anchors[b]
  if (!pa || !pb) return []
  const mid = pa.clone().lerp(pb, 0.5); mid.y += pa.distanceTo(pb) * 0.25
  return new THREE.QuadraticBezierCurve3(pa, mid, pb).getPoints(24)
}

function Packets({ pts, color, speed = 60 }: { pts: THREE.Vector3[]; color: string; speed?: number }) {
  const curve = useMemo(() => new THREE.CurvePath<THREE.Vector3>(), [])
  const length = useMemo(() => {
    curve.curves = []
    for (let i = 0; i < pts.length - 1; i++) curve.add(new THREE.LineCurve3(pts[i], pts[i + 1]))
    return curve.getLength()
  }, [pts, curve])
  const refs = useRef<THREE.Mesh[]>([])
  useFrame(({ clock }) => {
    if (length <= 0) return
    refs.current.forEach((m, i) => {
      if (!m) return
      const u = ((clock.elapsedTime * speed) / length + i / 3) % 1
      m.position.copy(curve.getPointAt(u))
    })
  })
  if (pts.length < 2) return null
  return (
    <>
      {[0, 1, 2].map((i) => (
        <mesh key={i} ref={(el) => { if (el) refs.current[i] = el }}>
          <sphereGeometry args={[1.6, 16, 16]} />
          <meshBasicMaterial color={color} toneMapped={false} />
        </mesh>
      ))}
    </>
  )
}

export function AttackPath({ cfg, registry, scenario, world }: {
  cfg: FacilitySceneConfig; registry: ModelRegistry; scenario: Scenario; world: WorldState
}) {
  const idx = world.attackerNodeId ? scenario.path.indexOf(world.attackerNodeId) : -1
  const hops = useMemo(() => {
    const out: { pts: THREE.Vector3[]; done: boolean }[] = []
    for (let i = 0; i < scenario.path.length - 1; i++) {
      const pts = routeFor(cfg, registry, scenario.path[i], scenario.path[i + 1])
      if (pts.length > 1) out.push({ pts, done: i < idx })
    }
    return out
  }, [cfg, registry, scenario, idx])

  const contained = world.containedAt != null
  const predicted = world.prediction != null
  const done = hops.filter((h) => h.done)
  const donePts = useMemo(() => done.flatMap((h, i) => (i === 0 ? h.pts : h.pts.slice(1))), [done])
  const lineRef = useRef<{ material: THREE.Material & { dashOffset: number } } | null>(null)
  useFrame((_, dt) => {
    if (lineRef.current?.material) lineRef.current.material.dashOffset -= dt * 18
  })

  if (idx < 0 && !predicted) return null
  return (
    <group>
      {/* remaining route: predicted (violet) or latent (faint red) */}
      {hops.filter((h) => !h.done).map((h, i) => (
        <Line key={`r${i}`} points={h.pts} color={predicted ? PREDICT : ATTACK} lineWidth={predicted ? 3 : 2}
          dashed dashSize={6} gapSize={5} transparent opacity={predicted ? 0.85 : 0.35} toneMapped={false} />
      ))}
      {donePts.length > 1 && (
        <>
          <Line points={donePts} color={contained ? '#10b981' : ATTACK} lineWidth={11} transparent opacity={0.22} toneMapped={false} />
          <Line ref={lineRef as never} points={donePts} color={contained ? '#10b981' : ATTACK} lineWidth={4.5}
            dashed dashSize={10} gapSize={3} toneMapped={false} />
          {!contained && <Packets pts={donePts} color="#ff5a7a" />}
        </>
      )}
    </group>
  )
}

/* -------------------------------------------------------------------------- */
/* Reference-style callouts + ground pulses                                     */
/* -------------------------------------------------------------------------- */
function GroundPulse({ at, color, size = 26 }: { at: THREE.Vector3; color: string; size?: number }) {
  const a = useRef<THREE.Mesh>(null)
  const b = useRef<THREE.Mesh>(null)
  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    for (const [m, off] of [[a.current, 0], [b.current, 0.5]] as const) {
      if (!m) continue
      const f = (t * 0.6 + off) % 1
      m.scale.setScalar(0.35 + f * 1.1)
      ;(m.material as THREE.MeshBasicMaterial).opacity = 0.65 * (1 - f)
    }
  })
  return (
    <group position={[at.x, 0.6, at.z]} rotation={[-Math.PI / 2, 0, 0]}>
      {[a, b].map((r, i) => (
        <mesh key={i} ref={r}>
          <ringGeometry args={[size * 0.82, size, 64]} />
          <meshBasicMaterial color={color} transparent opacity={0.5} toneMapped={false} depthWrite={false} />
        </mesh>
      ))}
    </group>
  )
}

export function Callouts({ cfg, registry, scenario, world }: {
  cfg: FacilitySceneConfig; registry: ModelRegistry; scenario: Scenario; world: WorldState
}) {
  const pick = usePick()
  const started = world.reachedStageIds.length > 0
  const entry = registry.anchors[scenario.path[0]]
  const target = registry.anchors[scenario.targetNodeId]
  const contained = world.containedAt != null
  const showTarget = started && (world.prediction != null || world.impactAt != null || world.mode === 'baseline')
  return (
    <>
      {started && entry && (
        <group position={[entry.x, entry.y + 14, entry.z]}>
          <Html center zIndexRange={[60, 0]} style={{ pointerEvents: 'none' }}>
            <div className="flex items-center gap-1.5 whitespace-nowrap rounded-lg bg-[#e11d48] px-2.5 py-1.5 text-[12px] font-semibold text-white shadow-[0_8px_24px_rgba(225,29,72,0.45)]">
              <AlertTriangle size={13} strokeWidth={2.5} /> {pick(cfg.entryLabel.en, cfg.entryLabel.ar)}
            </div>
          </Html>
        </group>
      )}
      {started && entry && <GroundPulse at={entry} color="#ff2d55" size={18} />}
      {showTarget && target && (
        <>
          <group position={[target.x, target.y + 16, target.z]}>
            <Html center zIndexRange={[60, 0]} style={{ pointerEvents: 'none' }}>
              <div className={`flex items-center gap-1.5 whitespace-nowrap rounded-lg px-2.5 py-1.5 text-[12px] font-semibold text-white ${contained ? 'bg-emerald-600 shadow-[0_8px_24px_rgba(5,150,105,0.4)]' : 'bg-[#e11d48] shadow-[0_8px_24px_rgba(225,29,72,0.45)]'}`}>
                {contained ? <ShieldCheck size={13} strokeWidth={2.5} /> : <Crosshair size={13} strokeWidth={2.5} />}
                {contained ? pick('Protected: write-protect engaged', 'محمي: تفعيل حماية الكتابة') : pick(cfg.targetLabel.en, cfg.targetLabel.ar)}
              </div>
            </Html>
          </group>
          <GroundPulse at={target} color={contained ? '#10b981' : '#ff2d55'} size={30} />
        </>
      )}
    </>
  )
}
