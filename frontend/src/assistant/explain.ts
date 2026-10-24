// Deterministic local incident explainer. Grounds every answer ONLY in the
// current simulation world state + scenario + topology. It never invents
// evidence and never executes a response action. (An external LLM could be
// swapped in behind the same interface when properly configured.)
import type { FacilityTopology, Scenario, WorldState } from '../sim'
import type { Lang } from '../i18n/strings'
import { fmtClock } from '../lib/clock'

export type Intent = 'what' | 'evidence' | 'affected' | 'predict' | 'recommend' | 'uncertain'

export interface AssistantAnswer {
  intent: Intent
  text: string
  /** Grounding references: node ids / rule ids / stage ids the answer used. */
  grounding: string[]
}

interface Ctx {
  scenario: Scenario
  topo: FacilityTopology
  world: WorldState
  lang: Lang
  recommendedLabel?: { en: string; ar?: string }
}

const label = (topo: FacilityTopology, id: string, lang: Lang) => {
  const n = topo.nodes.find((x) => x.id === id)
  return (lang === 'ar' && n?.labelAr) || n?.label || id
}

export function answer(intent: Intent, ctx: Ctx): AssistantAnswer {
  const { scenario, topo, world, lang } = ctx
  const ar = lang === 'ar'
  const grounding: string[] = []
  const nm = (id: string) => label(topo, id, lang)

  if (world.phase === 'idle') {
    return {
      intent,
      text: ar
        ? 'لم تبدأ المحاكاة بعد. شغّل السيناريو لأتمكن من الشرح استناداً إلى حالة المحاكاة الفعلية.'
        : 'The scenario has not started yet. Run it and I will explain strictly from the live simulation state.',
      grounding,
    }
  }

  switch (intent) {
    case 'what': {
      const reached = world.reachedStageIds.length
      const stage = world.activeStage
      if (stage) grounding.push(stage.id)
      const head = ar
        ? `السيناريو «${scenario.nameAr ?? scenario.name}» قيد التشغيل (${fmtClock(world.elapsedSec)}).`
        : `Scenario "${scenario.name}" is running (${fmtClock(world.elapsedSec)}).`
      const body = stage
        ? ar
          ? ` آخر مرحلة: ${stage.titleAr ?? stage.title} عند ${nm(stage.nodeId)}.`
          : ` Latest stage: ${stage.title} at ${nm(stage.nodeId)}.`
        : ''
      const prog = ar ? ` اكتملت ${reached} من ${scenario.stages.length} مراحل.` : ` ${reached} of ${scenario.stages.length} stages reached.`
      return { intent, text: head + body + prog, grounding }
    }

    case 'evidence': {
      if (!world.detections.length) {
        return {
          intent,
          text: ar
            ? 'لا توجد اكتشافات في وضع «بدون فلج». فعّل «مع فلج» لتظهر الأدلة المستندة إلى القواعد.'
            : 'No detections in the "Without FALAJ" baseline. Enable "With FALAJ" to see rule-based evidence.',
          grounding,
        }
      }
      const lines = world.detections.map((d) => {
        grounding.push(d.ruleId, d.nodeId)
        return ar
          ? `• ${fmtClock(d.at)} — ${d.messageAr ?? d.message} (${d.ruleId}${d.mitre ? ', ' + d.mitre : ''})`
          : `• ${fmtClock(d.at)} — ${d.message} (${d.ruleId}${d.mitre ? ', ' + d.mitre : ''})`
      })
      return {
        intent,
        text: (ar ? 'الأدلة التي أطلقت الاكتشاف:\n' : 'Evidence that triggered detection:\n') + lines.join('\n'),
        grounding,
      }
    }

    case 'affected': {
      const affected = Object.entries(world.nodeStates).filter(([, s]) => s !== 'nominal')
      if (!affected.length) return { intent, text: ar ? 'لا توجد أصول متأثرة حتى الآن.' : 'No assets are affected yet.', grounding }
      const lines = affected.map(([id, s]) => {
        grounding.push(id)
        return `• ${nm(id)} — ${s}`
      })
      return {
        intent,
        text: (ar ? 'الأصول المتأثرة (محاكاة):\n' : 'Affected assets (simulated):\n') + lines.join('\n'),
        grounding,
      }
    }

    case 'predict': {
      if (!world.prediction) {
        return {
          intent,
          text: ar ? 'لا يوجد تنبؤ متاح بعد (يتطلب اكتشافاً في وضع «مع فلج»).' : 'No prediction yet (requires a detection in "With FALAJ" mode).',
          grounding,
        }
      }
      const p = world.prediction
      grounding.push(p.targetNodeId)
      return {
        intent,
        text: ar
          ? `يقدّر فلج أن الهدف هو ${nm(p.targetNodeId)} خلال ${p.etaSecLow}–${p.etaSecHigh} ثانية (ثقة ${Math.round(p.confidence * 100)}%). الأساس: ${p.basisAr ?? p.basis}. هذا تقدير قائم على السيناريو وليس تنبؤاً مُتحقَّقاً.`
          : `FALAJ estimates the target is ${nm(p.targetNodeId)} within ${p.etaSecLow}–${p.etaSecHigh}s (confidence ${Math.round(p.confidence * 100)}%). Basis: ${p.basis}. This is a scenario-based estimate, not a validated forecast.`,
        grounding,
      }
    }

    case 'recommend': {
      const rec = ctx.recommendedLabel
      if (!rec) return { intent, text: ar ? 'لا يوجد إجراء موصى به في هذه الحالة.' : 'No recommended action for this state.', grounding }
      const approved = world.containedAt != null
      return {
        intent,
        text: ar
          ? `الإجراء الموصى به: ${rec.ar ?? rec.en}. ${approved ? 'تم تطبيقه بعد موافقة المشغّل.' : 'يتطلب موافقة صريحة من المشغّل قبل التطبيق — لن ينفّذ النظام أي إجراء تلقائياً.'}`
          : `Recommended action: ${rec.en}. ${approved ? 'It was applied after operator approval.' : 'It requires explicit operator approval before it is applied — the system never acts on its own.'}`,
        grounding,
      }
    }

    case 'uncertain': {
      const bits = ar
        ? [
            'نطاق الوقت المتوقع تقديري وقد يتغير مع تقدم السيناريو.',
            'الاكتشاف قائم على قواعد حتمية؛ أي نموذج تعلم آلي اختياري مكمِّل وليس مرجعاً وحيداً.',
            'جميع القياسات والأصول اصطناعية ولا تعكس الأنظمة الحقيقية للمنشأة.',
          ]
        : [
            'The predicted time window is an estimate and can shift as the scenario progresses.',
            'Detection is deterministic rule-based; any optional ML model only supplements, never replaces, the rules.',
            'All telemetry and assets are synthetic and do not reflect the facility’s real systems.',
          ]
      return { intent, text: (ar ? 'ما يبقى غير مؤكد:\n' : 'What remains uncertain:\n') + bits.map((b) => `• ${b}`).join('\n'), grounding }
    }
  }
}
