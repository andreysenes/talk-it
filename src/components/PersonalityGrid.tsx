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
      <h2 className="mb-2 text-[11px] font-medium tracking-[0.18em] text-neutral-500 uppercase">
        Personality
      </h2>
      <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
        {PERSONALITIES.map((p) => {
          const selected = p.id === selectedId
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => onSelect(p)}
              className={cn(
                'min-h-[48px] rounded-sm border px-2 py-2 text-center text-[13px] leading-tight font-medium transition-colors sm:min-h-[52px] sm:text-sm',
                selected
                  ? 'border-white bg-white text-black'
                  : 'border-neutral-800 bg-transparent text-neutral-300 hover:border-neutral-500 hover:text-white',
              )}
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
