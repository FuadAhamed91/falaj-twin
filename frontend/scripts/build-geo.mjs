// Extracts the UAE and nearby context countries from Natural Earth 1:10m
// (public domain, via the world-atlas package) into a compact JSON used by the 3D map.
// Run with: npm run geo
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { feature } from 'topojson-client'

const topo = JSON.parse(readFileSync(new URL('../node_modules/world-atlas/countries-10m.json', import.meta.url), 'utf8'))
const countries = feature(topo, topo.objects.countries).features

// lonMin, latMin, lonMax, latMax — the region the map shows.
const BBOX = [50.9, 22.2, 57.5, 26.75]
// Context countries are clipped to BBOX and drawn faintly; the UAE is drawn in full.
const WANT = {
  784: { key: 'ARE', name: 'United Arab Emirates', role: 'focus' },
  512: { key: 'OMN', name: 'Oman', role: 'context' },
  682: { key: 'SAU', name: 'Saudi Arabia', role: 'context' },
  634: { key: 'QAT', name: 'Qatar', role: 'context' },
}

const round = (v) => Math.round(v * 10000) / 10000

function clipEdge(ring, inside, intersect) {
  const out = []
  for (let i = 0; i < ring.length; i++) {
    const cur = ring[i]
    const prev = ring[(i + ring.length - 1) % ring.length]
    const curIn = inside(cur)
    const prevIn = inside(prev)
    if (curIn) {
      if (!prevIn) out.push(intersect(prev, cur))
      out.push(cur)
    } else if (prevIn) {
      out.push(intersect(prev, cur))
    }
  }
  return out
}

// Sutherland–Hodgman clip against the (convex) bounding rectangle.
function clipRing(ring, [x0, y0, x1, y1]) {
  const lerpX = (a, b, x) => [x, a[1] + ((b[1] - a[1]) * (x - a[0])) / (b[0] - a[0])]
  const lerpY = (a, b, y) => [a[0] + ((b[0] - a[0]) * (y - a[1])) / (b[1] - a[1]), y]
  let r = ring.slice(0, -1)
  r = clipEdge(r, (p) => p[0] >= x0, (a, b) => lerpX(a, b, x0))
  r = clipEdge(r, (p) => p[0] <= x1, (a, b) => lerpX(a, b, x1))
  r = clipEdge(r, (p) => p[1] >= y0, (a, b) => lerpY(a, b, y0))
  r = clipEdge(r, (p) => p[1] <= y1, (a, b) => lerpY(a, b, y1))
  return r
}

function simplify(ring, eps) {
  const out = [ring[0]]
  for (const p of ring.slice(1)) {
    const q = out[out.length - 1]
    if (Math.hypot(p[0] - q[0], p[1] - q[1]) >= eps) out.push(p)
  }
  return out
}

function area(ring) {
  let a = 0
  for (let i = 0; i < ring.length; i++) {
    const [x1, y1] = ring[i]
    const [x2, y2] = ring[(i + 1) % ring.length]
    a += x1 * y2 - x2 * y1
  }
  return a / 2
}

const result = {
  source: 'Natural Earth 1:10m Cultural Vectors (public domain) via world-atlas@2 countries-10m',
  bbox: BBOX,
  countries: [],
}

for (const f of countries) {
  const meta = WANT[Number(f.id)]
  if (!meta) continue
  const polys = f.geometry.type === 'Polygon' ? [f.geometry.coordinates] : f.geometry.coordinates
  const polygons = []
  for (const poly of polys) {
    const rings = []
    for (const [i, ring] of poly.entries()) {
      let r = meta.role === 'focus' ? ring.slice(0, -1) : clipRing(ring, BBOX)
      r = simplify(r, meta.role === 'focus' ? 0.004 : 0.012)
      if (r.length < 3) continue
      // Drop specks (tiny islets) to keep geometry light; keep holes as-is.
      if (i === 0 && Math.abs(area(r)) < (meta.role === 'focus' ? 0.00035 : 0.002)) break
      rings.push(r.map(([x, y]) => [round(x), round(y)]))
    }
    if (rings.length) polygons.push(rings)
  }
  result.countries.push({ ...meta, polygons })
}

mkdirSync(new URL('../src/data/geo/', import.meta.url), { recursive: true })
writeFileSync(new URL('../src/data/geo/region.json', import.meta.url), JSON.stringify(result))
for (const c of result.countries) {
  const pts = c.polygons.flat(2).length
  console.log(`${c.key}: ${c.polygons.length} polygons, ${pts} points`)
}
