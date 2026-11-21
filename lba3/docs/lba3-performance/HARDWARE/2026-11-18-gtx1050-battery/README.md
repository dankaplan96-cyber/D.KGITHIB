# The user's benchmark, GTX 1050 laptop on battery (18.11.2026, build 0.49.0 / v99, the artifact in Chrome)

Pasted by the user in the session (REPAIR-PASS-18-11 phase 5's first measurement). Their own run: pause → Benchmark,
Quality Auto as played. Machine: NVIDIA GeForce GTX 1050 (D3D11), **on battery**, window 1536×819, devicePixelRatio
1.25, no frame-rate limit.

## Summary
| Route | fps | frame p50 / p95 / p99 / max ms | >33 ms frames | GPU p50 / p95 | CPU work p50 / p95 |
|---|---|---|---|---|---|
| street | 60 | 16.7 / 16.8 / 16.9 / 33.3 | 0 | 10.98 / 13.55 | 12.4 / 17.5 |
| interior | 59.9 | 16.7 / 16.8 / 16.9 / 33.3 | 0 | 10.86 / 13.52 | 8.8 / 12.2 |
| combat | 59.8 | 16.7 / 16.8 / 16.9 / 66.7 | 1 (67 ms at 12.4 s, the frame before 7 ms work) | 10.2 / 13.81 | 10.3 / 14.3 |
| transition | 59.7 | 16.7 / 16.8 / 16.9 / 33.3 | 0 | 9.85 / 13.66 | 8.2 / 14.6 |
| arrival | 56.6 | 16.7 / 16.8 / 33.3 / 266.7 | 7 (6 of them behind the black screen) | 10.59 / 13.62 | 11.2 / 18 |
| hamalayi | 60 | 16.7 / 16.8 / 16.9 / 33.3 | 0 | 9.65 / 11.58 | 6.3 / 8.3 |

Auto started on **Medium by a guess** ("nothing cached for this machine") and held it (59.7 fps over 61 s, GPU p90
≤ 14.4 ms). Medium = resolution 100 %, MSAA 2×, no bloom, plain shadow edges, shadow map 1024, 4 lamps.

## Reading (coordinator, 18.11)
- **On battery the GTX 1050 holds 60 fps at Medium in play on every route**; p99 16.9 ms everywhere but arrival.
- The street's CPU work is the highest in play (p95 17.5 ms: submit main 4 ms, other sim 2.4, people 1.6, submit
  other 1.9): the frame is GPU-waited, but the CPU has the least margin there.
- **The hitches are the arrival's scene preparation behind the black screen** (shadow batches built 116 ms, draw
  batches built 157 ms in one frame, shader warm-up) — not seen in play, but one 34 ms frame at 5.6 s is after the
  black. The combat route's single 67 ms frame had 7 ms of work before it (not the game's CPU: a GC or the browser).
- Open for phase 5: whether **High** holds 60 on battery (GPU p95 13.5–13.8 ms at Medium leaves ~3 ms), so Auto's
  guess could start higher; spreading the arrival's batch builds over the black frames (each its own step) so no
  black frame exceeds ~50 ms; the street's CPU (submit main).
