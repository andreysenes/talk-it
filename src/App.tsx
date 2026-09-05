import { useEffect, useMemo, useRef, useState } from 'react'
import { MidiBadge } from './components/MidiBadge'
import { ParameterPanel } from './components/ParameterPanel'
import { PersonalityGrid } from './components/PersonalityGrid'
import { TalkActions, TalkPanel } from './components/TalkPanel'
import {
  PERSONALITIES,
  personalityById,
  type Language,
  type Personality,
  type PitchQuality,
  type VocalEffort,
} from './engine/personalities'
import {
  DEFAULT_PADS,
  emptyPad,
  normalizePads,
  padIndexFromMidiNote,
  padsEqual,
  snapshotPad,
  stockPadVoice,
  talkSettingsFromVoice,
  voiceFromPad,
  type PadVoice,
  type PhrasePad,
} from './engine/pads'
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

function bootFromSaved(saved: Partial<Saved>) {
  const pads = normalizePads(saved.pads)
  let activePad = 0
  if (typeof saved.activePad === 'number' && saved.activePad >= 0 && saved.activePad < pads.length) {
    activePad = saved.activePad
  } else {
    const match = pads.findIndex((p) => p.text === (saved.text ?? ''))
    if (match >= 0) activePad = match
  }
  const fallback = stockPadVoice(
    PERSONALITIES.some((p) => p.id === saved.personalityId)
      ? saved.personalityId!
      : 'male',
    {
      language: saved.language === 'spanish' ? 'spanish' : 'english',
      vintage: saved.vintage ?? true,
    },
  )
  const migrated: PadVoice = {
    ...fallback,
    pitch: typeof saved.pitch === 'number' ? saved.pitch : fallback.pitch,
    speed: typeof saved.speed === 'number' ? saved.speed : fallback.speed,
    pitchQuality: saved.pitchQuality ?? fallback.pitchQuality,
    vocalEffort: saved.vocalEffort ?? fallback.vocalEffort,
    vibrato: typeof saved.vibrato === 'number' ? saved.vibrato : fallback.vibrato,
    vibratoRate: typeof saved.vibratoRate === 'number' ? saved.vibratoRate : fallback.vibratoRate,
    scale: typeof saved.scale === 'number' ? saved.scale : fallback.scale,
  }
  const voice = voiceFromPad(pads[activePad] ?? {}, migrated)
  return {
    pads,
    activePad,
    voice,
    text: saved.text ?? pads[activePad]?.text ?? DEFAULT_PADS[0]!.text,
    volume:
      typeof saved.volume === 'number' && Number.isFinite(saved.volume)
        ? Math.min(100, Math.max(0, saved.volume))
        : 100,
  }
}

