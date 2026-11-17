# SPACEPORT-3: chapter 2's end at Citadel Spaceport (P62, P63, P64)

The user's three reports of 17.11.2026, one place and one moment: chapter 2 ends with Doran flying Twinsen to Zeelich in
the project's ship from Citadel Spaceport.

Build: base `ccr-c1c2c4b9-dep6ed` (fafc6b35) plus this work's commits. Evidence: **Automated runtime only** (headless
Chromium on SwiftShader; captures 1280×720). No fps claims, no listening, no visual sign-off.

## P62: Doran's errand, then Doran reliably at the ship

> "The walk of Twinsen and Doran to the spaceport is just walking. Maybe he sends me to do something small first and
> then I meet him there — and without the problem that I can't meet him there."

**The errand** (`story/chapter1.js`, `story/islands.js`, `text/ch1.js` + `text/he/ch1.js`):

1. At the harbour, after Arthur's radio, Doran agrees (`c1_doran_ferry1/2`, unchanged) and adds the reason for an
   errand (`c1_doran_form`): "One thing first. The port lets nobody onto the pad without a flight form, signed at the
   ticket counter. Sign yours in the terminal while I warm her up." Flags `c1_ship` and the new `c1_errand`; he walks
   off up the quay as before (`walkOff`).
2. Objective `c1_obj_form` ("Sign the flight form at the spaceport's ticket counter"); the map's star on the terminal's
   landside door, labelled "Ticket counter".
3. In the terminal: the counter's prompt (or a word with Ama) — Ama brings out the form ("Doran's flight? He came
   through a minute ago…"), Twinsen reads his line ("Passenger: Twinsen. Destination: Zeelich."), then **signs it with
   his hands on the counter** (`use` toward the counter's top, a paper sound), Ama stamps it (a clunk) and sends him to
   the guard at the gate. Flag `c1_form`; the Flight Form in his things (`it_flightform`, the stamped-card look); a
   journal line (`c1_j_form`); objective `c1_obj_board` ("Meet Doran at the ship, out through the gate"); the star on
   Doran.
4. **The wrong move**: straight to the gate without the form — the gate does not open; the port guard (Bern) says
   "A project flight? Then you'll have a signed flight form. Ama at the ticket counter does them; I only read them."
   (with nobody at the gate: a card on it says the same, `c1_gate_form`). Talked to with the form: "Signed and stamped.
   Through you go." Ama asked again after signing: "You're all stamped…".
5. Out by the gate: Doran is at the fuel cart beside the ship, both hands on its panel, warming her up; a word with him
   or E at the ship boards them (`c1_doran_board`, unchanged) → chapter 3 on Zeelich.

Length: about 1–3 minutes on top of the walk (the counter is on the way: the walk now has a goal).

**Doran reliably there**: his chapter-2 place once `c1_ship` is set is one spot, `APRON.fuel.stand` in
`spaceport.js` (−1.38, 44.4, facing the cart; anim `tinker`), read from `place()` only: nothing about it is saved, so a
Save & quit → Continue, a chapter-2 load, any order of doing things all put him there. While he is still on his walk
from the harbour the walker hands over to that spot as soon as neither he nor it is on screen — and the deck can only
be reached through the terminal (a room: off screen), so he is always at the cart when Twinsen comes out of the gate.
From the gate's way out he is 6 m ahead to the right, in the camera's view (tested).

**Saves**: a save from before this work with `c1_ship` set (Doran already told him "Meet me at the spaceport") has no
`c1_errand`: the gate opens as before and the objective stays `c1_obj_ship` — no errand nobody gave him. The new flags
are plain booleans in `flags` (no save-format change).

## P63: the terminal's gate on the side it is outside

> "In the terminal hall the gate to the deck is drawn on the hall's LEFT wall, but outside the building the gate door is
> at the BACK of the building."

Outside, the landside door is in the terminal's west face (from the footbridge) and the gate in the opposite (east)
face. Inside, the landside door is in the near (front) wall; the gate was in the left wall's back end. Now the gate is
in the **back wall** (`terminal.js` `TERMINAL_PLAN.GATEX` −6.4, the back wall z −6), across the hall from the door —
as outside. The security pillars stand either side of the way through (turned so their screens face the hall and the
gate), the GATE · PAD 1 sign over it, daylight from the deck in the doorway and on the floor before it. The left wall
keeps the departures board and the GROUNDED notice. The walk and the security line read in order from the camera: in at
the front right, the counter straight ahead, across the hall down its left side to the pillars and the gate.

Moved with it: the port guard's place by the gate (`TERMINAL_PLAN.guard`, at the gate's right a step into the hall),
the evacuation's queue (`roomlife.js` TQ: the guard with the list, the queue toward the front clear of the café's chairs
and the board's reading spot, the one turned away by the inner pillar), the project's list sheet on the inner pillar.
The gate's way in from the deck (`R.entries.gate`) a pace past the pillars facing into the hall; its exit outside
unchanged: 1.2 m before the east face, **facing away from the terminal** toward the ship (tested).

