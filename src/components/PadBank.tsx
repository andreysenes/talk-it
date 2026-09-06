import { Repeat } from 'lucide-react'
import { useEffect, useRef, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react'
import { cn } from '../lib/utils'
import {
  PAD_KEYS,
  midiNoteForPad,
  padCaption,
  padIndexFromKey,
  type PhrasePad,
} from '../engine/pads'
import { midiNoteName } from '../engine/midi'

export function PadBank({
  pads,
  active,
  progress = 0,
  onPadDown,
  onPadUp,
  onClear,
  midi,
}: {
  pads: PhrasePad[]
  active: number
  /** 0–1 playback fill for the active pad while speaking/paused. */
  progress?: number
  onPadDown: (index: number) => void
  onPadUp: (index: number) => void
  onClear: (index: number) => void
  midi?: ReactNode
}) {
  const heldKeysRef = useRef(new Set<number>())
  const heldPointerRef = useRef<number | null>(null)

  useEffect(() => {
    function typingTarget(target: EventTarget | null) {
      return (
        target instanceof HTMLElement &&
        (target.isContentEditable ||
          target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT')
      )
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.repeat || event.metaKey || event.ctrlKey || event.altKey) return
      if (typingTarget(event.target)) return
      const index = padIndexFromKey(event)
      if (index == null) return
      if (heldKeysRef.current.has(index)) return
      event.preventDefault()
      heldKeysRef.current.add(index)
      onPadDown(index)
    }

    function onKeyUp(event: KeyboardEvent) {
      const index = padIndexFromKey(event)
      if (index == null) return
      if (!heldKeysRef.current.has(index)) return
      event.preventDefault()
      heldKeysRef.current.delete(index)
      onPadUp(index)
    }

    function onBlur() {
      for (const index of heldKeysRef.current) onPadUp(index)
      heldKeysRef.current.clear()
      if (heldPointerRef.current != null) {
        onPadUp(heldPointerRef.current)
        heldPointerRef.current = null
      }
    }

    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    window.addEventListener('blur', onBlur)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
      window.removeEventListener('blur', onBlur)
    }
  }, [onPadDown, onPadUp])

  function pointerDown(index: number, event: ReactPointerEvent<HTMLButtonElement>) {
    if (event.button !== 0) return
    event.currentTarget.setPointerCapture(event.pointerId)
    heldPointerRef.current = index
    onPadDown(index)
  }

  function pointerUp(index: number, event: ReactPointerEvent<HTMLButtonElement>) {
    if (heldPointerRef.current !== index) return
    heldPointerRef.current = null
    try {
      event.currentTarget.releasePointerCapture(event.pointerId)
    } catch {
      /* already released */
    }
    onPadUp(index)
  }

  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between gap-2 sm:mb-2 sm:gap-3">
        <p className="text-[9px] font-medium tracking-[0.18em] text-neutral-500 uppercase sm:text-[11px]">
          Pads
        </p>
        {midi}
      </div>
      <div className="grid grid-cols-6 gap-1 sm:gap-2">
        {pads.map((pad, i) => {
          const on = i === active
          const filled = Boolean(pad.text.trim() || pad.name.trim())
          const playFill = on ? Math.min(1, Math.max(0, progress)) : 0
          return (
            <button
              key={i}
              type="button"
              title={
                filled
                  ? `${padCaption(pad, i)} · ${PAD_KEYS[i]} / ${midiNoteName(midiNoteForPad(i))} · hold to loop · right-click to clear`
                  : `Pad ${PAD_KEYS[i]} · MIDI ${midiNoteName(midiNoteForPad(i))} · save a line then trigger it`
              }
              onPointerDown={(event) => pointerDown(i, event)}
              onPointerUp={(event) => pointerUp(i, event)}
              onPointerCancel={(event) => pointerUp(i, event)}
              onContextMenu={(event) => {
                event.preventDefault()
                onClear(i)
              }}
              className={cn(
                'group relative min-h-7 overflow-hidden touch-none rounded-sm border px-0.5 py-0.5 text-left select-none sm:min-h-14 sm:px-2 sm:py-1.5',
                on && 'border-white bg-white text-black',
                !on && filled && 'border-neutral-700 text-neutral-200 hover:border-white',
                !on &&
                  !filled &&
                  'border-dashed border-neutral-800 text-neutral-600 hover:border-neutral-500',
              )}
            >
              {playFill > 0 ? (
                <span
                  aria-hidden
                  className={cn(
                    'pointer-events-none absolute inset-y-0 left-0',
                    on ? 'bg-neutral-300' : 'bg-white/15',
                  )}
                  style={{ width: `${playFill * 100}%` }}
                />
              ) : null}
              <span
                className={cn(
                  'relative block font-mono text-[10px] tracking-wider',
                  on ? 'text-neutral-500' : 'text-neutral-600',
                )}
              >
                {PAD_KEYS[i]}
                <span className={cn('ml-1 hidden sm:inline', on ? 'text-neutral-400' : 'text-neutral-700')}>
                  {midiNoteName(midiNoteForPad(i))}
                </span>
              </span>
              <span className="relative mt-0.5 block truncate text-[10px] font-medium sm:text-xs">
                {padCaption(pad, i)}
              </span>
              {pad.loop ? (
                <Repeat
                  className={cn(
                    'pointer-events-none absolute right-1 bottom-1 z-10 size-3',
                    on ? 'text-neutral-500' : 'text-neutral-600',
                  )}
                  aria-hidden
                />
              ) : null}
              {filled ? (
                <span
                  role="button"
                  tabIndex={0}
                  aria-label={`Clear pad ${PAD_KEYS[i]}`}
                  className={cn(
                    'absolute top-1 right-1 z-10 hidden size-4 items-center justify-center rounded-sm text-sm leading-none sm:flex',
                    on
                      ? 'text-neutral-400 hover:bg-black/10 hover:text-black'
                      : 'text-neutral-600 hover:bg-white/10 hover:text-white',
                    'sm:opacity-0 sm:group-hover:opacity-100',
                  )}
                  onPointerDown={(event) => event.stopPropagation()}
                  onClick={(event) => {
                    event.stopPropagation()
                    onClear(i)
                  }}
                  onKeyDown={(event) => {
                    if (event.key !== 'Enter' && event.key !== ' ') return
                    event.preventDefault()
                    event.stopPropagation()
                    onClear(i)
                  }}
                >
                  ×
                </span>
              ) : null}
            </button>
          )
        })}
      </div>
    </div>
  )
}
