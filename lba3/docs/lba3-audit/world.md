# LBA3-RUN · lba3-world: world construction, doors, puzzles, pacing (23.11.2026)

Agent: lba3-world (wave 2, paired with lba3-dialogue). Base revision `c1f9af84` (branch `ccr-c1c2c4b9-dep6ed`, wave 1
checkpoint). Work on `worktree-agent-a6aea7d96b6470b3a`. **Automated runtime only**: headless Chromium on SwiftShader,
a shared machine, nobody played. Words used precisely: **automated** = a suite or probe drove the game; **inspected** =
read in code or in an existing report, or looked at in a picture; **untested** = neither.

The user's rule of 23.11 ("why so many tests? reduce the tests") applied: each suite was run once, and only where a
fix needed proof. The survey of doors, puzzles and pacing is built from the code and the existing reports
(FULL-TEST-23-11, PUZZLES.md, chapter-balance.md, CONTENT-15H.md, resemblance-zeelich.md), not from fresh runs.

## 1. P113 · Pippa's shop raised to the square's level (the user's pick: "raise the shop") — done

**The fault.** FLAT-TOWN (v142) raised the square into LBA2's plaza (+0.42 m, two 0.21 m stone steps all round, r 8.85
+ 2 × 0.5 m). The ring of steps runs right up to the front of the `shop` house (the user calls it Pippa's shop; in the
game it is Tibbo's "Fix and Fill", beside Pippa's stall). Its door opened onto the steps, and the platform 0.9 m out
stood 0.24 m over its sill (worldfit's only open failure). LBA2 has no such clash: its plaza is a 12 × 10 m rectangle
with a street between it and this house (`tools/worldscore/ref/citadel.json`: street 42 cm, platform 84, middle 105, the
house's spot 42).

**The cause, game-wide.** Every house's floor is the level of the ground before its door (`world.js` houseFlats, from
`islandHeight0`). FLAT-TOWN's raised levels (`plaza`, `promStair`, `promenade`, `lawns`) are laid *over* the floors
afterwards. So any door those levels reach finds its floor at the street's level under a raised surface.

**The fix** (`town.js`, applied to every house, not to the shop by name):
- `doorLift`: the ground 0.3–1.5 m before each door (its middle ±0.5 m) is compared with the ground under the house.
  More than 0.15 m higher means the house stands on that raised level.
- `terraceOf` / `buildTerrace`: such a house stands on a stone terrace (the plaza steps' stone and tile). The terrace's
  top is the raised level + 2.5 cm, so it never shares a plane with the platform. Its foot is 6 cm under the street.
  It runs 0.3 m round the walls, and in front either 1.0 m or out to the raised ground before the door + 12 cm,
  whichever is further. It has one walkable collider. Its fit for worldfit reaches the street.
- The house, its colliders, its door, its return spot (`W.houses[].door`) and its worldfit entry all stand on the
  terrace. `W.terraceTop(x, z)` lets other placers stand things on it.
- **The sweep** (which houses `doorLift` raises): of Citadel's 13 houses, only `shop` (+0.445 m, a 1.22 m landing). No
  other door meets the plaza, the lawns, the promenade or the flight. The other regions' buildings are not on
  FLAT-TOWN's levels. Every registered door in the game was then measured for the same fault: §2.
- What stood on the new terrace, swept the same way:
  - The shop's barrel by its corner would have straddled the terrace's edge. It now stands on the platform just before
    the terrace (local (−3.2, 4.8)).
  - The globe sign moved 0.2 m out, clear of the terrace.
  - Tibbo's counter and bench stops (`walkrounds.js`) were 1.5 and 1.8 m out, right on the terrace's edge. They are now
    1.1 and 1.2 m out, on the terrace and under the awning.
  - The flower tubs either side of every door (`citydress.js`) and the town's containers (`containers.js`) read the bare
    terrain. The shop's tubs were skipped (inside a collider). Both now use `W.terraceTop`, and the tub is back.
- Old saves: the save holds x/z, and the loader grounds Twinsen on the collider. Nothing in the save format changed.

**Evidence** (automated): worldfit **PASS**, 1 + 8/8 visual, after the shop fix and again on the final build. Before the fix it was 7/8: "door sill under the ground,
house shop 0.24 m". Citadel's listed z-fights stay at 25, none judged. The door sweep (§2): the shop's ground before its
door is 0.13 m under its sill, its door step, the same as every other Citadel house (before: 0.29 m over it).
Pictures (inspected), play-like camera and a near look, before | after:
`captures/world/p113-shop-before.jpg` | `p113-shop-after.jpg` (the square's side),
`p113-shop-north-before.jpg` | `p113-shop-north-after.jpg` (the street's side: the terrace's 0.44 m face).

**Visible change, for the user's keep-or-revert:** the shop stands 0.445 m higher on a pale stone terrace, flush with the
square's platform. From the street on its north and back the terrace is a 0.44 m step; Twinsen steps onto it (STEP_UP
0.55), and no intermediate step was added. Tibbo stands 0.4 m nearer his window.

## 2. The door sweep, game-wide (new `tests/door-levels.mjs`) — two more faults fixed

worldfit samples the ground only 0.5–1.0 m out from a door, on the terrain alone. The new probe measures, for every
registered door (90 doors: Citadel, Zeelich, Desert Island, the seven isles), the walkable surface (terrain and anything
built on it) 0.15–2.5 m out, across the door's own width. A door fails when that surface stands more than 4 cm over its
sill within 0.6 m. Every door whose ground changes level by more than 0.15 m within 2.5 m is listed. Run once on the
base and once on the final build (automated).

| Door | Before | Cause | Fix |
|---|---|---|---|
| Citadel · `shop` | the platform 0.29 m over the sill | FLAT-TOWN's plaza over the house floor | §1 |
| Desert · the School of Magic (the mask's door) | its "worn step" 0.17 m over the door's foot: the leaf's lowest 17 cm stood inside the step | the step's box centred at g + 0.02 with a height of 0.3 | top at the door's foot + 2 cm, collider likewise (`desertold.js`) |
| Desert · the crew's bunkhouse (tower s28, an enterable room) | the sand 0.25 m over the sill at the wall's foot, through the stone step; the step's top 11 cm over the leaf's foot | the tower took its level from the ground 0.5 m out, and the sand rises to the wall | the tower stands on the highest ground under its step (0.1–0.9 m out). The step's top is at the door's foot + 2 cm and its foot 0.48 m down, with a walkable collider; the tower's foot reaches the lowest ground round it (`desertold.js`) |

**Left, listed** (inspected, not fixed):
- **The School's door, left side.** The ground rises from the sill to 1.0 m over it across the left half of the door's
  width, within 1 m of the face (the hollow's floor running up toward the ridge). It was the same before this run. I
  tried one picture from a set camera, but the frame was wrong for the desert and the picture came out dark, so this was
  **not seen**. It could be hidden inside the mask's chin and jambs, or the terrain could show through the step.
  **For the coordinator:** one look from the play camera at the School's door.
- **Knartas, house (43.6, 36.6).** A 0.7 m crate stands 0.45–1.2 m before the left edge of the door's way (the middle
  stays clear). Minor: a person walks past it.
- **Stoops** (more than a door step's drop within 0.6 m): Zeelich's five street houses (0.34 m), the project's two
  buildings (0.32), and the isles' Esmer houses (0.36, their built stoops). These are by design. Each has a drawn step
  and the drop is under STEP_UP.

## 3. Map of doors (Citadel first, then the first Zeelich landing, then every inhabited region)

How each door is known: **D** = door-sweep (one run on this build, §6), **Z** = zeelich-doors, **I** = island-doors,
**L** = doors-lba2, **C** = camera-doors, **R** = room-cutaway, **IL** = interior-life. Only D was run here; the others
are inspected (their suites and reports). D's rooms are listed in §6 by the game's own room names (`pharmacy`, `bazoo`, `asylum`, `office`…); which house
each belongs to is read from the code (inspected). "Entry" means walked in by input from 2.6 m, landing on the room's floor clear
of its exits. "Return" means out through the exit, landing ≤ 2–2.8 m from the sill, facing away, on the ground, with no
re-entry after 2.5 s still.

### Citadel (chapter 2 and every chapter)
| Door | What is behind it | Entry / exit / return | Cutaway, furniture, people | How known |
|---|---|---|---|---|
| Twinsen's house (front) | the house; the cellar by a hatch | D, C (house ↔ cellar) | R; IL (the household) | D, C, R, IL |
| `bug` / `bug2` (Bug Street pair) | LBA2's scenes 5 / 22, rooms | D | R, IL | D, L |
| `pink` (Fosse's Sewer Works) | room; **shut while Fosse is below** with its own line ("SEWER WORKS… Down below. Mind the hatch. F.") | D | IL | D, L (#1/#2/#5) |
| `south` | the tavern (the cellar inside) | D, C (tavern ↔ cellar) | R, IL | D, C |
| `nbr` (the neighbours) | room; in the prologue "The neighbours are out." | D | IL | D |
| `water` (the Water Office) | room in chapter 2; otherwise "The water office. Closed for now." | D | IL | D |
| `museum`, `baggage` (the long hall), `wing2` (Nell's) | rooms | D | R, IL | D |
| **facade** `stone` | a note on the door: "Tibbo's house… At the counter by Pippa's stall" | in-world explanation | — | inspected (`text/world.js` w_door_stone) |
| **facade** `shop` (Tibbo's) | Tibbo's counter under the awning (a shop menu); when he is away, his card on the door | in-world explanation; **raised, §1** | — | inspected (`story/shops.js`); shops 31/31 (FULL-TEST-23-11) |
| the street hatch, the terrace hatch | the sewers / the hall (lifts) | L (#1–#5) | — | L |
| the plateau's door, the islet's dome, the passage's two ends | the plateau's opens to Tralu's cave (LBA-CITADEL-9); the others are shut with their own lines | D | — | D, inspected |
| the spaceport terminal, the station, the lighthouse | rooms / the ship | D | R | D |

Every Citadel house door either leads in or says why it does not, in a line of its own. No Citadel house answers the
generic "Locked." (`prologue.js` baseInteractables: only houses without a story door and without a `w_door_<id>` line
would). Inspected.

### The first Zeelich landing (chapter 3: the dock, the terminal island)
The street's doors (the three `zhomes.js` houses, the bakehouse, Baldino's workshop, the spaceport terminal) are walked
in and out by input in chapters 3 and 5 by **zeelich-doors**. No street house says "Locked." The council house, the
mills and the project's huts give story lines. Inspected: that suite was not part of FULL-TEST-23-11. Its last record is
ZEELICH-DOORS (7.11) and door-sweep (this run, §6). The dock's ferry is laid up by U-1's rule in chapters 2, 9 and 10
(travel 27/27, FULL-TEST-23-11).

### Zeelich's isles, Kesh, Desert Island, the Hamalayi, Ballastra, the underground
- The isles' houses (`ihomes.js`, 55 rooms) and Kesh: every door is a way in or a story door, none "Locked."
  (island-doors: entry, furnished and lit room, return ≤ 2.8 m facing away, warm second entry). Inspected; covered by D.
- Desert Island's kept old houses (s40, s28 the crew's bunkhouse, the hall) are lived in (`purposes.js`): their doors are
  the story's. The bunkhouse step was fixed (§2).
- The Hamalayi, Ballastra (three districts), the underground: covered by D. Ballastra's harbour, arches and gardens
  suites passed (FULL-TEST-23-11).

## 4. Furniture collision, NPC grounding, cutaways (inspected from the latest automated records)
- Interiors: interior-life 144/144 (people on the floor, off walls and furniture, facing their work; FULL-TEST-23-11).
  The room cutaway (room-cutaway: ≤ 1 % hidden spots per room) was not in FULL-TEST-23-11; its last record is wave 3.
  **Untested on this build.**
- Outdoors: place-scan `ONLY=citadel` PASS (1,150 pieces, 33 findings, all on its LEFT list) and overlap-sweep PASS, both
  FULL-TEST-23-11, so before §1's terrace. The terrace itself was looked at in pictures: barrel, tub, sign and Tibbo
  clear of its edge (§1). Walkers 37/37, npc-feet (last record ANIM-POLISH-3).
- Not done here: a fresh place-scan of every region (the user asked for fewer runs). The shop's terrace is the only new
  surface. Its props were moved and pictured.

## 5. Zeelich compared with LBA2 (inspected: `resemblance-zeelich.md`, 8–9.11, and the code today)
None of that review's ranked fixes have been built since (no Franco huts, cocoon nest, zeppelin or palisade in
`zislands.js`; the isles still use one Esmer generator for every house). The gaps it scored stand:

| Place | Gap against LBA2 | Its score | Kind |
|---|---|---:|---|
| Knartas (the Francos' village) | round brown dome huts with portholes drawn as Esmer boxes; the moored zeppelin and its port missing | 58 | silhouette, landmark |
| Mosquibee | the white cocoon nest on the cliff is an Esmer tower with a gold dome; the stake palisade is a ring of flowers | 56–62 | landmark |
| Otringal | paving rendered #605b60 against LBA2's #d0cdc5; round straw-domed huts and the palace's drum cluster drawn as boxes; no moored ship; rock spikes through the high town's paving | 61–68 | ground, silhouette |
| Celebration, Under Celebration | the risen figure not massive and grey with its halo; no cooled-lava identity | ~59 | landmark |
| The terminal island (a new city, the user 7.11) | a flat oval deck with no rock relief; boxy houses where Zeelich's forms are drums and stacked domes | compatibility ~65 | silhouette |

Routes: the isles' positions and ground are LBA2's (worldscore 84–95, every building within 1 m). The doors' faces are
listed there: the Otringal bar on the wrong face, the Celebration temple's door. Lived-in details: residents, rooms and
the Esmer street's goods exist (island-people 65/65), and the reviewers judged the inhabitants with low confidence. All
of these are big visible world changes, so they are **decisions for the user** (§9 D3) and were not started here.

## 6. door-sweep on this build (automated, one run)
**PASS: 103 doors in chapter indices 1–10, 5/5 checks.** Each door was walked into by input from 2.6 m: straight on,
and 0.3 and 0.5 m to either side. Checks:
- in, he lands on the room's floor 0.1 m clear of its exits and stays;
- out, he lands on the ground 0.4 m clear of every door trigger, facing away, and stays 2.5 s;
- every door between two rooms (20 links) works both ways;
- out of Zeelich's terminal, saved on landing, Continue keeps him on the street.

It was run once, after §1–§2's changes. It covers the raised shop's neighbours and both desert doors fixed in §2
(`ih_s28` the bunkhouse, `school`).

| Region | Doors | Rooms (as the game names them) |
|---|---:|---|
| Citadel | 17 | house (Twinsen's; ↔ cellar), nbrhouse, tavern (↔ tavcellar), pharmacy, bazoo, asylum, baggage, nellhouse, office, ticket, terminal, tralucave, wtent, control (chapter 8), pumproom (chapter 3), the sewers (↔ vault, globe, wtent) |
| Zeelich (the terminal island, chapter 3's landing on) | 8 | zterminal, workshop, zh_bakery, zh_nara, zh_oku, zh_pelleck, upper (the archive, chapter 9: a refusal says why) |
| Desert Island, Kesh, the post | 11 | school, ih_s28, ih_house_s40, ih_kesh_house0–4, ih_post_cabin0–2 |
| The Hamalayi | 9 | ham_hall, obsv, ih_ham_landing0, ih_ham_lhar0–4, ih_ham_obs0 |
| Zeelich's isles | 58 | Otringal 25, Knartas 20, the Platform 7, Mosquibee 2, Celebration 2, Under Celebration 1, the Orchard 1 |
| Ballastra, the underground | (links) | bl_shed, bl_oren, bl_mags, bl_pump, bl_cradles, bl_tunnel, bl_kiln, bl_house; butemple ↔ bumaze |

Notes:
- One one-way door: `terminal` (citadel, project). The way back is the ship, by design.
- The Hamalayi hall (`ham_hall`): every one of the test's start spots 2.6 m out was blocked by what stands before the
  door. The door was entered from round it, which is accepted. Two isle doors were blocked from ±0.3/0.5 m only. **Left**
  (minor): a person walking straight at the hall's door meets something first.

## 7. Mandatory puzzles: clue, attempt, feedback, recovery, return after solving

Source: PUZZLES.md's audit (73 main-route steps, 17 optional) and its phases 1–2. Evidence: puzzles 24/24 and the chapter
suites (FULL-TEST-23-11, automated, by input except where marked), and the chain 01→14 15/15 (FULL-TEST-23-11). Not
re-run here.

| # | Ch | Puzzle | Clue | Attempt → feedback | Recovery (a wrong try, a save halfway) | Return after solving | Evidence |
|---|---|---|---|---|---|---|---|
| 3–4 | 1 | the knocking tap, the barrels | the tap knocks back behind the near barrel; the barrel rocks | by hand it rocks and settles; the ball shoves it: the joint | the step is not asked again | the barrel stays aside (W.homeBarrel) | tutor-targets 26/26 |
| 17–18 | 2 | the pump room's diagram and bypass | the copper pipe shivers three and a rest | a wrong cock: two knocks, his line | turn back, no cost | the water returns to the square | seg 05, chapter2 21/21 |
| 20 | 3 | the cistern lift | the cart loose on the deck | each press answers (chain, bell, switch) | minor: a long chain of single presses (a person's verdict asked, PUZZLES §6) | the lift stays usable | seg 06 |
| 26 | 4 | Kesh's wind-pump | Sani's clue; a gust shows the grinding gear | the ball knocks it; the joint pushed home | a miss costs nothing | the pump turns | chapter4 59/59 |
| 31 | 4 | the temple door | steam off three of five discs | a cold disc thuds and resets the open ones | the reset is the feedback | the door stays open | chapter4 |
| 33 | 5 | the condenser hall | the diagram shows where each branch goes; each gauge over its branch | steam with nowhere to go shakes the shut branches; the aquifer branch sends its needle into the red | a save halfway keeps the valves and the shaking | the vent and glider follow | puzzles c5 |
| 34 | 5 | the hangar's two switches | each level with its roof hatch | the wrong one opens the vent: daylight, his line | harmless | the glider's hatch stays open | puzzles c5h 3/3 |
| 37 | 6 | the tree over the gorge | it leans; the lashed pole | the ball rocks it back onto the pole (his line); the pole is the second target | throw again | the bridge stays | puzzles c6 4/4, chapter6 |
| 40 | 6 | the rope lift | the gauge kicks three and a rest | a late start costs the trip | start again on the green | the lift runs | seg 09 |
| 41 | 7 | the two suns | the frozen slit; mirrors turn two ways; one beam is a faint glow | the crystal wakes on two | turn the mirrors again | the ice vent opens | chapter7 20/20 |
| 44 | 7 | the vent's seal | three of five discs warm | a cold disc only rings | as #31 | open | chapter7 (**V**: chapter 4's prop and decision again; PUZZLES phase 1 left it) |
| 45 | 8 | the fortress cistern | the lever gurgles and springs back (dry) | three hand-pump strokes, the water rises n/3 | the lever again: no harm | the door opens; the cistern drains | puzzles c8 6/6, chapter8 22/22 |
| 48 | 8 | the culvert cock | the pipe kicks 3-rest | a kick throws it back | again in a rest | water to the shelters | seg 11 |
| 52 | 9 | the isolator bench | both relays jump, one holds | — | — | the plans | chapter9 24/24 |
| 53 | 10 | the bleeds (exp.) | open while it kicks | between kicks it kicks back, no harm | again | the throttle | exp-throttle (**C** minor: the inverse rule; a person's verdict asked) |
| 56–58 | 11 | Ballastra's three districts | the crank works backwards; the bodged tap; the chain and pawl | each answers | repeatable | the districts stay fixed | exp-ballastra 33/33 |
| 59–61 | 12–13 | the House of Balances, the rig, the Cradle Hall | needle "as if a hand held it"; bands; the bell | spills amber/red; a lever fails safe | repeatable | — | exp-balances 30/30 |
| 63 | 14 | the valve room (Mira) | each valve feeds two mains | three gauges to the green mark; the fourth floods | reset | the mains | chapter10 30/30 |
| 66 | 14 | the code box | the fourth knock | a late clip is thrown off | again | — | seg 13 |
| 68 | 15 | the cooling machinery | one pump feeds the drive and the exchanger; the drain found open, glowing | both feeds with the drain open: the drive starves (slows, his line) | **a save halfway still starves**; shut B: cooled | the drive back to speed | puzzles c15 7/7, chapter3 48/48 |
| 72 | 16 | the last act | the rules learned (rest, count, two knocks) | each once | each repeatable | the end | vesk 12/12, seg 14 |

Fights and stealth (#15, #22, #45, #65, #70) are not puzzles in this sense. Their recovery is the game over → Retry and
the clovers. The depot (#15, #22) needs an ISO assist for the bot (chapter-balance: the early damage spike). Depot 29/29
(FULL-TEST-23-11). No mandatory puzzle was found without a clue, without feedback on a wrong try, or without a way back
from a wrong try. The open items are PUZZLES.md §6's: a person's play of the eight changed puzzles, and a verdict on #20
and #53.

## 8. Pacing (active play, idle and loading excluded)

Source: chapter-balance.md's ledger (the bot's free-play time, from game-state counters, without loading or films;
measured 9–13.11) and CONTENT-15H.md (23.11). The first-play minutes are the ledger's **estimate** (1.8 × the bot's free
play + 60 s a deduction + 30 s a fight + 90 s a death, plus reading time), never a measurement. Not re-measured here.

| Ch | Chapter | Est. min | Band 16.7–27.9 | Outlier, investigated |
|---|---|---:|---|---|
| 1 | The Well | 22.8 | in | — |
| 2 | The Joint Project | 42.0 | long | kept long by the user (8.11). The time is in decisions (the pump room, the bypass, the depot) and story crossings, each with a person; no forced waits |
| 3 | Zeelich | 24.4 | in | — |
| 4–6 | The Dig, Steam and Sand, The Pass | 21.8, 19.3, 16.8 | in / edge | — |
| 7 | The Observatory | 15.0 | **under** | §9 D4 |
| 8–9 | Evacuation, The Council | ~26, ~26 | in | — |
| 10–13 | Borrowed Time, Ballastra, House of Balances, Under the Well (exp.) | ~22, ~27, ~20, ~22 | in | — |
| 14 | Baldino's Network | 33.4 (+~2) | long | kept by the user (8.11) |
| 15 | The Shell | 17.7 | in (low) | — |
| 16 | The Core | 11.3 | **under** | §9 D4 |
| — | main route | ~370 min ≈ 6.2 h | | + optional ~3.8–4.8 h (CONTENT-15H) |

**Do chapters lack decisions?** From PUZZLES.md's audit:
- **Chapter 7** has three thinking steps (the two suns, the telescope's bearing, the vent's seal). The seal (#44) is
  chapter 4's decision again (**V**). The chapter is short because its one new decision is repeated, not because it has
  none.
- **Chapter 16** is one arena (the pylons, the bleed valve, then the last act of learned rules). It is a finale, and its
  shortness is the fight's.
- Every other chapter has at least two different decisions.

Adding a main-path step is a new mechanic or place, i.e. a big decision (the user, 23.11: "ask me about every big
decision"). So nothing was added; see §9 D4.

## 9. Decisions for the user

**D1 · P113, the shop on its terrace (done on the branch; keep or revert).** Pictures: `captures/world/p113-shop-before.jpg`
| `p113-shop-after.jpg`, `p113-shop-north-before.jpg` | `p113-shop-north-after.jpg`.
- (a) **Keep** (recommended). The door opens onto a level landing at the square's level, and worldfit passes.
- (b) Keep it, and add one 0.22 m step along the terrace's street side (north and east), so the 0.44 m edge reads as two
  steps like the plaza's.
- (c) Revert. The sill stays 0.24 m under the platform (worldfit fails).

**D2 · P112, the grass plot with the blue lamp: what is it, compared with the original?** (analysis only; nothing was
changed) — **the user picked (b), 23.11; done on the branch: `docs/lba-maturity/LAWN-EDGES.md`.**

*The spot.* Citadel, the plot between the west street (x −58.9), the cross street (z 31.3), the long hall (the barrel
vault) and the water office's knoll: about x −74…−60, z 18…30. The blue lamp at (−63.6, 26.2) stands exactly at LBA2's
own street lamp (LBA2 body 26, our frame). The red bench at (−67.9, 28.4) and the green bin beside it are LBA2's bench
and bin (bodies 51, 52). Behind them are the red-roofed museum and the white domed building with its arched door.
Pictures (ours; LBA2's renders stay in the scratchpad):
`captures/world/p112-lawn-play.jpg` (our play camera, the user's view), `p112-lawn-oblique.jpg`, `p112-lawn-top.jpg`,
`p112-lawn-game.jpg`.

*LBA2 at the same spot* (lba2remake's rendering of LBA2's data, the same cameras; inspected):
- the plot is **brown earth, no lawn**;
- its edges are **straight paved streets with a kerb band**, and the east–west street runs on across the plot's south
  side;
- a small dark-roofed **pavilion** with an open front stands in it, with the red bench and a pot of red flowers beside
  it;
- the lamp stands at the plot's edge by the street;
- where our knoll's rock stands, LBA2 has a **pale paved ramp** up to the harbour's upper level, with white bollards and
  a teal rail;
- the ground's height is the street's (+0, LBA2 42 cm).

*Ours:*
- a **green lawn** with grass tufts and four or five round flowering bushes, and the lamp in the middle of the grass;
- the paving's edge is a **zig-zag**. The cause: the paving is a splat weight per terrain grid point (0.93 m), with
  noise, so its edge follows the triangles (`world.js`: `gridPaveDist` into the splat weight `w[4]`, with the shader's
  smoothstep);
- the east–west street stops at the lawn;
- the knoll's grey rock blocks and the blue-roofed water office stand where LBA2's ramp is.

*Every plot like it in the town* (inspected in the top pictures and GRID_STREETS):
1. this plot;
2. the museum's yard south of the cross street (x −75…−60, z 33…50);
3. the yards east of the east street (the shop's and Fosse's: x −33…−20, z 4…30; the same zig-zag shows in
   `p113-shop-north-*.jpg`);
4. the strips round the middle block's earth band.

The zig-zag edge is everywhere the splat paving meets earth or grass. The south block's raised lawns have built kerbs
and do not show it.

*Options:*
- (a) **LBA2's plot**: brown earth in place of the lawn on this plot (and the museum's yard), LBA2's few pots in place of
  the bushes, and straight kerbed paving edges. A texture and props change: no height, collider, door or route moves.
  The pavilion and the pale ramp are left out (the knoll and the water office stay; a bigger change).
- (b) **Our lawn inside LBA2's earth band, with straight kerbed edges** (recommended). This is what the user already
  kept for the middle block: a 2 m band of brown earth along the paving and the lawn inside. The bushes go back to the
  lawn's middle, off the band. The kerb is the town's existing kerb stones (`town.js curbs`) laid along every
  GRID_STREETS edge, so the zig-zag is gone in every plot (game-wide). Cost: the kerbs' one instanced mesh grows; its
  count and draw cost are measured if this is chosen.
- (c) Only the straight kerbed edge everywhere (the plots stay green). The smallest change.

**D3 · Zeelich's silhouettes against LBA2** (§5). Build the ranked fixes of resemblance-zeelich.md? In order: each
race's own buildings on the isles, Otringal's paving tone, the landmarks (zeppelin, moored ship, Celebration's figure),
Otringal's round buildings. All are visible world changes. Recommendation: Otringal's paving tone first (small, +5 a
district), then Knartas's huts and zeppelin.

**D4 · The two short chapters (7: 15 min, 16: 11 min, estimates).**
- (a) Leave them (recommended for 16, a finale).
- (b) Chapter 7: replace the vent's seal (#44, chapter 4's decision repeated) with a decision of its own, so the chapter
  gains a new idea instead of length (PUZZLES §4 left this).
- (c) Add a main-path step.
CONTENT-15H Q5 asks the same about chapter 7.

## 10. Routed to the dialogue editor (lba3-dialogue)
No English line was added or changed by this agent. One wording to check: `w_door_stone` says "Tibbo's house… At the
counter by Pippa's stall", and the counter is now on the shop's terrace beside the square. It is still true; no change
needed.

## 11. Files changed
- `src/game/town.js`: doorLift, terraceOf, terraceTop, buildTerrace, W.terraceTop; the house placement; the shop's
  barrel and sign.
- `src/game/walkrounds.js`: Tibbo's two stops.
- `src/game/citydress.js`, `src/game/containers.js`: ground with the terrace.
- `src/game/desertold.js`: the School's step; the bunkhouse's level, step and foot.
- `tests/door-levels.mjs` (new test, not under src/).
- `captures/world/p112-*.jpg`, `p113-*.jpg` (ours only).
No new file under src/ (still 511). Save format unchanged (6).

## 12. Runs made (all automated, SwiftShader, one browser at a time, each once unless said)
| Run | When | Result |
|---|---|---|
| worldfit | base | FAIL 7/8 visual (the shop's sill, 0.24 m) |
| door-levels (new probe) | base | 4 doors over the sill: shop, School, bunkhouse, the Knartas crate |
| worldfit | after the shop fix | **PASS** |
| door-levels | after the shop fix; again on the final build (to check the School and bunkhouse fixes) | final: only the School's left-side ground (§2) |
| place-scan VIEWS (pictures only) | before, after the shop fix, after the placer fix | pictures, `captures/world/p113-*` |
| lba2remake + `tools/map-orig/ours.mjs` (P112 pictures) | once | LBA2 renders in the scratchpad only; ours `captures/world/p112-*` |
| door-sweep | final build | **PASS**, 103 doors, 5/5 |
| worldfit | final build | **PASS** |

## 13. Remaining uncertainty
- Nobody played any of this. The terrace's edges, Tibbo on it, and the step from the street are judged from pictures.
- The School door's left-side ground (§2) was not seen.
- No fresh place-scan, overlap-sweep or room-cutaway run on this build: the user asked for fewer runs. door-sweep (103
  doors) covers zeelich-doors' and island-doors' entries and returns, but not their furnished/lit checks.
- Pacing minutes are estimates from the 9–13.11 bot runs; puzzles were not re-run.
