# Hypergravity

Hypergravity is a Vite + Preact MV3 Chrome extension (and userscript target) for Gemini at `https://gemini.google.com/*`.

## Development

Install dependencies:

```bash
bun install
```

Run dev server (fixed port 5173):

```bash
bun run dev
```

## Builds

Standard builds:

```bash
bun run build:ext
bun run build:user
```

Release builds (debug instrumentation stripped):

```bash
bun run build:ext:release
bun run build:user:release
bun run build:release
```

## Architecture Map

- `src/entry/*`: runtime entrypoints (`content`, `background`, popup bootstrap).
- `src/app/*`: orchestration/runtime flow (content runtime + host-level app wiring).
- `src/platform/content/*`: Gemini DOM integration adapters and selector-heavy host coupling.
- `src/modules/*`: composed UI containers (`sidebar`, `chat-tools`).
- `src/features/*`: feature logic (export, top-bar tools, prompt optimizer, memories).
- `src/tools/*`: atomic chat tool widgets used by `modules/chat-tools`.
- `src/core/*`: cross-cutting infrastructure (`dom`, `storage`, `messaging`, `styles`).
- `src/shared/*`: shared contracts/types/ui utilities reused across layers.
- `src/managers/*` and `src/utils/*`: legacy/core helpers currently used by multiple features.

Alias conventions (TypeScript/Vite):

- `@app`, `@platform`, `@core`, `@entry`, `@features`, `@modules`, `@tools`, `@shared`, `@managers`, `@utils`.
- JS/TS imports should use aliases (relative imports only allowed for stylesheets).

## Debug Instrumentation

Selector/debug logging is controlled by `localStorage.hg_debug`.

Examples:

```js
localStorage.setItem('hg_debug', '1');          // enable all debug logs
localStorage.setItem('hg_debug', 'selectors');  // selector match logs only
localStorage.removeItem('hg_debug');            // disable
```

Notes:

- Debug logs are available in normal builds.

- Release builds disable debug paths at compile time via `__HG_DEBUG_BUILD__ = false`, so debug helpers become no-ops and bundle output is smaller.

## Validation

Type check:

```bash
bun run typecheck
```

Lint:

```bash
bun run lint
bun run lint:imports
bun run lint:architecture
```

CI-strict validation:

```bash
bun run check:ci
```
