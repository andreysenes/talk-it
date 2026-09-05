import { ChevronDown } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { DragSlider } from './DragSlider'
import { cn } from '../lib/utils'
import {
  COMMAND_CHIPS,
  type ChipId,
  type VoicePatch,
  type VoiceState,
} from '../engine/commands'

const panelClass = 'rounded-sm border border-neutral-800 bg-black p-2.5'

function ChoiceChip({
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
      className="flex max-h-[min(70vh,28rem)] w-max flex-col gap-1 overflow-y-auto rounded-sm bg-[#0c0c0c] p-1 shadow-lg shadow-black/60"
    >
      {COMMAND_CHIPS.map((chip) =>
        chip.kind === 'number' ? (
          <DragSlider
            key={chip.id}
            label={chip.label}
            token={chip.token(state)}
            value={state[chip.id] as number}
            min={chip.min ?? 0}
            max={chip.max ?? 1}
            step={chip.step ?? 0.01}
            onChange={(n) => onPatch({ [chip.id]: n } as VoicePatch)}
          />
        ) : (
          <div key={chip.id} className="flex w-full flex-col gap-1">
            <ChoiceChip
              label={chip.label}
              token={chip.token(state)}
              open={open === chip.id}
              onToggle={() => toggle(chip.id)}
            />
            {open === chip.id && chip.choices ? (
              <div className={panelClass} role="dialog">
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
              </div>
            ) : null}
          </div>
        ),
      )}
    </div>
  )
}
