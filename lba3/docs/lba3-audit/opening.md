# LBA3-RUN — the opening (lba3-opening, wave 1)

**Status: Automated runtime only.** Headless Chromium on SwiftShader, the scene stepped on its own clock at 1/30 s
(deterministic); pictures inspected by the agent, nobody played it, no real GPU. **Nobody listened**: the new cue was
rendered from its score with the project's own renderer and its section onsets measured, not heard; the review video's
sound is the game's own output recorded in a real-time run (see "Review video"), also not listened to by a person.

Base: branch `ccr-c1c2c4b9-dep6ed` at `e16f51eb` (START.md's 41e38829 + the run's record). Work: this worktree's
branch, commits listed in the report.

## What the opening is
Real-time, in-engine: `src/game/story/opening.js` on `src/engine/cinematic.js` (one clock for shots, events, tracks,
subtitles, captions; `finish()` sets the same end state played or skipped). No video is pre-rendered. Its music cue is
a pre-rendered audio file written to the scene's sections (`tools/music/tracks/opening.py` → `assets/music/opening.mp3`).

## The user's rule (23.11, via the coordinator): ask about every big decision
So **the existing film stays the default**. The new cut is built beside it and switched on with `?opening=notebook`
(or `localStorage.lba3_opening = 'notebook'`). Nothing a player sees changes until the user picks. The choices are
listed under "Decisions for the user" at the end.

## The existing film, watched (before)
Capture: every 0.5 s from a new game, 182 frames + per-frame log (`cap.mjs`), contact sheets per sequence.
First controllable frame: **88.0 s** (the frame the clock passes the length: control, objective, save).

| # | t (s) | Shot | Music (cue from 2.5 s) |
|---|---|---|---|
| 1 | 0–13 | aerial over the town to the lift; captions "Citadel Island, Twinsun / Twelve years after…" (1.6–6.6) and "Sendell… FunFrock" / "FunFrock is dead. His clones never got the message." (7.0–13.8) | A harbour 2.5–13 |
| 2 | 13–19.6 | the lift: the resident asks, the worker answers ("Vesk promised") | B the lift 13–29 |
| 3 | 19.6–23.8 | the drill in the old fort | B |
| 4 | 23.8–29 | the pier: "Just the drill"; the crate set down | B |
| 5 | 29–35 | home: the family; Arthur "Dad! The mast fits!"; Twinsen "Now the sail." | C home 29–41 |
| 6 | 35–48 | Zoé at the counter, the tap stops; she calls him | C, D the tap 41–59 |
| 7 | 48–53.4 | the exchange ("I fixed that yesterday." / "It worked yesterday.") | D |
| 8 | 53.4–58 | the house hums; Arthur's line | D |
| 9 | 58–62.4 | the second try; "That's warm." | E 59–66.5 |
| 10 | 62.4–66.5 | the well's vein glows | E |
| 11 | 66.5–75.2 | the decision; Zoé walks out | F 66.5–76 |
| 12 | 75.2–81.6 | outside: Zoé next door; the title 76.4–81 | G the title 76–83 |
| 13 | 81.6–88 | inside: Twinsen to the cupboard; a 4.4 s camera handoff | H tail |

Seen in playback (the OPEN-FILM pass had fixed the acting and contact faults; what remains is the telling):
- The history is a text wall over a moving sky: the second caption is 70 + 51 characters for 6.8 s, white text over pale
  cloud and sea (readable only because of its shadow) while the aerial drifts 0–8 s with little to look at.
- The aerial's dive (10.5–12.5 s) is fast (14.7 m/s) and passes steeply over the quay with a sun glint at 12 s.
- The outside shot is 6.4 s of Zoé walking away from the camera under the title; the handoff 4.4 s of camera with
  Twinsen standing (kept long only so the cue's tail and the film ended together).
- No playback faults found in the middle (2–11): contact, mouths, steps, framing as OPEN-FILM left them (its checks
  pass, below).

## The notebook cut (after; `?opening=notebook`, 88.8 s)
Built from the agent file's suggested cut, adapted to the strongest footage: the history moves into Twinsen's own
sketchbook, the classic's strongest shots (the aerial's approach, the lift, the drill, the whole home sequence, the well,
the decision) and its score's sections B–F are kept as they are, 9.6 s later.

