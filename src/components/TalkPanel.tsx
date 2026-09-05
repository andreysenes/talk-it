import { Download, Square, Volume2 } from 'lucide-react'
import { Button } from './ui/button'
import { cn } from '../lib/utils'

const EXAMPLES = [
  {
    label: 'Big Robot',
    text: 'All your base are belong to us.',
    hint: 'Colossus / Untrust Us energy',
  },
  {
    label: 'Candy shop',
    text: "I'll take you to the candy shop.",
    hint: 'Crystal Castles line',
  },
  {
    label: 'World control',
    text: 'This is the voice of world control. Obey me and live.',
    hint: 'SoftVoice Colossus demo',
  },
  {
    label: 'Twinkle',
    text: 'Twinkle, twinkle, little star, how I wonder what you are.',
    hint: 'Try Child + Sung',
  },
]

export function TalkPanel({
  text,
  onText,
  speaking,
  rendering,
  exporting,
  error,
  onTalk,
  onStop,
  onExport,
}: {
  text: string
  onText: (v: string) => void
  speaking: boolean
  rendering: boolean
  exporting: boolean
  error: string | null
  onTalk: () => void
  onStop: () => void
  onExport: () => void
}) {
  const busy = speaking || rendering || exporting
  const empty = !text.trim()

  return (
    <div className="flex flex-col gap-3">
      <label className="font-display text-sm font-bold tracking-wide text-sky-950/80 uppercase" htmlFor="talk-text">
        What to say
      </label>
      <textarea
        id="talk-text"
        value={text}
        onChange={(e) => onText(e.target.value)}
        placeholder="Type anything. Talk It! will speak it in the selected voice."
        rows={5}
        className={cn(
          'w-full resize-y rounded-xl border-2 border-slate-800/15 bg-white/90 p-3 font-sans text-base text-slate-800 shadow-inner outline-none focus:border-sky-500',
          error && 'border-red-400',
        )}
        onKeyDown={(e) => {
          if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
            e.preventDefault()
            onTalk()
          }
        }}
      />
      {error ? (
        <p className="text-sm font-semibold text-red-700" role="alert">
          {error}
        </p>
      ) : (
        <p className="text-xs text-slate-600">
          Embedded commands work like the original engine:{' '}
          <code className="rounded bg-white/80 px-1">{'{{spanish}}'}</code>{' '}
          <code className="rounded bg-white/80 px-1">{'{{pitch 66}}'}</code>{' '}
          <code className="rounded bg-white/80 px-1">{'{{rate 138}}'}</code>
          . ⌘/Ctrl+Enter talks.
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="talk"
          size="lg"
          disabled={busy || empty}
          onClick={onTalk}
        >
          <Volume2 className="size-5" />
          {rendering ? 'Building voice…' : speaking ? 'Talking…' : 'Talk It!'}
        </Button>
        <Button
          type="button"
          variant="stop"
          size="lg"
          disabled={!speaking}
          onClick={onStop}
        >
          <Square className="size-4 fill-current" />
          Stop
        </Button>
        <Button
          type="button"
          variant="export"
          size="lg"
          disabled={busy || empty}
          onClick={onExport}
        >
          <Download className="size-5" />
          {exporting ? 'Exporting…' : 'Export WAV'}
        </Button>
      </div>

      <div className="flex flex-wrap gap-2 pt-1">
        {EXAMPLES.map((ex) => (
          <button
            key={ex.label}
            type="button"
            className="rounded-full border border-slate-800/10 bg-white/70 px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-white"
            onClick={() => onText(ex.text)}
            title={ex.hint}
          >
            {ex.label}
          </button>
        ))}
      </div>
    </div>
  )
}
