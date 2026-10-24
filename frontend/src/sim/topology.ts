// Synthetic network topologies for the three facilities.
// Office(IT) → DMZ → OT → Controller → field device, per the brief.
import type { FacilityTopology, SimNode, SimEdge } from './types'

function net(
  facilityId: string,
  sector: FacilityTopology['sector'],
  nodes: SimNode[],
  edges: SimEdge[],
): FacilityTopology {
  return { facilityId, sector, nodes, edges }
}

/* ------------------------------------------------------------------ */
/* Taweelah RO desalination plant (hero) — richest synthetic topology  */
/* scenePos is a local metres frame matching the 3D plant layout.      */
/* ------------------------------------------------------------------ */
export const taweelahTopology = net(
  'taweelah',
  'water',
  [
    { id: 'tw-ws-eng', label: 'Engineering Workstation', labelAr: 'محطة عمل الهندسة', kind: 'workstation', zone: 'IT', scenePos: [-58, 6, -34], controls: ['AD auth'] },
    { id: 'tw-ws-remote', label: 'Remote Access Gateway', labelAr: 'بوابة الوصول عن بعد', kind: 'server', zone: 'IT', scenePos: [-58, 6, -20], controls: ['VPN', 'MFA (optional)'] },
    { id: 'tw-fw-it', label: 'IT/DMZ Firewall', labelAr: 'جدار حماية IT/DMZ', kind: 'firewall', zone: 'DMZ', scenePos: [-34, 7, -27], controls: ['segmentation'] },
    { id: 'tw-hist', label: 'Process Historian', labelAr: 'مؤرخ العمليات', kind: 'historian', zone: 'DMZ', scenePos: [-34, 6, -14] },
    { id: 'tw-fw-ot', label: 'OT Firewall / Data Diode', labelAr: 'جدار حماية OT', kind: 'firewall', zone: 'OT', scenePos: [-10, 7, -20], controls: ['segmentation', 'unidirectional (optional)'] },
    { id: 'tw-scada', label: 'SCADA Server', labelAr: 'خادم سكادا', kind: 'server', zone: 'OT', scenePos: [-10, 6, -6] },
    { id: 'tw-hmi', label: 'Control Room HMI', labelAr: 'واجهة غرفة التحكم', kind: 'hmi', zone: 'CONTROL', scenePos: [2, 6, 2], controls: ['operator login'] },
    { id: 'tw-plc-intake', label: 'PLC — Seawater Intake', labelAr: 'PLC — مأخذ البحر', kind: 'plc', zone: 'CONTROL', scenePos: [20, 4, -24], controls: ['write-protect (optional)'] },
    { id: 'tw-plc-ro', label: 'PLC — RO Trains', labelAr: 'PLC — وحدات التناضح', kind: 'plc', zone: 'CONTROL', scenePos: [26, 4, 6], critical: true, controls: ['write-protect (optional)'] },
    { id: 'tw-plc-pump', label: 'PLC — High-Pressure Pumps', labelAr: 'PLC — المضخات', kind: 'plc', zone: 'CONTROL', scenePos: [40, 4, 20], critical: true, controls: ['write-protect (optional)'] },
    { id: 'tw-pump-1', label: 'HP Pump Station', labelAr: 'محطة الضخ', kind: 'pump', zone: 'FIELD', scenePos: [52, 2, 26], critical: true },
    { id: 'tw-valve-prod', label: 'Product-Water Valve', labelAr: 'صمام المياه المنتجة', kind: 'valve', zone: 'FIELD', scenePos: [48, 2, 40], critical: true },
    { id: 'tw-tank', label: 'Potable Storage Reservoir', labelAr: 'خزان المياه', kind: 'tank', zone: 'FIELD', scenePos: [62, 3, 44], critical: true },
    { id: 'tw-sensor-flow', label: 'Product Flow Sensor', labelAr: 'مستشعر التدفق', kind: 'sensor', zone: 'FIELD', scenePos: [56, 2, 38] },
  ],
  [
    { from: 'tw-ws-eng', to: 'tw-fw-it', protocol: 'RDP' },
    { from: 'tw-ws-remote', to: 'tw-fw-it', protocol: 'VPN' },
    { from: 'tw-fw-it', to: 'tw-hist', protocol: 'SQL', guarded: true },
    { from: 'tw-fw-it', to: 'tw-fw-ot', protocol: 'OPC-UA', guarded: true },
    { from: 'tw-hist', to: 'tw-fw-ot', protocol: 'OPC-UA' },
    { from: 'tw-fw-ot', to: 'tw-scada', protocol: 'OPC-UA', guarded: true },
    { from: 'tw-scada', to: 'tw-hmi', protocol: 'proprietary' },
    { from: 'tw-scada', to: 'tw-plc-intake', protocol: 'Modbus/TCP' },
    { from: 'tw-scada', to: 'tw-plc-ro', protocol: 'Modbus/TCP' },
    { from: 'tw-scada', to: 'tw-plc-pump', protocol: 'Modbus/TCP' },
    { from: 'tw-plc-pump', to: 'tw-pump-1', protocol: 'hardwired' },
    { from: 'tw-plc-ro', to: 'tw-valve-prod', protocol: 'hardwired' },
    { from: 'tw-pump-1', to: 'tw-tank', protocol: 'process' },
    { from: 'tw-valve-prod', to: 'tw-tank', protocol: 'process' },
    { from: 'tw-sensor-flow', to: 'tw-scada', protocol: 'telemetry' },
  ],
)

