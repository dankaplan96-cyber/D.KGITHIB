# OREN-GUARDIAN: progress (persistent)

The user's task brief of 2.11.2026: Oren, the guardian of a lost world, as a second antagonist beside Vesk, built
into the expanded campaign. The full brief (sections 1–17) is in the session of 2.11.2026; its decisions are in
`EXPANSION_PLAN.md` ("The user's decisions (2.11.2026, later): OREN-GUARDIAN"). Spoilers: the whole file. Keep it
away from the user, who plays chapters 1–2 only.

## Standing decisions
- **Oren** is the guardian. The human former designer in `EXPANSION_PLAN.md` gets a new name; his water-story role stays.
- **Ballastra is Oren's world**: the flood was its catastrophe; part of its people sleep in shelters by the terraces;
  the unequal water allocation is the human layer of the same world. No second new planet.
- **Where:** `expansion/ballastra` only (or behind a disabled flag). The base game stays playable; its finale is not
  replaced while the new content is incomplete.
- **Rules kept:** Vesk keeps his own wrongs (no possession); Sendell is not secretly evil; planets are joined only by
  spaceship; FunFrock is dead; no Earth-style night; Esmer and Wannies; English player text, short turns; numbers and
  descriptions only from the originals; honest measurements (SwiftShader here, no fps claims); at most two agents.

- **Saves (the user, 2.11):** "Saves are not very critical; I always play a little, just to see chapter 1's mechanics
  and some of chapter 2." So: old saves must not crash the game (a clean fallback to a new game with a message is
  enough); no elaborate migration of mid-expansion saves. New saves made in the expansion must still save and load.

## Increments (the brief's §17)
| # | Increment | State | Branch / commit | Notes |
|---|---|---|---|---|
| 0 | Bring `expansion/ballastra` up to the base | **done** (2.11) | `exp-oren` `c9f1f2f` (merge of `ccr-adf00ea7-37ebl3` at `8c6c213`) | conflicts: `main.js` `migrateSave` (v5→v6 step, then SHAFT-CITADEL, then the unknown-key fallback), `tests/save-migration.mjs` (both suites kept; the SHAFT-CITADEL cases checked against format 6's positions). chapter1 23/23, chapter2 20/20, save-migration 33/33, stability 16/16, walkers 37/37 |
| A | The integration map | **done** (2.11) | `157e3a9` | `EXPANSION_PLAN.md` Revision R1 (R1.1–R1.17); `EXPANSION_WORLD_SPEC.md` W-9…W-12 and additions to W-6/7/8 |
| B | First encounter with Oren, with a genuine act of help | **done** (2.11) | `b4ba198` | 21/21 in `tests/oren-first.mjs`; bot floor 3.1 min (game time); after B: save-migration 33/33, chapter9 16/16, chapter10 26/26, magic-levels 26/26 (jetpack, camclear: the same one-line jump change, not rerun).  chapter 10 `throttle` = OG-1 "A Steady Hand": `story/throttle.js`, `text/oren.js`, `orenpresence.js`; flags `og_`; `tests/oren-first.mjs`. Real rooms, no stand-ins: FunFrock's valve room, the Water Office, the fortress shelter, the spaceports |
| C | The sleeping brother (WK-1) | to do | | needs W-9…W-12 (or labelled stand-ins) and W-1 |
| D | Regional consequences (OG-2, OG-5, OG-6) and the Vesk/Oren split | to do | | OG-2 needs only the W-8a fence gate (could be made by the story's decorate) |
| E | Underground discovery and preparation (SV-3 beat, UR-1, OG-7) | to do | | needs W-5, W-6 |
| F | Finale and aftermath (FIN-1, EP-BL) | to do | | the base finale stays until F works end to end |

## Standing decisions made in A and B (the cloud's; reversible, listed for review)
- Oren's five rules of reach: `EXPANSION_PLAN.md` R1.4. Every later Oren effect must cite one.
- The designer is **Halden**; OP-7's Wannie sister is **Mossa**; new Ballastra residents Jory, Garrow, Nan Odra, Sammo.
- Prefixes `og_`, `wk_`, `fin_`, `ep_bl*`.
- OG-1 is the whole of chapter 10 for now; when BR-1…3 are built, `Throttle.call()` moves to his arrival home after BR-3.
- Tests that jump "from the council to the network" now jump from `balances` (the last empty shell): chapter10,
  jetpack, camclear, magic-levels; chapter9 and save-migration expect chapter 10 after the vote.
- Questions for the user in R1.17 (the young one on Ballastra; the aftermath on Ballastra).

## Blockers
- Ballastra's places are the laptop's world orders (W-1 … W-12 in `EXPANSION_WORLD_SPEC.md`); W-1 waits on the user's
  approval of its pictures. C needs W-9…W-12 or labelled stand-ins.

## Next executable task
Increment D's first card, **OG-2 "The Fenced Square"** (chapter 11 `survey`, Citadel only, no new world needed beyond
a gate and its counter on chapter 8's fence, which the story's `decorate()` can make): Bram, Ume and Pico at the
pump, the hand-lever demonstration (rule 4), Oren's condition, the gate. Then BR-1…BR-4 once W-8a lands, which moves
OG-1's entry. C (WK-1) waits for W-9…W-12.
