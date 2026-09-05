import {
  applyParsedCommand,
  bagFromRegion,
  CMD_AT_END,
  FALLBACK_VOICE,
  mergeBag,
  parseEmbedded,
  serializeBag,
  stripInherited,
  type VoicePatch,
  type VoiceState,
} from './commands'
import type { Language } from './personalities'

export type WordVoice = VoiceState & {
  start: number
  end: number
  text: string
  hasLanguage: boolean
  hasQuality: boolean
  hasMix: boolean
  hasPitch: boolean
  hasRate: boolean
  hasScale: boolean
  hasVibrato: boolean
  hasVibrate: boolean
  hasTremolo: boolean
  hasTrrate: boolean
  hasBreath: boolean
  hasTilt: boolean
  hasEffort: boolean
}

export type VoiceDefaults = VoiceState

export type DisplayPiece =
  | { kind: 'text'; text: string }
  | { kind: 'word'; word: WordVoice }

const CLEAR_FLAGS = {
  hasLanguage: false,
  hasQuality: false,
  hasMix: false,
  hasPitch: false,
  hasRate: false,
  hasScale: false,
  hasVibrato: false,
  hasVibrate: false,
  hasTremolo: false,
  hasTrrate: false,
  hasBreath: false,
  hasTilt: false,
  hasEffort: false,
}

export function annotateWords(source: string, defaults: VoiceDefaults): DisplayPiece[] {
  const parts = parseEmbedded(source)
  const pieces: DisplayPiece[] = []
  let state: VoiceState = { ...FALLBACK_VOICE, ...defaults }
  let pending = { ...CLEAR_FLAGS }
  let skipLeadingSpace = false

  for (const part of parts) {
    if (part.kind === 'cmd') {
      state = applyParsedCommand(state, part.name, part.value)
      if (part.name === 'spanish' || part.name === 'english') pending.hasLanguage = true
      else if (part.name === 'natural' || part.name === 'monotone' || part.name === 'sung') {
        pending.hasQuality = true
      } else if (part.name === 'normal' || part.name === 'breathy' || part.name === 'whispered') {
        pending.hasMix = true
      } else if (part.name === 'pitch') pending.hasPitch = true
      else if (part.name === 'rate' || part.name === 'speed') pending.hasRate = true
      else if (part.name === 'scale') pending.hasScale = true
      else if (part.name === 'vibrato') pending.hasVibrato = true
      else if (part.name === 'vibrate') pending.hasVibrate = true
      else if (part.name === 'tremolo') pending.hasTremolo = true
      else if (part.name === 'trrate') pending.hasTrrate = true
      else if (part.name === 'breath') pending.hasBreath = true
      else if (part.name === 'tilt') pending.hasTilt = true
      else if (part.name === 'effort') pending.hasEffort = true
      skipLeadingSpace = true
      continue
    }

    const chunks = part.text.split(/(\s+)/)
    let offset = 0
    for (const chunk of chunks) {
      const start = part.start + offset
      const end = start + chunk.length
      offset += chunk.length
      if (!chunk) continue
      if (/^\s+$/.test(chunk)) {
        const prev = pieces[pieces.length - 1]
        if (skipLeadingSpace && prev?.kind === 'text') {
          skipLeadingSpace = false
          continue
        }
        skipLeadingSpace = false
        pieces.push({ kind: 'text', text: chunk })
        continue
      }
      if (skipLeadingSpace && pieces[pieces.length - 1]?.kind === 'word') {
        pieces.push({ kind: 'text', text: ' ' })
      }
      skipLeadingSpace = false
      pieces.push({
        kind: 'word',
        word: {
          start,
          end,
          text: chunk,
          ...state,
          ...pending,
        },
      })
      pending = { ...CLEAR_FLAGS }
    }
  }

  return pieces
}

export function wordsFromPieces(pieces: DisplayPiece[]): WordVoice[] {
  return pieces.flatMap((p) => (p.kind === 'word' ? [p.word] : []))
}

