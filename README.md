# 🌙 Bedtime

A fun, kid-friendly iOS + Android app that encourages children to go to bed without hassle. Set each child's bedtime and a pre-bedtime warning, get full-screen photo alarms with distinct sounds, then review the night as **good** or **bad** — tomorrow's bedtime automatically shifts earlier or later based on behaviour.

Built with **Expo (React Native)**. All data stays **local on the device** — no account, no cloud.

## Features

- **Kids & profiles** — add children, take a photo or pick one from the gallery, choose a colour.
- **Bedtime + warning** — per-child bedtime and a configurable pre-bedtime warning (e.g. 10 minutes) to grab a snack / wind down.
- **Two distinct alarms** — a gentle *warning* chime and a more insistent *bedtime* tone (different sounds so they're easy to tell apart), shown on a full-screen alarm with the child's photo. If two kids' alarms fire together, **both photos** are shown.
- **Good / bad review** — after bedtime, mark each child. Good nights push bedtime **later** by `y` minutes tomorrow; bad nights push it **earlier** by `x` minutes ("tired and grumpy → more sleep"). Both amounts are configurable.
- **Reasons** — record why a night was bad (free text or pick a stored reason like *hiding* or *shouting*); reason frequencies are charted.
- **Revoke a good night** — e.g. if the child got up when they shouldn't have.
- **Treats & penalties** — move bedtime later for unrelated good behaviour, or earlier for bad behaviour.
- **Weekend offsets (advanced)** — stay up later on Friday/Saturday (non-school) nights.
- **Bedtime window** — configurable min/max so bedtimes never drift to silly times.
- **History & graphs** — bedtime-over-time line chart and reason-frequency bar chart per child, plus good-night **streaks**.
- **PIN lock** — optional 4-digit PIN protects Settings and the nightly review from little fingers.

## Tech stack

| Concern | Choice |
| --- | --- |
| Framework | Expo SDK 57 / React Native 0.86 (New Architecture) |
| Navigation | Expo Router (file-based) |
| Styling | NativeWind (Tailwind CSS) |
| State | Zustand |
| Database | expo-sqlite + Drizzle ORM (local) |
| Alarms | `react-native-notify-kit` (maintained Notifee fork) — Android full-screen intents + iOS notifications |
| Charts | `react-native-gifted-charts` |
| Media | expo-image-picker, expo-audio |

## Getting started

> **This app uses native modules (alarms, SQLite, charts), so it does not run in Expo Go.** You need a development build.

```bash
npm install

# Generate native projects and run on a device/emulator:
npm run android   # expo run:android
npm run ios       # expo run:ios
```

Once a dev build is installed, `npm start` launches the Metro dev server for fast reloads.

### Building with EAS (installable builds)

```bash
npm i -g eas-cli
eas login
eas build --profile preview --platform all
```

Profiles are defined in [`eas.json`](eas.json).

## Alarm behaviour & platform limits

Real alarm behaviour differs by OS:

- **Android** — full alarm behaviour: high-importance channels, **full-screen intent** notifications that wake the screen, and exact alarms via `SET_ALARM_CLOCK`.
  - `USE_FULL_SCREEN_INTENT` is declared in [`app.json`](app.json). Google Play restricts this permission to alarm/calling apps — fine for this app, but relevant when publishing.
  - On Android 12+ the user may need to allow **"Alarms & reminders" / exact alarms** for the app in system settings.
- **iOS** — third-party apps **cannot** show a true full-screen alarm at full volume when the app is closed (only Apple's Clock app can). Bedtime schedules **local notifications with custom sounds** (time-sensitive), and shows the full-screen photo alarm when the app is opened/foregrounded.

Alarms are re-scheduled automatically whenever children or settings change, and for the next few nights ahead.

## Alarm sounds

Two sounds ship in [`assets/sounds/`](assets/sounds):

- `warning.wav` — gentle rising chime
- `bedtime.wav` — insistent repeating alarm

They're wired into the native projects via the `expo-notifications` plugin in [`app.json`](app.json). To replace them, drop in your own `warning.wav` / `bedtime.wav` (keep them short, < 30s for iOS) and rebuild.

## Project structure

```
app/                 Expo Router screens
  index.tsx          Dashboard (tonight's bedtimes)
  kids/              List, add/edit, per-child detail + graphs
  assess.tsx         Nightly good/bad review
  alarm.tsx          Full-screen photo alarm
  settings.tsx       Deltas, weekend offsets, window, PIN
  reasons.tsx        Manage reusable reasons
  history.tsx        Cross-child history & graphs
components/          Reusable UI (Avatar, Button, Charts, ...)
db/                  Drizzle schema, SQLite client, repository
lib/                 Bedtime engine, alarms, time, photos, sound, pin
store/               Zustand app state
```

## CI

GitHub Actions in [`.github/workflows`](.github/workflows):

- **`build.yml`** (push / PR): typechecks, validates the Expo config, then **prebuilds and compiles a debug Android APK** and an **iOS simulator build**, uploading both as artifacts. No secrets required.
- **`eas-build.yml`** (manual): produces real installable builds via EAS. Requires an `EXPO_TOKEN` repo secret.

## License

MIT — see [LICENSE](LICENSE).
