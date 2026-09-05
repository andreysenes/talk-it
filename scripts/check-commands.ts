import { PERSONALITIES } from '../src/engine/personalities.ts'
import { parseEmbedded, textToPhonemeString } from '../src/engine/synth.ts'

const text =
  '{{spanish}}La {{rate 140}}cocaína {{rate 310}}no es buena para su salud.'

const parts = parseEmbedded(text)
const kinds = parts.map((p) =>
  p.kind === 'text' ? `text:${p.text.trim()}` : p.kind === 'rate' ? `rate:${p.value}` : p.kind,
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
console.log(JSON.stringify({ ok: true, kinds, rates, phonemes: phonemes.slice(0, 180) }))
