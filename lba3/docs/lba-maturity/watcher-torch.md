# P12 — the watchman holds his torch (the user, 11.11.2026)

"The elephant in Zoé's part doesn't hold a torch." The yellow patch on the office floor read as a torch's beam, and his
hands were empty. Same rule as NO-AIR: what a hand does, it does on a real thing.

**Status: Automated runtime only.** Headless Chromium on SwiftShader, staged (the chapter's flags set, the guard let walk
his round with his suspicion held at 0, or at 0.8 for the alarmed picture). Nobody watched it at speed on a real GPU.
No frame-rate claim.

## What was done (src/game/enemies.js, `class Watcher`; nothing else)
- A hand torch in his right fist: a small rigid prop on the hand bone (a dark barrel and head: one mesh; a pale unlit
  lens: one mesh), 1.45× a real one so that it reads from the room's high camera. No light, no shadow caster.
- A faint beam from the lens along the barrel to the floor (one open cone, additive, 12 % opacity, no depth write; its
  length set each frame so that it ends on the floor, 2.6 m at most). 3 draw calls and 114 triangles in all.
- The arm is held by the hand solver (engine/handik.js) as a layer over his walk and his idle (what it turns is put
  back before the rig's next update, as the hands-on-things layer's): the fist before his right hip at waist height,
  the barrel the way he faces and tipped 35° down. It turns with him when he looks back over his shoulder.
- As his suspicion passes 0.35 (where he already stops and stares) the arm comes up and the torch points at whoever he
  has seen; it comes down again as he calms.
- `stop()`: the floor patch and the beam go; the torch stays in his hand, lowered at his side with the arm, while the
  scene still holds him (spotted: he speaks his line); once the scene lets go of him (`npc.controlled` off: Zoé's part
  over, the archive left) it is put away.
- The floor patch's apex is a step before his feet (`watcher.apex`, 0.55 m: where the torch throws it) in the Watcher's
  own geometry. Chapter 2 draws its own clipped fan (story/chapter1.js `updateCone`), whose apex is still at his feet:
  the one-line hunk for it is in the hand-over note (that file was another worker's).
- His sight is unchanged: range, field, the cover rule, the notice and calm rates, his round and his glances.
- The same class is chapter 9's archivist in the archive: he carries the torch too. It reads right there (picture).

## Measured
| | |
|---|---|
| Hand to torch over a 14 s round (420 frames, walking 11.3 m, 53 frames of looking back) | 0.19 cm at the worst (limit 3 cm) |
| The barrel's heading against his facing, on his round | 0.0° at the worst |
| The lens over the floor, on his round | 0.92–0.96 m |

## Suites (base f4519f2d + this file only)
`zoe-resume` PASS, `chapter1` PASS, `depot-watch` PASS, `chapter9` PASS (each: VERDICT: PASS, ALL PASSED).

## Pictures (the game's own camera in the room, 1280×720, deviceScaleFactor 1; chapter 2 unless named)
`captures/watcher-torch/`: `before-after-walking.jpg` and `before-after-toward-camera.jpg` (the same leg of his round,
before | after, a 420×320 window of the frame), `after-leg1.jpg`, `after-leg2.jpg`, `after-leg3.jpg` (walking away: his
body hides the torch, the beam shows before him), `after-glance.jpg` (looking back), `after-alarm.jpg` (the torch
raised at Zoé), `before-leg1.jpg`, `after-archive-chapter9.jpg` (the archivist, tests/chapter9.mjs's own capture).

## Not verified
- Not watched in motion; not on the target hardware; no player-input run of Zoé's part beyond the suites above.
- The arm while he speaks his "spotted" line was not captured.
- In the office the torch is small on screen (he is about 70 px tall at 1280×720): it reads when he walks across or
  toward the camera, and by its beam when he walks away.
