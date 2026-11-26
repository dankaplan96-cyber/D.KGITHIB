# P93 — the Zeelich depot (chapter 2, the code cylinder)

The owner's brief (21.11): one LBA-style trick in the depot where Twinsen takes the code cylinder from the locker
(`c2_got_cyl`). A first-time player can finish without noticing it; an observant one hits the loose thing, sees the
guard turn, slips past, and feels the idea was theirs. Fix the throw where hand, origin and animation disagree.

Baseline: `75544b47` (branch `ccr-c1c2c4b9-dep6ed`). Everything below is **automated runtime only** (headless Chromium,
SwiftShader, `game.step`), or labelled **code only**. No real hardware, no frame-rate measurement of a display, no human
playtest.

## What a player meets now

- **The clue.** The red container on the east side of the yard has a loose door leaf. Now and then a gust swings it open
  (about 30°) and it bangs shut (`clunk`, placed at the doors). If the Grobo guard is on his round within 14 m he turns
  to it, stands a moment, and goes back to work. It reads with the sound off: the leaf visibly swings, the guard visibly
  turns. Nothing is written, nothing glows, no toast, no "!", no quest, nothing saved.
- **The trick.** The ball against those doors (either leaf, the end face and its corners) makes the same swing and bang.
  The guard leaves his round, walks to a spot in front of the doors, looks them over with his back to the gate-to-locker
  side of the yard, then rejoins his round at its nearest point. Only he reacts: the drones and the dog keep their rounds.
- **Not forever.** A hit while he is already checking does nothing more. A hit within 6 s of a check: he only glances.
  After two checks he only glances, until a minute passes with no knock.
- **The ordinary routes stay.** Fighting the watch is as before (their own pursuit and combat, nothing reset). Sneaking
  without the trick is possible with timing (4 of 8 bot starts); with it, easier (5–8 of 8). No magic is needed for the
  locker; a throw with no magic (a dud) still knocks the leaf from within its reach.

## Why the watch's rounds changed (the one larger change)

Before, the two drones, the guard and his dog all walked **one shared loop** round the middle of the yard (zeelich.js
`patrol`), so the way from the gate to the locker crossed all four twice. Measured with a foreseeing bot that knows the
rounds (tests/depot.mjs `foresee` / `safeWalk`): over 120 s the gate → middle leg was **never** clear in Discreet, even with
no safety margin; the middle → locker leg once. The old sneak bot got through 0–1 of 4 starts with or without a
distraction. Calling the guard off could not open anything: three others still crossed the way.

Now each has a beat (`depot.beats`, chapter2.js `enemyDefs`; the old `patrol` array is kept for the contract):

| who | beat (local x, z) |
|---|---|
| drones ×2 | east half, between the way and the red container: (18.0, 14.6) → (20.0, 14.6) → (20.0, 20.0) → (17.8, 20.2), half a loop apart |
| Grobo guard | the middle, gate to locker: (12.6, 11.4) ↔ (14.4, 21.2) |
| dog | its post by the shed (21.6, 20.2), facing the yard |

The guard is the one in the way, and the one the door can call off. No enemy added or removed; health, armour, damage,
sight and combat code untouched.

## The guard's behaviour (parameters)

| what | value | where |
|---|---|---|
| gusts | first 6 s after Twinsen comes within 36 m of the depot's middle, then every 17 / 23 / 19 s (repeating) | chapter2.js `DEPOT_GUST` |
| swing | 2.4 rad/s outward; spring 14, drag 1.0, bounce 0.35 → peak 0.52 rad, shut at 0.83 s (same at 30 and 60 FPS) | zeelich.js `swingLeaf` |
| gust reaction | guard on his round within 14 m: turns to the doors, 1.6 s, back to work | `DEPOT_EAR.glance`, `.look` |
| ball reaction | walks (1.4 m/s) to (21.2, 11.2), looks 4.0 s, rejoins his round at its nearest point | `DEPOT_EAR.check` |
| cool-down | a hit within 6 s of a check: a 1.2 s glance only | `.cool`, `.glanceBored` |
| boredom | after 2 checks: glances only; forgotten after 60 s with no knock | `.bored`, `.forget` |
| sight while checking | unchanged: anything he sees of Twinsen alerts him as on his round (`state` stays `patrol`) | guards.js `investigate` |

State card (guards.js, inside the `patrol` state, so every observer — the depot watch, the harness, the combat music —
still sees a calm guard):

