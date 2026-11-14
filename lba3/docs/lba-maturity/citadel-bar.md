# The Citadel bar: what a finished region has

The user (7.11.2026): "it's not only Zeelich — the whole game must be at Citadel's level." This is that level, as a
checklist for every region (Zeelich and its islands, Desert Island, the Hamalayi, the deep installation). It is written
from what Citadel has in the current source and its tests. It does not claim Citadel is perfect. Each line names
what to check and how.

Labels as in `PROJECT_CONTRACT.md`. Cloud evidence is SwiftShader in headless Chromium: pictures are looked at, not
played; no frame-rate claims.

## 1. Camera and scenery (VP-10)

- [ ] **Nothing fades or turns see-through outdoors.** Buildings stay solid. When one hides Twinsen, the next shot
      rises over it (LBA2's SearchCameraPos): `src/engine/occlude.js`, `src/engine/camera.js`.
- [ ] **The camera reads tight shapes, not loose collider boxes.** Walls up to the eaves or coping, sloped roofs,
      towers and domes as solids of revolution, chimneys. Citadel: `town.js` and `island.js` register them in `W.occ`.
      An outdoor room (Zeelich, the isles, Desert Island, the Hamalayi) keeps its own `R.occ`: `src/game/roomocc.js`.
- [ ] **The only fade is a roof he is standing under.** Citadel has Nell's lean-to (`townlife.js`). Zeelich has the
      council house's porch (`zeelich.js`).
- [ ] **Collisions stay.** A change in what the camera sees never removes a collider.
- [ ] **Checks:** pictures from Follow and Medium while walking the streets and up to each door, behind every big
      building (probe `zcam.mjs` / `zreg.mjs` in the worker's scratchpad: hidden rays, camera-inside, arm, pitch).
      Suites: `camfollow` (4 known base failures), `camclear`, `camera-doors`.

## 2. Doors and interiors

- [ ] **Every accessible building has a real door that leads in, or is visibly closed for a stated reason.**
      Citadel has Twinsen's house, the tavern, the pharmacy, the ticket office, the neighbours', Nell's, the baggage
      claim, the terminal, the lighthouse and the wizards' houses. (Wave 3's probe, chapter 2: no Citadel house or
      shut door answers the generic "Locked." any more; `citadel-structures.md` lists them with the small structures.) Visibly closed means
      story-locked, a ruin, or distant scenery. It must never be a generic "Locked." over missing work.
- [ ] **A compact, furnished, lit interior that fits the owner.** Use the `RoomBuilder` shell (`interiors.js`), the
      dressing pieces in `props.js` and `roomdress.js`, its own lights, and music per place (`R.music`).
- [ ] **The way back out.** He comes out 1.2 m before the same door, facing away from it, on the ground. The follow
      camera lands outside the door without hanging under the eaves (`Game.doorStep`).
- [ ] **A save inside comes back inside.** He stands on the floor. An old save never crashes.
- [ ] **Roof and wall cutaways inside, as in LBA1 and LBA2:** the near walls are low rims and the far walls stand.
- [ ] **Checks:** a test that enters every door in the region and comes back out (`tests/zeelich-doors.mjs` is the
      template), `lba1rooms`, `transitions`, `interior-life`.

## 3. People

- [ ] **Purposeful residents with rounds.** A walker needs a reason to be there: a trade, a delivery, maintenance or
      an office. Citadel: `citizens.js`, `walkers.js`, `townlife.js`. Avoid cloned idle crowds.
- [ ] **A few memorable recurring people.** Their lines change with the story's phase, and you can see what story
      events did to them. Citadel: Mira, Gilbert, Pippa and the household rounds. Zeelich street: Snuff, Bzizz,
      Pelleck, Grumm, Tavo, Nara, Oku, Lissa and Wenna.
- [ ] **Own dress.** People who share a model get their own clothes and hair automatically (DRESS-1, `characters.js`).
- [ ] **Rooms have their keeper and regulars.** A room is empty only when the story empties it (R3).
- [ ] **Checks:** `world-consistency` (residents per area and chapter), `residents`, `walkers`, `interior-life`,
      `cast-rounds`.

## 4. Ground, props, routes

- [ ] **Grounded props.** Nothing floats or sinks. No two surfaces share a plane (`overlaps`).
- [ ] **No slide traps.** Steep spots resolve without a respawn or a life lost (`slidetraps`).
- [ ] **Routes stay open.** Every required route can be walked normally (`jumpreach`, the chapter suites).
- [ ] **Purposeful props only (R11).** Each place gives something to the journey: a hint, a find, a person, a shortcut.

## 5. Identity and resemblance

- [ ] **Kept original places resemble the original.** The target is 85/100 on the curator's rubric
      (`WORLD_RESEMBLANCE_TEMPLATE.md`). Only the laptop's reference curator, who has the original files, can score
      it. Unscored means unverified.
- [ ] **New places carry the world's identity, not an invented original.** Zeelich's terminal island is a new city
      (the user, 7.11.2026). It is scored on the rubric without the geography and landmark parts: Esmer architecture,
      palette and materials, the cloud sea and the light, vegetation, the Esmer and Quetch inhabitants, and everyday
      interactions, measured against Otringal, Celebration and Knartas.
- [ ] **Twelve-year changes have a story reason** (`docs/TWELVE_YEARS.md`).

## 6. Story and saves

- [ ] **Each chapter in the region:** an objective, an obstacle, a discovery, a consequence, safe retries, and a
      reachable next chapter (the chapter suites and `story-journeys`).
- [ ] **Quest and save IDs are kept.** New state goes under new flags, and old saves load
      (`save-migration`, `saveslots`, `resume`).

## Where each region stands (this wave)

| Region | VP-10 camera | Doors | People | Evidence |
|---|---|---|---|---|
| Citadel | yes (W.occ) | done (see above) | done | the bar itself |
| Zeelich street (terminal island: a new city, Zeelich identity) | yes (R.occ: houses, domes, minarets, mills, watch house; the other tall solids automatically) | 3 houses, the bakehouse, the workshop in every chapter from 3; the council house, the mills and the project's two huts give their own reason | + Lissa, Wenna | Automated runtime (`zeelich-doors`, the probes) |
| Zeelich's islands | yes (automatic, from their solids) | Otringal's bar and hotel, Celebration's temple; wave 3: 55 more houses lead in (`ihomes.js`), 3 stay shut with their own reason and a sign | the PEOPLE-1 residents + 6 keepers | `island-doors` (Automated runtime only) |
| Desert Island | yes (automatic) | wave 3: Kesh's 5 houses and the post's 3 cabins lead in | Kesh's life | `island-doors` (Automated runtime only) |
| Hamalayi | yes (automatic) | not inventoried this wave | | probe only |
