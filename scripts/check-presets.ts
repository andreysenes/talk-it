import { makeVoicePreset, normalizePresets } from '../src/engine/presets.ts'
const p = makeVoicePreset({
  label: 'Test',
  personalityId: 'male',
  pitch: 120,
  speed: 140,
  pitchQuality: 'sung',
  vocalEffort: 'breathy',
  vibrato: 4,
  vibratoRate: 5,
  scale: 1.1,
})
const list = normalizePresets([p, { id: 'bad' }, null])
if (list.length !== 1) throw new Error(`normalize ${list.length}`)
if (!p.id.startsWith('custom-')) throw new Error(p.id)
console.log(JSON.stringify({ ok: true, id: p.id, label: p.label }))
