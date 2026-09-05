import { cva, type VariantProps } from 'class-variance-authority'
import * as React from 'react'
import { cn } from '../../lib/utils'

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-sm text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white disabled:pointer-events-none disabled:opacity-40',
  {
    variants: {
      variant: {
        default: 'bg-white text-black hover:bg-neutral-200',
        outline:
          'border border-neutral-600 bg-transparent text-neutral-200 hover:border-white hover:bg-white hover:text-black',
        ghost: 'text-neutral-400 hover:bg-neutral-900 hover:text-white',
        talk: 'bg-white text-black hover:bg-neutral-200',
        stop: 'border border-neutral-600 bg-transparent text-neutral-200 hover:border-white hover:text-white',
        export:
          'border border-neutral-600 bg-transparent text-neutral-200 hover:border-white hover:text-white',
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-8 px-3 text-xs',
        lg: 'h-11 px-5 text-sm',
        icon: 'size-8',
        iconLg: 'size-11 shrink-0',
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
