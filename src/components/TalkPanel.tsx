import { Download, Square, Volume2 } from 'lucide-react'
import { useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { CommandButtons } from './CommandButtons'
import { VolumeControl } from './VolumeControl'
import { Button } from './ui/button'
import { cn } from '../lib/utils'
import type { Language, Personality, PitchQuality, VocalEffort } from '../engine/personalities'
import { defaultsFromSettings } from '../engine/synth'
import {
  annotateWords,
  inheritedBeforeWord,
  setWordVoice,
  wordFill,
  wordIsMarked,
  wordSpeakSnippet,
  wordSummary,
} from '../engine/wordCommands'
import type { VoicePatch } from '../engine/commands'

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

function WordMenu({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null)
  const [alignRight, setAlignRight] = useState(false)

  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    setAlignRight(rect.right > window.innerWidth - 16)
  }, [])

  return (
    <div
      ref={ref}
      className={cn('absolute top-full z-40 mt-1', alignRight ? 'right-0' : 'left-0')}
    >
      {children}
    </div>
  )
}

const editorClass =
  'w-full min-h-[1.25em] px-0 py-1 font-sans text-2xl leading-snug font-medium tracking-tight text-white outline-none whitespace-pre-wrap sm:text-3xl'

export function TalkActions({
  speaking,
  rendering,
  exporting,
  empty,
  onTalk,
  onStop,
  onExport,
  midi,
  volume,
  onVolume,
}: {
  speaking: boolean
  rendering: boolean
  exporting: boolean
  empty: boolean
  onTalk: () => void
  onStop: () => void
  onExport: () => void
  midi: ReactNode
  volume: number
  onVolume: (n: number) => void
}) {
  const busy = speaking || rendering || exporting
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button type="button" variant="talk" size="lg" disabled={busy || empty} onClick={onTalk}>
        <Volume2 className="size-5" />
        {rendering ? 'Building voice…' : speaking ? 'Talking…' : 'Talk It!'}
      </Button>
      <Button type="button" variant="stop" size="lg" disabled={!speaking} onClick={onStop}>
        <Square className="size-4 fill-current" />
        Stop
      </Button>
      <Button type="button" variant="export" size="lg" disabled={busy || empty} onClick={onExport}>
        <Download className="size-5" />
        {exporting ? 'Exporting…' : 'Export WAV'}
      </Button>
      {midi}
      <VolumeControl value={volume} onChange={onVolume} />
    </div>
  )
}

