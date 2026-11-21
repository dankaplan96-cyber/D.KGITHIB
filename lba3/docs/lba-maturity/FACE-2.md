# FACE-2 (P86): expressions that read at dialogue distance

From FULL-TEST.md §3.2 (P79's probe, `tests/p79-faces.mjs`): at the game's dialogue camera Zoé's head was ~73 px tall in
a 1280×720 frame, her "curious" and "concerned" looked alike, and Twinsen was seen from behind, so his face never showed
while he talked. FACE-1's faces showed only in close-ups. The user, 18.11: "the characters lack even basic facial
expressions".

Baseline `a4e1fb45`. All results: **Automated runtime only** (headless Chromium, SwiftShader; a machine shared with the
other worker's runs). No human has looked at it in play yet.

## What changed

### 1. The dialogue camera favours whoever speaks (`src/engine/camera.js`, `src/main.js`)
The dialogue two-shot (CAM-CLEAR-2's, Follow camera, outdoors and outdoor rooms) now favours the face that speaks
(`_favPose`):
- The camera stands on the listener's side of the pair, 0.62 rad (about 35°) off the line from the speaker to them,
  at the distance where the speaker's head is about 0.18 of the frame's height (~120–140 px at 720 px tall). It looks a
  little under the speaker's head, partway toward the listener, so the face sits in the upper half of the frame.
- **When Twinsen speaks, a reverse shot**: over the other's shoulder, at his face. Both shots stay on the side of the
  line the talk started on, so who stands left and who stands right never swaps.
- **Calm**: a change of speaker cuts to the other side only after a shot has been held 2.2 s, and only in the first
  2.5 s of a line (a short reply stays on the shot it has). A change of favoured face is always a cut, as in a film. A
  shot re-set for the same face glides. When the talk ends, the view is back on his side before the chase takes over
  (it never eases from a shot on his face into the chase behind him). So the controls hand back from the usual view.
- **Rules a candidate must keep**: the speaker's face at most ~72° from facing the lens. The speaker's head and chest
  seen (strict lines: posts, rails and arches count). Nobody's head, shoulders or chest over the speaker's face, with a
  margin. Every head above the dialogue box. The speaker's triangle below the frame's top. The camera at least 1.7 m from
  anyone, never in or within 0.4 m of anything solid (`_solidAt`, as before), and lifted over the ground as the chase is.
  Then costs: a listener's head cut by the frame's edge, the bystanders in the way (CAM-CROWD), and a collider within
  0.45 m of the lines to the faces and bodies in the first 3 m from the lens (`_fgClutter`, a prop big in the
  foreground). If no candidate is clear, it falls back to the old two-shot (`_talkPose`).
- **A second look** 0.8 s into a shot: if someone was still stepping when it was set (moved > 0.3 m), or the favoured
  face never turned to the talk (a pair chatting on a bench), the shot is set again from where they are and how they face.
- `main.js`: `camRig.speaker` (who speaks now) and `camRig.faceOf` (a head's place and scale, the way it faces now, and
  for someone seated or asleep the way it keeps). The opening's gold step marker (tutorial) is hidden while a talk is
  open, because it hung over Zoé's head in the closer shot. Play puts it back.
- Not changed: cinematics and scripted cameras (`camRig.override`, `cine`: the two-shot is never reached). Interiors
  (the iso view). The LBA2 "Fixed" and "Free" camera modes. The chase itself.

### 2. The expression carried by the head and chest (`src/engine/rig.js`, face section only)
- `FACES` has three more values per expression, eased with the face: **nod** (head down + / chin up −), **tilt** (head
  to one side), **bow** (chest forward + / drawn up −). Curious: a tilt (0.2 rad). Concerned: head down 0.2, chest 0.08.
  Determined: chin up 0.13, chest up. Pleased: a small lift. Uncertain: a smaller tilt the other way, head a little down.
  Annoyed: chin a little up.
- They are added to the head and torso only in the standing poses (idle, talk, listen), with a weight eased in and out
  (`_faceW`). Walking, running, the throw, fights and every limb pose are untouched (one line next to the head's `set`).
- Brows, lids and mouth slightly stronger where curious and concerned were alike: curious brows up 1.0 (was 0.85), eyes
  1.16 (1.1), smile 0.18. Concerned inner brows 1 plus up 0.25 (0.15), eyes 0.9 (0.94), mouth −0.95 (−0.7). Morph
  influences stay within 0..1.

## Measured (px tall, 1280×720 unless noted; head box as P79: the head bone ±, 0.54 m a unit of scale)

| Where | Before | After |
|---|---|---|
| Yard, Zoé speaking (p79, first line) | 72–73 | 132–134 (earlier runs of the same build: 117–131: it varies with where the walk stops) |
| Yard, Zoé speaking (face-2 probe, every Zoé line) | 73 | 131–132 |
| Yard, Twinsen speaking | 108, **seen from behind** (face 122° from the lens) | 138, face 52° from the lens (three-quarter) |
| Citadel, Granny Ume | 83 (face 68°) | 126–130 (40–50°) |
| Citadel, Tilde (on the bench, chatting) | 71, **her back** (158°) | 134, 71° (near profile: she keeps facing Maro) |
| Citadel, Maro | 86 | 130–135 (face 40°) |
| Citadel, Corla (ticket booth) | 74 | 73–75, unchanged (no clear favoured shot through the booth: the old two-shot) |
| Yard at 1024×768 (4:3), px of 768 | — | Zoé 138–140, Twinsen 142 |
| Yard at 1366×768, px of 768 | — | Zoé 137–140, Twinsen 146 |
| Follow camera in play (no talk) | 34–46 | unchanged |

Curious vs concerned at the dialogue camera: `captures/face-2/p79-zoe-heads-before-after.png` (top: before, 73 px,
neutral / curious / concerned alike; bottom: after: curious tilted with wide eyes, concerned head down with the mouth
down), and `captures/face-2/after/{zoe,hero}-speaks-{curious,concerned}-head.png` (Twinsen's own, in the reverse shot).
Close-ups of all six on both (FACE-1's probe, after): `captures/face-2/closeups/sheet.jpg`.

Motion (stepped at 1/60, face-2 probe, yard talk of 4 lines, 2 changes of speaker): **2 cuts** (at the change to him and
back to her, ~2–3 m jumps), no other frame moves the camera more than 0.18 m (the ease into the talk, as before: 0.14).
Before: no cuts (one shot for the whole talk). The camera was never inside anything solid in any talk or after one
(yard, staged wall spot, 4 Citadel talks). These are traces, not a judgement of smoothness by eye.

## Evidence
- `tests/face-2.mjs` (new): the yard talk by input, every line measured, cuts and solids traced, curious/concerned
  forced on a line of each. `GAME_URL=… node tests/face-2.mjs` (`OUT`, `W`, `H`, `SPOT=wall`). Before:
  `captures/face-2/before/` (the base build served from a copy). After: `captures/face-2/after/`,
  `after-1024x768/`, `after-1366x768/`. Side by side: `captures/face-2/shots-before-after.jpg` (top before, bottom
  after; left Zoé speaking, right Twinsen speaking).
- `tests/face-2-tour.mjs` (new): the nearest people on Citadel talked to by input. `captures/face-2/tour-before/`, `tour/`.
- `tests/p79-faces.mjs`: before `captures/face-2/before/`, after `captures/face-2/after/` (`sizes.json`).
- `tests/dialogue-scenes.mjs` first-line pictures after: `captures/face-2/dialogue-scenes/` (its own folder,
  `captures/dialogue-edit/`, left as committed).

## Tests (Automated runtime only)
Final build `f8177464` plus this doc. One browser at a time, served with `python3 -m http.server`.

| Suite | Result |
|---|---|
| `tests/face-2.mjs` (new), 1280×720 / 1024×768 / 1366×768 | **9/9** each. Before, on the base build: 7/9 (Zoé's size; Twinsen's face) |
| `tests/face-2.mjs SPOT=wall` (staged: his back ~0.7 m from the nearest solid) | 9/9, no frame in anything solid. **Run on an earlier step (before 1b's re-check and the prop cost), not rerun on the final build** |
| `tests/face-2-tour.mjs` (new) | **5/5** (Ume, Tilde, Maro, Corla talked to; Bram's walk was cut off by a story line). Before: 4/5 |
| `tests/p79-faces.mjs` | PASS (it records; sizes above) |
| `tests/faces.mjs` | **7/7** |
| `tests/dialogue-scenes.mjs` | **10/10** |
| `tests/opening-tutorial.mjs` | **43/43** |
| `tests/controls.mjs` | **89/92**: the same 3 known "no lurch" failures (KNOWN-FAILING), the same numbers (p95 12.5 / 14.3 / 12.8). No new failure |

Saves: nothing saved or loaded changed (the camera's two-shot state and the face's posture are not saved).

## Cost
Per frame: one call for the speaker and a few comparisons in the two-shot; per character, one damp and three adds in
the rig. The shot search (up to 360 candidates, pruned; most end within the first few) runs only when a talk starts,
someone joins, the speaker changes past the hold, or once 0.8 s into a shot. Not measured on a real GPU.

## Open / unverified
- Not seen by a person in play; no real GPU; the cuts are traced, not watched.
- A prop with no collider of its own (a street sign's board) can still stand in the foreground. Seen in dialogue-scenes'
  staged D2/D3, where the test puts him beside the Bug St. signpost: Zoé large and clear, the board over his lower body.
- At 4:3 the listener is usually out of frame (a clean single on the speaker).
- Short replies under 2.2 s after the last cut keep the other's shot (by design, to stay calm).
- Corla at the ticket booth keeps the old wide two-shot (the booth hides any closer view of her).
- The LBA2 "Fixed" camera and the "Free" orbit are unchanged: their talks stay as before (faces small).
- Partner review needed: `rig.js` is shared with JOINTS-BLENDER (order 57). FACE-2 touched only `FACES`, and one
  guarded line before the head and torso `set` in `Rig.update`.
  (FACE-3 below closes the sign, Corla and Fixed/Free items.)

---

# FACE-3: FACE-2's open items (a prop with no collider, Corla's kiosk, the Fixed and Free cameras)

Baseline `d6551c8d`. All results: **Automated runtime only** (headless Chromium, SwiftShader, 1280×720, on a machine shared
with another worker). Nobody has looked at it in play. FACE-2's rules hold: the camera stays on one side of the line, a shot
is held 2.2 s, heads stay above the dialogue box, the camera is at least 1.7 m from anyone and never inside a solid, and the
old two-shot is the fallback. Only `src/engine/camera.js` and the FACE-2 hooks in `src/main.js` changed.

## What changed

### 1. Props with no collider of their own (the Bug St. sign)
Cause: the shot search knew only colliders. The yard's Bug St. sign (`town.js` `sign()`) has a collider for its post only
(0.12 m round). Its board (1.1 × 0.3 m, at chest height) has none.
- `camRig.propsNear` (main.js, beside `faceOf`) walks the scene for meshes drawn within 7 m of the favoured face. It skips
  characters, hidden or see-through meshes, draw-batch copies, anything more than 1.6 m round (merged groups and
  buildings are bigger and have colliders) and anything under 0.1 m.
- `_fvProps` keeps each mesh's inverse world matrix and its own box (padded 0.15 m). The meshes are gathered **once per
  talk**, and again only if the favoured face is 1.5 m from the last gathering. Measured in the yard: the walk took
  0.8–5.1 ms and found 15 meshes. Nothing runs per frame outside the shot search.
- `_fgClutter`: a foreground line (first 3 m from the lens) through a prop costs 4× a nearby collider, counted once per line
  at the higher cost. Before this, the post's padded collider was met first along the line and the board was never counted.
- `_propOver`: a prop over the line to the **speaker's face** rules the shot out.
- A prop whose own unpadded box holds one of the heads (a booth or an arch round someone) is ignored.

### 2. Corla at the ticket kiosk
Cause (measured): the kiosk has **one collider for the whole booth** (hw 1.11 × hd 0.76), and Corla stands inside it.
Every strict line to her face ended in it, so no favoured shot passed and the old two-shot came back. From the hatch that
shot looked down through the awning (head top hidden, 99–100 px). From the kiosk's side the wall hid her completely
(94–96 px, 4 of 4 body points hidden). FACE-2's tour, which gave the 74 px, walks up to the kiosk's back corner.
- `faceOf` also returns `home`, the direction an NPC's placement faces. Corla is placed facing the hatch.
- `_booth`/`_hatch`: a box collider no wider than 2.5 m round the face is treated as a booth. Its side nearest `home` is
  the open side. A shot must lie within 0.75 rad of that side's normal and see her through that side, at least 0.2 m in
  from its ends. It must also be close to face height: tilts 0.04 / 0 / 0.08, with the line rising at most 0.1 per metre
  to the lens. This keeps the line under the awning at her brow, which the collider does not model. Only these lines may
  pass the booth's own collider.

### 3. Fixed (LBA2) and Free cameras: talks out of doors take the favoured shot
Evidence: before, the yard talk showed Zoé at **27 px** (Fixed), **24 px** (Fixed with the 1997 look) and **35 px** (Free).
Twinsen was seen from behind (97–137°). In Free the view stood over a roof edge with Twinsen as a see-through outline
(`captures/face-3/before/free-line0-zoe.jpg`). Also, every gamepad player is switched to Free automatically
(`controlsByDevice`: a pad sets Modern + Free), so FACE-2 never reached them. The player has no camera control during a
talk, and the chosen mode still governs all play.
- `_talkOver`: the chosen camera runs first, then the same `_talkShot` is laid over it and eased in and out over 1.1 s.
  With the 1997 look (Fixed with hard cuts) it **cuts** in and out instead. Follow's CAM-AFTERTALK hold after a talk
  stays Follow's alone.
- Hand back: the chosen camera's own view is saved each frame, and `_ownView` puts it back before that camera runs next
  frame. The mode runs underneath as if no talk were shown (the LBA cuts test the frame they had). Once the talk has eased
  out, the view is the mode's own again. **Measured: identical to the build before** at the same moment after the same
  walk and talk (0.000 m, 0.000 in direction; Fixed, Fixed 1997, Free).
- The camera's matrices are updated once the shot is laid over the mode's view.

## Measured (head px of 720; the face's turn from the lens)

| Case | Before (`d6551c8d`) | After |
|---|---|---|
| D2 spot, the Bug St. board | over Twinsen's chest and waist, 1.0–1.6 m from the lens, on 1–3 of 4 lines (two runs) | at his knees on 2 lines, clear on 2: never over a head, chest or waist |
| D2 spot, Zoé speaking | 127–133 (51–56°) | 127–142 (51–56°) |
| Corla, from the hatch | 99–100, old two-shot, head top under the awning | **128–135**, favoured, 36–44° |
| Corla, from the kiosk's side (staged) | 94–96, old two-shot, behind the wall | 130–134 through the hatch, 59–62° (near profile) |
| Corla, FACE-2's tour (walked up to the kiosk's back corner) | 74 | 74, unchanged: from behind, no shot shows her face (see Open) |
| Fixed: Zoé / Twinsen | 27 (35°) / 28, from behind (137°) | **130–135** (26–30°) / 129 (36°) |
| Fixed, 1997 look | 24 / 24 (103°) | 133–136 / 129 |
| Free | 35, from a roof edge / 37 (97°) | **99–103** (28–29°) / 135 (46°) |
| Follow (path unchanged, a check) | (FACE-2: 131–134) | 132–134 / 114 |

Free takes a wider camera (55°), and from the orbit's side of the line only the 1.28× distance was clear. Hence the
smaller head.
Motion (stepped at 1/60, traced, not watched): Fixed and Free make 2 cuts per talk (to his line and back), as Follow does.
Easing back into the chosen camera moves at most 0.17–0.28 m per frame. Fixed 1997 also cuts in (12.7 m). In every talk
here the camera was never inside a solid.

## Evidence
- `tests/face-3.mjs` (new). `SEC=scenes` (default) runs the D2 spot and Corla from the hatch and from the side.
  `SEC=lba|lba97|free|follow` runs the yard talk walked up to and opened by input under that camera. `REF=<the before json>`
  compares the view after the talk with the build before. "Covered" is the test's own three.js rays from the lens to head,
  chest, waist and knees against every drawn mesh except characters.
  `GAME_URL=… [SEC=…] [REF=…] OUT=captures/face-3/after node tests/face-3.mjs`
- Before: `captures/face-3/before/` (the base build served from an exported copy). After: `captures/face-3/after/`.
  Pictures: `sign-line*`, `corla-{hatch,side}-line*`, `{lba,lba97,free}-line*`, `follow-line*` (after only). All of
  them are chapter 1 (the yard, the spaceport kiosk).
- The regression suites' pictures: `captures/face-3/suites/`. Committed captures the suites overwrite were restored.

## Tests (Automated runtime only; final build plus this doc)

One browser at a time, served with `python3 -m http.server`. The machine was heavily loaded by the other worker's runs
(load average about 12 on 4 cores).

| Suite | Result |
|---|---|
| `tests/face-3.mjs` (new), `SEC=scenes` | **6/6** (before: the board over his chest/waist; Corla from the hatch not favoured) |
| `tests/face-3.mjs`, `SEC=lba` / `lba97` / `free` with `REF` | **6/6** each (before: the favoured-shot check fails in all three: 27 / 24 / 35 px). In Free, the final run passed with the 90-px floor (99–103 px) |
| `tests/face-3.mjs`, `SEC=follow` | 4/4 |
| `tests/face-2.mjs` (yard) and `SPOT=wall` | **9/9** and **9/9** (Zoé 130–134, Twinsen 129–140, 2 cuts, never in a solid) |
| `tests/face-2-tour.mjs` | **5/5** (Ume 128, Tilde 101, Maro 128; Corla 74, from the kiosk's back: see Open) |
| `tests/dialogue-scenes.mjs` | **10/10** (D2/D3 pictures: `captures/face-3/suites/dialogue-scenes/`, the board beside him, not over him) |
| `tests/p79-faces.mjs` | PASS (dialogue: Zoé 130–131, Twinsen 198–199; play unchanged) |
| `tests/opening-tutorial.mjs` | **43/43** |
| `tests/controls.mjs` | **89/92**: the same 3 known "no lurch" failures with the same numbers (p95 12.5 / 14.3 / 12.8). No new failure |

Saves: nothing saved or loaded changed (no save field; the camera's talk state is not saved). Old saves load as before
(opening-tutorial's old-save checks C1/C2 pass).

## Cost
- Props walk: one scene walk per talk (0.8–5.1 ms measured on SwiftShader's CPU; 15 meshes kept in the yard), then a box
  test per sample point in the shot search only.
- Booth test: one collider lookup per search.
- The overlay in Fixed and Free: nothing outside a talk (one `talk()` call a frame). In a talk, the same work as Follow's
  two-shot plus one pose save and restore. Not measured on a real GPU.

## Open / unverified
- Nobody has watched these in play. No real GPU. The cuts and eases are traces.
- From the kiosk's side, a street sign merged with its boards (a 2.29 m-round mesh, over FV_PROP_R) stands faded over
  Twinsen's head near the lens. Raising the limit to 2.5 m let that coarse box rule out every hatch shot (Corla lost her
  shot), so it stays 1.6 m. A finer test of merged meshes (by triangle) would cost too much per search.
- **Corla talked to from behind the kiosk** (FACE-2's tour walks up to its back corner, and the Talk prompt opens
  through the back wall): she turns to him, away from the hatch, so no shot can show her face. The old two-shot stays
  (74 px, the kiosk's back wall in view). That is the talk prompt's reach, not the camera's. Proposal for the owner of
  the NPC/talk code (not done here: outside these files): a kiosk clerk answers only from the hatch's side, or turns to
  the hatch.
  **Done (OVERLAP-3 night, 21.11):** an NPC def may carry `talkAhead` (metres): `findInteractable` (main.js, one isolated
  line in the people loop, not the frame loop) offers Talk only when Twinsen stands at least that far ahead of the way
  the NPC is placed facing. Corla has `talkAhead: 0.7` (story/stands.js): the hatch side only; from the back corner and
  the side walls there is no prompt. Automated runtime only: face-3 PASS (from the hatch 132 px, 36°; the staged side
  case now opens no talk: INFO line empty), face-2-tour PASS (its walker reaches her back corner and gets no prompt,
  `cs_corla: no prompt`; the tour talks to three others), citadel-structures and spaceport-2 talk to her from the path.
- The booth rule trusts that someone placed inside a box collider faces its open side (true for Corla; not checked for
  every NPC: only small box colliders round a face, with a placement direction, are affected).
- Free's heads are 99–103 px, just at the 100-px target (the camera's wider lens and the side of the line).
- In the D2 spot the board can still show at his knees (the shot keeps faces, chests and waists clear).
- Partner review: none needed for rig or animation (no `rig.js` change). Camera hooks only.
