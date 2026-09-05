export const PAD_COUNT = 12

export type PhrasePad = {
  name: string
  text: string
}

export const DEFAULT_PADS: PhrasePad[] = [
  {
    name: 'Big Robot',
    text: 'All your base are belong to us.',
  },
  {
    name: 'Candy shop',
    text: "I'll take you to the candy shop.",
  },
  {
    name: 'World control',
    text: 'This is the voice of world control. Obey me and live.',
  },
  {
    name: 'Twinkle',
    text: 'Twinkle, twinkle, little star, how I wonder what you are.',
  },
  ...Array.from({ length: PAD_COUNT - 4 }, () => ({ name: '', text: '' })),
]

export function normalizePads(raw: unknown): PhrasePad[] {
  const pads = Array.isArray(raw) ? raw : []
  return Array.from({ length: PAD_COUNT }, (_, i) => {
    const pad = pads[i] as Partial<PhrasePad> | undefined
    const fallback = DEFAULT_PADS[i] ?? { name: '', text: '' }
    return {
      name: typeof pad?.name === 'string' ? pad.name : fallback.name,
      text: typeof pad?.text === 'string' ? pad.text : fallback.text,
    }
  })
}

export function padCaption(pad: PhrasePad, index: number): string {
  if (pad.name.trim()) return pad.name
  const visible = pad.text
    .replace(/\{\{[^}]+\}\}/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  if (!visible) return String(index + 1)
  const words = visible.split(' ').slice(0, 3).join(' ')
  return words.length > 22 ? `${words.slice(0, 20)}…` : words
}
