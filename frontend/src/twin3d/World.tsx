// Realistic daylight world around a facility: physical sky + IBL, sun with a
// baked (static) high-resolution shadow, haze, desert terrain and the sea.
import { useLayoutEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useFrame, useThree } from '@react-three/fiber'
import { Environment, Sky, useTexture } from '@react-three/drei'
import { b2t, type FacilitySceneConfig } from './config'

const TEX = `${import.meta.env.BASE_URL}textures/`
export const HAZE = '#d4dde6'

export function useSunVector(cfg: FacilitySceneConfig) {
  return useMemo(() => new THREE.Vector3(...b2t(cfg.sun)).normalize(), [cfg])
}

/** Physical sky (background) + an environment map rendered from the same sky. */
export function SkyAndLight({ cfg, dusk = false }: { cfg: FacilitySceneConfig; dusk?: boolean }) {
  const sun = useSunVector(cfg)
  const sunPos = useMemo(() => (dusk ? new THREE.Vector3(sun.x, 0.06, sun.z).normalize() : sun), [sun, dusk])
  const light = useRef<THREE.DirectionalLight>(null)
  const { scene } = useThree()
  const center = useMemo(() => new THREE.Vector3(...b2t(cfg.shadowCenter)), [cfg])

  useLayoutEffect(() => {
    const l = light.current
    if (!l) return
    l.position.copy(center).addScaledVector(sunPos, 900)
    l.target.position.copy(center)
    scene.add(l.target)
    const cam = l.shadow.camera as THREE.OrthographicCamera
    const e = cfg.shadowExtent
    cam.left = -e; cam.right = e; cam.top = e; cam.bottom = -e
    cam.near = 100; cam.far = 1800
    cam.updateProjectionMatrix()
    l.shadow.needsUpdate = true
    return () => { scene.remove(l.target) }
  }, [cfg, center, sunPos, scene])

  const skyProps = dusk
    ? { turbidity: 9, rayleigh: 3.2, mieCoefficient: 0.012, mieDirectionalG: 0.9 }
    : { turbidity: 6.5, rayleigh: 1.25, mieCoefficient: 0.0055, mieDirectionalG: 0.82 }

  return (
    <>
      <Sky distance={9000} sunPosition={sunPos.toArray()} {...skyProps} />
      <Environment resolution={256} frames={1} environmentIntensity={dusk ? 0.3 : 0.62}>
        <Sky distance={900} sunPosition={sunPos.toArray()} {...skyProps} />
      </Environment>
      <fog attach="fog" args={[dusk ? '#7d7f96' : HAZE, 1500, cfg.maxDistance * 6]} />
      <directionalLight
        ref={light}
        castShadow
        color={dusk ? '#ffb27a' : '#fff1de'}
        intensity={dusk ? 1.1 : 2.9}
        shadow-mapSize={[4096, 4096]}
        shadow-bias={-0.0004}
        shadow-normalBias={0.6}
      />
      <hemisphereLight args={[dusk ? '#6d7aa6' : '#bcd6f5', dusk ? '#3a2f2a' : '#a8916b', dusk ? 0.3 : 0.16]} />
    </>
  )
}

