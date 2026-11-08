# Action sound (wave 6, 2026-11-08)

What each player action and world event sounds like, why, and what was changed. Every effect is synthesised in
`src/engine/audio.js` (oscillators and filtered noise; no recordings, no original LBA sounds: provenance is the code
itself). Evidence levels follow `PROJECT_CONTRACT.md`. **Nobody has listened to any of this**: the numbers below are
measurements, and the listening files are for the user.

## How a sound is played now (`AudioEngine.play(name, at?)`)

| Rule | What it does | Where |
|---|---|---|
| One event, one sound | each sound has a **gap** (s): a second call in its group within the gap is merged (two contacts in one physics step, a frame asking again, several enemies alerting at once). The clock is the mean of real time and game time, so it runs at 1× in play, still moves in a pause, and steps with the simulation in a catch-up | `SND`, `play()`, `main.js` `audio.clock` |
| A blow is one sound | an enemy's `damage()` asks for `hit` and the blow's `impact()` for the material in the same step: `hit` waits 20 ms and gives way (`yield`) to the material | `SND.hit` |
| Priorities | pri 3 (outcomes and danger: hurt, items, doors, refusals, telegraphs, the catch) always plays; pri 2 (actions, combat) is skipped past 16 effects sounding; pri 1 (feet, ticks, the bonus pop) past 10 | `VOICES_MAX`, `VOICES_LOW` |
| Small variation | repeated sounds get ±2–5 % pitch and ±1–1.5 dB per take (feet most, hits and bounces less); musical cues (pickups, finds, stingers, interface) keep theirs exactly | `SND[...].vary` |
| A run of kashes | coins taken within 0.35 s of each other climb a pentatonic step each (0, 2, 4, 5, 7 semitones), then start again | `_coinStep` |
| Distance and side | a sound given `at` ({x, z}) is full within 4 m, then 4/d (-6 dB per doubling), panned by the camera's right (≤ 0.6); below 0.1 (40 m) a pri < 3 sound is skipped. Enemies, impacts, the ball's bounces and hits, knocked-out bodies are placed; the hero's own sounds and the interface are not | `_space`, `listen()` |
| Under a voice | the effects, their room and the ambience pass `fxDuck`, which steps back to 0.63 (-4 dB) while a line is spoken and returns 0.45 s after it (as the music's duck) | `duck()` |
| Tone | every tone and burst has a 2–6 ms attack (no switch-on click); square waves were replaced by triangles; a -5 dB shelf above 5.5 kHz on the effects | `_tone`, `_burst`, `_in` |
| Kept | the volume sliders (and their glide), `audio.out` (PAUSE-FADE), the music's duck, the voice chain | — |

## Inventory: event → before → now

Status per row: **Automated** = exercised by `tests/action-sound.mjs` or another suite in the game (headless,
SwiftShader); **Source** = changed and read in the code, not driven by a test; **Rendered** = measured offline
(`tools/sfx-render.mjs`).

| Event (trigger) | Before | Now | Why / status |
|---|---|---|---|
| **Magic ball** charge (combat.js, hold) | charge | charge (softer onset) | kept; Rendered |
| charge full | chargeFull | chargeFull | kept (the hero's own: the guardian no longer borrows it) |
| release (combat.js, at the throw's release) | throw / throwHeavy | throw / throwHeavy (lower, a small pop) | Rendered |
| bounce on a wall (actors.js `bounce('wall')`) | bounce (same as every bounce) | **bounceWall**: rubbery knock + the ball's rising chirp | wall ≠ ground ≠ enemy; Automated |
| bounce on the ground (`bounce('ground')`) | bounce | **bounceGround**: softer, lower | Rendered |
| strikes an enemy or a switch (`onHit`) | hit + the material (two sounds) | **ballHit** (a bright pling) + the material | a hit never sounds like a bounce; Automated |
| goes on to the next enemy (charged) | bounce | **ballChain** | Rendered |
| catches a bonus in flight | catch (then catch again at the hand) | **ballGrab** | the catch is heard once; Automated (one catch per throw) |
| back in the hand (`toHand`) | catch | catch (a hand's pock + two notes), pri 3, gap 0.2 | once per throw; Automated |
| recall | recall | recall | kept |
| **Sword** swing / heavy (combat.js, first active frame) | swing / swingHeavy | same, lower band | timing kept (ANIM-COMBAT's active frames); Rendered |
| sword / fist hits (impact by material) | hit + hitFlesh/… | the material only (`hit` yields) | one blow, one sound; Automated |
| blocked (`clang`) | clang (5 kHz highpass, hf 9 %) | clang: partials 990/1485/2670, scrape at 3 kHz | no harsh highs; Rendered |
| crystal enemy hit | hitCrystal (centroid 7 kHz, hf 39 %) | hitCrystal (1.6 kHz) | Rendered |
| fists (jab, kick, glove) | punch (2.3 kHz) | punch (air + a low thump) | Rendered |
| **Dodge** (combat.js) | whoosh (shared with the glider and the guardian) | **dodge** | Source + Rendered |
| dodged a blow (i-frames) | dodged | dodged | kept |
| **Jump** | jump (square) | jump (triangle + air) | Rendered |
| **Land** (hard landing) | land | land + the surface's step | by surface; Source |
| **Footsteps** by surface | step-grass was the loudest (12 kHz hiss); stone 2.9 kHz ticks | heel + grain, 9–20 dB under a voice line, varied | Rendered |
| **Hurt** | hurt (sawtooth) | hurt (thud + falling triangle), pri 3 | Rendered |
| **Death** | die | die (triangle) | an enemy no longer uses Twinsen's `die` (now `break`); Source |
| **Clover revive** | heal (the refill triad) | **revive** (the clover's four notes, lower) | Source |
| **Kash** | coin (square) | coin (two soft bells, the same B5–E6); a run climbs | Automated |
| **Heart** | heal | **pickLife** | Automated |
| **Magic flask** | heal | **pickMagic** | Automated |
| **Clover leaf** | heal | **pickClover** | Source |
| bonus pops out (giver, crate, enemy) / refuses (full) | bonus | bonus (pri 1) | kept |
| refill by a person / fountain / shop | heal | heal (bells) | kept |
| **Real object received** (I-24 found box) | chest (same as every chest and done task) | **found**: a rising C–E–G onto a held chord, ~1.1 s | distinct from loot; Automated (the cupboard) |
| a done task / small treasure (story) | chest | chest (bells) | kept |
| a story power (crystal, relay lit) | shard | shard (bells) | kept |
| **Room search**, something there | chest | **search** (rummage + pop) | Automated (ISO: base handler) |
| room search, nothing | chest (+ "Nothing here.") | **searchEmpty** (rummage + two falling notes) | Automated (ISO) |
| chapter 1 lockers | chest for all three | search for the plan's locker, searchEmpty for the others | Source |
| **Bins / planters** (giver hop) | bonus only | **rummage**, then bonus | Automated; hopping at an empty one: no rummage |
| **Door** walked through (houses, interiors, exits, Zeelich homes, the well) | door (1.2 s rumble) | **doorIn**: latch, hinge, the leaf shut | Automated (3× in and out) |
| a heavy door or gate a mechanism opens (story) | door | door (1.0 s, a thud at the end) | kept for mechanisms |
| **Locked / shut with a reason** (doors, the fort gate, sheds, Zeelich and island homes, the sewer's doors, the hostel door, the c1 gate, a cabinet) | deny (interface buzz) | **doorLocked** (the handle rattles, a thunk) | Automated (ISO: base handler) |
| a refusal that is not a door (no money, wrong answer, tripped) | deny (square) | deny (two soft falling notes) | Rendered |
| **Prompts** (HUD) | none | none | intended: a sound per prompt would chatter |
| **Levers** (workshop) | select / door | **lever** (ratchet + clunk) | Source |
| **Valves** (chapter 5, chapter 10, the sewer) | chest / select / ropeCreak | **valve** (squeak, clunk, hiss) / **valveShut** | Source |
| the old wheel (chapter 1) | grind | grind | kept |
| **Notice boards**, terminal boards, the pipe map | select | **paper** | Source |
| **Depot watch**: spotted | alert | alert (triangles, placed) | Source |
| depot watch: the guard's radio | blip (UI tick, -45 LUFS) | **radio** (squelch + click) | Source |
| **Guardian dive** (chapter 3): rise | charge + alert (the hero's charge) | **diveRise** (low engine climbing) + alert | its own telegraph; Source |
| lock (ring set) | chargeFull (the hero's full-charge chime) | **diveLock** (low two-tone warning, 0.9 s) | Source |
| drop | whoosh | **diveDrop** (falling whistle) | Source |
| impact | rumble + clunk | **diveImpact** (thud + hull ring), placed at the ring | Source |
| enemies: alert / windup (zap) / hit / break / slam | same names, never placed | same names, **placed** (distance, side) | Automated (distance) |
| knocked-out body lands | clunk / land (Twinsen's) / thump | clunk / hitStone / thump, placed | Source |
| **Ferry / ship** | horn, clunk / thump (travel film) | same (horn softer onset) | kept |
| **Fountains, wells** | positional water loop; drink: heal; dry: deny | same | kept |
| **Carts** | none (props) | none | no action on them |
| thunder, rumble, story household sounds | as they were | same (attack ramps; yap and rattle triangles) | kept |
| interface: blip, select, mode | square / triangle | triangles | Rendered |

## Measurements (Rendered; `tools/sfx-render.mjs`, OfflineAudioContext 48 kHz, default sliders, the effects' room)

See the run's `measurements.csv` (scratchpad, below) for every sound: peak, K-weighted 50 ms and 400 ms maximum
loudness, attack, decay, duration, spectral centroid, share above 5 kHz, share in the voice band, take-to-take spread.
References measured the same way: a voice line through the voice chain **-9.3 LUFS (50 ms max)**, the music at its
slider **-22.3**, ducked **-28.3**.

FILLED-IN-BY-THE-RUN

## Listening files (for the user; not heard by anyone here)

FILLED-IN-BY-THE-RUN

## What is left

FILLED-IN-BY-THE-RUN
