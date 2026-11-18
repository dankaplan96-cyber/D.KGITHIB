# FPS30 — the user's brief (18.11.2026, phase 5 of REPAIR-PASS-18-11; status.md P70)

The user: "In task 5 on the game's speed, check whether 30 fps can be done", followed by this brief (verbatim):

TASK: Implement and validate a smooth, responsive 30 FPS mode for LBA3: The Awakening, while preserving the existing
60 FPS option. Work in the existing project. Read its instructions and inspect the actual game loop, renderer, input
handling, animation system, camera, quality governor, and benchmarks before changing anything. Implement the
improvements. Do not stop at a proposal.

GOAL — Make 30 FPS a deliberate, comfortable option for battery-powered and lower-performance computers. Do not claim
that 30 FPS equals native 60 FPS. Do not replace performance optimization with a frame-rate cap. Preserve the game's
visuals, gameplay speed, and responsiveness.

1. ESTABLISH A REAL BASELINE — Measure the current game at: unrestricted frame rate; a 60 FPS target; a 30 FPS target.
Use identical saves, routes, camera movement, and effective quality. Test plugged-in and battery operation separately
when hardware is available. The latest reported machine has a GTX 1050. Earlier Vega 8 results belong to a different
hardware configuration. Record: actual rendering resolution and quality settings; frame intervals and p50/p95/p99; CPU
and GPU timings where supported; visible stalls and loading stalls separately; camera and aiming behavior; cold first
visits and repeated visits. If running in the cloud, implement and test what is available, then provide a reproducible
hardware test. Do not invent GTX 1050 results.

2. IMPLEMENT EVEN FRAME PACING — On a stable 60 Hz display, target one new game frame every two refreshes, approximately
33.3 ms apart. Inspect and reuse the existing scheduler where possible. Use requestAnimationFrame timestamps and a
drift-resistant schedule. Do not rely on setInterval(33) as the rendering clock. Do not blindly skip every second
callback on every display refresh rate. Handle missed deadlines without bursts of catch-up renders. Avoid accidental
double caps from the game, Electron, and another scheduler. Support pause, resume, loss of focus, and display changes
without large accumulated time steps. Measure actual rendered-frame intervals, not just callback frequency. Do not label
requestAnimationFrame timing as verified display presentation timing.

3. KEEP GAMEPLAY AND INPUT RESPONSIVE — Input collection must continue between rendered frames. Capture short
press/release events so taps are not lost. Separate rendering frequency from gameplay simulation. Preserve an existing
stable fixed timestep. If necessary and affordable, use a 60 Hz simulation with 30 Hz rendering. Do not increase CPU
usage blindly: keep player movement, combat, and relevant collision checks timely; schedule distant AI separately where
safe; bound catch-up simulation after stalls; do not change movement speed or attack timing with frame rate. Process the
newest available input before the relevant simulation and camera update. Never add input smoothing merely to disguise
low FPS.

4. FIX CAMERA AND ANIMATION JITTER — Inspect whether the camera follows simulation transforms while the character is
drawn from a different interpolated state. Keep the displayed character and camera coherent. Use time-based camera
damping, not a fixed smoothing factor per frame. Avoid adding noticeable camera lag, especially during aiming. Where
appropriate, interpolate displayed transforms between simulation states. Measure the added latency rather than assuming
interpolation is always beneficial. Reset interpolation on: teleports and area transitions; respawns; camera cuts;
loading a save. Drive animation using elapsed time. Preserve walk/run speed, foot contact, turns, jump preparation and
landing, and magic-ball release timing. Do not reduce nearby character animation to 10–15 FPS. Do not change hit
detection to match interpolated visual poses.

