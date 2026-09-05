import type { Language } from '../engine/personalities'
import { cn } from '../lib/utils'

export function ParameterPanel({
  language,
  onLanguage,
}: {
  language: Language
  onLanguage: (v: Language) => void
}) {
  return (
    <fieldset>
      <legend className="mb-2 text-[11px] font-medium tracking-[0.18em] text-neutral-500 uppercase">
        Language
      </legend>
      <div className="flex flex-wrap gap-1.5">
        {(
          [
            { id: 'english', label: 'English' },
            { id: 'spanish', label: 'Spanish' },
          ] as const
        ).map((opt) => {
          const on = opt.id === language
          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => onLanguage(opt.id)}
              className={cn(
                'rounded-sm px-3 py-1.5 text-xs font-medium sm:text-sm',
                on
                  ? 'bg-white text-black'
                  : 'border border-neutral-800 text-neutral-400 hover:border-neutral-500 hover:text-white',
              )}
              aria-pressed={on}
            >
              {opt.label}
            </button>
          )
        })}
      </div>
    </fieldset>
  )
}
