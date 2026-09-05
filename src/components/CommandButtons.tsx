import { ChevronDown } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { cn } from '../lib/utils'
import type { Language } from '../engine/personalities'

export type CommandKind = 'language' | 'pitch' | 'rate'

const popoverClass =
  'absolute top-full left-0 z-50 mt-1 min-w-[12rem] rounded-sm border border-neutral-800 bg-[#0c0c0c] p-3 shadow-lg shadow-black/60'

function Chip({
  label,
  token,
  open,
  disabled,
  onToggle,
}: {
  label: string
  token: string
  open: boolean
  disabled?: boolean
  onToggle: () => void
}) {
  return (
    <div className="flex overflow-hidden rounded-sm border border-neutral-800">
      <button
        type="button"
        disabled={disabled}
        onClick={onToggle}
        className="px-3 py-1.5 text-left text-xs font-medium text-neutral-200 hover:bg-neutral-900 disabled:opacity-40"
      >
        <span className="mr-1.5 text-[10px] font-medium tracking-[0.14em] text-neutral-500 uppercase">
          {label}
        </span>
        <code className="font-mono text-[11px] text-neutral-300">{token}</code>
      </button>
      <button
        type="button"
        disabled={disabled}
        onClick={onToggle}
        className={cn(
          'border-l border-neutral-800 px-2 text-neutral-500 hover:bg-neutral-900 hover:text-white disabled:opacity-40',
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
  language,
  pitch,
  rate,
  selectedLabel,
  onLanguage,
  onPitch,
  onRate,
}: {
  language: Language
  pitch: number
  rate: number
  selectedLabel: string
  onLanguage: (l: Language) => void
  onPitch: (n: number) => void
  onRate: (n: number) => void
}) {
  const [open, setOpen] = useState<CommandKind | null>('pitch')
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setOpen('pitch')
  }, [selectedLabel])

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

  const langToken = language === 'spanish' ? '{{spanish}}' : '{{english}}'
  const pitchToken = `{{pitch ${pitch}}}`
  const rateToken = `{{rate ${rate}}}`

  function toggle(kind: CommandKind) {
    setOpen((current) => (current === kind ? null : kind))
  }

  return (
    <div
      ref={rootRef}
      className="relative z-20 flex flex-wrap items-center gap-2 overflow-visible rounded-sm bg-[#0c0c0c] p-1 shadow-lg shadow-black/60"
    >
      <div className="relative overflow-visible">
        <Chip
          label="Language"
          token={langToken}
          open={open === 'language'}
          onToggle={() => toggle('language')}
        />
        {open === 'language' ? (
          <div className={popoverClass} role="dialog">
            <p className="mb-2 text-[11px] font-medium tracking-[0.18em] text-neutral-500 uppercase">
              Language
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className={cn(
                  'rounded-sm px-3 py-1.5 text-xs font-medium',
                  language === 'english'
                    ? 'bg-white text-black'
                    : 'border border-neutral-800 text-neutral-400 hover:text-white',
                )}
                onClick={() => onLanguage('english')}
              >
                English
              </button>
              <button
                type="button"
                className={cn(
                  'rounded-sm px-3 py-1.5 text-xs font-medium',
                  language === 'spanish'
                    ? 'bg-white text-black'
                    : 'border border-neutral-800 text-neutral-400 hover:text-white',
                )}
                onClick={() => onLanguage('spanish')}
              >
                Spanish
              </button>
            </div>
          </div>
        ) : null}
      </div>

      <div className="relative overflow-visible">
        <Chip
          label="Pitch"
          token={pitchToken}
          open={open === 'pitch'}
          onToggle={() => toggle('pitch')}
        />
        {open === 'pitch' ? (
          <div className={popoverClass} role="dialog">
            <ValuePanel label="Pitch" id="command-pitch" value={pitch} onChange={onPitch} />
          </div>
        ) : null}
      </div>

      <div className="relative overflow-visible">
        <Chip
          label="Rate"
          token={rateToken}
          open={open === 'rate'}
          onToggle={() => toggle('rate')}
        />
        {open === 'rate' ? (
          <div className={popoverClass} role="dialog">
            <ValuePanel label="Rate" id="command-rate" value={rate} onChange={onRate} />
          </div>
        ) : null}
      </div>

      <span className="text-[11px] text-neutral-600">
        {selectedLabel}
        {' · '}⌘/Ctrl+Enter talks
      </span>
    </div>
  )
}

function ValuePanel({
  label,
  id,
  value,
  onChange,
}: {
  label: string
  id: string
  value: number
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
        value={value}
        onChange={(e) => {
          const n = Number(e.target.value)
          if (Number.isFinite(n) && n !== 0) onChange(n)
        }}
        className="h-8 w-24 rounded-sm border border-neutral-700 bg-black px-2 font-mono text-sm font-medium text-white outline-none focus:border-white"
      />
    </>
  )
}
