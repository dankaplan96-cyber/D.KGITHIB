# Connections audit (WORLD-AUDIT, 2.11.2026)

The user (2.11, paraphrased): "every building that exists can be entered and means something; the connections work
as in the earlier games and are not cut off. The descent into the sewer should lead where it led in LBA2, and there
should be other ways into the sewer, from the wizard's and so on, so that the secret place has a meaning."

For the team: spoilers allowed, no original text quoted. The user plays chapters 1–2 only; report to them by chapter
number and kind of gap. Nothing here is built yet: the user picks proposals, the cloud relays them.

## Sources and evidence marks
- **(D)** the user's LBA2 files, read in `/dev/shm` only: `SCENE.HQR` (every scene's island, cube and change-cube zones,
  type 0, with the scene each leads to and whether the zone is on when the scene starts), `TEXT.HQR` (English bank of
  Citadel, read for meaning only). LBA1's `SCENE.HQR` the same way for Citadel (island 0). Numbers and descriptions only;
  the extraction scripts and dumps stayed in scratch.
- **(S)** the GPL engine source (`SOURCES/COMMON.H`): zone flags (`ZONE_INIT_ON`), the life opcodes that switch a door
  on later (`LM_SET_CHANGE_CUBE`) or change scene by script (`LM_CHANGE_CUBE`).
- **(T)** the team's earlier identifications (headers of `tavern.js`, `tavcellar.js`, `bazoo.js`, `ticket.js`,
  `pharmacy.js`, `nbrhouse.js`, `nellhouse.js`, `baggage.js`, `tralucave.js`, `sewers.js`, `wizards.js`;
  `docs/WORLD_SIMILARITY.md`).
- **(O)** our code at `17ef25a` and the walking probes of this audit (the harness `tests/lib/player.js`, A* and keys).
- **Web:** the walkthrough and wiki hosts did not resolve from this session (wiki.littlebigadventure.com,
  the-spoiler.com). One search-result snippet (an LBA2 walkthrough on the web) says a sewer engineer's father gives a
  key to a door in the middle of the sewers once his sewer map is cleaned; it is marked **(W, unverified)**.
