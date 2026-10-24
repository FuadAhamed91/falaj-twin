// Deterministic, scripted attack scenarios. Same scenario → same stages every run.
// These are SIMULATED. They do not reproduce the real facilities' behaviour.
import type { Scenario } from './types'

/* Scenario A — Suspicious remote access escalating toward the pump PLC (hero). */
export const scenarioTaweelah: Scenario = {
  id: 'scn-taweelah-a',
  facilityId: 'taweelah',
  code: 'A',
  name: 'Suspicious Remote Access → Pump Disruption',
  nameAr: 'وصول مشبوه عن بُعد ← تعطيل المضخات',
  summary:
    'An anomalous remote login reaches the office network and moves laterally toward the OT pump controller, aiming to disrupt product-water delivery.',
  summaryAr:
    'عملية دخول غير طبيعية عن بُعد تصل إلى الشبكة المكتبية وتتحرك نحو وحدة التحكم في المضخات بهدف تعطيل ضخ المياه.',
  path: ['tw-ws-remote', 'tw-fw-it', 'tw-scada', 'tw-plc-pump', 'tw-pump-1', 'tw-tank'],
  targetNodeId: 'tw-plc-pump',
  durationSec: 30,
  stages: [
    {
      id: 's-a1', order: 1, kind: 'initial-access', nodeId: 'tw-ws-remote', mitre: 'T0883',
      title: 'Anomalous remote login', titleAr: 'تسجيل دخول غير طبيعي',
      evidence: 'VPN login from an unrecognised ASN at 03:14 local, outside maintenance window, no MFA challenge completed.',
      evidenceAr: 'دخول VPN من مصدر غير معروف خارج نافذة الصيانة ودون إكمال المصادقة الثنائية.',
      at: 4,
      impact: { nodeId: 'tw-ws-remote', state: 'compromised', consequence: 'Foothold on the remote-access gateway.', consequenceAr: 'موطئ قدم على بوابة الوصول عن بُعد.' },
    },
    {
      id: 's-a2', order: 2, kind: 'lateral', nodeId: 'tw-fw-it', mitre: 'T0886',
      title: 'Pivot through IT/DMZ', titleAr: 'تحرك عبر IT/DMZ',
      evidence: 'East-west connection from gateway to the historian over an unusual port; credential reuse observed.',
      evidenceAr: 'اتصال جانبي من البوابة إلى المؤرخ عبر منفذ غير معتاد مع إعادة استخدام بيانات الاعتماد.',
      at: 10,
      impact: { nodeId: 'tw-fw-it', state: 'alert', consequence: 'Segmentation boundary probed.', consequenceAr: 'تم اختبار حدود العزل.' },
    },
    {
      id: 's-a3', order: 3, kind: 'lateral', nodeId: 'tw-scada', mitre: 'T0859',
      title: 'Reach SCADA server', titleAr: 'الوصول إلى خادم سكادا',
      evidence: 'OPC-UA session opened to the SCADA server from a DMZ host that never initiates control sessions.',
      evidenceAr: 'جلسة OPC-UA إلى خادم سكادا من مضيف لا يبدأ عادةً جلسات تحكم.',
      at: 17,
      impact: { nodeId: 'tw-scada', state: 'alert', consequence: 'Attacker can enumerate controllers.', consequenceAr: 'يمكن للمهاجم حصر وحدات التحكم.' },
    },
    {
      id: 's-a4', order: 4, kind: 'impact', nodeId: 'tw-plc-pump', mitre: 'T0831',
      title: 'Command high-pressure pump PLC', titleAr: 'أمر إلى PLC المضخات',
      evidence: 'Unscheduled write to the pump PLC setpoint register; command origin inconsistent with the control room.',
      evidenceAr: 'كتابة غير مجدولة إلى سجل ضبط PLC المضخة من مصدر لا يتوافق مع غرفة التحكم.',
      at: 24,
      impact: {
        nodeId: 'tw-pump-1', state: 'offline',
        metric: { key: 'supply', to: 0, unit: '%', label: 'Product-water supply', labelAr: 'إمداد المياه المنتجة' },
        consequence: 'High-pressure pump tripped — simulated water-supply disruption downstream.',
        consequenceAr: 'توقّف مضخة الضغط العالي — تعطّل محاكى في إمداد المياه.',
      },
    },
  ],
}

