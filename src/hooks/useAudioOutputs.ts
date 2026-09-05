import { useCallback, useEffect, useState } from 'react'

export type AudioSink = { id: string; label: string }

export function useAudioOutputs() {
  const [sinks, setSinks] = useState<AudioSink[]>([])
  const [sinkId, setSinkId] = useState('')
  const [error, setError] = useState<string | null>(null)
  const supported =
    typeof AudioContext !== 'undefined' &&
    typeof AudioContext.prototype.setSinkId === 'function'

  const refresh = useCallback(async () => {
    if (!navigator.mediaDevices?.enumerateDevices) return
    try {
      const devices = await navigator.mediaDevices.enumerateDevices()
      const outs = devices
        .filter((d) => d.kind === 'audiooutput')
        .map((d, i) => ({
          id: d.deviceId,
          label: d.label || `Output ${i + 1}`,
        }))
      setSinks(outs)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not list audio outputs.')
    }
  }, [])

  const unlockLabels = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      stream.getTracks().forEach((t) => t.stop())
      setError(null)
    } catch {
      /* labels may stay empty; listing still works */
    }
    await refresh()
  }, [refresh])

  useEffect(() => {
    void refresh()
    navigator.mediaDevices?.addEventListener?.('devicechange', refresh)
    return () => {
      navigator.mediaDevices?.removeEventListener?.('devicechange', refresh)
    }
  }, [refresh])

  return { supported, sinks, sinkId, setSinkId, error, unlockLabels }
}
