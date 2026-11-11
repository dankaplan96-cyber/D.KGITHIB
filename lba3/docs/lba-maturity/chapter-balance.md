# Chapter balance (wave 2, 7–8.11.2026)

The pack's chapter-balance task: are all chapters broadly comparable in active length and substance, with no trivial
chapter and no unfair spike? This file records what was measured, how the targets were set, what was changed, and what
is left. Labels as in `PROJECT_CONTRACT.md`.

**Evidence.** Every number here is **Automated runtime only**: the player-input playthrough bot (`tests/playthrough/`,
`tests/lib/seg.mjs`) on SwiftShader in headless Chromium, build `201869e0` (branch `ccr-c1c2c4b9-dep6ed`) plus this
wave's changes. No person has played any of it for this file. **No human first-play time exists for any chapter**:
every first-play minute below is an **estimate** from the formula in "Method", not a measurement. The bot knows every
solution, walks the shortest path and skips reading, so its time is a floor, not a player's time.

The same numbers in the pack's template columns: `chapter-balance.csv`. Pictures looked at (SwiftShader, not played):
the session's scratchpad `balance/shots/` (`obs-2-one-sun`, `obs-5-vent-discs`, `core-1-bleed`, `core-2-bled`); probes
used (`probe-depotchest2`, `probe-obs`, `probe-core`, `probe-dw`) were scratch scripts, not suites.

## Chapter count and main route

The game has **12 numbered chapters and an epilogue** (`src/game/story/index.js` ORDER/NUMBER; the player sees these
numbers). The opening film plays before chapter 1 and is not a chapter.

| # | Key (module) | Region | Bot segment(s) |
|---|---|---|---|
| 1 The Well | `well` (prologue.js) | Citadel, the well cave | 01, 02 |
| 2 The Joint Project | `project` (chapter1.js, depotwatch.js) | Citadel | 03, 04, 05 |
| 3 Zeelich | `zeelich` (chapter2.js) | Zeelich | 06 |
| 4 The Dig | `dig` | Desert Island | 07 |
| 5 Steam and Sand | `steam` | Desert Island | 08 |
| 6 The Pass | `pass` | Hamalayi | 09 |
| 7 The Observatory | `observatory` | Hamalayi | 10 |
| 8 Evacuation | `evacuation` | Citadel (changed) | 11 |
| 9 The Council | `council` | Zeelich upper district | 12 |
| 10 Baldino's Network | `network` | all regions | 13 |
| 11 The Shell | `shell` (chapter3.js) | the deep installation | 14 (to Sendell) |
| 12 The Core | `core` (chapter3.js ChapterCore) | the core | 14 (the core) |
| Epilogue | `home` | Citadel | 14 (end) |

Note on naming: the file `story/chapter1.js` and the `c1_` flags belong to the player's **chapter 2**, not chapter 1.
The depot's watch (P9, `story/depotwatch.js`) is present from chapter 1 (The Well) and is the obstacle of chapter 2's
depot valve.

## Method

**Scripted route (measured).** The 14 segments were chained through real saves (each segment's Save & quit is the next
one's Continue), new game to the end screen, with `STATS=<file>` (new: `tests/lib/stats.js`, loaded by `seg.mjs`; it
only watches). It adds up game time by state: free play (`play`), dialogue (`dialog`), scenes and films (`scene`),
transitions/loading fades (`trans`); metres walked in free play; dialogue lines and words shown; health lost; deaths
and clovers spent. Wall-clock time is not used (SwiftShader). Retries (game over → Retry) are counted, and their time is
in the totals. Bot stalls (the bot stuck on an NPC or a ledge; no player would be) were found in the traces and
subtracted where large (chapter 6: 223 s stuck behind Yorna on her round).

**First-play estimate (not measured).** Per chapter, main route only:
- active = 1.8 × (scripted free play − bot stalls) + 60 s per deduction puzzle + 30 s per fight + 90 s per scripted
  death or clover spent;
- reading = words ÷ 3.3 per second (about 200 words a minute) + 0.6 s per line.
The 1.8 factor stands for a new player walking rather than running, looking around and taking wrong turns; 60 s per
puzzle for working out a step the bot already knows. Neither factor is calibrated against a person. Films, scenes and
loading are reported apart and are not in the estimate.

