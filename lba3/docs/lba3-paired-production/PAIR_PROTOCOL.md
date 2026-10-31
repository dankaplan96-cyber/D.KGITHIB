# LBA3 paired production protocol

## Scope and authority
This pack implements eight specialized roles across the entire CURRENT game. It creates no scheduled automation and does not launch agents just by being extracted. The user's main Claude Code session is the coordinator. Its coordinator definition can be followed directly; do not assume subagents can spawn more subagents.

Read existing instructions, source, story map/bible, supplied references, current performance reports and installed agents. Preserve working systems. Do not restart the future expansion early. English-only game text. Existing benchmark 241/trailer observations are leads to recheck on the actual current build, not diagnoses to apply blindly.

## Exactly one pair at a time
Maximum TWO active specialist workers across this workflow, including any already-running performance/animation agents. The main session coordinates and integrates but must not become a third concurrent implementation worker. No specialist may spawn children. No second pair starts until the current two workers return, their changes are reviewed and the integration gate completes.

If background agents from another workflow are still active, reconcile their ownership and finish their round first. An external performance worker uses one of the two slots. If concurrent agent execution is unavailable, execute both roles sequentially under the same pair gate and disclose the fallback. Do not pretend Markdown files enforce concurrency automatically.

## Initial inventory
Record baseline commit/build, commands, current working-tree edits, installed tools, actual hardware and known issues. Discover ALL implemented regions, chapters, characters/asset families, quests, cutscenes, UI surfaces and save states from code and story documents. A file existing is not proof of playable content. Start the coverage matrix from discovered content, not a hard-coded twelve chapters.

Create docs/lba3-paired-production/RUN_STATE.md, COVERAGE.csv, OWNERSHIP.md, ISSUES.md and EVIDENCE.md from the supplied templates without overwriting existing progress. Only the coordinator updates these shared files. Each worker writes its own report. Use status values pending, in_progress, implemented_unverified, verified, blocked, not_applicable. Every not_applicable needs a reason; blocked is not complete.

## Pair order
Round 1: lba3-character-art + lba3-camera-director.
Round 2: lba3-quest-designer + lba3-narrative-editor.
Round 3: lba3-world-life + lba3-action-feel.
Round 4: lba3-save-state + lba3-player-experience.

Run these rounds for a manageable region/chapter group, integrate, then continue through all groups. Begin with home/street/harbor to establish quality, then include all implemented interiors and Citadel branches, Zeelich, Desert, Hamalayi, late chapters, deep installation/core, ending/postgame and any other implemented regions. This example order is not permission to skip newly discovered areas. Shared/global assets are fixed once and verified across every dependent group. Do not endlessly redo a complete global system in each region.

After animation integration, run targeted camera/character regression tasks in a later two-worker repair round if needed. Round 4 tests a frozen candidate: save fixes are staged separately while the reviewer tests the original candidate; coordinator integrates after both finish and schedules reviewer rechecks. Keep independent validation meaningful.

Existing performance agent remains authoritative for renderer optimization. At each group gate run the available benchmark; if a regression is material, schedule a repair pair of that agent and the relevant feature owner instead of starting another normal pair. If it is not installed, use the owner's targeted profiling and mark target-hardware verification pending rather than inventing a new performance specialist.

## Ownership and dependency contracts
Before launch assign task IDs, exact writable paths, read-only paths, base commit, expected artifacts and measurable acceptance criteria. If two roles need the same monolithic file, one is its sole writer; the other works on analysis/fixtures/independent files and submits a proposed patch. Integrate their dependent edits sequentially. Do not split source files merely to satisfy parallelism.

Prefer separate worktrees where supported. Worktree isolation does not make overlapping edits safe: plan ownership first. Shared scene registries, loader manifests, save schemas, global animation/physics, camera hooks and package lockfiles have one explicit owner. Coordinator merges sequentially and reviews conflicts. Never hard-reset, overwrite or stash away user work without preserving it. Stop a conflicting worker, reassign internally, and continue unaffected tasks.

Provide each worker the shared protocol, role prompt, assigned region contracts and exact baseline. Require concrete deliverables, not an open-ended “improve everything.” Choose a small batch of related issues so changes remain reviewable. Partner handoffs identify rig, quest-state, camera and persistence contracts.

## Integration gate
1. Both workers stop and return diffs/reports; verify no edits outside ownership.
2. Integrate one change set, then the second, preserving user changes.
3. Build and run affected smoke/progression checks; validate save/load and relevant visuals.
4. Compare performance on the same build/settings/route. Frame timing, stalls and quality matter more than a rounded FPS counter. Use the user's Vega 8 / 1366x768 target when that device is available. No fake 60-FPS certification on a different GPU.
5. Assign unresolved blockers to a bounded repair pair; do not mark a broken group done. Unaffected groups may continue when a documented external blocker prevents verification.
6. Update coverage with evidence and commit/build identity; then start the next pair.

Do not erase mandatory mechanics, freeze all NPCs, strip character detail or turn off saving to pass a performance gate. Match the current project's accepted quality budget; if a trade-off is needed, state it and keep it explicit in settings.

## Coverage and stopping rules
Each implemented region must have art/camera, puzzle/story, life/action and save/player-experience disposition with evidence or justified non-applicability. Every recurring character, cutscene, main quest and supported control mode must be represented. Finish with normal-input new game to ending, optional-content skip/completion paths, postgame, save migration and representative long performance runs where feasible.

Evidence separates static code review, automated state tests, staged captures, normal-input walkthroughs and external human testing. Never fabricate the last category. No all-game claim when routes remain untested. Treat build 241's short six-route benchmark as baseline evidence only, not whole-game coverage.

Continue authorized work without repeatedly asking the user to say continue. End when the planned scope is verified, genuinely blocked, or the session cannot continue. At limits save current pair, task owners, base/candidate commit, completed tests, unresolved issues and exact next action. Do not promise background execution. No arbitrary endless polish cycles: stop optional testing once the concrete risk is resolved. No auto-publish, release or destructive migration.

## Final delivery
Provide integrated build/commit, compact changed-behavior summary, coverage matrix, before/after visuals where available, measured performance comparisons with hardware/settings, save compatibility, remaining bugs and unverified items. Distinguish implementation complete from release verified. A clean compile or an impressive trailer is not release acceptance.
