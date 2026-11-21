# AUTO-P95 — Auto: the best picture the machine can hold, smoothly (status P95)

The user, 21.11: "make Auto give the best image and quality while keeping it running smoothly, in every way." The
priorities, in order: (1) a smooth, even pace at the chosen Frame Rate (60, or 30 under the limit); (2) sharpness —
world resolution and edge quality before costly effects; (3) then the effects (bloom, shadow softness, far detail,
animation rate). Per machine and per power source. Visible changes only at commit points (a scene change, a menu, a
power change, the start of play). Low / Medium / High chosen by hand are unchanged.

**Every result in this document is "Automated runtime only".** The cloud has SwiftShader (a CPU rasteriser), no GPU,
no battery and no real display, on a machine shared with two other workers. Nothing here measures a GPU or claims a
frame rate on the user's machines. The decision tables in §4 come from synthetic machines whose "truth" is written
from the real-hardware reports named in §2; the governor itself never sees that truth. Order 64 AUTO-HW (§7) is what
confirms or refutes this on the GTX 1050 and the UHD 620.

Base: `5e927e5e` (origin/ccr-c1c2c4b9-dep6ed). Files: `src/engine/autoquality.js` (the governor, the profiles, the cache
migration), `src/engine/autoapply.js` (wiring), `tests/autoquality.mjs`, `tests/autoquality-game.mjs`. Not touched: the
frame loop and limiter (`src/main.js`, P94), `src/engine/camera.js`, the HUD and menus (`src/game/hud.js`, P92), the
renderer (`src/engine/renderer.js`: Medium-lean uses knobs it already has), any text table.

## 1. How Auto worked at the base (read from the code, not the old audit)

Three profiles (High · Medium · Low, each the preset exactly), an evaluation of the first ~60–120 s of play across two
scenes, then hold. Each 1.5 s window of play is ok / paced / cpu / gpu against the frame budget B (16.7 ms, or 33.3 ms
under the 30 limit); sustained pressure queues one profile down; one step up per evaluation when the cost model predicts
the profile above fits 0.72 × 16.7 ms on both sides in every window; at the end it locks and caches the profile per GPU
+ power source + screen (+ `|30fps`). With Auto, the renderer draws at High's pixel ratio (devicePixelRatio up to 2, up
to 1.25 for an integrated GPU on a high-density screen) times the profile's `scale`.

## 2. Shortfalls found (each with its evidence)

| # | Shortfall | Evidence |
|---|---|---|
| S1 | **A laptop panel switched to 40/48 Hz on battery was read as GPU pressure**, and Auto dropped to Low for nothing. The window test called "paced" only CPU and GPU p90 ≤ 0.75 × 16.7 ms; at 41 Hz the GPU clocks down and its timer reads longer. The end of the evaluation also failed any profile whose intervals "missed" 16.7 ms, paced or not. | `HARDWARE/2026-11-21-gtx1050-battery/bat-bench-auto.txt` line 22: "down: Medium → Low — GPU pressure: 38.1 fps · frame p90 ≤ 28.3 ms · CPU p90 ≤ 12 ms · GPU p90 ≤ 17.1 ms · missed 78 %"; "with nothing drawn: 41.0 Hz". Low then ran the same 40–42 fps on every route. |
| S2 | **Under the 30 limit, windows were judged on 33.3 ms alone.** A frame drawn on one refresh must be ready by the next to be shown on time; with GPU work past one refresh (16.7 ms), frames are shown a refresh late (a 50 ms then a 16.7 ms picture) while every rAF interval still reads 33.3 ms. Auto called those windows "ok" and held profiles that cannot be even at 30. The title calibration also used 33.3 ms at 30, so it started heavier there than at 60. | FPS30.md §7: the UHD 620 at 30 drew with GPU 17–18.5 ms a frame on the street; the user: "30 isn't even". FPS30-PRESENT counts the presented ≥ 50 ms intervals the rAF intervals do not show. Code: `classify()` used `B = budget()` = 33.3 ms for both "ok" and "heavy". |
| S3 | **One rung from Medium to Low dropped resolution (85 %), MSAA and shadows together**, so a machine a little short of Medium lost all three. | UHD 620 plugged in (`HARDWARE/2026-11-19-intel-uhd620-mains`): Medium → Low for the whole game on the street, where Medium's GPU was p95 18.1 ms. MSAA is one of the largest GPU levers measured: GTX 1050 street 8.2 → 7.2–7.4 ms without it (`ac-bench-auto.txt`), Vega 8 on battery −5.3 of 37 ms. |
| S4 | **A step down was never judged.** On CPU work no profile removes, Auto walked to Low and stayed there. | UHD 620: "CPU pressure: CPU p90 22.3 ms" → Low; Low's CPU is about Medium's (i5 UHD submit 5.4 vs 5.1 ms; GTX 1050 battery street game CPU 13.8 vs 15.6 ms). FPS30-PRESENT battery at 60: Auto at Low still missed refreshes (main thread p95 28.8 ms). |
| S5 | **Stalls entered a window's rate and misses.** A single 100–250 ms frame (a compile, an upload, a GC) in a 1.5 s window could turn an otherwise on-pace window into pressure. Stalls were already kept out of the percentiles. | Code: `fps = n·1000/dur` and `missN` counted stalls. |
| S6 | **The one step up needed room in every window.** One noisy window blocked it for the whole evaluation. And after a step down the evaluation could step straight back up into the profile it had just left under pressure (an oscillation between two scenes). | Code: `roomAbove` used `ws.every`. In the synthetic UHD 620 run at 30 (before the fix): lean → Low → lean → Low in 4 minutes. |

