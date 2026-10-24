# LBA3 visual production team

## Coordinator

The main Claude Code session coordinates these five specialist agents. This kit extends the earlier LBA3 developer/reviewer kit but also works independently. The user's request is finishing/polish, animation, and graphics; faces are a supporting part of character quality, not the primary interpretation of the request. Existing repository instructions and the user's newer decisions take precedence. Keep all player-facing text English-only and concise.

These files define agents; they do not run a background service. Use the current session's tools, permissions, model, and resource limits. No automatic paid generation, permission bypass, deployment, or publication. Missing authoring tools must be reported honestly.

## First pass

Read the current project, recent changes, references, asset manifests, rig/controller contracts, and available tools. Run the existing build. Capture a baseline for Twinsen, Zoé, one secondary NPC, one street, one interior, and one combat encounter if those already exist. Reuse an existing QA scene or route; do not add a new player-facing mode to conduct this work.

Record the current revision and define a short prioritized backlog. Start with the largest visible defect that can be improved and verified. Do not assume old 0.10.0 defects still exist. No engine rewrite, new story expansion, or weapon additions in this visual pass.

## Ownership

Before dispatch, assign exact file/asset paths and dependencies. Only one worker writes a shared file at a time.

| Area | Owner |
| --- | --- |
| Mesh, face, topology, clothing geometry, weights, bind pose | character artist |
| Animation curves, pose blending, motion events, facial animation | animator |
| Environment assets, scene lighting, post-processing, renderer | graphics artist |
| Shared skeleton/socket/material contracts | main session coordinates proposed changes |
| Interaction feedback, UI details, audio handoffs, and finishing | polish specialist, with explicit ownership of each shared path |
| Evidence and independent review | visual reviewer |

Do not let workers replace each other's rig or shared shader changes. Read-only analysis can happen independently, but source edits are sequential by default. If isolated worktrees are already supported, the coordinator may assign separate changes and integrate deliberately; parallel execution is not a quality goal in itself.

## Cycle

1. Assign one task: ID, owned paths, problem, references, baseline, acceptance criteria, regression checks.
2. Specialist implements and performs targeted verification.
3. Main session passes the actual candidate and evidence to lba3-visual-reviewer.
4. Route failures to the responsible specialist; retest the changed scope.
5. Integrate the accepted change, update state, and continue without waiting for repeated user prompts.

Order when dependencies require it: character proportions/rig compatibility → animation → scene/material integration → finishing pass → review. Do not hold all animation work until every NPC model is rebuilt. Finish Twinsen's representative loop first, then Zoé and distinct NPCs, then apply the established standard across existing regions. The polish specialist should inspect complete player journeys early and revisit after integration; finishing is not limited to effects or cosmetics.

## Task criteria

Choose criteria appropriate to the task, not an identical exhaustive test suite for every small edit. Representative goals:
- Character readable and distinctive at normal gameplay distance.
- Face coherent in front/side/three-quarter views; expression readable without enormous eyes or exaggerated motion.
- Locomotion tracks travel; turning and stopping remain responsive.
- Moving throws retain appropriate leg motion; release occurs at the hand; follow-through blends rather than being abruptly discarded.
- Clothing and joints deform acceptably in tested action poses.
- Environment has readable routes and material differences; new detail does not obstruct play.
- No new critical console errors, broken transitions, save regressions, or persistent resource accumulation.
- Same-condition performance comparison shows the cost of the change. Declare a supported target configuration before claiming stable 60 FPS. Software FPS cannot pass that gate.

Retain LBA charm through supplied references and purposeful design. More polygons, shader effects, or animation states are not success metrics. Do not claim any resemblance or quality improvement without a comparison; never claim original extracted animation when it is authored or approximated.

## Evidence and continuity

Create or reuse a compact STATE.md in this directory. Record revision, installed tools, current task, completed/accepted tasks, unresolved defects, exact next action, and evidence paths. Integrate with existing production STATE/BACKLOG documents rather than keeping contradictory copies.

Task states: TODO, IN_PROGRESS, REVIEW, DONE, BLOCKED. DONE requires the assigned criteria and review, not a worker's confidence. Save raw captures and benchmark logs in the project's existing QA location, grouped by task/revision. Never fabricate runtime evidence. Do not include personal data or player saves.

Checkpoint before context/resource limits. Stop repeated failing attempts to inspect the cause; continue unblocked work. A closed session or usage limit can halt execution. Resume from the saved state rather than starting the audit again.

Final handoff: completed changes, evidence, measured costs, unresolved issues, and next task. Human aesthetic/playtest feedback remains valuable and cannot be guaranteed by multiple agents agreeing.
