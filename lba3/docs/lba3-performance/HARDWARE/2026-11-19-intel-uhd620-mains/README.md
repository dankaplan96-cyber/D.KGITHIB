# The user's benchmark, 19.11.2026 10:45 — **Intel UHD Graphics 620, plugged in** (v102, the artifact in Chrome)

Pasted by the user (Pause → Benchmark, Quality Auto as played). **The browser reported Intel(R) UHD Graphics 620**
(D3D11). **The user, 19.11: "a different computer"** — a second test machine (integrated Intel graphics), not the GTX
1050 laptop; the GTX 1050 results (18.11, battery) stand as they are. Power: **plugged in**.
Window 1280×506, **devicePixelRatio 2** (render ≈ 2560×1012 at 100 %), frame-rate limit 60 (FPS30's setting).

| Route | fps | frame p50/p95/p99/max | >33 ms | GPU p50/p95 | CPU work p50/p95 | state |
|---|---|---|---|---|---|---|
| street | 51.2 | 16.7 / 33.4 / 33.4 / 50.1 | 22 | 15.0 / 18.1 | 16.4 / 22.3 | Medium |
| interior | 60 | 16.7 / 16.8 / 16.9 / 16.9 | 0 | 8.7 / 10.4 | 5.2 / 6.7 | Medium |
| combat | 60 | 16.7 / 17 / 17.1 / 17.3 | 0 | 6.3 / 8.7 | 5.2 / 7.6 | Medium |
| transition | 60 | 16.7 / 17 / 17.2 / 17.4 | 0 | 6.1 / 9.0 | 3.9 / 6.0 | Medium → Low |
| arrival | 57.9 | 16.7 / 16.9 / 33.3 / 133.4 | 9 (8 behind the black) | 7.9 / 12.9 | 7.0 / 16.1 | Low |
| hamalayi | 60 | 16.7 / 17 / 17.1 / 17.5 | 0 | 6.4 / 7.0 | 4.6 / 5.1 | Low |

Auto: Medium by a guess, then **down to Low** at 185.6 s ("CPU pressure: 52.9 fps, CPU p90 22.3 ms, GPU p90 17.8 ms,
missed 13 %") — Low = resolution 85 %, FXAA, no shadows, 2 lamps.

Preparation behind the black: **shader warm-up longest 1013 ms** (21 steps, 1549 ms in all: the Intel driver compiles far
slower than the GTX's), draw batches longest 251 ms, geometry 121 ms; in the arrival route black frames of 83–133 ms.

## Reading (coordinator, 19.11)
- The street is the only route below 60 in play: both the GPU (p95 18.1 ms at DPR 2, 100 %) and the game's CPU work
  (p95 22.3 ms: submit main 5.8, submit other 2.9, people 1.7, other sim 2.3) are over 16.7 ms on this machine. Auto's
  step down to Low is the expected answer; the street's CPU work is PERF-ARRIVAL's item 3.
- A second, weaker machine (the user: "a different computer"): a useful low-end target — the street needs Low here
  (Auto found it by itself), the rest holds 60 at Medium. Frame Rate 30 is the natural choice on it for the street.
- The shader warm-up's 1013 ms single step is behind the black, but it is the largest black stall measured so far:
  PERF-ARRIVAL to look at splitting the warm-up per material on slow compilers.
