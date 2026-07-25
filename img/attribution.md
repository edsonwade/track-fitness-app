# Photography credits

All photographs are from **Pexels** (https://www.pexels.com) and used under the
[Pexels License](https://www.pexels.com/license/), which permits free use and
modification, including commercially, without attribution. Credits are listed
anyway as a courtesy to the photographers.

Each file is served at 1000 px wide via the Pexels CDN transform
(`?auto=compress&cs=tinysrgb&w=1000`) and stored locally so the app needs no
external image host and works offline.

> ⚠️ **The `coach-*`, `goal-*` and `onboard-*` presets are still the provisional
> set** — chosen before Pexels search was usable, so several of them are the same
> photograph under two names. They are decorative (a user picks one for an avatar
> or a goal cover) and none of them is subject-wrong, so they are safe to ship,
> but they still want a curated pass.
>
> The `pat-*` and `day-*` rows below were re-picked with search working and each
> one was inspected on a contact sheet before install. That step is what the first
> pass lacked: the old `pat-hinge.jpg` was a jeep parked on a volcano, because a
> Pexels search for "hip thrust" returns fighter jets and the result was taken on
> trust. **Look at the photograph before committing it.**

| File | Pexels photo ID | Source |
|:---|:---|:---|
| `pat-squat.jpg` | 13106588 | https://www.pexels.com/photo/13106588/ |
| `pat-hinge.jpg` | 4720792 | https://www.pexels.com/photo/4720792/ |
| `pat-press-flat.jpg` | 3916762 | https://www.pexels.com/photo/3916762/ |
| `pat-press-incline.jpg` | 4047156 | https://www.pexels.com/photo/4047156/ |
| `pat-press-overhead.jpg` | 29865137 | https://www.pexels.com/photo/29865137/ |
| `pat-pull-vertical.jpg` | 3888409 | https://www.pexels.com/photo/3888409/ |
| `pat-row.jpg` | 11876626 | https://www.pexels.com/photo/11876626/ |
| `pat-biceps.jpg` | 31618281 | https://www.pexels.com/photo/31618281/ |
| `pat-triceps.jpg` | 6243176 | https://www.pexels.com/photo/6243176/ |
| `pat-shoulder-raise.jpg` | 29793977 | https://www.pexels.com/photo/29793977/ |
| `pat-calves.jpg` | 9152547 | https://www.pexels.com/photo/9152547/ |
| `pat-core.jpg` | 416778 | https://www.pexels.com/photo/416778/ |
| `pat-cardio-tread.jpg` | 1954524 | https://www.pexels.com/photo/1954524/ |
| `pat-cardio-bike.jpg` | 4162580 | https://www.pexels.com/photo/4162580/ |
| `day-1.jpg` | 29259728 | https://www.pexels.com/photo/29259728/ |
| `day-2.jpg` | 17626051 | https://www.pexels.com/photo/17626051/ |
| `day-3.jpg` | 14604685 | https://www.pexels.com/photo/14604685/ |
| `day-4.jpg` | 32085379 | https://www.pexels.com/photo/32085379/ |
| `day-5.jpg` | 11191177 | https://www.pexels.com/photo/11191177/ |
| `day-6.jpg` | 20418621 | https://www.pexels.com/photo/20418621/ |
| `day-7.jpg` | 209969 | https://www.pexels.com/photo/209969/ |
| `coach-1.jpg` | 1681010 | https://www.pexels.com/photo/1681010/ |
| `coach-2.jpg` | 6551136 | https://www.pexels.com/photo/6551136/ |
| `coach-3.jpg` | 1552242 | https://www.pexels.com/photo/1552242/ |
| `coach-4.jpg` | 1638324 | https://www.pexels.com/photo/1638324/ |
| `coach-5.jpg` | 5327471 | https://www.pexels.com/photo/5327471/ |
| `coach-6.jpg` | 1480520 | https://www.pexels.com/photo/1480520/ |
| `goal-1.jpg` | 1552242 | https://www.pexels.com/photo/1552242/ |
| `goal-2.jpg` | 2261477 | https://www.pexels.com/photo/2261477/ |
| `goal-3.jpg` | 416778 | https://www.pexels.com/photo/416778/ |
| `goal-4.jpg` | 1954524 | https://www.pexels.com/photo/1954524/ |
| `goal-5.jpg` | 4162449 | https://www.pexels.com/photo/4162449/ |
| `goal-6.jpg` | 221247 | https://www.pexels.com/photo/221247/ |
| `onboard-welcome.jpg` | 1552103 | https://www.pexels.com/photo/1552103/ |
| `onboard-body.jpg` | 1638324 | https://www.pexels.com/photo/1638324/ |
| `onboard-days.jpg` | 3837781 | https://www.pexels.com/photo/3837781/ |
| `onboard-goal.jpg` | 2261477 | https://www.pexels.com/photo/2261477/ |
| `onboard-trainer.jpg` | 1681010 | https://www.pexels.com/photo/1681010/ |

## Per-exercise photography (curated)

Unlike the `pat-*` stand-ins above, each of these was chosen for **this specific
movement on this specific equipment**, and every file was opened and looked at
before being wired up. That was not caution for its own sake: search alt text
called a seated calf raise a "leg exercise", and a search for "calf raise"
returned mostly photographs of cattle.

The last three have no exercise id of their own — they are reached by name, from
exercises the user types, via `TEXT_EX` in `js/photos.js`.

Still on a movement pattern: `birddog` (which no day lists, so it draws no card)
and the two cardio entries, whose pattern photo is a treadmill and a bike — the
right subject. (`legpress_h` deliberately shares `ex-legpress.jpg` — same
machine, feet placed high.)

**`ex-pallof.jpg` is the one file here that is not a Pexels still.** No free
stock library has a Pallof press: Pexels returns clothes irons, doorbells and
elevator buttons; Wikimedia Commons has nothing; Openverse has exactly one,
licensed `by-nc-nd`. Every near-miss inspected — band pull-aparts, cable
crossovers, a TRX split squat — was a *different* exercise, which is worse than
a pattern photo, not better. So the photo is a frame taken from the demonstration
video the card already plays, credited below. Photo and video are then the same
rep of the same exercise, which is the whole point. The frame is stored locally
like everything else; nothing is hotlinked and no image service is called at
runtime.

| File | Exercise | Pexels photo ID | Source |
|:---|:---|:---|:---|
| `ex-legpress.jpg` | Leg Press 45° | 6539793 | https://www.pexels.com/photo/6539793/ |
| `ex-hack.jpg` | Hack Squat | 11191173 | https://www.pexels.com/photo/11191173/ |
| `ex-legext.jpg` | Leg Extension | 19722966 | https://www.pexels.com/photo/19722966/ |
| `ex-lunge.jpg` | Dumbbell Lunge | 29825222 | https://www.pexels.com/photo/29825222/ |
| `ex-dbrdl.jpg` | Romanian Deadlift | 29825217 | https://www.pexels.com/photo/29825217/ |
| `ex-hipthrust.jpg` | Hip Thrust (barbell, back on bench) | 13122465 | https://www.pexels.com/photo/13122465/ |
| `ex-legcurl_seat.jpg` | Seated Leg Curl | 28731788 | https://www.pexels.com/photo/28731788/ |
| `ex-legcurl_l.jpg` | Lying Leg Curl | 6539840 | https://www.pexels.com/photo/6539840/ |
| `ex-calf_s.jpg` | Standing Calf Raise | 13965339 | https://www.pexels.com/photo/13965339/ |
| `ex-calf_seat.jpg` | Seated Calf Raise | 9152547 | https://www.pexels.com/photo/9152547/ |
| `ex-dbbench.jpg` | Dumbbell Bench Press | 15917308 | https://www.pexels.com/photo/15917308/ |
| `ex-incldb.jpg` | Incline DB Press | 29526383 | https://www.pexels.com/photo/29526383/ |
| `ex-pecdeck.jpg` | Pec Deck | 3838937 | https://www.pexels.com/photo/3838937/ |
| `ex-dbohp.jpg` | DB Shoulder Press | 7289236 | https://www.pexels.com/photo/7289236/ |
| `ex-lateral.jpg` | Lateral Raise | 29793977 | https://www.pexels.com/photo/29793977/ |
| `ex-reardelt.jpg` | Reverse Fly | 5327464 | https://www.pexels.com/photo/5327464/ |
| `ex-pulldown.jpg` | Lat Pulldown | 31329758 | https://www.pexels.com/photo/31329758/ |
| `ex-strarm.jpg` | Straight-Arm Pulldown | 37906858 | https://www.pexels.com/photo/37906858/ |
| `ex-csrow.jpg` | Chest-Supported Row | 4162482 | https://www.pexels.com/photo/4162482/ |
| `ex-seatedrow.jpg` | Seated Cable Row | 11876626 | https://www.pexels.com/photo/11876626/ |
| `ex-facepull.jpg` | Face Pull | 31818704 | https://www.pexels.com/photo/31818704/ |
| `ex-dbcurl.jpg` | Dumbbell Curl | 14793884 | https://www.pexels.com/photo/14793884/ |
| `ex-hammer.jpg` | Hammer Curl | 6455960 | https://www.pexels.com/photo/6455960/ |
| `ex-cablecurl.jpg` | Cable Curl | 17559309 | https://www.pexels.com/photo/17559309/ |
| `ex-pushdown.jpg` | Triceps Pushdown | 6243176 | https://www.pexels.com/photo/6243176/ |
| `ex-ohext.jpg` | Overhead Cable Extension | 29218854 | https://www.pexels.com/photo/29218854/ |
| `ex-skull.jpg` | Lying Triceps Extension | 18060023 | https://www.pexels.com/photo/18060023/ |
| `ex-plank.jpg` | Plank | 4944959 | https://www.pexels.com/photo/4944959/ |
| `ex-legraise.jpg` | Hanging Leg Raise | 38641936 | https://www.pexels.com/photo/38641936/ |
| `ex-cablecrunch.jpg` | Cable Crunch | 3930989 | https://www.pexels.com/photo/3930989/ |
| `ex-crossover.jpg` | Cable Crossover (by name) | 10754974 | https://www.pexels.com/photo/10754974/ |
| `ex-chestpress.jpg` | Chest Press machine (by name) | 3838926 | https://www.pexels.com/photo/3838926/ |
| `ex-rowdb.jpg` | Dumbbell Row (by name) | 38641891 | https://www.pexels.com/photo/38641891/ |
| `ex-cgbench.jpg` | Close-Grip Bench Press | 3837788 | https://www.pexels.com/photo/3837788/ |
| `ex-dip.jpg` | Parallel Bar Dip | 8520085 | https://www.pexels.com/photo/8520085/ |
| `ex-kickback.jpg` | Cable Triceps Kickback | 29778851 | https://www.pexels.com/photo/29778851/ |
| `ex-bbrow.jpg` | Bent-Over Barbell Row (by name) | 14591532 | https://www.pexels.com/photo/14591532/ |
| `ex-pecdeck.jpg` | Pec Deck | 21633399 | https://www.pexels.com/photo/21633399/ |

### Not from Pexels

| File | Exercise | Source |
|:---|:---|:---|
| `ex-pallof.jpg` | Pallof Press | Frame from "Exercício: Pallof Press" by **Wallace Leite Personal** (https://www.youtube.com/@wallaceleittepersonal), the same video the card plays — https://www.youtube.com/watch?v=91zJZhRx2u0 |

> **Checking for repeats needs eyes, not hashes.** `ex-kickback.jpg` was first taken
> from photo 29218854 — which is already `ex-ohext.jpg`. Downloaded at a different
> width it had a different checksum, so a byte-comparison pass reported "no
> duplicates" while day 2 showed the same man in the same maroon shirt twice. Tile
> the set into a contact sheet and look at it; that is the only check that works.
>
> The same pass caught a second kind: `ex-pecdeck.jpg` and `ex-chestpress.jpg` were
> two different photo IDs from **one shoot** — same model, same gym, same machine,
> minutes apart — sitting two cards apart on day 4. Neighbouring Pexels ids
> (`3838926` / `3838937`) are a warning sign of exactly this, so prefer candidates
> from unrelated id ranges when two exercises land on the same screen.
