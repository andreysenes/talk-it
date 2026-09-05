import {
  annotateWords,
  appendVisible,
  inheritedBeforeWord,
  replaceWordText,
  setWordVoice,
  wordSpeakSnippet,
  wordsFromPieces,
} from '../src/engine/wordCommands.ts'
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
  tilt: 0.02,
  effort: 0.52,
}
const text = "I'll {{pitch 220}}take you to the candy shop."
const pieces = annotateWords(text, defaults)
const words = wordsFromPieces(pieces)
const take = words.find((w) => w.text === 'take')
if (!take?.hasPitch || take.pitch !== 220) throw new Error(`take: ${JSON.stringify(take)}`)
const ill = words.find((w) => w.text === "I'll")
if (!ill || ill.hasPitch || ill.pitch !== 100) throw new Error(`I'll: ${JSON.stringify(ill)}`)

const inherited = inheritedBeforeWord(text, take.start, defaults)
if (inherited.pitch !== 100) throw new Error(`inherited pitch ${inherited.pitch}`)

const next = setWordVoice(text, ill.start, { pitch: 80 }, inheritedBeforeWord(text, ill.start, defaults))
if (!next.next.includes('{{pitch 80}}')) throw new Error(next.next)
const cleared = setWordVoice(
  next.next,
  next.wordStart,
  { pitch: 100 },
  inheritedBeforeWord(next.next, next.wordStart, defaults),
)
if (/\{\{pitch 80\}\}/.test(cleared.next)) throw new Error(`still tagged: ${cleared.next}`)

const scaled = setWordVoice(text, take.start, { scale: 1.25, vibrato: 4 }, inherited)
if (!scaled.next.includes('{{scale 1.25}}')) throw new Error(scaled.next)
if (!scaled.next.includes('{{vibrato 4.0}}') && !scaled.next.includes('{{vibrato 4}}')) {
  throw new Error(scaled.next)
}

const snippet = wordSpeakSnippet(text, take.start, take.end)
if (!snippet.includes('{{pitch 220}}')) throw new Error(`snippet cmds: ${snippet}`)
if (!snippet.includes('take')) throw new Error(`snippet word: ${snippet}`)
if (/I'll/.test(snippet)) throw new Error(`snippet too much: ${snippet}`)

function visible(source: string) {
  return annotateWords(source, defaults)
    .map((p) => (p.kind === 'text' ? p.text : p.word.text))
    .join('')
}

const gluedTight = "I'll{{pitch 220}}take you to the candy shop."
if (visible(gluedTight) !== "I'll take you to the candy shop.") {
  throw new Error(`tight display: ${visible(gluedTight)}`)
}

const renamed = replaceWordText(text, take.start, take.end, 'took')
if (visible(renamed.next) !== "I'll took you to the candy shop.") {
  throw new Error(`rename display: ${visible(renamed.next)}`)
}
if (!renamed.next.includes('{{pitch 220}}')) throw new Error(`rename lost pitch: ${renamed.next}`)
const took = wordsFromPieces(annotateWords(renamed.next, defaults)).find((w) => w.text === 'took')
if (!took?.hasPitch || took.pitch !== 220) throw new Error(`took: ${JSON.stringify(took)}`)

const split = replaceWordText(text, take.start, take.end, 'take extra')
if (visible(split.next) !== "I'll take extra you to the candy shop.") {
  throw new Error(`split display: ${visible(split.next)}`)
}
const extra = wordsFromPieces(annotateWords(split.next, defaults))
if (extra.find((w) => w.text === 'take')?.pitch !== 220) throw new Error('split kept pitch on take')
if (extra.find((w) => w.text === 'extra')?.hasPitch) throw new Error('split leaked pitch onto extra')

const removed = replaceWordText(text, take.start, take.end, '')
if (visible(removed.next) !== "I'll you to the candy shop.") {
  throw new Error(`delete display: ${visible(removed.next)}`)
}

const appended = appendVisible("I'll {{pitch 220}}take", 'you home')
if (visible(appended) !== "I'll take you home") {
  throw new Error(`append display: ${visible(appended)}`)
}
if (!appended.includes('{{pitch 220}}')) throw new Error(`append lost pitch: ${appended}`)

console.log(JSON.stringify({ ok: true, next: next.next, cleared: cleared.next, scaled: scaled.next, snippet }))
