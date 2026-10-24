// Live 2D SCADA-style mimic of a facility, laid out from the topology's
// scenePos. Doubles as the WebGL-free fallback for the 3D twin and as the
// "Cyber view" overlay. Every colour is driven by the simulation world state.
import { useMemo } from 'react'
import { motion } from 'framer-motion'
import {
  Monitor, Server, Shield, Database, Gauge, Cpu, Fan, Droplets,
  CircleDot, Waves, Zap, RadioTower, Activity, type LucideIcon,
} from 'lucide-react'
import type { FacilityTopology, NodeKind, Scenario, WorldState, Zone } from '../sim'
import { STATE_COLOR } from '../lib/theme'
import { usePick } from '../i18n/useLang'

const KIND_ICON: Record<NodeKind, LucideIcon> = {
  workstation: Monitor, server: Server, firewall: Shield, historian: Database,
  hmi: Gauge, plc: Cpu, rtu: Cpu, pump: Fan, valve: CircleDot, tank: Droplets,
  sensor: Activity, transformer: Zap, breaker: RadioTower,
}

const ZONE_LABEL: Record<Zone, string> = {
  IT: 'IT / Office', DMZ: 'DMZ', OT: 'OT', CONTROL: 'Control', FIELD: 'Field',
}
const ZONE_ORDER: Zone[] = ['IT', 'DMZ', 'OT', 'CONTROL', 'FIELD']

interface Props {
  topo: FacilityTopology
  scenario: Scenario
  world: WorldState
  selectedId: string | null
  onSelect: (id: string | null) => void
  showZones?: boolean
}

