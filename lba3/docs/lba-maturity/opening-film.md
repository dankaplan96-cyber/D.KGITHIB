# The opening film — OPEN-FILM pass (WORKPLAN-2026-11-09, Wave A item 1)

**Status: Automated runtime only.** Every picture and number here comes from headless Chromium on SwiftShader, the
scene stepped on its own clock at 1/30 s (the picture a player sees at normal speed, with no frames dropped by the
software renderer). No frame-rate claim is made. **Nobody listened**: sound timings are the times the scene asked for
each sound and each voice syllable, not a listening test; the mix, the voices against the music and the step sounds'
level are unheard.

What the opening is: **real-time, in-engine** (src/game/story/opening.js on src/engine/cinematic.js: one clock for
shots, actions, sounds and subtitles; `finish()` sets the end state whether it played or was skipped). No video is
pre-rendered. The music cue (assets/music/opening.mp3, 88.9 s, tools/music/tracks/opening.py) is a pre-rendered
audio file written to the scene's sections; it was not changed, and the film keeps its 88 s length so the sections
still land on their shots. The story, its order, its lines' wording and its flags are unchanged.

## Method
1. Before: the whole film captured from a new game (`cap.mjs`): a picture every 0.5 s (182 frames, 960×540, Medium),
   a per-frame log (camera, every actor's position, action, mouth, ankles, gaze; every sound and every voice syllable
   on the scene clock; the camera against the geometry; the first playable seconds after the handoff), contact sheets
   per sequence (`sheets.py`) and the measures (`measure.py`). Test cameras for the tap with R5's `probe.mjs`.
2. Faults listed per shot (below), fixed in opening.js (one small hook in voice.js), captured again, compared.
3. tests/opening.mjs got four checks for what was fixed (item 10 in its header).

