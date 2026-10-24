import { useMemo } from 'react'
import { Droplet, Zap, HeartPulse, ShieldHalf } from 'lucide-react'
import { buildSvgCountries, svgPoint, arcPath, focusViewBox } from './mapSvg'
import { SECTOR_COLOR, COLORS } from '../lib/theme'
import facilitiesData from '@shared/facilities.json'
import { usePick } from '../i18n/useLang'
import type { Sector } from '../sim'

const SECTOR_ICON = { water: Droplet, power: Zap, healthcare: HeartPulse } as const

// Label placement per site (px offsets + anchor side) to avoid collisions,
// since Taweelah, Cleveland Clinic and the SOC sit close together near Abu Dhabi.
const LABEL_POS: Record<string, { dx: number; dy: number }> = {
  taweelah: { dx: -84, dy: -14 },
  'cleveland-clinic': { dx: -92, dy: 34 },
  'dewa-nad-hessa': { dx: -16, dy: -34 },
}

/** Animated 2D SVG national map — used when WebGL is unavailable. */
export function MapFallback({
  threatFacilityId,
  onSelect,
}: {
  threatFacilityId: string | null
  onSelect: (id: string) => void
}) {
  const pick = usePick()
  const countries = useMemo(() => buildSvgCountries(), [])
  const vb = useMemo(() => focusViewBox(12), [])
  const soc = svgPoint(facilitiesData.soc.coordinates.lon, facilitiesData.soc.coordinates.lat)
  const facs = facilitiesData.facilities.map((f) => ({
    ...f,
    pt: svgPoint(f.coordinates.lon, f.coordinates.lat),
    sector: f.sector as Sector,
  }))

  return (
    <div className="relative h-full w-full overflow-hidden bg-gradient-to-b from-ink-900 to-ink-950">
      <svg viewBox={`${vb.x} ${vb.y} ${vb.w} ${vb.h}`} className="h-full w-full" preserveAspectRatio="xMidYMid meet">
        <defs>
          <radialGradient id="sea" cx="50%" cy="40%" r="70%">
            <stop offset="0%" stopColor="#0a1f33" />
            <stop offset="100%" stopColor="#030912" />
          </radialGradient>
          <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="0.8" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <pattern id="grid" width="8" height="8" patternUnits="userSpaceOnUse">
            <path d="M8 0H0V8" fill="none" stroke="#ffffff" strokeOpacity="0.03" strokeWidth="0.15" />
          </pattern>
        </defs>

        <rect x={vb.x} y={vb.y} width={vb.w} height={vb.h} fill="url(#sea)" />
        <rect x={vb.x} y={vb.y} width={vb.w} height={vb.h} fill="url(#grid)" />

        {countries.map((c) =>
          c.role === 'context' ? (
            <path key={c.key} d={c.d} fill="#0a1526" stroke="#15304d" strokeWidth="0.2" opacity={0.6} />
          ) : null,
        )}
        {countries.map((c) =>
          c.role === 'focus' ? (
            <path key={c.key} d={c.d} fill="#0e2338" stroke={COLORS.signal} strokeWidth="0.35" opacity={0.95} filter="url(#glow)" />
          ) : null,
        )}

        {/* Arcs SOC → facilities */}
        {facs.map((f) => {
          const threat = threatFacilityId === f.id
          const col = threat ? COLORS.threat : COLORS.signal
          return (
            <g key={`arc-${f.id}`}>
              <path d={arcPath(soc, f.pt)} fill="none" stroke={col} strokeWidth={threat ? 0.6 : 0.35} opacity={threat ? 0.85 : 0.45} />
              <circle r={threat ? 0.7 : 0.5} fill={col} filter="url(#glow)">
                <animateMotion dur={threat ? '1.4s' : '3s'} repeatCount="indefinite" path={arcPath(soc, f.pt)} />
              </circle>
            </g>
          )
        })}

        {/* SOC hub */}
        <g transform={`translate(${soc.x} ${soc.y})`}>
          <circle r="2.6" fill="none" stroke={COLORS.signal} strokeWidth="0.25" opacity="0.5">
            <animate attributeName="r" values="1.5;4;1.5" dur="3s" repeatCount="indefinite" />
            <animate attributeName="opacity" values="0.6;0;0.6" dur="3s" repeatCount="indefinite" />
          </circle>
          <circle r="1.5" fill={COLORS.signalDeep} stroke={COLORS.signal} strokeWidth="0.3" filter="url(#glow)" />
        </g>

        {/* Facility markers */}
        {facs.map((f) => {
          const threat = threatFacilityId === f.id
          const col = threat ? COLORS.threat : SECTOR_COLOR[f.sector]
          return (
            <g
              key={f.id}
              transform={`translate(${f.pt.x} ${f.pt.y})`}
              className="cursor-pointer"
              onClick={() => onSelect(f.id)}
            >
              <circle r="2.2" fill="none" stroke={col} strokeWidth="0.22" opacity={threat ? 0.9 : 0.5}>
                {threat && <animate attributeName="r" values="1.6;3.2;1.6" dur="1.3s" repeatCount="indefinite" />}
              </circle>
              <circle r="1.15" fill={col} filter="url(#glow)" />
            </g>
          )
        })}
      </svg>

      {/* HTML labels overlaid (crisp text), offset as callouts */}
      <div className="pointer-events-none absolute inset-0">
        <Callout pt={soc} vb={vb} dx={10} dy={28}>
          <span className="inline-flex items-center gap-1 rounded-full border border-signal/30 bg-ink-900/90 px-2 py-0.5 text-[10px] font-semibold text-signal">
            <ShieldHalf size={10} /> National SOC
          </span>
        </Callout>
        {facs.map((f) => {
          const threat = threatFacilityId === f.id
          const Icon = SECTOR_ICON[f.sector]
          const col = threat ? COLORS.threat : SECTOR_COLOR[f.sector]
          const off = LABEL_POS[f.id] ?? { dx: 0, dy: -18 }
          return (
            <Callout key={f.id} pt={f.pt} vb={vb} dx={off.dx} dy={off.dy}>
              <button
                onClick={() => onSelect(f.id)}
                className="pointer-events-auto flex items-center gap-1.5 whitespace-nowrap rounded-lg border bg-ink-900/90 px-2 py-1 shadow-lg backdrop-blur transition-transform hover:scale-105"
                style={{ borderColor: `${col}55`, boxShadow: threat ? `0 0 14px ${col}66` : undefined }}
              >
                <Icon size={12} style={{ color: col }} />
                <span className="text-start leading-tight">
                  <span className="block text-[11px] font-semibold text-fog-50">{pick(f.displayName, f.displayNameAr)}</span>
                  <span className="block text-[9px] text-fog-400">{pick(f.emirate, f.emirateAr)}</span>
                </span>
              </button>
            </Callout>
          )
        })}
      </div>
    </div>
  )
}

/** Position an HTML callout near a viewBox point (percentage based, plus px offset). */
function Callout({
  pt,
  vb,
  dx = 0,
  dy = 0,
  children,
}: {
  pt: { x: number; y: number }
  vb: { x: number; y: number; w: number; h: number }
  dx?: number
  dy?: number
  children: React.ReactNode
}) {
  const left = ((pt.x - vb.x) / vb.w) * 100
  const top = ((pt.y - vb.y) / vb.h) * 100
  return (
    <div className="absolute" style={{ left: `calc(${left}% + ${dx}px)`, top: `calc(${top}% + ${dy}px)`, transform: 'translate(-50%, -50%)' }}>
      {children}
    </div>
  )
}
