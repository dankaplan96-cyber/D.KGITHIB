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
| `subs` `[{t, d, who, color, text, voice}]` | subtitles with the speaker; `voice` (the speaker's name key, `'n_zoe'`) babbles the line in that character's gibberish voice (`src/engine/voice.js`, the same voices as in-game dialogue), paced over the line at about 8 syllables a second; `cine.voiced[i]` counts the syllables per line |
| `caps` `[{t, d, text, sub}]` | captions with no speaker (place and time), lower left |
| `music` `{name, at}` | a cue started at `at`; the clock follows the cue while it plays, so a slow frame can't drift the picture off the score (not while tests step the clock) |
| `finish(skipped)` | the end state: the same whether the scene played or was skipped (flags, positions, props, objective, control, save) |

Helpers in `opening.js` (`walk`, `turn`, `put`, `hold`, `rest`, `extra`) move characters at a real walking speed
(the rig is told the speed, so feet don't slide), turn them, attach props to hands and put them down. Scene-only
characters and objects are listed in `temps` and removed by `finish`. Everyday actions for scenes are in
`Rig._craft` (`tinker`, `kneelWork`, `kneelLook`, `kneelShow`, `reach`, `tapTurn`, `touchWater`, `setDown`,
`potting`, `wipe`, `reachHigh`) plus additive gestures (`rig.doGesture('nod' | 'shrug' | 'sigh' | 'start')`).
Characters in a scene don't fidget (`rig.noFidget`) and the player's occlusion silhouette is off. Every character in a
scene is made with `createCharacter` (the poly cast, `assets/poly/*.json`); talking is the rig's generic `talk`
gesture while the line babbles: there is no lip-sync and no recorded voice.

The house as a set: for the scene the house gets a ceiling and its east wall back (the game draws it open for its
own camera), and the well's cave its east wall; they fade out in the handoff (83.6–84.0) and `finish` removes them.
A scene pose layer, `bend(actor, t0, t1, offsets)`, adds small joint offsets on top of the rig's actions where a hand
must land on something (the crate, the tap's handle, the stream, the table); `from(actor, action)` enters an action
at its held pose. OPEN-3's item list: docs/lba3-production/reviews/OPEN-3/BUGS.md.

Doors: somebody who leaves through a door walks out of the shot or into the game's door transition (a dip to black,
the door sound, and they are outside, already a step past the door, as the game puts the hero) — never into a
closed door. Interiors are open sets like LBA2's (the south and east walls are cut away for the game's camera), so
shots indoors look north or west and are pitched to keep the frame under the wall tops.

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

## The opening (88 s)
What a player who never played LBA should know by the end, shown rather than told:

| Time | Shot | What happens | What the player learns |
|---|---|---|---|
| 0–9 | Citadel Island from the air | the town, the harbour, the sea; the caption "Citadel Island, Twinsun / Twelve years after Twinsen's last adventure"; the cue enters at 2.5 s | where and when; Twinsen is somebody who had adventures |
| 9–13 | down to the harbour | the pier, the project barge and its cargo lift, the ferry | the island trades by sea |
| 13–19.6 | the lift | the worker runs the lift; a crate with the project's emblem comes up off the barge. Resident: "When does the harbour row get the heat?" Worker: "Next quarter. Every home gets it. Vesk promised." 18.6: a hum, the lantern and the hook tremble, the puddle ripples | there is a project bringing heat to every home; Vesk is behind it; not everyone has it yet |
| 19.6–23.8 | the drill | the derrick turning inside FunFrock's old fortress on the plateau, the hum | the project drills into the island |
| 23.8–29 | the pier again | Resident: "What's that hum?" Worker: "Just the drill. It's a long way down." The crate is set down; the resident goes on to the ferry | the hum comes from the drill; the people in charge aren't worried |
| 29–35 | home | the family room: Twinsen mends the reading lamp, Zoé pots seedlings, Arthur kneels at his model boat. Arthur's close-up: "Dad! The mast fits!"; over his shoulder: "Told you. Now the sail." | Twinsen, his son Arthur, his wife Zoé: an ordinary home |
| 35–48 | Zoé at the counter, the tap | she wipes her hands, turns the tap: a squeak, two knocks, a short stream, a sputter, nothing. "Twinsen. The tap's stopped again." | — |
| 48–53.4 | the exchange | Zoé turns to him; Twinsen turns round from the table (seen from her side): "I fixed that yesterday." Over his shoulder: "It worked yesterday." (a shrug) | — |
| 53.4–58 | the house hums | the hum again, dust from the ceiling, all three look up (a wide from the bed's foot); Arthur's close-up: "The drill again. Lulu says they're digging to the middle of the world." | the drill reaches their house too |
| 58–62.4 | the second try | a thin warm trickle, a little steam; her fingers under it: "That's warm. It's never warm." The music turns (the Entity cell) | the water is wrong |
| 62.4–66.5 | under the island | a dip to black, the well's cave, inside the last chamber facing the crystal vein: it glows brighter with the hum, then a dip back | the hook: something under the island answers the drill (what the player finds at the bottom of the well) |
| 66.5–75.2 | the decision | Twinsen puts the screwdriver down: "I'll check the well." Zoé turns the tap off: "I'll ask next door." and, going: "Take your magic ball. Just in case." She walks out of the shot toward the hall | the first goal (the well) and the first step (the ball); Zoé acts on her own |
| 75.2–81.6 | outside | the game's door transition (a dip, the door): Zoé steps out by the house's new heat post (dark: the heat hasn't come yet), comes up the path and walks along the lane round the neighbours' fenced yard; the title over the sky, 76.4–81 | — |
| 81.6–83.6 | inside | Twinsen turns to the cupboard where the ball is | where the ball is |
| 83.6–88 | handoff | the camera eases into the game's isometric view; control, the objective "Check the well ◆ Take the magic ball from the cupboard" (the default LBA HUD hides the objective panel, so a toast says it once), the save | what to do now |

The sections of the music cue (tools/music/tracks/opening.py) are unchanged: harbour 2.5–13, the lift 13–29,
home 29–41, the tap 41–59, "That's warm." 59–66.5, the decision 66.5–76, the title 76–83.

After it: Zoé stands at the neighbours' door (talk to her: their tap ran warm too); Arthur kneels at his boat. The
door still won't let Twinsen out without the ball ("I'd better take the magic ball along. It's in the cupboard.").

Story notes (narrative): the opening names Vesk only through the worker ("Vesk promised"), as Xil does in the
prologue; Vesk introduces himself in chapter 2. Sendell is not in the opening; the glow under the island is what
the player finds at the bottom of the well before Sendell speaks. No night: the scene is morning under the two suns.

## Verification
`tests/opening.mjs` (headless Chromium, SwiftShader, deterministic stepping): full playback and its end state;
skip at 3, 21 (the drill), 50, 64 (under the well), 77 (outside) and 85 s (the handoff) — the same end state, no
leftover objects; every spoken line babbles in its speaker's voice; every character on screen is one of the poly
cast's meshes; nobody vanishes or jumps more than a metre on screen except under a dip to black; a short press doesn't skip; pause and resume
(clock stopped); losing focus pauses; Continue doesn't replay; a second new game duplicates nothing; the first
objective is playable. Chapter tests start with `?nocine` (the opening's end state without the scene).
Contact sheets in `captures/opening/` (before/after at the same timestamps, SwiftShader at Medium quality,
1280×720) and the story beats with a frame each.

Not verified: the scene on a real GPU and display, the sound mix by ear (the effects and the gibberish voices are
synthesised and the cue is a rendered draft like the rest of the soundtrack; the voices' timing against the music
and the hum's level can only be judged by watching with sound), touch-and-hold skipping on a real phone, gamepad
skipping.