Checked and **not** a shortfall (no change):

- **The step up at 30 is judged on 60's budget** (`upBudget`, FPS30). This looks like 30 getting less than it could. It
  is right, for S2's reason: under the limit a frame must still be ready by the next refresh, so the time between frames
  cannot be spent on a slower frame. P95 adds the matching rule for holding a profile (S2's fix).
- **Render scale on a devicePixelRatio 2 laptop with integrated graphics.** Auto draws every profile at pixel ratio
  1.25 (×0.85 on Low: 1.06). That is sharper than Medium chosen by hand (1.0) and much cheaper than the panel's 2.0.
  On the UHD 620 Medium at 1.25 was already GPU-bound on the street (15 ms p50 at 60). A higher ratio is not
  affordable. A lower one loses sharpness before the effects, so the fix goes into the ladder instead (S3).
- **Power-source moves.** On each source the cache holds its own settled profile, or uses one profile lower on battery
  / higher on mains, evaluated. This is sound. P95 only makes the ladder skip Medium-lean on battery (below) and sends
  a guess that lands on it to the sharper neighbour.
- **Manual Low / Medium / High.** `renderer.knobs` stays `null`, and no preset table changed.
- Found, left as it is: under Auto, Medium on a high-density screen with a discrete GPU (the GTX 1050 at 1.25) keeps
  MSAA 2×, which Medium chosen by hand turns off there. That is more quality where the machine holds it.

## 3. The changes

`src/engine/autoquality.js`
- **Medium-lean** (`PROFILES[2]`, tier `medium`). Medium at **100 % resolution with Medium's shadows** (map 1024, plain
  filter), minus MSAA (the edges are smoothed in the output pass, as Medium by hand does on a high-density screen and
  as every profile does on battery), lamps 4 → 2, Low's far grass and far small shadows, far people (beyond 25 m) at
  half rate, and their tiny far parts. Cost shares are GPU 0.46 and CPU 0.74 of High's (Medium 0.56 / 0.80; Low 0.32 /
  0.70). Fixes S3: effects and MSAA go before resolution and shadows. It is never a start: a guess or a calibration
  still starts at Medium at the lowest.
- `classify()`:
  - **SLOW_PANEL** fixes S1. The window is 'paced' when its intervals sit tightly round one value (p10 ≥ 0.85·p50,
    p90 ≤ 1.2·p50) longer than the budget (p50 ≥ 1.1·B), with CPU and GPU p90 ≤ 0.85·p50. A game too slow for a fixed
    60 Hz panel cannot produce this: its intervals are whole refreshes (a 16.7 / 33.3 ms mix). The rule needs the GPU
    timer: without one, a variable-refresh screen showing a GPU-bound game looks the same, and the old rule stands.
  - **PRESENT** fixes S2. Under a limit of ≥ 2 refreshes, a window is 'ok' only when GPU and CPU p90 are ≤ 0.85 of a
    refresh (the refresh is measured: `game.refreshMs()`; at most 16.7 ms is counted). Otherwise it is pressure flagged
    `late`, even when every interval is on time. On a 41 Hz panel under the 30 limit (not a whole number of refreshes)
    the rule does not apply.
  - Stalls are left out of the window's rate and misses as well (S5). A window with fewer than 5 steady frames is not
    judged.
- `evaluate()`: the misses of paced windows no longer fail the evaluation (S1). There is no step up back into a
  profile this evaluation left under pressure, and the step up needs room in ≥ 90 % of the windows rather than all of
  them (S6).
