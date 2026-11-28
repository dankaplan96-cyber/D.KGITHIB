# HANDOVER-DESKTOP · the desktop's local agent takes over from the laptop (CLOUD_ORDERS 39 MIGRATE-39 B) · 11.11.2026

Written by the new machine's local agent after pulling `HANDOVER-LAPTOP.md`. Each heading of the laptop's file is
answered with **received / set up / missing**. The machine: Acer Nitro AN515-53 (a laptop, used as the work and test
machine), Intel Core i5-8300H, NVIDIA GeForce GTX 1050 4 GB (driver 582.78), 16 GB, Windows 11 Home 26H2 build 26300.
Details and its first measurements: `docs/lba3-performance/HARDWARE/2026-11-10-gtx1050.md`.

**The desktop starts from the laptop's last commit:** the merge of `086e64e1` (HANDOVER-LAPTOP, on top of `f06d4a5c`)
into this clone. From here on only this machine's agent pushes (C).

## 1. Unpushed work — received

- The clone: `C:\Users\danka\dev\D.KGITHIB` (outside OneDrive), branch `ccr-adf00ea7-37ebl3`, merged with
  `origin/ccr-c1c2c4b9-dep6ed`. Nothing unpushed here after this commit.
- All 40 `wip/laptop/*` branches fetched and visible (`git branch -r`). Per the laptop's note they are a safety net;
  **the live one is `wip/laptop/lba3-items`** (CAST-POLISH-NAMED in work). No worktrees made from the others.

## 2. The queue — received; this machine takes it in the laptop's order

Taken over (said in `WORLD_ART_REQUESTS.md`, DESKTOP-GTX1050 and MIGRATE-39-B):
1. **28 queue 6, the named cast** (CAST-POLISH-NAMED): continue from `wip/laptop/lba3-items` on top of
   CAST-POLISH-UNDERGROUND (Baldino first: ears and headband; then Hesk, Yorna, councilC and the rest). Then queue 7's
   `_b` variants (farmerA, farmerB, clerk; councilB for Kira; zmole2, zbee1, zbee2), then queue 9 (common props).
2. **27a curator:** Desert Island and the Hamalayi (not started), and the re-score of Citadel's lighthouse, NW plateau,
   harbour and square after CITADEL-85.
3. **38:** Twinsen only after queues 6, 7 and 9 (the user, 9.11: "by the order we set").
4. **34:** done; the open question to the user stays open (is the camera chaotic only at the hostel door, or
   everywhere?).
5. **The expansion:** W-4 waits for the coordinator's order.

**Stays with the laptop:** 27c (the Vega 8 measurements, the minimum target) and the owed EQUIP-1 frame-time pair.
**Waiting for the user, not for an agent:** 27b's seven listening WAVs.

The user's words the laptop recorded (9.11, 10.11 and earlier) are read and kept (the memory, below).

## 3. Knowledge — received and set up

