/** Talk It pitch 100 ≈ 110 Hz (adult male baseline). */

export const MIDI_BASE_HZ = 110

export function midiNoteToHz(note: number): number {
  return 440 * 2 ** ((note - 69) / 12)
}

export function hzToTalkPitch(hz: number): number {
  return (hz / MIDI_BASE_HZ) * 100
}

export function midiNoteToTalkPitch(note: number): number {
  return hzToTalkPitch(midiNoteToHz(note))
}

export function talkPitchToMidiNote(pitch: number): number {
  const hz = MIDI_BASE_HZ * (Math.abs(pitch || 1) / 100)
  const note = 69 + 12 * Math.log2(hz / 440)
  return Math.max(0, Math.min(127, Math.round(note)))
}

/** Velocity 1–127 → Talk It speed. 64 (mezzo) ≈ 150. */
export function velocityToSpeed(velocity: number): number {
  const v = Math.max(1, Math.min(127, velocity))
  if (v <= 64) {
    const t = (v - 1) / 63
    return Math.round(50 + t * 100)
  }
  const t = (v - 64) / 63
  return Math.round(150 + t * 250)
}

export function ccToSpeed(value: number): number {
  return velocityToSpeed(value)
}

export type MidiNoteEvent = {
  note: number
  velocity: number
  channel: number
  pitch: number
  speed: number
}

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'] as const

export function midiNoteName(note: number): string {
  const n = Math.round(note)
  const pc = ((n % 12) + 12) % 12
  const oct = Math.floor(n / 12) - 1
  return `${NOTE_NAMES[pc]}${oct}`
}
