# The expansion on the laptop: paste prompt for the local session

The user pastes everything below the line into the local Claude Code session on the laptop, in the repo clone.

---

You are the **Expansion Lead** for LBA3: The Awakening, working on the user's own laptop. The cloud session keeps
working on the base game (chapters 1–12 as they are) on branch `ccr-adf00ea7-37ebl3`. You build the **expansion**:
- the new planet **Ballastra**;
- Sendell's underground world;
- the story bridge into them;
- the optional stories.

You work on your own branch, so neither of you overwrites the other.

## 0. Before anything

1. `git fetch origin && git checkout -B expansion/ballastra origin/ccr-adf00ea7-37ebl3 && git push -u origin expansion/ballastra`.
   - Work and push **only** on `expansion/ballastra`.
   - Never push to `ccr-adf00ea7-37ebl3`, except for your usual Test Lab requests (`tools/testlab/...`), if you still
     make any.
2. Bring the base game in regularly: `git merge origin/ccr-adf00ea7-37ebl3` (a merge, never a rebase) at least once a
   day and before every milestone. Resolve conflicts in the base's favour unless it's your own hook (§5).
3. Read, in this order, completely:
   - **`lba3/docs/future/EXPANSION_BRIEF.md`**: the user's brief. It is the contract. Its "Nera" means **Ballastra**
     (decision D6).
   - **`lba3/docs/art-direction/EXPANSION_ART_DECISIONS.md`**: the user's selected decisions D1–D9. Selected means the
     user chose it; follow it.
     - **D1:** environments handcrafted (tactile stone, painted wood, cloth, ceramic, repairs); characters faithful,
       refined LBA.
     - **D3:** Ballastra is floating towns (moving platforms, counterweights, boat lifts), with a few great stone arches
       as the skyline anchor. The House of Balances is glazed ceramic and stone.
     - **D4:** the inhabitants are a mixed trading population, with compact canal dwellers as the one local species
       (shoulder-high to Twinsen, round faces, broad feet, fan ears).
     - **D5:** the underground is quiet wonder (warm lakes, translucent mineral layers), with "The Wound in the Shell"
       as fragile grandeur. It must not read as another crystal cave.
     - **D6:** the name is Ballastra.
     - **D7:** Sendell is present as her light responding in the environment. Never give her a body.
     - **D8:** the protected entity appears only in rare glimpses. Never show it whole, and it is never a boss.
     - **D9:** Tessa is a compact mechanic. Oren is a little taller, in a worn formal coat from the upper districts.
   - **`lba3/docs/future/GATE_REPORT.md`** (when it exists): the cloud's audit of the base game against the brief's §2
     gate. If the gate is not passed, you may still build the **isolated Float Harbor slice** (§2 below). Insert nothing
     into the campaign until the cloud reports the gate passed and the user approves.
   - The story:
     - `lba3/STORY_BIBLE.md`
     - `lba3/docs/lba3-production/STORY_MAP.md`
     - `lba3/docs/STORY_SYNOPSIS.he.md`
     - `lba3/WORLD_MAP.md`
     - `lba3/docs/TWELVE_YEARS.md`
   - The look:
     - `lba3/docs/LBA3_CHARACTER_ART_GUIDE.md`
     - `lba3/docs/character-review.md`
     - `lba3/docs/ART_KIT.md`
     - `lba3/docs/LOCAL_WORLD_ART.md` (your earlier world-art rules still apply)
     - `lba3/tools/testlab/WORLD_ART_REQUESTS.md` (what has been done to the look)

## 1. The user's rules (they override everything)

- **Language:** report to the user in Hebrew, short and honest. All player-facing text is English, brief and natural
  (one or two sentences a turn), in LBA's warmth.
- **No spoilers.** The user plays only chapters 1–2.
  - Never show screenshots of, or describe, chapters 3–12 or any expansion content (Ballastra, the underground, the
    bridge) unless the user asks. "Ask" means the user's own words in this session.
  - Ballastra is new content, so the user may want to see it. Before the first picture, ask once:
    "Do you want to see pictures of Ballastra, or keep it a surprise?" Follow the answer from then on.
- **Story:**
  - Twinsen is the protagonist. Zoé is active and makes discoveries. Arthur (12) has agency but is no chosen hero.
  - FunFrock stays dead. Vesk is the villain, does not repent, and is arrested at the end; he never appears on
    Ballastra.
  - There is no Earth-style night, on Ballastra too. There is no sequel promise.
  - Twinsun, Zeelich and Ballastra are separate planets, reached only by spacecraft.
  - Sendell is not evil.
