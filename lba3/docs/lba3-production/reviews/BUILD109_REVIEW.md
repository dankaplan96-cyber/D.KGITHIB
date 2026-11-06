# LBA3: The Awakening — build 109 review

Reviewed 20 October 2026. Version 0.31.0.
Release: https://github.com/dankaplan96-cyber/D.KGITHIB/releases/tag/desktop-build-109
Source commit: `4dd950150ffb600797c6c4ee71fd3cf5953d0984`.

## Scope and confidence

The exact release-tag source was downloaded and its browser game served locally. This was NOT a test of the packaged Windows executable. The game uses the same web runtime inside Electron, but packaging, desktop storage, drivers and native integrations remain unverified.

Chromium 153 with SwiftShader software rendering was used. This environment cannot establish FPS on Dan's laptop. Do not reuse its timings as GPU benchmarks or claim a hardware performance target was met.

Inspected the title, sampled rendered opening shots, house, pause menu and first exterior view. Ran the existing combat, controls and container tests with only their browser-launch/import paths adapted in a separate test copy. Ran part of the opening suite and the start of the input-driven prologue route. Production game files were not changed.

The route confirmed cupboard acquisition and walking out of the house. It did not produce a completed result for the subsequent well journey before the run was interrupted. This is incomplete verification, not proof that the well is inaccessible. Later chapters, complete story progression, long-session stability and native controller feel were not certified.

## Executive assessment

The project has real working systems and several earlier combat defects are fixed. Its next milestone should be a polished opening and first playable area, supported by reliable release checks and actual-device performance measurements. Expanding content further will not address the current close-up character quality or control discoverability.

No release-readiness verdict is justified by this review. Findings below distinguish observed defects, source findings, visual judgments and unverified risks.

## 1. Preserve existing control preferences during migration

Priority: high. Evidence: confirmed source behavior.

`lba2-remaster/src/main.js`, Game constructor:
`if (!(this.settings.v >= 2)) { this.settings.controls = 'classic'; this.settings.keys = {}; this.settings.v = 2; }`

Updating an older settings profile resets its control scheme and discards custom bindings. A returning player can experience apparently broken movement or aiming after an update.

Required change:
- Migrate valid existing choices and bindings instead of clearing them.
- Apply defaults only to missing or invalid fields.
- Back up legacy settings before changing their schema.
- Keep an explicit user-triggered reset separate from migration.

Acceptance: a legacy Modern profile with a custom throw key retains both after upgrade and restart. A fresh profile still receives valid defaults.

## 2. Make the aiming scheme obvious

Priority: high for usability. Evidence: source plus passing control tests; recommendation, not a broken-aim diagnosis.

Fresh profiles default to Classic controls. Classic uses facing-based throws and planted aiming, while Modern supports cursor aiming and movement during charging. A player expecting the cursor to control the ball can therefore find the game awkward even though the logic passes tests.

Required change:
- Offer a short, clear Classic / Modern choice, or use Modern as the fresh-profile default while preserving existing choices.
- Describe each choice with one practical sentence.
- Provide a safe early opportunity to aim and throw using the chosen scheme.
- Keep the active scheme and bindings consistent across hints, inventory and controls.
- Preserve the already-fixed stationary-cursor aim, charging movement and right-drag versus lock-on separation.

Acceptance: a new player can identify how to aim without reading a long controls page. Verify both schemes with actual input and camera movement.

## 3. Replace hard-coded key hints

Priority: medium. Evidence: observed text and confirmed source.

The cupboard reward displays “Got the magic ball (F) and the holomap (M)”. This is hard-coded in `src/game/i18n.js` as `pr_toast_ball`, invoked by `src/game/story/prologue.js`. Other inventory text also hard-codes M.

F remains a valid alias in the default Classic scheme, so this is not a claim that the default hint is unusable. The defect is that the text does not follow remapping or the current input device.

Required change: resolve all button labels through the input system. Prefer a short acquisition notice plus a contextual hint over several stacked instructions.

Acceptance: remap throw and map, then acquire the ball; the visible hints show the new bindings. On a controller, show the corresponding controller buttons.

