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
  - `crane.release(instant)` and `crane.released`;
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

**Built:** _(the builder)_

---

## W-2 and later (to be specified by the cloud after W-1 is accepted)

These are titles only, so the builder can see the shape of the work. Their orders come with their full specs later.

- **W-2:** the Arch District. Homes over canals, the market, workshop interiors, narrow stairs, a meeting place.
  Residents' stand spots, and the water-level states for "access restored".
- **W-3:** the Water Gardens. Cultivation rafts, irrigation, shifting walkways, the gauges, the service tunnel, the
  routing puzzle's parts, the test installation for N6.
- **W-4:** the House of Balances, a partly submerged control facility in glazed ceramic and stone. Floats as platforms,
  local water levels, remote releases (ball), nets (sword), a damaged gate, the records chamber.
- **W-5:** Sendell's outer underground, first visit. Warm lakes, mineral layers, pressure channels, three device
  sites, and the light that reveals a route (D5, D7, D8).
- **W-6:** the underground, second visit. The same places changed by drilling, the marker devices, and the join to the
  existing shell, galleries and Sendell's room (`underground.js`).
- **W-7:** the residents and Oren (D4, D9; Oren's rig contract first).
- **W-8:** the bridge's places on Twinsun and Zeelich for the temporary intervention, and the stations' adaptations
  (built in the existing regions, through hooks).

## Hooks (shared files touched, by either side)

_(file, line or function, why)_
