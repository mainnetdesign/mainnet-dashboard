'use client'
// Ported from magicui rainbow-button (shadcn registry). The registry version
// relies on --color-1..5 vars, @keyframes rainbow and animate-rainbow living in
// globals.css/tailwind config. This project keeps globals.css untouched, so we
// inject the vars + keyframes inline and reference them from the button.

import { cn } from '@/utils/cn'

const RAINBOW_CSS = `
@keyframes i2f-rainbow { 0% { background-position: 0% } 100% { background-position: 200% } }
.i2f-rainbow-btn {
  --color-1: hsl(0 100% 63%);
  --color-2: hsl(270 100% 63%);
  --color-3: hsl(210 100% 63%);
  --color-4: hsl(195 100% 63%);
  --color-5: hsl(90 100% 63%);
}
`

type Props = React.ButtonHTMLAttributes<HTMLButtonElement>

export default function RainbowButton({ className, children, ...props }: Props) {
  return (
    <>
      <style>{RAINBOW_CSS}</style>
      <button
        {...props}
        className={cn(
          'i2f-rainbow-btn group relative inline-flex shrink-0 cursor-pointer items-center justify-center gap-2',
          'h-9 rounded-lg px-4 py-2 text-label-sm font-medium whitespace-nowrap text-white outline-none',
          'transition-all [animation:i2f-rainbow_2.5s_infinite_linear] disabled:pointer-events-none disabled:opacity-50',
          // dark fill + rainbow border via layered background-clip
          'border-0 bg-[length:200%] [background-clip:padding-box,border-box,border-box] [background-origin:border-box] [border:0.125rem_solid_transparent]',
          'bg-[linear-gradient(#121213,#121213),linear-gradient(#121213_50%,rgba(18,18,19,0.6)_80%,rgba(18,18,19,0)),linear-gradient(90deg,var(--color-1),var(--color-5),var(--color-3),var(--color-4),var(--color-2))]',
          // glow underneath
          'before:absolute before:bottom-[-20%] before:left-1/2 before:z-0 before:h-1/5 before:w-3/5 before:-translate-x-1/2 before:[animation:i2f-rainbow_2.5s_infinite_linear] before:bg-[linear-gradient(90deg,var(--color-1),var(--color-5),var(--color-3),var(--color-4),var(--color-2))] before:bg-[length:200%] before:[filter:blur(0.75rem)]',
          className,
        )}
      >
        <span className="relative z-10 inline-flex items-center gap-2">{children}</span>
      </button>
    </>
  )
}
