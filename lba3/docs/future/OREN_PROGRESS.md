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
| 0c | Base merge for OG-6 | **done** (3.11) | `exp-og6` `90090b0` (merge of `ccr-adf00ea7-37ebl3` at `16247cb`: SHOPS-1, SPACEPORT-1 walk-in terminals, TRAVEL-1 cabin, ZEELICH-1 sky/Wannie requests, voices) | one conflict, `story/index.js` imports (kept `ChapterBase` and `Shops`). On the merge: chapter1 23/23, oren-first 21/21, oren-square 29/29, save-migration 33/33 |
| D2 | OG-6 "Coils and Consent" | **done** (3.11) | `exp-og6` `8d0a5b8` | on `8d0a5b8`'s tree: oren-coils 33/33, chapter10 26/26 (now the base campaign), oren-square 29/29, oren-first 21/21, save-migration 33/33. Chapter 14 `network`'s mill station in the expanded campaign: `story/coils.js` (owned by `network.js` as `og6`), `text/oren.js` (og6_), flags `og6_`; `tests/oren-coils.mjs`. Draw cost at the mill +13 main / +2 shadow calls (SwiftShader counts, no fps). Bot floor (game time): the mill 5.1 min from the workshop door, 7.0 min with the street and the meeting; R1.11's 15 min stays the first-time estimate (not timed) |
| 0d | Base merge for NW-1 | **done** (3.11) | `exp-nw1` `7f7cb9e` (merge of `ccr-adf00ea7-37ebl3` at `731a70d`: WC-1 story journeys, C-4 locked-door lines, EQUIP-2 concept doc) | no conflicts. On the merge: chapter1 23/23, oren-first 21/21, oren-square 29/29, oren-coils 33/33, save-migration 33/33, story-journeys 19/19 |
| D3 | NW-1 "Bands" (the other four stations) and the stale tests | **done** (3.11) | `exp-nw1` `f0aa59d` (tests), `80a7a2d` (NW-1), `b82a834` (Oren's voice) | verdicts below ("Verdicts, NW-1"). Chapter 14's valve room, lighthouse, bore and dome in the expanded campaign: `story/bands.js` (owned by `network.js` as `nw1`), `text/bands.js`, flags `c10_lit_/c10_bandAt_/c10_band_/c10_shift_<s>`, `vm_3`; `tests/oren-bands.mjs`; playthrough `12b-throttle`, `12c-survey`, `13-network` (expanded). Bot floor (game time, relay on → station done, every line read at once): light 36 s, valves 33 s, dome 28 s, bore 17 s, 1.9 min for the four; the card's +10 min stays the first-time estimate (not timed) |
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

## Standing decisions made in OG-6 (the cloud's; reversible; details in R1.11 OG-6 "As built")
- **Oren on Zeelich is second-hand.** No part on Zeelich is joined by metal to the bore (planets: spaceship only), so he
  cannot hear, count or speak there. Zeelich's coils obey Vesk's central command (the project's channel), whose setting
  comes from the bore's governors Oren holds on the strokes (rules 3-4): every coil grips on the drill's beat. The
  "LOCAL SHUT-OFF · CENTRAL CONSENT" wheel is Vesk's design; it refuses because the centre is held. OG-6 has no Oren lines.
- **"The ferry" is the Esmer shuttle pad's mooring clamp** (no sky-ferry runs from Zeelich since PLANET-1).
- **Dead coupling** (oak and leather) is introduced by use at the mill: it turns a shaft or joins a pipe and carries
  nothing else, "not a signal, not even warmth" (OG-5 relies on both). **Baldino's brass float** comes off his workshop
  hoist; it feels only the shaft, can't guess the wind: somebody sets its band. The mill's band (CALM/BREEZE/GALE, Oku
  reads the sails, one wind change) is NW-1's mill band, played; NW-1 should treat `og6_band >= 2` as done.
- **The relay waits for the swap** in the expanded campaign (Baldino's relay runs on the mill's wind). The street's vote
  is optional; only "one station at a time, a person at each lever" is agreed; names: mill Oku, pumps Pelleck, shuttle
  clamp Tavo (FIN-1's roll call can use them). The pumps and the clamp keep their coils.
- `story/coils.js` is a helper the network owns (`net.og6`), not a chapter; every hook is inert on `exp_base`.
- `tests/chapter10.mjs` now plays the base campaign (`exp_base`): its purpose is the base network; the expanded mill
  station is `tests/oren-coils.mjs`.
- ~~Known, not fixed here: `tests/zeelich-life.mjs` and playthrough segment 13 still go from the council straight to
  the network~~ Fixed in NW-1 (below).

## Standing decisions made in NW-1 (the cloud's; reversible; details in `EXPANSION_PLAN.md` §4.4 NW-1 "As built")
- **No Tessa yet**: Baldino's briefing carries the floats ("every relay carries one of my brass floats now… somebody at
  each station has to set its band"). Tessa's "Your relays shout. Mine listen." waits for N6.
- **`vm_3`'s line** names what the player has seen ("The council's order has sat on Vesk's desk for days. His drill
  hasn't missed a stroke, so we're back to my wire."), not BR-3's unbuilt throttles; it returns to the card's line with BR.
- **Bands** LOW · MID · HIGH on the four relays' floats (the mill keeps CALM · BREEZE · GALE); Baldino's preset wrong;
  "set too low" → higher, "set too high" → lower; one change of conditions per station: Oren trims the valve room
  relay's share through the inlet governor on a stroke (R1.4 rules 2–4; he speaks once, Mira hears him), Zoé decides the
  fog call (haze, no night), the bore's vent breathes out hard once, a cloud over the dome's peak. Each friend takes the
  job (Mira, Arthur with Zoé's leave, Ilka, Pim). Baldino learns on the radio that Oren rations the mains.
- **A wrong band is heard by a neighbour**: the first wrong reading at a station brings one radio line from the
  nearest station already on the line, once a station (the mill too, `coils.js read()`).
- **Each station's own task is unchanged**; the band follows it (`c10_lit_<s>`), the mill counted at `og6_band >= 2`.
  The bore's fight ends at its band. "Station ready" (Arthur) moves after the lighthouse band.
- **Reach**: floats hang on the relays (no new collider; B-1 untouched). The people-aware reach check of every band spot
  is `tests/oren-bands.mjs` (chapter10 plays the base campaign and keeps B-1's dial checks).
- **Tests**: `tests/zeelich-life.mjs` plays the base campaign's network (`exp_base`, as chapter10: its purpose is the
  base street). The playthrough chain plays the expanded campaign, as a new game does: segment 12 ends at chapter 10
  "Borrowed Time", new segments `12b-throttle` (OG-1) and `12c-survey` (OG-2), and `13-network` plays OG-6's mill
  steps and every NW-1 band by input (no story flags set). Run order: … 12 → 12b → 12c → 13 → 14.
- **Oren's voice** (`engine/voice.js` VOICES `oren`): spirit race, 98 Hz (his bowl tone), level and slow, no vibrato.
  Another session is restyling `voice.js` (VOICE-STYLE); the one-line entry may need a trivial merge.

## Blockers
- Ballastra's places are the laptop's world orders (W-1 … W-12 in `EXPANSION_WORLD_SPEC.md`); W-1 waits on the user's
  approval of its pictures. C needs W-9…W-12 or labelled stand-ins.

## Verdicts, NW-1 (on `80a7a2d`'s tree, voices on `b82a834`'s; served from /dev/shm snapshots; SwiftShader, no fps)
| Test | Verdict | Notes |
|---|---|---|
| `tests/oren-bands.mjs` (new) | **25/25** | every band by input with the station's people in place; a failure and retry at each; Save → Continue mid-task (lamp room, after the haze) and after (valve room); a band saved right is read on arrival (bore); an older save's station kept; the base campaign shows none of it. Valve room draws with the float shown / hidden: 81+12 vs 78+14 (main+shadow; +3 main, the shadow pass varies by a call or two) |
| playthrough `12b-throttle` → `12c-survey` → `13-network` → `14-shell` | **pass each** (12b 205 s, 12c 217 s, 13 723 s, 14 137 s wall) | chained by their kept saves from an ISO start (a new game set by flags to the vote, then `nextChapter()`: `mk-ch10`); no segment sets story flags; 13: 0 deaths, the bore fight's declared ISO assist once (bot at 2 HP, as in GATE); 14 from 13's save reaches its end |
| chapter10 (base campaign) | 26/26 | |
| oren-coils | 33/33 | |
| oren-square | 29/29 | |
| oren-first | 21/21 | |
| save-migration | 33/33 | |
| voices | 24/24 after `b82a834` (Oren's VOICES entry); 23/24 before: "every named speaker" missing `oren` since OG-1 | |
| zeelich-life | **37/38**: its network step (now `exp_base`) passes; one check fails in **chapter 9** ("the street argues about the council": no line from Pelleck, Snuff or Grumm after Nara's stamp) | **pre-existing**: the same 37/38 on `eaa9a7b` (the branch before this task) with this test file; a short probe of the same talks on `eaa9a7b` gets all three lines, so it is the test's route (state left by its earlier chapters), not NW-1. Not fixed here |
| merge `7f7cb9e` | chapter1 23/23, oren-first 21/21, oren-square 29/29, oren-coils 33/33, save-migration 33/33, story-journeys 19/19 | |

## Next executable task
NW-1 is done. Every remaining OREN-GUARDIAN card still waits on a laptop-built place: OG-5 (a W-8 shelter interior),
OG-3 / WK-1 / EP-BL (W-1, W-9…W-12), BR-1…BR-4 (W-8a). The next task that needs no new place is **NW-2 "Local
Override"** (`network.js`: at the lighthouse station Baldino on the radio proposes a master key on the project's code
line; Zoé refuses it, every station keeps the right to refuse a central command; she relays Vesk's trial note and
standing order to the council over the lighthouse link (Amaru: "Then it wasn't a mistake. It was a decision."); the roll
call at the station's bore with Arthur's call signs and the say-back, each friend at the band they keep, before the code
box opens the blast doors). Open points for it: the trial note and the standing order are N4/BR-4 evidence (documents
only): NW-2 needs a stand-in source the player has seen (the SUPPLIERS receipt of ch. 9, or a project sheet found at a
station) or waits for BR-4; BR-3's call signs do not exist yet (the roll call can introduce them, Arthur's idea). If the
laptop's W-8 shelter interior lands first, OG-5 goes first (Baldino's dead coupling and its limits were said in OG-6).
