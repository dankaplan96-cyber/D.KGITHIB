# LBA3-RUN — starting record (23.11.2026)

The user's request (23.11): "Read LBA3-RUN.md and execute it on the current game. Start with the existing opening
cinematic. Run the ten project agents in the specified pairs, integrate and test each pair's work, then continue to
the next pair. Finish with separate player-maturity and release-readiness verdicts for the same build. Do not publish."
The run's text: `docs/LBA3-RUN.md`; the ten agents: `.claude/agents/lba3-{opening,story,dialogue,world,controls,sound,
performance,progression,maturity,release}.md` (installed 23.11 from the user's LBA3_Final_Polish_Agents.zip).

## Starting revision
- Branch `ccr-c1c2c4b9-dep6ed` at **41e388291bb3151693e592e1424fb8dc3930161b** (the published artifact is v148,
  build stamp commit `b283a7de`'s parent line; artifact version 1795409254-77a7).
- **No publishing during this run** (the user). Changes are committed to the branch for review.

## Build, platform, languages, chapters (detected from the code, not old reports)
- A three.js browser game (WebGL2), played as a claude.ai artifact; an Electron desktop build existed (0.49.0) — the
  user's end goal is an installable exe (NEXT-SESSION). No package step runs in this session unless the release agent
  builds one locally.
- Languages: English (source) and Hebrew (`src/game/text/he/`, bundled to `src/game/he-text.js`; only text RTL).
- Chapters (`src/game/story/index.js` ORDER): well (prologue), project, zeelich, dig, steam, pass, observatory,
  evacuation, council, throttle, ballastra, balances, survey, network, shell, core, home (epilogue). The base campaign
  omits the expansion keys (ballastra, balances, survey: EXP_KEYS); old saves use OLD_ORDER.
- Save format 6 (`lba3_save_v1`), slots (SAVE-SLOTS).

## Baseline tests
- FULL-TEST-22-11.md (v128, partial) and the full test now finishing on v147 (FULL-TEST-23-11.md, in progress at the
  run's start: 111 of the first 123 runs PASS; two regressions from v142/v147 found and fixed in its branch; the
  campaign chain still running). KNOWN-FAILING.md lists the known items.
- All results here: **Automated runtime only (SwiftShader)** — headless Chromium in the cloud; no GPU numbers.

## Protected user changes (do not undo; ask the user before touching)
- P100 the camera's default distance **Far**; P101/P102 frame pacing on whole refreshes (PACE-ALL).
- P103/P105/P107 Citadel: the raised square, level streets, the west promenade's sea wall and 20-step stair, the
  raised south lawns, the north cross streets, the pale house walls — kept by the user one by one; the **east shore
  reverted** to its natural coves (the user prefers natural, asymmetric shores); **the harbour is not moved**; the
  walls' look = **c, the fort's stone**; C66's four fixes kept.
- P106 Twinsen's hair = **the spline lock with its brass tie** (default; ?look=old the balls); the head shape approved
  12.11; Zoé as she is.
- P82 JOINTS-BLENDER 8 (all four) merged by the user's pick; the Sphero's ball knees kept (LBA1).
- P92 Hebrew action prompts are infinitives; P54/P68 only the text is RTL.
- P97/P98: the local desktop agent's performance orders are paused (order 66 non-performance only); no test round per
  version — targeted tests while working, one full test at the end.
- P107 (standing): visible world/character changes are shown to the user before they ship; this run stages them on the
  branch and lists them in FINAL.md for the user's picks.
- The user's machines: GTX 1050 desktop (local agent), a UHD 620 laptop (59.9 Hz), the work computer (Intel UHD, 100 Hz).
  No hardware result is claimed from the cloud.

## Waves (at most two agents active)
1. lba3-opening + lba3-story
2. lba3-dialogue + lba3-world
3. lba3-controls + lba3-sound
4. lba3-performance + lba3-progression
5. lba3-maturity + lba3-release
Checkpoint after each wave in `docs/lba3-audit/CHECKPOINTS.md`; final report `docs/lba3-audit/FINAL.md`.
