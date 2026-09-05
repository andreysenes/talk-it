import { useEffect, useMemo, useRef, useState } from 'react'
import { MidiBadge } from './components/MidiBadge'
import { ParameterPanel } from './components/ParameterPanel'
import { PersonalityGrid } from './components/PersonalityGrid'
import { TalkPanel } from './components/TalkPanel'
import { VoiceSliders } from './components/VoiceSliders'
import {
  PERSONALITIES,
  type Language,
  type Personality,
  type PitchQuality,
  type VocalEffort,
} from './engine/personalities'
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
  const [text, setText] = useState(
    saved.text ?? 'All your base are belong to us.',
  )

  const audio = useAudioOutputs()
  const { state, error, speak, stop, exportWav, unlock } = useTalkEngine(audio.sinkId)
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
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload))
  }, [personality, pitch, speed, pitchQuality, vocalEffort, language, vintage, text])

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
        <header className="flex justify-end">
          <h1 className="sr-only">Talk It!</h1>
          <div className="flex flex-col gap-2 sm:items-end">
            <div className="border border-neutral-800 px-3 py-2 text-xs text-neutral-500">
              Voice: <span className="text-white">{personality.label}</span>
              <span className="mx-1.5 text-neutral-700">·</span>
              {personality.engineName}
            </div>
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
          </div>
        </header>

        <main className="talk-panel flex flex-col gap-8 rounded-sm p-4 sm:p-6">
          <PersonalityGrid
            selectedId={personality.id}
            onSelect={selectPersonality}
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
            speaking={state === 'speaking'}
            rendering={state === 'rendering'}
            exporting={state === 'exporting'}
            error={error}
            onTalk={() => void speak(text, settings)}
            onStop={stop}
            onExport={() => void exportWav(text, settings)}
          />
        </main>

        <footer className="pb-4 text-xs leading-relaxed text-neutral-600">
          SoftVoice / <code className="text-neutral-400">TIBASE32.DLL</code> is a 32-bit Windows binary, so the original
          engine cannot run on modern macOS. This app synthesizes the same class of speech
          (parallel formant, Rosenberg glottal pulse) with Talk It! presets reverse-engineered
          by OpenTalkIt. It is not a bit-exact dump of the proprietary DLL. Engine:{' '}
          <a
            className="text-neutral-300 underline decoration-neutral-600 underline-offset-2 hover:text-white"
            href="https://klatts.ch/"
            target="_blank"
            rel="noreferrer"
          >
            klattsch
          </a>
          . MIDI in/out is Web MIDI; audio returns to the DAW through the selected output
          (BlackHole / Loopback on Mac).
        </footer>
      </div>
    </div>
  )
}
