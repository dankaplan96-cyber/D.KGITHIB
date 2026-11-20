# CAST-POLISH-UNDERGROUND · the underground's and the sewers' people (order 28) · the laptop, 10.11.2026

Base: origin `db3707df` (detached worktree `lba3-items`, clean before this batch). Nothing committed.

## Files
- `CAST-POLISH-UNDERGROUND.diff` (code only, `git diff HEAD`; `git apply --cached --check` clean on a scratch index read
  from `db3707df`):
  - `tools/blender/cast_poly.py`: CAST `worker_b`, `nara_b`; the goggles' resolution as CAST options (`gogglesN`,
    `gogglesRimN`; the defaults 12/6 are Nell's, whose rebuild is byte-identical to the shipped `nell.json`); Vesk's collar
    edge (`VESK_OLD=1` builds the old collar);
  - `src/game/characters.js`: 2 new LOOKS entries (`worker_b`, `nara_b`), the `farmerC_b` comment;
  - `src/game/story/deeplife.js`, `story/zeelife.js`, `islandlife.js`, `story/isleslife.js`, `storylife.js`,
    `story/prologue.js`: one `char` each (two in deeplife.js and zeelife.js).
- `CAST-POLISH-UNDERGROUND/` for `assets/poly/`:
  - `vesk.json` replaces the shipped one;
  - `worker_b.json`, `nara_b.json` are new;
  - `skeletons.add.json` = `{worker_b, nara_b}` for `art/characters/skeletons.json` (dumped by `tools/dump-skeletons.mjs`;
    bone names and rests identical to worker's and nara's);
  - `index.add.json` = `["worker_b","nara_b"]` for `assets/poly/index.json`.
- Pictures (chapter 3+ people: **not for the user**): `docs/future/characters/{vesk,worker_b,nara_b,farmerC_b}/ch3plus-*.jpg`.

## Who is down there (census of all 173 people at load + the code)
| Place | Person (id) | Look before | After |
|---|---|---|---|
| the core, epilogue | Sala (`dp_sala`) | nara (x9 at load, x16+ with the isles) | **nara_b** |
| deep installation, epilogue | Tolli (`dp_tolli`) | worker (x6) | **worker_b** |
| the shaft, epilogue | Guard Harl (`dp_guard`) | keeper_b (x5, council guards) | unchanged (a uniform) |
| the core, chapter 12 | Vesk (`vesk`) | vesk | **vesk, VESK-COLLAR** |
| Citadel's collar, ch 11-12 | Baldino (`baldino`) | baldino (own script) | unchanged |
| the sewers' hall | Fosse (`fosse`) | farmerC (x3, all in Citadel) | **farmerC_b** (existing model) |

The drone and the mites are enemies, not cast. Nobody else stands in the sewers' rooms.

