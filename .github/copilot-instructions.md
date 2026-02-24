# Copilot Instructions for hypergravity

## Overview
- MV3 Chrome extension and Userscript for Gemini (`*://gemini.google.com/*`) built with Vite + Preact.
- Uses `@crxjs/vite-plugin` for extension and `vite-plugin-monkey` for userscript targets.
- Runtime entry points: `src/content.jsx` (content script), `src/background.js` (service worker), `src/popup/popup.js` (cache utility popup).

## Architecture you should keep
- `src/content.jsx` is the orchestrator: injects `Sidebar`/`ChatTools`, runs a debounced `MutationObserver`, and refreshes top-bar tools on Gemini rerenders/URL changes.
- `src/Sidebar.jsx` is the main navigation container: hosts `FoldersManager.jsx`, `SettingsModal.jsx`, and `WelcomeModal.jsx`. 
- `src/ChatTools.jsx` is now a thin composition shell; actual chat tools live in `src/tools/` (`WordCounter`, `OptimizeButton`, `TokenCounter`, `QuickActions`, `ScrollButtons`). Tools register with `TOOLS` array (align: left/right, weight for ordering).
- Top-bar actions live in `src/features/topBarToolsManager.js` (wide mode + export); depends on `src/managers/topBarManager.js` for DOM injection. Wide layout marks elements with `data-hg-wide-target`.
- Export flow is imperative DOM in `src/features/chatExport.jsx` (copy/txt/pdf/docx/print), launched from top-bar export button. Consumes `src/features/chatExport.jsx` which provides `ChatExportController`.
- Prompt optimization is split: UI trigger in `src/features/promptOptimizer.js` → `chrome.runtime.sendMessage` (`OPTIMIZE_PROMPT`, `CANCEL_OPTIMIZATION`) → hidden-tab automation in `src/background.js`.
- Input/chat-box interactions should go through `src/managers/chatBoxManager.js` (selector fallback + normalized set/get input text).
- Scroll management via `src/managers/scrollManager.js` handles autoscroll, scroll-to-top, and scroll-to-bottom for chat history; consumed by `ScrollButtons` tool.
- Token counting in `src/tools/TokenCounter.jsx` parses DOM by selector priority and uses `src/utils/tokenHashCache.js` for hashed cache + delayed flush.

## Storage rules (important)
- Use `useChromeStorage` (`src/hooks/useChromeStorage.js`) for Preact state persisted to `chrome.storage.local` with localStorage fallback.
- Keep key names stable: `hypergravityGeminiSettings`, `hypergravityGeminiFolders`, `quickActions`, `hypergravitySectionExpanded`, `hg_token_hash_cache`, `hypergravityWelcomeSeen`.
- For non-hook code, follow the same chrome-storage-first + localStorage fallback pattern via `src/utils/browserEnv.js`.

## DOM integration conventions
- Gemini DOM is volatile; use multi-selector fallback patterns (see `content.jsx`, `chatBoxManager.js`, `src/tools/TokenCounter.jsx`).
- Prefer small, resilient imperative insertions over assuming Preact controls Gemini DOM.
- Preserve debounce/observer lifecycle patterns when reattaching UI or refreshing features.
- For chat-box tool UI changes, prefer creating/updating components in `src/tools/` and composing them via `ChatTools`, rather than adding logic directly in `content.jsx`.

## Developer workflow
- Install: `npm install`
- Dev (must stay on port 5173): `npm run dev`
- Build Extension: `npm run build:ext`
- Build Userscript: `npm run build:user`
- Preview: `npm run preview`
- No formal test suite exists; validate by loading the built extension and exercising Gemini UI flows.

## Style + change scope
- Follow `.prettierrc`: 4 spaces, single quotes, semicolons, trailing commas (`es5`).
- Keep changes surgical in selector-heavy modules; avoid broad refactors.
- Example patterns:
  - New chat-box tool → implement as a component in `src/tools/`, add to `TOOLS` array in `ChatTools.jsx` with `align` (left/right) and `weight` (ordering), use `chatBoxManager` for input interactions.
  - New scroll feature → add/extend `src/managers/scrollManager.js`, then wire into `ScrollButtons` tool or create new tool that calls `createScrollManager()`.
  - New top-bar button → implement in `createTopBarToolsManager()` and ensure `refresh()` path from `content.jsx` observer.
  - New setting → merge with existing settings defaults and persist via `useChromeStorage`.
