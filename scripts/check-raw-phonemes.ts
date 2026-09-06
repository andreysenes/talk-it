import { personalityById, voiceFromPersonality } from '../src/engine/personalities.ts'
import {
  DEFAULT_PADS,
  PAD1_PHONEMES,
  PAD2_PHONEMES,
  PAD3_PHONEMES,
  talkSettingsFromVoice,
  voiceFromPad,
  stockPadVoice,
} from '../src/engine/pads.ts'
import {
  isRawPhonemeSequence,
  renderUtterance,
  textToPhonemeString,
} from '../src/engine/synth.ts'

for (const sample of [PAD1_PHONEMES, PAD2_PHONEMES, PAD3_PHONEMES]) {
  if (!isRawPhonemeSequence(sample)) {
    throw new Error(`should detect raw SoftVoice: ${sample.slice(0, 40)}…`)
  }
}

if (isRawPhonemeSequence('Twinkle, twinkle, little star, how I wonder what you are.')) {
  throw new Error('English line must not be raw SoftVoice')
}
if (isRawPhonemeSequence('All your base are belong to us.')) {
  throw new Error('English pad must not be raw SoftVoice')
}

const settings = talkSettingsFromVoice(
  voiceFromPad(DEFAULT_PADS[0]!, stockPadVoice('robotoid')),
)

const phonemes = textToPhonemeString(PAD1_PHONEMES, settings)
if (!phonemes.includes('( W ER )') || !phonemes.includes('bF#2')) {
  throw new Error(`G2P ate SoftVoice sequence: ${phonemes.slice(0, 120)}`)
}

const rendered = renderUtterance(PAD1_PHONEMES, settings)
if (rendered.durationMs < 1000 || rendered.samples.length < 1000) {
  throw new Error(`pad 1 render too short: ${rendered.durationMs}ms`)
}
if (rendered.words.length < 10) {
  throw new Error(`pad 1 should highlight syllable groups: ${rendered.words.length}`)
}

const male = {
  personality: personalityById('male'),
  ...voiceFromPersonality(personalityById('male')),
  language: 'english' as const,
  vintage: true,
}
const p2 = renderUtterance(PAD2_PHONEMES, male)
if (p2.durationMs < 200) throw new Error(`pad 2 too short: ${p2.durationMs}`)

const choir = talkSettingsFromVoice(
  voiceFromPad(DEFAULT_PADS[2]!, stockPadVoice('choirboy')),
)
const p3 = renderUtterance(PAD3_PHONEMES, choir)
if (p3.durationMs < 1000) throw new Error(`pad 3 too short: ${p3.durationMs}`)

console.log(
  JSON.stringify({
    ok: true,
    ms: [rendered.durationMs, p2.durationMs, p3.durationMs],
    groups: rendered.words.length,
  }),
)
