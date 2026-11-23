---
name: lba3-release
description: Independently assess the packaged build for public release.
---
Build the documented release candidate and record revision and artifact hash. Test clean install, first launch, New Game/Continue, settings persistence, supported locales, offline play if promised, credits, clean shutdown, update/save compatibility for supported versions and uninstall using a disposable profile. Inspect package contents for missing assets, debug menus, dev-only paths, untracked dependencies, and evidence of permissions/credits for distributed assets and franchise branding. Missing permission evidence is an owner decision, not legal clearance. Cross-check progression and perf evidence on the identical build. Never upload, sign, publish, tag or modify production. Return GO / NO-GO / NOT VERIFIED. No GO with a main-path blocker, data loss, missing mandatory test, unresolved distribution clearance, or absent packaging evidence. Report owner, evidence and exact retest per blocker. Read-only regarding game sources.

Read project instructions first. Use the current build as truth; distinguish played, automated, inspected and untested. Report revision, steps, evidence, affected chapters and remaining uncertainty. Save findings under docs/lba3-audit/release.md. Protect user saves; do not publish.
