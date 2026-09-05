import { parseEmbedded } from './synth'
import type { Language } from './personalities'

export type WordVoice = {
  start: number
  end: number
  text: string
  language: Language
  pitch: number
  rate: number
  hasLanguage: boolean
  hasPitch: boolean
  hasRate: boolean
}

export type VoiceDefaults = {
  language: Language
  pitch: number
  rate: number
}

export type DisplayPiece =
  | { kind: 'text'; text: string }
  | { kind: 'word'; word: WordVoice }

const CMD_AT_END =
  /\{\{\s*(?:spanish|english|pitch\s+-?\d+|rate\s+-?\d+|speed\s+-?\d+)\s*\}\}\s*$/i

export function annotateWords(source: string, defaults: VoiceDefaults): DisplayPiece[] {
  const parts = parseEmbedded(source)
  const pieces: DisplayPiece[] = []
  let language = defaults.language
  let pitch = defaults.pitch
  let rate = defaults.rate
  let pending = { language: false, pitch: false, rate: false }

  for (const part of parts) {
    if (part.kind === 'spanish' || part.kind === 'english') {
      language = part.kind
      pending.language = true
      continue
    }
    if (part.kind === 'pitch') {
      pitch = part.value
      pending.pitch = true
      continue
    }
    if (part.kind === 'rate') {
      rate = part.value
      pending.rate = true
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
        pieces.push({ kind: 'text', text: chunk })
        continue
      }
      const word: WordVoice = {
        start,
        end,
        text: chunk,
        language,
        pitch,
        rate,
        hasLanguage: pending.language,
        hasPitch: pending.pitch,
        hasRate: pending.rate,
      }
      pending = { language: false, pitch: false, rate: false }
      pieces.push({ kind: 'word', word })
    }
  }

  return pieces
}

export function wordsFromPieces(pieces: DisplayPiece[]): WordVoice[] {
  return pieces.flatMap((p) => (p.kind === 'word' ? [p.word] : []))
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
  return { regionStart, wordStart }
}

function tokensFromRegion(region: string) {
  let language: Language | null = null
  let pitch: number | null = null
  let rate: number | null = null
  const re =
    /\{\{\s*(spanish|english|pitch\s+-?\d+|rate\s+-?\d+|speed\s+-?\d+)\s*\}\}/gi
  let match: RegExpExecArray | null
  while ((match = re.exec(region))) {
    const body = (match[1] ?? '').trim().toLowerCase()
    if (body === 'spanish' || body === 'english') language = body
    else {
      const [name, raw] = body.split(/\s+/)
      const value = Number(raw)
      if (!Number.isFinite(value) || value === 0) continue
      if (name === 'pitch') pitch = value
      else rate = value
    }
  }
  return { language, pitch, rate }
}

function serializeCommands(cmds: {
  language: Language | null
  pitch: number | null
  rate: number | null
}) {
  const bits: string[] = []
  if (cmds.language) bits.push(`{{${cmds.language}}}`)
  if (cmds.pitch != null) bits.push(`{{pitch ${cmds.pitch}}}`)
  if (cmds.rate != null) bits.push(`{{rate ${cmds.rate}}}`)
  return bits.length ? `${bits.join(' ')} ` : ''
}

export function setWordVoice(
  source: string,
  wordStart: number,
  patch: Partial<{ language: Language; pitch: number; rate: number }>,
  inherited: VoiceDefaults,
): { next: string; wordStart: number } {
  const { regionStart } = commandRegion(source, wordStart)
  const existing = tokensFromRegion(source.slice(regionStart, wordStart))
  const nextCmds = {
    language: patch.language !== undefined ? patch.language : existing.language,
    pitch: patch.pitch !== undefined ? patch.pitch : existing.pitch,
    rate: patch.rate !== undefined ? patch.rate : existing.rate,
  }
  if (nextCmds.language === inherited.language) nextCmds.language = null
  if (nextCmds.pitch === inherited.pitch) nextCmds.pitch = null
  if (nextCmds.rate === inherited.rate) nextCmds.rate = null
  const insert = serializeCommands(nextCmds)
  return {
    next: source.slice(0, regionStart) + insert + source.slice(wordStart),
    wordStart: regionStart + insert.length,
  }
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
  return { language: last.language, pitch: last.pitch, rate: last.rate }
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
  const lang = word.language === 'spanish' ? 'Spanish' : 'English'
  return `${lang} · pitch ${word.pitch} · rate ${word.rate}`
}
