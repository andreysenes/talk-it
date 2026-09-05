import { PERSONALITIES, type Personality } from '../engine/personalities'
import { cn } from '../lib/utils'

export function PersonalityGrid({
  selectedId,
  onSelect,
}: {
  selectedId: Personality['id']
  onSelect: (p: Personality) => void
}) {
  return (
    <div>
      <h2 className="mb-2 font-display text-sm font-bold tracking-wide text-sky-950/80 uppercase">
        Personality
      </h2>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {PERSONALITIES.map((p) => {
          const selected = p.id === selectedId
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => onSelect(p)}
              className={cn(
                'talk-3d min-h-[52px] rounded-lg px-2 py-2 text-center text-[13px] leading-tight font-bold text-slate-800 sm:min-h-[58px] sm:text-sm',
                selected && 'ring-2 ring-sky-700 ring-offset-2 ring-offset-sky-100',
              )}
              style={{ background: p.color }}
              aria-pressed={selected}
            >
              {p.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}
