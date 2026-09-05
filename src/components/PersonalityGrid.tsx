import {
  PERSONALITIES,
  type Personality,
  type PitchQuality,
  type VocalEffort,
} from '../engine/personalities'
import { DragSlider } from './DragSlider'
import { cn } from '../lib/utils'

function ChoiceRow<T extends string>({
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

function fmt(n: number, digits: number) {
  return n.toFixed(digits)
}

export function PersonalityGrid({
  selectedId,
  pitch,
  speed,
  pitchQuality,
  vocalEffort,
  vibrato,
  vibratoRate,
  scale,
  onSelect,
  onPitch,
  onSpeed,
  onPitchQuality,
  onVocalEffort,
  onVibrato,
  onVibratoRate,
  onScale,
}: {
  selectedId: Personality['id']
  pitch: number
  speed: number
  pitchQuality: PitchQuality
  vocalEffort: VocalEffort
  vibrato: number
  vibratoRate: number
  scale: number
  onSelect: (p: Personality) => void
  onPitch: (n: number) => void
  onSpeed: (n: number) => void
  onPitchQuality: (v: PitchQuality) => void
  onVocalEffort: (v: VocalEffort) => void
  onVibrato: (n: number) => void
  onVibratoRate: (n: number) => void
  onScale: (n: number) => void
}) {
  const selected = PERSONALITIES.find((p) => p.id === selectedId) ?? PERSONALITIES[0]

  return (
    <div className="flex flex-col gap-4">
      <div>
        <p className="mb-2 text-[11px] font-medium tracking-[0.18em] text-neutral-500 uppercase">
          Personality
        </p>
        <div
          role="listbox"
          aria-label="Personality"
          className="flex flex-wrap gap-1.5"
        >
          {PERSONALITIES.map((p) => {
            const on = p.id === selected.id
            return (
              <button
                key={p.id}
                type="button"
                role="option"
                aria-selected={on}
                title={p.blurb}
                onClick={() => onSelect(p)}
                className={cn(
                  'rounded-sm px-2.5 py-1 text-xs font-medium whitespace-nowrap',
                  on
                    ? 'bg-white text-black'
                    : 'bg-white/10 text-white/75 hover:bg-white/16',
                )}
              >
                {p.label}
              </button>
            )
          })}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <ChoiceRow
          legend="Quality"
          value={pitchQuality}
          onChange={onPitchQuality}
          options={[
            { id: 'natural', label: 'Natural' },
            { id: 'monotone', label: 'Monotone' },
            { id: 'sung', label: 'Sung · held notes' },
          ]}
        />
        <ChoiceRow
          legend="Voice"
          value={vocalEffort}
          onChange={onVocalEffort}
          options={[
            { id: 'normal', label: 'Normal' },
            { id: 'breathy', label: 'Breathy' },
            { id: 'whispered', label: 'Whispered' },
          ]}
        />
      </div>

      <div className="grid gap-1 sm:grid-cols-2">
        <DragSlider
          label="Pitch"
          token={`{{pitch ${fmt(pitch, 0)}}}`}
          value={pitch}
          min={1}
          max={400}
          step={1}
          onChange={onPitch}
        />
        <DragSlider
          label={pitchQuality === 'sung' ? 'Rate · hold' : 'Rate'}
          token={`{{rate ${fmt(speed, 0)}}}`}
          value={speed}
          min={1}
          max={400}
          step={1}
          onChange={onSpeed}
        />
        <DragSlider
          label="Vibrato"
          token={`{{vibrato ${fmt(vibrato, 1)}}}`}
          value={vibrato}
          min={0}
          max={16}
          step={0.1}
          onChange={onVibrato}
        />
        <DragSlider
          label="Vibrato rate"
          token={`{{vibrate ${fmt(vibratoRate, 1)}}}`}
          value={vibratoRate}
          min={0.5}
          max={12}
          step={0.1}
          onChange={onVibratoRate}
        />
        <DragSlider
          label="Scale"
          token={`{{scale ${fmt(scale, 2)}}}`}
          value={scale}
          min={0.4}
          max={1.8}
          step={0.01}
          onChange={onScale}
        />
      </div>
    </div>
  )
}
