# REV-V-1 — visual review of the merged visual pass (head 31deb6c)

Reviewer: the lba3-visual-reviewer agent. No source changed. SwiftShader only (no GPU timings), one browser at a
time, the main checkout served on :8180. Regression tests run: transitions, resume, spaceport, zislands, townlife —
all passed, no page errors. Cited screenshots are in this folder.

**Verdict: ACCEPT WITH NOTES for VP-1…VP-8, SD-1, SD-2, SD-3; REWORK for CH-DF (the folded-wing doze pose only —
the model itself is a clear step toward LBA2's body 167).** No critical or high regression.

| Task | Verdict | Evidence | Notes |
|---|---|---|---|
| VP-1 hair cap / bun | ACCEPT WITH NOTES | out-vp1-sheet2.jpg, out-vp1-sheet3.jpg | the bun meets the skull in idle/listen/walk/run, all angles. Canon/art call: from the front he reads as a bald head with a ball-cluster topknot; LBA2 shows dark hair on the crown and an arched tuft |
| VP-2 NPC keep-apart | ACCEPT WITH NOTES | out-vp2b-run-head.jpg | stops at 0.85 m, slides round running; VP-11 known; D3 |
| VP-3 leaving home | ACCEPT WITH NOTES | out-vp3-exit.jpg, out-vp3-veil-time.jpg | no roof, no veil; D4 (VP-10); island.js faders at 0.12 not tested |
| VP-4 chapter card | ACCEPT | — | card 0.3–3.1 s, line at 3.9 s; "CHAPTER N" line lacks a backing |
| VP-5 prompt / weapon pill | ACCEPT | — | hidden under dialogue, inventory, holomap, pause |
| VP-6 holomap labels | ACCEPT | — | 9 states, 0 overlaps |
| VP-7 customs booth | ACCEPT | shots-main-04-harbour-customs.jpg | sign, window, door face the camera |
| VP-8 well light shaft | ACCEPT WITH NOTES | out-vp8-sheet.jpg | reads as a warm floor glow more than a beam |
| SD-1 street kit, spaceport, town | ACCEPT WITH NOTES | — | the town no longer reads empty; nothing on doors/paths; spaceport middle bare deck, no travellers |
| SD-2 Zeelich islands | ACCEPT WITH NOTES | sheets-isl-a.jpg, out-kn-arrival-play.jpg | identity per island; D5, D6 |
| SD-3 Hamalayi | ACCEPT WITH NOTES | shots-isl-h1-landing.jpg | lived-in; D7; cliff backdrops are flat textured walls |
| CH-DF Dino-Fly | REWORK (doze pose) | out-df-crops.jpg, out-df-orbit.jpg | D1, D2 |

## Defects
- **D1 (Medium) CH-DF:** the folded wings stand upright on the flanks as two flat tan boards (DOZE wing0 z 67°, wing1
  −148° in dinofly.js); no bones or scallop readable.
- **D2 (Low-Medium) CH-DF:** the "looking at Twinsen" pose foreshortens neck and head into a teal tube toward the
  camera; cylinder-end feet, flat muzzle cap, a facet crease at the neck root.
- **D3 (Low) VP-2:** with the NPC backed against an obstacle (Pippa by her stall lamp), he stops dead ~0.75 s and
  briefly overlaps the lamp post before the squeeze rule releases him.
- **D4 (Low) VP-3/VP-10:** at his door the house is drawn as nothing but keeps its shadow; on re-centre a stacked
  translucent veil shows ~0.4 s while fading back in.
- **D5 (Low-Medium) SD-2 Knartas:** 2–2.5 m clay jars crowd the arrival walkway; the harbour basin reads as a blank
  white hole (cloud floor, no boats visible from the arrival camera).
- **D6 (Low) SD-2:** big foreground occluders at some cameras (Under Celebration's gas holder, a sail at Knartas);
  Zeelich's buildings are still plain boxes with flat purple windows (pre-existing; conflicts with "not too boxy").
- **D7 (Low) SD-3:** the Hamalayi landing aircraft is a primitive (box wing on a cylinder).
- **D8 (Low, pre-existing):** occluders in Citadel that never fade (the harbour-lane stall roof at customs, the
  spaceport's purple dome at the waiting side).

## Performance (renderer.info, SwiftShader, 1280×720, high)
Within 0–12 draw calls of each task's reported figures on head: deck 810, square 932, lane 923, quay 565,
Hamalayi 211–272. First-view shader compiles spike 2–8 s (pre-existing). No GPU claim.

## Next visual fixes, ranked
1. CH-DF-FIX: wings laid along the flanks; the look pose and the muzzle/feet caps.
2. VP-10: how a faded house reads (and island.js's 0.12 veil).
3. SD-2-FIX Knartas: jars, the cloud basin as a harbour; arrival cameras off big occluders.
4. Zeelich buildings de-boxing (cornices, arches, dome detail).
5. VP-11: side-step animation + D3.
6. D7 Hamalayi aircraft; VP-12 Doran's shed.
7. Fading for non-house occluders (D8).
8. Polish: chapter card "CHAPTER N" backing; waiting travellers on the spaceport deck.