Evidence (session scratchpad, kept; not in the repo):
`/tmp/claude-0/-home-user-D-KGITHIB/ee8386c5-a577-5abe-b3f0-c10324e7c3bd/scratchpad/opening/` —
`before/`, `after3/` (frames + log.json), `sheets-before/`, `sheets-after3/` (one sheet per sequence:
01-harbour-air … 07-outside-handoff), `before-measures.txt`, `after3-measures.txt`, the tools (`cap.mjs`, `sheets.py`,
`measure.py`), `probe1/`, `probe2/` (test cameras at the tap), `tests-*/` (suite logs). In the repo:
captures/opening/open-film-before-after.jpg (the changed beats, before above after, same scene times); in the scratchpad also
`before-after.mp4` (every 0.5 s frame side by side at 2 fps: the scene's own pace in 0.5 s steps, no sound).

## Shot checklist (after this pass)

| # | t (s) | Purpose | Actors / blocking | Camera | Key action | Line / sound | Out |
|---|---|---|---|---|---|---|---|
| 1 | 0–13 | where, when; the island trades by sea | — | one aerial move: drifts over the town, gathers speed, dives over the quay's roofs to the pier | caption 1.6–8.6 | sea lap, rope creaks; cue 2.5 | cut |
| 2 | 13–19.6 | the project and its promise | worker at the lift's control, resident asking, Xil listening | low on the pier | crate up off the barge; the hum shakes the lantern 18.6 | Resident (both forearms up, asking); Worker (hand on the control, glances back); clunk, motor, hum, rattle | cut |
| 3 | 19.6–23.8 | the drill is the hum | — | the derrick in the fortress, slow push | glow at the bore | hum | cut |
| 4 | 23.8–29 | "Just the drill" | worker steps to the crate, resident goes toward the ferry | pier from the ferry's side | crate set down, hand on its top | Resident (an open hand up at the hum); Worker; thump | dip |
| 5 | 29–35 | the family | Twinsen at the lamp, Zoé potting, Arthur at his boat | wide; Arthur's close-up; over Arthur's shoulder | mast shown | Arthur; Twinsen (points the screwdriver at the boat on "Now the sail.", a nod) | cut |
| 6 | 35–45.3 | an ordinary morning; the tap stops | Zoé at the counter, Twinsen behind | kitchen's west end, a slow push that comes down to her shoulder's height as she reaches | the mast clicks: both glance at Arthur; she presses the last seedling in (a nod), dries her hands, sees the tap, walks, hand on the handle: knocks, a gush, nothing; a sigh | tick, squeak, knocks, water, gurgle; footfalls | cut on her turn |
| 6b | 45.3–48 | she calls him | Zoé turned to Twinsen | her face from his side | a hand back at the tap and a glance at it on "The tap's" | Zoé | cut |
| 7 | 48–53.4 | the exchange (the joke) | Twinsen turned to her | his face, Arthur behind; then over his shoulder | screwdriver hand toward the tap; her open hand; his shrug as her line ends | Twinsen; Zoé | cut |
| 8 | 53.4–58 | the house hums too | all three look up | bed's-foot wide; Arthur's close-up | dust from the beams | hum, rattle; Arthur's long line (head moving with it) | cut |
| 9 | 58–60.1 | the second try | Zoé steps back round to the tap | shot 6's end framing | hand on the handle, trickle | squeak, gurgle, trickle | cut |
| 9b | 60.1–62.4 | the water is warm | Zoé's palm under the spout | from the stove's side at hand height: her face over her palm, the steam | a small start | "That's warm. It's never warm." | dip |
| 10 | 62.4–66.5 | the hook | — | the well's cave, the vein | the glow pulses with the hum | hum ×2 | dip |
| 11 | 66.5–75.2 | the decision | Twinsen sets the screwdriver down; Zoé turns the tap off, steps round, walks out past him | wide from the bed side; then from the east wall panning with her | — | Twinsen (a nod); Zoé ×2; put, squeak; footfalls on the boards | door dip |
| 12 | 75.2–81.6 | outside, the title | Zoé round the neighbours' yard | the lane's far side, rising for the title (her head now clear of it) | title 76.4–81 | door; footfalls on the path's dirt and the grass | dip |
| 13 | 81.6–88 | the ball, the handoff | Twinsen turns to the cupboard | inside, then eases into the game's camera | — | room tone; control, objective, save | play |

## Faults found (before) and what was done

Times are scene seconds in the before capture.

| Shot | Fault (measured / seen) | Fix | After |
|---|---|---|---|
| 1 | The aerial stopped dead at 9.0 s and set off again: camera speed 4.6 m/s at 4.5 s → **0.3 m/s at 9.0** → 15.9 m/s at 11 s; frames 6.5–9.5 s all but identical (dead time under the caption's end). | One Catmull-Rom move through the same three framings (0–13 s), time-warped: from rest, through 9 s at speed, settling at 13; the arc over the coal shed's roof kept (and raised to clear the curve). | Speed rises without a dip (0.2 → 8.6 m/s at 9 s → 14.7 at 11 → eases out); no stop, no new cut; camera never within 12 cm of geometry. |
| 2, 4 | **The worker's and the resident's mouths never moved** on their four lines (0 frames open): they are the scene's own actors, and the mouth driver found speakers only among the world's NPCs. | `cine.speakers` names them; `driveMouth` (voice.js) looks there first. | 29 / 34 / 9 / 28 frames open on their lines, opening and closing with their syllables. |
| 2 | The worker's glance back at the man asking stopped short: gaze error median 87° (max 131°) 15.0–16.85 s — he stared at the lift's column. | `reachLook`: the chest twists up to 0.45 rad more when a look goes past the neck's reach. | Median 62°: a real glance over the shoulder; still not face to face (the man stands directly behind him and his hand stays on the control: kept as the staging). |
| 2, 4, 5, 6b, 7 | Five lines played the rig's `talk`: arms swinging on a 1.3 s sine for the whole line and the head nodding at 1.1 Hz — hands talking on a loop, the same rhythm for everyone. The other nine lines: only a mouth on a still body. | No `talk` in the film. A line gets at most one gesture with a shape (wind-up, move with follow-through, hold, settle) on the words that carry it; every speaker's head moves with their own voice (a dip into the stressed syllables, chin up and a tilt for the line, < 3.5°); eyes blink when the gaze moves on. | No frame of `talk` (test 10). Gestures: both forearms up (question), an open hand at the hum, the screwdriver at the boat, the screwdriver toward the tap, a hand and a glance back at the tap, one dry open hand. |
| 6 | **4.9 s of dead air** 35.1–39.97: no line, no move, the potting and tinkering loops only. | The mast clicks into place (36.2): both parents glance over at Arthur (36.3–37.6) and go back to their work; Zoé presses the last seedling in with a small nod (38.65); then, as before, dries her hands and sees the tap. | The beat has three reactions in it (the log's "still" measure, which counts only positions and the camera, still reads 35.1–39.97: the looks and the nod are heads); the music's Home section under it unchanged. |
| 6, 9 | Through the whole business with the tap (41–45.3, 58–60.1) the camera, at 1.84 m, saw the **top and back of her bowed head**: her looks at the pipe, the water and the spout did not read. | The push comes down with her reach to her shoulder's height (1.62 m, aimed at 1.44, 54° → 50°) on the same side: one move, no cut; shot 9 starts from there. Chosen from eight test cameras (probe1/, probe2/). | Her face in profile over her arm, the hand on the cross handle, the spout, and Twinsen at his table behind her. |
| 9b | Her line "That's warm. It's never warm." was spoken **off the frame** (face in view 0 % of the line): the insert was the basin and her forearm. | From the stove's side at her hand's height (56° lens): her face over her palm, the stream landing on it, the steam; the palm above the subtitles. The line starts at 60.4 (was 60.6), as her hand feels it. | Face in view for the whole line; the small start visible. |
| 7 | The shrug at 53.0 began 0.4 s before the cut to the wide: half of its 0.9 s was cut off, and it was no longer a reply. | At 52.25: as her dry line ends, over his shoulder. | Whole, in the shot it answers. |
| 7, 9b, 11 | Voices ran on past their subtitles: Twinsen 48.3 (2.34 s of voice for 2.0 s of text), Zoé 60.6 (2.0 for 1.8), Zoé 72.4 (2.76 for 2.4). | Subtitles 2.4 s, 2.0 s (from 60.4), 2.55 s (from 72.3). | Twinsen's voice now 1.54 s inside 2.4; Zoé's 2.0 inside 2.0; the last still ends 0.2 s after its text, under the door's dip. |
| 11–12 | Footsteps on a timer (2.6 a second) whatever the feet did: **12 of 19 footfalls had no step sound within 0.1 s**, 21 sounds for 19 footfalls; stone on the dirt path and the grass. Her walk to the sink (40 s) had none. | A step sounds when a foot comes down (the ankle's lowest point after a 5 cm lift), on the surface the game gives that spot (`surfaceAt`, as for the player). | 17 steps heard, each 0.0–0.07 s after a footfall (median 0.04 s: one frame after the ankle's lowest point); wood in the house, then the path's dirt and the grass; the 2 footfalls unheard fall under the door's and the last shot's dips (test 10). |
| 12 | The title lay **over Zoé's head** at 77–78 s. | The camera's aim rises 1.0 m (was 0.45) from 75.8 s. | Her head below the title's second line throughout. |

Measured and found sound (no change): 19 cuts, none under 30° between the same subject; the camera never within 12 cm
of geometry; nobody in a wall, in furniture or in anybody else (tests/opening.mjs); Zoé's hand on the tap's handle every
frame it turns and in the stream; standing feet don't jump; the handoff ends exactly on the gameplay camera (the frame
at 87.5 s and the first playable frame match), the objective panel comes up, the first steps walk.

## Not done / left
- **Lip-sync**: there is none. Mouths open and close with the gibberish voice's syllables (FACES-HANDS); no phonemes,
  no recorded voice.
- The worker's look back stays ~60° short (the man asks from directly behind him while his hand works the lift).
- The 4.4 s handoff (83.6–88) is a camera move with Twinsen standing; it is kept at that length so the cue's tail and
  the film end together.
- Arthur's close-ups stay on his face (his hands are below the frame); his acting there is the head with the voice.
- Zoé's hair (the bun over a bare scalp at some angles) and the faces are the character artist's (ZOE-LOOK); not
  touched here.
- Real time on a real GPU, the music against the picture, touch / gamepad skipping: as docs/CINEMATICS.md's
  "Not verified".
