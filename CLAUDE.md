# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A hypertrophy training app ("Vanilson Workout", formerly "Treino Vanilson") for a 6-day split, used on a phone at the gym. The **entire application is a single file: `index.html`** (~1350 lines) — HTML + `<style>` + one `<script>`. No build step, no package manager, no tests, no framework.

**Language.** The auth screen is bilingual (EN default, PT switchable) via the `I18N` dictionary; **the rest of the app is still pt-PT only**. New strings inside the gate go through `t(key)` + a `data-i18n` attribute; new strings elsewhere are still written directly in pt-PT until i18n is extended to the app body.

`design/auth-prototype.html` is a standalone design reference for the auth screens — not part of the app, not loaded by it.

Deployed as a static site on GitHub Pages (`origin` = `github.com/edsonwade/track-fitness-app`). Persistence is browser-local (IndexedDB) with optional Supabase cloud sync.

## Running it

- Open `index.html` directly in a browser (`file://` works — everything except CDN scripts is inline).
- Or serve locally: `python -m http.server 8000` then open `http://localhost:8000/`.
- Deploy = commit to `main`; GitHub Pages serves the repo root.
- Two CDN `<script>` tags are the only external code: `@supabase/supabase-js@2` and `chart.js@4`. Both are optional at runtime — code guards with `window.supabase` / `window.Chart` checks — but with no internet the login gate blocks the app (see Auth gate below).

## Layout of `index.html`

Everything is delimited by banner comments (`/* ===== NAME ===== */`) — use those to navigate:

| Region | Contents |
|:---|:---|
| `<style>` (top) | CSS custom properties on `:root` (dark) and `body[data-theme="light"]`; sections `DASHBOARD`, `DAY VIEW` |
| `<body>` markup | Only static shells: auth gate `#gate`, top bar + `#daynav`, `#blockWrap` / `#view` (all dynamic content), add/edit-exercise modal `#exModal`, bottom nav `.bnav` |
| `ANIMAÇÕES` | `ANIM` — inline animated SVG stick figures keyed by movement pattern |
| `MAPA MUSCULAR` | `ZONES` + `bodySVG(pri,sec)` — highlights primary (lime) / secondary muscles |
| `BASE TÉCNICA DOS EXERCÍCIOS` | `EX` — the exercise encyclopedia; also `YT` (video ids), `ICON`, `CARDIO` |
| `PROGRAMAÇÃO` | `prog()` factory + `I()` item helper |
| `OS 7 DIAS` | `DAYS`, `BLOCKS` — the actual training plan |
| `PERSISTÊNCIA` | `STATE`, IndexedDB wrappers, `saveState()` |
| `SUPABASE` | client init, auth, `cloudPull` / `cloudPush` |
| `NAV / RENDER` | all rendering: `renderHome`, `renderDay`, `card`, panels, modal, custom exercises |
| INIT (last line) | `loadState().then(() => { applyTheme(); initCloud(); renderNav(); goHome(); })` |

## Architecture

**Rendering** is string-templated innerHTML, no virtual DOM. Module-level globals hold view state: `mode` (`'home'` \| `'day'`), `curDay` (1–7), `curBlock` (`b1`/`b2`/`b3`/`dl`), `openCard`, `openTab`. Every mutation handler ends by calling `renderHome()` or `renderDay()`, which rewrites `#view` wholesale. Handlers are wired via inline `onclick=` / `oninput=` attributes, so **any function called from generated markup must stay a global function declaration** — don't scope it or convert it to a module.

**Plan data model.** An exercise appears twice:
- `EX[id]` — static technique reference: `nPT`/`nEN` names, `eq`, `anim` (key into `ANIM`), `pri`/`sec` muscle arrays, `steps`, `errs` (`{e: error, c: correction}`), `safe`, `breath`.
- `DAYS[n].items[]` — built by `I(exId, prog(sets, loadB1, rest, kind), note?)`. `prog()` expands one line into all four periodization blocks (b1 volume, b2 intensity, b3 heavy, dl deload) using per-`kind` rep/RPE tables, where `kind` is `comp` \| `acc` \| `iso` \| `core`. **Add exercises by calling `prog()`, not by hand-writing the four block objects** — that keeps periodization consistent.

