# FULL-TEST (22.11.2026): partial, on v128, stopped by the coordinator

**Partial, on v128, stopped by the coordinator** (09:15): more fixes are landing, so one full test runs later, at the very
end. What ran is below; what did not is listed in §3. Same model and categories as `FULL-TEST.md` (20.11).

- Build under test: `ccr-c1c2c4b9-dep6ed` at `257f6a1a` (v128 as published, the build stamp at HEAD), on the worker
  branch `worktree-agent-a04cce054bce1e73b`. **No game file changed**: no fix was needed for anything that ran.
- Runtime: **Automated runtime only (SwiftShader)**: headless Chromium (Playwright, `--use-angle=swiftshader`), 4 cores,
  one suite at a time from this run, the game served by `python3 -m http.server 8241`; `BOOT_TIMEOUT=900000`,
  `TMPDIR=/dev/shm`. The machine was shared. From ~04:45, other sessions' browsers (camsteady, p58 walks, probes) ran
  alongside, and the load was 8–15. No GTX 1050 or UHD 620 numbers.
- Runner: `tests/out/ft3/run.sh` (not committed: `tests/out/` is ignored). Each suite's log is in `tests/out/ft3/logs/`,
  with one line per suite in `tests/out/ft3/results.tsv`. Old builds for the A/B are `git archive` copies in
  `/dev/shm/ft3b/{pre,post}` (tmpfs), served on 8242.

## 1. Suite table

Categories for a FAIL: **(a)** known, listed in KNOWN-FAILING.md with the same numbers; **(b)** the test asserted old
behaviour a recent task changed on purpose, and the test was updated; **(c)** a real regression, fixed in the game and the
suite re-run; **(d)** a test fault, flake or load effect not in (a), re-run alone; **open**: not resolved here.

