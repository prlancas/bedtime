# Bedtime — agent guide

A cross-platform (iOS + Android) Expo app that helps kids get to bed without
hassle, and rewards good behaviour with a star economy. This file orients a new
session: the stack, architecture, conventions, and how each feature is wired.

## Expo has changed

This project targets **Expo SDK 57**. APIs differ from older tutorials/training
data. **Read the versioned docs at https://docs.expo.dev/versions/v57.0.0/
before writing native/Expo code** (especially `expo-audio`, `expo-sqlite`,
`expo-file-system`, `expo-notifications`).

## Tech stack

- **Expo Router** (file-based routing, typed routes enabled) — screens in `app/`.
- **expo-sqlite** + **Drizzle ORM** — local relational storage.
- **Zustand** (`store/useStore.ts`) — app state (children, settings, ready/unlock).
- **NativeWind** (Tailwind) for styling; palette in `tailwind.config.js` + `lib/theme.ts`.
- **react-native-notify-kit** (Notifee fork) — scheduled alarms / full-screen intents.
- **expo-audio** — in-app sound playback + microphone recording.
- **expo-document-picker** — uploading mp3/audio files.
- **expo-quick-actions** — per-child app-icon / home-screen shortcuts (opt-in).
- **react-native-reanimated**, **react-native-gifted-charts** (+ `expo-linear-gradient`).

## Commands

Use Node via asdf: `export ASDF_NODEJS_VERSION=24.0.0` (see `.tool-versions`).

### ALWAYS run these checks before finishing or committing

CI (`.github/workflows/build.yml`, job "Lint, typecheck & test") runs the
commands below **and fails the whole build on the first failure**. Run the exact
same npm scripts locally so you don't break CI — do not substitute looser
variants:

```bash
npm run format:check   # prettier --check .  (whole repo — NOT `prettier --write` on a few globs!)
npm run lint           # eslint .            (must be 0 errors; warnings are allowed)
npm run typecheck      # tsc --noEmit
npm run test:ci        # jest --coverage — ENFORCES coverage thresholds (jest.config.js)
npx expo config --type public > /dev/null   # validates app.json
```

Gotchas that have bitten us:

- **Formatting:** `format:check` checks the _entire repo_ (incl. `app.json`,
  which `expo install` reformats). Fix with `npm run format` (`prettier --write .`),
  never a hand-picked glob.