- Coordinates are ours (the original's place + `world.js` LAYOUT, i.e. island-centred + (−76, +16)).

**How LBA2 links scenes (S, D).** A door is a change-cube zone. It is either on when the scene starts or switched on
later by a scene script. Some links are scripted only (no zone), e.g. the lighthouse. "Off at start" below means the
original's story opened it later.

## 1. LBA2 Citadel: every link, and ours

Citadel's outdoor scenes are 42–50 (D: cubes (6..9, 7..10)); 193–197 and 202 are later or earlier states of 0, 1, 49,
46, 43 and 26 (same links); 191 is a cut-scene set; 94 is a stub.

| # | From (ours) | Leads to | Opens (D) | What it was for in LBA2 (D text, T) | Ours (O) |
|---|---|---|---|---|---|
| 1 | Twinsen's house door (−45.6, 79.9) | S0 the house | on | home | ✅ `house`, open in every chapter set on Citadel (see B-1 for chapters 4–7, 9) |
| 2 | inside S0 | S1, the room under the house | on | Twinsen's cellar | ✅ `cellar` (WPN-1's coal chute and gap) |
| 3 | neighbours' door (−30.6, 75.3) | S9 | on | a neighbour's home | ✅ `nbrhouse`, from the end of chapter 1's prologue |
| 4 | square's south side (−46.1, 27.8) | S3 the tavern | on | the tavern; its regulars give leads | ✅ `tavern` (south house), every chapter |
| 5 | inside S3 | S4 the tavern cellar | on | a store; a regular warns there is a hole in it | ✅ `tavcellar`; its void is railed off |
| 6 | **inside S4** | **S17 the sewers, one way (a fall)** | on | the cellar's hole drops into the sewers | ❌ none |
| 7 | **lower town (−28.5, 27.5), ground level** | **S17 the sewers** | in: on; out: off at start | a street door straight into the sewers; the way back out opens later | ❌ the `pink` house: locked in every chapter |
| 8 | Bug Street north (−56.8, −13.4) | S5 | off at start | the baggage claim (T) | ✅ `baggage`, every chapter |
| 9 | inside S5 (two doors) | S6, then S16 | on | two large back rooms (S6: five ladders, 29 bonus zones; S16 only from S6). Identity not established from the numbers | ❌ not built (c) |
| 10 | Bug Street south (−58.5, −8.9) | S22 the pharmacy | off at start | the first errand: a cure for the injured Dino-Fly | ✅ `pharmacy`, every chapter |
| 11 | by the harbour path (−66.2, 41.1) | S14 | off at start | Mr Bazoo's shop (T); a scripted link from it back to S0 | ✅ `bazoo` (museum building), every chapter |
| 12 | west of the square (−65.3, 10.9) and an upper door (−68.5, 9.2; 5.2 m up) | S15 (two doors) | both off at start | the museum that holds Twinsen's tunic and medallion; its inner door is jammed and is freed from the upper floor | ⚠ the `water` house is the Water Office (chapter 1 on): one floor, one door; the upper door is not built |
| 13 | the terrace behind the stone house (−25.1, −31.5; 6.2 m up) | **S17 the sewers**, both ways | both off at start | the sewers' upper door to the terrace, opened by the story | ❌ the `stoneup` porch is built and locked forever |
| 14 | the stone house (−30.0, −21.5) | S37 | off at start | a small house | ❌ `stone`: locked forever |
| 15 | north plateau (−101.2, −67.4) | S21 Bersimon's tent | on | the Weather Wizard; he cannot end the storm while the lighthouse is shut | ✅ `wtent`, every chapter; Bersimon tops up magic |
| 16 | **inside S21** | **S17 the sewers, both ways** | on | the wizard's way down into the sewers; he put an enchanted globe in their secret room | ❌ none |
| 17 | inside S17 | S18 | on | the small treasure room (T) | ✅ `sewervault` (Arthur's map, a chest) |
| 18 | inside S17 | S34 | on | a second room of 13 objects. The secret room of the globe sits in the sewers' middle behind a locked door (D text; the key: W, unverified); S34 is the likelier of S18/S34 (low confidence) | ❌ not built |
| 19 | the plateau's bank (−80.7, −73.0; ours 9 m north, −82.0) | S2 Tralu's cave | on | the monster holds Raph the lighthouse keeper; freeing him reopens the lighthouse, so the wizard can end the storm | ⚠ `tralucave` opens (every chapter) but holds nobody and nothing |
| 20 | inside S2 | S19 ⇄ S20 ⇄ S2 | on | two deeper caves in a loop, many hurting zones | ❌ not built (c) |
| 21 | the fort, on top (−24.5, −63.2) and the north face (−25.9, −82.0) | S51, both ends | on | a passage through the plateau from the old citadel's ruins to the north shore | ❌ both ends built (the yard's hatch, a barred tunnel mouth) and locked forever |
| 22 | the west islet (−159.8, 0.0; 12 m up) | S26 the dome (two doors) | on | the Dome of the Slate, a keyhole; used again later (S202) | ⚠ the dome is built, shut, and the islet is out of reach (seen across the water) |
| 23 | the harbour wing (−99.1, 30.5) | S7 | on | Paul's house (T) | ✅ `nellhouse` (Nell's home), every chapter |
| 24 | the harbour wing (−88.9, 30.5) | S8 | on | the ticket office for the ferry (T) | ✅ `ticket`, every chapter |
| 25 | the lighthouse (headland, our −107.5, 90.5) | no zone: scripted | after Raph is back | the keeper's lighthouse | ⚠ `lighttop`: chapter 3 (Zoé's scene) and chapter 10 only; no prompt at its door otherwise |
| 26 | the harbour | the ferry (scripted, a ticket) | after the storm | to Desert Island | ✅ the ferry from chapter 4 |

