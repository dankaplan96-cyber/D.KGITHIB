# PATHS-136 (P136, the user, 26.11, after v173: "The paths are still not fixed")

Branch `ccr-c1c2c4b9-dep6ed` + this worktree's commits. Evidence: **Automated runtime only (SwiftShader, headless
Chromium)**. Nobody played it; nothing was checked on a real GPU.

STATUS: in progress (resume point at the end).

## The user's spot
- The photo: Citadel, south edge of the square's ring, by the signpost `HARBOUR · SPACEPORT · LIGHTHOUSE`
  (`citydress.js`, at (−44.6, 6.6)). The camera looks south-east, over the ring.
- The kerbed strip that "ends square into the dirt beside the signpost" is the south lane (`town.js` STREETS[3]).
  It leaves the ring and stops at (−44.3, 9.8).
- "The street beyond" is the east street (`world.js` GRID_STREETS, x −35), which runs down toward the house with the
  laundry line and the pier.
- Between the two was 4–5 m of open dirt, with the tulip bed, a tree, bushes and a bin.
- **Why P135 missed it:**
  - Its scan pruned the lane's stub as a "twig" of the square's middle line. The half-width grows into the square
    behind it.
  - The tip also sat on a staircase in the thinned line (two neighbours), so it was never seen as an end.
  - The gap between the lane and the east street was found, but accepted as "the fork of the south lane and the east
    street (both go on)". The lane does not go on.

## The rule (strict, from the player's view): `tests/path-ends.mjs`, `tests/lib/pathends.js`
- **END.** A paved strip, or a stub off a square, whose end reaches none of these within 1.25 m is a fault:
  - a door
  - a wall: a building, a wall, a parapet, a fence or a stair's side (a non-prop box ≥ 1.5 m long, ≥ 0.5 m tall)
  - a face in the ground ≥ 0.3 m: a quay, a stair, a cliff
  - a deck (a bridge's or a pier's floor), ahead or beside the strip's last stretch
  - the sea
- **Props never count**, whatever stands there: a bin, a lamp, a post, a sign, a tree, a bush, a bench, a tub, a
  planter or a crate. Paving again a little way on is not a destination either: the two almost meet.
- **GAP.** A paving edge (≥ 1.5 m of it) faces other paving across 0.3–6 m of level bare ground, with no wall, face,
  water or deck between. Props in the gap do not excuse it. P135 asked 0.75–5 m, and let a bush or bin close a gap.
- **Areas.** Citadel, Zeelich, Desert Island with Kesh, the Hamalayi, the nine Zeelich isles, Ballastra (Float Harbor
  masses).
  - On the isles only their designed paving is judged: the square (`paveAt`) and the landing pad
    (`zislands.js terrain.paveKind`, read by the test only).
  - WA-11's bare patches, and the ground under the deck islands' decks (never seen), are left out and counted apart.
    P135 left out every isle finding.
- **Known list.** `tests/fixtures/paths-136-known.json`: true ends only, each with its reason.
  P135's eight "deliberate" cases were all re-judged (below).
- **Pictures.** A play-camera picture of every end, reached or not, and every gap. `ONLY=area` builds only that area.

