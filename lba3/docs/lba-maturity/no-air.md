# NO-AIR — nothing done in the air (the user, 10.11.2026)

"The opening film isn't polished enough: the people at the harbour, Arthur and Twinsen — the actions they do in the air."
"And in general, in the whole game, don't do things in the air."

**Status: Automated runtime only.** Headless Chromium on SwiftShader; the opening stepped on its own clock at 1/30 s.
No frame-rate claim. Nobody watched it at speed on a real GPU, and nobody listened. The machine was shared with other
runs while this was measured (load 15–25 on 4 cores): timings in the logs are not the game's.

## What "in the air" is, and how it is measured

A hand action must be on a real thing, and feet on the ground. Measured against what is drawn, not against colliders:
`tests/lib/contact.js` (page side, `window.CT`) gives the least distance from a hand's probe points — the wrist bone,
the palm, the fingertips, and the vertices of whatever rigid thing the hand holds (a screwdriver, a mast) — to the
nearest triangle of any visible rigid mesh that is not the person's own body. A sole's height is the foot bone over
the physics' ground under it, less the rig's ankle height.

## Phase 1 — the opening film (src/game/story/opening.js)

Real-time, in-engine; 88 s; the shot times, the lines, the flags and the music cue are unchanged. Before/after of the
changed beats, cut from the film's own frames at the same scene times: `captures/opening/no-air-before-after.jpg`.

| Beat (scene s) | Before (measured) | What was done | After (measured) |
|---|---|---|---|
| The worker "at the lift's control" (14.2–16.9, 20–23.3) | There was no control. His right hand hung 14–60 cm from anything (median 33 cm from the mast). | The lift has a control (island.js `cargoLift`): an iron box on the mast's landward face with one lever in a slot — off, hoist, swing-and-lower; `pose(u)` puts the lever where the cycle is. His **left** palm (the camera's side) is on the knob; the lever is thrown under it as the motor starts (14.2) and again as the boom swings (20.7, under the drill's cutaway). | Hand to lever 0.9–1.0 cm through both holds (141 frames, max 1.0 cm); the lever moves 0.42 rad under it twice. |
| The crate set down (25.6–28) | It came down by itself; he bowed to it afterwards with one hand: right hand 2.5 cm from it only from 27.0, left 31–36 cm. | He meets it as it comes down, both palms on its top's near edge, and goes down with it to the deck (the thump), bending as it lowers; then his right hand goes to the hook block and he straightens. | Both hands 0.1–0.7 cm from the crate over the last 30 cm of its descent (64 samples, max 0.7 cm); deepest hand point inside the crate's box 1.5 cm (the fingertips' probe on the top's edge). |
| The resident's question (14.9) | Both forearms held up in front of him, as if he carried a box. | One gesture: a thumb back over his shoulder at the harbour row he asks about. | A pointing gesture, not work; no contact expected. |
| The resident's walk off (26.4–28.5) | His walk ended with his left foot over the pier's edge (the sole 7.8 m "over the ground": the sea). | The walk ends 0.3 m in. | Feet on the deck. |
| Twinsen "mending the lamp" (29–31.6, 35.2–46.2) | Fists at chest height over the table: the screwdriver 22 cm from anything, the left hand 27 cm. | The lamp has what he mends (interiors.js): a brass collar on its stem held by one screw on his side. The screwdriver's tip sits in the screw, its shaft in line with it; each stroke of his wrist turns the screw a radian and it goes in (6 mm over the scene), the tip lifting a hair as the wrist comes back. His left hand is on the lamp's shade. The strokes stop while he looks over at Arthur. | Tip to screw ≤ 0.8 cm in the strokes (0.7 cm is the lift between strokes); left hand 1.1 cm from the shade; the screw turns 10.3 rad and goes in 5.9 mm. |
| The screwdriver laid down (66.65–67.15) | It left his hand 11 cm from where it then lay (a jump in one frame). | His hand is solved to hold the tool exactly where it will lie; it lies by the table's near edge now, pointing away from him. | It moves 1.4 mm as it leaves his hand. |
| Arthur at his boat (29–58) | Kneeling, his hands were 21–46 cm (right) and 29–41 cm (left) from anything: the hull lay on the floor, half a metre under them. The mast "fitted" by jumping 64 cm from his hand to the hull at 36.2. | The boat stands on a low crate, his building stand, its deck at his hands' height. His left palm holds the hull by the stern. The mast is upright in his right fist: it rests on the deck by its step as he tries it, goes up as he shows it ("Dad! The mast fits!"), comes down over the step and in — home at 36.2, the click — he holds it a moment and lets go; then that hand rubs the deck by the bow. | Left hand 0.1–0.5 cm from the hull; the mast is 0.8 mm from its fitted place while still in his hand and moves 0.8 mm as he lets go; right hand ≤ 1.0 cm from the deck afterwards. |
| Zoé at the seed tray (29–39.5) | Right palm 0.9–19 cm (median 6.5), left 8.5–17 cm (median 14) from the tray. | Her palms press the soil of the two pots she is filling, in turn. | ≤ 1.4 cm (both hands); her right hand comes up to 5 cm off while she turns to look at Arthur (36.4–37.6), which is not counted. |

Under it: the opening's arm solver moved to `src/engine/handik.js` (shared with Phase 2); the scene's actors do not
get the game's own hands-on-things layer while the scene runs.

`tests/opening.mjs` item 11 checks each of these per frame (limits: 3 cm for hands, 5 mm for the mast's seat and its
release, 9 cm for a standing sole).

## Phase 2 — the whole game

### The sweep: tests/no-air.mjs
For every chapter (and the chapter states that move people or change what stands at their stops: 21 states), with
every area and room built, every person of `game.npcs` is taken through every hand action the game gives them:
- the story's people where their chapter places them (a placement's pose),
- the cast rounds (castrounds.js) and the household rounds (roomlife.js) at each stop,
- every resident (walkers.js: Citadel, the story residents, the islands, the rooms, the ports) at each stop of the
  round their state gives them; a door's knock is measured from where the knock is made (the last step up to the leaf),
