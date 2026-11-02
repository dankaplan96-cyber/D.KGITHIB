# OREN-GUARDIAN: progress (persistent)

The user's task brief of 2.11.2026: Oren, the guardian of a lost world, as a second antagonist beside Vesk, built
into the expanded campaign. The full brief (sections 1–17) is in the session of 2.11.2026; its decisions are in
`EXPANSION_PLAN.md` ("The user's decisions (2.11.2026, later): OREN-GUARDIAN"). Spoilers: the whole file. Keep it
away from the user, who plays chapters 1–2 only.

## Standing decisions
- **Oren** is the guardian. The human former designer in `EXPANSION_PLAN.md` gets a new name; his water-story role stays.
- **Ballastra is Oren's world**: the flood was its catastrophe; part of its people sleep in shelters by the terraces;
  the unequal water allocation is the human layer of the same world. No second new planet.
- **Where:** `expansion/ballastra` only (or behind a disabled flag). The base game stays playable; its finale is not
  replaced while the new content is incomplete.
- **Rules kept:** Vesk keeps his own wrongs (no possession); Sendell is not secretly evil; planets are joined only by
  spaceship; FunFrock is dead; no Earth-style night; Esmer and Wannies; English player text, short turns; numbers and
  descriptions only from the originals; honest measurements (SwiftShader here, no fps claims); at most two agents.

- **Saves (the user, 2.11):** "Saves are not very critical; I always play a little, just to see chapter 1's mechanics
  and some of chapter 2." So: old saves must not crash the game (a clean fallback to a new game with a message is
  enough); no elaborate migration of mid-expansion saves. New saves made in the expansion must still save and load.

## Increments (the brief's §17)
| # | Increment | State | Branch / commit | Notes |
|---|---|---|---|---|
| 0 | Bring `expansion/ballastra` up to the base (it is 37 commits behind; `tests/save-migration.mjs` conflicts: v6 campaign tests vs SHAFT-CITADEL v5 tests; keep what is cheap, saves are not critical to the user) | **next** | | |
| A | Story integration map and dependency graph; Oren's rules of reach (what allows contact, what carries it, what he senses and controls, what interrupts it, why not everything at once); the revised chapter order and quest cards (IDs, prerequisites, mechanics, failure/retry, saves, consequences, estimates) | to do | | written into `EXPANSION_PLAN.md` as a revision, not a new parallel plan |
| B | First encounter with Oren, with a genuine act of help | to do | | |
| C | The sleeping brother: a complete playable quest | to do | | needs Ballastra's places (W-1… from the laptop) or stand-ins |
| D | Regional consequences (Twinsun, Zeelich) and the Vesk/Oren split | to do | | |
| E | Underground discovery and preparation | to do | | |
| F | Finale and aftermath | to do | | the base finale stays until F works end to end |

## Blockers
- Ballastra's places are the laptop's world orders (W-1 … W-8 in `EXPANSION_WORLD_SPEC.md`); W-1 waits on the user's
  approval of its pictures. Increments B–C may use stand-in rooms built from existing kits until then; the orders get
  the new places' handles (sleeping quarters, maintenance workshop, service passages, archive, shelter control).

## Next executable task
Increment 0, then A, by one agent on `expansion/ballastra`, as soon as an agent slot is free (2.11: the connections
audit and the benches are running).
