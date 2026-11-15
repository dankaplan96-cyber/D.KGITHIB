# ACTION-SOUND-2 (P24, 14.11.2026)

The user (14.11): "add a task for sounds, say for the ball, the sword and so on." This pass builds on
[action-sound.md](action-sound.md) (wave 6: the play() rules, priorities, gaps, distance, the duck under a voice, the
first event inventory). Nothing there was replaced; the gaps it left in the player's own actions were filled.

**Evidence: Automated runtime only; nothing listened to.** Every number below is a measurement of the game's own
synthesis (headless Chromium, SwiftShader, OfflineAudioContext at 48 kHz). The listening files are for the user.

Provenance: every sound is synthesised in `src/engine/audio.js` (oscillators and filtered noise). No recording, no
sample, nothing from LBA1 or LBA2 files. The code is the source.

## Inventory before this pass (build `ccr-c1c2c4b9-dep6ed`, `3e8532d5`)

| Family | Had its own sound | Silent | Repeated / mismatched / harsh |
|---|---|---|---|
| Magic ball | throw, heavy throw, charge, full charge, wall bounce, ground bounce, hit on an enemy (pling + material), chain, bonus grab, recall, catch | into the sea; on its way home by itself | one bounce for every surface (stone, wood, metal, grass alike); a throw with no magic sounded like a full one, and its one contact chirped like a bounce though it never bounces; the catch was kept single only by a 0.2 s gap |
| Sword and weapons | swing, heavy swing, full charge, clang on a block | drawing and putting away (every weapon got the same `equip` click) | a blade through flesh = a fist's thud; the blowgun, laser and lightning played outside `play()` (no gap, no priority, no voice count, no variation, invisible to tests); the laser a saw wave, the lightning a square wave and a 4.2 kHz crack (onset click 0.22–0.32 of peak) |
| Fists, kick, moves | jab, dodge, the dodged blow, jump, hard landing, behaviour change, footsteps | Discreet walking (no step at all), hiding, a step down off a ledge | the kick = the jab; the glove's jab = the jab; the glove's heavy punch = the sword's heavy swing |
| Pick-ups, damage, containers | kash (a run climbs), heart, flask, clover, crystal, found object, hurt, death, clover revive, bonus pop, rummage | low life; a hop at a container already searched | one rummage for a bin, a barrel, a crate and a suitcase |
| Tools (pocket set, lance, fork, line, heat flask) | each had its synthesis | — | played outside `play()`; the squeal and the reel square waves |
| Story machinery | — | `motor`, `winch`, `trickle`, `steam` were asked for by `zeelift.js`, `netline.js`, `digtest.js`, `answer.js` and played nothing (no such sound existed) | — |
| Variation | ±2–5 % pitch and ±1–1.5 dB per take | — | a noise sound had the same colour every take |

## What changed

