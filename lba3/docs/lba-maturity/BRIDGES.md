# BRIDGES — every plank bridge walkable on foot (25.11.2026)

The user, 25.11 (after wave 3, `WAVE3.md` H-8): every bridge that looks walkable must be walkable on foot, across the
whole game. Built on a worktree of `ccr-c1c2c4b9-dep6ed` (base `eb9ce9c5`). **Automated runtime only (SwiftShader,
headless Chromium)**: nobody has played this; no frame rate or hardware result is claimed.

## The cause

`src/engine/physics.js` resolves the ground at **one point under his middle** (`_ground`: the terrain, then the highest
collider whose footprint, shrunk by 5 cm, holds that point). A deck built as **separate planks** gives one collider per
plank. On the islands (`zislands.js`) every object of the original's layout becomes its own piece: Mosquibee's bridge is
19 slats (each 0.8 m along, 1.6–2.5 m across, a 0.27 m slab), set 0.1–0.45 m apart. Over each gap the point under his
middle found no plank, so the ground there was the cloud sea (−9 m): `_tryMove` refuses a step onto the sea (he stopped
dead at the first gap), and where the drop was land, `fall` dropped him through. The only allowance was the 6 cm seam
rule (two floor bricks laid edge to edge), far narrower than these gaps.

A second fault behind it, on the same bridge: its islet end is 3–5 m over the honey room's yard. Our island builder cut
the ground there down to the room's door (6.2 m; the original's ground at the bridge's foot was about 11 m), so even a
walkable deck ended at a drop he could not climb back up.

## The fix

1. **`physics.bridgeTreads(cols)`** (new, engine): once, when an area is built (`regions.js finish`, every area; Citadel
   in `main.js` before the areas), every **run of three or more planks** — thin boxes (≤ 0.6 m deep, a floor one can
   pass under), turned alike, about one length across the run (≥ 55 % of the longer), in line (≤ 0.5 m off), each 2–60
   cm from the next at nearly one height (≤ 0.3 m), **over a drop of a metre or more** — gets an unseen tread across each
   gap, at the lower plank's top, as long as the shorter plank, 5 cm onto each (`seeThrough`, a 0.3 m slab: one can pass
   under, it hides nothing from the camera). Nothing is checked per frame; nothing else changes. Not bridged: stepping
   stones (cylinders), blocks and crates (solid to the ground), two floors side by side, a gap alone, a gap with floor
   under it. `globalThis.__noTreads` turns it off (the A/B and the before pictures).
2. **Mosquibee's honey islet**: a flight of dressed steps (`zislands.js` STYLE mosquibee `flights`, the islands' own
   ISLES-BAR flights, now with `deck: true` = its head on the deck) from the bridge's south edge by its last planks but
   one, 5.65 m down into the honey room's yard, its cheek walls each side.
3. **The wave-3 workaround removed there** (`story/depth.js` ISL-3): no davits, no ring, no arch over a plank for the
   honey islet; its arrival is seen on foot (`farWalked`: the first time he stands on the islet, his "It smells
   wonderful" and a save). Twinsen's "set for Mosquibee strides" line and its Hebrew are gone; so is the near shore's
   "The Mosquibees fly over. I can't." look (`story/ihomes.js FAR`, `ih_far_islet`, English and Hebrew), now untrue.
   The journal line says "over its plank bridge and down the steps" (Hebrew too). The honey pot stays where it was, one
   full heal each visit. The other wave-3 rings stay: Otringal's barges' yard and west quay, the Hamalayi gorge's ice arch.
4. **A bank's lip at a bridge's end** (found by the walk; game-wide in the same pass): where the bank an end plank meets
   rises steeply through the plank's far half to a crest a few cm over it (Mosquibee's east end: 7 cm over the plank,
   steeper than he walks up from a standing step), he walked off the bank onto the bridge and could not walk back. At
   the same build step each run's end plank gets an **end tread** over the lip at the crest's height (+2 cm), from where
   the ground comes up through the plank to 15 cm past the crest; only where the crest is at most 15 cm over the plank
   within a metre of its edge (ground lower than the plank: nothing). No per-frame rule was changed.

Save format unchanged (6). `dx_far_honey` keeps its meaning (he has been over); a save made with the ring crossing loads
as it was.

## Visible changes (for the user to pick)

- Mosquibee: **a flight of stone steps** (1.2 m wide, cheek walls) from the plank bridge's south edge down into the
  honey room's yard (`captures/bridges/isle_mosquibee-steps.png`).
