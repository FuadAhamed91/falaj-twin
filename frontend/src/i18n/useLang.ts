import { create } from 'zustand'
import { STRINGS, type Lang, type StringKey } from './strings'

interface LangState {
  lang: Lang
  setLang: (l: Lang) => void
  toggle: () => void
}

function apply(l: Lang) {
  if (typeof document !== 'undefined') {
    document.documentElement.lang = l
    document.documentElement.dir = l === 'ar' ? 'rtl' : 'ltr'
  }
}

const initial: Lang =
  (typeof localStorage !== 'undefined' && (localStorage.getItem('falaj.lang') as Lang)) || 'en'
apply(initial)

export const useLang = create<LangState>((set, get) => ({
  lang: initial,
  setLang: (l) => {
    try {
      localStorage.setItem('falaj.lang', l)
    } catch {
      /* private mode */
    }
    apply(l)
    set({ lang: l })
  },
  toggle: () => get().setLang(get().lang === 'en' ? 'ar' : 'en'),
}))

/** Translate a chrome string key. */
export function useT() {
  const lang = useLang((s) => s.lang)
  return (key: StringKey) => STRINGS[key][lang]
}

/** Pick the right field from a bilingual sim object ({x, xAr}). */
export function usePick() {
  const lang = useLang((s) => s.lang)
  return <T>(en: T, ar: T | undefined): T => (lang === 'ar' && ar != null ? ar : en)
}
