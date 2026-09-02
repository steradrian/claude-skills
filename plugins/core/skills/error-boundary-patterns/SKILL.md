---
name: error-boundary-patterns
description: Error boundary placement strategy, React ErrorBoundary implementation, Next.js error.tsx conventions, cascading boundaries, recovery patterns, and error reporting integration. Use when designing error handling architecture or implementing error boundaries.
---

# Error Boundary Patterns

## Placement Strategy — Three Levels

### Level 1: Page boundary (always)
Catches any unhandled error in the entire route. Prevents a white screen.

```
app/
  dashboard/
    error.tsx      ← catches everything in /dashboard
    page.tsx
```

```tsx
// error.tsx — must be a Client Component
"use client"

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Report to error tracking (Sentry, etc.)
    reportError(error)
  }, [error])

  return (
    <div className="flex flex-col items-center justify-center gap-4 py-20">
      <h2 className="text-lg font-semibold">Something went wrong</h2>
      <p className="text-muted-foreground text-sm">
        {error.message || "An unexpected error occurred."}
      </p>
      <Button onClick={reset}>Try again</Button>
    </div>
  )
}
```

### Level 2: Feature boundary (for independent features)
Isolates failures so one broken feature doesn't take down the whole page.

```tsx
// A dashboard with multiple independent widgets
<div className="grid grid-cols-2 gap-4">
  <ErrorBoundary fallback={<WidgetError name="Revenue" />}>
    <Suspense fallback={<WidgetSkeleton />}>
      <RevenueWidget />
    </Suspense>
  </ErrorBoundary>

  <ErrorBoundary fallback={<WidgetError name="Users" />}>
    <Suspense fallback={<WidgetSkeleton />}>
      <UsersWidget />
    </Suspense>
  </ErrorBoundary>
</div>
```

Use feature boundaries when:
- Multiple independent data sources on one page
- A feature failure shouldn't block the rest of the page
- You want granular retry behavior per section

### Level 3: Component boundary (rare — only for risky components)
For third-party widgets, user-generated content renderers, or components with known instability.

```tsx
<ErrorBoundary fallback={<div className="h-64 bg-muted rounded-lg" />}>
  <ThirdPartyMapEmbed />
</ErrorBoundary>
```

## React ErrorBoundary Implementation

```tsx
"use client"

import { Component, type ErrorInfo, type ReactNode } from "react"

type Props = {
  children: ReactNode
  fallback: ReactNode | ((error: Error, reset: () => void) => ReactNode)
  onError?: (error: Error, info: ErrorInfo) => void
}

type State = {
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    this.props.onError?.(error, info)
  }

  reset = () => {
    this.setState({ error: null })
  }

  render() {
    if (this.state.error) {
      const { fallback } = this.props
      if (typeof fallback === "function") {
        return fallback(this.state.error, this.reset)
      }
      return fallback
    }
    return this.props.children
  }
}
```

Or use `react-error-boundary` package if it's already in the project — don't add a new dependency for this alone.

## Next.js Error Conventions

| File | Catches | Notes |
|---|---|---|
| `error.tsx` | Runtime errors in the route segment | Must be `"use client"`. Receives `error` and `reset` props. |
| `global-error.tsx` | Errors in root layout | Replaces the entire HTML shell. Must include `<html>` and `<body>`. |
| `not-found.tsx` | `notFound()` calls | Can be Server Component. |

```tsx
// app/global-error.tsx — last resort
"use client"

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html>
      <body>
        <h2>Something went wrong</h2>
        <button onClick={reset}>Try again</button>
      </body>
    </html>
  )
}
```

## Cascading Strategy

```
app/
  layout.tsx         ← no error.tsx here → global-error.tsx catches
  error.tsx          ← optional: catches errors from nested layouts
  dashboard/
    layout.tsx
    error.tsx        ← catches errors in dashboard pages
    analytics/
      error.tsx      ← catches errors only in analytics
      page.tsx
    settings/
      page.tsx       ← errors bubble up to dashboard/error.tsx
```

Error boundaries DON'T catch errors in the same segment's layout. `dashboard/error.tsx` catches errors in `dashboard/page.tsx` and child routes, but NOT in `dashboard/layout.tsx`. For layout errors, the parent's error boundary catches them.

## Recovery Patterns

### Reset with key (force remount)
```tsx
const [errorKey, setErrorKey] = useState(0)

<ErrorBoundary key={errorKey} fallback={
  <Button onClick={() => setErrorKey(k => k + 1)}>Retry</Button>
}>
  <FailableComponent />
</ErrorBoundary>
```

### Reset with data refetch
```tsx
// Next.js error.tsx — reset() re-renders the segment
<Button onClick={() => {
  queryClient.invalidateQueries()  // clear stale data
  reset()                          // re-render the route
}}>
  Try again
</Button>
```

### Graceful degradation
```tsx
<ErrorBoundary fallback={<StaticFallbackContent />}>
  <DynamicContent />
</ErrorBoundary>
```

Show cached/static content when the dynamic version fails. Better than showing an error state for non-critical content.

## Error Reporting Integration

```tsx
componentDidCatch(error: Error, info: ErrorInfo) {
  // Sentry
  Sentry.captureException(error, { extra: { componentStack: info.componentStack } })

  // Or generic
  reportError({
    message: error.message,
    stack: error.stack,
    componentStack: info.componentStack,
    url: window.location.href,
    timestamp: new Date().toISOString(),
  })
}
```

## Common Mistakes

- **Don't** catch errors you can handle with conditional rendering — error boundaries are for unexpected failures
- **Don't** put error boundaries around every single component — only around independent feature areas
- **Don't** show technical error messages to users — show helpful text with a retry action
- **Don't** forget to report errors to your tracking service — silent failures are worse than crashes
- **Don't** skip `global-error.tsx` — without it, root layout errors show a white screen
- **Don't** try to catch async errors (promises, event handlers) with error boundaries — they only catch render/lifecycle errors. Use try/catch for async code.
