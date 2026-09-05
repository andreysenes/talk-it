import { Minus, Plus } from 'lucide-react'
import { Button } from './ui/button'

function Stepper({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string
  value: number
  min?: number
  max?: number
  onChange: (n: number) => void
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="w-14 text-[11px] font-medium tracking-[0.18em] text-neutral-500 uppercase">
        {label}
      </span>
      <Button
        type="button"
        variant="outline"
        size="icon"
        className="size-8 border-neutral-700"
        onClick={() => {
          const next = value - 1
          onChange(min != null ? Math.max(min, next) : next)
        }}
        aria-label={`Decrease ${label}`}
      >
        <Minus className="size-4" />
      </Button>
      <input
        type="number"
        min={min}
        max={max}
        value={value}
        onChange={(e) => {
          const n = Number(e.target.value)
          if (!Number.isFinite(n)) return
          let next = n
          if (min != null) next = Math.max(min, next)
          if (max != null) next = Math.min(max, next)
          onChange(next)
        }}
        className="h-8 w-20 rounded-sm border border-neutral-700 bg-black text-center font-mono text-sm font-medium text-white outline-none focus:border-white"
      />
      <Button
        type="button"
        variant="outline"
        size="icon"
        className="size-8 border-neutral-700"
        onClick={() => {
          const next = value + 1
          onChange(max != null ? Math.min(max, next) : next)
        }}
        aria-label={`Increase ${label}`}
      >
        <Plus className="size-4" />
      </Button>
    </div>
  )
}

export function VoiceSliders({
  pitch,
  speed,
  onPitch,
  onSpeed,
}: {
  pitch: number
  speed: number
  onPitch: (n: number) => void
  onSpeed: (n: number) => void
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <Stepper label="Pitch" value={pitch} onChange={onPitch} />
      <Stepper label="Speed" value={speed} onChange={onSpeed} />
    </div>
  )
}
