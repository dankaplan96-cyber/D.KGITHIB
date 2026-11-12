# CAST-VARIANTS-2 · Kira's own look; zmole2_b, zbee1_b, zbee2_b, nara_c · the desktop, 11-12.11.2026

Order 28 queue 7, the rest: "councilB for Kira; zmole2, zbee1, zbee2", and nara again (still 9 people after nara_b). Applies on the branch as it is (`5852e1b1`: the cloud applied CAST-VARIANTS-1 as d0c31b18; the islandlife.js hunks remade on its
NO-AIR 3 file; checked with `git apply --check`). (First made to apply in order
on origin `f4636a26`; checked on a scratch index).

## Files
- `CAST-VARIANTS-2.diff`: `tools/blender/cast_poly.py` (4 CAST entries; a `pouch` option in `build_bee`: a satchel),
  `src/game/characters.js` (4 LOOKS), the people moved in `walkrounds.js` and `islandlife.js`.
- `CAST-VARIANTS-2/`: `kira.json`, `zmole2_b.json`, `zbee1_b.json`, `zbee2_b.json`, `nara_c.json` (new) for `assets/poly/`;
  `skeletons.add.json` (the five, dumped by `tools/dump-skeletons.mjs`); `index.add.json` (the five names; the index stays
  sorted by code unit).
- Picture `docs/future/characters/variants-2/ch3plus-variants-2-base-left-variant-right.png` (all five are Zeelich or isles
  people: **not for the user**).

## The looks
| New look | From | What differs | People | Who keeps the base |
|---|---|---|---|---|
| `kira` | lharWoman ×4 | Kira's own: a wide straw hat, sleeves rolled to the elbow, a gardener's apron, leather gloves, brown hair, a warmer green dress and a brown belt | Kira (`kira`, Zeelich's plaza gardener) | Dawa, Sana, Oda |
| `zmole2_b` | zmole2 ×4 | a small Wannie at work: no apron (the belt and buckle show), a miner's cap with its lamp (zmole1_b's `minerCap`) | the underground's carrier and gauge-reader (`ug_carrier`, `ug_gauge`) | the two villagers |
| `zbee1_b` | zbee1 ×5 | a heavier porter (belly 0.1: the abdomen 20 % wider) with a **satchel** on a strap across the abdomen's front | the first tender (`mb_tend1`), the second loader (`ld_load2`) | the other tender, the flier, Zuzz |
| `zbee2_b` | zbee2 ×5 | the matron's red without her crown, slimmer, a satchel | the orchard's carter (`or_carter`), the lantern-lighter (`ce_lanterns`) | Bzzra, Zett, Otringal's guest |
| `nara_c` | nara ×9 | an island worker: broader (not slim), a wrapped headcloth in the trim's gold, a belt over the short robe | Knartas's net-mender (`kn_nets`), the orchard's picker (`or_pick1`), the sketcher (`ow_sketch`) | Nara, Neska (`sefa`), Ulla, the dancer, Lissa, Liwa |

The queue said "councilB for Kira" (the laptop's note from when Kira still wore Sela's model); she has worn lharWoman since,
so she gets a look of her own instead of a councilB variant.

**The satchel** (`build_bee`, when the look has `pouch`): a cord laid on the abdomen's surface from the front of the right
shoulder across the front to the left side, and a bag with a flap there (the flap and strap darker multiples of the pouch's
hex, so DRESS-1 recolours the bag). The bees without `pouch` are unchanged: `zbee1` and `zbee2` rebuild identical.

## Numbers
| Model | Triangles | Against its base |
|---|---|---|
| kira | 2958 | lharWoman 2646 (+11.8 %) |
| zmole2_b | 3062 | zmole2 2590 (+18.2 %) |
| zbee1_b | 3386 | zbee1 3272 (+3.5 %) |
| zbee2_b | 3422 | zbee2 3364 (+1.7 %) |
| nara_c | 2422 | nara 2010 (+20.5 %) |
Each 3 meshes, no draw call added. floating.py: kira, zmole2_b, zbee1_b, nara_c OK; zbee2_b only its lashes, which sit on its eyes
(the eyes are not measured, as for zbee2). DRESS-1 variants 1-6: no role keeps its base hex, for kira and the three animals (nara_c: same roles and hexes as nara).

## Tests (SwiftShader, the desktop, VARIANTS-1 and this batch in place)
solidnpc 54/54, chapter1 23/23, cast-rounds 209/209, story-journeys 30/30, walkers 37/37, island-people 65/65 PASS.
(A first run was thrown away: a copy step had put the builder's short index into `assets/poly/`, so most people drew
the fallback; found from a picture, fixed, and the suites rerun on the corrected index.)

Evidence labels: **Automated runtime only**. Nobody played it. No Vega 8 frame time.
