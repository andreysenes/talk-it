import {
  applyParsedCommand,
  bagFromRegion,
  bagHasValues,
  CMD_AT_END,
  FALLBACK_VOICE,
  mergeBag,
  parseEmbedded,
  regionIsMuted,
  serializeBag,
  stripInherited,
  type VoicePatch,
  type VoiceState,
} from './commands'
import {
  softVoiceCmdsFromRegion,
  softVoiceDisplayText,
  splitSoftVoiceChunks,
} from './softVoice'
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
  hasSoftVoice: boolean
  muted: boolean
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
  hasSoftVoice: false,
  muted: false,
}

function markPending(pending: typeof CLEAR_FLAGS, name: string) {
  if (name === 'spanish' || name === 'english') pending.hasLanguage = true
  else if (name === 'natural' || name === 'monotone' || name === 'sung') pending.hasQuality = true
  else if (name === 'normal' || name === 'breathy' || name === 'whispered') pending.hasMix = true
  else if (name === 'pitch') pending.hasPitch = true
  else if (name === 'rate' || name === 'speed') pending.hasRate = true
  else if (name === 'scale') pending.hasScale = true
  else if (name === 'vibrato') pending.hasVibrato = true
  else if (name === 'vibrate') pending.hasVibrate = true
  else if (name === 'tremolo') pending.hasTremolo = true
  else if (name === 'trrate') pending.hasTrrate = true
  else if (name === 'breath') pending.hasBreath = true
  else if (name === 'tilt') pending.hasTilt = true
  else if (name === 'effort') pending.hasEffort = true
  else if (name === 'sv') pending.hasSoftVoice = true
}

export function annotateWords(source: string, defaults: VoiceDefaults): DisplayPiece[] {
  const parts = parseEmbedded(source)
  const pieces: DisplayPiece[] = []
  let state: VoiceState = { ...FALLBACK_VOICE, ...defaults }
  let pending = { ...CLEAR_FLAGS }
  let overlay: VoiceState | null = null
  let skipLeadingSpace = false

  for (const part of parts) {
    if (part.kind === 'cmd') {
      markPending(pending, part.name)
      skipLeadingSpace = true
      if (part.name === 'sv') {
        // SoftVoice passthrough — attach to the next word, no VoiceState change.
        if (part.disabled) pending.muted = true
        continue
      }
      if (part.disabled) {
        pending.muted = true
        overlay = applyParsedCommand(overlay ?? state, part.name, part.value)
        continue
      }
      state = applyParsedCommand(state, part.name, part.value)
      continue
    }

    const chunks = splitSoftVoiceChunks(part.text)
    let offset = 0
    for (const chunk of chunks) {
      const start = part.start + offset
      const end = start + chunk.length
      offset += chunk.length
      if (!chunk) continue
      if (/^\s+$/.test(chunk)) {
        const prev = pieces[pieces.length - 1]
        // Skip a space after {{commands}}, but never drop newlines.
        if (skipLeadingSpace && prev?.kind === 'text' && !/\n/.test(chunk)) {
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
          text: softVoiceDisplayText(chunk),
          ...(pending.muted && overlay ? overlay : state),
          ...pending,
        },
      })
      pending = { ...CLEAR_FLAGS }
      overlay = null
    }
  }

  return pieces
}

export function wordsFromPieces(pieces: DisplayPiece[]): WordVoice[] {
  return pieces.flatMap((p) => (p.kind === 'word' ? [p.word] : []))
}

export function wordIsMarked(word: WordVoice): boolean {
  return (
    word.muted ||
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
    word.hasEffort ||
    word.hasSoftVoice
  )
}

function commandRegion(source: string, wordStart: number) {
  let i = wordStart
  // Only skip spaces/tabs before the word — never newlines.
  while (i > 0 && /[ \t]/.test(source[i - 1] ?? '')) i -= 1
  let regionStart = i
  let head = source.slice(0, i)
  while (CMD_AT_END.test(head)) {
    const match = head.match(CMD_AT_END)
    if (!match) break
    regionStart = head.length - match[0].length
    head = head.slice(0, regionStart)
  }
  while (regionStart > 0 && /[ \t]/.test(source[regionStart - 1] ?? '')) {
    regionStart -= 1
  }
  return { regionStart, wordStart }
}

export function visibleText(source: string, defaults: VoiceDefaults): string {
  return annotateWords(source, defaults)
    .map((piece) => (piece.kind === 'text' ? piece.text : piece.word.text))
    .join('')
}

/** Rebuild source from plain words, keeping each word's prior {{commands}} by index. */
export function rewriteVisibleText(
  source: string,
  nextVisible: string,
  defaults: VoiceDefaults,
): string {
  const normalized = nextVisible.replace(/\r\n/g, '\n').replace(/\r/g, '\n')
  if (!normalized.replace(/\s/g, '')) return ''

  const oldWords = wordsFromPieces(annotateWords(source, defaults))
  let wordIndex = 0
  const lines = normalized.split('\n').map((line) => {
    const words = line.replace(/[^\S\n]+/g, ' ').trim().split(' ').filter(Boolean)
    if (!words.length) return ''
    return words
      .map((token) => {
        const old = oldWords[wordIndex++]
        if (!old) return token
        const { regionStart, wordStart } = commandRegion(source, old.start)
        const region = source.slice(regionStart, wordStart)
        const insert = serializeBag(bagFromRegion(region), regionIsMuted(region))
        return insert ? `${insert} ${token}` : token
      })
      .join(' ')
  })
  return lines.join('\n')
}

