// Synthetic STIX 2.1 threat-sharing. Builds a valid-shaped indicator bundle
// from the simulated water-plant incident and matches it against each site's
// synthetic inventory. A match flags EXPOSURE, never confirmed compromise.
// (The backend validates equivalent bundles with the python `stix2` library.)

export type MatchResult = 'match' | 'exposure' | 'nomatch' | 'investigate'

export interface StixObject {
  type: string
  spec_version?: string
  id: string
  created?: string
  modified?: string
  [k: string]: unknown
}
export interface StixBundle {
  type: 'bundle'
  id: string
  objects: StixObject[]
}

// Deterministic pseudo-UUID so the demo bundle is reproducible per inputs.
function uuid(seed: string): string {
  let h = 0
  for (let i = 0; i < seed.length; i++) h = (Math.imul(31, h) + seed.charCodeAt(i)) | 0
  const hex = (n: number) => (n >>> 0).toString(16).padStart(8, '0')
  const a = hex(h), b = hex(Math.imul(h, 2654435761)), c = hex(Math.imul(h ^ 0x9e3779b9, 40503))
  return `${a.slice(0, 8)}-${b.slice(0, 4)}-4${b.slice(4, 7)}-8${c.slice(0, 3)}-${c.slice(3, 8)}${a.slice(0, 4)}`
}

const TS = '2026-10-24T10:24:00.000Z'

/** The synthetic indicator-of-compromise set shared from the water plant. */
export const INDICATOR = {
  attackerIp: '203.0.113.47', // TEST-NET-3 (RFC 5737) — never a real host
  malwareSha256: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
  exploitedWeakness: 'CWE-787 (OPC-UA gateway memory write)',
  affectedSoftware: 'acme-opcua-gw 2.3.x',
}

/** Build a STIX 2.1 bundle: identity (SOC) + indicator + attack-pattern + relationship. */
export function buildBundle(): StixBundle {
  const socId = `identity--${uuid('soc-identity')}`
  const indId = `indicator--${uuid('falaj-indicator-A')}`
  const apId = `attack-pattern--${uuid('ap-remote-access')}`
  const relId = `relationship--${uuid('rel-ind-ap')}`

  const identity: StixObject = {
    type: 'identity', spec_version: '2.1', id: socId, created: TS, modified: TS,
    name: 'FALAJ National SOC (simulated)', identity_class: 'organization',
    description: 'Locally-simulated coordination hub. Not a real National SOC.',
  }
  const indicator: StixObject = {
    type: 'indicator', spec_version: '2.1', id: indId, created: TS, modified: TS,
    name: 'Suspicious OT remote-access toolkit (synthetic)',
    description: 'Synthetic IOC set from the Taweelah scenario. Demonstration only.',
    indicator_types: ['malicious-activity'],
    pattern_type: 'stix',
    pattern: `[ipv4-addr:value = '${INDICATOR.attackerIp}' OR file:hashes.'SHA-256' = '${INDICATOR.malwareSha256}']`,
    valid_from: TS,
    labels: ['ot', 'water', 'synthetic'],
    created_by_ref: socId,
  }
  const attackPattern: StixObject = {
    type: 'attack-pattern', spec_version: '2.1', id: apId, created: TS, modified: TS,
    name: 'Remote Services → Unauthorized Command Message',
    description: 'MITRE ATT&CK for ICS: T0883 (Internet Accessible Device) → T0831 (Manipulation of Control).',
    external_references: [
      { source_name: 'mitre-attack-ics', external_id: 'T0883' },
      { source_name: 'mitre-attack-ics', external_id: 'T0831' },
    ],
  }
  const relationship: StixObject = {
    type: 'relationship', spec_version: '2.1', id: relId, created: TS, modified: TS,
    relationship_type: 'indicates', source_ref: indId, target_ref: apId,
  }
  return { type: 'bundle', id: `bundle--${uuid('falaj-bundle-A')}`, objects: [identity, indicator, attackPattern, relationship] }
}

/* ---- Receiving-site inventories (synthetic) + independent matching ---- */
interface SiteInventory {
  facilityId: string
  software: string[]
  exposedServices: string[]
}
const INVENTORIES: SiteInventory[] = [
  { facilityId: 'cleveland-clinic', software: ['acme-opcua-gw 2.3.1', 'bms-bacnet 4.0'], exposedServices: ['remote-access'] },
  { facilityId: 'dewa-nad-hessa', software: ['acme-opcua-gw 2.2.9', 'iec61850-gw 1.4'], exposedServices: ['remote-access'] },
  { facilityId: 'taweelah', software: ['acme-opcua-gw 2.3.0'], exposedServices: ['remote-access'] },
]

export interface SiteMatch {
  facilityId: string
  result: MatchResult
  reason: string
  reasonAr: string
  recommendation: string
  recommendationAr: string
}

/** Evaluate each receiving site independently against the shared indicator. */
export function matchSites(sourceFacilityId: string): SiteMatch[] {
  const affectedFamily = 'acme-opcua-gw 2.3'
  return INVENTORIES.filter((s) => s.facilityId !== sourceFacilityId).map((s) => {
    const exact = s.software.some((sw) => sw.startsWith(affectedFamily))
    const family = s.software.some((sw) => sw.startsWith('acme-opcua-gw'))
    let result: MatchResult
    if (exact) result = 'match'
    else if (family) result = 'exposure'
    else result = 'nomatch'

    const map: Record<MatchResult, { en: string; ar: string; rec: string; recAr: string }> = {
      match: {
        en: 'Runs the exact affected gateway version in the indicator.',
        ar: 'يشغّل نفس إصدار البوابة المتأثر الوارد في المؤشر.',
        rec: 'Patch the OPC-UA gateway now; block the indicator IP at the perimeter; hunt for the hash.',
        recAr: 'حدّث بوابة OPC-UA فوراً؛ احجب عنوان المؤشر؛ ابحث عن البصمة.',
      },
      exposure: {
        en: 'Runs the same gateway family but a different patch level — potentially exposed.',
        ar: 'يشغّل العائلة ذاتها بإصدار مختلف — تعرّض محتمل.',
        rec: 'Verify version, apply vendor advisory, and add detection for the indicator IP.',
        recAr: 'تحقق من الإصدار، طبّق توصية المورّد، وأضف اكتشافاً لعنوان المؤشر.',
      },
      nomatch: {
        en: 'No matching software or exposed service found.',
        ar: 'لا يوجد برنامج مطابق أو خدمة معرّضة.',
        rec: 'No action required; keep the indicator on watch.',
        recAr: 'لا يلزم إجراء؛ أبقِ المؤشر تحت المراقبة.',
      },
      investigate: {
        en: 'Partial signal — needs investigation.',
        ar: 'إشارة جزئية — تتطلب تحقيقاً.',
        rec: 'Collect gateway inventory and re-evaluate.',
        recAr: 'اجمع مخزون البوابات وأعد التقييم.',
      },
    }
    const m = map[result]
    return { facilityId: s.facilityId, result, reason: m.en, reasonAr: m.ar, recommendation: m.rec, recommendationAr: m.recAr }
  })
}
