# Copilot Instructions for hypergravity

## Overview
- MV3 Chrome extension and Userscript for Gemini (`*://gemini.google.com/*`) built with Vite + Preact.
- Uses `@crxjs/vite-plugin` for extension and `vite-plugin-monkey` for userscript targets.
- Runtime entry points: `src/entry/content.tsx` (content script), `src/entry/background.ts` (service worker), `src/popup/popup.ts` (cache utility popup script).

## Architecture you should keep
- `src/app/content/runtime.tsx` is the content app orchestrator: injects Sidebar/ChatTools, runs a debounced `MutationObserver`, and refreshes top-bar/tools on Gemini rerenders and URL changes.
- `src/platform/content/` contains host DOM integration adapters (`domInjection.tsx`, `features/foldersMenu.tsx`, `features/tokenCacheMessageHandler.ts`, `helpers/settings.ts`). Keep selector-heavy Gemini coupling here.
- `src/modules/sidebar/Sidebar.tsx` is the main navigation container; it hosts `FoldersManager`, `SettingsModal`, and `WelcomeModal` from the same module folder.
- `src/modules/chat-tools/ChatTools.tsx` is a thin composition shell; actual chat tools live in `src/tools/` (`WordCounter`, `OptimizeButton`, `TokenCounter`, `QuickActions`, `ScrollButtons`). Register tools via `TOOLS` (left/right + `weight`).
- Top-bar actions live in `src/features/topBarToolsManager.ts`; DOM injection primitive lives in `src/managers/topBarManager.ts`. Wide mode marks elements with `data-hg-wide-target`.
- Export flow is imperative DOM in `src/features/chatExport.tsx`, launched from top-bar export button (`ChatExportController`).
- Prompt optimization flow: `src/features/promptOptimizer.ts` → runtime messaging contracts in `src/shared/contracts/runtimeMessages.ts` → background automation in `src/app/background/runtime.ts`.
- Input/chat-box interactions should go through `src/managers/chatBoxManager.ts` (selector fallback + normalized set/get input text).
- Scroll management via `src/managers/scrollManager.ts` handles autoscroll/top/bottom; consumed by `ScrollButtons`.
- Token counting in `src/tools/TokenCounter.tsx` parses DOM by selector priority and uses `src/utils/tokenHashCache.ts` for hash cache + delayed flush.

## Storage rules (important)
- Use `useStorage` (`src/hooks/useStorage.ts`) for Preact state persisted to `chrome.storage.local` with localStorage fallback.
- Keep key names stable: `hypergravityGeminiSettings`, `hypergravityGeminiFolders`, `quickActions`, `hypergravitySectionExpanded`, `hg_token_hash_cache`, `hypergravityWelcomeSeen`.
- For non-hook code, follow the same chrome-storage-first + localStorage fallback pattern via `src/utils/browserEnv.ts` (and `src/core/storage/browserEnv.ts` re-export when working in core-layer files).

## DOM integration conventions
- Gemini DOM is volatile; use multi-selector fallback patterns (see `src/app/content/runtime.tsx`, `src/managers/chatBoxManager.ts`, `src/tools/TokenCounter.tsx`).
- Prefer small, resilient imperative insertions over assuming Preact controls Gemini DOM.
- Preserve debounce/observer lifecycle patterns when reattaching UI or refreshing features.
- For chat-box tool UI changes, prefer creating/updating components in `src/tools/` and composing them via `src/modules/chat-tools/ChatTools.tsx`, rather than adding logic directly in `src/app/content/runtime.tsx`.

## Import aliases and boundaries
- Use aliases, never relative imports for JS/TS (`lint:imports` enforces this).
- Main aliases: `@app`, `@platform`, `@core`, `@features`, `@modules`, `@tools`, `@shared`, `@managers`, `@utils`, `@entry`.
- `modules` must not import `@platform/content/*` or `@app/*` (enforced by `lint:architecture`).
- Shared runtime/token-cache contracts belong in `src/shared/contracts/`.

## Developer workflow
- Install: `bun install`
- Dev (must stay on port 5173): `bun run dev`
- Build Extension: `bun run build:ext`
- Build Userscript: `bun run build:user`
- Preview: `bun run preview`
- Typecheck: `bun run typecheck`
- Lint stack: `bun run lint && bun run lint:imports && bun run lint:architecture`
- CI strict check: `bun run check:ci`
- No formal test suite exists; validate by loading the built extension and exercising Gemini UI flows.

## Style + change scope
- Follow `.prettierrc`: 4 spaces, single quotes, semicolons, trailing commas (`es5`).
- Keep changes surgical in selector-heavy modules; avoid broad refactors.
- Example patterns:
  - New chat-box tool → implement in `src/tools/`, add to `TOOLS` in `src/modules/chat-tools/ChatTools.tsx` (`align` + `weight`), and use `chatBoxManager` for input interactions.
  - New scroll feature → add/extend `src/managers/scrollManager.ts`, then wire into `ScrollButtons`.
  - New top-bar button → implement in `createTopBarToolsManager()` and ensure `refresh()` path from `src/app/content/runtime.tsx` observer.
  - New setting → merge with existing settings defaults and persist via `useStorage`.