## What changed
- **VESK-COLLAR**: Vesk's tall collar was two bare shells 4 mm apart; its top and front edges were a paper line in the
  close and dialogue shots. The lining now rolls over them (a round edge 1.8 cm thick, in the lining's violet). Nothing else.
- **worker_b** (order 24): the project's maintenance hand; the same teal crew overalls in the same hexes, heavier
  (belly 0.1), bare-headed with short dark hair, a swept moustache, brass goggles pushed up on the brow (Nell's glass
  goggles at 8 sides), sleeves rolled. Takers: **dp_tolli (Tolli), dg_surv (Surveyor Anko), zr_fennick (Fennick)**.
  The ch 1 yard worker, Teo (`dg_porter`), Kasp (`dg_dig`) and Brann (`ih_brann`) keep worker. The hero's council
  disguise is `worker` and is unchanged.
- **nara_b** (order 24): an Esmer woman in a long dress flared to the boots with a belt and buckle (oku_b's long robe
  code and keeper_b's belt, no headgear, so it is neither of them), a cool palette of its own. Takers: **dp_sala (Sala),
  zh_wenna (Wenna), kn_mother (Mila; `il_mila` indoors takes hers), il_ione (Sister Ione)**. Nara, Neska (`sefa`), Lissa and
  the isles' other nara people keep nara.
- **Fosse** takes the existing `farmerC_b` (bare-headed): a straw sun hat in the sewer read wrong, and it parts him from
  Grull (`farmer3`) and Tobb, Citadel's two other farmerC people. No new model.
- Not changed: the moles' claws (no mole lives in the underground or the sewers); Zoé and Twinsen; Baldino; keeper_b.

## LBA2 check (read-only, numbers only, printed to the terminal, nothing extracted to disk)
`tools/lba-source/measure.py` on the user's LBA2 bodies 80, 81, 82, 83, 86 and 186 (Esmers): all share one capsule
(±0.10-0.107 H, 0.199-0.75 H) and the same limbs; they differ by headgear and dress only. So nara_b keeps the capsule and
varies the dress. The Quetch worker keeps the measured Quetch head and proportions (`docs/LBA2_MEASUREMENTS.md`); only
build (belly), hair and accessories change.

## Numbers
| Model | Triangles (with eyes and mouth) | Change | Hero frame (body twice) | Hero draw calls |
|---|---|---|---|---|
| vesk | 1722 -> 1878 | +9.1 % | 3380 -> 3692 | 4 = 4 |
| worker_b (on worker) | 2572 -> 3126 | +21.5 % | 5064 -> 6172 | 4 = 4 |
| nara_b (on nara) | 2010 -> 2086 | +3.8 % | 3938 -> 4090 | 4 = 4 |
| farmerC_b for Fosse (on farmerC) | 3634 -> 3330 | -8.4 % | 7172 -> 6564 | 4 = 4 |

Each model is still 3 meshes (body, eyes, mouth), 4 materials with the silhouette pass; no texture.

## Checks
- HEAD's `cast_poly.py` rebuilt through the bridge equals the shipped `nara.json` exactly; `worker.json` and `vesk.json`
  differ only in 7 / 46 normal components by 0.0001 (rounding). With the batch, nara, worker and nell still rebuild the same.
- polycheck: bones = the base look's and in the skeleton, 4 weights a vertex summing to 1, no bad index, feet as before;
  Vesk: eyes and mouth unchanged, no new colour.
- Blender `validate`: vesk 84 pass / 1 warn, worker_b 79 / 0, nara_b 64 / 1; 0 fails. The warnings are loose vertices
  (the cast's shared vertex lists; the game format is unindexed triangles, so they do not export).
- DRESS-1 (variants 1-6): nara_b and vesk leave no role at its base hex. worker_b leaves the same as the shipped worker:
  hair and shoes share #3a2a1a, and variant 3 turns the hair into the belt's hex (worker: 744 vertices, worker_b: 2484, the
  same false positive of the check).
- Looked at: lookdev turnarounds, faces, hands and the game 3/4 at 8.8 m; Blender front/side/back/3/4, neutral and
  coloured; the game (Citadel, chapter 1, the hero as each look, before and after): Follow/Medium, a dialogue two-shot,
  close-ups; 13 poses x 2 views of worker_b, nara_b and vesk (no detached part; nara_b's dress follows the legs in walk and
  run; the Esmers' doze feet lie apart as before, a rig pose).

## Tests (SwiftShader, the three files and the index in `assets/poly`, the code in place)
- solidnpc 54/54 PASS;
- chapter1 23/23 PASS (a first run failed to boot: my local server refused connections under load; with a larger
  backlog the rerun passed);
- cast-rounds 209/209 PASS;
- story-journeys 30/30 PASS;
- under-bar 15/15 PASS (walks to and talks with Harl, Tolli and Sala in the epilogue's underground);
- epilogue-home 12/12 PASS;
- sewers 32/32 PASS and sewers-ways 34/34 PASS (Fosse talked to before and after the valve). The known base failures
  (sewers' 3 well-house lift checks, sewers-ways' 2 out-of-door spots) did not occur on `db3707df` here, so there was no
  failure to compare against a clean run.

Evidence labels: **Automated runtime only** (SwiftShader). Nobody played it.

## Not verified
- The people in their own rooms, by eye: Sala, Tolli and Harl stand only in the epilogue's underground. under-bar reaches
  and talks to them there, but the pictures are of the hero wearing each model in Citadel, not of the crew in the core
  and the deep installation.
- No Vega 8 frame time (no draw call added; triangles above).
- The isles' and Zeelich's takers (Wenna, Mila, Ione, Fennick, Anko) were not looked at in their own places.

## Left
- Baldino's flat ears and headband are paper-thin (his own script, the named cast's turn).
- Harl shares keeper_b with four council guards (a uniform: left).
- worker x4 and nara x12+ are still the most shared looks; a second variant each would help.
- The worker_b goggles have no visible strap from the side.
