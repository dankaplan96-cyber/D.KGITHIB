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
| 0b | Base merge for OG-2 | **done** (3.11) | `exp-og2` `544e3a8` (merge of `ccr-adf00ea7-37ebl3` at `32a9a1a`: BIGGER-1, WORLD-AUDIT, VOICE-1, LBA-DESERT-1, ANIM-AGGR-1, SPACEPORT-1/TRAVEL-1-CABIN/ZEELICH-1 requests) | no conflicts. On the merge: chapter1 23/23, chapter2 20/20, oren-first 21/21, save-migration 33/33, interior-life 94/94 |
| D | Regional consequences (OG-2, OG-5, OG-6) and the Vesk/Oren split | **OG-2 done** (3.11); OG-5, OG-6 to do | `exp-og2` `4037a8e`, `0d2d5a5` | on `0d2d5a5`'s tree: oren-square 29/29, oren-first 21/21, walkers 37/37, chapter10 26/26, save-migration 33/33 (one expectation moved: after chapter 10 comes 11, not the network). Draw cost at the square +23 main / +7 shadow calls (SwiftShader counts, no fps). chapter 11 `survey` = OG-2 "The Fenced Square": `story/survey.js`, `text/oren.js` (og2_), `orenpresence.js` (`buildGateLock`), flags `og2_`; `tests/oren-square.mjs`. Chapter 10 now ends at the shelter's thanks; Baldino's call ends chapter 11. Bot floor 4.7 min game time (card to the network); first-time estimate stays R1's 12 min (not timed) |
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

## Standing decisions made in D / OG-2 (the cloud's; reversible; details in R1.11 "As built")
- Chapter 10 ends at the fortress shelter's thanks (`og_done`); chapter 11 starts at the same door with Gilbert asking
  for his well. Baldino's call + the ship to Zeelich now end chapter 11 (later: SV-3's end). An increment-B save with
  `og_done` goes on to chapter 11 at the shelter.
- "The square's pump" = the project's draw-off beside the gate (Balance Works valve **with** a hand lever); the gate's
  lock = a Balance Works actuator **without** one (Vesk's central-command stock). Rule 4 is taught twice: a held lever
  beats him (Bram), a shock shakes his hold but moves nothing no hand drives (Pico's bell).
- Oren counts the three on the gate's footplate (rule 3) and hears agreements only at the lock: each resident steps
  up to it. Ume and Pico are walkers held off their rounds by the chapter (`walkers.js` `storyHold`, released by
  `citizens.js` when the chapter stops placing them).
- The lever hold is a short scene (no save while held); letting go before a stroke is the failure, retry at will.
- The lock, the draw-off, the board and the open gate show only in the expanded campaign from chapter 11 on.

## Blockers
- Ballastra's places are the laptop's world orders (W-1 … W-12 in `EXPANSION_WORLD_SPEC.md`); W-1 waits on the user's
  approval of its pictures. C needs W-9…W-12 or labelled stand-ins.

## Next executable task
**OG-6 "Coils and Consent"** (chapter 14 `network`, Zeelich: the mill, the depot pumps, the ferry — all existing
places): Brum's constituents and Tavo object to pulling the coils (shown: heat cells, grain, the timetable); Twinsen
and Baldino swap the mill's coil for a brass float and a dead coupling with Oku at the band; the street meeting agrees
"one station at a time, a person at each lever" (rule 4 again, now Baldino's: R1.14). Needs no laptop-built place;
it does need the network's NW-1 bands read first (`network.js`), and Baldino's dead coupling introduced by use there
before OG-5 relies on it. Accept: the mill station completes without the street's vote.
Then OG-5 (needs a W-8 shelter interior, or a labelled stand-in), BR-1…BR-4 once W-8a lands (moves OG-1's entry and
OG-2's "why he goes"), and C (WK-1) once W-9…W-12 land.
