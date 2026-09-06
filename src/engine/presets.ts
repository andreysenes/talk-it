import type {
  PersonalityId,
  PitchQuality,
  VocalEffort,
} from './personalities'

/** User-saved voice preset (current sliders + base personality formants). */
export type VoicePreset = {
  id: string
  label: string
  personalityId: PersonalityId
  pitch: number
  speed: number
  pitchQuality: PitchQuality
  vocalEffort: VocalEffort
  vibrato: number
  vibratoRate: number
  scale: number
}

export type VoicePresetDraft = Omit<VoicePreset, 'id' | 'label'> & {
  label?: string
}

const PRESET_ID_RE = /^custom-[a-z0-9]+$/i

export function isCustomPresetId(id: string): boolean {
  return PRESET_ID_RE.test(id)
}

export function createPresetId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return `custom-${crypto.randomUUID().slice(0, 8)}`
  }
  return `custom-${Date.now().toString(36)}`
}

export function normalizePresets(raw: unknown): VoicePreset[] {
  if (!Array.isArray(raw)) return []
  const out: VoicePreset[] = []
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue
    const p = item as Partial<VoicePreset>
    if (typeof p.id !== 'string' || !isCustomPresetId(p.id)) continue
    if (typeof p.label !== 'string' || !p.label.trim()) continue
    if (typeof p.personalityId !== 'string') continue
    if (typeof p.pitch !== 'number' || typeof p.speed !== 'number') continue
    out.push({
      id: p.id,
      label: p.label.trim().slice(0, 24),
      personalityId: p.personalityId as PersonalityId,
      pitch: p.pitch,
      speed: p.speed,
      pitchQuality:
        p.pitchQuality === 'monotone' || p.pitchQuality === 'sung'
          ? p.pitchQuality
          : 'natural',
      vocalEffort:
        p.vocalEffort === 'breathy' || p.vocalEffort === 'whispered'
          ? p.vocalEffort
          : 'normal',
      vibrato: typeof p.vibrato === 'number' ? p.vibrato : 0,
      vibratoRate: typeof p.vibratoRate === 'number' ? p.vibratoRate : 5,
      scale: typeof p.scale === 'number' ? p.scale : 1,
    })
  }
  return out
}

export function makeVoicePreset(draft: VoicePresetDraft): VoicePreset {
  const label = (draft.label?.trim() || 'My voice').slice(0, 24)
  return {
    id: createPresetId(),
    label,
    personalityId: draft.personalityId,
    pitch: draft.pitch,
    speed: draft.speed,
    pitchQuality: draft.pitchQuality,
    vocalEffort: draft.vocalEffort,
    vibrato: draft.vibrato,
    vibratoRate: draft.vibratoRate,
    scale: draft.scale,
  }
}
