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
