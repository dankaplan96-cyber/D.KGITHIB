# Next session — where we stand and what comes next (written 17.11.2026, updated 18.11)

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