```
patrol ──gust, ≤14 m──▶ look (turn to the doors, 1.6 s) ──▶ patrol (same waypoint)
patrol ──ball at doors──▶ go to stand ─▶ look 4 s ─▶ patrol (nearest waypoint)   [checks+1, cool 6 s]
   └── bored (≥2 checks) or cooling ──▶ look 1.2 s ─▶ patrol
any of these ──sees Twinsen──▶ alerted ▶ chase/aim/strike (unchanged)        hit / called by the others ──▶ ends it
```

## The throw (shared ball code: the owner's "small shared fix")

**Defect (measured, staged standing quick throw in the developer arena, `probe3`):** the planted throw is drawn one frame
ahead of the controller's clock (the rig adds the frame to `actionT`), and the ball was seated on that pose. So the
release pose depended on the frame rate:

| FPS | pose at release (s) | hand (ahead, up) m | ball origin (ahead, up, side) m |
|---|---|---|---|
| 30 (before) | 0.200 | 0.98, **1.13** | 0.98, **1.20** (raised to 1.2 m: 0.075 m *above* a hand already on its way down), +0.04 |
| 45 (before) | 0.200 | 0.98, 1.19 | 0.98, 1.20, +0.02 |
| 60 | 0.183 | 0.90, 1.54 | 0.90, 1.46, −0.19 (in the palm: hand − 0.08) |
| 120 | 0.175 | 0.68, 1.77 | 0.68, 1.69, −0.34 |

30 vs 60 FPS: the origin 0.37 m apart, the hand 0.42 m lower at 30. **Fix** (actors.js, ~25 lines): the ball leaves
from the hand where it was at the 60 FPS release pose (`REL_POSE` = 11/60 s), read between the last two drawn poses, and
flies the time since that instant in the release frame. After:

| FPS | ball origin (ahead, up, side) m | flown in the release frame |
|---|---|---|
| 30 | 0.83, 1.37, −0.15 | 0.017 s |
| 45 | 0.89, 1.42, −0.17 | 0.022 s |
| 60 | 0.89, 1.47, −0.19 (**unchanged**) | 0 |
| 120 | 0.69, 1.69, −0.34 (unchanged: it lets go before that pose) | 0 |

