# CONTENT-15H · Toward ~15 hours with optional play, without padding (23.11.2026)

**PARTIAL, input for lba3-world / lba3-maturity.** The coordinator stopped this planning task early, when the user's
structured polish run began. Sections 1–3 and 5 are complete as a plan. The per-proposal cards are short: the full
cards already exist in `DEPTH-PLAN.md` and `docs/future/EXPANSION_PLAN.md` §4.5, and each row names its card. No game
code, assets or browser runs were touched. This is a team document. Late-chapter detail is kept short, and the
coordinator filters it before showing the user.

Labels: **Estimate** (the `chapter-balance.md` formula, uncalibrated), **Automated runtime** (the bot), **Source**
(read in code/docs). Nobody has played any of it, so every hour figure below is an estimate.

## 1. Today's honest estimate

**Formula** (`chapter-balance.md` "Method"): active = 1.8 × the bot's free play + 60 s per deduction puzzle + 30 s per
fight + 90 s per scripted death; reading = words ÷ 3.3/s + 0.6 s per line. Films, scenes and loading are not counted.
The factors are not calibrated against any person. The bot knows every answer, so being stuck longer than 60 s
on a puzzle never appears in these numbers.

### Main route (New Game = the expanded campaign, `flags.exp`)

| # | Chapter | Est. min | Band (16.7–27.9, median ~22) | Source |
|---|---|---|---|---|
| 1 | The Well | 22.8 | in | ledger, 11.11 chain |
| 2 | The Joint Project | 42.0 | long (kept by the user, 8.11) | ledger |
| 3 | Zeelich | 24.4 | in | ledger |
| 4 | The Dig | 21.8 | in | ledger |
| 5 | Steam and Sand | 19.3 | in | ledger |
| 6 | The Pass | 16.8 | edge | ledger |
| 7 | The Observatory | 15.0 | **under** | ledger |
| 8 | Evacuation | ~26 (+~1, MIDDLE-VARIETY) | in | ledger |
| 9 | The Council | ~26 | in | ledger |
| 10 | Borrowed Time (exp.) | ~22 | in | EXP-PLAN-2 §3.1 (bot 249 s) |
| 11 | Ballastra (exp.) | ~27 | top of band | EXP-PLAN-2 §3.2 (bot 749 s) |
| 12 | (exp.) | ~20 | in | EXP-3 (bot, 12–13 together, 597–704 s) |
| 13 | (exp.) | ~22 | in | EXP-3 |
| 14 | Baldino's Network | 33.4 (+~2, the B-8 step) | long (kept, 8.11) | ledger, EXP-3 |
| 15 | The Shell | 17.7 | in (low) | ledger |
| 16 | The Core | 11.3 | **under** | ledger |
| — | Epilogue | ~1 | aftermath | ledger |
| | **Total** | **~370 min ≈ 6.2 h** | | |

The ledger's last full measurement is 13.11 (chapters 1–9, 14–16). Later changes (P80 puzzles, MIDDLE-VARIETY,
VESK, TUT-MYSTERY, OPENING-TUT-2) are not measured again. They likely add a few minutes (±10). Note that Ballastra's
chapters are **10–13** of the expanded campaign; the brief called them 11–14.

**Where the main-route time goes** (shares derived from the 9.11 run 3; later waves are similar in kind):
navigation (the 1.8× walk) about 45–50 %, puzzle allowances about 20 %, reading about 20 %, fights and deaths about
10 %. Two chapters carry the most (2 and 14, both kept long by the user). Two are thin: 7 and 16, the finale's one
arena.

### Optional content that exists (a player who finds and does all of it)

| Region | Est. min | What (Source) |
|---|---|---|
| Citadel | 76–99 | DEPTH-PLAN 2(a) 70–90 (sewers, asylum, the hostel's finds, shops, Sefa's parcel, Bersimon, 5 crystals, cliffs) + U-2 One More Place 6–9 |
| Zeelich street | 30–35 | 20–25 + U-4 Twelve Years Late (~10, my estimate) |
| Zeelich's isles | 52–64 | 40–50 (55 rooms, quay light, beacon, clapper, crate, the mine's glove) + ISL-1 6 + U-1 The Last Ferry 6–8 |
| Desert Island | 33–45 | 25–30 + U-3 Off the Wall 8–15 |
| Hamalayi | 13–17 | 6–10 + HAM-1 7 |
| Underground | 10–12 | 4–6 + U-5 The Quiet Channel (~6, my estimate) |
| Ballastra | 8–12 | return-visit lines, Quill, the shed's drawings, reads (my estimate) |
| Crystal hunt | ~5 | COL-1 (9 of 12 obtainable today) |
| **All optional** | **~227–289 min ≈ 3.8–4.8 h** | |