## Found and done
| # | Area, at | Kind | Before | Decision / done (visible changes, for the user's pick) |
|---|---|---|---|---|
| 1 | Citadel (−44.8, 10.9) + (−36.4, 6.7) | END + GAP 4.9 m | **the user's spot**: the south lane's stub ends in dirt by the signpost, 4–5 m of dirt to the east street | **Paved**: a forecourt between the ring, the lane and the east street (x −45.6…−35, z 3.6…11.25), its west and south edges straight and kerbed, its east end flush in the east street. The tulip bed and the gardener's stops stand on it. The signpost's three arrows now point across it to the east street (they pointed south into the block's lawn). |
| 1b | Citadel (−49, 4) | (notch) | the west street's foot ended rounded 2 m short of the ring's south curve: a dirt notch between | The foot runs on into the ring (x1 −51.4 → −45). |
| 2 | Citadel (−46.9, −14.4), (−41.9, −14.2) | GAP 2.2 m, 0.8 m | P135 "deliberate": dirt between the north street and the ring, west of the climb's ramp | **Paved** (flush between the block's west street and the ring). |
| 3 | Citadel (−36.0, −14.4), (−33.9, −11.9), (−35.7, −10.9) | GAP 2.3–3.6 m | P135 "deliberate": dirt with a tree between the ramp, the north street, the east street and the ring | **Paved**. The tree there and a bush are taken off by the existing "nothing on the paving" filter. |
| 4 | Citadel (−58.9, 58.3) | END | the west street ran 4 m past the south cross street, square into the dirt (P112's free end, the user's pick of 23.11) | **Own commit `c1a59f78`**: it ends flush in the cross street (one corner). If you say no, revert it and add the end to the known list. |
| 5 | Citadel (−32.7, 41.8) | END | the link to the spaceport footbridge ends flush with the bridge's south edge; the bridge leaves from its side | **True end** (the bridge). The scan now sees a deck beside a strip's last stretch (the deck lands 3 cm over the ground). |
| 6 | Desert, the School (3337.4, −75.4), (3337.4, −70) | GAP 2 m | P135 "deliberate": "the walks either side of the water channel" | The channel had **no water**: AUDIT-FIX (17.11) lifted every small inland hollow below the water line to damp sand, this one too, so a dry sand strip lay between the forecourt and the plaza under the arched bridge. **The channel holds water again** (`desert.js`: the rill is kept out of that lift). The bridge is its crossing. |
| 7 | Desert, Kesh (3355.2, −7.6) | GAP 2 m | the track's dirt and the oasis's wet ring crossed Kesh's paved plaza (a bare tongue by the palms, a dirt band across it) | **Paving wins** inside Kesh's paving (as P135 did on the Hamalayi): the track and the wet ring start at its edge. |
| 8 | Zeelich (2374.5, −8.6) | GAP 0.2–2.4 m | P135 "noted, not changed": the council house's arcade floor stopped short of the plaza's kerb ring, bare granite in the two corners | **Paved**: the arcade's flags run on to the ring (`zeelich.js`), the arcade's width. |
| 9 | isle_liftdock (4192, 1810), (4193, 1819) | END | the terrain's landing pad under the deck island, far under the clouds (never seen) | Not a way: left out (deck island). |
| 10 | isle_undergas (3214.7, 1781.6) | END | a tongue of the gas works' round concrete yard where the hillside's rock rises | **True end** (rock slope): the yard's rim where the ground turns to rock. Cosmetic raggedness noted, not a path. |

Not changed:
- The harbour, Twinsen's hair, NPC routes (`town.js` STREETS, `world.js` PATHS: untouched).
- Terrain heights in Citadel and Zeelich.

## Reached ends, reviewed by eye (play-camera picture each)
| Area, at | Reaches | Decision |
|---|---|---|
| Citadel (−31.6, −49.3) | the station's door and walls | ok |
| Citadel (−23.8, −43.4) | the station's forecourt: its parapet and rail; its east side on the lawn | ok (an area before a door, not a way) |
| Citadel (−32.7, −35.2) | the climb's stone stair | ok |
| Citadel (−73.7, −28.4) | the promenade's north end at the rock and the pipe | ok |
| Citadel (−67.4, −4.2) | the promenade's 20-step flight | ok |
| Citadel (−73.7, 18.8) | the promenade's south end, closed by its rail at the wall's end | ok (a viewpoint on the wall) |
| Citadel (−109.7, 53.6) | the quay's end at the harbour wall's drop | ok |
| Desert (3306.6, 4.4) | the pier | ok |
| Desert (3334.3, −76.4) | the School's walls | ok |
| Otringal (1872, 1823), (1887, 1825) | the square's edge at the rock's drop | ok |
| Zeelich (2370.5, −9.6), (2378.3, −9.6) | the council house's walls | ok |
| Zeelich (2350.5, −0.1) | the street's west end at the cliff over the clouds | ok |
| Zeelich (2436.0, −0.1) | the drill platform's gate | ok |
| Zeelich (2412.3, 9.1) | the depot's gate | ok |
| Ballastra (2996.4, −2990.6), (3004.7, −2988.1) | piers and a stair over the water | ok |

## Resume point
- Next:
  1. The full scan after the fixes (`after`).
  2. `tests/walkers.mjs` once, `tests/worldfit.mjs` once.
  3. The collider and instance dump diff (scratchpad `dump.mjs`).
  4. The sheet: `captures/paths-136/sheet.png`.
- Scratchpad outputs: `<scratchpad>/paths136/{before,after}`.
