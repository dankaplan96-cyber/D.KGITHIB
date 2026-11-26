# ENDING-13 — the ending film (task #13, the user's pick 26.11)

Spoiler document: the user asked not to see the ending. No pictures of it were made for the user; the agent's own check
pictures stayed in its scratch area (not in `captures/`).

## What changed

Before: the epilogue's dinner (the narrator and six lines in the house, a look over the house) went straight to the end
card. Now, after the dinner (and, in the expanded campaign, after the Cradle Hall scene), a **57.0 s real-time film**
plays, then the same end card. Built with the opening film's tools: `src/engine/cinematic.js` (one clock for shots,
events, tracks, subtitles with the speakers' voices, captions, music; hold E / pad A to skip; pause and focus loss stop
it; `finish()` puts the same end state whether it played out or was skipped).

- `src/game/story/ending.js` — the film (new file).
- `src/game/story/epilogue.js` — `film(done)` between the dinner and `showEnd()`; `?nocine` (developers, every other
  test) goes straight to the card as before. `afterEnding()` (Keep Exploring) puts Zoé and Arthur back at their places.
- `src/game/text/ending.js`, `src/game/text/he/ending.js` — 12 new English lines/captions with their Hebrew;
  `src/game/he-text.js` regenerated (`node tools/he-bundle.mjs`).
- `tests/ending-film.mjs` (new), `tests/README.md` (its line).

No new story facts: every line and caption restates what the epilogue and its end card already say (the dinner's "tell us
everything. Slowly.", Arthur's "Can I go down there?" / "Yes, yes, and no.", Gilbert's cold well and refund, Doran's
"Everyone's back… sleep for a week", the end card's bore as a shield run by both worlds, Kesh's oasis and Lhar's
village). Nothing in the world changes for good: the film's ceiling over the house set is removed after it, no flag is
set, nothing is saved by it (the dinner's save stays the save). Save format 6 untouched; old saves load as before.

## Shot by shot (in words)

The cut is written to the bars of the ending music (`homecoming`, 2.364 s a bar, entering 0.3 s in); every shot starts on
a bar line; the film is three of the piece's 8-bar phrases. The same piece goes on under the end card.

| # | time (s) | place | what is seen and heard |
|---|---|---|---|
| 1 | 0.0–9.8 | home, at the table | Fade up from black on the family around the table, a slow push in from the south. Twinsen, up from his place on the north side, starts the story ("So there I was, deep under the island...") with one forearm gesture; Arthur beside him bursts in ("With Sendell!", a fist forward, his face lit); Zoé, standing behind her chair at the west end, one hand palm down: "Slowly." Gazes move speaker to speaker with a blink on each change; Twinsen smiles at her. A quiet room tone. |
| 2 | 9.8–19.2 | the square | Cut on the bar to Gilbert by the well under the epilogue's bunting, at his eye level, the well and the town behind; the camera drifts closer. "Cold water at last. And my refund came." A thin trickle of water under the music. |
| 3 | 19.2–26.3 | the harbour | Doran on his quay by his shed, from his right, the pier and the sea beyond. "Everyone's back. Now, a week of sleep." Water lapping. |
| 4 | 26.3–35.8 | the plateau | The bore turning in FunFrock's old fortress (the opening's own view of it, held longer and slower), its hum under the music. Caption: **The bore still turns** / *a shield now, run by both worlds*. |
| 5 | 35.8–42.9 | the headland | The lighthouse on its rock, the open sea behind. Caption: **Across the sea** / *Kesh has its oasis, and Lhar its village*. |
| 6 | 42.9–57.0 | home again | Back at the table. Arthur, a hand toward the floor: "So now can I go down there?" — Zoé "No." and Twinsen "No." a beat apart (he nods); Arthur sulks at the table. Then a cut over Twinsen's shoulder to Zoé's face: "Welcome home." Back to the wide; the camera pulls slowly away from the three and the picture fades to black over the last 1.6 s into the end card (which now shows over that last frame of the family at the table). |

Subtitles: 9 lines (Twinsen 2, Arthur 2, Zoé 3, Gilbert 1, Doran 1), each in its speaker's babble voice (voice.js), the
mouths driven by it (not phoneme lip-sync). Captions: 2. English with Hebrew; dialogue-check PASS (100 % Hebrew).

