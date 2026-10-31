# REV-TY-3 — independent re-review of 0.25.1 (41363db): the REV-TY-1/REV-TY-2 fixes

Reviewer: the lba3-reviewer agent (report relayed by the main session; the agent could not write files). No game
source changed. 41363db on :8144, 0.25.0 (f0cc0a7) on :8157 for the scatter comparison; SwiftShader 1280×720;
REV-TY-1/2's isolated saves reused. ISO lines in the logs are flag/harness setups, not play.

Verdict: accepted for the tested scope except three partial fixes (TY-1 D1, TY-1 D7, TY-2 D3).

| Defect | Result |
|---|---|
| TY-1 D1 shop hid Nell/bench/glow; shop and beds on paths | PARTIAL — paths clear, Nell and bench seen; the coupler's glow is hidden by the shop roof from both path points and by Twinsen's own body at the bench prompt spot; heat 0.05/0.5/0.9 look alike at room scale (toast and sound still cue it). shots/coupler-at-bench-heat-05-50-90.jpg, coupler-at-bench-other-camera.jpg |
| TY-1 D2 Arthur's bench hidden | FIXED (shots/ch2-house-bench.jpg) |
| TY-1 D3 colliders | FIXED (pipe stops him; jump clears it; posts and trough solid; lane crossable at the gap) |
| TY-1 D4 board/meter static | FIXED (small at room scale; Twinsen partly covers the board at the desk) |
| TY-1 D5 rewards lost on save | FIXED for new saves (old 0.24/0.25.0 saves stay short: no flag to recover from) |
| TY-1 D6 prologue pliers | FIXED |
| TY-1 D7 pump pose | PARTIAL — tulip bed gone, sign faces both ways; hands 0.40–0.47 m off on the first frame, 0.15–0.20 m at both ends of the stroke (the developer's check covers 0.2–0.47 s only); the step to the grip slides (N2) |
| TY-1 D8 coupler ownership | FIXED |
| TY-1 test weakness | FIXED |
| TY-2 D1 late press after success | FIXED (also repairs the 0.25.0 contradictory save) |
| TY-2 D2 success with the tap shut | FIXED |
| TY-2 D3 chapter 10 vs the pair | PARTIAL — see N1 |
| TY-2 D4 coin lost on save | FIXED |
| TY-2 D5 cradle | FIXED |
| TY-2 D6 crate north side | FIXED |
| TY-2 D7 pair before the intro | FIXED |
| chapter10.mjs flaky drone step | FIXED (3/3 DONE, no ISO assist used); weakness N4 |

New defects
- N1 (Low–Medium, narrative): c10_bal_2/3 say the relays are "put on masts… up high", but the Citadel relay sits on
  the manifold in the underground valve room (c10_mira_1, c10_valves_ok) and the dome relay indoors beside the
  telescope (c10_relay_dome); c10_bal_pair ("nobody to keep them cool, they'd trip") follows "every station needs a
  friend standing by" in the same scene. Neither rule is played in chapter 10. rev-ch10-pair.log
- N2 (Low, motion): the pump prompt appears 1.12–1.18 m from the grip; pressing E moves him there in ~0.22 s
  (~5 m/s, ignoring collision) with a quarter walk cycle — both feet slide ~1 m. shots/pump-step-and-stroke.jpg
- N3 (Low, UX): after pulling the valve pin from the trough side ("Now the handle") there is no pump prompt there;
  from the north only Bram's Talk shows; the pump answers only within 1.2 m of the grip on the west side.
- N4 (Low, test): with the throw limit forced to 0 every drone is ISO-killed and logged, yet chapter10.mjs still
  prints DONE and exits 0; each throw still teleports/aims first (the step is proved by the throw key only).

Adjacent risks checked: scatter (12 instances shrunk inside the cleared rectangles incl. one tree and its collider;
129 tulips dropped as whole beds, 73 of them in three beds touching the rectangles, ≤2.2 m outside; nothing else of
6,380 changed); owed rewards (settled on load only; no duplicates in five cases; nothing stays owed past a load);
pump glide pauses with the game. Regression on :8144: townlife, workshop, chapter10 ×3, prologue, chapter2, house,
transitions, givers, save-migration — all exit 0, no page errors.

Not covered: GPU frame rate (BLOCKED); gamepad, touch, audio, focus loss, chapters 3–9 and 11–12 with these states;
the board's stage 1 in a real save after c1_water.

Files: scripts rev.mjs, scatter.mjs, scatter-diff.js, ch10-isoprobe.mjs, probe-inst.mjs; logs rev-*.log/json,
townlife-test.log, workshop-test.log, chapter10-run1..3.log, ch10-isoprobe.log, reg-*.log, scatter-diff.log;
saves save-*.json (origin localhost:8144); shots/*.jpg.
