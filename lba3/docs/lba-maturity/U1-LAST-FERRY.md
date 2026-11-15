# U-1 "The Last Ferry" — as built

The user's own side quest (brief: `DEPTH-PLAN.md`, "The user's five side quests", U-1). Built 15.11.2026 on
`ccr-c1c2c4b9-dep6ed`. **Automated runtime only** (headless Chromium, SwiftShader): nobody has played it, nothing was
listened to, no frame rate is claimed.

## What the player finds and does

Zeelich's terminal island, from chapter 3 on (the old line is our own invention; nothing here is LBA1/LBA2 canon).

1. **The board and the captain.** On the West Pier, where a one-crate stack stood, a sailings board: SKY-FERRY
   "PATIENCE", WEST PIER - MILL LANE, SAILINGS ON THE BELL, a pasted LINE CLOSED strip, chalk: NEXT SAILING ON TIME.
   The ferry (the sky-ferry model that `zeelich.js` always built and kept out of sight) lies tied to the pier. Captain
   Ossel keeps his sailings anyway: on a loop he chalks the board, walks to the rail gap, rings the landing bell, waits,
   sighs, goes back. Talked to, he says the line closed when the shuttles came "and nobody closed the captain"; in
   chapter 3 also that the project grounded everything that flies ("A ferry floats. I checked the form."); the catch
   on the cable drum only lets go from its far side; bridge down first.
2. **The winch house** (behind the gateway's south pillar; a door in its north wall). Inside: a brass plate
   (1. BRIDGE DOWN 2. TRIP THE CATCH 3. RING OFF), the loading bridge's hand wheel, and a partition with one hole.
   The bridge's counterweight hangs in front of the hole while the bridge is up (an interlock: you never free her
   with the bridge up). Behind the partition: the drum, and the catch's red trip paddle facing the back wall.
   - Wrong attempt: the ball thrown at the hole with the bridge up strikes the counterweight (a line, nothing lost).
   - The wheel (both hands on it, `pumpGrip`): the bridge comes down outside onto her deck, the counterweight rises.
   - The ball through the hole onto the paddle: the catch drops, the drum runs, the cable goes slack. Ossel:
     "Twelve years I've rung that bell for nobody." / "You freed her. You ring her off."
