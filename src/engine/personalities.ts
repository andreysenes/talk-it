export type PitchQuality = 'natural' | 'monotone' | 'sung'
export type VocalEffort = 'normal' | 'breathy' | 'whispered'
export type Language = 'english' | 'spanish'

export type PersonalityId =
  | 'male'
  | 'female'
  | 'largeMale'
  | 'child'
  | 'giantMale'
  | 'mellowFemale'
  | 'mellowMale'
  | 'crispMale'
  | 'theFly'
  | 'robotoid'
  | 'martian'
  | 'colossus'
  | 'fastFred'
  | 'oldWoman'
  | 'munchkin'
  | 'troll'
  | 'nerd'
  | 'milktoast'
  | 'tipsy'
  | 'choirboy'

export type Personality = {
  id: PersonalityId
  /** Name shown in Microsoft Talk It! */
  label: string
  /** SoftVoice / OpenTalkIt internal name */
  engineName: string
  color: string
  pitch: number
  speed: number
  /** Character note shown under the personality selector */
  blurb: string
  pitchQuality: PitchQuality
  vocalEffort: VocalEffort
  /** Formant scale: 1.0 = adult male vocal tract */
  scale: number
  /** Extra spectral tilt, -0.9..0.9 */
  tilt: number
  /** Glottal effort 0..1 */
  effort: number
  /** Extra vibrato depth in Hz */
  vibrato: number
  vibratoRate: number
  /** Extra aspiration 0..1 */
  breath: number
}

/**
 * 20 Talk It! personalities.
 * Pitch/speed/F0/voicing come from OpenTalkIt's reverse-engineered TIBASE32.DLL presets.
 * Scale/tilt/effort are formant-character mappings (SoftVoice used separate formant tables
 * per personality; we approximate that with tract scale + glottal color).
 */
