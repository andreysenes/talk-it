import { ChevronDown } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { cn } from '../lib/utils'
import {
  COMMAND_CHIPS,
  type ChipId,
  type VoicePatch,
  type VoiceState,
} from '../engine/commands'

const panelClass = 'rounded-sm border border-neutral-800 bg-black p-2.5'

function Chip({
  label,
  token,
  open,
  onToggle,
}: {
  label: string
  token: string
  open: boolean
  onToggle: () => void
}) {
  return (
    <div className="flex w-full overflow-hidden rounded-sm border border-neutral-800">
      <button
        type="button"
        onClick={onToggle}
        className="min-w-0 flex-1 px-2.5 py-1.5 text-left text-xs font-medium text-neutral-200 hover:bg-neutral-900"
      >
        <span className="mr-1.5 text-[10px] font-medium tracking-[0.14em] text-neutral-500 uppercase">
          {label}
        </span>
        <code className="font-mono text-[11px] text-neutral-300">{token}</code>
      </button>
      <button
        type="button"
        onClick={onToggle}
        className={cn(
          'border-l border-neutral-800 px-1.5 text-neutral-500 hover:bg-neutral-900 hover:text-white',
          open && 'bg-white text-black',
        )}
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label={`Configure ${label}`}
      >
        <ChevronDown className={cn('size-4 transition-transform', open && 'rotate-180')} />
      </button>
    </div>
  )
}

export function CommandButtons({
  state,
  onPatch,
}: {
  state: VoiceState
  onPatch: (patch: VoicePatch) => void
}) {
  const [open, setOpen] = useState<ChipId | null>(null)
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (open == null) return

    function onPointerDown(event: PointerEvent) {
      const root = rootRef.current
      if (!root) return
      if (event.target instanceof Node && root.contains(event.target)) return
      setOpen(null)
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(null)
    }

    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  function toggle(kind: ChipId) {
    setOpen((current) => (current === kind ? null : kind))
  }

  return (
    <div
      ref={rootRef}
      className="flex max-h-[min(70vh,28rem)] w-max flex-col gap-1 overflow-y-auto overflow-x-visible rounded-sm bg-[#0c0c0c] p-1 shadow-lg shadow-black/60"
    >
      {COMMAND_CHIPS.map((chip) => (
        <div key={chip.id} className="flex w-full flex-col gap-1">
          <Chip
            label={chip.label}
            token={chip.token(state)}
            open={open === chip.id}
            onToggle={() => toggle(chip.id)}
          />
          {open === chip.id ? (
            <div className={panelClass} role="dialog">
              {chip.kind === 'choice' && chip.choices ? (
                <div className="flex flex-col gap-2">
                  {chip.choices.map((choice) => {
                    const on = state[chip.id] === choice.id
                    return (
                      <button
                        key={choice.id}
                        type="button"
                        className={cn(
                          'rounded-sm px-3 py-1.5 text-xs font-medium',
                          on
                            ? 'bg-white text-black'
                            : 'border border-neutral-800 text-neutral-400 hover:text-white',
                        )}
                        onClick={() => onPatch({ [chip.id]: choice.id } as VoicePatch)}
                      >
                        {choice.label}
                      </button>
                    )
                  })}
                </div>
              ) : (
                <ValuePanel
                  label={chip.label}
                  id={`command-${chip.id}`}
                  value={state[chip.id] as number}
                  step={chip.step}
                  allowZero={chip.allowZero}
                  onChange={(n) => onPatch({ [chip.id]: n } as VoicePatch)}
                />
              )}
            </div>
          ) : null}
        </div>
      ))}
    </div>
  )
}

function ValuePanel({
  label,
  id,
  value,
  step,
  allowZero,
  onChange,
}: {
  label: string
  id: string
  value: number
  step?: number
  allowZero?: boolean
  onChange: (n: number) => void
}) {
  return (
    <>
      <label
        htmlFor={id}
        className="mb-2 block text-[11px] font-medium tracking-[0.18em] text-neutral-500 uppercase"
      >
        {label}
      </label>
      <input
        id={id}
        name={id}
        type="number"
        step={step}
        value={value}
        onChange={(e) => {
          const n = Number(e.target.value)
          if (!Number.isFinite(n)) return
          if (!allowZero && n === 0) return
          onChange(n)
        }}
        className="h-8 w-24 rounded-sm border border-neutral-700 bg-black px-2 font-mono text-sm font-medium text-white outline-none focus:border-white"
      />
    </>
  )
}
