// Shared 2D projection helpers for the SVG fallback map. Uses the same
// project() so facility positions match the 3D scene exactly.
import { project, region } from '../lib/geo'

export interface SvgCountry {
  key: string
  role: 'focus' | 'context'
  d: string
}

/** Build SVG path strings for each country (x = east, y = south in SVG space). */
export function buildSvgCountries(): SvgCountry[] {
  const out: SvgCountry[] = []
  for (const c of region.countries as { key: string; role: string; polygons: number[][][][] }[]) {
    let d = ''
    for (const poly of c.polygons) {
      for (const ring of poly) {
        ring.forEach(([lon, lat], i) => {
          const [x, z] = project(lon, lat)
          d += `${i === 0 ? 'M' : 'L'}${x.toFixed(2)},${z.toFixed(2)} `
        })
        d += 'Z '
      }
    }
    out.push({ key: c.key, role: c.role as 'focus' | 'context', d })
  }
  return out
}

export function svgPoint(lon: number, lat: number): { x: number; y: number } {
  const [x, z] = project(lon, lat)
  return { x, y: z }
}

/** Bounding box of the focus country (UAE) in projected space, with padding. */
export function focusViewBox(pad = 10): { x: number; y: number; w: number; h: number } {
  let minX = Infinity,
    minY = Infinity,
    maxX = -Infinity,
    maxY = -Infinity
  for (const c of region.countries as { role: string; polygons: number[][][][] }[]) {
    if (c.role !== 'focus') continue
    for (const poly of c.polygons)
      for (const ring of poly)
        for (const [lon, lat] of ring) {
          const [x, z] = project(lon, lat)
          minX = Math.min(minX, x)
          minY = Math.min(minY, z)
          maxX = Math.max(maxX, x)
          maxY = Math.max(maxY, z)
        }
  }
  return { x: minX - pad, y: minY - pad, w: maxX - minX + pad * 2, h: maxY - minY + pad * 2 }
}

/** Quadratic bezier path between two projected points, bowed outward. */
export function arcPath(a: { x: number; y: number }, b: { x: number; y: number }): string {
  const mx = (a.x + b.x) / 2
  const my = (a.y + b.y) / 2
  const dx = b.x - a.x
  const dy = b.y - a.y
  const len = Math.hypot(dx, dy) || 1
  // perpendicular offset for the bow
  const off = Math.min(14, len * 0.28)
  const cx = mx + (-dy / len) * off
  const cy = my + (dx / len) * off
  return `M${a.x.toFixed(2)},${a.y.toFixed(2)} Q${cx.toFixed(2)},${cy.toFixed(2)} ${b.x.toFixed(2)},${b.y.toFixed(2)}`
}