- **Coverage:** `test:ci` enforces thresholds over `collectCoverageFrom`
  (`lib/bedtime.ts`, `lib/time.ts`, `lib/stars.ts`, `lib/lastAction.ts`). Plain
  `npx jest` does NOT check coverage, so it can pass while CI fails. When you add
  a pure `lib/*` function, add a unit test (and add the file to
  `collectCoverageFrom` if it's new pure logic).
- Capturing exit codes: don't pipe a command through `tail`/`head` when checking
  `$?` — the pipe returns the pager's exit code and hides real failures.

Other:

```bash
npx expo run:android    # local dev build (needs Java 17 via .tool-versions)
```

### Typed routes

Adding/removing a screen invalidates `.expo/types/router.d.ts`, so `tsc` will
error with "path not assignable". Regenerate by briefly running the dev server
(`npx expo start --offline`, wait ~10s, kill it) — it rewrites the route types.

## Architecture & conventions

- **Times are "minutes from midnight"** (e.g. 1170 = 19:30). Use helpers in
  `lib/time.ts` (`formatTime`, `dateAtMinutes`, `dateKey`, `addDays`,
  `formatDate`, `dateFromKey`). Dates are keyed as local `YYYY-MM-DD`.
- **DB schema lives in two places that must stay in sync:**
  - `db/schema.ts` — Drizzle table definitions + exported types.
  - `db/client.ts` — `initDatabase()` runs `CREATE TABLE IF NOT EXISTS` on every
    launch, plus `migrate()` which adds later columns idempotently via
    `PRAGMA table_info` checks (SQLite has no `ADD COLUMN IF NOT EXISTS`).
    **When you add a column to an existing table, add it to both the CREATE and
    the `migrate()` additions list** so existing installs upgrade.
- **All data access goes through `db/repo.ts`** (pure query/mutation functions).
  Screens call repo functions directly (often in render, SQLite is sync) and
  call `useStore().reload()`/`refresh()` after writes. `refresh()` also
  reschedules alarms.
- **Pure, testable logic** lives in `lib/` (`bedtime.ts`, `time.ts`, `stars.ts`)
  and is unit-tested in `__tests__/`. Keep business rules there, not in screens.
- **PIN protection**: settings-like screens wrap content in `<PinGate>` (see
  `settings.tsx`, `reasons.tsx`, `goals.tsx`, `pause.tsx`).
- Shared UI: `components/Screen`, `Card`, `Button`, `NavBar`, `Avatar`,
  `TimeStepper`/`NumberStepper`, `SoundConfig`.
  - `TimeStepper` renders a **time of day**; `NumberStepper` renders a **count**
    (minutes, stars, etc). Never feed a duration to `TimeStepper` — that was the
    "warning shows 12:10 AM" bug.

## Data model (tables)

- `children` — name, photo, colour, `baseBedtimeMinutes` (evolving), warning
  lead, sounds (`warningSound`/`bedtimeSound` = builtin key or `'custom'`, with
  `*SoundUri` for custom clips), `bedtimePausedUntil` (YYYY-MM-DD).
- `settings` (single row id=1) — bedtime deltas, weekend offsets, bedtime window,
  PIN, star economy (`pencePerStar`, `currencySymbol`, `starGoodDefault`,
  `starSlipDefault`), optional-feature flags (`featurePinkyPromises`,
  `featureShop`, `featureHomeShortcuts`, `featureDoTheSame`) and `tourSeen`.
- `bedtime_records` — one per assessed night (good/bad/revoked) + reason/note.
- `reasons` — reusable bad-bedtime reasons.
- `adjustments` — manual bedtime treats/penalties.
- `star_reasons` — reasons for stars; `kind` good|slip; `defaultStars` remembers
  the last amount so it pre-fills next time (still editable).
- `star_events` — signed star transactions (+good / -slip) per child.
- `star_goals` — configurable rewards (name, `starCost`, emoji, active).
- `redemptions` — stars spent (positive count), optional goal, note, date. Bank
  balance = sum(star_events.stars) − sum(redemptions.stars) (`starBalance()`).
- `clubs` — weekly recurring activity (weekday, start minutes, duration, warning
  lead, colour; `childId` null = everyone).
- `club_pauses` — holiday date ranges muting clubs (`clubId` null = all clubs).
- `pinky_promises` — logged promises per child; `kept` null=pending / 1=kept /
  0=broken.

## Features & where they live

- **Bedtime engine**: `lib/bedtime.ts` (evolving base ± deltas, weekend offsets,
  clamped to window). Assessment in `app/assess.tsx` + `repo.assessNight`.
- **Alarms**: `lib/alarms.ts`. `scheduleAllAlarms()` cancels + re-schedules the
  next `SCHEDULE_DAYS` for each child (warning + bedtime), **skipping paused
  nights** (`isBedtimePaused`), and schedules **club** warning/start reminders
  (respecting `isClubMuted`). Three channels: warning, bedtime, club.
- **Full-screen alarm** (`app/alarm.tsx`): launched via notification. Plays each
  firing child's chosen sound **sequentially** (`lib/sound.playSequence`,
  de-duping identical sounds) so coinciding kids are distinguishable.
- **Sounds** (`lib/sound.ts`, `components/SoundConfig.tsx`): built-in tones +
  per-child recorded/uploaded clips stored in `documentDirectory/sounds/`.
  **IMPORTANT constraint:** OS notification/lock-screen sounds must be bundled at
  build time, so custom clips only play via the **in-app alarm screen**, not as
  the notification sound. Recording needs mic permission (configured in
  `app.json`: `RECORD_AUDIO`, `NSMicrophoneUsageDescription`, `expo-audio`
  plugin). Adding custom sounds requires a native rebuild.
