# PATHS-140 (P140, the user, 26.11, on P136's own after picture: "עדיין לא שלם!!!", "still not complete!!!")

Branch `ccr-c1c2c4b9-dep6ed` + this worktree's commits. Evidence: **automated runtime only (SwiftShader, headless
Chromium)**. Nobody played it; nothing was checked on a real GPU.

Status: in progress (rule written; world fixes next).

## The user's spot (`captures/paths-140/user-report.jpg`)
- Bottom half of the crop: P136's `top-ne` after picture, Citadel north-east of the square's ring (camera over (−40, −12)).
  - **The ragged corner** at (−32, −16.5): the north street (`world.js` GRID_STREETS, z −15.8) and the block's east
    street (x −32.5) both end at the same point. Each end was cut flush on the other's centre line, so the corner's outer
    1.5 × 1.5 m quadrant was never paved; the per-vertex cut drew it as a notched diagonal. The same at (−52, −15.8).
  - **The open dirt lot** east of the east street's kerb (x −31…−24, z −19…−2): `townSoil`'s noise (bare soil with lawn
    blobs, within 36 m of the square) beyond the kerb's 2 m earth band.
- Top half: P136's `top-sign` after picture, bottom right: **the kerbed bare rectangle** south of the cross street,
  between the street down the fields' path (x −45.6) and the link to the footbridge (x −32.5), z 32.8…40: WA-12's wild
  soil (`wildGround`, from 40 m off the square) inside the town grid.

## The rule (`tests/path-ends.mjs` + `tests/lib/pathedges.mjs`; P136's END and GAP kept as they were)
- **Read what the shader draws.** Citadel's streets: LAWN-EDGES' edge distance. Everywhere else: ROCK-EDGES' traced
  paving and rock lines. ROCK-EDGES is not the default yet (the user decided it on 26.11; another worker flips it, with
  Knartas's earth patches), so the suite runs with `Q=rockedge=new`. Under today's default the isles', the desert's and
  the Hamalayi's paving edges still follow the grid (the old per-vertex split) until that flip lands.
- **The bare earth** (new in `pathends.js`): the lawn's traced soil side (LAWN-EDGES-2) and Citadel's 2 m earth band
  along the kerb. Sand (the desert) and snow (the Hamalayi) are not earth.
- **EDGE.** Every paving edge is a clean line. The outline is traced at 0.25 m and smoothed over ±0.5 m; along every
  3 m the wiggle (Σ|turn| − |Σ turn|) must stay under 60°. A straight edge, a corner, an arc, a rounded cap and the
  Hamalayi's wavy square measure 0–32°; a notch 162°; splat noise and a grid's saw-tooth more. A wiggly stretch is a
  fault unless 70 % of it meets a wall, a face (≥ 0.3 m), the sea or a floor within 0.8 m (a house standing on the
  paving's edge hides it). Also faults: **ISLAND**, a paving speck (< 3 m²) within 1.5 m of a paving, and **HOLE**, a
  bare speck (< 3 m²) inside a paving with nothing standing over it.
- **LOT.** Bare earth at least 3 m across (its opening by a 1.5 m disc: a trodden way or the 2 m band with the lawn
  behind it never qualify) that touches paving on two sides or more (≥ 1.5 m each, ≥ 6 m²), or is ≥ 12 m² and touches
  it along ≥ 6 m. A plot so narrow that the band fills it is a lot.
- **PATCH** (the user's answer to P136). The isles' WA-11 paving patches are judged now (P136 left them out). Their
  outline, sampled every 1 m, must have a kerb stone, a wall, a face, the sea or a floor, or a worn path beyond it;
  2 m or more in a row with none is a fault. A kerb also closes a patch's END or GAP (not a street's: P136).
- **Known list** `tests/fixtures/paths-140-known.json`: true edges and designed beds, each with its reason.
- **Pictures**: one play-camera and one top picture per place (faults within 12 m joined); `SPOTS=` pictures a before
  run's places again after.