export function PlantSchematic({ topo, scenario, world, selectedId, onSelect, showZones = true }: Props) {
  const pick = usePick()

  // Project scenePos (x, _, z) → svg coords; fall back to a zone grid if absent.
  const nodes = useMemo(() => {
    const byZone: Record<string, number> = {}
    return topo.nodes.map((n) => {
      let x: number, y: number
      if (n.scenePos) {
        x = n.scenePos[0]
        y = n.scenePos[2]
      } else {
        const col = ZONE_ORDER.indexOf(n.zone)
        const row = (byZone[n.zone] = (byZone[n.zone] ?? -1) + 1)
        x = -58 + col * 30
        y = -20 + row * 16
      }
      return { ...n, x, y }
    })
  }, [topo])

  const bounds = useMemo(() => {
    const xs = nodes.map((n) => n.x)
    const ys = nodes.map((n) => n.y)
    const pad = 20
    return {
      x: Math.min(...xs) - pad, y: Math.min(...ys) - pad,
      w: Math.max(...xs) - Math.min(...xs) + pad * 2,
      h: Math.max(...ys) - Math.min(...ys) + pad * 2,
    }
  }, [nodes])

  const pos = useMemo(() => Object.fromEntries(nodes.map((n) => [n.id, n])), [nodes])
  const pathPairs = useMemo(() => {
    const p: [string, string][] = []
    for (let i = 0; i < scenario.path.length - 1; i++) p.push([scenario.path[i], scenario.path[i + 1]])
    return p
  }, [scenario])
  const reachedPath = world.attackerNodeId ? scenario.path.slice(0, scenario.path.indexOf(world.attackerNodeId) + 1) : []

  // Zone bands by x range.
  const zoneBands = useMemo(() => {
    const bands: { zone: Zone; x0: number; x1: number }[] = []
    for (const z of ZONE_ORDER) {
      const zs = nodes.filter((n) => n.zone === z)
      if (!zs.length) continue
      const xs = zs.map((n) => n.x)
      bands.push({ zone: z, x0: Math.min(...xs) - 9, x1: Math.max(...xs) + 9 })
    }
    return bands
  }, [nodes])

  return (
    <div className="relative h-full w-full overflow-hidden rounded-[var(--radius-panel)] bg-[radial-gradient(ellipse_at_50%_30%,#0a1b2e_0%,#040a14_70%)]">
      <svg viewBox={`${bounds.x} ${bounds.y} ${bounds.w} ${bounds.h}`} className="h-full w-full" preserveAspectRatio="xMidYMid meet">
        <defs>
          <filter id="s-glow" x="-80%" y="-80%" width="260%" height="260%">
            <feGaussianBlur stdDeviation="1.1" result="b" />
            <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
          <pattern id="s-grid" width="10" height="10" patternUnits="userSpaceOnUse">
            <path d="M10 0H0V10" fill="none" stroke="#ffffff" strokeOpacity="0.025" strokeWidth="0.2" />
          </pattern>
        </defs>
        <rect x={bounds.x} y={bounds.y} width={bounds.w} height={bounds.h} fill="url(#s-grid)" />

        {/* Zone bands */}
        {showZones &&
          zoneBands.map((b) => (
            <g key={b.zone}>
              <rect x={b.x0} y={bounds.y + 4} width={b.x1 - b.x0} height={bounds.h - 8} rx="4"
                fill="#0e2742" fillOpacity="0.25" stroke="#1b3a5c" strokeWidth="0.3" strokeDasharray="2 2" />
              <text x={(b.x0 + b.x1) / 2} y={bounds.y + 11} textAnchor="middle" fontSize="4.2"
                fill="#5a7599" fontWeight="600" letterSpacing="0.5">{ZONE_LABEL[b.zone]}</text>
            </g>
          ))}

        {/* Network edges */}
        {topo.edges.map((e, i) => {
          const a = pos[e.from], b = pos[e.to]
          if (!a || !b) return null
          const guarded = e.guarded
          return (
            <line key={i} x1={a.x} y1={a.y} x2={b.x} y2={b.y}
              stroke={guarded ? '#2b6a8f' : '#1e3a57'} strokeWidth={guarded ? 0.6 : 0.4}
              strokeDasharray={guarded ? '1.5 1' : undefined} opacity={0.8} />
          )
        })}

        {/* Attack path (full faint, reached bright + animated) */}
        {pathPairs.map(([from, to], i) => {
          const a = pos[from], b = pos[to]
          if (!a || !b) return null
          return <line key={`ap-${i}`} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={STATE_COLOR.compromised} strokeWidth="0.5" strokeDasharray="1 1.5" opacity={0.25} />
        })}
        {reachedPath.slice(0, -1).map((from, i) => {
          const to = reachedPath[i + 1]
          const a = pos[from], b = pos[to]
          if (!a || !b) return null
          return (
            <g key={`rp-${i}`}>
              <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={STATE_COLOR.compromised} strokeWidth="1.1" filter="url(#s-glow)" />
              <circle r="1" fill={STATE_COLOR.compromised} filter="url(#s-glow)">
                <animateMotion dur="1.1s" repeatCount="indefinite" path={`M${a.x},${a.y} L${b.x},${b.y}`} />
              </circle>
            </g>
          )
        })}

        {/* Nodes */}
        {nodes.map((n) => {
          const state = world.nodeStates[n.id] ?? 'nominal'
          const col = STATE_COLOR[state]
          const selected = selectedId === n.id
          const isAttacker = world.attackerNodeId === n.id
          const isTarget = scenario.targetNodeId === n.id
          const active = state !== 'nominal'
          return (
            <g key={n.id} transform={`translate(${n.x} ${n.y})`} className="cursor-pointer"
              onClick={(ev) => { ev.stopPropagation(); onSelect(selected ? null : n.id) }}>
              {isTarget && <circle r="5.4" fill="none" stroke={STATE_COLOR.alert} strokeWidth="0.3" strokeDasharray="1 1" opacity="0.7" />}
              {(active || selected) && (
                <circle r="4.6" fill="none" stroke={col} strokeWidth={selected ? 0.5 : 0.3} opacity={selected ? 0.9 : 0.6}>
                  {(isAttacker || state === 'compromised') && <animate attributeName="r" values="3.6;5.2;3.6" dur="1.2s" repeatCount="indefinite" />}
                </circle>
              )}
              <circle r="3.4" fill="#081525" stroke={col} strokeWidth="0.6" filter={active ? 'url(#s-glow)' : undefined} />
              {n.critical && <circle r="3.4" fill="none" stroke={STATE_COLOR.alert} strokeWidth="0.3" opacity="0.4" strokeDasharray="0.6 0.6" />}
            </g>
          )
        })}
      </svg>

      {/* HTML node labels + icons overlay */}
      <div className="pointer-events-none absolute inset-0">
        {nodes.map((n) => {
          const state = world.nodeStates[n.id] ?? 'nominal'
          const col = STATE_COLOR[state]
          const Icon = KIND_ICON[n.kind] ?? CircleDot
          const left = ((n.x - bounds.x) / bounds.w) * 100
          const top = ((n.y - bounds.y) / bounds.h) * 100
          const selected = selectedId === n.id
          return (
            <div key={n.id} className="absolute flex flex-col items-center"
              style={{ left: `${left}%`, top: `${top}%`, transform: 'translate(-50%, -50%)' }}>
              <Icon size={13} style={{ color: col }} className="drop-shadow" />
              <div className={`mt-4 whitespace-nowrap rounded px-1.5 py-0.5 text-[9px] font-medium backdrop-blur ${selected ? 'bg-ink-800 text-fog-50 ring-1 ring-signal/40' : 'text-fog-400'}`}>
                {pick(n.label, n.labelAr)}
              </div>
            </div>
          )
        })}
      </div>

      {/* Legend */}
      <div className="pointer-events-none absolute bottom-3 left-3 flex flex-wrap gap-x-3 gap-y-1 text-[9.5px] text-fog-400">
        {(['nominal', 'watch', 'alert', 'compromised', 'contained', 'offline'] as const).map((s) => (
          <span key={s} className="inline-flex items-center gap-1">
            <span className="h-2 w-2 rounded-full" style={{ background: STATE_COLOR[s] }} /> {s}
          </span>
        ))}
      </div>
      {world.attackerNodeId && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className="pointer-events-none absolute right-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-threat/15 px-2.5 py-1 text-[10px] font-semibold text-threat ring-1 ring-inset ring-threat/30">
          <Waves size={11} /> Attack path active
        </motion.div>
      )}
    </div>
  )
}