Acting, honestly: the family stand (Zoé cannot sit in her long dress, as the One Place meal found; standing round the
table keeps every face to the house set's open sides). They play the rig's idle/listen poses with the opening's gesture
layer (four short gestures with a wind-up, overshoot, hold and settle), a nod, expressions (pleased, curious, annoyed,
neutral) and gaze with blinks. Nobody walks, so no foot slides; the family's feet are on the floor every frame (tested).
Gilbert and Doran keep their own epilogue placements and animations (Gilbert's cloth-wipe loop runs through his shot);
their mouths move with their voices. No props are carried, so no hand contacts to keep.

## Runtime notes

- Real-time, in-engine (no video). Scene changes inside the film are the opening's instant ones (house → Citadel at 9.8 s,
  back at 42.9 s); everything the film shows is compiled under the starting black (`compileAsync`, as the opening).
- Preparation under the black: 0.7–1.6 s in the automated runs (SwiftShader, includes the compile and the music's decode).
- No new region is built: every outdoor shot is on Citadel, which is always loaded. (Kesh and Lhar are named in a caption
  over the sea, not visited: building Zeelich/Desert/Hamalayi for a few seconds each would cost 0.6–0.8 s of build each
  on this machine, under black, for a save loaded straight into the epilogue.)

## Test results — automated runtime only (SwiftShader)

Headless Chromium with SwiftShader, fixed-step test clock; no person watched or listened, no real GPU.

- `tests/ending-film.mjs` (SERVE=1, one final run): **PASS, 13 of 13**, no errors. The dinner, then the film (prep
  725 ms under the black); 57.04 s, all five cuts passed in order; house → Citadel → house; 9 lines in their speakers'
  voices, both captions; the family on the floor in every one of 2154 sampled actor-frames in the house, Twinsen never
  hidden there; played out → the end card, ceiling/subtitles/captions/fade gone, camera upright, the family uncontrolled;
  the `homecoming` piece still playing under the card; E pressed through the card's grace does not press a button;
  **skipped at 14 points** (each shot boundary + mid-line points 3.0, 12.4, 22.0, 30.5, 39.0, 46.9, 51.6, 55.9 s): the
  end state identical to played out (state, screen, room, hero/Zoé/Arthur positions, camera, flags, UI); pause and
  window blur stop the clock, resume continues; a replayed film has one ceiling; Keep Exploring → free play, Zoé and
  Arthur back at their places, the objective; save → relaunch → Continue: free play, no film again; `?nocine` → the card
  at once.
- `tests/epilogue-home.mjs` (SERVE=1, ?nocine — the existing ending/epilogue suite, one final run): **PASS, 12 of 12**,
  no errors.
- `node tests/dialogue-check.mjs`: PASS (Hebrew 6624 of 6624 keys, 100 %).
- Frame cost (CPU update + render submit per frame, SwiftShader, the machine shared with other agents' browsers, so
  indicative only): mid-shot frames 3–25 ms; the first frame after the cut into Citadel (9.8 s) 55–79 ms and the cut to
  the harbour (19.2 s) one frame of 92 ms; the cut back into the house about 3–5 ms. No GPU-time or real-hardware figure.

Reviewed by the agent on stills from its own scratch runs (every shot, several mid-line frames, the last frames): the
framing, who is in frame, no clipping seen at the table, the subtitles and captions placed. Not done: watching it at
normal speed in real time, listening to the sound (no audio output here), a real GPU.

## Open

- The one-frame cost at the cuts into Citadel and to the harbour (above): likely the shadow/detail focus moving with the
  shot; worth a look on the GTX 1050 / UHD 620 before it ships.
- The expanded campaign's path (the Cradle Hall scene, then the film) is wired the same way but was not run.
- Gilbert's own cloth-wipe animation loops through his 9.5 s shot (it is his epilogue placement); Doran stands idle.
- A save made at the dinner and quit during the film loads into free play without the film or the card — as a quit on the
  card always did (the film sets no flag and saves nothing).
- Shot 5 names Kesh and Lhar in a caption over the sea instead of visiting them (no region builds).
