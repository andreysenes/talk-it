import type { Language, PitchQuality, VocalEffort } from './personalities'

export type VoiceState = {
  language: Language
  quality: PitchQuality
  mix: VocalEffort
  pitch: number
  rate: number
  scale: number
  vibrato: number
  vibrate: number
  tremolo: number
  trrate: number
  breath: number
  tilt: number
  effort: number
}

export const FALLBACK_VOICE: VoiceState = {
  language: 'english',
  quality: 'natural',
  mix: 'normal',
  pitch: 100,
  rate: 150,
  scale: 1,
  vibrato: 0,
  vibrate: 5,
  tremolo: 0,
  trrate: 5,
  breath: 0,
  tilt: 0,
  effort: 0.5,
}

export type VoicePatch = Partial<VoiceState>

export type ParsedPart =
  | { kind: 'text'; text: string; start: number; end: number }
  | { kind: 'cmd'; name: string; value: number | null; start: number; end: number }

export const COMMAND_RE = /\{\{\s*[a-z]+(?:\s+-?\d+(?:\.\d+)?)?\s*\}\}/gi

const FLAG_TO_FIELD = {
  spanish: ['language', 'spanish'],
  english: ['language', 'english'],
  natural: ['quality', 'natural'],
  monotone: ['quality', 'monotone'],
  sung: ['quality', 'sung'],
  normal: ['mix', 'normal'],
  breathy: ['mix', 'breathy'],
  whispered: ['mix', 'whispered'],
} as const satisfies Record<string, readonly [keyof VoiceState, string]>

const NUMBER_FIELDS = {
  pitch: { key: 'pitch', digits: 0 },
  rate: { key: 'rate', digits: 0 },
  speed: { key: 'rate', digits: 0 },
  scale: { key: 'scale', digits: 2 },
  vibrato: { key: 'vibrato', digits: 1 },
  vibrate: { key: 'vibrate', digits: 1 },
  tremolo: { key: 'tremolo', digits: 2 },
  trrate: { key: 'trrate', digits: 1 },
  breath: { key: 'breath', digits: 2 },
  tilt: { key: 'tilt', digits: 2 },
  effort: { key: 'effort', digits: 2 },
} as const satisfies Record<string, { key: keyof VoiceState; digits: number }>

export type ChipId =
  | 'language'
  | 'quality'
  | 'mix'
  | 'pitch'
  | 'rate'
  | 'scale'
  | 'vibrato'
  | 'vibrate'
  | 'tremolo'
  | 'trrate'
  | 'breath'
  | 'tilt'
  | 'effort'

export const COMMAND_CHIPS: Array<{
  id: ChipId
  label: string
  kind: 'choice' | 'number'
  token: (state: VoiceState) => string
  step?: number
  min?: number
  max?: number
  allowZero?: boolean
  choices?: Array<{ id: string; label: string }>
}> = [
  {
    id: 'language',
    label: 'Language',
    kind: 'choice',
    token: (s) => `{{${s.language}}}`,
    choices: [
      { id: 'english', label: 'English' },
      { id: 'spanish', label: 'Spanish' },
    ],
  },
  {
    id: 'quality',
    label: 'Quality',
    kind: 'choice',
    token: (s) => `{{${s.quality}}}`,
    choices: [
      { id: 'natural', label: 'Natural' },
      { id: 'monotone', label: 'Monotone' },
      { id: 'sung', label: 'Sung' },
    ],
  },
  {
    id: 'mix',
    label: 'Voice',
    kind: 'choice',
    token: (s) => `{{${s.mix}}}`,
    choices: [
      { id: 'normal', label: 'Normal' },
      { id: 'breathy', label: 'Breathy' },
      { id: 'whispered', label: 'Whispered' },
    ],
  },
  {
    id: 'pitch',
    label: 'Pitch',
    kind: 'number',
    token: (s) => `{{pitch ${fmt(s.pitch, 0)}}}`,
    step: 1,
    min: 1,
    max: 400,
  },
  {
    id: 'rate',
    label: 'Rate',
    kind: 'number',
    token: (s) => `{{rate ${fmt(s.rate, 0)}}}`,
    step: 1,
    min: 1,
    max: 400,
  },
  {
    id: 'scale',
    label: 'Scale',
    kind: 'number',
    token: (s) => `{{scale ${fmt(s.scale, 2)}}}`,
    step: 0.01,
    min: 0.4,
    max: 1.8,
    allowZero: true,
  },
  {
    id: 'vibrato',
    label: 'Vibrato',
    kind: 'number',
    token: (s) => `{{vibrato ${fmt(s.vibrato, 1)}}}`,
    step: 0.1,
    min: 0,
    max: 16,
    allowZero: true,
  },
  {
    id: 'vibrate',
    label: 'Vibrato rate',
    kind: 'number',
    token: (s) => `{{vibrate ${fmt(s.vibrate, 1)}}}`,
    step: 0.1,
    min: 0.5,
    max: 12,
    allowZero: true,
  },
  {
    id: 'tremolo',
    label: 'Tremolo',
    kind: 'number',
    token: (s) => `{{tremolo ${fmt(s.tremolo, 2)}}}`,
    step: 0.01,
    min: 0,
    max: 1,
    allowZero: true,
  },
  {
    id: 'trrate',
    label: 'Tremolo rate',
    kind: 'number',
    token: (s) => `{{trrate ${fmt(s.trrate, 1)}}}`,
    step: 0.1,
    min: 0.5,
    max: 12,
    allowZero: true,
  },
  {
    id: 'breath',
    label: 'Breath',
    kind: 'number',
    token: (s) => `{{breath ${fmt(s.breath, 2)}}}`,
    step: 0.01,
    min: 0,
    max: 1,
    allowZero: true,
  },
  {
    id: 'tilt',
    label: 'Tilt',
    kind: 'number',
    token: (s) => `{{tilt ${fmt(s.tilt, 2)}}}`,
    step: 0.01,
    min: -0.9,
    max: 0.9,
    allowZero: true,
  },
  {
    id: 'effort',
    label: 'Effort',
    kind: 'number',
    token: (s) => `{{effort ${fmt(s.effort, 2)}}}`,
    step: 0.01,
    min: 0,
    max: 1,
    allowZero: true,
  },
]

