import { Download, Square, Volume2 } from 'lucide-react'
import { useRef, type ReactNode } from 'react'
import { CommandButtons } from './CommandButtons'
import { VolumeControl } from './VolumeControl'
import { Button } from './ui/button'
import { cn } from '../lib/utils'
import type { Language } from '../engine/personalities'

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

function WordHighlight({
  text,
  start,
  end,
}: {
  text: string
  start: number | null
  end: number | null
}) {
  if (start == null || end == null || end <= start) return text
  return (
    <>
      {text.slice(0, start)}
      <mark className="box-decoration-clone rounded-[2px] bg-neutral-600 px-0.5 text-white">
        {text.slice(start, end)}
      </mark>
      {text.slice(end)}
    </>
  )
}

function insertToken(text: string, token: string, start: number, end: number) {
  const before = text.slice(0, start)
  const after = text.slice(end)
  const lead = before.length > 0 && !/\s$/.test(before) ? ' ' : ''
  const trail = after.length > 0 && !/^\s/.test(after) ? ' ' : ''
  const inserted = `${lead}${token}${trail}`
  return { next: before + inserted + after, caret: before.length + inserted.length }
}

export function TalkPanel({
  text,
  onText,
  pitch,
  speed,
  language,
  speaking,
  rendering,
  exporting,
  error,
  highlight,
  onTalk,
  onStop,
  onExport,
  midi,
  volume,
  onVolume,
}: {
  text: string
  onText: (v: string) => void
  pitch: number
  speed: number
  language: Language
  speaking: boolean
  rendering: boolean
  exporting: boolean
  error: string | null
  highlight: { start: number; end: number } | null
  onTalk: () => void
  onStop: () => void
  onExport: () => void
  midi: ReactNode
  volume: number
  onVolume: (n: number) => void
}) {
  const busy = speaking || rendering || exporting
  const empty = !text.trim()
  const overlayRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  function insertCommand(token: string) {
    const el = textareaRef.current
    const start = el?.selectionStart ?? text.length
    const end = el?.selectionEnd ?? text.length
    const { next, caret } = insertToken(text, token, start, end)
    onText(next)
    requestAnimationFrame(() => {
      const box = textareaRef.current
      if (!box) return
      box.focus()
      box.setSelectionRange(caret, caret)
    })
  }

  return (
    <div className="flex flex-col gap-3">
      <label className="text-[11px] font-medium tracking-[0.18em] text-neutral-500 uppercase" htmlFor="talk-text">
        What to say
      </label>
      <div className="relative">
        {speaking ? (
          <div
            ref={overlayRef}
            className="pointer-events-none absolute inset-0 overflow-auto bg-black p-3 font-sans text-base leading-normal text-neutral-100 whitespace-pre-wrap"
            aria-hidden
          >
            <WordHighlight text={text} start={highlight?.start ?? null} end={highlight?.end ?? null} />
          </div>
        ) : null}
        <textarea
          id="talk-text"
          name="talk-text"
          ref={textareaRef}
          value={text}
          readOnly={speaking}
          onChange={(e) => onText(e.target.value)}
          onScroll={(e) => {
            const overlay = overlayRef.current
            if (overlay) overlay.scrollTop = e.currentTarget.scrollTop
          }}
          placeholder="Type anything. Talk It! will speak it in the selected voice."
          rows={5}
          className={cn(
            'w-full resize-y rounded-sm border border-neutral-800 bg-black p-3 font-sans text-base leading-normal text-neutral-100 outline-none placeholder:text-neutral-600 focus:border-white',
            speaking && 'text-transparent caret-transparent',
            error && 'border-white',
          )}
          onKeyDown={(e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
              e.preventDefault()
              onTalk()
            }
          }}
        />
      </div>
      {error ? (
        <p className="text-sm font-medium text-white" role="alert">
          {error}
        </p>
      ) : null}
      <CommandButtons
        language={language}
        pitch={pitch}
        rate={speed}
        onInsert={insertCommand}
      />

      <div className="flex flex-wrap items-center gap-2">
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
        {midi}
        <VolumeControl value={volume} onChange={onVolume} />
      </div>

      <div className="flex flex-wrap gap-2 pt-1">
        {EXAMPLES.map((ex) => (
          <button
            key={ex.label}
            type="button"
            className="rounded-sm border border-neutral-800 px-3 py-1 text-xs font-medium text-neutral-400 hover:border-white hover:text-white"
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
