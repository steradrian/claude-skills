---
name: debug-nextjs
description: Ephemeral debug logging for Next.js App Router — creates temporary API route + client logger, instruments components, captures logs, diagnoses issues, then deletes all traces. Use when debugging runtime behavior in Next.js client components. Activates on requests to debug, trace, or diagnose runtime issues in Next.js.
---

# Ephemeral Debug Session for Next.js App Router

You are performing a zero-footprint debug session. You will CREATE temporary files,
INSTRUMENT target components, CAPTURE runtime logs, DIAGNOSE the issue, and DESTROY
all traces. Nothing persists after the session.

## Team constraints

- NEVER modify `.gitignore`, `middleware.ts`, `next.config.js`, or any shared config
- NEVER modify shared utility files permanently
- ALL temporary files are created from scratch and deleted completely
- ALL injected code uses marker comments for reliable removal

## Session ID

Generate a random 8-character hex string at session start. Use it in all markers
and filenames for traceability. Example: `a7f3b2c1`

## Phase 1: CONSTRUCT

Create these files from scratch (adapt paths to project structure):

### 1a. API Route: `app/api/debug-session/route.ts`

IMPORTANT: Do NOT use underscore-prefixed folders (e.g. `_debug`) — Next.js App
Router treats these as private folders and excludes them from routing (404).

Create this file with the EXACT content below:

```typescript
// app/api/debug-session/route.ts
// @claude-ephemeral — entire file created and deleted by debug skill

import { appendFile } from 'node:fs/promises';
import { join } from 'node:path';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const LOG_PATH = join(process.cwd(), '.debug-session.log');

interface LogEntry {
  ts: string;
  level: string;
  msg: string;
  src?: string;
  component?: string;
  args?: string;
  err?: { type: string; message: string; stack?: string };
  seq?: number;
  url?: string;
  render_count?: number;
  [key: string]: unknown;
}

interface BatchPayload {
  entries: LogEntry[];
  session_id: string;
}

// Simple write queue to serialize concurrent appends
let writeQueue = Promise.resolve();
function safeAppend(path: string, data: string): Promise<void> {
  writeQueue = writeQueue.then(() => appendFile(path, data, 'utf-8')).catch(console.error);
  return writeQueue;
}

export async function POST(request: Request) {
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json(
      { error: 'Debug endpoint disabled outside development' },
      { status: 403 }
    );
  }

  let body: BatchPayload;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  if (!body.entries || !Array.isArray(body.entries)) {
    return NextResponse.json({ error: 'Expected { entries: LogEntry[] }' }, { status: 400 });
  }

  try {
    const lines = body.entries
      .map((entry) => JSON.stringify({ ...entry, _sid: body.session_id }))
      .join('\n') + '\n';

    await safeAppend(LOG_PATH, lines);
    return NextResponse.json({ ok: true, count: body.entries.length });
  } catch (error) {
    console.error('[debug-session] Write failed:', error);
    return NextResponse.json(
      { error: 'Write failed', detail: String(error) },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'Disabled' }, { status: 403 });
  }
  const { unlink } = await import('node:fs/promises');
  try {
    await unlink(LOG_PATH);
    return NextResponse.json({ ok: true, deleted: LOG_PATH });
  } catch {
    return NextResponse.json({ ok: true, message: 'Log file did not exist' });
  }
}
```

### 1b. Client Logger: `lib/_debug-logger.ts`

Create this file with the EXACT content below:

