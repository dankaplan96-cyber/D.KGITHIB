# The minimum target is now the desktop's Intel UHD 630: first baseline (the desktop, 12.11.2026)

The user, 12.11: the Vega 8 laptop was sold ("the old computer was sold"), and, asked whether the desktop's own
integrated GPU should take its place as the minimum target: **"Yes, the UHD 630."** From now on the low-end numbers
are measured on this machine's Intel UHD 630 and labelled so. The GTX 1050 stays the work machine's card.

**Runner** (`2026-11-12-uhd630/electron-bench.mjs`): the desktop app's own Electron 43.7.9 through Playwright, a fresh
`--user-data-dir` each run, New Game, the game's own benchmark (orbit camera). **Two local differences, both outside
the repository:**
- a copy of the Electron runtime at another path (`lba3-bench\electron-uhd\`). The Test Lab's `electron.exe` has a
  per-app "high performance" GPU preference in Windows (set 10.11 so the app runs on the GTX 1050), and that preference
  wins over Chromium's own switches;
- a copy of `desktop/main.js` with `force_low_power_gpu` in place of `force_high_performance_gpu` (`lba3-bench\desktop-uhd\`,
  the game files from `desktop/copy-game.mjs` on `4c19c9ef`).

Each report's GPU line reads `ANGLE (Intel, Intel(R) UHD Graphics 630 (0x00003E9B) Direct3D11)`; nvidia-smi showed the GTX
1050 idle through the runs. Machine: i5-8300H, 16 GB, plugged in, window 1536×864 @ dpr 1.25, frame-rate limit off.

| run | street | interior | combat | transition | arrival | hamalayi |
|---|---|---|---|---|---|---|
| **Auto** (starts Medium, a guess) | 60 · GPU 11.2 | **46.8** · GPU 19.1 | 59.8 | 60 | 58.1 · max 150 (black) | 60 |
| **Medium** (fixed) | 60 · GPU 11.3 | **47.4** · GPU 18.5 | 59.9 | 54.6 · GPU 17.8 | 51.2 · max 133 (black) | 60 |
| **Low** (fixed) | **46.8 · one 1,583 ms frame** | 60 · GPU 10.8 | 59.9 | 60 | 52.0 · max 183 (black) | 60 |
fps; GPU = GPU time p50 in ms. Raw reports: `2026-11-12-uhd630/uhd-{auto,medium,low}-1.txt`.

**Auto's decision:** at 171.6 s, Medium → Low for GPU pressure (52.2 fps over 9 s, frame p90 33.4 ms, GPU p90 23.9 ms,
15 % missed), committed at the next scene change. On Low the last window: 60 fps, frame p90 16.7, CPU p90 2.9, GPU p90
10.6, missed 0 %. **The UHD 630 plays at Low**, as the Vega 8 did.

## Findings
1. **Medium's interior misses half its frames on the UHD 630** (47 fps, GPU 18.5–19 ms p50, frames alternating 16.7/33.3).
   Medium is the start guess for an integrated GPU; Auto needs about 3 minutes to step down. The room's GPU cost is the
   place to look (the street is cheaper than the interior here).
2. **One 1,583 ms frame on the street, outside the black, in the fixed Low run** (1.6 s into the first route after the
   preset changed to Low): the main thread spent 1,566 ms in a single `setTimeout` callback, and the report counts it as
   the route's warm-up maximum. It looks like work deferred from the change to Low that runs on its own. A player who
   picks Low in the settings may meet one freeze like it. Auto's own change to Low (at a scene change) did not show it.
   **Not investigated further: for the cloud** (the code side of the preset change).
3. Arrival's long frames are all behind the black on all three, as on the GTX 1050 (batch building, geometry upload).
4. Shadow programs: 311 ms in the preparation before the first route (Auto run), none behind the black.

**What is not measured yet:** more runs per preset (one each here); the chapter routes in play rather than the
benchmark's orbit; the battery profile (plugged in only).

Evidence label: **Automated runtime on real hardware (Intel UHD 630, the minimum target)**. Nobody played it.