export function TalkPanel({
  text,
  onText,
  pitch,
  speed,
  language,
  personality,
  pitchQuality,
  vocalEffort,
  speaking,
  error,
  highlight,
  onTalk,
  onSpeakWord,
}: {
  text: string
  onText: (v: string) => void
  pitch: number
  speed: number
  language: Language
  personality: Personality
  pitchQuality: PitchQuality
  vocalEffort: VocalEffort
  speaking: boolean
  error: string | null
  highlight: { start: number; end: number } | null
  onTalk: () => void
  onSpeakWord: (snippet: string) => void
}) {
  const empty = !text.trim()
  const [editing, setEditing] = useState(false)
  const [selectedStart, setSelectedStart] = useState<number | null>(null)
  const editorRef = useRef<HTMLDivElement>(null)
  const textBlockRef = useRef<HTMLDivElement>(null)
  const defaults = useMemo(
    () =>
      defaultsFromSettings({
        personality,
        pitch,
        speed,
        pitchQuality,
        vocalEffort,
        language,
        vintage: true,
      }),
    [personality, pitch, speed, pitchQuality, vocalEffort, language],
  )
  const pieces = useMemo(() => annotateWords(text, defaults), [text, defaults])

  useLayoutEffect(() => {
    if (!editing) return
    const el = editorRef.current
    if (!el) return
    if (el.innerText === text) return
    el.innerText = text
  }, [text, editing])

  useLayoutEffect(() => {
    if (speaking) setEditing(false)
  }, [speaking])

  useEffect(() => {
    if (selectedStart == null) return

    function onPointerDown(event: PointerEvent) {
      const root = textBlockRef.current
      if (!root) return
      if (event.target instanceof Node && root.contains(event.target)) return
      setSelectedStart(null)
    }

    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [selectedStart])

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== ' ' && event.code !== 'Space') return
      if (event.repeat || event.metaKey || event.ctrlKey || event.altKey) return
      if (editing || empty || selectedStart == null) return
      const target = event.target
      if (
        target instanceof HTMLElement &&
        (target.isContentEditable || target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')
      ) {
        return
      }
      const word = pieces.find(
        (piece) => piece.kind === 'word' && piece.word.start === selectedStart,
      )
      if (!word || word.kind !== 'word') return
      event.preventDefault()
      event.stopPropagation()
      onSpeakWord(wordSpeakSnippet(text, word.word.start, word.word.end))
    }

    document.addEventListener('keydown', onKeyDown, true)
    return () => document.removeEventListener('keydown', onKeyDown, true)
  }, [editing, empty, selectedStart, pieces, text, onSpeakWord])

  function applyToSelected(patch: VoicePatch) {
    if (selectedStart == null) return
    const inherited = inheritedBeforeWord(text, selectedStart, defaults)
    const result = setWordVoice(text, selectedStart, patch, inherited)
    setSelectedStart(result.wordStart)
    onText(result.next)
  }

  const showEditor = editing || empty

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-2">
        {EXAMPLES.map((ex) => (
          <button
            key={ex.label}
            type="button"
            className="rounded-sm border border-neutral-800 px-3 py-1 text-xs font-medium text-neutral-400 hover:border-white hover:text-white"
            onClick={() => {
              setSelectedStart(null)
              onText(ex.text)
            }}
            title={ex.hint}
          >
            {ex.label}
          </button>
        ))}
      </div>
      <p
        id="talk-text-label"
        className="text-[11px] font-medium tracking-[0.18em] text-neutral-500 uppercase"
      >
        What to say
      </p>
      <div
        ref={textBlockRef}
        className="relative"
        onKeyDown={(e) => {
          if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
            e.preventDefault()
            onTalk()
          }
        }}
      >
        {showEditor && !speaking ? (
          <div
            key="editing"
            id="talk-text"
            ref={editorRef}
            role="textbox"
            aria-multiline="true"
            aria-labelledby="talk-text-label"
            contentEditable
            suppressContentEditableWarning
            tabIndex={0}
            className={cn(editorClass, 'cursor-text caret-white')}
            onInput={(e) => {
              if (!e.currentTarget.isContentEditable) return
              onText(e.currentTarget.innerText)
            }}
            onPaste={(e) => {
              e.preventDefault()
              const clip = e.clipboardData.getData('text/plain')
              document.execCommand('insertText', false, clip)
            }}
            onBlur={() => {
              if (text.trim()) setEditing(false)
            }}
          />
        ) : (
          <div
            id="talk-text"
            role="group"
            aria-labelledby="talk-text-label"
            className={editorClass}
            onDoubleClick={() => {
              if (!speaking) {
                setSelectedStart(null)
                setEditing(true)
              }
            }}
          >
            {pieces.map((piece, i) => {
              if (piece.kind === 'text') {
                return <span key={`s-${i}`}>{piece.text}</span>
              }
              const word = piece.word
              const marked = wordIsMarked(word)
              const spoken =
                highlight != null &&
                highlight.start < word.end &&
                highlight.end > word.start
              const on = selectedStart === word.start
              return (
                <span key={i} className="relative">
                  <button
                    type="button"
                    title={wordSummary(word)}
                    disabled={speaking}
                    onClick={() =>
                      setSelectedStart((current) => (current === word.start ? null : word.start))
                    }
                    style={marked ? wordFill(word.pitch, word.rate, word.language) : undefined}
                    className={cn(
                      'inline cursor-pointer rounded-[3px] px-0 text-left text-inherit',
                      spoken && 'outline outline-1 outline-offset-1 outline-neutral-400',
                      on && 'ring-1 ring-white',
                      !marked && !spoken && 'hover:bg-neutral-800',
                    )}
                  >
                    {word.text}
                  </button>
                  {on ? (
                    <WordMenu>
                      <CommandButtons
                        state={word}
                        onPatch={(patch) => applyToSelected(patch)}
                      />
                    </WordMenu>
                  ) : null}
                </span>
              )
            })}
          </div>
        )}
        {showEditor && empty ? (
          <p className="pointer-events-none absolute top-1 left-0 text-2xl leading-snug font-medium tracking-tight text-neutral-600 sm:text-3xl">
            Type anything. Talk It! will speak it in the selected voice.
          </p>
        ) : null}
      </div>
      {error ? (
        <p className="text-sm font-medium text-white" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  )
}