```typescript
// lib/_debug-logger.ts
// @claude-ephemeral — entire file created and deleted by debug skill
'use client';

// ============================================================
// TYPES
// ============================================================

type LogLevel = 'log' | 'warn' | 'error' | 'debug' | 'info';

interface LogEntry {
  ts: string;
  level: LogLevel;
  msg: string;
  args: string;
  src: string;
  seq: number;
  hash: number;
  url: string;
  component?: string;
  render_count?: number;
  err?: { type: string; message: string; stack?: string };
}

interface DebugLoggerConfig {
  endpoint: string;
  sessionId: string;
  methods?: LogLevel[];
  flushIntervalMs?: number;
  maxBatchSize?: number;
  dedupWindowMs?: number;
  preserveOriginal?: boolean;
  source?: string;
}

interface DebugLoggerHandle {
  flush: () => void;
  destroy: () => void;
  logEvent: (event: string, data?: Record<string, unknown>) => void;
}

// ============================================================
// HASHING (djb2 XOR variant)
// ============================================================

function djb2(str: string): number {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 33) ^ str.charCodeAt(i);
  }
  return hash >>> 0;
}

// ============================================================
// SAFE SERIALIZATION
// ============================================================

function safeSerialize(args: unknown[]): string {
  try {
    return JSON.stringify(args, (_key, value) => {
      if (value instanceof Error) {
        return { __error: true, type: value.name, message: value.message, stack: value.stack };
      }
      if (typeof value === 'function') return '[Function]';
      if (typeof value === 'symbol') return value.toString();
      if (typeof value === 'bigint') return value.toString() + 'n';
      if (typeof value === 'undefined') return '[undefined]';
      if (value instanceof HTMLElement) {
        return `[${value.tagName}${value.id ? '#' + value.id : ''}${value.className ? '.' + String(value.className).split(' ').join('.') : ''}]`;
      }
      return value;
    }).slice(0, 2048);
  } catch {
    return '[Unserializable]';
  }
}

function extractMessage(args: unknown[]): string {
  if (args.length === 0) return '';
  const first = args[0];
  if (typeof first === 'string') return first.slice(0, 500);
  if (first instanceof Error) return `${first.name}: ${first.message}`;
  try {
    return JSON.stringify(first).slice(0, 500);
  } catch {
    return String(first).slice(0, 500);
  }
}

function extractError(args: unknown[]): LogEntry['err'] | undefined {
  for (const arg of args) {
    if (arg instanceof Error) {
      const frames = arg.stack
        ?.split('\n')
        .filter((line) => !line.includes('node_modules'))
        .slice(0, 10)
        .join('\n');
      return { type: arg.name, message: arg.message, stack: frames };
    }
  }
  return undefined;
}

// ============================================================
// MAIN LOGGER
// ============================================================

export function initDebugLogger(config: DebugLoggerConfig): DebugLoggerHandle {
  const {
    endpoint,
    sessionId,
    methods = ['log', 'warn', 'error'],
    flushIntervalMs = 2000,
    maxBatchSize = 50,
    dedupWindowMs = 100,
    preserveOriginal = true,
    source = 'client',
  } = config;

  // State
  let buffer: LogEntry[] = [];
  let seq = 0;
  let destroyed = false;
  const recentHashes = new Map<number, number>(); // hash -> timestamp
  const originals: Partial<Record<LogLevel, (...args: unknown[]) => void>> = {};

  // ---- Dedup ----
  function isDuplicate(hash: number): boolean {
    const now = Date.now();
    const lastSeen = recentHashes.get(hash);
    if (lastSeen !== undefined && now - lastSeen < dedupWindowMs) {
      return true;
    }
    recentHashes.set(hash, now);
    // Periodic cleanup
    if (recentHashes.size > 500) {
      for (const [k, t] of recentHashes) {
        if (now - t > dedupWindowMs * 10) recentHashes.delete(k);
      }
    }
    return false;
  }

  // ---- Transport ----
  function send(entries: LogEntry[]): void {
    if (entries.length === 0) return;
    const payload = JSON.stringify({ entries, session_id: sessionId });

    // Prefer sendBeacon (survives page unload)
    if (typeof navigator?.sendBeacon === 'function') {
      const blob = new Blob([payload], { type: 'application/json' });
      const queued = navigator.sendBeacon(endpoint, blob);
      if (queued) return;
    }

    // Fallback: fetch with keepalive
    try {
      fetch(endpoint, {
        method: 'POST',
        body: payload,
        headers: { 'Content-Type': 'application/json' },
        keepalive: true,
      }).catch(() => {});
    } catch {
      // Silent fail — debug logging must never break the app
    }
  }

  // ---- Flush ----
  function flush(): void {
    if (buffer.length === 0) return;
    const batch = buffer.splice(0);
    send(batch);
  }

  // ---- Periodic flush timer ----
  const flushTimer = setInterval(flush, flushIntervalMs);

  // ---- Enqueue ----
  function enqueue(level: LogLevel, args: unknown[]): void {
    if (destroyed) return;

    const serialized = safeSerialize(args);
    const hashInput = level + ':' + serialized;
    const hash = djb2(hashInput);

    if (isDuplicate(hash)) return;

    const entry: LogEntry = {
      ts: new Date().toISOString(),
      level,
      msg: extractMessage(args),
      args: serialized,
      src: source,
      seq: seq++,
      hash,
      url: typeof window !== 'undefined' ? window.location.pathname : '',
      err: level === 'error' ? extractError(args) : undefined,
    };

    buffer.push(entry);
    if (buffer.length >= maxBatchSize) flush();
  }

  // ---- Patch console methods ----
  for (const method of methods) {
    originals[method] = console[method].bind(console);
    console[method] = function (...args: unknown[]): void {
      enqueue(method, args);
      if (preserveOriginal && originals[method]) {
        originals[method]!.apply(console, args);
      }
    };
  }

  // ---- Page lifecycle flush ----
  const onHidden = (): void => {
    if (document.visibilityState === 'hidden') flush();
  };
  const onPageHide = (): void => flush();

  document.addEventListener('visibilitychange', onHidden);
  window.addEventListener('pagehide', onPageHide);

  // ---- Custom event logger (for component instrumentation) ----
  function logEvent(event: string, data?: Record<string, unknown>): void {
    enqueue('info' as LogLevel, [`[EVENT] ${event}`, data]);
  }

  // ---- Destroy / full cleanup ----
  function destroy(): void {
    if (destroyed) return;
    destroyed = true;

    // Final flush
    flush();

    // Restore console methods
    for (const method of methods) {
      if (originals[method]) {
        console[method] = originals[method] as Console[typeof method];
      }
    }

    // Remove event listeners
    document.removeEventListener('visibilitychange', onHidden);
    window.removeEventListener('pagehide', onPageHide);

    // Clear timer
    clearInterval(flushTimer);

    // Clear state
    buffer.length = 0;
    recentHashes.clear();
  }

  return { flush, destroy, logEvent };
}
```

