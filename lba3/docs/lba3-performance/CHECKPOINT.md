# RENDER-INV checkpoint

Branch `worktree-agent-a92b7c2d617fda38d`, merged with origin/ccr-adf00ea7-37ebl3 (02b1f7d). All fixes committed
(F1/F2, F8 draw batches with folding off, F9 lamp skip, F10 colour-only resolve, F11 Settings → Edges, benchmark).
Regression set run (see QA.md "RENDER-INV"). Audit: PERFORMANCE_AUDIT.md.

Next: the user's benchmark on this build (Medium, plugged in): read `as is` vs `depth resolve on` (what F10 saved),
`no MSAA`, `FXAA instead of MSAA`; if Medium's street GPU p50 stays above ~15 ms, decide with the user between Edges:
Fast as the Medium default and other AA. Then R1 (areas built on demand) for startup/memory.

PERF-BATTERY (2026-10-27): shadow batches cut by triangle + exact cast tests, static shadow cache, draw batches cut and
folded, sea grid around the camera, terrain drawn last, battery profile (Electron powerMonitor), background 8 fps, black
first frame after a hold. Counts and estimates: PERF_BATTERY.md. Next: the user's benchmark on battery and plugged in
(it now says which profile ran); §6 of PERF_BATTERY.md lists what to read.
