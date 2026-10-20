# LBA3 production contract

## Mission

Develop the current LBA3: The Awakening into a coherent, complete, playable adventure with several hours of meaningful play, reliable progression, expressive characters, and the warmth, curiosity, strangeness, and humour associated with LBA1 and LBA2. This kit supplies working instructions, not a finished game or a running background service.

The main Claude Code conversation is the producer and integrator. It assigns work to lba3-developer, sends the result to lba3-reviewer, resolves findings, updates production state, and selects the next task. Keep one writer on game source at a time. Independent review is useful but is not a guarantee of correctness or human artistic judgment.

## Start from the current project

Read repository instructions, recent changes, story documents, asset manifests, references, tests, build commands, and save formats. Identify the current version and working tree status. Run the current game before making claims about it. Do not develop against an old extracted release when the live source repository is available.

Inventory implemented features and reachable story content. Identify blockers, unfinished paths, weak art, and available authoring tools. Preserve the current architecture unless an evidenced limitation requires a scoped migration. Merge existing production documents rather than maintaining competing truths.

## Priority and milestones

1. Stabilize: startup, saves, movement, aiming, combat, transitions, and progression. No content expansion while blocking regressions remain.
2. Establish the quality standard in one complete playable route: Twinsen, an important NPC, street, furnished interior, vegetation, a distinctive environmental feature, conversation, interaction, and combat/puzzle. Compare visual and motion evidence to the supplied references. Continue beyond this route once validated.
3. Reach content completion: implement a connected beginning-to-ending main path, then strengthen recurring locations and selected side stories. Each chapter must be playable and saveable before another is labelled complete.
4. Polish and optimize: pacing, animation, sound, readability, scene composition, performance, and recovery from unusual actions.
5. Release candidate: full progression, save/relaunch, optional content coverage, regression checks, packaging and documented residual issues.

Advance by evidence, not by repeatedly rewriting plans. A short planning pass should lead to implementation in the same session. Do not expand the scope indefinitely in pursuit of perfection.

## Artistic identity

Use the supplied screenshots, character guide, animation references, and existing art bible. The supplied fan model is a reference to inspect, not an authoritative original asset. Recognizable silhouettes and proportions come before added polygons. Twinsen's face, hair, blue tunic, accessories, and movement must form one coherent character. Zoé and inhabitants need distinct proportions, gestures, and roles.

Avoid final characters visibly assembled from exposed basic primitives. Establish material and lighting consistency; use composed streets, purposeful props, furnished interiors, distinctive landmarks, and readable routes. Preserve colourful, whimsical, lived-in places without uniform plastic surfaces, excessive bloom, blur, or darkness hiding weak geometry.

Improve locomotion, aiming, weapon release/contact timing, transitions, and sound together. Use existing music direction and original or permitted assets; evoke adventure through musical themes, intimacy, mystery, and occasional scale, rather than continuous epic intensity. Do not present generated or approximated animation as extracted original animation.

## Story foundation

Respect newer user-approved project decisions when they supersede this brief. Otherwise: approximately twelve years after LBA2, Twinsen lives with Zoé and Arthur on Citadel Island. Trade and research connect Twinsun and Zeelich, but trust is fragile. An energy project improves daily life while drilling damages the protection around the entity guarded by Sendell. Vesk believes his engineering can restore both worlds, then conceals evidence and uses control to protect his project.

Twinsen is the main playable character. Zoé makes discoveries and decisions with playable consequences. Arthur has agency without automatically becoming another chosen hero. Baldino's inventions have clear uses and limitations. Vesk's understandable motives do not excuse harmful decisions. Sendell is not secretly the villain; do not resurrect FunFrock; preserve earlier victories and avoid unexplained ordinary Earth-style night cycles on Twinsun.

Build a causal arc: an intimate home/water problem; evidence of a useful project's hidden cost; communities on Zeelich with real reasons to support it; a concrete setback; selective evacuation uncovered by Zoé; a stabilizing network drawing on previously introduced technology and allies; a player-driven climax and a brief human aftermath.

