import {
  midiNoteName,
  midiNoteToTalkPitch,
  talkPitchToMidiNote,
  velocityToSpeed,
} from '../src/engine/midi'
import { midiNoteForPad, padIndexFromMidiNote, PAD_MIDI_C4 } from '../src/engine/pads.ts'

function assertClose(name: string, got: number, expected: number, slack = 1) {
  if (Math.abs(got - expected) > slack) {
    throw new Error(`${name}: expected ${expected}, got ${got}`)
  }
}

assertClose('A2 pitch', midiNoteToTalkPitch(45), 100, 1)
assertClose('A2 round-trip', talkPitchToMidiNote(100), 45, 0)
assertClose('velocity 1', velocityToSpeed(1), 50, 0)
assertClose('velocity 64', velocityToSpeed(64), 150, 0)
assertClose('velocity 127', velocityToSpeed(127), 400, 0)

if (PAD_MIDI_C4 !== 60) throw new Error('C4 is MIDI 60')
if (padIndexFromMidiNote(60) !== 0) throw new Error('C4 → pad 1')
if (padIndexFromMidiNote(71) !== 11) throw new Error('B4 → pad 12')
if (padIndexFromMidiNote(59) != null) throw new Error('B3 is not a pad')
if (padIndexFromMidiNote(72) != null) throw new Error('C5 is not a pad')
if (midiNoteForPad(0) !== 60) throw new Error('pad 1 → C4')
if (midiNoteName(60) !== 'C4') throw new Error(`C4 name: ${midiNoteName(60)}`)
if (midiNoteName(61) !== 'C#4') throw new Error(`C#4 name: ${midiNoteName(61)}`)
if (midiNoteName(71) !== 'B4') throw new Error(`B4 name: ${midiNoteName(71)}`)

console.log('midi mapping ok')
