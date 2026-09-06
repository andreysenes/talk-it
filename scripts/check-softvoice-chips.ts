import { packSoftVoice } from '../src/engine/softVoice.ts'
import { annotateWords, visibleText, wordsFromPieces } from '../src/engine/wordCommands.ts'
import type { VoiceState } from '../src/engine/commands.ts'
import { PAD1_PHONEMES, PAD2_PHONEMES, PAD3_PHONEMES } from '../src/engine/pads.ts'
import { isRawPhonemeSequence, textToPhonemeString } from '../src/engine/synth.ts'
import { stockPadVoice, talkSettingsFromVoice, voiceFromPad, DEFAULT_PADS } from '../src/engine/pads.ts'

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

for (const [label, text] of [
  ['pad1', PAD1_PHONEMES],
  ['pad2', PAD2_PHONEMES],
  ['pad3', PAD3_PHONEMES],
] as const) {
  if (!text.includes('{{sv ')) throw new Error(`${label} not packed`)
  const visible = visibleText(text, defaults)
  console.log(label, 'visible:', visible.slice(0, 120))
  if (/\bb[A-G]|r\d|s\d|v\d|w\d|g\d/i.test(visible.replace(/[()]/g, ''))) {
    // SoftVoice controls must not appear in the visible chip line.
    const leaked = visible.match(/\b(?:b[A-G][#b]?\d+|r\d+\.?\d*|s\d+\.?\d*|v\d+|w\d+|g\d+\.?\d*)\b/i)
    if (leaked) throw new Error(`${label} leaked control ${leaked[0]} in: ${visible}`)
  }
  const words = wordsFromPieces(annotateWords(text, defaults))
  if (words.length < 3) throw new Error(`${label} too few chips: ${words.length}`)
  if (!isRawPhonemeSequence(text)) throw new Error(`${label} not raw SoftVoice`)
}

const settings = talkSettingsFromVoice(voiceFromPad(DEFAULT_PADS[0]!, stockPadVoice('robotoid')))
const phonemes = textToPhonemeString(PAD1_PHONEMES, settings)
if (!phonemes.includes('bF#2') || !phonemes.includes('( W ER )')) {
  throw new Error(`synth lost SoftVoice: ${phonemes.slice(0, 160)}`)
}
if (phonemes.includes('{{sv')) throw new Error(`sv not expanded: ${phonemes.slice(0, 120)}`)

const packed = packSoftVoice('g0.8 HH IY+30 b+50 v20 w10 D')
const v2 = visibleText(packed, defaults)
console.log('pad2-ish visible:', v2)
if (v2.includes('g0.8') || v2.includes('b+50')) throw new Error(`pad2 leak: ${v2}`)

console.log(JSON.stringify({ ok: true, pad1Words: wordsFromPieces(annotateWords(PAD1_PHONEMES, defaults)).length }))
