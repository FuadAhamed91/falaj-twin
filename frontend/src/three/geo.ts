// Build THREE shapes/outlines for the region from the projected geo data.
import * as THREE from 'three'
import { project, region } from '../lib/geo'

export interface CountryGeo {
  key: string
  role: 'focus' | 'context'
  shapes: THREE.Shape[]
  outlines: THREE.Vector3[][]
}

type Poly = number[][][] // [ring][point][lon,lat]

function toShape(poly: Poly): THREE.Shape | null {
  const [outer, ...holes] = poly
  if (!outer || outer.length < 3) return null
  const shape = new THREE.Shape()
  outer.forEach(([lon, lat], i) => {
    const [x, z] = project(lon, lat)
    if (i === 0) shape.moveTo(x, z)
    else shape.lineTo(x, z)
  })
  for (const hole of holes) {
    if (hole.length < 3) continue
    const path = new THREE.Path()
    hole.forEach(([lon, lat], i) => {
      const [x, z] = project(lon, lat)
      if (i === 0) path.moveTo(x, z)
      else path.lineTo(x, z)
    })
    shape.holes.push(path)
  }
  return shape
}

export function buildCountries(): CountryGeo[] {
  const out: CountryGeo[] = []
  for (const c of region.countries as { key: string; role: string; polygons: Poly[] }[]) {
    const shapes: THREE.Shape[] = []
    const outlines: THREE.Vector3[][] = []
    for (const poly of c.polygons) {
      const s = toShape(poly)
      if (s) shapes.push(s)
      // Outer ring as a 3D outline (y set by caller via mesh position).
      const ring = poly[0]
      if (ring && ring.length > 2) {
        const pts = ring.map(([lon, lat]) => {
          const [x, z] = project(lon, lat)
          return new THREE.Vector3(x, 0, z)
        })
        pts.push(pts[0].clone())
        outlines.push(pts)
      }
    }
    out.push({ key: c.key, role: c.role as 'focus' | 'context', shapes, outlines })
  }
  return out
}
