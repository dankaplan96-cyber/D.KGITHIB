# FLICKER-142: flicker in rooms (P142)

The user (26.11): "check the flickering in rooms, the wall behind Zoé in the kitchen, and apply it to the whole game".
Evidence here is **automated runtime only (SwiftShader, headless Chromium)**: no person played, no real GPU was used,
and no frame-time numbers were measured.

Branch `p142-flicker` (on base `ccr-c1c2c4b9-dep6ed` at 03ac7560).

## The cause

Two causes, both game-wide:

1. **Faces in one plane, or a few millimetres apart.** Two surfaces that look different and lie in the same plane
   fight for each pixel. The kitchen wall behind Zoé is the user's case: the range's tiled splashback (`rbox(1.5,0.75,0.03)`
   at BZ+0.015) had its face exactly in the wainscot's face (BZ+0.03) over the wainscot's top 15 cm, right behind her head.
   The same kind of fault was in every room: far-wall ends in the near rims' outer faces (every `RoomBuilder.shell` room),
   partition end posts and caps sharing tops, decals 1–7 mm off their boards, overlapping floor slabs, kerbs and counters.
2. **Depth precision at the room camera.** The room camera stands ~90 m off with a long lens (camera.js `_iso`), and the
   near plane stayed at 0.1 m. With 24-bit depth, one depth step there is d²/(near·2²⁴) ≈ 5 mm. So faces up to ~5–8 mm
   apart (a panel on a wall, a decal on a board, a belt on a dress) could also flicker.

`tests/worldfit.mjs` (3) scans for z-fighting outdoors, and only where the overlap is seen from the sky, so interior walls
were never checked.

## The suite: `tests/interior-flicker.mjs`

It runs every room the region builder registers that is not outdoor: 137 rooms. That covers Twinsen's house, Citadel's
rooms, the underground, the sewers, the isle homes, Zeelich's homes, the Hamalayi rooms, the Desert rooms, Ballastra's
rooms and the mine. The game is set to chapter 1 by its flags, with Zoé at the kitchen sink (`npcSpots.zoe`).

- **(1) Geometry.** The suite collects every drawn static triangle: merged meshes, plain meshes, and every instance of an
  instanced mesh. It uses a draw batch's originals, not the batch, and skips skinned bodies. Double-sided faces count
  both ways. It then finds same-facing pairs that overlap, closer than a threshold. The threshold is 3 mm. For walls it
  rises to the depth step over how squarely the camera sees them, at most 8 mm. The step is taken at the camera's own
  near plane (0.1 m), so the depth fit below never loosens the scan. A pair counts only if a ray from the front layer to
  one of the room camera's 5 positions leaves the room unblocked, and the two surfaces look different there (colour,
  texture or where in it, roughness, glow). A material with a polygon offset of 1 or more is exempt. Pairs are grouped
  into clusters by 0.6 m cell and facing. A cluster of 0.02 m² or more FAILS; smaller ones are listed.
- **(2) Render.** The suite draws the game's own render path three times: twice the same (an A/A diff, which was 0 noise
  pixels in nearly every room), then with a sub-pixel jitter. The jitter moves the lens 2 cm in, widens the view angle
  to match at the focus and moves the near plane 2 % on, so only depths change. Changed pixels on a cluster's overlap
  confirm it. This check can confirm a finding, never clear one.
- **(3) Coverage.** Every registered interior room is built, entered and scanned (137 of 137).
- **(4) Depth fit.** The suite checks `src/engine/roomdepth.js`, described in the next section.

Options:

- `ROOMS=a,b`: scan only these rooms.
- `SHOTS=dir`: write the frame and the red two-frame diff overlay.
- `SPOTS=room@x,z;…`: add render views from those room-local floor spots.
- `REPORT=file.json`: write a JSON report.
- `ATTR=1`: name each part by where it was drawn (the call sites, through the `__PLACE_REC` hooks; report only).
- `NOFIT=1`: run the render check without the depth fit.

## The fixes

### System: the depth range fitted to the room (`src/engine/roomdepth.js`, `main.js` renderer pre/post)

