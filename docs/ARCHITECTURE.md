# Architecture & Codebase Overview

This document provides a high-level overview of the `ASCENT-Frontend` codebase organization and architecture to help new contributors understand where to find things and how the app is structured.

## 📁 Directory Structure

```
workoutApp/
├── app/                 # Expo Router file-based routing
├── src/                 # Source code and business logic
│   ├── components/      # Reusable UI components
│   ├── services/        # API calls, state management, and business logic
│   ├── hooks/           # Custom React hooks
│   ├── constants/       # App-wide constants (colors, fonts, API URLs)
│   ├── types/           # Global TypeScript type definitions (if applicable)
├── assets/              # Static assets (images, fonts)
├── styles/              # Global styles (if applicable)
```

## 🏗 Key Concepts

### Routing (`app/`)
This project uses **Expo Router**. The file structure in the `app/` directory determines the navigation hierarchy.
- `_layout.tsx`: Defines the layout (stack, tabs, drawer) for the current route segment.
- `index.tsx`: The main entry screen for a route.
- `[id].tsx`: Dynamic routes parameters.

### Core Logic (`src/`)
We separate the UI from the business logic by keeping reusable code in `src/`.
- **Components:** Dumb UI components that receive props. They should not contain complex business logic or direct API calls if possible.
- **Services:** Functions that interact with the backend API or handle heavy local processing.
- **Hooks:** Custom hooks to encapsulate reusable stateful logic (e.g., `useAuth`, `useWorkout`).

## 🎨 Styling
- Styles are typically defined using `StyleSheet.create` from React Native.
- Constants for colors and layout values are stored in `src/constants` to ensure consistency.

## 🔌 State Management
- Local state is managed with `useState` and `useReducer`.
- Global state (if applicable) might use Context API or third-party libraries (check `package.json`).
- Persistent data is stored using `@react-native-async-storage/async-storage`.

## 🔄 Data Flow
1. **User Action:** User interacts with a Component.
2. **Logic/Service:** Component calls a Service or Hook.
3. **API/Storage:** Service interacts with the Backend API or Async Storage.
4. **State Update:** State is updated and the Component re-renders.

## 🏋️ Training Engine (`src/engine/`)

