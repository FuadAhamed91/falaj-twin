// Bilingual UI strings (EN/AR). Facility/scenario content carries its own
// *Ar fields in the sim data; this covers chrome, labels and the assistant.
export type Lang = 'en' | 'ar'

export const STRINGS = {
  'app.name': { en: 'FALAJ Twin', ar: 'فلج توين' },
  'app.tagline': { en: 'Caught Once. Warned Everywhere.', ar: 'يُكتشف مرة. يُنذر في كل مكان.' },
  'app.sub': { en: 'Simulated OT cyber digital twin · UAE essential services', ar: 'توأم رقمي محاكى لأمن الأنظمة الصناعية · خدمات حيوية إماراتية' },

  'nav.overview': { en: 'National Overview', ar: 'النظرة الوطنية' },
  'nav.twin': { en: 'Digital Twin', ar: 'التوأم الرقمي' },
  'nav.facilities': { en: 'Facilities', ar: 'المنشآت' },
  'nav.threat': { en: 'Threat Intelligence', ar: 'استخبارات التهديدات' },
  'nav.simulation': { en: 'Attack Simulation', ar: 'محاكاة الهجوم' },
  'nav.response': { en: 'Incident Response', ar: 'الاستجابة للحوادث' },
  'nav.analytics': { en: 'Analytics & Reports', ar: 'التحليلات والتقارير' },
  'nav.settings': { en: 'Settings', ar: 'الإعدادات' },

  'sector.water': { en: 'Water', ar: 'المياه' },
  'sector.healthcare': { en: 'Healthcare', ar: 'الرعاية الصحية' },
  'sector.power': { en: 'Power', ar: 'الطاقة' },

  'badge.realLocation': { en: 'Real-world location', ar: 'موقع حقيقي' },
  'badge.referenceArch': { en: 'Reference architecture', ar: 'هندسة مرجعية' },
  'badge.synthetic': { en: 'Synthetic telemetry', ar: 'قياسات اصطناعية' },
  'badge.simAttack': { en: 'Simulated attack', ar: 'هجوم محاكى' },
  'badge.demoEnv': { en: 'Demonstration environment', ar: 'بيئة عرض توضيحي' },
  'badge.conceptual': { en: 'Conceptual hub', ar: 'مركز افتراضي' },

  'ctrl.start': { en: 'Start', ar: 'بدء' },
  'ctrl.pause': { en: 'Pause', ar: 'إيقاف مؤقت' },
  'ctrl.resume': { en: 'Resume', ar: 'استئناف' },
  'ctrl.reset': { en: 'Reset', ar: 'إعادة ضبط' },
  'ctrl.replay': { en: 'Replay', ar: 'إعادة التشغيل' },
  'ctrl.demo': { en: 'Run Demo', ar: 'تشغيل العرض' },
  'ctrl.stopDemo': { en: 'Stop Demo', ar: 'إيقاف العرض' },

  'mode.baseline': { en: 'Without FALAJ', ar: 'بدون فلج' },
  'mode.defended': { en: 'With FALAJ', ar: 'مع فلج' },

  'phase.idle': { en: 'Standing by', ar: 'في وضع الاستعداد' },
  'phase.running': { en: 'Scenario running', ar: 'المحاكاة قيد التشغيل' },
  'phase.paused': { en: 'Paused', ar: 'متوقف مؤقتاً' },
  'phase.contained': { en: 'Contained', ar: 'تم الاحتواء' },
  'phase.impacted': { en: 'Impact reached', ar: 'تحقّق الأثر' },
  'phase.complete': { en: 'Run complete', ar: 'اكتمل التشغيل' },

  'twin.view.physical': { en: 'Physical', ar: 'المادي' },
  'twin.view.cyber': { en: 'Cyber', ar: 'السيبراني' },
  'twin.zones': { en: 'Network zones', ar: 'مناطق الشبكة' },
  'twin.attackPath': { en: 'Attack path', ar: 'مسار الهجوم' },
  'twin.selectHint': { en: 'Select equipment to inspect', ar: 'اختر معدة للفحص' },

  'panel.assetStatus': { en: 'Asset Status', ar: 'حالة الأصل' },
  'panel.timeline': { en: 'Incident Timeline', ar: 'الجدول الزمني للحادث' },
  'panel.detections': { en: 'Detections', ar: 'الاكتشافات' },
  'panel.prediction': { en: 'Prediction', ar: 'التنبؤ' },
  'panel.leadTime': { en: 'Detection lead time', ar: 'زمن الإنذار المبكر' },
  'panel.affected': { en: 'Affected assets', ar: 'الأصول المتأثرة' },
  'panel.confidence': { en: 'confidence', ar: 'ثقة' },
  'panel.predictedTarget': { en: 'Predicted target', ar: 'الهدف المتوقع' },
  'panel.eta': { en: 'ETA', ar: 'الوقت المتوقع' },
  'panel.estimateNote': { en: 'Scenario-based estimate — not a validated forecast.', ar: 'تقدير قائم على السيناريو — ليس تنبؤاً مُتحقَّقاً منه.' },

  'resp.recommended': { en: 'Recommended action', ar: 'الإجراء الموصى به' },
  'resp.approve': { en: 'Approve & apply', ar: 'اعتماد وتطبيق' },
  'resp.approvalNeeded': { en: 'Operator approval required', ar: 'مطلوب موافقة المشغّل' },
  'resp.applied': { en: 'Applied', ar: 'تم التطبيق' },
  'resp.awaiting': { en: 'Awaiting operator approval', ar: 'بانتظار موافقة المشغّل' },

  'assistant.title': { en: 'FALAJ Assistant', ar: 'مساعد فلج' },
  'assistant.ask': { en: 'Ask about this incident…', ar: 'اسأل عن هذا الحادث…' },
  'assistant.grounded': { en: 'Grounded in simulation state', ar: 'مستند إلى حالة المحاكاة' },
  'assistant.q.what': { en: 'What happened?', ar: 'ماذا حدث؟' },
  'assistant.q.evidence': { en: 'What triggered detection?', ar: 'ما الذي أطلق الاكتشاف؟' },
  'assistant.q.affected': { en: 'Which assets are affected?', ar: 'ما الأصول المتأثرة؟' },
  'assistant.q.predict': { en: 'What does FALAJ predict?', ar: 'بماذا يتنبأ فلج؟' },
  'assistant.q.recommend': { en: 'What should we do?', ar: 'ماذا نفعل؟' },
  'assistant.q.uncertain': { en: 'What is uncertain?', ar: 'ما غير المؤكد؟' },

  'stix.title': { en: 'Cross-Sector Threat Sharing', ar: 'تبادل التهديدات بين القطاعات' },
  'stix.indicator': { en: 'Threat Indicator (STIX 2.1)', ar: 'مؤشر تهديد (STIX 2.1)' },
  'stix.share': { en: 'Share to National SOC', ar: 'مشاركة مع المركز الوطني' },
  'stix.match': { en: 'Relevant match', ar: 'تطابق ذو صلة' },
  'stix.exposure': { en: 'Potential exposure', ar: 'تعرّض محتمل' },
  'stix.nomatch': { en: 'No match found', ar: 'لا يوجد تطابق' },
  'stix.investigate': { en: 'Investigate further', ar: 'يتطلب تحقيقاً' },
  'stix.matchNote': { en: 'A match flags exposure — not confirmed compromise.', ar: 'التطابق يشير إلى تعرّض — وليس اختراقاً مؤكداً.' },

  'cmp.title': { en: 'Before & After FALAJ', ar: 'قبل وبعد فلج' },
  'cmp.without': { en: 'Without FALAJ', ar: 'بدون فلج' },
  'cmp.with': { en: 'With FALAJ', ar: 'مع فلج' },
  'cmp.supplyLost': { en: 'Water supply disrupted', ar: 'تعطّل إمداد المياه' },
  'cmp.blocked': { en: 'Attack contained', ar: 'تم احتواء الهجوم' },

  'disc.short': { en: 'Simulated. No access to real facility systems.', ar: 'محاكاة. لا وصول إلى أنظمة المنشآت الحقيقية.' },
  'disc.full': {
    en: 'FALAJ Twin is a demonstration. Facility locations and exteriors are real and public; all cyber assets, telemetry, attacks, detections and outcomes are synthetic. No real monitoring, control, or integration with the named facilities or any National SOC is implied.',
    ar: 'فلج توين عرض توضيحي. مواقع المنشآت وواجهاتها حقيقية وعامة؛ أما جميع الأصول السيبرانية والقياسات والهجمات والاكتشافات والنتائج فهي اصطناعية. لا يوجد أي مراقبة أو تحكم أو تكامل فعلي مع المنشآت المذكورة أو أي مركز عمليات وطني.',
  },
} as const

export type StringKey = keyof typeof STRINGS
