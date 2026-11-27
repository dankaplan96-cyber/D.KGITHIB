# SMALLFIX-27-11 (27.11): inside-out lathes, the isles' feet pieces, #67

Branch `smallfix-27-11` (from `ccr-c1c2c4b9-dep6ed` at `ffe34e88`), not pushed. Every result here is **automated
runtime only (SwiftShader, headless Chromium)**: nobody played it, no real GPU, no frame times measured. Picture:
`captures/smallfix-27/sheet.png` (1280 x 2262: before | after, the part alone and in the scene; nothing from chapters
15–16 or the ending).

## 1. Inside-out lathes

**The suite** `tests/inside-out.mjs` (+ `tests/lib/insideout.js`): a new game, every area and room built
(`?allregions`, `regions.ensureAll`, `?nobatch`: 153 areas and rooms) and what else is in the scene (the cast's rigs,
pickups). Every mesh drawn one-sided (FrontSide or BackSide; DoubleSide left out) is cut into its connected parts
(corners welded at 3 mm: the lathe helpers clamp the axis to r = 0.001). A part is **closed** when its area vectors sum
to ~0 and its open edges are a pinhole's (a tube without caps also sums to 0); its signed volume then says which way
it is wound. FAIL: a closed part pointing in, drawn so (BackSide counts the other way; a mirrored instance flips it,
since three.js flips the front face per object only). KNOWN: the sky dome. Listed, not judged: small open parts
pointing well in (dir < −0.5, under 10 m). 10 684 one-sided meshes, 86 737 parts, 16.3 M triangles.

**Positive control** on the base: it found FEET-66B's islet and bell and every small one in its list, and not the
dais FEET-66B had fixed. 79 closed parts inside out (1 known); after the fixes **0**.

**Fixed (profile reversed, shape unchanged; with kit.js's lathe v is the height, so its UVs are unchanged; the
others' v runs along the profile and is flipped, on untextured or vertex-coloured pieces)**, each
confirmed by a picture first:

| Piece | File | Copies | Sheet row |
|---|---|---|---|
| Ballastra's rock islet north of the aqueduct, 17 m | `ballastra/gardens.js` | 1 | 1 |
| The Arch District's bell | `ballastra/arches.js` | 1 | 2 |
| Citadel's harbour bell (its clapper showed through it) | `story/prologue.js` | 1 | 3 |
| The harbour shed's chimney cowl; the hut's small bell | `ballastra/harbor.js` | 1 + 1 | 4, 5 |
| The lanterns' caps (harbour, arches, gardens) | `ballastra/look.js` | 37 | 6 |
| The desk lamp's shade (shed, Oren's room) | `ballastra/shed.js`, `ballastra/archrooms.js` | 2 (the shed; Oren's room in the Arch District) | 7 |
| The Francos' huts' pot caps | `franco.js` | 20 | 8 |
| Zeelich's drill rig bit (open at the top: found by the open list) | `zeelich.js` | 1 | 9 |
| The school bell by the Desert's wall | `offwall.js` | 1 | 10 |
| The pharmacy's hanging herb bundles | `pharmacy.js` | 12 | no visible difference |
| The pump room's lamp shade (a thin two-walled shell) | `pumproom.js` | 1 | no visible difference |

**A second cause, game-wide (props.js `vcTwin`)**: a Kit merges flat and painted colours into one vertex-coloured twin
material keyed without its side, so `twoSided(MAT.paint(...))` drew one-sided. Keyed with the side now. Two pieces in
the game: the lighthouse room's iron band round the gallery's edge (sheet row 11: it was missing from outside) and the
pipes in an underground room (chapters 15–16: not pictured).

**Sweep**: the runtime check covers every built area and room. Enemies, items and pickups not in the scene at a new
game are covered only by a static check of the **399 literal profiles** passed to `lathe`/`LatheGeometry` in `src/`:
after the fixes 5 run the other way, all drawn DoubleSide (the falling-water bells, `props.js` and `underground.js`
shades). Profiles built in code and not in the scene: not covered.

**Listed (open parts, not judged)**: Citadel's two sewer shafts (seen from inside: on purpose), Doran's bucket (its
inside wall, mirrored on purpose in `harbourlife.js`), two bits of the square's statue figures (a hem's inside), and a
1.91 m part of a rig at the scene's origin (3 meshes, at (0, 0.65, 0.61): not identified; not touched).

## 2. The isles' feet pieces (FEET-66B's handed-on 9 + 30)

Rediscovered first (`DISCOVER=1 ONLY=isle`): the line numbers and causes below are today's.

