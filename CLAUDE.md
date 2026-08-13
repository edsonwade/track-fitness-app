# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A hypertrophy training app ("Vanilson Workout") for a 6-day split, used on a phone at the
gym. It tracks the plan, technique for every exercise, logged loads and reps, the user's
own **goals** and **trainers**, and a cross-user **Community** wall.

No build step, no package manager, no tests, no framework. Deployed as a static site on
GitHub Pages (`origin` = `github.com/edsonwade/track-fitness-app`); deploy = commit to
`main`. Persistence is browser-local (IndexedDB) with Supabase cloud sync.

**Design language.** Near-black layered surfaces (light theme: warm off-whites), a single
acid-lime accent, heavy condensed uppercase display type (Anton), and real photography of
real people throughout. Emoji are **not** decoration — 🔥 appears only as a reward when a
goal is reached or a streak is running. Everything else is a stroked SVG icon from the set
in `js/ui.js`.

**Language.** The whole app is bilingual EN/PT. New strings go through `t(key)`; there is
no pt-PT-only region any more.

`design/auth-prototype.html` is a standalone design reference, not part of the app.

## Running it

- `python -m http.server 8000`, then open `http://localhost:8000/`. (`.claude/launch.json`
  defines this as the `static` preview config.)
- Opening `index.html` directly over `file://` also works — CSS, JS, fonts and images are
  all local and load fine. Only the two CDN scripts fail, which means the gate cannot
  authenticate, so the app stays behind the sign-in screen. That is expected, not a bug.
- The only external code is `@supabase/supabase-js@2` and `chart.js@4`. Both are guarded
  (`window.supabase` / `window.Chart`). YouTube embeds are the third external host, and
  only load once the user taps play.

## File layout

The app used to be one 1,700-line `index.html`. It is now split; there is still no build
step, just ordered `<script>` tags.

| File | Contents |
|:---|:---|
| `index.html` | Static shell only: gate markup, `#view`, tab bar, `#sheet`, `#onboard`, script tags |
| `css/tokens.css` | Design tokens for both themes, type scale, spacing, motion, base reset |
| `css/app.css` | Every component |
| `css/gate.css` | Sign-in screen, scoped under `#gate` and gate-only classes |
| `js/data.js` | `EX`, `YT`, `CARDIO`, `DAYS`, `BLOCKS`, `prog()`, `I()`, `MUSNAME` — data only |
| `js/i18n.js` | `I18N`, `t()`, `L()`, `dtxt()`, `applyLang()`, `setLang()`, `exName()`, `musName()` |
| `js/photos.js` | The only file that names image files |
| `js/store.js` | `STATE`, `normState()`, IndexedDB, `saveState()`, Supabase, auth, CRUD |
| `js/shared.js` | The shared catalogue: `SHARED`, `catalogSync()`, realtime, shared writes |
| `js/community.js` | The Community wall: `COMMUNITY`, `communityPull()`, realtime, wall writes (state only, no rendering) |
| `js/ui.js` | All rendering, the event layer, onboarding, chart, router |

**Scripts must stay classic, not modules.** ES modules are fetched under CORS rules and
are blocked on `file://`, which would break opening `index.html` directly. Load order is
`data → i18n → photos → store → shared → community → ui`; `ui.js` kicks off `loadState()`
at the bottom. `shared.js` and `community.js` must come after `store.js` — they read `sb`,
`USER` and `SUPA_URL`/`t()`. Top-level `let`/`const` in classic scripts share one global
lexical scope, so cross-file references work without exports.

## Event layer

**There are no inline `onclick` attributes.** Two delegated listeners on `document` handle
everything:

```
data-act="name" [data-a1] [data-a2]   -> click,  dispatched through ACTIONS
data-inp="name" [data-a1] [data-a2]   -> input/change, dispatched through INPUTS
data-submit="name"                    -> submit (the gate's two forms)
```

To add behaviour, add an entry to `ACTIONS` or `INPUTS` in `js/ui.js` and reference it by
name from the markup. Handlers do **not** need to be global functions, and template
strings never contain executable code. Always run user-supplied text through `esc()`.

