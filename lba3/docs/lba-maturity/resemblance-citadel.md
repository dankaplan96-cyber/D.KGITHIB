# World comparison: Citadel Island against LBA2 (and LBA1's places), per district

Order 27a (reference curator). The laptop, 8–9.11.2026. Template: `docs/lba-maturity/WORLD_RESEMBLANCE_TEMPLATE.md`.
Reviewer: the laptop's reference curator (Claude). **Provisional editorial scores, not reviewed by the user, not a pixel
match.** The 85/100 target is the user's rubric: geography 25, landmarks 20, architecture 20, palette 15, environment
10, inhabitants 10.

## Evidence and labels

**Our build.** HEAD `21bf522d` of `ccr-adf00ea7-37ebl3`, which contains origin `c5bf5608` (DOORS-LBA2 merged).
- Served from a `git archive` copy in scratch on 127.0.0.1 (a free port); fresh Playwright profile, no real saves.
- Installed Chrome, ANGLE D3D11 on the Vega 8, 1280×720. Chapter 1 (`well`) after the prologue; Follow camera at Medium.
- Label: **Automated runtime only** (pictures looked at; nobody played).
- Script: `curator/work/cap.mjs` with `citadel.json` and `citadel2.json`.

**Three kinds of capture of ours:**
- **iso**: an orthographic camera at the reference renders' angle (yaw 0.62 rad, pitch −0.45, the same centre and
  width), so each pair is the same place from the same direction;
- **follow**: the player's camera at a spot;
- **room**: the room camera.

**References.** All labelled **Source only**: decoded on this laptop from the user's GOG files, read in place.
- **R-MAP** `C:\Users\dan\lba-study\citadel\01_map_full.png`: the CITADEL.ILE map with the original objects and door
  zones. Its magenta outlines are ours as of 31.10, now out of date.
- **R-TEX** the left half of `C:\Users\dan\lba-study\islands\pair_citadel.jpg`: the original ground with its own
  textures, seen from above. It is the **only palette evidence for the ground**.
- **R-ISO** ground heights and island objects at an LBA2-like camera, flat ground colour, the objects in their own
  colours and textures, no lighting effects:
  - `C:\Users\dan\lba-study\citadel\30`–`36_game_*.png` (31.10). Magenta = our houses then;
  - `curator\ref\c_harb_iso.png`, `c_terr_iso.png`, `c_fort_iso.png`, `c_nw_iso.png`, `c_islet_iso.png` (new;
    script `curator\work\refscene.py`).
- **R-INT** `C:\Users\dan\lba-study\iso\lba2_scene<NNN>_grid<NNN>.png`: interior grids, bricks only (no actors, no 3D
  objects, no lighting). **R-LBA1** `C:\Users\dan\lba-study\iso\lba1_scene000.png`: the LBA1 asylum.
- **R-DOORS**: the decoded door zones (`tools/testlab/WORLD_ART_REQUESTS.md` "## DOORS-LBA2").
- **R-WS**: `tools/worldscore` measurements (`docs/WORLD_SIMILARITY.md`, 26.10, an older build): Citadel coast IoU 0.91,
  height MAE 0.91 m after CITADEL-TERRACES, landmarks within 5 m except the noted ones. **Not re-run on this build.**

**What was not used.** No original gameplay screenshots, so LBA2's lighting, sky and in-game camera framing are not
verified. No promotional renders, remakes or fan models (lba2remake supplied scene names only, marked as such). No web
download.

**Pictures.**
- References: the paths above.
- Ours: `curator\ours\citadel\*.jpg`.
- Side-by-side sheets: `curator\work\s_c_*.jpg`. Citadel's may be shown to the user.

**Coordinates.** Ours = LBA2 island-centred + (−76, +16) (`world.js` LAYOUT).

**Excluded on purpose:**
- the dome on the west islet (LBA2 scene 26): the user does not want it;
- the twelve-year additions listed in `docs/WORLD_SIMILARITY.md`: Citadel Spaceport, the Joint Project station in the
  old fort, the project depot, the Citadel Asylum, the Whispering Cliffs, Pippa's shop, the well on the square, the
  lane's pump and the project pipe, Zoé's garden, the customs booth, Nell's shop and the glider field.

These are judged for compatibility, not penalised as missing LBA2.

**Confidence scale:**
- **H**: numbers and a matched picture pair agree;
- **M**: a matched picture pair, but the reference has flat colour or no lighting;
- **L**: source or tests only, or a single capture.

