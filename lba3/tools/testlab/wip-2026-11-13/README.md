# Work stopped on 13.11.2026 (the user: "we'll come back when the tokens return")

Two cloud workers were stopped mid-way to save tokens. Their commits are kept here as patch series, so a new session can
pick them up even if this container is gone. Apply on `ccr-c1c2c4b9-dep6ed` with `git am <dir>/*.patch` in a worktree,
then finish, test and merge as the coordinator always does.

- **`wave8/` is DROPPED (the user, 14.11: no longer relevant after the opening became a tutorial and the cup objective was
  rejected). Kept only as a record; do not apply.** `wave8/` (10 patches): campaign wave 8, the epilogue's kitchen (the tap turned by his own hand, Arthur's cup, a word
  with Zoé), its tests (campaign-thread Q, save-migration, campaign-hands, no-air) and a 5h draft. Stopped while writing
  section 5h; the full suite run on the final build is still to do.
- `tech-art-1/` (7 patches): TECH-ART-1 (the user's technical-artist brief): Zeelich's street doors get a dark reveal and
  a keystone, Baldino's an alfiz lintel and a brass ring; the residents' carried props built once per kind and cloned
  (before: every pick-up built and leaked fresh geometry and a throwaway material); the capture and count harness;
  `TECH-ART-1.md` in progress. Stopped while re-running the final and baseline counters; the suites and the Vega 8
  handoff (a CLOUD_ORDERS item) are still to do.
  **Finished 14.11:** the seven patches applied cleanly on `b38d29e4`, then the counters re-run, the suites, the
  captures pruned and the Vega 8 handoff (CLOUD_ORDERS order 42) committed on top. See `docs/lba-maturity/TECH-ART-1.md`.
  These patches are now a record only; do not apply them again.
