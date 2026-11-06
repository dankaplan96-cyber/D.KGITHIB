# LBA3: The Awakening — Future Expansion Implementation Brief

מסמך עבודה לקלוד קוד: הרחבה עתידית לכ־15 שעות, רק אחרי השלמת המשחק הנוכחי.
להפעלה: קרא את כל הקובץ. בדוק תחילה את תנאי הכניסה. אם המשחק הנוכחי טרם הושלם, רשום את ההרחבה כעבודה עתידית והמשך במשימה הנוכחית. אל תתחיל לבנות אותה עכשיו.

## 1. Your assignment and when it begins

You are working on the existing LBA3: The Awakening project. This document is the consolidated brief for a FUTURE expansion of that game into a richer adventure of approximately 15 hours. It is not an instruction to interrupt the current production milestone.

FIRST FINISH AND VERIFY THE CURRENT GAME. Only then implement this expansion in a separate development branch or equivalent isolated workspace. Keep the completed base version recoverable. Do not deploy, publish, or overwrite a released build merely because this brief exists.

If the current milestone is incomplete, record this document in the future backlog, state which entry conditions remain, and continue the already authorized current work. Do not create new regions, insert story hooks, rewrite chapters, or build expansion systems before the gate passes. This is an execution prerequisite, not a background scheduler: do not claim you will monitor or resume outside an active session.

When the gate is satisfied and you are executing this brief, implement the work. Do not stop at a design document or ask the user to repeatedly say “continue.” Make routine decisions from the project and this brief. If genuinely blocked by access, missing assets, or unresolved contradictory requirements, complete unaffected work and report the specific blocker. Keep a resumable checkpoint when a session ends.

## 2. Entry gate: the completed base game

Read the repository instructions, current production plan, source, asset manifests, story bible, story map, save format, and test reports. In particular inspect:

- `docs/STORY_SYNOPSIS.he.md`
- `docs/lba3-production/STORY_MAP.md`
- The actual location of `STORY_BIBLE.md` and any newer approved story decisions.

The supplied synopsis says the 12 chapters are playable and estimates 3–5 hours. Treat this as a handoff claim to verify, not proof of readiness. The appendix preserves the supplied synopsis as a dated reference; newer explicit user decisions take precedence.

The base gate requires evidence for:

1. A normal new-game route through all current chapters, the core confrontation, ending, and postgame exploration.
2. Reliable saves and reloads at chapter boundaries and important mid-quest states.
3. No known progression blockers, reproducible crashes, lost mandatory items, or broken mandatory interactions.
4. Working movement, ball aiming, combat, cutscenes, transitions, and supported input methods.
5. Representative visual review and measured performance against the project's declared hardware/settings target.
6. A recorded base commit/build, known-issues list, and reproducible validation procedure.

Do not equate compiling with completion. Do not require a fictitious “zero bugs” certificate. Separate tested, inferred, and untested claims. If target hardware is unavailable, state that limitation rather than fabricating FPS. If readiness cannot be established, do not silently bypass this gate.

## 3. Scope and creative direction

Expand the existing adventure rather than replacing it. Add one substantial new planet, deepen the current regions, and develop the world beneath Twinsun around Sendell. Make the new journey necessary to the existing resolution.

Target approximately 12 hours of main story plus 3 hours of worthwhile optional content for a first-time player. This is a planning target, not a guaranteed runtime and not 15 hours of mandatory story. Measure and adjust through playtests. Do not count loading, retries, idle waiting, repeated dialogue, or unnecessary travel as new content.

LBA1 and LBA2 inform warmth, strange everyday life, readable adventure puzzles, memorable inhabitants, and discovery. Preserve the current project's visual improvements and responsive controls. All new lore below is original proposed material for this unofficial continuation; do not present it as established LBA canon.

The final experience must remain English only. Write brief, natural dialogue and clear objectives. Most turns should contain one or two sentences. Avoid prophecy slogans, dramatic filler, long explanations, and HUD paragraphs. Important revelations happen through play and consequences.

## 4. Continuity rules

- The story is approximately 12 years after LBA2. Twinsen is the principal playable character; Zoé and their 12-year-old son Arthur matter as people.
- FunFrock stays dead. Old structures may remain; no resurrection twist.
- Vesk remains the antagonist. He initially helps, wants the power beneath the shell, conceals danger, and does not repent at the finale.
- Sendell is not secretly evil. The protected entity is young and disturbed before it is ready.
- The Joint Project genuinely supplies heat, water, transport, and livelihoods. Simply shutting it down cannot repair the damage.
- The solution remains adapting the existing installations into a stabilizing shield through coordinated action.
- No ordinary nighttime on Twinsun. The supplied project rule is “no night”; do not add a day/night system on Nera either without an approved lore change.
- Planets are distinct. Travel to Nera is by spacecraft, not a tunnel or magic portal from Sendell's world.
- Zoé makes decisions and playable discoveries. Arthur is not a new chosen hero.
- Preserve the existing final victory, Vesk's arrest, and the human homecoming. No larger villain reveal after the victory and no compulsory sequel tease.

