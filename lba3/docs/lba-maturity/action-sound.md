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

Every sound's peak, K-weighted 50 ms and 400 ms maximum loudness, attack, decay, length, spectral centroid, share
above 5 kHz, share in the voice band and take-to-take spread are in the run's `measurements.csv`. References: a voice
line through the voice chain, the music (Market Day) at its slider and ducked.

Run: `REF=a391e9c6 GAME_URL=http://localhost:8871/ node tools/sfx-render.mjs <out>` (a391e9c6: the build before this
pass). Before → after per event (the "before" is the sound the event used to make):

| Event | sound before → after | peak dBFS | loudness, 50 ms max (LUFS) | centroid Hz | > 5 kHz share | length ms | take spread dB |
|---|---|---|---|---|---|---|---|
| wall bounce | bounce → bounceWall | -20.5 → -22.6 | -28.8 → -30.3 | 859 → 575 | 0 → 0 | 55 → 70 | 0.3 → 1.5 |
| ground bounce | bounce → bounceGround | -20.5 → -27.2 | -28.8 → -33.6 | 859 → 446 | 0 → 0 | 55 → 60 | 0.3 → 1 |
| ball hits an enemy (both: + the material) | hit → ballHit | -19.5 → -24.7 | -26.5 → -30.3 | 559 → 1376 | 0.013 → 0 | 85 → 140 | 0.4 → 0.4 |
| catch | catch → catch | -22.4 → -27.3 | -29.4 → -34 | 1039 → 935 | 0 → 0 | 70 → 80 | 0.1 → 0.4 |
| throw | throw → throw | -35.5 → -31.3 | -43.8 → -39 | 1017 → 685 | 0.015 → 0.002 | 205 → 135 | 0.6 → 1.4 |
| swing | swing → swing | -32.4 → -28.9 | -41.7 → -38.7 | 1726 → 1072 | 0.035 → 0.009 | 100 → 105 | 1 → 2 |
| flesh hit | hitFlesh → hitFlesh | -17.2 → -21.6 | -28.6 → -28.3 | 179 → 160 | 0 → 0 | 70 → 70 | 1 → 1.8 |
| block | clang → clang | -13 → -20.1 | -22.6 → -28.2 | 2756 → 1133 | 0.092 → 0.001 | 200 → 240 | 0.3 → 1.5 |
| crystal hit | hitCrystal → hitCrystal | -14.7 → -25.1 | -23.8 → -31.6 | 6821 → 1668 | 0.37 → 0.003 | 100 → 185 | 0.2 → 1.8 |
| punch | punch → punch | -24 → -25.4 | -35.9 → -35.8 | 2093 → 406 | 0.057 → 0.004 | 50 → 50 | 1.8 → 1.5 |
| dodge | whoosh → dodge | -33.4 → -35.3 | -43.4 → -43.5 | 952 → 833 | 0.021 → 0.01 | 150 → 165 | 1.1 → 2.1 |
| step, stone | step-stone → step-stone | -32.9 → -32.6 | -43.9 → -44 | 3085 → 807 | 0.12 → 0.012 | 35 → 30 | 1.4 → 2.9 |
| step, grass | step-grass → step-grass | -26 → -31.4 | -33.4 → -42.3 | 12462 → 2842 | 0.835 → 0.135 | 75 → 60 | 0.5 → 2.4 |
| step, wood | step-wood → step-wood | -25.1 → -34.5 | -35 → -41.4 | 177 → 161 | 0 → 0 | 55 → 75 | 0.5 → 3.2 |
| step, metal | step-metal → step-metal | -27.9 → -34.6 | -36.7 → -43.9 | 1159 → 348 | 0.008 → 0 | 100 → 65 | 0.2 → 2.1 |
| land | land → land | -32.4 → -30 | -41.6 → -35.6 | 381 → 112 | 0 → 0 | 80 → 85 | 3.6 → 1.9 |
| hurt | hurt → hurt | -22.7 → -20.6 | -28.9 → -28.2 | 939 → 337 | 0.03 → 0 | 180 → 175 | 0.2 → 2.3 |
| kash | coin → coin | -28.4 → -28.8 | -30.1 → -32.7 | 2046 → 1279 | 0.066 → 0 | 225 → 240 | 0.2 → 0.4 |
| heart | heal → pickLife | -21.7 → -25.6 | -28.8 → -29.3 | 694 → 763 | 0 → 0 | 275 → 340 | 0.2 → 0.3 |
| flask | heal → pickMagic | -21.7 → -26.6 | -28.8 → -32.4 | 694 → 1142 | 0 → 0 | 275 → 280 | 0.2 → 0.3 |
| clover | heal → pickClover | -21.7 → -26.3 | -28.8 → -29.3 | 694 → 1288 | 0 → 0 | 275 → 565 | 0.2 → 0.2 |
| found object | chest → found | -21 → -20.6 | -27.3 → -26 | 595 → 876 | 0 → 0 | 485 → 1115 | 0.3 → 0.1 |
| search, something | chest → search | -21 → -26.4 | -27.3 → -32.6 | 595 → 903 | 0 → 0.001 | 485 → 535 | 0.3 → 0.9 |
| search, nothing | chest → searchEmpty | -21 → -27.7 | -27.3 → -37.1 | 595 → 312 | 0 → 0.001 | 485 → 560 | 0.3 → 0.7 |
| door walked through | door → doorIn | -26.7 → -24.9 | -30.4 → -30.6 | 236 → 138 | 0.004 → 0 | 970 → 515 | 2.1 → 0.4 |
| locked door | deny → doorLocked | -26.2 → -25 | -29.5 → -33.4 | 457 → 232 | 0.011 → 0 | 120 → 350 | 0.4 → 0.8 |
| valve | select → valve | -24.1 → -27.2 | -33.8 → -34.9 | 732 → 948 | 0 → 0.029 | 60 → 650 | 0.2 → 0.9 |
| notice board | select → paper | -24.1 → -34.1 | -33.8 → -41.3 | 732 → 1113 | 0 → 0.03 | 60 → 130 | 0.2 → 1.5 |
| radio | blip → radio | -36.3 → -28.5 | -44.6 → -38.9 | 1183 → 1311 | 0.039 → 0.007 | 45 → 310 | 0.1 → 0.7 |
| guardian lock | chargeFull → diveLock | -26.3 → -24.1 | -32.2 → -31.6 | 1907 → 347 | 0.009 → 0 | 200 → 835 | 0.3 → 0.2 |
| guardian impact (before: rumble + clunk; rumble measured) | rumble → diveImpact | -29.4 → -17.6 | -35.7 → -20.7 | 144 → 95 | 0 → 0 | 515 → 340 | 2.7 → 0.3 |
| enemy alert | alert → alert | -26.1 → -27.4 | -29.6 → -34.3 | 1593 → 936 | 0.045 → 0 | 180 → 185 | 0.1 → 0.3 |
| enemy windup | zap → zap | -29 → -27.4 | -34.3 → -33.6 | 2211 → 917 | 0.092 → 0.001 | 160 → 145 | 0.1 → 0.7 |
| break | break → break | -13.5 → -15.8 | -20.7 → -22.2 | 587 → 355 | 0.006 → 0.001 | 125 → 140 | 0.4 → 2.4 |
| slam | slam → slam | -17.1 → -18.6 | -20.2 → -21.4 | 87 → 90 | 0 → 0 | 260 → 265 | 0.8 → 0.8 |