### 1c. Verify construction

```bash
ls -la app/api/debug-session/route.ts lib/_debug-logger.ts
```

## Phase 2: INSTRUMENT

Inject debug code into the target component(s). Always use these exact markers:

```
// @claude-debug-start session=<SESSION_ID>
// @claude-debug-end session=<SESSION_ID>
```

### For imports (at top of file):
```typescript
// @claude-debug-start session=<SESSION_ID>
import { initDebugLogger } from '@/lib/_debug-logger'; // eslint-disable-line
// @claude-debug-end session=<SESSION_ID>
```

### For initialization (inside component body):
```typescript
// @claude-debug-start session=<SESSION_ID>
const __debugRef = React.useRef<ReturnType<typeof initDebugLogger> | null>(null); // eslint-disable-line
React.useEffect(() => { // eslint-disable-line
  __debugRef.current = initDebugLogger({
    endpoint: '/api/debug-session',
    sessionId: '<SESSION_ID>',
    source: '<ComponentName>',
  });
  return () => __debugRef.current?.destroy();
}, []);
// @claude-debug-end session=<SESSION_ID>
```

### For specific value tracking:
```typescript
// @claude-debug-start session=<SESSION_ID>
console.log('[DEBUG]', '<description>', { variable1, variable2 }); // eslint-disable-line
// @claude-debug-end session=<SESSION_ID>
```

Rules:
- NEVER modify existing import lines — add new standalone imports
- NEVER restructure JSX — add logging calls, not wrapper components
- Always include `// eslint-disable-line` on injected lines
- Keep all injected code within marker boundaries
- Add `React.` prefix to hooks if React is imported as default

