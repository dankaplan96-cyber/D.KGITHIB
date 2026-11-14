# REV-TY-4 — independent review of TY-3 (Desert Island: Kesh and The Wind-Catcher), 0.26.0 at 0e278f0

Reviewer: the lba3-reviewer agent (report relayed by the main session). No game source changed. Own server :8148;
SwiftShader 1280×720; the normal "lba" camera. Route by input, chained by real saves: REV-TY-2 save-05 → segment
06 → chapter-4 start (save-06). Chain A: Kesh before the pump → 07 steps 1–3 → Lumi's screen → fit/turn/reward →
07 steps 4–8 → yacht rides → 07 to the end → 08 to chapter 6. Chain B: 07 without Kesh → Kesh in chapter 5
screen-first, unpaid → 08 to chapter 6. ISO (logged): a planner trap scan; HP 1 / clovers 0 for a fall death; hero
x/z edited in save copies at 8 former open-dune spots; fixed render-count cameras; a read-only yacht sampler.

Verdict: accept TY-3 for the tested scope once D1 is fixed; D2–D5 Low.

| Criterion | Verdict |
|---|---|
| Reused building with owner and use | PASS |
| Altered transport route with a visible reason | PASS (D2, D3) |
| Excavation | PASS |
| Adaptations in use | PASS |
| The Wind-Catcher by input, both orders | PASS |
| Setback and recovery | PASS (D1) |
| Visible consequence | PASS (D4) |
| Reward safe and appropriate | PASS |
| From chapter 4; chapters 4–5 not blocked | PASS (07/08 rc 0 with Kesh untouched, mid-way, done, done-unpaid) |
| Chapter 5's jar-and-shovel errand first | PASS |
| Save/Continue in every state | PASS for the states tested (not: screen fitted, not yet turned) |
| Lines change with chapter events | PASS (after-vent only via flags) |
| English, short; no invented canon; FunFrock dead; no Earth night | PASS (N1, N2) |
| Crank and stair readable | PASS |
| Wind readable without Sani's hint | FAIL (Low, D5) |
| Stair/roof: falls, traps, parapet | PASS (jump over the parapet: 2 HP fall; off the stair side/top: 0 HP) |
| Collision/access around new props, moved Lumi | PASS |
| Sand drift with the yacht and walking | PASS ride; FAIL D2 pole |
| Yacht stop in chapter 5 | PASS function; D3 legibility |
| Performance counts | MEASURED: draw calls +4…+21% (cool-room door 291→353), triangles +2–5%; GPU BLOCKED |
| Regression on 0.26.0 | PASS (chapter4, chapter5, townlife 30/30, workshop 31/31, stability 16/16, resume 2/2, desert-life 24/24, playthrough 06/07/08 rc 0, no deaths, no assists) |

Defects
- D1 (Medium): with sand in, the door always adds "(Up on the roof, the wind-catcher's mouth is turned the wrong
  way.)" even when the mouth faces the wind; Brosk's "do the opposite" pushes the same way. src/game/story/kesh.js
  appends k_door_hint unconditionally (line ~86). doorhint.log
- D2 (Low): the yacht passes through Hesk's flag pole at local (−18.1, 8.1) on the return ride from the dig (0.99 m
  from the line; crossbeam 1.6 m each side); (8.2, 11.0) may graze a wheel. save-k6b.json, yachtclip.log,
  shots/yacht-pole-clip.jpg
- D3 (Low): the chalked NO FERRY covers "CAMP · DIG · KESH" (reads "CANO FERRYSH"); "ask Hesk" illegible from the
  player's spot. shots/board-ch4-ch5.jpg
- D4 (Low, readability): from the camera at the crank (looking west), the mouth/screen/streamer are on the cowl's far
  side when it faces the wind; after the sand the roof camera hides the door and the sand behind the awning.
  shots/roof-crank-before-after.jpg, door-views.jpg
- D5 (Low): the wind can't be read at the cool room without Sani's hint (pump wheel and nearest pole off-screen from
  the roof; rags end-on from the village); they read sideways at the yacht stop and the drift. shots/poles-endon-crop.jpg
Notes: N1 TWELVE_YEARS.md says no line says why he built them, but Brosk says FunFrock built it "to keep us out" (fix
the doc). N2 text says jars/dates are "Inside" but the props stand under the porch awning. N3 the door heal is
unlimited by design. N4 nothing points to Lumi as the screen's source before the pump. N5 payment held until after
the shovel; if the island is left, it waits until chapter 10.

Not tested: GPU look/frame rate; feel by hand; gamepad/touch/input switching; focus loss; settings mid-story; Continue
with the screen fitted but not turned; after-vent and chapter-10 lines by input.

Files here: rev.mjs, seg07-part.mjs; logs (k4dry, k4screen, chk-k3, k4fit, yacht, yacht2, yachtclip, k5, doorhint,
death, prompt, board-ch4/ch5, oldpos-*, perf-*, seg06–08*, reg-*, desert-life-test); isolated saves save-*.json
(origin 127.0.0.1:8148); shots/*.jpg (564 KB).
