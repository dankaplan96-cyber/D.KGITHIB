# HANDOVER-LAPTOP · the laptop's local agent hands over to the desktop (CLOUD_ORDERS 39 MIGRATE-39) · 11.11.2026

Written by the laptop's local agent (Windows 11, Ryzen 5 3500U, Vega 8). Branch `ccr-adf00ea7-37ebl3`. The desktop agent
answers each heading in `HANDOVER-DESKTOP.md`. The agent's own memory is copied as text in `handover/memory/` (13 files);
read `handover/memory/MEMORY.md` first.

## 1. Unpushed work

- **The main clone** `C:\Users\dan\lba3` (`ccr-adf00ea7-37ebl3`) is clean, nothing unpushed.
- **The shared repository's 3 stashes** are pushed as `wip/laptop/stash-0` (pk19-zstyle), `wip/laptop/stash-1`
  (zt-zstyle) and `wip/laptop/stash-2` (WA-16's cape, 31.10).
- **Every other worktree** with edits, untracked files or local-only commits is pushed as one snapshot commit
  `wip/laptop/<worktree>`.
  - The snapshot's parent is the worktree's HEAD. It holds the tracked edits plus untracked text and jpg.
  - Left out: `.blend`, png and anything from the original games.
  - I checked the 1147 files: none over 1.2 MB, none from the originals.
- **Almost all of this is old:** batches already delivered as `requests/*.diff` and applied by the cloud. The snapshots
  are a safety net, not a queue. **The one live piece is `wip/laptop/lba3-items`** (the named cast, below).

| Worktree | Base (HEAD) | State | Pushed as |
|---|---|---|---|
| lba3-asy | b9bf660d | 6 edits | wip/laptop/lba3-asy |
| lba3-base | 0aed5b26 | clean, nothing unpushed | — |
| lba3-blend | db5a1c9c | 11 edits, 14 untracked | wip/laptop/lba3-blend |
| lba3-campaign | `campaign/director` 3860db35 | 20 edits; **11 local-only commits** (the campaign director's round 2: C8–C12, EPILOGUE-HOME, LIGHTHOUSE-OPEN; reached origin as the CAMPAIGN-2 diffs, c251c0d1) | wip/laptop/lba3-campaign |
| lba3-cast2 | 59dab6e3 (local base: + ISLES) | 41 edits, 17 untracked | wip/laptop/lba3-cast2 |
| lba3-cast3 | fb0c0ef0 (local base: + ISLES + DESERT) | 21 edits, 23 untracked | wip/laptop/lba3-cast3 |
| lba3-chars | 54af45d9 | 44 edits (26 equal to origin) | wip/laptop/lba3-chars |
| lba3-check | 449dfc17 | 33 edits | wip/laptop/lba3-check |
| lba3-chest | 9bb3431c | 1 edit | wip/laptop/lba3-chest |
| lba3-clean | cccfc20b | 26 edits, 10 untracked | wip/laptop/lba3-clean |
| lba3-climb, lba3-climb2 | ebb992a6, 88634b86 | 2 edits each | wip/laptop/lba3-climb, -climb2 |
| lba3-exp | `expansion/ballastra` 275e1261 | clean, nothing unpushed | — |
| lba3-fidget, lba3-glider | 548c3eec, 1c82f206 | 1–2 edits | wip/laptop/lba3-fidget, -glider |
| lba3-gpu | 0b0393b3 | clean, nothing unpushed | — |
| lba3-harb, lba3-hostel | f520b750, 9bb3431c | 7 and 3 edits | wip/laptop/lba3-harb, -hostel |
| **lba3-items** | **ed24df2b (local tmp: origin db3707df + CAST-POLISH-UNDERGROUND)** | **8 edits, 18 untracked: CAST-POLISH-NAMED in work** | **wip/laptop/lba3-items** |
| lba3-o17, -o18, -o19 | f3001989 | 2, 2, 16 edits | wip/laptop/lba3-o17, -o18, -o19 |
| lba3-o20 | 6154deaa (local base: ASYLUM-20) | 3 edits, 1 local commit | wip/laptop/lba3-o20 |
| lba3-o22, -o25, -o26, -o27m | 7cb6dddb, 0ef4f6a2, 68315019, 876446b2 | delivered orders 22/23, 26/25, CITADEL-85, MUSIC-CRACKLE | wip/laptop/lba3-o22, -o25, -o26, -o27m |
| lba3-otr, -pk19, -play3, -proto, -seq | fdad24e1, 568a05ed, 82073b68, da4a75f0, 92051255 | 2–5 edits (pk19: ZOE-LOOK-38 applied) | wip/laptop/<name> |
| lba3-stones | 2a1a1317 (local tmp) | 1 edit, 1 local commit | wip/laptop/lba3-stones |
| lba3-tmp, lba3-trees | 5ad6af52, ebb992a6 | 2 and 8 edits | wip/laptop/lba3-tmp, -trees |
| lba3-verify | 8c6c2133 | clean, nothing unpushed | — |
| lba3-w1, lba3-w1c | `exp-w1-place`, `exp-w1-chars` | clean; both inside `expansion/ballastra` | — |
| lba3-zee, -zperf, -zstyle | ca4fd206, a028b0bf, f542978f (local bases) | 3–4 edits, 1 local commit each | wip/laptop/lba3-zee, -zperf, -zstyle |
| lba3-zfight | 1c82f206 | 17 edits, 3 untracked | wip/laptop/lba3-zfight |
| lba3-zt | 53cd1c98 | clean, nothing unpushed | — |

- **Local-only branches:** `campaign/director` (in `wip/laptop/lba3-campaign`). `exp-w1-place` and `exp-w1-chars`
  are contained in `origin/expansion/ballastra`.
- **Already on origin:** `wip/campaign-1` and `wip/no-air-2` (the cloud's).
- **The desktop needs none of these worktrees:** make fresh ones from origin. Only `wip/laptop/lba3-items` holds work
  in progress.

## 2. The queue (state 11.11.2026)

**Done and applied by the cloud:**
- DOORS-LBA2 (29), STONES-31, HANDS-36, CAST-POLISH-HAMALAYI, OTRINGAL-37;
- ITEMS-1, EQUIP-1 (the ball and the sword), CITADEL-85 (e2a9d1dc);
- the earlier cast batches (Citadel 1–3, Zeelich 1–2, isles, desert), MUSIC-CRACKLE's code, 22/23/25/26 art follow-ups.

**Sent, waiting for the cloud:**
- **CAST-POLISH-UNDERGROUND** (87613283): VESK-COLLAR, worker_b, nara_b, and Fosse on farmerC_b. Applies on e2a9d1dc.
- **ZOE-LOOK-38**: accepted by the user. `requests/ZOE-LOOK-38.diff` plus `ZOE-LOOK-38/zoe.json`. Applies after UNDERGROUND.
- **EXP-MERGE-35-base**: the climb-foot pocket in `climbShelfWall`.

**By order:**

- **27a curator.**
  - Done: Citadel and Zeelich (CURATOR-27a, 90f32cfa; `docs/lba-maturity/resemblance-*.md`, BUILDING_REGISTER.csv).
  - **Not started:** Desert Island and the Hamalayi. Needs the user's original files (see 4).
  - Also owed: a re-score of Citadel's lighthouse, NW plateau, harbour and square now that CITADEL-85 landed.
- **27b music crackle.**
  - Code delivered (MUSIC-CRACKLE).
  - **Waiting for the user's ears:** 7 listening WAVs (1A/1B source vs game, 2A/2B Home's seam, 3 the office, 4A/4B the slider). They are in `C:\Users\dan\lba3\listening-crackle\` and copied to the user's `OneDrive\lba3-move\listening-crackle\`.
- **27c performance lab** on the Vega 8 after each published version: **not done per version**. Only ZPERF-1 (Zeelich) and light per-batch checks were made. **It needs the laptop:** the desktop's GTX 1050 cannot stand in.
- **28 cast pass, by the art queue** (`art/blender/PROGRESS.md`):
  - regions: Zeelich/Otringal, the isles, Desert, the Hamalayi, the underground — all done;
  - **queue 6, the named cast: IN WORK.** It started 10.11 on `lba3-items` and stopped when the session ended, unreported.
    - Its partial files are in `wip/laptop/lba3-items`: jobs `named-*.json`; exports in `art/blender/characters/named/export/` (allhead, baldino, baldino.old); edits to cast_poly.py.
    - Baldino first (his paper-thin ears and headband), then Hesk, Yorna, councilC and the rest.
    - **Redo or continue it on the desktop** on top of CAST-POLISH-UNDERGROUND.
  - then queue 7's `_b` variants: farmerA, farmerB, clerk (and councilB for Kira; zmole2, zbee1, zbee2);
  - then queue 9, common props.
- **34 CAM-34.**
  - Done. **The portico's camOnly box is withdrawn**: the user, 9.11, "the camera feels more chaotic". The camera stays straight behind at the hostel door.
  - The fort gate's snap-in is the cloud's (an island.js arch volume proposal).
  - **Open question to the user:** is the camera chaotic only there, or everywhere? No answer yet.
- **38 ZOE-LOOK.**
  - Zoé accepted ("Zoé is good", 9.11).
  - **TWINSEN-LOOK-38 is on hold by the user's word:** "by the order we set" (9.11). Twinsen comes **after** queue 6, 7 and 9.
  - I had started Twinsen and stopped him on that word. Nothing of him was kept.
- **Expansion** (`expansion/ballastra`, worktree lba3-exp, clean):
  - W-1, W-2 and **W-3 accepted** (W-3: "Looks good", 9.11);
  - EXP-MERGE-35 done (28deb808);
  - **W-4 waits** for the coordinator's order.
- **39 MIGRATE-39:** this file.

**PROGRESS files:** `art/blender/PROGRESS.md` is current (Current, Queue, Next action as above). `lba3/PROGRESS.md` is the cloud's; nothing of mine is missing from it.

**What the user told the laptop agent directly that no file had yet:**
- 9.11: "Zoé is good". "Looks good" for W-3. "By the order we set": finish the queue before Twinsen.
- 9.11: the hostel camera with the box "feels more chaotic": withdraw it.
- 10.11: on the sword blade's quarter turn, "keep it". On CITADEL-85, "yes, all of it".
- Earlier, kept in memory:
  - the 12-years 80 % rule;
  - no dome;
  - layout like the original;
  - Zeelich's hub is a new city;
  - structure over fps;
  - measure in the desktop app;
  - ask the story purpose before building;
  - the standing approval ("מאשר לך כל ההרשאות");
  - night mode (go on by the plan);
  - no spoilers past chapter 2 in pictures sent to the user.

## 3. Knowledge only on that machine

**The memory**, 13 files, is in `handover/memory/`. Copy it into the desktop's
`%USERPROFILE%\.claude\projects\<key>\memory\`, where `<key>` is the clone's path with every non-alphanumeric character
replaced by `-` (e.g. `C--Users-dan-lba3`). No CLAUDE.md outside the repo. `~/.claude/settings.json` holds only two
notification switches.

**Pitfalls, one line each:**
- Worktree checkouts on this repository take 2+ minutes: run them in the background and wait.
- Make diffs against the newest `origin/ccr-c1c2c4b9-dep6ed`. Check with a scratch index (`GIT_INDEX_FILE=x git read-tree origin/…; git apply --cached --check d.diff`); rebase with `git apply --cached -3`, then `git diff --cached origin/…`.
- A `-3` apply with a conflict in a scratch index drops that file from the diff: fix that hunk by hand.
- Note files (`WORLD_ART_REQUESTS.md`, `PROGRESS.md`) conflict on every merge, since both sides append. Keep both, and check that no `<<<<<<<` is left: it happened once (b74f3067). CRLF breaks a naive LF regex.
- Single-line JSON (`skeletons.json`, `index.json`) goes as `.add.json` with only the changed entries.
- Python `-c` strings with Windows paths break on `\U`: write the text to a file instead.
- Playwright: run tests from scratch copies of `tests/` with the import swapped to `tools/testlab/node_modules/playwright`. Never edit the repo's tests for that.
- Python's `http.server` refuses connections under load: use a small Node static server, or raise the backlog.
- SwiftShader runs can "page crash" late in long suites when the machine is loaded. Rerun alone before blaming a change.
- Run suites one at a time, each with its own timeout. A batched rerun once hung silently for 600 s.
- Real play is `game.frame(dt, true)`. Draw calls come from `renderer.info`. Stepped captures are not frame-rate evidence.
- GPU looks: `tools/blender-bridge/gamepage.mjs` `openGame({gpu:true})` reaches the real GPU through ANGLE D3D11. The in-app browser pane shows no WebGL.
- Blender by-products: the scripts rewrite `.blend` files in `art/characters/` (`cast_poly_*.blend`). Keep them out of commits; two are tracked (arthur, esmers), so don't move them.
- Agents can stop on API, auth or stall errors. Their transcript stays; resume them with a message. Check the worktree before assuming nothing was done.
- Never kill processes you didn't start (no name-based taskkill). On Windows, `process.kill()` does not kill the game: use `taskkill /F /PID`.
- **How long things take on the Vega 8:**
  - a cast batch: 1.5–3 h;
  - a GPU look pass: 3–5 h;
  - cast-rounds about 20 min;
  - magic-levels about 30 min;
  - combat up to 30 min.

## 4. Files that must NOT go into git (copy them yourself, same paths on the desktop)

| Path | Size | What it is | Needed for |
|---|---|---|---|
| `C:\Program Files\GOG Galaxy\Games\tlba-classic\` | 784 MB | the user's LBA1 (GOG), read in place | 27a, 29, reference sides of 26/28/38 |
| `C:\Program Files\GOG Galaxy\Games\tlba2-classic\` (`Common\`) | 1.3 GB | the user's LBA2 (GOG), read in place | 27a (Desert, Hamalayi), 28 race proportions, 29 |
| `C:\Users\dan\lba-study\` | 126 MB | study scripts and notes (`shot\look.mjs`, decoders' outputs) | convenience; scripts can be rewritten |
| scratch `…\scratchpad\curator\ref\` | in 25 MB | renders decoded from the user's files (27a) | rebuildable with `curator\work\refscene.py` |

- Better: **install LBA1 and LBA2 from GOG Galaxy on the desktop** than copy them.
- **Without the GOG files, the desktop cannot do:** 27a's next regions, the race checks of 28, and any "against the original" work (29, 38's reference side).

## 5. Other files outside git

| Path | Size | Copy or rebuild |
|---|---|---|
| `C:\Users\dan\lba3\listening-crackle\` (git-excluded) | 23 MB | **copy**: already in `OneDrive\lba3-move\listening-crackle\` for the user's ears |
| `lba3\tools\testlab\runs\` (ignored) | 566 MB | rebuildable: the test lab's run outputs (last 6.11) |
| `lba3\tools\testlab\node_modules\` | — | rebuild: `npm install` |
| `C:\Users\dan\lba3-games\` (0.43.3, 0.44.0, 0.46.0 portable builds) | 2.0 GB | rebuildable from the GitHub releases' win.zip |
| `C:\Users\dan\lba3-bench\` (electron-bench, chrome-bench, pacing, raw logs, `save-backup-2026-10-30`) | 125 MB | **keep on the laptop** (Vega 8 runs); the save backup is the user's |
| `%APPDATA%\LBA3 Test Lab\` | 1.8 MB | the test lab app's Chromium profile; rebuild |
| `.blend` / `.blend1` working files (32 in the main clone's `art\`, more in worktrees) | small each | rebuildable: the `*_poly.py` scripts regenerate them |
| session scratch `C:\Users\dan\AppData\Local\Temp\claude\deb53b226b83eb12\5ab6eb84-7519-44bc-bb3c-9b5d6a3ccabd\scratchpad\` | 3.1 GB | raw captures and logs (c85 1.2 GB, z28 767 MB incl. a headless shell, ug, o27m, cam34…); rebuildable, no need to copy |
| `art\music\masters\`, soundfonts, `tests\out\` | not present on this laptop | — |

## 6. Tools and versions on the laptop

- **Git** 2.56.0.windows.3, signed in to GitHub through Git Credential Manager.
- **Node** v26.13.0 (the order says Node 22: either works for the test lab).
- **Playwright** 1.64.1 (`tools/testlab`). Its Chromium is installed by `npx playwright install chromium`. GPU looks use the installed Chrome.
- **Python** 3.12.10 with numpy (the decoders in `tools/lba-source` run without `-I`).
- **Blender 5.2.3 LTS** in `C:\Program Files\Blender Foundation\Blender 5.2\`.
  - The bridge `tools/blender-bridge` is a command line: no server, no port, no add-on.
  - `node tools/blender-bridge/bridge.mjs discover` finds Blender via `--blender`, `LBA3_BLENDER`, `config.local.json` (git-ignored), or Program Files.
  - Smoke test: `node tools/blender-bridge/smoke.mjs`.
- **The test lab:** `cd lba3/tools/testlab; npm install`. `npm start` opens the window; `node engine/cli.mjs quick|full` runs the CLI.
- **The game's desktop app:** installed at `%LOCALAPPDATA%\Programs\LBA3 The Awakening` (used for Vega 8 measurements); portable builds as above.
- **Claude Code:** the project's `.claude/settings.json` (in git) allows Bash, Edit, Write, Read, Glob, Grep, Agent, WebFetch, WebSearch and the artifacts, remote and github MCPs. The 47 agents are in `.claude/agents/` (in git).
- **No global npm tools.** No environment variables needed (optionally `LBA3_BLENDER`).
- **A setup script for the desktop:** the user has `LBA3-SETUP.cmd` in OneDrive. It installs Git, Node, Python and Blender, clones this branch, runs `npm install` plus Playwright, installs numpy and puts the memory in place.

## 7. The Vega 8 stays the minimum target

- **Benchmark runners:** `C:\Users\dan\lba3-bench\electron-bench.mjs` (the installed desktop app, the default) and `chrome-bench.mjs` (branch A/B), plus `pacing.mjs` and `run-pacing-ab*.ps1`.
  - Last pacing cases are in `lba3-bench\pacing\` (case2–4); raw battery runs are `raw-auto-battery.txt` and `raw-full-battery.txt`.
- **How to run one:** always with `--user-data-dir=lba3-bench\electron-profile`, never the real `%APPDATA%\LBA3 The Awakening`. Run Auto, then Full, on battery and plugged in. Results say "desktop app <version>".
- **Owed:** an EQUIP-1 frame-time pair on a quiet laptop.
- **Keep the laptop installed:** the game's desktop app, Node, the `lba3-bench` folder and a clone. The user must not wipe it until `HANDOVER-DESKTOP.md` is pushed.

## 8. Secrets

- **None in git.** The desktop needs only the user's own GitHub sign-in (Git Credential Manager asks on the first clone or push) and the user's Claude account in the desktop app.
- No API keys are used by the local work.

---
**The laptop stops here.** The laptop agent pushes nothing after the commit that adds this file; that commit is named in the
line below.

the laptop stops here, HANDOVER-LAPTOP (the commit that adds this file, on top of f06d4a5c, is the last the laptop agent pushes)