## 4. Bring character geometry up to cinematic close-up quality

Priority: high for visual quality. Evidence: visual assessment of rendered samples, primarily Low preset at 960×540.

The furnished home has a coherent layout and useful detail. Close-ups expose a weaker character standard: Zoé's profile, facial planes, forearms and simplified hands look angular and under-articulated. Twinsen's face and head silhouette need clearer features at the camera distances used in the opening. Color and costume alone do not provide the desired recognizable character quality.

Required change:
- Refine silhouettes, facial landmarks, wrists, palms and hand poses against the supplied references.
- Review the models from the actual cinematic cameras, not only a model viewer.
- Validate shoulder and elbow deformation in tap, conversation and turning poses.
- Use controlled smoothing and appropriate geometry; do not apply indiscriminate subdivision.
- Keep readable detail on Low. Higher resolution or bloom cannot fix a weak face silhouette.

Acceptance: front, profile and three-quarter renders of Twinsen and Zoé, then the same characters in the actual opening and ordinary gameplay. Preserve measured rendering budgets.

## 5. Polish the opening's acting and contact poses

Priority: high for presentation. Evidence: sampled poses and timeline inspection; full real-time animation quality remains unverified.

The opening has a useful structure: a working project at the harbor, an ordinary family scene, abnormal water and an immediate objective. Preserve that structure and its concise dialogue.

The sink close-ups place emphasis on a very simple outstretched hand and wrist. The gesture needs a clearer visual connection to the tap or water. The dark ceiling occupies substantial space in the sampled side-on kitchen shots.

Required change:
- Refine hand contact, gaze, anticipation and release around the tap and tools.
- Reframe the kitchen shots to emphasize faces and the action, reducing the heavy ceiling area.
- Verify foot planting during Zoé's turns and exit at playback speed.
- Review subtitling in real time. Deterministic fast stepping does not reliably reproduce CSS fades, typewriter timing or perceived lip/voice synchronization.
- Preserve skip-to-gameplay state parity and the existing collision checks.

Acceptance: watch the complete opening at normal speed; then test skip, pause/resume and the first controllable frame. Automated path clearance alone is not an acting-quality check.

## 6. Improve outdoor readability without adding more scenery

Priority: medium. Evidence: visual assessment of the first exterior view on Low.

The exterior already contains trees, fencing, terrain and buildings. Repeated bright grass speckling and saturated green foliage create visual noise. In the captured exit view, the steep overhead camera makes Twinsen's face and silhouette hard to read.

Required change:
- Reduce high-frequency ground texture contrast near walking routes.
- Separate foliage, ground and path colors more deliberately.
- Review the camera after door exit and obstacle avoidance; retain a useful character scale and stable return to the normal view.
- Inspect Low and High at the same positions. Do not hide geometry issues with fog, blur or bloom.

Acceptance: clear route and character visibility at the house exit, town street and harbor, including camera recovery after occlusion. A single captured exit angle is not evidence that the camera stays wrong permanently.

## 7. Fix inconsistent automated test verdicts

Priority: high for release confidence. Evidence: reproduced test output and source.

Combat: 59 assertions passed; Controls: 69 assertions passed. Both printed “ALL PASSED” alongside a console resource-load error. Their final verdict depends on assertion failures, not all captured errors. `tests/lib/boot.mjs` has the same distinction in `done(errs)`.

Containers: all 15 assertions passed, but that suite reported “1 FAILED” because it counts captured errors. The failed external request identified during the visual run was the Google Fonts Rubik stylesheet (`net::ERR_EMPTY_RESPONSE`). This was not a demonstrated container gameplay failure.

Required change:
- Use one result policy across all suites.
- Fail on unexpected page errors and missing required local assets.
- Explicitly classify expected optional-network failures; do not silently discard them.
- Keep functional, resource and visual-verification results separate.
- Make nonzero exit status agree with the final verdict.

Acceptance: inject a known page error and a missing local model; the suite must fail. An intentionally offline optional-font scenario must be classified clearly, not produce contradictory summaries.

## 8. Remove the external font dependency