- the room people who walk a track (hamlife.js, isleslife.js, deeplife.js), played for 64 s; each one at work is posed
  as the camera's view of them has it (out of view the game poses people at a lower rate and without the hands layer).

Each stop's pose is played on the person's own rig at the stop and the working hand's least gap over the action is
taken (both hands for tinker, potting, kneelWork, search, use, pump; the right for reach, tapTurn, touchWater, setDown,
pickup, reachHigh). An offender: a working hand more than 5 cm from any drawn surface, or a standing sole more than
6 cm off the ground. `wipe` (hands dried on the apron: the body's own surface) and `warm` (a hand held out to a heat
post's warmth) are listed, not measured. A stop where the game has the person stand instead of work is listed as
STOOD with the reason and what is drawn before it (how far the first face and the first table-high top are).

### What was changed (generic; one story placement)
1. **Hands are put on what is drawn there** (`src/game/workhands.js`, a layer at the end of `Rig.update`, set on every
   NPC). Once per stop the triangles of the rigid meshes within 1.3 m of the worker's hands are gathered (nobody's
   body; a big mesh is read by boxed runs of 96 triangles, indexed once), and each palm's place is found on them by
   short rays from where the pose has the hands: down for a top (a table, a bench, a crate, a rim; the ground for the
   actions that go down to it), forward for a face (a wall, a post, a door, a loom), trying up to 0.4 m along the
   facing, 0.24 m up and down a face, the two hands nearer each other for a narrow thing, and as little more bend of
   the chest as reaches (0 to 0.85 rad). The arms are then solved for the palms each frame on top of the action's own
   pose. What was found at a stop (or not found) is kept for the person's next time there, until the story's flags
   change. (The first version read the physics' colliders: a collider is a box or a cylinder round the thing, and a
   palm on its face was 6 to 60 cm from the mesh. That is gone.)
2. **Nothing in reach: no miming.** The action is stood down (`Rig.standFor`): the person stands at the stop instead
   of working the air. A one-off move (setDown, pickup, reachHigh) is judged before it sets off.