| # | t (s) | Purpose | Actors / blocking | Camera | Key action | Caption / audio | Out |
|---|---|---|---|---|---|---|---|
| N1 | 0–13.4 | the history (LBA1, then LBA2) | Twinsen at the table's west end, the book open on the table, his hands either side at the frame's foot | straight down on the spread, the camera's `up` turned to the page's top, easing in (0.62 → 0.58 m) | the stamp's dashes run to the clones (1.0–3.6) and on to Twinsen (4.1–6.6); his right hand turns the page by its corner (7.05–7.9) | op_nb_1 0.5–3.7, op_nb_2 3.9–7.0, op_nb_3 7.95–10.55, op_nb_4 10.75–13.4; cue from 0.6: harp, the flute's Adventure head (4.85), Dm7 for the storm (9.1), oboe for the children (11.2); paper × 2 | cut |
| N2 | 13.4–16.2 | whose book; where and when | Twinsen, bent over the book; Zoé at her tray behind | his face from across the table | a smile at the children (13.55), a look over at Arthur (14.15–14.9), back to the book; he turns the last page (15.3) and stays over the book (P119: he straightened at 15.95 and stared into the lens) | "Citadel Island, Twinsun / Twelve years after Twinsen's last adventure" 13.65–16.85; the Home motif on the clarinet (13.35); paper × 2 | cut |
| N3 | 16.2–17.6 | the drawing becomes the island | — | straight down on the last spread, closer | 16.9: the page's own picture laid exactly over the page (a projective transform of its corners); 17.0–17.55 it opens out to fill the screen | — | the scene changes under it |
| 1 | 17.6–22.6 | Citadel now; the title | — | the classic aerial's last 5 s (old 8–13) | the picture fades off the real island (17.6–18.9) | title 18.2–21.2; G: horn, Adventure head; lap, winch, rope creaks | cut |
| 2–11 | 22.6–84.8 | as the classic 13–75.2 | | | | the cue's B–F, unchanged, 9.6 s later | dip |
| 13 | 84.8–86.8 | the door shuts behind her; Twinsen turns to the cupboard | | inside, as before | the door heard as the picture comes up | H tail (85.6) | |
| H | 86.8–88.8 | into the game's camera (2.0 s; was 4.4) | | | | | control |

First controllable frame: **88.8 s**. The classic's outside shot (75.2–81.6) is not in this cut.

### Staging tried and rejected (inspected pictures in the scratchpad's `pr1`–`pr10`)
- The book held up in his hands, over his shoulder: his head and shoulders cover it (he leans over what he reads).
- From his right side: the pages lie across the frame, sideways.
- His point of view, his head folded away: the tunic's collar ring fills the foreground.
- So: the book on the table, the camera straight down with its `up` turned to the page's top (a shot's `up`, which the
  runner sets for every shot and resets however the film ends; the test checks it after playback and every skip).
- His hands rested on the book's margins first: from 0.6 m they covered the drawings (the stamp, the Dino-Fly); they rest
  on the table beside it now. From the tinkering pose they stopped 5–8 cm short of the table: he bends over it a little
  more (a pose layer, released as he straightens).