export function fmt(n: number, digits: number): string {
  return digits === 0 ? String(Math.round(n)) : n.toFixed(digits)
}

export function sameValue(a: number | undefined, b: number | undefined, digits: number): boolean {
  if (typeof a !== 'number' || typeof b !== 'number') return a === b
  return fmt(a, digits) === fmt(b, digits)
}

export function parseEmbedded(text: string): ParsedPart[] {
  const out: ParsedPart[] = []
  const re = new RegExp(COMMAND_RE.source, 'gi')
  let last = 0
  let match: RegExpExecArray | null
  while ((match = re.exec(text))) {
    if (match.index > last) {
      out.push({ kind: 'text', text: text.slice(last, match.index), start: last, end: match.index })
    }
    const start = match.index
    const end = match.index + match[0].length
    const inner = match[0].slice(2, -2).trim()
    const parsed = inner.match(/^([a-z]+)(?:\s+(-?\d+(?:\.\d+)?))?$/i)
    const name = parsed?.[1]?.toLowerCase() ?? ''
    const raw = parsed?.[2]
    if (name in FLAG_TO_FIELD && raw === undefined) {
      out.push({ kind: 'cmd', name, value: null, start, end })
    } else if (name in NUMBER_FIELDS && raw !== undefined) {
      const value = Number(raw)
      if (Number.isFinite(value)) {
        const skipZero = name === 'pitch' || name === 'rate' || name === 'speed'
        if (!skipZero || value !== 0) out.push({ kind: 'cmd', name, value, start, end })
      }
    }
    last = end
  }
  if (last < text.length) {
    out.push({ kind: 'text', text: text.slice(last), start: last, end: text.length })
  }
  return out
}

export function applyParsedCommand(state: VoiceState, name: string, value: number | null): VoiceState {
  const flag = FLAG_TO_FIELD[name as keyof typeof FLAG_TO_FIELD]
  if (flag) {
    const [key, next] = flag
    return { ...state, [key]: next }
  }
  const num = NUMBER_FIELDS[name as keyof typeof NUMBER_FIELDS]
  if (num && value != null) return { ...state, [num.key]: value }
  return state
}

export type CommandBag = {
  language: Language | null
  quality: PitchQuality | null
  mix: VocalEffort | null
  pitch: number | null
  rate: number | null
  scale: number | null
  vibrato: number | null
  vibrate: number | null
  tremolo: number | null
  trrate: number | null
  breath: number | null
  tilt: number | null
  effort: number | null
}

const EMPTY_BAG: CommandBag = {
  language: null,
  quality: null,
  mix: null,
  pitch: null,
  rate: null,
  scale: null,
  vibrato: null,
  vibrate: null,
  tremolo: null,
  trrate: null,
  breath: null,
  tilt: null,
  effort: null,
}

export function emptyBag(): CommandBag {
  return { ...EMPTY_BAG }
}

export function bagFromRegion(region: string): CommandBag {
  const bag = emptyBag()
  for (const part of parseEmbedded(region)) {
    if (part.kind !== 'cmd') continue
    const next = applyParsedCommand(
      {
        language: bag.language ?? 'english',
        quality: bag.quality ?? 'natural',
        mix: bag.mix ?? 'normal',
        pitch: bag.pitch ?? 0,
        rate: bag.rate ?? 0,
        scale: bag.scale ?? 0,
        vibrato: bag.vibrato ?? 0,
        vibrate: bag.vibrate ?? 0,
        tremolo: bag.tremolo ?? 0,
        trrate: bag.trrate ?? 0,
        breath: bag.breath ?? 0,
        tilt: bag.tilt ?? 0,
        effort: bag.effort ?? 0,
      },
      part.name,
      part.value,
    )
    const flag = FLAG_TO_FIELD[part.name as keyof typeof FLAG_TO_FIELD]
    if (flag) {
      const [key] = flag
      ;(bag as Record<string, unknown>)[key] = next[key]
      continue
    }
    const num = NUMBER_FIELDS[part.name as keyof typeof NUMBER_FIELDS]
    if (num) (bag as Record<string, unknown>)[num.key] = next[num.key]
  }
  return bag
}

