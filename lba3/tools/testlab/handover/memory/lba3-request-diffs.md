---
name: lba3-request-diffs
description: How to make requests/*.diff for the cloud so they apply: against origin, checked on a clean checkout, no pipes hiding failures
metadata:
  type: feedback
---

Every `requests/*.diff` I push must be `git diff origin/ccr-adf00ea7-37ebl3 -- <files>` (new files via `git add -N`), made on a clean checkout of origin (worktree C:\Users\dan\lba3-check), and checked with `git apply --check` on a fresh checkout before the push. A series goes in order (1, then 2 on top of 1…) and says so. Run the place's Test Lab walk on that checkout, not only on my prototype.

**Why:** the cloud (1.11.2026): "Your LBA-CITADEL-1.diff is incremental… tavern.js isn't in the repo and the regions.js hunk doesn't apply". Later a chain script's failure was hidden by `| tail` and a stale diff was pushed. Also: props.cyl/sphere/plane return shared cached geometries — never `.rotateX()` them; props.frame(k,w,h,texture) takes a texture fourth.
**How to apply:** check the exit status of build scripts directly (no pipe), `git pull` first; if the cloud already applied earlier diffs, make the next one against the new origin. See [[lba3-world-art-role]].