### The recap against the originals (no LBA1/LBA2 file used; drawings are ours, on canvases)
| Line | Source |
|---|---|
| FunFrock ruled Twinsun with clones and teleporters | LBA1's premise (his clones: docs/LBA1_CATALOGUE.md lists the clone soldiers and clone factories; teleportation is LBA1's other invention, from the game's story, not in the project's notes) |
| Twinsen stood up to him and set Twinsun free | LBA1's outcome; the classic caption already said Sendell chose him to stop FunFrock |
| Later, lightning struck his friend the Dino-Fly | LBA2's opening storm (STORY_BIBLE.md: where the Dino-Fly "lay after the storm at the start of LBA2") |
| On Zeelich, he brought Twinsun's stolen children home | LBA2's plot (the Esmers took Twinsun's children; Twinsen brings them back from Zeelich) — from the agent file's brief and the game's story, not in the project's notes: **for the story agent / the user to confirm the wording** |
No numbers are used. Nothing about Vesk beyond the classic's "Vesk promised"; nothing of the finale; FunFrock appears only
as history (his fortress and clones on the page, no living FunFrock). Sendell is no longer named in this cut (the classic
caption named her).

### Captions, English and Hebrew
The film's own keys in `src/game/text/opening.js` + `text/he/opening.js`: `op_nb_1`…`op_nb_4` (new; the classic's
`op_cap_lore`, `op_cap_lore_sub` kept for the classic cut). `node tools/he-bundle.mjs`, `node tests/dialogue-check.mjs`
PASS. The Hebrew is the agent's, not a native speaker's (טלפורטים for teleporters; הדינו־זבוב as elsewhere in the game).
The notebook's lines sit on a dark band, centred low (`#cine-cap.recap`, css/style.css; `cls` on a caption,
cinematic.js): white text over cream paper was unreadable.

### Sound
`opening_nb` (tools/music/tracks/opening_nb.py, rendered with tools/music/build.py and the MuseScore_General soundfont):
A (the notebook) 8 bars, the classic cue's harbour bars 1–5 over the first spread and the storm, then oboe and clarinet;
G (the title) 2 bars; B–F as the classic cue's; H the tail. Measured onsets (scene time): A 0.6, G 17.6, B 22.6, C 38.6,
D 50.61, E 68.8, F 76.1, H 85.6 — B–F exactly the classic's + 9.6 s. −19.0 LUFS, true peak −4.35 dBTP, 93.4 s with its
tail. The classic `opening.mp3` is unchanged. Unheard.

## Tests
All Automated runtime only (SwiftShader, 960×540, one suite at a time, a machine shared with another agent), on the
committed code:

| Suite | Result | Covers |
|---|---|---|
| `OPENING=notebook node tests/opening.mjs` | **48/48 PASS** | full playback frame by frame (poly cast, no vanishing, no solids, no one in anyone, hands on the tap, feet, mouths, steps, NO-AIR's contacts, the four history captions then where/when, his hand on each page's corner as it lifts, the page's picture laid over the screen); the end state played and skipped at 3, 12 (mid-notebook), 17.4 (the picture opening out), 30.6 (the lift), 59.6 (the exchange), 73.6 (the well), 84.55 (inside the door's dip), 85.8 (the last shot), 87.8 s (the handoff): control in the house, the objective, the save, the cast placed, the same scene object count, no picture left over, the camera's up back to the world's, no hand bone turned; a short press doesn't skip; pause stops the clock; losing focus pauses; Continue after a reload doesn't replay; a second new game duplicates nothing; the first objective playable |
| `node tests/opening.mjs` (the classic, default) | **43/43 PASS** | the same, at its own skip points 3, 21, 50, 64, 77, 85 s; its two captions; no notebook |
| `tests/prologue.mjs` | 29/29 PASS | |
| `tests/chapter1.mjs` | 33/33 PASS | |
| `tests/opening-tutorial.mjs` | 43/43 PASS | |
| `node tools/he-bundle.mjs`, `node tests/dialogue-check.mjs` | PASS | |

