# Expansion world spec: the cloud's work orders for the World Builder

The cloud session owns the story and the game's growth. The World Builder on the laptop builds what is ordered here
(`LOCAL_EXPANSION_PROMPT.md`).

- Orders are numbered W-1, W-2, …, built in order.
- Under each order the builder writes **Built** (files, handles, numbers, pictures, what's left).
- The cloud then writes **Accepted** or **Changes**.

Look: `docs/art-direction/EXPANSION_ART_DECISIONS.md` D1–D9. Places: `docs/future/EXPANSION_BRIEF.md` §7 and §10.

Spoilers: pictures of these places go to `docs/future/world/<W-id>/` only; the user is asked before seeing any.

---

## W-1 · Float Harbor, the slice (needs the user's approval before W-2)

Ballastra's arrival harbour, about a 30-minute slice of play once the cloud adds the story. It is the quality gate for
everything after it, so build it to the final standard: handcrafted, readable, alive, and inside the budget.

**The place.** A working harbour of floating platforms on a shallow sea. It is built in its own region, `ballastra`
(a lazy group, far from every other region).
- **Water:** shallow and green-blue. Floating platforms on floats and chains, joined by gangways.
- **Skyline:** one great stone arch (D3's anchor), visible from everywhere in the harbour, and an inhabited district on
  stilts beyond it. The district is scenery here; it is built in W-2.
- **Parts:**
  1. **The spacecraft pad:** a sturdy platform where the ship from Twinsun lands. Twinsen arrives here. The ship itself
     is the existing project ship, reused.
  2. **The cargo quay:** two cargo cranes on counterweights, crates and nets, and a customs hut (small, with its own
     look, not Odile's).
  3. **The boat lift:** a lock-like lift between the low outer water and the higher inner basin. Its moving deck is
     raised or lowered by a big **counterweight** on a chain over a wheel. A small stranded **working boat** sits on the
     deck, stuck halfway.
  4. **Tessa's repair shed:** a timber and ceramic workshop on its own float. Its door leads into a **furnished
     interior** (a separate room: workbench, tools on the wall, float parts, a stove, a hammock, drawings, a window onto
     the lift).
  5. **The pedestrian platform:** a hinged walkway across the lift, from the quay to the shed's float and on toward the
     district.
  6. **The shortcut:** a second, lower route (a cable ferry or a swing bridge) that is closed at first. Once open, it
     links the pad straight to the district's edge.
- **Height and readability:** a few levels of height (decks 1–3 m apart, ladders, ramps). Every walkable surface reads as
  walkable from the play camera. Rails where a fall would strand the player; water that is too deep has a soft edge
  that pushes the player back, never a death.
- **Life (props only; the cloud adds the people):** washing, nets drying, potted herbs on floats, gulls (reuse
  `gulls.js`), lanterns, the creak and bob of floats (a gentle animated bob).
- **Light:** day only (no night on Ballastra), with a soft sea haze. Its own palette is optional (`R.grade`/`gradeTint`).

**The puzzle's physical parts (N1, "Wrong Dock"). The story drives them through the handles below.**
- **The counterweight** has three positions: high, middle and low. Moving it changes the lift deck's level: high
  weight means a low deck, and the reverse. It is moved by a crank on the quay (a use spot).
- **The crane release:** a visible latch high on crane B (a magic-ball target, with a hit spot and a radius). Released,
  crane B swings its load over to the lift and adds weight.
  - Side effect (the story's complication): the swung load blocks the pedestrian platform until the counterweight is
    set to balance it.
- **The lift deck** moves smoothly between levels (about 1.5 s). The stranded boat rides on it. At the top level the
  boat can float out into the inner basin; give it a short "sail out" path the story can play.
- **Balanced** (one exact combination: the crane released and the counterweight in the middle): the deck is level with
  the inner basin, the boat is free, and the pedestrian platform is clear again. Nothing can be left permanently
  inaccessible; every part can go back.
- **The shortcut** opens when the story calls it (after the boat sails out).

**Handles to export:** `BALLASTRA.harbor` from `src/game/ballastra/harbor.js`.
- **Rooms and spots:**
  - `rooms`: `ballastra` (outdoor) and `bl_shed` (the shed interior);
  - `spawns`: `pad`, `shedDoorOut`, `shedIn`, `districtEdge`;
  - `doors`: the shed door in both directions.
- **Stand spots** (`{x, z, a}`) for:
  - `tessa_shed`, `tessa_quay`, `tessa_lift`;
  - `docker1`, `docker2`, `customs`;
  - `boatOwner`.
- **Interactive spots** (`{x, z, r}`): `crank`, `liftLever` (optional, a lever that only reports the level), `boat`,
  `shedBench`.
- **The ball target:** `craneLatch`, with `{x, y, z, r}`.
- **Methods** (pure setters; `instant` for loading):
  - `counterweight.set(pos /* 0 high, 1 middle, 2 low */, instant)` and `counterweight.pos`;
  - `crane.release(instant)`, `crane.reset(instant)` (the load swings back: the player can try again) and `crane.released`;
  - `lift.level` (read-only, worked out from the two above);
  - `walkway.blocked` (read-only);
  - `boat.sailOut(instant)`;
  - `shortcut.setOpen(b, instant)`.
- **Collision** follows the state: the blocked walkway is solid, the lift deck's height is right for walking on and off,
  and the open shortcut is walkable.

**Characters for W-1:**
- **Tessa**, a new model (D9).
- **Dockers:** two or three canal dwellers (D4), one new body with two or three outfits. A Twinsun trader can reuse an
  existing body.
- Each body is posed in its `characters.js` entry, and a lookdev sheet (idle, talk, walk, work) goes in
  `docs/future/world/W-1/`.

**Budget and measures (this laptop, Medium, plugged in and on battery; the Test Lab):**
- **Views:** the pad, the quay, the lift and the shed interior. For each, give draw calls, triangles, GPU ms and fps.
- **Budget:** at or under the Citadel street in each view.
- **Loading:** first-visit build time, kept small and stepped (as the other regions are).

**Pictures:** the play camera from the pad, the quay, the lift with the boat stuck, the lift balanced, the shed outside
and inside, and Tessa's lookdev.

**Built:** (the World Builder, 3.11.2026, branch `exp-w1-place`; the place only — Tessa and the dockers are the
character artist's, their stand spots are ready)

*Files* (all new, `src/game/ballastra/`):
- `harbor.js`: the region `ballastra` (its own lazy group at x 3 000, z −3 000, built in 12 steps), the layout, the lift,
  the cranes, the walkway, the shortcut, the boat, the life props, the soft edge, the handle `BALLASTRA.harbor`.
- `shed.js`: the room `bl_shed` (at x 3 800, z −3 000), the furnished interior.
- `sea.js`: the shallow sea (a drawn bed, the game's kind of water in Ballastra's green-blue, foam in the shallows, the
  arch mirrored in it) and the physics' deep water; `skyline.js`: the great arch, the district on stilts (scenery for
  W-2), a second far arch; `look.js`: Ballastra's materials and small pieces; `build.js`: the small buildings (the
  shed, the customs hut); `common.js`: `BALLASTRA` and `BALLASTRA_AT`.
- `tests/ballastra-harbor.mjs`: the place's own probe (19 checks, below). Pictures: `docs/future/world/W-1/`.

*The place* (three heights: floats 0.6 m, pad 1.4, quay, lift walls and walkway 2.2; the inner basin's water 1.7):
- the pad (south-west): a stone platform with a glazed landing ring, the project's ship on it (the existing model);
- the pontoon row to the cargo quay (stairs up), its middle section hinged in front of the lift's entrance;
- the cargo quay: crane A over a moored barge, crane B by the lift with its latch, crates, jar crates, sacks, nets,
  ballast pots, a barrow; the customs hut at the top of the stairs (cobalt glazed tiles, cream walls, a blue hip roof,
  a hatch with a striped awning, a slate and a bell, a cargo balance beside it);
- the lift: a stone chamber; a timber caisson with its own water and a stair on its east side; the gantry, three
  wheels, chains (they scroll as they run), the counterweight in its shaft with painted bands (high, middle, low), the
  winch (the crank; its handles turn), the level dial, the inner gate (opens for the boat), the outer gate; the
  stranded working boat on the deck;
- the hinged walkway over the lift's outer entrance (hinges and counterbalance on the quay), stairs down to the shed's
  float; Tessa's shed (tiled dado, painted boards, a thick roof with eaves, the stove pipe, a hoist beam, her sign);
  a gangway on to the district's edge, its gate shut (W-2 beyond); the shortcut's low piers and swing bridge.
- The walkway is the only link between the quay side (pad, pontoons, quay) and the shed side (shed, district's edge)
  until the shortcut opens: that is what the swung load cuts.
- Life: gulls (gulls.js: 7 on 13 perches), washing, nets, herbs in pots and on rafts, lanterns (glazed, a warm glow,
  no lights), skiffs, buoys and herb rafts on the swell (one shader, one draw), the mechanisms' sounds (the game's own:
  grind, clunk, rope creak, clang, thump). Day light with a soft sea haze (fog 70–300 m); no weather or light cycle
  (weather.js gives none to a place without its own); no night.

*The lift's rule* (the world's, as ordered): `level = clamp(cw − 1 + (released ? 2 : 0), 0, 3)`, `cw` 0 high, 1 middle,
2 low; level 0 low (the outer water), 1 halfway (stranded: the start, low and latched), 2 top (level with the basin),
3 over (too high). The counterweight alone is too light for the boat's deck; crane B's load, swung onto its cradle,
adds two steps. Balanced is only released + middle: the load seats on the counterweight, clear of the walkway;
released any other way it rests on the walkway. The deck moves in about 1.5 s a step.

*Handles* (`BALLASTRA.harbor`, world coordinates):
- `rooms` ['ballastra', 'bl_shed'] · `spawns` {pad, shedDoorOut, shedIn, districtEdge} · `doors` {shedOut, shedIn,
  shed.setLocked(b)} (the door works both ways by itself, as room exits) · `safe` (4 points).
- `stands` {tessa_shed (in bl_shed, at the bench), tessa_quay (by the crank), tessa_lift (the east wall over the deck),
  docker1 (by crane A), docker2 (by crane B's crates), customs (at the hatch), boatOwner (by the lift),
  boatOwner_moored (an extra: where the boat moors)}.
- `spots` {crank, liftLever, boat (follows the boat), shedBench} · `craneLatch` {x, y, z, r} (not a room ball target:
  the story decides what a hit does).
- `counterweight.set(pos, instant)`, `.pos` · `crane.release(instant)`, `crane.reset(instant)`, `.released` ·
  `lift.level`, `.levelName`, `.y`, `.moving` · `walkway.blocked`, `.solid` · `balanced` · `boat.sailOut(instant)`,
  `boat.reset(instant)` (an extra, so nothing stays out of reach), `.out`, `.free`, `.sailing` · `sailPath` ·
  `shortcut.setOpen(b, instant)`, `.open`, `.swinging` · `onChange(fn)`.
- Collision follows the state: the caisson's rims and stair at the deck's height; the load solid on the walkway while
  it rests there; the bridge walkable where it points (shut: a dead end), off while it swings; the boat solid aboard.
  The caisson's stair reaches the quay's height from any level: nobody is stranded on the deck.

*Hooks* (shared files): `src/game/regions.js` only — the import, `REF.ballastra`, `AT.bl_shed`, `OUT_AT.ballastra` and
one `add('ballastra', …)` line, each commented (registered like the other areas; the cloud owns registration and may
move it).

*Checks*:
- `tests/ballastra-harbor.mjs` (SwiftShader) 19/19 PASS: the region builds lazily, > 600 m from every other area; every
  handle present; every counterweight × crane state gives the rule's level, the deck's collision at its height, the
  walkway blocked and solid exactly when released and not middle, one balanced case at the top; animated moves
  ~1.5 s; everything resets; he walks the whole harbour by input (P.go: pad, pontoons, stairs, quay, crank, dial,
  walkway, shed float, gangway, district's edge, the shortcut's far pier, and back); in and out of the shed and to its
  bench; onto the deck at the top, ridden down, off by its stair at every level; the blocked walkway cuts the shed's
  side off (no plan, no walk) and balancing reopens it; the shortcut shut links nothing, open (it swings ~4 s) he walks
  it, it shuts again; the boat sails out (~10 s) and back; the soft edge eases him off the water; a second visit
  builds nothing.
- `tests/chapter1.mjs` 23/23 PASS and `tests/transitions.mjs` 6/6 PASS on this branch (SwiftShader; run locally with
  the Playwright path changed for this laptop, not committed).

*Numbers* (the laptop: Ryzen 5 3500U, Vega 8; the installed Chrome, fullscreen 1366×768, Medium, the follow camera at
Far, the game's own benchmark window per route, all routes in one run; **plugged in only** — battery not measured this
time; the display paced at 57.8 Hz, so every route reads ~57 fps and the GPU time is the comparison):

| view | fps | frame p50 / p95 ms | GPU ms p50 / p95 | render submit CPU ms | draw calls (shadow) | triangles |
|---|---|---|---|---|---|---|
| Citadel street (the budget) | 56.3 | 17.6 / 18.3 | 10.72 / 16.39 | 8.0 | 127 (23) | 396k |
| Twinsen's house (interior) | 56.5 | 17.7 / 18.3 | 9.26 / 12.74 | 2.7 | 51 (1) | 214k |
| the pad | 56.7 | 17.6 / 18.2 | 8.77 / 11.41 | 1.9 | 28 (4) | 186k |
| the quay | 56.5 | 17.7 / 18.3 | 9.25 / 10.79 | 2.2 | 50 (19) | 203k |
| the lift | 56.9 | 17.5 / 18.2 | 9.05 / 11.04 | 2.4 | 97 (35) | 239k |
| the shed (interior) | 57.6 | 17.2 / 18.1 | 8.51 / 9.19 | 1.5 | 24 (2) | 22k |

Every view is under the street in GPU time, CPU submission, draw calls and triangles; no frame over 33 ms in any
harbour route. First visit: 464 ms of build work in 12 steps, the longest 146 ms (the laptop, Chrome); 1.5–2.1 s on
SwiftShader. The first entry compiles 2 shader programs (the water, the floating pieces): the pad route's warm-up had
one 1.2 s frame — behind the arrival's black in play, but worth adding to the arrival's warm-up when the cloud wires
the travel. New resources: about a dozen small canvas textures (≤ 512²) and a 256² height texture; no lights outdoors, 3 in the shed.

*Pictures* (`docs/future/world/W-1/`, the play camera — Follow at Far — on the laptop's GPU, Medium): `W-1-01-pad`,
`W-1-02-quay`, `W-1-03-lift-stuck`, `W-1-04-lift-balanced`, `W-1-05-shed-outside`, `W-1-06-shed-inside`,
`W-1-07-district-edge`, `W-1-08-blocked-walkway`; and `W-1-09-skyline-free-camera` (the free camera, low). The play
camera's frame ends a few degrees over the horizon, so from the harbour it shows the district and the arch's legs,
and the arch in the water's mirror, never its span. Tessa's lookdev is the character artist's.

*Left / not done:*
- a travel route to Ballastra (`travel.js`, the cloud's): today he gets there only by `enterRoom('ballastra')`;
  the people are not placed (the stand spots are ready; who stands where is the story's).
- battery measurements; one run per view (the laptop: no fps chasing).
- the arch's span is seen only in the water and from a story camera (`W-1-09`); the district is scenery (W-2).
- the latch, the crank and the dial are spots: the story wires the inputs (the ball's hit, E at the crank).


*Characters* (the character artist, branch `exp-w1-chars`, merged; no rig or shared-file change):
- `tessa` (D9: compact mechanic, rolled sleeves, short teal apron with tools, a hammer at the hip, a headband, a forward
  lean) and `docker1`–`docker3`: one canal-dweller body (D4: shoulder-high to Twinsen, 1.42–1.53 m against his 2.16,
  round faces, fan ears on ear bones, broad feet) in three outfits, each with its own face, skin and height (an oilskin
  smock and knit cap; a vest, shorts, a straw cone hat and a rope, bare feet; an older docker in a leather tabard with
  a cargo hook). `blTrader` reuses `desertTrader`'s body.
- Triangles: tessa 3 710, docker1 3 450, docker2 3 664, docker3 3 792 (the cast: mostly 2 400–3 500; Twinsen 3 078).
  One vertex-coloured material, eye and mouth meshes, no textures, as the cast.
- They play idle, talk, walk and work (tinker / pump / potting) on the existing rig, with foot planting, ear motion and
  the talking mouth. Built by `tools/blender/ballastra_poly.py` (Blender is not on this laptop: stand-ins for
  bpy/mathutils in `tools/blender/nobpy/` rebuild the existing cast's JSON the same).
- Lookdev: `docs/future/world/W-1/W-1-tessa-lookdev.jpg`, `W-1-dockers-lookdev.jpg`, `W-1-cast-faces-indoor.jpg`,
  `W-1-cast-pose-tests.jpg`, `W-1-cast-lba2-camera.jpg`, `W-1-cast-in-citadel-*.jpg`.
- For the animator: a two-handed crank motion, a slower ear motion in talk, a heavier walk (`walkCycle` in the look).
- **Accepted by the user (4.11.2026)**, with a note for later (not now): "everything looks similar except the colours;
  there's no real uniqueness." Ballastra's own look (shapes, materials, building types, the canal dwellers' world)
  needs a pass of its own before or with W-2 so it doesn't read as the other worlds recoloured.
- **For the coordinator:** W-2 (the Arch District) can be ordered now (W-1 is accepted); the laptop builds it once
  it is marked **Ordered**.
---

## W-2 … W-8 · Draft, the coordinator reviews

**Draft, the coordinator reviews.** Written by the cloud's EXP-PLAN (01.11) from `EXPANSION_PLAN.md`. Do not build
any of these until the coordinator marks the order **Ordered** and W-1 is **Accepted** by the user. The story cards
that use each handle are named in brackets (N1–N6, BR-, SV-, UR-, NW-, OP-, DP- in the plan).

Shared rules for every order below, as in W-1:
- Each place is its own lazy group, far from every other region.
- It exports one handle object with `rooms`, `spawns`, `exits`/`doors`, stand spots `{x, z, a}`, interactive spots
  `{x, z, r}`, ball targets `{x, y, z, r}` and sword targets `{x, y, z, r}`.
- Moving parts are **pure setters** with an `instant` flag for loading, and readable state.
- **The story owns the puzzle rules.** Where a puzzle has a rule (which level follows from which setting), the story
  computes it and calls the setters. The world animates them, keeps collision in step, and plays the mechanism's
  sound. W-1's lift is the one exception, already specified.
- Deep water has a soft edge that pushes back. Every room has `safe` spots: the story returns the hero there after
  a fall or a drowning.
- Day only, no night (Ballastra too, and underground). No readable story text in the world beyond the placeholder
  signs given here.
- Measure each view on the laptop (draw calls, triangles, GPU ms, fps on Medium, plugged in and on battery), at or
  under the Citadel street. Pictures go to `docs/future/world/<W-id>/`.

**One request for W-1 (so it isn't reopened):** add `crane.reset(instant)` beside `crane.release` (the story lets the
player re-latch crane B and retry, N1).

---

## W-2 · The Arch District · **Accepted** by the user (7.11.2026: "I approve the expansion"; "looks good so far", 6.11) · Ordered by the coordinator 5.11.2026 after W-1 was accepted 4.11

The district under and on Ballastra's great arch, the skyline anchor already seen from the harbour. About 25–30 minutes
of play across N3 and OP-5, with return visits in N6 and the postgame. Lived in, not a set: homes, a market, a meeting
place, and the old pump machinery under the arch that explains the planet's history without a panel.

**The coordinator's review (the user's note on W-1: "Ballastra lacks real uniqueness beyond its colours").** W-2 is
where Ballastra must read as itself, not as a recoloured Zeelich or Citadel. Its one idea is **a city that lives by the
water's level**, and every part of the district shows it in form, not paint:
- things built to rise and fall: floats on chains, stilts with several doorstep heights, boats tied at two levels,
  gangways on hinges, washing lines that run from the high floor, not the low one;
- the record of the water everywhere: bands of old water lines on every wall, a painted level gauge on the arch's
  pier (no words), shells and weed dried at the old marks, doorsteps worn at three heights;
- the arch's silhouette and the pump machinery (glazed ceramic and bronze, D3) as the only big shapes; no domes or
  towers borrowed from the base game's places; houses narrow and tall with their living floor on top.
In the pictures, show the district at canal levels 0 and 1 side by side from the same play-camera spot: the change
should be readable at a glance. Measure as W-1 (at or under the Citadel street on the laptop's GPU).

**The place.** Its own lazy group, `bl_arches`, entered from W-1's `districtEdge` and the shortcut.
- **The arch:** one great weathered stone arch (D3), its feet in the water, its underside hung with homes.
- **The upper terrace** (dry, on the arch's shoulder): taller, older houses in glazed tile and stone, wider stairs.
  Oren's house is here.
- **The lower row:** homes on stilts at canal level along the arch's foot, doorsteps a hand above the water at the
  balanced level. Water lines (stains) on the walls a metre up. Mags's house is here.
- **The market:** a broad float under the arch: stalls under cloth awnings, Corvin's glaze stall (bowls and floats),
  fish, cloth, a tea stand.
- **The Speaking Steps:** a round stone platform with tiered steps, the public meeting place; visible from the market
  and the terrace.
- **Narrow stairways and ladders** link the lower row, the market and the terrace (2–4 m steps), with rails where a
  fall would strand.
- **The flood bell** (OP-5): a squat tower on the arch's shoulder with a bronze bell, a pull rope, a cam wheel with two
  settings, and **three horn mouths** that can each point one of three ways (terrace, lower row, gardens). The clapper
  is tied off at first.
- **Interiors:**
  - `bl_oren`: Oren's house, dry and orderly: a drafting table with drawings, a worn formal coat on a hook, shelves of
    ceramic models, a window that looks away from the water.
  - `bl_mags`: Mags's house, lower row: patched floor, water line on the walls, a committee table with cups,
    children's things drying.
  - `bl_pump`: the old pump room inside the arch's pier: big glazed-ceramic and bronze machinery, pipes with brass
    plates, the lower row's **spill gate** (a wheel and a vertical gate) **chained shut** with a heavy chain and an
    official seal plate, its pawl high on the pier wall.
- **Life (props; the story adds the people):** washing, boats tied at doorsteps, cats on warm tiles, potted herbs,
  lanterns, gulls (`gulls.js`).

**The puzzle's physical parts.**
- **The lower canal** has three levels:
  - 0 flooded: doorsteps under, boards across the walkway, washing taken in, shutters closed;
  - 1 balanced: doorsteps dry, walkway open;
  - 2 low: boats aground, mud.
  Level 0 is the starting state; N3 sets 1.
- **Dunn's door** (lower row): silted shut at canal level. A silt heap (sword target, three hits) and the door (a kick)
  open it.
- **The spill gate:** the chain (sword target, one hit cuts it) and the pawl (ball target). With both done the story
  calls `spillGate.setOpen(true)`.
- **The bell:** pull (interactive), clapper tie (needs the story's OK first), three horn mouths (interactive, each
  cycles three directions), cam wheel (interactive, two settings). It rings in the setting given (one tone, two
  tones).

**Handles to export:** `BALLASTRA.arches` from `src/game/ballastra/arches.js`.
- **Rooms and spots:**
  - `rooms`: `bl_arches` (outdoor), `bl_oren`, `bl_mags`, `bl_pump`;
  - `spawns`: `fromHarbor`, `fromGardens`, `orenIn`, `orenOut`, `magsIn`, `magsOut`, `pumpIn`, `pumpOut`, `steps`;
  - `exits`: `toHarbor` (to W-1 `districtEdge`), `toGardens` (to W-3 `fromArches`);
  - `doors`: Oren's, Mags's, the pump room, both ways.
- **Stand spots:** `oren_table`, `oren_terrace` (away from the water), `oren_steps`, `mags_house`, `mags_row`,
  `mags_steps`, `dunn_door`, `corvin_stall`, `hobb_market`, `tessa_steps`, `tessa_pump`, `tib_bell`, `quill_steps`,
  `row1`…`row4` (lower-row residents when home), `market1`…`market3`.
- **Interactive spots:** `orenPlan`, `pumpPlates`, `pumpMachine`, `spillWheel`, `dunnDoor`, `noticeBoard`, `bellPull`,
  `bellCam`, `bellHorn0`, `bellHorn1`, `bellHorn2`, `safe` (several).
- **Ball targets:** `spillPawl`. **Sword targets:** `spillChain`, `dunnSilt`.
- **Methods:**
  - `canal.setLevel(0|1|2, instant)`, `canal.level`;
  - `row.setHome(b, instant)` (washing out, shutters open, boats tied);
  - `dunnDoor.setOpen(b, instant)`, `silt.setHits(n, instant)`;
  - `chain.cut(instant)`, `pawl.release(instant)`, `spillGate.setOpen(b, instant)`;
  - `bell.untie(instant)`, `bell.setHorn(i, dir 0|1|2, instant)`, `bell.setCam(0|1, instant)`, `bell.ring()`.
- **Collision:** the boarded walkway is closed at level 0, open at 1 and 2; doorsteps are walkable at 1. The pump
  room's gate is solid until open.

**Characters:** the residents come from W-7.

**Budget and measures:** views of the market under the arch, the lower row, the terrace with the bell, and the pump
room.

**Pictures:** the play camera at the market, the lower row at levels 0 and 1, the Speaking Steps, the chained gate,
the bell tower, and Oren's and Mags's interiors.

**Built:** (the World Builder, 6.11.2026, branch `expansion/ballastra`; the place only — the residents are W-7's, their
stand spots are ready; story, flags and travel are the cloud's)

*Files* (new, `src/game/ballastra/`): `arches.js` (the region `bl_arches`, its own lazy group at x 3 000, z −3 800, built
in 16 steps; the plan, the moving parts, the handle `BALLASTRA.arches`), `archhouses.js` (the district's pieces: the
narrow tall house with its water record, `tideMarks` for stone faces, skiffs, market stalls, the gauge's paint),
`archrooms.js` (`bl_oren` 3 800, `bl_mags` 3 900, `bl_pump` 4 000, all at z −3 800). Small additions in W-1's files:
`common.js` (`BALLASTRA.arches`, the places' positions), `sea.js` (a place may give its own bed and bed colour),
`skyline.js` (the arch's curve exported), `harbor.js` (`R.entries.bl_arches` = `districtEdge`; `exits.toArches` at the
district gate, data for the story). `tests/ballastra-arches.mjs` (20 checks). Pictures: `docs/future/world/W-2/`.

*The idea in form* (the coordinator's review): the lower canal is a walled basin whose water stands at 2.25 / 1.4 / 0.4 m
(levels 0 flooded / 1 balanced / 2 low; the outer sea at 0), and everything on it rises and falls with it or stands
clear of it, and keeps the record of where it has been:
- the **market float** rides the level on four corner piles with bronze collars (deck 2.85 / 2.0 / aground at 1.05);
  its two **hinged gangways** tilt with it (the one to the row is drawn up out of the water at level 0);
- the **lower row**: eight narrow, tall houses (3.4–4.4 m wide, ~9 m to the ridge) on stilts, the wet floor below
  (limewash or rubble stained a metre up, a salt line, two older marks with dried weed caught on them), the **living
  floor on top**, jettied on brackets with a **gallery** (its door, herbs, the washing lines run from it, not from
  below), a steep gable to the water with a glazed float-ball finial, **hoist beams** in every other gable (goods go
  up, not in); **three doorstep heights** (the door's worn step 1.88, the walkway 1.75, the boat step 1.55 — a hand over
  the balanced water); **boats tied at two heights** (rings at 2.6 and 1.65 on each mooring post; the painters go to
  the high ring in a flood, the low one when balanced, slack in the mud when low; the boats lie aground at level 2);
  shutters shut and washing in at a flood or when the row is away (`row.setHome`);
- the **Speaking Steps**: a round platform at the quay's height (radial paving, a broken ring of stone seats, the
  speaker's dais with a bronze ring) whose six tiers go down into the canal: 1 / 3 / 5 tiers are dry floors at
  levels 0 / 1 / 2;
- the **level gauge** painted on the west pier's foot (bands every half metre, three glazed tiles at the three levels,
  no words), its bronze float riding the water in a slot; the salt line and old marks on every basin face;
- the **big shapes**: the great arch (feet at x ±32, crest ~40 m; four homes hung under its span on chains) and the
  old **beam pump** on the west pier (a glazed celadon cylinder, a 15 m bronze beam on a stone A-frame, its rod down
  into the basin, the outflow mouth); no domes or towers from the base game; the flood bell is a squat stone tower.

*The plan* (local metres; the hero comes in from the harbour in the south):
- the **landing** (1.4) from the harbour's gate, steps up to the **south quay** (2.8, big pale flags): goods waiting
  to go up to the living floors, the **notice board** (pictograms), the **jetty** north to the market's gangway;
- the **west ledge** (2.8) along the pier: the **pump room's door** (bronze-framed arch), the gauge, a stair down at
  its north end to the walkway (boarded at level 0);
- the **lower row** along the basin's north side behind its **walkway** (1.75, on piles): Mags's house the third from
  the west, Dunn's the fifth (older, rubble, sunk lower: its arched door at the boat step's height, the **silt heap**
  in its pit); a **narrow stair** on brackets up the terrace's wall from the walkway's east end (two flights, a
  landing at 4.4, rails; boarded at the landing at level 0);
- the **upper terrace** (7.0, dressed stone, dry, older) on the arch's east shoulder: north part with **Oren's house**
  (three storeys: stone, celadon tiles, painted boards; a glazed side-gabled roof) and an older cobalt-tiled
  neighbour, the **cistern** with its bronze hand pump (the terrace drinks the sky, never the canal), a bench looking
  away from the water; the south plaza with the **flood bell** and a third house; the **wide stair** (4 m, 19 treads)
  down to the quay; the **gardens' gate** in the plaza's east parapet (W-3 beyond: closed).

*The puzzle's parts*: `canal.setLevel` (about 5 s animated; the water, the float, the gangways, the floors, the boards,
the gauge's float, the boats all follow it), `row.setHome`; Dunn's silt (3 stages, `silt.setHits`) and door (swings in,
`dunnDoor.setOpen`); in `bl_pump` the spill gate (a timber gate in bronze grooves in a stone channel, the spindle, the
hand-wheel, the **chain** round the wheel to a floor staple with a cobalt **seal plate**; the **pawl** on its ratchet
high on the pier wall; `chain.cut`, `pawl.release`, `spillGate.setOpen` — the gate rises in ~3 s and stops being
solid; the channel behind it is a dry stub he may step into); the bell (`untie`, `setHorn` ×3 — three ceramic horns
stacked on a bronze mast over the belfry's roof, each turning to terrace / lower row / gardens — `setCam` one or two
tones, `ring()`: the bell swings ~4.5 s and sounds through the game's synth; refused (null) while tied). Extras so
nothing stays out of reach: `chain.reset`, `pawl.reset`, `bell.tie`.

*Handles* (`BALLASTRA.arches`, world coordinates): as ordered — `rooms`, `spawns` (9), `exits` {toHarbor (active),
toGardens (data: `bl_gardens` is not built yet)}, `doors` (orenOut/In, magsOut/In, pumpOut/In, active), `stands`
(20), `spots` (11), `safe` (6), `ballTargets.spillPawl`, `swordTargets.spillChain / dunnSilt` {x, y, z, r}, the
setters, `onChange(fn)`; plus `plan` (the build's numbers, for tests).

*Collision*: the walkway, its boat steps and the west landing are floors only while dry (levels 1, 2); at level 0
boards close the west stair's head and the narrow stair's landing, and the row's gangway is drawn up with the float's
gap railed; the float and both gangways at the level's height (stair treads, ≤ 0.2 m a tread at level 2); the Steps'
tiers are floors where dry; the silt heap solid until its third hit, Dunn's door until opened; the pump room's gate
until open. The soft edge as in W-1 (anyone over water without a floor is eased back; a flood over the walkway puts
him on dry stone).

*Numbers* (**SwiftShader, headless, not the laptop's GPU** — the real-GPU playthrough had the machine tonight; draw calls
and triangles per frame only, no fps or GPU ms; the game's default quality on this profile (High), 1280×720, the play
camera; the Citadel street is the benchmark's own route setup, same run):

| view | draw calls (shadow) | triangles |
|---|---|---|
| Citadel street (the budget; bench route at t 0 / t 3) | 215 (47) / 174 (49) | 899k / 749k |
| W-1 the pad (for reference) | 45 (12) | 350k |
| the landing from the harbour, level 0 | 109 (36) | 559k |
| the south quay, level 0 / level 1 with the row home | 109 (36) / 108 (35) | 558k / 560k |
| the market float, level 1 | 102 (37) | 537k |
| the lower row's walkway, level 1 | 106 (37) | 561k |
| the terrace by the bell / the terrace north | 45 (8) / 51 (13) | 443k / 453k |
| the Speaking Steps, level 2 | 104 (35) | 559k |
| the pump room / Oren's / Mags's (rooms) | 38 (2) / 29 (1) / 31 (2) | 42k / 33k / 24k |

Every view is under the street in draw calls and triangles. The region is 143 meshes (merged per material: 70
materials), 760k triangles in all (the arch's swept rock and the Steps' lathes are the biggest); 12 small canvas
textures (≤ 512², one 64×512 gauge) and the sea's 256² height texture; no lights outdoors, 2–3 in each room. First
build: 2.6–2.7 s on SwiftShader (16 steps when built by regions.js in steps), not measured on the laptop's GPU.

*Checks*:
- `tests/ballastra-arches.mjs` (SwiftShader) 20/20 PASS: lazy build, far from all areas, rooms known before built;
  every handle; every stand spot clear floor; each level's water, floors (walkway, boat steps, float, gangways, the
  Steps' tiers: 1/3/5), boards and look (washing, shutters, boats; aground at 2); the ~5 s animated fill with the float
  riding it; he walks the whole district by input at level 1 (17 legs: landing, quay, notice board, jetty, gangway,
  market, the row's gangway, walkway, Mags's door, a boat step, Dunn's door, the narrow stair, terrace, Oren's door,
  bell rope, horn wheels, cam, wide stair, Steps, a dry tier, ledge, pump door, west stair); at level 0 the walkway has
  no way in while market, terrace, bell, Steps and pump door are all reached; at level 2 market, walkway, Mags's door
  and terrace; the three doors in and out; Dunn's silt and door; the spill gate, chain and pawl; the bell; the soft
  edge (also a flood under his feet); the way back lands at the harbour's district edge; a second visit builds nothing.
- `tests/ballastra-harbor.mjs`, `tests/chapter1.mjs`, `tests/transitions.mjs`: 19/19, 23/23 and 6/6 PASS on this branch, errors none (SwiftShader, run locally with the
  Playwright path changed for this laptop, not committed). `drawcalls.mjs` and `perfbudget.mjs` do not cover Ballastra;
  `overlaps.mjs` is not on this branch.

*Pictures* (`docs/future/world/W-2/`, the play camera — Follow, Medium distance — **headless SwiftShader**, `testFreeze`,
recentred, frames stepped by hand): `W-2-00-canal-level0-vs-level1` (the same spot on the jetty, side by side),
`W-2-01/02/03-canal-level0/1/2`, `W-2-04-landing-from-harbour`, `W-2-05-market`, `W-2-06-lower-row`, `W-2-07-dunn-door`,
`W-2-08-speaking-steps`, `W-2-09-gauge-ledge`, `W-2-10-terrace-bell`, `W-2-11-terrace-north`,
`W-2-12-pump-room-chained-gate`, `W-2-13-oren-inside`, `W-2-14-mags-inside`.

**Accepted by the user so far (6.11.2026):** "looks good so far" on the pictures (canal levels 0 and 1 side by side,
the lower row, the market). The left items below stay open: the real-GPU numbers, the arch's span shot, and the
level change at a distance.

*Left / not done:*
- no real-GPU numbers (fps, GPU ms, battery): the machine was busy; the SwiftShader counts above are the only measure.
- the arch's span is not in any play-camera picture (its frame ends over the roofs, as in W-1); the free-camera
  overview failed this time (the camera override left the view inside the row): to retake.
- the level 0 / 1 change reads from the jetty (the float's height and the gangways, the walkway and boats, the Steps'
  tiers, shutters and washing) but is not yet strong at a distance: a "fresh wet band" on the walls after the water
  falls, and sandbags/boards at the doors in a flood, would make it read at a glance.
- the W-1 skyline still shows its own older scenery district, not this layout; no travel into the district (the
  story's: `BALLASTRA.harbor.exits.toArches` and `R.entries.bl_arches` are ready); the gardens' exit waits for W-3.
- the bell's tones use the game synth's private `_tone` (with `clang` as the fallback); the horns, the cam and the
  pull have no input wiring (the story's).
- the residents are W-7's; Dunn's door opens onto a dark recess only (no room ordered).

---

## W-3 · The Water Gardens · **Ordered** (the coordinator, 7.11.2026, after the user approved the expansion so far: W-1 and W-2 accepted)

Shared water made visible: cultivation rafts, channels, gauges, a kiln that lives on the same water, and the test
installation where the prototype is proven (N2, N6; return visits in N3–N5 and the postgame).

**The place.** Its own lazy group, `bl_gardens`, between the Arch District and the House of Balances' causeway.
- **Cultivation rafts** on three levels of basins (terraced like rice fields, but floating), beans and reeds and
  flowers. Three states: 0 dry (cracked mud, wilted), 1 recovering, 2 green.
- **The upper channel** comes in on a stone aqueduct; a splitter house divides it. **Two big gauges** stand side by
  side at the splitter (upper channel, lower gardens), readable from the path.
- **Shifting walkways:** floating walkways between the rafts that ride the water (lower when the gardens are dry).
- **The service tunnel:** a hatch by the splitter, down into a brick tunnel with the old pipework. Inside:
  - an **unrecorded tap** (a newer pipe, clearly bodged on) leading off toward the kiln;
  - a **seized bypass valve**;
  - the **splitter board**, three gates (G1 gardens, G2 kiln, G3 overflow), each closed, half or open. G1 is set in
    the tunnel; G2 and G3 have latches across the channel outside, too far to reach (ball targets).
- **Corvin's kiln** (`bl_kiln`, interior): a glazing workshop with a water wheel on the outside wall driving the
  bellows and the potter's wheel; racks of glazed floats; a kiln mouth that glows when running.
- **The test installation** (N6): a stone platform with **three linked basins** (A, B, C), each with a float, a
  level mark and a lamp. A frame in the middle has **five part slots**: a ceramic housing, a brass assembly, a core
  element, a glazed float, a timber frame. Each basin has a **range dial** (three positions) and a **switch latch** high
  on a post (ball target). A **storm sluice** feeds the rig (opened by a resident in the story).

**Handles to export:** `BALLASTRA.gardens` from `src/game/ballastra/gardens.js`.
- **Rooms and spots:**
  - `rooms`: `bl_gardens` (outdoor), `bl_tunnel`, `bl_kiln`;
  - `spawns`: `fromArches`, `fromHouse`, `tunnelIn`, `tunnelOut`, `kilnIn`, `kilnOut`, `rig`;
  - `exits`: `toArches`, `toHouse` (W-4 causeway).
- **Stand spots:** `wenna_rafts`, `wenna_gauges`, `grower1`, `grower2`, `corvin_kiln`, `corvin_wheel`, `tessa_rig`,
  `oren_rig` (back from the water's edge), `mags_rig`, `wenna_rig`, `tib_sluice`, `rigWatch1`…`rigWatch4`.
- **Interactive spots:** `gaugeUpper`, `gaugeLower`, `tunnelHatch`, `tap`, `bypassValve`, `gate1`, `rigSlot0`…`rigSlot4`,
  `rigRange0`…`rigRange2`, `safe` (several).
- **Ball targets:** `gate2Latch`, `gate3Latch`, `rigSwitch0`…`rigSwitch2`.
- **Methods:**
  - `channels.show({ upper, gardens, kiln, overflow } /* 0..1 flow */, instant)`;
  - `gauges.set(upper, lower /* 0..1 */, instant)`;
  - `gate.set(id /* 1|2|3 */, 0|1|2, instant)`, `tap.setOpen(b, instant)`, `bypass.setFree(b, instant)`;
  - `rafts.setState(0|1|2, instant)`, `walkways.setLevel(t /* 0..1 */, instant)`;
  - `kiln.setRunning(b, instant)`, `wheel.setSpeed(0..1)`;
  - the rig: `rig.setPart(slot, b, instant)`, `rig.setRange(basin, 0|1|2, instant)`,
    `rig.setLevels([a, b, c] /* 0..1 */, instant)`, `rig.setLamp(basin, 'off'|'green'|'amber'|'red')`,
    `rig.spill(basin, toBasin)` (a visible overflow), `rig.setSluice(b, instant)`.
- **Collision:** walkways follow their level. The rig's basins are shallow (wadeable, never deep).

**Budget and measures:** views of the rafts with the gauges, the tunnel, the kiln interior, and the test rig with six
people around it.

**Pictures:** the play camera on the rafts (dry, green), the gauges, the tunnel's splitter, the kiln, and the rig
empty and assembled.

**Built:** _(the builder)_

---

## W-4 · The harbour warehouse and the House of Balances (Draft, the coordinator reviews)

### Part A · The harbour warehouse (an addition to W-1's region `ballastra`) (N4)

**The place.**
- **Fennick's yard** beside the cargo quay, behind a gate with a small gatehouse: stacked crates, some stencilled
  BALANCE WORKS (placeholder stencil text), a hand cart.
- **The warehouse** (`bl_warehouse`, interior, two levels):
  - the ground floor: crate aisles;
  - Fennick's office in a corner, glass-fronted, with an order board, a ledger desk and a locked crate;
  - an upper catwalk round the walls with a service door that opens on to crane B's walkway from W-1, reached once
    W-1's shortcut is open.
- **The freight line:** a cargo cable car from the warehouse roof to the House of Balances' causeway, shut at first.

**Handles to export:** `BALLASTRA.warehouse` from `src/game/ballastra/warehouse.js`.
- **Rooms and spots:**
  - `rooms`: `bl_warehouse`;
  - `spawns`: `yardGate`, `whIn`, `whOut`, `catwalkDoor`, `freightTop`;
  - `doors`: the warehouse door, the catwalk service door.
- **Stand spots:** `fennick_office`, `gatehand`, `hobb_yard`.
- **Patrols** (arrays of points for two watchers): `patrolA`, `patrolB`; plus the watchers' look points.
- **Interactive spots:** `crate0`…`crate2` (marked crates), `orderBoard`, `ledgerDesk`, `lockedCrate`, `serviceDoor`,
  `freightCar`, `safe`.
- **Ball target:** `hoistLatch` (a hoist over aisle 2 drops a crate across a patrol's path, a stealth helper).
- **Methods:** `gate.setGuarded(b, instant)`, `crates.setSearched(i, b, instant)`, `lockedCrate.setOpen(b, instant)`,
  `assembly.take(instant)`, `hoist.drop(instant)`, `freight.setOpen(b, instant)`, `freight.ride()` (a short ride, then
  the story changes the scene to W-4's causeway).
- **Collision:** the dropped crate is solid; the catwalk has rails.

### Part B · The House of Balances (N5; the test chamber in postgame)

A partly submerged former control facility in glazed ceramic and stone (D3's C element): long halls of turquoise
tile, bronze floats on chains, sluice wheels, a records chamber half under water. Quiet, damp, beautiful and a little
dangerous.

**The place.** Its own lazy group, `bl_house`.
- **`bl_causeway`** (outdoor): the approach from the gardens across a causeway of stone piers; the freight car's
  landing. The façade is a glazed dome cracked down one side, half in the water.
- **`bl_hall`** (the filling hall): a long pool with a sluice wheel (three levels), two floats on vertical rails that
  rise with the water, and the **small cracked gate** to a side bay. The small gate drops shut and jams if the hall
  is raised to level 2 while it stands open; its own wheel resets it.
- **`bl_floats`** (the float gallery): a tall room with four floats on chains at different heights, a sluice wheel,
  two **remote latches** high up (ball targets) that free floats, and **tangled nets** (sword targets, three) over
  two passages. The **main damaged gate** sits between the gallery and the hall: visibly cracked, the same make as the
  small one.
- **`bl_records`** (the records chamber): a round room, the water at knee height; at its centre **the Balance**, a
  glazed-ceramic and bronze master regulator the size of a barrel, on a plinth; ledger shelves in alcoves; one ledger
  chest.
- **`bl_maint`** (the maintenance passages): narrow, dry brick corridors behind the halls with ladders and hatches,
  closed from the hall side at first; opened from inside they become the safe way in and out.
- **`bl_test`** (the test chamber, postgame): a small working copy of the rig's basins, lit and running.
- **Life:** dripping, reflections on tile, fish in the pools, old notices in tile (placeholder: "LEVEL TWO FOR
  INSPECTION ONLY").

**Handles to export:** `BALLASTRA.house` from `src/game/ballastra/house.js`.
- **Rooms and spots:**
  - `rooms`: `bl_causeway`, `bl_hall`, `bl_floats`, `bl_records`, `bl_maint`, `bl_test`;
  - `spawns`: `fromGardens`, `freightLanding`, `hallIn`, `floatsIn`, `recordsIn`, `maintIn`, `maintOut`, `testIn`;
  - `exits` and `doors` between them; each room's `safe` spots.
- **Stand spots:** `tessa_hall`, `tessa_floats`, `oren_door` (outside the doorway: he hesitates), `oren_records`,
  `oren_maint`.
- **Interactive spots:** `wheel_hall`, `wheel_floats`, `wheel_records`, `wheel_smallGate`, `balance`, `ledgers`,
  `ledgerChest`, `maintHatch`, `testRig`.
- **Ball targets:** `latch0`, `latch1` (gallery), `latch2` (records' door counterweight).
- **Sword targets:** `net0`, `net1`, `net2`.
- **Methods:**
  - `pool.setLevel(room, 0|1|2, instant)`, `pool.level(room)`; floats ride their room's level, `float.free(i, instant)`;
  - `latch.release(id, instant)`, `net.cut(id, instant)`;
  - `smallGate.setState('open'|'shut'|'dropped', instant)`, `mainGate.setState('shut'|'open'|'fallen', instant)`
    (fallen: a collapse animation, then a wall of rubble and water; permanent);
  - `recordsDoor.setOpen(b, instant)`, `balance.take(instant)`, `maint.setOpen(b, instant)`,
    `test.setActive(b, instant)`.
- **Keepers:** spawn points and patrol paths for three keeper automatons (W-7 builds the body): `keeper0`…`keeper2`.
- **Collision:** floats are platforms at their height. Water deeper than the hero's chest pushes back to `safe`. The
  fallen main gate closes that passage for good.

**Budget and measures:** views of the causeway, the hall, the gallery, the records chamber, and the warehouse
interior with two watchers.

**Pictures:** the play camera at each, the gallery at two levels, the Balance, and the fallen gate.

**Built:** _(the builder)_

---

## W-5 · Sendell's outer underground, first visit (Draft, the coordinator reviews)

Quiet wonder (D5): warm lakes, translucent mineral layers, reflected light, slow motion, root-like forms and pressure
channels; never "another crystal cave". Sendell is light responding in the stone (D7); the entity is one glimpse
behind a thick layer (D8). About 23 minutes (SV-1…3); the same places return changed in W-6.

**The place.** Its own lazy group, `uw_outer`, entered from the existing well cave.
- **A hook in the well interior** (`interiors.js` `buildWell`, a shared file): a new exit beyond the crystal wall
  broken in chapter 1, shown only when the story asks (`wellCave.setDeepOpen(b)`); and a lower water level for the
  cave (`wellCave.setWaterLow(b)`).
- **`uw_entry`:** a warm passage where the well's crystals give way to banded translucent stone, faint light inside
  it.
- **`uw_lake`:** a broad warm lake under a low vault, steam lying on it. With the water low, **root shelves** show
  along one side. A **hanging root** is tied off high (ball target), and released it swings down as a bridge to the
  far shelf. **Gauge site 1** is on the far shelf.
- **`uw_channels`:** a chamber where **two pressure channels** (A, B) come out of the rock, each with an old
  stone-and-root **valve** (three positions). Their **jets** cross a ledge in the middle, where **gauge site 2** is.
  - Jets have three strengths and follow the story's setting: strong blocks the ledge; mid breathes on a 3-second
    cycle (crossable between breaths); off.
  - Through the ceiling comes the **project's feed casing**, a steel pipe with cracked, darkened layers round it. It
    can **bang** (a shudder, dust, a sound) on command.
- **`uw_layers`:** a tall space of translucent mineral sheets. Three **facets** on pivots (each turns in four steps by
  use or ball) carry Sendell's light from a high source down the room. When all three line up, a **light path** lights
  across the layers: a ledge route that is solid only while lit. It leads to **gauge site 3**. Behind the thickest
  layer, the **glimpse**: a vast slow shape turning once, never whole.
- Sendell's light: the layers brighten softly near the hero as he goes (D7), fainter than her chapter-7 shrine.

**Handles to export:** `UNDERWORLD.outer` from `src/game/underworld/outer.js`.
- **Rooms and spots:**
  - `rooms`: `uw_entry`, `uw_lake`, `uw_channels`, `uw_layers`;
  - `spawns`: `fromWell`, `lakeIn`, `channelsIn`, `layersIn`, `layersTop`;
  - `exits`: between them and back to the well; `safe` spots in each.
- **Interactive spots:** `gaugeSite0`…`gaugeSite2`, `valveA`, `valveB`, `facet0`…`facet2`.
- **Ball targets:** `rootLatch`, `facetPivot0`…`facetPivot2`.
- **Methods:**
  - `root.drop(instant)`;
  - `gauge.place(i, instant)`, `gauge.setReading(i, 0..1)`, `gauge.setPulse(i, b)`;
  - `valve.set('A'|'B', 0|1|2, instant)`, `jet.set('A'|'B', 'off'|'mid'|'strong')` (the 3-second breath runs inside
    the world in step with a readable sound, with `jet.phase` to read);
  - `casing.bang()`;
  - `facet.set(i, step 0..3, instant)`, `light.setPath(b, instant)` (collision on only while lit),
    `light.setStrength(0..1)`;
  - `glimpse.play()`.
  - `wellCave.setDeepOpen(b, instant)`, `wellCave.setWaterLow(b, instant)` (well interior hook).
- **Collision:** jets push the hero back (no damage). The lit path exists only while lit; unlit, its spots drop him
  to the layer floor (`safe`).

**Budget and measures:** views of the lake, the channels with both jets, the layers with the path lit. Few dynamic
lights (D7): emissive and baked where possible.

**Pictures:** each room at the play camera, the path lit and unlit, the glimpse frame (spoiler folder).

**Built:** _(the builder)_

---

## W-6 · The underground, second visit (Draft, the coordinator reviews)

The same places after continued drilling: hotter, lower, cracked, darker. Twinsen comes in from the other side (the
shaft) and finds his own gauges from W-5 glowing as beacons. "The Wound in the Shell" is the one place of fragile
grandeur (D5 C). About 25 minutes (UR-1), then the join to the existing deep installation.

**The place.** Its own lazy group, `uw_wound`.
- **A hook in `underground.js`** (shared file): the c3shaft tunnel to `c3deep` gets a **cave-in** (rubble across the
  tunnel mouth: `shaftTunnel.setBlocked(b)`) and a **breach** in the shaft wall leading to `uw_breach`. And `c3deep`
  gets a new side door `to uw_join`.
- **`uw_breach`:** a raw crack from the shaft into the outer layers: drill-scarred rock meets banded stone.
- **`uw_lake2`:** the W-5 lake from the far side, its water low and hot, the root shelves cracked, steam thicker.
  Gauge 1 is visible across the water as a beacon.
- **`uw_channels2`:** the channels rearranged: two linked pairs (C-D, E-F), each with a **band dial** (three
  positions) instead of a plain valve. **Rubble** (three spans) drops across the path when a pair is forced (off on
  one side, strong on the other) and clears when banded. Gauge 2 is here as a beacon.
- **`uw_wound`:** a great fissure in the translucent shell seen from a ledge, light pulsing weakly inside, the second
  and larger **glimpse**. Gauge 3 is here. A **lever** on the far side clears the shaft's cave-in for the way back.
  A passage leads to `uw_join` and into `c3deep`.
- Sendell's light: weaker than in W-5 (`light.setStrength` lower), flickering in damaged layers.

**Handles to export:** `UNDERWORLD.wound` from `src/game/underworld/wound.js`.
- **Rooms and spots:**
  - `rooms`: `uw_breach`, `uw_lake2`, `uw_channels2`, `uw_wound`, `uw_join`;
  - `spawns`: `fromShaft`, `lake2In`, `channels2In`, `woundIn`, `toDeep`;
  - `exits`, including `to c3deep` and `to c3shaft` (back through the breach); `safe` spots in each.
- **Interactive spots:** `bandCD`, `bandEF`, `caveLever`, `beacon0`…`beacon2` (look).
- **Methods:**
  - `beacon.setState(i, 'steady'|'stressed'|'dead')` (gauges: the same three models as W-5, now lit);
  - `band.set('CD'|'EF', side 0|1, 0|1|2, instant)`, `jet.set(id, 'off'|'mid'|'strong')`;
  - `rubble.set(i, b, instant)`;
  - `light.setStrength(0..1)`, `glimpse.play()`;
  - `shaftTunnel.setBlocked(b, instant)` (underground.js hook).
- **Collision:** as W-5. Rubble is solid when down. The hot lake's edge pushes back.

**Budget and measures:** views of the breach, the hot lake, the channels, and the Wound vista.

**Pictures:** each room, and the Wound (spoiler folder).

**Built:** _(the builder)_

---

## W-7 · Oren, the residents, the keepers (Draft, the coordinator reviews)

Characters for W-2…W-4 (D4, D9). Silhouettes first; faces, hands and feet before effects; no recoloured crowds.

- **Oren (D9):** a canal dweller from the upper districts, a little taller and narrower than his people (not
  spindly), a worn formal coat from the central-network years (long, buttoned, frayed cuffs), careful posture.
  - Gestures: points at a drawing; folds hands behind his back; steps back from the water's edge.
  - **Rig contract first** (as `LOCAL_EXPANSION_PROMPT.md` §2 says): the changed proportions and what `rig.js`
    needs, written here before building, then the cloud's OK.
- **Residents** (compact canal dwellers, D4; each a distinct silhouette and outfit, one shared body with variants
  where it reads well):
  - **Hobb:** dock worker; broad, knit cap, rope over his shoulder.
  - **Wenna:** grower; wide-brimmed reed hat, apron with seed pockets, mud to the knees.
  - **Corvin:** kiln owner; leather apron, glaze-stained sleeves, round spectacles.
  - **Mags:** lower-row representative; older, shawl, a stick she points with, upright.
  - **Quill:** harbourmaster; peaked cap, a ledger and a set of hanging scales on his belt.
  - **Fennick:** contractor; waistcoat, a clip-board, a company badge.
  - **Tib:** Wenna's son, child proportions.
  - **Dunn:** old resident, bent, a cane.
  - **Ferro:** a boatman (can reuse a docker body with a new outfit).
  - Plus **two yard hands** in Fennick & Daughters work coats (watchers, then knock-out fighters).
- **The keepers:** three automatons of the old central system. Glazed-ceramic and bronze, squat, a gate-key arm, a
  lamp eye; slow, readable wind-ups; hit by ball and sword. Not humanoid copies of the residents.
- **Twinsen's work coat:** a variant for N4 (a Fennick & Daughters coat over the tunic), swapped like Zoé's body
  swap, plus the same coat look for the chapter-9 archive disguise if the coordinator wants it reused.
- Each body posed in its `characters.js` entry; lookdev sheets (idle, talk, walk, work) in `docs/future/world/W-7/`.

**Built:** _(the builder)_

---

## W-8 · The bridge, the stations and the side stories in existing regions (Draft, the coordinator reviews)

Small, purposeful additions to existing regions. Proposed home for the builder's code: `src/game/expworld/*.js`,
exporting `EXPWORLD.*`, joined to the regions by small commented hooks listed under "Hooks". This needs the
coordinator's OK, since the split names only `ballastra/` and `underworld/` as the builder's. Where the coordinator
prefers, the very small props can be made by the story's `decorate()` instead, as chapter 8's shelters are.

### W-8a · The bridge (Borrowed Time) and the seeds

| Part | Region | What | Handles (`EXPWORLD.bridge`) |
|---|---|---|---|
| Depot feed station | Zeelich, by the depot gate | a wheel house: a big throttle wheel (three positions), a pressure gauge, a feed pipe with a joint that spits steam on a short readable cycle when surging | `feed.wheelSpot {x,z,r}`, `feed.setThrottle(0|1|2, instant)`, `feed.setSurge(b)` (with `feed.spitPhase`), `feed.spitZone {x,z,r}` |
| Street heat posts dim | Zeelich street | the existing posts at three brightnesses | `zposts.setLevel(0..1)` |
| Snuff's old hearth | Zeelich, the watch house | smoke from the old hearth chimney; a wood stack | `hearth.setLit(b, instant)` |
| Grumm's braziers | Zeelich street, by the bakery and the council house | two charcoal braziers | `braziers.setOut(b, instant)` |
| The bench shell | Baldino's workshop, the relay table | a glass ring on a stand with five pegs (three heights each) and a hairline crack that can appear at any of five places | `model.spot`, `model.setPeg(i, 0|1|2, instant)`, `model.crack(i)`, `model.reset()` |
| The station store | Citadel, behind the project office (`projoffice`) | a small room `projstore`: shelves, packing crates, one crate stencilled BALANCE WORKS · BALLASTRA · REJECTED (placeholder), a lid that opens; a patrol path for one packing guard | room `projstore`, `crate.spot`, `crate.setOpen(b, instant)`, `storePatrol` |
| The B-7 housing | the house kitchen table; later the station wall (epilogue) | a ceramic-and-brass regulator housing | `b7.setAt('none'|'table'|'station', instant)` |
| Station yard crate (seed) | Citadel station yard (ch. 2) | the same crate, closed, REJECTED · RETURN TO SENDER | `yardCrate.setVisible(b)` |
| Barge crate stencil (seed) | the opening's cargo crate on the quay | stencil BALANCE WORKS · BALLASTRA · CERAMIC | art only, `bargeCrate.spot` |
| Nell's shelf | Nell's shop | a glazed float valve on her shelf | `nellValve.spot` |
| Monastery radio | Hamalayi monastery | Pim's scrap radio on a table | `pimRadio.spot` |
| Ferry idle | Citadel harbour | the ferry tied up dark; the chalk board "NO FERRY · THROTTLED" | `ferry.setIdle(b)` |
| Pump queue | Citadel lane | three residents' stand spots at Bram's pump | `pumpQueue[0..2]` |
| Feed-wheel tour step (DP-2a) | Citadel station, the control room or yard | a feed wheel the same make as Zeelich's | `cfeed.spot`, `cfeed.setOpen(b)` |
| Asylum tunnel (DP-8b) | the asylum's cellar → the station yard | a passage and a grille onto the project store | `asylumTunnel.setOpen(b)`, spawns `tunnelIn/Out` |
| Burrow route (DP-3a) | Zeelich: Grumm's hatch → a short moles' tunnel → up into the depot | a hatch with a warped lid (kick), the tunnel with a warm seep, a trap door in the depot | `burrow.setOpen(b)`, room `zburrow`, spawns |
| SUPPLIERS cabinet (DP-9c) | Zeelich, the archive | a fourth cabinet labelled SUPPLIERS | `archive.cabinets` gains one entry |

### W-8b · The network, the core and the homecoming

| Part | Region | What | Handles (`EXPWORLD.stations`) |
|---|---|---|---|
| Regulator housings | the five relays (mill top, valve room, lighthouse top, bore frame, dome) | a ceramic float housing clipped beside each relay, a three-band dial, a lamp (off, green, amber) | `reg[station].spot`, `reg[station].setBand(0|1|2, instant)`, `reg[station].setLamp(state)` |
| Lighthouse spots (B-1) | lighthouse top | clear stand spots for Zoé and Arthur beside the cabinet, off the dial bank and the stairs path | `lighttop.npcSpots.zoe2`, `.arthur2` |
| Mill hoist (OP-2 reward) | Zeelich, the old mill | a crew-built hoist platform that shortens the climb | `millHoist.setBuilt(b)` |
| Core stress lamps | the core (`c3core`) | one lamp on each pylon's base (green, amber, red); a floor window where the glimpse can show | `core.lamp(i, state)`, `core.glimpse()` |
| The coil's plate | the core | a brass plate on Vesk's coil, BALANCE WORKS · COIL 4 OF 6 (placeholder) | art only |
| Heat posts with switches | Citadel (epilogue) | each heat post gets a small local switch box; the harbour row's posts lit | `posts.setLocal(b)` |
| Ballastra pad on the boards | Citadel Spaceport | a second line on the departures board | `spaceport.board.setLines([...])` |

### W-8c · Side stories' parts in existing regions

| Story | Region | What | Handles (`EXPWORLD.sides`) |
|---|---|---|---|
| OP-1 Missing Deliveries | Citadel harbour; the baggage claim; the depot shelter | the cargo lift (from the opening) with a control lever and two stops (quay, path side), a stalled cart on it; the baggage claim's back store with an old conveyor lever and a back passage to the square; blankets and casks props at the shelter door | `cargoLift.setStop('quay'|'path', instant)`, `cart.setAt(...)`, `baggage.backDoor.setOpen(b)`, `shelter.setStocked(b)` |
| OP-2 The Last Shift | Zeelich, the depot | a production hall interior `zdepothall`: three lines (a drill-parts press with a broken guard, a heat-cell line, a packing line), a switchboard with three switches and a meter, a high switch on the press (ball target), the press belt (sword target), two drone spawns | room, `lines.setRunning(i, b)`, `meter.set(0..1)`, `press.switchTarget`, `press.beltTarget`, `drones[0..1]` |
| OP-3 Yorna's Map | Hamalayi, foothills to monastery | three landmarks changed (a gully where a frozen fall was, a fallen horn rock, a snow mound over a stone store with a dig spot), three marker posts with ice (sword or ball), a marked path that becomes walkable | `store.digSpot`, `store.setOpen(b)`, `post(i).setIced(b)`, `route.setMarked(b)` |
| OP-4 Arthur's Boat | Citadel, the garden pond and the bay by the pier | Arthur's model boat with a lamp mast (blinks), a sail path across the bay, a snag under the pier (ball target on the line) | `boat.sail(path)`, `boat.lamp(pattern)`, `boat.snag.target`, `boat.setAt(...)` |
| OP-6 Dallan's Debt | Kesh | Lumi's torn shade sail; the research post's store door; a high ring for the sail (ball target) | `shade.setState('torn'|'up')`, `postStore.setOpen(b)`, `shade.ringTarget` |
| DP-4 Ilka's stakes | Desert Island | three heat stakes with readable dials (oasis, dune, post fence) | `stake(i).set(0..1)` |
| DP-6a escort | Hamalayi gorge | a second ice-bridge spot (ball target) downstream of the tree | `iceBridge2.setUp(b)`, target |
| DP-7a/c two suns, melt race | the observatory and the glacier basin | a dome shutter with two positions (east sun, west sun); melt channels that open and close on a readable cycle across the basin | `shutter.set(0|1)`, `melt.setCycle(b)`, `melt.phase` |
| DP-8a shelter in place | Citadel | chalk marks on three doors (three symbols), the pharmacy's door state | `chalk.set(door, symbol)`, `pharmacy.setOpen(b)` |

**Budget and measures:** each touched region keeps its current numbers (draw calls, GPU ms) within its present
budget.

**Built:** _(the builder)_

## W-9 … W-12 · Oren's Ballastra (Draft, the coordinator reviews; OREN-GUARDIAN, 2.11.2026)

Written by the cloud's OREN-GUARDIAN session from `EXPANSION_PLAN.md` Revision R1 (the user's decisions of 2.11:
Oren is Ballastra's guardian; his sleepers sleep in shelters by the terraces; same places and people, with the
sleepers added). Same shared rules as W-2 … W-8 (own lazy group, pure setters with `instant`, the story owns the
rules, `safe` spots, day only, measured views, pictures to `docs/future/world/<W-id>/`). Build after W-1 is accepted,
in the coordinator's order. Cards: OG-3, WK-1 and EP-BL in R1.11 and R1.13.

**Oren's look in the world.** Wherever a part is "Ballastra ware" (fired from the terrace clay), use one shared glaze:
celadon (pale grey-green) with bronze rims, so a player learns to see what Oren can reach. Twinsun-made parts that
replace it are brass, oak and leather. Oren himself is not a character model: he is a ring presence (`src/game/
orenpresence.js`, built by the cloud, see R1.3). The large fixed Rings in W-12 are the builder's, in the same language.

---

## W-9 · The Low Terrace: Cradle Row, the keepers' garden, the Cradle Hall (Draft)

The residential street beside the sleeping quarters. Three generations of keepers have lived here beside relatives
who sleep. Lived in, close, a little cut off: about 15–20 minutes of play (OG-3, WK-1 steps 1–2, 6–8), and the
aftermath's last stop.

**The place.** Its own lazy group, `bl_terrace`, a shelf on the arch's flank above the Water Gardens (W-3), reached by
the **terrace lift** from a lift foot on the gardens' upper edge.
- **The terrace lift:** a counterweighted cage on two glazed-ceramic guide posts (Ballastra ware) and a bronze call-horn
  at each end (the one Oren answers through). A notice board at the lift foot.
- **Cradle Row:** one street of narrow keepers' houses (two storeys, tile and plaster, shutters, washing), Nan Odra's
  tea stand (shut since the lift stopped; it reopens in the aftermath), Garrow's workshop front
  (W-10's door), benches, potted herbs, cats.
- **The keepers' garden:** a long terraced public garden kept across generations: **one small planted bed per
  sleeper**, each with a glazed name tile; paths between; an old fountain that runs (or not, by state); seats.
- **The Cradle Hall** (`bl_cradles`, interior): the sleeping quarters. A long vaulted hall of glazed cradles in rows
  (about 60 visible; the rest implied beyond arches), each a lidded ceramic tub on a rail with a lamp and a number
  plate (J-17 is Jory's). The shared **ring** (a pipe loop along the floor) joins them. Glazed windows from the street
  look in. At the hall's end, the doors to the waking bay (W-12) and to the Cradle Control (W-12).
- **Life (props; the story adds the people):** washing, a ladder against a gutter, children's chalk on the street, a
  keepers' duty rota on a board, tools on hooks.

**The puzzle's physical parts.**
- The lift: three run states: `none`, `down` (visitors down, no way up), `both`.
- The notice board: a stack of request slips that can show DEFERRED stamps (count set by the story).
- Cradle lamps: per cradle `off|green|amber|red` (the story drives them; most green).
- J-17's lid: shut / open; Jory's cradle on its rail can be rolled into the bay (W-12) and back.

**Handles to export:** `BALLASTRA.terrace` from `src/game/ballastra/terrace.js`.
- **Rooms and spots:**
  - `rooms`: `bl_terrace` (outdoor), `bl_cradles`;
  - `spawns`: `liftFoot` (at the gardens), `liftTop`, `cradlesIn`, `cradlesOut`, `garden`, `workshopOut`;
  - `exits`: `toGardens` (via the lift ride), `toWorkshop` (W-10), `toBay`, `toControl` (W-12);
  - doors both ways.
- **Stand spots:** `wenna_board`, `wenna_lift`, `wenna_j17`, `jory_bench`, `jory_raft` (at W-3, the aftermath),
  `garrow_shop`, `odra_garden`, `odra_lift` (aftermath), `sammo_lift`, `tib_street`, `keeper1`…`keeper4`.
- **Interactive spots:** `noticeBoard`, `callHornFoot`, `callHornTop`, `liftCage`, `gardenBed_J17`, `cradleWindow`,
  `j17`, `safe` (several).
- **Methods:**
  - `lift.setRun('none'|'down'|'both', instant)`, `lift.ride(dir)` (a short ride, then the story changes the scene);
  - `board.setDeferred(n, instant)`;
  - `cradle.setLamp(id, state)`, `cradle.setLid(id, open, instant)`, `cradle.roll(id, 'hall'|'bay', instant)`;
  - `fountain.setRunning(b, instant)`, `street.setLife(level 0|1|2, instant)` (shutters, washing, chalk).
- **Collision:** the cage is a platform; the garden's beds are low (step over not allowed: walk the paths); cradles
  are solid.

**Characters:** Wenna, Tib (W-7, already ordered), and for W-9: **Jory** (a young canal dweller, slight, hair grown
long in sleep, a keeper's blanket over a sleeper's smock; after waking: a borrowed coat too big for him), **Garrow**
(broad, leather apron, a keeper's bronze tag on a cord), **Nan Odra** (old, small, a shawl, a garden trowel),
**Sammo** (a lanky teenager, a keeper's tag worn as a bracelet), two keeper residents (outfits on a shared body).

**Budget and measures:** views of the street with the garden, the lift foot, the Cradle Hall down its length.
**Pictures:** the street (closed and lived in), the garden, the hall, J-17 shut and open.
**Built:** _(the builder)_

---

## W-10 · The keepers' workshop and the service passages (Draft)

The terrace's only paid work, and the way into the places Oren keeps shut: the passages have no Ballastra ware in them,
so nothing in them answers him (R1.4 rule 2). About 10 minutes (WK-1 step 2, the route of step 3).

**The place.** Inside the `bl_terrace` group.
- **`bl_kshop`** (interior): Garrow's workshop. Benches, cradle spares (lids, gaskets on pegs, a crate of glazed
  heating elements), a forge corner, the keepers' tag board, a hatch in the floor to the passages.
- **`bl_passages`** (interior): narrow brick service passages under the street and the Cradle Hall: pipes along the
  walls (the ring's feed), knee-deep water in one stretch, ladders, three hatches:
  1. up into the workshop;
  2. up into the Register Room's back (W-11);
  3. up into the waking bay (W-12).
- **The flooded passage pump:** a float pump whose float is jammed high (a **ball latch** on its rod frees it), and a
  wheel that runs it; the water falls from knee to ankle depth over a few seconds.

**Handles to export:** `BALLASTRA.passages` from `src/game/ballastra/passages.js`.
- **Rooms and spots:** `rooms`: `bl_kshop`, `bl_passages`; `spawns`: `shopIn`, `shopOut`, `passIn`, `toRegister`,
  `toBay`; `exits`/doors and the three hatches both ways; `safe` spots.
- **Stand spots:** `garrow_bench`, `garrow_hatch`, `sammo_pass`.
- **Interactive spots:** `tagBoard`, `spares`, `pumpWheel`, `hatchRegister`, `hatchBay`.
- **Ball target:** `pumpLatch`.
- **Methods:** `pump.free(instant)`, `pump.setRunning(b, instant)`, `water.setLevel(0..1, instant)` (knee to ankle),
  `hatch.setOpen(id, b, instant)`.
- **Collision:** deep stretch (knee) walkable but slow; never deep enough to drown.

**Budget and measures:** the workshop, the flooded stretch. **Pictures:** both, before and after the pump.
**Built:** _(the builder)_

---

## W-11 · The Register Room, the restricted archive (Draft)

Where the Cradles' paperwork has piled up for eighty years, behind a door Oren keeps shut. Quiet, dry, crowded,
human: the place where the wrong is found in the sleepers' own handwriting. About 8 minutes (WK-1 step 3).

**The place.** Inside the `bl_terrace` group: **`bl_register`** (interior), entered from the passages' hatch (the
front door, onto Cradle Row, has a celadon actuator lock and stays shut: `frontDoor.setLocked`).
- Shelves of register books floor to ceiling, two library ladders.
- **The index drum:** a big rotating drum of cards (by sleeper number); turning it to J brings a card up.
- **The terms cabinet:** small drawers, one per sleeper, with the signed terms card.
- **The deferral ledger** on a lectern: one line per year per sleeper, stamped.
- **The petitions box:** bundles of family petitions, tied, marked RECEIVED.
- **The incident shelf:** the Bay 2 record, a slim bound report.
- A window high up (light), dust in the beam (a baked shaft, no volumetrics).

**Handles to export:** `BALLASTRA.register` from `src/game/ballastra/register.js`.
- **Rooms and spots:** `rooms`: `bl_register`; `spawns`: `fromPassages`, `safe`.
- **Interactive spots:** `drum`, `termsDrawer` (J-17), `ledger`, `petitions`, `bay2`, `frontDoor`.
- **Methods:** `drum.turnTo(letter, instant)`, `drawer.setOpen(id, b, instant)`, `ledger.setOpen(b, instant)`,
  `frontDoor.setLocked(b, instant)`.
- No readable story text in the world; the story shows the card and the ledger as dialogue/inspect text.

**Budget and measures:** one view. **Pictures:** the room, the drum, the drawer open.
**Built:** _(the builder)_

---

## W-12 · The Cradle Control and the waking bay (Draft)

The shelter control installation: Oren's fullest presence on Ballastra, and the bay where one sleeper can be woken
safely by hand. About 20 minutes (WK-1 steps 4–7) and the aftermath's quiet glimpse.

**The place.** Inside the `bl_terrace` group.
- **`bl_control`** (interior): a round glazed chamber under a dome. At its centre the **Rings**: Oren's fixed presence,
  four great celadon rings (about 4 m tall in all) slowly turning round a bronze bead (same language as R1.3; the
  builder's model; it must read as Oren at a glance after seeing the small version). Round the wall: the **ring-pressure
  board** (the shared ring's gauge and a lamp per cradle row), the hush horns (glazed mouths), the bay's control-side
  valve (Oren locks it), the terrace lift's control wheel (celadon).
- **`bl_bay`** (interior): the waking bay off the Cradle Hall. A rail spur brings one cradle in. Parts:
  - **the isolating valve** (a hand wheel plus a **hand lever** that can be held: an NPC stand spot beside it);
  - **the ring gauge** with the two neighbours' lamps beside it;
  - **the seal**: an old swollen gasket at the isolation flange (sword target), and a seat where the spare fits;
  - **the warmer**: a heating cabinet with an **element slot** (glazed element in; brass element swap);
  - **the lid release** on the cradle's end;
  - two **keeper automaton** alcoves (W-7's keepers, given cradle duty: the same bodies) and their path to the valve.

**Handles to export:** `BALLASTRA.control` from `src/game/ballastra/control.js`.
- **Rooms and spots:** `rooms`: `bl_control`, `bl_bay`; `spawns`: `controlIn`, `bayIn`, `bayFromPassages` (hatch),
  `safe` spots; exits to the Cradle Hall (W-9) and the passages (W-10).
- **Stand spots:** `wenna_lever`, `tessa_warmer`, `garrow_bay`, `sammo_bay`, `jory_wake` (sitting up), `keeperA`,
  `keeperB` (alcoves), `odra_control` (aftermath).
- **Interactive spots:** `rail` (crank), `isoWheel`, `isoLever`, `ringGauge`, `sealSeat`, `warmer`, `elementSlot`,
  `lidRelease`, `boardRow` (look), `controlValve` (look).
- **Sword target:** `seal`. **Ball targets:** none required (the keepers are enemies with their own hit rules).
- **Methods:**
  - `rings.setState('turning'|'attending'|'locked', instant)` (the Rings: turn, stop in line, lock with a clack);
  - `ring.setGauge(0..1)`, `ring.setNeighbour(i, 'green'|'amber'|'red')`;
  - `iso.set(open 0..1, instant)`, `iso.setHeld(b)` (the lever down while someone holds it);
  - `seal.setState('swollen'|'cut'|'new', instant)`;
  - `warmer.setElement('glazed'|'none'|'brass', instant)`, `warmer.setRunning(b)`, `warmer.setStage(0..3, instant)`;
  - `cradle.setLid(open, instant)` (J-17 in the bay);
  - `controlValve.setLocked(b, instant)`; `lift.setRun` mirrored from W-9.
- **Keepers:** spawn points and a short path each from alcove to the valve; the story drives them (pushback rules).
- **Collision:** the rail spur is solid except at its crank; the warmer and the cradle solid.

**Budget and measures:** the control with the Rings turning, the bay with four people and two keepers.
**Pictures:** the Rings, the board, the bay before and after the brass swap, J-17 open.
**Built:** _(the builder)_

---

## W-6, W-7, W-8 additions (OREN-GUARDIAN)

- **W-6 · the paired stone** (OG-7): in `uw_wound`, a crystal column (about 6 m) beside the bore's path, banded like the
  layers but clear at its heart; it rings (`stone.ring()`: a brief brightening and a low note) on the story's drill
  stroke, and stills (`stone.setStill(b, instant)`). Its base disappears into the bore's casing toward the core.
- **W-7 · Halden** replaces the old "Oren (D9)" entry word for word (the designer's look is unchanged: taller, upper
  district coat, keeps from the water). The **keepers** (automatons) gain cradle duty in W-12: same bodies.
- **W-8a · the fence gate** (OG-2): the ch.-8 fence round Citadel's square gets one gate with a celadon actuator box and
  a three-light counter (`fenceGate.setOpen(b, instant)`, `fenceGate.setCount(0..3)`), plus a small bell latch high on
  its post (ball target, `fenceGate.bell`).
- **W-8 · a shelter interior** (OG-5): one interior `shelter` used for both of FunFrock's shelters (bunks, the air
  governor on its pipe with a celadon body, a hand lever at the door, a dead-coupling seat on the governor's pipe).
  Handles: `governor.setHush(b)`, `governor.setCoupled(b, instant)`, `door.setLocked(b, instant)`, `bunks[0..n]`.
- **W-8b · the core's rings** (FIN-1): a ring housing round Vesk's coil (the same Ballastra ware), each pylon's
  governor with a hand lever and a lamp `off|celadon|amber`, and a map board of the stations
  (`coil.setRings(b)`, `pylonGov(i).setState(...)`, `board.setStation(id, state)`).

## Hooks (shared files touched, by either side)

_(file, line or function, why)_
- `src/game/regions.js` (W-1, the World Builder): the import of `ballastra/harbor.js`, `REF.ballastra`, `AT.bl_shed`,
  `OUT_AT.ballastra`, one `add('ballastra', ['ballastra', 'bl_shed'], …)` line: Float Harbor's lazy group (built in steps).
- `src/game/regions.js` (W-2, the World Builder): the import of `ballastra/arches.js`, `REF.bl_arches`, `AT.bl_oren`,
  `AT.bl_mags`, `AT.bl_pump`, `OUT_AT.bl_arches`, one `add('bl_arches', ['bl_arches', 'bl_oren', 'bl_mags', 'bl_pump'], …)`
  line: the Arch District's lazy group (built in steps), each commented.
- `src/game/lba1places.js` `climbShelfWall` (EXP-MERGE-35, the World Builder): the shelf fill's block and collision box
  across the foot landing's north edge run to the landing's line (`kz`), closing a pocket by the wall's north end that
  pinned the hero (oren-square's walk from the fortress shelter); base code: also `tools/testlab/requests/EXP-MERGE-35-base.diff`.
- `tests/world-consistency.mjs` `TRANSITIONS` (EXP-MERGE-35): the expanded campaign's `startTransition` calls classified
  (coils.js, index.js afterLoad, survey.js, throttle.js); expansion branch only (on main those calls don't exist).