| What | Where | Fix (colliders only: no mesh, terrain or paving changed) |
|---|---|---|
| Low noStand colliders walked through (physics steps over a noStand brick up to STEP_UP): Otringal's 19 frond-tree planters (49 cm), a wall's low end on a slope (48 cm), benches, crates, planks, fences | `zislands.js` | every noStand isle collider (not a stair, not `block: false`) is a `block`, as FEET-66B did elsewhere |
| Rocks: flat colliders 5–48 cm off their drawn domes (Otringal 4, Knartas 2, Celebration 3) | `zislands.js` rock | `block` (obstacles, as every scattered rock since FEET-66B) |
| Fallen blocks of the old wall, tilted: a low one's top 15 cm over its flat collider, a tall one's edge 47 cm out (Oldwatch) | `zislands.js` block | `block` at the drawn size, its top 15 cm over the drawn top |
| Rocks and fallen blocks on a slope's edge had no collider at all ("he would slide into it"): Oldwatch's blocks, Celebration's and the Platform's rocks (50–60 cm, walked through) | `zislands.js` `small` | a `block` there too (rocks and blocks only: given to every small thing there, a fence drawn across the Platform house's door shut it, `island-doors` failed; narrowed, `f1e0823f`) |
| Celebration's portal plinth: no floor, he walked 49 cm inside it where the plaza falls away | `celtemple.js` | a floor at the plinth's top |
| Franco's dig: the spoil heaps (22 cm), the filled holes' mounds (to 23 cm on the slope), the seat (0.5 m) walked into | `francosworld.js` | `block` colliders |
| Knartas's 14 and the Platform's floats "over nothing": other isles' colliders inside the bounds | `tests/feet-on-surface.mjs` | an isle's collider is judged in the isle whose middle is nearest it (isles only) |

Discovery after: **0 candidates on every isle**. `HANDED` holds the one true exception (Citadel's roof eave).

**Behaviour changes (for the user's pick)**: on the isles, planters, benches, crates, fences and other low props are
obstacles (were walked through); rocks and fallen blocks are no longer stood on; rocks and blocks at a slope's edge
are solid; Franco's heaps, mounds and seat are obstacles; the portal plinth is stepped onto. Nothing looks
different. The temple's door was walked in and out by input over the new plinth (scratch boot: entered, and back out on
the plaza).

**Reach** (the suite's flood over a 0.5 m grid, on foot and generously by the hop-pack; floors reached, before →
after; measured on `e293f25e`, before the narrowing, which only takes obstacles away): Otringal 43 140 → 42 121, Knartas' bounds 83 737 → 82 631, Mosquibee 17 838 → 17 567, Celebration 5 748 →
5 637, Undergas 26 397 → 26 218, the Platform 37 592 → 37 126, the Lift Dock 1 171 → 1 169, the Orchard 18 424 →
18 276, Oldwatch 5 092 → 5 015. Every lost cluster is a new obstacle's footprint (at most 64 points, 16 m²) or a
railing's line (railings on slopes: back to none after the narrowing); no region was cut off. The hop-pack in the flood can hide a walk cut off: `island-doors` (every isle
door by input, Knartas door to door by the planner) is the check of that.

**Slides** (scratch, `slidetraps`' method on the isles, 378 spots against the new obstacles, both builds; on
`e293f25e`, before the narrowing): 199 fine
on both, 166 fail on both (slides off an isle's edge into the clouds: a respawn either way, not this change; the isles
are not in `slidetraps`), 9 better, **4 worse** (Otringal (1881.7, 1876.2), Celebration (2905.5, 1820.1), the
Platform (3856.9, 1756.0), Oldwatch (5208.5, 1774.8): a slide held by a new obstacle ends in the fall's respawn; the
same four replayed on `f1e0823f`: still a respawn, 2 of them with a life lost). Handed on below.

## 3. #67: five suites undercounted minor residents' lines

**Cause** (in the game's source, not a game fault): P116's `Remarks.talk` swaps `game.say` for a recorder while it
runs a minor resident's talk, so a suite's wrapper on `game.say` never hears a line that goes over a head (the same as
island-doors' keepers, df4f94e4). **Fix in the tests**: `tests/lib/heard.mjs` hooks `game.say` and
`game.remarks.show`, names each line's speaker (by its def id or its `n_<id>` key; an outdoor twin's id accepted), and
logs `HEARD` per speaker (box / overhead). Per suite:

- `desert-life`: Kesh's people are chapter 4's cast (not minor): no remark possible; hears remarks anyway.
- `isles-bar`: **Zuzz's line was never read** (`await said()` thrown away; "talked" alone passed): now his own line
  is required.
- `zeelich-doors`: "Lissa and Wenna talk" passed on `tl.length >= 2`, which counted the rooms' own lines with
  theirs: now each in her own words.
- `hamalayi-life`: the chapter 8 lines (Bero, Sana, Lhamo, Yorna, Sefa), Tenpa's and Dorje's were matched in a pooled
  list: now each from its own speaker.
- `interior-life`: hears remarks under the same name; the two filters (`'n_' + id` / `def.name`) take either.

What each run heard: see the table below (HEARD lines). On the base, the lines that went over a head were not heard:
`interior-life`'s, `zeelich-doors`' and `hamalayi-life`'s checks of them fell short (inferred from HEARD; the base
not rerun).

## Tests (each once, `SERVE=1`; feet-on-surface and island-doors twice, after a fix; automated runtime only, SwiftShader)

| Suite | Commit | Result |
|---|---|---|
| `inside-out` (new) | `026b1113` | PASS, 1/1: 0 closed parts inside out (1 known, the sky); 6 small open parts listed (232 s) |
| `feet-on-surface` (all areas) | `026b1113` | PASS, 2/2: class A walked 1 (the roof eave, handed on: the one true exception), FAIL 0, not reached 0; class B 1 (the monastery wall's pillar, listed); soft snow 86, water 4 listed |
| `feet-on-surface` (all areas), again after the narrowing | `f1e0823f` | PASS, 2/2, the same counts (456 s) |
| `desert-life` | `026b1113` | PASS, 30/0. HEARD: every line in the box (Kesh's people are chapter 4's cast, not minor) |
| `interior-life` | `026b1113` | PASS, 144/0. HEARD: 32 of the rooms' and the ports' people spoke over their heads (Luc 3, Tavi 7, Ama 6 + 1 in the box, Lomba 5 …): on the base their "a line of their own" checks fell short (inferred from HEARD; the base not rerun) |
| `isles-bar` | `026b1113` | PASS, 13/0. HEARD: Ione 2, Zuzz 1, Ulla 1, all in the box; Zuzz's line is now required |
| `hamalayi-life` | `026b1113` | FAIL, 16/2. The #67 checks PASS (HEARD: Sana, Lhamo and Dorje over their heads, so on the base those checks fell short (inferred); Bero, Yorna, Sefa, Tenpa in the box). The two failures are not this branch's (it changes no Hamalayi, residents' or loading file): "a save with only chapter 7's key: Pim at the monastery" (Pim at x −11, in Lhar) and "Retry: back in play" (still `loading` after 120 s, with three browsers on the machine). Not rerun on the base |
| `zeelich-doors` | `026b1113` | FAIL, 22/2. "Lissa and Wenna talk (their own lines)" PASS: **both spoke over their heads** (HEARD: hero 1, Lissa +1 and Wenna +1 overhead), so on the base `tl.length >= 2` fell short (inferred; the base not rerun). The two failures (chapters 3 and 5): out of Zeelich's terminal he lands 7.84 m from its street door (the suite wants under 2.8 m); the terminal leads out by its gate since P83 item 10 (`2183c93a`, 20.11; the suite's check is from 7.11). Not this branch's |
| `island-doors` | `026b1113` | FAIL, 87/2: the Platform house `ih_platform_27_m38` was not entered (a fence drawn across its door, given a collider by this branch): fixed in `f1e0823f` |
| `island-doors`, again | `f1e0823f` | PASS, 89/0 (the Platform house entered; Knartas door to door by the planner). Two tries before it crashed the browser during boot or the first area (a renderer crash, `trap int3`, and a cgroup out-of-memory kill in `dmesg`, with two other agents' browsers running): no result, rerun once the machine had one other browser |
| `francos` (the dig: Mott, the tips, the Founder's Seat, the Waker found by the pocket set and dug, by input) | `93f3df66` | PASS, 19/0 (it covers the new heap, mound and seat obstacles) |
| `worldfit` | `026b1113` | PASS, 1/0, visual 8/0 |
| `walkers` | `026b1113` | PASS, 37/0 |

Diagnostic runs during the work (not the covering runs): `inside-out` 3 full (before, before with pictures, after
with pictures) and 2 for the two extra pictures; `feet-on-surface` 6 discoveries (`DISCOVER=1`, isles only); scratch
probes (colliders and their builders, the reach sets, the slides). The pictures the suites overwrite were restored
(`git checkout -- lba3/captures/`).

## Handed on / not covered

- The 4 isle slides that now end in a respawn (2 with a life lost), and the isles' 166 slides off their edges that do on both builds (the
  isles are not in `slidetraps`).
- `inside-out`: profiles built in code for things not in the scene at a new game (enemies, items, pickups); the open
  list is not judged; the 1.91 m rig part is unidentified.
- Interiors' and NPCs' feet: not measured (as FEET-66B).
- The Platform house `ih_platform_27_m38`: a fence is drawn across its door (3906.9, 1757.2) and walked through (things
  on steep ground have no collider); a layout fault for the isles' owner.
- `zeelich-doors`' terminal check (chapters 3 and 5) wants the old street-door landing; the terminal leads out by its
  gate since `2183c93a`: the suite's check to update (or the landing), not this branch's.
- `hamalayi-life`: Pim in Lhar in a chapter 7 save, and Retry still loading after 120 s: not this branch's; to rerun on
  the base when the machine is quiet.
