# World comparison: Zeelich, per island and district

Order 27a (reference curator). The laptop, 8–9.11.2026. Template: `docs/lba-maturity/WORLD_RESEMBLANCE_TEMPLATE.md`.
Reviewer: the laptop's reference curator (Claude). **Provisional editorial scores, not reviewed by the user, not a pixel
match.** **Zeelich pictures are for the team only and must not be shown to the user** (chapter 3 onward).

## Evidence and labels

**Our build.**
- HEAD `21bf522d` (contains origin `c5bf5608`), from a `git archive` copy on 127.0.0.1 and a fresh profile.
- Chrome, ANGLE D3D11 on the Vega 8, 1280×720.
- Chapter 4 (`dig`), so the shuttles run. Follow camera at Medium.
- Label: **Automated runtime only**.
- Script: `curator/work/cap.mjs` with `zeelich.json`.
- Pictures: `curator\ours\zeelich\*.jpg`; sheets: `curator\work\s_z_*.jpg`.

**Kinds of capture of ours:**
- **iso**: orthographic, at the reference's angle, centre and width;
- **top**: orthographic, straight down, north up;
- **follow**: the player's camera;
- **room**: the room camera.

**References.** All **Source only**: decoded on this laptop from the user's LBA2 files, read in place.
- **R-TOP**: each island's ground with its own textures, from above: the left halves of
  `C:\Users\dan\lba-study\islands\pair_isle_<name>.jpg`, cropped to `curator\work\<name>_orig_top.png`.
- **R-ISO**: ground heights and island objects, flat ground colour, at an LBA2-like camera:
  `curator\ref\z_*_iso.png` (13 renders; script `curator\work\refscene.py`).