Important chronology repair: Chapter 8 currently has Vesk announce completion in three days. The new journey must not contradict this. After the Council, add a playable temporary intervention that throttles remote project feed stations, buying a limited additional window. Show its effect and cost: reduced heating or transport, emergency local substitutes, and Vesk bypassing it progressively. It delays drilling; it does not solve the shell problem. Explain in one short exchange that the earlier estimate changed. Do not leave the old deadline intact while adding an unexplained long journey, and do not introduce an unforgiving real-time countdown across free exploration. Use explicit story milestones for escalation.

## 5. Integration into the current story

Preserve stable internal chapter and quest identifiers where possible; display numbering can change. The desired causal sequence is:

1. Existing Chapters 1–7: deepen local life, optional discoveries, and usable systems. Seed Nera through a shipment marking or technical supplier record when expansion implementation begins.
2. Existing Chapters 8–9: evacuation and Council remain decisive. Zoé compares archive records with Ilka's findings and uncovers rejected Nera regulator trials.
3. New bridge: the allies buy time through the temporary intervention. Baldino discovers that the proposed shield needs adaptive control, not only more power.
4. First exploration of Sendell's outer underground world: obtain measurements of changing shell pressure and see why fixed output displaces stress elsewhere.
5. Journey to Nera: learn from a society with useful regulation knowledge and a painful history of centralized control.
6. Return and expanded Baldino network: adapt existing stations to coordinated local regulation using the new knowledge and prototype.
7. Second underground passage: earlier discoveries and placed instruments now help navigate damage caused by continued drilling.
8. Existing core climax, enriched with previously learned mechanics and ally responses; then the homecoming and changed-world exploration.

Do not append an entirely new existential emergency after the core. “After completing the current game” means development order, not that all expansion story events occur after its ending.

## 6. Why the new planet is necessary

Baldino can reverse the project's energy flow, but a rigid shield concentrates stress whenever the entity shifts or reacts. Sendell has been compensating and is weakening. Twinsen's first underground survey demonstrates the problem rather than merely hearing a lecture about it.

Nera has developed mechanisms that balance changing water pressure among connected districts. Their engineering principle can be adapted to the shield. They cannot instantly repair Twinsun and possess no universal magic crystal. Success requires measurements, a prototype, local expertise, existing station upgrades, and the player reaching the core.

Zoé discovers that Vesk previously considered a Nera regulator but rejected the distributed design because local stations could override central commands. This strengthens his existing motive: he chooses concentrated power and personal control despite evidence of the consequences. Do not reduce him to a merely misunderstood engineer.

## 7. Nera: a lived-in new planet

Working name: Nera. Check the repository for naming collisions before adopting it. In particular distinguish it clearly from existing NPC Nara.

Nera has shallow seas, hollow island formations, and enormous natural stone arches with inhabited neighborhoods. Canals, bridges, boat lifts, and water gardens change with managed water levels. The visual language combines weathered stone, glazed ceramic, cloth, wood, floats, counterweights, wind, and resonant mechanical devices. Avoid generic futuristic screens and an empty science-fiction megacity.

Arrival should create curiosity and relief before the larger conflict resumes. Residents have ordinary concerns: late deliveries, leaking roofs, irrigation, noise, work, and family. Twinsen is a visitor who earns cooperation, not a celebrity everyone immediately obeys.

Four connected locations:

| Location | Identity and play | Visible change |
|---|---|---|
| Float Harbor | Cargo cranes, boat lifts, customs, repair shed, a stranded working boat | Repaired lift restores traffic and opens a shortcut |
| Arch District | Homes over canals, market, workshop interiors, narrow stairways, a public meeting place | Rebalanced water restores access and residents return |
| Water Gardens | Cultivation rafts, irrigation, shifting walkways, shared water infrastructure | Fair distribution restores gardens and keeps a workshop running |
| House of Balances | Partly submerged former control facility; damaged records, floats, gates, maintenance passages | A safe route and working test chamber remain after completion |

Each location needs purposeful interiors, distinct silhouettes, landmarks visible from multiple approaches, legible navigation, and staged world-state changes. Build these as connected manageable regions, not one permanently active enormous scene.

Water puzzles use locally controllable levels or short predictable cycles. Never make the player wait several minutes for a tide. Show how controls affect water and routes before asking for a complicated solution. Support reset/recovery without erasing quest progress.

## 8. Nera's recurring characters

### Tessa — maintenance mechanic

Wants working infrastructure and promises that can be tested. Avoids being made responsible for someone else's grand plan. Knows the working harbor and the old regulator's practical faults. Initially helps only with a bounded repair; later collaborates with Baldino after seeing the prototype tested. Practical, dry humor, brief speech. Give her an identifiable silhouette and repair gestures. She is an ally with expertise, not a replacement for Zoé.

### Oren — former system designer

