# Copilot Instructions for hypergravity

## Overview
- MV3 Chrome extension for Gemini (`*://gemini.google.com/*`) built with Vite + React + CRX plugin.
- Runtime entry points: `src/content.jsx` (content script), `src/background.js` (service worker), `src/popup/popup.js` (cache utility popup).

## Architecture you should keep
- `src/content.jsx` is the orchestrator: injects `Sidebar`/`ChatTools`, runs a debounced `MutationObserver`, and refreshes top-bar tools on Gemini rerenders/URL changes.
- `src/ChatTools.jsx` is now a thin composition shell; actual chat tools live in `src/tools/` (`WordCounter`, `OptimizeButton`, `TokenCounter`, `QuickActions`).
- Top-bar actions live in `src/features/topBarToolsManager.js` (wide mode + export); wide layout marks elements with `data-hg-wide-target`.
- Export flow is imperative DOM in `src/features/chatExport.js` (copy/txt/pdf/docx/print), launched from top-bar export button.
- Prompt optimization is split: UI trigger in `src/features/promptOptimizer.js` → `chrome.runtime.sendMessage` (`OPTIMIZE_PROMPT`, `CANCEL_OPTIMIZATION`) → hidden-tab automation in `src/background.js`.
- Input/chat-box interactions should go through `src/managers/chatBoxManager.js` (selector fallback + normalized set/get input text).
- Token counting in `src/tools/TokenCounter.jsx` parses DOM by selector priority and uses `src/utils/tokenHashCache.js` for hashed cache + delayed flush.

## Storage rules (important)
- Use `useChromeStorage` (`src/hooks/useChromeStorage.js`) for React state persisted to `chrome.storage.local` with localStorage fallback.
- Keep key names stable: `hypergravityGeminiSettings`, `hypergravityGeminiFolders`, `quickActions`, `hypergravitySectionExpanded`, `hg_token_hash_cache`.
- For non-hook code, follow the same chrome-storage-first + localStorage fallback pattern from `src/utils/storage.js`.

## DOM integration conventions
- Gemini DOM is volatile; use multi-selector fallback patterns (see `content.jsx`, `chatBoxManager.js`, `src/tools/TokenCounter.jsx`).
- Prefer small, resilient imperative insertions over assuming React controls Gemini DOM.
- Preserve debounce/observer lifecycle patterns when reattaching UI or refreshing features.
- For chat-box tool UI changes, prefer creating/updating components in `src/tools/` and composing them via `ChatTools`, rather than adding logic directly in `content.jsx`.

## Developer workflow
- Install: `npm install`
- Dev (must stay on port 5173): `npm run dev`
- Build: `npm run build`
- Preview: `npm run preview`
- No formal test suite exists; validate by loading the built extension and exercising Gemini UI flows.

## Style + change scope
- Follow `.prettierrc`: 4 spaces, single quotes, semicolons, trailing commas (`es5`).
- Keep changes surgical in selector-heavy modules; avoid broad refactors.
- Example patterns:
  - New chat-box tool → implement as a component in `src/tools/`, then wire it into `ChatTools` and use `chatBoxManager` for input/tool container interactions.
  - New top-bar button → implement in `createTopBarToolsManager()` and ensure `refresh()` path from `content.jsx` observer.
  - New setting → merge with existing settings defaults and persist via `useChromeStorage`.
