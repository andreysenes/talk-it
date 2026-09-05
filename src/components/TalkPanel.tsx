import { Download, Square, Volume2 } from 'lucide-react'
import { useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { CommandButtons } from './CommandButtons'
import { PadBank } from './PadBank'
import { VolumeControl } from './VolumeControl'
import { Button } from './ui/button'
import { cn } from '../lib/utils'
import type { Language, Personality, PitchQuality, VocalEffort } from '../engine/personalities'
import { defaultsFromSettings } from '../engine/synth'
import {
  annotateWords,
  appendVisible,
  inheritedBeforeWord,
  replaceWordText,
  setWordVoice,
  wordFill,
  wordIsMarked,
  wordSpeakSnippet,
  wordSummary,
} from '../engine/wordCommands'
import type { VoicePatch } from '../engine/commands'
import type { PhrasePad } from '../engine/pads'

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

const wordClass =
  'inline rounded-[3px] px-0 text-left text-2xl leading-snug font-medium tracking-tight text-inherit sm:text-3xl'

function WordEditor({
  text,
  className,
  style,
  onCommit,
  onDeselect,
}: {
  text: string
  className: string
  style?: { backgroundColor: string }
  onCommit: (next: string) => void
  onDeselect: () => void
}) {
  const [value, setValue] = useState(text)
  const skipBlur = useRef(false)

  useLayoutEffect(() => {
    setValue(text)
  }, [text])

  return (
    <input
      value={value}
      aria-label="Word"
      size={Math.max(1, value.length)}
      style={style}
      className={cn(
        wordClass,
        'inline w-auto min-w-[1ch] bg-transparent outline-none ring-1 ring-white',
        className,
      )}
      onChange={(event) => setValue(event.target.value)}
      onBlur={() => {
        if (skipBlur.current) {
          skipBlur.current = false
          return
        }
        onCommit(value)
      }}
      onKeyDown={(event) => {
        event.stopPropagation()
        if (event.key === 'Enter') {
          event.preventDefault()
          event.currentTarget.blur()
        }
        if (event.key === 'Escape') {
          event.preventDefault()
          skipBlur.current = true
          setValue(text)
          onDeselect()
        }
      }}
      onPointerDown={(event) => event.stopPropagation()}
    />
  )
}

function LineComposer({
  onCommit,
  onFocus,
}: {
  onCommit: (text: string) => void
  onFocus?: () => void
}) {
  const [value, setValue] = useState('')

  function commit() {
    const next = value.replace(/\s+/g, ' ').trim()
    if (!next) return
    onCommit(next)
    setValue('')
  }

  return (
    <input
      value={value}
      aria-label="Add words"
      size={Math.max(1, value.length)}
      className={cn(
        wordClass,
        'inline w-auto min-w-[8ch] bg-transparent caret-white outline-none',
      )}
      onFocus={onFocus}
      onChange={(event) => setValue(event.target.value)}
      onBlur={commit}
      onKeyDown={(event) => {
        event.stopPropagation()
        if (event.key === 'Enter') {
          event.preventDefault()
          commit()
        }
      }}
    />
  )
}

export function TalkActions({
  speaking,
  paused,
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
  paused: boolean
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
        {rendering ? 'Building voice…' : paused ? 'Paused' : speaking ? 'Talking…' : 'Talk It!'}
      </Button>
      <Button
        type="button"
        variant="stop"
        size="lg"
        disabled={!speaking && !paused}
        onClick={onStop}
      >
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
  vibrato,
  vibratoRate,
  scale,
  speaking,
  paused,
  error,
  highlight,
  onTalk,
  onSpeakWord,
  onPause,
  onResume,
  pads,
  activePad,
  onSelectPad,
  onClearPad,
}: {
  text: string
  onText: (v: string) => void
  pitch: number
  speed: number
  language: Language
  personality: Personality
  pitchQuality: PitchQuality
  vocalEffort: VocalEffort
  vibrato: number
  vibratoRate: number
  scale: number
  speaking: boolean
  paused: boolean
  error: string | null
  highlight: { start: number; end: number } | null
  onTalk: () => void
  onSpeakWord: (snippet: string) => void
  onPause: () => void
  onResume: () => void
  pads: PhrasePad[]
  activePad: number
  onSelectPad: (index: number, play?: boolean) => void
  onClearPad: (index: number) => void
}) {
  const empty = !text.trim()
  const live = speaking || paused
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
        vibrato,
        vibratoRate,
        scale,
      }),
    [personality, pitch, speed, pitchQuality, vocalEffort, language, vibrato, vibratoRate, scale],
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
    if (live) setEditing(false)
  }, [live])

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
      if (editing) return
      const target = event.target
      if (
        target instanceof HTMLElement &&
        (target.isContentEditable || target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')
      ) {
        return
      }
      if (speaking) {
        event.preventDefault()
        event.stopPropagation()
        onPause()
        return
      }
      if (paused) {
        event.preventDefault()
        event.stopPropagation()
        onResume()
        return
      }
      if (empty) return
      event.preventDefault()
      event.stopPropagation()
      if (selectedStart != null) {
        const word = pieces.find(
          (piece) => piece.kind === 'word' && piece.word.start === selectedStart,
        )
        if (word && word.kind === 'word') {
          onSpeakWord(wordSpeakSnippet(text, word.word.start, word.word.end))
          return
        }
      }
      onTalk()
    }

    document.addEventListener('keydown', onKeyDown, true)
    return () => document.removeEventListener('keydown', onKeyDown, true)
  }, [
    editing,
    empty,
    selectedStart,
    pieces,
    text,
    speaking,
    paused,
    onSpeakWord,
    onTalk,
    onPause,
    onResume,
  ])

  function applyToSelected(patch: VoicePatch) {
    if (selectedStart == null) return
    const inherited = inheritedBeforeWord(text, selectedStart, defaults)
    const result = setWordVoice(text, selectedStart, patch, inherited)
    setSelectedStart(result.wordStart)
    onText(result.next)
  }

  function renameSelected(nextText: string) {
    if (selectedStart == null) return
    const word = pieces.find(
      (piece) => piece.kind === 'word' && piece.word.start === selectedStart,
    )
    if (!word || word.kind !== 'word') return
    if (nextText === word.word.text) return
    const result = replaceWordText(text, word.word.start, word.word.end, nextText)
    onText(result.next)
    const nextPieces = annotateWords(result.next, defaults)
    const nextWord =
      nextPieces.find(
        (piece) => piece.kind === 'word' && piece.word.start === result.wordStart,
      ) ?? nextPieces.find((piece) => piece.kind === 'word')
    setSelectedStart(nextWord && nextWord.kind === 'word' ? nextWord.word.start : null)
  }

  const showEditor = empty || editing

  return (
    <div className="flex flex-col gap-3">
      <PadBank
        pads={pads}
        active={activePad}
        onSelect={(index, play) => {
          setSelectedStart(null)
          setEditing(false)
          onSelectPad(index, play)
        }}
        onClear={(index) => {
          setSelectedStart(null)
          setEditing(false)
          onClearPad(index)
        }}
      />
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
        {showEditor && !live ? (
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
            onFocus={() => setEditing(true)}
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
              const fill = marked ? wordFill(word.pitch, word.rate, word.language) : undefined
              return (
                <span key={i} className="relative">
                  {on ? (
                    <WordEditor
                      text={word.text}
                      style={fill}
                      className={cn(spoken && 'outline outline-1 outline-offset-1 outline-neutral-400')}
                      onCommit={renameSelected}
                      onDeselect={() => setSelectedStart(null)}
                    />
                  ) : (
                    <button
                      type="button"
                      title={wordSummary(word)}
                      disabled={live}
                      onClick={() => setSelectedStart(word.start)}
                      style={fill}
                      className={cn(
                        wordClass,
                        'cursor-pointer',
                        spoken && 'outline outline-1 outline-offset-1 outline-neutral-400',
                        !marked && !spoken && 'hover:bg-neutral-800',
                      )}
                    >
                      {word.text}
                    </button>
                  )}
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
            {live ? null : (
              <LineComposer
                key={activePad}
                onFocus={() => setSelectedStart(null)}
                onCommit={(added) => onText(appendVisible(text, added))}
              />
            )}
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
