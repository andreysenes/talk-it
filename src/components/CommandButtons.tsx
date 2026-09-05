import { ChevronDown } from 'lucide-react'
import { useState } from 'react'
import { cn } from '../lib/utils'
import type { Language } from '../engine/personalities'

export type CommandKind = 'language' | 'pitch' | 'rate'

function Chip({
  label,
  token,
  open,
  onInsert,
  onToggle,
}: {
  label: string
  token: string
  open: boolean
  onInsert: () => void
  onToggle: () => void
}) {
  return (
    <div className="flex overflow-hidden rounded-full border border-slate-800/15 bg-white/90 shadow-sm">
      <button
        type="button"
        onClick={onInsert}
        className="px-3 py-1.5 text-left text-xs font-semibold text-slate-800 hover:bg-sky-50"
        title={`Insert ${token}`}
      >
        <span className="mr-1.5 text-[10px] font-bold tracking-wide text-slate-400 uppercase">
          {label}
        </span>
        <code className="font-mono text-[11px]">{token}</code>
      </button>
      <button
        type="button"
        onClick={onToggle}
        className={cn(
          'border-l border-slate-800/10 px-2 text-slate-600 hover:bg-sky-50',
          open && 'bg-sky-100 text-sky-800',
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
  language: defaultLanguage,
  pitch: defaultPitch,
  rate: defaultRate,
  onInsert,
}: {
  language: Language
  pitch: number
  rate: number
  onInsert: (token: string) => void
}) {
  const [open, setOpen] = useState<CommandKind | null>(null)
  const [language, setLanguage] = useState<Language>(defaultLanguage)
  const [pitch, setPitch] = useState(defaultPitch)
  const [rate, setRate] = useState(defaultRate)

  const displayLanguage = open === 'language' ? language : defaultLanguage
  const displayPitch = open === 'pitch' ? pitch : defaultPitch
  const displayRate = open === 'rate' ? rate : defaultRate

  const langToken =
    displayLanguage === 'spanish' ? '{{spanish}}' : '{{english}}'
  const pitchToken = `{{pitch ${displayPitch}}}`
  const rateToken = `{{rate ${displayRate}}}`

  function toggle(kind: CommandKind) {
    setOpen((current) => {
      const next = current === kind ? null : kind
      if (next === 'language') setLanguage(defaultLanguage)
      if (next === 'pitch') setPitch(defaultPitch)
      if (next === 'rate') setRate(defaultRate)
      return next
    })
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <Chip
          label="Language"
          token={langToken}
          open={open === 'language'}
          onInsert={() => onInsert(langToken)}
          onToggle={() => toggle('language')}
        />
        <Chip
          label="Pitch"
          token={pitchToken}
          open={open === 'pitch'}
          onInsert={() => onInsert(pitchToken)}
          onToggle={() => toggle('pitch')}
        />
        <Chip
          label="Rate"
          token={rateToken}
          open={open === 'rate'}
          onInsert={() => onInsert(rateToken)}
          onToggle={() => toggle('rate')}
        />
        <span className="text-[11px] text-slate-500">⌘/Ctrl+Enter talks</span>
      </div>
      <p className="text-[11px] leading-relaxed text-slate-500">
        Commands have no close tag — they stick from that word until the next command of
        the same kind. Example:{' '}
        <code className="rounded bg-white/80 px-1 font-mono text-[10px]">
          {'{{spanish}}La {{rate 140}}cocaína {{rate 310}}no es buena para su salud.'}
        </code>
      </p>

      {open === 'language' && (
        <div className="rounded-xl border border-slate-800/10 bg-white/80 p-3">
          <p className="mb-2 text-[11px] font-bold tracking-wide text-slate-500 uppercase">
            Language command
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className={cn(
                'talk-3d rounded-full px-3 py-1.5 text-xs font-bold',
                language === 'english' ? 'bg-sky-700 text-white' : 'bg-white text-slate-700',
              )}
              onClick={() => setLanguage('english')}
            >
              English
            </button>
            <button
              type="button"
              className={cn(
                'talk-3d rounded-full px-3 py-1.5 text-xs font-bold',
                language === 'spanish' ? 'bg-sky-700 text-white' : 'bg-white text-slate-700',
              )}
              onClick={() => setLanguage('spanish')}
            >
              Spanish
            </button>
            <button
              type="button"
              className="talk-3d rounded-full bg-sky-600 px-3 py-1.5 text-xs font-bold text-white"
              onClick={() => onInsert(langToken)}
            >
              Insert
            </button>
          </div>
        </div>
      )}

      {open === 'pitch' && (
        <ValuePanel
          label="Pitch command"
          id="command-pitch"
          value={pitch}
          onChange={setPitch}
          onInsert={() => onInsert(pitchToken)}
        />
      )}

      {open === 'rate' && (
        <ValuePanel
          label="Rate command"
          id="command-rate"
          value={rate}
          onChange={setRate}
          onInsert={() => onInsert(rateToken)}
        />
      )}
    </div>
  )
}

function ValuePanel({
  label,
  id,
  value,
  onChange,
  onInsert,
}: {
  label: string
  id: string
  value: number
  onChange: (n: number) => void
  onInsert: () => void
}) {
  return (
    <div className="rounded-xl border border-slate-800/10 bg-white/80 p-3">
      <label
        htmlFor={id}
        className="mb-2 block text-[11px] font-bold tracking-wide text-slate-500 uppercase"
      >
        {label}
      </label>
      <div className="flex flex-wrap items-center gap-2">
        <input
          id={id}
          name={id}
          type="number"
          value={value}
          onChange={(e) => {
            const n = Number(e.target.value)
            if (Number.isFinite(n)) onChange(n)
          }}
          className="h-9 w-24 rounded-md border-2 border-slate-800/15 bg-white px-2 font-mono text-sm font-bold text-slate-800"
        />
        <button
          type="button"
          className="talk-3d rounded-full bg-sky-600 px-3 py-1.5 text-xs font-bold text-white"
          onClick={onInsert}
        >
          Insert
        </button>
      </div>
    </div>
  )
}
