# Known failing checks (F-13)

Written 11.11.2026 on branch `worktree-agent-af2778661f537031f` (the coordinator's `ccr-c1c2c4b9-dep6ed` at
`47a6cb98` merged, plus F-14, F-5, F-8 and the interior-life fixes `0e8a1246`, `e4dfb858`). Automated runtime only:
headless Chromium with SwiftShader, one suite at a time, on a machine shared with other runs. Replaces the list in
`status.md` ("Known failing checks, failing the same on the base"), which RELEASE-AUDIT-v75 F-13 found out of date.

## Suites run for this list

| Suite | Result | Log |
|---|---|---|
| `interior-life` | 143/144 on the last full run; the one failure (chapter 1, the walk into the tavern) passes in a probe with the harness fix made after that run; no full rerun since | `/dev/shm/logs/af-interior-life4.log`, probe `af-probe7.log` |
| `walkers` | 37/37 PASS | `/dev/shm/logs/af-walkers.log` |
| `chapter1` | 32/32 PASS | `/dev/shm/logs/af-chapter1.log` |

Not run after these changes (session time): `cast-rounds`, `controls`, `townlife`, `camera-doors`, `gap-scan`. Their
last known state is in RELEASE-AUDIT-v75 and in the coordinator's runs; rerun them before the merge is published.

## Still failing, with cause and owner

None of the checks run above. Carried from RELEASE-AUDIT-v75, not rerun here:

- `camsteady` (15/110 failing on v75) and `controls` "camera … smooth, no lurch" (acceleration p95 12.5–14.3 > 12):
  F-5. The Follow arm's step over his head now eases (`d88807a4`); `controls.mjs` now also logs his own acceleration
  for comparison. Whether the threshold or the camera changes is still the coordinator's decision. Owner: world-polish
  (camera).
- `worldfit`: a door over a window on the neighbours' house, a window into Zeelich house 3's corner, 20 z-fighting
  patches (F-11). Owner: world-polish.
- `weather` (Zeelich's fog at light phase 0.79), `jetpack` (lit flames 8 draw calls, budget 6), `spaceport` (the
  gate's walk out lands 1.77 m off; the evacuation queue walk), `longsession` (geometries 1138 → 1162 over 30 cycles; 12.11: 1140 → 1164, the same, after its setup was fixed for
  the house's remarks):
  F-12. Owners as named in each suite.
- Intermittent, passed on rerun before: `combat` dodge distance at 30 and 60 fps; `prologue` the well's mites (3 of 4 — likely the test throwing from
  inside the cave's west wall once the mites gather there; it now throws from open floor, 12.11, 5d7d1c13);
  `saveslots` slot picture; `overlaps` two Lhar roof spots; `sewers` three well-house lift checks; `sewers-ways` two
  out-of-door spots (status.md).

## The four interior-life failures of the coordinator's branch (fixed)

| Check | Cause | Kind | Fix |
|---|---|---|---|
| Spaceport, chapter 4: Esren "talked" with no line | E took the departures board's Read prompt (the talk logged `to: p_read`, speaker none): she reads the board, and a sign beside a person won the prompt however squarely Twinsen faced her | game (prompt choice) | `main.js` findInteractable: a person faced squarely in reach wins over a sign faced less squarely, as over a room search |
| Terminal, chapter 1: Tavi "no-dialog:arrived" | The aisle behind the café counter was 0.88 m, narrower than Tavi; the planner sent him out round the hall between his three stops (0.35–0.7 m apart), so he walked about the hall and stuck on the café chairs | game (layout) | `terminal.js`: counter, machine and stools 0.2 m into the hall (aisle 1.08 m); his legs now stay behind the counter |
| Terminal, evacuation: Ollo "talked" with no line | Not reproduced after the café fix in three full runs and a probe; not isolated. Most likely the same crowding (Tavi walking the hall by the seats) | unclear | none beyond the above; the test now logs `to` and the speakers so a recurrence says who took the E |
| Terminal, epilogue: `lomba_cafe` "in a collider at 8595.4, −2.6, top 0.50" | Mrs Lomba, walking to her café chair, gave way to Old Ressa (who stands, not sits, by the seats half a metre from that stop) and the sidestep carried her into the chair; chairs are under STEP_UP, so physics lets a body over them. Tavi stuck there too | game | `roomlife.js`: the stop from the chair's wall side; `walkers.js`: indoors a step that goes further into low furniture is not taken |

Found on the way and fixed in the tests: chapter 1's walk into the tavern was stopped by a new remark ("the garden pipe
is knocking too", campaign wave 1); P.enter now walks on after it. Ama at her forms cabinet was looked at 1.5 s after
arriving while STOP-TURN still had her settling (1.2 s, then the turn: 2.2 s); the second look is now at 2.5 s.

Left open, not failing: Ama stops 0.35 m short of `ama_forms` each time (her slot is inside the forms cabinet's
footprint, which has no collider); Old Ressa (a long dress, so she does not sit) stands in the way between the seats and
the café table; when she does, Mrs Lomba may give her café stop up after eight tries rather than walk through the chair.
Owner: interior-life / cast.

## Gap scan

`tests/gap-scan.mjs` (committed `95e6aeb2`) was not run here: a full scan builds every region a few groups to a page
and walks each held slot by input, longer than this session had. Owner: the coordinator, on a quiet machine
(`BATCH=8`, `OUT=` for the slot list).