- **The 13 memory files** (`handover/memory/`) read and copied into this machine's memory for the clone's path
  (`%USERPROFILE%\.claude\projects\C--Users-danka-dev-D-KGITHIB\memory\`) and for the folder this agent was started in.
- The pitfalls list read. Two of them already met and handled the same way here: the tests' Playwright import
  (here mapped at run time by a Node `--import` hook outside the repo, the tests untouched) and a small Node static
  server in place of Python's.
- New pitfalls found on this machine (also kept in its memory):
  - The Claude app here is a packaged (MSIX) app: registry writes to HKCU and `git push` made from the agent's shell
    stay inside the app's container. Settings that must reach Windows (the per-app GPU preference) and pushes are run
    through a process started outside it. A read-back inside the shell is not proof.
  - Hybrid graphics: Chrome and the Test Lab's Electron need the per-app "High performance" preference or they run on
    the Intel UHD 630 (set for both).
  - A Chrome window opened behind another window is throttled to 1 frame a second: benchmark runners must turn off
    `CalculateNativeWinOcclusion` and check the pace before measuring.

## 4. The user's original files — set up (installed from GOG on this machine), sizes compared

| Path | Here | Laptop (A.4) | State |
|---|---|---|---|
| `C:\Program Files\GOG Galaxy\Games\tlba-classic\` | 783 MB, 260 files, GOG 3.2.3.2 | 784 MB | present |
| `C:\Program Files\GOG Galaxy\Games\tlba2-classic\` | 1267 MB, 238 files, GOG 3.2.4.3 (+ Original Edition) | 1.3 GB | present |
| `C:\Users\dan\lba-study\` | — | 126 MB | **missing** (convenience; rebuilt as needed) |
| curator `ref\` renders | — | 25 MB | **missing**; rebuildable from the GOG files |

- Read in place; nothing from them is committed. Checked: `tools/lba-source/studyrender.py` renders LBA2's body 1
  (from `tlba2-classic\Common`) beside `assets/poly/twinsen.json` into the session scratch folder (not the repo).
- So 27a, 28's race checks and 29 can continue here.

## 5. Other files outside git

| Laptop item | Here |
|---|---|
| `listening-crackle\` (OneDrive `lba3-move`) | **missing here:** no `lba3-move` folder under this machine's OneDrive yet (not synced, or not uploaded). Only the user needs it (listening). |
| `tools\testlab\runs\` | rebuilt as needed (one Quick Check run so far) |
| `tools\testlab\node_modules\` | set up (`npm install`, Electron installed) |
| portable game builds | not set up; download a release's win.zip when a packaged run is needed |
| `lba3-bench\` | stays on the laptop (Vega 8). This machine has its own runner in `docs/lba3-performance/HARDWARE/2026-11-10-gtx1050/` |
| `.blend` working files, scratch captures | rebuildable, not copied |

## 6. Tools — set up

| Tool | Laptop | Here |
|---|---|---|
| Git | 2.56.0.windows.3, GCM | **2.56.0.windows.4**, GCM; the user signed in; push works |
| Node | 26.13.0 | **26.13.0** (LTS) |
| Playwright | 1.64.1 | **1.64.1** (`tools/testlab`), its Chromium installed (`npx playwright install chromium`) |
| Python | 3.12.10 + numpy | **3.12.10** (per user) + numpy 2.5.4 + Pillow 13.0.0 |
| Blender | 5.2.3 LTS | **5.3.0** (`C:\Program Files\Blender Foundation\Blender 5.3\`) |
| Chrome | — | 157.0.8103.51 (on the GTX 1050 by the per-app preference) |
| The game's desktop app | installed (Vega 8 runs) | not installed (see "Not done") |

**Checks run on this machine:**
- **The Blender bridge:** `bridge.mjs discover` finds Blender 5.3.0; `smoke.mjs` **SMOKE PASSED**. **Zoé rebuilt end to
  end** (`tools/blender/zoe_poly.py` through a bridge `script` job, 5 s, 7190 triangles): the output is **identical
  to the repo's `assets/poly/zoe.json`** (SHA-256 `c93ec68e…`, 1 742 577 bytes), so Blender 5.3 gives the same model as
  5.2.3 did. Pitfall: the script's arguments must be absolute paths (relative ones resolve against Blender's folder).
- **The test suites:** `tests/chapter1.mjs` (SwiftShader, as the suite sets it), the game served on 127.0.0.1:8123:
  **functional 23 passed, 0 failed; errors none; VERDICT PASS** (6 min 53 s).
- **The Test Lab:** Quick Check on the development build on the GTX 1050: 6 of 8 (the two failures read as the tool's
  server: favicon 404 and a new port after the restart; see DESKTOP-GTX1050).

## 7. The Vega 8 stays the minimum target — received

Nothing measured here stands in for it. The laptop keeps the game's desktop app, Node, `lba3-bench` and a clone; it
is **not to be wiped**: 27c and the EQUIP-1 pair need it. This file being pushed is the condition the cloud set for
the laptop being free to stop working, not for wiping it.

## 8. Secrets — none

The user's GitHub sign-in (Git Credential Manager) and Claude account only. No keys in git or on disk.

## Not done yet

- The game's desktop app (Electron) is not installed here, so the user's desktop-app benchmark and mine in Chrome
  have not been compared on the same build (`2026-11-10-gtx1050.md`).
- No worktree made from `wip/laptop/lba3-items` yet: the next step, CAST-POLISH-NAMED.
- `LBA3-SETUP.cmd` was not run: it was not found under this machine's OneDrive, and everything it does was done by
  hand here.