/* Scenario B — Unauthorised control-parameter write at the hospital HVAC. */
export const scenarioCleveland: Scenario = {
  id: 'scn-cleveland-b',
  facilityId: 'cleveland-clinic',
  code: 'B',
  name: 'Unauthorised Control Write → Clinical HVAC',
  nameAr: 'كتابة تحكم غير مصرّح بها ← تكييف سريري',
  summary:
    'A tampered setpoint write targets the operating-theatre air-handling unit, which must hold positive pressure.',
  summaryAr:
    'محاولة كتابة ضبط غير مصرّح بها تستهدف وحدة مناولة الهواء لغرف العمليات التي يجب أن تبقى تحت ضغط موجب.',
  path: ['cc-ws', 'cc-fw', 'cc-bms', 'cc-plc-hvac', 'cc-ahu'],
  targetNodeId: 'cc-plc-hvac',
  durationSec: 26,
  stages: [
    {
      id: 's-b1', order: 1, kind: 'initial-access', nodeId: 'cc-ws', mitre: 'T0817',
      title: 'Compromised facilities workstation', titleAr: 'محطة عمل مُخترقة',
      evidence: 'Macro-enabled attachment spawns an outbound beacon from the facilities VLAN.',
      evidenceAr: 'مرفق يحتوي ماكرو يُطلق اتصالاً خارجياً من شبكة المرافق.',
      at: 4,
      impact: { nodeId: 'cc-ws', state: 'compromised' },
    },
    {
      id: 's-b2', order: 2, kind: 'lateral', nodeId: 'cc-bms', mitre: 'T0886',
      title: 'Reach BMS server', titleAr: 'الوصول إلى خادم إدارة المبنى',
      evidence: 'BACnet write service invoked from a host with no prior BMS role.',
      evidenceAr: 'استدعاء خدمة كتابة BACnet من مضيف بلا دور سابق.',
      at: 12,
      impact: { nodeId: 'cc-bms', state: 'alert' },
    },
    {
      id: 's-b3', order: 3, kind: 'impact', nodeId: 'cc-plc-hvac', mitre: 'T0836',
      title: 'Modify HVAC setpoint', titleAr: 'تعديل ضبط التكييف',
      evidence: 'Theatre AHU pressure setpoint driven below safe threshold; change bypasses operator panel.',
      evidenceAr: 'خفض ضبط ضغط وحدة الهواء دون الحد الآمن متجاوزاً لوحة المشغل.',
      at: 20,
      impact: {
        nodeId: 'cc-ahu', state: 'alert',
        metric: { key: 'pressure', to: -2, unit: 'Pa', label: 'Theatre differential pressure', labelAr: 'فرق الضغط' },
        consequence: 'Simulated loss of positive pressure in a critical clinical space.',
        consequenceAr: 'فقدان محاكى للضغط الموجب في مساحة سريرية حرجة.',
      },
    },
  ],
}

/* Scenario C — Indicator detected at Taweelah, shared, and matched elsewhere. */
export const scenarioDewa: Scenario = {
  id: 'scn-dewa-c',
  facilityId: 'dewa-nad-hessa',
  code: 'C',
  name: 'Shared Indicator → Substation Exposure Check',
  nameAr: 'مؤشر مُشترك ← فحص تعرّض المحطة',
  summary:
    'A threat indicator created from the water-plant incident is distributed via the SOC hub; the substation inventory is checked for the same exposure.',
  summaryAr:
    'مؤشر تهديد مُنشأ من حادثة محطة المياه يُوزَّع عبر مركز العمليات، ويُفحص مخزون المحطة بحثاً عن التعرّض ذاته.',
  path: ['dw-ws', 'dw-fw', 'dw-gw', 'dw-ied-prot'],
  targetNodeId: 'dw-ied-prot',
  durationSec: 22,
  stages: [
    {
      id: 's-c1', order: 1, kind: 'recon', nodeId: 'dw-ws', mitre: 'T0865',
      title: 'Matched indicator received', titleAr: 'استلام مؤشر مطابق',
      evidence: 'STIX indicator (attacker infrastructure + exploited weakness) matches the station gateway software baseline.',
      evidenceAr: 'مؤشر STIX يطابق خط أساس برمجيات بوابة المحطة.',
      at: 5,
      impact: { nodeId: 'dw-gw', state: 'watch', consequence: 'Potential exposure flagged — not a confirmed compromise.', consequenceAr: 'تم رصد تعرّض محتمل — دون تأكيد اختراق.' },
    },
    {
      id: 's-c2', order: 2, kind: 'recon', nodeId: 'dw-ied-prot', mitre: 'T0888',
      title: 'Protection IED exposure check', titleAr: 'فحص تعرّض جهاز الحماية',
      evidence: 'Line-protection IED runs a firmware version within the indicated affected range.',
      evidenceAr: 'جهاز حماية الخط يعمل بإصدار ضمن النطاق المتأثر.',
      at: 13,
      impact: { nodeId: 'dw-ied-prot', state: 'watch', consequence: 'Prioritised for patching — proactive, pre-incident.', consequenceAr: 'أولوية للتحديث — إجراء استباقي قبل وقوع الحادث.' },
    },
  ],
}

export const scenarios: Record<string, Scenario> = {
  taweelah: scenarioTaweelah,
  'cleveland-clinic': scenarioCleveland,
  'dewa-nad-hessa': scenarioDewa,
}

export function getScenario(facilityId: string): Scenario {
  const s = scenarios[facilityId]
  if (!s) throw new Error(`No scenario for facility: ${facilityId}`)
  return s
}
