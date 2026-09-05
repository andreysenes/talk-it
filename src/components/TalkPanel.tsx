import { Download, Square, Volume2 } from 'lucide-react'
import { useLayoutEffect, useRef, type ReactNode } from 'react'
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

const editorClass =
  'min-h-[10rem] w-full rounded-sm border border-neutral-800 bg-black px-1 py-2 font-sans text-2xl leading-snug font-medium tracking-tight text-white outline-none whitespace-pre-wrap sm:min-h-[12rem] sm:text-3xl sm:leading-snug'

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

function caretOffsets(el: HTMLElement, fallback: number) {
  const sel = window.getSelection()
  if (!sel || sel.rangeCount === 0 || !el.contains(sel.anchorNode)) {
    return { start: fallback, end: fallback }
  }
  const range = sel.getRangeAt(0)
  const pre = range.cloneRange()
  pre.selectNodeContents(el)
  pre.setEnd(range.startContainer, range.startOffset)
  const start = pre.toString().length
  return { start, end: start + range.toString().length }
}

function placeCaret(el: HTMLElement, offset: number) {
  const sel = window.getSelection()
  if (!sel) return
  const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT)
  let pos = 0
  let node = walker.nextNode()
  while (node) {
    const len = node.textContent?.length ?? 0
    if (pos + len >= offset) {
      const range = document.createRange()
      range.setStart(node, Math.max(0, offset - pos))
      range.collapse(true)
      sel.removeAllRanges()
      sel.addRange(range)
      return
    }
    pos += len
    node = walker.nextNode()
  }
  const range = document.createRange()
  range.selectNodeContents(el)
  range.collapse(false)
  sel.removeAllRanges()
  sel.addRange(range)
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
  const editorRef = useRef<HTMLDivElement>(null)
  const caretRef = useRef<number | null>(null)

  useLayoutEffect(() => {
    if (speaking) return
    const el = editorRef.current
    if (!el) return
    if (el.innerText === text) return
    el.innerText = text
    if (caretRef.current != null) {
      placeCaret(el, caretRef.current)
      caretRef.current = null
    }
  }, [text, speaking])

  function insertCommand(token: string) {
    const el = editorRef.current
    const { start, end } = el ? caretOffsets(el, text.length) : { start: text.length, end: text.length }
    const { next, caret } = insertToken(text, token, start, end)
    caretRef.current = caret
    onText(next)
    requestAnimationFrame(() => editorRef.current?.focus())
  }

  return (
    <div className="flex flex-col gap-3">
      <p
        id="talk-text-label"
        className="text-[11px] font-medium tracking-[0.18em] text-neutral-500 uppercase"
      >
        What to say
      </p>
      <div className="relative">
        {speaking ? (
          <div className={cn(editorClass, error && 'border-white')}>
            <WordHighlight text={text} start={highlight?.start ?? null} end={highlight?.end ?? null} />
          </div>
        ) : (
          <div
            id="talk-text"
            ref={editorRef}
            role="textbox"
            aria-multiline="true"
            aria-labelledby="talk-text-label"
            contentEditable
            suppressContentEditableWarning
            tabIndex={0}
            className={cn(editorClass, 'cursor-text caret-white focus:border-white', error && 'border-white')}
            onInput={(e) => onText(e.currentTarget.innerText)}
            onPaste={(e) => {
              e.preventDefault()
              const clip = e.clipboardData.getData('text/plain')
              document.execCommand('insertText', false, clip)
            }}
            onKeyDown={(e) => {
              if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
                e.preventDefault()
                onTalk()
              }
            }}
          />
        )}
        {!speaking && empty ? (
          <p className="pointer-events-none absolute top-2 left-1 text-2xl leading-snug font-medium tracking-tight text-neutral-600 sm:text-3xl">
            Type anything. Talk It! will speak it in the selected voice.
          </p>
        ) : null}
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
