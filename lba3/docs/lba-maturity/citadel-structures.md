# Citadel's small structures: what each one does (wave 3, buildings-interiors, 7.11.2026)

The user's report P3 (7.11, a photo of the spaceport deck): "another structure that's just there". The TICKETS · INFO
kiosk had nobody in it and did nothing. This sweep lists every Citadel structure a player could read as usable
(kiosks, stalls, booths, sheds, carts, stands, notice boards, counters) and what it does now.

How the list was made: a runtime probe stood Twinsen in front of each structure, facing it, and recorded what the game
offered there (`findInteractable`). It covered every `W.cityDress.items` piece that is not a bin, tub, bollard, bench,
planter or sign post, the spaceport deck's furniture (`spaceport.js`), the houses' doors (`W.houses`), the shut doors
(`W.shutDoors`) and the two harbour sheds (`island.js`). Probe: `probes/cit.js` in the worker's scratchpad. Code:
`src/game/story/stands.js` (CITADEL-STANDS), text `src/game/text/stands.js`. Test: `tests/citadel-structures.mjs`.

Labels as in `PROJECT_CONTRACT.md`. Cloud evidence is SwiftShader in headless Chromium, and nothing here was played by a
person.

| ID | Where (x, z) | Before | Now | Evidence |
|---|---|---|---|---|
| spaceport-kiosk (TICKETS · INFO) | (−10.4, 45.5), hatch to the walkway | empty, no prompt | **Corla**, the port's information clerk, behind the counter in every chapter (own dress, `clerk` model). Ch. 1–3: grounded (her own line in ch. 1, ch. 2 with or without Doran's project ship, and ch. 3). Ch. 4–7 and 9–12, epilogue: she sells the seat, and her talk ends in the spaceship's menu (a pick flies him to Zeelich Spaceport). Some chapters have their own line: the ferry seized (5), people from the north (6), the council's checks (9), the inventor's crates (10), the fort's shut gates (11–12), return tickets (epilogue). Ch. 8: no seats; the project's list, water and directions | Automated runtime only (`citadel-structures`: ch. 1 talk, no menu; ch. 5 talk, menu, flight to Zeelich; ch. 8 no menu). Picture `bld/cs/kiosk-ch1.jpg` |
| spaceport-infostand (island map) | (−7.7, 44.1) | no prompt | Read: how Zeelich's islands are reached (Zeelich Spaceport, then the Esmer shuttles) | Automated runtime only |
| spaceport-fountain | (−0.9, 32.2) | no prompt | Drink: dry while the well is (ch. 1, ch. 2 before the valves), warm in ch. 2, cool after. A drink gives back 2 life points, at most once every 20 s | Automated runtime only (dry in ch. 1, life back in ch. 5) |
| spaceport-handcart (cargo) | (7.6, 28.6) | no prompt | Look: tagged ZEELICH SPACEPORT, HELD while grounded, CHECKED once the ships fly | Automated runtime only |
| spaceport departures board | (−11.2, 36.2) | read (`port_board`) | unchanged | probe (offer: sign) |
| spaceport terminal | (−2.5, 32) | door → `terminal` | unchanged (Ama at the counter inside) | `door-map.md`, `spaceport` |
| spaceport control tower | (10.5, 50.5) | no door drawn, no prompt | unchanged: a tall glazed tower with no door at its foot. It does not read as a way in (exception: no entrance) | probe (no offer); Source-reviewed only |
| spaceport luggage trolleys, cargo crates, barrel | the pad's far side | no prompt | unchanged: loose cargo where Gurt the mechanic works (his round goes to them). Not structures | Source-reviewed only |
| square notice board | (−36.0, −15.2) | no prompt | Read: the town's notices, by its state: well dry (ch. 1–2), the heat posts (ch. 2), the spaceship and the tremors (3–7), the evacuation (8), the return (9–12), the welcome home (epilogue) | Automated runtime only (the text differs between ch. 1 and ch. 5) |
| lane notice board (by the harbour path) | (−43.1, 34.9) | no prompt | Read: the harbour's notices, by the same states (the ferry, Doran's boats in the evacuation) | Automated runtime only |
| square infostand (town map) | (−50.8, −1.6) | no prompt | Read: where the fortress, the harbour, the footbridge to the spaceport, the lighthouse road and the Whispering Cliffs are | Automated runtime only |
| lane drinking fountain | (−43.4, 37.4) | no prompt | Drink, as the deck's | Automated runtime only |
| lane handcart (flour sacks) | (−58.4, 30.2) | no prompt | Look: Chez Luc's flour (DO NOT SIT ON) | Automated runtime only |
| quay handcart | (−113.4, 46.0) | not placed in this build (citydress.js skipped it: no room) | its line is ready if it is placed again | Source-reviewed only |
| Doran's shed | its door (`W.harbourShed.door`), on the quay | a drawn door, no prompt | Shut, its own line: nets, oars and a padlock; Doran keeps the key round his neck (a private store, the reason shown) | Automated runtime only |
| harbour master's shed (pier's foot) | its door, east face (`W.pierStart` + (1.9, 4.4) m) | a drawn door, no prompt | Shut, its own line: ropes, buoys, tide tables; its key hangs in Odile's customs booth | Automated runtime only |
| customs booth (Officer Odile) | (−110.7, 36.3) | Odile, the held crate | unchanged (townlife.js) | `townlife` |
| Nell's stall | (−103.8, 34.4) | Nell | unchanged | `townlife` |
| Pippa's stall, Tibbo's counter | the square | the keepers, shops | unchanged (story/shops.js) | `shops` |
| the pump, the trough, the beds, the boat box, the held crate | the square, the lane, the quay | each has its prompt (townlife.js) | unchanged | `townlife` |
| the statue's plaque | the square | read | unchanged (story/purposes.js) | `purposes` |
| Tibbo's house (`stone`) | door (−26.8, −20.2) | own line: the note on the door says he is at his counter | unchanged: a private home with the reason shown (Tibbo is at his counter by Pippa's stall) | probe |
| the porch upstairs (`stoneup`) | (−25.5, −33.6) | own line: bolted from the other side | unchanged: a story pointer (the way in is from below) | probe |
| FunFrock's passage, north and south | (−25.9, −85.6), (−26.8, −61.6) | own lines: barred, bolted from below | unchanged: story locks | probe |

Every Citadel house door is either a way in (Twinsen's house, the tavern, Mr Bazoo's, the ticket office, the
pharmacy, the neighbours', Nell's, the baggage claim, the water office, the sewer, the terminal, Tralu's cave behind
the plateau's door) or answers with its own reason. The probe found none that says the generic "Locked." (chapter 2
state).

## Not done here

- The control tower and the depot's containers stay as scenery (no entrance drawn). The depot is the story's
  (chapter 2's patrol).
- No one has listened to Corla's voice or played the kiosk in a real browser on a GPU.