export const PERSONALITIES: Personality[] = [
  {
    id: 'male',
    label: 'Man',
    engineName: 'Male',
    color: '#FFB3D9',
    pitch: 100,
    speed: 150,
    blurb: 'The lowest ordinary adult male — Talk It\'s baseline voice.',
    pitchQuality: 'natural',
    vocalEffort: 'normal',
    scale: 1.0,
    tilt: 0.02,
    effort: 0.52,
    vibrato: 0,
    vibratoRate: 5,
    breath: 0,
  },
  {
    id: 'female',
    label: 'Woman',
    engineName: 'Female',
    color: '#FF9E80',
    pitch: 200,
    speed: 150,
    blurb: 'Higher, brighter adult female. Same talking speed as Man.',
    pitchQuality: 'natural',
    vocalEffort: 'normal',
    scale: 1.17,
    tilt: 0.08,
    effort: 0.48,
    vibrato: 1.2,
    vibratoRate: 5.5,
    breath: 0.04,
  },
  {
    id: 'largeMale',
    label: 'Hyper Female',
    engineName: 'Large Male',
    color: '#FFCB80',
    pitch: 190,
    speed: 250,
    blurb: 'Bright and oversized, talking in a rush.',
    pitchQuality: 'natural',
    vocalEffort: 'normal',
    scale: 1.22,
    tilt: 0.12,
    effort: 0.58,
    vibrato: 0,
    vibratoRate: 6,
    breath: 0.02,
  },
  {
    id: 'child',
    label: 'Child',
    engineName: 'Child',
    color: '#FFEE80',
    pitch: 350,
    speed: 130,
    blurb: 'Small vocal tract — high, a little slower, child-sized.',
    pitchQuality: 'natural',
    vocalEffort: 'normal',
    scale: 1.32,
    tilt: 0.14,
    effort: 0.42,
    vibrato: 1.5,
    vibratoRate: 6,
    breath: 0.06,
  },
  {
    id: 'giantMale',
    label: 'Strong Man',
    engineName: 'Giant Male',
    color: '#CCEE80',
    pitch: 75,
    speed: 140,
    blurb: 'Deeper and heavier than Man, with a longer throat.',
    pitchQuality: 'natural',
    vocalEffort: 'normal',
    scale: 0.86,
    tilt: -0.12,
    effort: 0.68,
    vibrato: 0,
    vibratoRate: 4.5,
    breath: 0.02,
  },
  {
    id: 'mellowFemale',
    label: 'Mellow',
    engineName: 'Mellow Female',
    color: '#A3E0A3',
    pitch: 190,
    speed: 140,
    blurb: 'Soft breathy female — less edge, more air.',
    pitchQuality: 'natural',
    vocalEffort: 'breathy',
    scale: 1.15,
    tilt: -0.04,
    effort: 0.34,
    vibrato: 2,
    vibratoRate: 4.8,
    breath: 0.28,
  },
  {
    id: 'mellowMale',
    label: 'Singing Girl',
    engineName: 'Mellow Male',
    color: '#80E0B3',
    pitch: 310,
    speed: 90,
    blurb: 'High sung voice with vibrato; slow, held notes.',
    pitchQuality: 'sung',
    vocalEffort: 'normal',
    scale: 1.24,
    tilt: 0.1,
    effort: 0.4,
    vibrato: 5,
    vibratoRate: 5.2,
    breath: 0.08,
  },
  {
    id: 'crispMale',
    label: 'Strong Woman',
    engineName: 'Crisp Male',
    color: '#80D9D9',
    pitch: 200,
    speed: 140,
    blurb: 'Firm, crisp female — more bite than Woman.',
    pitchQuality: 'natural',
    vocalEffort: 'normal',
    scale: 1.18,
    tilt: 0.16,
    effort: 0.62,
    vibrato: 0.8,
    vibratoRate: 5.5,
    breath: 0,
  },
  {
    id: 'theFly',
    label: 'Fly',
    engineName: 'The Fly',
    color: '#80C9EE',
    pitch: 480,
    speed: 150,
    blurb: 'Tiny buzzing tract. Highest pitch in the set.',
    pitchQuality: 'natural',
    vocalEffort: 'normal',
    scale: 1.55,
    tilt: 0.28,
    effort: 0.72,
    vibrato: 0,
    vibratoRate: 8,
    breath: 0.04,
  },
  {
    id: 'robotoid',
    label: 'Little Robot',
    engineName: 'Robotoid',
    color: '#80A3FF',
    pitch: 90,
    speed: 150,
    blurb: 'Flat monotone machine — no melody, just steps.',
    pitchQuality: 'monotone',
    vocalEffort: 'normal',
    scale: 0.96,
    tilt: 0.22,
    effort: 0.78,
    vibrato: 0,
    vibratoRate: 5,
    breath: 0,
  },
  {
    id: 'martian',
    label: 'Martian',
    engineName: 'Martian',
    color: '#A0A0FF',
    pitch: 80,
    speed: 150,
    blurb: 'Monotone with odd formants; a little warbly and alien.',
    pitchQuality: 'monotone',
    vocalEffort: 'normal',
    scale: 1.38,
    tilt: 0.18,
    effort: 0.7,
    vibrato: 3.5,
    vibratoRate: 7.5,
    breath: 0.05,
  },
  {
    id: 'colossus',
    label: 'Big Robot',
    engineName: 'Colossus',
    color: '#B39EE8',
    pitch: 66,
    speed: 138,
    blurb: 'Deep Colossus monotone — the All Your Base / candy-shop robot.',
    pitchQuality: 'monotone',
    vocalEffort: 'normal',
    scale: 0.78,
    tilt: 0.08,
    effort: 0.82,
    vibrato: 0,
    vibratoRate: 5,
    breath: 0,
  },
  {
    id: 'fastFred',
    label: 'Hyper Male',
    engineName: 'Fast Fred',
    color: '#C99EE8',
    pitch: 135,
    speed: 300,
    blurb: 'Fast-talking male, almost tumbling over himself.',
    pitchQuality: 'natural',
    vocalEffort: 'normal',
    scale: 1.02,
    tilt: 0.1,
    effort: 0.6,
    vibrato: 0,
    vibratoRate: 6,
    breath: 0,
  },
  {
    id: 'oldWoman',
    label: 'Old Woman',
    engineName: 'Old Woman',
    color: '#DE9EE8',
    pitch: 270,
    speed: 115,
    blurb: 'Higher and slower, with a shaky vibrato.',
    pitchQuality: 'natural',
    vocalEffort: 'normal',
    scale: 1.2,
    tilt: -0.08,
    effort: 0.36,
    vibrato: 7,
    vibratoRate: 6.4,
    breath: 0.14,
  },
  {
    id: 'munchkin',
    label: 'Little Man',
    engineName: 'Munchkin',
    color: '#E89ECF',
    pitch: 90,
    speed: 150,
    blurb: 'Short, pinched Munchkin male — small mouth, low pitch.',
    pitchQuality: 'natural',
    vocalEffort: 'normal',
    scale: 1.28,
    tilt: 0.2,
    effort: 0.5,
    vibrato: 1,
    vibratoRate: 6,
    breath: 0.03,
  },
  {
    id: 'troll',
    label: 'Imaginary Man',
    engineName: 'Troll',
    color: '#FFA3A3',
    pitch: 110,
    speed: 200,
    blurb: 'Off-kilter troll — a bit nasal and hurried.',
    pitchQuality: 'natural',
    vocalEffort: 'normal',
    scale: 1.16,
    tilt: -0.06,
    effort: 0.44,
    vibrato: 2.5,
    vibratoRate: 4.2,
    breath: 0.08,
  },
  {
    id: 'nerd',
    label: 'Nerd',
    engineName: 'Nerd',
    color: '#FFCA9E',
    pitch: 140,
    speed: 155,
    blurb: 'Thin and nasal, slightly bright.',
    pitchQuality: 'natural',
    vocalEffort: 'normal',
    scale: 1.06,
    tilt: 0.24,
    effort: 0.55,
    vibrato: 0,
    vibratoRate: 5,
    breath: 0.02,
  },
  {
    id: 'milktoast',
    label: 'Whiner',
    engineName: 'Milktoast',
    color: '#FFD96B',
    pitch: 120,
    speed: 165,
    blurb: 'Complaining and weak — a little breathy, never quite sure.',
    pitchQuality: 'natural',
    vocalEffort: 'normal',
    scale: 1.1,
    tilt: 0.18,
    effort: 0.32,
    vibrato: 1.8,
    vibratoRate: 5.8,
    breath: 0.1,
  },
  {
    id: 'tipsy',
    label: 'Wobbly',
    engineName: 'Tipsy',
    color: '#C9E6B3',
    pitch: 145,
    speed: 115,
    blurb: 'Drunk sung wobble — heavy vibrato, slow delivery.',
    pitchQuality: 'sung',
    vocalEffort: 'normal',
    scale: 1.0,
    tilt: -0.02,
    effort: 0.38,
    vibrato: 9,
    vibratoRate: 4.1,
    breath: 0.12,
  },
  {
    id: 'choirboy',
    label: 'Singing Boy',
    engineName: 'Choirboy',
    color: '#9EE8D9',
    pitch: 310,
    speed: 90,
    blurb: 'Choirboy sung twin of Singing Girl — high, slow, with vibrato.',
    pitchQuality: 'sung',
    vocalEffort: 'normal',
    scale: 1.26,
    tilt: 0.12,
    effort: 0.46,
    vibrato: 6.5,
    vibratoRate: 5,
    breath: 0.06,
  },
]

export type TalkSettings = {
  personality: Personality
  pitch: number
  speed: number
  pitchQuality: PitchQuality
  vocalEffort: VocalEffort
  language: Language
  vintage: boolean
}

export function personalityById(id: PersonalityId): Personality {
  return PERSONALITIES.find((p) => p.id === id) ?? PERSONALITIES[0]
}
