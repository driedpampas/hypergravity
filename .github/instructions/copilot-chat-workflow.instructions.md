---
description: "Use when running terminal commands, installing dependencies, starting dev servers, building, linting, typechecking, previewing, or executing repo scripts in Copilot Chat for hypergravity. Prefer bun commands and use background terminals for long-running processes."
name: "Copilot Chat Workflow"
---
# Copilot Chat Workflow

- Use `bun` for package management and script execution in this repository.
- Prefer `bun install` for dependency installation.
- Prefer `bun run <script>` for project scripts instead of `npm`, `pnpm`, or `yarn`.
- When a command is expected to keep running, such as `bun run dev`, `bun run preview`, or any watch-mode task, start it in a background terminal when operating through Copilot Chat.
- Use foreground terminals for short-lived validation commands such as `bun run typecheck`, `bun run lint`, `bun run build:ext`, `bun run build:user`, and `bun run check:ci`.
- If a task requires multiple validation steps, prefer the smallest relevant `bun run ...` command before escalating to broader checks.