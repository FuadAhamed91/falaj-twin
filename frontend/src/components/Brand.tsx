import { clsx } from 'clsx'

/** FALAJ mark — a hexagonal shield with a falaj (water-channel) wave. */
export function BrandMark({ size = 30, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" className={className} aria-hidden>
      <defs>
        <linearGradient id="fg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#5eead4" />
          <stop offset="1" stopColor="#2563eb" />
        </linearGradient>
      </defs>
      <path d="M32 5 54 18v28L32 59 10 46V18z" fill="none" stroke="url(#fg)" strokeWidth="3.5" strokeLinejoin="round" />
      <path d="M18 38c5-6.5 9-6.5 14 0s9 6.5 14 0" fill="none" stroke="url(#fg)" strokeWidth="4" strokeLinecap="round" />
      <path d="M18 28c5-6.5 9-6.5 14 0s9 6.5 14 0" fill="none" stroke="#5eead4" strokeOpacity="0.5" strokeWidth="2.6" strokeLinecap="round" />
    </svg>
  )
}

export function BrandLockup({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <BrandMark size={compact ? 26 : 30} />
      <div className={clsx('leading-none', compact && 'sr-only')}>
        <div className="flex items-baseline gap-1.5">
          <span className="text-[15px] font-semibold tracking-tight text-fog-50">FALAJ</span>
          <span className="text-[15px] font-light tracking-tight text-signal">Twin</span>
        </div>
        <div className="mt-1 text-[9.5px] font-medium tracking-[0.12em] text-fog-500 uppercase">
          Caught Once · Warned Everywhere
        </div>
      </div>
    </div>
  )
}
