import { Volume1, Volume2, VolumeX } from 'lucide-react'
import { useEffect, useRef } from 'react'

function sizeCanvas(canvas: HTMLCanvasElement) {
  const dpr = window.devicePixelRatio || 1
  const width = Math.max(1, Math.floor(canvas.clientWidth * dpr))
  const height = Math.max(1, Math.floor(canvas.clientHeight * dpr))
  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width
    canvas.height = height
  }
  return { width, height }
}

function drawIdle(ctx: CanvasRenderingContext2D, width: number, height: number) {
  ctx.clearRect(0, 0, width, height)
  ctx.strokeStyle = 'rgba(255,255,255,0.16)'
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(0, height / 2)
  ctx.lineTo(width, height / 2)
  ctx.stroke()
}

function WaveMeter({
  analyser,
  playing,
  paused,
}: {
  analyser: AnalyserNode | null
  playing: boolean
  paused: boolean
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const dataRef = useRef<Uint8Array<ArrayBuffer> | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let raf = 0

    const paintIdle = () => {
      const { width, height } = sizeCanvas(canvas)
      drawIdle(ctx, width, height)
    }

    const paintLive = () => {
      if (!analyser) {
        paintIdle()
        return
      }
      const { width, height } = sizeCanvas(canvas)
      const n = analyser.fftSize
      if (!dataRef.current || dataRef.current.length !== n) {
        dataRef.current = new Uint8Array(new ArrayBuffer(n))
      }
      analyser.getByteTimeDomainData(dataRef.current)
      ctx.clearRect(0, 0, width, height)
      ctx.strokeStyle = 'rgba(255,255,255,0.88)'
      ctx.lineWidth = 1.25
      ctx.beginPath()
      const data = dataRef.current
      for (let i = 0; i < data.length; i++) {
        const x = (i / (data.length - 1)) * width
        const y = (data[i] / 255) * height
        if (i === 0) ctx.moveTo(x, y)
        else ctx.lineTo(x, y)
      }
      ctx.stroke()
    }

    if (playing && analyser) {
      const tick = () => {
        paintLive()
        raf = requestAnimationFrame(tick)
      }
      raf = requestAnimationFrame(tick)
      return () => cancelAnimationFrame(raf)
    }

    if (!paused) paintIdle()
    return () => cancelAnimationFrame(raf)
  }, [analyser, playing, paused])

  return (
    <canvas
      ref={canvasRef}
      className="h-6 min-w-16 flex-1"
      aria-hidden
    />
  )
}

export function VolumeControl({
  value,
  onChange,
  analyser,
  playing,
  paused,
}: {
  value: number
  onChange: (n: number) => void
  analyser: AnalyserNode | null
  playing: boolean
  paused: boolean
}) {
  const lastRef = useRef(value > 0 ? value : 80)
  useEffect(() => {
    if (value > 0) lastRef.current = value
  }, [value])
  const Icon = value === 0 ? VolumeX : value < 50 ? Volume1 : Volume2

  return (
    <div className="flex h-11 min-w-0 flex-1 items-center gap-2 border border-neutral-600 px-3">
      <button
        type="button"
        className="text-neutral-300 hover:text-white"
        aria-label={value === 0 ? 'Unmute' : 'Mute'}
        onClick={() => onChange(value === 0 ? lastRef.current : 0)}
      >
        <Icon className="size-4" />
      </button>
      <input
        type="range"
        min={0}
        max={100}
        step={1}
        value={value}
        aria-label="Volume"
        onChange={(e) => onChange(Number(e.target.value))}
        className="volume-slider w-24 shrink-0"
      />
      <span className="w-7 shrink-0 text-right font-mono text-[11px] text-neutral-500">
        {value}
      </span>
      <WaveMeter analyser={analyser} playing={playing} paused={paused} />
    </div>
  )
}
