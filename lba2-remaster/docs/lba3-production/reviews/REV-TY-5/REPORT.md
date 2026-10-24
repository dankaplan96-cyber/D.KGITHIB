# REV-TY-5 — independent review of TY-3-FIX (0.26.1) and TY-4 (0.27.0, Zeelich's street and The Second Bake)

Reviewer: the lba3-reviewer agent. No game source changed. Evidence: logs, scripts and saves in the session
scratchpad (`rev5/`); the cited screenshots are in `shots/` (converted to JPEG).

Revisions: main evidence on head 1f2dc97 (`H-` files, served from a `git archive` snapshot); 3ddb934 (`A-`);
b6a360c, c736fa3, 632db3d, 3391c8d only to bisect chapter10.mjs. One server, one browser at a time, SwiftShader
1280×720, the normal camera. Input route from real saves of REV-TY-1 (save-02, chapter 2) and REV-TY-4 (save-05,
chapter 3 on Zeelich), chained by Esc → Save & quit → Continue. "ISO" lines are flag setups (chapters 4, 9, 10).

**Verdict: accept TY-3-FIX and TY-4 for the tested scope.** Every REV-TY-3 item is closed by input; the bake is
playable both ways. D1–D3 Low. T1 (Medium) is a test problem outside the reviewed code, but chapter10.mjs cannot
re-prove "chapter10 ×3 pass" on the current head.

## TY-3-FIX
| Criterion | Result | Evidence |
|---|---|---|
| TY-1 D1: coupler visible from the normal camera at every heat stage | PASS | Raycasts to 4 drum points seen at stages 0–3 from SE (near), W (far) and E; shots/H-coupler-near.jpg, H-coupler-far.jpg |
| Glow stages distinguishable at play distance | PASS (N3) | near: dark brass → red-orange → orange halo + wall light → yellow-white flicker + steam; far: the wall light is the cue |
| D7 + N2: Hero.walkTo at walking pace, through nothing solid | PASS | peak 1.9 m/s, 2–4 s to the grip; stick cancels within 8 frames; Esc pauses it |
| Stroke pose: hands on the grip in every stroke frame | PASS | 6 strokes, hands-to-grip ≤ 0.052 m; handle −0.42 → +0.26 rad |
| Stroke readable (human note) | PASS from the trough side and beyond the pipe (N2) | shots/H-pump-strokes.jpg |
| N3: pump answers from any side | PASS | "Pump" from E, SE, S, SW, W, beyond the pipe; N too; NE/NW give Bram's Talk (he stands there) |
| Pump story with Save/Continue between strokes | PASS | strokes kept across Continue; clover picked; drink heals 7 → 10 |
| N1: c10_bal_2/3/pair lines | PASS (text) | workshop 32/32 |
| N4: ASSISTED verdict | PASS at 3391c8d; BLOCKED at head by T1 | exit 2 with C10_MAX_THROWS=0 at 3391c8d |
| Regression at head | PASS except chapter10 (T1) | townlife 35/35, workshop 32/32, chapter2 rc 0, stability 16/16, no page errors |

## TY-4
| Criterion | Result | Evidence |
|---|---|---|
| Ball way by input, talking to no one first | PASS | one throw knocks the crate off; oven hot; crate leaves the aim list |
| Shove way by input, stair climbed holding Up (Classic) | PASS | E at the flue afterwards is a look |
| Alternate orders | PASS | no talk / Bzizz first / Snuff never asked |
| Save/Continue in crate states | PASS | on the roof with the crate on the flue; mid-fall; paid and broken; owed coin (zeelich-life 31/31) |
| Reward | PASS | 5 kashes once; a roll heals 1 → 4; hatch reachable with Tavo beside the counter |
| Lines change across chapters | PASS (D3) | chapters 3, 9, 10 keep their own Nara/Oku lines |
| Access/collision: stair, roof, burrow hatch | PASS | 12 points around the watch house; parapet and balustrade hold a hop; counter not standable |
| No regression of chapters 2/3 on Zeelich | PASS | segment 06 by input to chapter 4; chapter2, chapter9 rc 0 |
| English, short; no invented canon | PASS (D1) | |
| Readability (human note) | PASS | shots/H-zeelich-bake.jpg, H-zeelich-places.jpg |

## Defects
- **D1 (Low, narrative):** the ball way plays roof-only lines — on the street Twinsen says "Somewhere below, the
  heat box clicks…" and Snuff asks "Was that you on my roof?" (also after Continue from a mid-fall save).
- **D2 (Low, UX/narrative; the known gap, broader):** from the roof's SW corner (1.94 m from Snuff, 4 m above) the
  Talk prompt appears and plays her whole first conversation, including "The guards' stair is round the side."
- **D3 (Low, narrative):** once asked, Snuff and Bzizz repeat one line in every phase until the bake is done; their
  phase lines are heard only if the first talk happens in that phase.
- **T1 (Medium, test/regression outside the reviewed code):** chapter10.mjs ends NOT DONE on head (3/3 + 2 probes;
  1/2 at 3ddb934; passes at b6a360c, c736fa3, 632db3d, 3391c8d). The teleport-talk spot (1599.65, −1.15) facing Zoé
  picks a lighthouse "roomsearch" ("Nothing here.") because Zoé's facing differs between revisions; c10_zoeAsk stays
  unset. A player standing there could also get "Nothing here." instead of Zoé.

## Notes
- N1 (cosmetic, 3ddb934 only): E during the walk-to-grip outside the prompt radius made Normal's hop.
- N2 (camera): approaching the pump from the south after a Continue, the camera stays far and low (pump ≈ 60 px).
- N3: in a still frame "about to trip" can look paler than "glowing"; sparks, ticking and the toast carry it.
- N4: the newer merges are not otherwise reviewed.

## Not covered
GPU look and frame rate; athletic jump off the roof/stair; gamepad, touch, focus loss; chapters 4–8 on Zeelich by
input (ISO room switch only); death and reload on the roof; render counts; feel by hand.
