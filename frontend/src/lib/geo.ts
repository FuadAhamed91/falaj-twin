// Geographic helpers. The map uses an equirectangular projection corrected for
// latitude so the UAE's relative site positions stay geographically consistent.
import region from '../data/geo/region.json'

export const BBOX = region.bbox as [number, number, number, number]

const [lonMin, latMin, lonMax, latMax] = BBOX
const latMid = (latMin + latMax) / 2
const cosLat = Math.cos((latMid * Math.PI) / 180)

/** World half-extent of the map plane (metres in the 3D scene). */
export const MAP_HALF = 50

const lonSpan = (lonMax - lonMin) * cosLat
const latSpan = latMax - latMin
const span = Math.max(lonSpan, latSpan)
const scale = (MAP_HALF * 2) / span

/** Project [lon, lat] → [x, z] on the map plane (y is up elsewhere). */
export function project(lon: number, lat: number): [number, number] {
  const x = (lon - (lonMin + lonMax) / 2) * cosLat * scale
  const z = -(lat - (latMin + latMax) / 2) * scale
  return [x, z]
}

export { region }
