import { useEffect, useMemo, useRef, useState } from 'react'
import { MidiBadge } from './components/MidiBadge'
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
  isExposedSoftVoiceText,
  isRetiredFactoryText,
  normalizePads,
  PAD_KEYS,
  padIndexFromMidiNote,
  padsEqual,
  snapshotPad,
  stockPadVoice,
  talkSettingsFromVoice,
  voiceFromPad,
  type PadVoice,
  type PhrasePad,
} from './engine/pads'
import {
  makeVoicePreset,
  normalizePresets,
  type VoicePreset,
} from './engine/presets'
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
  presets?: VoicePreset[]
  activePresetId?: string | null
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
  const padText = pads[activePad]?.text ?? DEFAULT_PADS[0]!.text
  const savedText = typeof saved.text === 'string' ? saved.text : padText
  // Don't keep a retired factory line in the editor after pads were upgraded.
  const text =
    isRetiredFactoryText(savedText) || isExposedSoftVoiceText(savedText)
      ? padText
      : savedText
  const presets = normalizePresets(saved.presets)
  const activePresetId =
    typeof saved.activePresetId === 'string' &&
    presets.some((p) => p.id === saved.activePresetId)
      ? saved.activePresetId
      : null
  return {
    pads,
    activePad,
    voice,
    text,
    presets,
    activePresetId,
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
  const [loop, setLoop] = useState(boot.voice.loop)
  const [language, setLanguage] = useState<Language>(boot.voice.language)
  const [vintage, setVintage] = useState(boot.voice.vintage)
  const [pads, setPads] = useState(boot.pads)
  const [activePad, setActivePad] = useState(boot.activePad)
  const [text, setText] = useState(boot.text)
  const [volume, setVolume] = useState(boot.volume)
  const [presets, setPresets] = useState<VoicePreset[]>(boot.presets)
  const [activePresetId, setActivePresetId] = useState<string | null>(boot.activePresetId)


  const audio = useAudioOutputs()
  const { state, error, speak, stop, pause, resume, retune, exportWav, unlock, highlight, progress, analyser, setLoop: setEngineLoop, releaseHold } =
    useTalkEngine(audio.sinkId, volume / 100)
  const midiNote = useRef<number | null>(null)
  const heldPadRef = useRef<number | null>(null)

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
    loop,
  }
  const settings = talkSettingsFromVoice(voice)
  const settingsRef = useRef(settings)
  settingsRef.current = settings
  const textRef = useRef(text)
  textRef.current = text
  const voiceRef = useRef(voice)
  voiceRef.current = voice

  useEffect(() => {
    setEngineLoop(loop)
  }, [loop, setEngineLoop])

  useEffect(() => {
    retune(settings, text)
  }, [
    retune,
    text,
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
      presets,
      activePresetId,
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
    loop,
    presets,
    activePresetId,
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
    loop,
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
    setLoop(next.loop)
  }

  function selectPersonality(p: Personality) {
    setActivePresetId(null)
    applyVoice({
      ...stockPadVoice(p.id, { language, vintage }),
      language,
      vintage,
      loop,
    })
  }

  function selectPreset(preset: VoicePreset) {
    setActivePresetId(preset.id)
    applyVoice({
      ...stockPadVoice(preset.personalityId, { language, vintage }),
      personalityId: preset.personalityId,
      pitch: preset.pitch,
      speed: preset.speed,
      pitchQuality: preset.pitchQuality,
      vocalEffort: preset.vocalEffort,
      vibrato: preset.vibrato,
      vibratoRate: preset.vibratoRate,
      scale: preset.scale,
      language,
      vintage,
      loop,
    })
  }

  function addPreset() {
    const suggested = `Voice ${presets.length + 1}`
    const label = window.prompt('Name this voice preset', suggested)?.trim()
    if (!label) return
    const preset = makeVoicePreset({
      label,
      personalityId: personality.id,
      pitch,
      speed,
      pitchQuality,
      vocalEffort,
      vibrato,
      vibratoRate,
      scale,
    })
    setPresets((prev) => [...prev, preset])
    setActivePresetId(preset.id)
  }

  function removePreset(id: string) {
    setPresets((prev) => prev.filter((p) => p.id !== id))
    if (activePresetId === id) setActivePresetId(null)
  }

  function padDown(index: number) {
    const pad = pads[index]
    if (!pad) return
    const nextVoice = pad.personalityId
      ? voiceFromPad(pad, voiceRef.current)
      : voiceRef.current
    setActivePresetId(null)
    setActivePad(index)
    setText(pad.text)
    applyVoice(nextVoice)
    heldPadRef.current = index
    void unlock()
    if (pad.text.trim()) {
      // Hold forces loop for the gesture; releaseHold restores the pad loop flag.
      void speak(pad.text, talkSettingsFromVoice(nextVoice), { loop: true })
    }
  }

  function padUp(index: number) {
    if (heldPadRef.current !== index) return
    heldPadRef.current = null
    releaseHold()
  }

  return (
    <div className="shell flex h-dvh max-h-dvh flex-col overflow-hidden px-1.5 py-1.5 sm:px-6 sm:py-8">
      <div className="mx-auto flex min-h-0 w-full max-w-5xl flex-1 flex-col gap-1 sm:gap-6">
        <h1 className="sr-only">Talk It!</h1>
        <main className="talk-panel flex min-h-0 flex-1 flex-col gap-1 overflow-hidden rounded-sm p-1.5 sm:gap-6 sm:overflow-visible sm:p-6">
          <div className="flex min-h-0 min-w-0 flex-1 flex-col">
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
            progress={progress}
            onTalk={() => {
              if (state === 'paused') void resume()
              else void speak(text, settings)
            }}
            onSpeakWord={(snippet) => void speak(snippet, settings, { loop: false })}
            onPause={() => void pause()}
            onResume={() => void resume()}
            pads={pads}
            activePad={activePad}
            onPadDown={padDown}
            onPadUp={padUp}
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
                    padDown(padIndex)
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
                  if (midiNote.current !== event.note) return
                  midiNote.current = null
                  const padIndex = padIndexFromMidiNote(event.note)
                  if (padIndex != null) {
                    padUp(padIndex)
                    return
                  }
                  stop()
                }}
              />
            }
          />
          </div>
          <div className="shrink-0">
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
            looping={loop}
            onLoop={() => {
              const next = !loop
              setLoop(next)
              setEngineLoop(next)
            }}
            onExport={() => void exportWav(text, settings)}
            volume={volume}
            onVolume={setVolume}
            vintage={vintage}
            onVintage={setVintage}
          />
          </div>
          <div className="min-h-0 shrink-0">
          <PersonalityGrid
            selectedId={personality.id}
            selectedPresetId={activePresetId}
            presets={presets}
            pitch={pitch}
            speed={speed}
            pitchQuality={pitchQuality}
            vocalEffort={vocalEffort}
            vibrato={vibrato}
            vibratoRate={vibratoRate}
            scale={scale}
            language={language}
            activePadKey={PAD_KEYS[activePad] ?? String(activePad + 1)}
            canClearPad={Boolean(
              pads[activePad]?.text.trim() || pads[activePad]?.name.trim(),
            )}
            onSelect={selectPersonality}
            onSelectPreset={selectPreset}
            onAddPreset={addPreset}
            onRemovePreset={removePreset}
            onPitch={setPitch}
            onSpeed={setSpeed}
            onPitchQuality={setPitchQuality}
            onVocalEffort={setVocalEffort}
            onVibrato={setVibrato}
            onVibratoRate={setVibratoRate}
            onScale={setScale}
            onLanguage={setLanguage}
            onClearActivePad={() => {
              setPads((prev) => {
                const next = [...prev]
                next[activePad] = emptyPad()
                return next
              })
              setText('')
            }}
          />
          </div>
        </main>
      </div>
    </div>
  )
}
