import { ChevronDown } from 'lucide-react'
import { useEffect, useState } from 'react'
import { cn } from '../lib/utils'
import type { Language } from '../engine/personalities'

export type CommandKind = 'language' | 'pitch' | 'rate'

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
  selectedLabel: string | null
  onLanguage: (l: Language) => void
  onPitch: (n: number) => void
  onRate: (n: number) => void
}) {
  const [open, setOpen] = useState<CommandKind | null>(null)
  const armed = selectedLabel != null

  useEffect(() => {
    if (armed) setOpen('pitch')
    else setOpen(null)
  }, [armed, selectedLabel])

  const langToken = language === 'spanish' ? '{{spanish}}' : '{{english}}'
  const pitchToken = `{{pitch ${pitch}}}`
  const rateToken = `{{rate ${rate}}}`

  function toggle(kind: CommandKind) {
    if (!armed) return
    setOpen((current) => (current === kind ? null : kind))
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <Chip
          label="Language"
          token={langToken}
          open={open === 'language'}
          disabled={!armed}
          onToggle={() => toggle('language')}
        />
        <Chip
          label="Pitch"
          token={pitchToken}
          open={open === 'pitch'}
          disabled={!armed}
          onToggle={() => toggle('pitch')}
        />
        <Chip
          label="Rate"
          token={rateToken}
          open={open === 'rate'}
          disabled={!armed}
          onToggle={() => toggle('rate')}
        />
        <span className="text-[11px] text-neutral-600">
          {armed ? selectedLabel : 'Tap a word · double-click to type'}
          {' · '}⌘/Ctrl+Enter talks
        </span>
      </div>

      {armed && open === 'language' ? (
        <div className="rounded-sm border border-neutral-800 bg-black p-3">
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

      {armed && open === 'pitch' ? (
        <ValuePanel
          label="Pitch"
          id="command-pitch"
          value={pitch}
          onChange={onPitch}
        />
      ) : null}

      {armed && open === 'rate' ? (
        <ValuePanel label="Rate" id="command-rate" value={rate} onChange={onRate} />
      ) : null}
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
    <div className="rounded-sm border border-neutral-800 bg-black p-3">
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
    </div>
  )
}
