import {
  compileString,
  encodeWav,
  renderToBuffer,
  type ScheduleEvent,
} from 'klattsch'
import {
  applyParsedCommand,
  COMMAND_RE,
  parseEmbedded,
  type VoiceState,
} from './commands'
import { phonesToArpabet, textToPhones } from './g2p'
import {
  type Personality,
  type PitchQuality,
  type TalkSettings,
  type VocalEffort,
} from './personalities'

export type { TalkSettings }
export { COMMAND_RE, parseEmbedded }

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
  const safe = Number.isFinite(speed) && speed !== 0 ? speed : 1
  const base = BASE_RATE_MS * (BASE_SPEED / Math.abs(safe))
  if (quality !== 'sung') return base
  // klattsch `(syllable)` groups share ONE rate slot for every phone inside.
  // Floor the hold so sung notes linger instead of rushing through the word.
  return Math.max(base * 2.7, 400)
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

export function defaultsFromSettings(settings: TalkSettings): VoiceState {
  const { personality, pitch, speed, pitchQuality, vocalEffort, language } = settings
  const mix = effortMix(personality, vocalEffort)
  const scale = settings.scale ?? personality.scale
  const vibrate = settings.vibratoRate ?? personality.vibratoRate
  const vib =
    settings.vibrato ??
    (pitchQuality === 'sung'
      ? Math.max(personality.vibrato, 5.5)
      : pitchQuality === 'monotone'
        ? 0
        : personality.vibrato)
  return {
    language,
    quality: pitchQuality,
    mix: vocalEffort,
    pitch,
    rate: speed,
    scale,
    vibrato: vib,
    vibrate,
    tremolo: 0,
    trrate: 5,
    breath: mix.breath,
    tilt: personality.tilt + (vocalEffort === 'whispered' ? -0.12 : 0),
    effort: mix.effort,
  }
}

function applyMix(state: VoiceState, personality: Personality, mix: VocalEffort): VoiceState {
  const next = effortMix(personality, mix)
  return {
    ...state,
    mix,
    breath: next.breath,
    effort: next.effort,
    tilt: personality.tilt + (mix === 'whispered' ? -0.12 : 0),
  }
}

function emitKlattsch(state: VoiceState): string[] {
  return [
    `b${pitchToHz(state.pitch).toFixed(1)}`,
    `r${speedToRateMs(state.rate, state.quality).toFixed(0)}`,
    `s${state.scale.toFixed(3)}`,
    `h${state.breath.toFixed(2)}`,
    `g${state.effort.toFixed(2)}`,
    `t${state.tilt.toFixed(2)}`,
    `v${state.vibrato.toFixed(1)}`,
    `w${state.vibrate.toFixed(1)}`,
    `m${state.tremolo.toFixed(2)}`,
    `n${state.trrate.toFixed(1)}`,
  ]
}

function voicePrefix(settings: TalkSettings): string {
  return emitKlattsch(defaultsFromSettings(settings)).join(' ')
}

function emitChange(before: VoiceState, after: VoiceState): string[] {
  const out: string[] = []
  if (before.pitch !== after.pitch) out.push(`b${pitchToHz(after.pitch).toFixed(1)}`)
  if (before.rate !== after.rate || before.quality !== after.quality) {
    out.push(`r${speedToRateMs(after.rate, after.quality).toFixed(0)}`)
  }
  if (before.scale !== after.scale) out.push(`s${after.scale.toFixed(3)}`)
  if (before.breath !== after.breath) out.push(`h${after.breath.toFixed(2)}`)
  if (before.effort !== after.effort) out.push(`g${after.effort.toFixed(2)}`)
  if (before.tilt !== after.tilt) out.push(`t${after.tilt.toFixed(2)}`)
  if (before.vibrato !== after.vibrato) out.push(`v${after.vibrato.toFixed(1)}`)
  if (before.vibrate !== after.vibrate) out.push(`w${after.vibrate.toFixed(1)}`)
  if (before.tremolo !== after.tremolo) out.push(`m${after.tremolo.toFixed(2)}`)
  if (before.trrate !== after.trrate) out.push(`n${after.trrate.toFixed(1)}`)
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
  let state = defaultsFromSettings(settings)
  const question = /\?\s*$/.test(text.replace(COMMAND_RE, ' '))
  const lastTextIndex = parts.reduce(
    (acc, part, i) => (part.kind === 'text' && part.text.trim() ? i : acc),
    -1,
  )

  for (let i = 0; i < parts.length; i++) {
    const part = parts[i]
    if (!part) continue
    if (part.kind === 'cmd') {
      if (part.disabled) continue
      const before = state
      state = applyParsedCommand(state, part.name, part.value)
      if (part.name === 'sung') state = { ...state, vibrato: Math.max(state.vibrato, 5.5) }
      else if (part.name === 'monotone') state = { ...state, vibrato: 0 }
      else if (part.name === 'natural') {
        state = { ...state, vibrato: settings.vibrato ?? settings.personality.vibrato }
      } else if (part.name === 'normal' || part.name === 'breathy' || part.name === 'whispered') {
        state = applyMix(state, settings.personality, state.mix)
      }
      tokens.push(...emitChange(before, state))
      continue
    }
    const chunks = textToPhones(part.text, state.language, part.start)
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
      state.quality,
      question && i === lastTextIndex,
      i === lastTextIndex,
      pitchToHz(state.pitch),
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

/** Map elapsed time on an old render onto the equivalent offset (seconds) in a new render. */
export function mapPlayOffsetSec(
  elapsedMs: number,
  oldWords: SpokenWord[],
  newWords: SpokenWord[],
): number | null {
  if (!newWords.length) return null
  if (!oldWords.length) return 0
  const oldLast = oldWords[oldWords.length - 1]!
  if (elapsedMs >= oldLast.endMs) return null

  const oldFirst = oldWords[0]!
  const newFirst = newWords[0]!
  if (elapsedMs <= oldFirst.startMs) {
    if (oldFirst.startMs <= 0) return newFirst.startMs / 1000
    return ((elapsedMs / oldFirst.startMs) * newFirst.startMs) / 1000
  }

  let index = 0
  for (let i = 0; i < oldWords.length; i++) {
    if (elapsedMs >= oldWords[i]!.startMs) index = i
    else break
  }
  const oldWord = oldWords[index]!
  const matchByStart = newWords.find((word) => word.start === oldWord.start)
  const newWord = matchByStart ?? newWords[Math.min(index, newWords.length - 1)]!

  if (elapsedMs >= oldWord.endMs) {
    const next = oldWords[index + 1]
    if (!next) return null
    const nextNew =
      newWords.find((word) => word.start === next.start) ??
      newWords[Math.min(index + 1, newWords.length - 1)]!
    return nextNew.startMs / 1000
  }

  const span = Math.max(1, oldWord.endMs - oldWord.startMs)
  const progress = Math.min(1, Math.max(0, (elapsedMs - oldWord.startMs) / span))
  return (newWord.startMs + progress * Math.max(0, newWord.endMs - newWord.startMs)) / 1000
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