References (measured the same way): voice line -9.3 LUFS (50 ms max), peak -4.4 dBFS; music -22.3 (ducked -28.3), peak -15.5.

| Scene | mix peak before → after | effects alone: peak | effects: 50 ms max | effects: 400 ms max | effects > 5 kHz |
|---|---|---|---|---|---|
| quiet | -3.9 → -3.9 | -24 → -23.8 | -30.4 → -30.6 | -34.4 → -39.1 | 0.007 → 0.002 |
| combat | -10.9 → -12.7 | -12.3 → -14.1 | -19.8 → -25.4 | -27.4 → -34 | 0.042 → 0.001 |
| pickups | -12.1 → -12.7 | -13 → -16.8 | -20.8 → -23.4 | -29.5 → -29.5 | 0.018 → 0 |
| machinery | -12.8 → -12.8 | -18 → -18.8 | -23.9 → -24 | -24.8 → -24.9 | 0.001 → 0 |

Loudest single effect after: -15.8 dBFS peak; every effect's 50 ms loudness is at least 11.4 dB under the voice line's.

Reading it:
- **Headroom.** The loudest single effect peaks at -15.8 dBFS (before: -13.0, the block's clang); scene mixes with the
  music peak at -12.7 dBFS or lower (the quiet scene's -3.9 is the voice line, unchanged). No effect is louder than a
  voice line: every effect's 50 ms loudness is 11.4 dB or more under it, and the effects step back a further 4 dB
  while a line plays. Nothing was normalised: a footstep stays 20+ dB under a slam.
- **Harsh highs.** The share of energy above 5 kHz fell from 0.84 / 0.38 / 0.15 / 0.09 (grass step, crystal hit,
  stone step, clang) to 0.10 or less everywhere; centroids of the stingy ones moved from 2–12 kHz to 0.4–2.6 kHz.
- **Repetition.** Take-to-take spread of repeated sounds rose from 0.1–0.7 dB (tonal sounds were identical every
  time) to 0.8–3.7 dB plus 2–5 % pitch; musical cues kept 0.1–0.3 dB (their signature unchanged).
- **Hierarchy of gains.** kash -32.9 < flask -32.7 < heart -29.3 ≈ clover -29.4 < found object -26.0 (and the found
  gesture is the only long one, 1.1 s). Search with something -32.6 is louder and brighter than with nothing -37.1.
- **Feet.** All surfaces within 2 dB of each other (-41.5 to -43.8 LUFS, 50 ms), about 33 dB under a voice line and
  14–21 dB under the music; before, grass was 10 dB louder than stone and a 12 kHz hiss.
- **Combat scene.** The effects are 5.6 dB lower short-term (−19.8 → −25.4): the repeated contact (4 hits in 20 ms)
  is one hit, a blow is one sound not two, and enemies 7 and 15 m off are quieter. Whether that is too quiet against
  the combat music is a listening question (below).


## Listening files (for the user; not heard by anyone here)

In the session scratchpad (`.../scratchpad/sound/listen/`, not in the repository): `ab-ball`, `ab-sword-fists`,
`ab-feet`, `ab-pickups`, `ab-search-doors`, `ab-machines-world`, `ab-guardian-dive`, `ab-damage-ui` (each: the old
sounds, a pause, the new ones, in the same order) and `scene-{quiet,combat,pickups,machinery}-{before,after}`, MP3 and
WAV, with `LISTEN.txt` saying what to listen for. **Listening status: not listened to.**

## What is left

- **Listening** (the user): every judgement of timbre, the combat level against the combat music, whether the feet
  are audible enough on laptop speakers, whether the coin run is pleasant or fussy on the tenth crate.
- **Played** checks: nothing here was played by a person; in-game checks are Automated runtime only (SwiftShader).
- **Guardian dive** sounds are Source + Rendered only: no suite drives the overloaded guardian's dive and listens to
  which cues fire (`tests/chapter3.mjs` plays the fight).
- **Not placed**: sounds the story plays for its own machinery (`clunk`, `grind`, `door`, `rumble` in story files)
  still play at full level wherever the hero is; most fire beside him. Placing them needs their positions in each story.
- Some story `chest` calls still mean "a task done" rather than an item: they are distinct from `found` now, but not
  from each other.
- Ambient loops (water, machine, story loops) were not changed; the depot watch's spotted cue is still the generic
  `alert`.
- `tests/combat.mjs` "dodge distance consistent at 30 and 60 fps" fails identically before this pass (a391e9c6:
  `{"d30":0,"d60":1.56}`): not caused by it, not fixed here.
- `tests/sewers.mjs` fails the same three well-house lift checks before this pass (a391e9c6) and after: not caused by
  it, not fixed here.

## Tests (Automated runtime, headless SwiftShader, 2026-11-08)

Pass: action-sound (21), audio (6), music (26), voices (27), ball-close (6), anim-combat (35), depot-watch (11),
items-ceremony (20), containers (41), chapter1 (23), chapter3 (36), chapter4 (54), door-sweep (5). combat: 75/76 and
sewers: 27/30, the same failures as on a391e9c6 (above).

## Files

`src/engine/audio.js` (the engine, the cues), `src/main.js` (impact placement, pickups, doors, the bin's rummage, the
listener, the clock), `src/game/actors.js` (the ball, landing, the clover revive, an enemy's death), `combat.js`
(dodge), `enemies.js`, `guards.js`, `guarddog.js`, `dogs.js`, `death.js` (placement, the guardian's dive), `found.js`,
story files for doors, searches, valves, levers, boards and the radio; `tools/sfx-render.mjs`; `tests/action-sound.mjs`.
