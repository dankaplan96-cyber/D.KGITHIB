# Performance and opening team

The main Claude Code session coordinates three agents. This kit extends the previous LBA3 team; preserve existing definitions and instructions. Use the CURRENT source and build. No new weapons, story chapters, unrelated systems, or engine rewrite in this pass.

## Scope and ownership

- lba3-runtime-performance-engineer: measured CPU/GPU workload, loading and resource-lifecycle optimizations.
- lba3-frame-pacing-hardware-engineer: frame delivery, input/simulation timing, hardware-aware presets and justified optional adaptation.
- lba3-opening-cinematic-animator: acting, animation, staging, camera and synchronization in the existing opening.

Assign exact paths per task. Only one writer touches shared frame-loop, renderer, rig or cinematic files at a time. Independent read-only profiling may be separate, but benchmarks must not run concurrently with other heavy jobs on the same hardware. Do not confuse contention from agents/render jobs with the game's steady-state performance.

## Work sequence

1. Inspect instructions, current game, available hardware, capture tools and the opening. Establish an identified baseline with comparable routes and settings.
2. Runtime engineer isolates the largest measured bottleneck and implements a focused fix. Verify behaviour and performance.
3. Frame-pacing engineer addresses remaining hitches, latency and settings behaviour using the candidate from step 2. Do not stack unmeasured changes.
4. Opening animator improves the observed weak shots. Coordinate any renderer/rig dependency explicitly.
5. Review equivalent views and playback; repeat the benchmark routes and skip/handoff checks on the integrated candidate. Use an installed reviewer where available; otherwise explicitly label main-session self-review.
6. Update existing STATE/BACKLOG/QA documents with revision, evidence, results, gaps and next exact step. Finish with the existing final release auditor when all development work is complete; this kit does not replace that gate.

## Measurement contract

Record revision/build, hardware/renderer, OS/runtime, viewport/internal resolution/DPR, quality, route, warmup and duration. Compare identical conditions. Include average FPS, frame-time p50/p95/p99, significant stalls and relevant workload metrics. CPU render submission is not GPU execution. Synthetic timing tests and software rendering cannot certify the user's hardware FPS. If no suitable target hardware exists, leave that part unverified and continue useful profiling.

Use agreed targets rather than inventing flattering thresholds. A 60 FPS budget is about 16.7 ms/frame and a 30 FPS budget about 33.3 ms/frame; budgets alone do not prove smoothness. Check outliers, pacing, response and visual quality. Separate startup/compilation from warmed play. Attribute changes honestly and retain limitations.

## Verification

Protect movement speed, aim, animation/action timing, collision, quests and saves. Recheck populated outdoors, an interior, combat, scene transition, repeated route, and opening-to-gameplay handoff. Inspect visual cost at equivalent settings and verify resource cleanup. No global blur or game-time slowdown to fake performance.

Use project tools and permissions. No paid external jobs, automatic driver/security overrides, unbounded retry loops or publishing. Agents work within a session and its usage limits; checkpoint before stopping. Missing runtime/audio/render tools mean BLOCKED for the affected check, not PASS. A written agent definition does not start a background service.