Wants his surviving work understood but avoids people harmed by his decisions. Knows the old balancing system and why its safeguards were bypassed. His involvement becomes useful only after he confronts the consequences and helps repair them. Do not make a single apology erase community distrust.

### The residents

Develop a small named set of growers, a workshop owner, a dock worker, and a neighborhood representative. Give each one a specific interest in the system. Reuse them across quests and aftermaths instead of spawning an unrelated quest giver for every task.

Historical conflict: Nera once used a centralized water network that favored wealthy districts and flooded poorer ones. This is original new lore. Their caution about a planet-wide control proposal is reasonable. Show physical remnants and differing memories, not a long history panel.

## 9. Nera main quest chain

These are connected playable sequences, not six dialogue checkpoints. Expand each into concrete objectives, spaces, interactions, setbacks, and recoverable state transitions.

### N1 — Wrong Dock

- Who/where: Tessa and dock workers, Float Harbor.
- Goal: Free a stranded working boat and reach the inhabited district.
- Actions: Inspect the lift, move a counterweight, hit a visible crane release with the magic ball, then cross the repaired route. Teach the weight/level relationship safely before any timing challenge.
- Complication: Releasing the crane alone shifts weight and blocks the pedestrian platform; the player must balance both uses.
- Result: Harbor traffic resumes, a shortcut opens, and Tessa agrees to inspect Twinsen's measurements.
- Recovery: Falls return to a safe platform; required weights cannot become permanently inaccessible.

### N2 — The Missing Water

- Who/where: Growers and a workshop owner, Water Gardens and service passages.
- Goal: Find why one district's water has stopped.
- Actions: Trace visible flow, compare two gauges, enter a service tunnel, discover an unrecorded diversion powering a useful workshop.
- Resolution: Repair a bypass and share flow rather than simply destroying the workshop's supply. Use the ball for distant controls and a physical routing puzzle.
- Result: Both services function at sustainable output; residents recognize Twinsen's solution later.
- Recovery: Incorrect settings visibly reduce flow and can be reset; no irreversible crop death from experimentation.

### N3 — The Uninvited Engineer

- Who/where: Oren and affected residents, Arch District and former pump rooms.
- Goal: Obtain usable regulator plans and understand the old failure.
- Actions: Follow physical traces, compare a plan with the installed machinery, help gain access through a resident's repair task, reconstruct which safeguard was deliberately bypassed.
- Result: Oren contributes incomplete but useful plans. The player understands that the failure involved choices about whose homes mattered.
- Avoid: A long speech followed by an unexplained key reward.

### N4 — Vesk's Shipment

- Who/where: Project procurement staff, harbor warehouse.
- Goal: Recover test records and prevent loss of a necessary regulator assembly.
- Actions: Follow marked crates, inspect paperwork, use a borrowed work disguise and service route. Offer a short combat recovery path if stealth is detected; do not make perfect stealth mandatory without warning.
- Revelation: A standing procurement order shows Vesk rejected distributed safeguards while purchasing remaining compatible equipment. Use a local contractor; Vesk remains at the core rather than inexplicably appearing on Nera.
- Result: Obtain records and an assembly, open a freight shortcut, change warehouse security behavior coherently.
- Recovery: Detection must not destroy the only mandatory item or permanently lock the quest.

### N5 — The Filling House

- Who/where: Tessa and Oren, House of Balances.
- Goal: Recover the original mechanism and its operating data.
- Actions: Raise and lower water locally, use floats as movable platforms, hit remote releases with the ball, cut tangled nets with the sword, reroute pressure to reach the records chamber.
- Escalation: A known damaged gate changes the return route. Teach its failure risk beforehand. Mix traversal, observation, and a few purposeful encounters.
- Result: Mechanism and records recovered; a new safe route through the facility remains.
- Recovery: Save before major transitions; drowning or a failed jump restores the last safe state without duplicating or losing items.

### N6 — A Working Test

- Who/where: Tessa, Oren, and residents, Water Gardens test installation.
- Goal: Prove that the design can balance three changing loads without transferring failure to a neighbor.
- Actions: Assemble a prototype from acquired parts, observe pressure changes, assign local response ranges, then handle a controlled disturbance through movement and ball-operated switches.
- Result: Earn the plans, a tested prototype, and expert assistance. A short communication with Baldino establishes the adaptations still required for Twinsun.
- Finale preparation: This teaches the rule later used by the station network and core: respond to local signals and coordinate, rather than activate every switch indiscriminately.

## 10. Sendell's underground world

Create an ecosystem, not another town with ordinary shops. Use warm lakes, translucent mineral layers, roots, pressure channels, and changing light. Distinguish organic structures from the drilling machinery intruding into them. New visual details are proposed lore, not claims about the original games.

First visit, before Nera:

