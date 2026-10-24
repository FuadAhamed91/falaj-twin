import { Camera, Sun, Moon, Focus } from 'lucide-react'
import { clsx } from 'clsx'
import { useTwinCam } from './camera'
import { sceneConfig } from './config'
import { useSim } from '../store/simStore'
import { useLang } from '../i18n/useLang'

/** Camera preset chips + day/dusk toggle, overlaid on the 3D twin. */
export function ViewControls() {
  const facilityId = useSim((s) => s.facilityId)
  const lang = useLang((s) => s.lang)
  const preset = useTwinCam((s) => s.preset)
  const focusId = useTwinCam((s) => s.focusId)
  const goPreset = useTwinCam((s) => s.goPreset)
  const dusk = useTwinCam((s) => s.dusk)
  const setDusk = useTwinCam((s) => s.setDusk)
  const cfg = sceneConfig(facilityId)

  return (
    <div className="pointer-events-auto absolute inset-x-4 bottom-4 flex items-end justify-between gap-3">
      <div className="flex max-w-[78%] flex-wrap gap-1.5">
        {cfg.presets.map((p) => {
          const active = focusId == null && preset === p.id
          return (
            <button
              key={p.id}
              onClick={() => goPreset(p.id)}
              className={clsx(
                'inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-medium shadow-sm backdrop-blur transition-all',
                active
                  ? 'bg-slate-900 text-white ring-1 ring-slate-900'
                  : 'bg-white/90 text-slate-600 ring-1 ring-slate-200 hover:bg-white hover:text-slate-900',
              )}
            >
              {p.id === 'hero' ? <Camera size={12} /> : p.id === 'overview' ? <Focus size={12} /> : null}
              {lang === 'ar' ? p.labelAr : p.label}
            </button>
          )
        })}
      </div>
      <button
        onClick={() => setDusk(!dusk)}
        title={dusk ? 'Daytime' : 'Dusk'}
        className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-white/90 px-3 py-1.5 text-[11px] font-medium text-slate-600 shadow-sm ring-1 ring-slate-200 backdrop-blur transition-all hover:bg-white hover:text-slate-900"
      >
        {dusk ? <Moon size={12} /> : <Sun size={12} />}
        {dusk ? (lang === 'ar' ? 'الغروب' : 'Dusk') : lang === 'ar' ? 'النهار' : 'Day'}
      </button>
    </div>
  )
}
