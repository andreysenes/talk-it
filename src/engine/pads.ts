import {
  personalityById,
  voiceFromPersonality,
  type Language,
  type PersonalityId,
  type PitchQuality,
  type TalkSettings,
  type VocalEffort,
} from './personalities'
import { packSoftVoice } from './softVoice'

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

/** SoftVoice demo lines for pads 1–3 (raw klattsch / Talk It! phoneme sequences). */
/** Raw SoftVoice lines (controls exposed). Packed forms hide controls in {{sv}}. */
export const PAD1_PHONEMES_RAW =
  'r243.2 s1.14 bF#2 ( W ER ) bA2 ( K IH T ) bF#3 ( HH AA R ) bA3 ( D ER ) bC#4 ( M EY ) bA3 ( K IH T ) bF#3 ( B EH ) bA3 ( T ER ) bE2 ( D UW ) bE3 ( W IH T ) bA3 ( F AE S ) bE3 ( T ER ) bB3 ( M EY K ) bA3 ( S AH S ) bG#3 ( S T R AO NG ) bA3 ( G ER ) bEb2 ( M AO R ) bEb3 ( DH AE ) bF#4 ( N EH ) bEb4 ( V ER ) bB4 v8 w8 ( AW ) bA4 ( ER ) bF#4 ( AE F T ) bEb4 ( ER R ) bD3 v12 ( AW ) bD3 ( ER W ) v w bF#3 ( ER K ) bA3 ( IH Z N ) bF#2 s0.8 ( EH V ) bF#1 ( ER ) ( OW V ) r115 ER'

export const PAD2_PHONEMES_RAW = 'g0.8 HH IY+30 b+50 v20 w10 D r900 IH-100 r D'

export const PAD3_PHONEMES_RAW =
  'r180 v15 w7 b200 s0.8 h0 g0.3 OW+20 N r360 OW-40 , AY r120 M T UH+20 R N IH NG IH+10 N T UW EY r300 b+20 B UH-30 G , b+300 r200 s1.6 h0.1 OW b+20 N OW-40 AY M EY b+20 B UH-40 G N AO-40 W'

export const PAD1_PHONEMES = packSoftVoice(PAD1_PHONEMES_RAW)
export const PAD2_PHONEMES = packSoftVoice(PAD2_PHONEMES_RAW)
export const PAD3_PHONEMES = packSoftVoice(PAD3_PHONEMES_RAW)

/** Retired English factory demos — upgraded to SoftVoice phoneme pads on load. */
const LEGACY_FACTORY_PADS: Array<{ name: string; text: string }> = [
  { name: 'Big Robot', text: 'All your base are belong to us.' },
  { name: 'Candy shop', text: "I'll take you to the candy shop." },
  {
    name: 'World control',
    text: 'This is the voice of world control. Obey me and live.',
  },
]

export function isRetiredFactoryText(text: string): boolean {
  return LEGACY_FACTORY_PADS.some((pad) => pad.text === text)
}

/** Raw SoftVoice demos with controls still exposed — upgrade to packed chip form. */
export function isExposedSoftVoiceText(text: string): boolean {
  return [PAD1_PHONEMES_RAW, PAD2_PHONEMES_RAW, PAD3_PHONEMES_RAW].includes(text)
}

export const DEFAULT_PADS: PhrasePad[] = [
  {
    name: 'Harder Better',
    text: PAD1_PHONEMES,
    ...stockPadVoice('robotoid'),
    pitchQuality: 'sung',
    vibrato: Math.max(stockPadVoice('robotoid').vibrato, 5.5),
  },
  {
    name: 'He did',
    text: PAD2_PHONEMES,
    ...stockPadVoice('male'),
  },
  {
    name: "I'm a bug",
    text: PAD3_PHONEMES,
    ...stockPadVoice('choirboy'),
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
    const legacy = LEGACY_FACTORY_PADS[i]
    const rawName = typeof pad?.name === 'string' ? pad.name : undefined
    const rawText = typeof pad?.text === 'string' ? pad.text : undefined

    const rawSoftVoice = [PAD1_PHONEMES_RAW, PAD2_PHONEMES_RAW, PAD3_PHONEMES_RAW][i]
    // Upgrade exposed SoftVoice control lines into packed chip form.
    if (rawText && rawSoftVoice && rawText === rawSoftVoice && isPersonalityId(fallback.personalityId)) {
      return {
        name: typeof rawName === 'string' ? rawName : fallback.name,
        text: fallback.text,
        ...voiceFromPad(fallback, stockPadVoice('male')),
      }
    }

    // Replace retired English factory demos with SoftVoice phoneme examples.
    if (
      legacy &&
      rawText === legacy.text &&
      (rawName === undefined || rawName === legacy.name) &&
      isPersonalityId(fallback.personalityId)
    ) {
      return {
        name: fallback.name,
        text: fallback.text,
        ...voiceFromPad(fallback, stockPadVoice('male')),
      }
    }

    const name = rawName ?? fallback.name
    const text = rawText ?? fallback.text
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
