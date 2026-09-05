import { useCallback, useEffect, useRef, useState } from 'react'
import type { TalkSettings } from '../engine/personalities'

type PlayState = 'idle' | 'rendering' | 'speaking' | 'exporting' | 'error'

async function loadSynth() {
  return import('../engine/synth')
}

export function useTalkEngine(sinkId = '', volume = 1) {
  const ctxRef = useRef<AudioContext | null>(null)
  const gainRef = useRef<GainNode | null>(null)
  const sourceRef = useRef<AudioBufferSourceNode | null>(null)
  const volumeRef = useRef(volume)
  volumeRef.current = volume
  const [state, setState] = useState<PlayState>('idle')
  const [error, setError] = useState<string | null>(null)

  const stop = useCallback(() => {
    try {
      sourceRef.current?.stop()
    } catch {
      /* already stopped */
    }
    sourceRef.current = null
    setState('idle')
  }, [])

  useEffect(() => () => stop(), [stop])

  const ensureContext = useCallback(async () => {
    if (!ctxRef.current) {
      ctxRef.current = new AudioContext()
    }
    if (ctxRef.current.state === 'suspended') {
      await ctxRef.current.resume()
    }
    if (ctxRef.current.setSinkId) {
      try {
        await ctxRef.current.setSinkId(sinkId || '')
      } catch {
        /* stay on default output */
      }
    }
    if (!gainRef.current) {
      const gain = ctxRef.current.createGain()
      gain.gain.value = volumeRef.current
      gain.connect(ctxRef.current.destination)
      gainRef.current = gain
    }
    return ctxRef.current
  }, [sinkId])

  const speak = useCallback(
    async (text: string, settings: TalkSettings) => {
      const trimmed = text.trim()
      if (!trimmed) {
        setError('Type something first.')
        setState('error')
        return
      }
      stop()
      setError(null)
      setState('rendering')
      try {
        const { renderUtterance } = await loadSynth()
        const utterance = renderUtterance(trimmed, settings)
        if (!utterance.samples.length) {
          setError('Nothing to say — try different words.')
          setState('error')
          return
        }
        const ctx = await ensureContext()
        const gain = gainRef.current
        if (!gain) throw new Error('Audio output is not ready.')
        const buffer = ctx.createBuffer(1, utterance.samples.length, utterance.sampleRate)
        buffer.getChannelData(0).set(utterance.samples)
        const source = ctx.createBufferSource()
        source.buffer = buffer
        source.connect(gain)
        source.onended = () => {
          if (sourceRef.current === source) {
            sourceRef.current = null
            setState('idle')
          }
        }
        sourceRef.current = source
        setState('speaking')
        source.start()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Could not speak.')
        setState('error')
      }
    },
    [ensureContext, stop],
  )

  const exportWav = useCallback(async (text: string, settings: TalkSettings) => {
    const trimmed = text.trim()
    if (!trimmed) {
      setError('Type something first.')
      setState('error')
      return
    }
    setError(null)
    setState('exporting')
    try {
      const { renderUtterance, utteranceToWav, wavToBlob, suggestFileName } =
        await loadSynth()
      const utterance = renderUtterance(trimmed, settings)
      const bytes = utteranceToWav(utterance)
      const blob = wavToBlob(bytes)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = suggestFileName(trimmed)
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
      setState('idle')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Export failed.')
      setState('error')
    }
  }, [])

  useEffect(() => {
    const ctx = ctxRef.current
    if (!ctx?.setSinkId) return
    void ctx.setSinkId(sinkId || '').catch(() => {
      /* stay on current output */
    })
  }, [sinkId])

  useEffect(() => {
    const gain = gainRef.current
    if (!gain) return
    gain.gain.setTargetAtTime(volume, gain.context.currentTime, 0.015)
  }, [volume])

  const unlock = useCallback(async () => {
    await ensureContext()
  }, [ensureContext])

  return { state, error, speak, stop, exportWav, unlock, setError }
}
