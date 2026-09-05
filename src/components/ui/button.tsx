import { cva, type VariantProps } from 'class-variance-authority'
import * as React from 'react'
import { cn } from '../../lib/utils'

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default:
          'bg-sky-600 text-white shadow-sm hover:bg-sky-700 active:translate-y-px',
        outline:
          'border-2 border-slate-800/20 bg-white text-slate-800 hover:bg-sky-50',
        ghost: 'text-slate-700 hover:bg-white/60',
        talk: 'talk-3d bg-[#3cb371] text-white hover:bg-[#34a066]',
        stop: 'talk-3d bg-[#e85d5d] text-white hover:bg-[#d64c4c]',
        export: 'talk-3d bg-[#5b8def] text-white hover:bg-[#4a7de0]',
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-8 px-3 text-xs',
        lg: 'h-12 px-6 text-base',
        icon: 'size-8',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
)

export function Button({
  className,
  variant,
  size,
  ...props
}: React.ComponentProps<'button'> & VariantProps<typeof buttonVariants>) {
  return (
    <button
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  )
}
