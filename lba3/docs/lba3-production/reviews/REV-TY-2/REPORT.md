# REV-TY-2 — independent review of 0.25.0 (3dbaa24): Baldino's workshop and The Test Pair

Reviewer: the lba3-reviewer agent (report relayed by the main session; the agent could not write files). No game
source changed. Build: main checkout 926b21e (src/tests identical to 3dbaa24), headless Chromium + SwiftShader.
Route: playthrough segments 01–05 chained by real saves (0 deaths, 0 assists), into the workshop by input; chapter 3
finished by input to chapter 4 on two routes (pair first; save during Zoé's broadcast → Continue → pair with Baldino
away → Vesk and the shaft). Chapter 10 by flags only. tests/workshop.mjs: 25/25 (QA.md and the commit say 26).

Verdict: workshop room, chapter 3's main path, saves and the chapter-10 hook accepted for the tested scope; The Test
Pair not accepted as is (D1, D2 can leave it contradictory; D3 rules don't match the chapter-10 network).

| Criterion | Result |
|---|---|
| Years of invention, maintenance, unfinished experiments | PASS |
| Clearly organised active project | PASS |
| Failed experiment with a humorous consequence | PASS (carried by text; the stain/lid are faint at room distance) |
| Collaboration with Zeelich engineers | PASS (Ilo named only) |
| Inventions have limits; no unexplained gadget | PASS |
| Network rules taught early with a recoverable failure | FAIL (D3) |
| Failures (no sight; overheat) recoverable | PASS |
| Hoist lowered mid-sync resets; tap closed early trips | PASS |
| Tap closed late | FAIL (D2) |
| Leaving / pausing while running | PASS |
| Reward once, no duplication | PASS (D4) |
| Pair stays talking after success | FAIL after D1 |
| Save/Continue in every state | PASS (D1, D4) |
| Baldino away: the fee tin pays | PASS |
| Baldino when the story needs him; chapter 3 not blocked | PASS |
| Collision/access around new props | PASS with D5, D6 |
| Readable from the room camera | PASS (fee tin behind relay A; toy mill hidden from one spot) |
| Chapter-10 line in network.js | PASS in code, FAIL in meaning (D3) |
| English, short, natural; no invented canon | PASS |
| Performance (GPU) | BLOCKED; focus loss, gamepad, touch, audio NOT TESTED |

Defects
- D1 (Medium-Low): an E press at the crank/tap/lever in the last ~0.3 s of the sync is applied after success: the
  pair pays, then the hoist lowers; relay B blinks without a beam; the crank refuses ("They're talking"); survives
  Save/Continue. Cause: delayed act callbacks in src/game/story/workshop.js don't re-check `done`. rev-race.log,
  shots/race-after-continue.jpg
- D2 (Low-Medium): the pair can succeed with the tap shut (shut at sync 0.45 → success at heat 0.70); the tap's look
  then says it drips. rev-tapshut.log, shots/tapshut-after.jpg
- D3 (Medium, story logic): chapter 10's relays run on local power with a friend standing by (c10_bal_3), across
  islands, no couplers; the new line "Same rules out there: a clear line, couplers cool" contradicts it; c10_bal_2
  still says "I built these" as new. Neither rule is played in chapter 10.
- D4 (Low): the 5-kash fee is lost if saved before pickup. rev-loss.log (same class as REV-TY-1 D5)
- D5 (Low, collision): Twinsen can stand inside the lowered relay cradle (no collider on cradle/low hoist bars).
- D6 (Low, access): from the north side E at the crate gives Ilo's crate look, not the bonus (west side works).
- D7 (Low, story order): the pair can be started before Baldino's introduction (sight/drip lines before "At last!").
- Notes: tea stain faint; cool coupler already orange (glow differs only by a red halo); fee tin hidden.

Risks: chapters 4–9, 11–12 not played with the workshop state; the bot spent ~410 s stuck by the platform console
before the shield on both routes (outdoors, probably bot pathing, not compared with 0.24.0); after Continue
mid-broadcast the objective reads "Open the platform shield…" (existing chapter-3 behaviour).

Evidence here: rev.mjs, probe.mjs, chain.sh, run*.sh, seg06-*.mjs; rev-*.log/json, seg0*.log, probe.log,
workshop-test.log; isolated saves save-*.json; shots/*.jpg.
