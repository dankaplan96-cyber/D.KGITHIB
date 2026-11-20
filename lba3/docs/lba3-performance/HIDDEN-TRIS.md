# HIDDEN-TRIS — triangles a player never sees

(The cloud's software method and list will go above this section when its worker's file is merged; CLOUD_ORDERS 59.)

## Real GPU (HIDDEN-TRIS-HW, the desktop, 20.11.2026)

**Machine:** the Acer laptop, NVIDIA GeForce GTX 1050 (WebGL through ANGLE D3D11, as the page reports it) with an Intel
UHD 630 beside it; Chrome 158 (Playwright's channel), window 1536×864 at devicePixelRatio 1.25 (the panel 1920×1080 at
125 %); on AC. Build: `ccr-c1c2c4b9-dep6ed` at `329c0689` served locally. Raw data:
`docs/lba3-performance/HARDWARE/2026-11-20-hidden-tris-hw/` (`htscan.mjs`, per run `hidden.json`, `cost.json`, `log.txt`).

**Method (the cloud's file was not merged yet, so an ID render):**
- Every drawn triangle of the static world gets its own colour: the meshes, the draw batches and the instanced props
  (instances apart). Left out: the characters' skinned meshes, which move, and three's BatchedMesh (2 meshes, 108 K
  triangles in all).
- The world is drawn from every walkable spot of the area on a 4 m grid, at 8 headings each, from two cameras: the
  game's follow camera, 8 m behind and 5 m above him, and a higher view. Each view is read back at 960×540. Opaque
  triangles are drawn first, writing depth; transparent ones after, against that depth.
- A triangle never seen from the front (nor, if double-sided, from the back) is hidden. A double-sided triangle whose
  back is never seen is counted apart. Only triangles inside the area, plus a 20 m margin, are counted: from there,
  the rest of the island is simply out of view, not hidden.
- **The cost:** the same 8 camera points per area, drawn by the game's own renderer with its GPU timer (EXT
  disjoint timer query). Each point gets 40 frames of warm-up, then 240 frames measured. The world is drawn as built
  (A) and with the hidden triangles left out of their geometry's index (B), in the order A/B/A/B/A/B, at Medium and at
  High. Per point, the median of the three rounds.
- The removal was for the measurement only. Nothing is changed in the game.

| Area | Walkable spots · views | Triangles in the area | Never seen | Double-sided whose back is never seen |
|---|---|---|---|---|
| Citadel: Twinsen's house, the yard, the lane, the square with the well | 274 · 4,384 | 663,438 | 418,850 (63 %) | 22,860 of 31,070 |
| Zeelich: its street from the arrival point (70 m square) | 64 · 1,024 | 155,634 | 73,685 (47 %) | 325 of 485 |

| Area · quality | As built: GPU p50 / p95 ms · triangles drawn a frame · calls | Hidden left out: GPU p50 / p95 ms · triangles · calls | Change in GPU time |
|---|---|---|---|
| Citadel · Medium (run 1) | 7.64 / 8.90 · 784 K · 230 | 7.73 / 8.86 · 684 K · 230 | +0.09 ms |
| Citadel · Medium (run 2) | 6.76 / 7.81 · 784 K · 230 | 6.86 / 7.52 · 684 K · 230 | +0.10 ms |
| Citadel · High (run 1) | 8.50 / 9.39 · 800 K · 252 | 8.29 / 8.93 · 699 K · 252 | −0.21 ms |
| Citadel · High (run 2) | 7.87 / 8.48 · 800 K · 252 | 7.71 / 8.28 · 699 K · 252 | −0.16 ms |
| Zeelich · Medium | 5.83 / 6.58 · 276 K · 467 | 5.84 / 6.40 · 226 K · 467 | +0.01 ms |
| Zeelich · High | 6.62 / 7.22 · 311 K · 551 | 6.47 / 7.21 · 256 K · 551 | −0.15 ms |

Frame time stayed at p50 17.5 / p95 18.3 ms in every run, A and B. That is Chrome's pace on this laptop that
session, about 57 Hz with the GPU half idle (GTX1050-AC in WORLD_ART_REQUESTS.md), not the game's work.

**Verdict: on this GTX 1050 the hidden triangles do not weigh on the game.**
- Leaving out 13 % of the triangles drawn a frame (16–18 % at Zeelich) moved the GPU time by −0.21 to +0.10 ms.
  That is less than the difference between two runs of the same build (about 0.8 ms at Citadel's Medium).
- The draw calls stay the same: the hidden triangles share their batches with seen ones.
- The GPU's time here is the pixels and the passes (shadow map, lights, MSAA), not the vertices. The benchmark's
  Medium breakdown says the same: the static scenery's whole GPU group is about 2 ms.
- **No fix is worth it, and none was made** (the user, 20.11: the game's quality and look must not change).

**What the hidden set is, for the record:**
- **Pieces never seen at all:** merged town dressing behind the street fronts, and pieces of the spaceport and of the
  harbour's containers that no walkable spot in this area looks at:
  - `citydress` merged meshes round (−57, 14) and (−67, 27): 26 K and 22 K triangles;
  - `townMerged` round (−39, 32): 18 K;
  - `spaceport` merged at (−11, 40): 21 K.
- **Parts of draw batches:** 30–50 % of the batches round the lane and the square (the backs of walls, roofs and props
  against each other, faces under the ground).
- **The props' instances:** `smallPool` 10.7 K of 14 K, double-sided.

**Not measured:**
- **The characters:** their models are drawn double-sided, 115 K of 120 K skinned triangles. Turning that off risks
  open sleeves and capes showing through, and since the whole hidden set costs nothing measurable here, it was left
  alone.
- **Far props at full detail** (the order's last kind): not examined apart.
- **The scan's own limits:**
  - A triangle smaller than about 2 px at 960×540 from every spot counts as unseen.
  - Foliage cut-outs count as solid occluders.
  So "never seen" is an upper bound. That doesn't change the verdict: even removing this whole upper bound gained
  nothing.