- **Stars & rewards**:
  - `app/rewards.tsx` — hub: per-child bank, money value, next-goal progress,
    quick actions.
  - `app/star-award.tsx` — give stars (good) or record a slip-up; reason chips
    pre-fill remembered star counts.
  - `app/redeem.tsx` — spend stars on a goal or custom item; can't overdraw bank.
  - `app/star-stats.tsx` — reasons breakdown, redemption + activity history.
  - `app/goals.tsx` — configure `pencePerStar`, currency, default amounts, and
    the goal catalogue. Money helpers in `lib/stars.ts`.
- **Bedtime pause** (`app/pause.tsx`): pause a child or everyone for a night /
  week / custom via `repo.setBedtimePause`.
- **Clubs** (`app/clubs/index.tsx`, `app/clubs/edit.tsx`): CRUD + holiday muting.
- **Planner** (`app/schedule.tsx`): 14-day calendar; free evenings green,
  club/activity days blue (colour tokens `good` / `activity`).
- **Star shop** (`app/shop.tsx`): kid-facing buy screen. Affordable items are
  buyable; unaffordable ones show a green(have)/red(missing) progress bar. Buying
  records a redemption and navigates to `app/reward-earned.tsx`, a celebration
  that lists the good deeds behind the stars.
- **Negative balances**: redeeming/buying beyond the bank is allowed but shows a
  **red in-debt warning + confirm** (`redeem.tsx`); negative banks render red
  everywhere.
- **Pinky promises** (`components/PinkyPromise.tsx`, `app/promise.tsx`): type a
  promise, tap the wiggling pinky to seal it, log kept/broken. Surfaced on the
  child profile with a pending count.
- **“Do the same”** (`lib/lastAction.ts`, `store/useStore.ts`): the store
  remembers the last repeatable action (treat/penalty/star/redeem/club/promise)
  via `recordAction`. Opening a _different_ child’s profile within 5 min shows a
  banner that re-applies it (`applyLastActionTo`). Add `recordAction(...)` to any
  new repeatable action.
- **Home-screen shortcuts** (`lib/shortcuts.ts`): opt-in (`featureHomeShortcuts`)
  per-child app-icon quick actions via `expo-quick-actions`, deep-linking to
  `/kids/[id]` through `useQuickActionRouting()` in `app/_layout.tsx`. Synced in
  `store.reload()`. Platform note: iOS can’t place launcher icons — these appear
  on app-icon long-press; Android long-press actions can be pinned to the home
  screen. Adding this needs a native rebuild.
- **Onboarding tour** (`app/tour.tsx`): shown once on first launch (triggered
  from `index.tsx` when `settings.tourSeen === false`); replayable from Settings.
- **Optional features**: the four `feature*` flags gate the shop, promises,
  do-the-same and shortcuts so the UI stays simple. Screens read
  `useStore().settings` and hide entry points when off.

## Roadmap / ideas not yet built

- Per-child OS notification sounds would need one bundled sound per child (or
  copying user clips into the iOS `Library/Sounds` dir + per-child Android
  channels) — significant native work; currently deferred to the in-app screen.
- Star balance-over-time chart on `star-stats` (data + `Charts.tsx` exist).
- Automated Play Store submission (fastlane / Gradle Play Publisher) — see the
  release CI in `.github/workflows/`.
- Date-picker-based custom holiday ranges (currently duration presets to avoid a
  new native dependency).

## CI / release

`.github/workflows/` builds quality checks, Android APK + AAB, and an unsigned
iOS IPA, publishing to GitHub Releases. Android signing uses repo secrets
(`ANDROID_KEYSTORE_BASE64`, `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS`,
`ANDROID_KEY_PASSWORD`). Play Store needs the `.aab`.
