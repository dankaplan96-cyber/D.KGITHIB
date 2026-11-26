# DRONE-CHARGE-SOUND · #58, the user's pick 26.11: the drone's wind-up gets its own sound

**Fault (Source).** Every drone played `zap` as its wind-up (the tell) began and `zap` again as the bolt left
(`enemies.js` Drone, chase → windup; FIGHTS58 §1.2 "The tell, heard"). By ear, aiming and firing were the same event.

**Fix.** A new sound, `droneCharge` (`src/engine/audio.js`, WebAudio synthesis like every other effect; no
recordings): a buzzing hum that climbs an octave and a fifth (170 → 510 Hz, triangle) while its flutter quickens
(16 → 38 a second), with a thin whine a twelfth above (510 → 1530 Hz, sine) and a faint crackle in the prongs
(band-passed noise, 1.5 → 3.2 kHz). It comes in at a third of its level within 40 ms, swells to full at 85 % of the
tell, and is silent at the tell's end, so the shot's `zap` (unchanged: a falling 1100 → 260 Hz chirp) lands on silence.
Rising where the zap falls; buzzing where the hero's own ball charge is a smooth sine.

| | |
|---|---|
| Event | the drone's state becomes `windup` (once per wind-up: `Drone._chargeSync`, not per frame) |
| Length | the tell: `tune.tell` × the difficulty's wind-up: 0.75 s (every later fight), 1.1 s (the Citadel and Zeelich depots, fight58 `a`), × 1.3 Gentle, × 0.85 Hard |
| Stops | at once when the wind-up ends by any way: the shot, lost sight or a fence (abort), a stagger, the pulse, Arthur's squeal, beaten (knocked out), sent away (`setPresent(false)`), a scene change (`resetCombat` → `audio.cutHeld()`); 25 ms fade, no click |
| Place | positional like the other enemy sounds (level by distance, side by camera), follows the drone while it sounds |
| Mix | pri 3 (a telegraph: never thinned or skipped for distance), gap 0 (two drones, two sounds), pitch ±1.5 %, level ±0.5 dB |
| Level (offline, 0 m, default sliders, dry) | peak -29.7 / -30.5 dBFS (0.75 / 1.1 s), 50 ms loudness -32.8 / -32.2 dB; the zap: peak -23.8 dBFS, -30.0 dB. Under the shot, well under the -12 dBFS ceiling |
| Cost | per wind-up 4 sources and ~8 nodes, released at the tell's end; at most two drones aim at once (the attack director) |

**Engine.** `audio.held(name, at, opt)` is `play()` (same throttle, priorities, distance, round-robin) for a sound that
may have to stop early: it returns `{ stop(fade), place(at) }`. `cutHeld()` stops all of them.

**Sweep (every drone, every chapter).** Every enemy of kind `drone` is a `Drone` (`createEnemy`), so the Citadel
depot (ch 2), the Zeelich depot (ch 3), the dig post (ch 4), condenser A (ch 5), the crowd-control yard (ch 8), the
hauler (ch 7, `model: 'hauler'`), the bore's and the shell's drones (ch 14, 15) and the developer yard's all take it.
The bore's guardian (`Guardian extends Drone`, its own wind-up of 1.35 − 0.15 × level s) takes it too, a fourth
lower for its bigger body, over its existing `alert` (its wind-up never played `zap`; its comment said "hums").

**Not changed, reported.**
- The guards' rifle (`guards.js`, state `aim`; Quetch, Grobo, FunFrock trooper): *automated*, its tell plays **no
  sound at all**; `zap` only at the shot (0.82 s after the aim began in the yard). Not the drones' fault (no shared
  sound) but the tell is silent: the ear gets no warning before a guard's bolt.
- The mite's wind-up and ice slide, and the crawler's slam wind-up, also open with `zap`, the drone's shot sound.

**Tests (automated runtime only, SwiftShader).**
- `SERVE=1 node tests/drone-charge.mjs` (new): 21/21 PASS. One charge per wind-up, no zap at its start, length 0.75 /
  1.1 / 0.975 s (Gentle) matching the tell; one zap at the shot and the charge stopped in that step, never longer than
  the time to the shot; cut in the same call when staggered, pulsed, squealed at, sent away, beaten, and at a scene
  change; panned right and at its distance for a drone to his right; the guardian's charge (1.2 s at level 1) with its
  alert, stopped at its shot. Offline: silent from the shot on (< -90 dBFS), silent 30 ms after a cut, swells to its
  end.
- `SERVE=1 node tests/combat.mjs`: 84/84 PASS, no errors. `SERVE=1 node tests/action-sound.mjs` (play()'s throttle,
  distance, telegraphs): 21/21 PASS.

**Listening file.** `captures/drone-sound/before-after.wav` (10.7 s, 48 kHz stereo; `tools/drone-charge-listen.mjs`),
rendered offline with the game's own engine (BEFORE: `audio.js` before this change; AFTER: this one), the drone 5.2 m
ahead and a little right, at the game's own level (peak -28 dBFS: turn up). Layout: BEFORE 0.75 s (wind-up 0.35 s, shot
1.10 s) · 1 s of silence · AFTER 0.75 s (2.65, 3.40) · 2 s · BEFORE 1.1 s (5.95, 7.05) · 1 s · AFTER 1.1 s (8.60,
9.70). **Nobody has listened to it.**
