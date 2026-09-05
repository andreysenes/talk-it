import { useEffect, useMemo, useRef, useState } from 'react'
import { MidiBadge } from './components/MidiBadge'
import { ParameterPanel } from './components/ParameterPanel'
import { PersonalityGrid } from './components/PersonalityGrid'
import { TalkActions, TalkPanel } from './components/TalkPanel'
import { VoiceSliders } from './components/VoiceSliders'
import {
  PERSONALITIES,
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
  const [pitch, setPitch] = useState(saved.pitch ?? initial.pitch)
  const [speed, setSpeed] = useState(saved.speed ?? initial.speed)
  const [pitchQuality, setPitchQuality] = useState<PitchQuality>(
    saved.pitchQuality ?? initial.pitchQuality,
  )
  const [vocalEffort, setVocalEffort] = useState<VocalEffort>(
    saved.vocalEffort ?? initial.vocalEffort,
  )
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
  const { state, error, speak, stop, exportWav, unlock, highlight } = useTalkEngine(
    audio.sinkId,
    volume / 100,
  )
  const midiNote = useRef<number | null>(null)

  const settings = {
    personality,
    pitch,
    speed,
    pitchQuality,
    vocalEffort,
    language,
    vintage,
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
      text,
      volume,
      pads,
      activePad,
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload))
  }, [personality, pitch, speed, pitchQuality, vocalEffort, language, vintage, text, volume, pads, activePad])

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
    setPersonality(p)
    setPitch(p.pitch)
    setSpeed(p.speed)
    setPitchQuality(p.pitchQuality)
    setVocalEffort(p.vocalEffort)
  }

  return (
    <div className="shell min-h-svh px-3 py-6 sm:px-6 sm:py-10">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-8">
        <h1 className="sr-only">Talk It!</h1>
        <main className="talk-panel flex flex-col gap-8 rounded-sm p-4 sm:p-6">
          <PersonalityGrid
            selectedId={personality.id}
            onSelect={selectPersonality}
          />
          <TalkActions
            speaking={state === 'speaking'}
            rendering={state === 'rendering'}
            exporting={state === 'exporting'}
            empty={!text.trim()}
            onTalk={() => void speak(text, settings)}
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
          <VoiceSliders
            pitch={pitch}
            speed={speed}
            onPitch={setPitch}
            onSpeed={setSpeed}
          />
          <ParameterPanel
            pitchQuality={pitchQuality}
            vocalEffort={vocalEffort}
            language={language}
            vintage={vintage}
            onPitchQuality={setPitchQuality}
            onVocalEffort={setVocalEffort}
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
            speaking={state === 'speaking'}
            error={error}
            highlight={highlight}
            onTalk={() => void speak(text, settings)}
            onSpeakWord={(snippet) => void speak(snippet, settings)}
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
