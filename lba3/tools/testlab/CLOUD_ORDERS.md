# Orders from the cloud to the laptop (3.11.2026, night mode)

> **24.11.2026, evening: INSTALL-69, 68.1, 68.3 and WALL-NORMALS received and merged (thank you). ORDER 70 (at the end) is
> the queue now.** Still no performance or frame-time work.

> **24.11.2026, later: ORDER 69 (at the very end) FIRST — the user: "give the local agent an order to install and test the
> game".** It replaces 68 step 2. Then 68 steps 1, 3, 4. Still no performance or frame-time work.

> **24.11.2026: ORDER 68 (below, at the end) is the queue now — the user: "give the local agent tasks; I'll get to the computer
> and start".** Still no performance or frame-time work. Report each step in `WORLD_ART_REQUESTS.md`, push your branch.

> **23.11.2026: ORDERS 66 and 67 — still no performance or measurement work (the user).** Finish 66.5 (chapter 1 played
> with real input), then do 67 below (the user, 23.11: "let the local agent work the walls and make normal maps").
> Other performance orders (61, 63, 64, 65, P96) stay paused. Report each step in `WORLD_ART_REQUESTS.md`, push your branch.

> **4.11.2026: the cloud moves to a new session** (the user's decision). Talk to the cloud through the repository only
> (`WORLD_ART_REQUESTS.md` for requests and questions, pushed); direct messages to the old cloud session will not be read.
> The new session starts from `docs/HANDOFF.md`.


The user, 3.11: "Give instructions and tasks to the local agent too. We're going into night mode." Work them in this
order, one at a time, through the usual loop (`docs/future/LOCAL_EXPANSION_PROMPT.md`): build, picture, test, send the
diff as a request in `WORLD_ART_REQUESTS.md`, push. The user's rules override everything (English player text, no
Earth-style night, FunFrock dead, Vesk the villain, planets only by spaceship, Esmer / Wannies, numbers and
descriptions only from LBA1/LBA2, no spoilers past chapter 2 to the user).

New standing rule (the user, 3.11, `WORLD_CONSISTENCY.md` R11): **every place has a meaning for the journey, even a
small one; no superfluous LBA1/LBA2 places, no cacophony of buildings.** Apply it to everything you build or dress.

**New standing rule (the user, 14.11): "don't load the whole game with unnecessary things; no need for a million benches; it
must not be crowded."** It binds every order, old and new, before anything else in it:
- **Every object you add has a job:** the story, an interaction, who lives or works there, or finding the way. "It fills
  the space" is not a job. No second bench, crate pile, barrel, lamp or planter where one already does that job nearby.
- **Replace before you add.** When a place needs something, first change or move what is there; when you add, look
  for something to take away in the same place.
- **Leave floor and walls empty.** Free floor around paths, doors and props you use; a wall may stay bare. A room or
  a street should read in one look from the play camera.
- **Every request reports the count:** objects added and removed per room/area, with a before/after picture from the
  play camera. A diff that adds more than it removes says why each addition is needed.
- If a place already looks crowded, say so in the report and propose what to take away (don't wait to be asked).

**And what must stay (the user, 14.11): "the main things from the first and second game: entrances to buildings,
buildings are important; the rest it makes sense to change after 12 years."** The originals' main buildings stand
where they stood, recognisable, with their ways in; the rest may change (the 13.11 twelve-years decision).

## Tonight's queue
1. **ASYLUM-2** (answered in `WORLD_ART_REQUESTS.md`, "the cloud's answer"): build the two entrances as LBA1 had them,
   the Esmer workers' hostel dressing, Vesk's store behind it (crates stamped ZEELICH, the hidden humming crate, his
   locked office separate from the foreman's), the plaque at the old bricking ("SEALED BY ORDER OF THE CITADEL ISLAND
   COUNCIL AFTER FUNFROCK'S FALL. NEVER AGAIN."), the front sign, and the `R.npcSpots` handles named there. Pictures
   from the play camera. The cloud writes the people and the story on your handles after the merge.
2. **Real-hardware checks of what merged today** (you have the GPU; the cloud has only SwiftShader):
   - `tests/playthrough/14-shell` (CAMPAIGN-2's choice) and, once, the whole chain 01–14; report verdicts.
   - The asylum's frame time and draw calls after ASYLUM-1 (about 40 cut-away lids; merge the fallback lids if
     they cost).
   - Pictures of the Wannies' platform and Otringal under the new skies (SKY, WANNIE) from the play camera; fix what
     reads wrong.
3. **Cacophony** (from `docs/future/CLUTTER_AUDIT.md`): Citadel's harbour has four building styles in about 45 m;
   bring it to one or two that belong to LBA2's harbour, without moving story places. Otringal's ~55 identical
   shells: fewer, varied, each lane with a reason (the declutter work in the cloud is cutting the islands with no
   use; check `CLUTTER_AUDIT.md` before you touch an island).
4. **W-1 (Float Harbor):** still waits on the user's approval of its pictures. When the user is back at the laptop,
   show them the pictures and ask; do not build W-2 before that.

## Coordination
- The cloud is working on: the follow camera after doors and the rooms' scale and detail (`rooms-cam`), the
  declutter cuts and purposes (`declutter`: the CX islet, Tralu Rock, the Hamalayi camp and causeway, the office
  behind the bar, the west islet's dome, six Desert Island leftovers; new purposes for Citadel's shop house, the
  School's second building, Zeelich's dog yard, three Desert Island houses). Don't touch those files until they merge.
- LINE-CLEAR-1 is queued in the cloud after `declutter` (it touches `zislands.js` too).

## Added 4.11.2026 (the user's playtest notes; the laptop owns world art)
5. **Citadel: the way up to the tavern.** The user: "In LBA2 the climb to the bar in Citadel was paved and orderly; now it's dirt again." Pave the
   approach and steps up to the tavern (`south` house) as LBA2 has it (numbers and descriptions from CITADEL.ILE only),
   in the town's paving kit; keep story spots and colliders.
6. **Zeelich doesn't look like LBA2's Zeelich** (the user, after seeing it). Compare the hub (Zeelich street, Baldino's
   workshop side, the spaceport deck) and Otringal against LBA2's references from the play camera; list the biggest
   differences (silhouettes, colours, building types, ground, sky) and fix the top ones within ALIGNMENT.md's 80 %
   likeness and R11 (every place a meaning). Pictures before/after for the user.
The cloud is working on (don't touch): chapter 1–2 staging and cinematics (Vesk's ship and arrival, the crystal and
Sendell scene, the beam pad after Vesk, Doran's walk, the follow camera against walls) and the audio (Sendell's voice,
Vesk vs Twinsen, the music crackle).

## Orders of 5.11.2026 (the second cloud session; the user: "give tasks to the local agent")
Done since the last orders, so take them off your list: order 1 (ASYLUM-2: built by you, its story written by the
cloud), order 3 (HARBOUR-1, OTRINGAL-1), order 5 as corrected (CLIMB-1), TREES-1. All applied on
`ccr-adf00ea7-37ebl3` (25af69c); base your next diffs there. The cloud is no longer working on the chapter 1–2 staging
or the audio: those files are free again. Work in this order, one at a time, the usual loop (build, picture, test,
request diff in `WORLD_ART_REQUESTS.md`, push).

7. **Real-GPU check of what the cloud changed (first, short; the cloud has SwiftShader only).** On the laptop's GPU,
   Medium, plugged in: the asylum hostel with its seven people and two guards (frame time and draw calls at the
   dormitory, the mess and the store: the room was the heaviest LBA1 room already); walk out of Twinsen's house and
   two shop doors with Settings → Camera on Follow (`Game.doorStep`: he lands 1 m further out; the camera should start
   behind him at a normal angle, not over his head; say if any door now puts him somewhere odd); Sendell's call
   (the "crystals take in the ball" shot, now wide). Pictures of each for the user (chapters 1–2 only). Report in
   `WORLD_ART_REQUESTS.md`; fix nothing of the cloud's, just report.
8. **The hostel's leftovers (yours, ASYLUM-2):** the potted plant in a wall collider (room point (2.25, −22.11));
   grass to the front step (`keepClearNew`); and look at Old Kesso sitting on the mess bench and Wix asleep in the
   lower bunk (`R.npcSpots` worker4 'sit', sleeper 'lie': the cloud pins them at your `y`, a new rig pose 'sleep'):
   if either floats or sinks into the furniture, correct the spot's `y` or `a` in `asylumhostel.js`.
9. **Order 2's remainder:** the playthrough chain 01–14 and 14-shell on the GPU once; the skies' pictures (SKY,
   WANNIE) from the play camera. Verdicts in `WORLD_ART_REQUESTS.md`.
10. **Order 6 (as before): Zeelich closer to LBA2's** — the hub (Zeelich street, Baldino's workshop side, the
   spaceport deck); Otringal's part is done by OTRINGAL-1. List the biggest differences first (silhouettes, colours,
   building types, ground, sky), then fix the top ones within 80 % likeness and R11. Before/after pictures, but these
   are chapter 3 on: put them in `docs/future/world/` and ask the user before showing (no spoilers past chapter 2).
11. **Chapter 10's glider at Citadel (small; later chapter, no pictures to the user):** the glider film now flies the
   parked glider (`network.js`, `CITADEL_LANDING` + (5, −3)); from the film's camera a pine and the cliff rock hide it
   for part of the take-off. Move the parked glider (or that pine) so the take-off reads; keep Hesk's spot and the
   landing. Same check at Desert Island and the Hamalayi.
12. **Expansion (branch `expansion/ballastra`): W-2 "The Arch District" is Ordered** in `EXPANSION_WORLD_SPEC.md`
   (5.11), with the user's note on W-1 as its brief: Ballastra must read as a city that lives by the water's level,
   in form, not colour. Build it there after 7–9 (it is the longest); pictures to `docs/future/world/W-2/` and to
   the user (they have seen Ballastra), canal levels 0 and 1 from the same spot.
13. **WA-10's open point, Desert Island's grey rock (handed back to you: it is texture work).** The original shows grey
   rock outcrops over about 24 % of the island; ours are few and reddish-brown. The cloud tried the terrain's vertex
   colour (`desert.js` COL.rock → grey-beige, slope from 0.65): almost no visible change, so the colour comes from the
   cliff splat texture (`TX.cliff`) and the rock meshes. Make the outcrops grey (and more of them on the steep slopes)
   within 80 % likeness; before/after from above and from the play camera. Chapter 4 on: no pictures to the user
   unless asked.
14. **The polish passes' visual leftovers (5.11; yours: art, lighting, placement; chapters 1–2 unless marked):**
   (a) leaving the hostel by its north door with Follow: a cream band fills the bottom of the frame for a moment (the
   camera behind the portico top, the 1 m near-cut slices it): `asylumhostel.js` portico or a camera nudge, say which;
   (b) the lantern beside most street doors shows at the frame's lower right for a moment after leaving (cosmetic);
   (c) the wizard tent's door: a tall grass blade and a bush in front of the Follow camera; (d) the tavern cellar's
   lower floor near-black (R8 "never dark"); (e) `GL_INVALID_OPERATION: texture format/sampler type mismatch` warnings
   in the console (SwiftShader only? check on the GPU); (f) Citadel landing (−58, −60): two low plant colliders overlap
   the landing spot; (g) later chapter, no pictures to the user: the Hamalayi parked glider seems to cut into the
   monastery wall by the frozen chest (with order 11). Report in `WORLD_ART_REQUESTS.md`.
15. **CLIMB-1, the user's second look (5.11): "still a hole here, and it isn't like the structure in LBA2".** The hole is
   fixed by the cloud (the ground across the ramp's second leg is filled level to its retaining wall: it fell 1.1 m
   toward the wall's foot under the stone house's pad ease, `lba1places.js climbRampFill`, applied last in
   `world.js islandHeight`). The likeness is yours: compare the ramp and its wall with LBA2's climb north of the square
   (31_game_bugstreet_north: the build of its walls, posts and rails, the proportions, the steps), list the biggest
   differences and fix the top ones within 80 % likeness and R11. Before/after pictures from the play camera (chapter 1–2
   place: the user may see them).
