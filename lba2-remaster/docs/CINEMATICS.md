# Story scenes (cinematics)

In-engine scenes run on one explicit timeline: `src/engine/cinematic.js`. The first scene built on it is the
new-game opening, `src/game/story/opening.js`.

## How a scene is written
A scene is a definition passed to `new Cinematic(game, def)`, then `start()`:

| Field | What it is |
|---|---|
| `length` | seconds |
| `prepare()` | async; places everything, compiles shaders, preloads the music, while the screen is black |
| `events` `[{t, fn}]` | fired once, in order, when the clock passes `t` (sounds, actions, props) |
| `tracks` `[{t0, t1, fn(k, t, dt)}]` | called every frame in `[t0, t1]` (k = 0..1), and once more with k = 1 when the clock passes `t1` (walks, turns, the lift, the tap, the rigs) |
| `shots` `[{t0, t1, from, to}]` | camera framings `{pos, look, fov}` eased from → to; a function for a moving framing; `to: 'game'` blends into the gameplay camera |
| `subs` `[{t, d, who, color, text}]` | subtitles with the speaker |
| `music` `{name, at}` | a cue started at `at`; the clock follows the cue while it plays, so a slow frame can't drift the picture off the score (not while tests step the clock) |
| `finish(skipped)` | the end state: the same whether the scene played or was skipped (flags, positions, props, objective, control, save) |

Helpers in `opening.js` (`walk`, `turn`, `put`, `hold`, `rest`, `extra`) move characters at a real walking speed
(the rig is told the speed, so feet don't slide), turn them, attach props to hands and put them down. Scene-only
characters and objects are listed in `temps` and removed by `finish`. Everyday actions for scenes are in
`Rig._craft` (`tinker`, `kneelWork`, `kneelLook`, `kneelShow`, `reach`, `tapTurn`, `touchWater`, `setDown`,
`potting`, `wipe`, `reachHigh`) plus additive gestures (`rig.doGesture('nod' | 'shrug' | 'sigh' | 'start')`).
Characters in a scene don't fidget (`rig.noFidget`) and the player's occlusion silhouette is off.

## Playback rules
- The game is in the `cinematic` state: no gameplay, the HUD and touch controls hidden, the gameplay camera
  bypassed (`CameraRig.cine`). Room changes inside a scene are "quiet" (`enterRoom(id, at, true, true)`): no save,
  no music change, no story hooks.
- **Skip:** hold Interact (the player's binding is shown, `A` on a gamepad) or press and hold the prompt with the
  mouse / a finger, for 0.9 s. A short press doesn't skip. Skipping dips to black for 0.4 s and runs `finish`.
- **Pause:** the pause key, or the window losing focus / the tab being hidden. The scene clock stops and the
  audio context is suspended (music and sounds hold their place); Resume continues. Quitting from the pause
  menu during a scene doesn't save.
- **Saves:** never during a scene; `finish` saves once control is back. Continue never replays a scene.
- Shadows and distance detail follow `cine.focus` while the hero is elsewhere (the harbour shots).
- Shots are framed for 16:9. On narrower screens (4:3, a phone held upright) the vertical angle opens so the same
  width of the scene stays in view; wider screens simply see more at the sides. Subtitles wrap within safe margins.

## The opening (85 s)
| Time | Shot | What happens |
|---|---|---|
| 0–5.6 | water by the pier | harbour sound first; Doran's boat surges and the bow line pulls tight (creak); the cue enters at 2.5 s |
| 5.6–13 | one move up and back | the harbour: pier, boat, the project barge and cargo lift, the ferry, Xil waiting with his cargo, Doran asleep |
| 13–29 | the lift | the worker runs the lift; the crate (project emblem) comes up off the barge; a resident walks past to the ferry without looking; 19.2–22 a faint vibration: the puddle ripples, the lantern and hook tremble, a low hum; the worker glances down; the lift carries on; the crate is guided down onto the pier |
| 29–41 | home | Twinsen mends the reading lamp, Arthur shows him the mast of his model boat (a nod), Zoé pots seedlings, wipes her hands, goes to the sink |
| 41–48 | the tap | squeak, two knocks in the pipe, a short stream, a sputter, nothing. "Twinsen. The tap's stopped again." |
| 48–58 | the exchange | "I fixed that yesterday." / "It worked yesterday." (a shrug) / Arthur, still kneeling: "Try the well. My boat needs water." |
| 58–66.5 | the second try | a thin warm trickle, a little steam; she holds her fingers under it: "That's warm." The music turns (the Entity cell, very quiet). Twinsen straightens. |
| 66.5–72.5 | the decision | he puts the screwdriver down: "I'll check the well." She turns the tap off: "I'll ask next door." and dries her hands |
| 72.5–80 | to the door | Zoé goes out first (the door); Twinsen follows to the doorway, watches her go, looks back into the room (toward the cupboard); the title, 76–80.6 |
| 80–84.5 | handoff | the camera eases into the game's isometric view; control, the objective "Check the well", the save |

After it: Zoé stands at the water office door (talk to her: the neighbours' tap ran warm too); Arthur kneels at
his boat. The door won't let Twinsen go without the ball: "I'd better take the magic ball along. It's in the
cupboard." (the objective then adds the step).

## Verification
`tests/opening.mjs` (headless Chromium, SwiftShader, deterministic stepping): full playback and its end state;
skip at 3 s, 50 s and 81 s (same end state, no leftover objects); a short press doesn't skip; pause and resume
(clock stopped); losing focus pauses; Continue doesn't replay; a second new game duplicates nothing; the first
objective is playable. Chapter tests start with `?nocine` (the opening's end state without the scene).
Frames checked at 16:9, 4:3, 2.35:1 and 390×844 (phone portrait). A preview video (music only — the effects are
synthesised live in the browser and not captured) and contact sheets are in `captures/opening/` and `dist/`.

Not verified: the scene on a real GPU and display, the sound mix by ear (the effects are synthesised and the cue is
a rendered draft like the rest of the soundtrack), touch-and-hold skipping on a real phone, gamepad skipping.
