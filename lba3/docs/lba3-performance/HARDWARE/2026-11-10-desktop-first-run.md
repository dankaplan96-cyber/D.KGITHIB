# The user's new desktop, first benchmark (10.11.2026, build 0.49.0, Quality Auto as played)

**Real hardware, the user's own run** (pasted into the cloud session). Not SwiftShader.

**The browser ran the game on the processor's built-in graphics, not on the GTX 1050**: it reported
"Intel(R) UHD Graphics 630 (0x00003E9B) Direct3D11". So these numbers are an Intel UHD 630 (a desktop
integrated GPU), not the GTX 1050. Likely causes: the monitor plugged into the motherboard's video port instead of
the graphics card's, or Windows' graphics preference for the browser set to power saving, or the NVIDIA driver
missing. Rerun once the browser reports the NVIDIA card.

Window 1536×819, devicePixelRatio 1.25, frame-rate limit off, plugged in, orbit camera. Auto started at Medium
(a guess, nothing cached) and moved to Low at 152 s (CPU pressure: 47.3 fps over 5 s on the street).

| route | fps | frame p50/p95/p99/max ms | GPU p50/p95 ms | CPU work p50/p95 ms | calls (shadow) | triangles | state |
|---|---|---|---|---|---|---|---|
| street | 45.5 | 16.7 / 33.4 / 33.5 / 83.3 | 18.7 / 22.4 | 18.7 / 27.4 | 155 (21) | 507k | Medium |
| interior | 53.7 | 16.7 / 33.3 / 33.4 / 83.2 | 16.1 / 18.5 | 4.3 / 6.4 | 53 (1) | 215k | Medium |
| combat | 59.5 | 16.7 / 16.8 / 16.9 / 33.5 | 10.5 / 12.6 | 9.3 / 17.2 | 151 (55) | 233k | Medium |
| transition | 59.9 | 16.7 / 16.8 / 16.8 / 50 | 10.3 / 12.6 | 6.2 / 11.7 | 51 (0) | 216k | Medium → Low |
| arrival | 53.3 | 16.7 / 33.2 / 49.9 / 366.5 | 12.2 / 16.9 | 11.7 / 21.3 | 104 (0) | 411k | Low |
| hamalayi | 60 | 16.7 / 16.8 / 16.8 / 18 | 11.7 / 12.6 | 5.5 / 8 | 30 (0) | 105k | Low |

Notes from the run:
- Street on Medium: both GPU (18.7 ms) and CPU work (18.7 ms; submit main 6.9, other sim 2.2, people 1.6,
  physics 0.7 at 378 calls/frame) sit over a 16.7 ms frame; 31 % of frames miss the refresh.
- Interior on Medium: CPU is light (4.3 ms); the GPU (16.1 ms p50) is the limit; misses cluster at 6–12 s.
- Arrival: the hitches up to 367 ms are behind the black (shadow batches 115 ms, draw batches 249 ms, geometry
  upload 204 ms in single frames); one 133 ms frame at 4.4 s after the black.
- Preparation before the first route 6.3 s (desert 2.0 s, one step 1.6 s); shader warm-up up to 722 ms in a frame
  behind the black.
- Low (85 % resolution, FXAA, no bloom, no shadows, 2 lamps): 60 fps, frame p90 16.7, CPU p90 7, GPU p90 13.6.