- Mosquibee: the wave-3 **davits, the ring and the Esmer arch over a plank** for the honey islet are gone (Otringal's two
  crossings and the gorge's arch stay).
- The treads are unseen; nothing else is drawn differently.

## The sweep (every region: 149 areas and rooms, `tests/bridges-walk.mjs` part 1)

In every area: a gap 3 cm–1.2 m between two floors laid over something (a collider with its own underside, at most
0.6 m deep: decks, walks, planks; not blocks or crates solid to the ground), at about one height (≤ 0.55 m apart), with a
drop of a metre or more under it and no wall standing in it. Two or more within 2.5 m = a deck with holes = FAIL.

| Region | Plank bridge / deck | Kind | Result |
|---|---|---|---|
| Mosquibee (isle) | the plank bridge to the honey islet: 19 planks, 20.6 m, deck 9.85–11.14 m | separate slats (the original's objects) | **fixed**: 18 gap treads + 1 end tread; walked end to end and back by input, no fall, no life lost; bank → bridge → steps → yard and back by input, unhurt |
| Otringal, Knartas, Celebration, Under Celebration, the Platform, the Lift Dock, the Orchard, the Old Watch (isles) | no plank run (their decks are whole slabs) | — | no open deck |
| Citadel (outdoors: the spaceport bridge, the harbour, the promenade) | no plank run; the spaceport's bridge is one walkway | one deck | no open deck |
| Zeelich (the street, the canal's plank bridge, Mill Lane's stage, the spaceport bridge) | one deck collider each | one deck | no open deck |
| the Hamalayi (the tree bridge over the gorge, Lhar, Kesh), the desert | the tree bridge is one log collider (felled in chapter 6) | one deck | no open deck |
| Ballastra harbour (the swing bridge) | one deck collider with rails, moved as it swings | one deck | no open deck |
| the sewers | slabs whose seams already have their own unseen treads (sewers.js `bridge`) | treads (older) | no open deck |
| every interior and LBA1 room | none | — | no open deck (the asylum's and the maze's floor tiles meet under their walls: not holes) |

Single gaps over a drop (two floors side by side, not decks; listed, not failed): the asylum's upper floor, two corner
gaps between blocks (6977.9, 20.1: 0.96 m on the diagonal; 6981.9, 11.8: 0.04 m). Left as they are (LBA1 room grid,
not a bridge; not walked).

Not walked by this suite (no gaps to bridge; the sweep only): the one-piece bridges above (the Hamalayi tree bridge is
stood on by `depth-wave3.mjs` part 8; the others by their own suites). Their kind is source-reviewed.

## Results (Automated runtime only: SwiftShader, headless Chromium; nobody has played this)

| Run | Result | What |
|---|---|---|
| `tests/bridges-walk.mjs` (every region, SHOTS=captures/bridges), once | 4 PASS, 1 FAIL | the Mosquibee walk PASS (there 10.5 s, back 10.8 s, lowest 9.85 = the lowest plank); Mosquibee bank → yard → bank PASS (unhurt, yard 6.21, back 10.83); every tread between two planks or on a lip PASS; the sweep FAILED on the asylum (11 sites) and the maze (1 site, 37 gaps): the LBA1 rooms' floor tiles 0.6–1.2 m apart, which meet under their walls |
| the sweep's rule then gained "no wall standing in it"; `ONLY=asylum,bumaze tests/bridges-walk.mjs` | sweep PASS (0 open decks; 2 single gaps listed) | its "a bridge found" check failed only because that run left Mosquibee out (now skipped under ONLY) |
| `ONLY=8 tests/depth-wave3.mjs` | **PASS 13/13**, errors none | the honey islet on foot: no ring offered, bank → bridge → steps → yard unhurt, "It smells wonderful", the honey pot (full life), none again the same visit; back up and over on foot; another visit: the pot again; Otringal's two ring crossings, the gorge's arch and the journal as before |
| `ONLY=isle_mosquibee tests/overlap-sweep.mjs` | **PASS** (a)–(g), 0 open | known (by design) now c 9, d 5, e 1 (wave 3's count: c 8, d 3, e 1) |
| `node tools/he-bundle.mjs` + `node tests/dialogue-check.mjs` | **PASS** | Hebrew 100 % (6116 of 6116 keys) |

Development runs (not counted): an islands-only and a Mosquibee-only run of the new suite and probes found the areas'
attribution (regions.sceneOf takes the first island within 400 m; the suite takes the nearest), the arrival line opening
a talk mid-walk (read, then on), and the bank's lip at the east end (fix 4).

Not run (one suite per change): the chapter suites, `gap-scan.mjs`, `slidetraps.mjs`, `zislands.mjs`, `island-doors.mjs`.

## Pictures (`captures/bridges/`, play camera, 1280×720)

`isle_mosquibee-1.png`: Twinsen stopped mid-span by input on the plank bridge; `isle_mosquibee-steps.png`: on the new
steps down to the honey room's yard (placed there for the picture); `sheet.png`: both. Inspected by the agent only.

## Files

| File | Change |
|---|---|
| `src/engine/physics.js` | `bridgeTreads(cols)` (gap treads, end treads), `LIP` |
| `src/game/regions.js` | `finish`: each area's colliders through `bridgeTreads` (`G.treads` its count) |
| `src/main.js` | Citadel's colliders through `bridgeTreads` before the areas |
| `src/game/zislands.js` | ISLES-BAR flights: `deck: true` (head on a deck); Mosquibee's flight |
| `src/game/story/depth.js` | ISL-3: the honey islet a walk (`walk: true`, no davits / ring / arch, `farWalked`) |
| `src/game/story/ihomes.js` | `FAR`: the honey room no longer "across the clouds" |
| `src/game/text/depth.js`, `text/he/depth.js`, `text/ihomes.js`, `text/he/ihomes.js`, `he-text.js` | lines removed; the journal line |
| `tests/bridges-walk.mjs` (new), `tests/depth-wave3.mjs` (part 8), `tests/README.md` | the suites |
| `tools/bridges-sheet.py` (new), `captures/bridges/` | the pictures |

## בעברית (סיכום)

**הסיבה:** הפיזיקה בודקת את הקרקע בנקודה אחת מתחת לאמצע הגוף. גשר שבנוי מקרשים נפרדים (בגשר של מוסקיבי כל קרש הוא
אובייקט נפרד של המקור) משאיר רווחים של 10–45 ס"מ, ושם הנקודה "רואה" את ים העננים: טווינסן נעצר ברווח הראשון או נופל.
בנוסף, קצה הגשר בצד האיון היה 3–5 מ' מעל החצר של חדר הדבש, בלי דרך למטה.
**התיקון (לכל המשחק):** פעם אחת, כשאזור נבנה, כל שורה של שלושה קרשים או יותר מעל תהום מקבלת משטח בלתי נראה בכל רווח
(ובקצה, מעל שפת הגדה כשהיא עולה מעט מעל הקרש). אין בדיקה בכל פריים. במוסקיבי נוסף גרם מדרגות מאבן מהגשר אל החצר.
הטבעת, הדוויטים והקשת של גל 3 לאיון הדבש הוסרו, וגם המשפט "בנוי לצעדים של מוסקיבים" (אנגלית ועברית). שאר הטבעות של גל
3 (אוטרינגל, הקשת בערוץ) נשארו. סיר הדבש במקומו, ומגיעים אליו ברגל.
**הסריקה:** 149 אזורים וחדרים: גשר קרשים אחד בכל המשחק (מוסקיבי); כל שאר הגשרים הם משטח אחד בלי רווחים.
**תוצאות (הרצה אוטומטית בלבד, SwiftShader):** הליכה מקצה לקצה ובחזרה בלי נפילה; מהגדה, על הגשר, במדרגות אל החצר
ובחזרה בלי פגיעה; depth-wave3 חלק 8 עבר 13/13; overlap-sweep למוסקיבי עבר; העברית 100 %.

## Sides blocked (the user, 25.11: "לחסום")
`physics.bridgeTreads` now also lays an unseen guard along each long edge of a plank run (just outside the planks, inside
the drawn rails, a metre high, see-through and passed by the ball), only where the edge stands over a drop: where ground or
a stair meets the edge (Mosquibee's steps down to the honey yard) it stays open, and the two ends stay open to step on and
off. `tests/bridges-walk.mjs` walks off each long edge from the middle. Result (automated runtime only, SwiftShader),
`ONLY=isle_mosquibee`: PASS 6/6 — the walk both ways, both sides held, bank → bridge → steps → yard and back unhurt, the sweep.

**בעברית:** חסמנו את הצדדים של גשר הקרשים בקיר שקוף בתוך המעקה, רק מעל התהום. הקצוות והמקום שבו המדרגות יורדות לחצר נשארו פתוחים. הבדיקה עברה 6 מתוך 6.
