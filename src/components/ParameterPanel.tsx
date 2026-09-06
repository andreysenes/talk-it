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
    <fieldset className="min-w-0 shrink-0">
      <legend className="mb-1 text-[10px] font-medium tracking-[0.18em] text-neutral-500 uppercase sm:mb-2 sm:text-[11px]">
        Language
      </legend>
      <div className="flex flex-wrap gap-1">
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
                'rounded-sm px-2 py-1 text-[11px] font-medium sm:px-3 sm:py-1.5 sm:text-xs',
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