16. **The asylum flight's top (the user, 5.11, three photos; chapters 1–2: pictures may go to the user).** (a) "Still
   crooked": the flight's axis (ASYLUM_STEPS a (−33.0, −37.2) → b (−31.5, −47.5)) is 8° off the terrace and the hostel's
   portico, which stand square: at the top the sandstone landing meets the square grey terrace at a slant, a cheek post
   stands in the way between the landing and the terrace. Square the flight to the portico if the water main's legs,
   the stump's clover and the stone house's upper door allow it (move them if they must move), or square the landing.
   (b) "A strange gap": between the flight's east cheek (o = +1.7) and TERRACE_RAIL's first run (x −28.4, z −46.6 →
   −42.95) a trench 1.4–2 m wide down to the cliff rock, two railed walls side by side. Make it one: the terrace carried
   on to the cheek as a retaining wall (the flight cut into the terrace, as LBA2's climbs), or the cheek and the rail one
   wall. (d) The camera at the top (the user: "going up the stairs the camera sticks to Twinsen"): the terrace
   before the fort's south wall is only ~2.5 m deep behind the flight's top, the wall 5.6 m high, so Follow's arm has
   no room and rises over his head at 1.4–3.2 m (camera.js MIN-VIEW, by design). If (a) squares the flight, give the
   landing ≥ 4 m before the wall, or say so and the cloud makes the camera look along the terrace there. The cloud's terrain fill helper is `lba1places.js climbRampFill` (applied last in `world.js islandHeight`). (c)
   With (a)–(b), order 15's likeness to LBA2's climb. Before/after from the play camera (Follow, medium).
17. **The climb's foot, straight (the user, 6.11, a photo from the ramp at the flight's foot: "can't it be
   straightened? it doesn't look good"; chapters 1–2: pictures may go to the user).** CLIMB_RAMP's second leg
   (−37, −20) → (−34, −36) runs ~10.6° off the flight, which starts square at ASYLUM_STEPS.a (−32.6, −35.0) heading due
   north; the round FOOT apron (−33.3, −36.4, r 2) between them, the parapet slanting in at the left and the cheek posts
   square make the join read crooked. Make the ramp's last stretch (at least ~6 m, the parapet and its wall with it) run
   on the flight's own axis, x −32.6, straight into the first step, so ramp, parapet, kerbs and flight are one straight
   line; replace the round apron with a square landing the flight's width (plus the cheeks); keep world.js PATHS[0]'s
   later points, the ground under the paving level across (climbGround / climbRampFill), and STEP_UP-safe risers. Also
   the dark notch at the left cheek's foot beside the first step (in the photo, left of Twinsen): close it. Same play
   camera (Follow, medium) before/after from the ramp below, and run lba1rooms, asylum, rocks, world-consistency,
   overlaps, chapter1.
18. **A player's-eye art review, region by region, on the GPU (the user, 6.11: "all these notes are only from Citadel,
   I'm afraid what happens in the other places"; "3 agents at a time and give tasks to the local agent").** The cloud
   runs agents too: Desert Island now (camera, people, logic, music), then the others; you own the art, so you take the
   art side first where the cloud is not yet: **(a) Zeelich and its nine islands, Otringal included; (b) the Hamalayi
   (the village, the pass, the monastery, the observatory); (c) the underground (`c3*`, the shaft to the core).** Walk the
   story's own routes (tests/playthrough 06–14 are the routes) with Follow, distance Medium (the user's setting), and
   look for what the user found in Citadel today: crooked joins (stairs or ramps meeting at an angle, paths into walls),
   holes and troughs beside walls, trenches beside stairs, dark notches, black voids where floors end, floating slabs or
   black-sided boxes in rooms, doubled floors, rocks or props cutting through buildings, the camera zooming in or flailing
   in passages and on stairs (report those to the cloud with coords: the cloud's camera agent is on camera.js now), two
   near-identical characters side by side. Fix the art at its cause; before/after pictures (chapter 3+: keep them, not
   for the user); report each region in `WORLD_ART_REQUESTS.md` with a table (spot, what a player sees, fixed / for the
   cloud). One region per request diff (REVIEW-ZEELICH, REVIEW-HAMALAYI, REVIEW-UNDER), smallest first is fine.
19. **Music by place (the user: "the asylum should have a different tune"):** the cloud gave the asylum the facility piece
   (main.js ROOM_MUSIC asylum: 'stealth'). List every room and region and its music mood (main.js ROOM_MUSIC, R.music,
   engine/music.js MOODS) and say where the piece does not fit the place as LBA1/LBA2 scored such places (a prison, a
   temple, a cave, a shop, a ship); if a new piece is needed, write it with the repo's own music tools
   (tools/music/tracks/*.py, original compositions only — never LBA's music) and wire it. Chapter 1–2 places first.
20. **ASYLUM-4 against LBA1 itself (the user, 6.11: "check how they did it in the first game"; "the local agent has the
   LBA1 files").** The cloud's agent fixed the asylum's look without LBA1's files (the cloud machine has none): from
   `assets/lba1/asylum.json` it lit the room from the camera's side (`R.indoor.sunDir` (0.3, 0.8, 0.5), sideGain 2.8),
   drew the nine-cell lamps and tables and the pipe runs as lamps, tables and round pipes (`lba1room.js opts.fittings`),
   and stone post tops (`opts.capStone`) — merged as ASYLUM-4 (6dc37340), published (v51). Three of its before|after
   pictures (our game only, no LBA1 art): `docs/future/world/ASYLUM-4/`. **With LBA1's own files:** render the asylum the way LBA1
   draws it (its bricks, its camera) at the same spots (the user's two photos: the west landing by the tall maroon post;
   the loft by the clothes line) and compare with ours on the GPU: wall and floor tones and texture, what LBA1 shows past
   a floor's edge, the camera-side walls' height, the lamps/tables/pipes' look and placement (the agent's reading:
   lamps 10 3 13 / 2 1 5 / 12 4 11 slope patterns over the loft, the kitchen counter, the upper walk, the office desk;
   254 pipe cells), what LBA1 has that we lack. Fix the biggest differences within 80 % likeness and R11 (numbers and
   descriptions only from LBA1, never its bricks or pictures in the repo). Left by the agent: pipe-colour cells that are
   not runs still boxes; a few pipe ends capped in mid-air; the lamp over the upper walk reads as standing near the floor.
   Before/after from the room's own camera (chapters 1–2: the user may see them).
21. **A slide trap at the east flight's top (the cloud's camera agent, 6.11; small, urgent: the user plays there).** The
   top step of the 6-step east flight ends at x −28.99; just past it, at x ≈ −28.9 … −28.8, z −46.3 … −45.2, the ground
   is 0.6–0.9 m lower and steep: Twinsen slides against the step, sticks, and after 1 s `actors.js respawnFromFall`
   teleports him back (and costs a life) — the likeliest cause of the user's "the camera lost its balance" on the
   forecourt. Fill that strip level with the forecourt (climbGround / the fill) or close it with the cheek; check by
   standing and turning there, and walking the east flight both ways.
22. **Desert Island, the cloud's player's-eye review (6.11; chapter 4+: pictures stay with you):** fixed by the cloud:
   Hesk off the yacht and the glider, the yacht's collider turns with it, Oni and Doran placed, the NO FERRY slate in
   chapter 5 only, the island's glider hidden until chapter 6. **Yours (art):** (a) the School sign "SCHOOL OF MAGIC"
   (desertold.js:237 → desert.js `signAt` ~1531) reads mirrored from the bridge and on the way out: two front-facing
   planes back to back instead of one double-sided; (b) the project ferry at the pier (desert.js 564–573): a teal box
   with a roof floating over a thin white sliver of hull and a bright cyan disc: a closed hull with a deck, the disc
   softened or gone; (c) the hangar tarp (condenser.js ~151, 10.5 × 6.2 m) overhangs the floor's rim and Twinsen's legs
   are inside its edge at the boarding spot: ~9 × 5 or its edge raised; (d) the School's interior wall at (5588.2, 0–3,
   −12…−2.8): two textures in one plane (wizards.js school shell); (e) the pump pipe (desert.js ~720, no collider) is
   walked through at the joint: bury or lift it, or a thin collider; (f) the Bù maze (lba1places.js buildLba1Temple):
   dark tops read as trenches and light floors as wall tops: darker floors or lighter wall tops (with order 20's LBA1
   look); (g) the School's pits: piles of shiny black boulders; (h) the School pupils reuse Lulu and Tim (sc_pupa/
   sc_pupb, sc_in1/sc_in2): other kid looks so Citadel's named children don't seem to be there. Report in
   `WORLD_ART_REQUESTS.md` (REVIEW-DESERT-ART).
23. **Zeelich and the isles, the cloud's player's-eye review (6.11; chapter 3+: pictures stay with you):** fixed by the
   cloud: the Esmer shuttles hidden while the routes are grounded, the cog's star after Oku, Tib/Marl/the council guard
   placed, the Dark Monk's temple in the cave piece. **Yours:** (a) **Esmer looks (with order 18):** the game has 6 Esmer
   looks, all named characters (keeper 10×, xil 9×, oku 9×, nara 8×): Kira wears Councillor Sela's look while Sela sits
   in council; Old Ossa and Ennu wear Oku's; Velo and the bar's boss wear Councillor Amaru's; the barkeep and the hotel
   clerk wear the council clerk's. Colours are baked into the poly models: make 3–4 generic Esmer palette variants and
   1–2 Quetch women and give them to the non-named people. (b) The Otringal bar: the door opens behind the back-bar shelf,
   he walks in hidden beside the barkeep (otrbar.js, door left wall z 1.8, spawn LX+1.4): move the door or the back-bar.
   (c) The dog yard's gate (local x −28.9…−27.1, z −17.6) opens 1.25 m from the council house's back wall. (d) The
   Zeelich pier's mooring rope ends in the air (~(2342, 6, 1)). (e) Celebration's summit plaza ("THE FIGURE"): paving in
   sharp folds over the rock, a bench on the slope. (f) Music (order 19): the Otringal bar and hotel and Zeelich's
   terminal play 'home': a livelier bar piece; a muffled Zeelich mood for the terminal (one MOODS entry in
   engine/music.js, as 'office'). Report as REVIEW-ZEELICH-ART.
Cloud, 6.11: MUSIC-19, REVIEW-UNDER and REVIEW-HAMALAYI applied (4713a88f); the Old Asylum rendered with `build.py asylum` (b06d0560, -18.5 LUFS, loop 16.59–111.39 s, 1.57 MB), so `alt` no longer plays.
24. **No two people the same (the user, 6.11: "there are duplicate characters in Citadel, and I suppose elsewhere too: make sure no character is a copy of another"):** fixed by the cloud for colour (DRESS-1, characters.js `dressVariant`/`dressMap`, story/index.js `npcDefs`): 147 people share 51 poly models; everyone who shares a model now gets their own clothes and hair at load (the baked vertex colours of the clothing roles and their shades are remapped; skin, fur and eyes keep theirs; gold and cream trim stays; the person the model is named after keeps the model's own). This covers 23a's palettes. **Yours (shape, which colour cannot change):** the most shared models still read as one body in other clothes: keeper ×8 (Esmer: Ilo, Marl, three guards, Esren), farmerB ×7, desertkid/lharMan/lharWoman/farmerA/clerk ×6, farmerC/oku/archivist ×5. Give each of these 1–2 shape variants (another hat or none, another hair style or beard, a coat length, a heavier or slimmer build) as their own poly models with a LOOKS entry each (`<look>_b`), and say which people take them (by id; the list: `game.npcs.map(n => [n.def.id, n.def.char])`). Their colours will then be varied again by DRESS-1 on top. Report as DRESS-2.
25. **The Hamalayi from the cloud's camera, art follow-ups (REV-HAM, merged 6.11):** the cloud moved the heat station's shed 3.6 m off the post with its pipe low on the snow, the glider field sign beside the glider, the ch 10 glider and landing outside the monastery gate (gate + (6.3, 3.8)), the trail's rope rail (fewer posts, one side per leg, none on rock) and the deep installation's music to the facility mix. **Yours:** (a) look over those four changes from the Follow camera and say if any reads wrong; (b) the vent steam seen from (4254, 16, −47.8) looking west reads as a brown dusty column against the ice: whiter/softer; (c) the two Lhar roof flicker spots overlaps.mjs flags, (4302.15, 14.49, −3.06) and (4305.92, 14.53, 18.11) (you found them on the original too); (d) the Hamalayi outdoors, the observatory and the underground all play The Well: a mountain/monastery piece if you have one in mind (score only; the cloud renders it, as it did the asylum). The cloud's agent is doing the monastery yard's wall gaps, the ch 7 take-off through the signpost, the gallery crystals hiding him, and a general fix for slide traps (sliding into a collider respawns him). Report as REV-HAM-ART.
26. **Citadel from the cloud's camera, art follow-ups (REVIEW-CITADEL, merged 6.11):** the cloud closed the pit north of the hostel stair's landing with a collider (x −33.9…−31.3, z −46.9…−47.7, lba1places.js `climbTerraceFill`), kept scattered boulders off the benches' room (Marda walked over one at (−94.56, 31.16)), renamed the harbour's Esmer trader Neska (two Sefas). **Yours:** (a) that pit still draws as a dark crevice under the terrace edge: fill it to the edge's height; (b) Bug Street's foot (−56…−50, −12…−5): a dirt pocket before the pharmacy and baggage-claim doors, the street ramp's paving and the square's meet in a stepped overlapping edge by the bench (−50, −7); (c) the Water Office (−65.5, 11): a heap of square rock blocks juts into the front yard left of the door; (d) Tralu's cave door (−80.7, 12.9, −83.8): he comes out on a narrow ledge facing the sea with 1.2–1.5 m drops west and north; the way back is a gap at z −82.3 nobody will read: steps west from the ledge and the exit facing along them; (e) Bersimon's tent still plays Home (order 19). Report as REVIEW-CITADEL-ART.
27. **The user's LBA3 Maturity Agent Pack (7.11): your roles.** The pack is installed on the branch: `.claude/agents/lba-*.md` (16 agents) and `lba3/docs/lba-maturity/` (PROJECT_CONTRACT.md, templates, and status.md with who does what). Read the contract and status.md first. The cloud coordinates and runs the code roles two at a time (Zeelich first). **Yours, because they need your machine or your files:** (a) **lba-world-reference-curator**: with the LBA1/LBA2 files you hold (read-only, numbers and descriptions only, nothing committed from them), a matched-location reference set for every revisited place: Citadel first, then Zeelich (it is not one generic island: name each district), Desert Island, the Hamalayi; fill `WORLD_RESEMBLANCE_TEMPLATE.md` per place with the rubric score and its evidence, and `BUILDING_REGISTER_TEMPLATE.csv` for every building (exists in original? has a door? interior? story-locked?). The cloud's buildings-interiors and world-campaign-finisher workers build from these, so Citadel and Zeelich first. (b) **lba-music-director**: the user hears music crackle on their computer while other music plays fine: reproduce it there (Chrome on the laptop, the published page and a local copy), capture before evidence, find the cause (decoding, scheduling, the lowpass/gain moods, loop seams, duplicate sources) and fix it; give scores for missing pieces (mountain/monastery) for the cloud to render. (c) **lba-performance-lab**: the Vega 8 at 1366×768 measurements, battery and plugged-in, before/after each wave the cloud publishes. (d) **lba-world-art**: with orders 24–26. Report each as MATURITY-<role> in `WORLD_ART_REQUESTS.md` with the evidence labels of the contract.
28. **Character polish in Blender, the whole cast (the user, 7.11: "I installed Blender on the computer and told the local agent to connect to it: give it instructions to go over the characters further on so they are more polished"):** you are the cast's **lba-world-art / character artist** from now on (with orders 23a and 24 folded in). Work in this order: (1) the people of the later chapters, region by region, in the order the cloud brings regions to Citadel's level (status.md): Zeelich and Otringal (the Esmer and Quetch there, 23a), Zeelich's isles, Desert Island, the Hamalayi, the underground; (2) the recurring named cast as they appear there (Baldino, Doran, Vesk, Hesk, Oni, Yorna, the councillors, Kira, Xil, Oku, Nara…); (3) the shared models most reused (order 24: keeper ×8, farmerB ×7, desertkid/lharMan/lharWoman/farmerA/clerk ×6, farmerC/oku/archivist ×5) get 1–2 shape variants each (`<look>_b`: another hat or none, hair or beard, coat length, build), with the people who take them listed by id. What "more polished" means, per model: a readable silhouette from the Follow camera at Medium (~8.8 m) and in the close dialogue shot; LBA2's proportions for the race (Quetch, Esmer, Grobo, Rabbibunny, Sphero) checked against your original files (read-only: numbers and descriptions, nothing extracted is committed; extract only to a scratch folder you delete); faces with clear eyes/brows/mouth placement (the mouth mesh opens with the voice), hands that read, clothing with real thickness (no paper-thin hems or z-fighting folds), no stretched skin weights in the walk/run/talk/doze poses, feet on the ground. **Pipeline rules (or the game breaks):** tools/blender/cast_poly.py → assets/poly/<look>.json; keep the skeleton and bone names (art/characters/skeletons.json; Grobo trunk per `groboTrunk` in characters.js), the separate eye meshes and the mouth; **bake each clothing role in the exact hex of its LOOKS entry** (characters.js: tunic, tunicTrim, pants, belt, hat, hair…) and shades only as darker multiples of it, because DRESS-1 recolours shared models by matching those hexes (a colour that matches no role cannot be varied); keep each model within ~+25% of its current triangle count (the street draws 16+ people at once). **Evidence per model:** a turnaround (front, side, back) and the two game shots (Follow/Medium, dialogue close-up) before|after, in docs/future/characters/<look>/ (our pictures only), and the cast tests: cast-rounds, solidnpc, chapter1, story-journeys. Deliver as diffs plus the new assets/poly JSON in `requests/`, a batch per region, and say which batch is ready so the cloud merges, tests and publishes it. Report as CAST-POLISH-<region> in `WORLD_ART_REQUESTS.md` with the contract's evidence labels.
29. **Every door against LBA2, the sewer first (the user, 7.11: "the sewer isn't laid out as it was in the second game either: check every door, where it led and where it should connect"):** as the **reference curator**, from your LBA2 files (read-only; scene/zone numbers and positions as numbers, nothing extracted committed): (a) list every Citadel cube/scene of LBA2 and every door or change-scene zone that links them — from where (exterior position or room), to which scene, and where the hero arrives; (b) the sewer's own layout in LBA2: its entrances and exits (which street/house/well they open from), its branches, rooms and what each connects to, in order; (c) compare with ours: the cloud's generated `lba3/docs/lba-maturity/door-map.md` (18 outdoor doors and 23 rooms' exits as the game runs now; the house doors entered through town.js are not all in it yet — add what you find) and our sewer rooms (sewers.js: `sewer`, `sewervault`, the wtent link, the well-house lift); (d) write a correction table: door → LBA2 links it to X, ours to Y, change wanted (move the door, add a door, reconnect, a sewer branch to add/remove, where the hero should arrive), twelve-year changes marked as ours. Report as DOORS-LBA2 in `WORLD_ART_REQUESTS.md`; the cloud's buildings-interiors worker implements it. Then the same for Zeelich and Desert Island.
30. **The climb's new foot reads very oddly (the user, 7.11, photo from v55 on their computer: "very strange"; the photo stays with the user, described here):** looking down the fort climb from above, Follow camera, Twinsen on a pale landing beside the stone pier: (a) a stepped white coping block (two tiers) sits on top of a dark brick pier with a black slot down its middle; (b) below it two parallel white parapet strips with teal handrails run down side by side with a dark trench between them, the rails starting and stopping mid-air; (c) the left run's parapets step down in L-shaped white slabs that overlap each other; (d) where the landing's pale paving meets the plaza's grey flags there is a jagged black zig-zag seam; (e) the green pipeline crosses just above on its brackets, close over the landing. This is CLIMB-17's foot (CLIMB_JOG / STRAIGHT / FOOT, `climbParapet`, `climbShelfRows`, the shelf fill). Wanted: one clear, LBA2-like stair foot — one parapet per side, continuous rails that start at a post on the ground and end at a post, no trench or slot between runs (fill or a single wall), copings that don't stack or overlap, a clean edge between landing and plaza, and the pipeline lifted or rerouted so it doesn't cut across the landing at head height. Check it from the Follow camera walking up and down (the cloud's camera worker is on the same stairs: keep collider changes inside the flight's box and say what moved). Report as CLIMB-30 with before|after pictures.
31. **The Whispering Cliffs' rising stepping stones look very strange (the user, 7.11, photo: "and the cylinders look really weird"):** world.js ~1245–1300 builds them as bare 9-sided `CylinderGeometry` columns, flat brown `#8d8578` with a flat green `#5d8a3a` disc on top — they read as untextured primitives against the faceted, textured cliff rock beside them. Wanted (world-art): rock columns of the cliffs' own kind (the cliff rock's facets, strata and texture, as `buildCliffRocks` in cliffs.js / the island's rock material), slightly irregular and tapering, each a little different, the top a worn rock cap with a ragged moss/grass edge that doesn't overhang, the rise from the ground still reading as rock pushing up (maybe dust/pebbles at the foot). Keep the physics exactly (cyl r 1.15 at the same x, z, tops; the `W.stones` contract: grp, c, top, ground, delay; hidden until `raiseStones`), the draw-call budget (one or two meshes a stone, or instanced), and LBA2's jump reach (tops as now). Before|after from the Follow camera on the stones. Report as STONES-31.
32. **ALIGN-1, the week lined up (the user, 7.11: "line up with the local agent: what tasks were given in the last week, what was done, what wasn't, and the order of work"):** read `lba3/docs/lba-maturity/ALIGNMENT-2026-11-07.md` — every order 1–31 with its status, the cloud's side, and the order of work from now (yours: 30 and 31 first, then 29, 27a with 18a/23, 27b, 28, 26/22/25, 27c; the expansion paused). Reply in `WORLD_ART_REQUESTS.md` as ALIGN-1: correct any row that is wrong (done things marked not done or the reverse, anything missing), say what you are on now, and then keep to that order unless the user tells you otherwise.
33. **The expansion is approved (the user, 7.11: "I approve the expansion").** On `expansion/ballastra` (now merged with main up to v56, fad5710f): `EXPANSION_WORLD_SPEC.md` marks **W-2 the Arch District Accepted** and **W-3 the Water Gardens Ordered**. This replaces row 4/12 of ALIGN-1 ("paused"): build W-3 on the expansion branch as the spec says (its own lazy group `bl_gardens`, pictures to `docs/future/world/W-3/`), **after** 30 and 31 and in turns with 29 — the base game's Citadel items stay first while the user is playing them. Report as W-3 in `WORLD_ART_REQUESTS.md`; anything W-2 still leaves open, list it there.
34. **The hostel portico's camera shape (CAM-KEYWALK, merged 7.11; small):** the camera stood inside the portico's cornice and pediment, which stick out past its colliders; the cloud's camera now keeps a general pad off the top 1.8 m of every tall box, but the portico should carry its own: in `asylumhostel.js` add a `camOnly` box for the cornice and roof (H − 0.2 … H + 1.5, the cornice's width and depth). Also, please play the fort's west station gate (x −43…−39, z −65; the user's "camera zooms in super close" passage) at Follow/Medium on your GPU once, walking and running out and in, and say how it reads. Report as CAM-34.
35. **The expansion branch after the merge with main (fad5710f), before W-3:** the cloud ran the expansion's suites on it (SwiftShader): ballastra-harbor, ballastra-arches, oren-first, oren-bands, oren-coils PASS; **two to fix there first**: (a) `world-consistency` "journeys (static)": main's allow-list of `startTransition` calls doesn't know the expansion's — coils.js:490 (meet), coils.js:520 (disperse), index.js:171 (afterLoad), survey.js:308 (update), throttle.js:147 (flyHome) and the rest of that list: classify each (a film, the same region, a cut, or a gap) in the test's allow-list, and route any planet/region change through its film; (b) `oren-square` 20 functional: the bot walking from the fortress shelter to Gilbert's well gate in the square gets `go:stuck` ("the lock can be inspected" and everything after); something merged from main now blocks that walk (candidates: REVIEW-CITADEL's boulders/benches, CLIMB-17/21's foot and threshold colliders, SLIDE-RESCUE) — find what, fix the route or the placement (not by teleporting in the test). Report as EXP-MERGE-35, then go on with W-3.
36. **The hands (the user, 7.11: "and the hands"; with 28, first in the cast pass):** the cloud's animation worker found the cause in the models, not the rig: `tools/blender/cast_poly.py` `finger_hand` (≈1292–1313) and the Esmer hand in `build_esmer` (≈1378–1386) fan the fingers sideways with the palm facing forward/back and the thumb inward — a mirrored hand that reads as a spread claw from behind (Follow). Turning the hand bone 90° in the rig fans them front to back but points the thumb out (the cloud's picture: the keeper, top as now, bottom turned), so it must be built: fingers fanned front to back, palm toward the thigh, thumb forward, relaxed curl; re-export every model built with those hands. Check in Blender previews and in game from Follow behind and a close shot for 4–5 cast members (an Esmer, a Quetch, a Grobo, a robe, a child), and that the rig's hand bone still drives it (no detached hands, no clipping into the thigh at the arm's swing). The walk itself (slow motion, stretched legs) is fixed in rig.js on the cloud (GAIT-CADENCE, merged 7.11); please also look at a townsfolk's walk on your GPU once and say how it reads. Report as HANDS-36.
**Night of 7–8.11 (the user: "night mode").** The user is away until morning. Work your queue in this order, one at a time, each reported and pushed before the next: **30 CLIMB-30 → 31 STONES-31 → 34 CAM-34 → 36 HANDS-36 → 29 DOORS-LBA2 (the sewer and Citadel first) → 35 EXP-MERGE-35 → W-3 → 27a curator (Citadel, Zeelich)**. The cloud applies each diff as it lands and publishes. Nothing that needs the user's eyes or ears is claimed as done (music crackle, frame rate on other machines).

37. **Otringal's high town: grey rock spikes through the paving (found by the cloud's original-mechanics sweep, 8.11; picture-free here):** between the high town's houses the island's rock scatter pokes up through the paving. Find the scatter (zislands.js, Otringal's style/rocks) and keep it off paved ground and off every door's approach (2.2 m out, ±0.7 m, as ihomes/zislands now do for dressing); look at it on your GPU at Follow/Medium. Also, with it: the Hamalayi now has rooms behind its doors (the landing hut, Lhar's five houses, the observatory keeper's: ihomes.js, built by the planner from existing pieces); please give them a look on the GPU and say what reads poorly. Report as OTRINGAL-37.

**8.11: order 30 (CLIMB-30) moves to the cloud.** The user sent a second photo of the asylum climb (the stair's tilted cheek with diagonal brick courses, its coping running into a post with a dark notch); the cloud's world-polish worker now does the whole climb (the stair and the foot, P5) in lba1places.js. **Don't start or send CLIMB-30**, and keep out of lba1places.js's climb (climbFlight, cheek, climbPost, climbRail, climbParapet) until the cloud reports it. Go on with 31 STONES-31, 36 HANDS-36, 29 DOORS-LBA2, 37.

**8.11, the laptop is back (the user: "activate it").** State: artifact **v67** (commit after `git fetch` of `ccr-c1c2c4b9-dep6ed`; merge it first). The cloud finished waves 1–7 of the maturity pack (status.md); the user listened to the voices pass and the action-sound pass: **"great"** — keep both as they are (`audio.out`, `fxDuck`, the slider glide, clip-edges). CLIMB-30 is done by the cloud (CLIMB-31, lba1places.js): don't touch the climb. **Your queue now, one at a time, each reported (diff in `requests/`, `git apply --check` clean on origin) and pushed before the next:**
1. **36 HANDS-36** — the mirrored hands in `tools/blender/cast_poly.py` (finger_hand, the Esmer hand); the user reported "the hands" on 7.11; the most visible open item.
2. **31 STONES-31** — the Whispering Cliffs' rising stepping stones as rock (the user: "the cylinders look really weird").
3. **29 DOORS-LBA2** — Citadel's sewer and every Citadel door against LBA2 (`docs/lba-maturity/door-map.md`), then Zeelich, then Desert Island; the cloud builds what you find.
4. **34 CAM-34** — a GPU look: the fort's west station gate, the hostel portico, and now the asylum climb from the user's photo spot (Follow/Medium); with it **37 OTRINGAL-37** (the rock spikes; the Hamalayi rooms' look).
5. **35 EXP-MERGE-35**, then **W-3** on `expansion/ballastra`.
6. **27a curator** (Citadel, Zeelich), then 26/22/25 art follow-ups as listed.
Rules unchanged: numbers and descriptions only from LBA1/LBA2; pictures past chapter 2 stay on the laptop; no frame-rate claims beyond the Vega 8.

38. **ZOE-LOOK: the cast toward a softer, more expressive 3D-animation look, Zoé first (the user, 9.11).** The user showed a fan picture of Zoé (Fandom; someone else's art: never copy it, trace it or put it in the repo; the cloud describes it here, use it only as a mood reference). What it shows, in words: a smooth, rounded, glossy "animated feature" look; large blue eyes with clear whites, heavy upper lids and long lashes, thin arched brows, a small nose, red lips; a tall blond ponytail swept up and forward from the crown, held by a green band, its tip curling; a gold hoop earring; a red sleeveless dress with wide green trims at the neck and armholes, a black belt with a square silver buckle; a green cord necklace with a round dark pendant; green bangles on both wrists; soft rim light and warm skin shading.
   **Do, in Blender (tools/blender, zoe_poly.py and the bridge), as a candidate the user decides on:** (a) Zoé's face: bigger, more expressive eyes with lids and lashes (the talking-mouth and blink rig kept), a smaller nose, fuller lips; (b) her hair: the swept-up ponytail with the green band and the curled tip; (c) her outfit's details: the green trims, the belt and buckle, the pendant, the bangles, the hoop earrings; (d) smoother silhouettes (more segments where it reads — head, hair, arms — within a budget: report triangles before/after, keep the draw calls). **Keep her body's proportions as the game's Zoé (an adult woman, modest, LBA's family tone): do not copy the picture's exaggerated figure.** Shading: what the game's renderer can do cheaply (a soft rim light term, warmer skin) only if it costs nothing measurable on the Vega 8; the picture's film lighting is not a target.
   Deliver: turnaround + in-game Follow/close pictures, before | after, the user may see them (Zoé is a chapter-1 character). **If the user likes it**, the same treatment next for Twinsen, then the cast region by region (the CAST-POLISH passes). Report as ZOE-LOOK-38. After 34 CAM-34, before 27a.

**10.11: a new work-and-test machine (the user's decision).** The user bought a desktop with a GTX 1050 graphics card. It is now the local agent's machine: Blender, the test lab, the GPU looks (34 CAM-34) and the expansion. **The Vega 8 laptop stays the minimum target**: performance claims and budgets are still judged on the Vega 8; numbers from the GTX 1050 are reported as such and never stand in for the laptop's. First on the new machine, once set up (Git and the repository, Node 22, Chrome, Blender, the Claude desktop app with Claude Code, `npm install` in tools/testlab): the test lab's Quick Check on the development build, reported in `WORLD_ART_REQUESTS.md` with the machine named, then the queue above (34, 38, 27a, 27c on the Vega 8 when it is at hand, the expansion).

39. **MIGRATE-39: the hand-over from the laptop to the new desktop (the user, 11.11: "I'm afraid of the move between the two computers. I want to move from the old computer to the new one with all its tasks and all its knowledge. I asked the old computer's local agent to do it. Make sure it happens.").** As of 11.11 14:30 UTC the cloud sees **no hand-over on any branch**: the laptop's last push is `87613283` (CAST-POLISH-UNDERGROUND) of 10.11 18:55. The cloud checks this list each time the branch moves and tells the user what is still missing. First of everything else in both agents' queues.

    **A. The laptop agent writes and pushes `lba3/tools/testlab/HANDOVER-LAPTOP.md`** (one commit, on `ccr-adf00ea7-37ebl3`), with every heading below filled in or marked "none":
    1. **Unpushed work.** For every clone and worktree on the laptop (`C:\Users\dan\lba3-o26`, `lba3-pk19`, any other): `git status`, `git stash list`, `git log origin/<branch>..HEAD` and `git worktree list`. Everything worth keeping is committed and pushed (work in progress as a `wip/<name>` branch or a patch under `requests/`); the file lists each clone with "clean, nothing unpushed" or what was pushed where. Local-only branches are listed too.
    2. **The queue.** Every open order by number with its state (not started / in work, how far / waiting for the user / done but not reported): at least 27a's next regions (Desert Island, the Hamalayi), 27c, 28 (the cast pass: who is done, who is next), 34, 38 (TWINSEN-LOOK and the cast after Zoé), the expansion (W-4 on, EXP-MERGE-35), and `lba3/PROGRESS.md`, `lba3/art/blender/PROGRESS.md` brought up to date. Anything the user told the laptop agent directly that is in no file yet (decisions, tastes, "do it like this", things he rejected) is written down here, dated.
    3. **Knowledge that lives only on that machine.** The agent's own memory and notes (the contents of its memory directory and any CLAUDE.md / notes outside the repo) copied into this file or into `lba3/tools/testlab/handover/` as text. Pitfalls it learned (Blender bridge quirks, the test lab, Windows paths, what crashes, how long things take), each as one line.
    4. **Files that are not in git, and must not be** (the user's LBA1/LBA2 files from GOG and everything decoded from them: reference renders, measurements' sources, the curator's scratch). Do NOT commit or upload them. List each folder with its full path, size and what it is for, so the user can copy them himself (USB disk or the home network) to the same paths on the desktop; say which orders cannot continue on the desktop without them (27a, 29, the reference side of 26/38).
    5. **Other files outside git:** `art/music/masters/` (ignored), soundfonts, `.blend` working files and `*.blend1`, `tests/out/`, benchmark logs, pictures the user sent, the test lab's settings. For each: path, size, "copy" or "can be rebuilt (how)".
    6. **The tools and their versions:** Blender (5.2.3?) and how `tools/blender-bridge` is connected (port, add-on, start command), Node, the Playwright browser, Python, git, the desktop app build steps, any global npm tools, environment variables, the Claude Code settings and allowed commands that the agent relies on.
    7. **The Vega 8 stays the minimum target.** Its last benchmark files and how to run one again (the laptop is still needed for that: say so, and what the user should keep installed on it).
    8. **Secrets:** none go into git. If any key or login is needed on the desktop, name it (not its value) and say where the user sets it.

    **B. The desktop agent, after pulling, writes and pushes `lba3/tools/testlab/HANDOVER-DESKTOP.md`:** each heading of A answered with "received / set up / missing": the clone at the same branch and commit, the tools installed with versions, the Blender bridge answering (one model built end to end, e.g. rebuild `assets/poly/zoe.json` and compare its hash with the repo's), the test lab running one suite (`chapter1`) on the GTX 1050, the user's original files present at the listed paths (sizes compared with A.4, nothing committed), the memory notes read. Then it takes the queue from A.2 in the same order and says so in `WORLD_ART_REQUESTS.md`. Until B is pushed, the laptop is not wiped or given away.

    **C. Only one of the two agents pushes at a time** from now on: the laptop agent stops after A (a last line in the file: "the laptop stops here, <commit>"); the desktop agent starts from that commit.

**11.11, the cloud to the desktop agent:** MIGRATE-39 is checked and done (A.1–A.8, B, C all answered). CAST-POLISH-NAMED and CAST-CONNECT-1 are applied (b08fc8f4) with their models. **The answer to CAM-34's open question (the user, 11.11): the camera felt chaotic "only at the hostel entrance".** So the portico's box stays withdrawn and no other camera change is wanted; CAM-34 is closed. Go on with the queue as you listed it (queue 7's `_b` variants, then queue 9, then Twinsen; 27a Desert and Hamalayi). The listening WAVs did not reach the desktop's OneDrive; the user was told.

Questions for the cloud: in `WORLD_ART_REQUESTS.md`, pushed. The cloud reads it at the start of each session.

40. **The desktop's queue from 12.11 (the user: "if there are tasks for the local agent with Blender and the graphics
    card, make an orderly list").** State: artifact **v82** (`ccr-c1c2c4b9-dep6ed`, the commit "Build stamp for artifact
    v82"; merge it first). Applied by the cloud since your last batch: CAST-VARIANTS-1 and GROBO-GREY (with CAST-POLISH-NAMED,
    CAST-CONNECT-1), the campaign's waves 1–2 (chapters 1–5), NO-AIR 2/3, PLACE-1 (`docs/lba-maturity/PLACE-1.md`), the
    reservoir pipe under the fort climb, CAM-WALKFAR (camera.js). **The cloud is working on, don't touch:** `pass.js`,
    `observatory.js` and the Lhar/Pass/Observatory places (campaign wave 3, chapters 6–7); outdoor dressing in Zeelich's
    street, the isles and Citadel's streets (PLACE-2); `src/game/story/*`. One at a time, each reported in
    `WORLD_ART_REQUESTS.md` with a diff in `requests/` (`git apply --check` clean on origin) and pushed before the next:
    1. **GPU-V82, a short look at what changed (report; fix only art).** Follow/Medium on the GTX 1050: (a) the new game's
       kitchen: the dry tap and Arthur's cup carried to the sink — from the game camera the cup is a few pixels; if the
       beat does not read from the picture, make the cup and the tap read (size, colour, a highlight) within the kitchen;
       (b) the rooms PLACE-1 changed in chapters 1–2 (Twinsen's house: the firewood basket, the toy chest; the pharmacy's
       plant; the lighthouse top; Nell's shop bench): anything that now reads wrong; (c) the fort's SW tower walk (the
       camera now swings at most ~40°) and the reservoir pipe coming up west of the climb's landing. Pictures may go to
       the user (chapters 1–2). Report as GPU-V82.
    2. **PERF-1050 (the work order's item 2):** the four findings of `docs/lba3-performance/HARDWARE/2026-11-10-desktop-gtx1050.md`:
       the ~4 s shadow-program compile behind the black (compile earlier or in parallel, KHR_parallel_shader_compile, or
       split), the 288 ms frame with a 37 MB GC on the street, the 117 ms frame after arrival, the street's CPU work on
       High. Before/after in the same runner on the GTX 1050, numbers labelled with the machine; the code as a diff. The
       Vega 8 must not get worse: say what to measure there (27c), never claim it from the 1050.
    3. **28, the cast, the rest of queue 7, then queue 9:** CAST-VARIANTS-2 (Kira, zmole2_b, zbee1_b, zbee2_b, nara_c)
       arrived while this was written; the cloud applies it next. Left: `archivist_b` (×5 share it); then queue 9 (the
       common props). Rules as before (each clothing role in
       its LOOKS hex for DRESS-1, ≤ +25 % triangles, skeleton and bone names kept). Tavi on farmerB_b may be retried: the
       cloud fixed the terminal talk test's fragility on 12.11 (a person faced squarely now wins over the departures board).
    4. **TWINSEN-LOOK-38** (after 3, by the order the user set): Twinsen given Zoé's treatment, a candidate for the user,
       turnaround and in-game pictures (chapter 1: the user may see them).
    5. **DIGTEST-ART (chapter 4; pictures stay with you):** campaign wave 2's test stand at Desert Island's research post
       (`teststand.js`, `desert.js` `R.stand`): the drill's turning string sits high in the derrick and is seldom in the play
       camera; the two dials read at the stand but are small further off. Make the turning part and the two needles read
       from Follow/Medium at the cutoff lever (a turning part lower on the derrick, bigger dial faces and needles); keep the
       lever, its prompt and the colliders where they are; draw calls before/after. Run `chapter4`, `campaign-hands`.
    6. **27a curator:** Desert Island and the Hamalayi (scores with evidence), and the re-score of Citadel's lighthouse,
       NW plateau, harbour and square after CITADEL-85.
    7. **27c on the Vega 8** whenever the laptop is at hand: v82 against v71 on the same routes.
    8. **The expansion:** W-4 on `expansion/ballastra` as `EXPANSION_WORLD_SPEC.md` orders it, after 1–6.
    **Done by 12.11 (the cloud's note):** 1 GPU-V82 and the cup applied; 2 PERF-1050 not reproduced, the cold driver cache
    ruled out too (no code change); 3 CAST-VARIANTS-2 and -3 (archivist_b) applied; 4 TWINSEN-LOOK-38 and ARTHUR-LOOK-38
    applied. Next: queue 9, then 5–8. PLACE-2 merged 12.11 moved Zeelich's planters, departures board and pier lamp, and
    the isles' crates, jars and fences: re-capture those before any art on them.
    **QUEUE-9 answered (the cloud, 12.11): option (b), the openable containers only** (`containers.js`: crate, barrel,
    chest, and the jar PLACE-2 now uses on the isles). The player opens these in every region, so they should read as
    "openable" from Follow/Medium in each place: one look per kind, built once in `containers.js` (shared geometry and
    materials; no draw call added per container), sizes and colliders kept, positions untouched (PLACE-2/PLACE-3 own them),
    the order of every list kept for saves. Not (a): a shared module that every region adopts is a wide refactor across
    files other jobs are editing; not now. Not (c): PLACE-3 (Desert Island, the Hamalayi) is running in the cloud now.
    Deliver as before: a diff, before/after pictures (chapters 1–2 may go to the user), draw calls, and `containers`,
    `cast-rounds`, `chapter1`, `zislands` runs. Then 6 (27a, done) → 7 → 8.
    DIGTEST-ART applied 12.11; CURATOR-27a received.
    **CURATOR-27a's question answered (the cloud, 12.11): yes, send the Desert batches**, as two diffs: (1) Kesh's houses'
    parapet domes and colour; (2) the standing figures, the gateway's beam, the pillars and the stone face in LBA2's
    language. The hooded figures carry no story purpose (`desertold.js` only keeps them as `R.figures` spots for
    `worldscore.mjs`; keep those spots). Rules: built by hand in our own geometry (nothing exported from the original
    files, which stay read-only and uncommitted), positions and colliders kept, the test stand and dig of chapter 4–5 left
    alone, draw calls before/after, `worldscore.mjs` before/after. **Order:** after QUEUE-9, and base them on the branch
    after PLACE-3 (Desert Island and the Hamalayi's placement, running in the cloud now) is merged: the cloud notes it here.
    **PLACE-3 merged 12.11** (Desert: the corral troughs, Hesk's yacht and spare gear, jars, sacks and crates moved; the
    Hamalayi: a crate, the woodpile, the observatory's supplies, the old crank stand): re-capture before the Desert batches.
    Only the user can: listen (the WAVs), judge fight fairness, time a first play. Pictures past chapter 2 stay on the desktop.

41. **The desktop's queue from 13.11 (the user: "direct tasks to the local agent").** State: artifact **v85**
    (`ccr-c1c2c4b9-dep6ed`, the commit "Build stamp for artifact v85"; merge it first). Applied by the cloud since order 40:
    QUEUE-9-CONTAINERS, DIGTEST-ART, CAST-VARIANTS-3, TWINSEN-ORIG; the campaign's waves 3–7 (chapters 6–12:
    `CAMPAIGN-STRENGTHEN.md` 5c–5g), PLACE-2 and PLACE-3 (`PLACE-2.md`, `PLACE-3.md`), P17 (chapter 2's depot rail), P18
    (the voices from the line's letters: `P18-VOICES.md`, Settings → Sound → Voice Style), CONTAINERS-3. **The cloud is
    working on, don't touch:** `epilogue.js`, `hometap.js` (campaign wave 8, the epilogue), then a fresh chain 01–14;
    `src/game/story/*`. Pictures past chapter 2 stay on the desktop. One at a time, each reported in `WORLD_ART_REQUESTS.md`
    with a diff in `requests/` (`git apply --check` clean on origin) and pushed before the next:
    1. **GPU-V85, the new chapters' objects from the play camera (report; fix only art).** The waves report these as
       small or unseen through the game's own camera (Follow/Medium on the GTX 1050, at the spot where the player uses
       them): chapter 6 the line's three lamps, the gauge by the winch and the crank; chapter 7 the telescope's bearing
       ring and lever; chapter 8 the lane's water gate and the culvert cock in the pump room; chapter 9 Vesk's order
       sheet by the archive door and the BORE drawer; chapter 10 the code line's joint and the isolator on it; chapter 11
       the damper and the fitters' knocker, the held shutter; chapter 12 the branch cock, the central lock, the bar. For
       each: does it read, and is the reveal camera's beat (`camera.js` reveal beats, off in the tests) framing it? Make
       what does not read readable (bigger faces, contrast, a lower part) without moving levers, prompts or colliders;
       draw calls before/after. Run the chapter's suite and `campaign-hands` for each change.
    2. **VOICE-HW (P18 on real hardware; measure only, nobody listens).** In Chrome and in the app's Electron on the GTX
       1050: the Words voices render in a blob worker. Measure from the box opening to the first sound, per line, over the
       chapter-1 kitchen conversation and a Zeelich street talk; any line that falls back or comes late (the code joins a
       late render with a 20 ms fade); the main thread's longest task while a line renders. Classic for comparison. A
       report, numbers labelled with the machine; a diff only if a fault is found.
    3. **DESERT-ART-1 and -2 (approved in order 40; PLACE-3 is merged now):** (1) Kesh's houses' parapet domes and colour;
       (2) the standing figures, the gateway's beam, the pillars and the stone face in LBA2's language. Built by hand in
       our own geometry (nothing exported from the original files), positions, colliders and `R.figures` spots kept, the
       test stand and the corral's three troughs left alone; draw calls and `worldscore.mjs` before/after; run
       `desert-life`, `chapter4`, `place-scan`.
    4. **27a re-score of the Hamalayi** after wave 3 (Lhar, the Pass, the Observatory) and PLACE-3.
    5. **Tavi on farmerB_b** (CAST-VARIANTS-1's leftover) may be retried: `interior-life` passes now.
    6. **27c on the Vega 8** whenever the laptop is at hand: v85 against v71 on the same routes (the new chapters' stations
       included).
    7. **The expansion:** W-4 on `expansion/ballastra` as `EXPANSION_WORLD_SPEC.md` orders it, after 1–5.
    Only the user can: play, listen, judge fight fairness, time a first play.

42. **HOME-CELLAR and HOME-BATH (the user, 14.11, P23: "add things to the room downstairs in Twinsen's house: right now it
    is pointless and gives nothing; and why don't they have a toilet and a shower... a bit strange").** Before order 41's
    remaining items. Merge `ccr-c1c2c4b9-dep6ed` first. **The cloud is working on, don't touch:** `hometap.js`,
    `prologue.js`, `chapter1.js`, `text/opening.js`, `text/thread.js`, `well.js`, `tutorial*.js`, `index.html` (OPENING-TUT:
    the opening at home becomes a playable tutorial; the Arthur cup objective is gone); Zeelich (TECH-ART-1). Each part a
    diff in `requests/` (`git apply --check` clean on origin), reported in `WORLD_ART_REQUESTS.md`, pushed before the next.
    1. **HOME-CELLAR (`interiors.js` `buildCellar`, LBA2 scene 1: Twinsen's training room).** Today: a target, a straw
       dummy, two bookcases, a radio on a sideboard, a barrel and crates (two givers), a poster, a bench, two armchairs.
       Make it a room worth going down to, one that says who lives here twelve years on:
       - **His own corner:** things from the old adventures (framed pictures, a map pinned up, a kept trophy or two, a
         tunic on a hook), all drawn by hand in our geometry (nothing from the original files), read from the play camera.
       - **The house's works:** the pipes from the house's water come down here (the main stopcock, a meter, a boiler or
         tank): it makes the opening's dry tap something you can see the other end of. Art only; no new interaction on
         it (that is the opening's, in the cloud): if you think it should be usable, say so in the report.
       - **The training room as a training room:** the target and the dummy answer the ball and the fist where they do
         not yet (a wobble, a sound already in the game, a mark that fades), so the cellar is a place to practise. Small
         code in `interiors.js`/`roomlife.js` only, no new story flags.
       - **Keep:** the stairs, `R.exits`/`R.entries`/`R.spawn`, the window, the two givers, and the spots later chapters
         use in this room (`story/arsenal.js` the cellar nook and the boards; `story/kit2.js` the tin under a tile): run
         `arsenal`/`kit2` tests or check their positions stay clear.
    2. **HOME-BATH:** the house has no toilet, washbasin or shower. Add a small bathroom that fits LBA2's house (tiles,
       a basin with a mirror, a toilet, a shower or a tub, towels), where it fits the existing plan without breaking the
       hall, the stairwell, the kitchen or their colliders and cut-aways: off the hall, or a corner of the cellar walled off,
       your call with a picture. If a new door or room is needed, wire it like the house's other doors and say how. Its
       taps are art only (in the opening the house's water is off: the cloud will make them say so).
    For both: **the 14.11 no-clutter rule above applies: a few chosen things with a job, not a full room**; captures
    from the play camera before/after, objects added/removed, draw calls before/after, run `opening`, `prologue`, `chapter1`,
    `containers`, `place-scan`, `house-*`/interior suites that cover the house. No text past chapter 2 in pictures sent to
    the user. Only the user can: play, listen, judge.

43. **LANDMARKS-KEEP (the user, 14.11, P25): "the main things from the first and second game: entrances to buildings,
    buildings are important; the rest it makes sense to change after 12 years."** After order 42. You have the originals'
    data (read-only; nothing from it committed but numbers and descriptions) and DOORS-LBA2's decoded links.
    1. **The list:** for every region the game revisits (Citadel, the Desert Island, Zeelich's places, the Hamalayi,
       the other LBA1/LBA2 islands we have), the original's **main buildings** — the ones a player of LBA1/LBA2 would
       remember (homes of the cast, shops, the tavern, the school, the museum, the temple, the lighthouse, the
       harbour's halls, the asylum, the Water Office, the observatory and so on: your judgement from the originals,
       not every shed) — and each one's ways in (door zones from the scenes). A table: region, building, original's
       scene/zone, ours (`docs/lba-maturity/BUILDING_REGISTER.csv` row, `door-map.md`), **present / moved /
       missing**, **recognisable from the play camera yes/no**, **its way in: works / shut with a reason told /
       shut silently / missing**. Fill the 25 register rows marked "not assessed in 27a".
    2. **Art fixes, one per request, as always:** a main building missing or not recognisable gets its shape back
       (our geometry, by hand), its door where the original had it. No-clutter rule applies: bring back the building,
       not a crowd around it.
    3. **Ways in:** do not wire rooms yourself; list each "shut silently" or "missing" one in the report with the
       original's door position, and the cloud's buildings-interiors worker will make them work (a room, or a shut
       door with a line that says why).
    Report the table in `WORLD_ART_REQUESTS.md` (`## LANDMARKS-KEEP`) with pictures of the misses; no pictures past
    chapter 2's places to the user.

44. **Night mode, 14.11 (the user: "night mode: continue by the plan, and give the local agent tasks too").** ISLAND-85
    is closed by the user ("leave it all, enough"): **no Citadel declutter pass, no desert palms, no Kesh ground, no
    temple way** (the stone face is the magic school; LBA2's way down is a well — the cloud's earlier TEMPLE-WAY line is
    withdrawn). The queue, one at a time, each a request with a diff, pushed before the next:
    1. **Order 43, LANDMARKS-KEEP** (the table first; art fixes only for main buildings that are missing or not
       recognisable; the no-clutter rule holds).
    2. **Order 41's items 4–7** (27a Hamalayi re-score, Tavi on farmerB_b, 27c on the Vega 8 when at hand, W-4).
    3. **The Vega 8 handoff of TECH-ART-1: order 45** (whenever the laptop is at hand).

45. **TECH-ART-1 on the Vega 8 (the cloud, 14.11; measure only, no code change expected).** The cloud's technical-artist
    pass at the chapter-3 Zeelich landing (`docs/lba-maturity/TECH-ART-1.md`): the street doors got a dark reveal and a
    keystone, Baldino's door a stone lintel and a brass ring, his board on the east wall; and residents' carried props are
    now built once per kind and shared (before: every pick-up built new geometry that was never freed). The cloud measured
    counts only, on SwiftShader (+1 draw and about +1.5k triangles in the views that hold the workshop; carried-prop
    geometries over a run 26 → 3; no live-geometry growth in 120 s of street life, +3 before). **Frame times need the
    Vega 8 laptop.** Numbers from the GTX 1050 may be added but are labelled as such and never stand in for the
    laptop's. Pictures are chapter 3: they stay on the laptop and the desktop.
    1. **Builds (A/B by commit; there is no runtime switch).**
       - A, the base: `b38d29e4` ("Desktop requests applied: HOSTEL-CUT, HOSTEL-STEP, PERF-OWP-SPRITES").
       - B, the candidate: the last commit whose subject starts with "TECH-ART-1" on `ccr-c1c2c4b9-dep6ed` (or the
         coordinator's merge of it). Optional third column, the art alone: the commit "TECH-ART-1 art: the Zeelich
         street doors …" (A plus the doors, without the waste fix).
       - Two clean worktrees, e.g. `git worktree add ..\ta1-A b38d29e4` and `git worktree add ..\ta1-B <B>`. A has no
         harness: copy `lba3\tests\techart-zeelich.mjs` from B into A's `lba3\tests\` (it reads B's extra marks only
         where they exist).
       - Serve each `lba3` folder on its own port:
         `python -m http.server 8971 --bind 127.0.0.1 --directory ..\ta1-A\lba3`, and 8972 for B.
    2. **The runner on the real GPU.** As `HANDOVER-LAPTOP.md` says, run from a scratch copy of `tests\` (never edit the
       repo's tests): swap the Playwright import in `lib\boot.mjs` to `tools\testlab\node_modules\playwright`, and in
       `launch()` replace the SwiftShader arguments with
       `{ headless: false, args: ['--use-angle=d3d11', '--ignore-gpu-blocklist'] }`. The harness prints
       `ENV {… "gpu": …}` first: it must name the Vega 8 (ANGLE Direct3D11). If it says SwiftShader, stop and fix the
       launch; never report those numbers.
    3. **Conditions, the same for every run.** Plugged in (then, if time allows, the whole set again on battery);
       Windows' power mode unchanged between runs; nothing else open; display scaling 100 %. The harness runs a
       1366×768 window at pixel ratio 1 (`W`, `H`: the defaults), chapter 3 by flags, Follow at Medium, Visual 2026,
       MSAA, each view's hero spot fixed and the camera snapped.
    4. **Runs.** For each of `QUALITY=low` (the preset the Vega 8 gets by itself) and `QUALITY=medium`: A, B, A, B, A,
       B (three each, alternating, one at a time), each one
       `set LIVE=10& set WARM=3& set SECS=600& set GAME_URL=http://127.0.0.1:8971/& node tests\techart-zeelich.mjs`
       (port 8972 for B). `LIVE=10` lets the game's own loop draw real frames for 3 s of warm-up and then 10 s at each
       of the six views (dock, bridge, street, door, back, resident). `SECS=600` is the stepped street-life count: ten
       minutes of game time on the street, counts only.
    5. **Record, per run** (from the harness's output lines; keep the raw logs):
       - `ENV`: GPU string, quality, size, pixel ratio.
       - `LIVE <view>`: frame time p50 / p95 / p99 / max; CPU simulation and CPU render submission p50 / p95 (`simMs`,
         `renderMs`: CPU only); `gpuMs`, the GPU's own time from the timer query ("Unavailable" when null); draw calls,
         triangles, `heapMB`, live geometries.
       - `VIEW <view>`: draws (main / shadow), triangles, geometries, materials, textures, programs.
       - `WASTE`: carried-prop geometries made over the run, and the street life's `made` / `carried` / `liveGrowth`.
       - Plugged in or battery, Windows power mode, Chrome version, any other load on the laptop.
    6. **Report** as TECH-ART-1-VEGA8 in `WORLD_ART_REQUESTS.md`: per quality and per view, the median of the three A
       runs against the median of the three B runs, with the spread. Call a difference real only where it is larger
       than the spread between the A runs; write "unstable" where the A runs disagree by more than 10 % at p95. Keep
       CPU submission and GPU time apart. Expected, not claimed: no frame-time change from the art; the waste fix shows
       as no geometry growth over a long street session, not as a higher frame rate. If B is worse at p95 beyond the
       spread, name the view and send its `LIVE` lines: the cloud looks for the cause.

46. **The user's playtest of 15.11, two items for the desktop (real GPU, Blender).** State: artifact **v91** plus the
    cloud's fixes after it (P28 dogs, P29 flasks, P34 the ferry's narration). The user plays on the real machine now
    (the Vega 8 laptop is sold: d2e1ab8b).
    1. **P30, characters pixelated in the house** (the user: "inside the house the characters' pixels are very
       pixelated compared with before"; a picture of Twinsen and Zoé by the kitchen, their edges stair-stepped). The
       cloud measured Twinsen's house on SwiftShader, v86 (f5526202) against the tip: draw calls 68 → 64, triangles
       ~228k → ~225k, resolution scale 1 and MSAA 4 in both: the house did not get heavier. So, on the desktop's GPU,
       new game, the house, stand by the kitchen with `?perf`: record the overlay's pixel ratio and "auto ×" factor,
       the quality preset the governor chose (AUTO-QUALITY), MSAA, and the frame time, for v86 and for the tip (the
       artifact's previous versions or git worktrees at f5526202 and HEAD). If the auto resolution / the governor drops
       the scale indoors on the tip and not on v86, find what costs the frames there (the bathroom's glass shower, the
       cellar, the tutorial's hints, the radio's glowing eye) and send a request; if the scale is 1 in both, compare
       crops at the same spot and look at the output pass (edgeAA, sharpen) — a 960-px crop of both is enough. Report
       as P30 in WORLD_ART_REQUESTS.md.
    2. **(WITHDRAWN 15.11 — the cloud took it: TWINSEN-FIGURE. The user sent a figurine of Twinsen as the target and said
       the local agent got stuck; stop any Twinsen model work and push what you have as wip/desktop/twinsen-* so the cloud
       can read it.)** P35, Twinsen's head from behind (the user: "the bulge is weird"; a picture from behind and above: the hair
       knot on the back of his head reads as a lump). TWINSEN-LOOK's territory: in Blender, make the knot read as
       hair (shape, a tie, its size against the head, its join to the scalp) or reduce it, against LBA2's look (his
       tied hair, numbers and descriptions only). Previews from the play camera's height behind him, before/after; the
       usual pipeline (export, in-game load, the rig's animations, the face untouched). Send it as a request.
    Rules as always: no LBA1/LBA2 files committed, results labelled by where they ran, the no-clutter rule.
    3. **P40 (decided):** the user, with a picture of the original's square (blue globes round the statue): Citadel's square
       lamps are **blue**. CITADEL-85's gold globes were reverted in town.js (f589e7b1); don't bring gold back.
47. **The user, 15.11, right after SCHOOL-LBA2 was pushed: "the local agent didn't do the School of Magic right from
    outside" (P41). SCHOOL-LBA2 is NOT applied** (the cloud holds it). What the cloud sees in school-lba2-wide.jpg (after):
    a free-standing square block with a crenellated top, the face stuck on its front, the block alone on open sand, its
    sides visible; the canyon around the island is elsewhere. LBA2's School (the picture the user gave you) is a face
    **carved into a long canyon wall**: rock continues left and right of the face and behind it, the face sits in the
    wall's line, not on a box; no battlements. Redo it against the user's picture: the face part of a continuous cliff
    (join it to the island's grey ridge or build the canyon's walls out on both sides so no box edges show from the
    plaza, the bridge or the play camera's usual angles), the top an uneven rock skyline, not merlons. Keep what was right
    (the pale mask, swept brows, orange eyes, the door in the chin, the bridge, the pillars), the rim walk free, the door,
    its spot, the colliders' way in and the `wizards` people. Before/after from the play camera at the bridge, from the
    plaza and wide; put the user's LBA2 picture beside ours in your own check (not committed). Send as
    requests/SCHOOL-LBA2b.diff, report as SCHOOL-LBA2b. If the user tells you directly what is wrong, that wins.
    Also: **Twinsen stays the shipped model** (the user rejected TWINSEN-FIGURE: "our old Twinsen is better"); no Twinsen
    model work.
48. **Night mode, 15.11 (the user: "night mode"): continue by the plan; the desktop's queue for tonight.**
    1. **Twinsen: no model work** (the user rejected TWINSEN-FIGURE; the shipped model stays).
    2. **The School of Magic:** the user told you "don't move anything" (ORIG-PLACES). Nothing more on it until the user
       speaks; SCHOOL-S28 is not applied by the cloud.
    3. **When the cloud publishes the next artifact (v93: the dialogue pass, FACE-OFF, the voices of the ferry's two
       speakers, and whatever of PLAYTEST-15 / INVENTORY-CALM / U-3 lands):** on the GTX 1050 in Chrome, new game through
       chapter 1 to the well and into chapter 2's harbour: frame time p50/p95 in the house, the square and the harbour
       against v92, the dialogue boxes (no line cut or overflowing at 1920×1080 and 1280×720), the voice per line (box to
       sound, Expressive). Report as V93-GPU in WORLD_ART_REQUESTS.md. Pictures of chapters 1–2 only may be shown to the user.
    4. **place-scan on the real GPU** at the tip (the cloud's SwiftShader runs crash under memory load): the full run,
       its numbers against PLACE-2's (135 rooms, ~7321 pieces, findings). Report as PLACE-SCAN-GPU.
    Rules as always: no LBA1/LBA2 files committed, results labelled by where they ran, the no-clutter rule.
    **(16.11, 03:02 UTC) v93 is published** (artifact 1794798122-4052; stamp commit "Build stamp for artifact v93"): the dialogue
    pass, PLAYTEST-15, INVENTORY-CALM, U-3, U-4, MAP-ORIG's four Citadel fixes, FACE-OFF, the ferry's and Tali's voices.
    Order 48.3 (V93-GPU) can start. Also look at the new inventory window on the real screen (1920×1080): pictures readable,
    no scroll bars. camsteady's 12 failures are old (same on v92); a cloud worker has CAM-STEADY.
49. **(16.11, 11:07 UTC) v94 is published** (artifact 1794827211-4ff4; stamp commit "Build stamp for artifact v94"): OPENING-TUT-2
    (P31: the yard as Zoé's errand, step by step), CAM-STEADY (camera.js Follow), SCHOOL-S28 applied, TAVI-B, the indoor pace,
    U-5. On the GTX 1050 in Chrome: (1) a new game through the yard's errand to the well — each step's goal line and key
    hint readable at 1920×1080 and 1280×720, Zoé's call-back, the tick and chime; time it (a real first play, the user's
    machine); (2) the Follow camera out of Twinsen's door and along the street (does it hold steady); (3) the School in
    S28's canyon from the valley's mouth (pictures for the team only, chapter 4). Report as V94-GPU.
50. **P30 again (the user, 16.11): "I play only the artifact, in Chrome".** So the Intel/app route of your P30 report does not
    apply. On the GTX 1050 in Chrome: open the artifact on claude.ai (the user's way: the game inside claude.ai's frame) and
    the same build served directly; in the house by the kitchen, read `?perf`'s pixel ratio, auto ×, MSAA, quality, and
    compare crops of Twinsen and Zoé at the same spot (devicePixelRatio inside the frame, any CSS scaling of the canvas by
    the frame, the canvas' backing size against its CSS size). If the frame shrinks or scales the canvas, say how and
    propose the fix (the renderer's size from the canvas' real client size × dpr). Report as P30-FRAME.
51. **The desktop's queue from 16.11 (the user: "give the local agent tasks").** State: artifact **v95** and the desktop
    installer **desktop-build-680** (0.49.0, the same game). **The cloud is working on, don't touch:** Citadel's world
    (`world.js`, `town.js`, the harbour, the sea shader: CITADEL-ORIG-2 — the turquoise sea, Twinsen's plank roof, the grid
    past the square, LBA2's paved harbour and L pier, all approved by the user), and every text file (`src/game/text/*`,
    `i18n.js`: HE-TEXT, the whole game in Hebrew). One at a time, each reported in WORLD_ART_REQUESTS.md, a diff in
    `requests/` where code changes, pushed before the next:
    1. **P30-APP:** install desktop-build-680 on this machine and open the house in chapter 1 (the kitchen) in the app, then
       the same spot in the artifact in Chrome; the same crops of Twinsen and Zoé, `?perf`'s numbers in each (in the app:
       the overlay's key). If the app is sharp and the artifact is not, find what in the browser path differs (the canvas'
       backing size, MSAA, the auto scale). Your P30-FRAME proposal (a key for the perf overlay inside the artifact) — send
       it as a small diff (`main.js` only, a key that does nothing else; not in the Classic controls' way). Report P30-APP.
    2. **ORIG-SHOTS (reference only, nothing committed):** the original LBA2 runs on this machine (GOG). Take real in-game
       screenshots of Citadel (sunny) at: the harbour, the square with the statue, Twinsen's house, the lighthouse, the
       town's streets from the south, and Desert Island's Kesh. Keep them local (IP). Report in words and numbers only:
       the in-game camera's angle and distance (estimate from the scene), the sea's colour (mean RGB of a sea crop), the
       lighting (sun direction, shadow strength), the lighthouse's colour (MAP-ORIG could not tell from the remake if it
       is white or dark stone), roof colours. The cloud uses them for CITADEL-ORIG-2's sea and the lighthouse. The user
       may see Citadel's shots on this machine if they ask.
    3. **CHAIN-01-14 on the real GPU:** `tests/playthrough/01…14` in order from a new game on this build (the yard's new
       errand is in 01: `tests/lib/player.js` does it), one at a time; per segment PASS/FAIL, the game-clock time, and any
       stall with where it happened. The cloud's machine is too loaded to run the whole chain. Report CHAIN-V95.
    4. **KESH-ORIG (a candidate, chapter 4: pictures for the team only):** MAP-ORIG found LBA2's Kesh a compact grey stone
       town (paved streets, a fountain plaza, grey flat-roofed houses, a gold-domed house, a stone quay) where ours is ochre
       adobe on open sand. The user said "don't move anything" (ORIG-PLACES): so no building moves — materials, roofs,
       paving and the plaza only. Send `requests/KESH-ORIG.diff` with before/after from the play camera and draw calls; the
       cloud describes it to the user in words before applying.
    Rules as always: no LBA1/LBA2 files or screenshots committed, results labelled by where they ran, the no-clutter rule.
52. **Toward a ready game (the user, 17.11: "yes" to: a final audit in the cloud, the full chain on the desktop, the user
    plays).** Build: **desktop-build-689** (0.49.0) = artifact **v96** (the whole game in Hebrew, CITADEL-ORIG-2: the turquoise
    sea, Twinsen's plank roof, the stone L pier, the east street; the kitchen tap wins over Zoé when faced — CHAIN-V95's 05).
    The cloud runs RELEASE-AUDIT-v96 now; don't touch `src/` while it runs (report only, requests in `requests/`).
    1. **CHAIN-V96:** `tests/playthrough/01…14` in order on the GTX 1050 (Chrome), each loading the last one's save, as
       CHAIN-V95. Per segment PASS/FAIL, game clock, health lost, stalls with where. If one fails, say whether it is the game
       or the harness, and go on from the fixture save of the next chapter if there is one (tests/fixtures/campaign).
    2. **V96-GPU, chapters 1–2 on the real screen:** the new sea, the L pier and the ferry's arrival (chapter 1), Twinsen's
       roof, the east street; the Hebrew (Settings → Game → Language) in the yard, a dialogue box, the inventory and
       journal at 1920×1080; Subtitle Size Extra large. Frame p50/p95 at the harbour and the square against v95. Pictures of
       chapters 1–2 may go to the user.
    3. When the user plays the installed build and reports, put each report in the playtest inbox (the cloud's status.md
       rows come from the cloud; send them as notes in WORLD_ART_REQUESTS.md "USER-PLAY-689").
    Rules as always: results labelled by where they ran, no LBA1/LBA2 files committed, the no-clutter rule.
53. **The user, 17.11: no downloadable builds for now, the artifact only.** Don't put [build] in a commit message and don't
    run desktop.yml by hand until the user asks for an installer again. CHAIN-V96 / V96-GPU (order 52) stay: run them
    against the artifact (Chrome) or the repo served locally.
54. **PERF-1050-BATTERY (the user, 18.11: "the game does not sustain 60 FPS on the GTX 1050 laptop while on battery";
    phases 1 and 5 of docs/lba-maturity/REPAIR-PASS-18-11.md — read it).** On THIS machine (the user's GTX 1050 laptop is the
    target; the Vega 8 numbers are history). No downloadable builds are published now: build the desktop app locally from
    the tip (lba3/desktop, `npm run dist:win` or run Electron from the repo) — and the artifact in Chrome as the second path.
    1. Record: revision, CPU/GPU, the GPU the renderer actually uses (WEBGL_debug_renderer_info; Windows' per-app GPU
       preference), resolution, devicePixelRatio, drawing-buffer size, effective render scale, the preset Auto chose,
       MSAA/shadows/bloom, the frame limiter (Settings → Display → Frame rate: As the screen / 60 / 30 steady, new 18.11),
       AC or battery and Windows' power mode/battery saver, and any clock/temperature telemetry (mark unavailable).
    2. The route (the user's): new game → the house and the yard's tutorial → the square → the harbour → the station at the
       fort; then a fight (the depot or the cliffs' mites); an indoor/outdoor transition; first entry to Zeelich, then a
       second traversal. Per segment: average FPS, frame-time median/p95/p99, frames > 16.7/33.3/50 ms, the stalls and what
       they were (shader compile, upload, GC, a CPU spike), draw calls/triangles, cold vs warm.
    3. Runs: the same settings on AC and on battery, separate runs; High at the documented resolution; then Auto; then
       "30 steady". Controlled comparisons for the bottleneck: render scale ×0.75, shadows off, bloom off, busy vs empty.
    4. If a Windows/driver battery limit (e.g. the GPU parked, a 30 Hz cap, power saver) is shown, explain the evidence and
       the setting — never change system power settings yourself.
    Report as PERF-1050-BATTERY in WORLD_ART_REQUESTS.md with the raw logs in docs/lba3-performance/HARDWARE/. Fixes you can
    prove go as requests/*.diff; the cloud applies them with its own performance worker.
55. **FPS30-HW (the user, 19.11, v100 in Chrome: "the game does not lock to 30 fps when I choose it"; P70, docs/lba-maturity/FPS30.md).**
    The cloud found and fixed two defects of the 30 limit by measurement on a synthetic display (rAF timestamps that jitter
    over 1.5 ms gave 50/16.7 ms pairs; a frame a refresh late was followed by a 16.7 ms catch-up frame) — it could not see
    the user's machine. On THIS machine (GTX 1050), in Chrome against the artifact or the repo served locally at the FPS30 tip:
    1. Record: Chrome version, chrome://gpu (WebGL hardware-accelerated or not, the GPU in use — Windows' per-app GPU
       preference), the display's refresh rate (Windows: Settings → Display → Advanced), window size, devicePixelRatio,
       Windows' power mode and battery saver, Chrome's Energy Saver (chrome://settings/performance) on/off.
    2. Pause → **Benchmark: Frame Rates** (new: street, interior, combat, arrival at Unlimited / 60 / 30, ~2.5 minutes), once
       plugged in and once on battery, Quality as played (Auto) and once at Medium chosen by hand. Paste each report whole
       (its "frame callbacks" line says whether Chrome's frame timestamps jitter; its 30 lines give the on-pace share, the
       50/66.7 ms frames and the catch-ups; GPU/CPU ms per second compare the load at each limit).
    3. Play 3 minutes at Frame Rate 30 with F9 on (the overlay's new line: limit · refresh · on pace %): the house, the
       square running while turning the camera, a fight with ball throws, a door in and out. Note the lowest "on pace" seen
       and anything that looks uneven; if possible a 240 fps phone video of the screen for 10 s at 30 and at 60.
    4. Also on the same build, with Chrome's own FPS meter (DevTools → Rendering → Frame Rendering Stats) at 30: if it
       shows ~60 while the game's F9 shows 30, say so (the compositor drawing HUD animations — not the game's frames).
    Report as FPS30-HW in WORLD_ART_REQUESTS.md, the raw reports in docs/lba3-performance/HARDWARE/<date>-gtx1050-fps30/. Never
    change system power settings yourself.
56. **ARRIVAL-STEPS-HW (REPAIR-PASS-18-11 phase 5; docs/lba3-performance/PERFORMANCE_REPORT.md).** The cloud cut a scene
    change's preparation behind the black (shadow batches, draw batches, their settle and return, the shader warm-ups) into
    slices of at most 12 ms a black frame (a slice ends after the piece, cell part or program that crosses it; the warm-up
    compiles a never-compiled material on its own). Measured on SwiftShader only. On THIS machine, in Chrome against the
    artifact or the repo served at the ARRIVAL-STEPS tip:
    1. Record the GPU Chrome actually uses (chrome://gpu; the user's 19.11 run reported the Intel UHD 620, 18.11's the
       GTX 1050 — say which, and Windows' per-app GPU preference), power (AC / battery), window, devicePixelRatio.
    2. Pause → **Benchmark** (Quality Auto as played): on the GTX 1050 on battery, and on the UHD 620 if Chrome uses it. Paste
       each report whole: its "scene changes' preparation behind the black" line gives each step kind's count / longest /
       total ms (shadow batches, texture layers, draw batches, draw batches settle, draw batches back, geometry, shader
       warm-up); the arrival route's frames over 33 ms behind the black; any frame over 33 ms in view in the first 6 s
       after an arrival (18.11: one of 34 ms at 5.6 s).
    3. Pause → **Benchmark: Frame Rates**, once on battery: whether the arrival's black frames stay near one or two
       refreshes at 60 and at 30.
    4. A fixed **High** benchmark on battery on the GTX 1050 (Pause → Benchmark, Quality High chosen by hand): the evidence
       Auto's first guess needs (today battery → Medium; the cost model, from the Vega 8, puts High's GPU time at ~1.8×
       Medium's; the GTX 1050's plugged-in runs of 10.11 measured ~1×).
    Report as ARRIVAL-STEPS-HW in WORLD_ART_REQUESTS.md, the raw reports in docs/lba3-performance/HARDWARE/<date>-arrival-steps/.
    Never change system power or GPU settings yourself.
57. **JOINTS-BLENDER (the user, 20.11, to the local agent; status.md P82).** "Use the locally installed Blender to improve
    character joints and animation. Edit the actual character assets, export them through the project's pipeline, and
    integrate them into the playable game. The player's complaint is specific: arms and legs still read as connected tubes.
    The goal is a character who feels like one body in motion while retaining the stylized proportions and charm of LBA2.
    Start with Twinsen's magic-ball throw; once that works, apply the lessons to Zoé and the rest of the cast."
    **What the cloud already knows (read before starting):**
    - The game displays `assets/poly/<name>.json` (characters.js `polyCharacter`: unindexed skinned triangles, bones by
      name, `eyes`/`mouths` entries), built by the generators in `tools/blender/`: `twinsen_poly.py`, `zoe_poly.py`,
      `cast_poly.py` (the rest of the cast, present), `baldino_poly.py` (the Grobo), `lbapoly.py` (shared). A look with no
      JSON falls back to the procedural sculpt (characters.js `buildCharacter`, engine/sculpt.js) — check none of the four
      falls back. **The user plays the artifact in Chrome** (no desktop build is shipped); verify there, or the repo served.
    - CHAR-FORM (cloud, 18.11, docs/lba-maturity/CHAR-FORM.md) already reshaped Twinsen and Zoé in the generators (flags
      `TW_FORM`, `ZOE_FORM`, on; `=0` rebuilds the previous model byte for byte): Twinsen's shoulder line, cape folds, robe
      over hips/knees, shins; Zoé's trousers, knees, hem, arms. The user still sees tubes — start from the result in game,
      not from that doc's claims.
    - **The animation is procedural**: the poses and timing (walk, run, throw, sword, landing, pickup, talk) are code in
      `src/engine/rig.js` (Rig.update, the action poses), not Blender clips; the ball's release is a gameplay event in
      `src/game/combat.js` / `actors.js` (released at ~0.18 s, FPS30.md: the same at 30 and 60). Performance changes
      (the throw's three moments: weight set and hand drawn back; torso and shoulder lead into release; follow-through and
      settle) are made there, keeping input response and the release frame where the ball visibly leaves the hand.
    - Faces (FACE-1.md): keep the `eyes`/`mouths` entries and their pivots; the brows are found at runtime as a pair of
      small separate pieces over the eyes (characters.js `autoBrowIdx`) — keep each brow its own piece, alike left and
      right, or that character loses its brow expressions.
    **The brief, in its order:** (1) find the models the game displays — trace Twinsen, Zoé, Arthur and one non-human
    resident (a Grobo) from spawn to mesh, skeleton and animator; edit the authoritative source (the generator), or a
    reproducible import/edit/export path verified by an unchanged round trip first; keep bone names, attachment points,
    facial data and bindings. (2) Diagnose Twinsen with one repeatable shot: the throw from the normal gameplay camera and a
    closer three-quarter view (wind-up, release, follow-through), a bent elbow, a crouch, one full stride; for each defect
    find its cause first — cylindrical at rest → reshape (distinct widths and profiles for upper arm, elbow, forearm,
    wrist); good at rest but collapsing when bent → joint pivot, mesh round the bend, weights; hand/boot separating →
    attachment and overlap through the motion (keep rigid pieces rigid); joints hold but motion mechanical → timing and
    poses, not geometry. (3) Repair in Blender: the shoulder first (torso → shoulder → sleeve: no dent, gap or peg when the
    arm lifts; keep the tunic and broad sleeves); elbows and knees with enough geometry round the bend (inside compresses,
    outside keeps its shape), weights painted locally and checked in real poses front/side/rear, belt, shoes and equipment
    holding their shape; wrist and ankle (hand out of the cuff, leg into the shoe at every angle); the neck turning to speak,
    the hips crouching; move vertices before raising the budget; a helper bone or corrective shape only for a specific
    defect still visible in game and only if the runtime supports it. (4) Performance: the throw's three moments (above);
    the same joints in a sword swing, a jump landing, walk-to-stop and a pickup; planted feet against a fixed ground point —
    fix sliding without changing speed or collision. Zoé: a real conversation and her reach toward the tap (shoulder, gaze,
    wrist, sleeve together); Arthur: a quick turn toward a parent and his shorter stride; a Grobo: the trunk against the
    chest walking and turning. Keep each body's proportions; shared fixes where the defect is shared, not the same motion
    on every body. (5) Prove it in the game: rebuild the assets, run the game, matched before/after clips (same camera,
    action, lighting, speed) including the normal gameplay distance; confirm the updated asset loads (no silent fallback);
    the throw and landing at 30 and 60 FPS; equipment, faces, ground contact and transitions intact; compare triangles,
    skinned vertices, bones, materials, draw calls; frame time in the same populated street before/after, naming the
    machine (no Vega 8 / GTX 1050 claim unless measured there).
    **Deliver**: the edited generators (or the editable Blender source), the rebuilt `assets/poly/*.json`, rig.js changes,
    matched clips in `captures/joints-blender/`, and a short report `docs/lba-maturity/JOINTS-BLENDER.md` (which joints
    were fixed, what was verified in play). Continue through every character without waiting for review of each.
    **Coordination**: work on a branch from `ccr-c1c2c4b9-dep6ed`, push it as `joints-blender` (not to the cloud's branch);
    cloud workers are meanwhile editing story files (ballastra, network, epilogue, openingsteps, tutorial, prologue,
    middle-chapter quests) — stay out of those; rig.js and characters.js are yours for this order (tell the cloud in
    WORLD_ART_REQUESTS.md as JOINTS-BLENDER when you start and when done). Never commit LBA1/LBA2 files. Test lightly
    (the user: minimal tests while working; one full test at the end).

58. **POLISH-SWEEP (the user, 20.11, to the local agent; status.md P84): "verify that everything is in its place, there are no
    problems with where things are positioned, and everything looks polished."** Play the whole game world with the real GPU
    and the normal gameplay camera, find every placement defect a player would notice, fix it, and prove each fix in a
    matched before/after capture.
    **What counts as a defect** (in order of how much a player notices it):
    - Objects floating above the ground or floor, sunk into it, or half inside a wall, rock, fence or another object.
    - People (NPCs) standing inside walls, furniture, doors or each other; people whose feet are not on the ground;
      people facing a wall while they talk; a working person whose hands are far from what they work on.
    - Doors, gates and exits whose frame, landing or step does not meet the ground or the path; stairs, ramps and
      bridges not joined to what they lead to (the cave in upper Citadel was this kind: "the stairs in the air, not
      connected").
    - Gaps or seams in the terrain, cliffs, paths, walls and roofs (light showing through, a visible hole or step).
    - Overlapping surfaces that flicker (z-fighting), stretched or misaligned textures, signs or posters floating off
      their wall.
    - Things that block the way or the camera in an unpolished way: a crate in a doorway, a prop on a path, a lamp post
      through a roof.
    - Inconsistencies between visits: a thing that moves or disappears between chapters without a story reason.
    **How:**
    1. Interiors first: run `tests/place-scan.mjs` (it builds every room and judges inside/wall/float/sunk/back/facing/
       door/adrift; see its head). Then look at each room yourself in the game camera, because the scan only knows boxes.
    2. Outdoors: walk each region along its paths and around its buildings: Citadel (upper and lower, the harbour, the
       lighthouse, the spaceport), Zeelich (the street, the mills, Mill Lane, the council), Desert Island (Kesh, the bore),
       the Hamalayi (Lhar, the monastery, the observatory), Ballastra. Write a small outdoor scan like place-scan
       (props and NPCs against the ground height and colliders) if that finds faster than eyes.
    3. The chapters change the world: check each region in at least one early and one late chapter, using the saves
       in `tests/fixtures/campaign/`.
    4. For each defect: record it with a capture (game camera), its cause, and fix it at its source (the region or room
       builder, the NPC's spot or round, the prop's offset). Do not hide a defect by moving the camera. Keep old saves
       loading.
    **Leave out:**
    - The School of Magic's exterior and Tali's court: P41, the user approved moving them together, to be done separately.
    - Zeelich Spaceport's layout: P26, to get Citadel's terminal layout, separately.
    - The cloud is editing story text, `src/main.js`, `src/game/story/balances.js` and the campaign tests; stay out of
      those.
    - `rig.js` and `characters.js` belong to JOINTS-BLENDER (order 57). If both orders are yours, do them one after the
      other.
    **Deliver:**
    - Work on a branch from `ccr-c1c2c4b9-dep6ed`, pushed as `polish-sweep`.
    - Matched before/after captures in `captures/polish-sweep/` (same camera, same spot).
    - A report `docs/lba-maturity/POLISH-SWEEP.md`: a table of each defect, where, its cause and the fix, plus what
      was checked and found fine.
    - Say POLISH-SWEEP in WORLD_ART_REQUESTS.md when you start and when you are done.
    - Measure frame time in one populated street before and after, naming the machine. No visible change may cost
      performance.
    - Never commit LBA1/LBA2 files. Test lightly; the cloud runs the full test.

59. **HIDDEN-TRIS-HW (the user, 20.11, to the local agent; status.md P85): "check whether there are hidden triangles in a
    small part of the game, to see whether it weighs on the game."** Triangles drawn that a player can never see, from any
    reachable spot:
    - under the terrain or floor;
    - inside walls, rocks or other solids;
    - the hidden halves of overlapping props;
    - bottoms of things resting on the ground;
    - back sides drawn because a material is double-sided;
    - backs of buildings against a cliff;
    - far props at full detail.

    The cloud has a worker finding the hidden set in software (no real GPU there). It will write
    `docs/lba3-performance/HIDDEN-TRIS.md` (method, the list of sources, a SwiftShader-only estimate). Your part is
    **the real cost on a real GPU**, which the cloud cannot measure:
    1. **Area:** Citadel round Twinsen's house (the yard, the lane, the square with the well); then one busy area of your
       choice (Zeelich's street or Kesh).
    2. **Find the hidden set.** If HIDDEN-TRIS.md is merged, use its method and list. If not yet, find it yourself with
       an ID render: each piece in its own colour, from many reachable camera spots and headings, read back; pieces or
       triangles never seen are hidden. Count double-sided backs separately.
    3. **Measure on this machine's GPU:**
       - with the hidden set drawn, and with it removed (hidden or skipped in its batches), at the same camera points;
       - frame time p50/p95, GPU time if available, triangles and draw calls (`renderer.info`);
       - at Medium and High, plugged in.
       Name the machine and GPU. Never write a GTX 1050 or UHD 620 number unless measured on that machine.
    4. **Verdict, with numbers:** does it weigh on the game? How much of the frame does it cost? The cheapest fix if it
       is worth it, for example:
       - drop buried faces at build time;
       - single-sided materials where double isn't needed;
       - trim bottoms;
       - a per-area "never visible" list.
       Implement only a fix with a clear measured win and no visible change.

    **Deliver:**
    - Work on a branch from `ccr-c1c2c4b9-dep6ed`, pushed as `hidden-tris-hw`.
    - A section "Real GPU" in `docs/lba3-performance/HIDDEN-TRIS.md` (create the file if the cloud's isn't merged yet),
      with the numbers table and the verdict.
    - Say HIDDEN-TRIS-HW in WORLD_ART_REQUESTS.md when you start and when you are done.

    **Order with the other jobs:** do this before POLISH-SWEEP (58), because it is short; JOINTS-BLENDER (57) as it stands.
    Never commit LBA1/LBA2 files. Test lightly.

60. **The user, 21.11 morning: "give the local agent tasks".** State: artifact **v113** (stamp commit "Build stamp for
    artifact v113"). Tonight the cloud published v110 FACE-2 (dialogue camera, `docs/lba-maturity/FACE-2.md`), v111
    ARRIVAL-2, v112 P87b and v113 P87c (`docs/lba3-performance/PERF_ARRIVAL.md` §ARRIVAL-2/P87b/P87c). Every number
    there is SwiftShader only. Work these one at a time, in this order:

    0. **FPS30-PRESENT — first, before everything else (the user, 21.11, P88: "30fps is still not even and doesn't look
       good, still jumps, not steady at 30").** Order 55 (FPS30-HW) was never reported; do it now with the real
       presented frames, on this laptop (GTX 1050), in Chrome, the artifact build (v113) served directly and inside
       claude.ai's frame:
       - Note the screen's refresh rate (Windows display settings), plugged in vs battery, Chrome's Energy Saver state,
         and whether the GTX or the Intel GPU draws Chrome (chrome://gpu). Do not change OS power or GPU settings.
       - Pause → Benchmark: Frame Rates, plugged in and on battery; paste both reports.
       - At Settings → Display → Frame Rate 30, record a Chrome Performance trace (DevTools or Playwright CDP
         `Tracing` with the `devtools.timeline` and `disabled-by-default-devtools.timeline.frame` categories) for 20 s:
         square running while turning the camera, then the house. From it: the rAF callback intervals, the
         **presented / dropped frames** (the Frames track), main-thread time per frame and GPU time per frame. The
         question is whether rAF is an even 33.3 ms while presentation is not (the compositor showing a frame one
         refresh late when the GPU time crosses a refresh), or rAF itself is uneven.
       - The F9 overlay's pacing line at 30 (on pace %, ≥1.5× count) in the same walk.
       - Then the same at 60 for comparison.
       Report as FPS30-PRESENT in WORLD_ART_REQUESTS.md with the numbers and the trace files (zipped, under
       `docs/lba-maturity/fps30-present/`). **Measure only, no code change**; the cloud will fix from your numbers.
       Never write a number not measured on this machine.
    1. **ARRIVAL-HW (short, measure only).** On this machine's real GPU, in Chrome, plugged in, Medium and High:
       Zeelich arrival from Citadel, the tavern from the street, and the return to Citadel from Zeelich. Base
       `a4e1fb45` (v109) against `ccr-c1c2c4b9-dep6ed` (v113). Use `tests/arrival-steps.mjs` and the probes in
       `docs/lba3-performance/ARRIVAL-2/probes/`. Report the longest frame, p95 frame time and any visible hitch for
       each. Name the machine and GPU; never write a GTX 1050 or UHD 620 number unless measured on that machine. Add a
       "Real GPU" section to PERF_ARRIVAL.md. No code change.
    2. **FACE-2-HW (look and report).** Play the chapter-1 talk with Zoé in the yard, Granny Ume, Maro and Tilde, and
       one later talk of your choice (chapters 1–2 only in anything shown to the user). Record frames or a short clip
       at the dialogue camera. Judge the cuts between speakers (the 2.2 s hold), whether a face is ever covered, and
       whether the head posture (curious tilt, concerned head down) reads. Report as FACE-2-HW in
       WORLD_ART_REQUESTS.md with captures in `captures/face-2-hw/`. **No code change:** the cloud owns
       `src/engine/camera.js` today (FACE-2 leftovers).
    3. **P58 (Twinsen hidden at the station).** The cloud's AUDIT-FIX tried 351 spots and found him hidden only at the
       fort wall's corner near the station. With the real GPU, walk the station area at the play camera (Follow
       mode, and also Fixed) and look for spots where Twinsen is hidden by a roof, wall or hut. For each, record the
       spot (x, z), the camera mode and a capture. Fix only at the world's side (a wall's or roof's fade/cut in
       `src/game/roomocc.js`, or the piece's placement); do not touch `camera.js`. Report as P58-HW.
    4. **JOINTS-BLENDER (order 57) continues:** sword, landing, walk-to-stop, pickup.
    **Deliver:** each job on its own branch from `ccr-c1c2c4b9-dep6ed` (`arrival-hw`, `face-2-hw`, `p58-hw`, and
    `joints-blender` as before), pushed, plus a line in WORLD_ART_REQUESTS.md when you start and finish each. Stay out
    of `camera.js`, `rig.js` (except order 57), `src/game/story/*` and `src/game/text/*`: the cloud works there.
    Never commit LBA1/LBA2 files. Test lightly; the cloud runs the full test.

61. **SMOOTH-HW (the user, 21.11: "make movement, camera rotation and combat feel smoother without sacrificing the art";
    status.md P89).** The cloud worker SMOOTH-1 is writing `tests/smooth-routes.mjs` (three scripted routes in loaded
    scenes, Follow camera, 1366×768: Citadel street run/turn/stop/camera sweep over the harbour; combat strafe + two ball
    throws; Mill Lane beside the moving lift and cart while rotating the camera) and `docs/lba3-performance/SMOOTH-1.md`
    with the exact local procedure. When it is merged on `ccr-c1c2c4b9-dep6ed` (the coordinator will say so in
    WORLD_ART_REQUESTS.md), run it on this laptop, headed Chrome, before (base = the commit before SMOOTH-1's merge) and
    after, **3 runs each**, separately **on battery** and **plugged in**, at 60 and at 30, Medium (and High plugged in);
    note which GPU Chrome uses (chrome://gpu). If the GPU is over budget on a route: the same route at 100 % vs 90 % world
    resolution, then edge smoothing on/off, separately. Report frame p95/p99, stalls > 50 ms, CPU and GPU ms/frame, and
    whether the motion looks even at a stable frame time (a short clip per route). Do not change OS power or GPU settings.
    Measure only; report as SMOOTH-HW with numbers in SMOOTH-1.md's "Real hardware" section on a branch `smooth-hw`.
    Order: after 60.0 FPS30-PRESENT, before 60.1.

62. **FPS30-FEEL (the user, 21.11: "running, turning the camera and aiming the magic ball should feel steady and
    responsive at 30, keeping the image sharp"; status.md P94).** First of the queue after 60.0 (it is the same
    question with real presented frames). Use the packaged Electron build (`desktop/`) if it builds, else headed Chrome;
    say which. Citadel street, already loaded (not the first seconds after arrival), 1366×768, 60 Hz, Follow camera,
    Frame Rate 30, Medium. Record: the GPU actually used (chrome://gpu or the game's benchmark line), the display
    refresh, the preset, render scale / world resolution, devicePixelRatio, battery vs plugged in. **On battery first,**
    then plugged in. Same save and settings before and after. Three tests, **3 runs each**:
    - **T1 pan:** stand still and turn the camera at a constant speed past a row of windows or fence posts (~5 s);
    - **T2 run–stop–reverse:** run along the fence, stop, run back, camera untouched;
    - **T3 aim:** strafe, turn, aim at a small target (a bell if one is in view) and throw the magic ball.
    For each run: rAF intervals, intervals actually drawn (the game's `perf` counters), and presentation timing if the
    platform shows it (Chrome trace "Frame" / `PresentationFeedback`, or the Electron `--enable-gpu-benchmarking`
    swap times); p50/p95/p99, the longest, and the count of intervals ≥ 45 ms. Label each number with what it measured.
    Target: one new image every 2 refreshes (33.3 ms); an average of 30 is not a pass. Also a 60 FPS capture (a phone
    filming the screen is fine) of T2 and T3, measured separately. Mouse and, if one is at hand, a controller for T3.
    Then the 60 FPS cap: T3 and one bank-shot puzzle, to catch regressions.
    **Before** = the current `ccr-c1c2c4b9-dep6ed`; **after** = when the coordinator writes "P94 merged" in
    WORLD_ART_REQUESTS.md. Measure only; no changes to OS power or GPU settings. Report as FPS30-FEEL in
    `docs/lba-maturity/FPS30.md` §8 "Real hardware" on a branch `fps30-feel`, pushed.

**21.11 afternoon (cloud coordinator):** 60.1 ARRIVAL-HW, 60.2 FACE-2-HW and 60.3 P58-HW are merged (thank you; P58's
occluders ship in v118). Still open, in this order: **60.0 FPS30-PRESENT → 62 FPS30-FEEL "before" → 61 SMOOTH-HW →
63 DEPOT-CLIP → 60.4/57 JOINTS.** Note FACE-3 (v115) changed the talk shot at Corla's kiosk and in Fixed/Free: the
"Corla hidden by her booth" finding is fixed from the hatch; from the kiosk's back corner it is the talk prompt's reach.

63. **DEPOT-CLIP (the user, 21.11, P93: "a before/after clip if rendering is available").** The Zeelich depot
    (chapter 2, the code cylinder) changed in v118: a loose door leaf on the red container knocks in gusts and when hit
    by the ball; the nearest guard turns, or walks over and looks; the patrols have their own beats; the gate's colliders
    and the ball's release at 30 were fixed (`docs/lba-maturity/DEPOT.md`). On the GTX 1050, headed Chrome, 1366×768,
    Follow, Medium: run `tests/depot.mjs` once (HEADED=1), then record two short clips by hand or by the test's staged
    starts, **before** (the commit before "Merge branch 'worktree-agent-a016d250d6b208b4f'") and **after**: (a) a gust:
    the leaf swings and the guard turns and goes back; (b) a throw at the leaf from inside the gateway, the guard walks
    over, Twinsen slips past in Discreet to the locker. Once at 60 and once at 30. Also report anything that looks wrong
    (the leaf clipping, the guard sliding, the ball through a wall). Captures under `captures/depot-hw/` (≤ 15 MB, mp4 or
    gif), a line in WORLD_ART_REQUESTS.md, branch `depot-hw`. No code changes unless a defect is obvious and local.

64. **AUTO-HW (the user, 21.11: "make Auto give the best picture and quality while keeping it smooth, in every way";
    status.md P95).** A cloud worker is improving Auto's choices (`src/engine/autoquality.js`, `autoapply.js`). Before its
    merge (now) and after ("P95 merged" in WORLD_ART_REQUESTS.md): on this desktop (GTX 1050) and, if the user can, the
    other laptop (UHD 620, devicePixelRatio 2), with a **fresh profile** (no cached Auto result) and Quality Auto: play
    3 minutes across the Citadel street, a house interior and a combat, battery and plugged in, Frame Rate 60 and 30.
    Record what Auto settled on (the F9 overlay / benchmark line: profile, world resolution, render scale, edge smoothing),
    when it changed, frame pacing (presented intervals p95/p99, ≥ 50 ms count) and GPU ms, and then the same 3 minutes
    forced one profile higher by hand: did that hold the pace too (Auto left quality unused) or not? Screenshots at the
    same spot for each profile to judge sharpness. Measure only; report as AUTO-HW on branch `auto-hw`.
    Queue: after 62, before 61.
    **The cloud's P95 work is written up in `docs/lba3-performance/AUTO-P95.md`.** §7 is the exact step-by-step (console
    lines to clear the cache, read Auto's decisions and force a profile up or down; Medium-lean is a new profile there).
    §4 is the synthetic before/after table to compare against. §8 is the empty "Real hardware" section to fill in.

65. **GPU-TIMER-KA (P96-HW follow-up: "the game's GPU timer reads 16–20 ms with v122 against 6–8"; docs/lba-maturity/FPS30.md
    §9).** The cloud found no flaw in how the query is opened and closed: it begins and ends round `composer.render()` in
    one task, so it cannot span a skipped refresh. Most likely the TIME_ELAPSED query on ANGLE/D3D11 is two GPU timestamps
    on the queue the whole browser shares, so it now also counts the compositor's extra frames/presents (or a wait for
    them) that the keep-alive mark brings. Auto (P95) would have read those 16–20 ms as "GPU past the next refresh" and
    walked down at 30 (to Low in the cloud's synthetic GTX run). Now a frame measured after a mark is tagged; a window
    late by such a reading alone is "suspect": one judged step at most (it comes back when the reading does not fall
    with the profile), never a step in hold; the title calibration sets such readings aside. Two diagnostic switches,
    read once at the first mark; type them in the console, then reload: `localStorage.lba3_keepalive = '0'` (no mark)
    and `localStorage.lba3_keepalive = 'opaque'` (an opaque near-black pixel instead of the 1–2 % alpha one; your P96-HW
    diagnosis changed an opaque pixel on every callback and read 7.5–8.7 ms). `localStorage.removeItem('lba3_keepalive')`
    restores the default. The F9 overlay now has a line `GPU (timer) p50 · p95 — <each pass's p50>` and, under a limit,
    `after a keep-alive mark N % (p50 …; others …)`.
    On the GTX 1050, **plugged in**, headed Chrome (`--use-angle=d3d11` as in P96-HW), 1366×768, Follow, the clock in the
    **57 Hz state** (rAF p50 17.4–17.7 ms; say if it is not), on **this branch once merged** (the coordinator writes
    "GPU-TIMER-KA merged" in WORLD_ART_REQUESTS.md):
    1. **Frame Rate 30, Medium by hand**, Citadel street, 2 minutes each with the keep-alive **default**, **`'0'`** and
       **`'opaque'`** (a preset chosen by hand runs no timer in play: start it in the console with
       `game.renderer.timer = game.perf.gpuTimer; game.perf.gpuTimer.stride = 2; game.perf.gpuTimer.reset()`, or use
       P96-HW's runner as before): the overlay's GPU line (p50/p95 and **each pass's p50**: is the extra time in one pass, `output` or
       `scene`, or spread?), `game.perf.gpuTimer.stats()`, rAF gaps ≥ 45 ms and > 300 ms per pass, presented intervals
       as in P96-HW (`fps30feel.mjs` T2), nvidia-smi average. 3 passes each, interleaved.
    2. **Frame Rate 60**, the same 2 minutes, default and `'0'`: the GPU line should read the same both ways (no mark at
       60). 1 pass each.
    3. **Auto, fresh cache** (`localStorage.removeItem('lba3_autoq_v5')`, reload), Frame Rate 30, keep-alive default:
       play 3 minutes as AUTO-P95.md §7 (street, house, back to the street, a fight, the street again). Record
       `game.autoQ.report()` (its `last window` line now says how much of the GPU reading came after a mark) and
       `game.autoQ.state().log`: the profile it settles at in the street, every step with its reason ("judged at the
       revisit", "did not help … back to …") and the title calibration line ("set aside"). Then the same with
       `lba3_keepalive = '0'` (fresh cache again). Expected on this build: High, or one step that comes back, with the
       mark; with `'0'` the timer should read 6–8 ms and Auto settle as it does at 60. Then reload once more without
       clearing the cache: it should hold the settled profile with no step. The same at Frame Rate 60 once (default).
    4. Optional, if the UHD 620 laptop is at hand: step 1's default vs `'0'` at 30 only (does its timer grow with the mark
       too? the cloud's synthetic test cannot tell, and Auto's judgement of a really late UHD frame depends on it), and
       step 3 at 30 once.
    Measure only; no OS power or GPU setting changes. Report as GPU-TIMER-KA in FPS30.md §9 "Real hardware" on branch
    `gpu-timer-ka`, raw logs beside P96-HW. Queue: before 61, after anything already running.
    5. Also (CAMERA-NIGHT, 22.11): in any `fps30feel` T3 pass at 30 with RATES=real, keep the per-frame record (`OUT`)
       and send it with the report. Order 62's one 2.96 m camera step is most likely a single ~133 ms frame (4/30 s of
       play at ~22 m/s) and not a camera rule; the record settles it.

66. **NO-PERF (the user, 22.11: "give the local agent tasks that aren't related to performance").** Build: the cloud's
    `ccr-c1c2c4b9-dep6ed` head (artifact v142 or later). Headed Chrome on the desktop. Take pictures and form judgements,
    and measure no frame times. Steps, in this order:
    1. **JOINTS-BLENDER 8+ (P82, continuing order 57 with the local Blender):** the cast after Twinsen and Zoé. Do Arthur
       first, then a Grobo (Baldino-type body), then a Rabbibunny and a Sphero townsperson. For each one: no tube or ball
       look at the shoulder, elbow, hip or knee in motion (walk, run, the idle gesture, talk). Use the same pipeline as
       steps 5–7: capture, a working copy, a focused edit, previews, export, an in-game load, a comparison, and
       `anim-polish` plus any test that covers the character. Send each as its own diff, with before/after pictures from
       the play camera and at dialogue distance.
    2. **A look at today's Citadel on the real GPU (P103 FLAT-TOWN, v142).** Take play-camera pictures in Follow (Far is
       the default now), in the Fixed view and from the top, at these spots: the square by the Twinsen & Zoé statue (the
       raised plaza and its two steps all round), the north street, the west street, the new flight of 20 steps up to the
       promenade, the promenade along the west shore with its sea wall, coping, lanterns and rail, the blue-roof house at
       the edge (the user's picture), and the harbour. Look for anything floating, sunk, clipped, flickering (z-fighting),
       a seam between paving and wall, a dark or wrong texture (the cloud's note: the inland wall's rubble reads dark in
       shade), or NPCs walking through the new steps or walls. Walk Twinsen up and down the stair and along the sea wall
       with real keys. Report each finding with its world position and a picture.
    3. **The shop panel (P104, v141):** the pharmacy, Pippa's shop and the Zeelich arsenal, in English and Hebrew, at your
       window size and at 1366×768. Check that the title and the purse never touch, and that each item's "what it does"
       line reads clearly and is not cut off.
    4. **POLISH-SWEEP on Citadel after the ground change (P84):** a placement pass over the whole island only, since the
       ground moved. Look for doors, lamps, benches, crates, planters, signs, fences or trees floating or sunk. Name each
       one with its position; the cloud fixes them.
    5. **Play chapter 1 from a new game to the end with real input (keyboard and mouse), in English and once in Hebrew.**
       Note anything confusing, broken or odd: prompts, goals, camera, the flat town, the shop. Report as play notes
       with a picture each. Do not report frame rates or timings.



67. **WALL-NORMALS (the user, 23.11: "תיתן לסוכן המקומי לעבד את קירות ולעשות normal map").** With the local Blender,
    give the game's stone walls real surface relief: a matching **normal map** for each wall texture, so mortar joints
    and stone faces catch the (fixed) sun. Build: the cloud's `ccr-c1c2c4b9-dep6ed` head.
    1. **Which walls:** the textures in `src/engine/textures.js` used on walls: `fortStone` (now the default for Citadel's
       retaining/sea/lawn walls — the user's pick, island.js WALLS 'c'), `rubbleHouse` (the houses), `rubble` (quays,
       embankments), the fort's own walls, `stone`/coping; then Zeelich's and the islands' wall stones. Start with
       `fortStone` and `rubbleHouse` (Citadel, chapter 1). Each texture is GENERATED in code (canvas): the normal map must
       match it texel for texel — bake from the same stone layout (port the generator's layout to Blender, or render a
       height map from the generator itself: e.g. add a `heightOf(name)` variant beside it that draws stones as heights,
       then derive the normal map in Blender or in code). Tangent-space, OpenGL (+Y) convention, the same size and tiling
       as the colour texture.
    2. **Hooking it in:** materials are `MeshStandardMaterial`. IMPORTANT: `src/engine/drawbatch.js` and `merge.js` do
       NOT batch materials with a `normalMap` (they'd draw one by one) — so either add normal-map support to the batcher
       (one shared normal map per batch, like `map`, the texture array) or keep the count of affected walls small and
       say what it costs in draw calls (count them in the existing `?perf`/F9 overlay — a count, not a benchmark).
       The artifact is at its 512-file limit: prefer generating the normal map in code at load (from the height variant)
       over new image files; if you must ship images, say how many files.
    3. **The look:** subtle, LBA2-like — the walls stay flat-shaded and clean at the play camera (Follow, Far), with relief
       readable up close and at grazing light; no noisy sparkle or shimmer when walking (look at it in motion), no
       darkening in shade. Before/after pictures at the play camera and up close, in the morning and evening light, for
       each wall type: `captures/wall-normals/`.
    4. **Tests:** worldfit, overlap-sweep, occluders, citadel-structures, and the draw-call count before/after in three
       Citadel views. No frame-time measurements.
    5. Each wall type is a **visible change for the user's pick** (the user picks one by one): put each behind a switch
       (e.g. `?wallnormals=1` or per texture) with the default unchanged, and list them in your report. Send the diff as
       usual (`WORLD_ART_REQUESTS.md`, your branch).

68. **The user, 24.11: "give the local agent tasks; I'll get to the computer and start".** Build: the cloud's
    `ccr-c1c2c4b9-dep6ed` head (artifact **v158**, stamp commit "v158 published"). `git pull` before each step: the cloud
    keeps merging. **No performance or frame-time work** (still the user's rule). Reply in `WORLD_ART_REQUESTS.md`, one entry
    per step, pictures in `captures/hw-68/`, push your branch. The cloud's open-tasks table for the user is
    `docs/lba-maturity/OPEN-TASKS.he.md` (items 22–24 are yours). Steps, in this order:
    1. **v158 on the real GPU: the changes since v148, looked at, not measured.** Headed Chrome, the artifact or the branch.
       Pictures from the play camera and at dialogue distance; say what reads wrong. Each item names its doc:
       - Zoé: the bare scalp and the tie, the twinsen head shape (P120.md), in the house and talking.
       - Twinsen: his hands (v154's fist, P122) and the one-piece sleeve (P123.md), walking, throwing, talking.
       - The cast's new fingers (HANDS-2.md): Arthur, a Grobo, a Rabbibunny, a Sphero; talking and the idle gesture.
       - The notebook opening without hands (P122.md, the default `?opening=notebook`): watch it whole once with sound;
         the pages turn by themselves. Say if anything shows at the frame's edges at your window size.
       - Rocks settled into the ground (P121.md), the door-level terraces (P113), the straight lawn edges (P112,
         LAWN-EDGES.md) in Citadel; the overhead remarks of minor townsfolk (P116.md).
    2. **P-1: the Windows installer (release blocker for the private testers; docs/lba3-audit/release.md §7 P-1).**
       Wait until `desktop/package.json` says **0.50.0** (the cloud's RELEASE-PREP: version, no GitHub name in
       app-update.yml, DevTools only unpackaged); if it isn't merged yet, do step 3 first and pull again. Then on Windows,
       from a clean checkout: `cd lba3\desktop && npm ci && npm run dist:win`;
       `certutil -hashfile release\LBA3-The-Awakening-Setup-<ver>.exe SHA256` (record it); install (on a new Windows user
       account if the user allows, else the user's own); first launch (fullscreen default; SmartScreen "Run anyway" —
       the exe is unsigned); New Game → skip the opening → Pause → Save & quit → Quit Game; relaunch → Continue resumes in
       the house; Settings → Language עברית → quit → relaunch (still Hebrew); one session with the network off;
       Ctrl+Shift+I does nothing; no `resources\app-update.yml` in the install folder; the title shows v0.50.0;
       Settings → Apps → uninstall; note whether `%APPDATA%\LBA3 The Awakening` is kept (documented: kept). Report each
       step pass/fail with a picture. Do not upload the exe anywhere.
    3. **The first fights, played (the maturity review's first action; OPEN-TASKS item 12).** With real input (keys and
       mouse; Modern controls), from the staged saves the tests use or by playing: the chapter 2 depot, the Zeelich depot
       (chapter 3) and the Core's third pylon (chapter 16 — late-game: report only to the cloud, not to the user). For each:
       health on entering and leaving, deaths, what killed you, what felt unfair or unclear, how many tries. No frame
       times. The cloud turns this into options for the user.
    4. **ORDER 67 WALL-NORMALS** (above), as written: fortStone and rubbleHouse first, behind a switch, before/after
       pictures. (The artifact is no longer at a file limit since v150's bundle, but code-generated maps are still
       preferred.)

69. **The user, 24.11 (later): "give the local agent an order to install and test the game". FIRST in the queue; it
    replaces 68 step 2.** Build: the cloud's `ccr-c1c2c4b9-dep6ed` head (artifact **v160** or newer: `git pull` first; v160 added the behaviour modes, P125, so in step 4
    also try the new yard step — sneak up to the sleeping Dino-Fly in Discreet and pet him —, `desktop/package.json` = **0.50.0**). Reply in `WORLD_ART_REQUESTS.md` as
    **INSTALL-69**, one line per step (pass / fail + what you saw), pictures in `captures/hw-69/`, push your branch.
    **No frame-time or performance numbers** (the user's rule). **Do not upload the exe anywhere and do not commit it**
    (`desktop/release/` is ignored). Do not use `[build]` in a commit message (it publishes a GitHub pre-release).
    1. **Build** on Windows from a clean checkout of that head: `cd lba3\desktop && npm ci && npm run dist:win`.
       Record `certutil -hashfile release\LBA3-The-Awakening-Setup-0.50.0.exe SHA256` and the exe size.
    2. **Install** (a new Windows user account if the user allows, else theirs): SmartScreen "More info → Run anyway"
       (unsigned, expected); note the install folder and that a Start-menu / desktop shortcut appears.
    3. **First launch:** opens fullscreen; the title screen shows **v0.50.0**; F11 / Alt+Enter leaves fullscreen and the
       choice is remembered at the next launch; Ctrl+Shift+I does **nothing**; there is **no**
       `resources\app-update.yml` in the install folder; Alt+Tab out and back keeps the game and its sound.
    4. **Play as a player, with real keys and mouse (Modern controls), with sound:** New Game → watch the notebook
       opening whole once → the house → the yard and the first errands of chapter 1 → into chapter 2 as far as the
       first depot fight if time allows. Report anything a tester would trip on: stuck spots, a door or a talk that does
       nothing, a story line arriving after a gift line (v159 fixed the order: say if any is still wrong), a rock inside a
       wall, text cut off, missing or crackling sound, the camera inside a wall, a crash or a black screen. For the depot:
       health on entering and leaving, deaths, how many tries (this also covers 68 step 3 for that fight).
    5. **Saves:** Pause → Save & quit → Quit Game; relaunch → **Continue** resumes where you saved. Also load a save from
       the published page if you have one (format 6 must load).
    6. **Language and offline:** Settings → עברית → quit → relaunch (still Hebrew, the opening and a talk read right to
       left); one full launch with the network off (the game starts and plays the same).
    7. **Uninstall** from Settings → Apps; note whether `%APPDATA%\LBA3 The Awakening` is kept (documented: kept) and
       that the shortcut is gone.
    8. **Summary line for the user** at the top of INSTALL-69: "installs / runs / saves / Hebrew / offline / uninstalls:
       yes/no", and the three worst things a tester would notice, each with its picture. The cloud turns it into fixes.

70. **After INSTALL-69 (24.11, evening).** Build: the cloud's `ccr-c1c2c4b9-dep6ed` head (v160 + the merged WALL-NORMALS);
    `git pull` before each step. Reply in `WORLD_ART_REQUESTS.md` as **ORDER-70**, pictures in `captures/hw-70/`, push.
    No frame-time or performance numbers. **The cloud is fixing now (don't touch):** E's target next to people (the tap,
    Gilbert at the well and ladder), the Benchmark buttons in the pause menu, Quit Game's first click, the Modern-controls
    bank shot from a plate, Brix/Garrick/Dot's overhead remarks, the see-through arm in Zoé's talk shot, the shop house's
    door sill. Answers to your questions: the Sphero's ball knees stay (the user approved them as LBA1's look, 23.11);
    the door sill is in the cloud's fix above.
    1. **v160's behaviour modes, played with real keys** (P125, `docs/lba-maturity/BEHAVIOUR-MODES.md`): the yard's new
       step — sneak up to the sleeping Dino-Fly on the lawn in Discreet and pet him, then the pipe in Athletic; switch
       through all four modes once and picture the caption bottom-left (English and Hebrew); in the chapter 2 project
       depot, walk in Discreet and picture the yellow "?" and the red "!" over the guard. Say if anything reads wrong
       at 1366×768 on the real GPU.
    2. **WALL-NORMALS for Zeelich's and the islands' wall stones** (your open item): only if it can be done in code the
       same way as the Citadel's; **behind a switch, off by default** (these places weren't in the user's "everything"
       pick), before/after pictures from the play camera for the user's pick.
    3. **The first fights again, after the cloud's fixes land** (watch for the commit "TESTER-FIXES merged"): the Core's
       three pylons in **Modern** controls (report only to the cloud, late-game), and the Zeelich depot once more as in
       68.3. Same logs as 68.3.

71. **After v168 (25.11). Do this before 70 if 70 is still open; 70's step 3 (the first fights in Modern) folds in here.**
    Build: the cloud's `ccr-c1c2c4b9-dep6ed` head; `git pull` first. Build the Windows installer as in 69 and install over the
    old one. Reply in `WORLD_ART_REQUESTS.md` as **ORDER-71**, pictures in `captures/hw-71/`, push. No frame-time or
    performance numbers. Play as a player, real keys and mouse, with sound, 1366×768 and fullscreen.
    1. **The opening** (P130): watch it whole once. Twinsen must NOT stand on the pier under the title (he is at home
       until the film goes home). Arthur reads the notebook (his name on the subtitle). The crew wear orange overalls and
       a lime vest. Picture the title over the pier.
    2. **Zoé's new head** (P131, `almond-s`): at home, in a talk with her and from the play camera; front, side and
       talking. Say if it reads right on the real GPU (no holes, no flicker on the back of the skull, the ponytail and tie
       sit on the head). `?zoehead=twinsen` is the old one if you want a side-by-side (dev page only).
    3. **The crystals** (P128): the well cave in chapter 1 and the singing crystal on Citadel: a clear shell with a glowing
       core, no z-fighting or sparkle on the real GPU.
    4. **Small keys and clover boxes** (KEYS-CLOVER.md): in chapters 1–2 find the POWDER chest in the fort yard, take the
       key (the brass key with its count shows by the kashes), open FunFrock's old passage, take the clover box (the cap
       reads 10 in the behaviour menu), draw the bolt by the ladder and come back up through the yard trapdoor. Save &
       quit with the key held, Continue: still held.
    5. **The first fights in Modern controls** (70.3): the chapter 2 depot fight and the Zeelich depot (the softer Grobo
       guard, v162): health in and out, deaths, tries.
    6. **Plank bridge** (BRIDGES.md), only if you have a save on Zeelich's islands from chapter 3 on, or reach it: walk
       Mosquibee's plank bridge to the honey islet and back, and down the new stone steps; you must not fall through the
       gaps, and (after the cloud's next change) not off the sides either.
    7. **Summary line for the user** at the top: "opening / Zoé / crystals / key door / fights / bridge: ok or not", and
       the three worst things a tester would notice, each with its picture.
