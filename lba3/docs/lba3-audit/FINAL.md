# LBA3-RUN: final report (24.11)

Both final reviewers judged the same frozen candidate.

## Build
- Frozen candidate: `1bc16b5e8db3114d7729e912b8b7f6f507278d57` (branch ccr-c1c2c4b9-dep6ed). Later commits on the branch touch only docs.
- Packaged (lba3-release): Windows zip sha256 `7e5ece4532c030f93760398953c4010b77fe429d050d53ecc2262d035db6b57b`; `app.asar` sha256 `790cb26e87659fb7824383197002065dfbe0e4cf77f78b2134af5f8ec694c71c`. It was byte-identical across three Windows builds and the Linux build. The exe is unsigned. No NSIS installer: it needs wine, which is not available here.
- Not published. The last artifact publish is v148, which predates every change in this run.
- All evidence is automated runtime only (headless Chromium / Electron on SwiftShader). Nobody played, and there is no real GPU.

## Chapter coverage
| Range | Evidence |
|---|---|
| Opening (notebook cut, the default) | opening.md; opening 48/48 notebook, 43/43 classic |
| Base campaign, new game → ch 11 | Continuous chain 01→12b, 13/13 PASS, with Save & quit / Continue between segments (progression.md) |
| Base ch 13 → 14 → 15 (credits, free play) | 3/3 PASS |
| Expanded ch 10–13 | Staged saves only (second-shift J, exp-balances 37/37); not one continuous run |
| Expanded → credits | 3/3 PASS from a staged save |
| The Second Shift by input | Kell's lunch (ch 3), the shutter (ch 7), Brum (ch 9) in the chain. Chair → Tessa (ch 13) in second-shift J (staged) |
| Saves | save-migration 54/54 on the candidate (format 5 → 6 and the five END-RESUME cases) |

## Reports
- Story: story.md
- Opening: opening.md (preview: `?opening=notebook` is now the default; `?opening=classic` gives the old film)
- Dialogue: dialogue.md
- World: world.md
- Controls: controls.md
- Sound: sound.md
- Performance: performance.md
- Progression: progression.md
- Release: release.md
- Maturity: maturity.md (contact sheets in captures/maturity/)
- Checkpoints: CHECKPOINTS.md

## Faults this run found and fixed (all game-wide)
- **Story:** four fixes.
- **Dialogue:** 13 lines.
- **World:**
  - P113 door-level terraces.
  - P112 straight kerbed lawn edges (awaiting the user's pick).
- **Controls:**
  - P115 goal-first interact pick.
  - A 0.45 s key lock after a talk.
  - The ball aim flipping between targets.
- **Sound:**
  - A resume click.
  - Combat music under the pause.
  - Eight characters' voices.
- **Performance:** ARM-COST (character set-up spikes, up to 54 → 3 ms).
- **Progression:**
  - ARM-NAN (critical: the arm could go NaN and block every ball puzzle).
  - GOAL-DRESS (chapter 4's desk could not be searched).
  - END-RESUME (saves between a chapter's end and the next chapter's start had no way on).

## Remaining issues
- **D-1 (the owner):** franchise names and branding with no permission evidence.
- **D-2 (the owner, then the coordinator):** LBA1/LBA2 layout data in `assets/lba1`, `assets/lba2/islands` and `desert-layout.js`, against the title disclaimer.
- **P-1 (the user on Windows):** installer build, install, run and uninstall. The commands are in release.md §7.
- **Performance:** measured on 27a0f24f, not on the candidate. No real-GPU numbers. The P112 shader's GPU cost is untested.
- **Release findings:**
  - PK-1: the version is still 0.49.0.
  - PK-2: the GitHub account and repo name are in `app-update.yml`.
  - PK-3: DevTools open in the installed build.
  - PK-4: DESKTOP.md's Linux note is wrong.
  - D-3: ASSET_MANIFEST is out of date, and the soundfont licence is not recorded.
- **Not reached by continuous play:** expanded chapters 11–13.
- **The user's picks:** see docs/lba-maturity/MORNING-24-11.he.md.

## Verdicts (separate, same build)
- **Player maturity:** **NEEDS POLISH.** The adventure is complete. The bot played every chapter from New Game to the end card and into free play: the chain 16/16, with chapter 13 started from a staged save; exp-ballastra 33/33, exp-balances 37/37. Every story thread pays off. Three actions, by priority:
  1. **The first fights.** The chapter 2 depot leaves the player at 3/10 with no heal between chapters, and the Zeelich depot then needed an assist. The third Core pylon drags. Options for the user, then a person plays the depots and the Core.
  2. **The ending's staging (a user decision).** The game opens with an 88 s film but ends with seven lines in the overhead house view. Proposal: a short closing scene.
  3. **Gifts before a chapter's own talk.** `kit2b.js talkFirst`: for example, in chapter 14 Ilka thanks Twinsen for the notebook before her urgent line. Game-wide fix: the pending story talk plays first.
  
  Lower priority: chapter 10 is talk-heavy, chapter 14 repeats the mill climb, chapter 7's vent repeats chapter 4's discs, Zeelich looks plainer than Citadel, two camera clips, and the title overlaps a subtitle in the opening at about 25 s.
- **Release readiness:** **NO-GO** for a public release (D-1, D-2, P-1). **The user's decision (24.11): the exe is for private testers only.** D-2 settled the same day: the data stays and the title disclaimer now names the original layouts. For private testers the verdict is **NOT VERIFIED**: P-1 (Windows installer, install and uninstall on the user's machine) is still open, and D-1 (branding) remains an open owner question that does not block this audience.

A technical pass cannot overrule an unfinished adventure.