Rendering is string-templated `innerHTML` into `#view`; `rerender()` redraws the current
view. Two deliberate exceptions that must **not** re-render, because it would destroy
focus and scroll position mid-set: typing in a log field, and toggling a set chip (which
flips its own class directly).

## Data model

**Plan data.** An exercise appears twice:
- `EX[id]` — technique reference: `nPT`/`nEN`, `eq`, `pri`/`sec` muscles, `steps`,
  `errs` (`{e, c}`), `safe`, `breath`.
- `DAYS[n].items[]` — built by `I(exId, prog(sets, loadB1, rest, kind), note?)`.
  `prog()` expands one line into all four periodization blocks (b1 volume, b2 intensity,
  b3 heavy, dl deload) from per-`kind` rep/RPE tables, `kind` being
  `comp` | `acc` | `iso` | `core`. **Add exercises with `prog()`, never by hand-writing
  the four block objects.**

Adding an exercise means: an `EX` entry, a `YT` id, an `EX_PATTERN` entry in
`js/photos.js`, and an `I(...)` line in the right day.

**State shape** (normalised by `normState()`):

```js
{ ex: {"<day>:<block>:<exId>": {w, reps, done[], note}},  // keyed via exKey()
  sessions: [{id, date, dayName, block, entries[]}],
  custom:   {"<day>": [{id, name, eq, s, r, l, rest}]},
  ovr:      {"<day>:<exId>": {...}},                      // overrides on built-ins
  hidden:   {"<day>:<exId>": true},
  profile:  {name, photo, heightCm, weightStart, weightCurrent, weightTarget,
             trainingDays[], onboardedAt},
  trainers: [{id, name, photo, specialty, bio, phone, email, instagram,
              availability, notes, plans[], preferredDays[], sessions[], active}],
  goals:    [{id, title, type, unit, start, target, current, deadline, photo,
              notes, createdAt, hitAt}],
  theme, lang, restNote }
```

⚠️ **`ex`, `sessions`, `custom`, `ovr`, `hidden`, `restNote` and the `exKey()` format are
carried over from before the redesign and must not be renamed or reshaped** — they hold
the user's real logged weights and history, and a legacy backup must keep importing
cleanly. `normState()` is what makes an old backup work: it defaults every newer key.

**Any new persisted field must be defaulted in `normState()`**, or it silently vanishes
when state round-trips through an export/import or an older client.

Custom exercises log under the id `'c' + id`. Built-in and custom cards now share
`logBlock()` and `setChips()`, so logging behaviour cannot drift between the two paths.

**Goals.** `goalPct()` works in both directions — losing weight (99 → 85) and adding load
(60 → 120) both read 0% at the start and 100% at the target — so don't special-case
"descending" goals. `hitAt` is set on the crossing and cleared if the target moves back out
of reach; `updateGoal()` returns `justHit` so the 🔥 toast fires exactly once.

## Persistence and privacy

`saveState()` is debounced 200 ms and fans out to `saveLocal()` (IndexedDB store
`treinoVanilson`, `localStorage` mirror) **and** `cloudPush()`.

Cloud sync is one Supabase row per user: `user_state(user_id uuid pk, data jsonb,
updated_at)`, with RLS policies scoping every operation to `auth.uid()`. That is also what
makes each user's trainers and goals private — they are just keys inside the same private
`jsonb`, so no extra access control was needed. Strategy is last-write-wins:
`cloudPull()` on sign-in **replaces** `STATE` entirely.

`SUPA_URL` / `SUPA_ANON` are hardcoded near the top of the Supabase section in
`js/store.js`. The publishable key is public by design; security rests entirely on RLS.
**Never put a `service_role` key here.**

## Shared catalogue

`user_state` is private and stays private — logged weights, sessions, goals and trainers
never leave it. What is *common* to everyone lives in separate tables, created by
`supabase/001_shared_catalog.sql` (run by hand in the SQL editor):

| Table | Holds | Who may write |
|:---|:---|:---|
| `shared_exercises` | the exercise library, keyed by `ex_key` | any authenticated user |
| `shared_days` | the 7 days; `items` keeps the `DAYS[n].items` shape | any authenticated user |
| `exercise_images` | reviewed image registry → bucket `exercise-media` | any authenticated user |
| `catalog_edits` | audit trail, written only by a `security definer` trigger | nobody directly |
| `profiles` | display name, auto-created by a trigger on `auth.users` | owner only |

