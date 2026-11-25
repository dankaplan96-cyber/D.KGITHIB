# WAVE 7 · H-17 Missing Deliveries, H-18 Dallan's Debt (25.11.2026)

The user approved waves 1–8 of CONTENT-15H.md being built; nothing ships until the user picks from the pictures (P107).
The rows: CONTENT-15H.md §3 H-17, H-18; the cards: docs/future/EXPANSION_PLAN.md §4.5 OP-1 and OP-6 (the world parts:
EXPANSION_WORLD_SPEC.md W-8c). Evidence label for everything here: **Automated runtime only (SwiftShader, headless
Chromium)**. Nobody has played it; no hardware figure; no listening; no measured playtime.

## What the player does

### H-17 · Missing Deliveries (chapters 8–14 on Citadel; from Pippa's supplies in chapter 8 until the network ends)

| Step | Where | What happens | Clue |
|---|---|---|---|
| Hook | Pippa at her stall (or Tim, wherever he is) | Her second cart for the depot shelter never came: blankets and water casks. She chalked SHELTER on every crate. | Pippa; Tim |
| Chalk | beside Pippa's stall | One of her crates: SHELTER in chalk, a loop on the S (her hand). | the crate |
| Compare | the harbour's cargo lift (the opening's, not moved) | The lift has stalled with its hook down on a crate aboard the barge. E at the lift's control: the crate under the hook is stencilled STATION over Pippa's chalk SHELTER; the barge's other crate has nothing under its stencil (the project's own). A clamp on the lever: HELD, UNCLAIMED GOODS, KEY AT THE BAGGAGE CLAIM. | the tag |
| Ledger (optional) | Officer Odile | The lift crew restencilled them; the station never collected; the paper and the key went to Osk at the baggage claim. "It's all perfectly in order. That's the trouble." | Odile |
| Claim | the baggage claim (the 'bug' house in Bug Street), Osk upstairs | Held for the station: what's in them? Drill parts / blankets and water casks / lamp oil and rope. Wrong: "What would Pippa chalk on a crate?" (nothing lost). Right: never the station's; the back store opens off the old conveyor's lever, which "only listens to a kick". | Osk |
| Kick | the back store: a wire cage in the front hall | The lever (E): seized solid. A melee hit (fists, sword) frees it. | Osk's line |
| Lever | the same | Run it in: the wrong way (the bales bump the back door; nothing lost). Run it out: the roller shutter rolls up, the conveyor brings the bales out. | |
| Inside | the cage | The lift's key on its hook (found, carried). The back door (E): unbolted. It opens the back passage: a door on the house's west wall, behind the house by the sea wall's stair; it stays open for the rest of the game. | |
| Lift | the cargo lift | The key frees the clamp. A menu: Hoist / Swing over and lower / Lower it back. Swinging first only heels the barge (nothing moves); Hoist, then Swing: the crate set down on the pier. | |
| Delivery | Pippa | "Tim! Lulu! Take the cart." A clover leaf (15 kashes at nine). | |
| After | the depot shelter; the harbour | Blankets and water casks stacked by the shelter's door while the shelters are in use (chapters 8–16); the crate gone from the pier meanwhile; Tim's line ("Lulu rode on top the whole way"), Pippa's, Osk's. In the ending the lift is as the opening left it. | |

### H-18 · Dallan's Debt (chapter 14 after the bore's relay is held, and the ending's free play; Kesh)

| Step | Where | What happens |
|---|---|---|
| Torn | Lumi's loom | The vent's blast tore her shade: what is left sags between the two low poles, a rag hangs off one, the rest lies by the high pole's foot. |
| Ask | Lumi | A choice. "Dallan should pay for this." — "With an apology? I've had the project's apology. It was a form." (nothing gained). "What do you need?" — canvas, two poles, the top ring back on its hook; the canvas is the project's. |
| Dallan | at the bore (or in Kesh, in the ending) | Twinsen tells him. "The store key is still on my belt." "I can carry it." "No. I'll carry it." No apology. He is at the sail with the canvas roll and two poles; the two low corners tied, the third corner on the ground with its ring. |
| Ring | the high pole's hook | A ball target: the ball takes the ring up onto the hook. The sail is up. Lumi: "The sail's straight. That's something." Dallan: "I'll check the knots after the next wind." |
| After | | Lumi: "I check it every morning anyway." Dallan: "Knots held." Lumi is not won over. |

## Flags (new only; save format 6 unchanged)