/* ------------------------------------------------------------------ */
/* Cleveland Clinic Abu Dhabi — building-services OT (lighter)          */
/* ------------------------------------------------------------------ */
export const clevelandTopology = net(
  'cleveland-clinic',
  'healthcare',
  [
    { id: 'cc-ws', label: 'Facilities Workstation', labelAr: 'محطة عمل المرافق', kind: 'workstation', zone: 'IT', controls: ['AD auth'] },
    { id: 'cc-fw', label: 'IT/OT Firewall', labelAr: 'جدار الحماية', kind: 'firewall', zone: 'DMZ', controls: ['segmentation'] },
    { id: 'cc-bms', label: 'Building Mgmt Server (BMS)', labelAr: 'خادم إدارة المبنى', kind: 'server', zone: 'OT' },
    { id: 'cc-hmi', label: 'BMS Operator Panel', labelAr: 'لوحة المشغل', kind: 'hmi', zone: 'CONTROL', controls: ['operator login'] },
    { id: 'cc-plc-hvac', label: 'PLC — Clinical HVAC', labelAr: 'PLC — التكييف', kind: 'plc', zone: 'CONTROL', critical: true, controls: ['write-protect (optional)'] },
    { id: 'cc-plc-power', label: 'ATS — Backup Power', labelAr: 'نظام الطاقة الاحتياطية', kind: 'rtu', zone: 'CONTROL', critical: true },
    { id: 'cc-ahu', label: 'Operating-Theatre AHU', labelAr: 'وحدة مناولة الهواء', kind: 'valve', zone: 'FIELD', critical: true },
    { id: 'cc-sensor', label: 'Cleanroom Pressure Sensor', labelAr: 'مستشعر الضغط', kind: 'sensor', zone: 'FIELD' },
  ],
  [
    { from: 'cc-ws', to: 'cc-fw', protocol: 'HTTPS' },
    { from: 'cc-fw', to: 'cc-bms', protocol: 'BACnet', guarded: true },
    { from: 'cc-bms', to: 'cc-hmi', protocol: 'proprietary' },
    { from: 'cc-bms', to: 'cc-plc-hvac', protocol: 'BACnet/IP' },
    { from: 'cc-bms', to: 'cc-plc-power', protocol: 'Modbus/TCP' },
    { from: 'cc-plc-hvac', to: 'cc-ahu', protocol: 'hardwired' },
    { from: 'cc-sensor', to: 'cc-bms', protocol: 'telemetry' },
  ],
)

/* ------------------------------------------------------------------ */
/* DEWA Nad Hessa substation — IEC 61850 style (lighter)               */
/* ------------------------------------------------------------------ */
export const dewaTopology = net(
  'dewa-nad-hessa',
  'power',
  [
    { id: 'dw-ws', label: 'Protection Engineer WS', labelAr: 'محطة عمل الحماية', kind: 'workstation', zone: 'IT', controls: ['AD auth'] },
    { id: 'dw-fw', label: 'Station Firewall', labelAr: 'جدار محطة', kind: 'firewall', zone: 'DMZ', controls: ['segmentation'] },
    { id: 'dw-gw', label: 'Station Gateway (61850)', labelAr: 'بوابة المحطة', kind: 'server', zone: 'OT' },
    { id: 'dw-hmi', label: 'Station HMI', labelAr: 'واجهة المحطة', kind: 'hmi', zone: 'CONTROL', controls: ['operator login'] },
    { id: 'dw-ied-prot', label: 'IED — Line Protection', labelAr: 'جهاز حماية الخط', kind: 'rtu', zone: 'CONTROL', critical: true, controls: ['write-protect (optional)'] },
    { id: 'dw-ied-bus', label: 'IED — Busbar Control', labelAr: 'جهاز قضيب التوزيع', kind: 'rtu', zone: 'CONTROL', critical: true },
    { id: 'dw-breaker', label: '132 kV Breaker', labelAr: 'قاطع 132 ك.ف', kind: 'breaker', zone: 'FIELD', critical: true },
    { id: 'dw-tx', label: '132/11 kV Transformer', labelAr: 'محول 132/11', kind: 'transformer', zone: 'FIELD', critical: true },
  ],
  [
    { from: 'dw-ws', to: 'dw-fw', protocol: 'HTTPS' },
    { from: 'dw-fw', to: 'dw-gw', protocol: 'MMS', guarded: true },
    { from: 'dw-gw', to: 'dw-hmi', protocol: 'MMS' },
    { from: 'dw-gw', to: 'dw-ied-prot', protocol: 'IEC 61850 MMS' },
    { from: 'dw-gw', to: 'dw-ied-bus', protocol: 'IEC 61850 MMS' },
    { from: 'dw-ied-prot', to: 'dw-breaker', protocol: 'GOOSE' },
    { from: 'dw-ied-bus', to: 'dw-tx', protocol: 'hardwired' },
  ],
)

export const topologies: Record<string, FacilityTopology> = {
  taweelah: taweelahTopology,
  'cleveland-clinic': clevelandTopology,
  'dewa-nad-hessa': dewaTopology,
}

export function getTopology(id: string): FacilityTopology {
  const t = topologies[id]
  if (!t) throw new Error(`Unknown facility topology: ${id}`)
  return t
}
