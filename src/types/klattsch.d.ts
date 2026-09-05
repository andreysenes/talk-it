declare module 'klattsch' {
  export type ScheduleEvent = {
    atMs: number
    target: Record<string, number>
    transitionMs?: number
  }

  export function compileString(
    input: string,
    opts?: Record<string, unknown>,
  ): {
    schedule: ScheduleEvent[]
    totalMs: number
    phrases?: Array<{
      phoneme?: string | null
      tStartMs?: number
      tEndMs?: number
      kind?: string
    }>
    voices?: Array<{ schedule: ScheduleEvent[]; totalMs: number }>
  }

  export function renderToBuffer(opts: {
    sampleRate?: number
    schedule: ScheduleEvent[]
    totalMs?: number
    initialTarget?: Record<string, number>
  }): Float32Array

  export function encodeWav(
    float32: Float32Array,
    sampleRate: number,
    opts?: {
      peakNormalize?: number
      metadata?: { software?: string; comment?: string } | null
    },
  ): { bytes: Uint8Array }
}

declare module 'klattsch/pronounce' {
  export type Phone = { code: string; stressed: boolean }
  export function pronounce(word: string): Phone[] | null
  export function pronounceText(
    text: string,
  ): Array<{ word: string; phones: Phone[] | null }>
  export function hasWord(word: string): boolean
}

declare module 'klattsch/formant-worklet.js?url' {
  const url: string
  export default url
}