**Target T.** The STORY_BIBLE plans 12 chapters in about 10 hours for a player "who talks to people and does some
optional things" (35–55 min a chapter); the user's older ~15-hour goal includes optional play. The measured main route
is far smaller than that: the estimate gives about 3.7 hours of mandatory play for chapters 1–12, and the side stories
(arsenal, EQUIP-2 tools, shops, purposes, sewers, asylum, the isles' homes, Kesh) are the rest. Forcing 50 minutes of
mandatory play per chapter would mean padding. So the provisional common target is **T = 20 min of estimated first-play
main route per core chapter** (about 40 % of the bible's per-chapter budget; the measured mean of chapters 1–11 is 20.4),
with the review band **15–25 min (0.75–1.25 T)**. The epilogue is aftermath and has no target. This is a design flag,
not a timer.

## Results before the changes (baseline)

Scripted route, game seconds (Automated runtime only; build 201869e0, 7.11.2026 22:28–23:49 UTC):

| Ch | free play s | walked m | dialogue s (bot) | films/scenes s | loading s | lines | words | health lost | deaths (Retry) | clovers spent | steps |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | 330 | 773 | 20 | 27 | 2 | 64 | 702 | 0 | 0 | 0 | 26 |
| 2 | 711 | 1428 | 23 | 35 | 9 | 72 | 1205 | 27 | 0 | 2 | 21 |
| 3 | 224 | 424 | 18 | 24 | 5 | 53 | 832 | 5 | 0 (1 ISO assist) | 0 | 13 |
| 4 | 249 | 544 | 18 | 16 | 1 | 53 | 902 | 13 | 1 | 0 | 15 |
| 5 | 258 | 557 | 10 | 11 | 5 | 33 | 499 | 4 | 0 | 0 | 20 |
| 6 | 455 (232 without the bot's stall) | 697 | 11 | 41 | 2 | 28 | 430 | 0 | 0 | 0 | 16 |
| 7 | 186 | 309 | 9 | 4 | 2 | 30 | 480 | 2 | 0 | 0 | 9 |
| 8 | 456 | 1086 | 11 | 7 | 7 | 33 | 631 | 10 | 0 | 0 | 12 |
| 9 | 181 | 379 | 18 | 14 | 7 | 55 | 1124 | 0 | 0 | 0 | 13 |
| 10 | 598 | 1261 | 31 | 7 | 10 | 66 | 1014 | 24 | 2 | 0 (2 ISO assists) | 20 |
| 11 | 253 | 188 | 7 | 0 | 2 | 18 | 230 | 9 | 0 | 0 | 12 |
| 12 | 50 | 51 | 8 | 4 | 1 | 18 | 260 | 4 | 0 | 0 | 3 |
| Ep. | 1 | 0 | 4 | 4 | 1 | 12 | 145 | 0 | 0 | 0 | 2 |

Chapter 1's route includes the optional overhearing and bay-rock steps (about 100 s). Chapter 2's segment 05 stopped
once on the first run (the bot stuck at (-34.5, -32.7) on the way home, an NPC in its path) and passed on the rerun from
the same save; the numbers are the rerun's. "Health lost" counts every point lost, healing aside.

First-play estimate (main route, **estimate**), baseline:

| Ch | puzzles | fights | unlocking talks | discoveries | est. active min | est. reading min | **est. total min** | vs T (band 15–25) |
|---|---|---|---|---|---|---|---|---|
| 1 | 4 | 1 | 6 | 3 | 13.7 | 4.2 | **17.8** | 0.89 in band |
| 2 | 5 | 1 | 7 | 2 | 29.8 | 6.8 | **36.6** | 1.83 HIGH |
| 3 | 4 | 2 | 3 | 2 | 11.7 | 4.7 | **16.5** | 0.82 in band |
| 4 | 5 | 1 | 4 | 2 | 14.5 | 5.1 | **19.6** | 0.98 in band |
| 5 | 5 | 1 | 5 | 2 | 13.2 | 2.9 | **16.1** | 0.80 in band |
| 6 | 4 | 1 | 4 | 1 | 11.5 | 2.5 | **13.9** | 0.70 low |
| 7 | 1 | 1 | 1 | 1 | 7.1 | 2.7 | **9.8** | 0.49 LOW |
| 8 | 4 | 1 | 6 | 1 | 18.2 | 3.5 | **21.7** | 1.08 in band |
| 9 | 2 | 0 | 6 | 1 | 7.4 | 6.2 | **13.7** | 0.69 low |
| 10 | 6 | 3 | 6 | 1 | 28.4 | 5.8 | **34.2** | 1.71 HIGH |
| 11 | 4 | 2 | 0 | 1 | 12.6 | 1.3 | **13.9** | 0.70 low |
| 12 | 2 | 1 | 1 | 1 | 4.0 | 1.5 | **5.5** | 0.28 LOW (extreme) |
| Ep. | 0 | 0 | 1 | 0 | 0 | 0.9 | 0.9 | aftermath |

## After the changes

The changed chapters' segments were rerun by input from the baseline's own saves (segment 10 from 09's save, 12 from
11's, 14 from 13's, 13 from 12's), Automated runtime only, 8.11.2026 00:24–01:07 UTC. Unchanged chapters keep the
baseline numbers.

| Ch | scripted free play s (before → after) | words | puzzles | est. total min (before → after) | vs T | Change |
|---|---|---|---|---|---|---|
| 7 | 186 → **222** | 480 → 543 | 1 → 3 | 9.8 → **13.2** | 0.49 → 0.66 low | the two suns; the seal's warm discs |
| 9 | 181 → **214** | 1124 → 1134 | 2 → 3 | 13.7 → **15.7** | 0.69 → 0.79 **in band** | the archivist's keys |
| 10 | 598 (second run 738) | 1014 → 1026 | 6 | 34.2 (unchanged) | 1.71 HIGH | Yorna's broth: arrived at the ridge with 12 health, not 4; still 2 bot deaths there |
| 12 | 50 → **64** | 260 → 313 | 2 → 3 | 5.5 → **7.2** | 0.28 → 0.36 **LOW** | the bleed valve (bot: 14 s, 4 health, then the coil in 17 s) |

Summary against the band (15–25 min, estimate): **in band** 1, 3, 4, 5, 8, 9; **just under** 6 (0.70), 7 (0.66), 11
(0.69); **long** 2 (1.83) and 10 (1.71), kept as exceptions with proposals; **short, unresolved** 12 (0.36). Chapters 11
and 12 together (the bible's final story, split in save format 5) come to about 21 minutes, but chapter 12 is a numbered
core chapter and is not excused by that.

## Rerun 9.11.2026 (the whole-story playthrough, Wave A item 2)

The chain 01–14 was played three times from a new game on the current build (`8a09c5c2` plus `PLAYTHROUGH-REPORT.md`'s
fixes; run 1 before them), Automated runtime only, same method and formula. Every run passed every segment. Run 3 is the
one in `chapter-balance.csv` (marked "9.11 run 3"). Free play s per run (1 · 2 · 3), then run 3's estimate:

| Ch | free play s | health lost | clovers | est. total min (run 3) | vs T | what moved since 8.11 |
|---|---|---|---|---|---|---|
| 1 | 373 · 390 · 362 | 0 | 0 | 19.5 | 0.98 in band | the cave's mites still free |
| 2 | 662 · 656 · 655 | 15 each | 1 each | 33.5 | 1.67 HIGH (kept) | the depot is no longer 27 health and both clovers |
| 3 | 323 · 333 · 259 | 10–13 | 0–1 | 17.5 | 0.87 in band | the depot fight still ends with an ISO assist (all runs) |
| 4 | 216 · 204 · 212 | 10–11 | 1 each | 18.5 | 0.92 in band | the gate guard in the storm takes a clover; no Retry |
| 5 | 256 · 263 · 263 | 3 | 0 | 16.2 | 0.81 in band | — |
| 6 | 466 · 457 · 236 | 0–1 | 0 | 14.0 | 0.70 just under | runs 1–2 had the bot's 4-minute circle at Yorna's winch (fixed in the bot); the mites now come during the winch trips |
| 7 | 222 each | 2 | 0 | 13.3 | 0.66 low | — |
| 8 | 401 · 349 · 350 | 4–9 | 0 | 18.5 | 0.93 in band | run 1 had a 45-s bot stall at Pippa's barriers; the fortress fight needed an ISO assist in runs 2–3 |
| 9 | 210 · 212 · 212 | 0 | 0 | 15.6 | 0.78 in band | — |
| 10 | 556 · 563 · 542 | 8–22 | 2 · 0 · 0 | 29.5 | 1.47 HIGH (kept) | no ridge deaths (Yorna's broth); the bore fight: ISO assist each run |
| 11 | 245 · 277 · 249 | 5–6 | 0 | 13.8 | 0.69 just under | — |
| 12 | 70 · 70 · 66 | 5 | 0 | 7.3 | 0.36 LOW | unchanged (the boss wave's) |
| Ep. | 1 | 0 | 0 | 0.9 | aftermath | — |

No Game Over happened in any of the three runs, so the Retry-with-full-life rule was not exercised by the chain.
The bot's menu idling (120 s of game time per menu, now fixed) was in the "menu" state and never in these numbers.

## Per chapter

Each table: scripted (Automated runtime only) and first-play (**estimate**) time, the band (15–25 min), what the
chapter asks of the player, what it gives back, the weakest part, the change (or why none), and the retest.

### Chapter 1 — The Well
| | |
|---|---|
| Time | scripted 330 s free play (230 s without the optional overhearing and bay rocks) · **est. 17.8 min** · in band |
| Activities | the ball from the cupboard; the dry well; Mira's refusal and Zoé's kettle proof (a deduction); the rusted lid kicked (Aggressive); Doran asleep, the harbour bell rung with the ball; Xil's rope; down the well; the cave's three crystals woken (ball); mites; Sendell |
| Optional | Tim and Lulu overheard (Discreet), the bay rocks (Athletic) and the warm stones (10 kashes); Funfrock's chest in the depot's guarded yard (8 kashes); the asylum; the sewer side trip |
| Challenge | the four behaviours each used once for a reason; the well's mites cost the bot nothing (0 health lost) |
| Payoff | the key, the rope, Sendell's first words |
| Weakest part | the mites are trivial; fair for the first chapter |
| Change | none |
| Depot economy (P9) | **Checked.** Funfrock's chest (8 kashes) now sits in the guarded yard. Probe `probe-depotchest2` (ISO start at the west gate, then input): Discreet along the west fence and the back fence, crouching whenever one of the watch could turn its eyes on him: **chest opened unseen and out again at 4 of 4 patrol phases** (0, 6, 12, 18 s; about 4.7 min of game time each, half of it crouched). A careless walk in is warned at once (the first visit only warns; nobody is hurt). Kashes on chapter 1 without the chest: 10 (warm stones, optional) + 5 (asylum cell) + crates; the cheapest goods are 4–6 (darts, penguin, potion, flask), Pippa's blowgun 15 from chapter 2. Nothing on the main path costs kashes. **Verdict: the economy still works; the chest is now an optional stealth reward, which suits chapter 1 (Discreet is taught there).** |

### Chapter 2 — The Joint Project
| | |
|---|---|
| Time | scripted 711 s, 1,428 m walked · **est. 36.6 min** · **HIGH (1.83 T)** |
| Activities | Zoé at home; the ferry and Vesk's task; the Water Office's pipe map; three bypass valves (the caged orchard: a lob over the cage; the depot: the guarded yard, sneak or fight; the Whispering Cliffs: the target, then the rising stones); Vesk's tour; Zoé's office (stealth, the evacuation plan); the confrontation at the beam pad; Arthur's radio; Doran; the project's ship |
| Challenge | the depot fight is **the early game's sharpest spike**: both runs of the bot (before and after a trial change) lost 26–27 health and **spent both clovers** there, pinned in the valve's corner by the guard and his dog; its point-blank throws were blocked by the armoured guard (trace: "hp 3→3 … unreachable from here") |
| Payoff | the water back, the plan, the ship; Vesk revealed |
| Weakest part | the length is crossings, not repetition: after the confrontation the route is beam pad → home → harbour → spaceport (about 390 m, 2 min scripted) |
| Change | **none kept.** A trial change (on the second catch only the guard and dog fight; the drones join when struck or with the guard down) did not move the bot's numbers (still 2 clovers) and made `depot-watch` 7a, 7b and 8a fail (the dog kept chasing at the gate, the valve never turned): reverted. |
| Exception / proposal | Chapter 2 is the bible's longest planned chapter (55 min) and the one the user plays; its parts are distinct. Proposed, not done: Doran waits at the spaceport after Arthur's radio (one crossing less); the depot spike to animation-combat (wave 4): point-blank throws against the armoured guard in a corner, and a short hint that the guard blocks from the front. The stealth route to the valve exists (`depot-watch` step 7 plays it by input on the base). |

### Chapter 3 — Zeelich
| | |
|---|---|
| Time | scripted 224 s · **est. 16.5 min** · in band (low side) |
| Activities | the plan confiscated; Baldino; the depot fight and locker (drones, guard, dog); Oku; the old mill climb (jumps) and its cog; three mills braked (ball); the key; Zoé's dials at the lighthouse (sun, wave, star: a riddle); the platform shield; Vesk flies home; the sealed shaft |
| Challenge | dense: 13 steps in under 4 scripted minutes; the depot fight needed the bot's ISO assist below 3 health (not input evidence) |
| Payoff | the shell revealed; a new world with many optional places (Nara's case, the oven, Marl's long call, the isles' homes) |
| Change | none |

### Chapter 4 — The Dig
| | |
|---|---|
| Time | scripted 249 s · **est. 19.6 min** · in band |
| Activities | Tarra; the wind-pump (Sani's clue, the jammed gear from the right side, the pipe joint); Hesk and the rope; the sand-yacht; Ilka; the notebook in a sandstorm (stealth); the keypad (the notebook's order); the warm seals of five (ball); the great carving |
| Challenge | one death (Retry) in the sandstorm, 13 health lost: the chapter's peak, fair (a stealth section with cover) |
| Change | none |

### Chapter 5 — Steam and Sand
| | |
|---|---|
| Time | scripted 258 s · **est. 16.1 min** · in band (low side) |
| Activities | Brosk's jar, water, the shovel (a short chain of errands); digging out FunFrock's condenser hall; the diagram and valves 1, 3, 4; the old trooper; the hangar, the glider, the hatch (ball); Dallan; the relief valve; out before the vent; Tarra; Hesk's glider |
| Challenge | low (4 health lost); the valve puzzle is the chapter's weight |
| Weakest part | the jar → water → shovel chain is a fetch; it is short (19 s scripted) and each step is a person |
| Change | none |

### Chapter 6 — The Pass
| | |
|---|---|
| Time | scripted 455 s, of which **223 s the bot stuck behind Yorna on her round** (trace `[195.7]`–`[418.4]`; no player would be): 232 s real · **est. 13.9 min** · just under the band (0.70) |
| Activities | the frozen tree felled over the gorge (ball); Lhar; Yorna; the heating station's fuse; Pim's kite (ball); heat on; the frozen mooring rope (the sword's first use); two winch trips; the ice mites; ride up |
| Challenge | **low: the ice mites cost the bot nothing** (killed in 6 s, 0 health lost) |
| Change | none this wave (close to the band; Tashi's heat flask and the frozen chest are optional there). Proposal to animation-combat: the mites could come up during a winch trip, not after it |

### Chapter 7 — The Observatory
| | |
|---|---|
| Time | before: scripted 186 s (111 s of it the walk up the ridge and back) · est. 9.8 min · **LOW (0.49 T)**. After: see "After the changes" |
| Activities before | the ridge; Sefa; four floor mirrors, three set right (the fourth a decoy no beam could reach); the telescope; the heavy drone (bot: 16 s, 2 health); the vent's seal turned with one press |
| Weakest part | the mirrors were the only puzzle; the seal was a button; the drone trivial |
| Change 1: the two suns | The crystal "caught the light of both suns" (the room's own comment, the star chart). The second sun's slit, past the crystal, has been frozen over for years: the **ball breaks the ice**, and the fourth mirror (moved from a dead spot onto the second beam's path) carries that beam to the crystal. One beam gives a faint glow and a line ("Half the light"); Sefa points at the frozen window when asked. New flag `c7_ice`. Files: `obsroom.js`, `story/observatory.js`, `text/ch7.js`. |
| Change 2: the seal's discs | The seal is "carved like the ones at the dig" (its own line). It now **turns only with its three warm discs woken by the ball**: five carved discs round the rim; the three warm ones steam once the dome's light has melted the cap (chapter 4's warm seals, applied anew); a cold one only rings. New flags `c7_disc0/2/3`, `c7_sealSeen`. Files: `hamalayi.js`, `story/observatory.js`, `text/ch7.js`. |
| Saves | a save with the crystal lit opens the slit and sets the fourth mirror; a save with the vent open wakes all three discs; mid-chapter saves ask for the new steps |
| Retest | `chapter7` PASS with the new checks (faint glow, Sefa's hint, the ice by a real throw, the fourth mirror, the seal refused, a cold disc rings, three warm discs by real throws); segment 10 by input; pictures `obs-2-one-sun.png`, `obs-5-vent-discs.png` looked at (the discs' steam was too faint in the first picture: thickened) |

### Chapter 8 — Evacuation
| | |
|---|---|
| Time | scripted 456 s, 1,086 m · **est. 21.7 min** · in band |
| Activities | home; Gilbert's tunnels; the fortress lever (a fight: 10 health); the depot bunker's wheel (ball); Mira; Pippa; Zoé's run to three farms and the lighthouse; the relay; the control room; the ship |
| Change | none |

### Chapter 9 — The Council
| | |
|---|---|
| Time | before: scripted 181 s, 1,124 words (the most reading of any chapter) · est. 13.7 min · low (0.69). After: see "After the changes" |
| Activities | street folk; Baldino's petition; Nara's stamp; Oku's stamp (free the three mills he braked in chapter 3: ball); the clerk; the hearing; the archive in a borrowed coat; the BORE cabinet; the vote |
| Challenge | **no damage at all**; the archive was one timed walk to a labelled cabinet |
| Change: the archivist's keys | The BORE cabinet (the only one that matters) is **locked**; its key is on the archivist's ring on his desk, by his round's near side. A second stealth step: take the ring while his back is turned (the coat slows his noticing), then the cabinet. New flags `c9_key`, `c9_locked`; the objective adds "The BORE cabinet's key (the archivist's desk)" once the lock is found. Files: `upper.js`, `story/council.js`, `text/ch9.js`. |
| Retest | `chapter9` PASS (locked without the key, the key taken, then the plans); segment 12 by input: the ring at the first try after waiting 43 s for his turn, the plans at the first try |

### Chapter 10 — Baldino's Network
| | |
|---|---|
| Time | scripted 598 s, 1,261 m · **est. 34.2 min** · **HIGH (1.71 T)** (a second run: 738 s, the extra in the ridge's retries) |
| Activities | five relays across all regions (the old mill again, Mira's valves, Zoé's dials, Ilka's bore with drones, Sefa's dome); four flights (films) |
| Challenge | the late peak: 24 health lost; **two deaths (Retry) on the ridge to the dome** in both runs (the crystal crawler's slams while the bot stood against it); ISO assists at the bore's drone and sentry (not input evidence) |
| Weakest part | callbacks repeat earlier mechanics on purpose (the old mill's climb is chapter 3's, 135 s scripted; the dials are chapter 3's) |
| Change: a recovery point | He comes to the Hamalayi by glider straight from the bore's fight, and a Retry restores only what the save holds (saves keep at least 4 health). **Yorna's broth**: talking to her while hurt puts his life back (as Ker'aooc and Bersimon do in their places). Files: `story/network.js`, `text/ch10.js`. Bot: reached the ridge with 12 health instead of 4; it still died twice (its melee weakness), so the deaths are not counted as fixed. |
| Exception / proposal | Long by design (the bible's "building the answer from everything learned", 55 min). Proposed, not done: Oku points to the hop-pack (given in this chapter) as the shortcut up the old mill, so the second climb is a choice. |

### Chapter 11 — The Shell
| | |
|---|---|
| Time | scripted 253 s · **est. 13.9 min** · just under the band (0.70) |
| Activities | the cooling diagram and valves A, C (B drains), the ball switch for the ladder, the catwalk; the crystal galleries' three pillars (ball; 128 s for the bot) and the stepping stones; the supply crates; Sendell |
| Change | none (close to the band; optional finds there: the fork's crystal wheel, the lantern's hollow boulder) |

### Chapter 12 — The Core
| | |
|---|---|
| Time | before: scripted **50 s** · est. **5.5 min** · **LOW, extreme (0.28 T)**. After: see "After the changes" |
| Activities before | Vesk's scene; the guardian; three pylons by bank shots from their plates while it is stunned; Vesk's overload; three hits on his coil; the choice; shield mode |
| Weakest part | the second phase was the first again (stun, shoot); the allies' part in the overload was only heard |
| Change: the bleed valve | The overload pulls on every station, and Ilka already said by radio that she and Dallan open the desert vent to bleed it. Now the surge needs a way out on his side too: **the bore's bleed valve on the deck ring** (a new valve stand, "BLEED · TO THE VENTS", clear of the bays, the console and the entrance), turned with E while the overloaded guardian hunts him (stun it first, as with the plates). Only then does Vesk raise his coil ("Then I'll take what's left myself!"). New flag `c3_bleed` (kept over a reload, so a reload in the coil phase comes back to the coil, as `resume` D16 expects). A nudge after 30 s stuck. Files: `underground.js`, `story/chapter3.js`, `text/ch3.js`. |
| Retest | `chapter3` PASS (no coil before the valve, the valve by its prompt, then the coil); `resume`; segment 14 by input; picture `core-1-bleed.png` looked at |

### Epilogue — Home
Aftermath, not a core chapter: dinner, the end card, Keep Exploring (everyone home, open places). 1 s of free play,
145 words. No target.

## The 15-hour ledger (the main route; the campaign waves of 11.11)

The user's goal is about 15 hours to win **with optional play**; the main route is only part of it and is never claimed in
hours unmeasured. Per core chapter: the bot's latest measured free play (Automated runtime only), the first-play
**estimate** (this file's formula; never a measurement), and what the minutes added by the campaign waves are spent on.

| Ch | bot s (latest) | est. first play (min) | added by the campaign waves (CAMPAIGN-STRENGTHEN.md) | measured |
|---|---|---|---|---|
| 1 | 402 | about 22.8 | the dry tap, Arthur's cup, the pipes followed outside, the warm pool, the growth and the pump's cycle (wave 1) | 11.11 chain |
| 2 | 828 | about 42.0 | the dry lane, the pump room: the diagram, three pipes by hand, the bypass (a wrong cock and its correction), the strip, the plate, the street after (wave 1) | 11.11 chain |
| 3 | 332 | about 24.4 | Brel's directions, the cistern lift by hand, the ride with the cart, the cistern, Irsa's bench (wave 1) | 11.11 chain |
| 4 | 291 | about 21.8 | the bore test at the post's stand: taken for Dallan's new hand, the cutoff on the red and the kicks after the stop, the run again (a cut too soon shows nothing), the carbon (wave 2: +32 bot s, +3.3 min) | 11.11, segment 07 |
| 5 | 277 | about 19.3 | Vesk's heat line thrown to Kesh's pump (seen there), the log sent with one trace read against the carbon, put to Dallan (wave 2: +31 bot s, +3.1 min) | 11.11, segment 08 |
| 6 | 236 | 14.0 | (wave 3) | 9.11 run 3 |
| 7 | 222 | 13.3 | (wave 3) | 9.11 run 3 |
| 8 | 350 | 18.5 | (wave 4) | 9.11 run 3 |
| 9 | 212 | 15.6 | (wave 5) | 9.11 run 3 |
| 10 | 542 | 29.5 | (wave 6) | 9.11 run 3 |
| 11 | 249 | 13.8 | (wave 7) | 9.11 run 3 |
| 12 | 66 | 7.3 | (wave 7) | 9.11 run 3 |
| Ep. | 1 | 0.9 | (wave 8) | 9.11 run 3 |

The estimates add up to about **243 minutes (about 4 hours) of main route** — an estimate. The rest of the 15 hours is
meant to come from the later waves' steps, the optional content and the expansion (WORKPLAN-2026-11-09.md); none of it is
claimed until measured, and a person's own play is the real measure.

## Difficulty curve (scripted, Automated runtime only)

Health lost on the main route by chapter: 0 · 27 · 5 · 13 · 4 · 0 · 2 · 10 · 0 · 24 · 9 · 4 (after: 7 and 12 change, see
above). Deaths (Retry): chapter 4 (one, the sandstorm), chapter 10 (two, the ridge to the dome). Clovers spent: chapter 2
(both, the depot). The curve is uneven: chapter 2's depot is harder than anything until chapter 10, and chapters 6, 7
and 9 asked almost nothing. After this wave chapters 7 and 9 ask for more thought, not more health. The bot cannot
dodge melee, so its deaths overstate fights against slammers and biters (the crawler, the guard dog); its clean runs
understate puzzles (it knows every answer).

## Padding found

- Bot stalls, not game padding: chapter 6 (223 s behind Yorna on her round), chapter 2's first run (stuck on an NPC on
  the way home; passed on the rerun), chapter 1's bay rocks (25 s getting down).
- Repeated crossings: chapter 2's end (beam pad → home → harbour → spaceport) and chapter 8 (1,086 m) are story stops,
  each with a person; proposal for chapter 2 above.
- Repeated mechanics: the Zeelich mills are braked (3), freed (9) and braked again (10); the old mill is climbed in 3 and
  10. Each has a story reason; chapter 10's climb has the hop-pack as a shortcut.
- No forced waits found. Nothing here was made longer by waiting or slower movement.

## Left (for the coordinator)

- **Chapter 12 is still the shortest core chapter** (see the after table): the climax is one arena. A further beat needs
  the boss itself (animation-combat, wave 4): e.g. the guardian's overload phase changing how it is stunned. Not done
  here: the fight's tuning is that wave's.
- **Chapters 2 and 10 are long (≈1.7–1.8 T)**: kept as exceptions with proposals (chapter 2: Doran at the spaceport;
  chapter 10: Oku pointing to the hop-pack). The user plays chapter 2; any cut there wants the user's word.
- **Chapter 2's depot spike**: the armoured guard blocks point-blank throws in the valve's corner (animation-combat).
- **Chapters 6 and 11** sit just under the band (0.70): their fights are light (chapter 6's mites cost nothing).
  COMBAT-2 (9.11): the ice mites now have a frost slide and skitter from far throws (a pattern, not more health); the
  fights the bot needed ISO assists for were measured by source and fixed where unfair (the Zeelich depot's drones shot
  through the fence; no recovery before the bore: Ilka's canteen; the depot's drones now take two hits) — docs/COMBAT.md
  "Fair fights". By the new bot: chapter 8 fortress 0 health lost, chapter 10 bore 2–9 and ridge 2 (was 24 and both
  clovers), no ISO assist; chapter 6 mites 0–2 (2–3 slides); chapter 3 depot 9–10 lost every run, by input to the end
  in 2 of 8 (the rest stop at the segment's 2-health assist). Free-play times were not re-measured.
- **Retry keeps the save's health** (at least 4): after a death the player can restart weak. A rule for the whole game
  (e.g. Retry restores full life, as LBA2's clover/life restart does) is a design decision for the coordinator.
- **No human first-play timing exists.** The estimates' factors (1.8 × navigation, 60 s a puzzle, 200 words a minute) are
  uncalibrated. When the user plays chapters 1–2, their times would calibrate the formula.
- The playthrough bot (`tests/lib/player.js`) now handles the bleed valve and stands in front of the console for the coil;
  `tests/lib/stats.js` + `STATS=` in `seg.mjs` record the numbers above for any rerun.

## How to rerun

From `lba3/` in a snapshot served on a free port (`python3 -m http.server <port> --bind 127.0.0.1`):
`BOOT_TIMEOUT=900000 GAME_URL=http://localhost:<port>/ STATS=st-NN.json KEEP=save-NN.json LOAD=save-(NN-1).json node tests/lib/seg.mjs tests/playthrough/NN-*.mjs`
for each segment in order (no LOAD for 01). Each segment prints `stats:` per step and `stats total:`; the JSON holds the
same. Chained wall time on the shared SwiftShader machine: about 80 minutes for 01–14.

## The user's decisions (8.11.2026)
- **Long chapters stay long** ("don't shorten"): chapters 2 and 10 keep their length; no cuts proposed further.
- **Retry** after Game Over goes back to the last autosave **with full health** (main.js `RETRY_KEY`; tests/crosssystem.mjs
  checks hp === maxHp). Yorna's broth in chapter 10 stays as a story beat.