Adding a new exercise therefore means: an `EX` entry, an optional `YT` entry, an `ANIM` key that exists, and an `I(...)` line in the right `DAYS` day.

**State shape** (`STATE`, normalized by `normState()`):
```js
{ ex: {"<day>:<block>:<exId>": {w, reps, done[], note}},  // per-log, key via exKey()
  sessions: [{id, date, entries[]}],                       // saved history
  custom:  {"<day>": [{id, name, eq, s, r, l, rest}]},     // user-added exercises
  ovr:     {"<day>:<exId>": {...}},                        // overrides on built-ins
  hidden:  {"<day>:<exId>": true},                         // built-ins removed from a day
  theme: 'dark'|'light', restNote }
```
Custom exercises are logged under the id `'c'+id` and have parallel handlers (`onLogC`, `toggleSetC`, `setChipsC`, `customCard`). If you change logging behavior, change both paths.

**Persistence.** `saveState()` is debounced 200 ms and fans out to `saveLocal()` (IndexedDB store `treinoVanilson`, `localStorage` mirror as fallback) **and** `cloudPush()`. Cloud sync is a single Supabase row per user: `user_state(user_id uuid pk, data jsonb, updated_at)` with RLS policies scoping every operation to `auth.uid()`. Strategy is last-write-wins — `cloudPull()` on sign-in **replaces** `STATE` entirely. Any new persisted field must be defaulted in `normState()`, or it will be dropped when data round-trips through an older client or an import.

**Auth gate.** `#gate` is an overlay shown whenever `USER` is null, so in practice the app requires a Supabase session even though local storage would work standalone. `SUPA_URL` / `SUPA_ANON` are hardcoded near the `SUPABASE` banner; the anon/publishable key is public by design and security rests entirely on the RLS policies (see README). Never put the `service_role` key here. `validEmail()` gates registration against an allowlist of known email domains (`EMAIL_OK`); `authErr()` maps Supabase error strings to `t()` keys.

Visually the gate is its own design system — near-black `#121316` + orange `#ff8a4c`, pill inputs, `.acta` CTA — deliberately **not** the purple/cyan `--grad` used by the rest of the app. All gate styles are scoped under `#gate` or gate-only classes (`.gmark`, `.glang`, `.atg`, `.acta`, `.ghelp`, `.pwstr`) so they cannot leak. **`.gate-btn` is the one exception: it is shared with the exercise modal's Save button, so changing it changes the modal too.**

Validation is per-field: `gBad(fieldId)` / `gClr(fieldId)` toggle `.bad`, which reveals the field's `.ferr` message; `gateMsg()` writes the summary line. Field validation runs *before* the `sb` connectivity check so users get feedback offline. `authReset()` sends a Supabase password-recovery email.

**i18n.** `LANG` (persisted as `STATE.lang`, defaulted in `normState()`) selects a dictionary from `I18N`. `applyLang()` rewrites every `[data-i18n]` (textContent), `[data-i18n-ph]` (placeholder) and `[data-i18n-aria]` (aria-label) in the document, so extending i18n to the app body is a matter of adding keys + attributes — but note the app body is rendered by string-templated `innerHTML`, so those regions need `t()` calls inside the template functions instead. `initGate()` runs on boot (after `loadState()`, before `initCloud()`) to inject the eye icons and apply the language.

**Theming.** Only CSS variables — `applyTheme()` sets `body[data-theme]` and the light theme redefines the same vars. New styles must use `var(--…)` rather than literal colors, or light mode breaks. The Chart.js progress chart reads `STATE.theme` directly and is re-initialized (`initProgChart()`) after a theme toggle.