**The sewers in LBA2 (rows 6, 7, 13, 16–18):** one hall (S17) with four ways in: a fall from the tavern cellar (one
way), a street door in the lower town, the terrace door above the stone house, and the wizard's tent. Only the tent
works both ways from the start; the two town doors are opened by the story. Two rooms lead off the hall (S18, S34).
**Ours:** the hall and S18 are built (`sewer`, `sewervault`), but the only way in or out is our own grate-lift in the
lane north of Twinsen's house (−45.4, 56.6), which LBA2 does not have. None of LBA2's four ways exists.

### LBA1's Citadel (D, coverage partial)
- The harbour (scene 6) → a sewer (35) → the asylum (0): a one-way route from the harbour into the asylum.
- Two town scenes (2, 3) ⇄ a sewer passage (34 ⇄ 55), entered by script.
- The tavern (14) ⇄ its cellar (33). The asylum (0) ⇄ its yard (1).
- **Ours:** the asylum (`asylum`, LBA1 room 0) opens from its block-house outside the fort's east wall, every chapter;
  no sewer reaches it. Positions of LBA1's Citadel scenes against ours were not mapped in this audit.

### Zeelich (D, against our islands)
| Island (ours) | LBA2 outdoor scenes | LBA2 interiors | LBA2 doors outside → in | Ours |
|---|---|---|---|---|
| Otringal | 10 | 40 | 34 | none enterable |
| Celebration | 1 | 8 | 2 | none |
| The Wannies' island (`platform`) | 5 | 15 | 13 | none; named "The Platform" |
| Mosquibee | 4 | 6 | 4 (+ a passage up to CX) | none |
| Knartas (the Francos') | 4 | 12 | 15 | none |
| CX islet | 1 | 7 | 5 | none |
| The Lift Dock (ASCENCE) | 1 | 0 | its lift links to the Wannies' island (scene 120 → 98) | the lift goes nowhere |
| Under Celebration | 4 | 1 | 2 | our Wannie mine adit (an entrance with the glove, no room) |

ALIGNMENT.md already decides this (phase A: names, the lift to the Wannies' island, ZEELICH-1 rooms); this audit
only confirms they are still open at `17ef25a`.

## 2. Ours: every Citadel building with a door
✅ opens · 🔒 locked ("Locked." on use) · — no prompt at all

| Building (id) | Where | Opens | Inside |
|---|---|---|---|
| Twinsen's house (`twinsen`) | (−50.6, 79.8) | ✅ every chapter (fixed here: before, only 1–2, 8, 10 and the epilogue; B-1) | the family's house; `cellar` under it; Zoé and Arthur in chapters 2, 4–6, 8, after the ending |
| Water Office (`water`) | (−68.7, 11.0) | ✅ chapters 2, 8, 10, after the ending; 🔒 in 4–7, 9 (B-1) | Gilbert and Mira (2); Mira (8); empty after the ending; the valve room under it (8, 10) |
| Tavern (`south`) | (−48.2, 23.3) | ✅ always | Luc and four regulars (Luc alone in chapter 8); its cellar (a store, nobody) |
| Mr Bazoo's (`museum`) | (−71.0, 42.5) | ✅ always | Mr Bazoo, Mrs Pell (Mr Bazoo alone in chapter 8) |
| Ticket office (`baggage`) | (−84.2, 25.4) | ✅ always | Ines, Rollo (empty in chapter 8) |
| Nell's (`wing2`) | (−100.8, 26.4) | ✅ always | Wim at the bench |
| Baggage claim (`bug`) | (−61.4, −14.3) | ✅ always | Osk |
| Pharmacy (`bug2`) | (−62.3, −8.2) | ✅ always | the pharmacist |
| Neighbours (`nbr`) | (−33.6, 75.3) | ✅ after the prologue | Hedda |
| Bersimon's tent | (−100, −71) | ✅ always | Bersimon (magic) |
| Asylum block-house | (−11.2, −65) | ✅ always, but **could not be walked to** before this audit (fixed: a stair onto the fort's terrace) | ASYLUM-2: a front door on the terrace too; the workers' hostel (its people every chapter), Vesk's two guards on the store in chapters 1–2, the humming crate (his key), his office (notebook, 20 kashes), the register (a clover); ASYLUM-1: the dig's breach, Twinsen's old cell (`as_cell`, kashes once) |
| Plateau door → Tralu's cave | (−80.7, −82.0) | ✅ always | an empty cave and guard house |
| Station: control room, office | the fort | ✅ by chapter (2, 8, 10) | the project's rooms |
| Lighthouse | (−107.5, 90.5) | ✅ chapter 10 (and chapter 3's scene) | the lamp room |
| Sewer grate (ours) | (−45.4, 56.6) | ✅ always (a lift) | the hall, the treasure room |
| Stone house (`stone`) | (−28.6, −23.4) | 🔒 always | — |
| Shop house (`shop`, ours) | (−30, 0.5) | 🔒 always | — (barrels outside) |
| Pink house (`pink`) | (−28.5, 24.6) | 🔒 always | — (LBA2's sewer door) |
| Terrace porch (`stoneup`) | (−25.5, −31.8) | 🔒 always | — (LBA2's sewer upper door) |
| Fort-yard hatch, north tunnel mouth | (−27.8, −61.6), (−25.9, −84.6) | 🔒 always | — (LBA2's passage) |
| West islet dome | (−159.7, −10.0) | 🔒 always (out of reach) | — |
| Spaceport terminal | the deck | — no prompt | not built (SPACEPORT-1, the laptop) |
| Harbour master's shed | the quay | — no prompt | not built |

Outside Citadel: Desert Island's old places (the great hall, S28, the compound, the islet door) are 🔒; Kesh's houses
and Zeelich's street houses have doors drawn (Kesh's some ajar) with no prompt; the School of Magic ✅, the dig's
temple ✅ (chapter 4 on), the condenser hall ✅ (chapter 5 on), the observatory ✅ (chapters 7, 10), Baldino's workshop
✅ (chapters 3, 9, 10), the council ✅ (chapter 9).

## 3. Gaps and proposals
Cost: S ≈ a day, M ≈ a few days, L ≈ a week or more. **Code** = no new geometry, or a doorway/prop the room's own code
already knows how to build; **Laptop** = a new room or area (the world builder, WORLD_ART_REQUESTS.md).
Every proposal keeps the alignment rules: 80 % likeness for what is kept, places only with a purpose, the planets
joined only by spaceship, FunFrock dead and Vesk the villain, no Earth-style night, Esmer and Wannies.

### The sewers (the user's example), in order of value
**Built on `sewers-1` (SEWERS-1, 3.11):** S-1, S-2, S-3, S-4 (code-only: the pink door → the Works door at the east
pier's head; Fosse the sewer man in the hall), S-5 (the globe's room, a new small room `sewerglobe` in the vault's kit, no
lamp of its own; the key is Bersimon's) and C-2. Flags `sw_*`; `tests/sewers-ways.mjs`.
**Rebuilt by DOORS-LBA2 (8.11, the laptop's decoded links):** S-3 and S-4 are LBA2's two lift hatches now (the lower
town's railed hatch at (−28.5, 27.6) → the hall's NE shaft, Fosse's padlock on its lever below; the terrace's at
(−25.1, −31.5) → the NW shaft, its catch drawn below); the pink house is Fosse's shut office 3 m north, the porch is
gone, WA-14's Bug Street grate is gone; S-5's door is the well-house's; the treasure gate is in the west wall; S-2
lands on the island's platform; S-1 comes out at z 10. The flags kept their meaning. `docs/lba-maturity/door-map.md`,
`tests/doors-lba2.mjs`.
| # | Gap | Proposal | Purpose | Chapter | Cost |
|---|---|---|---|---|---|
| S-1 | Bersimon's tent has no way down (LBA2 row 16) | A trapdoor under Bersimon's rug, a stair down to the hall's west end. He has felt the warm air rising under the town (his bible line) and sends Twinsen to look: the grate's side story gets a second, grown-up hook, and the tent becomes the sewers' way in and out from the plateau. | story beat (optional), a shortcut plateau ⇄ lower town | 1–2 hook, every chapter after | M · code (trapdoor prop and prompt in `wizards.js`; a doorway and stair in the hall's west wall in `sewers.js`; two exits) |
| S-2 | The tavern cellar's drop leads nowhere (row 6) | Open the railing over the cellar's dark drop: a one-way fall into the hall's water by the east pier, as LBA2. A regular in the tavern warns about the hole (one line). | optional secret, a second way in | 1 on | S · code (a gap in `tavcellar.js`'s railing, a fall trigger, an arrival spot) |
| S-3 | The terrace door (`stoneup`) is shut forever (row 13) | It opens from below: a bolt on the hall's raised north walkway that Twinsen draws, then the porch door works both ways (LBA2: off at start, opened by the story). | the way back up to the terrace; "open the way behind you" | 1 on, after the first visit | S · code (bolt prompt; a doorway on the walkway; `stoneup` routed in `story/sewers.js`) |
| S-4 | The street door (`pink`) is shut (row 7) | The Sewer Works: LBA2's grumbling sewer worker twelve years on, who has the project's pipe knocking in his hall. Door → a stair down to the hall. He is the side story's person with a want (the knocking stops when Twinsen eases the valve) and a later reaction. | a person and a want for "Under the Street"; the lower-town way in | 1 on | M · laptop for a small works room; or code-only as a direct link to the hall's east pier (no room) |
| S-5 | LBA2's second room (S34, the globe's secret room) is missing | Bersimon's weather globe in a sealed room off the hall: the project's heat has clouded it. Cleared, it shows Citadel's weather as the story holds it (WEATHER-1) and Bersimon's magic top-up gets a reason. No currency reward. | the secret place with a meaning (the user's words); pays off S-1 | 2 on, optional | M · laptop (a new small room; the vault's kit can serve) |
| S-6 | Our grate-lift in the lane is not LBA2's | Keep it (Arthur's chalk and map are ours and good), but treat it as the fifth way in, not the only one. | — | — | none |

### Other Citadel gaps
| # | Gap | Proposal | Purpose | Chapter | Cost |
|---|---|---|---|---|---|
| C-1 | The passage through the plateau (row 21): both ends built, shut forever, while chapter 8 is about FunFrock's tunnels | Gilbert knows it: in chapter 8 the fort yard's hatch opens and leads to the north face; after that it stays a shortcut from the station yard to the north shore. | story beat, then a shortcut | 8 on | S · code as a direct link (a fade between the two ends); M · laptop for the short vaulted tunnel itself (LBA2's S51 is a small room) |
| C-2 | Tralu's cave opens but means nothing (row 19) | A small find in the guard house tied to LBA2's rescue: the old guitar case of the lighthouse keeper the monster once held, and a lantern-lit cache (a clover or kashes). One line from someone in town points there. Or close the door again (only places with a purpose). | reward, an echo of LBA2 | 1 on | S · code |
| C-3 | The lighthouse has no prompt outside chapters 3 and 10 | Open the lamp room in free roam after the ending (Zoé's dials, the view); before chapter 10 a "Locked." prompt. | a reason to return; consistency | epilogue on | S · code |
| C-4 ✅ (Citadel, 3.11) | Locked doors that say only "Locked." (`stone`, `shop`, `pink`, `stoneup` until S-3/S-4, the yard hatch until C-1) | Each locked door names its reason or owner in one short line (who lives there and where they are now; "Sealed by the Council"); the same for Kesh's and Zeelich's houses, which have no prompt at all. | every building means something, cheaply | 1 on | S · code + text |
| C-5 | The Water Office has no upper door (row 12) | Not proposed: our office is a different place with its own purpose. | — | — | (c) |
| C-6 | The baggage claim's back rooms, Tralu's deeper caves, the islet's dome (rows 9, 20, 22) | Not proposed: no purpose in our story now. | — | — | (c) |
| C-7 | LBA1's sewer route into the asylum | A barred gate from the sewer hall into the asylum's cellars (Vesk's store in chapter 2), opening from the asylum's side: a back way out for the infiltration. | an alternate route (story) | 2 | M · code gate; laptop for the joining tunnel |

### Chapter state, not geometry (from Part B, see the report)
| # | Gap | Proposal | Cost |
|---|---|---|---|
| B-1 | Doors belong to the chapter in progress (`story/index.js` doors(): `this.cur.doors()` plus a fixed list). On a visit to Citadel in chapters 4–7 and 9 (the ferry and the spaceship are open), Twinsen's house had no prompt while Zoé and Arthur stood inside; the Water Office says "Locked." (Mira is away then); on Zeelich in chapters 4–8 Baldino's workshop has no door. | **The house: fixed here** (its door is always in the list; Zoé and Arthur answer with their everyday line). Still open: the Water Office and the workshop between their chapters need a resting cast and a line each, then the same treatment. | S · code |
| B-2 | Spaceport terminal door drawn with no prompt | SPACEPORT-1 (already ordered); until then a "Closed" prompt. | S · code |

### Zeelich (confirmed open, already decided in ALIGNMENT.md phase A)
- The Lift Dock's lift goes nowhere; the Wannies' island is still reached by shuttle and named "The Platform".
- None of LBA2's ~80 Zeelich interiors is enterable (ZEELICH-1 picks the four to build).

## 4. Fixed on `world-audit` (Part C)
- **The asylum could not be walked to** (a connection in the code, cut off in the world). Its block-house stands on a
  terrace round the fort's south and east walls, 1–2.6 m above the plateau, with no walkable way up (a flood fill of
  the harness's own step rule from the town, the depot and the door: two separate regions, on this build and on the one
  before ROCKS-1). A short stone stair from the plateau's flat at x −32 up the ledge west of the fort (`lba1places.js`
  `ASYLUM_STEPS`). Walked by input from the town square and from Twinsen's door into the asylum and back.
- **Twinsen's front door** opens in every chapter (B-1, `story/index.js`).

### Text against the rules
- A Citadel trader said Zeelich's goods come "by the ferry" (PLANET-1): now "the ships".
- The Zeelich holomap labelled the sky pier "Ferry dock": now "Sky pier".
- Three Hebrew lines of chapters 1 and 3 still spoke of a whole night (R7); one of them also had the old drill story.
  Now as their English lines.
- Still open (larger than a fix): the Hebrew text of chapter 3 is the old story (the shaft on Zeelich, "I'm going down
  after him"); 26 chapter-3 and 11 chapter-1 lines have no Hebrew at all, so a Hebrew game mixes languages there.
  Either retranslate chapter 3's Hebrew from the English or drop it so English shows whole.

## 5. How the doors were walked (evidence, not in the repository)
Snapshot of `17ef25a` (the fixes: `25b0933`), served from `/dev/shm`, the playthrough chain's own saves (segments 01–14,
Save & quit → Continue). For each save a page script (`tests/lib/try.mjs`) walked by the harness (A*, keys, the game's
time step) through every open door of the region he stood in, counted who was inside, walked out, and walked up to every
locked or shut door to read its prompt. Saves used: chapter 2 (Citadel), chapter 3 (Zeelich), chapter 4 (Desert Island,
and a visit to Citadel), chapter 5 (a visit to Zeelich), chapter 6 (the Hamalayi), chapter 8 (Citadel), chapter 9 (a
visit to Citadel), after the ending (Citadel). A visit stands him by the ferry stop or the spaceport (ISO), as the ferry
or ship would; everything after that is input.
- Every open door on Citadel was entered and left in every save but the asylum's (fixed above). Bersimon's tent once
  failed from the far end of the island (the harness's planner, not the world: entered from the plateau every time).
- Every locked door was reached and answered "Locked."; the islet's dome cannot be reached (by design).
- Desert Island: 9 of the original's old doors answer "Locked."; the north-west hut and the islet door are not reached
  on foot within two minutes (they stand on their own ledges, as in the original).