export function replaceWordText(
  source: string,
  wordStart: number,
  wordEnd: number,
  nextText: string,
): { next: string; wordStart: number } {
  const cleaned = nextText.replace(/\s+/g, ' ').trim()
  const before = source.slice(0, wordStart)
  const after = source.slice(wordEnd)
  if (!cleaned) {
    const lead = before.replace(/[ \t]+$/, '')
    const tail = after.replace(/^[ \t]+/, '')
    if (!lead) return { next: tail.replace(/^\n+/, ''), wordStart: 0 }
    if (!tail) return { next: lead.replace(/\n+$/, ''), wordStart: lead.replace(/\n+$/, '').length }
    if (/\n$/.test(lead) || /^\n/.test(tail)) {
      return { next: `${lead.replace(/\n+$/, '\n')}${tail.replace(/^\n+/, '')}`, wordStart: lead.replace(/\n+$/, '\n').length }
    }
    return { next: `${lead} ${tail}`, wordStart: lead.length + 1 }
  }
  return { next: `${before}${cleaned}${after}`, wordStart }
}

export function appendVisible(source: string, addition: string): string {
  const add = addition.replace(/\s+/g, ' ').trim()
  if (!add) return source
  const base = source.replace(/\s+$/, '')
  if (!base) return add
  return `${base} ${add}`
}

export function setWordVoice(
  source: string,
  wordStart: number,
  patch: VoicePatch,
  inherited: VoiceDefaults,
): { next: string; wordStart: number } {
  const { regionStart } = commandRegion(source, wordStart)
  const region = source.slice(regionStart, wordStart)
  const soft = softVoiceCmdsFromRegion(region).join('')
  const existing = bagFromRegion(region)
  const muted = regionIsMuted(region)
  const bag = serializeBag(stripInherited(mergeBag(existing, patch), inherited), muted)
  const insert = soft && bag ? `${soft} ${bag}` : soft || bag
  return spliceRegion(source, regionStart, wordStart, insert)
}

export function resetWordVoice(
  source: string,
  wordStart: number,
): { next: string; wordStart: number } {
  const { regionStart } = commandRegion(source, wordStart)
  // Keep SoftVoice {{sv …}} melody/rate cmds; clear only Talk It! voice tags.
  const soft = softVoiceCmdsFromRegion(source.slice(regionStart, wordStart)).join('')
  return spliceRegion(source, regionStart, wordStart, soft)
}

export function setWordMuted(
  source: string,
  wordStart: number,
  muted: boolean,
  inherited: VoiceDefaults,
): { next: string; wordStart: number } {
  const { regionStart } = commandRegion(source, wordStart)
  const region = source.slice(regionStart, wordStart)
  const soft = softVoiceCmdsFromRegion(region)
    .map((cmd) => (muted ? cmd.replace('{{sv ', '{{.sv ') : cmd.replace('{{.sv ', '{{sv ')))
    .join('')
  const existing = bagFromRegion(region)
  const stripped = stripInherited(existing, inherited)
  const bag = bagHasValues(stripped) ? stripped : mergeBag(existing, inherited)
  if (!muted && !bagHasValues(stripped)) {
    return spliceRegion(source, regionStart, wordStart, soft)
  }
  const voice = serializeBag(bag, muted)
  const insert = soft && voice ? `${soft} ${voice}` : soft || voice
  return spliceRegion(source, regionStart, wordStart, insert)
}

function spliceRegion(
  source: string,
  regionStart: number,
  wordStart: number,
  insert: string,
): { next: string; wordStart: number } {
  const before = source.slice(0, regionStart)
  const rest = source.slice(wordStart)
  const gapBefore = before.length > 0 && !/\s$/.test(before) && (insert || Boolean(rest))
  const gapAfter =
    !insert && before.length > 0 && rest.length > 0 && !/\s$/.test(before) && !/^\s/.test(rest)
  const next = insert
    ? `${before}${gapBefore ? ' ' : ''}${insert}${rest}`
    : `${before}${gapAfter ? ' ' : ''}${rest}`
  const nextStart = insert
    ? before.length + (gapBefore ? 1 : 0) + insert.length
    : before.length + (gapAfter ? 1 : 0)
  return { next, wordStart: nextStart }
}

export function wordSpeakSnippet(source: string, wordStart: number, wordEnd: number): string {
  const parts = parseEmbedded(source)
  const cmds: string[] = []
  for (const part of parts) {
    if (part.end > wordStart) break
    if (part.kind === 'cmd' && !part.disabled) cmds.push(source.slice(part.start, part.end))
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