After the runner took over the camera's roll (the sweep, below), again: notebook cut **48/48 PASS**; a skip-only sweep
of the notebook cut (`OPENING=notebook SKIPS=… node tests/opening.mjs`) at its other shot boundaries and mid-actions —
0.3 (first frame up), 7.3 (a page in the air), 13.4 (the cut to his face), 15.6 (the second page in the air), 16.2
(back to the book), 17.2 (the page's picture opening out), 17.6 (the scene changing under it), 18.5 (the picture fading
off the island), 22.6 (the cut to the lift), 26.4 (the hum), 38.6 (the dip into the house), 52.0 (her hand on the tap),
63.0 (her line, the steam), 72.0 (the tap turned off), 76.1 (the dip to the well) — **15/15 PASS**, each the same end
state (no picture left, the world's up, the objective, the save, the same object count); the classic film **43/43 PASS**.

On the way: the first notebook run failed 4 (Twinsen's mesh not counted as the poly cast's — the base's own failure,
above; his 0.5 m move at the island's switch counted as a foot jump — he now moves under the old 29 s dip, as the classic
does; her outside steps gone, the step count's floor lowered for this cut; his hand 5–8 cm off the lifting corner), the
second 1 (the hand: it could not reach the table from the tinkering pose; the lean fixed it, measured 0.0 cm off its
target through the lift). `SKIPS=` gives a skip-only sweep (below).

## Review video and pictures
Session scratchpad (`/tmp/claude-0/-home-user-D-KGITHIB/ee8386c5-a577-5abe-b3f0-c10324e7c3bd/scratchpad/lba3-opening/`;
not in the repo, gone at a cleanup):
- `opening-notebook-review.mp4` — the notebook cut from a new game into 4 s of play, **with sound**: 93.1 s, 960×540,
  8 pictures a second (`vid-nb/`, 743 pictures stepped on the scene's clock, 1/30 s steps) and the game's own output
  bus recorded in a real-time run of the same cut (`audio-nb.wav`: MediaRecorder on `audio.out`, the scene stepped by
  wall-clock time with drawing switched off; the scene's clock ended 1.1 s behind the wall clock, the music's sync keeps
  the two within that). Laid together from the scene's start; music, voices and effects are the game's, at their scene
  times, within about a frame to a second. Nobody has listened to it.
- `classic-review.mp4` — the classic film the same way (the before): 92.5 s, 2 pictures a second (the 0.5 s capture), its
  sound recorded the same way (`audio-classic.wav`; the scene's clock 0.3 s behind the wall clock at the end).
- `before/`, `sheets-before/` — the classic film every 0.5 s with its per-frame log (`log.json`); `pr1/`…`pr10/`, `sel/`,
  `pr-he/` — the notebook's probes, the key moments, the Hebrew captions.
In the repo: `captures/opening/notebook-cut-preview.jpg` (14 moments: the two spreads, a page turn, his face, the page
opening out, the title over the island, the lift, the last shot, the handoff, play) and
`captures/opening/notebook-cut-he.jpg` (the captions in Hebrew).

To capture it again on a machine with a GPU and speakers (from `lba3/`, `python3 -m http.server 8123`): open
`http://localhost:8123/?opening=notebook`, New Game, and record the screen with its sound (the game plays at its own
pace; hold E to skip). Headless, as here: `GAME_URL='http://localhost:8123/?opening=notebook' node frames.mjs vid 0.125`,
`node capaudio.mjs audio.webm`, then `ffmpeg -framerate 8 -i vid/v_%05d.jpg -itsoffset <t0> -i audio.webm -c:v libx264
-pix_fmt yuv420p -c:a aac out.mp4` (the scripts are in the scratchpad folder above).

## Shared code: the sweep (the user's rule, 23.11: a fix holds across the whole game)
What the opening's work touched that other code could share, how the other users were found, how they were checked:

| Shared piece | Change | Other users (found by) | Check |
|---|---|---|---|
| `src/engine/cinematic.js` camera: the frame's roll | The notebook's straight-down shots roll the frame (the camera's `up`). First done inside the film, which left the shared camera's `up` turned if anything ended it early. Now the runner owns it: a shot may carry `up`; every shot sets the camera's up (the world's unless the shot asks), the handoff blends with the world's, and `complete()` puts it back whichever way the film ends | `grep "new Cinematic("`: only `story/opening.js` uses the runner. `grep "camera.up"` over `src/`: nothing else writes it; every other camera (`engine/camera.js`'s modes, `story/yearslate.js`, `travelfilm.js`, `ferry.js`, `chapter1.js`, `sewers.js`, `oneplace.js`, `prologue.js`, main.js) calls `lookAt` with the default up, which the runner now guarantees after any film | `tests/opening.mjs`, both cuts: after playback and after every skip, `camera.up.y === 1` (in `good()`); 15 more skip points in the notebook cut, all PASS; both suites rerun after the change (48/48, 43/43) |
| `cinematic.js` captions: `cls` | New, optional: a caption's own look (`#cine-cap.recap`, css/style.css) | the only caption user is the opening (`grep caps` in src/) | the classic cut's captions unchanged (its test's caption check) |
| Music | A new cue file and manifest entry; `music.js` untouched | — | `opening.mp3` byte-identical to the base (restored from git); both cuts' cue load in their tests |
| Skip, pause, replay, Continue | Not changed (the runner's own) | — | both cuts' tests |
| `tests/opening.mjs` poly-cast check | the hero's drawn mesh counted (P106) | other tests comparing meshes with `assets/poly`: `grep -rl "assets/poly" tests/` finds only `verdicts.mjs`, which serves a 404 for Doran's file and does not compare sizes | none other to fix |

## Visible changes (P107: shown to the user before anything ships)
Only with `?opening=notebook`: the notebook (a scene-only prop, our drawings), Twinsen standing at the table's west end
for the notebook, the title over the island instead of over Zoé outside, the outside shot gone, a 2.0 s handoff, the new
cue. The classic film is unchanged (its code path and cue as before; the only shared changes are the caption `cls` hook,
its CSS, and the timing helpers, which change nothing in the classic cut — its test passes, below).

## Decisions for the user
1. **Which opening new games play.** (a) Keep the classic film. (b) Make the notebook cut the default. (c) Both, a
   Settings choice. *Recommendation: (b), after the user watches the review video* — it tells the history without a
   wall of text, shows whose story it is before the harbour, and keeps every approved story beat.
2. **Dropping the outside shot** (Zoé next door under the title, 6.4 s). (a) Cut it, the door heard from inside (built).
   (b) Keep it whole (the cut becomes ~95 s, over the 90 s aim). (c) Keep a 3 s version without the title.
   *Recommendation: (a)* — Zoé's line already says where she goes, and the player meets her in the yard moments later.
3. **The notebook's framing.** (a) The book on the table, straight down, his hands at the frame's foot (built).
   (b) Held in his hands, over the shoulder (his head covers the book). (c) His point of view (his collar fills the
   frame). *Recommendation: (a).*
4. **Length.** (a) 88.8 s (built). (b) ~95 s with the outside shot back. (c) ~80 s: three captions, one page turn.
   *Recommendation: (a).*
5. **The new captions.** (a) The four lines as built (no Sendell; "teleporters"; the stolen children). (b) Add Sendell
   to the second line ("Chosen by the goddess Sendell, Twinsen…"). (c) (a) plus the classic's joke, "FunFrock is dead. His
   clones never got the message.", as a fifth line over his face. *Recommendation: (c)* if the 3 s it costs are wanted
   (it keeps the classic's humour and says FunFrock is gone); otherwise (a). Hebrew to be read by a native speaker either way.
6. **The title's place.** (a) Over the island after the notebook (built). (b) Back over Zoé outside (needs 2b/2c).
   *Recommendation: (a).*
7. **The new cue.** (a) Use `opening_nb` as rendered. (b) Keep the classic cue's A section's sound for the notebook
   but re-time it (as built, bars 1–5 are the classic's). *Recommendation: listen to the review video first*; nobody has.

## Handed to the coordinator
- No shared translation keys: the film's own keys only (`op_nb_1`…`op_nb_4`).
- `tests/opening.mjs` failed on the base revision's own build: Twinsen's drawn mesh (P106's spline lock, 18,444
  vertices) is not `assets/poly/twinsen.json`'s size (15,132), so "every character on screen is from the poly cast"
  failed whenever he was on screen. The test now counts the hero's own drawn mesh as the poly cast's Twinsen.
- The recap's LBA2 wording (the children, the storm) for the story agent; the Hebrew for a native reader.

## Remaining uncertainty
- Not heard by anybody (the cue, the paper sounds, the balance under the captions).
- Not seen on a real GPU or at other aspect ratios than 16:9 at 960×540 (the page's picture is placed from the page's
  projected corners, so it should hold at any size; untested).
- Twinsen's hands are the rig's mittens: from 0.6 m above the book they read as hands, not as detailed ones.
- The aerial's fast dive (old 10.5–12.5 s) is unchanged in both cuts.
