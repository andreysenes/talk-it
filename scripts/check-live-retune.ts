import { mapPlayOffsetSec, type SpokenWord } from '../src/engine/synth.ts'

const words: SpokenWord[] = [
  { start: 0, end: 3, startMs: 0, endMs: 400 },
  { start: 4, end: 8, startMs: 420, endMs: 900 },
  { start: 9, end: 12, startMs: 920, endMs: 1400 },
]

const stretched: SpokenWord[] = [
  { start: 0, end: 3, startMs: 0, endMs: 800 },
  { start: 4, end: 8, startMs: 840, endMs: 1800 },
  { start: 9, end: 12, startMs: 1840, endMs: 2800 },
]

const mid = mapPlayOffsetSec(200, words, stretched)
if (mid == null || Math.abs(mid - 0.4) > 0.001) {
  throw new Error(`mid-word offset: ${mid}`)
}

const gap = mapPlayOffsetSec(410, words, stretched)
if (gap == null || Math.abs(gap - 0.84) > 0.001) {
  throw new Error(`gap offset: ${gap}`)
}

const later = mapPlayOffsetSec(660, words, stretched)
if (later == null || Math.abs(later - 1.32) > 0.01) {
  throw new Error(`second word offset: ${later}`)
}

const done = mapPlayOffsetSec(1400, words, stretched)
if (done != null) throw new Error(`ended should be null: ${done}`)

const leadOld: SpokenWord[] = [
  { start: 0, end: 2, startMs: 80, endMs: 400 },
]
const leadNew: SpokenWord[] = [
  { start: 0, end: 2, startMs: 40, endMs: 200 },
]
const lead = mapPlayOffsetSec(40, leadOld, leadNew)
if (lead == null || Math.abs(lead - 0.02) > 0.001) {
  throw new Error(`lead-in offset: ${lead}`)
}

console.log(JSON.stringify({ ok: true, mid, gap, later }))
