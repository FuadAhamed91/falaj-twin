import { clsx } from 'clsx'
import type { ReactNode } from 'react'
import { ShieldAlert } from 'lucide-react'
import { useT } from '../i18n/useLang'
import type { AssetState } from '../sim'
import { STATE_COLOR } from '../lib/theme'

export function Panel({
  className,
  children,
  as: As = 'div',
}: {
  className?: string
  children: ReactNode
  as?: 'div' | 'section' | 'aside'
}) {
  return <As className={clsx('panel p-4', className)}>{children}</As>
}

export function PanelTitle({ children, right }: { children: ReactNode; right?: ReactNode }) {
  return (
    <div className="mb-3 flex items-center justify-between gap-2">
      <h3 className="eyebrow">{children}</h3>
      {right}
    </div>
  )
}

export function Badge({
  children,
  tone = 'neutral',
  className,
}: {
  children: ReactNode
  tone?: 'neutral' | 'signal' | 'ok' | 'warn' | 'predict' | 'threat'
  className?: string
}) {
  const tones: Record<string, string> = {
    neutral: 'bg-white/[0.04] text-fog-300 ring-white/[0.08]',
    signal: 'bg-signal/10 text-signal ring-signal/25',
    ok: 'bg-ok/10 text-ok ring-ok/25',
    warn: 'bg-warn/10 text-warn ring-warn/30',
    predict: 'bg-predict/10 text-predict ring-predict/30',
    threat: 'bg-threat/10 text-threat ring-threat/30',
  }
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10.5px] font-medium ring-1 ring-inset',
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  )
}

export function StateDot({ state, pulse }: { state: AssetState; pulse?: boolean }) {
  return (
    <span className="relative inline-flex h-2.5 w-2.5">
      {pulse && (
        <span
          className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-60"
          style={{ background: STATE_COLOR[state] }}
        />
      )}
      <span
        className="relative inline-flex h-2.5 w-2.5 rounded-full"
        style={{ background: STATE_COLOR[state], boxShadow: `0 0 8px ${STATE_COLOR[state]}` }}
      />
    </span>
  )
}

/** The persistent "this is simulated" strip. */
export function SimDisclaimer({ full = false, className }: { full?: boolean; className?: string }) {
  const t = useT()
  return (
    <div
      className={clsx(
        'flex items-start gap-2 rounded-lg border border-warn/20 bg-warn/[0.06] px-3 py-2 text-[11px] leading-relaxed text-warn/90',
        className,
      )}
    >
      <ShieldAlert size={14} className="mt-0.5 shrink-0" />
      <span>{full ? t('disc.full') : t('disc.short')}</span>
    </div>
  )
}

export function Stat({
  label,
  value,
  unit,
  tone = 'neutral',
  hint,
}: {
  label: string
  value: ReactNode
  unit?: string
  tone?: 'neutral' | 'ok' | 'warn' | 'threat' | 'signal'
  hint?: ReactNode
}) {
  const toneText: Record<string, string> = {
    neutral: 'text-fog-100',
    ok: 'text-ok',
    warn: 'text-warn',
    threat: 'text-threat',
    signal: 'text-signal',
  }
  return (
    <div className="panel p-4">
      <div className="eyebrow mb-1.5">{label}</div>
      <div className="flex items-baseline gap-1">
        <span className={clsx('num text-2xl font-semibold tracking-tight', toneText[tone])}>{value}</span>
        {unit && <span className="num text-sm text-fog-400">{unit}</span>}
      </div>
      {hint && <div className="mt-1 text-[11px] text-fog-400">{hint}</div>}
    </div>
  )
}

export function Segmented<T extends string>({
  options,
  value,
  onChange,
  size = 'md',
}: {
  options: { value: T; label: ReactNode }[]
  value: T
  onChange: (v: T) => void
  size?: 'sm' | 'md'
}) {
  return (
    <div className="inline-flex rounded-lg border border-white/[0.07] bg-ink-900/60 p-0.5">
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          className={clsx(
            'rounded-md font-medium transition-colors',
            size === 'sm' ? 'px-2.5 py-1 text-[11px]' : 'px-3 py-1.5 text-xs',
            value === o.value ? 'bg-signal/15 text-signal ring-1 ring-inset ring-signal/30' : 'text-fog-400 hover:text-fog-200',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}
