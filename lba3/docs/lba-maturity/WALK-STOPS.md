# WALK-STOPS — the residents' stops on the shop's terrace (24.11)

Base: origin/ccr-c1c2c4b9-dep6ed at dd12facf. Automated runtime only (SwiftShader, headless Chromium).

## Fault
tests/walkers.mjs 36/37: brix_warm, tibbo_counter and tibbo_bench "not walkable".

## Cause (two, both from P113)
1. **The planner read the terrace as a bench.** walknav.js treats a low brick on land (0.25–0.7 m over the terrain) as
   something to walk round. P113's terrace is a brick 0.4–0.45 m over the street, so every cell on it was refused.
   The kerb stones and lawn edges from P112 were not involved: the probe found only the terrace's box.
2. **A door tub closed the landing.** P113 also put the shop's door tubs on the terrace. The + side tub stood at
   (-34.05, 0.55), on Tibbo's bench stop (-34.0, 0.7). Together with the heat post, it left 0.25 m between them.
   The landing runs 1.47 m from the wall to the edge, so a tub anywhere on it shuts it. Even with fix 1, the counter
   and the south part of the landing were cut off from the square.

## Fix (game-wide)
- town.js buildTerrace: every terrace's collider is marked `deck`. walknav.js `deckAt`: on a deck, its top is the
  land, so it is neither raised nor a low brick. Off the deck, its side to the street is still a kerb that walkers go
  round. They reach it from the raised ground it joins (the square's platform).
- citydress.js: no door tub is placed on a house's terrace.
- town.js heatPosts: a post on a terrace stands on its top. The shop's post had been sunk 0.4 m into it.

## Sweep
Terraces exist only where town.js doorLift finds one: Citadel's HOUSES. Today that is the shop. No other region builds
terraces. The `deck` rule and the tub rule cover every house that gets a terrace. The walkers suite still passes for
every resident in Citadel (12), on Zeelich's street (3) and in Kesh (3). WC-3's other areas are not in this suite.

## Evidence
- `tests/walkers.mjs`, run once: **37/37, VERDICT PASS**.
  - Tibbo: 108 m in 5 min, 3 stops, 0 in a collider.
  - Brix: 169 m, 5 stops.
  - No stop was given up, and no route was missing. All 66 legs were planned.
- Probe (scratch, not kept): all of Tibbo's and Brix's legs plan (tibbo_well > tibbo_counter, tibbo_bench >
  tibbo_well, brix_benchE > brix_warm, brix_warm > brix_well were false before).
- Pictures: `captures/walk-stops/before.jpg` and `after.jpg` (the shop from the square).

## Visible changes (for the user's pick)
1. The shop's flower tub beside the heat post is gone. P113 had placed it on the terrace. The other door tub does not
   appear in the before picture either.
2. The shop's heat post stands on the terrace instead of sunk 0.4 m into it.

Tibbo's stops did not move.