- Ilka's observations and Baldino's instruments enable access to the outer layers without unlocking Vesk's sealed main shaft early.
- Place three measuring devices through traversal and environmental puzzles.
- Learn that forcing one pressure point moves stress to another.
- Redirect light so Sendell can reveal a safe route; she cannot simply transport everyone or solve the machinery herself.
- See one clear connection between a surface installation and underground damage.
- Return with measurements that define the Nera task.

Second visit, on the final route:

- Continued drilling has changed familiar passages. Earlier instruments provide meaningful orientation.
- Use knowledge learned on Nera to stabilize passage without damaging the shell.
- Rejoin the existing cooling machinery, crystal galleries, and Sendell room.
- Preserve the emotional discovery that she cannot hold everything alone.

Keep the entity mysterious and vulnerable. Do not turn it into a surprise final boss or a device that grants arbitrary new abilities.

## 11. Deepen the existing cast through actions

- Twinsen: practical, occasionally impatient, willing to help with a small problem while facing a large one. Let him ask a concrete question instead of making a heroic speech.
- Zoé: extend the evacuation with a playable shelter-supply test. A failed centralized instruction leaves a real local need unmet; she coordinates a local solution. Her archive comparison makes the Nera journey possible.
- Arthur: he initially overloads the radio with messages and misses an acknowledgment. He and Pim develop a simple confirmation protocol. In the finale, familiar acknowledgments make their coordination understandable and earned. No magical destiny or blame for catastrophe.
- Baldino: useful inventions with limitations. Prototype testing, heat, power, and calibration matter. Nera knowledge augments his work instead of rendering him foolish.
- Vesk: show the rejected regulator design and orders that preserve his authority. He understands enough to be responsible for his harmful choices.
- Sendell: accepts distributed help while remaining protective. Her limits do not make her deceptive.
- Dalan: can help without suddenly becoming warm or harmless. A side story confronts one family excluded by his earlier decisions; useful action matters more than a confession.

## 12. Optional stories and existing-world depth

Aim for approximately three hours total across these stories and their discoveries, usually 25–40 minutes each. These are estimates to test, not timers to enforce. Give every quest a persistent outcome, a practical reward, and a concise aftermath.

| Story | People and place | What the player does | What changes |
|---|---|---|---|
| Missing Deliveries | Pippa, Mira, Citadel docks and shelters | Trace misrouted supplies, compare labels, open a storage route, redirect a stalled cart using an existing mechanism | Shelters become visibly supplied; a useful access route opens |
| The Last Shift | A recurring Zeelich worker and factory crew | Identify an essential production line, isolate unsafe machinery, reroute limited power while defending a repair | Essential work continues without the full project; worker assistance becomes available |
| Yorna's Map | Yorna and Pim, Hamalayi | Compare old landmarks with changed terrain, recover a buried store, mark a safe mountain route | A shortcut and shelter supply remain usable |
| Arthur's Boat | Arthur, Pim by radio, the family home and harbor | Help test steering and signaling on Arthur's model, retrieve it through a small observation/ball puzzle, correct a failed test | A family moment and clearer signal protocol; useful practice for later coordination |
| The Silent Bell | Residents and mechanic, Nera | Discover why a flood alarm was disabled, test its reach, reposition or separate its warning signals | A tolerable working alarm and a responsive neighborhood during later events |

Include Dalan's excluded-family consequence within existing evacuation/side content if it fits the time budget. Avoid expanding into an uncontrolled sixth quest chain solely to use every idea.

Optional tasks may provide shortcuts, equipment, easier routes, extra support, and richer epilogue reactions. The main story must remain completable without hidden optional flags. Teach mandatory signal knowledge on the main path even if Arthur's Boat was skipped.

Respect the existing loot direction: loose exploration rewards should primarily be weapons and equipment; ordinary money/health/magic belong in intentional searchable containers or established reward interactions. Do not carpet the new planet with collectible trails. Introduce new gear only if a real puzzle or combat role requires it, and do not make this expansion a separate equipment-system rewrite.

## 13. Pacing budget

| Segment | Approximate first-time main-path duration |
|---|---:|
| Home, Project, first Zeelich visit — existing Chapters 1–3 enriched | 2 h |
| Desert and Hamalayi — existing Chapters 4–7 enriched | 2.5 h |
| Evacuation and Council — existing Chapters 8–9 enriched | 1.5 h |
| Temporary intervention and first underground survey | 0.75 h |
| Nera's four locations and six connected quests | 3 h |
| Adapted network, deep return, and core climax | 2 h |
| Playable or clearly staged homecoming | 0.25 h |
| Main path subtotal | 12 h |
| Optional stories and meaningful exploration | 3 h |
| Total planning target | 15 h |

The existing 3–5-hour estimate will not become 15 hours merely by adding scenery. Enrich early chapters with spatial puzzles, useful conversations, alternate access routes, and consequences. Preserve pacing: quiet discovery, a small obstacle, a meaningful revelation, action, then relief.

Record completion times with unfamiliar players when available. Separate main path, optional content, failures, idle time, and loading. Developer walkthroughs and automated routes do not establish first-time player duration. If no external playtesting is available, mark the duration estimate unvalidated.

