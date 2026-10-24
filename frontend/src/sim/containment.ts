// Catalog of simulated defensive actions. Each REQUIRES explicit operator
// approval in the UI before the engine applies it. The system never executes
// a response on its own.
import type { ContainmentAction } from './types'

export const CONTAINMENTS: Record<string, ContainmentAction[]> = {
  taweelah: [
    {
      id: 'ct-isolate-gw',
      label: 'Isolate remote-access gateway',
      labelAr: 'عزل بوابة الوصول عن بُعد',
      nodeId: 'tw-ws-remote',
      isolatesEdge: ['tw-ws-remote', 'tw-fw-it'],
      description: 'Drop the compromised VPN session and block the gateway at the IT/DMZ firewall.',
      descriptionAr: 'إنهاء جلسة VPN المخترقة وحجب البوابة عند جدار IT/DMZ.',
      requiresApproval: true,
    },
    {
      id: 'ct-writeprotect-pump',
      label: 'Engage pump-PLC write-protect',
      labelAr: 'تفعيل حماية الكتابة لـ PLC المضخات',
      nodeId: 'tw-plc-pump',
      isolatesEdge: ['tw-scada', 'tw-plc-pump'],
      description: 'Place the high-pressure pump PLC in key-switch write-protect so setpoint writes are refused.',
      descriptionAr: 'وضع PLC المضخات في وضع حماية الكتابة لرفض أوامر الضبط.',
      requiresApproval: true,
    },
  ],
  'cleveland-clinic': [
    {
      id: 'ct-isolate-ws',
      label: 'Quarantine facilities workstation',
      labelAr: 'عزل محطة عمل المرافق',
      nodeId: 'cc-ws',
      isolatesEdge: ['cc-ws', 'cc-fw'],
      description: 'Network-quarantine the beaconing workstation at the IT/OT firewall.',
      descriptionAr: 'عزل محطة العمل عند جدار IT/OT.',
      requiresApproval: true,
    },
    {
      id: 'ct-lock-hvac',
      label: 'Lock HVAC setpoints',
      labelAr: 'قفل ضبط التكييف',
      nodeId: 'cc-plc-hvac',
      isolatesEdge: ['cc-bms', 'cc-plc-hvac'],
      description: 'Reject remote setpoint changes to the theatre AHU pending manual review.',
      descriptionAr: 'رفض تغييرات الضبط عن بُعد لوحدة الهواء حتى المراجعة اليدوية.',
      requiresApproval: true,
    },
  ],
  'dewa-nad-hessa': [
    {
      id: 'ct-patch-ied',
      label: 'Prioritise protection-IED patch',
      labelAr: 'أولوية تحديث جهاز الحماية',
      nodeId: 'dw-ied-prot',
      description: 'Schedule the matched-firmware IED for an out-of-cycle patch window (proactive).',
      descriptionAr: 'جدولة تحديث استباقي لجهاز الحماية المطابق.',
      requiresApproval: true,
    },
  ],
}

export function getContainments(facilityId: string): ContainmentAction[] {
  return CONTAINMENTS[facilityId] ?? []
}
