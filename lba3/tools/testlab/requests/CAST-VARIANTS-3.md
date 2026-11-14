# CAST-VARIANTS-3 · archivist_b, the field archivist (queue 7's last) · the desktop, 12.11.2026

CLOUD_ORDERS 40 item 3: "Left: `archivist_b` (×5 share it)". Applies on the branch as it is (`0e31b6d8`; checked with
`git apply --check`).

## Files
- `CAST-VARIANTS-3.diff`: `tools/blender/cast_poly.py` (one CAST entry), `src/game/characters.js` (one LOOKS entry), the
  two people moved in `walkrounds.js` (Bashir, and `DESERT_BODY`) and `storylife.js` (the dig's site clerk).
- `CAST-VARIANTS-3/`: `archivist_b.json` (new, for `assets/poly/`); `skeletons.add.json` (dumped by
  `tools/dump-skeletons.mjs`); `index.add.json` (the name, for `assets/poly/index.json`, which stays sorted by code unit:
  `archivist`, `archivist_b`, `arthur`, …).
- Picture `docs/future/characters/variants-3/ch3plus-archivist_b-base-top-variant-bottom.png` (both people are on Desert
  Island, chapter 4: **not for the user**).

## The look
| New look | From | What differs | People | Who keeps the base |
|---|---|---|---|---|
| `archivist_b` | archivist ×5 | a field archivist for the desert: a wide straw sun hat (`#d8c490`), no spectacles, no collar, no buttons; the coat cut shorter (hem 0.40, was 0.28); sleeves rolled to the elbow; a leather strap across the chest (`strap` `#6a4a2a`); a broader build (not slim); a round nose | Bashir (Kesh, `bashir`), the dig's site clerk (`dg_clerk`) | the archivist (the council), Kip (the tavern), Bern (the terminal, grounded and evacuation) |

Every clothing role keeps its base look's hex (tunic, trim, belt, buckle, pants, shoes, hair, skin), so DRESS-1 recolours it.

## Numbers
archivist_b 2820 triangles (archivist 2878: **−2.0 %**; the spectacles, collar and buttons out, the hat, strap and cuffs in);
3 meshes, no draw call added. `archivist` rebuilds **identical** with this cast_poly.py. floating.py: both OK.
DRESS-1 (`dresscheck.mjs`, variants 1–6): no role keeps its base hex, for archivist_b (36 overrides) and archivist (30).

## Tests (SwiftShader, the desktop, this batch in place)
solidnpc 54/54, cast-rounds 209/209, desert-life 30/30, story-journeys 30/30, chapter4 59/59 PASS.

Evidence labels: **Automated runtime only**. Nobody played it. No Vega 8 frame time.

## Not verified
- Bashir and the clerk in their own places by eye (the picture is a lookdev turnaround).
