---
name: tanstack-query-patterns
description: TanStack Query (v5) conventions for query keys, caching, invalidation, optimistic updates, and mutations. Use when writing or reviewing data fetching hooks, cache invalidation logic, or server state management.
---

# TanStack Query Patterns

## Query Key Conventions

Always use a factory function per domain — never inline string arrays.

```ts
// query-keys.ts — one file per domain
export const walletKeys = {
  all: ['wallet'] as const,
  detail: (userId: string) => [...walletKeys.all, userId] as const,
  balance: (userId: string) => [...walletKeys.detail(userId), 'balance'] as const,
}
```

This makes invalidation surgical and prevents key collisions across the codebase.

## Query Structure

```ts
export function useWalletBalance(userId: string) {
  return useQuery({
    queryKey: walletKeys.balance(userId),
    queryFn: () => fetchWalletBalance(userId),
    staleTime: 30_000,       // don't refetch if fresh within 30s
    gcTime: 5 * 60_000,      // keep in cache 5min after unmount (v5: gcTime, not cacheTime)
    enabled: Boolean(userId),
  })
}
```

- `staleTime` > 0 for data that doesn't change on every request
- `enabled` guards against firing with undefined/null params
- Never put `queryFn` inline in components — always in a dedicated hook

## Mutations + Invalidation

```ts
export function useDepositMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (amount: number) => postDeposit(amount),
    onSuccess: (_, _vars, _ctx) => {
      // Invalidate the whole wallet subtree — hits balance, history, etc.
      queryClient.invalidateQueries({ queryKey: walletKeys.all })
    },
    onError: (error) => {
      // Handle at the boundary — don't swallow
      toast.error(error.message)
    },
  })
}
```

Use `invalidateQueries` with the factory key to invalidate whole subtrees, not individual keys.

## Optimistic Updates

```ts
useMutation({
  mutationFn: updateUserProfile,
  onMutate: async (newProfile) => {
    await queryClient.cancelQueries({ queryKey: profileKeys.detail(userId) })
    const snapshot = queryClient.getQueryData(profileKeys.detail(userId))
    queryClient.setQueryData(profileKeys.detail(userId), (old) => ({ ...old, ...newProfile }))
    return { snapshot }
  },
  onError: (_err, _vars, ctx) => {
    queryClient.setQueryData(profileKeys.detail(userId), ctx?.snapshot)
  },
  onSettled: () => {
    queryClient.invalidateQueries({ queryKey: profileKeys.detail(userId) })
  },
})
```

Always restore from snapshot in `onError`. Always invalidate in `onSettled` (fires on both success and error).

## Prefetching

```ts
// In a server component or route loader
await queryClient.prefetchQuery({
  queryKey: walletKeys.balance(userId),
  queryFn: () => fetchWalletBalance(userId),
})
```

Pass the `queryClient` to `HydrationBoundary` to dehydrate into the client.

## Common Mistakes to Avoid

- **Don't** use `refetchOnMount: false` as a default — it breaks data freshness guarantees
- **Don't** derive query keys from unstable objects — serialize or use primitives only
- **Don't** call `invalidateQueries` inside `onMutate` — that defeats optimism
- **Don't** put `useQueryClient()` in utility functions — hooks only in components/hooks
- **Don't** use `data?.foo ?? []` as a fallback on every consumer — set `placeholderData` or `initialData` at the query level