- **Original assets:** never redistribute original LBA1/LBA2 files; commit only numbers and descriptions.
  - The user's GOG files on this machine may be read for reference: extract to a temp folder and never commit them.
  - The user's own photos and screenshots stay out of the repo.
- **Honesty:** measure on this laptop. Claim only what you measured: fps, GPU ms and stalls, on Medium and on battery
  as well as plugged in. State what is untested.
- **No paid services.**
- **Approval:** visible look changes to the existing chapters 1–2 need the user's approval with pictures. Ballastra's
  look follows D1–D9; show the slice for approval before building the other three places.
- **Commits** end with:
  ```
  Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
  ```
  - Put no model names in code or docs.

## 2. The order of work (the brief's §15, with what is already decided)

1. **Reconcile (short).** Write `lba3/docs/future/EXPANSION_PLAN.md`:
   - insertion points in the current chapters: after the Council (ch. 9), the bridge, the first underground visit,
     Ballastra, the return to Baldino's network (ch. 10), the second underground visit on the final route, the core
     (ch. 11–12);
   - the "three days" chronology repair (the brief's §4: a playable temporary intervention, no real-time countdown);
   - the save plan (§3 below);
   - the five network stations kept;
   - one implementation card per quest (the brief's §14 fields), kept short;
   - conflicts with the base you find, listed (don't change base files to "fix" them; tell the cloud via the plan).
2. **The Float Harbor slice, about 30 minutes, isolated.** Before anything else, build one complete, polished slice:
   - arrival by spacecraft (a debug entry point is fine for the slice);
   - Tessa (her model), a furnished repair-shed interior, and the water/weight puzzle (N1 "Wrong Dock": the lift, the
     counterweight, the crane release hit by the magic ball, the platform blocked until both uses are balanced);
   - one conversation, a usable shortcut and saving.
   - Measure it on this laptop (Medium, plugged and battery) against the base game's street. It must stay inside the
     base's budget (see `lba3/tests/perfbudget.mjs`, `drawcalls.mjs`).
   - Show it to the user (after asking about spoilers) and fix the fundamentals before building more.
3. **Then, in reviewable steps:**
   - the temporary intervention and the first underground survey (three measuring devices, Sendell's light reveals the
     route);
   - Ballastra's four places (Float Harbor, Arch District, Water Gardens, House of Balances) and the six quests N1–N6
     with the residents and Oren;
   - the return: prototype knowledge into the network and the core, and the second underground passage;
   - the optional stories (§12 of the brief: Missing Deliveries, The Last Shift, Yorna's Map, Arthur's Boat, The
     Silent Bell; Dalan's excluded family if it fits);
   - the homecoming and postgame changes;
   - the full regression and the timing evidence.

## 3. Where things are in the code (read before writing)

- **The game:** `lba3/src/main.js`.
  - `Game`: rooms, regions, `enterRoom`/`exitRoom`, saves (`SAVE_VERSION`), `givers`/`giveBonus`, `found` (the
    found-object ceremony).
  - `export const VERSION`: the cloud owns the version number; don't bump it.
- **Regions and lazy building:**
  - `lba3/src/game/regions.js`: groups, a build-time estimate, positions far from Citadel.
  - Region builders to copy: `zislands.js` (generic island builder), `hamalayi.js`, `desert.js`, `sewers.js` (a small
    two-room area with its own story, built recently: the cleanest template).
- **Travel between planets:**
  - `lba3/src/game/travel.js`, `spaceport.js`, `story/islands.js`: Spaceport flights; routes open with chapters.
  - Ballastra gets a route there, gated by its story flag.
- **The underground:** `lba3/src/game/underground.js` (the shell, the galleries, Sendell's chamber `c3sendell`: a voice
  and light from a pool).
- **Story modules:** `lba3/src/game/story/*.js`.
  - `base.js` is the framework: flags, `reward`, `settleOwed`, journal.
  - `index.js` wires doors, exits, interactions, talk, the per-frame update, the journal, items and loading.
  - Add new modules (`story/ballastra*.js`, `story/bridge.js`) and their text in `text/*.js` (English).
  - Flags get a prefix (`bl_`, `ug_`, `br_`).
- **Chapters:** keys are in `main.js` and `story/index.js`. ch. 9 is `council.js`, ch. 10 `network.js`, ch. 11–12
  `chapter3.js` (shell, core), epilogue `epilogue.js`.
- **Characters:**
  - Pipeline: `lba3/tools/blender/*.py` (bpy; `twinsen_poly.py` is the most refined example; cast in
    `cast_poly.py`/`lbapoly`), output `lba3/assets/poly/*.json`.
  - Definitions: `src/game/characters.js` (Esmers, Grobos and others: reuse for the visitors).
  - Rig: `src/engine/rig.js` (procedural poses; NPCs plant their feet: `plantIfFits`).
  - Publish a rig contract before changing proportions for Oren (D9).
- **Props and materials:**
  - `src/game/props*.js` (e.g. `props-esmer.js`: `esmerBuilding`, `crateStack`, `jars`).
  - `src/game/kit.js` (Kit, batching).
  - `src/engine/materials.js`/`textures.js`.
  - The output pass grades the whole frame (`renderer.setGrade(grade, tint)` per area: give Ballastra its own palette
    there if needed).
- **Water:** the sea and water materials in `world.js`/`textures.js`; the sewer's still water is in `sewers.js`. Use
  scripted levels, never a fluid simulation (brief §14).
- **Town life:** `townlife.js`, `walkrounds.js`, `walkers.js`, `townbusy.js`, `townplay.js`. These are the patterns
  for Ballastra's residents at work (stops with acts, chatter, reactions to Twinsen).
- **Tests:**
  - Helpers: `lba3/tests/lib/player.js` (`P.go`, `P.use`, `P.rummage`, `P.grab`, `P.through`), `tests/lib/boot.mjs`.
  - Every quest gets a by-input test like `tests/sewers.mjs`.
  - Saves: `tests/saveslots.mjs`, `save-migration` and `zoe-resume`.
  - The whole route: `tests/playthrough/01…14` (add new segments after 12 and before 13).
- **The Test Lab** (yours): `lba3/tools/testlab` (compare, artall and the art probes). Use it for Ballastra the way you
  did for the Citadel.

## 4. Saves and the existing campaign (brief §14)

- **Save format:** bump `SAVE_VERSION` only on your branch, with a migration. Never reset or replay a finished
  campaign.
- **Saves from before the bridge:** the arc opens only when its prerequisites hold.
- **Completed-game saves:** keep the postgame. If a story-consistent migration is impossible, offer a separate,
  labelled "expanded campaign" start that never overwrites the old save.

## 5. Shared files and merging back

You own new files: `src/game/ballastra*.js`, `src/game/story/{ballastra*,bridge,underground2}.js`,
`src/game/text/{ballastra,bridge}.js`, `assets/poly/{tessa,oren,…}.json`, `tests/ballastra*.mjs`,
`docs/future/EXPANSION_*.md`.

Touch shared files (`main.js`, `regions.js`, `story/index.js`, `travel.js`, `council.js`, `network.js`, `chapter3.js`,
`epilogue.js`, `rig.js`, `actors.js`) only with small, commented hooks. List each one in
`docs/future/EXPANSION_HOOKS.md`: the file, the line and why. That list is what the cloud reviews when it merges your
branch into the base game.

Merging into the base happens only:
- after the user approves;
- when your full route (new game → ending, with and without the optional stories) and the base's suites pass;
- when the cloud has reviewed it.

Never do it yourself.

## 6. Testing and evidence

- **Before every push:** run the base suites you could affect (chapter1, chapter2, townlife, walkers, transitions,
  saveslots, drawcalls, perfbudget) plus your own.
- **Performance:** with the Test Lab on this laptop, on Medium (plugged and battery), for Float Harbor, the busiest
  Ballastra place, the water facility, a fight and repeated revisits. Watch frame p95 and stalls, not just averages.
  Auto must hold 55–60 fps; Auto may drop to Low under sustained pressure (AUTO-FLOOR).
- **Duration:** record developer playthrough times honestly, as developer times. First-time player duration is
  unvalidated without real playtesters.
- **`docs/future/EXPANSION_PROGRESS.md`:** done, current, next, tests, blockers. Update it at every stop so the next
  session (yours or the cloud's) can resume.

## 7. Reporting to the user (Hebrew)

- **Short updates:** what is playable now, what you measured, what needs their decision.
- **Pictures:** only after the spoiler question (§1).
- **Decisions:** ask only for genuine choices, such as the look of the slice or a story fork the brief leaves open.
  Make routine decisions yourself from the brief and D1–D9.
