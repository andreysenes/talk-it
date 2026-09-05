import { useCallback, useEffect, useRef, useState } from 'react'
import {
  ccToSpeed,
  midiNoteToTalkPitch,
  velocityToSpeed,
  type MidiNoteEvent,
} from '../engine/midi'

export type MidiPortInfo = { id: string; name: string }

type MidiHook = {
  supported: boolean
  enabled: boolean
  error: string | null
  inputs: MidiPortInfo[]
  outputs: MidiPortInfo[]
  inputId: string
  outputId: string
  lastMessage: string | null
  connect: () => Promise<void>
  disconnect: () => void
  setInputId: (id: string) => void
  setOutputId: (id: string) => void
  sendNoteOn: (note: number, velocity: number) => void
  sendNoteOff: (note: number) => void
}

function portName(port: MIDIPort): string {
  return port.name || port.id
}

export function useMidi(handlers: {
  onNoteOn: (event: MidiNoteEvent) => void
  onNoteOff: (event: { note: number; channel: number }) => void
  onRateCc?: (speed: number) => void
}): MidiHook {
  const supported =
    typeof navigator !== 'undefined' && 'requestMIDIAccess' in navigator

  const [enabled, setEnabled] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [inputs, setInputs] = useState<MidiPortInfo[]>([])
  const [outputs, setOutputs] = useState<MidiPortInfo[]>([])
  const [inputId, setInputId] = useState('')
  const [outputId, setOutputId] = useState('')
  const [lastMessage, setLastMessage] = useState<string | null>(null)

  const accessRef = useRef<MIDIAccess | null>(null)
  const inputIdRef = useRef(inputId)
  const outputIdRef = useRef(outputId)
  const handlersRef = useRef(handlers)
  const speedOverrideRef = useRef<number | null>(null)
  const onInputRef = useRef<(event: MIDIMessageEvent) => void>(() => {})

  inputIdRef.current = inputId
  outputIdRef.current = outputId
  handlersRef.current = handlers

  const refreshPorts = useCallback((access: MIDIAccess) => {
    const ins: MidiPortInfo[] = []
    access.inputs.forEach((port) => {
      ins.push({ id: port.id, name: portName(port) })
    })
    const outs: MidiPortInfo[] = []
    access.outputs.forEach((port) => {
      outs.push({ id: port.id, name: portName(port) })
    })
    setInputs(ins)
    setOutputs(outs)
    setInputId((current) => {
      if (current && ins.some((p) => p.id === current)) return current
      return ins[0]?.id ?? ''
    })
    setOutputId((current) => {
      if (current && outs.some((p) => p.id === current)) return current
      return outs[0]?.id ?? ''
    })
  }, [])

  onInputRef.current = (event: MIDIMessageEvent) => {
    const data = event.data
    if (!data || data.length < 2) return
    const status = data[0] ?? 0
    const type = status & 0xf0
    const channel = status & 0x0f
    const note = data[1] ?? 0
    const value = data[2] ?? 0

    if (type === 0xb0 && note === 1) {
      const speed = ccToSpeed(value)
      speedOverrideRef.current = speed
      setLastMessage(`CC1 rate ${speed}`)
      handlersRef.current.onRateCc?.(speed)
      return
    }

    const isNoteOn = type === 0x90 && value > 0
    const isNoteOff = type === 0x80 || (type === 0x90 && value === 0)

    if (isNoteOn) {
      const pitch = midiNoteToTalkPitch(note)
      const speed = speedOverrideRef.current ?? velocityToSpeed(value)
      setLastMessage(`Note ${note} vel ${value}`)
      handlersRef.current.onNoteOn({
        note,
        velocity: value,
        channel,
        pitch,
        speed,
      })
      return
    }

    if (isNoteOff) {
      setLastMessage(`Note off ${note}`)
      handlersRef.current.onNoteOff({ note, channel })
    }
  }

  const bindInputs = useCallback((access: MIDIAccess) => {
    access.inputs.forEach((port) => {
      port.onmidimessage = (event) => {
        const selected = inputIdRef.current
        if (selected && port.id !== selected) return
        onInputRef.current(event)
      }
    })
  }, [])

  const connect = useCallback(async () => {
    if (!supported) {
      setError('This browser has no Web MIDI. Use Chrome or Edge, or enable MIDI in Safari.')
      return
    }
    try {
      const access = await navigator.requestMIDIAccess({ sysex: false })
      accessRef.current = access
      refreshPorts(access)
      bindInputs(access)
      access.onstatechange = () => {
        refreshPorts(access)
        bindInputs(access)
      }
      setEnabled(true)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'MIDI permission denied.')
      setEnabled(false)
    }
  }, [supported, refreshPorts, bindInputs])

  const disconnect = useCallback(() => {
    const access = accessRef.current
    if (access) {
      access.onstatechange = null
      access.inputs.forEach((port) => {
        port.onmidimessage = null
      })
    }
    accessRef.current = null
    speedOverrideRef.current = null
    setEnabled(false)
    setLastMessage(null)
  }, [])

  useEffect(() => () => disconnect(), [disconnect])

  const send = useCallback((bytes: number[]) => {
    const access = accessRef.current
    const id = outputIdRef.current
    if (!access || !id) return
    const port = access.outputs.get(id)
    port?.send(bytes)
  }, [])

  const sendNoteOn = useCallback(
    (note: number, velocity: number) => {
      send([0x90, note & 127, Math.max(1, Math.min(127, velocity))])
    },
    [send],
  )

  const sendNoteOff = useCallback(
    (note: number) => {
      send([0x80, note & 127, 0])
    },
    [send],
  )

  return {
    supported,
    enabled,
    error,
    inputs,
    outputs,
    inputId,
    outputId,
    lastMessage,
    connect,
    disconnect,
    setInputId,
    setOutputId,
    sendNoteOn,
    sendNoteOff,
  }
}
