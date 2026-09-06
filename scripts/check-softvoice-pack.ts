import { parseEmbedded } from '../src/engine/commands.ts'
import {
  packSoftVoice,
  softVoiceDisplayText,
  splitSoftVoiceChunks,
} from '../src/engine/softVoice.ts'
import { annotateWords, wordsFromPieces } from '../src/engine/wordCommands.ts'
import type { VoiceState } from '../src/engine/commands.ts'

const defaults: VoiceState = {
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

const raw =
  'r243.2 s1.14 bF#2 ( W ER ) bA2 ( K IH T ) bF#3 ( HH AA R ) bA3 ( D ER )'
const packed = packSoftVoice(raw)
console.log('PACKED:', packed)

if (!packed.includes('{{sv bF#2}}')) throw new Error(`missing sv note: ${packed}`)
if (!packed.includes('( W ER )')) throw new Error(`missing group: ${packed}`)
if (/\bbF#2\b/.test(packed.replace(/\{\{[^}]+\}\}/g, ''))) {
  throw new Error(`note still exposed: ${packed}`)
}

const chunks = splitSoftVoiceChunks('( W ER ) hello')
if (!chunks.includes('( W ER )')) throw new Error(`chunks: ${JSON.stringify(chunks)}`)
if (softVoiceDisplayText('( W ER )') !== 'W ER') {
  throw new Error(`display: ${softVoiceDisplayText('( W ER )')}`)
}

const parts = parseEmbedded(packed)
const sv = parts.filter((p) => p.kind === 'cmd' && p.name === 'sv')
if (sv.length < 3) throw new Error(`sv cmds: ${JSON.stringify(sv)}`)

const words = wordsFromPieces(annotateWords(packed, defaults))
const labels = words.map((w) => w.text)
console.log('WORDS:', labels)
if (labels.some((t) => t.startsWith('b') || /^r\d/.test(t) || /^s\d/.test(t))) {
  throw new Error(`controls visible as words: ${labels.join(' | ')}`)
}
if (!labels.includes('W ER') || !labels.includes('K IH T')) {
  throw new Error(`expected syllable chips: ${labels.join(' | ')}`)
}
if (!words[0]?.hasSoftVoice) throw new Error('first syllable should be SoftVoice-marked')

console.log(JSON.stringify({ ok: true, words: labels.length, sv: sv.length }))