For each render, while an interior room is on screen, the near plane moves to half the lens's distance from the room's
box (never below the camera's own near plane). It is put back after the render. This is measured, not tied to a mode:
cinematics, reveal shots and a talk's close-up, which move the camera outside the rig, get their own near plane back
whenever the lens is in or near the room. From the room camera the near plane is ~37–42 m, and one depth step is about
0.012 mm instead of ~5 mm. Nothing else changes: framing, fog and culling stay the same.

(4) checks every room:

- From each room camera position, the floor he walks (at his feet and 2.5 m above) lies at least 1.5 × the fitted
  near plane from the lens.
- The near plane is more than 10 m out from the room camera.
- A lens 2 m from his head keeps him well beyond its near plane.

A/B probe, 7 rooms (scratch script, not a suite): house, c3gallery, asylum, sewer, tavern, ih_knartas_28_29, bl_pump.
The same frame was rendered with the fit off and on. The near plane was 0.1 → 26–42 m.

- 293–1055 pixels differ per room, all at depth ties: seam and edge dots, and in no room a missing object or a shadow
  change. I looked at the house's diff picture.
- A lens 1.5 m from his head inside the room rendered with 0.1. The camera's near plane after each render was 0.1 again.
- Nothing in the game is parented to the camera (a grep for `camera.add`). The item close-up and the behaviour menu use
  their own cameras.

This is a system change for the coordinator to accept or drop. The geometry fixes stand on their own: the suite judges
the geometry at the old 0.1 m near plane.

### Builders (every room built with them)

- `RoomBuilder.shell`: each far wall's near end stops 1 cm short of the rim's outer face. The same fix is in the sewer
  hall, Tralu's cave and the mine's `caveShell`.
- `RoomBuilder.partition`: the end posts' tops are 1 cm under the cap, and a z-running wall's cap is 6 mm higher where
  two walls meet.
- `RoomBuilder.opening` (windows): the frame sits 6 mm under the reveal's head, and the plaster lining stops 1 cm inside
  the wall's face.
- `roundWindow`: the reveal cylinder is 1 cm inside the plate's hole.

### Props (every use)

- `hangingSign`, `noticeBoard`, `toolBoard`, `chalkboard`: the face is 1 cm off the frame. Notice-board notes are 9 mm
  apart.
- `papers`: the sheets lie 11 mm up and 4 mm apart.
- `MAT.screen`: polygon offset (factor −1, units −2) for every screen.
- `filingCabinet` labels, the `stove` fire bars, `potStove`, `radio`, `radioDesk`, `draftingTable`, `lensPedestal`.
- `goodsShelf`: the back and sides are 6 mm under the top board.
- `hanging`: the bands meet edge to edge.

### Rooms

- **House:** the splashback is 1.5 cm off the wainscot. Also: the bath tiles and mirror, Arthur's plans, the heat meter's
  dial, the register board, and the front door's jambs.
- **Office:** the gauge board panel and plates, the map plaque.
- **Cellar:** the target (rings side by side, not stacked), the map board, the meter.
- **Underground:** the shaft's tunnel floor, gratings and plates; the deep hall's catwalk, shutter and diagram; the
  gallery's shelves and walls; Sendell's suns panel.
- **Other rooms:** tavern, bazoo, pump room, tavern cellar, Zeelich and Desert terminals, Pelleck's tiles, wizards'
  school, Bu temple, Celebration temple, observatory slits, quiet channel, arena, sewers (corner walls, caps, lips,
  railing posts), Tralu's cave, Otringal bar and hotel, Ballastra pump/mags/tunnel, the mine (vents, sign), the key
  rooms (niche, Baldino's tool board), the asylum's filler wall and plans board, the depth bins' boards, and the isle
  homes' cutting table.

## Results

| run | rooms | clusters ≥ 0.02 m² (FAIL) | smaller (listed) |
|---|---|---|---|
| before (35ba477f) | 137 | 597 | 2514 |
| after builders only (shell, partition) | 137 | 315 | — |
| after, full run (c8f4cda1) | 137 | 1 (the bazoo counter's rounded corners, 0.04 m², 3.2 mm; 0 render pixels) | 1509 |
| after the bazoo fix (`ROOMS=house,bazoo NOFIT=1`) | 2 | 0: PASS | 63 |
| **final, full run at 00e97609** | 137 | **0: PASS** ((3) 137/137, (4) 137/137) | 1418 (4 long seams listed: 0.02–0.034 m²) |

- **Render check (the jittered diff, game's own render path), before → after:**
  - 475 of the 597 failing clusters were seen flickering (changed pixels on their overlap) before; 0 after.
  - Changed pixels in the 137 rooms' spawn views: 90 494 before, 7 028 after. The median room went from 619 to 37.
  - What is left is mostly edge pixels from the 2 cm lens move, and character layers.
- **Clusters under 0.02 m² whose overlap (all pairs, seen or not) is 0.02 m² or more:** 96 before, 12 after. The scan
  weighs only a cluster's 16 largest pairs by sight, so these were checked by hand. The long asylum seam (lid against the
  filler wall, 0.39 m² over 0.6 m cells) was fixed. The 12 left each show 0.001–0.019 m² and
  0 render pixels: the house's partition rails against their end posts, a control-room pillar against its frame, console
  strips, an asylum lid's own two faces, a shelf's side, ledgers under papers, a kiln lintel.
- **(3) coverage:** 137 of 137 rooms. **(4) depth fit:** 137 of 137 PASS.

The kitchen wall behind Zoé (house, the splashback over the wainscot): before, 0.081 m² at gap 0 mm, with 141 of 331
pixels changed in the render check. After: no cluster there. Changed pixels in that view: 1121 before, 170 after with the depth fit. With the depth fit off
(`NOFIT=1`, the geometry fixes alone), the red band behind her is gone: 993 pixels, which are edges and her own layers
(the sheet's second row).

Before/after pictures: `captures/flicker-142/sheet.png` (more in `sheet-2.png` if present). Each before is a two-frame
diff overlay, red marking the pixels that change between the two jittered frames, next to the after from the same floor
spot. The kitchen with Zoé in place comes first. A still cannot show flicker; the red is the evidence. The before run's
full log is in `captures/flicker-142/before.log.gz`.

## Other suites, run once each (automated runtime only, SwiftShader)

- `interior-flicker`:
  - before (35ba477f): FAIL, 597 clusters.
  - after (c8f4cda1): FAIL, 1 cluster (bazoo). That one was fixed in a later commit, and `ROOMS=house,bazoo` then
    PASSED.
  - final, full run at 00e97609: PASS.
  - The only later change is the tavern counter's height swap (place-scan, below). After it, `ROOMS=tavern` PASSED.
- `worldfit`: PASS. Its outdoor z-fight scan (3) found 0 clusters of 0.15 m² or more and listed 113 smaller ones in
  Citadel, Zeelich and the islands. Ballastra, the Desert and the Hamalayi are listed, not judged. This change touches
  none of them.
- `walkers`: PASS (37/37).
- `place-scan`: FAIL with 104 findings. The base revision (03ac7560, an export served on its own port) FAILs with the
  same 103. The one new finding was the tavern's L-bar: the second counter's raised top made it the taller one, which
  flipped the pair's order away from its LEFT entry. I swapped the raise to the long counter, and `ONLY=tavern` then
  PASSED.
- **Checks on the depth fit** (scratch probes, not suites):
  - The NOFIT run of the control room and the projoffice: 0 clusters. The consoles' and monitors' screens show no red
    in the diff with the depth fit off. Before, they were the brightest red in the control room.
  - The opening film played without `?nocine`: 238 renders logged. In none was the world drawn with a raised near
    plane, and the house's own shots kept 0.1.
  - The fit now runs only while the room's group is drawn and the lens is within 130 m of the room's box. (4) also
    checks a lens over Citadel while the room is current: near 0.1.
- `opening-tutorial`: PASS (48/48). The house is in the opening.

## Visible changes (each small; listed for the user's pick)

- The room shells' far-wall ends are recessed 1 cm behind the near rims, and the wall-top posts move by up to 1 cm.
- The partitions' rounded end posts are 1 cm lower under the cap, and z-running caps are 6 mm higher.
- The kitchen splashback stands 1.5 cm proud of the wainscot instead of flush.
- Decals and faces stand 1–1.5 cm off their boards instead of 1–7 mm: signs, notice/tool/chalk boards, maps, dials,
  labels, screens and jukebox windows.
- Loose papers lie 8 mm higher. Notice-board notes and their pins stand out further.
- The cellar target's rings lie side by side in one plane.
- On the isle homes' cutting table, four short cloth bolts with gaps replace one long roll. The four bolts had
  overlapped each other along one axis.
- In every shell room's windows, the plaster lining is recessed 1 cm. Round-window reveals are 1 cm smaller.
- Where two sewer railings meet there is one post; the first railing's material wins. The sewer walkways' lips step by
  4 and 8 mm.
- The underground's walking plates (every other one) and one grating run sit 6 mm up.
- Every screen in the game, outdoors too, has a polygon offset and is drawn on its own, outside the draw batches. That is
  a few more draw calls where screens stand, such as the control room and offices. No frame time was measured.
- Goods shelves' back panels are 1 cm narrower inside their sides.
- Several touching pieces are 1–2 cm narrower or 6 mm higher: dais and steps, lintels, kerbs, counter tops, the arena's
  short wall, the bazoo counter's U, sofa arms and the tavern's arched door head.

## Not covered

- **Moving and story-state parts.** Not scanned: dynamic pieces, story-state decals, and characters' own layers (Zoé's
  belt showed in the before render check). These are covered only by the depth fit, which removes the precision cause
  for them too. The chapter 2 wet kitchen floor (hometap.js) was already a polygon-offset decal, and the puddle lies
  12 mm up.
- **Other camera states.** Each room is scanned in one game state (chapter 1, default camera). Lids and cut-aways are
  scanned in their default state.
- **Outdoors.** Outdoor areas are worldfit's.
- **Small findings.** Smaller clusters (< 0.02 m²) are listed in the suite's output, not fixed one by one.
- **The geometry fixes alone (`NOFIT`).** Their render evidence covers only the rooms run that way: house and bazoo, and
  control and projoffice (below).
- **Long thin seams** are cut into many 0.6 m clusters, each under 0.02 m². The suite sums each room's clusters of one
  pair of pieces and lists the sums of 0.02 m² or more, but does not judge them.
- **Real GPUs.** Not tested. SwiftShader's depth is not a GPU's, so real-GPU flicker can differ.
