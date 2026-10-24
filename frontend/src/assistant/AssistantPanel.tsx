import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Bot, Send, ShieldCheck } from 'lucide-react'
import { answer, type Intent } from './explain'
import { useSim, useWorld, useContainments } from '../store/simStore'
import { useLang, useT } from '../i18n/useLang'
import { getScenario, getTopology } from '../sim'
import type { StringKey } from '../i18n/strings'

interface Msg { role: 'user' | 'assistant'; text: string; grounding?: string[] }

const QUICK: { intent: Intent; key: StringKey }[] = [
  { intent: 'what', key: 'assistant.q.what' },
  { intent: 'evidence', key: 'assistant.q.evidence' },
  { intent: 'affected', key: 'assistant.q.affected' },
  { intent: 'predict', key: 'assistant.q.predict' },
  { intent: 'recommend', key: 'assistant.q.recommend' },
  { intent: 'uncertain', key: 'assistant.q.uncertain' },
]

export function AssistantPanel({ className }: { className?: string }) {
  const t = useT()
  const lang = useLang((s) => s.lang)
  const facilityId = useSim((s) => s.facilityId)
  const world = useWorld()
  const containments = useContainments()
  const [msgs, setMsgs] = useState<Msg[]>([])
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [msgs])

  const ask = (intent: Intent, userText: string) => {
    const a = answer(intent, {
      scenario: getScenario(facilityId),
      topo: getTopology(facilityId),
      world,
      lang,
      recommendedLabel: containments[0] ? { en: containments[0].label, ar: containments[0].labelAr } : undefined,
    })
    setMsgs((m) => [...m, { role: 'user', text: userText }, { role: 'assistant', text: a.text, grounding: a.grounding }])
  }

  return (
    <div className={`panel flex min-h-0 flex-col ${className ?? ''}`}>
      <div className="flex items-center justify-between border-b border-hair p-3">
        <div className="flex items-center gap-2">
          <span className="grid h-7 w-7 place-items-center rounded-lg bg-signal/15 text-signal"><Bot size={15} /></span>
          <div>
            <div className="text-[13px] font-semibold text-fog-50">{t('assistant.title')}</div>
            <div className="flex items-center gap-1 text-[9.5px] text-ok"><ShieldCheck size={9} /> {t('assistant.grounded')}</div>
          </div>
        </div>
        <span className="text-[10px] font-medium text-fog-500">{lang === 'ar' ? 'AR' : 'EN'}</span>
      </div>

      <div ref={scrollRef} className="min-h-0 flex-1 space-y-2.5 overflow-y-auto p-3">
        {msgs.length === 0 && (
          <div className="rounded-lg bg-ink-800/40 p-3 text-[11.5px] leading-relaxed text-fog-400">
            {lang === 'ar'
              ? 'اسألني عن الحادث المحاكى: ماذا حدث، ما الدليل، ما المتأثر، ماذا نتوقع، وماذا نوصي. أستند فقط إلى حالة المحاكاة.'
              : 'Ask me about the simulated incident: what happened, the evidence, what is affected, the prediction, and the recommendation. I answer only from the simulation state.'}
          </div>
        )}
        <AnimatePresence initial={false}>
          {msgs.map((m, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
              className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[85%] whitespace-pre-line rounded-xl px-3 py-2 text-[11.5px] leading-relaxed ${
                m.role === 'user' ? 'bg-signal/15 text-fog-50 ring-1 ring-inset ring-signal/25' : 'bg-ink-800/70 text-fog-200'}`}>
                {m.text}
                {m.grounding && m.grounding.length > 0 && (
                  <div className="mt-1.5 flex flex-wrap gap-1 border-t border-hair pt-1.5">
                    {[...new Set(m.grounding)].slice(0, 6).map((g) => (
                      <span key={g} className="rounded bg-ink-800 px-1.5 py-0.5 text-[9px] text-fog-500">{g}</span>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <div className="border-t border-hair p-3">
        <div className="mb-2 flex flex-wrap gap-1.5">
          {QUICK.map((q) => (
            <button key={q.intent} onClick={() => ask(q.intent, t(q.key))}
              className="rounded-full border border-hair-strong bg-ink-800/60 px-2.5 py-1 text-[10.5px] text-fog-300 transition-colors hover:border-signal/30 hover:text-signal">
              {t(q.key)}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 rounded-lg border border-hair-strong bg-ink-900 px-3 py-2">
          <input disabled placeholder={t('assistant.ask')} className="flex-1 bg-transparent text-[12px] text-fog-300 placeholder:text-fog-600 focus:outline-none" />
          <Send size={14} className="text-fog-600" />
        </div>
      </div>
    </div>
  )
}
