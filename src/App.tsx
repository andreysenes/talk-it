import { useEffect, useMemo, useState } from 'react'
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

  const { state, error, speak, stop, exportWav } = useTalkEngine()

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

  const settings = {
    personality,
    pitch,
    speed,
    pitchQuality,
    vocalEffort,
    language,
    vintage,
  }

  return (
    <div className="cloud-sky min-h-svh px-3 py-4 sm:px-6 sm:py-8">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-5">
        <header className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="font-display text-xs font-bold tracking-[0.2em] text-sky-900/70 uppercase">
              Microsoft Plus! for Kids · for Mac
            </p>
            <h1 className="font-display text-4xl font-extrabold tracking-tight text-sky-950 sm:text-5xl">
              Talk It!
            </h1>
            <p className="mt-1 max-w-xl text-sm text-slate-700 sm:text-base">
              A native formant recreation of OpenTalkIt / SoftVoice. Same 20 personalities,
              pitch, speed, sung mode, and WAV export — no Windows DLL, no virtual machine.
            </p>
          </div>
          <div className="rounded-xl bg-white/70 px-3 py-2 text-xs text-slate-600 shadow-sm ring-1 ring-slate-800/10">
            Voice: <span className="font-bold text-slate-800">{personality.label}</span>
            <span className="mx-1.5 text-slate-400">·</span>
            {personality.engineName}
          </div>
        </header>

        <main className="talk-panel flex flex-col gap-6 rounded-3xl p-4 sm:p-6">
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
            speaking={state === 'speaking'}
            rendering={state === 'rendering'}
            exporting={state === 'exporting'}
            error={error}
            onTalk={() => void speak(text, settings)}
            onStop={stop}
            onExport={() => void exportWav(text, settings)}
          />
        </main>

        <footer className="pb-4 text-xs leading-relaxed text-slate-600">
          SoftVoice / <code>TIBASE32.DLL</code> is a 32-bit Windows binary, so the original
          engine cannot run on modern macOS. This app synthesizes the same class of speech
          (parallel formant, Rosenberg glottal pulse) with Talk It! presets reverse-engineered
          by OpenTalkIt. It is not a bit-exact dump of the proprietary DLL. Engine:{' '}
          <a
            className="underline decoration-sky-400 underline-offset-2"
            href="https://klatts.ch/"
            target="_blank"
            rel="noreferrer"
          >
            klattsch
          </a>
          .
        </footer>
      </div>
    </div>
  )
}