Priority: medium. Evidence: reproduced failed request.

The game requests Rubik from Google Fonts even when served locally. Offline or restricted-network play falls back to another font and emits an error, potentially changing text layout.

Required change: package the permitted font files locally and retain a sensible fallback. Ensure desktop packaging includes them.

Acceptance: disable external networking, launch the game and inspect menu, dialogue and HUD layout; no external font request should be needed.

## 9. Profile startup and handle software-renderer fallback

Priority: high for performance investigation. Evidence: confirmed architecture; real-device impact not measured.

`Game` constructs Citadel, interiors, Zeelich, desert, underground areas, Hamalayi, other islands and the developer arena during startup. Startup also preloads character and region data and prepares shaders. This is a specific candidate for startup time and memory pressure, not proof that every region is rendered every frame.

`src/engine/perf.js` selects High for unrecognized GPU strings, including software renderers; its comment explicitly retains High for automated tests. A real user falling back to software rendering should not inherit that testing policy.

Required change:
- Measure startup phases, resident memory and first-use stalls on target hardware.
- Separate benchmark/test overrides from production GPU detection.
- Give software-renderer fallback a conservative preset and concise explanation.
- If measurements justify it, load regions incrementally and prewarm only the next relevant content. Preserve save/resume behavior.
- Retain existing batching, visibility handling and resolution adaptation unless measurements demonstrate a regression.

Acceptance: comparable street, interior, combat and door-transition runs on the user's actual hardware. Record GPU, resolution, preset, dynamic-resolution range, average FPS, p95/p99 frame time and stalls. Run benchmarks without other heavy test jobs. Do not claim 60 FPS from deterministic stepping.

## 10. Resolve resource-loss behavior before expanding containers

Priority: medium. Evidence: source-confirmed behavior and partial automated coverage; save/reload scenario still needs a dedicated reproduction.

`giverHop()` marks a container searched immediately. Its reward is spawned into the world with a 20-second lifetime for normal resources. The tests confirm expiration and that the searched state is saved. `snapshot()` saves the searched list but not pending spawned container rewards. `collect()` caps health and mana, so rewards of those types can also be consumed without benefit at full capacity.

This implementation is a temporary ground-drop system, not the earlier proposed direct-collection system. Do not call intentional original-style behavior a physics bug, but align it with Dan's intended design.

Required change:
- Prefer granting ordinary resources through the interaction, using a brief visual effect.
- Alternatively persist unclaimed contents or delay final consumption until collection.
- Define what happens when the relevant resource is full.
- Keep weapons and equipment as intentional world discoveries.
- Preserve quest rewards and prevent duplication.

Acceptance: open a container, leave the reward, save/reload, change regions and return; verify the chosen policy. Also test full resources, interrupted interaction and repeated input.

## Verified progress to preserve

- Stationary mouse aiming remained valid after six seconds in the combat test.
- Charging while moving retained the aim and walking leg animation.
- The release-frame test placed the ball about 0.08 world units from the hand.
- Follow-through blending, Aim Assist Off and camera-drag/lock separation passed their assertions.
- Control tests covered remapped contextual prompts, controller interaction, wall movement and camera behavior.
- Container tests confirmed the action hop, one-time rewards, need-based resource choice and saved searched flags.
- The opening reached gameplay in the house with objective and save state set. Skipping at 3, 21 and 50 seconds reached the same checked state. The remaining opening-suite checks did not finish in this review.
- The prologue's cupboard acquisition and house exit worked through the input harness.

These are targeted results, not a claim of complete end-to-end correctness or polished animation at normal speed.

## Instructions for Claude Code

Reproduce the findings on the current branch before editing: it may have changed after build 109. Fix migration, hints, font packaging and test verdicts first. Then improve the two main character models and opening contact poses while profiling the existing first area. Investigate startup and container persistence using explicit measurements and reproductions.

Do not rewrite working combat systems, add unrelated regions or report improvements from code changes alone. For every completed item, record the affected files, the reproduction before/after, and any remaining limitation. Finish with real-time gameplay checks and a native packaged-build smoke test. Keep player-facing writing short and English-only.
