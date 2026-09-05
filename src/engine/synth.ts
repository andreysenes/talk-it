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

const COMMAND_RE = /\{\{\s*(spanish|english|pitch\s+\d+|rate\s+\d+|speed\s+\d+)\s*\}\}/gi

export function applyEmbeddedCommands(
  text: string,
  settings: TalkSettings,
): { text: string; settings: TalkSettings } {
  let next: TalkSettings = { ...settings }
  const cleaned = text.replace(COMMAND_RE, (raw) => {
    const cmd = raw.slice(2, -2).trim().toLowerCase()
    if (cmd === 'spanish') next = { ...next, language: 'spanish' }
    else if (cmd === 'english') next = { ...next, language: 'english' }
    else if (cmd.startsWith('pitch')) {
      const n = Number(cmd.split(/\s+/)[1])
      if (Number.isFinite(n) && n !== 0) next = { ...next, pitch: n }
    } else if (cmd.startsWith('rate') || cmd.startsWith('speed')) {
      const n = Number(cmd.split(/\s+/)[1])
      if (Number.isFinite(n) && n !== 0) next = { ...next, speed: n }
    }
    return ' '
  })
  return { text: cleaned, settings: next }
}

export function textToPhonemeString(
  text: string,
  settings: TalkSettings,
): string {
  const { text: cleaned, settings: resolved } = applyEmbeddedCommands(
    text,
    settings,
  )
  const question = /\?\s*$/.test(cleaned)
  const chunks = textToPhones(cleaned, resolved.language)
  const arpabet = phonesToArpabet(chunks, resolved.pitchQuality, question)
  return `${voicePrefix(resolved)} ${arpabet}`.trim()
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

export function renderUtterance(
  text: string,
  settings: TalkSettings,
): RenderedUtterance {
  const phonemes = textToPhonemeString(text, settings)
  const compiled = compileString(phonemes)
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
    return {
      samples: crushed.samples,
      sampleRate: crushed.sampleRate,
      durationMs: compiled.totalMs,
      phonemes,
    }
  }

  return {
    samples,
    sampleRate,
    durationMs: compiled.totalMs,
    phonemes,
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
