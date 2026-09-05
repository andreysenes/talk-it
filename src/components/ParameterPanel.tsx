import type { Language } from '../engine/personalities'
import { cn } from '../lib/utils'

function RadioGroup<T extends string>({
  legend,
  value,
  options,
  onChange,
}: {
  legend: string
  value: T
  options: Array<{ id: T; label: string }>
  onChange: (v: T) => void
}) {
  return (
    <fieldset>
      <legend className="mb-2 text-[11px] font-medium tracking-[0.18em] text-neutral-500 uppercase">
        {legend}
      </legend>
      <div className="flex flex-wrap gap-1.5">
        {options.map((opt) => {
          const on = opt.id === value
          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => onChange(opt.id)}
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

export function ParameterPanel({
  language,
  vintage,
  onLanguage,
  onVintage,
}: {
  language: Language
  vintage: boolean
  onLanguage: (v: Language) => void
  onVintage: (v: boolean) => void
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <RadioGroup
        legend="Language"
        value={language}
        onChange={onLanguage}
        options={[
          { id: 'english', label: 'English' },
          { id: 'spanish', label: 'Spanish' },
        ]}
      />
      <fieldset>
        <legend className="mb-2 text-[11px] font-medium tracking-[0.18em] text-neutral-500 uppercase">
          DAC
        </legend>
        <button
          type="button"
          onClick={() => onVintage(!vintage)}
          className={cn(
            'rounded-sm px-3 py-1.5 text-xs font-medium sm:text-sm',
            vintage
              ? 'bg-white text-black'
              : 'border border-neutral-800 text-neutral-400 hover:border-neutral-500 hover:text-white',
          )}
          aria-pressed={vintage}
        >
          {vintage ? 'Classic 11 kHz' : 'Clean 44 kHz'}
        </button>
        <p className="mt-1.5 text-[11px] leading-snug text-neutral-500">
          SoftVoice originally spoke at 11 kHz / 8-bit. Leave this on for the 1997 sound.
        </p>
      </fieldset>
    </div>
  )
}
