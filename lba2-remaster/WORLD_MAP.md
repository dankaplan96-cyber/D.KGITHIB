# WORLD MAP — LBA3: The Awakening

Connected regions with local freedom; the story opens routes. Status: ✅ built · 🔧 needs work · ⬜ to build.

## Citadel Island (home region) ✅
Exterior map with the LBA camera; interiors use the iso camera.

**Layout after the original LBA2 map** (`src/game/citadel-layout.js`: coarse outlines of the coast and the four
terrace levels, traced from the original at ~1.5 m; our own terrain, cliffs and textures on top). The original
map sits at (−76, +16) in our frame, so its town falls on ours. 12 years after LBA2 the island has changed; what
the original doesn't have is ours:

| Area (our metres) | In the original | Now |
|---|---|---|
| Town (−56…−29, −17…14) and the west shore by it | the low town; a promenade above the shore with lanterns and railings | the square and well; the street west climbs onto the promenade (the harbour stood here at first) |
| Northern plateau (x −120…0, z −100…−45, ~14 m) | high ground with trees, two doors | the depot (−85…−65, −78…−62) and the orchard (−80, −55); the project station in Funfrock's old fort (−28, −65) at the east end; Bersimon the Weather Wizard's tent (−100, −71, the original's S21; interior wtent: a stone room with the cauldron), open in every chapter |
| Outside the old fort's east wall (−11.2, −65) | — (LBA2 has no door here) | FunFrock's asylum from LBA1 (interior asylum, LBA1 room 0 rebuilt from its layout): a squat stone block-house, "Citadel Asylum / Closed by order of the Council"; inside the grey brick halls, the stair, the office with the old register. Vesk's project keeps a store there: Quetch guards, a fat trooper and two guard dogs where FunFrock's nurses and clone stood (after the prologue). Open in every chapter |
| The plateau's southern rim (−56, −44) | the escarpment up from the town | the Whispering Cliffs: a rock stack (16.8 m) reached only by the stepping stones from (−68, −22) |
| West shore below the plateau | quay wall, bollards | the water main comes down here to the meter (−72, −17) |
| South fields (x −76…−22, z 15…80) | more of the town, gardens, Twinsen's house (door −45.6, 80) | Twinsen's house at its original place; the village houses by the original's doors (S3, S9, S14, S15, S17); the plaza with lamps, benches and tulips; fields and farmers (chapter 8) |
| South-west headland (−107.5, 90.5) | the lighthouse "at the end of the island" | the lighthouse and the sage's cottage |
| West wing (−121…−76, 21…54) | the original's pier and baggage-claim building | the baggage-claim building and its wing (S7/S8); the harbour at the pier's west end (quay −120…−107, z 34…54; pier west to −136.5 at z 43): Doran's boat, the project ferry and the lift; a path from the fields past the baggage claim |
| The south-west islet, the bay beach, the southern hill | houses, sand | landscape (not used by the story yet) |
| Dome islet (−176…−136, −34…16), the north-east islet | across the water | seen from the shore |


| Place | Identity / landmark | Local problem / life | Story role | Changes after events |
|---|---|---|---|---|
| Twinsen's house (south of the village, where the original's stands; Bug Street leads there) | after the original's plan: family room (kitchen, table, Arthur's corner, the cupboard), Arthur's room (the old nursery, blue star wallpaper), reading room, hall with the stairs down; the cellar (training room: target, dummy, radio) | family | start; hub between chapters | Arthur's radio (ch1); dinner (epilogue) |
| Twinsen's garden | the Dino-Fly napping north of the house | — | talk to him (he is too old to fly over the sea) | — |
| Town square | the well with a red roof, blue-globe lamps | the dry well, the water-bill row | prologue goal | well steams (ch1); runs cool (epilogue) |
| Water office (interior) | pipe map on the wall | Mira's bureaucracy | valve map (ch1) | finale: Mira opens the valves |
| Pippa's stall | yellow awning | trade | shop | stock changes with events (clovers before the evacuation) |
| Harbour (west end of the original's pier) | pier, Doran's boat, project ferry | Xil's stuck cargo | permit, ferry to Zeelich | ferry docks (ch1); leaves (ch2) |
| Lighthouse (+ top room) | tall tower on the south-west headland, "at the end of the island" as in the original | — | Zoé's broadcast (ch2); finale signal | lit beacon after the broadcast |
| Whispering Cliffs | stepping stones, old target | — | cliff valve (ch1) | stones stay raised |
| Orchard | barred valve | — | orchard valve (ch1) | — |
| Old camp / project depot | FunFrock's crates, drones | security drones | depot valve (ch1) | — |
| Old fortress = project station | crenellated walls, gate, tanks, pipes, beam pad | the station hum | tour, Zoé's infiltration, Vesk leaves | gate opens (ch1); beam pad dead after Vesk leaves |
| The lane north of the house (−42, 65) | the old hand pump on its plinth, the project's new copper pipe beside it | Bram keeps it; Mira's figures say it's pointless | The Old Pump (side story, from ch. 2) | runs again; the lane's water in the evacuation |
| The garden west of the house (−60, 83) | Zoé's raised beds, a pond, Arthur's boat box | Arthur tries his boats there | Twinsen's pliers are in the box | — |
| Harbour quay: customs, cargo, Nell's repairs (−110…−103, 31…40) | a customs booth with a barrier; Esmer crates and Mosquibee honey beside Twinsun barrels; a lean-to repair shop with an Esmer engine | Odile's forms; Nell's spare parts take three weeks | The Mislabelled Shipment (from ch. 2) | crate cleared, the engine runs |
| Well cave (interior) | warm water, crystals | crystal mites | prologue climax | crystal wall broken |
| The house cellar: a gap in the old foundations, the boarded coal chute (WPN-1, src/game/story/arsenal.js) | a dark gap between loose FunFrock-era stones in the west wall; boards nailed over the old coal chute in the north wall | — | the lantern shows an old tin (6 darts, 8 kashes; ch. 2–3, and whenever the town's doors are open); only the Wannie glove breaks the boards (a clover, 12 kashes) | tin taken, boards gone |
| Pippa's stall and Arthur's conch (WPN-1) | her stall sells the blowgun, darts, meca-penguins and a lantern from ch. 2; the conch on the table by Arthur's radio | Arthur lends it (or his note does) | gear for the side paths | — |

Connections: house ⇄ street ⇄ square ⇄ harbour ⇄ lighthouse path ⇄ cliffs; square ⇄ orchard ⇄ depot ⇄ station.
Access: well (lid key + rope); station gate (water restored); ferry (ch1 end, via Doran).
Street furniture after the original (`PROPS` in citadel-layout.js): the four lamps at the square's corners,
the plaza's lamps and benches, lanterns along the promenade, bollard runs, railings, picket fences and tulip rows;
each piece is fitted to our ground and left out where something of ours stands (island.js buildOriginalProps).
Town changes: project heat posts by every door light up once the water is back (ch1); bunting over the
square in the epilogue. Discoveries: singing crystals behind the lighthouse, in the orchard, at the end of
the pier, in the east meadow and on the northern hills (+1 on top of Zeelich's old mill).

## Zeelich terminal island (above the clouds) ✅ (street life twelve years on: 0.27.0)
Pink sky, cloud sea, floating isles.

| Place | Identity / landmark | Life | Story role | Changes |
|---|---|---|---|---|
| Ferry dock | the light-ferry | project guard | arrival; setback: plan confiscated | — |
| Esmer street | domes and arches, stalls; behind the north houses the dog-training yard (palisade, track, block tower, tunnel, hurdles) | Nara's cloud flowers, Oku; street folk after LBA2's Zeelich: Mosquibees (Bzizz, Madam Zuzzara), moles (Old Grumm, Mother Snuff) and triangle-headed townsfolk (Mr Pelleck, Tavo); the project's guard dogs in training (two running the course, one in the yard; they bark at Twinsen) | directions, opinions about the project | lines change once they see the plan |
| The old watch house = Snuff's bakery (north side of the street's east end, x 8.6…13.4, z −13.8…−9.2 local; twelve years on, docs/TWELVE_YEARS.md set 4) | a squat tower of dark ashlar older than the council, its crest chiselled off; the guards' window a bread hatch (counter, striped awning, SNUFF'S BREAD, a slate); the guards' stair up the west wall to the flat roof (parapet, merlons); the oven's flue stack; a copper feed from the depot under the street (fresh cobbles) to a heat box with a lamp | Mother Snuff bakes on the project's heat; Bzizz lands his nectar crates on the roof; Tavo carries rolls to the depot | The Second Bake (optional, from ch. 3): Bzizz's crate on the flue trips the heat box; shove it off on the roof, or knock it off with the ball from the street (it breaks) | the hatch glows, loaves on the counter, FRESH BREAD, the flue breathes, Tavo at the counter; Snuff pays 5 kashes; a roll restores life |
| Heat posts, the burrow hatch, Pelleck's scaffold, Nara's crates (twelve years on) | posts lit at the bakery, the council house and the depot gate; dark with CONNECTION NEXT QUARTER at Pelleck's house, the south-west house and the moles' burrow hatch (stone collar, plank lid, a warm vent); Pelleck's dome half re-tiled (new blue tiles, bare mortar, the old violet; scaffold, ladder, tile stacks); Nara's flower crates for Citadel by the shuttle pad | Old Grumm by his burrow, Mr Pelleck under his scaffold; the street argues about the project's heat | who gains (bakery, council house, depot) and who waits (the west end, the burrows) | Nara's crates HELD in ch. 3 (shuttles grounded), gone from ch. 4; lines change with the shield, the council and the network |
| Baldino's workshop (interior) | bent antenna, globe, bench; years of work (docs/TWELVE_YEARS.md): the relay table with his test pair, the old hoist by the flying machine, the stove fan with three odd blades, the tea experiment (lid in the vault), the thunder box on the curio shelf, Ilo's perch, a shuttle-yard crate | explosions; Baldino's lines about the hoist, the radio's repairs and Ilo of the shuttle yard (an Esmer engineer, mentioned, not seen) | the shell explained; override key built; The Test Pair (optional, from ch. 3): relays talk by sight (crank the hoist), couplers overheat (open the drip) | the pair keeps talking (beam, SYNC lamps); ch. 10 recalls its rules; finale: Baldino at the radio |
| Three windmills + the old mill | sails, brakes | Oku's memories | brake with the ball; climb for the cog | released in the finale |
| Project depot | locker, drones | — | code cylinder + the confiscated plan | — |
| Drill platform | shield, gate console, lift | Vesk | shield down, Vesk descends | shaft open |
| Nara's case (beside Nara's place on the street; WPN-1) | a glass-topped trade case on brass legs, a jar for the honest | Nara, or a note: BACK SOON. PAY IN THE JAR | the Esmer laser pistol and crystal cells (ch. 3), darts, penguins, the Blowtron (ch. 6) | — |