export function wordIsMarked(word: WordVoice): boolean {
  return (
    word.hasLanguage ||
    word.hasQuality ||
    word.hasMix ||
    word.hasPitch ||
    word.hasRate ||
    word.hasScale ||
    word.hasVibrato ||
    word.hasVibrate ||
    word.hasTremolo ||
    word.hasTrrate ||
    word.hasBreath ||
    word.hasTilt ||
    word.hasEffort
  )
}

function commandRegion(source: string, wordStart: number) {
  let i = wordStart
  while (i > 0 && /\s/.test(source[i - 1] ?? '')) i -= 1
  let regionStart = i
  let head = source.slice(0, i)
  while (CMD_AT_END.test(head)) {
    const match = head.match(CMD_AT_END)
    if (!match) break
    regionStart = head.length - match[0].length
    head = head.slice(0, regionStart)
  }
  while (regionStart > 0 && /\s/.test(source[regionStart - 1] ?? '')) {
    regionStart -= 1
  }
  return { regionStart, wordStart }
}

export function setWordVoice(
  source: string,
  wordStart: number,
  patch: VoicePatch,
  inherited: VoiceDefaults,
): { next: string; wordStart: number } {
  const { regionStart } = commandRegion(source, wordStart)
  const existing = bagFromRegion(source.slice(regionStart, wordStart))
  const insert = serializeBag(stripInherited(mergeBag(existing, patch), inherited))
  const before = source.slice(0, regionStart)
  const rest = source.slice(wordStart)
  const next = insert
    ? `${before}${before ? ' ' : ''}${insert}${rest}`
    : `${before}${before && rest ? ' ' : ''}${rest}`
  const nextStart = insert
    ? before.length + (before ? 1 : 0) + insert.length
    : before.length + (before && rest ? 1 : 0)
  return { next, wordStart: nextStart }
}

export function wordSpeakSnippet(source: string, wordStart: number, wordEnd: number): string {
  const parts = parseEmbedded(source)
  const cmds: string[] = []
  for (const part of parts) {
    if (part.end > wordStart) break
    if (part.kind === 'cmd') cmds.push(source.slice(part.start, part.end))
  }
  const word = source.slice(wordStart, wordEnd).trim()
  if (!word) return cmds.join(' ')
  return cmds.length ? `${cmds.join(' ')} ${word}` : word
}

export function inheritedBeforeWord(
  source: string,
  wordStart: number,
  defaults: VoiceDefaults,
): VoiceDefaults {
  const { regionStart } = commandRegion(source, wordStart)
  const prefix = annotateWords(source.slice(0, regionStart), defaults)
  const prior = wordsFromPieces(prefix)
  const last = prior[prior.length - 1]
  if (!last) return defaults
  return {
    language: last.language,
    quality: last.quality,
    mix: last.mix,
    pitch: last.pitch,
    rate: last.rate,
    scale: last.scale,
    vibrato: last.vibrato,
    vibrate: last.vibrate,
    tremolo: last.tremolo,
    trrate: last.trrate,
    breath: last.breath,
    tilt: last.tilt,
    effort: last.effort,
  }
}

/** Hue from pitch (low = blue, high = amber). Alpha from rate. */
export function wordFill(
  pitch: number,
  rate: number,
  language: Language,
): { backgroundColor: string } {
  const p = Math.min(1, Math.max(0, (Math.abs(pitch) - 50) / 350))
  const r = Math.min(1, Math.max(0, (Math.abs(rate) - 40) / 360))
  const hue = 215 - p * 195
  const sat = language === 'spanish' ? 68 : 52
  const light = 38 + p * 10
  const alpha = 0.2 + r * 0.5
  return { backgroundColor: `hsla(${hue.toFixed(0)}, ${sat}%, ${light}%, ${alpha.toFixed(2)})` }
}

export function wordSummary(word: WordVoice): string {
  const bits = [
    word.language === 'spanish' ? 'Spanish' : 'English',
    word.quality,
    word.mix,
    `pitch ${word.pitch}`,
    `rate ${word.rate}`,
    `scale ${word.scale}`,
    `vibrato ${word.vibrato}`,
    `breath ${word.breath}`,
  ]
  return bits.join(' · ')
}
