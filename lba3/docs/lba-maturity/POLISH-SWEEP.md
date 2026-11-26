# POLISH-SWEEP — every placement checked (CLOUD_ORDERS 58, the desktop, 20.11.2026)

The user, 20.11: "verify that everything is in its place, there are no problems with where things are positioned, and
everything looks polished." Branch `polish-sweep` from `c93b324e`. Machine: the Acer laptop, GTX 1050 (Chrome, ANGLE D3D11).

## Result

**No placement defect a player would notice was found, so nothing in the game was changed.** Three measured findings
were looked at in the game camera; they are by design or cannot be seen, and they were added to place-scan's
measured-and-left list with their reasons. The other findings were already on that list. Because the game itself is
unchanged, its frame time is unchanged (the populated street on this machine:
`docs/lba3-performance/HARDWARE/2026-11-20-gtx1050-ac/`).

## What was checked

| Check | How | Scope | Result |
|---|---|---|---|
| Objects: inside, in a wall, floating, sunk, backs, facing, doors, adrift; outdoors also stairs, walkways, paths, benches, signs | `tests/place-scan.mjs` (PLACE-1/2/3), run on `c93b324e` | 146 rooms and areas, 7,936 pieces (5,825 outdoors in 13 areas) | 158 findings: 142 already on the measured-and-left list; 16 new, all looked at (below). After the three entries: **PASS** (158 of 158 accounted for) |
| People: feet off or into the ground; the body inside a wall, furniture or a door; two people inside each other; standing still facing a wall | `npcscan.mjs` (new; raw data in `docs/lba3-performance/HARDWARE/2026-11-20-polish-sweep/`) | Every place (146) at four story points: a new game (prologue), `base-06` (Zeelich's arrival), `base-11` (the evacuation), `base-15` (the core). 504–989 people per state | About 15 distinct candidates; each one photographed from the front and close at the feet. None is a defect (below) |
| The eye, through the game camera | The v103 playthrough's own pictures after every step, segments 01–14 (`CHAIN-V103`), seen as contact sheets | 253 views: every region (Citadel, Zeelich, the Desert, the Hamalayi, the isles, the bore and the core) and their interiors, chapter by chapter | Nothing seen out of place at that size (400 × 225 a view) |

## The findings looked at

| Where | Finding | Cause | Decision |
|---|---|---|---|
| Citadel, Twinsen's barrels at the house's corner (−48.0, 75.0) | a piece goes 14 cm into the near barrel | the house's supply joint (TUT-MYSTERY, `story/hometap.js`): the pipe Twinsen mended, meant to hide behind the barrel until the ball knocks it aside | by design; left (`captures/polish-sweep/citadel-supply-joint-behind-barrel.jpg`) |
| Citadel, Nell's lean-to by the quay (−102.8, 33.9) | its frame 40 cm under the ground | the posts' feet run down through the quay's paving; the roof, the posts and the bench stand right in the camera | not seen; left (`citadel-nell-leanto.jpg`) |
| Knartas, the jar yard's fence (14 places) | rails 4–5 cm into poles | the fence's rails set into their posts (`zislands.js` buildIsland0) | by design; left (`knartas-fence-rails.jpg`) |
| Citadel, Corla at the ticket booth (−35.2, 35.5) | the body inside the booth; facing its wall | the booth's clerk stands behind its counter, facing the hatch (`story/stands.js`); from the front she is seen at the counter | by design (`citadel-corla-booth-front.jpg`) |
| Citadel's square, late chapters: Oda at a stall | the body inside a box | she stands behind the stall's counter, tinkering | by design |
| The Otringal and Mosquibee isles: the beekeepers, the mason, the crane operator, the fitter | facing a hive, the tower, the crane, a pipe; inside a hive's table | people at their work, facing what they work on | by design (`people-close-looks.jpg`) |
| The orchard: two pickers | 8 and 14 cm over the ground | the ground slopes under them; at the feet, the low foot touches the ground | not a defect (`people-close-looks.jpg`) |
| The Hamalayi hall: a monk | the body inside a box | the robe stands on the floor by the altar's table | not a defect |
| The hostel's sleeper; Kip at the jukebox | inside the bed; facing the jukebox | lying in the bed; Kip's stop is the jukebox's front (as LBA2's Chez Luc) | by design |
| The condenser rooms: Tamu; the Otringal bar: Rollo | sunk 16–72 cm; floating 48 cm | measured from another room of the same group (Tamu walks in the Desert, Rollo in Otringal) against that room's ground; in their own places neither is flagged | a fault of the scan, not of the game |

## Not done, and why

- **A walk with a free camera** at the game camera's place from a grid of spots in every region (`tour.mjs`): the
  game shows only the world round Twinsen and sets its camera before each frame, so those pictures came out empty. The
  playthrough's own pictures (above) took their place: 253 views from the real camera as a player plays.
- **Small details** (a few pixels of seam or flicker) are below what a contact sheet shows. The cloud's FULL-TEST
  pictures and the user's own play remain the check for those.
- Left out as the order says: the School of Magic's exterior and Tali's court (P41), and Zeelich Spaceport's layout
  (P26). Not touched: the story text, `src/main.js`, `story/balances.js`, the campaign tests, rig.js and characters.js.
