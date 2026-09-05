import {
  compileString,
  encodeWav,
  renderToBuffer,
  type ScheduleEvent,
} from 'klattsch'
import { phonesToArpabet, textToPhones } from './g2p'
import {
  type Personality,
  type PitchQuality,
  type TalkSettings,
  type VocalEffort,
} from './personalities'

export type { TalkSettings }

export type RenderedUtterance = {
  samples: Float32Array
  sampleRate: number
  durationMs: number
  phonemes: string
  words: SpokenWord[]
}

export type SpokenWord = {
  start: number
  end: number
  startMs: number
  endMs: number
}

const BASE_F0 = 110
const BASE_RATE_MS = 110
const BASE_SPEED = 150

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n))
}

export function pitchToHz(pitch: number): number {
  const safe = Number.isFinite(pitch) && pitch !== 0 ? pitch : 1
  return Math.max(1, BASE_F0 * (Math.abs(safe) / 100))
}

export function speedToRateMs(speed: number, quality: PitchQuality): number {
  const sung = quality === 'sung' ? 1.28 : 1
  const safe = Number.isFinite(speed) && speed !== 0 ? speed : 1
  return BASE_RATE_MS * (BASE_SPEED / Math.abs(safe)) * sung
}

function effortMix(
  personality: Personality,
  vocalEffort: VocalEffort,
): { breath: number; effort: number; whisper: boolean } {
  if (vocalEffort === 'whispered') {
    return { breath: 0.92, effort: 0.12, whisper: true }
  }
  if (vocalEffort === 'breathy') {
    return {
      breath: clamp(personality.breath + 0.38, 0, 1),
      effort: clamp(personality.effort - 0.18, 0.08, 1),
      whisper: false,
    }
  }
  return {
    breath: personality.breath,
    effort: personality.effort,
    whisper: false,
  }
}

function voicePrefix(settings: TalkSettings): string {
  const { personality, pitch, speed, pitchQuality, vocalEffort } = settings
  const f0 = pitchToHz(pitch)
  const rate = speedToRateMs(speed, pitchQuality)
  const mix = effortMix(personality, vocalEffort)
  const vib =
    pitchQuality === 'sung'
      ? Math.max(personality.vibrato, 4)
      : pitchQuality === 'monotone'
        ? 0
        : personality.vibrato
  const tilt = personality.tilt + (vocalEffort === 'whispered' ? -0.12 : 0)

  return [
    `b${f0.toFixed(1)}`,
    `r${rate.toFixed(0)}`,
    `s${personality.scale.toFixed(3)}`,
    `h${mix.breath.toFixed(2)}`,
    `g${mix.effort.toFixed(2)}`,
    `t${tilt.toFixed(2)}`,
    `v${vib.toFixed(1)}`,
    `w${personality.vibratoRate.toFixed(1)}`,
  ].join(' ')
}

export const COMMAND_RE =
  /\{\{\s*(spanish|english|pitch\s+-?\d+|rate\s+-?\d+|speed\s+-?\d+)\s*\}\}/gi

type Embedded =
  | { kind: 'text'; text: string; start: number; end: number }
  | { kind: 'spanish'; start: number; end: number }
  | { kind: 'english'; start: number; end: number }
  | { kind: 'pitch'; value: number; start: number; end: number }
  | { kind: 'rate'; value: number; start: number; end: number }

export function parseEmbedded(text: string): Embedded[] {
  const out: Embedded[] = []
  const re = new RegExp(COMMAND_RE.source, 'gi')
  let last = 0
  let match: RegExpExecArray | null
  while ((match = re.exec(text))) {
    if (match.index > last) {
      out.push({ kind: 'text', text: text.slice(last, match.index), start: last, end: match.index })
    }
    const body = (match[1] ?? '').trim().toLowerCase()
    const start = match.index
    const end = match.index + match[0].length
    if (body === 'spanish' || body === 'english') {
      out.push({ kind: body, start, end })
    } else {
      const [name, raw] = body.split(/\s+/)
      const value = Number(raw)
      if (Number.isFinite(value) && value !== 0) {
        out.push({ kind: name === 'pitch' ? 'pitch' : 'rate', value, start, end })
      }
    }
    last = match.index + match[0].length
  }
  if (last < text.length) {
    out.push({ kind: 'text', text: text.slice(last), start: last, end: text.length })
  }
  return out
}

export function textToPhonemeString(
  text: string,
  settings: TalkSettings,
): string {
  return planUtterance(text, settings).phonemes
}

type PlannedWord = { start: number; end: number; phoneCount: number }

