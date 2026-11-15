# MAP-ORIG: our islands against LBA2 and LBA1, seen from the same cameras

The user (15.11, translated from Hebrew): "Research the original maps of LBA1 and LBA2 with this [lba2remake.net]; I
feel the game is still different."

This study fills the gap the earlier studies left. `resemblance-citadel.md`, `resemblance-desert.md` and
`WORLD_SIMILARITY.md` measured outlines, heights and landmarks from the original files, but they had **no picture of
the originals from a game-like camera**. Here the original islands are rendered from the original data by lba2remake.net
and shown with the same cameras as our game.

**Labels.**
- Our side is **Automated runtime only**: pictures taken by a script and looked at; nobody played.
- The reference side is lba2remake's rendering of the original data. The geometry, textures and palette are the
  original's. The lighting, fog and sea shader are lba2remake's own.
- **LBA2's own in-game camera is still unverified.** lba2remake's follow camera is its own choice (below).

## Method

### Driving lba2remake

- **Parameters.** The app reads `#`-parameters (bundle.js `getParams`): `game` (`lba2` or `lba1`), `scene` (a scene
  number), `editor`, `iso3d`, `isoCam3d`, `lang`, and a few more.
  - `https://lba2remake.net/#game=lba2&scene=49` starts on Citadel (Twinsen's quarter).
  - `scene=60` starts on Desert Island (the town square).
  - LBA1 uses `#game=lba1&scene=N`. Its scene names are in the bundle's scene tree, e.g. 1 "Outside the Citadel",
    2 "Lupin-Bourg", 3 its statue, 6 the harbour, 4 Twinsen's house area.
- **The whole island is loaded.** An island scene builds every section of its island (Citadel: `island_section_0`–`8`,
  40 units apart), so one boot serves every spot on it.
- **The disclaimer.** `localStorage.disclaimerShown = "yes"` skips it.
- **Units.** One unit is 1.37 m: a 32768-unit section is 40 units, and Twinsen is 2.07 m (`tools/lba2-islands.py` K).
  - Axes, island-centred (IC, metres, x east, z south, as `tools/worldscore/ref/*.json`): IC.x = r.z × 1.37, IC.z =
    −r.x × 1.37. This was checked on Citadel against the lighthouse and the dome islet.
  - Desert's 4 × 5 sections sit 40 units east and 20 units south of its grid's centre, so add (54.8, 27.4) m there.
  - Ours = IC + (−76, +16) on Citadel (`world.js` LAYOUT). On Desert, ours = R(275°)⁻¹ · IC + (−4, −40) + (3400, 0)
    (`desert.js` DESERT_FIT).
- **Sunny Citadel.** Before chapter 2 the app swaps Citadel's sunny file (CITABAU, the island after the storm) for the
  rainy one (CITADEL). `SUNNY=1` patches that test out in memory, because twelve years on the island is sunny.
- **The render hook.** `tools/map-orig/remake.mjs` patches the fetched bundle in the browser's memory. It hooks the
  WebGLRenderer's `render` so that a given camera (position, target, field of view) draws the app's own scene. It can
  hide the cloud layer and scale its fog (`fogK`) for the overviews.
- **What was not committed.** No original file or picture is committed or copied into `lba3/`. Everything rendered
  from the original lives in `/dev/shm/mapcmp/` only.

### Our side

- `tools/map-orig/ours.mjs` boots the game as the tests do: `tests/lib/boot.mjs`, a new game, chapter 1 after the
  prologue by flags. It stands Twinsen at the spot and sets `camRig.override` to the same camera.
- The overviews turn our fog off. Our fog runs from 45 to 190 m; lba2remake's fog barely shows at play distance.

### Matched shots

- `tools/map-orig/gen.py` writes both shot lists from one list of spots in IC metres. The original's ground height
  under each spot comes from `tools/worldscore/ref/<island>.json`, and ours from `physics.groundAt`.
- Play shots use our **Medium play camera** on both sides: an 8.75 m arm, 24° down, a 50° lens, the pivot 1.4 m over
  Twinsen, looking 1.2 m ahead.
- Overviews: straight down (north up, a 235 m tall frame for the island, 117 m for the town), and a high oblique from
  the south-east.

**Server and machine.**
- Our game was served from a `tar` snapshot of this worktree (`python3 -m http.server 8996`).
- Headless Chromium with SwiftShader, 960 × 540, on a shared, loaded machine (load average about 20 on 4 cores).
- Sheets are 800 px a picture side by side, or 640 px in threes.

### Rerun

```
python3 -I tools/map-orig/gen.py tools/worldscore/ref/citadel.json spots.json /dev/shm/mapcmp/x citadel
SUNNY=1 node tools/map-orig/remake.mjs lba2 49 /dev/shm/mapcmp/x-remake.json /dev/shm/mapcmp/ref
GAME_URL=http://localhost:8123/ node tools/map-orig/ours.mjs /dev/shm/mapcmp/x-ours.json /dev/shm/mapcmp/ours
python3 -I tools/map-orig/pair.py ref/a.jpg ours/a.jpg sheet.jpg "title"   # or row.py for three
```

## LBA2's camera against ours

| Camera | Arm (m) | Down angle | Lens | Looks at |
|---|---|---|---|---|
| Ours, Medium (the default) | 8.75 | 24° | 50° | 1.4 m over him, 1.2 m ahead |
| Ours, Far | 10.75 | 29° | 50° | the same |
| lba2remake's follow camera (`get3DCamera`: offset (0, 0.15, −0.2) × 20 units, target 0.08 × 20 up) | 6.9 to the target | 19° | 45° | 2.2 m over him |
| LBA2 itself | **unverified** | | | |

lba2remake's camera is closer and lower than ours. It is the remake's own choice, not a measurement of LBA2.

**No camera change is proposed.** The differences below show from any of these cameras: they are in the ground,
buildings and colours, not in the framing.

## Citadel Island (chapters 1–2)

### Pictures

All of these may be shown to the user.
- Reference pairs (LBA2 | ours, before the fixes): `/dev/shm/mapcmp/citadel-pairs/`.
  - c00 top, c00 top overlay, c01 oblique, c02 harbour, c03 square;
  - c04 and c04b Twinsen's house, c05b lighthouse path, c06 north plateau, c07 east shore;
  - c08 ferry quay, c09 harbour wing, c10 town from the south, c11 tent plateau, c12 west islet;
  - t00 town top and its overlay.
- Fixes (LBA2 | ours before | ours after): `/dev/shm/mapcmp/citadel-fixes/`.
- Decisions for the user (LBA2 | ours now | a candidate, not in the game): `/dev/shm/mapcmp/citadel-decide/`.
- Ours only, committed: `captures/map-orig/`.

### What makes ours feel different, ranked by what a player of LBA2 would notice

| # | Difference | Numbers | Decision or drift |
|---|---|---|---|
| 1 | **The town's ground.** LBA2's town is a grid of straight paved streets about 3 m wide, flush with brown earth, round rectangular blocks with lawns inside a band of earth and lattice fences. Ours read as green fields crossed by dirt paths, with grey rock patches | The town strip seen from above (IC x 0–50, z −44 to 44): grey stone 46 %, green 7 %, brown 34 % in LBA2; **19 % / 36 % / 38 %** in ours before, **29 % / 29 % / 35 %** after fix 3 | drift (fix 3, a first step) |
| 2 | **The harbour.** LBA2's harbour is a broad paved platform in front of the long hall, with straight quay walls about 2 m over the water, stone bollard posts with teal rails, and an L-shaped stone pier to the south-west. Ours had a grass and dirt yard, a rounded basin and a wooden pier | The basin and the wooden pier stand where LBA2 has paving: our land is 9–11 m wider east–west at IC z 23–33 (the pier) | drift (fix 2: the yard; the platform's shape is left, item 8) |
| 3 | **The sea's colour.** LBA2's sea is a bright, even turquoise; ours is a deep royal blue darkening with depth | Mean sea colour seen from above: LBA2 (74, 169, 210), ours (53, 98, 175) | **for the user** (pictures below) |
| 4 | **Roof shapes.** LBA2's houses are low: hips of boards, flat pale roofs, one barrel (the long hall). Ours had steep gables, and since CITADEL-85 Nell's had a barrel too | Twinsen's ridge 6.2 m in ours, 5.2 m in LBA2. Mr Bazoo's 6.2 m, LBA2's 3.6 m. Nell's in LBA2: a plank hip | drift (fix 1: Nell's) / **Twinsen's: for the user** |
| 5 | **The lighthouse.** LBA2's is squat: a 7.3 m shaft, a 3.3 m stage and a big 4 m head, 14.6 m to the finial, in dark grey-brown stone. Ours was a slim 19 m white tower | from the island's object list (bodies 73–79) | drift (fix 4: the height). The colour is left (item 9) |
| 6 | **The north plateau.** LBA2's is a grove of tiered round trees round the stone circle (scene 47, "Flower's Circle"); ours carries the fortress compound | — | **twelve years** (the story's station in FunFrock's fort) |
| 7 | **The east shore.** LBA2 has open sea there; ours has the spaceport deck and footbridge | — | **twelve years** (SPACEPORT-2) |
| 8 | **Bersimon's plateau.** LBA2's tent stands on a level grassy top at 14.5 m. Ours is broken cliff rock round a depot | — | partly twelve years (the depot) |
| 9 | **The square.** LBA2 has a rectangular lawn with the statue on a plinth, four blue globe lamps, paved bands and brown earth. Ours has a round cobbled plaza with the well and stalls | statue 6.2 m north (for the well) | **decision** (the well, the blue lamps) |
| 10 | **Vegetation.** LBA2 has few trees in town, all in lawns, layered round crowns, palms on the south. Ours has more trees and bushes, and grass tufts everywhere | — | partly drift (fix 3 takes the trees off the new paving) |

**The outline did not drift** (the coordinator's question about c00).
- Coast IoU of the main island: 0.914, measured from the two straight-down pictures at 0.47 m a pixel. It agrees with
  worldscore's 0.908 (`WORLD_SIMILARITY.md`).
- Width profile, east–west at each IC z: LBA2 against ours, in metres.

| IC z | LBA2 | Ours |
|---|---|---|
| −51 | 54.9 | 55.8 |
| −33 | 53.1 | 54.9 |
| −14 | 51.2 | 54.5 |
| 5 | 82.8 | 85.2 |
| 23 | 95.4 | 106.1 |
| 33 | 73.5 | 82.4 |
| 51 | 58.2 | 58.6 |
| 88 | 47.9 | 60.5 |

- The town strip is 1–3 m wider: the known 1.7 m shore ring.
- The extra 9–11 m at z 23–33 is our wooden pier and quay. The 12 m at z 88 is the sand bay below the lighthouse.
- The "wider middle" look comes from the green ground, the wooden pier and the spaceport deck, which give LBA2's long
  straight sea walls a softer edge.

**Same as LBA2, from the play camera.** These match closely:
- the lighthouse path (`c05b`): the rock, the path along it, the tower on top;
- the harbour wing's buildings, their places and doors (`c09`);
- the square's statue and four blue lamps;
- Bug Street's pair;
- the terrace heights;
- the scale of Twinsen against the houses: the same 2.07 m in both, and our house heights are within about 1 m of
  LBA2's except Mr Bazoo's and Twinsen's.

### What was fixed (commit `858c1730` and the next)

**1. Nell's house roof (`town.js` wing2).**
- The barrel became a plank hip at pitch 0.55, its edges in dark wood: LBA2's own roof for that house. CITADEL-85 had
  given it the long hall's barrel.
- Pictures: `captures/map-orig/1-nell-roof.jpg` (play camera); `citadel-fixes/c09_harbour_wing.jpg`,
  `f1_wing2_se.jpg`.

**2. The harbour wing's yard paved.**
- `world.js` HARBOUR_YARD: x −104.5 to −75.5, z 30.4 to 40.5, ground over 1.2 m.
- The yard in front of the long hall and Nell's is now paved, as LBA2's harbour platform. The grass, flowers and trees
  on it are taken out, after the scatter, so no random draw moves.
- Pictures: `2-harbour-yard.jpg`; `citadel-fixes/c08_ferry_quay.jpg`, `f2_yard_west.jpg`.

**3. LBA2's town streets, a first step (`world.js` GRID_STREETS, TOWN_BLOCK).**
- Five straight paved streets 3 m wide, traced from LBA2's town seen from above:
  - the west street, x −58.9;
  - its foot to the square's ring;
  - the cross street past Chez Luc, z 31.3;
  - the street along the fields' path, x −45.6: on our path's line, 3 m east of LBA2's;
  - the south cross street, z 53.1.
- The sea wall's promenade is paved (x −73.5).
- One block, between those streets, has LBA2's 2 m band of brown earth round its lawn.
- No bare rock patches among the town's streets: x −75 to −22, z 1 to 56.
- **Only the ground's texture changes.** No height, collider, door, route or story spot moves. Trees, bushes, grass
  and flowers on the new paving are taken out after the scatter. The square and its streets (`town.js` STREETS) are
  untouched.
- Pictures: `3-street-west.jpg`, `3-street-block.jpg`, `3-town-south.jpg`, `3-town-top.jpg`;
  `citadel-fixes/f3_*.jpg`, `c10_town_from_south.jpg`, `t00_town_top.jpg`.

**4. The lighthouse's proportions (`lighthouse.js`).**
- The gallery is at 10.8 m (was 15.25): a shaft to 8 m, the upper stage to 10.3 m, a taller lantern (1.8 m of glass),
  14.6 m to the finial, as LBA2's.
- Its collider is 15 m tall (was 20).
- The door, the annex, the steps, the beam and the lamp (`lampY` is returned as before) and the lamp room (`lighttop`,
  an interior) are unchanged.
- Pictures: `4-lighthouse.jpg`; `citadel-fixes/f4_*.jpg`, `c05b_lighthouse.jpg`.

**Draw calls (renderer info for one frame, all passes; ours, before → after).** Nothing new is drawn; the paving is
the terrain's own splat.

| Shot | Before | After |
|---|---|---|
| harbour wing | 282 | 263 |
| yard | 329 | 308 |
| west street | 518 | 493 |
| cross street | 416 | 390 |
| the block from above | 528 | 495 |
| lighthouse | 405 | 386 |
| town top | 619 | 609 |

The fewer calls come from the trees and grass taken off the paving.

### Re-score of the districts these fixes touch

These are provisional editorial scores, not reviewed by the user, using the rubric of `resemblance-citadel.md`. For the
first time the reference is the original's own textures from a play-like camera, so architecture and palette
confidence is **M–H**. Before that it was flat-colour renders.

| District | Before | After | What moved |
|---|---|---|---|
| Harbour and harbour wing | 76 | **80** | architecture 15 → 17 (Nell's plank hip; the long hall's barrel was already right); palette 9 → 11 (the yard paved). Left: LBA2's paved platform and L pier, where we have a basin and a wooden pier; the bollard posts with teal rails |
| Lower town south (the streets) | 78 | **80** | palette 10 → 12 (straight paved streets, earth round one block). Left: the other blocks still grass; lattice fences |
| Lighthouse headland | 84 | **82** | architecture 17 → 18 (LBA2's proportions), but palette 12 → 9: the remake shows LBA2's tower dark grey-brown under a dark cap, and ours is white. **New evidence lowers the score; the curator's white came from flat colours** |
| Town square, Twinsen's quarter, NW plateau | 78, 83, 73 | unchanged | — |

**No Citadel district reaches 85 yet.** What would take each one there:
- the harbour: the platform and the L pier;
- the town: the full grid and earth in the blocks;
- the lighthouse: its colour, once a real LBA2 screenshot confirms it;
- Twinsen's quarter: the roof (the user's call).

### For the user's decision (pictures prepared, nothing changed)

**The sea's colour.** `citadel-decide/sea_*.jpg`.
- A first candidate (deep #2a9ad0, shallow #58d4dc, set at run time) moves the mean only to (70, 125, 204), against
  LBA2's (74, 169, 210). Our sea shader's sky reflection and fog keep it blue.
- A real match means a lighter sea texture and less reflection on Twinsun: a world-art job across all Twinsun islands.

**Twinsen's house roof.** `citadel-decide/twinsen_roof*.jpg` and `captures/map-orig/5-candidate-twinsen-roof.jpg`.
- LBA2's is a low hip of boards over dark rubble; ours is a steep thatch gable.
- The candidate (a plank hip at pitch 0.45) was built in the served copy only, never in the repository.

### Left, ranked, with a proposed owner

| # | Item | Owner |
|---|---|---|
| 1 | The rest of the street grid: the north cross streets round the square's block, the east street (it runs where Pippa's shop and Fosse's office now stand: the user's call), earth bands in the other blocks, lattice fences round the lawns (props: count the draw calls) | world-art |
| 2 | The harbour as LBA2's platform: fill the rounded basin, straight quay walls with stone bollards and teal rails, the L-shaped stone pier. This touches the ferry, the customs booth and the Zeelich trade dressing | world-art with buildings-interiors, and the story for the ferry's berth |
| 3 | Less grass in the town south of the square: LBA2 has 7 % green in its town, ours 29 % now | world-art |
| 4 | The sea (above) | the user, then world-art |
| 5 | Twinsen's house roof (above) | the user |
| 6 | Mr Bazoo's (museum) 6.2 m against LBA2's 3.6 m: a low roof, and the annexes (WORLD-80 fix 9) | world-art |
| 7 | The lighthouse's colour. lba2remake draws LBA2's tower dark grey-brown with a dark cap, where CITADEL-85 made ours white from the curator's flat-colour renders. Check against a real LBA2 screenshot before changing | the curator |
| 8 | Bersimon's plateau: a level grassy top at 14.5 m round the tent (the depot's yard stays) | world-art |
| 9 | Our fog starts at 45 m; lba2remake shows the whole island from the play camera. Lighter haze on Twinsun's clear days | world-art (weather) |

## Desert Island, the Hamalayi, Zeelich (later chapters: not for the user)

These are pictures for the team. They are spoilers for chapter 4 and later: **do not show them to the user.**

Pairs (LBA2 | ours, the same camera):
- Desert Island: `/dev/shm/mapcmp/desert-pairs/` (d00 top, d01 oblique, d03 Kesh from above; the play-camera shot d02 landed inside rock and the pump and was dropped). The
  single pictures are in `desert/ref/` and `desert/ours/`.
- LBA1, in its own isometric camera:
  - Citadel, `lba1-sheets/lba1-citadel.jpg`: scenes 1 outside the citadel, 2 Lupin-Bourg, 3 the statue, 6 the
    harbour. These are chapters 1–2 places and may be shown.
  - The Hamalayi, `lba1-sheets/lba1-hamalayi.jpg`: 9 the landing place, 15 the rabbibunny village. Not for the user.
  - The single pictures are in `lba1/`.
- Zeelich, Otringal from above and oblique: `zeelich/ref/`. Our side was not taken.

### Desert Island, ranked

| # | Difference | Numbers | Decision or drift |
|---|---|---|---|
| 1 | **Kesh.** LBA2's Kesh is a compact grey stone town in a cliff-walled hollow: paved grey streets and a plaza with a fountain, flat-roofed grey stone houses, one under a gold ribbed dome, a paved strip along a stone quay. Ours is ochre adobe houses on open sand round a wind-pump and an oasis pool, among palms | The earlier "peach boxes" (`resemblance-desert.md`) came from flat palette colours; the textures are grey stone | drift in materials and ground; the oasis and the pump are twelve years |
| 2 | **The tracks.** LBA2 has winding pale tracks over the dunes in the east and the walled race track in the south-west. Ours has straight brown dirt tracks and the dig's rings in the south-west | — | partly twelve years (the dig) |
| 3 | **The sea.** As on Citadel | — | the user |
| 4 | **The relief.** Same in kind on both: dunes and grey outcrops | coast IoU 0.98, height MAE 0.40 m (`WORLD_SIMILARITY.md`) | matches |
| 5 | **The harbour.** On both, the L-shaped stone breakwater with two small striped lighthouses; ours adds a long wooden pier | — | twelve years |

**For world-art (chapter 4):** grey stone paving and flat grey stone walls for Kesh's core (the plaza and the street to
the quay), and the domed house. The pump and the oasis keep their places.

