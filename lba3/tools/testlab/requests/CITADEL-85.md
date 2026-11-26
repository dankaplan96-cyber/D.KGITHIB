# CITADEL-85: the curator's top Citadel fixes, a candidate for the user

The laptop, 9–10.11.2026. Worktree `C:\Users\dan\lba3-o26`, detached at origin `68315019` (`ccr-c1c2c4b9-dep6ed`).
Nothing is committed. The diff is `CITADEL-85.diff` (`git diff HEAD -- lba3/src`). It applies to `68315019`: checked
with `git apply --cached --check` on a scratch index.

Sources: `docs/lba-maturity/resemblance-citadel.md` (§1, §2, §4, §6, §8, the ranked fixes). LBA2's shapes were
looked at in the curator's decoded renders, in place. Nothing from them is in the repo: no assets, no renders.

## What changed

| Place | LBA2 (curator) | Now | File |
|---|---|---|---|
| Lighthouse (fix 1) | square white stone tower, grey quoins, glazed lantern, domed grey cap, low annex with a wooden door | Square white tower with cut corners (half-width 2.2 m). Grey dressed quoins in long and short courses. Grey upper stage, corbelled gallery, dark teal railing. Octagonal glazed lantern with a wooden frame, domed grey cap, finial and rod. Octagonal rubble footing. Stone annex on the door side under a lean-to of boards, with the wooden door, a lantern and the old steps. White and grey only: the red bands are gone | `lighthouse.js`, `world.js` |
| Bersimon's tent (fix 3) | a rounded red tent | One red canvas lathe: an upright wall that swells into a rounded roof with a point. 16 gores, a dark hem with a gold line, 12 small gold stars. The gold ring and the moons are gone. The pennant is gold | `wizards.js` |
| Long hall (`baggage`, fix 2) | grey barrel vault along its length | A ribbed grey slate barrel along the 15 m length. The arched ends are the side walls; the front has a straight eave instead of the big gable | `architecture.js` (new `barrel`), `town.js` |
| Nell's (`wing2`, fix 2) | brown barrel roof of boards | A plank barrel. The arch is over the door end (where the gable was), with gutters, a downpipe and the chimney | same |
| Bug Street pair (fix 4, optional) | low pale roofs with a teal coping | Low hip roofs (pitch 0.2) of pale stone slabs, with teal eave boards and teal ridge and hip caps. Chimneys kept | `architecture.js` (new `hip`), `town.js` |
| The school (`stone`, fix 4, optional) | brown tiled hip roof with a teal coping | A hip roof (pitch 0.5) of brown-red tiles with the teal coping | same |
| Square lamps (fix 4, optional) | four gold globe lamps | The four lamps at the original's corners now have gold globes: one shared material. Their two point lights are warm (`#ffd9a0`, was `#9cc8ff`) at the same strength. No light added | `town.js` |

**Kept:**
- The lighthouse: its place, the door at +z with LIGHTHOUSE_DOOR 3.7 m out, the r 3.1 cylinder, the doorstep, the
  four steps and their colliders, the lamp material, the beam and light (`lampY` 16.4 m, was 17.4), the bench, the
  palms and the barrels. The `lighttop` room is untouched.
- The tent: the r 3.2 collider, the door at x + 3.75, the room link and the sign.
- The houses: footprints, doors, windows, colliders.

**Added:**
- The annex doorway is 2 cm wider than its surround's opening, so their reveals never share a plane (worldfit found
  two 0.03 m² z-fights there).
- One collider: a box for the lighthouse annex (x ±1.5, z +1.9 to +3.21 from the axis, top +3.9). Without it, his
  body would go 0.2–0.4 m into the annex's front corners, which stand outside the cylinder. At x = 0 he still
  reaches z 3.66, inside the door's r 1.0.
- The houses' camera occluders follow the new roofs: a slab across the barrel's or the hip's span, from the crown down
  to the eaves; the barrel's arc is covered.

**Not done: the straight paved quay with white bollards.** It means reshaping the coast and the quay's ground
(`island.js` and `world.js` terrain), plus new colliders on the walk from the ferry. That is a risky change to
collision and paths, so it was skipped. The barrel roofs alone should not be read as the harbour's full +9.

## Numbers (Automated runtime only)

How they were taken:
- Installed Chrome, ANGLE D3D11, Vega 8, on AC power, 1280×720, Medium.
- Chapter 1 (`well`), Follow camera at Medium.
- One stepped frame per spot: main pass only, counted at `renderBufferDirect`.
- Same spots and settings before (a `git archive` of `68315019`) and after (the worktree).
- Script: scratch `c85/cap.mjs` with `final.json`.

The iso rows count the Follow frame at the hero's spot, not the iso picture.

| Spot | Main calls before → after | Main triangles before → after |
|---|---|---|
| lh_door_f (lighthouse door) | 116 → 116 | 502,941 → 505,117 |
| lh_path_f | 104 → 104 | 409,875 → 416,519 |
| lh_iso (hero at −100, 97) | 30 → 30 | 184,113 → 184,537 |
| tent_f | 54 → 52 | 282,381 → 282,469 |
| tent_curator_f | 62 → 60 | 299,231 → 299,319 |
| harb_fronts_f | 98 → 98 | 583,778 → 585,416 |
| harb_arrive_f | 255 → 255 | 903,403 → 905,473 |
| harb_lane_f | 169 → 170 | 762,283 → 763,881 |
| bug_f | 82 → 82 | 405,417 → 411,091 |
| sq_f | 139 → 139 | 520,197 → 525,871 |
| school_f | 73 → 73 | 402,761 → 408,443 |