const SERIALIZE_NUM: Array<{ key: keyof CommandBag; name: string; digits: number }> = [
  { key: 'pitch', name: 'pitch', digits: 0 },
  { key: 'rate', name: 'rate', digits: 0 },
  { key: 'scale', name: 'scale', digits: 2 },
  { key: 'vibrato', name: 'vibrato', digits: 1 },
  { key: 'vibrate', name: 'vibrate', digits: 1 },
  { key: 'tremolo', name: 'tremolo', digits: 2 },
  { key: 'trrate', name: 'trrate', digits: 1 },
  { key: 'breath', name: 'breath', digits: 2 },
  { key: 'tilt', name: 'tilt', digits: 2 },
  { key: 'effort', name: 'effort', digits: 2 },
]

export function serializeBag(bag: CommandBag): string {
  const bits: string[] = []
  if (bag.language) bits.push(`{{${bag.language}}}`)
  if (bag.quality) bits.push(`{{${bag.quality}}}`)
  if (bag.mix) bits.push(`{{${bag.mix}}}`)
  for (const item of SERIALIZE_NUM) {
    const value = bag[item.key]
    if (typeof value === 'number') bits.push(`{{${item.name} ${fmt(value, item.digits)}}}`)
  }
  return bits.length ? `${bits.join(' ')} ` : ''
}

export function mergeBag(existing: CommandBag, patch: VoicePatch): CommandBag {
  return {
    language: patch.language !== undefined ? patch.language : existing.language,
    quality: patch.quality !== undefined ? patch.quality : existing.quality,
    mix: patch.mix !== undefined ? patch.mix : existing.mix,
    pitch: patch.pitch !== undefined ? patch.pitch : existing.pitch,
    rate: patch.rate !== undefined ? patch.rate : existing.rate,
    scale: patch.scale !== undefined ? patch.scale : existing.scale,
    vibrato: patch.vibrato !== undefined ? patch.vibrato : existing.vibrato,
    vibrate: patch.vibrate !== undefined ? patch.vibrate : existing.vibrate,
    tremolo: patch.tremolo !== undefined ? patch.tremolo : existing.tremolo,
    trrate: patch.trrate !== undefined ? patch.trrate : existing.trrate,
    breath: patch.breath !== undefined ? patch.breath : existing.breath,
    tilt: patch.tilt !== undefined ? patch.tilt : existing.tilt,
    effort: patch.effort !== undefined ? patch.effort : existing.effort,
  }
}

export function stripInherited(bag: CommandBag, inherited: VoiceState): CommandBag {
  return {
    language: bag.language && bag.language !== inherited.language ? bag.language : null,
    quality: bag.quality && bag.quality !== inherited.quality ? bag.quality : null,
    mix: bag.mix && bag.mix !== inherited.mix ? bag.mix : null,
    pitch: bag.pitch != null && !sameValue(bag.pitch, inherited.pitch, 0) ? bag.pitch : null,
    rate: bag.rate != null && !sameValue(bag.rate, inherited.rate, 0) ? bag.rate : null,
    scale: bag.scale != null && !sameValue(bag.scale, inherited.scale, 2) ? bag.scale : null,
    vibrato: bag.vibrato != null && !sameValue(bag.vibrato, inherited.vibrato, 1) ? bag.vibrato : null,
    vibrate: bag.vibrate != null && !sameValue(bag.vibrate, inherited.vibrate, 1) ? bag.vibrate : null,
    tremolo: bag.tremolo != null && !sameValue(bag.tremolo, inherited.tremolo, 2) ? bag.tremolo : null,
    trrate: bag.trrate != null && !sameValue(bag.trrate, inherited.trrate, 1) ? bag.trrate : null,
    breath: bag.breath != null && !sameValue(bag.breath, inherited.breath, 2) ? bag.breath : null,
    tilt: bag.tilt != null && !sameValue(bag.tilt, inherited.tilt, 2) ? bag.tilt : null,
    effort: bag.effort != null && !sameValue(bag.effort, inherited.effort, 2) ? bag.effort : null,
  }
}

export const CMD_AT_END = /\{\{\s*[a-z]+(?:\s+-?\d+(?:\.\d+)?)?\s*\}\}\s*$/i

export const NUMBER_DIGITS: Record<
  'pitch' | 'rate' | 'scale' | 'vibrato' | 'vibrate' | 'tremolo' | 'trrate' | 'breath' | 'tilt' | 'effort',
  number
> = {
  pitch: 0,
  rate: 0,
  scale: 2,
  vibrato: 1,
  vibrate: 1,
  tremolo: 2,
  trrate: 1,
  breath: 2,
  tilt: 2,
  effort: 2,
}
