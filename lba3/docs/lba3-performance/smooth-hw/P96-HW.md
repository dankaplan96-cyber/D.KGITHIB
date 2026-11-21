# P96-HW — the 1 px keep-alive and the 0.12 tolerance on the GTX 1050, in the 57 Hz state (the desktop, 21.11, 22:37–23:10)

**Where:**
- The GTX 1050 Acer, plugged in, 100 %. Headed Chrome 158 (Playwright `channel: chrome`; the local copies add `--use-angle=d3d11 --ignore-gpu-blocklist --window-size=1400,920`).
- The game on the NVIDIA (ANGLE D3D11). Medium, Follow, 1366×768, Frame Rate 30.
- **The clock was in the 57 Hz state throughout:** rAF p50 17.4–17.7 ms.
- **v121** = `bf348951` (P94, before P96), served on :8125. **v122** = `31656587` (P96), on :8126.

## 1. The cloud's tests: `tests/fps30-feel.mjs` RATES=real (T1–T3, keyboard / mouse+keys) and `tests/smooth-routes.mjs` street at 30

Two rounds, v121 and v122 interleaved, 3 passes each (`p96/run.sh`, outputs `p96/*.txt`).

| | v121 | v122 |
|---|---|---|
| fps30-feel T1–T3: drawn intervals ≥ 45 ms, total over 18 passes | **53** (every pass had some) | **24** (9 of 18 passes had none) |
| the longest per pass | 386–443 ms | 36–473 ms |
| smooth-routes street at 30: intervals > 50 ms per pass (6 passes) | 6, 8, 10, 7, 6, 8 (**45**) | 2, 5, 3, 3, 4, 5 (**22**) |
| street GPU ms p50 (the game's timer) | 5.8–7.8 | **16.2–17.5** |

## 2. The desktop's runner (`fps30feel.mjs`, every rAF callback and the presented frames from a CDP trace), T2 street, 30

| | gaps ≥ 45 ms (rAF) per pass | drawn frames one refresh early (< 25 ms) per pass | motion spikes (hero) | GPU ms p50 (timer) |
|---|---|---|---|---|
| v121 (3 passes) | 4, 5, 5 | **23, 23, 23** | 4–8 / 141–145 | 6.0–7.9 |
| v122 (5 passes) | **0, 0, 0, 0, 0** | **0, 0, 0, 0, 0** | 0 / 144–145 | **17.7–19.6** |
| v122 + the diagnosis's own change on every callback (opaque 1 px, `DAMAGE=1`; T1 and T2, 2 passes each) | 0 | 0–6 | 0 | 7.5–8.7 |

## 3. Reading

- **The tolerance (0.08 → 0.12) works:** the one-refresh-early frames went from 23 per pass to 0 in v122.
- **The keep-alive removes most of the gaps but not all of them:**
  - in the desktop's runner, 0 gaps in all 5 passes;
  - in the cloud's two tests, the count halves (53 → 24 ≥ 45 ms intervals, 45 → 22 on the street) and gaps of ~400 ms remain in half the passes.
  - The difference between the runners is not explained. Candidates:
    - the routes (the harbour quay's T1–T3 against the street);
    - T3's mouse moves;
    - a skipped refresh that does not reach `_keepAlive` (only the two early-return paths call it);
    - the mark's 1–2 % alpha against an opaque change.
- **The game's GPU timer reads 2.5–3× higher with v122** (16–20 ms p50 against 6–8), and not with the diagnosis's opaque change on every callback (7.5–8.7).
  - nvidia-smi averaged over the whole run did not rise (utilization 7 % with v122 against 12 % with v121), so this is probably the timer query also spanning the compositor's extra presents, not the GPU working three times as hard.
  - **Not settled.** The timer's reading now crosses 16.7 ms, so anything that reads it (Auto's GPU budget, the benchmark's GPU column) would misjudge the GPU at 30. Worth checking before v122 ships to Auto.
- Not run: battery; the desktop app's Electron build of v122; 60 (unchanged by P96, the mark is only on skipped refreshes).
