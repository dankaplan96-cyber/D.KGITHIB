# G1-CAM — camera, Group 1 (Citadel, chapters 1–2), Round 1

Role: camera director (round-1 partner: character art, G1-ART). Baseline: `9754da5` (the G1-ART merge on top of
PERF-HIGH). Batch: the coordinator's four items (Vesk's two-shot at the beam pad, the Modern-controls street jitter,
the clear-view search while walking, the Follow camera's cost). The Follow camera's feel at Far (the user's choice)
was not retuned: no distance, pitch, spring rate or swing limit changed.

Commits (worktree, not pushed): `e40645c` (cost), `8efab9b` (two-shot, jitter), `688beae` (tight spots).

Evidence lives in the session scratchpad, `g1-cam/` (not in the repository). Kinds of evidence, kept apart below:
- **automated tests** (camfollow, camclear, camsteady, chapter2 — deterministic stepping, Playwright, headless);
- **staged captures** (scripted flags and placement, then walking and talking **by input** through the player
  harness, `tests/lib/player.js`): `vesk.mjs`, `vglide.mjs`, `tight.mjs`, `csx.mjs` (camsteady with per-frame camera
  state), `prof.mjs` (timing);
- **code reading**.
No normal-input play-through by a person, no target-hardware (Vega 8) run, no motion clips judged by eye: smoothness is
argued from per-frame traces, never from stills.

## Changed files

- `src/engine/camera.js` — the only file changed.

Nothing else was edited. One world change is proposed as a patch for the owner of `src/game/island.js` (item 1), and
one optional line for the owner of `src/main.js`.

## Item 4 — cost of the Follow camera's clearance tests (`e40645c`)

- **Verified: yes.** `prof.mjs` walks camsteady's street, house-wall and standing routes by input under Follow (Far)
  and times `rig.update` per frame; wrapped per method, the sight lines (`_line`) and `_solidAt` were most of it.
- **Cause.** Every 0.25 m sample of every sight line looked colliders up in the physics grid and scenery volumes in
  occlude.js's grid, whose `near()` builds a string key per call (~70 ns; the samples run to hundreds a frame). About
  half the "does this spot see him" questions in a frame were repeats (the clear-view test, the arm's two tiers and the
  lead ask about the same spot).
- **Change.** A line gathers its candidate colliders and volumes once (from its samples' own cells, filtered by
  distance across and height), then runs each sample's unchanged test against them; volumes come from a numeric-key
  grid kept in camera.js (rebuilt when occ.list grows; volumes never move after `add`); `_solidAt` gathers volumes once
  for its 22 points; `_sees` answers repeats within a frame from a small per-frame memo (only during `update`).
- **Results.** Mean ms per frame, this machine, headless, same routes and stepping, run alone one after the other:
  street 0.495 → 0.29, house walls 0.41 → 0.23, standing 0.21 → 0.15; worst frame 13.4 → 4.3 ms.
  **Same results:** the camera's pose before any shake (`rig.base`, `rig.look`) is identical on all 8754 frames of
  the three routes (`g1-cam/prof/trace-b4.json` vs `trace-p2.json`).
  Note: camsteady itself is not repeatable run to run — the LBA camera's routes (code untouched) differ between two
  runs of the same build — because thunder shakes come from `setTimeout`/`Math.random` and enemies/dogs use
  `Math.random`; a single route run alone is repeatable. That is why the identity check uses `prof.mjs`.
- **Risk.** The volume grid assumes volumes are not moved after `Occluders.add` (true today: grep finds no writes).

## Item 1 — Vesk's two-shot at the beam pad (AUDIT-CH12 #13, `8efab9b`)

- **Verified: yes, and worse than reported.** `vesk.mjs`: chapter state set by flags (Zoé's segment done), Follow at
  Far, Twinsen walks up by input from five sides and presses E; every line held 1.6 s, then a raycast from the camera
  to each speaker's head, chest and hips against every drawn opaque mesh. Before: 14 of 40 dialogue frames had a
  speaker hidden. Standing in the arch's ring (the natural spot coming from the gate), Twinsen was behind the arch's
  side for the whole confrontation (`vesk-base/west-through-3.png`); from the south Vesk stood in front of him
  (`vesk-base/south-1.png`).
- **Cause.** (1) Three people round the arch: none of the 48 shoulder-side candidates was clear (most failed "nobody in
  front of him"), and the fallback took the first candidate that was merely clear of walls — posts, rails and the
  arch's leg colliders do not count there — so his face was framed through the arch. (2) When even that failed, the
  previous shot (made for the first speaker alone) was kept. (3) The arch's ring and horns have no camera shape at all
  (colliders on the legs only), so no camera test can see them.
- **Change (camera.js).** The original search runs unchanged first. Failing it, the shot is searched all round the
  group (every 15°, the arm's lengths, a second tilt), nearest the current view and on the same side of the line
  between him and them first; failing a clean one, the one with the fewest faces behind something and nobody in front
  of him. Strict two-shot lines also count the camera's own volumes (`camOnly`: the pipeline, and the arch once
  patched). A new shot more than 60° round from the current one is a cut (a film's cut to the wider shot as someone
  joins); smaller changes glide round the look-at point instead of straight through the group.
- **Results.** Speakers hidden: 14/40 → 0/40 (`vesk-v2.log`, shots `vesk-v2/*.png`). Shot changes: 0 frames inside
  anything, no mid-dialogue camera path through the group (`vglide2.log`; an orbit glide was tried first and rejected:
  ~0.6 m/frame and a 2.5 m keep-out lift on the way, `vglide.log`).
- **Patch for `src/game/island.js` (owner: world/station):** insert after the arch's leg colliders
  (`for (const s of [-1, 1]) P.add({ type: 'cyl', x: BP.x, z: BP.z + s * 1.5, r: 0.5, top: padTop + 5, seeThrough: true });`):

  ```js
      // (G1-CAM: the ring and its horns as the camera's own volumes — occlude.js camOnly —: the Follow camera keeps out of
      // them, a dialogue's two-shot frames no face through them, and a view through them to his feet counts against it as
      // the pipeline's does; the ring's opening stays open. Boxes round the ring (Rc 1.75, tube 0.27, centre padTop + 1.5):
      // its sides with the horns over them, its shoulders, its top)
      for (const s of [-1, 1]) {
        addOccluder(W, { kind: 'box', camOnly: true, x: BP.x, z: BP.z + s * 1.735, hw: 0.34, hd: 0.515, y0: padTop - 0.5, y1: padTop + 5.4, name: 'beam pad arch side' });
        addOccluder(W, { kind: 'box', camOnly: true, x: BP.x, z: BP.z + s * 1.125, hw: 0.34, hd: 0.175, y0: padTop + 2.35, y1: padTop + 3.4, name: 'beam pad arch shoulder' });
      }
      addOccluder(W, { kind: 'box', camOnly: true, x: BP.x, z: BP.z, hw: 0.34, hd: 0.95, y0: padTop + 2.75, y1: padTop + 3.6, name: 'beam pad arch top' });
  ```
  Checked in a scratch copy only (`g1-cam/overlay.py --patch`, served separately): the dialogue shots are unchanged
  (already clear), and after Zoé's dialogue from the west the Follow camera no longer shows Twinsen through the ring
  (`vesk-patch.log`, line 2). Not run with the patch: occluders.mjs and the chapter tests — the integrator should.
- **Optional one-liner for `src/main.js` (owner: main):** in `tryInteract()`, before `this.story.talk(it.npc)`, add
  `(this.talkers ??= new Set()).add(it.npc);` so the person Twinsen walked up to is framed from the first line, even
  when someone else speaks first (Zoé opens the confrontation, so the first shot leaves Vesk behind the arch until
  he speaks: `vesk-v2/west-through-0.png`).
- **Risks.** The arch's patch boxes approximate a ring (a little of the opening's top is counted as solid). A large
  arch leg still fills part of some shots (no face covered). Shots were checked at 1280×720 only.

## Item 2 — Modern controls, street: camsteady jitter (ISSUES I-5, `8efab9b`)

- **Verified: yes, but flaky.** Baseline full camsteady: 109/110, "follow (medium) · street, Modern controls" tilt
  jitter 4 > 3 (Far 0 that run); the route run alone failed at Far with 4.
- **Cause.** Not the residents: they have no physics bodies (walkers.js), so they never enter the clearance tests, and
  the nearest NPC was 20 m away at every jitter (`csx.mjs` logs the nearest NPC). The jitter is one spot, the north
  wall of Bug Street's pair (hero ≈ −64, −18): the Modern-controls bot's 45° key changes swing the view into the wall;
  the arm comes in from 5.7 to 1.6 m in 0.25 s and, inside the eave, the "never in anything" cut dropped the camera
  0.8 m in a frame (its lift reset to the ground's least), flattening the tilt 0.75° against the arm's steepening.
  Residents only change which route variant a run gets (they nudge the hero; thunder shakes and `Math.random` too).
- **Change.** The cut keeps as much of its lift as stands clear, and for 0.3 s after a cut the tilt eases (the look-at
  point drawn nearer along the same way, at most 60%) instead of flattening in the frame. Thresholds untouched.
- **Results.** Route alone, Follow: tilt jitter Far 4 → 2, Medium 4 → 2 (budget 3) (`c-1.log`). Full camsteady on
  `8efab9b`: 111 passed, 0 failed (`c2/camsteady.log`). Final run: see Tests.
- **Risk.** The remaining two jitters at that wall are a let-out-then-in pump from the bot's zigzag; a different
  route variant could still reach 3. Not changed: it would mean holding the arm in longer everywhere.

## Item 3 — clear-view search while walking (`688beae`)

- **Verified: yes.** `tight.mjs` walks four tight routes by input (gate passage to the beam pad, round the fort yard
  and out, Bug Street's north lane, out of the house along the fence), Follow at Far, measuring the arm and camrec's
  restlessness per route.
- **Tried, not kept.** A rise/dip-only search while walking (no swing: a swing while he walks turned the view against
  his own turns, CAM-CLEAR-2's reason). It found the dip under the gate arch, but the rise eases at 0.35 rad/s, so it
  arrived after he was through: gate route arm 0.705 → 0.696 of full, time under half the arm 4.95 → 5.23 s; yard
  0.656 → 0.643. A faster tilt would add exactly the tilt motion camsteady guards. Left out (`tight-w3.log`).
- **Found instead, fixed: camera pops in the gate passage.** Walking through it, the arm came in, the camera stood in
  the gate arch's volume (it starts 2.2 m up) and the last resort lifted it onto the gatehouse roof: +4.7/+5.0 m in a
  frame, back down 5.7 m two frames later, the look point jumping 4–6 m. Now the cut-in also works on the way over his
  head, and where nothing along the tilt is clear it takes the least lower tilt that is (under the arch) before the
  last resort. Gate / yard routes: largest step outside a cut 4.9 / 5.03 → 0.46 / 0.47 m; on a cut 5.74 / 5.69 →
  1.2 / 1.13 m; steepest view 51.7 / 61.7 → 47 / 49°; time steeper than 50° 0 / 2.8 → 0 / 0 s; tilt jitter 1 / 0 →
  0 / 1, height jitter 3 / 5 → 2 / 4 (`tight-b0.log` baseline, `tight-w5.log` after). Lane and house routes
  unchanged but for cut-ins of 0.2 / 0.8 m.
- **Risk.** That fallback can change the tilt by up to ~0.6 rad in a frame (largest turn step measured 1.7°/frame on
  these routes, but other passages are untested).

## Tests (final commit `688beae`, served on port 8207)

Command: `TMPDIR=/dev/shm GAME_URL=http://localhost:8207/ node tests/<name>.mjs` (logs in `g1-cam/final/`).

| test | result |
|---|---|
| camsteady | 110 passed, 0 failed — VERDICT PASS (Modern street route, Follow: tilt/height jitter Far 2/1, Medium 2/3; budget 3) |
| camfollow | 31 passed, 0 failed — PASS |
| camclear | 14 passed, 0 failed — PASS |
| chapter2 | 18 passed, 0 failed — PASS |

Also on `8efab9b` (before item 3): camsteady 111/111, camfollow 31/31, chapter2 18/18 (camclear interrupted by the
container restart). On the cost commit's snapshot: camfollow 31/31, camclear 14/14, camsteady 108/110 (both Modern
route budgets, the pre-existing I-5, before its fix).

Baseline `9754da5`: camsteady 109/110 (I-5), camfollow 31/31, camclear 14/14, chapter2 18/18.

## Not done / unverified

- Target hardware (Vega 8, 1366×768) timing; window sizes other than 960×540 (tests) and 1280×720 (captures).
- Controller and mouse aim: not touched (lock-on and input mapping code unchanged).
- The island.js and main.js patches: proposed, not applied; the arch boxes are untested in occluders.mjs/chapter tests.
- revealcam.js: read, not changed (not used by these scenes).

## Resumable checkpoint

Branch head `688beae` in this worktree. Next: integrate the three commits; apply the island.js arch patch (world owner)
and rerun `node tests/occluders.mjs`, camclear, chapter1, chapter2 with it; optionally the main.js one-liner.
Scratch tools: `g1-cam/vesk.mjs` (OUT=… ONLY=…), `tight.mjs`, `prof.mjs`, `multi.sh` (camsteady Modern route with
per-frame state).