## Summary

| District (LBA2 scene) | Score /100 | Critical failure | Biggest gaps |
|---|---:|---|---|
| Harbour and harbour wing (43, 44) | **73** | no | the hall's and Nell's barrel roofs are gables; the quay is a natural shore, not LBA2's straight paved platform |
| Town square and Bug Street (42, 48) | **75** | no | Bug Street's flat-roofed pair are gabled; the statue's four gold globe lamps are gone; grass replaces the formal paved square |
| Lower town south: Chez Luc, the street hatch (42) | **78** | no | the pink house is ours on LBA2's hatch plot (fixed by DOORS-LBA2); more grass than LBA2's paving |
| Upper terraces and the school (48) | **71** | no | the terrace faces are natural cliffs, not LBA2's walled shelves with white pier caps and lattice rails; the school has a gable, LBA2 a hip roof |
| Twinsen's quarter (49) | **83** | no | dark rubble walls against LBA2's pale stone; the front door is 2.7 m off |
| Lighthouse headland (46) | **67** | **yes (landmark)** | a round red-and-white striped tower; LBA2's is a white square stone tower with grey quoins and an annex |
| North plateau: the fort and the asylum (47, 51; LBA1 s0) | **71** | no (twelve years) | LBA2's ruins and grove became an intact fortress compound (a story change); few trees left |
| North-west plateau: Bersimon's tent, Tralu's cave (45) | **66** | **yes (landmark)** | the tent is blue with stars, LBA2's is red; the depot and pipeline crowd the plateau |
| West islet (44) | withheld | no | the dome is excluded; nothing else to judge in play (not visited by the curator in play) |
| The sewer (17) | **76** | no | hall 28 × 24 m against 39 × 38 m; the links now LBA2's |

**No Citadel district reaches 85 yet.** Twinsen's quarter is closest. The cheapest big gains are the lighthouse, the
harbour's barrel roofs, the tent's colour, the Bug Street and school roofs, the paved town square, and paler interior
stone. Ranked fixes are at the end.

New places (compatibility, not resemblance), from the captures `c_port_iso`, `c_port_f`, `c_cliffs_iso`:
- **Citadel Spaceport:** its deck, its teal-domed terminal and its footbridge read as Zeelich work set on Twinsun's
  harbour. It fits as a twelve-year addition. Its purple onion dome is the one Esmer accent on Citadel and should
  stay alone.
- **Whispering Cliffs:** its stack and stones (STONES-31) read as Citadel rock.

---

## 1. Harbour and harbour wing