Plain JS, no React or network, so it runs offline on the phone and under `npm test` (Node's built-in runner). `index.d.ts` gives TypeScript screens a typed API.

| File | Role |
|---|---|
| `taxonomy.js` | Muscles, equipment, presets, weekly set targets |
| `exercises.js` | Exercise library with pattern, bias (stretch/squeeze), fatigue, joints, equipment |
| `splits.js` | Splits = which muscles each day trains; any custom split works |
| `generator.js` | **Anchors + Rotators** — fixed anchors per block, rotated accessories per session, every target muscle covered |
| `substitution.js` | Ranked alternatives for busy machines, missing equipment, pain, too hard, dislike |
| `progression.js` | Rep ranges, rest, RIR, double-progression load suggestions |
| `progress.js` | Rotation-aware progress: weekly sets per muscle, per-exercise bests |
| `weekPlan.js` | Decides what each training day is for (strength / endurance / mobility) from goals |
| `endurance.js` | Run, bike, swim, HYROX and conditioning sessions; HR zones; rotating hard-session formats |
| `mobility.js` | Mobility / yoga / pilates move library and flow builder (warm-ups, cool-downs, recovery) |
| `foods.js` | Built-in offline food database with diet, allergen and purine data |
| `nutrition.js` | Daily targets (training-day aware), health rules, food warnings and protein-gap suggestions |
| `micros.js` / `foodMicros.js` | Vitamins & minerals: daily references (DRIs) and USDA data for built-in foods (`scripts/nutrients/`) |
| `supplements.js` | Supplement catalogue with per-serving nutrients and condition-specific cautions |
| `activities.js` | Every activity type (run, swim, yoga, sports…) with tips, warm-ups, cool-downs |
| `gps.js` | GPS maths: distance, moving time, pace, km splits, elevation, glitch filtering |
| `anatomy.js` | 41 individual muscles (anatomical name + plain group), front/back body map, which heads each exercise works |
| `rig.js` | 3D mannequin: joint angles or IK targets → joints; anatomical range checks |
| `motions.js` | One keyframed motion per exercise (146), built from coaching cues |
| `demo.js` | Timing, camera projection, depth-sorted drawing, muscles on the body surface, `checkMotion` |

## Exercise guidance

Each exercise screen shows a looping demo (`src/ui/ExerciseDemo.tsx`), numbered steps and common mistakes (`src/data/howto.ts`), an anatomy map with target muscles in red and helpers in soft red, listed by anatomical name with the plain group in brackets (`src/ui/BodyMap.tsx`), and a YouTube link (`src/ui/youtube.tsx`). Moves and activities get the anatomy map and YouTube link too.

- **Demos** are drawn, not videos. `rig.js` is a 3D mannequin (two-part spine, shoulders, elbows, hips, knees, ankles, wrists). Limbs are posed with anatomical terms (`elev`/`plane`/`bend`/`rot`) or pinned to a bar, handle or the floor with two-bone IK. Each exercise in `motions.js` has its own keyframes and a camera angle that shows the working joints; `adjust` hooks keep constraints between keyframes (e.g. straight arms and a vertical bar path in deadlifts). Muscles are drawn on the surface where they sit and only show when that side faces the camera.
- **Accuracy guard**: `checkMotion` samples every rep and fails on joint ranges (elbow ≤ 155°, knee ≤ 160° and never backward, hip extension ≤ 30°, abduction ≤ 66°, ankle −55…40°, spine/neck limits), anything below the floor or through a bench, and hands/feet that can't reach their contact point. A test runs it for all 146 exercises and also checks each demo shows its target muscles. Preview while authoring by rendering `demoFrame()` to SVG in a browser.
- **YouTube** links are searches (never dead); pin a specific video by adding its id to `CURATED` in `youtube.tsx`.
- **Muscle red** (`colors.muscle` / `muscleSoft`) is only for anatomy; `colors.danger` stays for destructive actions.
- Tests guard coverage: every exercise has a demo and how-to, every muscle is drawn, every activity/area is mapped.

App state (profile, block, planned workout, active session, history) lives in AsyncStorage via `src/services/trainingStore.ts`; food, water and weight logs via `src/services/nutritionStore.ts`. Packaged foods and barcodes come from Open Food Facts (`src/services/openFoodFacts.ts`; search is phone-only because OFF search blocks browser CORS).

GPS recording lives in `src/hooks/useGpsTracker.ts` (foreground in Expo Go; background needs a development build). Maps use `src/ui/RouteMap.native.tsx` (Apple/Google maps) on phones and an SVG fallback on web. Charts are a small SVG kit in `src/ui/charts.tsx`.

## Streaks, reminders, media and community

- **Streaks & badges** — `src/engine/streaks.js` (pure, tested). Plan streak = days in a row trained *or* on a planned rest day; week streak = Monday-weeks hitting the weekly goal; food streak = days with anything logged. Today never breaks a streak. `src/services/streakStore.ts` remembers unlock dates and which badges have been celebrated.
- **Reminders** — `src/services/reminders.ts` (expo-notifications, local only). Workout and streak-saver reminders are one-off notifications for the next 7 days, rebuilt every time Today loads, so they name the planned session and skip days already trained. Meals, water, supplements and weigh-in repeat on their own. Not available on web.
- **Photos & videos** — `src/services/mediaStore.ts` copies picked files into the app's documents folder (`LoggedSession.media`). Clips are capped at 60 s, 8 items per session. Phone only.
- **Community** — `src/services/community.ts` talks to ASCENT-Backend (`/api/friends`, `/api/posts`, `/api/feed`, `/api/clubs`, `/api/leaderboard`, `/api/notifications`, `/api/media`). The JWT lives in SecureStore (localStorage on web).
  - Server address: `EXPO_PUBLIC_API_URL`, else the Expo host on port 5000 (same Wi-Fi only; not over `--tunnel`).
  - Privacy: nothing is shared until a session is posted. Routes are trimmed 200 m at each end by default (`hideRouteEnds`). Leaderboards only receive weekly totals. Media is served through signed links that expire after 24 h.
