# FULL-TEST (20.11.2026): REPAIR-PASS-18-11 phase 6 + REVIEW-TASKS-19-11 task 7 (P79)

The user (20.11): minimal tests while working, ONE full test of everything at the end. This is it.

- Build under test: `ccr-c1c2c4b9-dep6ed` at `1f9652fd` (v104 as published), on the worker branch
  `worktree-agent-adff6b8f61f27aeb4`. Fixes made here are listed per suite and committed one by one.
- Runtime: **Automated runtime only (SwiftShader)** — headless Chromium (Playwright 1.x, `--use-angle=swiftshader`),
  4 cores, a machine shared with another session; one suite at a time, the game served by `python3 -m http.server 8177`.
  Nothing here is a GTX 1050 number.
- Runner: `tests/out/ft/run.sh` (not committed: `tests/out/` is ignored) — each suite's log in `tests/out/ft/logs/`,
  one line per suite in `tests/out/ft/results.tsv`.

## Resume point
(kept current as the run goes)

- Batch 1 (opening-tutorial → chapter10): done, all PASS after three test updates (`0e5a89aa`).
- **Stopped at handback (20.11 ~12:20)** in batch 2 after exp-ballastra; batch 2's runner may still be going in the
  background (its results append to `tests/out/ft/results.tsv`). To resume: re-run `exp-ballastra`, `exp-balances`, then
  from `exp-throttle` on: exp-throttle epilogue-home campaign-thread campaign-hands save-migration dialogue-scenes
  dialogue-check desert-life faces fps30 boot-fail cave-stair p81-revisits story-fix menus hebrew controls timing
  anim-combat jumpreach arrival-steps char-form. Keep the server up with `tests/out/ft/serve.sh` (a background job's
  2 h limit killed it once). NOT DONE: the chain, P79's captures and perf runs, the rest of tests/*.mjs.
- Batch 2 (middle-variety → arrival-steps, the rest of the priority list but char-form); then the chain 01 → 14
  (`tests/out/ft/chain.sh`), then P79 (`tests/char-form.mjs` with OUT=captures/full-test/char-form, `tests/p79-faces.mjs`,
  `tests/p79-perf.mjs`), then the rest of `tests/*.mjs`.

## 1. Suite table

Categories for a FAIL: **(a)** known, listed in KNOWN-FAILING.md with the same numbers; **(b)** the test asserted old
behaviour a recent task changed on purpose — the test updated; **(c)** a real regression — fixed in the game, suite re-run;
**(d)** a test fault / flake not in (a) — said which; **open** — not resolved here.

| Suite | Verdict | Checks | Time | Failures, category | Fixed |
|---|---|---|---|---|---|
| opening-tutorial | first FAIL (crash) → **PASS** | 43/43 | 5 → 15 min | (b) TUT-MYSTERY's edit left `sk` in part B's return (the run crashed at B1); (b) A18 "holding the ball key shows the landing": the walk back to the barrels now passes the lane's pipe for the first time (A9/A12's skip walks went past it before) and its remark `prh_lane` opened mid-hold | test: `sk` removed; A18 reads the remark (`P.settle()`) and walks on (`0e5a89aa`) |
| tutor-targets | **PASS** | 26/26 | 12 min | — | |
| prologue | **PASS** | 29/29 | 3 min | — (KNOWN-FAILING's intermittent "well's mites" did not occur) | |
| chapter1 | first FAIL → **PASS** | 33/33 | 3 min | (b) "the objective sends him to his own tap": DIALOGUE-2 (19.11, `e25e454e`) made it "The square has water. Go home and talk to Zoé" | test reads home + Zoé (`0e5a89aa`) |
| chapter2 | **PASS** | 21/21 | 3 min | — | |
| chapter3 | **PASS** | 47/47 | 2.5 min | — | |
| chapter4 | **PASS** | 59/59 | 14.5 min | — | |
| chapter5 | **PASS** | 23/23 | 1.3 min | — | |
| chapter7 | **PASS** | 20/20 | 1 min | — | |
| chapter8 | first FAIL (8, cascade) → **PASS** | 20/20 | 1.4 min | (b) the depot step (MIDDLE-VARIETY's edit, never run): Lulu was asked at the door while he stood by her on the way (>15 m from the door: Tim's "Come on, Lulu!" again, by design); (d) the boarding step stood him on SPACEPORT-3's Pema (fuel cart, west of the pad): her Talk prompt, not the ship's | test: he waits at the door until the children are there; steps round the pad until the prompt is the ship's (`0e5a89aa`) |
| chapter9 | **PASS** | 24/24 | 1.5 min | — | |
| chapter10 | **PASS** | 30/30 | 2 min | — | |
| middle-variety | **PASS** | 19/19 | 4.5 min | — | |
| mills | **PASS** | 19/19 | 5 min | — | |
| vesk | **PASS** | 12/12 | 7.5 min | — | |
| exp-ballastra | FAIL → test updated, **re-run pending** | 32/33 | 6 min | (b) "Quill weighs visitors (the lift has opinions about ballast)": P81 scene 3 (`d56daf8f`) rewrote `bl_qu_2` ("The lift has been jammed four days, and somebody's sums are wrong") | test reads "Visitors are weighed" + "lift has been jammed" (committed with this table); EXP-3's edited end check PASSED |
| exp-balances | running at handback (30 checks passed, 0 failed when last read); the game server was down ~4 min near its end (12:13–12:17, the background job's 2 h limit): **re-run it** | | | | |

## 2. The campaign chain (tests/playthrough 01 → 14)

## 3. P79 (REVIEW-TASKS-19-11 task 7)

### 3.1 Twinsen and Zoé from the play camera

### 3.2 Faces at dialogue distance

### 3.3 Performance — Automated runtime only (SwiftShader)

## 4. What remains broken or unverified

## 5. Exact local test steps for the user's machine