### Totals today (estimate)

| Player | Optional found | Total |
|---|---|---|
| Main route only | 0 % | ~6.2 h |
| Steady ("talks to people, does some optional things", the bible's player) | ~50 % (a guess) | ~8.1–8.6 h |
| Thorough | ~80 % | ~9.2–10.1 h |
| Everything | 100 % | ~10.0–11.0 h |

These numbers agree with the coordinator's 7–9 h. No discovery rate has been measured. The 50 % and 80 % shares are
assumptions.

## 2. The gap, and where real content fits best

The gap to 15 h is **~5 h for a thorough player, ~6.5 h for a steady one**. The user's rules split it:
- **Main path:** only where a chapter is thin (rule of 11.11: short chapters are fixed on their main path, not with
  side quests). Candidates are 16 (11.3) and 15, plus 7 (15.0; no proposal yet, see the questions). This adds
  +9 to +16 min, not hours.
- **Optional, built from LBA1/LBA2's strengths:** this is where the hours must come from. Every item must pass the
  user's test ("in three chapters, what can I see, hear or do that wasn't here before?"). It must reward something
  new to do, not only a clover. It may not add a new place without a job (R11, no clutter). Places are reused
  first.
- **Findability:** a built quest that nobody finds adds no hours. Boards, journal "open favours" and people pointing
  raise the share found without padding (H-20).

Evidence for what LBA did (from the repo, with the user's text banks): `docs/lba3-team/ADVENTURE_DESIGN.md` samples
1–8 (LBA1's painted crosses and ferry ticket, busts on seals, the desert old man's landmark clue; LBA2's Dino-Fly →
adventure, the School found from scattered and partly unreliable hints, the bowler's back, Temple-Park);
`docs/future/ZEELICH_GAP.md` (LBA2 banks/scenes: the Francos' island where every villager digs for a lost relic,
the Wannies' mine and its fireballs that the glove catches and throws, gas monsters, the lift between the layers, the
casino's slots/markers/jackpot wheel, coin machines, changing newspapers, wanted posters, the Mosquibee test arena of
many doors); `story/magic.js` (LBA2's GERELIFE: magic levels only at quest ends). Clover boxes, keys and rooms found by
a behaviour are **recollection, not verified** (DEPTH-PLAN §1). No original was run and no footage was watched for
this plan.

## 3. The proposals (prioritised, in waves of 2–3)

Ids are **H-n** (not P-n, which is the playtest inbox). "Card" names the existing full design. "Min" = estimated
first play for a player who does it. Cost: S/M/L as in DEPTH-PLAN. "Reuse" means existing places. "New" means
geometry the user must see first (P107: before/after pictures, kept or reverted by the user's choice). File budget:
511/512, so everything folds into existing modules (`story/depth.js`, `islandpeople.js`, `kesh.js`, `chapter3.js` …)
until the bundling step. Text is English first, then Hebrew (`he-bundle`).

| Wave | Id | What the player does (played steps) | Ch · place | Why it fits story and LBA | Min | Cost · reuse/new | Risk | Card |
|---|---|---|---|---|---|---|---|---|
| 1 | H-1 | Sets Baldino's two relays on brackets that see both doorways (lamps green/red), moves one when blind | 15 · shaft rooms | the network's rule applied to the descent; sets up H-2 (show, then use) | +5 main | M · reuse, 2 relays + 5 brackets | a save past a room counts it placed | C11-1 (approved 10.11) |
| 1 | H-2 | Between bank shots, at three junction boxes: Mira's two-mark needle, Zoé's three dials, Oku's flywheel braked by the ball | 16 · core | the finale combines what the game taught; allies act, not only speak | +4 main | M · reuse, 3 boxes | stun windows (combat owner); resume D16 | C12-1 (approved) |
| 2 | H-3 | Sees the pack in clear ice; melts it with the heat flask **or** turns a mirror to send light (two ways) | 7+ · glacier | P1 "vary"; Yorna's family; crystal 10/12 | 10 | M · reuse + ice wall, mirror post | a new name (narrative) | HAM-3 (approved) |
| 2 | H-4 | Follows the standing figures' shared gaze to a drift, borrows Brosk's shovel, digs a survey cache | 5+ · Desert | LBA1's landmark clue (sample 4); gives scenery a job (R11) | 10 | M · reuse + drift/hatch | the gaze must read on camera | DES-1 (approved) |
| 2 | H-5 | A crusted wall hums once a crystal is held; the fork cracks it, or the lantern shows a crack for the ball | 15, epilogue · galleries | the third use of the crystal rule; the 12th crystal unlocks Sendell's catch | 5 | S · reuse + tiny cell | — | UND-1 (approved) |
| 3 | H-6 | Reads a capped post's tag, feels its warm pipe and the burrow's hot grate, convinces the fitter, opens the cap; later the pulse tool opens the project stores (the withheld kits) | 3–9, 14+ · Zeelich street | "show a working system, then its cost" (the bible); two visits, a lit street | 14 | S–M · reuse + a 3×3 m store | must not name Vesk as the cause early | ZEE-1 + ZEE-2 · **Built** 25.11 (WAVE3.md) |
| 3 | H-7 | Takes Pim's torn kite to Lumi (faster if the Wind-Catcher is done), Pim shows the goat path: an earned shortcut past chapter 14's ridge | 6–7+ · Lhar, Kesh | earlier help matters later (sample 2); a shortcut as a reward | 12 | M · reuse, ledges | traversal gates (locomotion: jumpreach, slidetraps) | HAM-2 (approved) · **Built** 25.11 (WAVE3.md) |
| 3 | H-8 | The Esmer line to rings on three far isle rooms and the gorge's ice arch | 3/9+ · isles, gorge | a later tool reopens old places (P6) | 10 | S–M · reuse, rings | a ring for the way back | ISL-3 (approved) + HAM-4 · **Built** 25.11 (WAVE3.md) |
| 4 | H-9 | Watches Lulu's boat beat Arthur's, finds her keel weight, reads the flags, sets keel and sail, then the race (a mini-game played out by the choices); later signals with lamps | 2–7, epilogue · home pond, harbour basin | a family's small want beside danger (P5); the domestic heart of LBA | 15 | M · reuse, boat props | must not crowd ch 2; harbour not moved | CIT-2 + OP-4 merged · **Built** 25.11 (WAVE4.md) |
| 4 | H-10 | The letters filed as cargo; fills Odile's correspondence form (one choice), carries the sack by spaceship to Knartas | 4–9 · hostel, quay, Knartas | an ordinary blocker solved by an ordinary favour (sample 1); comic bureaucracy | 12 | M · reuse | text-heavy (clarity editor) | ISL-2 · **Built** 25.11 (WAVE4.md) |
| 4 | H-11 | A postcard behind the tavern bar, the case from Tralu's cave, finds Raph singing on Otringal; he plays the lighthouse in the epilogue | 4+ · Citadel, Otringal | a person found from two clues; a visible payoff | 10 | M · one new person | narrative approval | CIT-3 · **Built** 25.11 (WAVE4.md; Raph outside the bar's door, Lys keeps the stage) |
| 5 | H-12 | Brings parts to Nell's bench for three tool tune-ups (kashes 15/20/25); collects Baldino's three prototype tins from hop-pack ledges in three regions | 10/14+ · Citadel + 3 regions | gives kashes a use late (today little to buy after ch 6); the hero grows (P7) | 16 | M · reuse, 3 ledges | the tuned pack must not clear any gate | CIT-1 + R-1 · **Built** 25.11 on a worker branch (WAVE5.md; Citadel's stack below the Whispering Cliffs, not on the plateau; kashes only, no clover; pictures wait for the user's pick) |
| 5 | H-13 | Fills the monastery cistern's basin (lance or bucket) to open its cellar; in the Wannie mine, the pocket set and lantern lead to a seam the glove breaks | 7+, 14+ · monastery, Under Celebration | combine three known tools (P1's last step) | 12 | S–M · reuse + small pockets | bucket trips capped (no padding) | R-2 + R-3 · **Built** 25.11 on a worker branch (WAVE5.md; the store's reward is 20 kashes and a tea urn that refills magic, no clover; the seam by the old adit under Celebration) |
| 5 | H-14 | Takes three warm-ground readings (fork, or watch the stake's flag); Ilka's map then marks on the holomap where something still hums | 5–9 · Desert | an optional tool or a slower way; raises the crystals' find rate | 10 | M · 3 stakes, holomap layer (UI) | ch 9 line reads a flag only | DES-3 · **Built** 25.11 on a worker branch (WAVE5.md; the readings to Ilka or pinned to her board; the holomap's planet inset rings where a crystal still hums) |
| 6 | H-15 | **The Francos' dig, twelve years on:** villagers still dig for their relic; the player triangulates from three diggers' partly unreliable tips and uses the pocket set as a detector; finds it | 4+ · Knartas (LBA2's Francos' island) | LBA2-documented obsession and humour (ZEELICH_GAP); sample 6's scattered hints | 20 | M · reuse island and rooms; holes, extras | what the relic is (narrative; no LBA2 lore invented) | new · **Built** 25.11 on a worker branch (FRANCOS.md; the relic is our own: the Great Waker, a tin alarm clock; pictures wait for the user's pick) |
| 6 | H-16 | **The Lift Below:** the reserved lift's key behind a bar tab (pay it or fix the stage winch with the ball), the hand brake on the ride down, the Wannies' mine; optional boss: a gas monster beaten by catching its fireballs with the Wannie glove and throwing them back | 4+ · Lift Dock, Otringal's bar and hotel, the Platform | LBA2's two layers, mine and glove (documented); the Wannies decide for themselves | 35–40 | **L** · lift and rooms partly exist; mine arena new | biggest build; glove catch (equipment); boss (combat) | OP-7 + new boss · **Built** 25.11 (WAVE6.md) |
| 7 | H-17 | Compares chalk SHELTER against stencilled STATION labels, opens the baggage claim's back store by its conveyor lever, lowers the cart on the cargo lift; the back passage stays as a shortcut | 8–14 · Citadel harbour | earlier help shows during the crisis; a shortcut | 25 | M · reuse (lift not moved) | evacuation-state interplay | OP-1 · **Built** 25.11 on a worker branch (WAVE7.md; the lift's crate stalls on the barge, the back store is a cage in the baggage claim's front hall; pictures wait for the user's pick) |
| 7 | H-18 | Asks Lumi what she needs; Dallan carries the canvas himself; the ball hooks the sail's high ring | 14+ · Kesh | action over confession; a character turn | 10 | S · reuse | — | OP-6 · **Built** 25.11 on a worker branch (WAVE7.md) |
| 8 | H-19 | **Four behaviours, four secrets:** one visible hint per place (a sleeping dog by a cellar, a ledge with a gap, a cracked wall, a quiet talk), each opened by a behaviour; rewards are lore, a shortcut, a clover, kashes | 3+ · four regions, existing spots | after ch 2 the behaviours are rarely the answer (DEPTH-PLAN §2); LBA's rooms found by trying a behaviour (recollection) | 15 | S each · reuse | each spot needs a job (R11) | new |
| 8 | H-20 | Boards and an existing unattended stall carry headlines for deeds done; the epilogue's thanks round; the journal lists open favours | 4+ · boards, epilogue | LBA2's changing newspapers (documented); raises the share found | 8 | S · reuse (no new stand) | spoiler wording | X-1 + EP-1 |

**Totals after waves 1–8 (estimate):** main route +9 min (~6.4 h). Optional all-content +~4.2 h (~8.0–9.0 h).
- steady player: ~10.5–11 h;
- thorough player: ~13–14 h;
- everything: ~14.5–15.5 h.

**Reserve wave**, if the user's own times show a shortfall (~1.5 h if everything is done):
- C12-2 (Zoé in the lamp room) and C12-3 (the hoist), main path, L;
- OP-2 The Last Shift, 30, a new hall;
- OP-3 Yorna's Map, 25 (overlaps H-7: merge or choose);
- EP-BL, the Ballastra aftermath, 8;
- a Mosquibee trial after LBA2's test arena, 25, L;
- a games hall (question 2).

Dropped: OP-5 The Silent Bell, because chapter 13 now uses that bell.

**Agents per wave:**
- lba3-quest-designer: every quest's script and puzzle;
- lba3-narrative-developer: flags, new people (H-3's brother, H-11 Raph, H-15's relic, H-16), story meaning;
- lba3-clarity-editor: clue lines;
- lba3-ui-ux-specialist: journal, holomap layer, H-20;
- lba3-equipment-designer: H-12 tune-ups, the glove's catch in H-16, tool targets;
- lba3-locomotion-engineer: H-7 and H-12 ledges, H-8 rings;
- lba-world-campaign-finisher: waves 1 and 6 places;
- lba-animation-combat: H-2 and the H-16 boss;
- lba-world-art / lba3-polish-specialist: the P107 pictures;
- lba-dialogue-editor + Hebrew;
- lba-chapter-balance: the ledger after each wave.

One writer per shared file: `depth.js` is shared by waves 2, 3 and 5, so one worker at a time.

## 4. How to measure

- **The bot (Automated runtime):** each new quest's suite runs with `STATS=` (`tests/lib/stats.js` via `seg.mjs`)
  for free play, words, lines and health. The formula is applied, and the ledger in `chapter-balance.md` gains an
  "optional" column per region. Main-path waves rerun segments 14 (and 13) and their chapter suites.
- **Discovery is not measured by the bot.** The 50 % and 80 % shares stay assumptions until a person plays.
- **The real check: the user's first play.** Proposed small tool (S, no visible world change): the save keeps game
  time per chapter key, split into play, dialogue and menus, plus time inside each optional quest's window. Copy
  diagnostics (exists) prints it. The user pastes it at chapter ends. Two or three of the user's chapters calibrate
  the 1.8× and 60 s factors for the whole ledger. Hours are claimed only from these numbers.

## 5. Questions for the user

1. **Whose 15 hours?** Is the target a thorough first play (doing most optional things), or the hurried one? This
   decides whether the reserve wave is needed.
2. **Mini-games:** which LBA2 mini-games do you mean? The repo documents only the casino (slots, betting markers, a
   jackpot wheel). Is gambling for kashes acceptable, or only skill games (like Tali's court and the boat race)? Do you
   want a steerable vehicle race? (That needs a new system: large.)
3. **LBA's small keys and clover boxes:** do you want them back (one key, one door, in one area; clover boxes raising
   the clover cap above 9), or do the singing crystals stay the only collectible that grows Twinsen?
4. **Zeelich's lower world (H-16):** may we build the Wannies' mine and an optional boss there? This is the one large
   new place in the plan.
5. **Chapter 7 (The Observatory)** is under the band (~15 min). Should it get a main-path step, or stay as it is?
6. **The Francos' relic (H-15):** may the relic be our own invention (comic or tied to the shell), since we don't
   claim LBA2's?
7. **H-9 and OP-3/H-7 overlaps:** may we merge Arthur's boat (two cards) into one, and Yorna's map into Pim's goat
   path?

### שאלות למשתמש (תרגום)
1. ‏15 השעות – למי? לשחקן יסודי שעושה את רוב התוכן האופציונלי, או לשחקן שממהר? מזה נגזר אם צריך את גל הרזרבה.
2. ‏מיני־משחקים: לאילו משחקים מ־LBA2 התכוונת? במאגר מתועד רק הקזינו. הימורים על קאשים מקובלים, או רק משחקי מיומנות? מרוץ רכב (מערכת חדשה, גדולה)?
3. ‏מפתחות קטנים וקופסאות תלתן כמו ב־LBA – להחזיר, או שהקריסטלים המזמרים יישארו האוסף היחיד שמחזק את טווינסן?
4. ‏העולם התחתון של זיליך (H-16): לבנות את מכרה הוואני ובוס אופציונלי? זה המקום החדש הגדול היחיד בתוכנית.
5. ‏פרק 7 (המצפה) קצר מהטווח: להוסיף לו צעד בדרך הראשית או להשאיר?
6. ‏השריד של הפרנקוס (H-15): מותר שיהיה המצאה שלנו?
7. ‏לאחד את שני כרטיסי הסירה של ארתור לאחד, ואת המפה של יורנה לשביל העיזים של פים?

## Checkpoint for the next task

The proposals are listed and none is built. Waves 1–2 were approved by the user on 10.11 (DEPTH-PLAN's first wave)
and can start once the polish run allows it. H-15, H-16 (its boss) and H-19 are new and wait for the questions. The
missing parts of this partial doc: full cards for H-15, H-16's boss and H-19 (steps, flags, tests per DEPTH-PLAN §9),
and a check of U-4's and U-5's minutes against their docs.

## The user's answers (24.11)
1. **Whose 15 hours:** the thorough player (most optional content). Waves 1–8 target ~13–14 h for that player; the reserve wave only if the user's own measured times fall short.
2. **Build now:** waves 1–2 (H-1, H-2 main path ch 15–16; H-3 glacier, H-4 desert cache, H-5 humming wall), after the current workers (TALK-ORDER, ROCKS-MASONRY, RELEASE-PREP) finish. Visible world changes get before/after pictures (P107).
3. **Small keys and clover boxes:** bring them back (one key, one door, in one area; clover boxes raise the clover cap above 9). Needs its own design card before building.
4. **Zeelich's lower world (H-16):** yes, build the Wannies' mine and the optional gas-monster boss (catch its fireballs with the glove, throw them back). Wave 6. **Built 25.11** on a worker branch (WAVE6.md; the pictures wait for the user's pick, P107).
6. **The Francos' relic (H-15), 25.11:** our own invention, funny, in LBA's humour (an ordinary object they revere); no LBA2 lore, not claimed as LBA2's; short and clear with a visible payoff; kashes, not a clover leaf. **Built 25.11** on a worker branch (FRANCOS.md: the Great Waker, a tin alarm clock).
Questions 2 (mini-games), 5 (chapter 7) and 7 (merges) are still open.
