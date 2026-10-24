import { NavLink, useLocation } from 'react-router-dom'
import { clsx } from 'clsx'
import {
  LayoutDashboard,
  Box,
  Building2,
  Radar,
  Swords,
  ShieldCheck,
  BarChart3,
  Settings,
  Languages,
  Play,
  Square,
} from 'lucide-react'
import type { ReactNode } from 'react'
import { BrandLockup } from './Brand'
import { useLang, useT } from '../i18n/useLang'
import { useSim } from '../store/simStore'
import type { StringKey } from '../i18n/strings'

const NAV: { to: string; key: StringKey; icon: typeof LayoutDashboard }[] = [
  { to: '/', key: 'nav.overview', icon: LayoutDashboard },
  { to: '/twin', key: 'nav.twin', icon: Box },
  { to: '/facilities', key: 'nav.facilities', icon: Building2 },
  { to: '/threats', key: 'nav.threat', icon: Radar },
  { to: '/simulation', key: 'nav.simulation', icon: Swords },
  { to: '/response', key: 'nav.response', icon: ShieldCheck },
  { to: '/analytics', key: 'nav.analytics', icon: BarChart3 },
  { to: '/settings', key: 'nav.settings', icon: Settings },
]

export function Layout({ children }: { children: ReactNode }) {
  const t = useT()
  const { lang, toggle } = useLang()
  const demoActive = useSim((s) => s.demo.active)
  const startDemo = useSim((s) => s.startDemo)
  const stopDemo = useSim((s) => s.stopDemo)
  const loc = useLocation()

  return (
    <div className="grid h-full grid-cols-[auto_1fr] bg-ink-950">
      {/* Sidebar */}
      <aside className="flex w-[232px] flex-col border-e border-hair bg-ink-900/60 backdrop-blur-xl">
        <div className="border-b border-hair px-4 py-4">
          <BrandLockup />
        </div>
        <nav className="flex-1 space-y-0.5 overflow-y-auto p-3">
          {NAV.map(({ to, key, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                clsx(
                  'group flex items-center gap-3 rounded-lg px-3 py-2 text-[13px] font-medium transition-colors',
                  isActive
                    ? 'bg-signal/10 text-signal ring-1 ring-inset ring-signal/20'
                    : 'text-fog-400 hover:bg-ink-800 hover:text-fog-200',
                )
              }
            >
              <Icon size={16} className="shrink-0" />
              <span className="truncate">{t(key)}</span>
            </NavLink>
          ))}
        </nav>
        <div className="border-t border-hair p-3">
          <button
            onClick={demoActive ? stopDemo : startDemo}
            className={clsx(
              'flex w-full items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-[13px] font-semibold transition-all',
              demoActive
                ? 'bg-threat/15 text-threat ring-1 ring-inset ring-threat/30 hover:bg-threat/20'
                : 'bg-gradient-to-r from-signal/20 to-signal-deep/20 text-signal ring-1 ring-inset ring-signal/30 hover:from-signal/25 hover:to-signal-deep/25',
            )}
          >
            {demoActive ? <Square size={14} /> : <Play size={14} />}
            {demoActive ? t('ctrl.stopDemo') : t('ctrl.demo')}
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex min-w-0 flex-col">
        <header className="flex items-center justify-between gap-4 border-b border-hair bg-ink-900/40 px-6 py-3 backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <h1 className="text-sm font-semibold text-fog-100">{t(pageKey(loc.pathname))}</h1>
            <span className="hidden text-[11px] text-fog-500 sm:inline">· {t('app.sub')}</span>
          </div>
          <div className="flex items-center gap-2">
            {demoActive && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-threat/10 px-2.5 py-1 text-[11px] font-medium text-threat ring-1 ring-inset ring-threat/25">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-threat" />
                DEMO
              </span>
            )}
            <button
              onClick={toggle}
              className="inline-flex items-center gap-1.5 rounded-lg border border-hair-strong bg-ink-850 px-2.5 py-1.5 text-xs font-medium text-fog-300 hover:text-fog-100"
              aria-label="Toggle language"
            >
              <Languages size={14} />
              {lang === 'en' ? 'عربي' : 'EN'}
            </button>
          </div>
        </header>
        <main className="min-h-0 flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  )
}

function pageKey(path: string): StringKey {
  const m: Record<string, StringKey> = {
    '/': 'nav.overview',
    '/twin': 'nav.twin',
    '/facilities': 'nav.facilities',
    '/threats': 'nav.threat',
    '/simulation': 'nav.simulation',
    '/response': 'nav.response',
    '/analytics': 'nav.analytics',
    '/settings': 'nav.settings',
  }
  return m[path] ?? 'nav.overview'
}