- **R-INT**: interior grids, bricks only: `C:\Users\dan\lba-study\iso\lba2_scene<NNN>_grid<NNN>.png`.
- **R-DOORS**: every outdoor door zone of OTRINGAL, KNARTAS, MOSQUIBE, CELEBRAT, PLATFORM and SOUSCELB, in
  island-local metres. Decoded here (`curator\work\doors_isles.out`, from the doors agent's `zones.py` and `links.py`).
  Scene names come from the lba2remake locator lists (a secondary source).
- **R-WS**: `tools/worldscore` (`docs/WORLD_SIMILARITY.md`, 26.10, an older build):
  - Otringal 92.6, Knartas 94.7, Mosquibee 84.5, Celebration 92.1, Under Celebration 91.3, the Platform 89.2;
  - every original building within 1 m; the coast IoU 1.0 on the grid.
  - It measures **positions and ground**, not looks. Not re-run.
- **Z-ID**: `C:\Users\dan\lba-study\zstyle\zeelich_identity.json`, the islands' building kinds and colours as numbers
  (7.11).

**What was not used.** No LBA2 gameplay screenshots, so LBA2's sky, cloud colour and lighting on Zeelich are
unverified. No remakes or fan models. No download.

**The isles' frame.** Island-local metres are LBA2's island-centred metres (checked on the bar's and the temple's doors).

**Decisions respected:**
- The terminal island is **a new city** (the user, 7.11.2026). It gets a compatibility review against Zeelich's
  identity, with no geography or landmark score.
- The isles are compared with LBA2.
- The CX islet and Tralu Rock are cut (DECLUTTER).
- The Nectar Orchard and the Old Watch are ours.

**One finding runs through every isle.** zislands.js builds every house, tower and annex with the same Esmer generator
(`EP.esmerBuilding`) on LBA2's footprints. Positions and ground are LBA2's (R-WS). The silhouettes are not: the Francos'
round huts, the Mosquibees' cocoon nest and the Wannies' metal lift tower all come out as taupe stucco boxes with domes.

## Summary

| Island · district | Score /100 | Critical failure | Biggest gaps |
|---|---:|---|---|
| **Terminal island** (new city), 4 districts | compatibility 60–69 (normalised from /55) | — | a flat oval deck with no rock relief; boxy houses where Zeelich's Esmer forms are round drums and stacked domes; the terminal hall plain beside LBA2's astroport |
| **Otringal** · harbour (lower west) | **66** | no | paving rendered **#605b60** against LBA2's **#d0cdc5**; no moored ship; the bar's door on the wrong face |
| Otringal · plaza and downtown | **66** | no | LBA2's round straw-domed huts drawn as boxes; dark paving |
| Otringal · high town (the palace) | **61** | **yes (landmark)** | LBA2's palace is a cluster of round drums under stacked domes; ours rectangular blocks; rock spikes through the paving (OTRINGAL-37) |
| Otringal · astroport and lower town | **68** | no | the walled compound kept; LBA2's spaceport is our cargo store (twelve years) |
| Otringal · upper town (the hotel terrace, y 18) | withheld | — | not captured on its own |
| **Knartas** · the Francos' village | **58** | **yes (architecture)** | LBA2's round brown dome huts with porthole windows are Esmer boxes |
| Knartas · harbour, refinery, zeppelin port | **58** | **yes (landmark)** | LBA2's moored zeppelin and its port (s144) are missing |
| **Mosquibee** · the nest | **56** | **yes (landmark)** | LBA2's white cocoon nest on the cliff is an Esmer tower with a gold dome |
| Mosquibee · the upper village | **62** | no | LBA2's wooden stake palisade ring is a ring of tall flowers |
| **Celebration** (summit) | **59** | **yes (landmark)** | LBA2's massive rough grey figure with a gold halo is a slim brown hooded tower; the lava is gone; the temple's own building is a store |
| **Under Celebration** | **62** | no | LBA2's crystal clusters and red fissures are missing |
| **The Platform** · lift tower and the Building Company | **54** | **yes (landmark)** | LBA2's lattice lift tower with red and green pipes and a glass shaft, on metal blocks, is a stucco tower |
| The Platform · village and bank | **57** | no | industrial metal blocks drawn as Esmer houses; brown and orange where LBA2 is grey-blue |
| **The Lift Dock** | **65** | no | a wooden tower, purple decks, one hull, where LBA2 has a red steel frame, hazard-striped teal decks, H pads and two hulls |
| Nectar Orchard, Old Watch (ours) | compatibility only | — | fit Zeelich's clouds and light; the orchard's press house is the generic Esmer box |

Interiors:

| Room | LBA2 | Look |
|---|---|---|
| Otringal bar (`otrbar`) | s136 | **close**: cloud wallpaper on blue walls, a teal checkered floor, green booths, the raised stage |
| Otringal hotel (`otrhotel`) | s81 | **close**: dark teal walls, terracotta floor, the pool, white lamps, armchairs |
| Celebration temple (`celtemple`) | s93 | fair: dark stone, pillars, round floor tiles, a red altar. LBA2's horned urns and statues are missing |
| Zeelich Spaceport terminal (`zterminal`) | ours; draws on s78, s82, s86 | plain grey-lilac hall. LBA2's astroport hall (s86) has chrome barrel vaults of glass, porthole windows and twin glass towers |

These are compared by eye and not scored: one room-camera view each.

**No Zeelich place reaches 85.** The isles keep LBA2's ground and positions (high geography) but lose most of their
architecture and palette identity. Ranked fixes are at the end.

---

## A. The terminal island: a new city (compatibility review)

**What it is.** Ours: Zeelich Spaceport, the sky pier, the gateway, the shuttle pad, the Esmer street and plaza, three
mills, the watch house (Snuff's bakery), the dog yard, the project depot and the drill platform. There is no LBA2
counterpart.

**Measured against** Zeelich's identity as LBA2's Otringal shows it: R-ISO `z_otr_*`, R-TOP Otringal, Z-ID, R-INT s86.

**Captures** (`curator\ours\zeelich\`):
- layout `z_term_top`;
- landmarks `z_term_plaza_iso`, `z_term_street_iso`, `z_term_gate_iso`, `z_term_port_iso`;
- arrival `z_term_arrive_f` (out of the terminal);
- streets `z_term_street_f`, `z_term_plaza_f`, `z_term_pier_f`, `z_term_mill_f`;
- interior `z_r_zterminal`.

**Geography and landmarks: not applicable** (a new city).

| District | Architecture /20 | Palette /15 | Environment /10 | Inhabitants /10 | /55 | Normalised | Reason and gaps (confidence M unless noted) |
|---|---:|---:|---:|---:|---:|---:|---|
| Zeelich Spaceport (the deck and the terminal pavilion) | 12 | 10 | 6 | 8 | 36 | 65 | The pavilion, the deck rails and the shuttle read as Zeelich. The terminal hall (`z_r_zterminal`) is a plain box room; LBA2's astroport (s86) is chrome vaults of glass and portholes |
| The Esmer street and plaza (five houses, the council house, the watch house) | 13 | 11 | 5 | 9 | 38 | 69 | Taupe stucco, glass-block bands, aqua and gold caps, the minaret: the right words. But every house is a box with a cap, where Otringal's grandest forms are round drums under stacked domes (`z_otr_high_iso` reference). The paving is light (#bfbac1, close to LBA2's #d0cdc5). The island is a flat oval with a thin rim (`z_term_top`): no rock, terraces or cliff under the edge, so it reads as a platter on the clouds. Few plants (small gold trees). Residents with trades and rounds (zeelife; L) |
| The mills, the depot and the drill platform (the industrial east) | 12 | 10 | 5 | 6 | 33 | 60 | The derrick and the platform's hazard-striped, teal metal edge fit Zeelich's industry (LBA2's Platform and Lift Dock use the same words). The mills are ours (the chapter 3 puzzle) and fit |
| The sky pier, the gateway and the shuttle pad | 13 | 10 | 6 | 7 | 36 | 65 | The horseshoe gate with glass-block bands works. The pier is plain |

Compatibility corrections (ranked):
1. **A rock skirt and relief under the deck's rim.** Faceted, pale Zeelich rock hanging into the clouds, with a stepped
   rim and two or three terraces at the edges, so the island reads like its neighbours (`z_otr_top`, `z_kna_top`).
   Visual only: the physics bricks stay. About +3 to +4 environment in every district.
2. **Two or three round Esmer buildings** in the street: drums with stacked aqua and gold domes, after LBA2's high town
   (`ref\z_otr_high_iso.png`). The council house is the natural candidate. About +3 architecture.
3. **The terminal hall in s86's vocabulary:** barrel vaults with glass bands, porthole windows, chrome trim. About +3
   architecture.
4. **More planting:** gold plume trees in square planters and fan plants (Z-ID bodies 52–54 and 18) along the street
   and the plaza. About +2 environment.

## B. Otringal (LBA2 OTRINGAL; island-local metres)

**Districts** (LBA2's levels):
- the harbour on the west, y 4: the bar s136;
- the plaza and downtown, y 12.7: the casino s135, the shop s147, the elevator s150;
- the upper town, y 18–19: the hotel s81, the hotel room s169, the emperor's spacecraft s189;
- the high town, y 28: the emperor's palace s154;
- the astroport and the lower town in the south-east, y 1–7: the spaceport s86, the control tower s85, the Esmer
  spacecraft s41, the jail s83/s84, the elevators s82/s139, the tourists' area s78.

**References:** R-ISO `z_otr_harb_iso`, `z_otr_plaza_iso`, `z_otr_high_iso`, `z_otr_south_iso`; R-TOP; R-DOORS; R-INT
s136, s81, s86.

**Captures:**
- layout `z_otr_top`;
- arrival `z_otr_arrive_f` (the shuttle pad, looking north);
- landmarks `z_otr_*_iso`;
- streets `z_otr_plaza_f`, `z_otr_harb_f`, `z_otr_high_f`;
- interiors `z_r_otrbar`, `z_r_otrhotel`.

**Twelve years:**
- the shuttle pad;
- the Imperial Hotel's lobby at the casino's double door (ours);
- LBA2's spaceport building is now the quay's cargo store, because Zeelich Spaceport took the Twinsun traffic
  (PLANET-1);
- 23 houses with rooms (ours; `BUILDING_REGISTER.csv` gives the LBA2 door, if any, beside each).

**Measured value** (median pixel, this build):
- ours: the plaza's paving **#605b60** in `z_otr_plaza_f`; the high town's ground #585350; the top view #645e61;
- LBA2: R-TOP's town **#d0cdc5**.

zislands.js's own Otringal target is already LBA2's: `OTR_LBA2` paving #f0eaf6, rock #ece8de; ZEELICH-2 measured
#d3ced9. **The rendered result is about half as light as its own target.** Something darkens it (the turf-rock texture,
the island's grade, or the light).

| Category | Max | Harbour | Plaza | High town | Astroport | Reference + capture | Reason and gaps | Conf. | Proposed correction |
|---|---:|---:|---:|---:|---:|---|---|---|---|
| Geography/topology | 25 | 23 | 23 | 23 | 23 | R-WS, R-TOP / `z_otr_top` | Ground and coast are LBA2's numbers. The cloud sea replaces the decoder's sea (LBA2's look unverified) | H | — |
| Landmarks/relationships | 20 | 13 | 13 | 12 | 14 | R-ISO, R-DOORS / `z_otr_*_iso` | Buildings within 1 m. Missing: the **moored ship at the harbour's pier**; the plaza's **round straw-domed huts** (boxes now); the palace's round cluster (boxes). The bar's door is on the south side, LBA2's on the west face. The hotel is at the casino's door. The astroport's walled square and central tower are kept | M | The moored ship; the bar's door on the west face (DOORS-LBA2); the plaza's two round huts |
| Architecture/silhouettes | 20 | 10 | 9 | 7 | 11 | R-ISO / iso captures | The bar's tall glass-block house is kept. Everything else is the box generator; LBA2's Otringal mixes boxes with **round drums, stacked domes and straw domes** | M | Round drums with stacked aqua and gold domes in the high town; straw-domed round huts at the plaza |
| Palette/materials | 15 | 7 | 7 | 7 | 8 | R-TOP / `z_otr_plaza_f`, `z_otr_top` | Taupe walls, glass blocks and aqua caps are right. **The ground is twice as dark as LBA2's** (see the values above). The harbour's pier is near black | H (measured) | Bring the paving and rock to the target value (#d0cdc5 to #ece8de as rendered); a pale stone pier |
| Environment | 10 | 6 | 6 | 6 | 6 | R-ISO / `z_otr_high_f`, `z_otr_harb_f` | Clouds and plants fit. **Grey rock spikes rise through the paving** between the houses (OTRINGAL-37, seen in `z_otr_high_f`) | M | OTRINGAL-37: keep the scatter off paved ground |
| Inhabited character | 10 | 7 | 8 | 6 | 6 | `zeelich-inventory.md` / follows | 4 residents with rounds, 23 rooms, keepers. LBA2's Otringal had police, a newspaper seller and tourists | L | A guard and a news seller on the plaza (world-campaign-finisher) |
| **Total** | 100 | **66** | **66** | **61** | **68** | | | | |

## C. Knartas (LBA2 KNARTAS: the Francos' island)

**Districts:**
- the village (north-east, y 1–3): the shop s171, the bar s172, Mr Kurtz's house s173, the nursery s174, Roger de la
  Fontaine's house s175;
- the harbour, the refinery (s140, s143) and the zeppelin port (s144) on the west and south.

**References:** R-ISO `z_kna_vil_iso`, `z_kna_harb_iso`; R-TOP; R-DOORS. **Captures:** `z_kna_top`, `z_kna_vil_iso`,
`z_kna_harb_iso`. The follow capture `z_kna_f` sits against an awning and is not usable.

| Category | Max | Village | Harbour | Reference + capture | Reason and gaps | Conf. | Proposed correction |
|---|---:|---:|---:|---|---|---|---|
| Geography/topology | 25 | 23 | 23 | R-WS 94.7 / `z_kna_top` | LBA2's ground and footprints | H | — |
| Landmarks/relationships | 20 | 13 | 9 | R-DOORS / register | The village's five LBA2 doors fall on our houses (2.0–3.8 m off). **The zeppelin and its port are missing** (a critical landmark). The refinery is a flat walled yard | M | The moored zeppelin (a grey hull with red fins) at the port; the refinery's machinery block |
| Architecture/silhouettes | 20 | 5 | 8 | R-ISO / iso captures | **LBA2's Franco houses are round, brown dome huts with dark round portholes** (`ref\z_kna_vil_iso.png`). Ours are Esmer boxes with blue domes: the island's identity is lost | M | A Franco hut kit: round, squat, brown, portholes, a low door. Used for every village house (doors and rooms unchanged) |
| Palette/materials | 15 | 6 | 7 | R-TOP / `z_kna_top` | LBA2: pale grey-white rock with green moss, an orange-brown earth square, sand rims. Ours: dark purple rock and bright green | M | The island's rock pale grey; the village square orange-brown earth |
| Environment | 10 | 5 | 5 | R-ISO | LBA2's twisted dead branches and lamps; ours grass | M | Twisted branch props by the huts |
| Inhabited character | 10 | 6 | 6 | source | Quill and residents; who they are (Francos or not) not checked | L | — |
| **Total** | 100 | **58** | **58** | | | | |

## D. Mosquibee (LBA2 MOSQUIBE)

**Districts:**
- the nest (the east cliff: s106, its door at (26.1, 20.1), 9.6 m up);
- the upper village (the west summit, with s149's exits).

**References:** R-ISO `z_mos_hive_iso`, `z_mos_up_iso`; R-TOP. **Captures:** `z_mos_top`, both isos, `z_mos_f`.

| Category | Max | Nest | Upper village | Reference + capture | Reason and gaps | Conf. | Proposed correction |
|---|---:|---:|---:|---|---|---|---|
| Geography/topology | 25 | 22 | 22 | R-WS 84.5 / `z_mos_top` | Two islands and the rope bridge, as LBA2 | H | — |
| Landmarks/relationships | 20 | 9 | 12 | R-ISO / isos | **The nest is drawn as an Esmer tower with a gold dome** (critical). The upper village's ring survives as a ring of tall red flowers, not LBA2's stake palisade with racks | M | A white cocoon nest on the cliff over its door; a wooden stake palisade with racks (flowers inside it, if the honey story wants them) |
| Architecture/silhouettes | 20 | 6 | 9 | R-ISO | As above | M | As above |
| Palette/materials | 15 | 7 | 7 | R-TOP | LBA2: olive-brown rock, sand-yellow and pale grey. Ours: dark brown and green under a pink sky | M | Olive rock and sand ledges |
| Environment | 10 | 6 | 6 | R-ISO | The rope bridge is kept; LBA2's red banners are missing | M | Red banners at the nest's mouth |
| Inhabited character | 10 | 6 | 6 | source | 4 residents; the hive keepers' hall | L | — |
| **Total** | 100 | **56** | **62** | | | | |

## E. Celebration (LBA2 CELEBRA2, the risen figure)

**References:** R-ISO `z_cel_iso`; R-TOP; R-DOORS: the temple s93's door on the **west flank of the building at (−9, 4)**;
s185 inside the figure. **Captures:** `z_cel_top`, `z_cel_iso`, `z_cel_f`, `z_r_celtemple`.

**Twelve years (ours, `docs/TWELVE_YEARS.md`):** the pit filled and paved, the festival with masts and lanterns, the
figure "a robed, hooded stone figure with a glowing face".

| Category | Max | Score | Reference + capture | Reason and gaps | Conf. | Proposed correction |
|---|---:|---:|---|---|---|---|
| Geography/topology | 25 | 22 | R-WS 92.1 / `z_cel_top` | LBA2's ground; the pit is paved (twelve years) | H | — |
| Landmarks/relationships | 20 | 10 | R-ISO, R-DOORS / `z_cel_iso` | **The figure** stands in LBA2's place but is a slim brown tower (critical). **LBA2's temple building at (−9, 4) is our lantern makers' store**, while our temple portal is on the summit plaza (2.2, −9.2) | M | The figure massive and rough, grey stone, the gold halo ring. The temple's door on that building's west flank (−12.7, 4.1), as DOORS-LBA2 asks; the lantern store elsewhere |
| Architecture/silhouettes | 20 | 8 | R-ISO | The temple building is an Esmer box; LBA2's is grey stone with columns | M | Grey stone with columns |
| Palette/materials | 15 | 6 | R-TOP | **LBA2: dark rock with red lava channels.** Ours: brown rock and green grass. The lava's loss has no stated story reason (only the pit is filled) | M | Cooled lava: dark rock with dull red ember veins in the channels |
| Environment | 10 | 5 | R-TOP | As above: a volcano island no longer reads as one | M | As above |
| Inhabited character | 10 | 8 | source / `z_cel_iso` | The festival and its people | L | — |
| **Total** | 100 | **59** | | | | |

## F. Under Celebration (LBA2 SOUSCELB)

**References:** R-ISO `z_und_iso` (the slope by the cave door s129 at (10.7, −39.0)); R-TOP. **Captures:** `z_und_top`,
`z_und_iso`, `z_und_f`.

| Category | Max | Score | Reason and gaps | Conf. | Proposed correction |
|---|---:|---:|---|---|---|
| Geography/topology | 25 | 23 | LBA2's ground (R-WS 91.3) | H | — |
| Landmarks/relationships | 20 | 12 | The cave's building is our gas works' gauge room (2.7 m from LBA2's door). **LBA2's dark crystal clusters on the slope are missing** | M | Crystal clusters at LBA2's places (R-ISO) |
| Architecture/silhouettes | 20 | 9 | An Esmer box with a dome for LBA2's dark, curved-walled building (Z-ID: #4b413a, curved walls) | M | A low curved stone building |
| Palette/materials | 15 | 7 | LBA2: dark rock, red fissures, a sand-yellow floor. Ours: purple rock with green moss | M | Red fissures; less green |
| Environment | 10 | 5 | Crystals and fissures are the place's identity | M | As above |
| Inhabited character | 10 | 6 | 4 residents (source) | L | — |
| **Total** | 100 | **62** | | | |

## G. The Platform (LBA2 PLATFORM: the Wannies)

**Districts:**
- the lift tower and the Building Company (north-east: s123 the elevator building);
- the village and the bank (east: s125, s126, s122);
- the church on the west (s118). The church is not captured.

**References:** R-ISO `z_pla_tower_iso`, `z_pla_vil_iso`; R-TOP; R-DOORS. **Captures:** `z_pla_top`, both isos, `z_pla_f`.

| Category | Max | Tower | Village | Reason and gaps | Conf. | Proposed correction |
|---|---:|---:|---:|---|---|---|
| Geography/topology | 25 | 22 | 22 | LBA2's ground (R-WS 89.2) | H | — |
| Landmarks/relationships | 20 | 9 | 11 | **LBA2's lattice lift tower** (red and green pipes, a glass shaft, over a hazard-striped teal metal block) **is a stucco tower with arched windows** (critical). The bank's and the church's doors fall on our homes and chapel | M | The lattice tower and its metal block at LBA2's place |
| Architecture/silhouettes | 20 | 6 | 7 | Industrial metal blocks with pipes and a timber head-frame, drawn as Esmer houses | M | A Wannie industrial kit (metal blocks, pipes, the head-frame) |
| Palette/materials | 15 | 5 | 5 | LBA2: grey-blue and white rock, teal metal, pinkish stones. Ours: brown and orange, with an orange cloud sea | M | Grey-blue rock, teal metal; the cloud sea's tint checked against LBA2 |
| Environment | 10 | 5 | 5 | | M | — |
| Inhabited character | 10 | 7 | 7 | 6 residents, the Building Company's office | L | — |
| **Total** | 100 | **54** | **57** | | | |

## H. The Lift Dock (LBA2 ASCENCE)

**References:** R-ISO `z_lift_iso`; R-TOP. **Captures:** `z_lift_top`, `z_lift_iso`. Score **65**:

| Category | Score | Reason and gaps |
|---|---:|---|
| Geography/topology | 20/25 | The decks on stilts follow LBA2's (R-WS partial: decks compared as buildings) |
| Landmarks/relationships | 13/20 | The tower is wood, not LBA2's red steel frame with glass; one hull, not two; the H pads are missing |
| Architecture/silhouettes | 11/20 | |
| Palette/materials | 7/15 | Teal decks with yellow and black hazard edges and red-and-white pads in LBA2; purple decks in ours |
| Environment | 7/10 | |
| Inhabited character | 7/10 | |

Fix: the red frame, the hazard edges, the H pads and a second hull (world-art).

## I. Ours: the Nectar Orchard and the Old Watch

Compatibility review (`z_orch_iso`, `z_oldw_iso`). Both sit well on Zeelich's clouds and light.
- **The orchard:** its blossom rows and hives fit. Its press house is the generic Esmer box; a round drum would suit
  better.
- **The Old Watch:** the ruined tower and the fallen dome on the crescent ridge fit.

No resemblance score: there is no LBA2 counterpart.

## Unverified or unknown

- **LBA2 in play:** LBA2's Zeelich sky, cloud-sea colour and lighting are unverified: no gameplay capture. Our lilac sky
  and clouds are assumed right and were not scored as a gap.
- **Not captured:** Otringal's upper town (the hotel's terrace), the Platform's church, the Lift Dock and the isles in
  Follow (most follow shots on the isles were placed badly and are not used).
- **Inhabitants:** Source-reviewed only, low confidence. Whether the Knartas residents are Francos was not checked.
- **R-WS** is from an older build and measures positions, not looks.

## Fixes ranked by the points they buy

| # | Fix | Gain | Owner | Size |
|---|---|---|---|---|
| 1 | **Each race's own buildings on the isles:** Knartas's Franco round dome huts with portholes (every village house); Mosquibee's white cocoon nest on its cliff and a stake palisade; the Platform's lattice lift tower with pipes and a glass shaft on a hazard-striped metal block, and metal blocks for its industrial houses. Doors, rooms and colliders stay where they are (the register lists them) | Knartas village +10, Mosquibee nest +9, Platform tower +9, Platform village +6, Mosquibee upper +4 | world-art (new kits beside `EP.esmerBuilding`, chosen per island in `zislands.js`) | L |
| 2 | **Otringal's ground at its own target value:** find what darkens the paving and rock (measured #605b60 against the target #d3ced9 to #ece8de and LBA2's #d0cdc5) and bring it up; a pale stone pier | Otringal +5 in each of 4 districts | world-art | S–M |
| 3 | **Landmark pieces:** Knartas's moored zeppelin; Otringal's moored ship at the harbour pier; Celebration's figure massive, rough and grey with its gold halo; the Lift Dock's red frame, hazard edges, H pads and second hull | Knartas harbour +6, Celebration +6, Lift Dock +6, Otringal harbour +2 | world-art | M |
| 4 | **Otringal's round buildings:** the high town's palace cluster as round drums with stacked aqua and gold domes; two straw-domed round huts on the plaza | High town +7, plaza +4 | world-art | M |
| 5 | **The volcano islands' identity:** cooled lava, dark rock with dull red ember veins (Celebration, Under Celebration); Under Celebration's crystal clusters; the Platform's rock grey-blue | Celebration +4, Under Celebration +6, Platform +4 each | world-art | M |
| 6 | **The terminal island (new city):** a rock skirt and stepped rim; two or three round drum houses; s86's glass vaults and portholes in the terminal hall; more gold planting | Compatibility from about 65 to about 80 (normalised) | world-art (the island), buildings-interiors (the hall) | M |
| 7 | **OTRINGAL-37:** the rock scatter kept off paved ground | Otringal +1 to +2 in each district | world-art | S |
| 8 | **DOORS-LBA2's isle doors:** the bar's door on the house's west face; Celebration's temple door on the west flank of LBA2's temple building (the lantern store moves) | Otringal harbour +1, Celebration +2 | buildings-interiors | S |
