# P83 world items 9 and 10: the School's court, Zeelich Spaceport

The user's decisions of 20.11 (status.md P83, items 9 and 10). Base `ccr-c1c2c4b9-dep6ed` (f6fb06a8) plus this work's
commits. Evidence: **Automated runtime only** (headless Chromium on SwiftShader, one browser at a time). Captures were
looked at; nobody has played these changes, and no frame rate is claimed.

## Item 9 (P41): Tali's court moves with the School of Magic

SCHOOL-S28 was already in the build (commit 7a5dddef, 16.11): the School of Magic is the mask in S28's canyon, its
door on LBA2's door zone, its interior, door and return unchanged. What was held was U-3's court, which stayed behind
the old pool mask. Now it stands on the School's back terrace:

- **Where:** the terrace behind S28's ridge, north-west of the mask (desert local x −10…0, z 14…28), west of the sand
  track that runs north from the ridge and north of the sand yacht's line. The court moved as one piece, unturned, by
  (+70.6, +98.4) m (`desertold.js COURT`).
- **What was built there:** what bounded the old court, at the same relative places: the two whitewashed blocks
  (the wall Tali's X is on), a rock on its east side in the old School rock wall's stone, and the boulder at its corner.
  The ground is held level at 4.6 m over the yard (`courtAt`, desert.js heightFn) and kept clear of rocks, scree,
  shrubs, cacti and the grey outcrop colouring. Every throw therefore flies as it did; the windows the test measured
  after the move are 6° (game 1), 8° (game 2), 3.5° (her way), 8–9° (off the board).
- **What stays:** the pool mask keeps its own two white blocks (the original's bodies 46). Old saves have no court
  position in them (the court's state is flags only); a save standing on the old court loads there, on open sand.
- **Text:** the journal line says "Tali's game behind the School" again (EN and HE; `node tools/he-bundle.mjs`).
- **Cost:** in the island's batch, with materials it already had: the desert region has the same 434 meshes and 214
  materials before and after, +980 triangles, +4 colliders, no lights (measured on the built region).

Files: `src/game/desertold.js` (COURT, courtAt, courtClear, COURT_ROCKS, the yard), `src/game/desert.js` (the level
yard, the clutter kept off), `src/game/offwall.js` (OWC moved), `src/game/story/offwall.js` (her facing from OWC),
`src/game/text/offwall.js`, `src/game/text/he/offwall.js`, `src/game/he-text.js`, `tests/off-the-wall.mjs` (the court's
spots read from the game; the walk now starts at the School's door), `docs/lba-maturity/U3-OFF-THE-WALL.md`.

## Item 10 (P26): Zeelich Spaceport gets Citadel's layout

As SPACEPORT-2 on Citadel: bridge → landside door → hall (ticket counter → security pillars) → gate → deck and pad, and
the same way back; the deck is closed from the bridge.

- **Outside** (`zterminal.js ZPORT_TERMINAL`, travel.js): the terminal now stands across the footbridge's end
  (ZPORT frame x −10…2, z 31…36, 5.4 m), half over the clouds on its own floor and two stilts, half on the deck. An
  Esmer building in the street's LBA2 look (the pavilion's stucco, glass-block band, teal-glass windows, faceted aqua
  cap): its north face has the door from the bridge with SPACEPORT over it, its south face the gate onto the deck with
  GATE · PAD 1. The deck's north rail runs from its corners into the terminal's side walls, the bridge's rails into its
  north face (each collider 0.1 m into the wall). The old pavilion on the deck's corner is gone; the ZEELICH SPACEPORT
  board went landside, onto the shore by the bridge's foot.
- **Inside** (`zterminal.js`): the door is in the near wall at the front right (cut away, turquoise jambs, a threshold
  and a step, daylight), the gate in the back wall at the left end between the security pillars, PAD · TWINSUN over it:
  opposite each other, as they are outside, and as in Citadel's hall. The counter, the board, the seats, the arrivals
  deck and the lifts are unchanged; one plant moved off the way in. The guard's spot, Pask's gate stop and the two
  council guards' stops follow the new door and gate (`roomlife.js`).
- **Doors:** two outside triggers: the door leads to the hall's door (`R.spawn`), the gate to the gate's inside
  (`R.entries.gate`). Out: `zterminal-out` 1.2 m before the door on the bridge facing the shore; `zterminal-gate` 1.2 m
  before the gate on the deck facing the pad. The gate opens from the hall in every chapter, as before (Zeelich's
  terminal had no shut gate; nothing in the story needs one).
- **The pad and the chapters:** the pad, its ship, its travel point and the Board prompt are unchanged. The landing
  spot moved 0.6 m south, to 1.4 m before the gate, facing it (travel.js `ZPORT.land`): chapter 3's arrival, chapter
  9's council arrival, chapter 10's flight and every ship arrival land there. Chapter 3's guard, who meets the ship,
  stood 1.8 m ahead of the landing (inside the terminal's walls now): he stands beside Twinsen, facing him
  (`story/chapter2.js`). Doran's spot is unchanged. The deck's travellers (Ennu, Oshra) keep out of the walls; Ennu
  looks at the gate instead of the old board.
- **Old saves:** `Game.applySave` passes a spot saved on Zeelich through `R.spaceport.saneSpot`: a spot inside the new
  walls (the old deck at the bridge's end, the old board, the old bridge's last metres) loads before the door on the
  bridge (north half) or before the gate on the deck (south half); everything else as it was.
- **Harness:** `tests/lib/player.js` P.go walks through Zeelich's terminal as through Citadel's when the deck and the
  target are on different sides. `tests/travel.mjs` puts him 6.2 m from Zeelich's pad (8 m is the gate's face now).
- **Reused from Citadel:** the door/gate contract (two triggers, `entries.gate`, exits facing away), `saneSpot`, the
  rails into the walls, the near-wall door and its daylight, the gate in the back wall. `esmerBuilding`
  (props-esmer.js) takes `backDoor` for the gate.

## Tests (Automated runtime only; SwiftShader; GAME_URL http://localhost:8198/)

| Suite | Result | Note |
|---|---|---|
| tests/off-the-wall.mjs | PASS 24/24 | the court at its new place: the walk from the School's door (40 game s), all three games by input, Save & quit → Continue, the court, chapters 7, 10 and the epilogue, three old saves |
| tests/wizards.mjs | PASS 6/6 | the School's door at S28, in, Ker'aooc, out |
| tests/dialogue-check.mjs | PASS | Hebrew 100 % |
| tests/zport-2.mjs (new) | PASS 19/19 | the bridge reaches the deck only through the terminal (planner, a straight run, 5 runs and 6 running jumps with the door held shut); door → counter (menu) → pillars → gate → deck → pad prompt by input; back by the gate, the hall, the door, the bridge to the street; Zeelich → Citadel → Zeelich by the pads' menus, landing before the gate, out to the street; chapter 3's arrival (Doran and the guard on the deck, out of the walls); 8 old saves |
| tests/chapter2.mjs | PASS 21/21 | |
| tests/travel.mjs | 24/27 | the same three fail on the base f6fb06a8 (run here, 24/27): the sky-ferry at Zeelich's dock in chapter 3, chapter 8's ship prompt (an NPC ranks first), the Ballastra ship rides (no menu item) |
| tests/spaceport-2.mjs | PASS 21/21 | Citadel's (the harness's routing changed) |
| tests/save-migration.mjs | RESULT_SAVE | |

Not run: tests/spaceport.mjs (its Zeelich lines were reworded: "pavilion" → the terminal's door), interior-life.mjs,
place-scan.mjs, door-sweep.mjs, desert-life.mjs, purposes.mjs.

## Cost (Automated runtime, renderer.info at fixed views, before = f6fb06a8, after = this work)

Draw calls / triangles per frame (all passes), the hero standing still, 1280×720, SwiftShader:

| View | Before | After |
|---|---|---|
| Desert: the court's place behind S28 (play camera) | 183 / 195k | 209 / 231k (the court's own pieces, which stood at the pool mask before) |
| Desert: the pool mask's terrace (free camera) | 249 / 273k | 238 / 272k (the court gone from there) |
| Desert: the School, wide | 255 / 361k | 276 / 378k (the court now in this view) |
| Desert region, built: meshes / materials / triangles / lights | 434 / 214 / 395.6k / 0 | 434 / 214 / 396.6k / 0 |
| Zeelich: the deck, play camera | 483 / 187k | 461 / 186k |
| Zeelich: the port, wide | 1227 / 844k | 1229 / 852k |
| Zeelich: the port from above | 730 / 469k | 732 / 478k |
| Zeelich: the bridge | 556 / 282k | 558 / 290k |
| Zeelich's terminal hall | 68 / 66.1k | 69 / 65.9k (the doorways' daylight: one mesh) |

No light, pass or per-frame work was added. The two door boards outside (+2 meshes) and the hall's daylight (+1) are
the only new draw calls; the court's yard is in the island's batch with its own materials.

## Captures (`captures/p83-world/`, 1280×720 jpg)

School: `school-before-*` (the court at the pool mask; the terrace behind S28's ridge, empty; wide), `school-after-*`
(the court on the terrace, play camera; wide; the pool mask's terrace without it). Zeelich: `zport-before-*` (the
bridge, the deck, wide, top, the hall), `zport-after-*` (the same, plus the door face from the shore and the gate face
from the deck).

## Left for a human

- Look at both places in play on a real GPU: the court's rock and blocks on the terrace, the terminal's two faces.
- Whether the court is found: it is behind the ridge, out of sight from the School's door (Tali's bell is the clue).
- Zeelich's terminal is 12 × 5 m outside and 18 × 12 m inside (Citadel's is 7 × 12 outside, 16 × 12 inside).
- status.md rows P26, P41 and P83 are the coordinator's to update.
