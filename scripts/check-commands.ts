import { PERSONALITIES, voiceFromPersonality } from '../src/engine/personalities.ts'
import { defaultsFromSettings, parseEmbedded, textToPhonemeString } from '../src/engine/synth.ts'

const text =
  '{{spanish}}La {{rate 140}}cocaína {{rate 310}}no es buena para su salud.'

const parts = parseEmbedded(text)
const kinds = parts.map((p) =>
  p.kind === 'text'
    ? `text:${p.text.trim()}`
    : p.value == null
      ? p.name
      : `${p.name}:${p.value}`,
)
if (!kinds.includes('spanish')) throw new Error('missing spanish')
if (!kinds.includes('rate:140')) throw new Error('missing rate 140')
if (!kinds.includes('rate:310')) throw new Error('missing rate 310')

const phonemes = textToPhonemeString(text, {
  personality: PERSONALITIES[0],
  pitch: 100,
  speed: 150,
  pitchQuality: 'natural',
  vocalEffort: 'normal',
  language: 'english',
  vintage: true,
})

if (!/\br\d+\b/.test(phonemes)) throw new Error(`no rate directives: ${phonemes}`)
const rates = [...phonemes.matchAll(/\br(\d+)\b/g)].map((m) => Number(m[1]))
if (rates.length < 2) throw new Error(`expected mid-utterance rates, got ${phonemes}`)
if (!(rates[rates.length - 1]! < rates[1]!)) {
  // rate 310 is faster than 140, so later r(ms) should be smaller
  throw new Error(`expected later rate faster (smaller ms): ${rates.join(',')}`)
}

const extra =
  'Hello {{scale 1.25}}{{vibrato 4}}{{tremolo 0.2}}world.'
const extraPhones = textToPhonemeString(extra, {
  personality: PERSONALITIES[0],
  pitch: 100,
  speed: 150,
  pitchQuality: 'natural',
  vocalEffort: 'normal',
  language: 'english',
  vintage: true,
})
if (!extraPhones.includes('s1.250')) throw new Error(`missing scale: ${extraPhones}`)
if (!extraPhones.includes('v4.0')) throw new Error(`missing vibrato: ${extraPhones}`)
if (!extraPhones.includes('m0.20')) throw new Error(`missing tremolo: ${extraPhones}`)

const girl = PERSONALITIES.find((p) => p.label === 'Singing Girl')
if (!girl) throw new Error('missing Singing Girl')
const voice = voiceFromPersonality(girl)
if (voice.pitch !== 310 || voice.speed !== 90) throw new Error(`girl basics ${voice.pitch} ${voice.speed}`)
if (voice.pitchQuality !== 'sung' || voice.vibrato < 4) throw new Error(`girl hold ${voice.pitchQuality} ${voice.vibrato}`)
const girlState = defaultsFromSettings({
  personality: girl,
  ...voice,
  language: 'english',
  vintage: true,
})
if (girlState.pitch !== 310 || girlState.rate !== 90) throw new Error('girl settings not applied')
if (girlState.quality !== 'sung' || girlState.vibrato !== girl.vibrato) {
  throw new Error(`girl sung/vibrato ${girlState.quality} ${girlState.vibrato}`)
}

console.log(JSON.stringify({ ok: true, kinds, rates, girl: voice }))
