---
name: framer-motion-patterns
description: Framer Motion animation patterns for page transitions, list animations, layout animations, and performance-safe motion. Use when adding animations, transitions, or micro-interactions.
---

# Framer Motion Patterns

## Core Primitives

```tsx
// Entry/exit with AnimatePresence
<AnimatePresence mode="wait">
  {isVisible && (
    <motion.div
      key="modal"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
    />
  )}
</AnimatePresence>
```

`key` is required on direct children of `AnimatePresence` — without it, exit animations don't fire.

`mode="wait"` — waits for exit to finish before entering. Use for page transitions.
`mode="popLayout"` — removes exiting element from flow immediately. Use for list removals.

## Layout Animations

```tsx
// Animates size/position changes automatically
<motion.div layout>
  {expanded && <Details />}
</motion.div>

// Shared element transition
<motion.img layoutId="product-thumbnail" src={src} />
// In another route/component:
<motion.img layoutId="product-thumbnail" src={src} />
```

`layout` prop handles height/width transitions without JS-driven values — prefer over animating `height` directly.
`layoutId` creates shared element transitions between unmount/mount cycles (e.g. card → modal expand).

## Variants (for coordinated animations)

```tsx
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.05, delayChildren: 0.1 },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0 },
}

<motion.ul variants={containerVariants} initial="hidden" animate="visible">
  {items.map((item) => (
    <motion.li key={item.id} variants={itemVariants}>
      {item.label}
    </motion.li>
  ))}
</motion.ul>
```

Children inherit `initial`/`animate` from parent when using variants — don't repeat them on each child.

## useMotionValue + useTransform (scroll/drag)

```tsx
const { scrollYProgress } = useScroll({ target: containerRef })
const opacity = useTransform(scrollYProgress, [0, 0.3], [0, 1])
const scale = useTransform(scrollYProgress, [0, 0.5], [0.95, 1])

<motion.div style={{ opacity, scale }}>
```

`useMotionValue` + `useTransform` run outside React render — no re-renders on scroll. Always prefer over `useState` for animation-driven values.

## Performance Rules

**Only animate transform and opacity.** These are GPU-composited and don't trigger layout.

```tsx
// Good — GPU composited
animate={{ x: 0, opacity: 1, scale: 1, rotate: 0 }}

// Bad — triggers layout recalc
animate={{ width: '100%', height: 'auto', top: 0, left: 0 }}
```

Exception: `layout` prop handles position/size via FLIP technique — safe to use for layout-affecting changes.

**Use `will-change` sparingly:**
```tsx
<motion.div style={{ willChange: 'transform' }}>
```
Only add this to elements that animate frequently (e.g. carousels, drawers). Don't apply globally.

## Gesture Animations

```tsx
<motion.button
  whileHover={{ scale: 1.03 }}
  whileTap={{ scale: 0.97 }}
  transition={{ type: 'spring', stiffness: 400, damping: 17 }}
>
```

Spring physics for tap/hover feels more natural than easing. `stiffness: 400, damping: 17` is a good snappy default.

## Reduced Motion

Always respect the user's motion preference:

```tsx
import { useReducedMotion } from 'framer-motion'

function AnimatedCard() {
  const shouldReduce = useReducedMotion()

  return (
    <motion.div
      initial={{ opacity: 0, y: shouldReduce ? 0 : 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: shouldReduce ? 0 : 0.2 }}
    />
  )
}
```

Or configure globally via `MotionConfig`:
```tsx
<MotionConfig reducedMotion="user">
  <App />
</MotionConfig>
```

## Common Mistakes

- **Don't** wrap every element in `motion.div` — only animate what needs animation
- **Don't** animate `height: 'auto'` directly — use `layout` prop instead
- **Don't** forget `key` on `AnimatePresence` children
- **Don't** use `animate` with `useState` for scroll-driven values — use `useMotionValue`
- **Don't** import the full library if using just a few features — use named imports
