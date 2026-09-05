import { useEffect, useRef, useState } from 'react'
import { DawMidiHelp } from './DawMidiHelp'
import { Button } from './ui/button'
import { cn } from '../lib/utils'
import { useMidi } from '../hooks/useMidi'
import type { MidiNoteEvent } from '../engine/midi'
import type { useAudioOutputs } from '../hooks/useAudioOutputs'

const fieldClass =
  'h-8 w-full rounded-sm border border-neutral-800 bg-black px-2 text-xs text-neutral-200 outline-none'

export function MidiBadge({
  audio,
  onPrimeAudio,
  onNoteOn,
  onNoteOff,
  onRateCc,
}: {
  audio: ReturnType<typeof useAudioOutputs>
  onPrimeAudio: () => Promise<void> | void
  onNoteOn: (event: MidiNoteEvent) => void
  onNoteOff: (event: { note: number; channel: number }) => void
  onRateCc?: (speed: number) => void
}) {
  const [open, setOpen] = useState(false)
  const [echo, setEcho] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const echoRef = useRef(false)
  const sendOnRef = useRef<(note: number, velocity: number) => void>(() => {})
  const sendOffRef = useRef<(note: number) => void>(() => {})

  useEffect(() => {
    echoRef.current = echo
  }, [echo])

  const midi = useMidi({
    onNoteOn: (event) => {
      if (echoRef.current) sendOnRef.current(event.note, event.velocity)
      onNoteOn(event)
    },
    onNoteOff: (event) => {
      if (echoRef.current) sendOffRef.current(event.note)
      onNoteOff(event)
    },
    onRateCc,
  })

  useEffect(() => {
    sendOnRef.current = midi.sendNoteOn
    sendOffRef.current = midi.sendNoteOff
  }, [midi.sendNoteOn, midi.sendNoteOff])

  useEffect(() => {
    if (!open) return
    function onPointer(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('pointerdown', onPointer)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onPointer)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const inName = midi.inputs.find((p) => p.id === midi.inputId)?.name
  const outName = midi.outputs.find((p) => p.id === midi.outputId)?.name
  const sinkName =
    audio.sinks.find((s) => s.id === audio.sinkId)?.label || 'Default out'
  const primary = !midi.enabled ? 'Off' : inName || 'Connected'
  const secondary = midi.enabled
    ? audio.sinkId
      ? sinkName
      : outName || 'DAW Out'
    : null

  async function toggleMidi() {
    if (midi.enabled) {
      midi.disconnect()
      return
    }
    await midi.connect()
    await onPrimeAudio()
  }

  return (
    <div className="relative" ref={rootRef}>
      <Button
        type="button"
        variant="export"
        size="lg"
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={() => {
          setOpen((v) => !v)
          if (!open) void audio.unlockLabels()
        }}
      >
        MIDI:{' '}
        <span className={midi.enabled ? 'text-white' : 'text-neutral-400'}>
          {primary}
        </span>
        {secondary ? (
          <>
            <span className="mx-1.5 text-neutral-700">·</span>
            {secondary}
          </>
        ) : null}
      </Button>

      {open && (
        <div
          role="dialog"
          className="absolute top-full left-0 z-20 mt-2 max-h-[min(70vh,36rem)] w-[min(100vw-1.5rem,26rem)] overflow-y-auto border border-neutral-800 bg-[#0c0c0c] p-3"
        >
          <p className="mb-3 text-[11px] font-medium tracking-[0.18em] text-neutral-500 uppercase">
            DAW · MIDI
          </p>

          {!midi.supported ? (
            <p className="text-xs text-neutral-400">
              Web MIDI is not available here. Use Chrome or Edge on the computer that
              runs the DAW.
            </p>
          ) : (
            <div className="flex flex-col gap-3">
              <DawMidiHelp noPorts={midi.enabled && midi.inputs.length === 0} />

              <button
                type="button"
                onClick={() => void toggleMidi()}
                className={cn(
                  'rounded-sm px-3 py-1.5 text-xs font-medium',
                  midi.enabled
                    ? 'border border-neutral-700 text-white'
                    : 'bg-white text-black',
                )}
              >
                {midi.enabled ? 'Disconnect' : 'Connect MIDI'}
              </button>

              {midi.error ? <p className="text-xs text-white">{midi.error}</p> : null}

              <label className="flex flex-col gap-1 text-[11px] text-neutral-500">
                MIDI in
                <select
                  className={fieldClass}
                  value={midi.inputId}
                  onChange={(e) => midi.setInputId(e.target.value)}
                  disabled={!midi.enabled}
                >
                  {midi.inputs.length === 0 ? (
                    <option value="">No ports</option>
                  ) : (
                    midi.inputs.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))
                  )}
                </select>
              </label>

              <label className="flex flex-col gap-1 text-[11px] text-neutral-500">
                MIDI out
                <select
                  className={fieldClass}
                  value={midi.outputId}
                  onChange={(e) => midi.setOutputId(e.target.value)}
                  disabled={!midi.enabled}
                >
                  {midi.outputs.length === 0 ? (
                    <option value="">No ports</option>
                  ) : (
                    midi.outputs.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))
                  )}
                </select>
              </label>

              <label className="flex items-center gap-2 text-xs text-neutral-400">
                <input
                  type="checkbox"
                  checked={echo}
                  onChange={(e) => setEcho(e.target.checked)}
                  className="accent-white"
                />
                Echo notes to MIDI out
              </label>

              <label className="flex flex-col gap-1 text-[11px] text-neutral-500">
                Audio to DAW
                <select
                  className={fieldClass}
                  value={audio.sinkId}
                  onChange={(e) => audio.setSinkId(e.target.value)}
                  disabled={!audio.supported}
                >
                  <option value="">Default output</option>
                  {audio.sinks
                    .filter((s) => s.id && s.id !== 'default')
                    .map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.label}
                      </option>
                    ))}
                </select>
              </label>
              {!audio.supported ? (
                <p className="text-[11px] text-neutral-600">
                  This browser cannot pick an audio output. Route the default output with
                  BlackHole or Loopback.
                </p>
              ) : null}

              {midi.lastMessage ? (
                <p className="font-mono text-[11px] text-neutral-400">{midi.lastMessage}</p>
              ) : null}

              <p className="text-[11px] leading-relaxed text-neutral-500">
                Pads: C4–B4 trigger pads 1–12 (C4 = pad 1). Other notes still set pitch
                (A2 / note 45 = Talk It 100). Velocity and mod wheel (CC1) set rate for
                those notes. Note off stops.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