3. **The first sailing.** Over the loading bridge; his hand on the telegraph's handle (`setDown`); a 30 s film round
   the south-west cliffs to **Mill Lane Steps** (a new short stage off the south shore below the Cistern Rise, one post
   with its sign and bell). Captain and Twinsen talk (the emotional turn: he kept coming "until the timetable said
   otherwise. It never did."). Holding the skip key ends a sailing at the far berth.
4. **The line runs.** At Mill Lane, Oshra (the glaze trader stuck at the spaceport while the project holds the ships:
   the trader met at the station) and Wick (a Wannie who hates shuttles) step aboard and ride from then on. Oshra
   sells tea on deck: two kashes, magic refilled (no kashes: on the house). The telegraph sails her from either berth;
   the bell at each landing calls her when she is at the other one (she is seen sailing over, the people aboard).
   Each sailing has three lines from Wick, Oshra and the captain; the return sailing its own where there are.

Both stops are on the island's paths on foot (the ferry is not a shortcut): measured bot walks, Mill Lane → West Pier
21 game s; spaceport → West Pier 33 game s.

## How it changes with the story (the "come back in three chapters" test)

| Stage (`ferry.js phase()`) | What is different |
|---|---|
| ch. 3 before the shield (`pre`) | ships grounded; the platform hums; Oshra's kettle "wasn't held" |
| ch. 3 after the shield (`post`) | a ship went over the clouds in a hurry; the platform quiet |
| ch. 4–8 (`mid`) | shuttles fly again, Wick still rides; Oshra's glaze goes by ship, she pours; "not one sailing missed" |
| ch. 9 (`council`) | the deck split over the bore; clerks taking minutes; the council asked for a sailing list |
| ch. 10–12 (`network`) | Baldino's boxes on Oku's mills; engineers drinking it strong |
| epilogue (`late`) | the ground still; the shield crew's tea; the line printed on the council's map |

Lasting change once freed: the board reads RUNNING / TEA ON DECK, the ferry sails, Oshra is no longer at the
spaceport's rail, the winch house's catch is off, the captain has different words.

## Where (files)

- `src/game/skyferry.js` (new): winch house, wheel, partition and port, counterweight, drum, catch, cables; the loading
  bridge, derrick post and bells; the sailings board; Mill Lane Steps; the deck's telegraph and tea crate; per-berth
  deck colliders; the routes (`makeRoute`, `voyage`).
- `src/game/story/ferry.js` (new): state, prompts, talks, the sailing film (a Cinematic), called sailings, phases.
- `src/game/text/ferry.js` (new): English text.
- `src/game/zeelich.js`: the pier's single crate replaced by the board; the ferry model's own plank gangway removed;
  `buildFerry` returns `bob`, `ropes`, `upper` (materials of its own, so the superstructure fades while Twinsen is on the
  foredeck: the follow camera sits over the cabin there), `bobK`, `spin`.
- `src/game/story/index.js`: the module registered (cast, placement before the hostel's, prompts, interact before
  `depth.js`, talk, update, flags, journal, regionBuilt).
- `tests/last-ferry.mjs` (new). Captures: `captures/last-ferry/`.

Object count (no-clutter rule): West Pier +3 (board, derrick post with bell, loading bridge) −1 (crate stack);
behind the gateway +1 (the winch house); south shore +2 (stage, its post with sign and bell); on deck +2
(telegraph, tea crate). Each has a job in the quest; nothing decorative was added.

## Flags (all `dx_lf_`, default absent: an old save loads with the ferry tied up)

`dx_lf_board`, `dx_lf_ask`, `dx_lf_plate`, `dx_lf_reach` (looked through the port once), `dx_lf_bridge`,
`dx_lf_blocked` (throws into the weight), `dx_lf_free`, `dx_lf_first` (the line runs), `dx_lf_at` ('west' | 'mill';
set when a sailing starts, so a save mid-sailing lands her and him at the far berth), `dx_lf_sails`, `dx_lf_heard`
(stages whose sailing lines he heard), `dx_lf_tea`.

## Character knowledge

The passengers only know what the street already says in the same stage (`text/zeelife.js` is the reference): no one
mentions the evacuation list or the shell before the council; `late` lines only in the epilogue (chapters 11–12 use
the network's lines, as nobody on Zeelich knows more yet). Oshra's and Nara's established facts are kept (Xil still
sells Nara's flowers at Citadel's harbour; he was not moved). Captain Ossel and Wick are new people (ours).

## Playtime (estimate, not a measurement of a person)

Bot route on the main parts: board and captain ~1 min including his loop, winch house ~1 min, first sailing 30 s +
welcome, return sailing 30 s. Applying the plan's formula (1.8 × walk, ~60 s a deduction, 200 words a minute):
about **6–8 min** for a first play that finds it, plus 30 s per later sailing taken. Not calibrated against anyone.

## Tests (Automated runtime only)

Run one at a time against a snapshot of this build (machine shared; load 0–8 during the runs):

| Suite | Result | Note |
|---|---|---|
| `last-ferry` (new) | PASS, 29 checks, 875 s | the whole quest by input, both old saves |
| `place-scan` | PASS | first run found the mooring ropes entering the bollards' heads (8 cm): fixed, then PASS |
| `chapter2` (chapter 3, Zeelich) | PASS | |
| `zeelich-life` | PASS | the street's routes, the bakery, the posts |
| `zeelich-doors` | PASS | |
| `save-migration` | PASS | |
| `chapter1` (smoke) | PASS | |
| `interior-life` | FAIL (1) | Zeelich terminal's Velo faces 1.48 rad at a dwell in chapter 9; **the same failure on the build before this change** (run against it): not caused by U-1 |

`tests/last-ferry.mjs` plays it by input from chapter 3's arrival
(walk, board, captain, winch house, wrong attempt, wheel, Save & quit → Continue, ball, bridge, telegraph, film, tea,
return sailing, skip, walk on foot between the stops, bell call, Save & quit during a called sailing, chapters 6, 9 and
the epilogue by flags) and loads two saves written before this change (`new-05`, chapter 3; `base-12`, chapter 9).

## Not paired with ZEE-1 or ISL-3

ZEE-1 lives on the street's heat posts and the burrow grate (`zeelife.js`), the files the laptop's LANDMARKS-KEEP
order may be changing, and has no tie to the ferry; ISL-3 needs the Esmer line on Otringal and Mosquibee, another
island. Neither fits this quest naturally, so U-1 is built alone.

## Left for a human to judge

- Whether the hole and the paddle read from the play camera inside the winch house (a tight room; the shell fades).
- Whether the captain's loop is noticed as "on time" without a clock, and whether his humour lands.
- The sailing film's camera and pace (30 s), and whether the faded superstructure on deck looks right.
- The hashed fallback voices for Ossel and Wick (no voice of their own: `voice.js` was not touched).
- Wick and Oshra stepping aboard at Mill Lane, and the ramp lifting/lowering at the West Pier, seen in motion.
