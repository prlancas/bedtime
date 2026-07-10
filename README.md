# 🌙 Bedtime

[![Build](https://github.com/prlancas/bedtime/actions/workflows/build.yml/badge.svg)](https://github.com/prlancas/bedtime/actions/workflows/build.yml)
[![Release](https://github.com/prlancas/bedtime/actions/workflows/release.yml/badge.svg)](https://github.com/prlancas/bedtime/actions/workflows/release.yml)
[![Download](https://img.shields.io/github/v/release/prlancas/bedtime?label=download&sort=semver)](https://github.com/prlancas/bedtime/releases/latest)

A fun, kid-friendly iOS + Android app that encourages children to go to bed without hassle. Set each child's bedtime and a pre-bedtime warning, get full-screen photo alarms with distinct sounds, then review the night as **good** or **bad** — tomorrow's bedtime automatically shifts earlier or later based on behaviour.

Built with **Expo (React Native)**. All data stays **local on the device** — no account, no cloud.

## Download

Grab the latest installable builds from the **[Releases page](https://github.com/prlancas/bedtime/releases/latest)** — this is the download page for the app.

| Platform    | File                             | How to install                                                                                                                                            |
| ----------- | -------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Android** | `bedtime-<version>.apk`          | Download on your phone, allow "Install unknown apps" for your browser/files app, then open the APK.                                                       |
| **iOS**     | `bedtime-<version>-unsigned.ipa` | Unsigned — re-sign with Xcode / AltStore / Sideloadly to install on a device, or use [EAS](#building-with-eas-installable-builds) for a TestFlight build. |

Releases are produced automatically by the [`release.yml`](.github/workflows/release.yml) workflow when a `v*` tag is pushed (see [Releasing](#releasing)).

## Features

- **Kids & profiles** — add children, take a photo or pick one from the gallery, choose a colour.
- **Bedtime + warning** — per-child bedtime and a configurable pre-bedtime warning (e.g. 10 minutes) to grab a snack / wind down.
- **Two distinct alarms** — a gentle _warning_ chime and a more insistent _bedtime_ tone (different sounds so they're easy to tell apart), shown on a full-screen alarm with the child's photo. If two kids' alarms fire together, **both photos** are shown.
- **Good / bad review** — after bedtime, mark each child. Good nights push bedtime **later** by `y` minutes tomorrow; bad nights push it **earlier** by `x` minutes ("tired and grumpy → more sleep"). Both amounts are configurable.
- **Reasons** — record why a night was bad (free text or pick a stored reason like _hiding_ or _shouting_); reason frequencies are charted.
- **Revoke a good night** — e.g. if the child got up when they shouldn't have.
- **Treats & penalties** — move bedtime later for unrelated good behaviour, or earlier for bad behaviour.
- **Weekend offsets (advanced)** — stay up later on Friday/Saturday (non-school) nights.
- **Bedtime window** — configurable min/max so bedtimes never drift to silly times.
- **History & graphs** — bedtime-over-time line chart and reason-frequency bar chart per child, plus good-night **streaks**.
- **PIN lock** — optional 4-digit PIN protects Settings and the nightly review from little fingers.

## Tech stack

| Concern    | Choice                                                                                                |
| ---------- | ----------------------------------------------------------------------------------------------------- |
| Framework  | Expo SDK 57 / React Native 0.86 (New Architecture)                                                    |
| Navigation | Expo Router (file-based)                                                                              |
| Styling    | NativeWind (Tailwind CSS)                                                                             |
| State      | Zustand                                                                                               |
| Database   | expo-sqlite + Drizzle ORM (local)                                                                     |
| Alarms     | `react-native-notify-kit` (maintained Notifee fork) — Android full-screen intents + iOS notifications |
| Charts     | `react-native-gifted-charts`                                                                          |
| Media      | expo-image-picker, expo-audio                                                                         |

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

## Quality: lint, format & tests

```bash
npm run lint          # ESLint (eslint-config-expo, flat config)
npm run format        # Prettier write
npm run format:check  # Prettier check (CI)
npm run typecheck     # tsc --noEmit
npm test              # Jest unit tests
npm run test:ci       # Jest with coverage + thresholds
```

Unit tests live in [`__tests__/`](__tests__) and cover the pure bedtime engine ([`lib/bedtime.ts`](lib/bedtime.ts)) and time helpers ([`lib/time.ts`](lib/time.ts)) — the logic that decides how bedtimes shift. They run in a lightweight Node/`babel-jest` environment (see [`jest.config.js`](jest.config.js)); UI, database, and native alarm wrappers are validated via the build pipeline and on-device testing.

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

- **`build.yml`** (push / PR):
  1. **quality** — Prettier check, ESLint, TypeScript, Jest (with coverage), and Expo config validation.
  2. **android** — prebuilds and compiles a debug **APK** (`gradlew assembleDebug`).
  3. **ios** — runs on `macos-15` and selects **Xcode ≥ 16.1** (required by React Native 0.86), then prebuilds, `pod install`s, and compiles an **iOS simulator** build.

  Both apps are uploaded as artifacts. No secrets required.

- **`release.yml`** (on `v*` tag / manual): builds a **release APK** and an **iOS `.ipa`**, then publishes them to a [GitHub Release](https://github.com/prlancas/bedtime/releases) as downloadable assets. See [Releasing](#releasing).

- **`eas-build.yml`** (manual): produces real installable builds via EAS. Requires an `EXPO_TOKEN` repo secret.

> The iOS jobs explicitly pin Xcode via `maxim-lobanov/setup-xcode`. The default Xcode on some runner images is older than 16.1, which makes CocoaPods fail with _"React Native requires XCode >= 16.1"_ — pinning avoids that.

## Releasing

Push a version tag to build and publish downloadable artifacts to the [Releases page](https://github.com/prlancas/bedtime/releases):

```bash
git tag v1.0.0
git push origin v1.0.0
```

(Or run the **Release** workflow manually from the Actions tab with a version like `v1.0.0`.) The workflow builds an Android release APK and an iOS `.ipa`, then attaches both to a GitHub Release.

**Android signing (optional).** By default the APK is signed with the debug key — installable by sideloading, but not publishable to Google Play. To ship a properly-signed APK, add these repository secrets (Settings → Secrets and variables → Actions):

| Secret                      | Description                         |
| --------------------------- | ----------------------------------- |
| `ANDROID_KEYSTORE_BASE64`   | `base64` of your `release.keystore` |
| `ANDROID_KEYSTORE_PASSWORD` | keystore password                   |
| `ANDROID_KEY_ALIAS`         | key alias                           |
| `ANDROID_KEY_PASSWORD`      | key password                        |

**iOS signing.** A device-installable `.ipa` requires an Apple Developer account and signing credentials, so the release ships an **unsigned** `.ipa`. Re-sign it (Xcode / AltStore / Sideloadly) to install directly, or use the [`eas-build.yml`](.github/workflows/eas-build.yml) workflow for a TestFlight-ready build.

## License

MIT — see [LICENSE](LICENSE).
