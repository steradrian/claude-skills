---
name: tailwind-conventions
description: Tailwind CSS conventions for component variants with cva/cn, dark mode, responsive patterns, and common anti-patterns. Use when writing or reviewing Tailwind-styled components.
---

# Tailwind Conventions

## `cn` utility — always use it

```ts
// lib/utils.ts
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
```

`cn` solves two problems: conditional classes (`clsx`) and conflicting Tailwind classes (`twMerge`). Never concatenate class strings manually — `twMerge` ensures `p-4 p-2` resolves to `p-2`, not both.

## Component variants with `cva`

```tsx
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const buttonVariants = cva(
  // Base styles — always applied
  'inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground hover:bg-primary/90',
        destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
        outline: 'border border-input bg-background hover:bg-accent',
        ghost: 'hover:bg-accent hover:text-accent-foreground',
      },
      size: {
        sm: 'h-8 px-3 text-xs',
        md: 'h-9 px-4',
        lg: 'h-11 px-6',
        icon: 'h-9 w-9',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'md',
    },
  }
)

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }

function Button({ className, variant, size, ...props }: ButtonProps) {
  return (
    <button className={cn(buttonVariants({ variant, size }), className)} {...props} />
  )
}
```

Use `cva` for any component with more than 2 visual states. Boolean props like `isLarge` or `isPrimary` are the anti-pattern — use variants instead.

## Dark mode

Use CSS variables via Shadcn's convention — not `dark:` prefixes on every class:

```css
/* globals.css */
:root {
  --background: 0 0% 100%;
  --foreground: 222.2 84% 4.9%;
  --primary: 222.2 47.4% 11.2%;
}

.dark {
  --background: 222.2 84% 4.9%;
  --foreground: 210 40% 98%;
  --primary: 210 40% 98%;
}
```

```tsx
// Use semantic tokens, not raw colors
<div className="bg-background text-foreground">
<button className="bg-primary text-primary-foreground">
```

When you need a one-off dark variant: `dark:bg-slate-800`. But semantic tokens first — they switch automatically.

## Responsive patterns

Mobile-first. No prefix = mobile. `sm:`, `md:`, `lg:`, `xl:` add breakpoints upward.

```tsx
// Layout
<div className="flex flex-col gap-4 md:flex-row md:gap-6">

// Typography
<h1 className="text-2xl font-bold md:text-3xl lg:text-4xl">

// Grid
<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">

// Show/hide
<nav className="hidden md:flex">
<Sheet className="md:hidden">  {/* mobile drawer */}
```

## Arbitrary values — when to use them

Only for values that can't be achieved with the scale: exact pixel measurements from a design spec, CSS variables, or one-off calculations.

```tsx
// Fine — specific design requirement
<div className="h-[72px] w-[320px]">

// Fine — CSS variable
<div className="bg-[var(--brand-accent)]">

// Not fine — use scale value instead (p-4 = 16px)
<div className="p-[16px]">
```

If you use the same arbitrary value more than once, add it to `tailwind.config.ts` instead.

## Animation

Prefer Tailwind's built-in animation classes for simple states:
```tsx
<div className="transition-all duration-200 ease-out">
<button className="hover:scale-105 active:scale-95 transition-transform">
<div className="animate-fade-in">  // from tailwindcss-animate plugin
```

Use Framer Motion for anything that needs sequencing, spring physics, or shared layout animations. Don't mix both on the same element.

## Common Mistakes

- **Don't** use `style={{ }}` for values available as Tailwind classes
- **Don't** write `dark:` prefixes on every class — use CSS variables via semantic tokens
- **Don't** use `!important` modifiers (`!p-4`) unless overriding a third-party component you can't control
- **Don't** add `className` to every nested element in a component — style at the root, children inherit
- **Don't** put responsive classes in a JS variable — Tailwind's JIT scanner needs to see full class names in source
- **Don't** conditionally build class name strings with template literals: `` `text-${color}-500` `` — JIT won't detect these; use a lookup object instead

```tsx
// Bad — JIT can't see 'text-red-500' or 'text-green-500'
className={`text-${status}-500`}

// Good
const statusColor = { error: 'text-red-500', success: 'text-green-500' }
className={statusColor[status]}
```
