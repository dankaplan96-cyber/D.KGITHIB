# MECHANICS-AUDIT (P125): what the player can do, where it is taught, where it is needed

The user, 24.11: the opening tutorial never really teaches the behaviour modes; Discreet has no real advantage (in the
original it changed the ball's angle). Should the tutorial make the player switch modes, and does it cover every
mechanic a beginner needs?

**Status: design proposal, nothing built.** Base `ccr-c1c2c4b9-dep6ed` at `de2b2d6b`. Evidence: **Source only** (read
in the code and the repo's docs); no browser run, nobody played. "LBA1/LBA2 recollection" marks memory of the
originals that no repo document backs. Chapter numbers are the expanded campaign's (as PUZZLES.md): 1 well, 2 project,
3 zeelich, 4 dig, 5 steam, 6 pass, 7 observatory, 8 evacuation, 9 council, 10 throttle, 11 ballastra, 12 balances,
13 survey, 14 network, 15 shell, 16 core, 17 home (the base campaign skips 10–13).

## 0. Key facts found (verify-first)

- **The default HUD hides the behaviour bar.** `settings.hud` defaults to `lba`; `css/style.css:258` hides
  `#behaviour` there. A switch gives only the `mode` sound and a posture change; the name shows only in the Ctrl menu.
- **Only Athletic changes what the player can do.** Fighting uses the attack key in every behaviour
  (COMBAT.md: "You never have to change behaviour to fight"); talk, use and search use E in every behaviour
  (LBA2's W, `actors.js:439`); each kick prompt also accepts a punch, fists being owned from the start
  (`combat.js:347`). So Normal and Aggressive are as weak as Discreet, not just Discreet.
- **The throw does differ per behaviour, but the auto-aim hides it.** With no target, Classic (the keyboard default)
  throws LBA2's own arc: the first touch-down on flat ground is Discreet 5.0 m (a high 50° lob, tall bounces), Normal
  7.4 m, Athletic 7.8 m and Aggressive 8.3 m (flat and fast). A throw at a target (an enemy within 9 m in the assist
  cone, a switch within 14 m, or the lock) replaces the arc with a pace-only flight (`BALL_TARGET_PACE`, gravity
  22 m/s²). At 6 m that gives Normal 0.46 s with a 0.59 m rise, Athletic 0.40 s / 0.44 m, Aggressive 0.32 s / 0.28 m
  and Discreet 0.67 s / 1.22 m. Bounces after a targeted throw use one lift for every behaviour (≥ 2.5 m/s). Nearly
  every throw that matters is at a target, so the user's reading is right.
- **The repo evidence contradicts "Discreet's low throw".** LBA2's file data (docs/COMBAT.md "The ball's throw",
  LBA2_MEASUREMENTS.md) makes Discreet the short, high lob. The low, flat throw is Aggressive's.
- **Discreet's stealth effect varies by enemy (`hero.visibility()`).** Normal is 1, Discreet 0.4 moving or 0.25 still,
  hiding (Discreet + hold Space) 0.12, and an Athletic run 1.25. Guards see 10 m × vis, drones 9 m × vis and dogs
  11 m × vis (plus a 3.2 m nose unless vis ≤ 0.5): Discreet cuts all three to under half. **Mites, sentries and
  crawlers notice at a fixed 6–9 m whenever vis > 0.2: Discreet does nothing against them**, while hiding does.
  Hiding (0.12) makes every non-watcher enemy blind beyond 1.5 m, anywhere, cover or not. Watchers (the office
  guard, the archivist) notice 2.5–6× slower, and only a crouch at a room's cover spot hides from them completely.
  Only two rooms define cover spots: `projoffice` and `c3deep`.
- **The hide key is never shown in play.** Zoé's office line says "hide behind the furniture" (`c1_zoe_in`) but no tip
  names hold-Space; only Pause → Controls does.

## 1. Every player mechanic × where taught × where first needed

Taught: **Step** = a forced opening step (openingsteps.js), **Tip** = an optional timed panel tip (tutorial.js),
**Toast/line** = a story toast, nudge or line, **Prompt** = the game's own in-reach prompt, **—** = only Pause → Controls.
Stuck risk = can a beginner be stuck or miss the way on (Low / Med / High).

| Mechanic | Taught | First needed | Stuck risk |
|---|---|---|---|
| Move (Classic tank by default on keyboard; Modern; pad) | Tip `move` in the house | 1, the house | Low |
| Camera: Follow (default), Free, LBA; distance Q | Tip `camera` only for Free/LBA; Q — | never required | Low |
| Talk (E / W / pad A), dialogue advance | Prompt "Talk"; key hint in the box | 1, Zoé in the yard (Step `zoe`) | Low |
| Use / try / inspect / open | Prompt; Step `tap` | 1, the cupboard (Step `ball`) | Low |
| Search containers (E anywhere, or Space in Normal: the hop) | Prompt "Search" in reach (first: the yard barrels, a magic giver) | never required (coins, hearts, magic) | Low |
| Inventory / journal (I, J; Shift Classic) | Step `inv` | 1, the yard | Low |
| Holomap / minimap (M / H) | toast at the cupboard (keys named) | 1, the way to the well | Low |
| Magic ball: throw | Step `barrels` | 1, the yard; the bell; the cave crystals | Low |
| Ball: hold to aim / charge (×1.3, +1 damage, ricochet) | Tip `arc` (15 s); toast `hint_armour` at the first armour | the first armoured guard (2–3) | Low |
| Ball: recall (press again) | — | never (it returns itself) | Low |
| Ball: per-behaviour arc | — (and masked by the auto-aim) | never | — |
| Magic points, out of magic, flasks | Tip `magic` (8 s) | 1 | Low |
| Magic level (1→4, the ball's colour) | toast on each rise | story (4, 7, 14) | Low |
| Behaviour switch: F1–F4 / 1–4, Tab, Ctrl menu, pad D-pad | per-mode Tips with the key (below); Tab/Ctrl — | 1 (the lid, Aggressive or fists) | Med: no on-screen mode in the default HUD |
| Normal (Space: talk or hop/search) | Tip `normal` "Back to Normal" (after the kids) | never (E does it all) | Low |
| Athletic: run (×2.5 speed) | Tip `athletic`; Step `pipe` (may be walked round) | 2, the Whispering Cliffs | Med: the pipe can be walked round, so the first forced use comes later (the target's toast names the keys) |
| Athletic: jump (Space) | Step `pipe`; toast `hint_jump` at the bay rocks and the risen stones | 2, the cliffs (required); 3, the old mill (required); 15, the galleries (required) | Low–Med |
| Aggressive: Space attacks; kick prompts | Tip `kick`; Gilbert's line; nudge after 30 s | 1, the lid (kick or fists) | Low |
| Melee with the attack key (K / left click), combos | — (the ball is the default weapon) | 1, the lid (alternative); 6, the rope (sword) | Low |
| Weapon swap R / wheel (X; G Classic) | Tip `wswitch` at the third weapon | 6 (the sword) | Low |
| Discreet: sneak | Tip `discreet` at the kids, after they brush him off | 1, overhearing Tim (optional) | Low |
| Discreet: hide (hold Space) | **—** | 2, Zoé's office (forced stealth, cover spots) | **Med–High**: told to hide, never told how; a retry is safe |
| Discreet vs watches (stealth routes) | — | 2, the Citadel depot; 3, the Zeelich depot; 4, the research post | Med: fighting works, but nothing says sneaking is easier |
| Dodge (Shift / X / pad B) | Tip `dodge` in the cave at the first chasing mite | 1, the cave | Low |
| Focus / lock-on (L / right click), next target (T / wheel) | — | never required; helps in 2–3 fights | Low–Med |
| Pocket set, pump lance, fork, Esmer line, heat flask | Tip `pset`; each tool's own lesson place (kit2/kit2b) | optional | Low |
| Blowgun, laser, glove, lightning, penguin, lantern | shop and story lines | optional ("nothing on the main path needs any") | Low |
| Sword (6), pulse tool (14), heavy strike (hold) | story hand-over, auto-equip; heavy — | 6, the rope; fights | Low |
| Hop-pack (Athletic, hold Space in the air) | Baldino / the strap label | optional (10+) | Low |
| Shops, ferries, shuttles, ships | Prompts | 2+ | Low |
| Doors and room entry | walk in; a locked door says so | 1 | Low |
| Health, hearts, clovers (revive), kashes | toasts ("A clover leaf saved you!"); the LBA HUD incrusts on change | 1, the cave | Low |
| Fall damage, slides | — | rare | Low |
| Save / load (autosave on scene change, 6 slots) | toast "Game saved" | — | Low |
| Swimming, ladders, climbing | **Not implemented** (the sea is blocked; no climbable ladders; stairs are walked) | — | — |

## 2. Each behaviour's real use in the campaign

Grep of `behaviour ===`, `visibility()`, `hiding`, `meleeHit`, the jump places (tests/jumpreach.mjs) and PUZZLES.md.

**Athletic (strong): 3 required + 4 optional + speed everywhere.**
Required: the Whispering Cliffs' stones (2), the old mill's stair-stones for the cog (3; again in 14, where the
hop-pack is an alternative), and the galleries' stepping stones (15). Optional: the yard pipe (1), the bay rocks (1),
the hop-pack test step (10) and the hop-pack in general. The run (4.96 m/s against Normal's 2.0) helps on every walk.

**Discreet (weak in effect, rich in places): 0 required by choice, 1 story-forced, 1 optional only-way, 6 "clearly
better" that are never signposted.**
- Story-forced: Zoé's office (2): the story sets the behaviour; hiding at cover is needed against the watcher.
- Optional, Discreet the only way: overhearing Tim (1).
- Better but never named: the Citadel depot valve and Funfrock's chest (1–2); the Zeelich depot locker (3; DEPOT.md
  bot 4/8 sneaking, 5–8/8 with the distraction); the research post in a sandstorm (4: storm 0.4 × Discreet goes below
  the drones' 0.15, so they cannot see him); the archive (9: the archivist's suspicion grows 2.5× slower); the
  c3deep drone round (15: cover spots defined, hiding blinds the drone).
- Ambient: residents don't turn their heads at a sneaking Twinsen (townbusy.js).
- No effect against mites, sentries or crawlers (the bulk of fights), and no Discreet place after 9 except c3deep.

**Aggressive (weak): 0 required, 3 kick prompts, all with a melee alternative.** The lid (1), Ballastra's bypass
wheel and Dunn's door (11). Space attacks (the same moves as K); a boxer's stance; walk 2.52 m/s. No damage or
defence bonus.

**Normal (no own use): 0.** Space talks or hops a container, but E does both in every behaviour.

**Plainly: the user is right about Discreet, and Normal and Aggressive are as hollow.** Only Athletic is needed. That
is mostly a deliberate modern-comfort choice (fight, talk and search in any mode). What is missing is not more forced
switching but a reason to choose: Discreet's effect is real in 7 places, but it is invisible, untaught (hide), and
blank against the commonest enemies.

## 3. What LBA1 and LBA2 did

Backed by repo documents:
- LBA2: jump only in Sporty (LBA2_SOURCE_NOTES.md); W talks and searches in any behaviour; Space is the behaviour's
  action; Ctrl opens the behaviour menu; aggressive mode picks one of three blows.
- LBA2 throws per behaviour (COMBAT.md, from the file data): Discreet 50° short lob with tall bounces; Aggressive
  near-flat and fastest; Athletic long and low; Normal between. No input changes it: "the behaviour is the distance".
- LBA2 taught verbs through residents' lines: "it's possible to search the garbage cans, the vases and the closets",
  "you could jump while you are running", "you can jump over the rocks if you are trapped" (ADVENTURE_DESIGN.md,
  evidence 14).
- LBA2 Discreet has its own walk (anim 94), idle and dodges (100/101): LBA2_MEASUREMENTS.md.

LBA1/LBA2 recollection (not backed here, treat as uncertain):
- LBA1 tied actions to modes more strictly: talking and searching in Normal, fighting only in Aggressive, jumping only
  in Sporty. Discreet tiptoed and crouched to hide from guards and soldiers. Sneaking past patrols (the asylum and
  Citadel escape, the clone soldiers) was a recurring use. Hitting things in Normal did not fight.
- The Discreet throw was the lob used to get the ball over obstacles.
- Both games taught modes mostly by the manual, the Ctrl menu's pictures, and situations that need one (a gap to
  jump, a guard to sneak past). There was no forced tutorial step. LBA2's opening errand (the Dino-Fly's cure) mixed
  talk, search and the ball.
- Switching modes often was a known annoyance of the originals (the Ctrl menu mid-fight). This game's direct keys and
  mode-free attack, talk and search fix that; the proposals below keep that comfort.

## 4. Proposals for the user (prioritised; nothing built)

Each is game-wide (one rule for every place of its kind). "Visible" means the player sees a change; "pictures"
means a clip or screenshots are needed before the user picks.

| # | Proposal | What changes | Where it is used now | Visible / pictures | Cost | Files |
|---|---|---|---|---|---|---|
| 1 | **Teach hiding** | A tip `hide` whenever a watch or watcher is active in the room and he is Discreet: "hold {Space}: crouch; at furniture they can't see you". Also a one-line hint at the first calm watch: "Discreet: they see you from half as far" | Zoé's office (2), the depots (1–3), the archive (9), c3deep (15) | Visible text; no pictures | S | tutorial.js (lesson + `when`), text/opening.js + he, tests/opening-tutorial.mjs |
| 2 | **Show the mode on switch** (the LBA HUD stays clean) | For 2 s after a switch, the behaviour's name and what Space does ("Athletic · Space: jump", "Discreet · hold Space: hide", "Aggressive · Space: strike", "Normal · Space: talk, search"); the full line for the first ~6 switches, then the name only | Every switch, all chapters | Visible UI; a screenshot | S | hud.js `behaviour()`, css/style.css, i18n.js + he |
| 3 | **The opening asks for all four, without a longer yard** | Yard: (a) a new short step "Don't wake the Dino-Fly": sneak up to him in Discreet (he naps in the garden, world.js:1816; today he wakes at 9 m in any mode) and pet him while he dozes. He wakes and settles again if rushed: not failable, ~15 s. (b) The pipe step completes only after a switch to Athletic (the jump is still optional, and walking round still ends it after the switch). Aggressive stays the lid (1, already required, kick or fists). Normal stays the kids' "Back to Normal" plus #2's line. The order: Zoé → inventory → tap → Dino-Fly → barrels → pipe. An expert adds ~15–20 s; old saves past the yard see nothing. | Chapter 1 only; teaches what #1/#4/#5 then use | Visible (the Dino-Fly's sleep and wake, a marker); a clip | M | story/openingsteps.js (STEPS, isDone, target, markers), tutorial.js (YARD, stepKeys), dinofly.js (asleep to a Discreet hero), text/opening.js + he, tests/tutor-targets.mjs, opening-tutorial.mjs. Owner: lba3-opening |
| 4 | **Discreet works on every enemy** | Mites, sentries and crawlers notice at range × visibility, as guards and drones already do: a sneaking Twinsen passes a dozing mite at ~2.4 m instead of 6 m | Well cave (1), dig (4), ice mites (6–7), galleries (15) and every other mite room | Gameplay only; no pictures | S | enemies.js (Mite, Sentry, Crawler idle checks: one shared `notices()`). Owner: animation-combat |
| 5 | **Discreet's lob back, even with the auto-aim** (the user's memory, and LBA2's data) | A targeted throw in Discreet keeps a high arc (an apex ≥ ~2 m over the higher end) and its tall bounces; the target test (`ballReaches`) accepts targets behind low walls, railings and fences that the lob clears. Other modes unchanged. Discreet becomes the answer to "over the bars" | The caged orchard valve (2, already a lob puzzle); drones behind the depot fences (1–3); c3core's plates (16); any switch behind a parapet | Visible (the arc); a clip | M | actors.js `plan()`, combat.js `ballReaches`/`throwTarget`; tests ball-close.mjs, depot-watch.mjs. Owner: animation-combat |
| 6 | **A visible "noticing" cue** | Guards, drones and dogs that are starting to notice show a "?" that turns into "!" (watchers already have their cone). This makes #1/#4/#5 readable | All watches | Visible; a screenshot | S–M | enemies.js, guards.js, guarddog.js (the existing `hud.float`) |
| 7 | **Overhearing as a small system** (from the kids' scene) | Residents already chat in pairs (townbusy `chat`). In Discreet within ~3.5 m, a pair says one extra line: a rumour or a clue for the current chapter. One or two per chapter, never required | Citadel square (1–2), Zeelich street (3), the hostel, the council's antechamber before the archive (9), the research post's gate (4) | Visible bubbles; text | M–L (writing + Hebrew) | townbusy.js, a small table per chapter, text/* + he. Owner: dialogue-editor |
| 8 | **Optional: an Aggressive perk** (not asked; same problem) | Melee in Aggressive +50 % damage and +1 poise (a reason to switch for a fight; the attack key still works everywhere) | All fights | No | S | combat.js `startMove` |

Not proposed: forced mode-only actions (talk only in Normal, fight only in Aggressive), timed switching drills, or
any new collectible trail. Swimming and ladders stay out (absent from this game's world; not needed).

Recommended order: 1 and 2 first (cheap, close the beginner gaps), then 3 with 4 (the lesson and the payoff), then 5.
6 and 7 if the user wants stealth to matter more. Audio: #3 can reuse `hide` and the Dino-Fly's rumble; #6 would need
one soft "suspicion" cue from action-sound. #3 touches the opening steps (lba3-opening); #4–#6 touch enemies.js and
actors.js (animation-combat); #2 touches the HUD.

Tests for the build, if chosen: opening-tutorial.mjs (the new step, old saves skip it), tutor-targets.mjs (its
marker), a Discreet-vs-mite notice probe, depot-watch.mjs (stealth routes unchanged or easier), ball-close.mjs (the
lob), dialogue-check.mjs (new lines + Hebrew).

## סיכום למשתמש

- צדקת: רוב מצבי ההתנהגות לא משנים כמעט כלום. רק "אתלטי" באמת נחוץ (לקפוץ במצוקים, בטחנה ובמערות).
- גם "נורמלי" ו"תוקפני" כמעט ריקים, כי מדברים, מחפשים ונלחמים בכל מצב (זו הייתה החלטה לנוחות).
- ל"שקט" יש השפעה אמיתית בכ-7 מקומות (מחסנים, הארכיון, המשרד של זואי), אבל השחקן לא רואה אותה, והיא לא עובדת בכלל נגד היצורים הקטנים.
- את מקש ההסתתרות (להחזיק רווח במצב שקט) המשחק אף פעם לא מראה, למרות שזואי צריכה אותו.
- הזריקה הגבוהה של "שקט" קיימת, אבל הכיוון האוטומטי למטרה מבטל אותה.
- ההצעות: להראות לרגע את שם המצב ומה עושה רווח, טיפ להסתתרות, וצעד קצר בחצר: להתגנב לדינו-זבוב בלי להעיר אותו (בערך 15 שניות).
- בהמשך: ש"שקט" יעבוד על כל האויבים, שהזריקה הגבוהה תחזור גם בכיוון אוטומטי, וסימן "?" מעל שומר שמתחיל לחשוד.
- לא נבנה כלום. אתה בוחר מה לבנות.
