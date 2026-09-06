import { useEffect, useRef, useState } from 'react'

export function DragSlider({
  label,
  token,
  value,
  min,
  max,
  step,
  onChange,
  compact = false,
}: {
  label: string
  token: string
  value: number
  min: number
  max: number
  step: number
  onChange: (n: number) => void
  compact?: boolean
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [live, setLive] = useState(value)
  const span = max - min || 1
  const pct = Math.min(100, Math.max(0, ((live - min) / span) * 100))

  useEffect(() => {
    setLive(value)
  }, [value])

  function setFromPointer(event: React.PointerEvent<HTMLDivElement>) {
    const el = ref.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const t = Math.min(1, Math.max(0, (event.clientX - rect.left) / Math.max(1, rect.width)))
    const raw = min + t * span
    const snapped = Math.round(raw / step) * step
    const next = Number(Math.min(max, Math.max(min, snapped)).toFixed(6))
    setLive(next)
    if (next !== value) onChange(next)
  }

  return (
    <div
      ref={ref}
      role="slider"
      aria-label={label}
      aria-valuemin={min}
      aria-valuemax={max}
      aria-valuenow={live}
      tabIndex={0}
      className="relative flex w-full cursor-ew-resize touch-none overflow-hidden rounded-sm border border-neutral-800 select-none"
      onPointerDown={(event) => {
        event.preventDefault()
        event.currentTarget.setPointerCapture(event.pointerId)
        setFromPointer(event)
      }}
      onPointerMove={(event) => {
        if (!event.currentTarget.hasPointerCapture(event.pointerId)) return
        setFromPointer(event)
      }}
    >
      <div
        className="pointer-events-none absolute inset-y-0 left-0 bg-white/40"
        style={{ width: `${pct}%` }}
      />
      <div
        className={
          compact
            ? 'relative z-10 flex min-w-0 flex-1 items-center justify-between gap-1 px-1.5 py-1 text-left text-[10px] font-medium text-white sm:gap-3 sm:px-2.5 sm:py-1.5 sm:text-xs'
            : 'relative z-10 flex min-w-0 flex-1 items-center justify-between gap-3 px-2.5 py-1.5 text-left text-xs font-medium text-white'
        }
      >
        <span className="text-[9px] font-medium tracking-[0.12em] text-neutral-300 uppercase sm:text-[10px] sm:tracking-[0.14em]">
          {label}
        </span>
        <code className="hidden font-mono text-[11px] text-white sm:inline">{token}</code>
        <span className="font-mono text-[10px] text-white sm:hidden">
          {token.replace(/^\{\{|\}\}$/g, '').replace(/^[a-z]+\s+/i, '')}
        </span>
      </div>
    </div>
  )
}
