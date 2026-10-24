// Per-facility scene configuration for the realistic 3D twins.
// Positions are authored in Blender metres (X east, Y north, Z up) — the same
// frame as blender/falaj/*.py — and converted to three.js with b2t().
export type Vec3 = [number, number, number]

/** Blender (X east, Y north, Z up) → three.js (x, y up, z south). */
export const b2t = ([x, y, z]: Vec3): Vec3 => [x, z, -y]

export interface CameraPreset {
  id: string
  label: string
  labelAr: string
  pos: Vec3 // Blender frame
  target: Vec3 // Blender frame
}

export interface FacilitySceneConfig {
  id: string
  glb: string
  /** Blender-frame bounds of the modelled ground [xMin, xMax, yMin, yMax]. */
  ground: [number, number, number, number]
  /** Blender-frame X of the shoreline (sea to the east), or null. */
  seaX: number | null
  /** Optional water channel in Blender Y range [y0, y1] (inside ground X range). */
  channelY?: [number, number]
  /** Sun direction (Blender frame, towards the sun). */
  sun: Vec3
  /** Half-extent of the shadow frustum around shadowCenter (metres). */
  shadowExtent: number
  shadowCenter: Vec3
  presets: CameraPreset[]
  /** Attack-path routing: for each scenario hop "from>to", Blender-frame waypoints. */
  routes: Record<string, Vec3[]>
  /** Label shown at the scenario entry / target, like the reference callouts. */
  entryLabel: { en: string; ar: string }
  targetLabel: { en: string; ar: string }
  maxDistance: number
}

const BASE = import.meta.env.BASE_URL

export const SCENES: Record<string, FacilitySceneConfig> = {
  taweelah: {
    id: 'taweelah',
    glb: `${BASE}models/taweelah.glb`,
    ground: [-500, 334, -320, 360],
    seaX: 334,
    channelY: [232, 292],
    sun: [0.62, -0.42, 0.56],
    shadowExtent: 380,
    shadowCenter: [0, -10, 0],
    maxDistance: 1500,
    presets: [
      { id: 'hero', label: 'Plant view', labelAr: 'منظر المحطة', pos: [-10, -360, 205], target: [190, -15, 0] },
      { id: 'overview', label: 'Overview', labelAr: 'نظرة عامة', pos: [-520, -560, 430], target: [0, 0, 0] },
      { id: 'pumps', label: 'Pump station', labelAr: 'محطة الضخ', pos: [205, -30, 48], target: [270, 40, 2] },
      { id: 'tanks', label: 'Storage tanks', labelAr: 'خزانات المياه', pos: [95, -250, 85], target: [178, -128, 6] },
      { id: 'halls', label: 'RO halls', labelAr: 'قاعات التناضح', pos: [-120, -110, 120], target: [70, 30, 5] },
      { id: 'pretreat', label: 'Pretreatment', labelAr: 'المعالجة الأولية', pos: [-330, 40, 105], target: [-150, 176, 0] },
      { id: 'control', label: 'Control building', labelAr: 'مبنى التحكم', pos: [-330, -300, 80], target: [-235, -186, 4] },
      { id: 'intake', label: 'Seawater intake', labelAr: 'مأخذ مياه البحر', pos: [-210, 150, 62], target: [-130, 236, 2] },
    ],
    routes: {
      'tw-ws-remote>tw-fw-it': [[-286, -185, 17], [-286, -203, 1], [-224, -203, 1], [-224, -186, 13]],
      'tw-fw-it>tw-scada': [[-224, -186, 13], [-224, -203, 1], [-197, -203, 1], [-197, -186, 13]],
      'tw-scada>tw-plc-pump': [
        [-197, -186, 13], [-197, -203, 1], [-197, -212, 1], [-90, -212, 1], [-90, -62, 1],
        [226, -62, 1], [226, 63, 1], [241, 63, 1], [241, 63, 13],
      ],
      'tw-plc-pump>tw-pump-1': [[241, 63, 13], [241, 63, 1], [241, 45, 1], [269, 45, 1], [269, 37, 15]],
      'tw-pump-1>tw-tank': [[269, 37, 15], [269, 27, 3], [296, 27, 3], [296, -94, 6], [250, -94, 6], [250, -101, 15], [250, -128, 24]],
      'tw-fw-it>tw-fw-ot': [[-224, -186, 13], [-206, -186, 13]],
      'tw-fw-ot>tw-scada': [[-206, -186, 13], [-197, -186, 13]],
    },
    entryLabel: { en: 'Malicious Access', ar: 'وصول خبيث' },
    targetLabel: { en: 'Target: Pump Station', ar: 'الهدف: محطة الضخ' },
  },
  'cleveland-clinic': {
    id: 'cleveland-clinic',
    glb: `${BASE}models/cleveland-clinic.glb`,
    ground: [-96, 360, -450, 450],
    seaX: -96, // Al Maryah waterfront to the west
    sun: [0.55, -0.4, 0.62],
    shadowExtent: 260,
    shadowCenter: [10, 0, 40],
    maxDistance: 1400,
    presets: [
      { id: 'hero', label: 'Hospital view', labelAr: 'منظر المستشفى', pos: [-230, -210, 150], target: [0, 0, 55] },
      { id: 'overview', label: 'Overview', labelAr: 'نظرة عامة', pos: [-360, -360, 300], target: [20, 0, 20] },
      { id: 'waterfront', label: 'Waterfront', labelAr: 'الواجهة البحرية', pos: [-220, 60, 60], target: [-40, 0, 30] },
      { id: 'helipad', label: 'Cantilever & helipad', labelAr: 'المهبط', pos: [-160, 130, 110], target: [-26, 36, 64] },
      { id: 'rooftop', label: 'Rooftop plant', labelAr: 'معدات السطح', pos: [60, -120, 150], target: [10, -36, 104] },
    ],
    routes: {},
    entryLabel: { en: 'Malicious Access', ar: 'وصول خبيث' },
    targetLabel: { en: 'Target: Clinical HVAC', ar: 'الهدف: التكييف السريري' },
  },
  'dewa-nad-hessa': {
    id: 'dewa-nad-hessa',
    glb: `${BASE}models/dewa-nad-hessa.glb`,
    ground: [-160, 160, -160, 160],
    seaX: null,
    sun: [0.6, -0.42, 0.58],
    shadowExtent: 110,
    shadowCenter: [8, 0, 0],
    maxDistance: 620,
    presets: [
      { id: 'hero', label: 'Substation view', labelAr: 'منظر المحطة', pos: [-95, -95, 72], target: [15, 0, 6] },
      { id: 'overview', label: 'Overview', labelAr: 'نظرة عامة', pos: [-150, -150, 120], target: [0, 0, 0] },
      { id: 'transformers', label: 'Transformer bay', labelAr: 'منطقة المحولات', pos: [95, -60, 38], target: [52, 0, 6] },
      { id: 'entrance', label: 'Entrance', labelAr: 'المدخل', pos: [-80, -20, 22], target: [-28, 6, 6] },
    ],
    routes: {},
    entryLabel: { en: 'Indicator Match', ar: 'تطابق المؤشر' },
    targetLabel: { en: 'Exposure: Protection IED', ar: 'التعرض: جهاز الحماية' },
  },
}

export function sceneConfig(id: string): FacilitySceneConfig {
  return SCENES[id] ?? SCENES.taweelah
}