## P64: the apron alive, with purpose

> "The spaceship pad part is very empty and sad."

Each new thing is for a job somebody does there (`spaceport.js` `APRON`, people `roomlife.js` `CITADEL_PORT`):

| Thing | Where | Who works it | Chapters |
|---|---|---|---|
| fuel cart: yellow tank on a wheeled chassis, control box with a lit panel, hose reel | south of the walkway's end, beside the ship | Pema the fueller (panel, the coupling at the ship's port, the hose on the deck); chapter 2: Doran warming the project ship | Pema: flights running, the evacuation |
| fuel hose: run out over the deck into the ship's fuel port, or hung on the reel | cart → the hull's south-west face | — (`setWork`: 'run' while a ship is readied, 'idle' while grounded) | run: chapter 2 with Doran's ship, flights, evacuation; idle: grounded |
| fuel port: a brass socket on the hull's red rim | the hull's south-west face | Pema | all |
| tool trolley with the checklist on a clipboard, a spanner, a toolbox | the ship's south-east | Rhun the technician (the list, two hull checks) | all chapters (grounded ships get checked too) |
| loading pallet with two crates | the ship's north side | Gurt (crates from the cargo side's stack to the pallet, the hold's side of the hull) | all chapters |
| boarding line: three brass posts and a red rope | the walkway's north edge near the pad | Kesa and Brin, travellers with cases, wait at it | flights running |
| walkway edge lights (blue studs), hazard bar across the walkway's end | the walkway, before the pad's ring | — | all |

Grounded chapters keep the grounded notice's emptiness: no fueller, no travellers, the nozzle hung on the cart; Gurt
and Rhun still at work, Dov on his bench (chapter 2: and Doran at the cart). Lines for every new person by the port's
state (`text/interiors.js` + Hebrew `rs_rhun_*`, `rs_pema_*`, `rs_kesa_*`, `rs_brin_*`); voices by sex (`voice.js`).
NO-AIR: every work stop is at a thing (the cart's panel top, the hull's face, the trolley's top, the pallet's crates,
the fountain, the ground for the hose).

Removed: nothing. Gurt's old ship stop reached into the air 6.5 m from the pad's middle: now at the hull's face.

**Draw calls** (one frame, the deck view from before the gate toward the pad and from the south, default quality, 1280×720,
SwiftShader; `/dev/shm/t977-tools/shots.mjs`): see the table in "Results". Static pieces are vertex-coloured into the
port's existing merged materials (and Citadel's draw batches); the hose's two states are kept apart (one draw each,
only one shown); the people are the most of the rise.

## Results

(filled in below from the runs)

## Files

- `src/game/spaceport.js` — `APRON`, the fuel cart, port, tool trolley, pallet, boarding line, edge lights, hazard bar,
  the hose's two states and `setWork`
- `src/game/terminal.js` — the gate in the back wall (`GATEX`), pillars, sign, daylight, guard's place, list sheet
- `src/game/roomlife.js` — the evacuation queue by the new gate; Gurt's round; Rhun, Pema, Kesa, Brin
- `src/game/story/chapter1.js` — the errand (`c1_errand`, `c1_form`), `portCounter`, `signForm`, `talkFirst` (Ama,
  the guard), Doran's place at the cart, objective, markers, item, journal
- `src/game/story/islands.js` — `gateOpen` (the form), `formWanted`, `canExit`'s line, `portLook`, the counter's hook
- `src/game/story/index.js` — `isles.portLook()` each frame (a change only on a change)
- `src/game/text/ch1.js`, `text/he/ch1.js`, `text/interiors.js`, `text/he/interiors.js`, `src/game/he-text.js`
- `src/engine/voice.js` — the four new people's sex for their voices
- `tests/spaceport-3.mjs` (new), `tests/spaceport-2.mjs` (the pillars' place), `tests/interior-life.mjs` (the cast's
  count, the port's people by chapter, the crew's ring exemption, Doran's new place), `tests/lib/player.js`
  (`P.portForm`: the harness's walk through the terminal signs the form first, as a player following the objective)
- `docs/lba-maturity/BUILDING_REGISTER.csv` (the terminal's row)
