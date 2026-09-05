import {
  DEFAULT_PADS,
  normalizePads,
  padsEqual,
  snapshotPad,
  stockPadVoice,
  talkSettingsFromVoice,
  voiceFromPad,
} from '../src/engine/pads.ts'

const big = DEFAULT_PADS[0]
if (!big?.personalityId || big.personalityId !== 'colossus') {
  throw new Error(`Big Robot pad voice: ${JSON.stringify(big)}`)
}
if (big.pitchQuality !== 'monotone' || big.pitch !== 66) {
  throw new Error(`Big Robot params: ${big.pitchQuality} ${big.pitch}`)
}

const twinkle = DEFAULT_PADS[3]
if (twinkle?.personalityId !== 'mellowMale' || twinkle.pitchQuality !== 'sung') {
  throw new Error(`Twinkle pad voice: ${JSON.stringify(twinkle)}`)
}

const migrated = normalizePads([
  { name: 'Big Robot', text: 'All your base are belong to us.' },
])
if (migrated[0]?.personalityId !== 'colossus') {
  throw new Error(`migrate factory pad 0: ${JSON.stringify(migrated[0])}`)
}

const customLine = normalizePads([
  { name: 'Big Robot', text: 'Hello from a custom line.' },
])
if (customLine[0]?.personalityId) {
  throw new Error(`custom line should keep no voice: ${JSON.stringify(customLine[0])}`)
}

const custom = snapshotPad(big, big.text, {
  ...stockPadVoice('mellowMale'),
  pitch: 280,
  pitchQuality: 'sung',
  language: 'spanish',
})
if (custom.pitch !== 280 || custom.language !== 'spanish') throw new Error('snapshot')
if (padsEqual(custom, big)) throw new Error('pads should differ')

const restored = voiceFromPad(custom, stockPadVoice('male'))
if (restored.personalityId !== 'mellowMale' || restored.pitch !== 280) {
  throw new Error(`restore: ${JSON.stringify(restored)}`)
}

const looped = snapshotPad(big, big.text, { ...stockPadVoice('colossus'), loop: true })
if (!looped.loop) throw new Error('snapshot loop')
if (voiceFromPad(looped, stockPadVoice('male')).loop !== true) {
  throw new Error('restore loop')
}
if (voiceFromPad(big, stockPadVoice('male')).loop) throw new Error('default loop off')

const settings = talkSettingsFromVoice(restored)
if (settings.personality.label !== 'Singing Girl') throw new Error(settings.personality.label)
if (settings.language !== 'spanish' || settings.pitchQuality !== 'sung') {
  throw new Error('talk settings')
}

console.log(JSON.stringify({ ok: true, big: big.personalityId, twinkle: twinkle?.personalityId }))
