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

- **WC-3 done (3.11, branch `wc-3`):** residents with rounds where chapters 4–9 go (`src/game/storylife.js`, driven by
  the existing walkers: the street's manager outdoors, the rooms' manager in the School and the antechamber;
  `tests/residents.mjs`). Data only, nothing saved: each resident's state is read from the chapter and the story's flags.
  - Desert Island, the project's yard between the research post and the dig: eight of the crew (surveyor and staff man
    on the dig's rim, cook at a field kitchen, two porters carrying crates between two piles, a fitter, a digger, a site
    clerk), all outside the post's fence (its inside is chapter 4's sneak). They shelter while a sandstorm blows.
    Chapter 5 once Dallan's order has taken the ferry (`c5_planned`): two have gone with it, six pack up.
  - The School of Magic from chapter 4: a master and three pupils on its plaza (a spell in pairs, the herb bed watered
    from the channel), three pupils in the classroom before Rector Hougo. Nobody walks between the plaza and the hall
    (the planner does not cross the bridge's split steps); counted together.
  - The Hamalayi: eight villagers. In Lhar they pack (sacks to the hand cart, crates, the washing, wood, water) and two
    children play tag; each goes up with one of the story's two lift trips (`c6_trip1`, `c6_trip2`) and lives in a camp
    on the terrace east of the monastery's yard (the yard is the story villagers'; the terrace's lip is chapter 7's
    glider take-off: kept clear). Chapter 7 on: settled there.
  - Zeelich, chapter 9: before the council house a council guard on post, a clerk in and out of its door, a courier
    (bridge, council house, dock), a petitioner; in the antechamber a junior clerk, a courier, two petitioners, a guard
    by the council's door (never the archive's).
  - A state change the player could see waits until the resident is out of sight; away from its area a story resident
    sleeps (no update at all). Talk stops and turns them (the existing resident talk); 32 new named speakers, each with
    its own voice.

- **WC-4 done (3.11, branch `wc-4`):** the spaceports' people follow the port's state, derived from the chapter
  (`roomlife.js portPhase`; nothing saved; a person's `when` names the states they are there in, a stop's `stage` keeps
  the queue's stops to the evacuation). Citadel's terminal / deck, Zeelich's terminal / deck:
  - chapters 1–3 (grounded): Ama, Tavi, the port guard, Mrs Lomba / Gurt, Dov; Velo, Pask / Ennu, Oshra; GROUNDED notices.
  - chapters 4–7 (flying), and 9 on Citadel: Ama, Tavi, Old Ressa, Ollo / Gurt, Esren, Gunda, Bibi; Velo, Pask / Ennu, Oshra.
  - chapter 8 (evacuation): the queue for the project's ships from the gate (the port guard at its head with the
    project's list, its sheet on the gate's pillar, the notice "boarding by the list"; Mrs Lomba, Rollo and Mrs Pell in
    it with their luggage, on the list: Rollo and Mrs Pell out of their emptied rooms, the same people by name and voice;
    Old Ressa between her seat and the café; Ollo turned away at the list), Ama, Tavi (8) / Gurt readying the ships,
    Dov (not on the list), Gunda and Bibi (on it) (4); Zeelich quieter: Velo, Pask only (2 / 0). The queue keeps the
    way from the door to the gate 1.2 m wide, off the board's reading spot and the gate's way in.
  - chapter 9: two of the council's guards in Zeelich's terminal (the gate, the door; own voices), the council's order on
    its notice and board: 4 inside / Ennu, Oshra.
  - chapter 10 and the epilogue: back to normal, Mrs Lomba home from her sister's (Citadel 5 / 4); on Zeelich the guards
    gone (Velo: "One left his chair").
  Lines `_e`, `_c`, `_a` (text/interiors.js); boards by state (`port_board_evac`, `zt_board_council`).
  - The story's crossings between the planets: chapter 2 → 3 walks the bridge and the deck past Citadel's terminal to
    Doran at the pad (the clerk inside points him there); chapter 8 → 9 the same to the project ship (or through the
    terminal and its gate); both arrive on Zeelich's deck at the landing beside the pavilion (no landing film: a cut).
    Chapter 10's travel menu is at the pads and the terminals' counters. Not walked: chapter 3 → 4 starts from the drill
    platform's console about 70 m east of Zeelich's pad (the ship's film cuts to the pad); not small (it would change
    the chapter's ending and two tests): listed. Fixed: a save resumed after that console scene (`c2_done`) crossed
    with a plain fade; it now plays the same films (`chapter2.js crossHome`).
- **WC-5 done (3.11, branch `wc-4`):** `tests/world-consistency.mjs`, in the regression set (tests/README.md): residents
  per area at each chapter's start (1–10, the epilogue), the cast with a round moving in 30 s, the story's
  `startTransition` calls on an allow-list (films checked). Known gap it lists: chapter 10's glider menu
  (`network.js fly`) between Twinsun's regions is a plain fade (no glider film).

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
   Concepts: `EQUIP2_CONCEPTS.md` (five items, waiting for the user's approval).
5. **BIGGER-1: done (265a870).** The rooms 1.5x; the interiors' people read from each room's exported plan (`*_PLAN`).
6. **ASYLUM-LATER (written only; nothing built).** ASYLUM-1 gave FunFrock's asylum (LBA1 room 0) its reason in
   chapters 1–2: bricked up after FunFrock fell, broken back into by the Joint Project's dig under the fort (the breach
   in its west wall, the project's cable, Madam Rondo's line), and Twinsen's old cell as a memory (`as_cell`). Two later
   uses, each needing a real playable path, quest state, save compatibility and an aftermath:
   - **The secret way into the fort that only Twinsen knows** (he escaped this asylum in LBA1). The dig's breach (west
     wall, `R.wayIn.breach` in `src/game/lba1places.js`) would open on a tunnel up into the station yard. Hosts: chapter 8
     (`src/game/story/evacuation.js`: the station yard's cistern lever and its drones, the station's control room where
     Vesk announces the depth) — a quiet way past the drones; chapter 10 (`src/game/story/network.js`: the blast doors
     over the collar at Citadel's station, `W.station.setSealed`) — the collar reached from below while the yard is
     held. Chapter 1's station tour (`src/game/story/chapter1.js`, `W.gate`) keeps the front gate as the only way in, so
     the tunnel opens only from chapter 8 (a flag set when Gilbert, who knows FunFrock's shelters, names the dig's cut).
   - **A shelter in the crisis.** Chapter 8 already has FunFrock's two shelters (`src/game/story/shelters.js`: the fort's
     by the lever, the depot bunker's hatch wheel) and Zoé's plan sends the town underground; the asylum could take the
     families the shelters cannot hold (its halls and cells, the block-house door outside the fort's east wall). Chapter
     9's council cabinet already lists "FunFrock's old tunnels on every island" (`src/game/text/ch9.js`
     `c9_cab_tunnels`), the place for the evidence. Needs: who goes there (a resident group from `citizens.js`), the
     asylum's guards (`lba1EnemyDefs`, posted from the prologue's end) withdrawn first, the people seen there afterwards.
