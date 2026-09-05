import {
  personalityById,
  voiceFromPersonality,
  type Language,
  type PersonalityId,
  type PitchQuality,
  type TalkSettings,
  type VocalEffort,
} from './personalities'

export const PAD_COUNT = 12

export const PAD_KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '-', '='] as const

/** MIDI C4 — pad 1. Chromatic up to B4 for pad 12. */
export const PAD_MIDI_C4 = 60

export function padIndexFromKey(event: KeyboardEvent): number | null {
  const key = event.key
  const i = PAD_KEYS.indexOf(key as (typeof PAD_KEYS)[number])
  return i >= 0 ? i : null
}

export function padIndexFromMidiNote(note: number): number | null {
  const i = note - PAD_MIDI_C4
  if (i < 0 || i >= PAD_COUNT) return null
  return i
}

export function midiNoteForPad(index: number): number {
  return PAD_MIDI_C4 + index
}

export type PadVoice = {
  personalityId: PersonalityId
  pitch: number
  speed: number
  pitchQuality: PitchQuality
  vocalEffort: VocalEffort
  language: Language
  vintage: boolean
  vibrato: number
  vibratoRate: number
  scale: number
  loop: boolean
}

export type PhrasePad = {
  name: string
  text: string
} & Partial<PadVoice>

const PERSONALITY_IDS: PersonalityId[] = [
  'male',
  'female',
  'largeMale',
  'child',
  'giantMale',
  'mellowFemale',
  'mellowMale',
  'crispMale',
  'theFly',
  'robotoid',
  'martian',
  'colossus',
  'fastFred',
  'oldWoman',
  'munchkin',
  'troll',
  'nerd',
  'milktoast',
  'tipsy',
  'choirboy',
]

function isPersonalityId(value: unknown): value is PersonalityId {
  return typeof value === 'string' && PERSONALITY_IDS.includes(value as PersonalityId)
}

function isQuality(value: unknown): value is PitchQuality {
  return value === 'natural' || value === 'monotone' || value === 'sung'
}

function isEffort(value: unknown): value is VocalEffort {
  return value === 'normal' || value === 'breathy' || value === 'whispered'
}

function isLanguage(value: unknown): value is Language {
  return value === 'english' || value === 'spanish'
}

function num(value: unknown, fallback: number, min: number, max: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback
  return Math.min(max, Math.max(min, value))
}

export function stockPadVoice(
  personalityId: PersonalityId,
  extras: Partial<Pick<PadVoice, 'language' | 'vintage'>> = {},
): PadVoice {
  const p = personalityById(personalityId)
  const voice = voiceFromPersonality(p)
  return {
    personalityId: p.id,
    ...voice,
    language: extras.language ?? 'english',
    vintage: extras.vintage ?? true,
    loop: false,
  }
}

export function voiceFromPad(pad: Partial<PhrasePad>, fallback: PadVoice): PadVoice {
  const personalityId = isPersonalityId(pad.personalityId)
    ? pad.personalityId
    : fallback.personalityId
  const stock = stockPadVoice(personalityId, {
    language: fallback.language,
    vintage: fallback.vintage,
  })
  return {
    personalityId,
    pitch: num(pad.pitch, stock.pitch, 1, 400),
    speed: num(pad.speed, stock.speed, 1, 400),
    pitchQuality: isQuality(pad.pitchQuality) ? pad.pitchQuality : stock.pitchQuality,
    vocalEffort: isEffort(pad.vocalEffort) ? pad.vocalEffort : stock.vocalEffort,
    language: isLanguage(pad.language) ? pad.language : stock.language,
    vintage: typeof pad.vintage === 'boolean' ? pad.vintage : stock.vintage,
    vibrato: num(pad.vibrato, stock.vibrato, 0, 16),
    vibratoRate: num(pad.vibratoRate, stock.vibratoRate, 0.5, 12),
    scale: num(pad.scale, stock.scale, 0.4, 1.8),
    loop: pad.loop === true,
  }
}

export function talkSettingsFromVoice(voice: PadVoice): TalkSettings {
  return {
    personality: personalityById(voice.personalityId),
    pitch: voice.pitch,
    speed: voice.speed,
    pitchQuality: voice.pitchQuality,
    vocalEffort: voice.vocalEffort,
    language: voice.language,
    vintage: voice.vintage,
    vibrato: voice.vibrato,
    vibratoRate: voice.vibratoRate,
    scale: voice.scale,
  }
}

export function snapshotPad(pad: PhrasePad, text: string, voice: PadVoice): PhrasePad {
  return { name: pad.name, text, ...voice }
}

export function padsEqual(a: PhrasePad, b: PhrasePad): boolean {
  return (
    a.name === b.name &&
    a.text === b.text &&
    a.personalityId === b.personalityId &&
    a.pitch === b.pitch &&
    a.speed === b.speed &&
    a.pitchQuality === b.pitchQuality &&
    a.vocalEffort === b.vocalEffort &&
    a.language === b.language &&
    a.vintage === b.vintage &&
    a.vibrato === b.vibrato &&
    a.vibratoRate === b.vibratoRate &&
    a.scale === b.scale &&
    Boolean(a.loop) === Boolean(b.loop)
  )
}

export const DEFAULT_PADS: PhrasePad[] = [
  {
    name: 'Big Robot',
    text: 'All your base are belong to us.',
    ...stockPadVoice('colossus'),
  },
  {
    name: 'Candy shop',
    text: "I'll take you to the candy shop.",
    ...stockPadVoice('colossus'),
  },
  {
    name: 'World control',
    text: 'This is the voice of world control. Obey me and live.',
    ...stockPadVoice('martian'),
  },
  {
    name: 'Twinkle',
    text: 'Twinkle, twinkle, little star, how I wonder what you are.',
    ...stockPadVoice('mellowMale'),
  },
  ...Array.from({ length: PAD_COUNT - 4 }, () => ({ name: '', text: '' })),
]

export function normalizePads(raw: unknown): PhrasePad[] {
  const pads = Array.isArray(raw) ? raw : []
  return Array.from({ length: PAD_COUNT }, (_, i) => {
    const pad = pads[i] as Partial<PhrasePad> | undefined
    const fallback = DEFAULT_PADS[i] ?? { name: '', text: '' }
    const name = typeof pad?.name === 'string' ? pad.name : fallback.name
    const text = typeof pad?.text === 'string' ? pad.text : fallback.text
    const hasVoice = isPersonalityId(pad?.personalityId)
    if (hasVoice) {
      const voice = voiceFromPad(pad ?? {}, voiceFromPad(fallback, stockPadVoice('male')))
      return { name, text, ...voice }
    }
    const factory =
      text === fallback.text &&
      name === fallback.name &&
      isPersonalityId(fallback.personalityId)
    if (factory) return { name, text, ...voiceFromPad(fallback, stockPadVoice('male')) }
    return { name, text }
  })
}

export function emptyPad(): PhrasePad {
  return { name: '', text: '' }
}

export function padCaption(pad: PhrasePad, index: number): string {
  if (pad.name.trim()) return pad.name
  const visible = pad.text
    .replace(/\{\{[^}]+\}\}/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  if (!visible) return PAD_KEYS[index] ?? String(index + 1)
  const words = visible.split(' ').slice(0, 3).join(' ')
  return words.length > 22 ? `${words.slice(0, 20)}…` : words
}