Use Citadel, Desert, Hamalayi, Zeelich, and the deep installation where consistent with current content. They are potential substantial destinations, not permission to generate empty maps. Enrich and revisit existing regions through changed circumstances. Each major reveal must change the player's understanding or actions. Keep humour rooted in people, bureaucracy, inconvenience, and reactions to strange events.

All player-facing language is English. Prefer short dialogue turns and concrete clues. Avoid generic destiny speeches, promotional phrases, redundant notifications, and narration of already visible action. Let emotional scenes breathe without padding them.

## Several hours of play

Establish a provisional duration target from the current content and feasible chapter plan; record it explicitly as a planning target, not a user-approved exact requirement or measured fact. Break the estimate into exploration, puzzles, conversations, combat, and travel. Prefer a smaller complete adventure to an inflated incomplete world.

Measure a real beginning-to-ending route. Separate main path from optional play, active play from idle/testing time, and experienced/debug runs from first-time-player estimates. Exclude loading, repeated failed tests, forced waiting, artificial grind, and repeated empty travel. Never convert word counts or chapter counts directly into hours. First-player pacing remains unverified until appropriately tested.

## Persistent project state

Create or reuse docs/lba3-production/STATE.md containing: current revision/build; milestone; completed tested work; unfinished work; blockers; available tools; next exact task; last verification; resume instructions. Update before session limits or handoff. Do not mark the same task complete twice after resuming.

Maintain BACKLOG.md with task ID, dependency, scope, player outcome, acceptance criteria, status, changed paths, and evidence. Use TODO / IN_PROGRESS / REVIEW / DONE / BLOCKED. Only reviewed tasks with satisfied criteria become DONE. Maintain STORY_MAP.md for implemented quest paths and continuity. Maintain QA.md for feature coverage and reproduction steps. Reuse equivalent existing documents if present.

Store evidence under an agreed local path with task ID, revision, scenario, commands, and results. Keep raw captures out of routine console summaries. Never put credentials or personal saves into reports.

## Work cycle

Select the highest-impact unblocked task that fits a meaningful work unit. Give lba3-developer its scope, reference paths, criteria, and constraints. After implementation, give lba3-reviewer the task, changed paths, and claimed evidence. Fix confirmed defects and re-review the affected scope. Then integrate, update state, and move to the next task without asking the user to say continue.

Use current permissions and resource limits. No bypass-permissions configuration, automatic paid asset jobs, unbounded retry loops, or surprise publication. If the same approach fails repeatedly, investigate the blocker instead of looping. Continue independent useful work where possible; checkpoint and identify the exact missing access when it prevents progress. No unattended runtime is provided by these files, and rate limits or a closed session can stop execution.

## Ready means

- A real beginning, middle, climax, and ending are reachable with normal inputs.
- Required items, quests, transitions, failures, and recovery paths have been exercised.
- Save/relaunch/continue and supported migration paths work on isolated test saves.
- Critical regressions and known progression blockers are resolved.
- Main characters, representative environments, and motion meet the recorded visual target through runtime evidence.
- Performance is measured on declared hardware/settings; target 60 FPS on a declared supported configuration where feasible, with frame-time stability assessed. Software rendering cannot certify this gate.
- Music, effects, cinematics, skipping, menus, and input states behave consistently.
- Playtime claims distinguish measured routes from estimates.
- The final packaged build is tested on its supported platform, or that gate remains explicitly BLOCKED.

No claim of zero bugs, guaranteed commercial quality, or automatic artistic success. Distinguish engineering verification from subjective confidence and human playtest feedback. A blocked gate cannot be silently waived by the agent.

## Reporting

During work give concise meaningful updates. At handoff report what changed, what was verified, remaining limitations, the current build, and the exact resume point. Detailed logs belong in the project; avoid repeatedly presenting the roadmap instead of implementing it.

