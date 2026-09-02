---
name: rhf-zod-patterns
description: React Hook Form + Zod integration patterns for form schemas, field registration, validation timing, error display, and async submission. Use when building or reviewing forms.
---

# RHF + Zod Patterns

## Schema First

Define the Zod schema first, derive the TypeScript type from it — never the reverse.

```ts
const depositSchema = z.object({
  amount: z.number({ invalid_type_error: 'Enter a number' })
    .positive('Must be greater than 0')
    .max(10_000, 'Max deposit is $10,000'),
  method: z.enum(['card', 'crypto', 'bank']),
  saveMethod: z.boolean().default(false),
})

type DepositFormValues = z.infer<typeof depositSchema>
```

## Form Setup

```ts
const form = useForm<DepositFormValues>({
  resolver: zodResolver(depositSchema),
  defaultValues: {
    amount: undefined,  // undefined shows placeholder; 0 does not
    method: 'card',
    saveMethod: false,
  },
  mode: 'onBlur',   // validate on blur, not on every keystroke
})
```

- `mode: 'onBlur'` is the right default for most forms. Use `'onChange'` only for fields with tight real-time feedback (e.g. password strength).
- `'onSubmit'` mode hides errors too long — users submit blank forms and get a wall of red.

## Field Registration

Prefer `Controller` for custom/UI library inputs (Radix, Shadcn), use `register` for native HTML inputs.

```tsx
// Native input
<input {...form.register('amount', { valueAsNumber: true })} />

// Custom input via Controller
<Controller
  control={form.control}
  name="method"
  render={({ field }) => (
    <Select value={field.value} onValueChange={field.onChange}>
      ...
    </Select>
  )}
/>
```

`valueAsNumber` on numeric fields prevents Zod from receiving a string and throwing `invalid_type_error`.

## Error Display

```tsx
const { errors } = form.formState

// Inline
{errors.amount && (
  <p className="text-sm text-destructive">{errors.amount.message}</p>
)}

// Or use a FormMessage component pattern (Shadcn style)
<FormField
  control={form.control}
  name="amount"
  render={({ field }) => (
    <FormItem>
      <FormLabel>Amount</FormLabel>
      <FormControl><Input {...field} type="number" /></FormControl>
      <FormMessage />  {/* auto-pulls from formState.errors */}
    </FormItem>
  )}
/>
```

## Async Submission

```ts
const onSubmit = form.handleSubmit(async (values) => {
  try {
    await depositMutation.mutateAsync(values)
    form.reset()
  } catch (error) {
    // Set a root-level error for API/server errors
    form.setError('root.serverError', {
      message: error instanceof Error ? error.message : 'Something went wrong',
    })
  }
})
```

```tsx
{form.formState.errors.root?.serverError && (
  <Alert variant="destructive">{form.formState.errors.root.serverError.message}</Alert>
)}
```

Use `form.setError('root.serverError', ...)` for server-side validation failures — don't toast from inside the form.

## Conditional Fields

```ts
const method = form.watch('method')

// Only validate card number when method is 'card'
const schema = z.object({
  method: z.enum(['card', 'crypto']),
  cardNumber: z.string().optional(),
}).refine(
  (data) => data.method !== 'card' || (data.cardNumber && data.cardNumber.length === 16),
  { message: 'Card number required', path: ['cardNumber'] }
)
```

Use `.refine()` or `.superRefine()` for cross-field validation — not custom validate functions on individual fields.

## Common Mistakes

- **Don't** call `form.trigger()` manually on every change — `mode` handles this
- **Don't** use uncontrolled `defaultValue` on Controller — always use `defaultValues` in `useForm`
- **Don't** read `form.formState.errors` outside of `render` — it's a reactive proxy
- **Don't** forget `valueAsNumber`/`valueAsDate` on numeric/date inputs — Zod receives strings otherwise
- **Don't** put `zodResolver` in a dependency array — it's stable
