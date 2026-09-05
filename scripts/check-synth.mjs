import { compileString, encodeWav, renderToBuffer } from 'klattsch'

const phrase = 'b72.6 r120 s0.780 h0.00 g0.82 t0.08 v0.0 w5.0 AO L Y UH R B EY S AA R B IH L AO NG T UW AH S .'
const { schedule, totalMs } = compileString(phrase)
if (!schedule.length) throw new Error('empty schedule')
const samples = renderToBuffer({ sampleRate: 11025, schedule, totalMs: totalMs + 80 })
const nonzero = samples.some((s) => s !== 0)
if (!nonzero) throw new Error('silent buffer')
const { bytes } = encodeWav(samples, 11025)
if (bytes.length < 1000) throw new Error('wav too small')
console.log(
  JSON.stringify({
    ok: true,
    totalMs,
    samples: samples.length,
    wavBytes: bytes.length,
  }),
)
