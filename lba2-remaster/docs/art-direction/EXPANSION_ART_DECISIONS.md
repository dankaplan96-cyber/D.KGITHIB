# Expansion art decisions (evolved Twinsun, Nera, Sendell's underground)

Status words: Proposed → Selected (by the user) → Implemented → Visually checked → Performance verified.
A selected concept is not an implemented or validated environment. Nothing below is approved unless it says "Selected".
Gate: design exploration and isolated previews may proceed now; nothing goes into the campaign before the current game's
completion gate (docs/future/EXPANSION_BRIEF.md, docs/lba3-paired-production/RUN_STATE.md). New Nera and underground
details are original proposals for this unofficial continuation, not LBA canon.

## Baseline (inspected 28.10, build 0.34.0 + AUDIO-BUFFER, captures in the scratchpad artdir/now/)
Works: clear silhouettes and colour identity (Twinsen's blue tunic, Zoé in red); Citadel's original layout and warm palette;
parametric houses (plaster/stone walls, tiled roofs, shutters, beams, chimneys, awnings); readable iso rooms; a Blender
character pipeline (tools/blender/*.py) with one smoothness standard (CAST-UNIFORM); lazy regions; static shadow cache.
Weak: uniform smooth vertex colours read as plastic; flat walls and flat green ground; faces still faceted, thin necks
and arms; the well cave is a dark box of generic crystals; at the Far camera characters are small, so silhouettes matter
more than face detail.
Performance context: Medium ~60 on the Vega 8 plugged in; High 54.5 street / 45 arrival (CPU-bound, being fixed);
battery Medium street ~47.5 as played. Any richer direction has to be paid for, not assumed.

## D1 — Overall style (Selected 28.10)
Options shown 28.10: A faithful refined LBA · B handcrafted adventure · C rich animated-film presentation.
Recommendation: B for environments, A's restraint and silhouettes for characters.
Selected: A+B as recommended (the user, 28.10: "A+B, what you recommended"): B (handcrafted) for environments — tactile stone, painted wood, cloth, ceramic, repairs, slight asymmetry; A (faithful, refined LBA) for characters — soft forms, restrained texture, clear colour, silhouettes first, geometry (faces, necks, hands) before effects.
Implemented: no · Visually checked: no · Performance verified: no.
Next: an in-engine comparison (same view of Twinsen's house, same camera and light: today vs the A+B treatment) before applying it widely; it may be built as an isolated preview, not in the campaign.
Undecided: everything after D1 — next round D2 (Twinsun twelve years later: gentle evolution / old town + new infrastructure / growing trading town), when the user wants it (Twinsun degree of change, Nera identity, inhabitants, underground mood).
Concept images: none (no free image-generation tool authorised); comparisons will be in-engine previews.

## D2 — Twinsun twelve years later (Selected 28.10)
Options: A gentle evolution · B old town, new infrastructure · C a growing trading town.
Selected: B as the primary direction (the user, 28.10: "an old town with new infrastructure laid over it"). Familiar buildings and
geography stay recognisable; project pipes, cargo lifts and imported equipment visibly attach to older homes and public buildings
(a pipe routed round a window, a guard post turned workshop, an old sign under a new one, a cargo mechanism residents depend on),
each with a purpose, plus one small repair problem that can matter in the evacuation. A/C only as small accents (repairs, a few Zeelich goods).
Addition (the user, 28.10): here and there a newer building on the promenade/waterfront that looks more like Zeelich (Zeelich's
building language as imported architecture: a few, on the harbour front, not in the old core), as a sign of trade and the years.
Implemented: no · Visually checked: no · Performance verified: no.
Next: the street near Twinsen's house as the first isolated preview (three silhouettes, recessed windows and doors, thick roofs,
one shop interior, old/new junction, the repair problem), built in the A+B treatment of D1.

## D3 — Nera's identity (Selected 28.10)
Options: A archipelago of arches · B floating towns · C ceramic water cities.
Recommendation: B as the base (moving platforms, counterweights, boat lifts: the balancing mechanisms the story needs), a few of A's
great arches as the skyline anchor, one C element (the old House of Balances in glazed ceramic and stone).
Naming: existing NPC "Nara" (Zeelich, story/arsenal.js) — "Nera" is too close; decide a name later.
Selected: the recommendation (the user, 28.10: "I'll go with your recommendation"): floating towns as the base, a few great stone arches
as the skyline anchor, the House of Balances in glazed ceramic and stone. Harbour, homes, gardens and the old facility keep distinct
functions and moods; not one gimmick for the whole planet.
Implemented: no · Visually checked: no · Performance verified: no.
Undecided next: D4 Nera's inhabitants (compact canal dwellers / tall arch dwellers / mixed trading population), then Tessa and Oren;
D5 Sendell's underground mood; the planet's final name.

## D4 — Nera's inhabitants (Selected 28.10, the user: "going with your direction")
Options: A compact canal dwellers · B tall arch dwellers · C mixed trading population.
Selected: C with A's compact canal dwellers as the one local species (shoulder-high to Twinsen, round faces, broad feet, fan ears,
stable working poses on moving platforms), plus visitors from established worlds (Esmers, Twinsun traders) told apart by silhouette,
clothing and behaviour, not tiny facial detail. Proposals, not canon. Implemented: no.

## D5 — Sendell's underground mood (Selected 28.10)
Options: A quiet wonder · B a living interior · C fragile grandeur.
Selected: A as the emotional base (warm lakes, translucent mineral layers, reflected light, slow motion), chosen elements of B
(root-like forms, pressure channels, a slow rhythm; no body horror), C only at key story places (e.g. "The Wound in the Shell").
Must not read as another crystal cave. Implemented: no.

## D6 — The planet's name (Selected 28.10)
Options: A Noria · B Ballastra · C Lissune. Selected: B "Ballastra" (from ballast/balance; no confusion with the NPC Nara).
Docs that say "Nera" (EXPANSION_BRIEF.md etc.) mean Ballastra from now on; rename in code when the expansion is implemented.
