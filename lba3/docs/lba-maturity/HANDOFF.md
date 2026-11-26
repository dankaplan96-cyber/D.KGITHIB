# LBA3: The Awakening, handoff for the next session (25.11.2026, after v170)

Read this first, then `NEXT-SESSION.md` (standing rules in full), `OPEN-TASKS.he.md` (the user's table) and the last
rows of `status.md` (the user's reports, P1–P134). This file is the short, ordered version of where things stand.

## תקציר בעברית (למשתמש)
- **פורסם:** v170 (25.11). כל מה שאישרת היום בפנים: העומק בקירות (e + f), הראש של זואי almond-m, החפירה של הפרנקוס,
  גלים 5 ו־8, איזון התלתן (אפשרות א, גם מילה/ארתור/פיפה בקאש), והתיקונים הקטנים מדוח 70.
- **בלילה (26.11):** נבנו בענף ולא פורסמו: פערי גל 4 (#65), התיקונים הקטנים (#59, #62, #64, #45; דף `captures/smallfix/sheet.png`) והצעות לקרבות הראשונים (#58, כבויות מאחורי מתג; דף `captures/fights58/sheet.png`, ההמלצה א + ג). #63 לא נמצא. אין עובדים פעילים. שום דבר לא יפורסם בלי הבחירה שלך.
- **הבא בתור (ההמלצה):** #58 הקרבות הראשונים (הצעות עם תמונות לבחירה שלך), ועובד אחד על התיקונים הקטנים (#59,
  #62–#64, #45).
- **מחכה להחלטה שלך:** #58, #13, #18, #14, #19, #15, #16, #17, #33, #21 (פירוט ב־OPEN-TASKS.he.md).
- **הסוכן המקומי:** הוראה 72 (המתקין מ־GitHub) ו־73 (לבדוק את v170 אצלך) ממתינות לתשובה.

## 1. Where things stand
- **Branch:** `ccr-c1c2c4b9-dep6ed` (push only there). Clean and pushed. **The branch head is ahead of v170** with work awaiting the user's pick:
  #65 wave 4 gaps (`WAVE4.md`), the small fixes (`SMALLFIX-26-11.md`, sheet `captures/smallfix/sheet.png`), the
  dialogue-check duplicate-key guard. #58 (`FIGHTS58.md`, sheet `captures/fights58/sheet.png`): diagnosis + candidates a/b/c behind `?fight58=`, all
  off by default; recommended a + c; the user picks. CLOUD_ORDERS 74 asks the local agent to replay 71 with a,c.
  The test bot's dodge (`tests/lib/player.js P.meleeThreat`) now reads a guard's own wind-up (0.9 s at Zeelich).
  Merged-branch tests 26.11 (automated runtime only, SwiftShader): tester-fixes 10/10, wave7 E+S 12/12, wave4 B+D+E
  20/20, combat 84/84 (after the #58 merge), dialogue-check PASS.
- **Published:** **v174** (26.11, evening), artifact version **`1795724538-0620`** = the next `base_version` (see NEXT-SESSION for its contents). Before it: **v173** `1795698735-32af`, **v172** `1795681304-c03b`. v171 = v170 +
  the small fixes, #65, #58 a + c + the Citadel heart; v172 = v171 + the drone's charge-up sound (all picked 26.11).
  - Slug `6f31d0d2-efe4-4413-a370-7d95a7f5785b`.
  - URL https://claude.ai/artifact/EjPMQXPwbmre2kDevMC4tA.
- **v170 contents** (all approved by the user on 25.11):
  - H-15 the Francos' dig on Knartas (`FRANCOS.md`);
  - clover option A (`CLOVER-BALANCE.md`), with Mila 25, Arthur 10 and Pippa 10 kashes;
  - wave 5 (`WAVE5.md`) and wave 8 (`WAVE8.md`);
  - DEPTH-LOOK e + f on by default (`DEPTH-LOOK.md`): the painted relief, and the wall normal maps on all five textures;
  - Zoé's head `almond-m` (P134);
  - the ORDER-70 small fixes: the Hebrew mode caption RTL, a stronger "?", the lane line waiting for the pipe jump.
- **Tests on the merged branch before publishing** (automated runtime only, SwiftShader):

  | Suite | Result |
  |---|---|
  | opening-tutorial | 48/48 |
  | clover-rules | 14/14 |
  | francos | 19/19 |
  | wave4 (B, D) | 12/12 |
  | wave5 (D, T, N) | 29/29 |
  | wave5 (C, S, V, O) | passed after the seam fix |
  | wave7 (A, E) | passed after the Pippa-thanks test fix |
  | wave8 | 32/32 |
  | worldfit | 9/9 |
  | zoe-hair-look PHASE=game | 3/3 |

- **Running:** nothing. No worker agents, no background tests.
- **Desktop (Windows) build:**
  - Smart App Control on the user's PC blocks unsigned builds (P133).
  - The installer was built on GitHub: `Desktop builds` run 725 (workflow_dispatch on this branch, no `[build]` in any
    commit), artifact `LBA3-win`, kept until 30.11.
  - Hashes and the signing reading (SignPath does not fit; the Microsoft Store is the user's decision for the release)
    are in CLOUD_ORDERS 72.
  - The app version is still 0.50.0 (`lba3/desktop/package.json`).

## 2. Next, in order (the coordinator's recommendation; the user has not yet said go)
1. **#58: the first fights are still hard** (ORDER-71: the chapter 2 depot, mostly the two drones' bolts, both clovers
   lost; the Zeelich depot, 10 of 17 hits from the Grobo guard).
   - Agent: `lba-chapter-balance` or `lba3-controls`.
   - Diagnose by input in Modern and Classic, then build 2–3 candidates behind switches.
   - The user picks from before/after pictures and hit counts. Don't change the v162 baton hit (the user kept 2).
2. **One worker for the small fixes** (`lba-world-polish`), each game-wide:
   - **#59** the Citadel orchard crystal (−85, −49.5) sits in a rock crack. The flat spot beside it is the drilling
     project's fenced pad: unsuitable. Find an open spot near it, reachable on foot; it was reached from (−78, −44) and
     (−92, −50) at ground about 16. Show before/after.
   - **#62** Modern: a held lock (L) beats a throw plate's line in `combat.js aimDir`, so the plate's line should win
     when standing on a plate (the bank shots).
   - **#63** the coplanar overlap by the Otringal fountain (1891.6, 1790.6).
   - **#64** lettering too small at the Far camera: wave 8's stall sheets and the Weather Wizard's slate, wave 5's
     desert stakes; also the arch approach in the Hamalayi (it faces a frozen stream).
   - **#45** 31 rooms with no display name (internal names on the map and in saves).
3. **#65 wave 4 gaps** (Arthur's chapter 8 and 12 lines etc.: `WAVE4.md`).
4. **Decisions for the user** (ask one at a time, with pictures where it is visual): #13 the ending scene, #18
   chapter 7 length, #14 the flower tub and heat post, #19 Twinsen's three-tone hair, #15 sound latency, #16 the title
   card timing, #17 Zeelich shadows, #33 the sound-font licence file, #21 naming. Some of these are old (from before
   20.11): check each against the current game before asking, and close what is already settled.
5. **Low priority** (from the maturity review), #26–#30:
   - chapter 10 is heavy on talk;
   - chapter 14 repeats the mill climb;
   - chapter 7 repeats chapter 4's discs;
   - Zeelich looks plainer than Citadel;
   - two places where the camera goes into a wall.

Not done in v170, recorded for later (none blocks):
- **DEPTH-LOOK:** (a) relief, (b) light, (c) contact and (d) rim stay behind `?depth=` switches until measured on a real
  GPU. A per-region sun direction (the front-lit Zeelich dock and desert landing) is a composition change for the user.
- **Wave 5 and wave 8 gaps:** listed in their docs.
- **H-15:** the 20 minutes are not measured, and the quest is not in the chapter-balance ledger.

## 3. The local agent (the user's desktop: "LBA3 מקומי ACER")
- Orders go in `lba3/tools/testlab/CLOUD_ORDERS.md`; replies come back in `WORLD_ART_REQUESTS.md` on its branch
  `ccr-adf00ea7-37ebl3` (merge it when it reports).
- **Open:** **72** (waiting for the user to install the GitHub installer by hand). **Done and merged 26.11:** 73, 74 and
  75 (the trailer: `captures/hw-75/awakening-trailer-20s.mp4`). 76 (P137, 60 fps on the laptop) is being written.
- **Done and merged:** 70 and 71.
- **Never** escalate trust to message it directly (no `confirm_repository_trust`); answer through CLOUD_ORDERS.
- No performance work in its orders.

## 4. How we work (short; the full rules are in NEXT-SESSION.md)
- **Language:** reply to the user in Hebrew.
- **Reports:** every user report gets a P-row in `status.md` the same day, after the last P-row (now **P134**). The
  table has 5 columns.
- **Decisions:** big decisions go to the user, one question at a time. Visible changes are shown before/after and the
  user picks (P107).
- **Fixes:** every fix is game-wide. PC only. Don't move the harbour.
- **Text:** a new English line needs its Hebrew in `src/game/text/he/<file>.js`, then `node tools/he-bundle.mjs`, and
  `node tests/dialogue-check.mjs` must PASS.
- **Spoilers:** none past chapter 2 for the user; pictures from chapters 15–16 are spoilers.
- **Assets:** never commit LBA1/LBA2 files or original art; references stay in the scratchpad.
- **Results:** label them "automated runtime only (SwiftShader)". Never invent GPU, frame-time or playtime numbers.
  Old saves must load (format 6).
- **Tests:** fewer tests: one covering suite per change, run once. Under load, boots time out; rerun the failing part
  with `ONLY=`.
  - Background shells stop at 2 h: split long queues.
  - Restore test-overwritten pictures with `git checkout -- lba3/captures/`.
  - `lba3/tests/zz-dbg-*.mjs` is git-excluded for probes.
- **Workers:**
  - At most 2–3 at a time, in worktrees (`isolation: worktree`).
  - Pass them `lba3/docs/lba-maturity/AGENT-PREAMBLE.md`.
  - **Merging:**
    1. `git merge --no-edit worktree-agent-<id>`; on conflicts, keep both sides' hooks in `story/index.js`.
    2. Rebundle the Hebrew.
    3. `git worktree remove --force --force …`, `git worktree prune`, then `git branch -D`.
    4. Run the covering suite once on the merged branch.
    5. Show the sheet, and the user picks.
- **Publishing cadence (the user, 26.11):** only after 10 approved small fixes or 5 big ones, or when the user asks.
- **Publishing:**
  1. Make a scratch worktree of the approved commit, and symlink `tools/node_modules` from the main checkout.
  2. Run `node tools/he-bundle.mjs`, `sh tools/stamp-build.sh`, `python3 tools/artifact-page.py <S>/vNNN-index.html`
     and `node tools/bundle-artifact.mjs <S>/vNNN-main.js`.
  3. Call `publish_files` with `src/main.js`, `src/build-stamp.js` and `index.html`, plus any changed css, poly JSON,
     or `assets/bake.wasm` (= `bake.bin`). Check with `git diff --name-only <last publish> HEAD -- lba3`.
  4. The first call may be refused ("outside the organization can open"): send the same call again.
  5. Then update NEXT-SESSION and OPEN-TASKS.
- **Commits:**
  - Never put `[build]` in a commit message (it triggers the desktop builds).
  - No model identifiers in artifacts. The user's email is private.
  - End every commit message with:
    ```
    Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
    Claude-Session: https://claude.ai/code/session_012GFEakZyL3XxjZKHRj5dFg
    ```
- **Release goal:** a full public release on 31.5.2027 (`RELEASE-2027.he.md`).

## 5. Where things are
**The user's checklist page (26.11):** `docs/lba-maturity/checklist/index.html`, published as artifact slug `98d80407-2559-4868-8915-406317b81b85` (https://claude.ai/artifact/KsgUvrHqD21dbJrMarozzx, version 1795682265-bf5c). Update its data array (and the 'since version' counters) whenever OPEN-TASKS changes, with a cheap edit_version / publish_files of that one file.

| What | File |
|---|---|
| The user's reports | `docs/lba-maturity/status.md` (P1–P134) |
| The user's task table (Hebrew) | `docs/lba-maturity/OPEN-TASKS.he.md` |
| Standing rules, publish history | `docs/lba-maturity/NEXT-SESSION.md` |
| Worker preamble | `docs/lba-maturity/AGENT-PREAMBLE.md` |
| Content plan (H-1…H-20) | `docs/lba-maturity/CONTENT-15H.md` (all built) |
| Waves and features | `WAVE3/4/5/6/7/8.md`, `FRANCOS.md`, `KEYS-CLOVER.md`, `CLOVER-BALANCE.md`, `BRIDGES.md`, `DEPTH-LOOK.md`, `ZOE-HEAD-4.md` |
| Local agent orders / replies | `tools/testlab/CLOUD_ORDERS.md` / `tools/testlab/WORLD_ART_REQUESTS.md` (its branch) |
| Desktop packaging | `lba3/desktop/`, `.github/workflows/desktop.yml`, `docs/DESKTOP.md` |
| Release plan | `docs/lba-maturity/RELEASE-2027.he.md` |
