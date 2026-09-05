import { Volume1, Volume2, VolumeX } from 'lucide-react'
import { useEffect, useRef } from 'react'

export function VolumeControl({
  value,
  onChange,
}: {
  value: number
  onChange: (n: number) => void
}) {
  const lastRef = useRef(value > 0 ? value : 80)
  useEffect(() => {
    if (value > 0) lastRef.current = value
  }, [value])
  const Icon = value === 0 ? VolumeX : value < 50 ? Volume1 : Volume2

  return (
    <div className="flex h-11 min-w-44 flex-1 items-center gap-2 border border-neutral-600 px-3 sm:max-w-64 sm:flex-none">
      <button
        type="button"
        className="text-neutral-300 hover:text-white"
        aria-label={value === 0 ? 'Unmute' : 'Mute'}
        onClick={() => onChange(value === 0 ? lastRef.current : 0)}
      >
        <Icon className="size-4" />
      </button>
      <input
        type="range"
        min={0}
        max={100}
        step={1}
        value={value}
        aria-label="Volume"
        onChange={(e) => onChange(Number(e.target.value))}
        className="volume-slider min-w-0 flex-1"
      />
      <span className="w-8 text-right font-mono text-xs text-neutral-400">{value}</span>
    </div>
  )
}