export default function App() {
  const saved = useMemo(() => loadSaved(), [])
  const boot = useMemo(() => bootFromSaved(saved), [saved])

  const [personality, setPersonality] = useState(() => personalityById(boot.voice.personalityId))
  const [pitch, setPitch] = useState(boot.voice.pitch)
  const [speed, setSpeed] = useState(boot.voice.speed)
  const [pitchQuality, setPitchQuality] = useState<PitchQuality>(boot.voice.pitchQuality)
  const [vocalEffort, setVocalEffort] = useState<VocalEffort>(boot.voice.vocalEffort)
  const [vibrato, setVibrato] = useState(boot.voice.vibrato)
  const [vibratoRate, setVibratoRate] = useState(boot.voice.vibratoRate)
  const [scale, setScale] = useState(boot.voice.scale)
  const [language, setLanguage] = useState<Language>(boot.voice.language)
  const [vintage, setVintage] = useState(boot.voice.vintage)
  const [pads, setPads] = useState(boot.pads)
  const [activePad, setActivePad] = useState(boot.activePad)
  const [text, setText] = useState(boot.text)
  const [volume, setVolume] = useState(boot.volume)

  const audio = useAudioOutputs()
  const { state, error, speak, stop, pause, resume, retune, exportWav, unlock, highlight, analyser } =
    useTalkEngine(audio.sinkId, volume / 100)
  const midiNote = useRef<number | null>(null)

  const voice: PadVoice = {
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
  }
  const settings = talkSettingsFromVoice(voice)
  const settingsRef = useRef(settings)
  settingsRef.current = settings
  const textRef = useRef(text)
  textRef.current = text
  const voiceRef = useRef(voice)
  voiceRef.current = voice

  useEffect(() => {
    retune(settings)
  }, [
    retune,
    personality.id,
    pitch,
    speed,
    pitchQuality,
    vocalEffort,
    language,
    vintage,
    vibrato,
    vibratoRate,
    scale,
  ])

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
  }, [
    personality,
    pitch,
    speed,
    pitchQuality,
    vocalEffort,
    vibrato,
    vibratoRate,
    scale,
    language,
    vintage,
    text,
    volume,
    pads,
    activePad,
  ])

  useEffect(() => {
    setPads((prev) => {
      const current = prev[activePad]
      if (!current) return prev
      const nextPad = snapshotPad(current, text, voiceRef.current)
      if (padsEqual(current, nextPad)) return prev
      const next = [...prev]
      next[activePad] = nextPad
      return next
    })
  }, [
    text,
    activePad,
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
  ])

  function applyVoice(next: PadVoice) {
    setPersonality(personalityById(next.personalityId))
    setPitch(next.pitch)
    setSpeed(next.speed)
    setPitchQuality(next.pitchQuality)
    setVocalEffort(next.vocalEffort)
    setLanguage(next.language)
    setVintage(next.vintage)
    setVibrato(next.vibrato)
    setVibratoRate(next.vibratoRate)
    setScale(next.scale)
  }

  function selectPersonality(p: Personality) {
    applyVoice({
      ...stockPadVoice(p.id, { language, vintage }),
      language,
      vintage,
    })
  }

  function selectPad(index: number, play?: boolean) {
    const pad = pads[index]
    if (!pad) return
    const nextVoice = pad.personalityId
      ? voiceFromPad(pad, voiceRef.current)
      : voiceRef.current
    setActivePad(index)
    setText(pad.text)
    applyVoice(nextVoice)
    if (play && pad.text.trim()) {
      void speak(pad.text, talkSettingsFromVoice(nextVoice))
    }
  }

  return (
    <div className="shell min-h-svh px-3 py-6 sm:px-6 sm:py-10">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-8">
        <h1 className="sr-only">Talk It!</h1>
        <main className="talk-panel flex flex-col gap-8 rounded-sm p-4 sm:p-6">
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
            onSelectPad={selectPad}
            onClearPad={(index) => {
              setPads((prev) => {
                const next = [...prev]
                next[index] = emptyPad()
                return next
              })
              if (index === activePad) setText('')
            }}
            midi={
              <MidiBadge
                audio={audio}
                onPrimeAudio={() => unlock()}
                onRateCc={setSpeed}
                onNoteOn={(event) => {
                  const padIndex = padIndexFromMidiNote(event.note)
                  midiNote.current = event.note
                  if (padIndex != null) {
                    selectPad(padIndex, true)
                    return
                  }
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
          <TalkActions
            speaking={state === 'speaking'}
            paused={state === 'paused'}
            rendering={state === 'rendering'}
            exporting={state === 'exporting'}
            empty={!text.trim()}
            analyser={analyser}
            onPlay={() => {
              if (state === 'speaking') void pause()
              else if (state === 'paused') void resume()
              else void speak(text, settings)
            }}
            onStop={stop}
            onExport={() => void exportWav(text, settings)}
            volume={volume}
            onVolume={setVolume}
          />
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
          <ParameterPanel
            language={language}
            vintage={vintage}
            onLanguage={setLanguage}
            onVintage={setVintage}
          />
        </main>
      </div>
    </div>
  )
}
