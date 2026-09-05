import { useEffect, useMemo, useRef, useState } from 'react'
import { MidiBadge } from './components/MidiBadge'
import { ParameterPanel } from './components/ParameterPanel'
import { PersonalityGrid } from './components/PersonalityGrid'
import { TalkActions, TalkPanel } from './components/TalkPanel'
import {
  PERSONALITIES,
  voiceFromPersonality,
  type Language,
  type Personality,
  type PitchQuality,
  type VocalEffort,
} from './engine/personalities'
import { DEFAULT_PADS, normalizePads, type PhrasePad } from './engine/pads'
import { useAudioOutputs } from './hooks/useAudioOutputs'
import { useTalkEngine } from './hooks/useTalkEngine'

const STORAGE_KEY = 'opentalkit-mac-settings'

type Saved = {
  personalityId: Personality['id']
  pitch: number
  speed: number
  pitchQuality: PitchQuality
  vocalEffort: VocalEffort
  language: Language
  vintage: boolean
  vibrato?: number
  vibratoRate?: number
  scale?: number
  text: string
  volume: number
  pads?: PhrasePad[]
  activePad?: number
}

function loadSaved(): Partial<Saved> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as Saved) : {}
  } catch {
    return {}
  }
}

export default function App() {
  const saved = useMemo(() => loadSaved(), [])
  const initial =
    PERSONALITIES.find((p) => p.id === saved.personalityId) ?? PERSONALITIES[0]

  const [personality, setPersonality] = useState<Personality>(initial)
  const initialVoice = voiceFromPersonality(initial)
  const [pitch, setPitch] = useState(saved.pitch ?? initialVoice.pitch)
  const [speed, setSpeed] = useState(saved.speed ?? initialVoice.speed)
  const [pitchQuality, setPitchQuality] = useState<PitchQuality>(
    saved.pitchQuality ?? initialVoice.pitchQuality,
  )
  const [vocalEffort, setVocalEffort] = useState<VocalEffort>(
    saved.vocalEffort ?? initialVoice.vocalEffort,
  )
  const [vibrato, setVibrato] = useState(saved.vibrato ?? initialVoice.vibrato)
  const [vibratoRate, setVibratoRate] = useState(
    saved.vibratoRate ?? initialVoice.vibratoRate,
  )
  const [scale, setScale] = useState(saved.scale ?? initialVoice.scale)
  const [language, setLanguage] = useState<Language>(saved.language ?? 'english')
  const [vintage, setVintage] = useState(saved.vintage ?? true)
  const [pads, setPads] = useState(() => normalizePads(saved.pads))
  const [activePad, setActivePad] = useState(() => {
    const i = saved.activePad
    if (typeof i === 'number' && i >= 0 && i < pads.length) return i
    const match = pads.findIndex((p) => p.text === (saved.text ?? ''))
    return match >= 0 ? match : 0
  })
  const [text, setText] = useState(
    saved.text ?? pads[activePad]?.text ?? DEFAULT_PADS[0]!.text,
  )
  const [volume, setVolume] = useState(() => {
    const n = saved.volume
    return typeof n === 'number' && Number.isFinite(n) ? Math.min(100, Math.max(0, n)) : 100
  })

  const audio = useAudioOutputs()
  const { state, error, speak, stop, pause, resume, exportWav, unlock, highlight } =
    useTalkEngine(audio.sinkId, volume / 100)
  const midiNote = useRef<number | null>(null)

  const settings = {
    personality,
    pitch,
    speed,
    pitchQuality,
    vocalEffort,
    language,
    vintage,
    vibrato,
    vibratoRate,
    scale,
  }
  const settingsRef = useRef(settings)
  settingsRef.current = settings
  const textRef = useRef(text)
  textRef.current = text

  useEffect(() => {
    const payload: Saved = {
      personalityId: personality.id,
      pitch,
      speed,
      pitchQuality,
      vocalEffort,
      language,
      vintage,
      vibrato,
      vibratoRate,
      scale,
      text,
      volume,
      pads,
      activePad,
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload))
  }, [personality, pitch, speed, pitchQuality, vocalEffort, vibrato, vibratoRate, scale, language, vintage, text, volume, pads, activePad])

  useEffect(() => {
    setPads((prev) => {
      const current = prev[activePad]
      if (!current || current.text === text) return prev
      const next = [...prev]
      next[activePad] = { ...current, text }
      return next
    })
  }, [text, activePad])

  function selectPersonality(p: Personality) {
    const voice = voiceFromPersonality(p)
    setPersonality(p)
    setPitch(voice.pitch)
    setSpeed(voice.speed)
    setPitchQuality(voice.pitchQuality)
    setVocalEffort(voice.vocalEffort)
    setVibrato(voice.vibrato)
    setVibratoRate(voice.vibratoRate)
    setScale(voice.scale)
  }

  return (
    <div className="shell min-h-svh px-3 py-6 sm:px-6 sm:py-10">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-8">
        <h1 className="sr-only">Talk It!</h1>
        <main className="talk-panel flex flex-col gap-8 rounded-sm p-4 sm:p-6">
          <PersonalityGrid
            selectedId={personality.id}
            pitch={pitch}
            speed={speed}
            pitchQuality={pitchQuality}
            vocalEffort={vocalEffort}
            vibrato={vibrato}
            vibratoRate={vibratoRate}
            scale={scale}
            onSelect={selectPersonality}
            onPitch={setPitch}
            onSpeed={setSpeed}
            onPitchQuality={setPitchQuality}
            onVocalEffort={setVocalEffort}
            onVibrato={setVibrato}
            onVibratoRate={setVibratoRate}
            onScale={setScale}
          />
          <TalkActions
            speaking={state === 'speaking'}
            paused={state === 'paused'}
            rendering={state === 'rendering'}
            exporting={state === 'exporting'}
            empty={!text.trim()}
            onTalk={() => {
              if (state === 'paused') void resume()
              else void speak(text, settings)
            }}
            onStop={stop}
            onExport={() => void exportWav(text, settings)}
            volume={volume}
            onVolume={setVolume}
            midi={
              <MidiBadge
                audio={audio}
                onPrimeAudio={() => unlock()}
                onRateCc={setSpeed}
                onNoteOn={(event) => {
                  midiNote.current = event.note
                  const nextPitch = Math.round(event.pitch)
                  setPitch(nextPitch)
                  setSpeed(event.speed)
                  void speak(textRef.current, {
                    ...settingsRef.current,
                    pitch: nextPitch,
                    speed: event.speed,
                  })
                }}
                onNoteOff={(event) => {
                  if (midiNote.current === event.note) {
                    midiNote.current = null
                    stop()
                  }
                }}
              />
            }
          />
          <ParameterPanel
            language={language}
            vintage={vintage}
            onLanguage={setLanguage}
            onVintage={setVintage}
          />
          <TalkPanel
            text={text}
            onText={setText}
            pitch={pitch}
            speed={speed}
            language={language}
            personality={personality}
            pitchQuality={pitchQuality}
            vocalEffort={vocalEffort}
            vibrato={vibrato}
            vibratoRate={vibratoRate}
            scale={scale}
            speaking={state === 'speaking'}
            paused={state === 'paused'}
            error={error}
            highlight={highlight}
            onTalk={() => {
              if (state === 'paused') void resume()
              else void speak(text, settings)
            }}
            onSpeakWord={(snippet) => void speak(snippet, settings)}
            onPause={() => void pause()}
            onResume={() => void resume()}
            pads={pads}
            activePad={activePad}
            onSelectPad={(index) => {
              setActivePad(index)
              setText(pads[index]?.text ?? '')
            }}
            onClearPad={(index) => {
              setPads((prev) => {
                const next = [...prev]
                next[index] = { name: '', text: '' }
                return next
              })
              if (index === activePad) setText('')
            }}
          />
        </main>
      </div>
    </div>
  )
}