30 vs 60: 0.12–0.13 m apart (depot gateway, `I3`). Hand-to-origin offset is the palm's 0.08 m at the release pose at every
rate. No trajectory line, no input-timing change (the release frame, the controls' return at 0.36 s, the aim are as
before). Walking throws (the upper-body layer) are unaffected (their pose clock is already the controller's).

## Colliders round the depot

Baseline probe of the gateway plane (`probe`, ball-sized points vs. raycasts): no invisible extension of the doorframe —
the gate pillars' colliders are 0.60 × 0.60 m for 0.55 × 0.55 m drawn (0.025 m a side). The defects were the other way
and beside it:

| thing | before | after |
|---|---|---|
| gate pillars | collider top Y0+3.0; the brass caps and globes (to ~3.7) passable | top Y0+3.55 (the cap) |
| hazard beam over the gate (4.5 × 0.3 × 0.3 m at 3.05–3.35) | no collider: a high lob went through | box collider 3.05–3.35, above anyone's head |
| floodlight masts (pole 0.10–0.15 m) | r 0.40 for the ball: bounced off air 0.25 m from the pole | r 0.16 for the ball; the r 0.40 foot kept for walking only (`noBall`) |

`A4`: 24 throws by input through the gateway (8 spots × Normal / Athletic / Discreet): every wall bounce (25) within 0.4 m
of something drawn. Not changed (shared physics, ~0.1 m): a ball over a barrel's rim touches the collider's square corner.

Also found and fixed on the way: the moving leaf was first built inside the area group and the static-batch merge
(merge.js / drawbatch.js) took it in and turned it off (`layers` 0): it never drew. It is now marked `userData.keep`
(the builders' marker for moving parts); `A3b` checks it is drawn.

## Evidence

`GAME_URL=http://localhost:<port>/ node tests/depot.mjs` (fixture `base-05.save.json`, a save from before P93, origin
rewritten). Last full run: **29 functional + 1 visual passed, 0 failed, no errors**:

| | scenario | how | result |
|---|---|---|---|
| A | colliders, the leaf drawn, throws through the gateway | STAGED probes, INPUT throws | pass |
| B | 6 gusts: 0.52 rad, a `clunk` each; the guard (4 within 14 m) faces the doors in 0.2–0.5 s, back to work at 1.6 s; 2 further off ignored; drones/dog never react; no toast / "!" / dialogue | waiting outside in Discreet (STAGED start) | pass |
| C | ball from outside the gate's west post: knocked; the guard at his spot 8.8 s, looks 4 s facing the doors, back at the nearest waypoint; only him | INPUT | pass |
| D | Discreet to the locker unseen: with the throw 8/8 and 5/8 (two runs), without 4/8 and 4/8; once in full: throw, in, E (the cylinder and the plan back), out of the gate unseen | INPUT, STAGED starts, bot that waits for gaps it foresees | pass |
| E | a throw into the yard away from the doors: no knock, no check | INPUT | pass |
| F | hit during his check ignored; within the cool-down a glance; 2nd check; then glances (bored); a quiet minute later a check again | STAGED hits (the ball's own hit call) | pass |
| G | walking up in Normal: the watch's own pursuit; flags, chapter, place unchanged | INPUT | pass |
| H | no magic: the dud knocks the leaf from 4 m, the guard checks; E at the locker with mp 0 | INPUT, STAGED mp 0 | pass |
| I | 30 vs 60 FPS: swing peak 0.524 / 0.525 rad, shut 0.833 / 0.833 s; check 2.27 / 2.25 s at his spot, 6.27 / 6.25 s total; throw origin 0.126 m apart | Settings frame rate + step | pass |
| J | the cylinder saved; reload → Continue: kept, the locker no longer offered, the objective ticks it, the depot and its gusts as before; no new save field | INPUT, reload | pass |

Other runs (automated runtime only):

- `tests/playthrough/06-zeelich.mjs` from Baldino's workshop to chapter 4 (its Mill Lane steps left out: the Brel step
  fails its marker count on the baseline too — `markers: 1`, before P93), `ASSIST=1`: **PASS** — depot fight by input
  45 s, hp 11 → 9, 1 ISO assist (a drone); the locker; the three mill brakes by ball; the key, Zoé, the shield, Vesk, the
  console. Baseline, same slice: PASS — fight 53.5 s, hp 11 → 6, 0 assists. One run each.
- Bank shot (`14-shell.mjs` steps 1–2 from `base-14`, `sh_bal_teach` / `sh_bal_bank`): PASS at 60 FPS and with every step at
  1/30 s, 1 throw each.
- `ONLY=ball node tests/controls.mjs`: PASS (Classic landing at 30 = at 60 within 0.15 m; release height at 30 now
  1.40–1.47 m, was the 1.2 m floor). `node tests/anim-combat.mjs`: 35/35. `ONLY=D node tests/fps30.mjs`: PASS.
  `node tests/dialogue-check.mjs`: PASS (no text added).

Captures (`captures/depot/`, chapter 2 only, 1.2 MB): `before-` / `after-gate-view.gif` (the play camera at the gate; after:
from a gust with the guard near), `after-loose-door-closeup.gif` and `-grid.png` (a staged close camera on the doors, the
watch put away), `before-` / `after-throw-30fps.gif` and `-strip.png` (a staged side camera, frames 2–7 after the press at
30 FPS: the release pop sits at chest height before, at the shoulder after). Baseline frames from a copy of the tree with
the four changed files at `75544b47`.

## Files

- `src/game/zeelich.js` — the loose leaf (`swingLeaf`, the container's `loose` variant), gate pillar / beam / mast colliders,
  `depot.beats`, `depot.door`, contract comment.
- `src/game/story/chapter2.js` — `DEPOT_GUST`, `DEPOT_EAR`, `depotTick`, `depotBall` (from `ballHit`), `enemyDefs` on the beats.
- `src/game/guards.js` — `investigate()` / `stepInvestigate()` (opt-in; no other guard calls it).
- `src/game/actors.js` — `REL_POSE`, `poseClock`, `MagicBall.handWas`, the release in `step` (shared ball code).
- `tests/depot.mjs`, `captures/depot/*`, this file.

## Open risks / for review

- **The rounds changed** (above): the depot fight is now spread out rather than four on one loop. One bot run each says it
  is no harder; a person should play it. COMBAT-2's bolt-stagger note was measured on the old layout.
- The open leaf has no collider while it swings (~0.8 s): a ball can pass through it then.
- From outside the gate with Classic tank controls the doors are a narrow target (~4° from the west post); from inside the
  gateway, or with Modern aiming, wider. The aim assist still prefers an enemy in the cone.
- 120 FPS releases before the 60 FPS pose (0.22 m higher); uneven frame times were tested only through `fps30` D.
- `anim-combat.mjs` reads the hand at `launch` (the frame before the release is seated), not where the ball leaves — it
  could not see this defect.
- The gusts run while chapter 2 is the story's chapter; later chapters on Zeelich leave the leaf still.
- `guards.js` and `actors.js` are shared: partner / SMOOTH-1 review. `tests/README.md` has no line for `depot.mjs` yet
  (shared list, left to the coordinator).