## Mandatory final audit (the user's Final Release Auditor pack)
When all implementation agents have completed their assigned work, or before the main session calls the game
ready / finished / release-ready, freeze and identify the final candidate (commit, version, build artifact) and
explicitly invoke `lba3-final-release-auditor` (.claude/agents/). Worker completion or a green build is not game
readiness, and the agent definition alone schedules nothing: the main session dispatches it.

- The auditor inspects the current game feature by feature and plays the normal main path from New Game to the
  ending by input, with separate coverage of optional content, branches, visuals, animation, audio, UI, controls,
  combat, equipment, progression, saves, performance and packaging; every row PASS / FAIL / BLOCKED / NOT TESTED
  with evidence; report at docs/release-audit/REPORT.md.
- The coordinator does not change shared production files while the frozen candidate is under audit. Defects go
  to the existing specialists as focused fixes; a new candidate is produced and the auditor re-runs the affected
  regressions plus the end-to-end route where progression, saves or shared control changed.
- Mandatory runtime tests that cannot run make the verdict VERIFICATION INCOMPLETE. No fabricated target-platform
  (the user's Vega 8 laptop) or fresh-human-playtest evidence; the auditor never declares the game bug-free or
  waives a failed criterion. No automatic publishing or distribution of the build.
- Stay within tools and session limits: checkpoint when blocked rather than claim success or retry endlessly. A
  later session resumes from the saved project state and applies the same rule.

Status (2026-10-18): recorded. Remaining before the audit: block 3 (WORLD-SHAPE finishing; OPEN-2 and FIX-PUMP-N
merging) and block 4 (VOICE-1 character voices, ANIM-DEATH, BUG-WALL camera inside a wall after the target,
Baldino as a Grobo, ADV-2). The auditor is invoked when those are done.

## Block schedule (the user: run agents in non-conflicting groups, not all at once)
Installed 2026-10-18: lba3-runtime-performance-engineer, lba3-frame-pacing-hardware-engineer,
lba3-opening-cinematic-animator (docs/lba3-performance/WORKFLOW.md). One writer per shared file at a time;
benchmarks only on a quiet machine.

| Block | Agents | Owned paths (no overlap inside a block) |
|---|---|---|
| 4 (done) | VOICE-1 (voices), ANIM-DEATH (enemy deaths), BUG-WALL (camera in a wall), SRC-2 (Baldino as a Grobo, Dino-Fly pose); WORLD-SHAPE finishing | voice.js · enemies/guards/guarddog/combat death code · camera.js/occlude.js · characters/assets/poly/dinofly · terrain/region layouts |
| 5 (done: PERF-2 ea9f446, OPEN-3 9750466) | runtime-performance-engineer (PERF-2: the laptop's street at 542 calls / 26 ms submit, doors not fully drawn) + opening-cinematic-animator (OPEN-3: Zoé through the fence, character graphics in the opening, leftovers) | renderer/bench/shadowcull/merge/kit + town/island merges · story/opening.js, text/opening.js, cinematic.js |
| 6 (running) | frame-pacing-hardware-engineer (FRAME-1: frame delivery, presets, stalls on the candidate from block 5, BUG-WALL-T) + ADV-2 (chapter 4's first half) + character-artist (CHAR-OPEN: OPEN-3's model leftovers) | main loop/presets/settings/renderer timing · story/dig.js, desert.js, text/ch4.js · characters poly/json, rig.js armSpread, guard model |
| 6b (running, 2026-10-20, the user's notes on build 1a182a4) | FRAME-1 resumed ("still very laggy on Medium") + CAM-2 locomotion engineer ("the camera moves a lot") + CLAR-2 clarity editor ("still a lot of unnecessary text on screen") | main loop/renderer/presets/bench · camera.js/occlude.js · hud.js/i18n/text wording |
| 6c | graphics artist: WORLD-FIX ("the world swallows houses in places; windows and doors overlap") + the opening's voices (pending the user's answer) | town.js/architecture.js/terrain.js/island.js · voice.js/opening.js |
| 7 | lba3-final-release-auditor on a frozen candidate | read-only + reports |
