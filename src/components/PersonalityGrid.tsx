import { Plus, X } from 'lucide-react'
import {
  PERSONALITIES,
  type Language,
  type Personality,
  type PersonalityId,
  type PitchQuality,
  type VocalEffort,
} from '../engine/personalities'
import type { VoicePreset } from '../engine/presets'
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
    <fieldset className="min-w-0">
      <legend className="mb-0.5 text-[9px] font-medium tracking-[0.16em] text-neutral-500 uppercase sm:mb-1.5 sm:text-[11px]">
        {legend}
      </legend>
      <div className="flex flex-wrap gap-0.5 sm:gap-1">
        {options.map((opt) => {
          const on = opt.id === value
          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => onChange(opt.id)}
              className={cn(
                'rounded-sm px-1.5 py-0.5 text-[10px] font-medium sm:px-3 sm:py-1.5 sm:text-xs',
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
  selectedPresetId,
  presets,
  pitch,
  speed,
  pitchQuality,
  vocalEffort,
  vibrato,
  vibratoRate,
  scale,
  language,
  onSelect,
  onSelectPreset,
  onAddPreset,
  onRemovePreset,
  onPitch,
  onSpeed,
  onPitchQuality,
  onVocalEffort,
  onVibrato,
  onVibratoRate,
  onScale,
  onLanguage,
}: {
  selectedId: PersonalityId
  selectedPresetId: string | null
  presets: VoicePreset[]
  pitch: number
  speed: number
  pitchQuality: PitchQuality
  vocalEffort: VocalEffort
  vibrato: number
  vibratoRate: number
  scale: number
  language: Language
  onSelect: (p: Personality) => void
  onSelectPreset: (preset: VoicePreset) => void
  onAddPreset: () => void
  onRemovePreset: (id: string) => void
  onPitch: (n: number) => void
  onSpeed: (n: number) => void
  onPitchQuality: (v: PitchQuality) => void
  onVocalEffort: (v: VocalEffort) => void
  onVibrato: (n: number) => void
  onVibratoRate: (n: number) => void
  onScale: (n: number) => void
  onLanguage: (v: Language) => void
}) {
  return (
    <div className="flex min-h-0 flex-col gap-1 sm:gap-4">
      <div className="min-w-0">
        <div className="mb-0.5 flex items-baseline justify-between gap-2 sm:mb-2">
          <p className="text-[9px] font-medium tracking-[0.18em] text-neutral-500 uppercase sm:text-[11px]">
            Personality
          </p>
          <button
            type="button"
            onClick={onAddPreset}
            className="inline-flex items-center gap-1 rounded-sm px-1 py-0.5 text-[9px] font-medium tracking-[0.14em] text-neutral-400 uppercase hover:bg-white/10 hover:text-white sm:text-[11px]"
            title="Save current voice as a custom preset"
          >
            <Plus className="size-3" aria-hidden />
            Add preset
          </button>
        </div>
        <div
          role="listbox"
          aria-label="Personality"
          className="personality-strip grid grid-flow-col grid-rows-2 auto-cols-max gap-1 overflow-x-auto overscroll-x-contain pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:gap-1.5"
        >
          {PERSONALITIES.map((p) => {
            const on = selectedPresetId == null && p.id === selectedId
            return (
              <button
                key={p.id}
                type="button"
                role="option"
                aria-selected={on}
                title={p.blurb}
                onClick={() => onSelect(p)}
                className={cn(
                  'rounded-sm px-2 py-0.5 text-[11px] font-medium whitespace-nowrap sm:px-2.5 sm:py-1 sm:text-xs',
                  on
                    ? 'bg-white text-black'
                    : 'bg-white/10 text-white/75 hover:bg-white/16',
                )}
              >
                {p.label}
              </button>
            )
          })}
          {presets.map((preset) => {
            const on = selectedPresetId === preset.id
            return (
              <span key={preset.id} className="relative inline-flex">
                <button
                  type="button"
                  role="option"
                  aria-selected={on}
                  title={`Custom · based on ${preset.personalityId}`}
                  onClick={() => onSelectPreset(preset)}
                  className={cn(
                    'rounded-sm py-0.5 pr-5 pl-2 text-[11px] font-medium whitespace-nowrap sm:py-1 sm:pr-6 sm:pl-2.5 sm:text-xs',
                    on
                      ? 'bg-white text-black'
                      : 'bg-emerald-500/20 text-emerald-100 hover:bg-emerald-500/30',
                  )}
                >
                  {preset.label}
                </button>
                <button
                  type="button"
                  aria-label={`Remove ${preset.label}`}
                  title="Remove preset"
                  onClick={(event) => {
                    event.stopPropagation()
                    onRemovePreset(preset.id)
                  }}
                  className={cn(
                    'absolute top-1/2 right-0.5 flex size-3.5 -translate-y-1/2 items-center justify-center rounded-sm sm:right-1 sm:size-4',
                    on
                      ? 'text-neutral-600 hover:bg-black/10'
                      : 'text-emerald-200/70 hover:bg-white/10',
                  )}
                >
                  <X className="size-3" aria-hidden />
                </button>
              </span>
            )
          })}
          <button
            type="button"
            role="option"
            aria-label="Add voice preset"
            title="Save current voice as a custom preset"
            onClick={onAddPreset}
            className="inline-flex items-center justify-center gap-1 rounded-sm border border-dashed border-neutral-700 px-2 py-0.5 text-[11px] font-medium text-neutral-400 whitespace-nowrap hover:border-neutral-400 hover:text-white sm:px-2.5 sm:py-1 sm:text-xs"
          >
            <Plus className="size-3 sm:size-3.5" aria-hidden />
            Preset
          </button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-1 sm:gap-4">
        <ChoiceRow
          legend="Quality"
          value={pitchQuality}
          onChange={onPitchQuality}
          options={[
            { id: 'natural', label: 'Natural' },
            { id: 'monotone', label: 'Mono' },
            { id: 'sung', label: 'Sung' },
          ]}
        />
        <ChoiceRow
          legend="Voice"
          value={vocalEffort}
          onChange={onVocalEffort}
          options={[
            { id: 'normal', label: 'Normal' },
            { id: 'breathy', label: 'Breathy' },
            { id: 'whispered', label: 'Whisper' },
          ]}
        />
        <ChoiceRow
          legend="Language"
          value={language}
          onChange={onLanguage}
          options={[
            { id: 'english', label: 'EN' },
            { id: 'spanish', label: 'ES' },
          ]}
        />
      </div>

      <div className="grid grid-cols-3 gap-0.5 sm:grid-cols-2 sm:gap-1.5">
        <DragSlider
          label="Pitch"
          token={`{{pitch ${fmt(pitch, 0)}}}`}
          value={pitch}
          min={1}
          max={400}
          step={1}
          onChange={onPitch}
          compact
        />
        <DragSlider
          label={pitchQuality === 'sung' ? 'Rate · hold' : 'Rate'}
          token={`{{rate ${fmt(speed, 0)}}}`}
          value={speed}
          min={1}
          max={400}
          step={1}
          onChange={onSpeed}
          compact
        />
        <DragSlider
          label="Vibrato"
          token={`{{vibrato ${fmt(vibrato, 1)}}}`}
          value={vibrato}
          min={0}
          max={16}
          step={0.1}
          onChange={onVibrato}
          compact
        />
        <DragSlider
          label="Vib rate"
          token={`{{vibrate ${fmt(vibratoRate, 1)}}}`}
          value={vibratoRate}
          min={0.5}
          max={12}
          step={0.1}
          onChange={onVibratoRate}
          compact
        />
        <DragSlider
          label="Scale"
          token={`{{scale ${fmt(scale, 2)}}}`}
          value={scale}
          min={0.4}
          max={1.8}
          step={0.01}
          onChange={onScale}
          compact
        />
      </div>
    </div>
  )
}
