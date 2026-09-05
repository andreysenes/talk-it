import {
  midiNoteToTalkPitch,
  talkPitchToMidiNote,
  velocityToSpeed,
} from '../src/engine/midi'

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

console.log('midi mapping ok')
