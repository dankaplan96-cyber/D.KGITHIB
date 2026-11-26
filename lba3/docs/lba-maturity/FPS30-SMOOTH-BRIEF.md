# FPS30-SMOOTH — the user's second 30 FPS brief (19.11.2026; status.md P70)

The user, after "what about making 30 FPS smoother?", sent this brief (summarised here section by section; the full
text is in the session of 19.11). It builds on FPS30 (FPS30.md, merged in v101) and overrides its priorities:
**motion blur is optional and low priority — only after the core fixes, measured, with an off switch.**

1. Inspect before editing: main loop/limiter, input, simulation/physics timing, camera, character and projectile
   animation, renderer and quality governor, area loading/background tasks; no duplicate schedulers, interpolation,
   smoothing or caps. A baseline on the same save, route, camera, resolution and settings as the verification.
2. Consistent delivery ~33.3 ms on a stable 60 Hz display: the existing rAF loop, timestamp-based, drift-resistant; no
   setInterval(33), no blind every-second skip, no drifting origin resets, no catch-up bursts, no busy-waiting; focus,
   pause/resume, window movement; rendered intervals measured apart from callback frequency (not called presentation
   timing). Priority: no repeated 50 / 66.7 ms intervals in ordinary play.
3. Input: collected between rendered frames, short presses kept, the latest input consumed before simulation and camera;
   check movement, jumping, interaction, weapon switching, sword attacks, magic-ball aiming; no smoothing, no extra
   queue or frame of delay; mouse/controller sensitivity equal at 30 and 60.
4. Simulation vs rendering: keep a working fixed step; evaluate 60 Hz simulation + 30 Hz rendering only after measuring
   CPU cost; speed, physics, combat and projectiles independent of render rate; bounded catch-up, explicit suspension;
   interpolated visual transforms only where they remove real jitter, latency accounted; reset on teleports, respawns,
   area changes, loads, cinematic cuts; never authoritative for collision or quest state.
5. Camera: follows a coherent visual state, time-based damping, no double smoothing; test running diagonally, turning
   while running, orbiting a still character, aiming the ball, entering buildings, wall and roof cutaways, camera
   collision at doors and corners; remove tiny oscillations, abrupt corrections, alternating speeds; aiming stays direct.
6. Animation by elapsed time: foot contact and stride, walk/run transitions, turning, jump preparation/air/landing,
   talking gestures and facial expressions, sword anticipation and impact, ball release and return; **animation events
   crossed between updates processed exactly once** (no lost or doubled attack, footstep, sound or release); nearby
   characters smooth; better blending without delaying actions.
7. Visible stalls (a cap does not fix 100–600 ms): first-time arrivals, door transitions, combat effects, **inventory
   opening, saving**; area construction, batch and shadow-cache rebuilds, uploads, shader preparation, allocations and
   GC, UI layout or logging; prepare ahead, bounded tasks, workers only for suitable CPU work; headroom kept; cold, warm
   and visible stalls measured apart; nothing hidden outside the benchmark.
8. Visual quality kept; no lower resolution or removed scenery first; no frame generation; no heavy blur; optional blur
   last, measured, off switch, never over aiming, the character or the UI; UI text native.
9. The governor: the target separate from quality; 33.3 / 16.7 ms budgets; a 30 cap never a false warning or a
   continuous reduction; explicit settings kept; no automatic 30↔60 switching; no OS power settings.
10. Verify before/after under matching conditions: the home tutorial, busy Citadel streets, Zeelich arrival and
    exploration, interiors and transitions, combat and precise aiming, dialogue and cinematic transitions, save/load
    and pause/resume; short repeatable tests and one sustained session. Report p50/p95/p99, the frequency of 50, 66.7
    and longer frames, CPU/GPU timings, the longest visible stalls, measurable input-handling delays (no end-to-end
    latency claim without a method), effective settings and resolution. GTX 1050 = the target (Vega 8 historical);
    battery and plugged-in apart; in the cloud, a reproducible local procedure, unverified hardware results named.

Acceptance: even ~33.3 ms on a stable 60 Hz display; no recurring missed deadlines in representative play; short inputs
and accurate aim kept; gameplay speed unchanged; no character/camera jitter or animation-event errors; visual quality
kept; 60 working. A target not met → the specific remaining bottleneck; never success on an average of 30 alone.
