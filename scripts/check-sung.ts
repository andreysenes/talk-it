import { compileString } from 'klattsch'
import { PERSONALITIES } from '../src/engine/personalities.ts'
import { phonesToArpabet, splitSungSyllables, type Phone } from '../src/engine/g2p.ts'
import {
  pitchToHz,
  speedToRateMs,
  textToPhonemeString,
} from '../src/engine/synth.ts'

const man = PERSONALITIES[0]!
const base = {
  personality: man,
  pitch: 100,
  speed: 150,
  vocalEffort: 'normal' as const,
  language: 'english' as const,
  vintage: true,
}

const sungPh = textToPhonemeString('Hello world', { ...base, pitchQuality: 'sung' })
const natPh = textToPhonemeString('Hello world', { ...base, pitchQuality: 'natural' })
console.log('SUNG:', sungPh)
console.log('NAT:', natPh)

const sung = compileString(sungPh)
const nat = compileString(natPh)
const rateSung = speedToRateMs(150, 'sung')
const rateNat = speedToRateMs(150, 'natural')
console.log({
  sungMs: sung.totalMs,
  natMs: nat.totalMs,
  rateSung,
  rateNat,
})

const hello: Phone[] = [
  { code: 'HH', stressed: false },
  { code: 'AH', stressed: true },
  { code: 'L', stressed: false },
  { code: 'OW', stressed: false },
]
const syllables = splitSungSyllables(hello).map((s) => s.map((p) => p.code).join(' '))
console.log('syllables', syllables)
if (syllables.join('|') !== 'HH AH|L OW') {
  throw new Error(`bad syllables: ${syllables.join('|')}`)
}

const arpabet = phonesToArpabet([{ phones: hello }], 'sung', false, true, pitchToHz(100))
console.log('arpabet', arpabet)
if (!arpabet.includes('( HH AH )') || !arpabet.includes('( L OW )')) {
  throw new Error(`expected per-syllable groups: ${arpabet}`)
}
if (!/b[A-G]#?-?\d/.test(arpabet)) throw new Error(`expected note pitch: ${arpabet}`)
if (!/b[A-G]#?-?\d/.test(sungPh)) throw new Error(`expected note in sung phrase: ${sungPh}`)
if (!(rateSung >= 400)) throw new Error(`sung rate too short: ${rateSung}`)
if (!(sung.totalMs > nat.totalMs)) {
  throw new Error(`sung should hold longer: ${sung.totalMs} vs ${nat.totalMs}`)
}

console.log(JSON.stringify({ ok: true }))
