# ChronoHaven (栖时岛)

## Overview
A gamified focus timer mobile app built with Expo React Native. Users earn "diamonds" (砖石) by focusing, then use them to build and upgrade buildings on their personal island.

## Architecture
- **Frontend**: Expo Router with file-based routing, tab navigation (5 tabs)
- **State Management**: React Context + AsyncStorage for local persistence
- **Styling**: Custom theme with deep green (#1B5E20) + warm gold (#FFB74D)
- **Fonts**: Nunito (UI text) + Roboto Mono (numbers/timer)

## Key Features
- Focus timer (countdown 25/45/60 min + free mode)
- Island building (6x6 grid, 5 building types)
- Character leveling (XP from focus sessions)
- Daily/Weekly tasks with diamond/XP rewards
- Statistics (focus trends, building stats)
- Profile management

## Project Structure
- `app/(tabs)/` - Tab screens (island, focus, tasks, stats, profile)
- `lib/game-state.tsx` - Game state context with AsyncStorage persistence
- `constants/colors.ts` - Theme colors
- `server/` - Express backend (landing page only for now)

## Game Mechanics
- 1 minute focus = 1 diamond + 1 XP
- Every 25 min continuous: +10 bonus diamonds
- Buildings cost diamonds, produce diamonds hourly
- Level up by accumulating XP (exponential scaling)
- Daily tasks reset each day, weekly tasks reset each week
