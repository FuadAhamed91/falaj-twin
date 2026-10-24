import { useEffect } from 'react'
import { useSim } from '../store/simStore'

/** Mount once at app root. Drives the simulation + demo via requestAnimationFrame. */
export function useClock() {
  const tick = useSim((s) => s.tick)
  useEffect(() => {
    let raf = 0
    let last = performance.now()
    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000) // clamp long frames
      last = now
      tick(dt)
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [tick])
}

export function fmtClock(sec: number): string {
  const m = Math.floor(sec / 60)
  const s = Math.floor(sec % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}