Four things about this that are load-bearing:

- **There is no `DELETE` policy on the shared tables.** Everyone can edit everything, so
  a hard delete would put the whole catalogue one tap from gone. Removal is
  `deleted = true`. Don't add a delete policy.
- **Every write carries the `version` it read** (`.eq('version', …)`, bumped by a trigger).
  Zero rows back means someone else got there first: reload and tell the user, never
  overwrite. `reportShared()` is the single place that turns that into a toast.
- **`applyShared()` merges into `EX`, `VIDEOS` and `DAYS` in place** rather than making
  the render layer aware of two sources. They are `const`, which forbids rebinding, not
  mutation. A published row wins over the built-in; a `draft` row never does, even for its
  own author.
- **Everything degrades to the local plan.** No tables, no network, no Supabase → `SHARED.ready`
  stays false and the app is exactly the pre-cloud app. That path must keep working; it is
  also what makes `file://` still usable.

Realtime is a single channel over the three tables; any event triggers a full
`catalogPull()` debounced 400 ms. Applying payloads event-by-event would be faster and
less reliable, and the row count here is in the dozens.

`seedCatalog()` publishes `data.js` into the empty tables once. After that the database is
the source of truth and `data.js` is the fallback plan. The button for it is in Profile →
Settings and only appears while the catalogue is empty.

**The exercise sheet has a scope toggle** (`exScope`, "Only me" / "Everyone"), rendered by
`scopeFieldHTML()` and only when `SHARED.ready`. It resets to `me` every time the sheet
opens — publishing to everyone must be a deliberate gesture, not a leftover from last
time. Like the set chips, `ACTIONS.exscope` flips its own classes instead of re-rendering,
because a re-render would wipe the fields the user already typed.

Scope `all` never writes to the private `STATE`. The one exception is promoting a custom
exercise: the shared row is created and the private copy is deleted, or the day would list
it twice. `exhide` stays private on purpose — "remove from my day" is a personal act, and
removing an exercise for everybody is a different, more dangerous one.

## Community wall

The Community feature (Phase 2) is the **inverse of `user_state`'s privacy model**: reads
are *cross-user* — everyone sees everything — which is what makes it a wall. It therefore
lives in its own tables (`supabase/002_community.sql`, run by hand, idempotent, depends on
`001`'s `profiles` for author names), never in `user_state`. Writes and deletes stay owner-
locked by RLS (`author = auth.uid()`), and as with the catalogue there is **no `DELETE`
policy** — removal is `deleted = true`.

| Table | Holds |
|:---|:---|
| `community_posts` | posts: `kind='note'` (free text) or `kind='goal'` (a `goal` jsonb *snapshot* `{title, pct, photo}`) |
| `post_comments` | comments on a post |
| `post_likes` | one like per person per post |

- `js/community.js` mirrors `shared.js`'s division of labour: **state, reads, realtime and
  writes only — it renders nothing.** All Community rendering lives in `ui.js`, like the
  rest of the app. It populates the `COMMUNITY` object (`posts`, `comments`, `likeCount`,
  `liked`, `names`, `members`) and nothing else.
- A `kind='goal'` post stores a **snapshot**, not a live reference, so sharing a goal never
  exposes the rest of the sharer's private state.
- `communityPull()` runs four selects in parallel. A failure on posts/comments/likes
  disables the wall (falls back to the static panel); a failure on `profiles` alone does
  not — names are cosmetic, so the wall stays up with a generic label.
- Same degradation contract as the catalogue: no tables / no network → `COMMUNITY.ready`
  stays false, and `file://` keeps working.

## Theming

Only CSS variables. `applyTheme()` sets `data-theme` on `<html>` (not `<body>`).

The accent is **two tokens and this matters**: `--acc-fill` is the bright lime used as a
*background* (always with `--acc-on-fill` text on it), and `--acc` is lime used for *text,
icons and borders* — and `--acc` is **darkened to `#4a6b00` in the light theme** because
bright lime on white is unreadable. Using `--acc-fill` as a text colour is a bug.
