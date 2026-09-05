import { PERSONALITIES, type Personality } from '../engine/personalities'

function qualityLabel(q: Personality['pitchQuality']) {
  if (q === 'sung') return 'Sung'
  if (q === 'monotone') return 'Monotone'
  return 'Natural'
}

export function PersonalityGrid({
  selectedId,
  onSelect,
}: {
  selectedId: Personality['id']
  onSelect: (p: Personality) => void
}) {
  const selected = PERSONALITIES.find((p) => p.id === selectedId) ?? PERSONALITIES[0]

  return (
    <div>
      <label
        htmlFor="personality"
        className="mb-2 block text-[11px] font-medium tracking-[0.18em] text-neutral-500 uppercase"
      >
        Personality
      </label>
      <select
        id="personality"
        value={selected.id}
        onChange={(e) => {
          const next = PERSONALITIES.find((p) => p.id === e.target.value)
          if (next) onSelect(next)
        }}
        className="h-11 w-full rounded-sm border border-neutral-800 bg-black px-3 text-sm text-white outline-none focus:border-white"
      >
        {PERSONALITIES.map((p) => (
          <option key={p.id} value={p.id}>
            {p.label}
          </option>
        ))}
      </select>
      <p className="mt-2 text-sm leading-relaxed text-neutral-400">
        <span className="text-neutral-200">{selected.label}</span>
        {' — '}
        pitch {selected.pitch}, rate {selected.speed}
        {' · '}
        {qualityLabel(selected.pitchQuality)}
        {selected.vocalEffort !== 'normal'
          ? ` · ${selected.vocalEffort[0]!.toUpperCase()}${selected.vocalEffort.slice(1)}`
          : ''}
        .{' '}
        {selected.blurb}
      </p>
    </div>
  )
}
