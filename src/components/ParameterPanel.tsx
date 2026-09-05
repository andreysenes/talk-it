import type { Language, PitchQuality, VocalEffort } from '../engine/personalities'
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
      <legend className="mb-2 font-display text-xs font-bold tracking-wide text-sky-950/80 uppercase">
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
                'talk-3d rounded-full px-3 py-1.5 text-xs font-bold sm:text-sm',
                on
                  ? 'bg-sky-700 text-white'
                  : 'bg-white/80 text-slate-700 hover:bg-white',
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
  pitchQuality,
  vocalEffort,
  language,
  vintage,
  onPitchQuality,
  onVocalEffort,
  onLanguage,
  onVintage,
}: {
  pitchQuality: PitchQuality
  vocalEffort: VocalEffort
  language: Language
  vintage: boolean
  onPitchQuality: (v: PitchQuality) => void
  onVocalEffort: (v: VocalEffort) => void
  onLanguage: (v: Language) => void
  onVintage: (v: boolean) => void
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <RadioGroup
        legend="Pitch quality"
        value={pitchQuality}
        onChange={onPitchQuality}
        options={[
          { id: 'natural', label: 'Natural' },
          { id: 'monotone', label: 'Monotone' },
          { id: 'sung', label: 'Sung' },
        ]}
      />
      <RadioGroup
        legend="Vocal effort"
        value={vocalEffort}
        onChange={onVocalEffort}
        options={[
          { id: 'normal', label: 'Normal' },
          { id: 'breathy', label: 'Breathy' },
          { id: 'whispered', label: 'Whispered' },
        ]}
      />
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
        <legend className="mb-2 font-display text-xs font-bold tracking-wide text-sky-950/80 uppercase">
          DAC
        </legend>
        <button
          type="button"
          onClick={() => onVintage(!vintage)}
          className={cn(
            'talk-3d rounded-full px-3 py-1.5 text-xs font-bold sm:text-sm',
            vintage ? 'bg-amber-500 text-white' : 'bg-white/80 text-slate-700',
          )}
          aria-pressed={vintage}
        >
          {vintage ? 'Classic 11 kHz' : 'Clean 44 kHz'}
        </button>
        <p className="mt-1.5 text-[11px] leading-snug text-slate-600">
          SoftVoice originally spoke at 11 kHz / 8-bit. Leave this on for the 1997 sound.
        </p>
      </fieldset>
    </div>
  )
}
