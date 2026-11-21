# CAST-VARIANTS-1 · three shape variants (farmerA_b, farmerB_b, clerk_b) and GROBO-GREY (no green elephants) · the desktop, 11.11.2026

Order 28, queue 7: the most shared models get a second shape so the people who share them stop reading as twins.
And the user, 11.11: **"why are there green elephants, it makes no sense"**. Apply **after CAST-CONNECT-1** (the three
requests apply in order on origin `1d0bd24e`: NAMED, CONNECT-1, VARIANTS-1; checked on a scratch index).

## Files
- `CAST-VARIANTS-1.diff`: `tools/blender/cast_poly.py` (3 CAST entries), `src/game/characters.js` (3 LOOKS and the trader's
  skin), the people moved in `storylife.js`, `roomlife.js`, `walkrounds.js`, `islandlife.js`, `ihomes.js`, and two tints.
- `CAST-VARIANTS-1/`: `farmerA_b.json`, `farmerB_b.json`, `clerk_b.json` (new) and `desertTrader.json` (replaces the
  shipped one) for `assets/poly/`; `skeletons.add.json` (the three new looks and desertTrader's entry, whose `look` now
  carries the grey skin: dumped by `tools/dump-skeletons.mjs`); `index.add.json` (the three names, for `assets/poly/index.json`,
  which stays sorted by code unit).
- Pictures `docs/future/characters/variants-1/`: `farmerA_b-…`, `farmerB_b-…` and `grobo-grey-…` are Citadel people (Wim,
  Maro, Brix: chapters 1-2, may go to the user); `ch3plus-clerk_b-…` is not for the user.

## The variants (each in its base look's exact role hexes, so DRESS-1 recolours them)
| New look | From | What differs | People moved to it | Who keeps the base |
|---|---|---|---|---|
| `farmerA_b` | farmerA ×7 | bare-headed (the tuft shows), heavier (belly 0.14), a longer smock (hem 0.45), sleeves down with cuffs and wrists, a swept moustache | Rod (`dg_rod`, the dig), Tam (`lh_tam`, the Hamalayi), Wim (`wim`, Nell's house) | Jorr, Garrick, Tibbo, the farm evacuees |
| `farmerB_b` | farmerB ×8 | no apron, patch pockets, both ears folded over (lop ears) | Maro (`maro`, Citadel's plaza), the counter's waiting man (`up_wait`) | Tavi, Hedda, the dig's cook, Mira of the Hamalayi, Lhamo, the farm evacuees |
| `clerk_b` | clerk ×7 | broader (not slim), a wrapped headcloth, a belted robe, no spectacles | Otringal's keeper (`ot_keep`), Aven (`aven`, Zeelich's boulevard), Dobb (`ih_dobb`) | the council clerks, Corla, Otringal's clerk |

A cap for farmerB_b was tried first and dropped: the Rabbibunny's cap code drew only its band, across the eyes.

**Tavi stays on farmerB:** with Tavi moved to farmerB_b, `interior-life` failed one more check in the terminal in chapter 9 and
the epilogue, both runs: the talk test could no longer get an answer from Ollo, who stands next to Tavi. With Tavi back on
farmerB it fails exactly as the unchanged branch does. Not investigated further: **a fragile spot in the terminal's talk test
for the cloud** (the person picked for a talk seems to depend on a neighbour's model).

## GROBO-GREY
- `desertTrader`'s skin was `#9aa898`, a sage green-grey: the only green Grobo (all the others are blue-, violet- or
  warm-grey, as LBA2's). Now `#a6a2a8`. Worn by Brix (Citadel's village walker), Rollo (the pharmacy) and the dig's trader.
- **Brix's tint** `#d8f0d0` (green) multiplied the whole model (`walkers.js`: `material.color.set(def.tint)`), so in
  Citadel's village from chapter 1 he walked as a green elephant. Now `#e8e4f0`, a grey-lilac like the other Grobos' tints.
  **Gunda's** `#e6eee4` (slightly green) is `#ece8f0` too. Every other Grobo's tint is blue or warm (checked: 14 people).
- The picture's bottom row multiplies the model by the old and the new tint, as the game does.

## Numbers
| Model | Triangles | Against its base |
|---|---|---|
| farmerA_b | 3148 | farmerA 2688 (+17.1 %) |
| farmerB_b | 2588 | farmerB 2524 (+2.5 %) |
| clerk_b | 2420 | clerk 2182 (+10.9 %) |
| desertTrader | 3850 | 3850 (colour only) |
Each is 3 meshes, the same materials; no draw call added. floating.py: all four OK (no loose part). DRESS-1 (`dresscheck.mjs`,
variants 1-6): no role keeps its base hex in any variant, for the three new looks and their bases alike.

## Tests (SwiftShader, the desktop, CONNECT-1 and this batch in place)
solidnpc 54/54, chapter1 23/23, cast-rounds 209/209, story-journeys 30/30, walkers 37/37, island-people 65/65 PASS;
interior-life 140/144: **the same 4 failures as the unchanged branch** (run on `1d0bd24e` the same day: the spaceport's
chapter-4 talks and the terminal's chapter-1, evacuation and epilogue checks; Esren and Ollo give no line).

Evidence labels: **Automated runtime only**. Nobody played it. No Vega 8 frame time.

## Not verified
- The moved people in their own places by eye (pictures are lookdev turnarounds).
- Rollo in the pharmacy and the dig's trader with the grey skin in their scenes.
