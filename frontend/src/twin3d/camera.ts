import { create } from 'zustand'

/** UI → canvas camera requests (presets, node focus). */
interface TwinCamState {
  preset: string
  nonce: number
  focusId: string | null
  dusk: boolean
  goPreset: (id: string) => void
  focus: (nodeId: string | null) => void
  setDusk: (v: boolean) => void
}

export const useTwinCam = create<TwinCamState>((set, get) => ({
  preset: 'hero',
  nonce: 0,
  focusId: null,
  dusk: false,
  goPreset: (id) => set({ preset: id, focusId: null, nonce: get().nonce + 1 }),
  focus: (nodeId) => set({ focusId: nodeId, nonce: get().nonce + 1 }),
  setDusk: (v) => set({ dusk: v }),
}))