- **A step down is judged** (`judgeStep`, REVISIT_*), fixing S4. When play returns to a scene measured at the profile
  above (≥ 2 windows there, ≥ 4 at the new profile), the step stays if half of the new windows are 'ok' or the pressure
  eased by ≥ 7 %: frame rate up, or for a `late` step the pressure side's p90 down. Otherwise the sharper profile comes
  back, queued to a commit point, once per step. No further step of that kind (CPU or GPU) is taken in the session
  (`noHelp`), and no further step down is taken while a judgement is pending in that scene. This is the one step up a
  session can make after settling. It corrects the governor's own step, and the cache then holds the profile it went
  back to.
- `Governor` options `refresh()` and `skip(p)`; `below()` / `above()` walk the ladder over a skipped profile.
- The cache: `lba3_autoq_v5`, where each entry carries its profile's id. `migrateCache()` reads a v4 cache (High ·
  Medium · Low by index) once, by id, so a machine's settled Low stays Low (index 3 now). Unknown or broken entries are
  dropped.
- Wording: a profile without MSAA is described as "no MSAA (edges smoothed in the output pass)", not "FXAA" (the
  output pass has done that since GFX-LOOK).

`src/engine/autoapply.js`
- The governor gets `refresh: game.refreshMs()`, and `skip`: Medium-lean while the battery profile is on, because it
  already removes MSAA and lamps from every profile.
- The title calibration is judged on 16.7 ms under the 30 limit too (S2).
- Cache load and migration as above. `fromCache`'s "try one higher" and `onPower`'s guess follow the ladder's skip. A
  step back in hold is stored as the session's settled profile.
- The benchmark/F9 report marks a `late` window and lists `noHelp`.

## 4. Decision tables, before and after (Automated runtime only — synthetic machines)

`node tests/autoquality.mjs` prints the table. To get the "before" column, run
`git show 5e927e5e:lba3/src/engine/autoquality.js > /tmp/aq-before.mjs && BEFORE=/tmp/aq-before.mjs node tests/autoquality.mjs`.

Each run is 8 min of play, cycling the street (40 s), an interior (25 s), the street, and combat (30 s), with scene
changes as commit points. The start is the GPU name's guess (plugged in: High, or Medium for an integrated GPU; on
battery: Medium).

The machines' truth (ms at High per scene and each profile's share, by id):

- **Fast GPU:** street GPU 4 ms / CPU 4.5 ms.
- **GTX 1050 laptop:** from GTX1050-AC and FPS30-PRESENT: High street GPU 8.5, CPU 6.5; Medium's GPU ≈ High's on that
  GPU. On battery, the user's 18.11 run: GPU ×1.36, CPU ×2.1.
- **UHD 620 at dPR 2:** from the 19.11 report: street GPU 32.6 at High (Medium 15), CPU 21.9 (Medium 16.4); interior
  GPU 8.7, CPU 5.2 at Medium. Shares from the i5 UHD's breakdown. On battery GPU ×1.25, CPU ×1.2.
- **"UHD 620, light CPU":** the same GPU with the street's CPU work at the interior's.

The battery variants:

- **battery:** a 60 Hz panel.
- **battery 41 Hz:** the panel at 24.4 ms, with the GPU timer ×1.4 (GTX1050-BATTERY).
- **battery paced:** 12 % of the callbacks come a refresh late (FPS30-PRESENT).

"Frames shown late" applies under the 30 limit only, and is the truth's share of frames whose work ran past one refresh.

