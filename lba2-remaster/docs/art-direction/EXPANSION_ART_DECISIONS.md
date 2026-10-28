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