| Event (trigger, file) | Before | Now | Status |
|---|---|---|---|
| ball bounce on stone ground (`MagicBall.bounce('ground')`, actors.js) | bounceGround | **bounceStone**: hard short knock + the ball's chirp | Automated (the yard's floor) |
| … on wood / metal ground | bounceGround | **bounceWood** (hollow) / **bounceMetal** (small ring) | Automated (surface map forced) |
| … on grass or dirt | bounceGround | bounceGround (kept) | Automated (forced) |
| ball at a wall | bounceWall | bounceWall for stone; **bounceMetal** for a fence or railing (a see-through collider); **bounceWood** for a post, trunk or planter box; a metal room's walls metal | Automated (the yard's stone wall; the depot fence in action-sound.mjs) |
| ball into the sea | silence | **ballSplash** (a plop, a rising bubble) and a few drops | Automated (Citadel's shore) |
| ball without magic: the throw | throw | **throwDud**: the air only, softer (-5 dB), a short falling note | Automated |
| … its one contact | bounceWall's chirp | **ballDud**: a dull knock, no chirp | Automated |
| ball on its way home by itself (last bounce, a hit, out of range) | silence | **ballReturn**: a soft drawn-in breath, pri 1, once a throw, only from further than 3 m | Automated |
| the catch | catch, single by its 0.2 s gap | catch, single **per throw** (`MagicBall.caught`, set by the launch): a second `toHand` is silent | Automated |
| sword drawn (`HeroCombat.equip`, combat.js) | equip | **swordDraw**: a blade on the scabbard's mouth, a small ring | Automated |
| sword put away (another weapon taken) | equip | **swordSheathe**: the slide back, a clack; then the new weapon's own | Automated |
| a blade through flesh (`land()` → `impact(..., by)`, main.js) | hitFlesh | **slashFlesh**: the body's thud + a short dry cut | Automated |
| a fist on flesh | hitFlesh | hitFlesh (kept; never the cut) | Automated |
| kick | punch | **kick**: bigger, lower (+4 dB short-term over a jab) | Automated |
| glove jab / heavy | punch / swingHeavy | **gloveJab** / **gloveHeavy**: leather and weight | Automated |
| ball, fists, glove taken in hand | equip | **equipBall** (a glint), **equipFists** (two knuckle taps), **equipGlove** (leather, a strap) | Automated (fists, glove) |
| Discreet walking (actors.js footsteps) | silence | **step-sneak**: a soft pat, 6–8 dB under a step | Automated |
| hiding (Discreet, action held) | silence | **hide**: cloth drawn in, once as he crouches | Automated |
| a step down off a ledge (landing, not a jump's) | silence | **landSoft**: a light double tap | Automated |
| life falling under a third (`Hero.damage`) | silence | **lowLife**: two low heartbeats, once per fall (not again while low) | Automated |
| a container searched (`giverHop`, main.js) | rummage | by kind: **rummageBin** (tin lid), **rummageBarrel** (hollow), **rummageCrate** (wood; trunks too), **rummageCase** (latches); older givers by id | Automated (a bin) |
| a hop at a container already searched | silence | **rummageEmpty**: a lighter rummage and the shrug | Automated |
| blowgun, laser, lightning (weapons.js) | direct synthesis | through `play()`: **wDart**, **wLaser** (triangle, no saw), **wLightning** (crack under 3 kHz, triangle under it) | Automated |
| the tools (tools.js) | direct synthesis | through `play()`: **tPip** … **tFizz** (same design; squeal and reel triangles; steam and fizz band-passed) | Automated (jet, pip) |
| story `motor`, `winch`, `trickle`, `steam` | nothing | short one-shots of those names | Rendered |
| repeated sounds | random pitch and level | + **round-robin**: the noise filters' colour steps ×1 / ×1.11 / ×0.91 per take (steps, swings, punches, kicks, hits, bounces, landings); tones keep their pitch, so signatures stay | Rendered (take spread below) |

Kept as they were: the play() rules (gaps, priorities, voice limits 16 / 10, distance, side), the duck under a voice
(-4 dB), the sliders and their glide, the music bus, the voice chain, every pickup's musical cue, `found`, the
ambience. No bus was added or moved (the music and voice buses are untouched). No save field and no setting was
added; old saves load as before.

## Measurements

Run: `GAME_URL=http://127.0.0.1:8980/ REF=ccr-c1c2c4b9-dep6ed node tools/action-sound-2-listen.mjs <out>` (in
`captures/action-sound-2/measurements.json`). Default sliders (master 0.8, effects 0.8), through the effects bus and
its room. Loudness K-weighted: 50 ms and 400 ms (momentary) maxima. Click: the largest sample-to-sample step in the
first 2 ms after the onset, as a share of the peak (a switched-on tone would be near 1).

References: **voice line** peak -4.4 dBFS, 50 ms -9.3 LUFS, 400 ms -11.7; **music** (Market Day at its slider) peak
-15.5, -22.3 / -23.3; music ducked under a line -28.3 / -29.4.

| Sound (now) | the event before | peak dBFS | 50 ms LUFS | 400 ms LUFS | click | length ms | take spread dB |
|---|---|---|---|---|---|---|---|
| bounceStone | bounceGround -27.0 / -33.5 | -23.9 | -31.8 | -40.8 | 0.08 | 71 | 2.1 |
| bounceWood | bounceGround -25.7 / -32.8 | -23.3 | -28.8 | -37.8 | 0.03 | 94 | 1.3 |
| bounceMetal | bounceWall -22.6 / -29.4 | -24.6 | -31.5 | -40.3 | 0.06 | 135 | 0.4 |
| bounceWall | bounceWall -21.5 / -29.5 | -22.4 | -29.6 | -38.7 | 0.04 | 73 | 1.4 |
| bounceGround | bounceGround -26.8 / -34.1 | -27.4 | -34.2 | -43.2 | 0.03 | 83 | 2.0 |
| ballSplash | silence | -26.9 | -34.8 | -43.0 | 0.05 | 172 | 2.7 |
| throwDud | throw -31.7 / -39.0 | -37.1 | -45.2 | -53.6 | 0.05 | 146 | 0.9 |
| ballDud | bounceWall -22.4 / -29.2 | -26.2 | -33.7 | -42.7 | 0.02 | 75 | 1.9 |
| ballReturn | silence | -39.3 | -44.5 | -52.7 | 0.00 | 184 | 1.6 |
| catch | catch -26.0 / -33.3 | -27.1 | -33.5 | -42.4 | 0.06 | 88 | 1.1 |
| swordDraw | equip -27.2 / -38.4 | -31.4 | -36.4 | -43.6 | 0.01 | 449 | 1.0 |
| swordSheathe | equip -27.8 / -38.7 | -26.7 | -36.7 | -45.4 | 0.01 | 237 | 2.9 |
| swing | swing -28.2 / -39.0 | -33.7 | -41.7 | -50.6 | 0.13 | 116 | 4.1 |
| slashFlesh | hitFlesh -19.5 / -27.9 | -19.7 | -27.8 | -36.8 | 0.04 | 70 | 3.9 |
| kick | punch -27.2 / -36.6 | -25.6 | -33.0 | -42.0 | 0.07 | 84 | 2.0 |
| punch | punch -28.0 / -37.7 | -26.2 | -36.9 | -45.9 | 0.12 | 58 | 3.1 |
| gloveJab | punch -27.0 / -36.8 | -25.3 | -32.6 | -41.6 | 0.05 | 64 | 1.2 |
| gloveHeavy | swingHeavy -26.7 / -31.5 | -26.0 | -29.7 | -38.2 | 0.04 | 203 | 2.0 |
| equipFists | equip -27.1 / -38.7 | -29.2 | -40.9 | -48.0 | 0.04 | 123 | 3.7 |
| equipGlove | equip -25.8 / -39.1 | -27.5 | -36.8 | -45.5 | 0.01 | 191 | 2.8 |
| wDart | old dart -30.8 / -40.1, click 0.32 | -30.9 | -40.3 | -49.3 | 0.16 | 63 | 2.7 |
| wLaser | old laser -26.2 / -32.3, click 0.22 | -25.5 | -32.0 | -40.8 | 0.09 | 132 | 0.8 |
| wLightning | old lightning -17.7 / -23.6, click 0.23 | -19.3 | -27.0 | -35.0 | 0.09 | 209 | 0.9 |
| step-stone | step-stone -30.9 / -45.1 | -32.0 | -43.7 | -52.7 | 0.21 | 26 | 3.6 |
| step-sneak | silence | -37.1 | -49.7 | -58.7 | 0.02 | 23 | 6.4 |
| landSoft | silence | -34.4 | -45.9 | -54.1 | 0.04 | 78 | 2.2 |
| land | land -24.7 / -32.9 | -28.6 | -33.7 | -42.7 | 0.02 | 97 | 3.3 |
| hide | silence | -38.4 | -45.9 | -53.1 | 0.01 | 231 | 2.8 |
| lowLife | silence | -24.9 | -29.5 | -35.8 | 0.02 | 341 | 0.3 |
| hurt | hurt -20.7 / -28.9 | -21.6 | -29.6 | -38.0 | 0.02 | 159 | 2.8 |
| coin | coin -29.0 / -32.9 | -28.7 | -32.6 | -39.6 | 0.05 | 230 | 1.1 |
| found | found -20.6 / -25.9 | -20.8 | -26.1 | -29.5 | 0.02 | 1104 | 0.6 |
| rummageBin | rummage -28.9 / -38.0 | -28.7 | -38.8 | -44.8 | 0.06 | 198 | 1.0 |
| rummageBarrel | rummage -29.5 / -38.2 | -29.9 | -35.0 | -40.9 | 0.02 | 209 | 2.4 |
| rummageCrate | rummage -28.5 / -38.3 | -28.6 | -37.3 | -41.5 | 0.03 | 212 | 2.5 |
| rummageCase | rummage -27.7 / -38.0 | -27.5 | -40.9 | -45.4 | 0.08 | 244 | 2.9 |
| rummageEmpty | silence | -32.5 | -41.1 | -44.4 | 0.02 | 433 | 1.3 |
| motor / winch / trickle / steam | nothing | -32.7 / -31.4 / -31.5 / -30.5 | -35.9 / -38.3 / -40.6 / -34.0 | | ≤ 0.07 | 975 / 806 / 531 / 575 | ≤ 2.3 |

("the event before": the sound that event made at REF, peak dBFS / 50 ms LUFS. Take spread: the peak's range over
six takes, each a fresh engine. The unchanged pickups, the hurt and the hits are in the JSON; within 0.5 dB of before.)

Reading it:
- **Under the voices and the music.** The loudest new or changed sound peaks at -19.3 dBFS (the lightning; before
  -17.7). Every sound the test hears is 8 dB or more under a voice line's 50 ms loudness (the loudest, `found`, is
  16.8 dB under; a blade's cut 18.5 dB). Against the music's own 50 ms maximum (-22.3 LUFS) every action sound is
  under it too: from 3.8 dB (a found object) and 5 dB (a hit) to 27 dB (the tiptoe); the effects also step back 4 dB
  under a line, as before. Nothing was normalised: a tiptoe stays 24 dB under a found object. (Whether the hits are
  loud enough over the combat music is the question action-sound.md left open; not changed here.)
- **Cause and outcome apart.** A bounce on stone (-31.8) is under the hit on an enemy (the pling -30.3 + the material
  -27.2…-30.3); a throw without magic is 5 dB under a full one and its contact has no chirp; a search that finds
  something (rummage + bonus) is not a hop at an emptied one (rummageEmpty, -41.1 LUFS, a falling shrug); a kash (-32.6) is
  6.5 dB under a found object (-26.1), the only long gesture (1.1 s).
- **Clicks.** Every onset is 0.21 of its peak or less (the stone step's noise grain); the weapons' fell from
  0.22–0.32 to 0.09–0.16.
- **Repetition.** Round-robin and variation give 1–6 dB take to take on repeated sounds; the musical cues stay within
  0.1–1.1 dB (their signature kept).
- **Families' A/B** (the listening files, whole sequence): ball -29.6 → -29.4 LUFS (50 ms), sword/weapons -23.8 →
  -26.1 (the old lightning's crack was the loudest), moves -27.3 → -27.4, pick-ups -26.1 → -26.0; peaks -17.6 to -22.3
  dBFS: the overall level is the same, the new events fill silences.

### The cost on the main thread

`play()` timed in the game on Citadel's street (30 people about), 60 rounds of ten sounds, each round timed whole:

| | median per call | p95 | max |
|---|---|---|---|
| before (REF) | 0.08 ms | 0.95 ms | 16.2 ms (the first round) |
| after | 0.07 ms | 0.42 ms | 4.0 ms |

Frames with three sounds asked per frame against frames with none (120 each, the game's step without drawing): the
spread is the street's own (GC, people), larger than any difference the sounds make (after: busy mean 3.0 ms, quiet
2.3–6.0 ms). Round-robin is one Map lookup; the new sounds use 2–8 nodes each, as the old ones. In
`tests/action-sound-2.mjs` the same probe: median 0.07 ms.

## Tests (Automated runtime, headless SwiftShader, one suite at a time)

`tests/action-sound-2.mjs` (new, 40 checks): plays each action in the game (the developer yard for the ball, sword,
fists, glove, moves, pickups and damage; Citadel for a bin and the sea) and checks what the engine started; then
renders every sound it heard offline with the game's engine (three takes each) and checks the bounds: peak ≤ -12 dBFS,
50 ms loudness ≤ voice - 8 dB and ≥ -62 LUFS, no onset click (≤ 25 % of peak), silent with the SFX slider at 0, small
under big; and play()'s cost (median < 0.5 ms). `tests/action-sound.mjs` was extended for the new names (its bounce and
rummage checks accept a sound by surface and by kind).

Suite results on this build (`de8a6ada`'s code; the before build `ccr-c1c2c4b9-dep6ed` = REF where a suite failed;
machine load 12–18 on 4 cores, shared with other agents' runs):

| Suite | This build | REF | Note |
|---|---|---|---|
| action-sound-2 (new) | **40/40 PASS** | — | |
| action-sound | 21/21 PASS | — | extended for the new names |
| ball-close | 6/6 PASS | — | |
| anim-combat | 35/35 PASS | — | |
| combat | 77/78 | 77/78, the same | "dodge distance at 30 and 60 fps" `{"d30":0,"d60":1.56}` on both (KNOWN-FAILING) |
| items-ceremony | 20/20 PASS | — | |
| containers | 41/41 PASS | — | |
| arsenal | 34/34 PASS | — | |
| equip2 | 30/30 PASS | — | |
| equip2b | stops at check 1 | stops at the same check | Zeelich's canal set-up (`reading 'sign'`): not sound; Zeelich is TECH-ART-1's area |
| audio | 6/6 PASS (4th run) | 6/6 PASS (1 run) | runs 1–3 here timed out on a Playwright click in the pause menu: the page drew no frames for ~30 s (requestAnimationFrame stalled; the main thread answered). A probe saw that stall on this build 3 times in 7 (once with only `audio.js` swapped into REF) and never on REF in 6, all at load 15–18; six alternating probes at load 13 were clean on both. No mechanism found (nothing in this pass runs while paused); left open, see "Not done here" |
| voices | 27/27 PASS | — | |
| voice-phrase | 62/64, then 63/64 | 63/64 | timing checks under load move between runs (REF: the Expressive start 9.3 ms > 5; here: Zoé's clip, then the Words worker timing); voice code untouched |
| menus | stops at a reload | stops at the same reload | `page.reload` timeout under load on both |
| opening | 41/41 PASS | — | |
| opening-tutorial | 40/40 PASS | — | |
| chapter1 | 32/32 PASS | — | |

Logs: `/dev/shm/as2-<suite>-<tag>-<try>.log`, REF: `/dev/shm/as2-<suite>-base.log` (session only).

## Listening files (for the user; nobody here has heard them)

`captures/action-sound-2/`: `ball.mp3`, `sword.mp3`, `moves.mp3`, `pickups.mp3` (each: BEFORE, a beep, AFTER; the same
events at the same times) and `README.md` saying what is in each and what to listen for. 1.7 MB in all. Rendered
offline from the code (not recorded in a place). **Listening status: not listened to.**

## What is left for the user's ear

- Whether the surfaces are told apart by ear: stone vs wood vs metal bounces (the chirp is the same on purpose).
- Whether the no-magic throw reads as "weak" without being mistaken for a miss, and whether `ballReturn` is welcome or
  fussy (it is quiet and pri 1, the first thing dropped in a crowd).
- The sword's draw and sheathe: satisfying, or too thin at -36 LUFS? The cut on flesh against the fist's thud.
- The tiptoe: audible on laptop speakers at all (-50 LUFS, 6–8 dB under a step) without being a nag.
- `lowLife`: two heartbeats with the hurt; helpful or alarming? It plays once per fall under a third.
- The containers by kind: does a bin sound like a bin?
- Every judgement of timbre and of level against the music in a real place.

## Not done here

- Played checks: nothing was played by a person; all in-game checks are Automated runtime (SwiftShader).
- Animation timing: sounds fire on the simulation events as before (the swing on the first active frame, the ball on
  its release frame; ANIM-COMBAT's keying); not changed.
- Story `chest` calls that mean "a task done", the story machinery's placement (`clunk`, `grind`, `door`) and the
  ambient loops: unchanged (as action-sound.md lists).
- The heavy charge reuses the ball's `chargeFull` chime (unchanged).
- Equipping the ball has its own glint (`equipBall`), not covered by a test (the yard starts with the ball).
- The pause-menu frame stall seen in `audio.mjs` under heavy load (table above): seen on this build only, never
  reproduced at lower load on either build. If it recurs on a quiet machine, compare `src/engine/audio.js` at
  `de8a6ada` against REF first (the stall was once seen with only that file swapped in).

## Files

`src/engine/audio.js` (the new sounds, round-robin, `play(name, at, opt)`), `src/engine/physics.js`
(`solidCollider`), `src/game/actors.js` (the ball by surface, the sea, no magic, the way home, one catch per throw;
the tiptoe, hiding, the step down, low life), `src/game/combat.js` (equip sounds, kick and glove, the throw without
magic, a blade's impact), `src/main.js` (`impact(..., by)`, the container by kind, the emptied one),
`src/game/weapons.js`, `src/game/tools.js` (through play()), `tests/action-sound-2.mjs`, `tests/action-sound.mjs`,
`tools/action-sound-2-listen.mjs`, `captures/action-sound-2/`.
