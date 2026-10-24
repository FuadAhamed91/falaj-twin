// Shared colour tokens mirrored from index.css, for use in canvas / 3D / charts
// where CSS custom properties aren't convenient.
import type { AssetState, Sector } from '../sim'

export const COLORS = {
  ink950: '#02060d',
  ink900: '#050b16',
  ink850: '#08111f',
  ink800: '#0b1628',
  ink700: '#13243e',
  ink600: '#1b304f',
  signal: '#22d3ee',
  signalDeep: '#2563eb',
  ok: '#34d399',
  warn: '#fbbf24',
  predict: '#a78bfa',
  threat: '#fb3b5c',
  fog100: '#e2e9f4',
  fog300: '#9fb0c9',
  fog400: '#7488a6',
} as const

export const SECTOR_COLOR: Record<Sector, string> = {
  water: '#22d3ee',
  power: '#fbbf24',
  healthcare: '#34d399',
}

export const STATE_COLOR: Record<AssetState, string> = {
  nominal: '#2b8a9e',
  watch: '#fbbf24',
  alert: '#fb923c',
  compromised: '#fb3b5c',
  contained: '#34d399',
  offline: '#64748b',
}

export const STATE_GLOW: Record<AssetState, number> = {
  nominal: 0.15,
  watch: 0.6,
  alert: 0.9,
  compromised: 1.4,
  contained: 0.7,
  offline: 0.1,
}
