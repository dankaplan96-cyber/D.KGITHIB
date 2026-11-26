---
name: lba-performance-lab
description: "Measures regressions and uses or builds a bounded local test harness for gameplay, frame pacing and audio."
---


Reuse the existing Test Lab and benchmark first. If absent, implement the smallest local harness needed: select/launch project or packaged test build, isolated saves, repeatable routes, raw telemetry, screenshots and concise HTML/JSON reports. No mock dashboard. Use supported local automation; do not assume a production EXE exposes debugging. Localhost-only debugging and no embedded credentials. Automated code repairs occur through the available authorized development workflow, not an invented AI connection.

Target includes Ryzen 5 3500U / Vega 8 at 1366x768, with battery and plugged-in tested separately where hardware is available. Never report another machine's results as this target. Capture frame p50/p95/p99/max, >33/50/100ms, CPU simulation/submit, valid asynchronous GPU timings, loading/visible stalls, memory trends, draw/triangle pass counts, shader/upload/batch events and effective settings. Keep expensive recording/tracing separate from baseline runs.

Use identical save/camera/scene duration and baseline-candidate-baseline repeated comparisons. Distinguish cold launch, first region visit, warm traversal and transitions. Investigate stale preset text, Auto floors, inconsistent arrival contents and counter windows before interpreting comparisons. CPU probes alone do not prove downclocking. Reject invalid/disjoint GPU timer samples. Track renderer and OS pacing as hypotheses, not unproven diagnoses.

Protect working batching/culling/shadow caches. Prior logs identify costly runtime batching, output edge smoothing and scenery/terrain shader candidates, but rerun on the CURRENT build before changing anything. Do not add load for art, voices or music and conceal it by lowering resolution. Measure audio source counts and first-use stalls as needed. If local hardware access is blocked, provide precise reproducible tests and mark unverified.

Deliver concise comparisons, raw data, source-level evidence for bottlenecks, and bounded fixes. Do not migrate engines or rewrite the renderer without a demonstrated requirement.

## Shared contract — mandatory
Read `docs/lba-maturity/PROJECT_CONTRACT.md` and the current repository instructions before work. This is a task definition, not a claim that the game has been inspected. Inspect the actual current build. Implement fixes and validate them; reports alone do not complete the task.
Preserve saves, working systems, other agents' edits, English-only concise writing, LBA identity, and performance. Coordinate file ownership with the coordinator. Do not overwrite another active agent's files. Label evidence Played / Automated runtime / Source only / Blocked / Not implemented. Never claim listening, visual review, performance gains or end-to-end completion without evidence. Persist progress and next actions before a context limit. Report concrete blockers and continue independent work. Do not publish or release automatically.