/** Desert terrain surrounding the modelled ground (three planes, no overlap). */
export function Terrain({ cfg }: { cfg: FacilitySceneConfig }) {
  const [albedo, normal] = useTexture([`${TEX}sand_albedo.jpg`, `${TEX}sand_normal.jpg`])
  const [gx0, gx1, gy0, gy1] = cfg.ground
  const xMax = cfg.seaX ?? gx1 + 6000
  const R = 7000
  const tiles = useMemo(() => {
    // Blender-frame rectangles around the modelled ground.
    const rects: [number, number, number, number][] = [
      [-R, gx0, -R, R],          // west
      [gx0, xMax, gy1, R],       // north
      [gx0, xMax, -R, gy0],      // south
    ]
    if (cfg.seaX == null) rects.push([gx1, R, -R, R]) // east (inland sites)
    return rects
  }, [gx0, gx1, gy0, gy1, xMax, cfg.seaX])

  const mats = useMemo(
    () =>
      tiles.map(([x0, x1, y0, y1]) => {
        const a = albedo.clone(); const n = normal.clone()
        for (const t of [a, n]) {
          t.wrapS = t.wrapT = THREE.RepeatWrapping
          t.repeat.set((x1 - x0) / 28, (y1 - y0) / 28)
          t.anisotropy = 8
          t.needsUpdate = true
        }
        a.colorSpace = THREE.SRGBColorSpace
        return new THREE.MeshStandardMaterial({ map: a, normalMap: n, normalScale: new THREE.Vector2(0.6, 0.6), roughness: 0.95, color: '#f2e6cf' })
      }),
    [tiles, albedo, normal],
  )

  return (
    <group>
      {tiles.map(([x0, x1, y0, y1], i) => {
        const [cx, , cz] = b2t([(x0 + x1) / 2, (y0 + y1) / 2, 0])
        return (
          <mesh key={i} position={[cx, -0.02, cz]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow material={mats[i]}>
            <planeGeometry args={[x1 - x0, y1 - y0]} />
          </mesh>
        )
      })}
    </group>
  )
}

/** Sea with a shore→deep colour gradient and two layers of animated ripples. */
export function Sea({ cfg, basinWater }: { cfg: FacilitySceneConfig; basinWater: THREE.MeshStandardMaterial[] }) {
  const tex = useTexture(`${TEX}water_normal.jpg`)
  const shore = cfg.seaX ?? 0

  const { geom, mat, t1, t2, tb } = useMemo(() => {
    // columns in Blender X with shallow→deep colours (vertex colours)
    const cols: [number, string][] = [
      [cfg.ground[0] - 50, '#58c9c2'], [shore + 2, '#58c9c2'], [shore + 35, '#3bb3b7'],
      [shore + 140, '#2392a6'], [shore + 520, '#176f8e'], [shore + 8000, '#105874'],
    ]
    const ys = [-8000, 8000]
    const pos: number[] = []; const col: number[] = []; const idx: number[] = []
    const c = new THREE.Color()
    for (const [x, hex] of cols) {
      for (const y of ys) {
        const [tx, , tz] = b2t([x, y, 0])
        pos.push(tx, -0.8, tz)
        c.set(hex).convertSRGBToLinear()
        col.push(c.r, c.g, c.b)
      }
    }
    for (let i = 0; i < cols.length - 1; i++) {
      const a = i * 2, b = a + 1, d = a + 2, e = a + 3
      idx.push(a, d, b, b, d, e)
    }
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
    g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3))
    g.setIndex(idx)
    g.computeVertexNormals()
    // normals must face up regardless of winding after the axis flip
    const n = g.getAttribute('normal') as THREE.BufferAttribute
    for (let i = 0; i < n.count; i++) n.setXYZ(i, 0, 1, 0)
    // uv in metres for the ripple maps
    const uv: number[] = []
    for (let i = 0; i < pos.length; i += 3) uv.push(pos[i] / 40, pos[i + 2] / 40)
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2))

    const t1 = tex.clone(); const t2 = tex.clone(); const tb = tex.clone()
    for (const t of [t1, t2, tb]) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.needsUpdate = true }
    t2.repeat.set(0.37, 0.37)
    tb.repeat.set(6, 6)
    const mat = new THREE.MeshPhysicalMaterial({
      vertexColors: true,
      roughness: 0.06,
      metalness: 0.0,
      normalMap: t1,
      normalScale: new THREE.Vector2(0.55, 0.55),
      clearcoat: 1,
      clearcoatRoughness: 0.03,
      clearcoatNormalMap: t2,
      clearcoatNormalScale: new THREE.Vector2(0.35, 0.35),
      envMapIntensity: 1.25,
      side: THREE.DoubleSide,
    })
    return { geom: g, mat, t1, t2, tb }
  }, [tex, shore, cfg.ground])

  useLayoutEffect(() => {
    for (const m of basinWater) {
      m.normalMap = tb
      m.normalScale = new THREE.Vector2(0.4, 0.4)
      m.needsUpdate = true
    }
  }, [basinWater, tb])

  useFrame((_, dt) => {
    t1.offset.x += dt * 0.0045; t1.offset.y += dt * 0.0021
    t2.offset.x -= dt * 0.0016; t2.offset.y += dt * 0.0027
    tb.offset.x += dt * 0.02; tb.offset.y -= dt * 0.013
  })

  return <mesh geometry={geom} material={mat} receiveShadow />
}