### The Hamalayi (LBA1)

LBA1's Hamalayi is snow-white terraces, ice cliffs and white snow-laden trees. Ours is our own region (the user,
26.10), so it was not compared further.

### LBA1's Citadel

LBA1's town (scenes 2, 3, 6) agrees with LBA2's: paved stone streets, brown earth, tiered teal trees, stone quays and
white picket fences. It supports Citadel item 1. LBA1's fortress front (scene 1) is a high grey brick wall with an FF
banner, a gate with F doors and two big vent pipes. It is close to our fort's grey stone in kind.

## Open questions for the user

1. **The sea.** Should Twinsun's sea be LBA2's bright turquoise, for every Twinsun island?
2. **Twinsen's roof.** Should Twinsen's house take LBA2's low plank hip, or keep the thatch?
3. **The town grid.** May the street grid continue past the square's block, where Pippa's shop and Fosse's office now
   stand on LBA2's east street, and should the lawns get their lattice fences?
4. **The harbour.** Should it become LBA2's paved platform with the L pier? That would fill our rounded basin, and the
   wooden pier and the ferry's berth would move.

## Tests (Automated runtime only)

Run one at a time, with one retry, on the served snapshot of this branch (port 8996), SwiftShader, on a loaded shared
machine.

| Suite | Result |
|---|---|
| chapter1 | PASS |
| place-scan | PASS |
| townlife | FAIL twice at the same spot, then **PASS** after a test fix. The harbour gulls' check read `x.p.x` for a bird that had taken off again on its own round, which has no perch yet. The removed yard trees changed the start direction and so the random sequence. The check now reads the bird's own place when it has no perch (`tests/townlife.mjs`) |
| door-sweep | try 1: the page crashed (memory: one of my picture runs was going at the same time); try 2 **PASS** |
| spaceport-2 | PASS |
| opening-tutorial | PASS |
| solidnpc | FAIL in both runs on the **known baseline**: the planter box at the spaceport bridge's foot has no collider. Try 2 also had a Sphero slide check (0.133 m past the centre) that passed in try 1: timing |
| occluders (houses' roofs; wing2's changed) | PASS |

**worldscore on this branch:** Citadel 82.3 (coast 90.8, height 80.0, landmarks 97.5, objects 48.9). It was 82.1 on
12.11. The paving is ground texture, which worldscore does not count. Its objects part also asks for LBA2's fences
(lattice and bollard runs: 5 → 0 in several town cells), the same as item 1 of "Left".

**Not run:** the other suites (`walkers`, `camsteady`, `world-consistency`, `chapter2`). The streets change nothing
physical, but the trees taken off the paving change which colliders exist in the town.

## Resume point

- Done:
  - the Citadel reference pass and its pairs;
  - fixes 1–4, committed and re-captured;
  - the decision candidates;
  - the Desert pairs;
  - the LBA1 Citadel and Hamalayi references;
  - the Zeelich (Otringal) reference;
  - the suites above.
- Next, if wanted:
  1. our Otringal from the same cameras (`gen.py` needs Otringal's placement in our frame: `zislands.js`);
  2. a second sea candidate that also lowers the sea shader's sky reflection;
  3. the "Left" items, by owner.