## 14. Implementation standards

### Quest/state design

Before coding each quest, write a compact implementation card in the repository with: ID, prerequisites, people, location, objective, actual player actions, mechanic, state transitions, evidence/clue, failure recovery, permanent consequence, reward, save fields, estimated duration, and acceptance checks. Keep documentation proportional to the work.

Use explicit, idempotent quest transitions. Rewards cannot duplicate on reload. Mandatory clues remain recoverable. Dialogue branches reflect current world state. Leaving a region or saving mid-puzzle cannot strand the player. Reuse the existing quest framework rather than building a competing one.

### Saves and completed campaigns

Version any changed save schema and keep migrations reversible where practical. Never silently reset an existing campaign or replay quests already completed. For pre-insertion saves, enable the new arc only when its prerequisites are consistent. For completed-base saves, preserve the completed campaign and postgame. If safe narrative migration is impossible, offer a separate expanded-campaign slot or explicitly labeled chapter-start option that does not overwrite the original save. Do not pretend the Nera journey canonically happens after Vesk's arrest merely to fit an old save.

### Art and animation

Use supplied original references and the current game's approved visual standard. Nera must belong in the same adventure while having its own architecture, materials, inhabitants, and motion. No exposed primitive humanoids, generic recolored crowds, plastic materials, or oversized empty landscapes. Preserve distinct faces, clothing shapes, hands, feet, silhouettes, and contextual gestures.

NPC activities should visibly serve their locations. Test water-level transitions, moving platforms, boarding, and conversations for foot sliding, collisions, clothing penetration, and camera obstruction. Give new mechanisms readable motion and sound before adding visual effects.

### Performance

Preserve the completed base's measured performance budget. Load and activate regions deliberately. Separate rendered visibility from simulation and resource residency. Avoid creating all Nera interiors, NPC brains, particle systems, and water simulations at startup. Reuse assets with appropriate ownership and release resources safely on transitions.

Profile the actual bottleneck before optimization. Check frame-time percentiles and stalls, not just average FPS. Validate the harbor, busy district, water facility, combat, transitions, and repeated revisits. Use bounded water effects appropriate to the current engine; do not add an expensive full fluid simulation to solve scripted water-level puzzles. Keep the player, ball, combat, and input responsive while reducing distant detail.

### UI, dialogue, and audio

Keep English labels concise: Talk, Inspect, Use, Continue, Journal. Show one clear immediate objective, not the entire quest design. Optional journal detail may retain clues without covering the world. No narrative paragraph is a substitute for a playable reveal.

Music should support wonder, domestic life, tension, and coordinated success. Use original motifs or properly supplied assets, with restrained transitions and space for mechanical clues. Do not obscure puzzle sounds with constant epic scoring.

## 15. Work sequence after the base gate passes

1. Freeze the verified base reference. Inspect the current implementation and reconcile this brief with the approved story map. Record concrete conflicts; do not overwrite unrelated work.
2. Map insertion points, save compatibility, quest dependencies, the three-day deadline repair, and the five station identities. Preserve the existing five stations even where the synopsis groups their tasks under fewer location headings.
3. Build a representative approximately 30-minute Float Harbor slice: Twinsen, Tessa, a furnished repair interior, a water/weight puzzle, conversation, a usable shortcut, saving, and polished presentation.
4. Inspect and test the slice against current visual and performance standards. Fix weak fundamentals before producing three more regions. This slice is a quality gate, not the final deliverable.
5. Implement the intervention and first underground survey; connect Nera arrival through actual spacecraft travel.
6. Build the six-quest Nera arc with its recurring cast, persistent consequences, and recoverable states.
7. Integrate prototype knowledge into the existing network, underground return, and climax. Make the final controls enact what the player has learned. Do not replace the confrontation with a cutscene.
8. Deepen existing chapters and implement the optional stories. Seed and pay off clues consistently.
9. Update the homecoming and postgame with concise, specific changes: repaired services, altered routines, references to allies, and ordinary family life.
10. Run regression, performance, visual, save-migration, and full progression checks. Measure duration and revise content where actual play is too thin or repetitive.

Implement in reviewable increments. Preserve working systems and existing assets. Do not rewrite the engine or add major mechanics solely because another architecture seems cleaner. If multiple agents are used in the host workflow, assign exclusive file ownership and merge/test sequentially; never let simultaneous agents overwrite shared quest or save schemas.

## 16. Acceptance and final handoff

The expansion is not ready just because all locations exist. Validate:

- Normal new game to final ending, including all required new quests, without debug teleports or forced quest flags.
- Main path with every optional quest skipped; representative paths with optional quests completed.
- Save/reload during moving-water puzzles, travel, dialogue branches, quest rewards, and final network setup.
- Death/retry, lost footing, stealth detection, leaving and returning, and out-of-order optional exploration.
- Base-save migration and preserved completed saves.
- No contradictory Vesk location, unexplained interplanetary travel, obsolete three-day deadline, or accidental second finale.
- Keyboard/mouse and currently supported controller behavior, readable aiming, stable camera, and moving-platform interaction.
- Consistent character/environment quality in real gameplay, not only promotional screenshots.
- Measured performance in representative scenes and repeated region visits without growing resource retention.
- English-only text, concise dialogue, no leftover placeholder or End of Demo barriers on implemented routes.
- All required clues discoverable and all puzzle failures recoverable.
- A specific, human epilogue that resolves the main conflict and reflects selected actions without promising another game.

Maintain a brief progress file with completed work, current task, next steps, tests, and blockers. At handoff provide the build/commit, implemented story changes, test evidence, timing evidence, performance comparisons, save compatibility, and known limitations. Do not claim a 15-hour game, bug-free release, or hardware performance without supporting observations.

Proceed only when Section 2 passes. Until then, this is the future expansion backlog, and completing the current game remains the priority.

---

## Appendix — Supplied base-story synopsis, unchanged

The following is the supplied Hebrew handoff dated 26 October 2026. It documents the base-story intention and its author's implementation claims. It is included so this single file is self-contained; inspect the repository for the actual current state before acting.


# LBA3: The Awakening — תקציר העלילה לפי פרקים (26.10.2026)

לשימוש בכלי חיצוני לבניית תוכן נוסף. מה שכתוב כאן קיים ומשוחק במשחק (ראה docs/lba3-production/STORY_MAP.md
לנתיב המדויק, ו-STORY_BIBLE.md לכללי הכתיבה והקאסט). באנגלית במשחק; כאן בעברית.

## הרקע
12 שנה אחרי LBA2. טווינסן חי באי סיטדל עם זואי ובנם ארתור (בן 12). פאנפרוק מת; המבצר והצינורות שלו נשארו.
טווינסון וזיליך הם שני כוכבי לכת נפרדים, המעבר ביניהם רק בחללית (נמל החלל של סיטדל ⇄ נמל החלל של זיליך).
שתי שמשות: אין לילה.

**הקונפליקט.** "הפרויקט המשותף" קודח לתוך טווינסון כדי להפיק חום. הוא באמת עוזר לאנשים (מים חמים, אור,
מעבורת, עבודה בזיליך). אבל הוא גם סודק את ה"קליפה" שסביב ישות שסנדל מגינה עליה ("היא"), שמתעוררת מוקדם מדי.
וֶסק, המהנדס הראשי של הפרויקט והנבל, מגלה מה מתחת לקליפה ורוצה את הכוח הזה; הוא מסתיר את הסכנה ומתכנן
פינוי סלקטיבי (30% שהוא בחר). לעצור את הקידוח עכשיו יסדוק את הקליפה בכל מקרה. הפתרון: להפוך את מתקני
הפרויקט עצמם למגן מייצב, בעזרת חלקים ואנשים שהשחקן כבר מכיר.

**קשת המתח:** שגרה מוכרת → תקלה מוזרה → סתירה בהסבר הרשמי → גילוי אישי → סכנה רחבה → עימות → הצלה מתואמת → הביתה.

## הפרקים

