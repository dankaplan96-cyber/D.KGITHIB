# AUDIT-CH12, chapters 1–2 (28.10.2026)

The user plays these chapters; this list is safe to share with them.
Screenshots are in the session's scratchpad (audit-ch12/), not in the repo.

| # | Place | What is wrong | Source | Size | Batch | Status |
|---|---|---|---|---|---|---|
| 1 | Fort yard, station gate, beam pad (ch2) | The Follow camera collapses into walls, floors and roofs (arm a few metres); the classic camera is fine there | camera.js `_chase` clearance, CH_MIN, occluded() | M | CAM | Fixed (CAM-CLEAR-2): swings round him, dips under the gate arch or side-steps a post before drawing in. Far arm: pad 5.05 → 10.75 m; gate passage 6.6 m floor view → 10.75 m; yard after walking in 0.55 m → 8.3 m after 3 s |
| 2 | Leaving the house | Follow at Far sits 1.3–4 m behind him with the fence behind | camera.js `_chase`, snap() after doors | M | CAM | Fixed (CAM-CLEAR-2): out of the door the shot starts swung clear at the full arm, 1.85 → 10.75 m, and holds 1.5 s |
| 3 | Journal (ch2) | Shows the next, unfinished step in the past tense (a spoiler and false) | chapter1.js journal() ~526; text/ch1.js | S | STORY | |
| 4 | Third valve | The water's return is only narration over the cliff view: no cut to the well or the heat posts | chapter1.js waterReturns() ~273 | M | STORY | |
| 5 | Valves | The valve plays the treasure-chest sound; no hiss or water cue; the target hit only rumbles | chapter1.js:264, main.js hitTarget | S | STORY | |
| 6 | Twinsen from behind (Follow) | Reads as a mushroom with a bald scalp ring | characters.js hair; assets/poly twinsen | M | ART | |
| 7 | Project office stealth | Zoé's guard vision cone drawn outside the room | chapter1.js watcher / interiors projoffice | S | STORY | |
| 8 | Well cave | ~90 hard white square steam sprites around the crystals | interiors.js:891 steam Points | S | STORY | |
| 9 | Harbour | The harbour master's shed is a plain box in the ferry cutscene (VP-12) | prologue.js:73 | M | ART | |
| 10 | Lighthouse | Untextured stacked cylinders, a slab door, no windows | world.js:865 | M | ART | |
| 11 | Square | Pippa's stall canopy is a flat yellow plane (meant to be striped) | town.js ~452 | S | STORY | |
| 12 | Whispering Cliffs foot | Follow rises ~24 m over the cliff; Twinsen only a silhouette | camera.js over-the-rim lift | M | CAM | Fixed (CAM-CLEAR-2): lift capped at 55° over his pivot, the view swung along the cliff foot: 24.3 → 7.3 m above him, seen |
| 13 | Zoé at the gate, Vesk at the pad | Speakers not framed; Twinsen's face from above afterwards | dialogue camera; chapter1.js ~300 | M | CAM | Fixed (CAM-CLEAR-2): under Follow a dialogue frames him and everyone who has spoken in it (eased in and back out). The beam pad's arch can still cross part of Vesk's shot |
| 14 | Lane by the Bug house | Camera in the wall | camera.js clearance | M | CAM | Fixed (CAM-CLEAR-2): 1.59 m against the wall → 10.75 m clear, about 3 s after he stops |
| 15 | Depot valve | Follow sits behind a thick pipe across the screen | camera occluders; island.js pipeRun | S–M | CAM | Fixed (CAM-CLEAR-2): a pipe across the line to his feet now counts against a view, so the camera picks one over it (nothing is faded) |
| 16 | Square | The statue's heads are faceted lumps; Gilbert reads rough at the first talk | statue.js; characters.js | M | ART | |
| 17 | House | The exit is hard to find; "Talk" shows with nobody in reach | interiors.js house exit; prologue objective | S | STORY | |
| 18 | After the cave | The Chapter 2 card's text is tiny and low-contrast | hud.js chapter card, css | S | STORY | |
| 19 | Water Office | Mira still asks for the valves after they're open | chapter1.js:227; text/ch1.js:215 | S | STORY | |
| 20 | Cliff path start | Stray flat green plates on the dirt (the stones before they rise) | world.js/island.js raiseStones | S | STORY | |
| 21 | Minor | Jump hint ignores pause; "Fists" pill in Zoé's stealth; dim valve toasts; small control-room framing; tall Controls screen; crowded holomap labels | various | S | STORY | |

Checked, fine: the opening cinematic, the cliff climb, the orchard lob, the depot valve, Zoé's stealth, dialogues at 1280/960, the shop, pause, settings, inventory; no console errors.
Note: the default camera for new players is the classic LBA view; Follow is opt-in.
