---
name: nextjs-app-router
description: Next.js App Router patterns — Server Components by default, when to add "use client", data fetching, loading/error boundaries, Server Actions, route handlers, and common mistakes. Use when writing or reviewing Next.js App Router code.
---

# Next.js App Router Patterns

## Server vs Client — the decision tree

Default to Server Component. Add `"use client"` only when you need:
- Browser APIs (`window`, `localStorage`, `navigator`)
- Event listeners (`onClick`, `onChange`, `onSubmit`)
- React hooks (`useState`, `useEffect`, `useRef`, `useContext`)
- Third-party client-only libraries

`"use client"` is a boundary, not a label per component. Everything imported below a `"use client"` file becomes client-side too. Push the boundary as far down the tree as possible.

```tsx
// ✓ Server Component — fetches data, no interactivity
async function ProductPage({ params }: { params: { id: string } }) {
  const product = await getProduct(params.id)  // direct DB/API call
  return (
    <div>
      <ProductDetails product={product} />
      <AddToCartButton productId={product.id} />  {/* client island */}
    </div>
  )
}

// ✓ Isolated client island — only the interactive bit
"use client"
function AddToCartButton({ productId }: { productId: string }) {
  const [added, setAdded] = useState(false)
  return <button onClick={() => setAdded(true)}>...</button>
}
```

## Data Fetching

**Server Components — fetch directly:**
```tsx
async function UserProfile({ userId }: { userId: string }) {
  // Fetch in parallel
  const [user, posts] = await Promise.all([
    getUser(userId),
    getUserPosts(userId),
  ])
  return <Profile user={user} posts={posts} />
}
```

**Deduplication with `cache`:**
```tsx
import { cache } from 'react'

// Same request called multiple times in a render tree = one DB call
export const getUser = cache(async (id: string) => {
  return db.user.findUnique({ where: { id } })
})
```

**Client fetching — TanStack Query for server state:**
```tsx
"use client"
function LiveBalance() {
  const { data } = useWalletBalance()  // TanStack Query hook
  return <span>{data?.balance}</span>
}
```

Don't use `useEffect` + `fetch` for data fetching. That's pre-App Router thinking.

## Loading and Error Boundaries

```
app/
  dashboard/
    loading.tsx    ← Suspense fallback for the whole route
    error.tsx      ← Error boundary for the whole route
    page.tsx
```

```tsx
// loading.tsx — shown during async Server Component resolution
export default function Loading() {
  return <DashboardSkeleton />
}

// error.tsx — must be a Client Component
"use client"
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div>
      <p>{error.message}</p>
      <button onClick={reset}>Try again</button>
    </div>
  )
}
```

For granular loading states, wrap async components in `<Suspense>` directly:
```tsx
<Suspense fallback={<Skeleton />}>
  <SlowComponent />
</Suspense>
```

## Server Actions

For mutations that originate from the client but execute on the server:

```tsx
// actions/deposit.ts
"use server"

import { z } from 'zod'
import { revalidatePath } from 'next/cache'

const schema = z.object({ amount: z.number().positive() })

export async function depositAction(formData: FormData) {
  const parsed = schema.safeParse({ amount: Number(formData.get('amount')) })
  if (!parsed.success) return { error: parsed.error.flatten() }

  await processDeposit(parsed.data.amount)
  revalidatePath('/wallet')  // invalidate cached route
}
```

```tsx
// Use with RHF via action prop, or call directly
"use client"
function DepositForm() {
  const [state, dispatch] = useActionState(depositAction, null)
  return <form action={dispatch}>...</form>
}
```

Use `revalidatePath` or `revalidateTag` after mutations — not `router.refresh()` unless you need the full page.

## Route Handlers

```tsx
// app/api/webhooks/payment/route.ts
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  const body = await request.json()
  // process...
  return NextResponse.json({ received: true }, { status: 200 })
}
```

Route Handlers replace `pages/api/`. Don't mix both conventions. GET handlers are cached by default — add `export const dynamic = 'force-dynamic'` for real-time data.

## Metadata

```tsx
// Static
export const metadata: Metadata = {
  title: 'Dashboard',
  description: '...',
}

// Dynamic
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const product = await getProduct(params.id)
  return { title: product.name }
}
```

## Common Mistakes

- **Don't** `"use client"` at the top of every file — it defeats Server Components
- **Don't** pass non-serializable values (functions, class instances) from Server to Client Components as props
- **Don't** use `useRouter().refresh()` when `revalidatePath` in a Server Action is more precise
- **Don't** `fetch` in `useEffect` — use TanStack Query on the client, or a Server Component
- **Don't** put `async/await` in Client Components for initial data — fetch in a Server Component parent and pass as props
- **Don't** create a Route Handler just to call it from a Server Component — call the function directly
