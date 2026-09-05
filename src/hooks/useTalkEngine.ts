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

function settingsKey(settings: TalkSettings) {
  return [
    settings.personality.id,
    settings.pitch,
    settings.speed,
    settings.pitchQuality,
    settings.vocalEffort,
    settings.language,
    settings.vintage ? 1 : 0,
    settings.vibrato ?? '',
    settings.vibratoRate ?? '',
    settings.scale ?? '',
  ].join(':')
}

export function useTalkEngine(sinkId = '', volume = 1) {
  const ctxRef = useRef<AudioContext | null>(null)
  const masterGainRef = useRef<GainNode | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const sourceRef = useRef<AudioBufferSourceNode | null>(null)
  const fadeGainRef = useRef<GainNode | null>(null)
  const rafRef = useRef<number>(0)
  const startedAtRef = useRef(0)
  const elapsedMsRef = useRef(0)
  const wordsRef = useRef<SpokenWord[]>([])
  const textRef = useRef('')
  const appliedKeyRef = useRef('')
  const latestSettingsRef = useRef<TalkSettings | null>(null)
  const volumeRef = useRef(volume)
  volumeRef.current = volume
  const durationMsRef = useRef(0)
  const loopRef = useRef(false)
  // When set, locks loop for the current utterance (word previews force false).
  const sessionLoopRef = useRef<boolean | null>(null)
  const pausedRef = useRef(false)
  const playIdRef = useRef(0)
  const retuneBusyRef = useRef(false)
  const retuneDirtyRef = useRef(false)
  const retuneTimerRef = useRef(0)
  const retuneFollowUpRef = useRef(0)
  const pendingRef = useRef<{
    buffer: AudioBuffer
    offset: number
    words: SpokenWord[]
  } | null>(null)
  const [state, setState] = useState<PlayState>('idle')
  const [error, setError] = useState<string | null>(null)
  const [highlight, setHighlight] = useState<{ start: number; end: number } | null>(null)
  const [analyser, setAnalyser] = useState<AnalyserNode | null>(null)

  const stopHighlight = useCallback(() => {
    cancelAnimationFrame(rafRef.current)
    rafRef.current = 0
  }, [])

  const effectiveLoop = useCallback(() => sessionLoopRef.current ?? loopRef.current, [])

  const readElapsed = useCallback(() => {
    let elapsed: number
    if (pausedRef.current) elapsed = elapsedMsRef.current
    else {
      const ctx = ctxRef.current
      if (!ctx || !sourceRef.current) elapsed = elapsedMsRef.current
      else elapsed = Math.max(0, (ctx.currentTime - startedAtRef.current) * 1000)
    }
    const dur = durationMsRef.current
    if (effectiveLoop() && dur > 0) return elapsed % dur
    return elapsed
  }, [effectiveLoop])

  const syncHighlight = useCallback((elapsed: number, words: SpokenWord[]) => {
    let word: SpokenWord | null = null
    for (const next of words) {
      if (elapsed >= next.startMs) word = next
      else break
    }
    setHighlight(word ? { start: word.start, end: word.end } : null)
  }, [])

  const tickHighlight = useCallback(
    (source: AudioBufferSourceNode) => {
      stopHighlight()
      const loop = () => {
        if (sourceRef.current !== source) return
        const elapsed = readElapsed()
        elapsedMsRef.current = elapsed
        syncHighlight(elapsed, wordsRef.current)
        rafRef.current = requestAnimationFrame(loop)
      }
      rafRef.current = requestAnimationFrame(loop)
    },
    [readElapsed, stopHighlight, syncHighlight],
  )

  const stop = useCallback(() => {
    playIdRef.current += 1
    stopHighlight()
    pausedRef.current = false
    pendingRef.current = null
    sessionLoopRef.current = null
    retuneDirtyRef.current = false
    window.clearTimeout(retuneTimerRef.current)
    retuneTimerRef.current = 0
    window.clearTimeout(retuneFollowUpRef.current)
    retuneFollowUpRef.current = 0
    elapsedMsRef.current = 0
    try {
      sourceRef.current?.stop()
    } catch {
      /* already stopped */
    }
    sourceRef.current = null
    fadeGainRef.current = null
    wordsRef.current = []
    textRef.current = ''
    appliedKeyRef.current = ''
    setHighlight(null)
    setState('idle')
    const ctx = ctxRef.current
    if (ctx && ctx.state === 'suspended') void ctx.resume()
  }, [stopHighlight])

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
    if (!masterGainRef.current) {
      const gain = ctxRef.current.createGain()
      gain.gain.value = volumeRef.current
      analyserRef.current.connect(gain)
      gain.connect(ctxRef.current.destination)
      masterGainRef.current = gain
    }
    return ctxRef.current
  }, [sinkId])

  const armSource = useCallback(
    (ctx: AudioContext, buffer: AudioBuffer, offset: number, words: SpokenWord[]) => {
      const tap = analyserRef.current
      if (!tap) throw new Error('Audio output is not ready.')
      const clamped = Math.min(Math.max(0, offset), Math.max(0, buffer.duration - 0.01))
      const now = ctx.currentTime
      const prev = sourceRef.current
      const prevFade = fadeGainRef.current
      sourceRef.current = null
      fadeGainRef.current = null
      // Keep the previous buffer audible until the new one is armed, then
      // overlap a short crossfade so parameter tweaks never go silent.
      if (prev && prevFade && !pausedRef.current) {
        try {
          prevFade.gain.cancelScheduledValues(now)
          prevFade.gain.setValueAtTime(Math.max(0.0001, prevFade.gain.value), now)
          prevFade.gain.exponentialRampToValueAtTime(0.0001, now + 0.045)
          prev.stop(now + 0.05)
        } catch {
          try {
            prev.stop()
          } catch {
            /* already stopped */
          }
        }
      } else if (prev) {
        try {
          prev.stop()
        } catch {
          /* already stopped */
        }
      }

      const source = ctx.createBufferSource()
      source.buffer = buffer
      source.loop = effectiveLoop()
      durationMsRef.current = buffer.duration * 1000
      const fade = ctx.createGain()
      source.connect(fade)
      fade.connect(tap)
      source.onended = () => {
        if (sourceRef.current !== source) return
        sourceRef.current = null
        fadeGainRef.current = null
        sessionLoopRef.current = null
        stopHighlight()
        wordsRef.current = []
        elapsedMsRef.current = 0
        pendingRef.current = null
        setHighlight(null)
        setState('idle')
      }

      wordsRef.current = words
      elapsedMsRef.current = clamped * 1000
      syncHighlight(elapsedMsRef.current, words)

      if (pausedRef.current) {
        sourceRef.current = null
        fadeGainRef.current = null
        pendingRef.current = { buffer, offset: clamped, words }
        return source
      }

      if (ctx.state === 'suspended') void ctx.resume()
      fade.gain.setValueAtTime(0.0001, now)
      fade.gain.exponentialRampToValueAtTime(1, now + 0.03)
      source.start(now, clamped)
      sourceRef.current = source
      fadeGainRef.current = fade
      startedAtRef.current = now - clamped
      pendingRef.current = null
      tickHighlight(source)
      return source
    },
    [effectiveLoop, stopHighlight, syncHighlight, tickHighlight],
  )

  const applyRetune = useCallback(async () => {
    const settings = latestSettingsRef.current
    const text = textRef.current
    if (!settings || !text) return
    if (!sourceRef.current && !pendingRef.current && !pausedRef.current) return
    const key = settingsKey(settings)
    if (key === appliedKeyRef.current && !retuneDirtyRef.current) return
    if (retuneBusyRef.current) {
      retuneDirtyRef.current = true
      return
    }
    retuneBusyRef.current = true
    const playId = playIdRef.current
    try {
      retuneDirtyRef.current = false
      const snap = latestSettingsRef.current
      if (!snap) return

      // Yield so the current buffer keeps streaming while we re-render.
      await new Promise<void>((resolve) => {
        window.setTimeout(resolve, 0)
      })
      if (playId !== playIdRef.current) return

      const elapsed = readElapsed()
      const oldDuration = durationMsRef.current
      const oldWords = wordsRef.current
      const { renderUtterance, mapPlayOffsetSec } = await loadSynth()
      const utterance = renderUtterance(text, snap)
      if (playId !== playIdRef.current) return
      if (!utterance.samples.length) return

      const newDur = utterance.samples.length / utterance.sampleRate
      let offset: number
      if (oldDuration > 0) {
        // Proportional time keeps playback continuous when rate/scale change length.
        offset = (elapsed / oldDuration) * newDur
      } else {
        offset = mapPlayOffsetSec(elapsed, oldWords, utterance.words) ?? 0
      }
      if (!Number.isFinite(offset) || offset < 0) offset = 0
      if (offset >= newDur - 0.01) {
        // Past the end of the new render — keep the current audio instead of stopping.
        appliedKeyRef.current = settingsKey(snap)
        return
      }

      const ctx = await ensureContext()
      if (playId !== playIdRef.current) return
      const buffer = ctx.createBuffer(1, utterance.samples.length, utterance.sampleRate)
      buffer.getChannelData(0).set(utterance.samples)
      armSource(ctx, buffer, offset, utterance.words)
      appliedKeyRef.current = settingsKey(snap)
      if (!pausedRef.current) setState('speaking')
    } catch {
      /* keep current audio playing */
    } finally {
      retuneBusyRef.current = false
      if (
        retuneDirtyRef.current ||
        (latestSettingsRef.current &&
          settingsKey(latestSettingsRef.current) !== appliedKeyRef.current)
      ) {
        retuneDirtyRef.current = false
        window.clearTimeout(retuneFollowUpRef.current)
        retuneFollowUpRef.current = window.setTimeout(() => {
          retuneFollowUpRef.current = 0
          void applyRetune()
        }, 60)
      }
    }
  }, [armSource, ensureContext, readElapsed])

  const speak = useCallback(
    async (text: string, settings: TalkSettings, opts?: { loop?: boolean }) => {
      const trimmed = text.trim()
      if (!trimmed) {
        setError('Type something first.')
        setState('error')
        return
      }
      stop()
      sessionLoopRef.current = opts?.loop ?? null
      const playId = playIdRef.current
      latestSettingsRef.current = settings
      textRef.current = text
      appliedKeyRef.current = settingsKey(settings)
      setError(null)
      setState('rendering')
      try {
        const { renderUtterance } = await loadSynth()
        const used = latestSettingsRef.current ?? settings
        const utterance = renderUtterance(text, used)
        if (playId !== playIdRef.current) return
        if (!utterance.samples.length) {
          setError('Nothing to say — try different words.')
          setState('error')
          sessionLoopRef.current = null
          return
        }
        const ctx = await ensureContext()
        if (playId !== playIdRef.current) return
        const buffer = ctx.createBuffer(1, utterance.samples.length, utterance.sampleRate)
        buffer.getChannelData(0).set(utterance.samples)
        pausedRef.current = false
        armSource(ctx, buffer, 0, utterance.words)
        appliedKeyRef.current = settingsKey(used)
        setState('speaking')
        if (
          latestSettingsRef.current &&
          settingsKey(latestSettingsRef.current) !== appliedKeyRef.current
        ) {
          void applyRetune()
        }
      } catch (err) {
        if (playId !== playIdRef.current) return
        setError(err instanceof Error ? err.message : 'Could not speak.')
        setState('error')
        sessionLoopRef.current = null
      }
    },
    [applyRetune, armSource, ensureContext, stop],
  )

  const retune = useCallback(
    (settings: TalkSettings) => {
      latestSettingsRef.current = settings
      const live = sourceRef.current != null || pendingRef.current != null || pausedRef.current
      if (!live || !textRef.current) return
      if (settingsKey(settings) === appliedKeyRef.current) return
      // Coalesce slider drags: keep the current voice playing until the gesture settles.
      window.clearTimeout(retuneTimerRef.current)
      retuneTimerRef.current = window.setTimeout(() => {
        retuneTimerRef.current = 0
        void applyRetune()
      }, 90)
    },
    [applyRetune],
  )

  const pause = useCallback(async () => {
    const ctx = ctxRef.current
    if (!ctx || (!sourceRef.current && !pendingRef.current)) return
    elapsedMsRef.current = readElapsed()
    pausedRef.current = true
    stopHighlight()
    if (ctx.state === 'running') await ctx.suspend()
    setState('paused')
  }, [readElapsed, stopHighlight])

  const resume = useCallback(async () => {
    const ctx = ctxRef.current
    if (!ctx) return
    pausedRef.current = false
    if (ctx.state === 'suspended') await ctx.resume()
    const pending = pendingRef.current
    if (pending) {
      pendingRef.current = null
      armSource(ctx, pending.buffer, pending.offset, pending.words)
    } else if (sourceRef.current) {
      startedAtRef.current = ctx.currentTime - elapsedMsRef.current / 1000
      tickHighlight(sourceRef.current)
    } else {
      setState('idle')
      return
    }
    setState('speaking')
  }, [armSource, tickHighlight])

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
    const gain = masterGainRef.current
    if (!gain) return
    gain.gain.setTargetAtTime(volume, gain.context.currentTime, 0.015)
  }, [volume])

  const unlock = useCallback(async () => {
    await ensureContext()
  }, [ensureContext])

  const setLoop = useCallback(
    (on: boolean) => {
      loopRef.current = on
      if (sourceRef.current) sourceRef.current.loop = effectiveLoop()
    },
    [effectiveLoop],
  )

  return {
    state,
    error,
    speak,
    stop,
    pause,
    resume,
    retune,
    exportWav,
    unlock,
    highlight,
    analyser,
    setLoop,
    setError,
  }
}