Access: from Citadel by the ferry (ch2 start). Platform gate: override key + three mills braked.

## Citadel Spaceport (Citadel Island, east of the town) ✅ (src/game/spaceport.js)
Twelve years after LBA2 the Esmers' shuttles are ordinary traffic, so Citadel has a port for them: a landing
platform on stilts over the bay east of the town (deck x −14…14, z 26…54, level with the shore at 2.35 m), a
footbridge from the east shore at z 40, a terminal (Twinsun stone, an Esmer dome), a control tower with a beacon,
the departures board (read it), benches, lamps, railings all round (no walking off into the bay), and an Esmer
shuttle on the pad. From chapter 4 on its spaceship flies to **Zeelich Spaceport only** (Zeelich is another planet;
its islands are reached from there by Esmer shuttle); before that a note on the hatch says the flights are grounded
by the Joint Project (its ferry at the harbour is the only crossing — the story's ferry stays as it was). The
departures board names only ZEELICH SPACEPORT.

## Travel: two planets (CONNECT, src/game/travel.js) ✅
Every travel point is a place with a board naming where it goes; E there opens the menu of what is open now.

| Planet | Point (where) | Goes to | Open from |
|---|---|---|---|
| Twinsun | Citadel harbour ferry stop (quay at the pier's foot, −115, 43) | Desert Island's pier | ch. 4 (not in ch. 5: the project took the ferry) |
| Twinsun | Desert Island ferry stop (the pier's foot) | Citadel's harbour | ch. 4 (not in ch. 5) |
| Twinsun | Citadel glider field (*ours*: the plateau west of Bersimon's tent, −107, −64; glider, windsock, stone ring) | Desert Island, the Hamalayi | ch. 8 |
| Twinsun | Desert Island glider field (*ours*: the beach south of the pier) | the Hamalayi (ch. 6), Citadel (ch. 8) | ch. 6 |
| Twinsun | the Hamalayi foothills (the glider's landing) | Desert Island (ch. 6), Citadel (ch. 8) | ch. 6 |
| between | Citadel Spaceport ⇄ **Zeelich Spaceport** (*ours*: a deck off the terminal island's south shore, a footbridge, the larger craft) | each other only | ch. 4 |
| Zeelich | the shuttle pad by Zeelich's dock, and every island's pad | the spaceport island and all 11 islands | ch. 4 |

No Twinsun stop on Zeelich, no Zeelich island on Twinsun. After the main story everything is open. The story's own
crossings (the project's ferry in chapters 1–3, Hesk's flights in chapter 10) are unchanged. The Holomap shows the
planet he is on: the region's own map with his dot and the travel points, and an inset of the planet with its places
and the open links (ferry, glider, shuttle; the spaceship leaving the planet).

## Zeelich's other islands (no story; from chapter 4) ✅ (src/game/zislands.js; ZL-ALL)
Seven islands after the original's Zeelich islands: **Otringal**, **Knartas Island**, **Mosquibee Island**,
**Celebration Island**, **Under Celebration**, **the CX Islet**, **the Platform**; and **the Lift Dock** (the
original's ASCENCE, added in ZL-ALL). The current Zeelich (the terminal island of the story) stays as it is; these
are extra regions, each reached by Esmer shuttle from the pad by Zeelich's dock or another island's pad.

| Place | From | Identity / landmark | Reason to visit |
|---|---|---|---|
| The Lift Dock | LBA2 (ASCENCE, numbers) + ours (landing deck, stairs, rails, the tower's working cage) | decks on stilts at the cloud line, the lift tower, the crane over the east deck, a barge alongside | the view down the stilts into the clouds; crates by the stairs hide a find |
| Celebration Island | LBA2 (CELEBRAT's ground + CELEBRA2's risen figure, numbers) + ours (the figure's look, the festival) | the great figure, its pit filled and paved; masts with pennants and garlands up to it | the festival at the figure's feet; a find by the stage |
| **Tralu Rock** | *new invention (ours)* | an Esmer trading post on a tall rock: the weigh-beam market on the crown, a crane over the quay shelf, skiffs tied up, a ramp curving round the south face | the market; kashes in the traders' crates |
| **The Nectar Orchard** | *new invention (ours)* | a round hill of blossom trees in contour rows, hives, the press house, the cloud-catcher on the crown | the orchard and the nets; a heart at the press |
| **The Old Watch** | *new invention (ours)* | a crescent ridge: the broken watchtower and its fallen dome on the north horn, toppled columns, a telescope on the south horn | the view out over the clouds; magic by the telescope |

Identified and not used: CITABAU (Citadel again: same ground, more objects), EMERAUDE and MOON (the Emerald Moon
twice; not wanted). Tool: tools/lba2-islands.py (reads the user's own files; writes numbers only).
- Ground: the original's height grids, every second point (≈ 1.71 m apart), as numbers
  (`assets/lba2/islands/*.json`); the original's level 0 is the sea of clouds. Painted with Zeelich's palette.
- Objects: each of the original's objects becomes one of our pieces of its size at its place (Esmer house with a
  dome, tower, deck, wall, fence, spire, lamp, tree, rock, crate, jar, bush, plant). No original graphics.
- Edges: a low shore runs into the clouds and stops at the waterline; a high edge is closed at the brink (no
  sliding to the waterline and being held there). Small things on steep slopes have no block (no slide traps).
- The shuttle lands on the clearest flat spot of the island's main walkable area (the one with the most places).
- Walkable main areas (m², the rest are cliffs and separate ledges the original reached by its own means):
  Otringal and Under Celebration the largest; Mosquibee Island's is small (its town is on ledges between cliffs).
- Under Celebration (WPN-1): the old Wannie mine near the shuttle pad, a timber-framed adit in a rock face, dark inside
  (WANNIE WORKS. CLOSED. DARK. BRING A LAMP.); with the lantern lit, the Wannie glove on a crate (src/game/story/arsenal.js).

## Desert Island (chapters 4–5) ✅ first version (src/game/desert.js)
Dunes and red mesas, a short beach; the light-ferry ties up at a long pier. Real ground (a terrain patch).

| Place | Identity / landmark | Life | Story role | Changes |
|---|---|---|---|---|
| Kesh (village) | adobe houses with vigas and roof stairs, striped awnings, a market stall; reed sand screens on the windward (west) side with sand banked on them; Lumi's loom under a striped shade sail | Mother Tarra, Brosk (trader), Lumi (weaver, at her loom), Sani (kid) | distrust of the project; trust earned by the pump | the oasis fills once the pump runs; Lumi trusts Twinsen with her work after it |
| Kesh's cool room (−70, −6; twelve years on, docs/TWELVE_YEARS.md) | one of FunFrock's concrete blockhouses by the shore, half under a dune, its door dug out (spoil heaps, a shovel); Kesh's parapet, a striped curtain, a jar shelf under an awning; a wind-catcher on the roof (adobe tower, turning timber cowl, a crank), a stair up the east wall | the village's water jars (two before the pump, five after), Brosk's dates, Lumi's wool | The Wind-Catcher (optional, from ch. 4): turn the cowl into the wind (west) with Lumi's screen; without it sand pours in | the room draws (curtain lifts, streamer in), Sani plays in the doorway, a drink restores life, Brosk pays 5 kashes |
| Hesk's yacht stop and flag poles | a board by the yacht's berth (YACHT STOP · CAMP · DIG · KESH · FERRY: AT THE PIER); rag flags on poles along the routes to the camp and the dig, a drift across the dig route | Hesk; the rags stream downwind (east) | the routes stay findable after storms; the rags show the wind | "NO FERRY · ask Hesk" chalked on the board once the ferry is taken (ch. 5) |
| The School of Magic (the north-west mesa's south side) | the original's great stone face: red eyes, the door in its chin, two horned chimneys; inside (school): pentagram slabs, star windows, a blackboard dais, long tables | Rector Hougo; Ker'aooc the healing wizard (heals Twinsen) | open in every chapter | — |
| The oasis and the wind-pump | palms, a pond, a lattice tower with a sail wheel and a water tank | — | three seized gears (ball) | dry → full |
| Hesk's sand-yacht | striped sail, three wheels | Hesk | rides between Kesh, Ilka's camp and the dig | parked where it last went |
| Ilka's camp | ridge tent, telescope, sample crates under the north mesa | Professor Ilka | the crystals' discoverer | — |
| The research post | fenced concrete pad, teal cabins, a test-bore derrick | Dallan (foreman), a gate guard, two drones | the notebook (stealth in sandstorms) | the gate opens in storms |
| The dig: Temple-Park and the Temple of Bù (interior butemple) | three shored terraces down to the temple's slate gate and three stone seals; inside: dark slate halls, old mine rails and an ore cart, a great iron wheel, pale urns, pink-arch friezes, the great relief; a stair down to LBA1's Temple of Bù rebuilt from its layouts: the spiked maze (bumaze, LBA1 room 57) and past it the dark halls (buhalls, room 40) with crystal mites, whose far end leads back up | crystal mites; the Esmers' shuttles circle over Bald Mountain | the relief: Twinsun in section, the shell's five vents | the gate opens |
| FunFrock's condenser hall (interiors condA, condB) | a concrete arch half buried in a dune; inside a valve hall and a hangar with three condensers and a cargo glider | FunFrock's old drones | route the steam (valves 1, 3, 4), open the roof hatch, the glider north | plumes rise from the dunes once the vent is open |

## The Hamalayi (chapters 6–7) ✅ first version (src/game/hamalayi.js)
Snow terraces between rock cliffs, impassable peaks all round, falling snow, chimney smoke.

| Place | Identity / landmark | Life | Story role |
|---|---|---|---|
| The foothills | the glider's landing, a shepherd's hut, pines | Hesk | arrival |
| The meltwater gorge | ice floes; a dead tree on the far bank | — | the tree knocked across it is the bridge (ball) |
| Lhar | stone houses with slate roofs and snow, prayer flags, the frozen icefall | Yorna, Pim, Tashi, Dawa, Old Norbu | the village moves to the monastery |
| The lift | a rope-and-pulley platform up the cliff; the project's heating station | — | thaw the winch (Pim's fuse for his kite); two trips with ice mites |
| The monastery | stone hall with a golden roof, prayer wheels, courtyard walls | the villagers | refuge; the ridge path starts here |
| The observatory and the glacier basin | a drum with a verdigris dome on the peak; ice spikes, the vent's ice cap | the keeper | chapter 7 |

## Underground: the shell (chapter 3) ✅ (src/game/underground.js; captures/underground/)
Reached by the drill shaft lift from the Zeelich platform.

| Place | Identity | Gameplay | Story |
|---|---|---|---|
| Shaft and lift | the bore column, cable lights | descent | Vesk's trail |
| Deep installation | project machinery, cooling pipes, maintenance drones | ball switches; water-flow puzzle; stealth past drones | how the drill works (the finale uses it) |
| Crystal galleries | the crystals from the well, much larger | mites; light puzzles | the cracks |
| Sendell's chamber | quiet, blue | conversation | the plain truth |
| The core | bore head against the shell; three conversion pylons | bank-shot pylons from glowing throw plates; guardian boss; allies' tasks by radio | Vesk's turn, the shell holds |

## Epilogue
Back to Citadel: the well, the square with returning neighbours, the house. Free roam after the credits.

## Planned, not committed
- **Desert Island** (dry settlements, an excavation site that found the first crystals, a research post) and
  **the Hamalayi** (melting ice, isolated villages) as places where the disturbance shows on the surface.
  Build only if the main story is complete and each would carry a real chapter beat; otherwise leave out.