`w7m_hook, w7m_labels, w7m_tag, w7m_ledger, w7m_claim, w7m_wrong (n), w7m_free, w7m_store, w7m_key, w7m_back,
w7m_unclamp, w7m_hoist, w7m_lift, w7m_done, w7m_piAfter, w7m_timAfter, w7m_osAfter`;
`w7d_paid, w7d_need, w7d_dallan, w7d_up, w7d_luAfter, w7d_daAfter`. An old save has none (base-11-town and
base-13-desert, format 5, load with none made up). applyFlags keeps them consistent (a later step implies the earlier
ones). A lift, shutter or lever moving is not saved: a load stands each where its flags put it.

Nothing on the main path needs either story; neither changes a main-path rule. H-17 is open only while the shelters are
in use (the depot shelter is where the goods go); a player who never does it loses nothing.

## Files

- `src/game/story/wave7.js` (new): both stories (talk, interactions, the lift's and the store's moves, the kick, the ring,
  the journal's two sections, the pocket).
- `src/game/wave7world.js` (new): the pieces (below).
- `src/game/text/wave7.js`, `src/game/text/he/wave7.js` (new), `src/game/he-text.js` (bundled).
- `src/game/story/index.js`: wired in (placeFirst for Dallan, decorate, region builds, doors and the back exit, talk,
  interact, the kick, update, flags, journal, items).
- `src/game/baggage.js`: BAGGAGE_PLAN.store; the back door's opening in the left wall; the two drums moved from where
  the cage stands to the front rim; the striped cloth moved past the front door.
- `src/game/roomlife.js`: Osk `stays` in the evacuation (he signs for held goods; the rooms otherwise empty then).
- `src/game/keshlife.js`: the sail's mesh, poles and ground function exposed (`out.sail`), nothing changed in its look.
- `tests/wave7.mjs` (new, the one suite). Docs: this file; CONTENT-15H.md (H-17/H-18 Built).

Not touched: `story/depth.js`, any keys/clover file, the harbour's layout (the lift, barge, crates stay where they were).

## Visible changes (P107: the user picks)

1. The cargo lift (chapters 8–14 while the story is open): the hook down on its crate aboard the barge (the opening's
   own crate, the cycle's first pose) instead of the crate on the pier; STATION stencils on the lift's two crates; a
   clamp and a red tag on its lever. After the delivery the pier spot is empty until the ending.
2. A chalked crate beside Pippa's stall (chapters 8–14 while open).
3. The baggage claim: a wire cage with a roller shutter and a sign (BACK STORE · STAFF ONLY) against the front hall's
   left wall, a lever outside it, a short conveyor and two bales inside, a key on a hook; a back door in the left wall
   (always there; bolted until opened). The two drums moved to the front rim, the striped cloth past the front door.
4. The 'bug' house's west wall: a plank back door with a frame, lintel and step (always there; it opens once unbolted).
5. The depot shelter's door: three bales and two water casks after the delivery (chapters 8–16).
6. Kesh: Lumi's shade torn (chapter 14 after the bore, and the ending, until fixed), rigged by Dallan with a canvas
   roll and two poles beside it, then up again (the original sail).
7. Osk is in the baggage claim during the evacuation (the rooms were empty then except Luc and Mr Bazoo).

## Tests (Automated runtime only, SwiftShader)

RESULTS-PLACEHOLDER

## Questions for the user

1. Keep the visible pieces above? In particular the back door on the 'bug' house's west wall and the cage in the
   baggage claim (both always visible; the cage moved two drums and a cloth).
2. The card had the cart "on the cargo lift … lowered to the path side". The opening's lift is a derrick that swings
   crates from the barge onto the pier (it was not moved), so the stalled load is its own crate on the barge and the
   lowering is its hoist-and-swing. Keep, or should the lift get a second stop?
3. The back passage is a short way (behind the house, by the sea wall's stair, to Bug Street and the square), not a
   long shortcut. Is that enough, or should it lead somewhere further (a new path would mean world changes)?
4. Osk now stays in the evacuation. Keep, or should the claim in chapter 8 go through someone else?
5. H-17 closes when the network ends (the shelters empty). Should it stay open in the ending's free play too (the card
   said "postgame (outcome kept)", read here as: the outcome stays, the story does not start then)?

## Known gaps (concrete)

- Tim and Lulu do not visibly push the cart (Pippa sends them; the result shows at the shelter).
- The shelter's stock is not referred to by anyone in chapters 9–14 except Tim and Pippa (one line each, once).
- Dallan is placed at the sail (he does not walk the 100 m from the bore on screen).
- The stencils and the chalk are small at the play camera (pictures 01, 02); the lines carry them.
- The canvas roll and the rigged sail use the sail's own striped material; no new texture.
- Minutes: unmeasured. The card estimates (25 + 10 min first play) are not claimed; the bot knows every answer.

## Hebrew summary (סיכום בעברית)

RESULTS-HE-PLACEHOLDER
