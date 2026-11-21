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
