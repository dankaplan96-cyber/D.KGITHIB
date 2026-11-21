## W-3 · The Water Gardens (CLOUD_ORDERS 33) · the laptop, 9.11.2026 · branch `expansion/ballastra`

**Built** as ordered in `EXPANSION_WORLD_SPEC.md` "W-3" (its **Built** section has the whole account): its own lazy group
`bl_gardens` (x 3 000, z −4 600, 12 build steps) with the rooms `bl_tunnel` and `bl_kiln`; `BALLASTRA.gardens` with every
handle the spec lists. W-2's `toGardens` (the terrace's east gate) is now an active exit to the gardens' `fromArches`, and
the gardens' `toArches` leads back to W-2's `fromGardens`. `toHouse` stays data until W-4.

**The place, in one line each:**
- the water's way is visible and walkable:
  - a nine-arched aqueduct from a rocky islet comes into the splitter house;
  - three channels leave it: G1 to the gardens (a cut channel, a culvert, a spout, the weirs' cascades), G2 the kiln's
    leat on its own wall the whole north side, G3 the overflow's spillway to the sea.
- **two big gauges** side by side in front of the splitter, readable from the plaza: glazed columns with banded scale
  boards (no words), bronze floats in glass tubes, a celadon cap for the upper channel and a cobalt cap for the lower
  gardens.
- **three terraced basins** of floating rafts:
  - 16 planted rafts each (beans, reeds, flowers), in three states;
  - floating walkways and hinged gangways that tilt with the level;
  - the record of the water on every wall;
  - dry, the rafts sit on cracked mud; green, everything floats a hand under the paths.
- **the service tunnel** (down the hatch by the splitter):
  - the old main;
  - the splitter board: G1, G2, G3 in bronze grooves, with pictograms;
  - G1's hand-wheel;
  - the seized bypass (rusted over);
  - the unrecorded tap: bright copper bodged on with clamps and rag, off through the wall toward the kiln, with a
    trickle while it is open.
- **Corvin's kiln**:
  - the water wheel on its west wall, fed by the leat's trough and seen from the terrace;
  - inside, the wheel's axle turns a gear, the potter's wheel and the bellows;
  - the kiln's mouth glows, and the chimney smokes while it runs;
  - racks of glazed floats.
- **the test rig** (N6):
  - three linked basins sunk a step (wadeable), each with a float, a level mark, a lamp, a range dial and a switch latch
    high on a post;
  - celadon troughs between the basins for a visible spill;
  - the five-slot frame, its parts facing the path;
  - the storm tank and sluice feeding basin A.
- G2's and G3's latches are out of reach across water and walls: they are ball targets.

**Pictures** (`docs/future/world/W-3/`):
- taken with the play camera (Follow, Medium) on **the laptop's GPU**: Vega 8 through ANGLE D3D11, headless Chromium,
  1280×720;
- `W-3-00` is dry vs green from the same spot; `01–12` are the rafts dry and green, the plaza, the gauges, a walkway, a
  weir's cascade, the kiln and its wheel, the rig empty and assembled, the tunnel's board, inside the kiln, and the north
  path with the bank and leat.

**Measured:**
- **SwiftShader** (draw calls and triangles, 960×540): every view the spec names is under the Citadel street's 215 calls
  and 900k triangles:
  - the plaza with the rafts and gauges: 120 calls, 310k triangles;
  - the upper basin: 126 calls, 356k;
  - the rig: 62 calls, 140k;
  - the east terrace: 60 calls, 192k;
  - the tunnel and the kiln: 31 calls and 29k each.
- **GPU** (Vega 8, 1280×720, game quality Medium on that profile, plugged in; frame interval over 180 frames):
  - median 16.7 ms in every view;
  - p95 16.8 ms at the plaza, 33.3 ms on the north path and the east terrace, 16.7 ms elsewhere;
  - this is a light check, vsync-capped, not GPU time and not a benchmark; no battery run.

**Checks** (SwiftShader, run here with the Playwright path changed in scratch copies only):

| suite | result |
|---|---|
| `tests/ballastra-gardens.mjs` (new) | 22/22 PASS |
| `ballastra-arches` | 20/20 PASS (W-2's gate exit now active) |
| `ballastra-harbor` | 19/19 PASS |
| `oren-first` | 21/21 PASS |
| `oren-bands` | 25/25 checks PASS; verdict FAIL on 1 resource: a connection reset on `assets/music/zeelich_b.mp3` from my scratch Node server (media loading). Not W-3: the same reset happens with W-3 unhooked (the pre-W-3 regions.js served). The same suite passed outright in EXP-MERGE-35 on this machine |
| `oren-coils` | 33/33 PASS |
| `oren-square` | 29/29 PASS |
| `world-consistency` | 37/37 PASS |

- The new suite walks the gardens by input both dry and full, 18 legs each.
- It also checks:
  - the hatch and the kiln's door, both ways;
  - the way in from W-2's gate and back;
  - every handle, the soft edge, and that a second visit builds nothing.

**Unverified / left for W-3:**
- the residents (W-7): nobody stands on the 15 spots yet, so the "rig with six people" view is measured empty;
- whether the story wants W-2's gardens gate closed until N2 (today it is simply open: a flag on that exit is the
  cloud's);
- the kiln's exterior stays a plain workshop with a sign; the interior carries its character;
- no new sounds: existing names only;
- the user has not seen the pictures.

**Still open from W-2** (the spec's "Left" list, unchanged by W-3):
- real-GPU numbers and pictures for the Arch District:
  - its pictures and counts are SwiftShader only;
  - this run shows headless Chromium does reach the Vega 8 here (ANGLE D3D11), so they can now be retaken on the GPU the
    same way;
- the arch's span shot: the free-camera overview failed and needs retaking;
- the canal's level change does not read at a distance: a fresh wet band on the walls after the water falls, and
  sandbags or boards at the doors in a flood, would make it read at a glance;
- the harbour's skyline still shows its older scenery district, not W-2's layout;
- there is no travel into the district: it is the story's to wire;
- the bell's tones use the game synth's private `_tone`; the horns, cam and pull have no input wiring: the story's;
- Dunn's door opens onto a dark recess only: no room was ordered;
- the residents are W-7's;
- now resolved: the gardens' exit, which waited for W-3, is active.
