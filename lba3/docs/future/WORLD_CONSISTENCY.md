# World consistency: chapters 3–12 get what chapters 1–4 got (the user, 2.11.2026)

The user: "I'm afraid of what chapters 3 onward will be like. Make sure every change made to the world, and the reason
for it, is carried into the other chapters." The user plays chapters 1–2 only, so this file is for the team. Report to
the user only by chapter number and kind of gap, never by place, person or event.

## The rules the user's feedback set (each with its source)
| # | Rule | Where it was set | Engine-wide? |
|---|---|---|---|
| R1 | Every place the story uses is inhabited: residents with rounds, not an empty set | TOWN-LIFE-1..3, Citadel (ch 1–2) | no, per region |
| R2 | Story characters move when no scene needs them (a small round), stop and turn when spoken to | INTERIOR-LIFE part 2 (Zoé, 2.11) | machinery yes, cast per chapter |
| R3 | Rooms you can enter have their keeper and regulars; empty only when the story empties them | INTERIOR-LIFE part 1 (tavern, 2.11) | per room |
| R4 | Crossing between planets is seen: the ship's take-off, the cabin, space; ferries and gliders are seen too | TRAVEL-1 (2.11) | the films yes, the story's crossings per chapter |
| R5 | Spaceports have people and terminals you walk into, with the right crowd for the chapter | SPACEPORT-1, INTERIOR-LIFE part 3 (2.11) | per chapter |
| R6 | 80 % likeness to LBA1/LBA2 for places kept; only places with a story purpose | ALIGNMENT.md (2.11) | per place |
| R7 | Names: Esmer for Zeelich's peoples, Wannies for the moles; no Earth-style night; FunFrock dead; Vesk the villain | e768a8c, 89f9c6e | text |
| R8 | Lamps hand over with fades; weather per planet held by the story's scenes; never dark | LAMP-FADE, WEATHER-1 | yes |
| R9 | LBA2's gaits (discreet walk), planted feet, busy NPCs turn only when spoken to | DISCREET-WALK, STOP-ROBUST, GAME-1 | yes |
| R10 | The story connects: the shaft starts at Citadel's station, every later chapter agrees | SHAFT-CITADEL (da0f308) | text and story |

R8 and R9 live in the engine, so every chapter has them already (DISCREET-WALK lands with its merge). R7 was checked
on 2.11 (`grep` over `src/game/text`): no "mole", and the only "night" is chapter 2's dial riddle, kept on purpose.
R10 was carried through chapters 10–12 and the epilogue in the SHAFT-CITADEL merge.

## Audit at 014cf8e (2.11.2026)
✅ in place · ⚠ partly · ❌ missing · — not relevant

| Ch | R1 residents | R2 cast moves | R3 rooms | R4 crossing seen | R5 spaceport |
|---|---|---|---|---|---|
| 3 Zeelich | ⚠ hub street yes; the eight original islands empty (ZEELICH_GAP) | ❌ Baldino, Oku and the others stand | ⚠ workshop has its life; ZEELICH-1 rooms not built | ✅ WC-1: the ship's film from Zeelich Spaceport, then the ferry arriving at Kesh's pier | ⚠ arrival deck only; SPACEPORT-1 ordered |
| 4 The Dig | ⚠ Kesh yes; the research post, School, Temple: no | ❌ 16 speakers, 1 moves | — | — (same island) | — |
| 5 Steam and Sand | ⚠ as 4 | ⚠ some scenes move people; the rest stand | — | ✅ WC-1: the glider's film, the dunes over the buried hall → the Hamalayi foothills | — |
| 6 The Pass | ❌ Lhar: three villagers on marks, no one else | ❌ | — | — | — |
| 7 The Observatory | ❌ | ❌ | ⚠ the room has its keeper, standing | ✅ WC-1: the glider's film, the monastery's terrace → Citadel's glider field | — |
| 8 Evacuation | ⚠ two residents packing; everyone else mustered | ⚠ | ⚠ INTERIOR-LIFE empties rooms here | ✅ ship film | ⚠ the queue for the ships wants SPACEPORT-1 |
| 9 The Council | ⚠ hub street yes; the upper districts thin | ❌ the council stands | ⚠ | ✅ arrives off the ship | ⚠ |
| 10 The Network | ⚠ by region as above | ⚠ | ⚠ | ✅ the travel menu plays its films | ⚠ |
| 11 The Shell | — (no one lives there) | — | — | — | — |
| 12 The Core | — | — | — | — | — |
| Epilogue | ✅ the town is back | ❌ the family stand in free roam | ⚠ rooms follow INTERIOR-LIFE's states | — | — |

## Progress
- **WC-2 done (2.11):** 31 story characters in chapters 3–10 walk small rounds (`src/game/castrounds.js`, `roomlife.js StoryRounds`, `tests/cast-rounds.mjs`); the epilogue family uses the household rounds. Kept still on purpose: the stealth, disguise, dial-bank, puzzle and fight places, guards (the list is in the merge commit). Doran and Zeelich's street folk go to WC-3.

- **WORLD-AUDIT (2.11, on `17ef25a`; docs/future/CONNECTIONS_AUDIT.md):** the open orders confirmed, not fixed. WC-1: the
  ends of chapters 3 (`chapter3.js`), 5 (`steam.js`) and 7 (`observatory.js`) still go through a plain `startTransition`.
  WC-3: in the chapter-6 save the Hamalayi has its story villagers and no residents; Desert Island's chapter-4 save has 3.
  WC-4: not re-measured (interior-life covers chapters 1, 2, 4 and 8). R7 in Hebrew: three lines of chapters 1 and 3
  still spoke of a whole night; fixed. The chapter-3 Hebrew is still the old story (the shaft on Zeelich): open.

