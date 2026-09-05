import { useEffect } from 'react'
import { cn } from '../lib/utils'
import { PAD_KEYS, padCaption, padIndexFromKey, type PhrasePad } from '../engine/pads'

export function PadBank({
  pads,
  active,
  onSelect,
  onClear,
}: {
  pads: PhrasePad[]
  active: number
  onSelect: (index: number, play?: boolean) => void
  onClear: (index: number) => void
}) {
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.repeat || event.metaKey || event.ctrlKey || event.altKey) return
      const target = event.target
      if (
        target instanceof HTMLElement &&
        (target.isContentEditable ||
          target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT')
      ) {
        return
      }
      const index = padIndexFromKey(event)
      if (index == null) return
      event.preventDefault()
      onSelect(index, true)
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onSelect])

  return (
    <div>
      <p className="mb-2 text-[11px] font-medium tracking-[0.18em] text-neutral-500 uppercase">
        Pads
      </p>
      <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
        {pads.map((pad, i) => {
          const on = i === active
          const filled = Boolean(pad.text.trim() || pad.name.trim())
          return (
            <button
              key={i}
              type="button"
              title={
                filled
                  ? `${padCaption(pad, i)} · ${PAD_KEYS[i]} talks · right-click to clear`
                  : `Pad ${PAD_KEYS[i]} · press ${PAD_KEYS[i]} to talk after you save a line`
              }
              onClick={() => onSelect(i)}
              onContextMenu={(event) => {
                event.preventDefault()
                onClear(i)
              }}
              className={cn(
                'group relative min-h-14 rounded-sm border px-2 py-1.5 text-left',
                on && 'border-white bg-white text-black',
                !on && filled && 'border-neutral-700 text-neutral-200 hover:border-white',
                !on && !filled && 'border-dashed border-neutral-800 text-neutral-600 hover:border-neutral-500',
              )}
            >
              <span
                className={cn(
                  'block font-mono text-[10px] tracking-wider',
                  on ? 'text-neutral-500' : 'text-neutral-600',
                )}
              >
                {PAD_KEYS[i]}
              </span>
              <span className="mt-0.5 block truncate text-xs font-medium">
                {padCaption(pad, i)}
              </span>
              {filled ? (
                <span
                  role="button"
                  tabIndex={0}
                  aria-label={`Clear pad ${PAD_KEYS[i]}`}
                  className={cn(
                    'absolute top-1 right-1 flex size-4 items-center justify-center rounded-sm text-sm leading-none',
                    on ? 'text-neutral-400 hover:bg-black/10 hover:text-black' : 'text-neutral-600 hover:bg-white/10 hover:text-white',
                    'opacity-100 sm:opacity-0 sm:group-hover:opacity-100',
                  )}
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
