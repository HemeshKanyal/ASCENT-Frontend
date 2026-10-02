# ASCENT-Frontend

Expo SDK 57 / React Native 0.86 / React 19 workout + nutrition app, Expo Router with typed routes. Offline-first: training, food, streaks and media live on the device (AsyncStorage + documents folder). Only the community features (Crew tab) and the AI meal-photo route need a server. Backend lives in the sibling repo `../ASCENT-Backend`.

## Commands

- `npm test` — engine unit tests (`node --test src/engine/__tests__/*.test.js`). Run after any engine change.
- `npx tsc --noEmit` — typecheck. Typed-route errors for a newly added screen clear once the dev server regenerates `.expo/types` (restart it).
- `npm run lint` — ESLint incl. React Compiler rules.
- `npm start` / `npm run phone` (`--tunnel`, for Expo Go on another network) / `npm run web`.
- For test servers use a port other than 8081 (the user runs their own there), e.g. `CI=1 npx expo start --web --port 8083`. `CI=1` disables reload — restart after edits.

## Layout

- `src/engine/` — pure JS domain logic (exercise rotation, plans, nutrition, GPS, streaks, meal parser), typed by the hand-written `src/engine/index.d.ts`. Keep it framework-free and add types to `index.d.ts` for every new export.
- `src/services/` — app state and I/O (`trainingStore`, `nutritionStore`, `streakStore`, `reminders`, `mediaStore`, `community` API client, `mealAI`).
- `src/ui/` — design system (`theme.ts`, `components.tsx`) and shared views.
- `app/` — screens (Expo Router). `app/api/*+api.ts` are server routes (`web.output: "server"`).
- `docs/ARCHITECTURE.md` — deeper design notes; update it when adding a subsystem.

## Gotchas

- Platform files: inside `X.native.tsx`, `import "./X"` resolves to itself → infinite recursion on phones. Put shared code in a third file. `platform-files.test.js` guards this.
- Web is server-rendered: modules touching `window`/`document` at import (e.g. Leaflet) must be loaded lazily in an effect.
- React Compiler lint: no `setState` directly in effects' sync body, no `Date.now()`/`Math.random()` in render (keep `now` in state), no ref reads in render.
- Web screenshots don't exercise native-only code (camera, GPS, notifications, file system, video). Also build the iOS/Android bundle (`/node_modules/expo-router/entry.bundle?platform=ios&dev=true&hot=false&transform.routerRoot=app`) and say plainly what wasn't verified on a device.
- Secrets: `ANTHROPIC_API_KEY` goes in `.env.local` (server-only, never `EXPO_PUBLIC_*`). Community server URL: `EXPO_PUBLIC_API_URL`, else the Expo host on port 5000 (same Wi-Fi only, not over `--tunnel`).

## Style

- Monochrome UI: black/white/gray gradients; bold Inter + italic DM Serif Display. The only hue is `colors.danger`.
- Match surrounding code: short doc comments on modules/exported functions explaining *why*, plain names, no over-abstraction.
