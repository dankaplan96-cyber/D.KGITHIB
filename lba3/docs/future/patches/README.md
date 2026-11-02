# Expansion patches waiting for a branch

The expansion is developed on `expansion/ballastra`, which waits for the user's OK (MORNING_CHECK.he.md, question 2).
Until then, finished expansion batches are kept here as patches so nothing is lost. They are not part of the base game.

- `exp-foundation-batch1.patch`: batch 1 (EXPANSION_PLAN.md §8): chapter order behind `exp`, save format 6 and the
  v5→v6 migration, the Load menu's "Expanded campaign: start at chapter 10", empty chapter shells, tests
  (save-migration 30/30, saveslots, menus, transitions, chapter1, prologue, chapter9, chapter3: PASS on SwiftShader).
  Apply on `expansion/ballastra` after merging the base branch into it: `git am < exp-foundation-batch1.patch`.
