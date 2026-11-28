# #71 / P159: the well at the end of Chapter 1 — "Where Does the Water Go?" (the user's spec, 28.11, verbatim)

Implement a playable redesign of the underground well at the end of Chapter 1 in LBA3: The Awakening. Working title: “Where Does the Water Go?” Use this as an internal title; the player does not need a quest banner.

The player has already earned the rope ladder. Once Twinsen climbs down, give him a small adventure: follow the missing water, solve a physical puzzle, encounter a crystal tick caught in an old piece of machinery, and discover why the magic ball is drawn to the wall. Aim for 8–12 minutes on a curious first playthrough. A player who understands the puzzle should finish faster. Do not add waiting or errands to reach a duration target.

Start by reading the project instructions, STORY-CURRENT.he.md if present, the actual Chapter 1 and Chapter 2 scripts, the well scene, and the current magic-ball and crystal-tick behavior. Run the existing sequence before changing it if possible. Preserve the house tutorial, Mira’s key, Gilbert’s kick, the harbor bell, the rope ladder, and Chapter 2’s opening. Adapt the design below to the actual geometry and controls. Implement it in the game, not just in a design document.

## 1. THE FOOT OF THE LADDER — FOLLOW THE BUCKET
Twinsen reaches the bottom expecting a dry well. There is warm water around his feet. An old tin bucket lies on its side. Three knocks travel through the pipe. The water pulls sideways, dragging the bucket beneath a low stone arch. When the water returns, the bucket does not. A metallic knock comes from beyond the arch.

Give the player control during this discovery. Let them follow the bucket when the water recedes. A dark wet line on the stone, the exposed floor and the movement of the bucket make the cycle readable without sound. If Twinsen moves too late, the returning water lifts him back to a safe ledge. He can immediately try again. No damage, countdown or forced camera pan. Use the established three-knock rhythm; do not introduce Arthur’s later two-knock signal here.

## 2. THE WASH ROOM — ONE PUZZLE, TWO PHYSICAL ACTIONS
Beyond the arch is an old well-cleaning mechanism. Arrange it so the player can see four things from the normal gameplay camera: the bucket jammed in a small waterwheel, a wooden gate that diverts the stream, the connection between the wheel and a raised maintenance bridge, and the ledge the bridge would reach.

The player can:
- Knock the bucket free with the magic ball.
- Turn the wooden gate by hand to direct water onto the wheel.

Both orders must work. If the bucket comes out first, it lands with a familiar clang, but the free wheel stays still because the stream passes underneath. If the gate is turned first, water hits the blades; the wheel strains and the bucket visibly rattles. Once both conditions are met, the wheel turns and lowers the bridge. A mechanical catch holds it in place. The player can cross at leisure.

Make this readable through motion and sound. Allow an observant player to solve it on the first attempt. If testing shows that people miss the gate, improve its position, handle or contrast before adding text. Reuse the existing interaction prompt and actual input bindings.

## 3. THE STRAINER POOL — A FIRST MINI-BOSS THAT BELONGS HERE
At the far ledge, a small familiar crystal tick scurries past what looks like a lump of crystal caught in half a rusty strainer. The lump stands up: a much larger tick has grown into the metal. Stage it so the player can recognize the animal underneath. Its aim is to drive Twinsen away from its feeding place.

Build one short encounter around the water rule the player already learned:
- Before charging, the tick plants its front legs and drags the metal rim backward. Both the pose and scrape give the player time to step aside. A ball thrown directly at the strainer makes the same tin sound as the bucket and glances off.
- The water runs across a shallow channel toward a fixed grate. From a safe patch of stone on the far side, Twinsen can lure the tick across during a pull. The current catches the broad metal rim and pins it against the grate. The creature keeps pushing, exposing a bent clasp.
- One well-aimed ball opens the clasp. Give it a generous target from the ordinary camera: this is the first boss, and precise aiming has been a player complaint. If Twinsen misses the opening, the tick frees itself and the opportunity returns quickly. Keep the bridge solved. On death, restart immediately before the encounter with full health.
- When the clasp opens, the empty strainer stays against the grate. The tick raises its legs as though it might charge again, then turns and follows the little one into a crack. Give this moment room to land. No health-bar grind, loot chest, sword requirement or three identical phases.

## 4. BEHIND THE STRAINER — LET SENDELL END THE CHAPTER
The strainer had blocked the view into a dry recess. Beyond it are the three dark crystals from the existing ending. From this side of the pool, Twinsen can see all the crystal growth lean toward the same upward pipe when the pump runs. The player now has evidence that someone above is drawing water, but does not yet know who.

Let the player approach and ready the magic ball. Until now, every throw has gone where the player aimed. This time the ball pulls toward the wall on its own. Return it safely through the existing ball logic. Awaken the three crystals and preserve Sendell’s exact existing line:

“Twinsen. Someone has reached her.”

End the chapter there. Keep the surface well dry: Twinsen reopened a local maintenance passage, not Citadel’s water supply. Preserve the existing transition into Chapter 2. Do not reveal Vesk, the shell, or the identity of “her.” No explanatory conversation after Sendell speaks.

## 5. BUILD AND VERIFY
Use one shared pump cycle for water movement, sound, crystal motion and the mini-boss opening, so the cues agree. Prefer simple animated water surfaces and local triggers over a fluid simulation. Keep new art consistent with the existing well. Preserve save compatibility and English/Hebrew localization for any necessary new text.

Play the sequence from the ladder through the first playable moment of Chapter 2. Check both puzzle orders, a missed crossing, a missed clasp shot, death and retry, save/reload after lowering the bridge, and an older save already past the well. Verify that Sendell speaks once, the ball returns, the dry well remains dry and Chapter 2 starts with the correct objective. Test the puzzle muted and from the normal Follow camera. If hardware permits, compare frame pacing in the original and revised well under the same settings.

Deliver the implemented sequence, a short capture or exact local reproduction steps, and a concise report distinguishing what was played from what was only checked in code. The acceptance test is simple: a new player should be able to explain what moved the water and how they freed the creature, while still wanting to know who Sendell meant.