3. **Stops are stood at an arm's length** (`workSpot`): a round's work stop is moved along its own facing until its
   thing is 0.5 m from the body's middle (the stops were set 0.8 to 1 m off: a walker's berth), where the place is
   free, a route still ends there, and (the cast's rounds) nobody else's mark or stop is within 1.2 m. Read from the colliders;
   from what is drawn where no collider stands on the line.
4. **A knock steps up to its door** (walkers.js `knockTick`): the stop stays where the route ends; the last step to
   the leaf (0.1 to 1.7 m: Citadel's doors stand a metre off, the islands' and Zeelich's two) is the knock's own, and
   the step in is that much shorter.
5. **A track's walk ends on its spot** (engine/scripts.js `goto … near`; isleslife.js, deeplife.js. Not the Hamalayi
   rooms': there a person standing on the spot took the room's own look prompt from the player's Talk,
   tests/hamalayi-life.mjs).
6. **A hand held out to a heat post** (`warm`) is left as it is (`rig.handsFree`).
7. Chapter 1's worker at the lift stands at the lift's control (the opening's), both hands on it; he stood 2 m short
   of the mast cranking the air (story/chapter1.js).
8. Arthur's boat stand (Phase 1) is also where he works in play.

### Numbers
| Run | States | Distinct work cases | Hand in the air (> 5 cm) | On a thing | Stood down | Own body / warming |
|---|---|---|---|---|---|---|
| Base (ba23dfa6) | 6 of 21 (well, project ×2, zeelich ×2, dig) | ~220 | **172** (tinker 67, setDown 41, reach 20, kneelWork 16, tapTurn 11, touchWater 8, potting 6, other 3); typical gap 20–80 cm | about 30 | — | 14 / 4 |
| After (merged with the main branch, 11.11) | 21 of 21, one page per state, none died (3 463 cases measured) | 266 | **0** (1 406 measured contacts: median 0.4 cm, 95 % within 1.5 cm, the worst 2.6 cm) | 98 | 147 | 16 / 6 |

Feet: no standing worker's sole more than 6 cm off the ground in any run (0 offenders, before and after).

Stood down by reason: nothing drawn at the hands 54, nothing ahead of a one-off move 47, the thing out of reach 46.
By place: the Hamalayi 31, the desert 29, Citadel 14, Zeelich 12, the Platform 10, Under-Gas 8, the Orchard 7,
Otringal 5, Knartas 5, the lift dock 4, Mosquibee 3, the baggage hall 3, the tavern 2, the house 2, the Celebration 2,
Old Watch 2, the upper works 2, and one each in Nell's house, the two terminals, the office, the observatory and the
core. By action over all 266 cases: tinker 83, setDown 69, reach 31, kneelWork 27, wipe 16, tapTurn 14, touchWater
11, potting 6, pickup 4, reachHigh 4, use 1.

`tests/no-air.mjs` passes per state (`STATES=<i>`: 21 processes; a single process with all 21 states ran out of
memory on the shared machine earlier and was not tried again).

### Cost (SwiftShader container, the machine shared: CPU time, no frame-rate claim)
- A stop's first look (one gather and the rays): 1.0 to 4.1 ms mean over a whole sweep state (189 to 456 looks each,
  1 760 to 2 360 triangles gathered per look; the worst single look 419 ms: the first, which indexes the big meshes),
  with every area built. In ordinary play in Citadel: 9 looks in the
  first minute, about 6 ms each under a load of 14 on 4 cores; the first look of a session also indexes the big
  meshes (the ground, the merged streets): 90 to 460 ms once, measured at boot. After a person's first time at a stop
  nothing is gathered again there until the story's flags change.
- Per frame: two arms solved per visible worker (as before).

### Left (honest list)
1. **Stops where the person now stands instead of working** (see the numbers; the full list is at the end). Three
   kinds: nothing drawn within 2 m on the stop's line (a stop named for a thing that is not there, or faced past
   it); the thing 0.6 to 2 m off and the stop not moved (the place by it is not free or not walkable); the thing in
   front but out of these short arms' reach from a walker's berth (0.43 m from the collider: a low crate, a trough, a
   cart's bed). Each wants its stop set by hand at the thing, a small prop, or the last step taken as the knock takes
   it. None was done: no stop was moved and no prop placed without a picture to judge it by.
2. **Track people who never reached a work pose in 64 s** are not measured (the sweep's NOTES name them: il_avra,
   il_ione, il_zett in most states; keeper, il_mila, il_rudd, il_ulla, hl_dorje, il_nessa in some).
3. **Scripted scenes** in src/game/story/*.js other than the opening were not swept: their NPCs get the hands layer
   like everyone, but no scene was measured.
4. **Looks**: the layer has been measured, not watched. A bend of up to 0.85 rad over a low crate may read as too
   much; palms lie flat on tops and against faces whatever the action; a hand on a narrow thing can slide a few
   centimetres past its edge with the action's own movement; a person who stands where they used to work looks idle.
5. **Far people**: beyond the fog or out of the camera's view the layer does not run (and nothing is stood down
   until the person is first seen at the stop).
6. The opening's Arthur close-ups stay on his face; his hands' work shows in the wide shots only.

## Phase 3 — the people get their work back (11.11.2026): the Hamalayi, Desert Island, Zeelich's isles

Phase 2 kept the rule by standing people down: 147 of 266 stops. Here the stood stops of three areas (the Hamalayi 31,
Desert Island 29, Zeelich's isles 46: 106) were gone through one by one. What stood behind most of them was mended in
the machinery, which works for every area's people; the rest was mended stop by stop, or with a small drawn thing
where the stop's thing was missing.

**Status: Automated runtime only** (headless Chromium, SwiftShader, the machine shared with another worker's runs).
The sweep poses people at their stops; `tests/work-step.mjs` follows two of them through the running game. Pictures
were looked at by the workers who made and checked the change, nobody else. No frame-rate claim.

### What stood behind them
1. **A round's stop is a walker's berth off its thing.** The route planner keeps 0.42 m clear of every collider on a
   half-metre grid, colliders are loose boxes round what is drawn, and an arm is 0.5 to 0.6 m long.
2. **In the running game even stops the sweep counted as working were often stood down.** A walk ends within 0.35 m
   of its slot, heading the way it walked; the work began at once, the hands' layer looked along the wrong line, found
   nothing and stood the action down for the whole stop. Measured on the base: Tam at Lhar's woodpile worked 15 frames
   and stood 250, 0.35 m short of his slot. The sweep could not see it: it poses each person exactly on the slot.
3. **Stops set for a thing's middle, where the thing is not**: a pile's middle is the gap between its two crates, a
   pair of barrels has a gap, a tripod's instrument is a hand's width wide; a table's end; a stall whose keeper's place
   is inside its own crates; island anchors the island planner has since moved (Otringal's two stalls stood 3 and 15 m
   from where their keepers were sent).
4. **An action that does not fit the thing's height**: a standing pose at a sledge, a kerb or a low crate; a reach at
   chest height at a trough or a barrel; a child picking up from the ground (its hand ends 0.2 m over it).
5. **Nothing there at all**: a cook's pot hangs a metre inside its ring of stones; "her bag", "the crates by his door".

### What was changed
Generic (every area's residents and the story's rounds; Citadel and Zeelich included):
- **The last step up to the thing** (`workhands.js workStep`; `walkers.js Resident.stepTick`, `roomlife.js
  StoryRounds.stepTick`). Where the hands find nothing in reach from the slot (the action is stood down there), the
  person walks on along the stop's facing to an arm's length from the thing, works, and walks back to the slot before
  going on, so every route starts and ends where it was planned. A stop in reach from its slot is worked from the slot
  as before. The place: the body's middle 0.3 m clear of every collider (a child's less by its size), its belly's width
  off what is drawn, the ground level and free all the way, at most a metre; never into a doorway's keep-out, onto the
  hero, onto another resident, or within a metre of one of the story's people or their marks (then the person stays at
  the slot). Kneeling, the knees come up to the thing. It is looked for once the person is seen stood down there, kept
  with the stop until the story's flags change, and taken at once on the next visit; if the thing is out of reach from
  there as well, the person keeps to the slot afterwards. Pushed off it (the hero walks into them), they go on from
  where they are. Nothing of it is saved: a load starts a round again, and a stop reached unseen is taken already
  stepped up.
- **Onto the slot, squarely, then the work** (`walkers.js`, `roomlife.js`): a resident that ends its walk within a step
  of the slot takes that step; the work pose begins once the body faces the stop's own way (within two degrees, then
  exactly). It stands while it turns, and stands turned to Twinsen when he comes close (it used to work at the air
  beside him).
- **A knock steps up to a leaf set back in its wall** (`workhands.js knockStep`): a mountain house's door is 0.46 m
  inside its stone reveal, 0.9 m from the knock's place; the knock is now made from the wall.
- **One hand on a thin thing** (`workhands.js plan`): a one-hand action that finds nothing where the pose has the hand
  (0.2 m to the side of the body's line) is tried on the body's own line (a pole, a stake's head, an instrument).
- **A step's crate** (`workSpot`): a pile whose collider is as high as its top crate is met by the lower crate drawn
  before it.
- The sweep (`tests/no-air.mjs`) measures as the game does: on the slot first; stood down there, from the stepped
  place; a door from `knockStep`. `AREAS=` builds only the named areas for a partial run. `tests/work-step.mjs` (new)
  follows a resident and one of the story's people frame by frame through the running game: stepped up with hands on
  the thing, back to the slot, at once on the next visit, and talked to while stepped up.

Per stop, in the three areas (castrounds.js, storylife.js, walkrounds.js, islandlife.js): stops set before the thing
itself instead of its middle or end; actions fitted to the thing's height (kneeling at a sledge, a hand down into a
barrel or trough); island stall keepers placed by the stall where the island's planner actually put it, working from
the buyers' side; a few stops with nothing to work at made plain standing stops with a gesture. Small drawn things
where a stop's thing was missing, each with a collider, merged in one Kit per area: on the Hamalayi a
log seat and a cook's bench at the monastery camp, the three households' packing on Lhar's square, the children's
snowman; in the desert the dig's hearth stone and spoil sieve, Kesh's pebble-game stone and the water jars on the oasis
shore, the School's water basin; on Celebration the lantern seller's stand.

Tried and taken out again: looking for the thing at three more beats of the pose before standing the person down (a
thing at the very end of the reach). While it looked, the pose's hand stayed in the air up to 0.4 s longer, and a
room person on Mosquibee (il_zuzz, reaching while still turning) was measured 38 cm from anything. The layer stands
the action down at the first look again, as in Phase 2.

Two other suites' scenes were sensitive to when the rounds' people are where (the step changes a round's timing), and
were made to do what a player would: `tests/zislands.mjs` — at the Lift Dock's giver, a dock worker on his way past
stood waiting by Twinsen, and Space was taken for a talk: Twinsen now steps back off the worker's way, lets him pass
and comes back; `tests/townlife.mjs` — the resident walked into is a grown-up who is not stepped up to its thing (a
child is small enough that Twinsen side-steps round it head on, actors.js keepApart). One stop was moved for the cast
suite: Lhar's second household at the yard's prayer wheels, 0.12 m east, 1.6 m clear of the west wheel's prompt.

### Numbers
Stops counted once each (a person at a stop with an action, over all 21 chapter states; working: a hand within 5 cm of
a drawn surface in at least one state). The whole game's row counts as Phase 2 did (by stop and place: a stop worked
from its stepped place is a place of its own there), with the count by stop beside it. Before: the base (f4519f2d with the watchman's torch, 9e2f14e9), the three areas
built and swept alone (the whole game's row: Phase 2's own final sweep). After: the whole game built and swept, every state in its own process, no page died.

| Area | Working before → after | Standing before → after | Of the working after, stepped up |
|---|---|---|---|
| The Hamalayi | 10 → 39 | 30 → 0 | 16 |
| Desert Island | 5 → 33 | 30 → 2 | 6 |
| Zeelich's isles | 20 → 58 | 46 → 4 | 13 |
| The whole game | 98 → 201 (198 counted by stop) | 147 → 40 (39 by stop) | 42 |

Hand offenders (> 5 cm from anything) 0 and feet offenders (> 6 cm off the ground) 0 in every one of the 21 states.
(The base's own final sweep listed 31 / 29 / 46 standing in the three areas; the restricted base run above found 30 /
30 / 46 — the stops at the very edge of reach fall either way between runs.) The step is generic, so Citadel, Zeelich
and the rooms gained as well (Citadel 14 → 9 standing, Zeelich 12 → 11, the house 2 → 1, the tavern 2 → 1).
No stop that worked on the base stands now in the three areas. Outside them one does in the full sweep: Citadel's
farmer3 at the rows (chapter 8): measured alone, or after either one of the other two farmers, it works (both hands
0.0–0.5 cm from the ground); measured after both, it stands. The sweep's result there depends on the order it poses
people in; not resolved.

### Cost (SwiftShader, the machine shared: no frame-rate claim)
- One frame's draw calls and triangles (every pass: the view and the shadow maps) from nine fixed places in the three
  areas, base → after: draw calls +0 to +3 (the new things are in the area's existing Kit, merged per material; the
  people's own meshes are unchanged); triangles +0.2 % to +8 % (the most at the monastery camp, 360 k → 390 k, with
  the bench and the log seat in view and its shadow map). Static triangles of a whole area: +0.3 % to +1 %.
- The hands' first look at a stop: 0.95 to 3.1 ms mean over a sweep state (239 to 474 looks; Phase 2 measured 1.0 to
  4.1 ms). The step's own look (`workStep`) is taken once per stop, only when the person is seen stood down there, and
  kept until the story's flags change.

### Left
1. Six stops in the three areas still stand: Kesh's children at the pebble stone and the School's herb bed (a
   kneeling child's hands do not reach), Knartas's mother at the crates (a face before the top) and the net mender's
   crate, the Old Watch mason setting down at the tower, a Platform villager's knock (a door with no leaf drawn).
2. Not watched at speed on a real GPU. The pictures were staged (posed at the stop, the game camera); `tests/work-step.mjs`
   followed two people through the running game. A step up and back is a short walk of up to a metre each way.
3. The Hamalayi households' packing on Lhar's square stays there after the households have moved up to the
   monastery (it is not tied to the story's flags).
4. People who walk a track in a room (isleslife.js and the others) are not stepped: they still start their work while
   turning, and stand down at the first look if nothing is in reach.

## Appendix — the stops where the person stands (39; Phase 3's sweep)
Scene, who@stop, the action stood down, why, and what is drawn on the stop's line (the first face at 0.5 / 0.85 /
1.2 m of height, the first table-high top), from the stop itself: the measure for setting each stop by hand. (Phase 2
listed 147; the rest work now, most after the last step up to their thing.)

```
baggage osk@osk_table tinker nothing at the hands; ahead: a face at -/-/- m, a top nowhere
baggage osk@osk_belt reach nothing at the hands; ahead: a face at 1.6/1.6/1.63 m, a top 1.03 m high at 1.6 m
baggage osk@osk_crates setDown nothing ahead; ahead: a face at 1.63/1.67/1.67 m, a top 0.54 m high at 1.65 m
c3core dp_sala@mark tinker nothing at the hands; ahead: a face at 1.5/1.53/- m, a top 0.85 m high at 1.5 m
citadel farmer1@rows kneelWork out of reach; ahead: a face at -/-/- m, a top nowhere
citadel farmer2@rows kneelWork out of reach; ahead: a face at -/-/- m, a top 0.42 m high at 0.25 m
citadel farmer3@rows kneelWork out of reach; ahead: a face at -/-/- m, a top nowhere
citadel garrick@gar_water potting nothing at the hands; ahead: a face at 0.75/-/- m, a top 0.55 m high at 0.75 m
citadel gurt@gurt_crates setDown nothing ahead; ahead: a face at -/-/- m, a top nowhere
citadel gurt@gurt_ship reach nothing at the hands; ahead: a face at -/-/- m, a top nowhere
citadel sefa@sefa_crates tinker nothing at the hands; ahead: a face at 1.51/-/- m, a top 0.7 m high at 1.55 m
citadel tibbo@tibbo_bench tinker nothing at the hands; ahead: a face at -/-/- m, a top nowhere
citadel tim@crate pickup out of reach; ahead: a face at -/-/- m, a top nowhere
desert dkid@pebble kneelWork out of reach; ahead: a face at -/-/- m, a top nowhere
desert sc_pupa@a_water kneelWork out of reach; ahead: a face at -/-/- m, a top nowhere
house zoe@mark touchWater nothing at the hands; ahead: a face at -/-/- m, a top nowhere
isle_knartas kn_mother@mo_crates kneelWork out of reach; ahead: a face at 0.51/1.08/1.08 m, a top 0.69 m high at 0.55 m
isle_knartas kn_nets@ne_crate setDown nothing ahead; ahead: a face at 0.76/-/- m, a top 0.71 m high at 0.65 m
isle_oldwatch ow_mason@ma_back setDown nothing ahead; ahead: a face at 1.25/1.25/1.26 m, a top 0.75 m high at 1.25 m
isle_platform pf_vill1@v1_home tapTurn nothing at the hands; ahead: a face at -/-/- m, a top 0.22 m high at 1.95 m
nellhouse wim@wim_parts setDown out of reach; ahead: a face at -/-/- m, a top 0.45 m high at 0.35 m
obsv keeper@wall tinker out of reach; ahead: a face at 0.32/-/- m, a top 0.59 m high at 0.35 m
office mira@plant potting out of reach; ahead: a face at 0.87/-/0.19 m, a top 1.17 m high at 0.2 m
tavern luc@luc_stack setDown nothing ahead; ahead: a face at -/-/- m, a top nowhere
terminal bern@bern_list tinker nothing at the hands; ahead: a face at -/-/- m, a top nowhere
upper up_clerk@uc_board setDown nothing ahead; ahead: a face at 0.82/0.82/0.85 m, a top 1.13 m high at 0.8 m
upper up_courier@uk_counter setDown nothing ahead; ahead: a face at -/-/- m, a top nowhere
zeelich ilo@ilo_stall tinker nothing at the hands; ahead: a face at -/-/- m, a top 0.28 m high at 1.5 m
zeelich ilo@ilo_fount touchWater out of reach; ahead: a face at 0.48/2.08/- m, a top 0.72 m high at 0.4 m
zeelich kira@kira_draw reach nothing at the hands; ahead: a face at 1.78/-/- m, a top 0.72 m high at 1.75 m
zeelich kira@kira_b potting out of reach; ahead: a face at 0.45/1.11/- m, a top 0.45 m high at 0.45 m
zeelich oku@goods tinker nothing at the hands; ahead: a face at 1.88/1.88/- m, a top 0.97 m high at 1.85 m
zeelich zc_clerk@cl_in tapTurn nothing at the hands; ahead: a face at -/-/- m, a top nowhere
zeelich zc_courier@co_in tapTurn nothing at the hands; ahead: a face at -/-/- m, a top nowhere
zeelich zc_petit@pe_fount touchWater nothing at the hands; ahead: a face at 2.07/-/- m, a top 0.72 m high at 2 m
zeelich zr_fennick@fen_dark kneelWork out of reach; ahead: a face at 0.48/1.18/1.18 m, a top 0.56 m high at 0.5 m
zeelich zr_oma@oma_box setDown nothing ahead; ahead: a face at -/-/- m, a top nowhere
zeelich zr_rezz@rez_ship tinker nothing at the hands; ahead: a face at -/-/- m, a top 0.31 m high at 1.3 m
zterminal pask@pask_gate setDown nothing ahead; ahead: a face at -/-/- m, a top nowhere
```
