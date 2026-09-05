import { useCallback, useEffect, useRef, useState } from 'react'
import type { TalkSettings } from '../engine/personalities'
import type { SpokenWord } from '../engine/synth'

export type PlayState =
  | 'idle'
  | 'rendering'
  | 'speaking'
  | 'paused'
  | 'exporting'
  | 'error'

async function loadSynth() {
  return import('../engine/synth')
}

export function useTalkEngine(sinkId = '', volume = 1) {
  const ctxRef = useRef<AudioContext | null>(null)
  const gainRef = useRef<GainNode | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const sourceRef = useRef<AudioBufferSourceNode | null>(null)
  const rafRef = useRef<number>(0)
  const startedAtRef = useRef(0)
  const wordsRef = useRef<SpokenWord[]>([])
  const volumeRef = useRef(volume)
  volumeRef.current = volume
  const pausedRef = useRef(false)
  const [state, setState] = useState<PlayState>('idle')
  const [error, setError] = useState<string | null>(null)
  const [highlight, setHighlight] = useState<{ start: number; end: number } | null>(null)
  const [analyser, setAnalyser] = useState<AnalyserNode | null>(null)

  const stop = useCallback(() => {
    cancelAnimationFrame(rafRef.current)
    rafRef.current = 0
    pausedRef.current = false
    try {
      sourceRef.current?.stop()
    } catch {
      /* already stopped */
    }
    sourceRef.current = null
    wordsRef.current = []
    setHighlight(null)
    setState('idle')
    const ctx = ctxRef.current
    if (ctx && ctx.state === 'suspended') void ctx.resume()
  }, [])

  useEffect(() => () => stop(), [stop])

  const ensureContext = useCallback(async () => {
    if (!ctxRef.current) {
      ctxRef.current = new AudioContext()
    }
    if (ctxRef.current.state === 'suspended' && !pausedRef.current) {
      await ctxRef.current.resume()
    }
    if (ctxRef.current.setSinkId) {
      try {
        await ctxRef.current.setSinkId(sinkId || '')
      } catch {
        /* stay on default output */
      }
    }
    if (!analyserRef.current) {
      const node = ctxRef.current.createAnalyser()
      node.fftSize = 256
      node.smoothingTimeConstant = 0.35
      analyserRef.current = node
      setAnalyser(node)
    }
    if (!gainRef.current) {
      const gain = ctxRef.current.createGain()
      gain.gain.value = volumeRef.current
      analyserRef.current.connect(gain)
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
        const utterance = renderUtterance(text, settings)
        if (!utterance.samples.length) {
          setError('Nothing to say — try different words.')
          setState('error')
          return
        }
        const ctx = await ensureContext()
        const tap = analyserRef.current
        if (!tap || !gainRef.current) throw new Error('Audio output is not ready.')
        const buffer = ctx.createBuffer(1, utterance.samples.length, utterance.sampleRate)
        buffer.getChannelData(0).set(utterance.samples)
        const source = ctx.createBufferSource()
        source.buffer = buffer
        source.connect(tap)
        source.onended = () => {
          if (sourceRef.current === source) {
            sourceRef.current = null
            cancelAnimationFrame(rafRef.current)
            rafRef.current = 0
            wordsRef.current = []
            setHighlight(null)
            setState('idle')
          }
        }
        sourceRef.current = source
        wordsRef.current = utterance.words
        setState('speaking')
        source.start()
        startedAtRef.current = ctx.currentTime
        let lastKey = ''
        const tick = () => {
          if (sourceRef.current !== source) return
          const elapsed = (ctx.currentTime - startedAtRef.current) * 1000
          let word: SpokenWord | null = null
          for (const next of wordsRef.current) {
            if (elapsed >= next.startMs) word = next
            else break
          }
          const key = word ? `${word.start}:${word.end}` : ''
          if (key !== lastKey) {
            lastKey = key
            setHighlight(word ? { start: word.start, end: word.end } : null)
          }
          rafRef.current = requestAnimationFrame(tick)
        }
        rafRef.current = requestAnimationFrame(tick)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Could not speak.')
        setState('error')
      }
    },
    [ensureContext, stop],
  )

  const pause = useCallback(async () => {
    const ctx = ctxRef.current
    if (!ctx || !sourceRef.current) return
    pausedRef.current = true
    if (ctx.state === 'running') await ctx.suspend()
    setState('paused')
  }, [])

  const resume = useCallback(async () => {
    const ctx = ctxRef.current
    if (!ctx || !sourceRef.current) return
    pausedRef.current = false
    if (ctx.state === 'suspended') await ctx.resume()
    setState('speaking')
  }, [])

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

  return { state, error, speak, stop, pause, resume, exportWav, unlock, highlight, analyser, setError }
}