| Suite | Verdict | Checks | Time | Failures, category |
|---|---|---|---|---|
| dialogue-check | **PASS** | Hebrew 5561/5561 keys | <1 min | — |
| autoquality (Node) | **PASS** | 73/73 | <1 min | — |
| opening-tutorial | **PASS** | 43/43 | 14 min | — |
| tutor-targets | **PASS** | 26/26 | 7 min | — |
| prologue | FAIL (crash) → **PASS** alone | 29/29 | 2 + 4 min | **(a)** "the well's mites beaten with the ball" [4, 4, null], then the crash on `G.room.nodes`. This is the same as KNOWN-FAILING's prologue row. It passed on the re-run |
| chapter1 | **PASS** | 33/33 | 2 min | — |
| chapter2 | **PASS** | 21/21 | 3 min | — |
| chapter3 | **PASS** | 48/48 | 2 min | — |
| chapter4 | **PASS** | 59/59 | 13 min | — |
| chapter5 | **PASS** | 23/23 | 1 min | — |
| chapter7 | **PASS** | 20/20 | 1 min | — |
| chapter8 | **PASS** | 22/22 | 1 min | — |
| chapter9 | **PASS** | 24/24 | 1 min | — |
| chapter10 | **PASS** | 30/30 | 2 min | — |
| middle-variety | **PASS** | 19/19 | 4 min | — |
| mills | **PASS** | 19/19 | 5 min | — |
| vesk | **PASS** | 12/12 | 7 min | — |
| exp-ballastra | FAIL → **PASS** alone | 33/33 | 6 + 9 min | **(d)** "Ferro tosses his kashes": coins +5, expected ≥ 10, so the bot took one of the two popped coins. The pop direction is `Math.random` (`actors.js` Pickups `pop`), and `P.grab(12)` reached only one. Bridge and gate were right. The re-run passed |
| exp-balances | **PASS** | 37/37 | 6 min | — |
| exp-throttle | **PASS** | 28/28 | 5 min | — |
| epilogue-home | **PASS** | 12/12 | 1 min | — |
| dialogue-scenes | **PASS** | 10/10 | 1 min | — |
| desert-life | **PASS** | 30/30 | 7 min | — |
| faces | **PASS** | 7/7 | 2 min | — |
| fps30 | **PASS** | 56/56 | 1 min | — |
| boot-fail | **PASS** | 5/5 | 1 min | — |
| cave-stair | **PASS** | 21/21 | 2 min | — |
| p81-revisits | **PASS** | 7/7 | 3 min | — |
| story-fix | **PASS** | 15/15 | 1 min | — |
| menus | **PASS** | 40/40 | 2 min | — |
| hebrew | **PASS** | 24/24 | 3 min | — (P92's infinitive prompts as written) |
| controls | FAIL | 89/92 | 3 min | **(a)** the three camera "no lurch" checks: acc p95 12.5 / 14.3 / 12.8, the same numbers as KNOWN-FAILING |
| timing | **PASS** | 29/29 | 1 min | — |
| anim-combat | **PASS** | 35/35 | 1 min | — |
| jumpreach | FAIL | 3/4 | 1 min | **(a)** Zeelich's old mill, stuck at 12.56 m (KNOWN-FAILING) |
| arrival-steps | FAIL | 11/12 | 3 min | **open** (PERF-ARRIVAL, as 20.11): B tavern, one draw-batch unit 70.9 ms (limit 40), at load 4.5. Zeelich's 154 ms of 20.11 did not recur |
| char-form | **PASS** | 7/7 | 2 min | pictures in `tests/out/ft3/char-form/`, not looked at in this pass |
| world-consistency | **PASS** | 37/37 | 2 min | — |
| combat | **PASS** | 78/78 | 1 min | — (ONE-SHOT-30 holds) |
| camfollow | **PASS** | 31/31 | 2 min | — (CAMERA-NIGHT holds) |
| camclear | **PASS** | 15 functional + visual | 13 min | — (the ch10 hand-back holds) |
| camsteady | FAIL | 105/110 | 9 min | **(a)** the same five as KNOWN-FAILING: cliffs height 10.6/min; free street jolt 1,749.1; harbour pier heading 12/min (listed 12.1); street Modern 103.4 vs 101.7; Follow Medium jitter 7 > 3 |
| face-2 | **PASS** | 9/9 | 2 min | — |
| face-2-tour | **PASS** | 5/5 | 4 min | — |
| face-3 | FAIL → **PASS** alone; **intermittent** | 6/6 on re-run | 1 + 3 min | **(d), open (minor)**: "sign: no prop … over a head, chest or waist". On Zoé's 4th line the ray to Twinsen's waist touched the yard's Bug St. board 1.17 m from the lens. The picture shows the board's corner over his lower body, bottom right. The A/B below shows a threshold effect, not a camera change. Not a cause found |
| ui-p92 | **PASS** | 29/29 | 4 min | — |
| autoquality-game | crash at section 7, twice → sections 1–6 **PASS** 21/21; 7–8 **not run** | 21/21 + — | 24 + 24 min | **(d)** `page.goto('?nocine&autoq')` timed out (180 s, hard-coded in `boot.mjs` `open`) at section 7's reopen, twice, at load 10–12. P95's worker saw the same at section 7 under load (AUTO-P95.md §5.1) and ran sections 7–8 alone: 8/8. That stand-alone run (`tests/out/ft3/aqg78.mjs`) was queued after the long suites and was not reached before the stop |
| keepalive | **PASS** | 6/6 | 6 min | — |
| slidetraps | **PASS** | 5/5 | 2 min | — (HARBOUR-BRINK holds) |
| overlap-sweep | **PASS** | 1 functional + 5 visual | 10 min | — |
| citadel-structures | **PASS** | 7/7 | 2 min | — (Corla from her hatch) |
| spaceport-2 | **PASS** | 21/21 | 15 min | — |
| zport-2 | **PASS** | 19/19 | 19 min | — |
| ballastra-harbor | **PASS** | 19/19 | 2 min | — |
| ballastra-arches | **PASS** | 20/20 | 3 min | — |
| ballastra-gardens | **PASS** | 22/22 | 3 min | — |
| occluders | **PASS** | 1 functional + 34 visual | 17 min | — |
| depot | **PASS** | 29/29 | 6 min | — |
| puzzles | **PASS** | 24/24 | 14 min | — |
| p79-faces | **PASS** | 3/3 | 4 min | — |
| fps30-feel (one pass, synthetic: `RUNS=1 RATES=30@60,30@59.9,60`) | measures only | — | 4 min | Drawn intervals were all on the grid: 33.33 / 33.39 / 16.67 ms (p50 = p95 = p99 = max), with no interval ≥ 45 ms. T3 mouse+keys at 30: 4 camera position jumps (0.19–0.30 m; 1 from `chase`, 3 from `aim`) and 2 tilt jumps. T3 pad at 30: 1 tilt jump. None at 60 |
| campaign-hands | **PASS** | 8/8 | 40 min | — |
| save-migration | **PASS** | 49/49 | 41 min | — (old saves load) |
| campaign-thread | **not run**: stopped by the coordinator one minute after its start | — | — | — |

### 1.1 face-3's "sign" check, A/B
I ran the same test script (HEAD's) against three builds: `63416c4a` (before CAMERA-NIGHT), `d6a9df6a` (CAMERA-NIGHT
merged) and HEAD `257f6a1a`:

| Build | Runs | Zoé's 4th line, Twinsen's points hit by the board |
|---|---|---|
| `63416c4a` pre | PASS, PASS | knees only (1.15, 1.18 m) |
| `d6a9df6a` post | FAIL | waist 1.17 + knees 1.20 |
| `257f6a1a` HEAD | FAIL, PASS | waist 1.18 + knees 1.21; then knees only 1.19 |

The chosen shot is the same in every run: `why` [0.9, 1, 0.3, −1, 0.3, 1.09] on Zoé's lines, the same as lines 1–2. The
hit distances vary by ±3 cm run to run on every build. Whether the waist ray clips the board's top edge is a threshold
effect of where he stands and his pose. The A/B is too small (2 vs 3 runs) to exclude CAMERA-NIGHT. Four more runs per
side were queued and not reached. FACE-3's own committed run chose another shot for that line (`k` 0.9, cost 1.4).
Open for the final test: repeat pre and HEAD ×4. If it is HEAD-only, look at `_favPose`'s `_fgClutter` for the board.

## 2. The campaign chain (tests/playthrough 01 → 14)
**Not run.** It was queued after campaign-thread, and the stop came first. The chain file is ready in
`tests/out/ft3/list5.txt`: 01–12b chained by Save & quit → Continue, 13 from `base-13` with its origin rewritten to the
server's port, and 14 from 13's save.

## 3. Not run in this pass
- campaign-thread (all sections): stopped.
- autoquality-game sections 7–8 (the calibration, evaluation, cache and benchmark): see the table.
- The playthrough chain 01 → 14.
- face-3's extra A/B runs.
- The diagnostics among the tests added since 20.11: `hidden-tris` (~45 min diagnostic), `smooth-routes` (measures
  only), `p79-perf` (perf measures).
- The older single-topic suites outside the priority list.

## 4. What remains broken or unverified
- **Known (a)**: controls' three "no lurch" checks; camsteady's five; jumpreach's old mill; prologue's intermittent
  mites crash.
- **Open**: arrival-steps, the tavern's 70.9 ms draw-batch unit (PERF-ARRIVAL). face-3's sign check is intermittent
  (§1.1).
- **Flake (d)**: exp-ballastra, Ferro's second coin (random pop, bot reach). It is not shown whether a player could lose
  one: an uncollected coin stays owed and is paid on the next load (`base.js` `settleOwed`).
- **Real regressions found: none.** Fixes made: none. **src files changed: none.**