## Phase 3: REPRODUCE

Tell the user:
> "Debug instrumentation is active. Please reproduce the issue in your browser,
> then tell me when you're done. I'll read the captured logs."

Wait for user confirmation. Do not proceed until the user confirms they have
reproduced the issue.

## Phase 4: READ

Read and parse the log file:
```bash
cat .debug-session.log
```

If the file is large (>500 lines), use targeted analysis:
```bash
# Count entries by level
grep -c '"level":"error"' .debug-session.log
grep -c '"level":"warn"' .debug-session.log

# Show only errors
grep '"level":"error"' .debug-session.log

# Show entries from specific component
grep '"src":"ComponentName"' .debug-session.log

# Show chronological sequence
head -50 .debug-session.log
tail -50 .debug-session.log
```

## Phase 5: DIAGNOSE

Analyze the JSONL logs systematically:
1. **Timeline**: Order entries by `ts` — what is the sequence of events?
2. **Errors first**: What errors occurred? Check `err.type`, `err.message`, `err.stack`
3. **Unexpected values**: What values in `args` look wrong?
4. **Render patterns**: Are components re-rendering excessively? Check `seq` gaps
5. **Missing events**: What expected log entries are absent?

Form a hypothesis. If more data is needed, add targeted logging (goto Phase 2)
and ask the user to reproduce again.

## Phase 6: DESTRUCT

Execute cleanup in this exact order:

### 6a. Remove injected code from component files
```bash
# Find all files with debug markers
grep -rl "@claude-debug-start session=<SESSION_ID>" --include="*.ts" --include="*.tsx" .

# Remove marker-bounded blocks (cross-platform sed)
for file in $(grep -rl "@claude-debug-start" --include="*.ts" --include="*.tsx" .); do
  sed -i.bak '/@claude-debug-start/,/@claude-debug-end/d' "$file" && rm -f "${file}.bak"
done

# Remove single-line marked imports
for file in $(grep -rl "@claude-debug session=" --include="*.ts" --include="*.tsx" .); do
  sed -i.bak '/@claude-debug session=/d' "$file" && rm -f "${file}.bak"
done
```

### 6b. Delete temporary files
```bash
rm -f app/api/debug-session/route.ts
rmdir -p app/api/debug-session 2>/dev/null || true
rm -f lib/_debug-logger.ts
rm -f .debug-session.log
```

### 6c. Verify zero traces remain
```bash
# Check for any remaining markers
grep -r "@claude-debug" --include="*.ts" --include="*.tsx" --include="*.js" . && echo "MARKERS REMAIN" || echo "No markers"

# Check for orphaned files
ls app/api/debug-session/route.ts 2>/dev/null && echo "API route exists" || echo "API route gone"
ls lib/_debug-logger.ts 2>/dev/null && echo "Logger exists" || echo "Logger gone"
ls .debug-session.log 2>/dev/null && echo "Log file exists" || echo "Log file gone"

# Check git status
git diff --stat
git status --porcelain
```

### 6d. If verification fails
```bash
# Nuclear option: restore any modified tracked files
git checkout -- <file>
# Remove any untracked debug files
git clean -n  # dry run first
```

Only report the diagnosis and fix AFTER confirming cleanup is complete.

## JSONL log format reference

Each line in `.debug-session.log` is a JSON object:
```json
{"ts":"2026-03-25T14:23:45.123Z","level":"error","msg":"Cannot read property id","src":"UserProfile","seq":42,"hash":2847193,"url":"/dashboard","err":{"type":"TypeError","message":"Cannot read property 'id' of undefined","stack":"TypeError: ...\n    at UserProfile (src/components/UserProfile.tsx:23:5)"},"args":"[{\"userId\":null}]","_sid":"a7f3b2c1"}
```

Fields: `ts` (ISO 8601), `level` (log|warn|error|debug|info), `msg` (first arg as string),
`src` (component/module name), `seq` (monotonic counter), `hash` (dedup hash),
`url` (page pathname), `err` (structured error if level=error), `args` (serialized
arguments), `_sid` (session ID).