- **WC-1 done (3.11, branch `wc-1`):** the three story crossings that were plain fades now play their journey films
  around the story's own scene change (`src/game/travelfilm.js` `storyJourney`, `storyArrival`, `crossByShip`'s
  `onward` leg; `tests/story-journeys.mjs`).
  - Chapter 3's end (`story/chapter2.js toShell`): Doran's ship leaves Zeelich Spaceport with them (take-off, cabin,
    space), then the ferry is seen coming in to Kesh's pier (`desert_ferry`), where chapter 4 starts; Doran steps off.
    The two films chain cleanly: the ship's departure, the chapter change under the black, the ferry's arrival.
  - Chapter 5's end (`story/steam.js board`): Hesk's story glider is in FunFrock's hangar (an interior, `condB`); the
    `desert_glider` field is 110 m away on the beach. Chosen: a story spot on the sand in front of the buried hall
    (`steam.js ROOF`, where the hangar's roof hatch opens onto the dunes), entered quietly under the film's black (no
    save, no story hook); the glider is Hesk's (`valveroom.js buildGlider`, the fields' craft) built for the film. The
    arrival is the travel point `hamalayi_glider`, which is chapter 6's start (`M.landing`) and Hesk's grounded glider.
  - Chapter 7's end (`story/observatory.js leave`): Hesk said the glider would launch from the monks' slope, not the
    foothills field. Chosen: a story spot on the terrace's lip east of the monastery's gate (`observatory.js SLOPE`),
    nose over the drop to Lhar. The arrival is `citadel_glider`; chapter 8 now starts on that field's landing spot
    instead of 47 m east of it (`evacuation.js begin`; the field is due north of the lighthouse, as its opening line
    says), so the film ends where the chapter puts him. Hesk's line at the gate is his own now (it repeated chapter
    6's "I'll stay with her and dig her out").
  - Each next chapter's title card and first line wait for the arrival film. The skip ends the whole journey's film
    (the plain transition follows); films off (`?nocine`), a missing point or a failed film: the plain transition as
    before. Saves are unchanged (nothing new is saved; the quiet scene change saves nothing).
  - Not done: chapter 10's Baldino departure spot (optional): he has no leaving scene to hang it on (he is simply at
    the shaft once the network is done), so it is not cheap. No parked glider stands on the monks' slope before the
    film (the craft is built for the film).

## Work orders (in this order; at most two agents at a time)
1. **WC-1 Journeys (done 3.11, above).** Chapter 3's end: `crossByShip` from Zeelich Spaceport with Doran aboard, then the ferry's film to
   Kesh's pier. Chapters 5 and 7: Hesk's glider through `playJourney(mode 'glider')` between the travel points. Chapter
   10: Baldino's ship leaving Zeelich as a spot (`launchShip`'s pattern) when he sets off. Small; after INTERIOR-LIFE
   merges (it may touch `story/chapter2.js`).
2. **WC-2 The cast moves.** After INTERIOR-LIFE's round machinery is merged, give every standing story character in
   chapters 3–10 and the epilogue a small round when no scene needs them: Baldino at his bench, Oku at the mills, Ilka
   and Dallan at the post, Mother Tarra, Hesk at his yacht and glider, Yorna and Pim, the observatory's keeper, the
   council between sittings, the family in the epilogue. Same rules: talk and scenes win, nothing saved.
3. **WC-3 Residents where the story goes.** Rosters like `desertRoster` for the dig's research post (project workers),
   the School and Ker'aooc, Lhar and the monastery (villagers moving in, then settled), the upper districts (clerks,
   guards). Zeelich's original islands follow phase A of ALIGNMENT.md (island life by identity), as already planned.
4. **WC-4 Spaceports per chapter.** When SPACEPORT-1 lands: the crowd by chapter (grounded in 1–3, passengers in 4–7,
   the queue in 8, the council's guards in 9, Baldino's departure in 10), and every story crossing walks through the
   terminal.
5. **WC-5 A guard test.** `tests/world-consistency.mjs`: for each chapter's start state, count residents in each area
   the chapter uses, the share of present story characters that moved in 30 s of free play, and that every planet or
   region change in the chapter's code goes through a journey film. Run it in each future merge's regression set, so a
   new chapter or a change cannot drop what chapters 1–4 gained.

Each order keeps the standing rules: numbers and descriptions only from the originals, no spoilers to the user,
honest measurements (SwiftShader here: no fps claims).

## The cloud's queue from the user's asks (2.11.2026, via the laptop's USER-ASKS and the chat)
1. **Shops you can buy in:** Mr Bazoo (goods), the pharmacy (potions: life), the ticket office (the ferry ticket), as
   LBA2's; through the existing shop (`#shop`, `main.js openShop`), modest prices.
2. **The Esmer trading house (WA-15b):** a keeper, goods to buy or trade, a reason to go in.
3. **The round tower's raised door** (the lighthouse?): the sill against the ground, and a reason to go in or a word at
   the door. (The connections audit, `CONNECTIONS_AUDIT.md`, covers it.)
4. **EQUIP-2, LBA3's own weapons and gadgets** (the user: "weapons and accessories that make the third game its own, not
   only copies of the first and second"). Weapons do NOT need to come earlier (the user: only that there are some
   through the game). Design and build 3–5 signature items rooted in this game's world (the heat and the crystals, the
   shell, Baldino's twelve-years-on workshop, Arthur's radio, the Esmers' craft; later the expansion's world), each with
   a job in puzzles and fights that the old arsenal does not do, taught safely, spread over the chapters, saved with the
   hero (`hero.arms`), no paid assets, the performance rules. The old favourites stay. Agent: `lba3-equipment-designer`.
5. **BIGGER-1: done (265a870).** The rooms 1.5x; the interiors' people read from each room's exported plan (`*_PLAN`).