- **Original and sources.**
  - LBA2 outdoor scenes 43 (the harbour wing) and 44.
  - Interiors s7 (the harbour-wing house), s8 (the ticket office), s14 (Mr Bazoo's).
  - R-MAP, R-TEX, R-ISO `curator\ref\c_harb_iso.png` (centre ours (−92, 34), 48 m wide), R-INT, R-DOORS.
- **Current.** `curator\ours\citadel\`:
  - arrival `c_harb_arrive_f` (the ferry quay, looking east);
  - layout `c_top`, `c_top_town`;
  - landmark `c_harb_iso`;
  - street `c_harb_lane_f`;
  - interiors `c_r_ticket`, `c_r_nellhouse`, `c_r_bazoo`.
- **Twelve years.**
  - The customs booth (Odile), Nell's repair shop in LBA2's s7 house, more trade dressing.
  - The pier at the west end (`island.js` SHIFT.harbour).
  - The harbour master's shed.
  - Story: trade between two worlds (`docs/TWELVE_YEARS.md`).

| Category | Max | Score | Reference + capture | Reason and gaps | Conf. | Proposed correction |
|---|---:|---:|---|---|---|---|
| Geography/topology | 25 | 21 | R-MAP, R-ISO harbour / `c_top`, `c_harb_iso` | The wing's L shape and position match (R-WS coast 0.91). LBA2's quay is a flat, straight-edged paved platform out into the sea. Ours is a natural rocky and grassy shore with a wooden pier | H | Square the quay's sea edge into a straight stone quay wall on LBA2's outline. The pier stays |
| Landmarks/relationships | 20 | 16 | R-DOORS / door-map | The ticket office, Nell's and Mr Bazoo's doors are within 1 m. Doran's shed is 4.4 m off. LBA2's rows of white bollard posts along the quay edge, which frame the walk from the boat to the hall, are missing | H | Bollard and post rows along the quay edge at LBA2's spacing (R-ISO) |
| Architecture/silhouettes | 20 | 12 | R-ISO (b48 long hall, b49 house, b59–63 museum group) / `c_harb_iso` | LBA2's long hall (the ticket office) has a **grey barrel-vaulted roof**, and the s7 house a **brown barrel roof**. Ours are gables (dark slate, planks). Mr Bazoo's is a group of four bodies in LBA2, one house in ours | M | Barrel roofs on `baggage` (the long hall) and `wing2`. Two low annexes beside `museum` |
| Palette/materials | 15 | 9 | R-TEX / `c_harb_arrive_f`, `c_harb_iso` | LBA2's harbour square and quay are grey stone paving and sand-brown ground. Ours has grey flags at the quay, but grass and brown earth fill the wing's yard. Rubble walls are close to LBA2's | M | Pave the wing's yard and the quay in grey flags (R-TEX); keep grass to planters |
| Environment | 10 | 7 | R-ISO / `c_harb_iso` | LBA2 is sparse: a palm, a few round trees, fences. Ours is much greener and fuller (round trees, flower beds). Twelve years justifies some of it | M | Thin the grass and trees on the quay side; keep the market dressing |
| Inhabited character | 10 | 8 | `citadel-structures.md`, townlife / `c_harb_arrive_f` | Odile, Nell, Doran, the ferry, the stalls and the notice boards each have a purpose (Automated runtime only) | L | — |
| **Total** | 100 | **73** | | | | |

Interiors (R-INT against ours, room camera):
- **Ticket office (s8):** close. Checkered floor, a long counter, red stools and windows with red blinds. The walls are
  dark grey in ours, LBA2's are **pale rounded blocks**.
- **Nell's house (s7):** close. Teal patterned wallpaper, wood trim, terracotta tiles. LBA2 has curved wall ends.
- **Mr Bazoo's (s14):** a central counter and side shelves as LBA2's. Dark walls against pale ones; LBA2's arch door
  is missing.

## 2. Town square and Bug Street

- **Original and sources.**
  - LBA2 scenes 42 and 48.
  - Interiors s5 (the baggage claim), s22 (the pharmacy), s15 (the Water Office's building).
  - R-ISO `C:\Users\dan\lba-study\citadel\36_game_square_ours_off.png` and `31_game_bugstreet_north.png`.
  - R-TEX, R-MAP, R-DOORS.
- **Current.**
  - arrival `c_sq_arrive_f` (from the south, looking north);
  - layout `c_top_town`;
  - landmark `c_sq_iso`;
  - street `c_bug_f`;
  - interiors `c_r_pharmacy`, `c_r_baggage`.
  - `c_r_water` failed: the Water Office's room is not registered at boot, so it is not captured.
- **Twelve years.**
  - The well on the square (the statue moved 6.2 m north).
  - Tibbo's counter and Pippa's stall on the open ground south-east of the statue.
  - The project pipe on stilts over the terraces.
  - The stair up to the asylum (CLIMB).

| Category | Max | Score | Reference + capture | Reason and gaps | Conf. | Proposed correction |
|---|---:|---:|---|---|---|---|
| Geography/topology | 25 | 22 | R-ISO 36 / `c_sq_iso` | The square, the terrace shelves at LBA2's heights (3.7 / 7.7 / 10.9 / 13.6 m against 3.76 / 7.31 / 11.28 / 13.58) and Bug Street all match. LBA2's shelf faces are walls, ours rock | H | — (see architecture) |
| Landmarks/relationships | 20 | 16 | R-ISO 36 / `c_sq_iso`, `c_sq_arrive_f` | The statue on its stepped plinth is kept. Bug Street's pair and the Water Office are at LBA2's doors. **LBA2's four gold globe lamps at the plinth's corners are gone** (ours has blue-globe lamps scattered). Tibbo's house sits on LBA2's open ground | M | Four gold globe lamps at the plinth's corners |
| Architecture/silhouettes | 20 | 12 | R-ISO 31, 36 / `c_bug_iso`, `c_bug_f` | LBA2's Bug Street pair are **flat-roofed** (pale tiled roofs with a teal coping); ours are steep gables (blue, red). The shelf faces are rough rock, where LBA2 has smooth retaining walls with white pier caps and lattice fences | M | Flat roofs with a teal coping on `bug` and `bug2`. Smooth masonry faces with white caps on the town-facing shelves |
| Palette/materials | 15 | 10 | R-TEX / `c_sq_arrive_f` | LBA2's square is grey stone paving framing four lawns. Ours is a grey cobbled circle in grass and brown earth. Our measured paving #716c64 is close to LBA2's town ground #777665, so the gap is in the layout of paving and lawns, not the stone | M | A rectangular paved square with framed lawns (R-TEX), the well kept |
| Environment | 10 | 7 | R-ISO 36 / `c_sq_iso` | Round trees and grass tufts as LBA2. The green pipeline over the shelves is a strong twelve-year element that reads as a scar | M | Keep the pipe, painted or routed lower along the shelf foot |
| Inhabited character | 10 | 8 | townlife, shops / `c_sq_arrive_f` | Stalls, Pippa, Tibbo, the notice board and residents with rounds (Automated runtime only) | L | — |
| **Total** | 100 | **75** | | | | |

Interiors:
- **Pharmacy (s22):** close (shelves of blue jars, a central counter). Ours is darker and has no arch door.
- **Baggage claim (s5):** a raised back with a railing and benches. LBA2 is three rooms of pale stone (s6 and s16 are
  not built, on purpose).

## 3. Lower town south: Chez Luc and the street hatch

- **Original and sources.**
  - LBA2 scene 42 (south part).
  - Interiors s3 and s4 (Chez Luc and its cellar), s17 (by the hatch).
  - R-ISO `33_game_south_market.png`, R-DOORS.
- **Current.**
  - arrival `c_south_f`;
  - landmark `c_south_iso2`;
  - street `c_hatch_street_f`;
  - interior `c_r_tavern`.
- **Twelve years.**
  - Fosse's Sewer Works office (the pink house, moved 3 m north off LBA2's hatch).
  - The footbridge to the spaceport on the east shore.

| Category | Max | Score | Reference + capture | Reason and gaps | Conf. | Proposed correction |
|---|---:|---:|---|---|---|---|
| Geography/topology | 25 | 21 | R-ISO 33 / `c_south_iso2` | Chez Luc and the hatch are at LBA2's places. The east shore now carries the footbridge and its landing (ours) | H | — |
| Landmarks/relationships | 20 | 16 | R-DOORS / `c_south_iso2` | The tavern door is 0.7 m off. The railed lift hatch is at LBA2's spot (DOORS-LBA2). The pink house is ours | H | — |
| Architecture/silhouettes | 20 | 15 | R-ISO 33 (b58 hip roof and awning) / `c_south_iso2` | The tavern keeps LBA2's long stone body with a pink and white striped awning. LBA2's roof is a hip, ours a gable | M | A hip roof on `south` |
| Palette/materials | 15 | 10 | R-TEX / `c_south_f` | More grass and earth than LBA2's paved strip in front of the tavern | M | Paving in front of the tavern |
| Environment | 10 | 7 | R-ISO 33 / `c_south_iso2` | Trees and palms as LBA2 | M | — |
| Inhabited character | 10 | 9 | interior-life / `c_r_tavern` | Luc, the regulars, Fosse below | L | — |
| **Total** | 100 | **78** | | | | |

Interior, **Chez Luc (s3):** close in layout. A counter at the front, a stair to a gallery at the back, red stools, round
tables. LBA2's walls are pale stone with **crenellated tops**; ours dark stone, plain.

Note: in the orthographic captures only, the sewer hatches' shafts drew as black columns (`c_south_iso`, `c_terr_iso`,
`c_port_iso`, kept after clearing the stencil). The three Follow shots near both hatches (`c_hatch_*_f`) do not show
it. **Unverified in play:** check the hatches from the VP-10 camera when it rises high over a roof (`sewers.js`, the
stencil cut).

## 4. Upper terraces and the school

- **Original and sources.**
  - LBA2 scene 48 (the north part).
  - Interior s37 (the school; not built: ours is Tibbo's house).
  - R-ISO `curator\ref\c_terr_iso.png`, R-DOORS.
- **Current.**
  - arrival `c_terr_f`;
  - landmark `c_terr_iso2`;
  - street `c_hatch_terr_below_f`, `c_hatch_terr_top_f`.
- **Twelve years.** The great stair and bridge up to the asylum, the pipeline, the terrace hatch (LBA2's).

| Category | Max | Score | Reference + capture | Reason and gaps | Conf. | Proposed correction |
|---|---:|---:|---|---|---|---|
| Geography/topology | 25 | 21 | R-ISO terraces / `c_terr_iso2` | The shelf heights are LBA2's. The terrace hatch is at LBA2's spot. The school stands 3.4 m east of LBA2's door | H | — |
| Landmarks/relationships | 20 | 15 | R-ISO / `c_terr_iso2` | The school and the hatch are kept. LBA2's railed terrace edge with signposts is replaced by the stair and bridge, which dominate | M | — |
| Architecture/silhouettes | 20 | 12 | R-ISO (the school: hip roof of brown tiles, teal coping, rubble walls, teal windows) / `c_terr_iso2`, `c_terr_f` | Ours is a stone house with a gabled plank roof. LBA2's shelves are vertical walls with white pier caps and lattice fences; ours are natural cliffs | M | A hip roof with a teal coping on `stone`. Lattice rails and white caps along the shelf edges |
| Palette/materials | 15 | 9 | R-TEX / `c_terr_f` | LBA2's shelves are pale limestone; ours are dark blue-grey rock | M | Warm and lighten Citadel's cliff rock toward R-TEX's pale grey |
| Environment | 10 | 7 | R-ISO / `c_terr_iso2` | Trees and grass as LBA2 | M | — |
| Inhabited character | 10 | 7 | source | Mostly a way through. The school's door is shut (a private home) | L | — |
| **Total** | 100 | **71** | | | | |

## 5. Twinsen's quarter

- **Original and sources.**
  - LBA2 scene 49.
  - Interiors s0 and s1 (Twinsen's house and cellar), s9 (the neighbour's).
  - R-ISO `34_game_twinsen.png`, R-DOORS.
- **Current.**
  - arrival `c_twin_f`;
  - landmark `c_twin_iso`;
  - interiors `c_r_house`, `c_r_nbrhouse`.
- **Twelve years.**
  - Zoé's garden.
  - Arthur.
  - The family's corners inside (`homelife.js`).

| Category | Max | Score | Reference + capture | Reason and gaps | Conf. | Proposed correction |
|---|---:|---:|---|---|---|---|
| Geography/topology | 25 | 22 | R-ISO 34 / `c_twin_iso` | The house stands at the cliff's edge, the neighbour across the lane, the bay below, as LBA2 | H | — |
| Landmarks/relationships | 20 | 17 | R-DOORS / `c_twin_iso` | The neighbour's door is 0.4 m off. Twinsen's door is 2.7 m south of LBA2's (optional DOORS-LBA2 #12). LBA2's lamp posts and lattice fence are reduced | H | Two lamps and the lattice fence along the lane |
| Architecture/silhouettes | 20 | 16 | R-ISO 34 / `c_twin_iso` | Yellow thatch on rubble walls, as LBA2's. LBA2's thatch is lower and flatter | M | — |
| Palette/materials | 15 | 11 | R-ISO 34 / `c_twin_iso`, `c_twin_f` | LBA2's walls are pale stone with dark speckle; ours are dark grey rubble | M | Lighten `rubble` toward LBA2's pale stone |
| Environment | 10 | 8 | R-ISO 34 / `c_twin_iso` | Palms as in LBA2, plus pines and round trees | M | — |
| Inhabited character | 10 | 9 | homelife / source | Zoé, Arthur, Hedda, the garden | L | — |
| **Total** | 100 | **83** | | | | |

Interiors:
- **Twinsen's house (s0):** warm wood and terracotta as LBA2. LBA2's teal wallpaper, curved wall ends and the
  stair-well corner are missing. Ours has straight wooden partitions.
- **The neighbour's (s9):** close (wallpaper, bed, table).

## 6. Lighthouse headland

- **Original and sources.**
  - LBA2 scene 46.
  - Body b7 (the lighthouse and its basement; no interior scene).
  - R-ISO `35_game_lighthouse.png`, R-MAP.
- **Current.**
  - arrival `c_lh_f`;
  - landmark `c_lh_iso`.
- **Twelve years.** The sage, and `lighttop` in chapters 3 and 10.

| Category | Max | Score | Reference + capture | Reason and gaps | Conf. | Proposed correction |
|---|---:|---:|---|---|---|---|
| Geography/topology | 25 | 22 | R-MAP / `c_top`, `c_lh_iso` | The headland and the tower's place are LBA2's (`world.js` POI.lighthouse) | H | — |
| Landmarks/relationships | 20 | 14 | R-ISO 35 / `c_lh_iso` | The tower is in the right place. **LBA2's annex with a wooden door at the tower's foot is missing.** The bench and palms are kept | M | The annex |
| Architecture/silhouettes | 20 | 8 | R-ISO 35 / `c_lh_iso` | **LBA2: a square white stone tower with grey quoins, a lantern, a domed cap. Ours: a round, tapered, red-and-white striped tower on a rubble base.** A critical landmark mismatch | M | Rebuild in LBA2's shape: a square (or chamfered) white tower, grey quoins, a glazed lantern, a domed grey cap, the annex |
| Palette/materials | 15 | 8 | R-ISO 35 / `c_lh_iso` | White and grey against red and white stripes | M | White and grey, no stripes |
| Environment | 10 | 8 | R-ISO 35 / `c_lh_f` | Rock, palms and sand as LBA2 | M | — |
| Inhabited character | 10 | 7 | purposes, source | The sage; the tower's own chapters | L | — |
| **Total** | 100 | **67** | | | | |

## 7. North plateau: the fort and the asylum

- **Original and sources.**
  - LBA2 scene 47 (the plateau and the fort's ruins) and s51 (the passage).
  - LBA1: FunFrock's fortress and asylum on Citadel Island (R-LBA1 s0, the asylum interior). **The LBA1 exterior was not
    rendered, so the fortress's outside is unverified against LBA1.**
  - R-ISO `curator\ref\c_fort_iso.png`.
- **Current.**
  - arrival `c_fort_f` (the stair up);
  - landmark `c_fort_iso`;
  - interior `c_r_asylum`.
- **Twelve years.**
  - The Joint Project station built in FunFrock's old fort (its derrick and water tower).
  - The asylum, now a hostel.
  - Story: the project (STORY_BIBLE).

| Category | Max | Score | Reference + capture | Reason and gaps | Conf. | Proposed correction |
|---|---:|---:|---|---|---|---|
| Geography/topology | 25 | 20 | R-ISO fort / `c_fort_iso` | The plateau's shape and level are LBA2's. The compound's walls fill its east part, where LBA2 has rolling ground | M | — |
| Landmarks/relationships | 20 | 14 | R-DOORS, R-ISO / `c_fort_iso` | The passage's two doors are at LBA2's places (shut, story). LBA2's ruins became an intact fortress: a story change (twelve years) that reads as LBA1's fort | M | — |
| Architecture/silhouettes | 20 | 13 | R-LBA1 (interior only) / `c_fort_iso` | Grey stone walls, round towers with dark conical roofs. Plausible LBA1, but unverified (see above) | L | Render LBA1's Citadel exterior to check it |
| Palette/materials | 15 | 10 | R-TEX / `c_fort_iso` | Grey stone as LBA2's ruins | M | — |
| Environment | 10 | 6 | R-ISO fort (a grove of round trees across the plateau) / `c_fort_iso` | Few trees left round the compound | M | A grove on the open ground west and north of the compound |
| Inhabited character | 10 | 8 | chapter1, depot watch / source | Project staff, guards, the hostel | L | — |
| **Total** | 100 | **71** | | | | |

Interior, **the asylum (LBA1 s0):** LBA1's grey-teal stone, a stair, cells and corridors. Ours has the grey-teal stone
walls, crates and desks, but LBA1's distinctive split levels and the teal pool-like courts are not visible from the
room camera's start (one capture). **Not scored:** one view only.

## 8. North-west plateau: Bersimon's tent and Tralu's cave

- **Original and sources.**
  - LBA2 scene 45.
  - Interiors s21 (the wizard's tent), s2 (Tralu's cave).
  - R-ISO `curator\ref\c_nw_iso.png`, R-DOORS.
- **Current.**
  - arrival `c_nw_f`;
  - landmark `c_nw_iso`;
  - interiors `c_r_wtent`, `c_r_tralucave`.
- **Twelve years.**
  - The glider field at LBA2's tent spot.
  - The project depot (its fence and containers).
  - The pipeline.

| Category | Max | Score | Reference + capture | Reason and gaps | Conf. | Proposed correction |
|---|---:|---:|---|---|---|---|
| Geography/topology | 25 | 19 | R-ISO NW, R-DOORS / `c_nw_iso` | The plateau matches. The tent is 3.7 m east and 3.6 m north of LBA2's door. Tralu's door is 9 m north (the depot yard covers LBA2's bank face) | H | — (kept by DOORS-LBA2; the user's call) |
| Landmarks/relationships | 20 | 13 | R-ISO NW / `c_nw_iso` | The tent and the cave door both exist. The glider field and the depot sit between them | M | — |
| Architecture/silhouettes | 20 | 13 | R-ISO NW (b3: a rounded red tent) / `c_nw_iso`, `c_nw_f` | Ours is a blue conical tent with stars, a different form | M | A rounded tent shape |
| Palette/materials | 15 | 7 | R-ISO NW / `c_nw_iso` | **Red against blue**: the tent is the plateau's landmark colour | M | The tent's canvas in LBA2's red (keep the stars as small trim if wanted) |
| Environment | 10 | 7 | R-ISO NW / `c_nw_iso` | Pines, a palm and rocks as LBA2's. Containers and the pipe crowd it | M | — |
| Inhabited character | 10 | 7 | source | Bersimon, the depot watch | L | — |
| **Total** | 100 | **66** | | | | |

Interiors:
- **Wizard's tent (s21):** LBA2's tent opens into a stone room with a cauldron, a long table and a chimney. Ours has the
  cauldron and the table on a wooden floor with dark stone walls. Fair.
- **Tralu's cave (s2):** LBA2 has rock with built stone rooms; ours rock, paving and steps. Fair.

## 9. West islet

- **Original and sources.** LBA2 scene 44; R-ISO `curator\ref\c_islet_iso.png`.
- **Current.** `c_islet_iso` (no Follow: the curator did not reach it in play).

**Total withheld.** The dome is excluded by the user. The rest of the islet is:
- its rock, at LBA2's top height (H);
- the figure, kept (H);
- LBA2's stair flight down the south face, missing;
- an orange pad, ours.

Nothing about its people or its use was seen.

## 10. The sewer (LBA2 scene 17)

- **Original and sources.** R-INT `lba2_scene017_grid017.png` and R-DOORS (b) (the decoded hall, the shafts and the
  rooms).
- **Current.** `c_r_sewer`; DOORS-LBA2 is merged (`docs/lba-maturity/door-map.md`).

| Category | Max | Score | Reference + capture | Reason and gaps | Conf. | Proposed correction |
|---|---:|---:|---|---|---|---|
| Geography/topology | 25 | 21 | R-DOORS (b), R-INT / `c_r_sewer` | The north gallery, the west walkway, the south slabs, the central island and the causeway are LBA2's plan. The hall is 28 × 24 m against 39 × 38 m | H | — |
| Landmarks/relationships | 20 | 17 | R-DOORS / door-map | Both lift shafts are in LBA2's corners, the tavern drop is on the platform, the treasure door is in the west wall, the tower is the globe room's door | H | — |
| Architecture/silhouettes | 20 | 14 | R-INT / `c_r_sewer` | Stone walkways, rails, lamp posts as LBA2 | M | — |
| Palette/materials | 15 | 11 | R-INT / `c_r_sewer` | Grey stone and pale blue water as LBA2. Ours is darker stone | M | — |
| Environment | 10 | 8 | R-INT | Water over the floor, as LBA2 | M | — |
| Inhabited character | 10 | 5 | source | Fosse's works; not observed in a capture | L | — |
| **Total** | 100 | **76** | | | | |

## Unverified or unknown

- **LBA2 in play:**
  - LBA2's lighting, sky colour and camera are unverified: no gameplay captures. Palette scores rest on R-TEX (the
    ground) and the bodies' own colours.
  - LBA1's Citadel exterior is not rendered, so the fortress is unverified against LBA1.
  - The Water Office's interior is not captured.
- **Inhabitants:** every "Inhabited character" score is Source-reviewed (tests and code) plus a few captures. Low
  confidence.
- **The black shaft columns:** seen only in the orthographic captures. Check in play from a high camera.
- **Not re-run on this build:** R-WS numbers (26.10).

## Fixes ranked by the points they buy

Points are each district's provisional gain. Owners as `docs/lba-maturity/status.md`: world-art (the laptop) for models
and colours, buildings-interiors (the cloud) for doors and rooms.

| # | Fix | District gain | Owner | Size |
|---|---|---|---|---|
| 1 | **The lighthouse in LBA2's shape:** a square (chamfered) white stone tower, grey quoins, a glazed lantern with a domed grey cap, a low annex with a wooden door at its foot. Keep its door, `lighttop` and colliders | Lighthouse +13 (67 → 80) | world-art (`lighthouse.js`) | M |
| 2 | **Barrel roofs** on the long hall (`baggage` / the ticket office: grey ribbed barrel) and `wing2` (Nell's: brown plank barrel); a **straight paved quay edge with white bollard posts** on LBA2's outline | Harbour +9 (73 → 82) | world-art (`town.js` roofs), world-polish (the quay) | M |
| 3 | **Bersimon's tent** in LBA2's red, with a rounder canvas form | NW plateau +7 (66 → 73) | world-art | S |
| 4 | **Flat roofs with a teal coping** on Bug Street's pair, and a **hip roof with a teal coping** on the school (`stone`); four **gold globe lamps** at the statue's plinth | Square +6 (75 → 81), terraces +3 | world-art (`town.js` HOUSES roof kinds, `citadel-layout.js` lamps) | S–M |
| 5 | **Town ground as LBA2's:** a rectangular paved square with framed lawns, a paved strip before the tavern, and the wing yard paved | Square +3, harbour +2, south +2 | world-art (`world.js` paths and paving) | M |
| 6 | **Interiors in pale rounded stone:** lighten the stone of Chez Luc, Mr Bazoo's, the pharmacy, the ticket office and the baggage claim to LBA2's pale grey blocks, with round caps on the low near rims; crenellations on Chez Luc's back wall | about +3 to +4 per room (palette) | buildings-interiors + world-art (`interiors.js`, the RoomBuilder's stone) | M |
| 7 | **Shelf faces and pale rock:** smooth masonry faces with white pier caps and lattice rails on the town-facing shelves; Citadel's rock lightened toward R-TEX | Terraces +4, square +2 | world-art | M–L |
| 8 | **Pale rubble walls** for Twinsen's house and the neighbour's; two lamps and the lattice fence on the lane | Twinsen's quarter +3 (83 → 86) | world-art | S |

The first eight bring Twinsen's quarter to about 86. The lighthouse and the harbour come to about 80–82; the rest stay
in the high 70s.

## Re-score after CITADEL-85 (the desktop, 12.11.2026)
CLOUD_ORDERS 40 item 6: the lighthouse, the north-west plateau, the harbour and the square, now that CITADEL-85
(`e2a9d1dc`: an LBA2-like lighthouse tower, Bersimon's rounded red tent, barrel roofs on the long hall and Nell's, hip
roofs on Bug Street and the school, gold square lamps) is in. **Our side:** build `501714ce`, Chrome on the desktop's
GTX 1050, the play camera (Follow, Medium) and, for the lighthouse, a free camera aimed at the tower (the play camera
looks down at Twinsen below the cliff and cuts the tower off). Pictures: `captures/curator-citadel-85/` (chapters 1–2).
**Reference side:** the scores above and their written descriptions of R-ISO / R-MAP (the laptop's renders are not on the
desktop), so every changed category is **M** at best. `tools/worldscore.mjs` on this build: Citadel 82.1 (coast 90.8,
height 80.0, landmarks 97.5, objects 48.3).

| District | Before | After | What changed (only these categories move) |
|---|---|---|---|
| Lighthouse headland | 67, critical | **84** | architecture 8 → 17: now a square white stone tower with grey quoins, a lantern, a domed cap and an annex at its foot, LBA2's description (`c1`, `c2`); landmarks 14 → 18; palette 8 → 12. **The critical landmark failure is resolved.** Left: the tower's proportions not measured against R-ISO 35 here |
| North-west plateau | 66, critical | **73** | architecture 13 → 16 and palette 7 → 9: Bersimon's tent is now red and rounded (`c3`, `c3b`), as LBA2's body 3; landmarks 13 → 15. **The critical failure (the tent) is resolved.** Left: the project depot (containers, fences, pipes) still crowds the plateau |
| Harbour and harbour wing | 73 | **76** | architecture 12 → 15: the long hall and Nell's have barrel roofs, as LBA2's (`c4`, `c5`). Left: the quay is a natural shore, not LBA2's straight paved platform |
| Town square and Bug Street | 75 | **78** | landmarks 16 → 18: the gold globe lamps stand round the statue again (`c6`, `c7`); architecture 12 → 13: Bug Street's pair have low hip roofs (`c8`), nearer LBA2's flat-roofed pair than the gables were. Left: grass inside the square where LBA2 has formal paving and four lawns |

None reaches 85 yet. The largest points left: the harbour's quay (a straight paved platform), the square's paving, and
the plateau's crowding by the depot (a twelve-years addition: the cloud's call).
