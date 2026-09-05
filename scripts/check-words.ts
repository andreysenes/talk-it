import { PERSONALITIES } from '../src/engine/personalities.ts'
import { renderUtterance } from '../src/engine/synth.ts'

const text = "I'll take you to the candy shop."
const utterance = renderUtterance(text, {
  personality: PERSONALITIES[0],
  pitch: 100,
  speed: 150,
  pitchQuality: 'natural',
  vocalEffort: 'normal',
  language: 'english',
  vintage: true,
})

const labels = utterance.words.map((w) => text.slice(w.start, w.end))
if (!labels.includes('take')) throw new Error(`missing take: ${labels.join('|')}`)
if (!labels.includes('candy')) throw new Error(`missing candy: ${labels.join('|')}`)

let prev = -1
for (const word of utterance.words) {
  if (word.startMs < prev) throw new Error('word times went backwards')
  if (word.end <= word.start) throw new Error(`empty span ${text.slice(word.start, word.end)}`)
  prev = word.startMs
}

console.log(JSON.stringify({ ok: true, labels, times: utterance.words.map((w) => [w.startMs, w.endMs]) }))
