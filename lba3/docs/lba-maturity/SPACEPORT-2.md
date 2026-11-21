# SPACEPORT-2: Citadel Spaceport, the way in through the terminal

The user's report (P26, 15.11.2026), with a picture of the spaceport from the shore: the footbridge ran from the shore
path straight onto the open deck with the terminal, the kiosk and the pad. "The way in should come from inside the
building, as at a real airport: you go in, through security, and then out to the area you fly from."

Build: base `ccr-c1c2c4b9-dep6ed` (ddc87d0a) plus this work's commits. Evidence: Automated runtime only (headless
Chromium on SwiftShader, 1280×720 captures at deviceScaleFactor 1). No fps claims.

## What changed

**Outside** (`src/game/spaceport.js`):
- The terminal stands across the bridge's end on the deck's west side (`TERMINAL_BLOCK` x −14…−7, z 34…46, 3.8 m,
  the Esmer dome on top). The footbridge (unchanged, x −31…−13.6 at z 40) runs into its west face: the landside
  door, the SPACEPORT name over it, the departures board beside it (north of the door, read from the bridge).
- Its east face has the gate (the same blue door) with a GATE 1 · TOWN sign, onto the painted walkway to the pad.
- The deck's west railing now runs from the deck's corners to the terminal's walls; the bridge's railings run into
  its west face. Every rail's collider overlaps the wall it meets (no gap). The deck is airside: reachable only
  through the terminal.
- What was landside in spirit went landside: the TICKETS · INFO kiosk (Corla) stands on the shore by the bridge's
  foot, its hatch toward the path (`PORT_KIOSK`); it took the place of a flower tub and a planter there
  (`citydress.js`). The departures board hangs on the terminal's landside face instead of standing on the deck.
- `W.spaceport` gained `terminal`, `door`, `gate`, `kiosk`, `board.read`, `airside(x, z)` and `saneSpot(at)`.

**Object count on the deck and the bridge's foot** (NO CLUTTER):

| Thing | Before | After | Note |
|---|---|---|---|
| benches | 3 (two before the old terminal, a red one by the kiosk) | 1 | by the gate, facing the pad (Dov, the family) |
| litter bins | 2 | 1 | at the bench's end |
| flower tubs | 2 on the deck + 1 at the bridge's foot | 0 | |
| planters | 2 on the deck + 1 at the bridge's foot | 0 | |
| potted plant | 1 | 0 | |
| flag poles | 4 | 2 | the two at the old entry went with it |
| sign posts | 2 (shore, deck) | 1 (shore) | the gate's sign says the way to town |
| departures board (freestanding) | 1 | 0 | now on the terminal's west face |
| kiosk, Zeelich map, drinking fountain | 1 each | 1 each | moved: kiosk to the shore, map and fountain by the gate |
| cargo side, lamps, tower, pad | unchanged | unchanged | |

Added: a GATE 1 · TOWN sign on the gate's face (wayfinding for arrivals). Removed: 13 freestanding objects (and the freestanding board, now on the wall).

