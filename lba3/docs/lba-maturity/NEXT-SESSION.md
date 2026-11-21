# Next session — where we stand and what comes next (written 17.11.2026, updated 18.11)

- Night: TEST-DEBT merged (well-town 32/32, world-consistency 37/37, 06-zeelich from base-05 PASS, slidetraps Citadel house corner fixed via world.js rocks; harbour strip + camclear ch10 filed). world.js awaits the next publish. Running: WORLD-POLISH-3 (+ harbour strip), COMBAT-30 (dodge at 30, follow-through), CAMERA-NIGHT (after-talk Follow, camfollow, single-frame steps).
- Night 21–22.11: running P94 (30 FPS feel), TEST-DEBT (well-town, slidetraps, world-consistency, 06-zeelich fixture, fps30 D), WORLD-POLISH-3 (Ballastra coplanar 128, Corla talk reach, P58 leftovers). v120 = P92 UI + HE infinitive prompts, after hebrew + ui-p92 rerun. Full test at the end of the night.
- v118 (21.11): P93 depot, P90/P91 story and dialogue, P58-HW station occluders published (opening-tutorial 43/43, dialogue-check PASS). Running: P94, P92, P95.
- v116 (21.11): P65-2 overlap fixes (Hamalayi, desert, isles) published. P90+P91 narrative worker started; P94 (30 FPS feel) queued after SMOOTH-1, local order 62.
- v115 (21.11): FACE-3 (sign/Corla/Fixed-Free talk shots) + the P91 four dialogue lines + P92 Kell lift labels published. fps30 D fails only in the full run (also before the merge: order-dependent). P93 depot worker running.
**21.11 09:58: v114 published** (artifact 1795255077-5964): P88 — 30 FPS counted in refreshes (the 33.33 ms grid drifted on the user's 59.9 Hz screen). Running: P65-2 overlaps, FACE-3 (both cloud workers; FACE-3 also edits main.js — merge with care). Local: order 60 (60.0 FPS30-PRESENT first).

**21.11 08:54: v113 published** (artifact 1795251266-3bea): P87c — the off-the-wall slate/sand repaint only when their content changes. Night queue empty; waiting on the user (GTX 1050 runs, play judgements) and the local agent (order 57 JOINTS-BLENDER).

**21.11 07:01: v112 published** (artifact 1795244501-57a8): P87b — textures.js cloneTex at 13 first-visit clone sites; 4 canvases (2.5 MB) no longer re-sent on revisits. Next candidate: offwall.js repaints Desert Island slate/sand (2 MB) after almost every area build.

**21.11 05:05: v111 published** (artifact 1795237541-4549): P87 ARRIVAL-2 — draw-batch units yield after 4 ms, texture array without a copy, the twin clone no longer re-uploads Citadel (first frame back 91→48 ms, 5.7 MB→536 KB). arrival-steps 12/12 on a quiet machine. Open: other texture clones (interiors, architecture, props-esmer) unprobed; real-GPU numbers.

**21.11 04:07: v110 published** (artifact 1795234031-30ec): P86 FACE-2 — the dialogue camera favours the speaker (head 73→131–134 px), Twinsen's face seen, expressions carried by head and chest (FACE-2.md). P87 ARRIVAL-2 still running.

**21.11 night: v106–v109 published** (v109 = artifact 1795226187-b9be, 510 files): P80 puzzles phases 1–2 (8 puzzles reworked), the dialogue pass on the new text, JOINTS-BLENDER 5–7 (the local agent), P83 9–10 (Tali's court behind the School, Zeelich Spaceport through a terminal), travel.mjs 27/27. POLISH-SWEEP: no defect; HIDDEN-TRIS (cloud + GTX 1050): no fix. Next: P86 FACE-2, P87 ARRIVAL-2.

**20.11 evening: v105 published (artifact 1795204218-822c, 510 files)**: FULL-TEST done (FULL-TEST.md: every suite and the chain 01→14 green or known); fixed: Sefa's empty dome after chapter 13 (balances.js cast), Pema and the ship's Board prompt, Copy diagnostics; P83's story decisions 1–6 (the bore's rule, "What we know" in the journal, the stop's days, the vehicles, the opening caption, Gilbert's charts). Next in order: P80 puzzles, then P83 9–10 (the School with Tali's court, Zeelich Spaceport), FACE-2 proposed. Local agent: orders 57 JOINTS-BLENDER, 58 POLISH-SWEEP, 59 HIDDEN-TRIS-HW.

**20.11: v104 published (artifact 1795169723-2ded, 510 files)**: REVIEW-TASKS 2–6 (EXP-3 chapters 12–13, VESK, TUT-MYSTERY,
MILLS, MIDDLE-VARIETY), P81 (all four scenes, campaign pass, revisits), JOINTS-BLENDER steps 1–4 (the local agent).
Next: THE FULL TEST (FULL-TEST.md: REPAIR-PASS phase 6 + P79), then PUZZLES (P80). The local agent continues
JOINTS-BLENDER (sword, landing, walk-to-stop, pickup).

**20.11: v103 published (artifact 1795160743-bd29, 509 files)**: STORY-FIX, DIALOGUE-2 (with FRESH-EYES), FACE-1 gaps
and brows for 41 characters, BOOT-FAIL (P73), FPS30-SMOOTH (P70: footsteps, two 60 Hz steps at the 30 limit, blur off),
PERF-ARRIVAL (P67 phase 5: arrival preparation in slices). Next: REPAIR-PASS phase 6 = the one full test at the end (the
user, 20.11: minimal tests while working); then the paused REVIEW-TASKS 2–7 (EXP-3.md has task 2's design). Waiting on
the user: Frame Rates benchmark (GTX 1050, AC and battery), the story issues S-1…S-9 (DIALOGUE-2.md).

**19.11: STORY-FIX merged** (plan item 4; STORY-FIX.md, story-fix.mjs 15/15): Dallan/the dock guard, chapter 8's
shelters vs the cart, Gilbert "Grandpa" (Arthur's name for him), the hostel cook and foreman, Kesh's after-vent lines.
Open for the user: Vesk's "three days" in chapter 8 vs chapters 9–10; dl_carving's "second tick" (left). Not yet
published (with PERF-ARRIVAL, then phase 6).

**19.11: v102 published (artifact 1795068384-abbc)**: CAVE-LOOK (P69: Tralu's cave reads as a cave — rock walls, ledge,
light pools). No worker running. Waiting on the user: the Frame Rates benchmark, play at 30 with F9, a look at the cave,
faces and the tutorial's markers. Open from CAVE-LOOK: the floor busy/dark, the guard house olive under the key light.

**19.11: v101 published (artifact 1795066979-494f, 509 files)**: FPS30 (P70: the 30 cap holds — a grid of due times,
Frame Rate 30/60/Unlimited, Auto on the chosen budget, Pause → Benchmark: Frame Rates), CAVE-STAIR (P69: the rock, the
stairs, the landing, the cave's defects), BAKE-URL (the artifact now loads its baked geometry, bake.wasm). Waiting: the
user's Frame Rates benchmark (plugged in / battery) and play at 30 with F9; CAVE-LOOK (the cave's interior) running.

**18.11 (evening): v100 published (artifact 1795025443-0d2c, 509 of 512 files)**: TUTOR-TARGETS (P67 ph. 2), HE-FONT
(P68: Rubik's Hebrew, the minimap stays right), FACE-1 (P67 ph. 4: expressions, gaze), CHAR-FORM (P67 ph. 3: Twinsen's
and Zoé's body form). Running on worker branches: CAVE-STAIR (P69, Tralu's cave and its stairs: the user — "a rock at the
entrance, the stairs in the air, inside everything is weird") and FPS30 (P70, phase 5: FPS30-BRIEF.md). Merge each when
it reports, then v101.

**18.11 (later): TUTOR-TARGETS done** (REPAIR-PASS phase 2, TUTOR-TARGETS.md; tests/tutor-targets.mjs 14/14): the
opening's things marked in the world (gold marker, edge arrow, where line, Zoé's reminder). Not yet published (v100 with
the next batch). Next in REPAIR-PASS: CHAR-FORM + FACE (phases 3–4), then performance (phase 5).

**18.11: v99 published (artifact 1795020976-8069): MUSIC-LBA (P56) and OVERLAP-SWEEP (P65, the user's Mill Lane landing
and the sweep's fixes; its remainder listed in OVERLAP-SWEEP.md) merged — both stopped early by the spend limit, merged as
committed; the music needs the user's ear (A/B clips in captures/music-lba/ if made). Next: the repair pass of 18.11.**

**18.11: v98 published (artifact 1795019513-c498, 508 of 512 files).** Merged and in it: everything listed below under
"Merged since v97", plus HE-LTR (P54), WEAPON-SWITCH (P60–P61), SPACEPORT-3 (P62–P64) and the 30 FPS option (P66).
Still open from 17.11: OVERLAP-SWEEP (P65, branch worktree-agent-a85740641e227748f, unfinished) and MUSIC-LBA (P56, branch
worktree-agent-a801f1aa8c8b49a35, unfinished) — resume them by message (SendMessage) or read their branches. Then the
repair pass of 18.11 (REPAIR-PASS-18-11.md; TUTOR-TARGETS paused on worktree-agent-a97564ea1b7a0bbe5). The user (18.11):
low on credits — keep tests minimal; artifact only.

The user, 17.11: "let's do all the fixes I wrote so far, I think the tokens are running out, and then a plan to continue".
Read this first, then `status.md` (the playtest inbox P1–P65), `WORKPLAN-2026-11-09.md` and `tools/testlab/CLOUD_ORDERS.md`.

## Standing rules (unchanged)
- **The user, 20.11: keep tests to a minimum while working; one full test of everything at the end.**
- Replies to the user in Hebrew (their app may show them translated: if they paste English back, that is why).
- The artifact only: **no downloadable/desktop builds** until the user asks (no `[build]` in commit messages).
- Every user report or wish → a P-row in status.md the same day; the user is told where it went.
- Every new English player line gets its Hebrew the same day (`src/game/text/he/<file>.js`, then `node tools/he-bundle.mjs`;
  dialogue-check fails otherwise). Only the TEXT is right-to-left in Hebrew (HE-LTR).
- The artifact holds at most 512 files (~507 used after v97 + chapter 11): pack new modules; Hebrew costs nothing.
- No spoilers past chapter 2 in replies or pictures; expansion pictures are team-only.
- Never commit LBA1/LBA2 files; label results "Automated runtime only"; old saves must load.
- The machine is shared: at most 2–3 workers at once (5 at once crashed every test run on 17.11).

## Merged since v97 (not yet published — publish v98 after a test round)
Zoé's office eased (P51) · the gauge strip's own look (P53) · HOSTEL-CUT-2 (P50) · the sound hint on the title (P55) ·
the dialogue box narrower and centred (P57) · the cut home after "Let's go home, Zoé" (P59) · EXP-2: the expansion's
chapter 11 · AUDIT-FIX-v96 (P49 quay paving, P52 the bore's grating, z-fighting 38 → 0, the chain runs 15/15 unaided,
camera crowns, Hebrew wording, KNOWN-FAILING.md).

## Workers that were running at the end of 17.11 (their branches: worktree-agent-*; merge each when it reports)
| Job | What | Doc |
|---|---|---|
| HE-LTR (P54) | Hebrew: only the text RTL; layout, order and arrows as in English | HE-LTR.md |
| MUSIC-LBA (P56) | original pieces in the spirit of LBA1/2, a recurring theme; A/B clips for the user | MUSIC-LBA.md |
| WEAPON-SWITCH (P60, P61) | comfortable weapon switching; Arthur's Pocket Set understandable | WEAPON-SWITCH.md |
| OVERLAP-SWEEP (P65) | every region and room: interpenetration, z-fighting, sunk/floating, decks into terrain | OVERLAP-SWEEP.md |
| SPACEPORT-3 (P62–P64) | Doran's errand before the spaceport and reliably at the ship; the terminal gate on the right side; the pad alive | SPACEPORT-3.md |
If a worker's branch exists without a report (the session ended), read its last commits and its doc's resume point.

## Open with the user
- P58 "Twinsen hidden" at the station: not reproduced — needs the spot (F9 shows the numbers) or a picture of where he stands.
- F-7: a note on data derived from the originals (assets/lba1, assets/lba2/islands, desert-layout.js) before any public
  release — the user's decision.
- The user's own play of the whole game (none yet) and their ear on the music (MUSIC-LBA's clips).

## The plan to continue (in order)
0. **Queued by the user (20.11), not to be forgotten: PUZZLES-BRIEF.md (P80)** — after REVIEW-TASKS-19-11 and the full test.
1. **Finish the five jobs above, test together, publish v98** (artifact only).
2. **Expansion**: EXP-3 = W-4 (the harbour warehouse, the House of Balances) and chapter 12 `balances` (EXP-PLAN-2.md §3,
   resume points in its report); then chapter 13 `survey` (the way home, the parked OG-2); then the network's expansion
   steps (bring OG-6/NW-1 back to `tests/playthrough/13-network.mjs`, parked in `tools/expansion-parked/`).
3. **Second release audit** on the next frozen version (same method as RELEASE-AUDIT-v96.md).
4. **Story**: the three contradictions DIALOGUE-EDIT flagged (Dallan/the guard, chapter 8 shelters vs the cart, Gilbert
   "Grandpa"); the residents' lines heard in the wrong state (deeplife, hostel, sewers, Kesh).
5. **World**: Citadel's north cross streets, the harbour 7 m wider than LBA2's, Twinsen's house walls darker; the other
   regions toward 85 % resemblance (MAP-ORIG.md for the method; lba2remake.net works from the cloud).
6. **Depth**: the first wave's eight side-quest proposals (DEPTH-PLAN.md: UND-1, ISL-3, ZEE-1, DES-1, HAM-2, HAM-3, C11-1,
   C12-1), each re-checked against "three chapters later, what is new?".
7. **Camera**: the clear-view swing on the pier / Modern controls (a design call for the user), awnings and sails for the
   camera's sight test.
8. **Length**: the 15-hour target — chapter-balance.md's ledger; the user's own first-play time is the real measure.
