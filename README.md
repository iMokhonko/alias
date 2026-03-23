# Alias

A browser-based **Alias** (табличний аліас) style party game: teams take turns explaining words without saying them, while teammates guess. Word decks are generated per session with the **OpenAI API** from your chosen difficulty and optional custom topic. The UI is **Ukrainian** (`uk`).

This repository was **fully vibecoded with [Cursor](https://cursor.com)**—designed and implemented through AI-assisted iteration in the editor, not a hand-written spec from scratch.

## Tech stack

- **Vue 3** (Composition API, `<script setup>`)
- **TypeScript**, **Vite**
- **Pinia** (game state), **Vue Router**
- **Tailwind CSS** v4, **reka-ui** / shadcn-style components
- **OpenAI** SDK (client-side calls with your key)

## Prerequisites

- **Node.js** 20+ (or another current LTS) recommended
- **pnpm** (`npm install -g pnpm`)

You need a valid **OpenAI API key**. It is stored only in the browser (`localStorage`) and sent to OpenAI from the client when generating words—use a key you are comfortable exposing to the device/browser that runs the app.

## Run locally

```bash
pnpm install
pnpm dev
```

Open the URL Vite prints (usually `http://localhost:5173`).

## Build for production

```bash
pnpm build
```

Output is in `dist/`. Preview the production build:

```bash
pnpm preview
```

## How to play (short)

1. Save your API key in **Settings** (gear next to **Грати** on the home screen).
2. Choose difficulty (or custom topic), set up teams and rules, then generate the word deck.
3. During a turn, one player sees the word and gives hints; the team marks words guessed or skipped. Timer and scoring follow the rules you set in setup.

## License

Private project (`"private": true` in `package.json`). Add a license file if you open-source it.