5. MAKE AIMING COMFORTABLE — Test the magic ball with mouse, keyboard, and controller where supported. Ensure: aiming
sensitivity is consistent at 30 and 60 FPS; short inputs are registered; the targeting indicator agrees with the actual
shot; the ball releases at the intended animation event; camera smoothing does not make aim feel heavy; collision
remains reliable during fast projectile movement. Preserve existing targeting assistance unless a measured problem
requires a specific correction.

6. REMOVE STALLS THAT A CAP CANNOT FIX — Investigate remaining long tasks: area construction; static and shadow batch
rebuilding; geometry and texture uploads; shader preparation; save operations; garbage collection and repeated
allocations. Reuse prepared resources where correct. Split necessary preparation into bounded work or use suitable
workers for CPU-only preparation. Do not move all work before the benchmark and call the problem solved. Verify real
first-time arrivals and visible gameplay. Retain headroom below the 33.3 ms deadline. Do not automatically spend every
saved millisecond on extra effects.

7. PRESERVE IMAGE QUALITY — Keep characters, readable scenery, important shadows, and interface clarity. Do not enable
heavy motion blur as the main solution. Do not add frame generation or another expensive rendering pipeline for this
task. An optional subtle motion-blur experiment is acceptable only after pacing and input are fixed, with measured cost
and an off switch. It must not blur the UI, aiming feedback, or important action. Keep UI text at native resolution. If
the existing UI can update independently at display refresh rate, preserve that behavior without redrawing the entire
3D scene.

8. SETTINGS AND AUTO MODE — Provide clear English options: Frame Rate: 30 / 60 / Unlimited. Keep frame-rate selection
distinct from graphics quality. Preserve the user's explicit selection. Auto quality must use the selected frame budget:
approximately 16.7 ms for 60 FPS; approximately 33.3 ms for 30 FPS. Use sustained measurements and hysteresis to avoid
oscillation. Do not interpret an intentional 30 FPS cap as performance failure. Do not automatically bounce between 30
and 60 during gameplay. Do not change operating-system power settings without the user.

9. VERIFY IN REAL GAMEPLAY — Test: the home tutorial; a busy Citadel street; Zeelich arrival and exploration; furnished
interiors and door transitions; running and rotating the camera together; ball aiming and repeated throws; sword combat;
dialogue and cutscenes; save/load, pause/resume, and alt-tab. Run a sustained representative session as well as short
repeatable benchmarks. Compare the same scenes before and after. Check for: regular frame delivery near 33.3 ms on a
stable 60 Hz display; repeated 50/66.7 ms frame intervals; missed input; changed gameplay speed; camera judder; sliding
feet; mistimed attacks; new loading stalls. Treat these as acceptance targets, not results you can claim without
measurement.

10. DELIVER — Provide: the implemented changes and affected files; before/after measurements under matching conditions;
remaining limitations; a recommended setting for battery and plugged-in play, supported by actual measurements; a short
local test procedure if target hardware was unavailable. Keep 60 FPS optimization as an ongoing goal. The result should
be a reliable optional 30 FPS mode, not a renamed low-quality preset or a claim that all performance problems are fixed.

## Context for the worker
- What exists: P66 (b377ef91): Settings → Display → Frame rate (As the screen / 60 / 30 steady), main.js `frameCapMs`
  (applySettings `changed('fps')`; the frame loop's `cap`, ~line 2841; `frame`, ~2923); `renderer.budgetMs`.
- The user's own measurement (GTX 1050, battery, Medium, uncapped, v99):
  docs/lba3-performance/HARDWARE/2026-11-18-gtx1050-battery/README.md — 60 fps in play on every route; stalls only
  behind the arrival's black screen (batch builds 116–264 ms frames).
- The in-game benchmark (pause → Benchmark: src/engine/bench.js, benchgpu.js, perf.js), Auto quality
  (src/engine/autoquality.js, autoapply.js, autofit.js), the desktop's measuring orders (tools/testlab/CLOUD_ORDERS.md).
- The user plays the artifact in Chrome (not the desktop build); no Electron build is to be made (artifact only).
