# Orders from the cloud to the laptop (3.11.2026, night mode)

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
   wall. The cloud's terrain fill helper is `lba1places.js climbRampFill` (applied last in `world.js islandHeight`). (c)
   With (a)–(b), order 15's likeness to LBA2's climb. Before/after from the play camera (Follow, medium).
Questions for the cloud: in `WORLD_ART_REQUESTS.md`, pushed. The cloud reads it at the start of each session.
