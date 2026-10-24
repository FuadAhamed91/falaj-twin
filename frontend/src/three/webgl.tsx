import { Component, type ReactNode } from 'react'

/** True if the browser can create a WebGL context. */
export function hasWebGL(): boolean {
  if (typeof document === 'undefined') return false
  try {
    const c = document.createElement('canvas')
    return !!(c.getContext('webgl2') || c.getContext('webgl'))
  } catch {
    return false
  }
}

interface Props {
  fallback: ReactNode
  children: ReactNode
}
interface State {
  failed: boolean
}

/** Catches WebGL / render errors from the 3D tree and shows a 2D fallback. */
export class GLBoundary extends Component<Props, State> {
  state: State = { failed: !hasWebGL() }

  static getDerivedStateFromError(): State {
    return { failed: true }
  }

  componentDidCatch(err: unknown) {
    // Keep it quiet in the UI; log once for debugging.
    console.warn('[FALAJ] 3D unavailable, using 2D fallback:', err)
  }

  render() {
    return this.state.failed ? this.props.fallback : this.props.children
  }
}