| machine | power | limit | before: settles on (steps) | after: settles on (steps) | street fps, last 3 min (before → after) | frames shown late (before → after) |
|---|---|---|---|---|---|---|
| fast GPU | mains | 60 / 30 | High (none) | High (none) | 60 / 30 | 0 → 0 |
| fast GPU | battery | 60 / 30 | High (up at 44 s) | High (up at 44 s) | 60 / 30 | 0 → 0 |
| GTX 1050 | mains | 60 / 30 | High (none) | High (none) | 60 / 30 | 0 → 0 |
| GTX 1050 | battery | 60 / 30 | Medium (none) | Medium (none) | 60 / 30 | 0 → 0 |
| GTX 1050 | battery 41 Hz | 60 | **Low** (down at 5 s) | **Medium** (none) | 41 → 41 (the panel's) | – |
| GTX 1050 | battery 41 Hz | 30 | **Low** (down at 63 s) | **Medium** (none) | 30 → 30 | – |
| GTX 1050 | battery paced | 60 | **Low** (down at 5 s) | **Medium** (down at 5 s, back at 73 s) | 53.4 → 53.4 | – |
| GTX 1050 | battery paced | 30 | Medium (none) | Medium (none) | 30 → 30 | 0 → 0 |
| UHD 620 | mains | 60 | **Low** (down at 5 s) | **Medium-lean** (→ lean 5 s, → Low 73 s, back 143 s) | 44.9 → 44.1 | – |
| UHD 620 | mains | 30 | Medium (none) | Medium (→ lean 4 s, back 73 s) | 30 → 30 | 0.39 → 0.37 (the street's CPU: no profile removes it) |
| UHD 620 | battery | 60 | Low (down at 4 s) | Low (down at 4 s) | 36.6 → 36.6 | – |
| UHD 620 | battery | 30 | Medium (none) | Medium (→ Low 5 s, back 73 s) | 30 → 30 | 0.54 → 0.52 (CPU, as above) |
| UHD 620, light CPU | mains | 60 | **Low** (down at 5 s) | **Medium-lean** (down at 5 s) | 60 → 60 | – |
| UHD 620, light CPU | mains | 30 | **Medium** (none) | **Low** (→ lean 4 s, → Low 73 s) | 30 → 30 | **0.19 → 0.03** |
| UHD 620, light CPU | battery | 60 | Low (down at 5 s) | Low (down at 5 s) | 60 → 60 | – |
| UHD 620, light CPU | battery | 30 | **Medium** (none) | **Low** (down at 4 s) | 30 → 30 | **0.32 → 0.06** |

Reading:

- **Where the after column is higher quality:**
  - The 41 Hz battery panel: Medium, not Low (S1).
  - Chrome's battery pacing: Medium, not Low (S4).
  - The UHD 620 plugged in at 60: Medium-lean (full resolution, shadows), not Low (S3, S4).
- **Where the after column is lower:**
  - The UHD 620 at 30 with a light CPU. The old governor held Medium with 19–32 % of the frames shown a refresh late.
    The new one steps until they are rare (S2). This is the "even pace first" priority. It costs picture.
- **Where nothing changed:** the UHD 620 street's own CPU work runs past a refresh at 30 whatever the profile, so it
  stays uneven there. The step down was tried and went back, and the sharper profile is kept. It needs the CPU work cut
  or the frame loop's help (P94), not a lower profile.
- **Seed sweep (the truth's noise), 9 seeds:**
  - Every row settles the same in all 9, but one: the UHD 620 plugged in at 60 ends at Medium-lean in 8 and at Low in 1
    (a step to Low measured just over the 7 % gain).
  - With the threshold at 10 %, the opposite error appeared once: the UHD 620 on battery at 60 went back from Low,
    whose true gain was 14 %. That is why the threshold is 7 %.

## 5. Tests (what ran, and where)

All ran in the cloud: **Automated runtime only (SwiftShader / Node)**.

- `node tests/autoquality.mjs` (Node, no browser): **61 passed, 0 failed.** That is the old 40 checks plus the new
  ones:
  - the four-profile ladder;
  - each P95 rule on synthetic windows (SLOW_PANEL, PRESENT, stalls, the paced evaluation, REVISIT kept / back, skip,
    the v4 → v5 cache);
  - the decision table's 11 checks over the synthetic machines.

  The seed sweep (`P95SEED=3,5,7,13,17,19,23,29`): 1 check failed in 1 of the 8 extra seeds. It was the one in §4: the
  UHD 620 plugged in at 60 ended at Low. The default seed is fixed, so the test is deterministic.
- `node tests/autoquality-game.mjs` (the game in headless Chromium, SwiftShader, the governor fed frame times):
  results in §5.1.
- `node tests/fps30.mjs` with `ONLY=E` (the frame budget, Auto at 30, its cache key): results in §5.1.

### 5.1 Browser runs

These ran in headless Chromium with SwiftShader, on port 8647, on the shared machine (load average 11–13).

- `tests/autoquality-game.mjs`: **29 of 29 checks passed, in two runs.**
  - The first run passed sections 1–6: 21 checks, including the new P95 Medium-lean render check (pixel ratio and
    shadows as Medium, MSAA 0 with output-pass edges on, 2 lamps, Low's far grass and casters, half-rate far people,
    tier `medium`). Then the page's own load timed out (180 s, `page.goto`) on the shared machine at section 7.
  - Sections 7–8 were then run on their own, with the file's header and an initial `open`, `BOOT_TIMEOUT=900000`:
    8 of 8 passed. These are the calibration, the evaluation and cache, the next start's try, the new **v4 → v5 cache
    load** check, and the benchmark's Auto run and fixed runs.
  - Errors: none. Resources: none missing.
- `tests/fps30.mjs ONLY=E`: **5 of 5 passed.** That covers Frame Rate's values, Auto's budget and cache key per limit,
  and "steady 33 ms frames at 30 are on budget and the limit's saving is not spent on a heavier profile". No errors.
- `tests/autofit.mjs` (window 1042×695 at devicePixelRatio 1.475, integrated GPU): **12 of 12 passed.** The presets'
  pixel ratios on an integrated GPU with a high-density screen are unchanged (Low 0.85, Medium 1.0, High 1.25 with
  MSAA 2×).

## 6. Open risks

- **The thresholds are first values.** SLOW_PANEL 0.85, PRESENT 0.85 of a refresh, and REVISIT 7 % / 4 windows come from
  the reports above and the synthetic runs, not from a measured distribution on the user's machines.
- **PRESENT assumes the browser shows a frame a refresh late when its work passes one refresh.** That is how Chrome's
  compositor works and what FPS30-PRESENT saw. The cost is that, at 30, a machine whose GPU sits at 15–17 ms gets a
  lighter profile than before. If the hardware shows even 30 there anyway, PRESENT is too strict.
- **REVISIT needs play to come back to a scene measured before the step.** Without a revisit the step stays (the old
  behaviour). A false judgement either way is bounded to one step and one session.
- **Medium-lean's cost share (0.46) is an estimate** (MSAA's measured saving × ~0.95). Its look was not judged by a
  person: no GPU here can render it at speed. AUTO-HW's screenshots are the check.
- **The Settings line still says "to hold 55–60 fps" under a 30 limit.** It is player text (English + Hebrew, the menus'
  owner) and was left as it is.
- **SLOW_PANEL needs the GPU timer.** Without one, a 41 Hz panel can still step down. REVISIT then brings it back when
  the frame rate did not rise.

## 7. The local procedure (order 64 AUTO-HW)

On the GTX 1050 desktop and, if the user can, the UHD 620 laptop (devicePixelRatio 2), in Chrome with a **fresh profile**
(no cached Auto result: `localStorage` has no `lba3_autoq_v5` / `v4`), Quality Auto. Serve the build directly. Once on
the base `5e927e5e` ("before"), once after the merge ("P95 merged" in WORLD_ART_REQUESTS.md).

1. For each power source (plugged in; on battery) and each Frame Rate (60; 30):
   1. Clear the cache: in the console, `localStorage.removeItem('lba3_autoq_v5'); localStorage.removeItem('lba3_autoq_v4')`.
      Reload.
   2. Play 3 minutes: the Citadel street (run, turn the camera), into a house, back out, a fight in the fields, the
      street again. Revisiting the street matters: that is where a step down is judged.
   3. Record:
      - Auto's decisions: `game.autoQ.state().log`, or Pause → Benchmark: Auto as played. The `quality:` line and the
        "decisions" list give each step, its reason, and any "did not help … back to …".
      - What it settled on: profile, `game.renderer.pixelRatio()`, `game.renderer.composer.renderTarget1.samples`
        (MSAA), `game.renderer.output.uniforms.edgeAA.value`.
      - `game.refreshMs()`.
   4. Measure the presented frames as in FPS30-PRESENT (`docs/lba-maturity/fps30-present/fps30present.mjs`): presented
      intervals p95 / p99, ≥ 50 ms count, GPU ms p50 / p95.
   5. Force the next profile up by hand and play the same 3 minutes:
      `game.autoQ.gov.setProfile(game.autoQ.gov.applied - 1, 'AUTO-HW', { phase: 'hold', commitNow: true }); game.autoQ.applyAll(); game.warmGraphics();`.
      Did it hold the pace too? If so, Auto left quality unused.
   6. Force the next profile down (`+ 1`) and repeat. Did it buy pace? If not, a step down there would have been pointless.
2. Take screenshots at the same spot (the street by Bug Street, the house interior) for each profile, Medium-lean
   included, to judge sharpness.
3. On battery, watch for the panel's 40 / 48 Hz (GTX1050-BATTERY). If `refreshMs()` reads ~24 or ~21 ms, the "after"
   build should hold its profile, with `last window: paced`.
4. Measure only. Report as AUTO-HW on branch `auto-hw` with the raw logs under `docs/lba3-performance/HARDWARE/`, and
   fill in §8.

## 8. Real hardware

(empty — order 64 AUTO-HW)
