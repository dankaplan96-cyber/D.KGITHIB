# Original mechanics: entering buildings and the interior cut-away

Wave 3, original-mechanics worker (cloud), 8.11.2026, branch from `ccr-c1c2c4b9-dep6ed` (v63).
Evidence: **Automated runtime only** (SwiftShader, headless Chromium, 960×540, fixed-step game time). Pictures were
looked at; nobody has played this. No frame-rate claims. Reference column: **Source only** — what the repository's own
notes say about LBA1/LBA2 (interiors.js, lba1room.js, main.js CONTAINERS); no original file was opened on the cloud.

## Reference → current → adaptation → test

| LBA mechanic (reference, Source only) | Before this wave | Now | Test |
|---|---|---|---|
| **Walk-in door.** LBA2: walk into the door's zone and the scene changes; outside again he stands in front of the door, facing the street. | Radius triggers (0.85–1.0 m) and a walk-on fade; Citadel exits step 1 m clear (`doorStep`); the isles 1.45 m from the sill. Several landings stood inside or on the rim of their own trigger. | **DOOR-CLEAR** (`main.js` `clearOfDoors`): every scene change lands 0.45 m beyond the rim of every door trigger of the scene (0.35 m from a room's exits going in), along the way he faces; where that is shut or the spot is inside something solid, the nearest open spot round it, facing away. Applies to doors, story exits, loads and respawns (it runs in `enterRoom`/`exitRoom`); a spot already clear is never moved. | `door-sweep` (every door, every region) |
| **Forgiving approach.** The original's zones are generous; nobody lines up to a pixel. | Not measured. | Every walk-in door takes him in walked straight at it and 0.3 m either side; doors with something standing across the way in were cleared (below). | `door-sweep` (walk by input, Up held) |
| **A shut door says why.** LBA2: "locked", a key, a story reason. | Isles, Kesh, Zeelich: done in wave 3 part 1. The Hamalayi's seven doors were drawn and did nothing (no prompt, no line). | The Hamalayi's doors lead in (below). No door in a swept region is silent or a generic "Locked." | `island-doors`, `zeelich-doors`, `door-sweep` |
| **Interior cut-away, LBA2.** Fixed iso camera at 45°, only the two far walls drawn, so the room and Twinsen read. | `RoomBuilder.shell` (interiors.js): far walls full height, near walls 0.45 m rims, no ceilings; every builder (ihomes, zhomes, the stands' rooms, the isles' rooms) uses it. | Kept as it is: the survey found nothing to fix (below). No runtime fade added: nothing needs one, and none would be LBA2's. | `room-cutaway` |
| **Roof cut, LBA1.** Grid zones (type 3) swap in a fragment without the ceiling while he is inside. | `lba1room.js` lids (the asylum, the temple maze): cut while he is under them or they stand on his sight line. A lid cut on one visit stayed cut into the next (7 % opacity on the first frame, easing back). | **CUT-RESTORE**: a new visit resets the lids and cuts the ones over his landing at once (`R.resetCut`, called by `enterRoom`). A lid's fade changes only its own cloned materials, never the room's shared pool material. Colliders never change with a lid. | `room-cutaway`, `lba1rooms` |
| **Outdoors nothing turns see-through** (LBA2's SearchCameraPos: the camera moves instead). | VP-10 (occlude.js, roomocc.js). The only fade: Nell's lean-to (Citadel) and the council porch (Zeelich), while he stands under them. The porch, left faded when he went in under it, stayed faded until he came back and eased in on the next shot. | VP-10 untouched (no camera.js change). The porch snaps to its state for his landing on every arrival (`R.resetCut` in zeelich.js); Nell's roof already did (`occSnap`). | `room-cutaway` |
| Search a container in Normal behaviour (LBA2 "givers", refilled per visit: DISKFUNC.CPP per the code's note). | `Game.giverHop`, loot kept until taken; coins, hearts, flasks come from containers and rewards. | Not changed, not re-examined this wave beyond reading `giverHop`/`giveBonus` (Source only). | `containers` (not rerun) |
| Magic ball, sword, behaviours, ladders, inventory. | Owned by the animation-combat worker this wave (ball throws, chapter 12). | Not touched. Behaviours: Normal, Athletic, Aggressive, Discreet (`actors.js`). | — |

## Door sweep: what was found and done (`tests/door-sweep.mjs`)

The sweep, by chapter (2–11 by their flags, ISO), with every outdoor region built: every door the story offers (the
first chapter it appears in), its room entered by the game's own path, the room's exits taken by the game's own path
(Game.checkDoors's branch), 2.5 s standing still after each landing, then the door walked into by input from 2.6 m out
(straight, ±0.3 m, ±0.5 m; round what stands across the way, by the harness's planner, if straight fails); the doors
between two rooms of a building; a save made on landing out of Zeelich's terminal, then Continue.

Coverage: 92 street doors (Citadel 17, Zeelich street 7, the isles' and Kesh's 63 houses plus Otringal's bar and hotel
and Celebration's temple, Desert Island's school, the Hamalayi's observatory and, now, its seven houses) and 11 doors
between rooms (house/cellar, tavern/cellar, the temple and its maze, the sewer's four). The deep installation's rooms
(chapter 11) are linked by story exits and were entered by `lazyregions`/`story-journeys`, not by the sweep.

| # | Where | Found (before) | Done (after) |
|---|---|---|---|
| 1 | Zeelich terminal, Otringal's bar and hotel | Out, he landed 0.05 m inside the door's own trigger. Standing still, he was back inside 1 s later. The game saves as he lands: **Continue put him back in the terminal 3 s after the load** (A/B in one build, `BEFORE=1`). | Lands 0.47 m clear; after the save and Continue he stays on the street. |
| 2 | 60 isle/Kesh/post houses; Citadel's baggage claim, the Tralu cave, Celebration's temple | Landed 0.15–0.30 m beyond the trigger's rim (inside the walk-on fade's reach, a step back took him in again). | 0.47 m. |
| 3 | Otringal high town, the big family's flat (`otringal-55--47`) | The landing 1.45 m out stood inside a round tower's collider; the physics pushed him back into the trigger and he re-entered. | The nearest open spot round it, facing away: 0.79 m clear, stays. |
| 4 | Every room's way in | He landed 0.15–0.25 m from the room's exit trigger. | 0.37 m (DOOR_CLEAR_IN 0.35). |
| 5 | The Platform, the Building Company's door | Its board stood 1.5 m before the door, the board's collider down to the ground: a straight walk at the door stopped at it. Moved, a lamp and a crate took the freed spot. | The board stands 4 m east of the door; the isles' dressing now keeps every house door's way in clear (2.2 m out, 0.7 m either side; the original's own objects are not moved); the foreman's yard spot beside the board. Straight and ±0.5 m: in. |
| 6 | Knartas, the fishing family's house (`knartas-19--20`) | A pennant fence (the original's objects) ran 2 m before the door with no gap; no way led round it. The island test reached the door only by being placed behind the fence (ISO). | The panel and pole across the door are left out (zislands.js knartas `shape`); straight and ±0.5 m: in. |
| 7 | The Hamalayi: the landing's hut, Lhar's five houses, the observatory keeper's house | Drawn doors with no prompt and no line: silent. | They lead into compact rooms (ihomes.js `ham-*`, the planner's pieces, whitewashed stone and dark timber): Bero's, Yorna's (where the village meets), Old Dorje's, Sana's loom, Lhamo's kitchen, the field keeper's hut, the observatory keeper's charts. Each has its own look line. |
| 8 | Zeelich, the council house door (chapter 9) | Straight from 2.6 m a resident (Oma) can stand in the way. | Listed: reached round her; ±0.3 m straight in. Not changed. |
| 9 | Citadel, the pink house's sewer door | One way until the works door is opened below (story/sewers.js). | Listed as one way, by design. |

### Open

- **Knartas' village, reachability.** The harness's planner did not find a way from the shuttle pad to the diggers'
  village (it stopped on Quill's ledge, by the cloud channel); the island tests put him in the village (ISO). Not
  verified either way; for world-polish: a walk from the pad to `knartas-33--14` by input.
- **Otringal's high town ground.** Grey rock spikes stand up through the paving between the houses (seen in the door
  pictures beside `otringal-55--47` and `otringal-63--52`); a door's approach from the side runs up one. For world-art.
- The deep installation's chain and the Hamalayi's monastery are entered by story exits; the sweep covers their links,
  not a walk to each.

## Cut-away survey (`tests/room-cutaway.mjs`)

From the room camera, at every 0.6 m of floor he can stand on, two rays (chest 0.95 m, head 1.5 m) to him against the
room's own meshes (draw-batched originals included, clear glass and sprites not). Hidden = both rays blocked.

- **All 110 interior rooms** (scratchpad survey, the same rule): hidden on 0 spots in 109 rooms. The prologue's well:
  2 of 651 spots, behind one of its two stone pillars (0.3 %). No wall, partition, gallery or near-side piece of
  furniture hides him anywhere: the ihomes planner keeps tall pieces to the far walls (`at: ['back', 'left']`), the
  near rims are 0.45 m, and the camera looks down at 33°.
- The test samples 32 rooms (Citadel 13, Zeelich 3, the stands' and isles' rooms 11, the asylum, the council chambers,
  the lighthouse top, the crystal gallery, the sewer); `ALL=1` runs all of them. Pictures at three spots per sampled
  room (where he comes in, the middle, the corner nearest the camera): he reads in every one.
- So nothing was changed in the rooms' geometry. The fix was the restore (CUT-RESTORE above), measured A/B against the
  build before it: lid 7 % on the first frame of the next visit → 100 %; porch materials faded on arrival 13 → 9 (the
  street's own see-through glass).

## Not done / for others

- Doors coordinated with buildings-interiors: the Hamalayi rooms use their ihomes planner and kinds; nothing new was
  modelled. A keeper for Lhar (the village moves to the monastery in chapter 6) was not added.
- Sounds: the door sound is the existing `door`; no new audio event IDs.
- Laptop: a GPU look at a few of the new Hamalayi rooms and at the moved Building Company board.