function planUtterance(
  text: string,
  settings: TalkSettings,
): { phonemes: string; words: PlannedWord[] } {
  const parts = parseEmbedded(text)
  const tokens: string[] = [voicePrefix(settings)]
  const words: PlannedWord[] = []
  let language = settings.language
  const question = /\?\s*$/.test(text.replace(COMMAND_RE, ' '))
  const lastTextIndex = parts.reduce(
    (acc, part, i) => (part.kind === 'text' && part.text.trim() ? i : acc),
    -1,
  )

  for (let i = 0; i < parts.length; i++) {
    const part = parts[i]
    if (!part) continue
    if (part.kind === 'spanish') {
      language = 'spanish'
      continue
    }
    if (part.kind === 'english') {
      language = 'english'
      continue
    }
    if (part.kind === 'pitch') {
      tokens.push(`b${pitchToHz(part.value).toFixed(1)}`)
      continue
    }
    if (part.kind === 'rate') {
      tokens.push(`r${speedToRateMs(part.value, settings.pitchQuality).toFixed(0)}`)
      continue
    }
    const chunks = textToPhones(part.text, language, part.start)
    for (const chunk of chunks) {
      if (chunk.phones.length) {
        words.push({
          start: chunk.start,
          end: chunk.end,
          phoneCount: chunk.phones.length,
        })
      }
    }
    const arpabet = phonesToArpabet(
      chunks,
      settings.pitchQuality,
      question && i === lastTextIndex,
      i === lastTextIndex,
    )
    if (arpabet) tokens.push(arpabet)
  }

  return { phonemes: tokens.join(' ').trim(), words }
}

function crush8bit(samples: Float32Array, fromRate: number): {
  samples: Float32Array
  sampleRate: number
} {
  const targetRate = 11025
  const ratio = fromRate / targetRate
  const out = new Float32Array(Math.max(1, Math.floor(samples.length / ratio)))
  for (let i = 0; i < out.length; i++) {
    const src = samples[Math.min(samples.length - 1, Math.floor(i * ratio))] ?? 0
    const stepped = Math.round(src * 127) / 127
    out[i] = stepped
  }
  return { samples: out, sampleRate: targetRate }
}

function applyWhisper(schedule: ScheduleEvent[]): ScheduleEvent[] {
  return schedule.map((event) => ({
    ...event,
    target: {
      ...event.target,
      voicing: (event.target.voicing ?? 0) * 0.08,
      aspiration: Math.max(event.target.aspiration ?? 0, 0.85),
      gain: (event.target.gain ?? 3.5) * 1.15,
    },
  }))
}

function timedWords(
  planned: PlannedWord[],
  phrases: Array<{ phoneme?: string | null; tStartMs?: number; tEndMs?: number }> | undefined,
  compiledMs: number,
  audioMs: number,
): SpokenWord[] {
  const phones = (phrases ?? []).filter((p) => p.phoneme)
  const scale = compiledMs > 0 ? audioMs / compiledMs : 1
  let i = 0
  const usedPhones = phones.length > 0 && phones.length >= planned.reduce((n, w) => n + w.phoneCount, 0)

  if (usedPhones) {
    return planned.map((word) => {
      const n = Math.max(1, word.phoneCount)
      const slice = phones.slice(i, i + n)
      i += n
      const startMs = (slice[0]?.tStartMs ?? 0) * scale
      const endMs = (slice[slice.length - 1]?.tEndMs ?? startMs) * scale
      return { start: word.start, end: word.end, startMs, endMs }
    })
  }

  const totalPhones = planned.reduce((n, w) => n + Math.max(1, w.phoneCount), 0) || 1
  let t = 0
  return planned.map((word) => {
    const share = Math.max(1, word.phoneCount) / totalPhones
    const startMs = t
    const endMs = t + audioMs * share
    t = endMs
    return { start: word.start, end: word.end, startMs, endMs }
  })
}

export function renderUtterance(
  text: string,
  settings: TalkSettings,
): RenderedUtterance {
  const planned = planUtterance(text, settings)
  const compiled = compileString(planned.phonemes)
  let schedule = compiled.schedule
  if (settings.vocalEffort === 'whispered') schedule = applyWhisper(schedule)

  const sampleRate = settings.vintage ? 22050 : 44100
  let samples = renderToBuffer({
    sampleRate,
    schedule,
    totalMs: compiled.totalMs + 80,
  })

  if (settings.vintage) {
    const crushed = crush8bit(samples, sampleRate)
    samples = crushed.samples
    const audioMs = (samples.length / crushed.sampleRate) * 1000
    return {
      samples,
      sampleRate: crushed.sampleRate,
      durationMs: compiled.totalMs,
      phonemes: planned.phonemes,
      words: timedWords(planned.words, compiled.phrases, compiled.totalMs, audioMs),
    }
  }

  const audioMs = (samples.length / sampleRate) * 1000
  return {
    samples,
    sampleRate,
    durationMs: compiled.totalMs,
    phonemes: planned.phonemes,
    words: timedWords(planned.words, compiled.phrases, compiled.totalMs, audioMs),
  }
}

export function utteranceToWav(utterance: RenderedUtterance): Uint8Array {
  const { bytes } = encodeWav(utterance.samples, utterance.sampleRate, {
    peakNormalize: 0.92,
    metadata: {
      software: 'OpenTalkIt Mac',
      comment: utterance.phonemes,
    },
  })
  return bytes
}

export function wavToBlob(bytes: Uint8Array): Blob {
  const copy = new Uint8Array(bytes.byteLength)
  copy.set(bytes)
  return new Blob([copy.buffer], { type: 'audio/wav' })
}

export function suggestFileName(text: string): string {
  const snippet = text
    .replace(/\{\{[^}]+\}\}/g, ' ')
    .replace(/[^A-Za-z0-9 ]+/g, ' ')
    .trim()
    .slice(0, 24)
    .trim()
  return `${snippet || 'talkit'}.wav`
}