The objects themselves (meshes / triangles):

| Object | Before | After |
|---|---|---|
| Lighthouse group (all its materials, the lamp and the beam) | 8 / 6,204 | 8 / 6,580 |
| `wizardTent` | 11 / 604 | 9 / 692 |
| `townMerged` (all houses, the square's dressing; per 96 m cell, one mesh per material) | 64 / 65,178 | 57 / 66,816 |

`townMerged` drops 7 meshes: the blue tile material leaves Bug Street, and the four globes now share one material.
Shadow-pass calls: tent −2, sq_f +1, the rest equal.

Some spots gain about 4,000 triangles more than the changed objects add (lh_path_f, bug_f, sq_f, school_f). The
cause is not identified: residents' positions or merged cells drawn differently are likely. Treat those spots'
triangle deltas as within noise.

**Not measured cleanly: frame time, loading and memory.**
- A first baseline-only run had the machine quiet: median 17.6–17.8 ms, p95 ≤ 18.4 ms (vsync-bound) at all spots.
- During the final before/after runs another agent's test (`shops.mjs`, headless Chrome) was using the CPU. Both
  sides then showed 100–300 ms tails.
- Boot times and JS heap sizes were also disturbed.

So no frame-time, loading or memory claim, in either direction.

What did not change:
- no texture added (the tent's canvas replaces the old one, same 512×256);
- no new shader kind, no dynamic light, nothing animated per frame (the tent's finial and pennant were already).

## Tests (scratch copies of the trees, Playwright from tools/testlab, SwiftShader per tests/lib/boot.mjs)

How the suites were run:
- Each tree served on 127.0.0.1 by a small Node server: Python's server dropped connections under load.
- One suite at a time, each with a 30-minute timeout.
- After = the worktree's five files; base = a `git archive` of `68315019`.

| Suite | After | Base (68315019) | Reading |
|---|---|---|---|
| camcitadel | PASS | — | |
| occluders | PASS | — | Includes the camera over `bug`, `bug2` and `stone`, and the walk behind them |
| overlaps ONLY=citadel | PASS | — | Run again after the doorway fix: PASS |
| worldfit | FAIL, 2 visual | FAIL, the same 2 visual | (2) is `nbr`'s door/window and a Zeelich window; (3) is 20 visible z-fights elsewhere. Neither is ours. The doorway fix removed two new 0.03 m² z-fights at the annex door; the small z-fight list then matches base line for line |
| world-consistency | PASS | — | |
| doors-lba2 | PASS | — | The tent's link and #10 "kept" included |
| chapter10 | PASS | — | The lighthouse door, `lighttop`, the dials, the way out |
| epilogue-home | PASS | — | The lamp room after the ending |
| camsteady (full) | FAIL, 11 functional | FAIL, 9 functional | Already failing on base. The lighthouse bay route passes in both |

**camsteady in detail.** The lba-mode "through a door in and out" failure is identical in both (6.2 / 9.2 / 9.2
reversals a minute). That is Twinsen's house door, which is unchanged. The lists differ in four lines:
- after only: free · street, Modern controls jolt; follow · harbour pier heading reversals;
- base only: one street jitter line.

The pier route passes south of the two barrel roofs, so it was run alone (`ONLY=pier MODES=follow`), four times
alternating after/base/after/base. All four were identical, frame for frame: 2,169 frames, heading reversals
10.3/min against his 6.8, max pitch 53°. The same FAIL on base. So the full-suite differences come from the run, not
from this change.

**Boot timeouts.** Earlier attempts of worldfit, world-consistency, camsteady and doors-lba2 timed out at boot
(300 s) or crashed the page. At those times the laptop was busy with another agent's tests, or asleep
(`ERR_NETWORK_IO_SUSPENDED`). They were run again on a quiet machine; the results above are those reruns.

**Not run:**
- house, transitions, chapter1, camfollow, the merge and perf suites;
- the Test Lab compare (battery and plugged).

## Evidence labels and what is not verified

- **Automated runtime only:**
  - pictures and counts (`docs/future/world/CITADEL-85/*.jpg`: before | after at matching spots and settings);
  - the tests.
- **Not played:** nobody walked these places with a pad or keyboard.
- **Resemblance re-score:** not done by the curator.
  - My estimate, provisional: lighthouse 67 → about 78–80; NW plateau 66 → about 72; harbour 73 → about 79 (no
    quay); square 75 → about 79; terraces 71 → about 73.
- **Not checked:**
  - **The lighthouse at night or with the lens lit:** the beam is at 16.4 m now, 1 m lower.
  - **The new collider in every chapter's lighthouse scene:** chapter 10 and the epilogue pass.
  - **The roofs from the roof/wall cutaway:** occluders passes, but there was no visual check of a cutaway over a
    barrel or hip roof.
  - **The interiors:** unchanged. The `baggage` room and Nell's are separate rooms, so the outside shape does not
    reach them.
  - **No shot frames the whole tower from play height:** the Follow camera is steep and close, so the tower top is
    seen only in the iso and from far away.
- The school's tiles read more red-brown than LBA2's brown, because the roof texture is terracotta under a brown
  tint.
