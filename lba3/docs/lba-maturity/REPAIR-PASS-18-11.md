# The user's repair pass of 18.11.2026 (from actual play) — the plan and its progress

The user (18.11, bought credits): "do what I sent you, and add an option for a fixed 30 FPS". Their brief, in short:
1. The home tutorial's references ("the tap", "the barrels") are unclear: the player can't identify the object.
2. Characters still look like connected tubes instead of designed bodies.
3. Characters lack even basic facial expressions.
4. The game does not sustain 60 FPS on the GTX 1050 laptop on battery.
No story expansion, no new regions, no unrelated features; preserve working systems and saves; reuse existing agents/tooling.
A second brief (performance and motion smoothness, High preset at a documented resolution, stable 60 FPS on the GTX 1050
as the target, never claimed without measurement; a repeatable benchmark route; bottleneck before optimizing; motion
smoothness — fixed step, interpolation, camera order; visual quality preserved; PERFORMANCE_REPORT.md) is part of phase 5.

| Phase | What | Who | State |
|---|---|---|---|
| 30 FPS | Settings → Display → Frame rate: As the screen / 60 / 30 steady (English + Hebrew) | coordinator | **done 18.11** (b377ef91) |
| 1 | Record the current build: revision, effective settings, renderer, hardware; capture the opening and a demanding outdoor scene | the desktop (GTX 1050; CLOUD_ORDERS 54) + each cloud worker for its own area | started 18.11 |
| 2 | Tutorial targets unambiguous: exact object, where, action, binding, feedback; a per-object highlight while active; off-screen cue via routes; escalating hint; save/load, remap, Tips off | coordinator (TUTOR-TARGETS.md; the worker's branch had no commits, redone) | **done 18.11**: marker over the object, edge arrow, where line at 15 s, Zoé's reminder at 35 s, Tips Off, save/load; 14/14 |
| 3 | Character form, not polygon count: shoulders, elbows, pelvis, knees, wrists/ankles, neck, tunic/sleeves; Twinsen and Zoé first; bones, clips, attachments, scale kept; checked in motion from the play camera | cloud worker CHAR-FORM (Blender via `uv`/bpy in the cloud as TWINSEN-FIGURE did; the user rejected TWINSEN-FIGURE's look 15.11 — keep the approved designs, improve form) | queued (next slot) |
| 4 | Simple readable faces: neutral, curious, concerned, pleased, determined/annoyed; blink and gaze; tied to dialogue intent; talking mouth separate | with CHAR-FORM (one worker, same rigs) | queued |
| 5 | GTX 1050 battery performance: the user's route on the packaged/desktop game; GPU actually used, render scale, effective settings, limiter, AC vs battery (separate runs), p95/p99, stalls and causes; targeted fixes; PERFORMANCE_REPORT.md; motion smoothness | the desktop measures (order 54); a cloud performance worker fixes what the evidence shows | queued |
| 6 | Verify together: tutorial + characters + faces in the benchmark; no saves/flags/transitions broken; no regression | coordinator + a final check | after 2–5 |
**Order (the user, 18.11: "I hadn't finished the previous tasks first, and you didn't publish the new version"):** first
publish v98 and finish the five jobs of 17.11 (HE-LTR, WEAPON-SWITCH, SPACEPORT-3, OVERLAP-SWEEP, MUSIC-LBA); TUTOR-TARGETS
was started and paused (its branch worktree-agent-a97564ea1b7a0bbe5 has its first commits) — resume it after them.

Resume: read the table, each worker's doc, and NEXT-SESSION.md.
