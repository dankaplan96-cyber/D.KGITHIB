# MILLS: the Zeelich mills' brakes and their cost (REVIEW-TASKS-19-11 task 5, P77)

Baseline: `ccr-c1c2c4b9-dep6ed` (92911d5c, v103). The code calls chapter 3 (Zeelich) `chapter2.js`. Chapter 9 (the council) is `council.js`.

## The problem
Twinsen braked the three mills to bring the shield down, and nothing he could see changed. Oku's ch. 3 line after the brakes
even praised the stillness ("That is how it should sound"). In ch. 9 Oku said the east terraces had gone a week without
water, but the player had never seen that cost and could not have avoided it. Code issue: `chapter2.applyFlags` braked
the mills again in every chapter after the council (throttle, ballastra, shell, core, home). That undid Oku's errand.

## What changed
- **One immediate, visible consequence**: the plaza fountain (an existing prop, with Oku standing beside it) is on the
  mills' line, along with the pumps up to the east terraces. In `zeelich.js` the `R.fountain` water runs only while all
  three mills turn. A brake on any mill and the falling water drains into the bowl and the basin goes still. It reads
  the mills every frame, so every chapter shows it correctly with no story code.
- **Understanding the cost**: the first brake triggers a cut-away to the fountain (`fountainBeat`, a reveal beat; none
  with `?nocine` or in tests). Oku says: "There goes the fountain. It runs off my mills, and so do the pumps up to the
  east terraces." / "Get your shield open, then knock the brakes loose again. Until then the terraces carry their water by
  hand." His talk line repeats this while the mills stand braked.
- **When it is safe**: once the shield is down. The hero says "(The key holds the shield open now. Oku's mills can turn
  again.)". The objective gains "Optional: let the mills turn again (n/3)". From then on the braked brakes are ball
  targets, and a throw knocks one loose (`freeMill`, flag `c2_free_<mill>`). No star marks them, so the main route stays
  clean. Before the shield a braked brake is not a target.
- **Restored early (all three in ch. 3)**: the fountain runs again (a second cut-away) and Oku says "...You braked them
  and you let them go. I'll remember both." In ch. 9 he stamps the petition with no errand: "You braked my mills and let
  them go the same day. The east terraces carried buckets for one afternoon, not a week." / "One afternoon I can
  forgive. Give me that petition." Between ch. 3 and ch. 9 his street lines change (`zl_oku_back`). Wenna's braked lines
  stop once the mills are back.
- **Left stopped**: ch. 9 plays as before. The fountain is still dry, Oku's "a week without water" demand stays, and his
  errand frees the mills.
- **Partly released**: ch. 9's errand counts the released mills as free and asks only for the rest. No brake is
  released twice.
- **Journal**: ch. 3 adds `c2_j_dry` (the cost and when to let them go) and `c2_j_free` (let go). Ch. 9 adds `c9_j_oku`
  (a week, the errand, the stamp) or `c9_j_oku_r` (he remembered). The petition's flow, objective and stamps follow the
  path taken.
- **Past the council every mill turns** (the re-brake bug above is fixed: `heldNow`).

State card: `c2_mill_<id>` (braked, ch. 3) → from `c2_shield`, `c2_free_<id>` (let go, ch. 3, optional) → ch. 9:
`early()` = all three `c2_free_` → `c9_okuAsk` + `c9_oku` at once; otherwise `c9_okuAsk` → `c9_free_<id>` for the rest →
`c9_oku`. Old saves have no `c2_free_` flags, so they take the stopped path. Nothing on the main path needs the
optional release.

Files: `src/game/zeelich.js` (fountain), `src/game/story/chapter2.js`, `council.js`, `zeelife.js`;
`src/game/text/ch2.js`, `ch9.js`, `zeelife.js`, `voicemeta.js`, `he/ch2.js`, `he/ch9.js`, `he/zeelife.js`,
`src/game/he-text.js` (bundle); `tests/mills.mjs`. No new shipped files. `c2_oku_after` was removed (unused).

## Verified (automated runtime only; staged by the story's flags, brakes hit by real ball throws)
`GAME_URL=http://localhost:<port>/ node tests/mills.mjs` (19 checks):
- A (released early): the first throw stops the fountain and Oku's two lines play. The shield opens, the hero's line
  plays and the optional sub shows. One mill released → **save → Continue** with one free, two braked, fountain still,
  shield open. The rest released → the fountain runs, Oku's line plays, the journal shows `c2_j_dry`, `c2_j_free`, and
  no targets remain. In ch. 9 the mills turn, Oku stamps without the errand ("one afternoon"), the journal shows
  `c9_j_oku_r`, and **save → Continue** keeps the stamp.
- B (an older save, braked, no `c2_free_`): in ch. 9 the mills and fountain are still, Oku says "a week", the errand
  needs 3, throws free them, he stamps, the journal shows `c9_j_oku`.
- C (one released in ch. 3): ch. 9's errand asks for 2.
- `node tests/dialogue-check.mjs` passes (Hebrew 100 %). Captures for review: `captures/mills/M-01…03` (fountain
  running / still / back).

## What remains
- The cut-away framings were not seen in a live (non-test) run: tests run with beats off. They need a look in play.
- Not run: chapter2/chapter9/playthrough suites. They come with the full test at the end. `tests/chapter2.mjs` and
  `chapter9.mjs` assert flows this change keeps: the brakes before the shield, the stopped path.
- The fountain has no sound of its own, so the change is visual and spoken only.