**Inside** (`src/game/terminal.js`, the hall itself unchanged): the door from the bridge moved from the left wall's
front (beside the gate) to the near front wall at the right, cut away like the rest of that wall (as LBA2 draws a
door in a near wall; the same treatment as the house's front door: blue jambs, a threshold, daylight on the floor).
From the camera the way reads in order: in at the front right, the ticket counter straight ahead (back right),
across the hall past the seats, the security pillars and the gate at the back left. The left wall keeps the
departures board, the GROUNDED notice and the gate; its front stays bare.

**Doors** (`terminalDoors` / `terminalExit`): two outside triggers lead into the hall: the west door to the hall's
door (`R.spawn`), the gate to the gate's inside (`R.entries.gate`). Out: `terminal-out` 1.2 m before the west door on
the bridge facing the shore; `terminal-gate` 1.2 m before the gate on the walkway facing the ship (DOOR-STEP and
DOOR-CLEAR then apply as everywhere).

## The flow

Departing: shore path → bridge → west door → hall (counter: the spaceship's menu from chapter 4) → security pillars →
gate → walkway → pad. Buying at the counter or at Corla's kiosk goes out through the gate under the black, then the
journey film from the pad (`story/islands.js board`, `boardFromKiosk`).

Arriving (by ship to Citadel's landing spot, airside): walkway → gate → hall → west door → bridge → shore.

## The gate by chapter (`story/islands.js gateOpen` / `canExit`, `story/index.js canExit`)

The way in from the deck by the gate is always open (arrivals; old saves on the deck), so nobody is ever shut out on
the deck. Out of the hall by the gate:

| Chapters | Port phase | Gate from the hall | Why (what the game already said) |
|---|---|---|---|
| 1 (well) | grounded | shut | Bern, the port's guard at the gate: tm_grounded ("The Joint Project has grounded them. Project ships only"); with nobody there, the GROUNDED notice's words (tm_gate_shut, new) |
| 2 (project) before Doran's start code | grounded | shut | the same |
| 2 with `c1_ship` (Doran waits by the project ship) | grounded | open | Ama already sends him "out through the gate" (tm_pilot); boarding at the pad → chapter 3 on Zeelich |
| 3 (Zeelich) | grounded | shut | he is on Zeelich; on Citadel the same lines as chapter 1 |
| 4–7, 9–12, epilogue | flying / council / after | open | flights run |
| 8 (evacuation) | evac | open | project ships board by their list at the gate (the hall's queue) |

No story beat needed the deck in chapters 1, 3 or 2 before the start code: the pad's grounded note is still read from
the deck (after a landing or an old save there).

Other story positions checked:
- Chapter 2: Doran waits at (landing −1, +2.6), airside by the walkway: unchanged.
- Chapter 8: the lane's people queue on the bridge (laneline.js, unchanged); the project's guard moved from the deck by
  the old bridge end (inside the terminal's walls now) to the bridge's end beside the door, facing the queue
  (`evacuation.js`); the worker stays on the bridge.
- Chapter 8's and chapter 2's boarding (`c8ship`, `c1ship`) at the pad: airside, through the gate (open then).
- The deck's people (`roomlife.js CITADEL_PORT`): the bench, Dov's look at the ship, the Zeelich map instead of the
  kiosk and the old board, Esren's look over the south rail; the family by the bench. Their planner floor is the deck
  only (the gate a doorway); no stop on the walkway, the pad's ring or Doran's place.
- Corla (`story/stands.js`): KIOSK from `PORT_KIOSK`; her lines unchanged ("save you the queue inside" still true).

## Old saves

`Game.applySave` passes an outdoor spot through `W.spaceport.saneSpot`: a save made where the terminal stands now
(the old deck by the bridge's end, the old board, the old kiosk, the old benches) loads before the west door on the
bridge (west half) or before the gate on the deck (east half); DOOR-CLEAR then keeps it clear of the trigger. Spots on
the bridge and elsewhere on the deck load as they were. Saves inside the hall load in the hall (unchanged).

## Tests

All Automated runtime only (headless Chromium, SwiftShader; `BOOT_TIMEOUT=900000`, one suite at a time on a shared
machine). Base for comparison: ddc87d0a.

| Suite | Result | Note |
|---|---|---|
| tests/spaceport-2.mjs (new) | PASS 21/21 | the bridge reaches the deck only through the terminal (planner, a straight run, 5 runs and 6 running jumps at the bridge's end with the door held shut); door → counter (menu) → security pillars → gate → deck → pad's prompt by input; back by the gate, the hall, the door, the bridge to the sign post; Citadel → Zeelich → Citadel by the pads' menus, landing airside, out through the terminal to the square; the gate shut in chapter 1 (Bern's line), open in chapter 2 with Doran's ship (boarding → chapter 3), open in the evacuation (its guard and worker on the bridge); Corla's kiosk landside sells the seat (→ Zeelich); 7 old saves (old deck by the bridge end, old kiosk, old board, old benches in chapter 1, bridge, landing spot, before the old door) load in play, on a floor, out of the walls, on the expected side |
| tests/spaceport.mjs | PASS 29/29 (before the harness routing commit; two reruns after it crashed the renderer out of memory at the Zeelich → Citadel flight, which spaceport-2.mjs passes with the routing in place) | adapted: the walk from the square ends in the hall; the board read from the bridge; the gate shut before Doran's start code, open with it; the gate's exit is before the gate (not at the landing spot); the edge run holds the door shut |
| tests/citadel-structures.mjs | PASS 7/7 | Corla approached at the kiosk's new place; the tour keeps out of door triggers (the deck's fountain stands by the gate) |
| tests/interior-life.mjs | 143/144 | the one failure is Zeelich's Velo facing (zterminal, chapter 9): known on the base. All Citadel port and terminal checks pass (people on the deck by chapter, their stops clear of the walkway, the ring, Doran's place; the terminal entered by its landside door in chapters 1, 2, 4, 8, 9, 10, the epilogue) |
| tests/travel.mjs | 26/27 | the one failure ("no sky-ferry at Zeelich's dock" in chapter 3) fails the same on the base (26/27) |
| tests/chapter1.mjs | PASS 32/32 | |
| tests/save-migration.mjs | PASS 27/27 | |
| tests/camera-doors.mjs | PASS 4/4 | includes the terminal |
| tests/townlife.mjs | Blocked: the page crashed (renderer out of memory: the kernel killed processes on the shared machine while other agents' browsers ran) | 3 attempts, each crashed at a different point (after 40, 23 and 9 passing checks, none failing) |
| tests/place-scan.mjs | Blocked: the page crashed (renderer out of memory: the kernel killed processes on the shared machine while other agents' browsers ran) | 2 attempts; it builds every area before judging: no result |
| tests/door-sweep.mjs (ONLY=terminal) | Blocked: the page crashed (renderer out of memory: the kernel killed processes on the shared machine while other agents' browsers ran) | 2 attempts (all chapters; CHAPTERS=0,1,3,7): it builds every outdoor region first; the terminal's doors are walked both ways in spaceport-2.mjs instead |

Harness: `tests/lib/player.js` P.go walks through the terminal when the deck and the target are on different sides
(in by the nearest door, out by the other), and P.enter picks the nearest of a room's doors; the playthrough segments
and chapter suites that walk to the pad need no change of their own.

Captures (`captures/spaceport-2/`, 1280×720 jpg, 1.1 MB): before/after of the user's view from the shore path
(`*-1-shore-view`), the landside entrance (`*-2-entrance`), the hall (`before-3-hall`, `after-3-hall-door-counter`,
`after-3b-hall-security-gate`), the gate onto the deck (`*-4-gate-deck`) and the kiosk on the shore
(`after-5-kiosk-shore`). Looked at; not a visual sign-off.

Not covered by a test: combat near the doorway (no enemies at the port in any chapter), death at the doorway (a fall
from the bridge into the bay is the game's usual respawn at the last safe spot; the old deck spots inside the new
walls are never a last safe spot), the door's opening animation (the terminal's doors are drawn shut and are walk-in
triggers like every LBA-style door here).

## Zeelich Spaceport (changed 20.11, P83 item 10)

The user approved the same layout for Zeelich Spaceport (status.md P83 (10)). Done in P83 (docs/lba-maturity/P83-WORLD.md):
the terminal stands across the footbridge's end (`zterminal.js ZPORT_TERMINAL`, x −10…2, z 31…36 in ZPORT's frame), its
door on the north face from the bridge, its gate on the south face onto the deck; the deck's north rail runs into its
walls; inside, the door is in the near wall and the gate in the back wall, as in Citadel's hall. Tested by
`tests/zport-2.mjs`.

## Open points for a human

- Rerun tests/townlife.mjs, tests/place-scan.mjs and tests/door-sweep.mjs (ONLY=terminal) on a machine with memory to
  spare: they crashed here before giving a result (Blocked above).

- Visual review on a real GPU: the terminal's new west face from the shore path (the user's view), the kiosk on the
  shore, the hall's near-wall door.
- Coming out of the gate the follow camera starts over the terminal's roof (the occluder lifts it) before it settles
  behind him on the walkway; worth a look in play.
- The hall's interior is wider than the block outside (16 × 12 m inside, 7 × 12 m outside), as before.
- Zeelich's port: given the same layout on 20.11 (P83).
