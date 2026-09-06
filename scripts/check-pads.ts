import {
  DEFAULT_PADS,
  isRetiredFactoryText,
  normalizePads,
  PAD1_PHONEMES,
  PAD2_PHONEMES,
  PAD3_PHONEMES,
  padsEqual,
  snapshotPad,
  stockPadVoice,
  talkSettingsFromVoice,
  voiceFromPad,
} from '../src/engine/pads.ts'

const harder = DEFAULT_PADS[0]
if (!harder?.personalityId || harder.personalityId !== 'robotoid') {
  throw new Error(`Harder Better pad voice: ${JSON.stringify(harder)}`)
}
if (harder.text !== PAD1_PHONEMES) throw new Error('pad 1 text')
if (harder.pitchQuality !== 'sung') {
  throw new Error(`Harder Better quality: ${harder.pitchQuality}`)
}

const heDid = DEFAULT_PADS[1]
if (heDid?.text !== PAD2_PHONEMES || heDid.personalityId !== 'male') {
  throw new Error(`He did pad: ${JSON.stringify(heDid)}`)
}

const bug = DEFAULT_PADS[2]
if (bug?.text !== PAD3_PHONEMES || bug.personalityId !== 'choirboy') {
  throw new Error(`I'm a bug pad: ${JSON.stringify(bug)}`)
}

const twinkle = DEFAULT_PADS[3]
if (twinkle?.personalityId !== 'mellowMale' || twinkle.pitchQuality !== 'sung') {
  throw new Error(`Twinkle pad voice: ${JSON.stringify(twinkle)}`)
}

const migrated = normalizePads([
  { name: 'Big Robot', text: 'All your base are belong to us.' },
  { name: 'Candy shop', text: "I'll take you to the candy shop." },
  {
    name: 'World control',
    text: 'This is the voice of world control. Obey me and live.',
  },
])
if (migrated[0]?.text !== PAD1_PHONEMES || migrated[0].personalityId !== 'robotoid') {
  throw new Error(`migrate factory pad 0: ${JSON.stringify(migrated[0])}`)
}
if (migrated[1]?.text !== PAD2_PHONEMES || migrated[2]?.text !== PAD3_PHONEMES) {
  throw new Error(`migrate factory pads 1–2: ${JSON.stringify(migrated.slice(0, 3))}`)
}
if (!isRetiredFactoryText('All your base are belong to us.')) {
  throw new Error('retired factory detection')
}

const customLine = normalizePads([
  { name: 'Big Robot', text: 'Hello from a custom line.' },
])
if (customLine[0]?.personalityId) {
  throw new Error(`custom line should keep no voice: ${JSON.stringify(customLine[0])}`)
}

const custom = snapshotPad(harder, harder.text, {
  ...stockPadVoice('mellowMale'),
  pitch: 280,
  pitchQuality: 'sung',
  language: 'spanish',
})
if (custom.pitch !== 280 || custom.language !== 'spanish') throw new Error('snapshot')
if (padsEqual(custom, harder)) throw new Error('pads should differ')

const restored = voiceFromPad(custom, stockPadVoice('male'))
if (restored.personalityId !== 'mellowMale' || restored.pitch !== 280) {
  throw new Error(`restore: ${JSON.stringify(restored)}`)
}

const looped = snapshotPad(harder, harder.text, { ...stockPadVoice('robotoid'), loop: true })
if (!looped.loop) throw new Error('snapshot loop')
if (voiceFromPad(looped, stockPadVoice('male')).loop !== true) {
  throw new Error('restore loop')
}
if (voiceFromPad(harder, stockPadVoice('male')).loop) throw new Error('default loop off')

const settings = talkSettingsFromVoice(restored)
if (settings.personality.label !== 'Singing Girl') throw new Error(settings.personality.label)
if (settings.language !== 'spanish' || settings.pitchQuality !== 'sung') {
  throw new Error('talk settings')
}

console.log(
  JSON.stringify({
    ok: true,
    pads: [harder.personalityId, heDid?.personalityId, bug?.personalityId, twinkle?.personalityId],
  }),
)