### 1 — הבאר (אי סיטדל)
**פתיחה (סצנה, ~85 שנ'):** הנמל בבוקר, ספינת הפרויקט פורקת ארגז, רעידה קלה מרטיטה שלולית. בבית: טווינסן מתקן
מנורה, ארתור מרכיב תורן לסירת הדגם שלו, זואי שותלת. הברז של זואי משתעל ומפסיק, ואז זורם חם. "אבדוק את הבאר."
**מה קורה:** הכדור הקסום מהארון; פותרים את הריב של גילברט ומירה בשביל מפתח המכסה; דוראן חותם לקסיל על סולם
חבלים; (אופציונלי) מצותתים לטים ולולו על האבן החמה במצב חשאי; טים מודה; יורדים לבאר. במערה: קרציות קריסטל,
שלושה גבישים שמעירים בכדור, מחסום, ואז **סנדל**: "מישהו הגיע אליה."

### 2 — הפרויקט המשותף (אי סיטדל)
**רוצה:** להחזיר את המים לעיירה. וסק מועיל בהתחלה: שלושה שסתומי עקיפה (המחסן עם שומרים, רחפנים וכלב; שסתום
המטע מאחורי סורג, זריקה מהמזרח; הצוקים הלוחשים: מטרה → אבנים עולות → קפיצה) מחזירים מים (חמים). **הסתירה:**
גבישים בצינורות התחנה, קריאות "קליפה" שמכונות "רעש". **זואי (משחקת):** מתגנבת במשרד ומוצאת את תוכנית הפינוי
(30%). **תוצאה:** עימות במשטח הקרן, וסק עולה לספינה שלו; הרדיו של ארתור מגיע לבאלדינו; דוראן מטיס את טווינסן
לזיליך בספינת פרויקט.

### 3 — זיליך
**רוצה:** להגיע לבאלדינו ולעצור את וסק. זיליך חיה על הפרויקט. **מכשול:** שומר (דאלאן) מחרים את התוכנית בנמל
החלל; משחזרים אותה בלוקר של המחסן (גליל קוד). **גילוי (באלדינו):** הקליפה; עצירה באמצע תסדוק אותה. **עושה:**
גלגל השיניים על הטחנה הישנה, שלוש טחנות נבלמות בכדור, מפתח העקיפה; זואי מכוונת את המגדלור (חוגות שמש, גל,
כוכב); מגן הפלטפורמה יורד. **סיום:** וסק יורד בפיר **ואוטם אותו מאחוריו** (דלתות פיצוץ, קוד שרק רשת התחנות
יכולה לפתוח). באלדינו: "הגבישים הראשונים נחפרו באי המדבר. תתחיל שם."

### 4 — החפירה (אי המדבר)
**מקום:** אי יבש של מסות ורוח; כפר (קש) סביב נווה מדבר גווע; עמדת המחקר של הפרויקט בחפירה ישנה; חורבות מתקופת
פאנפרוק. **אנשים:** פרופ' אילקה (גיאולוגית ארנבונית, מצאה את הגבישים הראשונים, פוטרה); הסק (נהג יאכטת-חול);
אמא טארה (זקנת הכפר); דאלאן (מנהל העמדה, קשוח אבל לא אכזרי). **עושה:** מתקן את משאבת הרוח של הנווה (ברוסק
מאשים את הרעידות, סאני שומעת מהגג איזה גלגל טוחן, הכדור משחרר אותו); רוכב ביאכטת החול של הסק למחנה של אילקה;
המחברת מעמדת המחקר בסופת חול; קוד השער (מקשים שחוקים, הסדר מהמחברת); הטרסות; שלושה דיסקים חמים מתוך חמישה;
מקדש בּוּ. **גילוי:** חריטות עתיקות: מפת הקליפה עם **פתחי אוורור** שהכוכב נושם דרכם חום. אילקה: הפתחים נסגרים
כי הפרויקט מושך את כל החום לנקודה אחת. אחד הפתחים מתחת לאי הזה, חסום בקידוח הניסוי.

### 5 — קיטור וחול (אי המדבר)
**מכשול:** קידוח הניסוי בלחץ; פתיחה לא נכונה תרתיח את הנווה. דאלאן משתלט על המעבורת ורושם את כולם לרשימת
הפינוי; הכפר לא ברשימה. **עושה:** הצנצנת של ברוסק, מים מהנווה, את חפירה; חופרים את אולם המעבים של פאנפרוק;
הדיאגרמה; חייל ישן; שסתומים 1, 3, 4; ההאנגר (דאון, צוהר בכדור); דאלאן; שסתום השחרור; לצאת לפני שהפתח מתפוצץ
(גייזרים, בריחה ביאכטה). זואי ברדיו קוראת את מפת הקליפה ומוצאת את הפתח השני: בקרח של ההמליאי. **תוצאה:** הנווה
ניצל, דאלאן תקוע עם הכפר ומתחיל לפקפק. הסק מטיס את טווינסן צפונה בדאון מטען ישן.

### 6 — המעבר (המליאי)
הקרח נמס מלמטה; כפרים מנותקים במפולות. **אנשים:** יורנה (מדריכת הרים זקנה), פים (נכדה, בגיל ארתור), כפר להאר.
**עושה:** מפיל עץ קפוא מעל הנקיק (כדור); תחנת החימום צריכה נתיך; העפיפון של פים (כדור) → הנתיך; חום; חבל
עגינה קפוא (חרב); שתי נסיעות בכננת עם קרציות קרח ביניהן; מעלה; המנזר. **תוצאה:** להאר בטוח במנזר; יורנה
מכירה את הדרך לפתח, דרך המצפה.

### 7 — המצפה (המליאי)
**גילוי חלק 1:** המצפה הוא מקדש סנדל עתיק; סנדל מדברת בפעם הראשונה בגלוי: היא מחזיקה את הקליפה באור שלה
ודועכת. "אני לא יכולה לבד יותר." **עושה:** שלוש מראות מעבירות אור; הטלסקופ; רחפן כבד בפתח (כדור); הפתח נפתח.
**תוצאה:** שני פתחים פתוחים; הרעידות נרגעות לזמן מה. ארתור ברדיו: סיטדל מתפנה, בדרך של הפרויקט.

### 8 — פינוי (אי סיטדל, השתנה)
**רוצה:** להוציא את כולם, לא 30%. האי המוכר השתנה: תורים לספינות, עמודי החום כבויים, הכיכר מגודרת, הבאר מעלה
אדים. **עושה:** זואי (משחקת) מובילה את משפחות הגבעה לצוקי המגדלור; טווינסן פותח את מנהרות פאנפרוק כמקלטים
(המבצר, המחסן), מתמודד עם רחפני שליטה בהמון, ומגייס את גילברט, מירה ופיפה. הודעה מוסק מלמטה: יסיים את הקידוח
בעוד שלושה ימים. **תוצאה:** האי בטוח בלי הרשימה של הפרויקט. מירה מוצאת את חדר בקרת השסתומים הישן; זואי מגלה
שאות המגדלור מגיע לאולם המועצה של זיליך. טווינסן עולה לספינת פרויקט לזיליך.

### 9 — המועצה (זיליך, הרובעים העליונים)
**רוצה:** שהמועצה תורה להפוך את הקידוח. המועצה מפחדת מהקור אם הפרויקט ייעצר; נארה ואוקו מדברים בעד טווינסן;
דאלאן מגיע עם ההוכחה של אילקה. **עושה:** אנשי הרחוב; העצומה של באלדינו; חותמות נארה ואוקו (שחרור שלוש טחנות);
בית המועצה; הפקיד; השימוע; הארכיון במעיל שאול (ארון BORE). **תפנית:** המועצה מסכימה, אבל רק הקונסולה של וסק
בליבה יכולה להפוך את הקידוח, וקוד הפיר חייב לבוא מכל תחנות הפרויקט בבת אחת: הרשת של באלדינו.

### 10 — הרשת של באלדינו (כל האזורים)
חמש משימות בכל סדר, כל אחת באזור שכבר ביקרנו ועם מנגנון שלמדנו שם: הטחנה הישנה (זיליך), חדר השסתומים
והמגדלור (סיטדל, בדאון של הסק: האות שמש-גל-כוכב של זואי), הקידוח (אי המדבר, רחפנים; אילקה ודאלאן מחזיקים את
הפתח), הכיפה (המליאי, טלסקופ; יורנה ופים מכוונים את המראות). **תוצאה:** כל התחנות מחוברות; קוד הפיר פותח את
דלתות הפיצוץ.

### 11 — הקליפה (הפיר, המתקן העמוק, הגלריות)
מכונות הקידוח (דיאגרמת קירור, שסתומים A ו-C, מתג כדור לסולם), גלריות הגבישים (שלושה עמודים, אבני דריכה),
ואז חדר סנדל.

### 12 — הליבה
**גילוי חלק 2 (סנדל):** "היא" צעירה ולא מוכנה; לכבות לא מספיק, צריך לדחוף לכיוון השני. **עושה:** בליבה חמישה
עמודים (אחד לכל תחנה) בזריקות כדור בזמן שהשומר נלחם; בעלי הברית עונים ברדיו בתורם. **וסק לא מוותר:** מעמיס
את השומר ומרים סליל מעל הקונסולה; טווינסן שובר אותו בכדור (שלוש פגיעות), הקונסולה מתפוצצת, טווינסן מעביר
את הקידוח למצב מגן, ושומרי המועצה יורדים לקחת את וסק. **תוצאה:** הקליפה מחזיקה.

### אפילוג — הביתה
ארוחת ערב בבית; מסך הסיום; "המשך לחקור" (שוטטות חופשית, שורות חדשות אצל כולם). בלי הבטחה להמשך.

## הקאסט בקצרה
טווינסן (רוצה חיים שקטים, פרקטי) · זואי (מוצאת את התוכנית, משחקת פעמיים, מזיזה את האי) · ארתור (12, רדיו,
מקבל תפקיד אמיתי ולא "הנבחר") · באלדינו (ממציא, המצאות עם מגבלות) · וסק (נבל; מקסים ומועיל בהתחלה, לא חוזר
בו) · סנדל (מבקשת עזרה במקום להציל את כולם) · דוראן (מלח, ואז טייס) · מירה (פקידת המים, גיבורת הדוח) · גילברט ·
קסיל · פיפה (חנות) · בראם (המשאבה הישנה) · אודיל (מכס) · נל (סדנה) · טים ולולו · נארה ואוקו (זיליך) · אילקה,
הסק, טארה, דאלאן (מדבר) · יורנה ופים (המליאי).

## עובדות שאסור לסתור
פאנפרוק מת; וסק הוא הנבל; אין לילה; טווינסון וזיליך שני כוכבי לכת (מעבר רק בחללית); האפילוג לא מבטיח המשך;
זואי פעילה; לארתור יש רצון משלו.

## המצב הנוכחי
כל 12 הפרקים משוחקים מהתחלה ועד הסוף (11 ו-12 פוצלו לשני פרקים נפרדים: ראה STORY_SYNOPSIS.he.md). משך משוער לשחקן: 3–5 שעות. היעד
שהוגדר (26.10): כ-15 שעות, כלומר פי 3 תוכן. רעיונות לעתיד שעלו: עולם חדש שאינו טווינסון ולא זיליך; מקומות
חדשים; עולם תת-קרקעי בטווינסון במקום שבו סנדל נמצאת (ב-LBA1 נופלים אליו), ומשם לעולם חדש ומיסטי.
