# Door map (generated from the running game, cloud, 7.11.2026, build after v55; DOORS-LBA2 changes 8.11.2026)

DOORS-LBA2 (the laptop's decoded LBA2 links, `tools/testlab/WORLD_ART_REQUESTS.md` "## DOORS-LBA2", table (d)) moved
the sewer's ways in to where LBA2 has them. Rows changed or added by it are marked **(D2)**. Evidence for the changed
rows: Automated runtime (`tests/doors-lba2.mjs`, `tests/sewers.mjs`, `tests/sewers-ways.mjs`, SwiftShader); the
rows marked *Source only* were read from the code, not run.

## Outdoor doors (region, x, z → room)

| from | x | z | to room |
|---|---|---|---|
| citadel | -46.1 | 77.2 | house |
| citadel | -96.2 | -71 | wtent |
| desert | 3333.7 | -72.7 | school |
| citadel | -26.5 | -50 | asylum |
| citadel | -9.5 | -65 | asylum |
| citadel | -46.1 | 27.2 | tavern |
| citadel | -66.2 | 41.1 | bazoo |
| citadel | -88.8 | 30.6 | ticket |
| citadel | -58.2 | -8.8 | pharmacy |
| citadel | -99.1 | 31.6 | nellhouse |
| citadel | -56.5 | -13.4 | baggage |
| citadel | -80.7 | -82.3 | tralucave |
| citadel | -2.5 | 32 | terminal |
| citadel | -30.4 | 75.3 | nbrhouse (after the prologue; *Source only*) **(D2 addition)** |
| citadel | -65.5 | 11.0 | the Water Office (chapters 2, 8, 10, after the ending; *Source only*) **(D2 addition)** |
| citadel | lighthouse | | lighttop (chapters 3, 10; *Source only*) **(D2 addition)** |
| zeelich | 2400.3 | 37.1 | zterminal |
| isle_otringal | 1857.8 | 1804.7 | otrbar |
| isle_otringal | 1884.6 | 1793 | otrhotel |
| isle_celebration | 2892.2 | 1792.1 | celtemple |

Removed **(D2)**: `citadel -28.5 27.9 → sewer` (the pink house's door). The pink house stands 3 m further north
(centre z 21.6, door (−28.5, 24.9)); its door is shut with a line (`w_door_pink`: Fosse's Sewer Works office, he is
below). The terrace porch house `stoneup` is gone. Shut with a line: `stone` (−26.8, −20.2), `pink` (−28.5, 24.9);
`shop` (−33.5, −1.1) is Tibbo's counter (story/shops.js).

## Sewer hatches (Citadel; a lid to lift, then a lift ride, not a walk-in door) **(D2)**

| hatch | x | z | lands in the hall (hall-local x, z; world x = local + 5800) | gate |
|---|---|---|---|---|
| street (lower town, railed N/E/S, two bollards on the west) | -28.5 | 27.6 | `sewer` entries.street (10.6, -9.0), by the NE lift's deck (11.5, -10.5) | always (lift the lid) |
| terrace (behind the school, 9.8 m up) | -25.1 | -31.5 | `sewer` entries.terrace (-10.9, -10.75) on the raised walkway, by the NW lift's deck (-12.4, -10.75) | `sw_bolt` (the catch drawn below; before: "held from below") |

Gone **(D2)**: WA-14's grate in Bug Street (−45.4, 56.6) (the pump's knocking stays, townlife.js).

## Room exits (room → where)

| room | x | z | leads to |
|---|---|---|---|
| house | 1001.2 | 11.4 | outdoor |
| house | 996.6 | 8.9 | cellar |
| wtent | 5395 | -4.2 | wtent-out |
| wtent | 5396.2 | 2.2 | sewer (the trapdoor under the rug, once opened: `sw_trap`) **(D2 addition)** |
| school | 5610.1 | 12 | school-out |
| asylum | 6981.4 | 9.6 | asylum-out |
| asylum | 7004.1 | -17.3 | asylum-front |
| sewer | 5811.5 | -10.5 | sewer-out: the NE lift's deck → up onto the street hatch (−28.5, 27.6); `sw_works` (Fosse's padlock off) **(D2: was 5797.1, 0.3, the well-house)** |
| sewer | 5787.6 | -10.75 | sewer-stoneup: the NW lift's deck → up onto the terrace hatch (−25.1, −31.5); `sw_bolt` **(D2: was the terrace door, 5796, -11.9)** |
| sewer | 5785.25 | 0 | sewervault: the gate in the west wall (`sw_valve`) **(D2: was 5810.5, -12.7, the colonnade's middle arch)** |
| sewer | 5797.1 | 0.1 | sewerglobe: the well-house's little blue door (`sw_gdoor`) **(D2: was 5813, -11.9, the colonnade)** |
| sewer | 5786.15 | 10 | wtent: the stair in the west wall, south-west **(D2: was z 6)** |
| tavern | 6594.3 | 7.6 | tavern-out |
| tavern | 6604.5 | -3.3 | tavcellar |
| tavcellar | (the walkway's railing gap) | | sewer entries.fall: the island's platform, local (−0.2, −1.5), one way **(D2: was the east pier, (7.5, 7.4))** |
| bazoo | 6695.2 | 2.3 | bazoo-out |
| ticket | 6796.5 | 2.4 | ticket-out |
| pharmacy | 6896 | 2.6 | pharmacy-out |
| nellhouse | 7796 | 4.1 | nellhouse-out |
| baggage | 8195.6 | 9.9 | baggage-out |
| tralucave | 8387 | 7.2 | tralucave-out |
| terminal | 8592.5 | 3.6 | terminal-out |
| terminal | 8592.5 | -4.2 | terminal-gate |
| zterminal | 8791.5 | 3.6 | zterminal-out |
| zterminal | 8791.5 | -4.2 | zterminal-gate |
| otrbar | 8990.5 | 1.8 | otrbar-out |
| otrhotel | 9389.5 | 5.2 | otrhotel-out |
| celtemple | 9591.5 | 4.4 | celtemple-out |
| cellar | 1695.2 | 3.6 | house |
| sewervault | 5877.8 | 3 | sewer (arrives local (−12.4, 0), the west walkway) |
| sewerglobe | 5960 | 2.5 | sewer (arrives local (−2.9, 1.7), before the well-house) **(D2 addition)** |
| tavcellar | 7991.1 | 4.3 | tavern |

Removed **(D2)**: `sewer-pink` (the Works door to the pink house; an old `sewer-pink` resolves to the street hatch).

## DOORS-LBA2 corrections: done and kept

| # | correction | state | why kept, where kept |
|---|---|---|---|
| 1, 2, 5 | the street hatch, its NE shaft; the Bug Street grate gone; the pink house off the hatch | done | |
| 3, 4 | the terrace hatch for the porch house, its NW shaft | done | |
| 6 | the well-house is the globe room's door; its shaft keeps the heat pipe | done (not moved south: optional) | |
| 7 | the treasure room's gate in the west wall at z ≈ 0; the colonnade's arches blind | done | the winch moved to the island's west side so its chain reaches the gate |
| 8 | the tavern drop onto the central platform | done | |
| 9 | the tent passage at z ≈ 10 | done | |
| 10 | the wizard's tent to LBA2's spot (centre ≈ (−105.0, −67.4)) | kept | our glider field (travel.js `CIT.glider`: its stop (−107, −64), r 4, its ring r 5.2, the landing (−105.2, −64.6)) is there; at LBA2's spot the field's stop would stand inside the tent. Moving the field is a travel and story change (evacuation.js, observatory.js, index.js use it): the user's call |
| 11 | Tralu's cave door 9 m south, facing east | kept | no bank there: (−80.7, −73.0) is the depot's level yard (16.0 m all round, inside the project's fence; LBA2's door is 9.4 m up a bank face). The door stays in the plateau's north face with its stair (REVIEW-CITADEL-ART) |
| 12 | Twinsen's front door 2.7 m north | kept (optional) | the house's interior door would have to follow; not done |
| 13-15 | fort passage, school, museum's upper door, baggage back rooms, deeper caves, asylum, terminal | no change | as the report |
