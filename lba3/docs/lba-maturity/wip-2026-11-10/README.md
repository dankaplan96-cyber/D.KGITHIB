# Unfinished work, saved when the user stopped (10.11.2026, out of tokens)

Three workers were stopped before they finished; their work is kept here as patches on base `db3707df`
(apply with `git am <dir>/*.patch`, then `git apply <dir>/uncommitted.diff` where present; resolve against the branch tip).
None of it is merged or published yet; none of it is verified end to end.

- `no-air/` — the user's "no actions in the air" (P11 + the whole game): the opening film's hand contacts and the
  residents' work actions (workhands.js, rig.js, opening.js, tests/no-air.mjs, docs no-air.md). Left: the sweep to zero
  offenders in every state, the regression list in the task (opening, prologue, chapter1, cast-rounds, walkers,
  townlife, npc-feet, the region life suites, anim-polish, overlaps, no-air), the before|after contact sheet.
- `audit-followups/` — RELEASE-AUDIT-v75 F-14 (harness), F-5 (camera arm eases), F-8 (crowns/awnings in the camera's
  sight). Left: the uncommitted test edits (check they fix a harness fault, not hide a game fault), tests/gap-scan.mjs
  and its fixes, F-13 (the known-failing list), the test list in the task.
- `depth-wave1/` — DEPTH-PLAN first wave: COL-1 (twelve crystals), HAM-1 (waystone), ISL-1 (Jaspa's gems). Left: the
  regression run (depth-1, chapter4–7, hamalayi-life, isles-bar, island-people, zislands, voices, save-migration,
  saveslots, resume, world-consistency, playthrough 07 and 09), pictures, the plan's status.

Next after these: the performance pass for the user's GTX 1050 (docs/lba3-performance/HARDWARE/2026-11-10-desktop-gtx1050.md:
the 4 s shadow-program compile, two hitches outside the black, CPU load on High in the street), then the depth plan's
remaining nine first-wave proposals. Published: artifact v76; desktop build 562 (e2a9d1dc). Applied since v76 and not yet
in an artifact: EQUIP-1, CITADEL-85, CAST-POLISH-UNDERGROUND.
