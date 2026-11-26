# CLOVER-BALANCE · Clover leaves after KEYS-CLOVER and waves 1–7 (25.11.2026)

The user asked on 25.11 to re-check the clover balance: four clover boxes now raise the cap from 9 to 13, and 13 leaves
may make death rare. This card counts every leaf source, estimates what players hold and spend per chapter, and offers
three options. The card itself changed no code. **The user picked Option A on 25.11; it is built: see "Built" at the end.**

**Labels.** *Source*: read in the code at `6e026556`. *Automated runtime (old)*: the playthrough bot's numbers in
`chapter-balance.md` (9.11 and COMBAT-2) and its campaign saves in `tests/fixtures/campaign/` (older builds, the base
campaign). *Estimate*: worked out here, not measured. Nobody has played any of this. The holdings come from a scratch
script (session scratchpad `clover/calc.mjs`), not from a run.

## 1. Chapters and rules (Source)

- **The campaign:** 16 numbered chapters and the epilogue (`story/index.js` ORDER/NUMBER): 1 The Well, 2 The Joint
  Project, 3 Zeelich, 4 The Dig, 5 Steam and Sand, 6 The Pass, 7 The Observatory, 8 Evacuation, 9 The Council, 10
  Borrowed Time, 11 Ballastra, 12 The House of Balances, 13 The Cradles, 14 Baldino's Network, 15 The Shell, 16 The
  Core, Ep Home. A base-campaign save (`exp_base`) skips 10–13, so its 10–12 are the network, shell and core.
- **Start:** 2 leaves, 10 life (+1 per singing crystal), damage 1–2 a hit (`hero.damage`; falls 1; Grobo strike, crawler
  slam and the Blow's fire 2). Difficulty: gentle ×0.5 damage, hard ×1.5 (`combat.js`).
- **Cap:** `hero.cloverMax` = 9 + boxes found (`kc_box_*`), at most 13.
- **Using a leaf:** at 0 life he gets up on the spot with full life and magic (`actors.js`). With all twelve crystals,
  Sendell catches him once before a leaf is used (`depth.catchFall`).
- **Without a leaf:** Game Over, then Retry from the last autosave (at least 4 life).
- **Other safety:**
  - hearts from enemies and containers;
  - up to three honey jars, each giving half his life back by itself at a quarter life;
  - royal honey;
  - the healers: Yorna's broth, Ilka's canteen, Ker'aooc, Bersimon;
  - the ferry cabin ticket.

## 2. Inventory: every leaf source (Source)

"At the cap" is what each source does today when he is full.
- **lost:** the leaf is taken and wasted. This applies to pickups (`collect`) and the clamps (`min(cap, +1)`).
- **kashes:** it pays kashes instead.
- **kashes at 9:** it pays kashes from 9 leaves, even when a box has raised the cap (a defect, §7).

Route:
- **main:** the main route gives it.
- **route (opt.):** the objective lists it, but the main route does not need it.
- **opt.:** optional.

The chapter is the first chapter in which the source can be had.

| # | Ch | Source (file) | Route | Origin | At the cap | Kashes with it |
|---|---|---|---|---|---|---|
| 1 | 1 | Tim, after the overheard talk (`prologue.js`) | route (opt.) | before waves | lost | — |
| 2 | 1 | The old stump, a clover-only giver (`world.js`) | opt. | before | lost | — |
| 3 | 1 | Whispering Cliffs top, ball + jumps (`main.js` cliff-clover) | opt. | before | lost | — |
| 4 | 1 | Asylum register, a search (`prologue.js`) | opt. | before | lost | — |
| 5 | 1 | Sewers: the star chest (`story/sewers.js`) | opt. | before | lost | — |
| 6 | 1 | Sewers: Tralu's cave cache (`story/sewers.js`) | opt. | before | lost | — |
| 7 | 1 | **Box B1**, FunFrock's passage (`keysclover.js`) | opt. | boxes | +1 cap, +1 leaf | — |
| 8 | 2 | Bram's thanks, The Old Pump (`life.js`) | opt. | before | lost | — |
| 9 | 2 | Twinsen's old tin, pocket set (`kit2.js`) | opt. | before | kashes 10 | — |
| 10 | 3 (9 if not bought) | Cloud-canal crate, Esmer line (`kit2b.js`) | opt. | before | kashes 22 | 12 |
| 11 | 4 | Ilka's tin, singing fork (`kit2b.js`) | opt. | before | kashes 10 | — |
| 12 | 4 | Coal chute, glove (`arsenal.js`) | opt. | before | lost | 12 |
| 13 | 4 | Platform chapel bell (`islandpeople.js`) | opt. | before | lost | — |
| 14 | 4 (9 if line given) | Far quay locker, ISL-3 (`depth.js`) | opt. | wave 3 | lost | — |
| 15 | 4 | Mila's letters, H-10 (`wave4.js`) | opt. | wave 4 | kashes at 9 (30) | 15 |
| 16 | 4 | Deep seam strongbox, after the Blow (`liftbelow.js`) | opt. | wave 6 | kashes 55 | 40 |
| 17 | 4 | **Box B2**, Otringal pump house | opt. | boxes | +1 cap, +1 leaf | — |
| 18 | 4 | **Box B4**, School mask ledge | opt. | boxes | +1 cap, +1 leaf | — |
| 19 | 5 | Tarra after the vent (`steam.js`) | main | before | lost | — |
| 20 | 6 | Frozen chest, heat flask (`kit2b.js`) | opt. | before | kashes 20 | 10 |
| 21 | 6 | Gorge arch chest, HAM-4 (`depth.js`) | opt. | wave 3 | lost | 12 |
| 22 | 6 | **Box B3**, Lhar goats' house | opt. | boxes | +1 cap, +1 leaf | — |
| 23 | 8 | Pippa's deliveries, H-17 (`wave7.js`; also in the ending) | opt. | wave 7 | kashes at 9 (15) | — |
| 24 | 9 | Knartas quay light, the lens (`islandpeople.js`) | opt. | before | lost | — |
| 25 | 11 | Wenna, Ballastra N2 (`ballastra.js`; expanded campaign only) | main | expansion | lost | — |
| 26 | 14 | Hop-pack test step tin (`arsenal.js`) | opt. | before | lost | 10 |
| 27 | 15 | Hollow boulder, lantern (`arsenal.js`) | opt. | before | lost | — |
| 28 | Ep | Arthur's lamp, ending free play (`wave4.js`) | opt. | wave 4 | kashes at 9 (10) | — |

**Not fixed in number:**
- **Two mixed givers can give a leaf:** the asylum desk (money/life/clover, chapter 1) and the Bù maze (life/magic/clover,
  chapter 4).
  - The giver picks the kind he needs most (`whichBonus`). A leaf comes only by a one-in-three draw, when nothing else is
    needed: kashes 20 or more, and life and magic full.
  - A giver that may give a clover gives **once ever** (`giverOnce`). An early visit (under 20 kashes) therefore spends
    the desk on 3 kashes for good.
  - Expected: well under one leaf each.
- **Two shops sell leaves without a limit, up to the cap:**
  - Pippa's stall (22 kashes) and Mr Bazoo's (22; 11 in chapter 8's sale). Both are on Citadel.
  - Shop items read "max" at the cap.
- **No enemy drops a leaf** (enemies give money, life or magic).

**Totals:**

| | Before waves 1–7 and the boxes | Now |
|---|---|---|
| Starting leaves | 2 | 2 |
| Fixed leaf sources | 18 (17 + Wenna) | 28 |
| Leaves offered | 20 | 30 |
| Cap | 9 | 9–13 |

- The 10 new leaves: the waves added 6 (two in the epilogue/ending window: Arthur, and Pippa there), and the boxes 4.
- The main route gives 3 (Tim, Tarra, Wenna). Only Tarra and Wenna are certain.

Offered per chapter (fixed sources; the start's 2 not included):

| Ch | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15 | 16 | Ep |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| leaves | 7 | 2 | 1 | 8 | 1 | 3 | 0 | 1 | 1 | 0 | 1 | 0 | 0 | 1 | 1 | 0 | 1 |
| of which waves / boxes | 0 / 1 | 0 | 0 | 3 / 2 | 0 | 1 / 1 | — | 1 | 0 | — | 0 | — | — | 0 | 0 | — | 1 |

**Compared with the earlier ledger.** No per-source clover ledger existed before this card. The earlier record is in
three places:
- `chapter-balance.md`: leaves spent per chapter on the main route.
- `DEPTH-PLAN.md` §2 and line 531: most rewards were "a clover and N kashes"; at 9 they turned to kashes; "the economy
  around 9 works", so it did not propose raising the cap.
- The bot's campaign saves.

Those saves (Automated runtime, old build, base campaign) hold **2 leaves through chapter 3, 3 in chapters 4–5, and 4
from chapter 6 to the end**. They hold **10–19 kashes**: the main route alone never pays for a 22-kash leaf.

## 3. Holdings at each chapter's end (Estimate)

The three players:
- **Main:** takes the main route and Tim's leaf, buys nothing.
- **Steady:** takes each optional leaf with probability ½ (an expected value).
- **Thorough:** takes every source in its first chapter and buys nothing. The shop would only top up to the cap.

Leaves spent: the middle estimate of §4. The cap is 9 + the boxes found by then (the main player finds none).

| Ch end | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15 | 16 | Ep |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Main (before = now) | 3 | 2 | 2 | 1 | 2 | 2 | 2 | 2 | 2 | 2 | 3 | 3 | 3 | 2 | 2 | 1 | 1 |
| Main, high spending | 3 | 1 | **0** | **0** | 1 | 1 | 1 | **0** | 0 | 0 | 1 | 1 | 1 | **0** | 0 | 0 | 0 |
| Steady, before (cap 9) | 5.5 | 5.5 | 6 | 6.5 | 7.5 | 8 | 8 | 8 | 8.5 | 8.5 | 9 | 9 | 9 | 8 | 8.5 | 7.5 | 7.5 |
| Steady, now | 6 | 6 | 6.5 | 9.5 | 10.5 | 11 | 11 | 11 | 11 | 11 | 11 | 11 | 11 | 10 | 10.5 | 9.5 | 9.5 |
| Thorough, before (cap 9) | 8 | 8 | **9** | 8 | 9 | 9 | 9 | 9 | 9 | 9 | 9 | 9 | 9 | 8 | 9 | 8 | 8 |
| Thorough, now (cap) | 9 (10) | 9 (10) | **10 (10)** | 11 (12) | 12 (12) | **13 (13)** | 13 | 13 | 13 | 13 | 13 | 13 | 13 | 12 | 13 | 12 | 12 |

Leaf rewards wasted or turned into kashes at the cap over the game:

| Player | Before | Now |
|---|---|---|
| Thorough | 8 | **14** |
| Steady | about 1 | about 4 |

## 4. Danger: leaves likely spent per chapter (Estimate)

Fights come from each chapter's `enemyDefs`. The bot's columns are Automated runtime (old builds): `chapter-balance.md`
9.11 (three runs) and its COMBAT-2 notes. The bot cannot dodge melee, but it knows every answer.

| Ch | Main-route fights (Source) | Bot: life lost · leaves spent | Spent: low / **mid** / high |
|---|---|---|---|
| 1 | the well cave's mites (1 a bite) | 0 · 0 | 0 / **0** / 0 |
| 2 | Citadel depot: 2 drones, a guard, a dog | 15 · 1 each run | 0 / **1** / 2 |
| 3 | Zeelich depot: 2 drones, a Grobo guard (2 a strike), a dog | 10–13 · 0–1 (later 9–10) | 0 / **0** / 1 |
| 4 | the post (2 drones, guard, dog), 3 dig mites, 2 temple mites; the sandstorm | 10–11 · 1 each run | 0 / **1** / 1 |
| 5 | condenser: 2 drones, a guard, a FunFrock clone | 3 · 0 | 0 / **0** / 0 |
| 6 | 3 ice mites | 0–1 · 0 | 0 / **0** / 0 |
| 7 | the heavy drone (8 hits) | 2 · 0 | 0 / **0** / 0 |
| 8 | fortress yard: 2 drones, 2 guards, a clone, a dog | 4–9 · 0 (later 0 lost) | 0 / **0** / 1 |
| 9 | stealth only | 0 · 0 | 0 / **0** / 0 |
| 10–13 | **no enemies** in `throttle`, `ballastra`, `balances` (falls cost 1) | not measured | 0 / **0** / 0 |
| 14 | the bore (3 drones, then a clone, a Grobo guard who stands down, the sentry); the ridge (crawler, slam 2; 2 mites) | 8–22 · 2, 0, 0 (later bore 2–9, ridge 2) | 0 / **1** / 2 |
| 15 | a drone, 4 mites | 5–9 · 0 | 0 / **0** / 1 |
| 16 | the guardian (boss) | 4–5 · 0 | 0 / **1** / 1 |
| Opt. | the Blow (fire 2), LBA1's rooms, the Zeelich isles | not measured | 0–1 |

**For the whole game, a first play on normal:** about **4 leaves (mid)**, 0 for a good fighter, about 9 for a weak one.
Gentle difficulty roughly halves this. Hard is near the high column.

**Where leaves are spent:** in four places, the depots of chapters 2–4, the network's bore and ridge (14), and the
core (16). Chapters 10–13 spend none.

## 5. What this shows

1. **The cap does not decide how often a player dies.**
   - Deaths are rare because hits cost 1–2 out of 10–22 life, with hearts, honey and healers nearby.
   - A thorough player was already full at 9 from chapter 3, before the boxes. A Game Over was already out of reach for
     him (about 4 spent against 8–9 held).
   - 13 changes the number he carries, not the danger he faces. Making deaths less rare is the fights' work (the
     depots, the bore, the core), not the cap's.
2. **The cap decides how much a reward is worth.**
   - Now the thorough player is at the cap from chapter 3 to the end, and **14 leaf rewards** reach him full.
   - **Before, 8 did.** Most of them are wasted silently (§7).
   - This is DEPTH-PLAN's point 2, made larger: a leaf reward means little to the very player who finds it.
3. **The gap between players grows.**
   - The main player holds 1–3 leaves. With high spending he reaches **0** in chapters 3, 4, 8 and 14, so a Retry is
     possible there.
   - The thorough player holds 12–13.
   - The boxes only help the player who is already safe. That is LBA's shape too (boxes are found off the path), so it
     is not wrong in itself.
4. **The shop can always fill the gap.**
   - Two shops sell without a stock limit, so the cap, not the finds, is the true limit for anyone with kashes.
   - With 13, buying to the top is 4 more leaves (88 kashes).
5. **LBA's shape** (KEYS-CLOVER §1, from LBA2's released source): the boxes start at 2 and rise to 10, and a leaf never
   goes above them. There the boxes *are* the safety net's size. Here the cap starts at 9, so each box adds 11 %.

## 6. Options (each for the user's pick; numbers are estimates)

### Option A — keep 13 and the leaf in each box; fewer leaf rewards; the shop sells only up to nine (recommended)

**Keep these as leaves (15 offered with the start's 2):**
- the main route: Tim, Tarra, Wenna;
- the four boxes;
- six optional finds that take real effort: the cliff top, the sewers' star chest, Bram, the strongbox after the Blow,
  the gorge arch chest, the hollow boulder.

**Turn 15 leaf rewards into kashes:**
- Seven already have an amount for "at the cap" in the code: the old tin 10, the cloud-canal crate 22, Ilka's tin 10,
  Mila 30, the frozen chest 20, Pippa 15, Arthur 10.
- The other eight pay a proposed amount:
  - 10 kashes each: the stump, the asylum register, Tralu's cache, the chapel bell;
  - 15 kashes each: the far quay, the quay light;
  - 22: the coal chute (12 + 10);
  - 20: the test-step tin (10 + 10).
- Drop `clover` from the two mixed givers' kinds.

**The shop rule:** Pippa and Bazoo sell a leaf only while he holds fewer than nine. Above nine, leaves come only from
the boxes and the finds.

**A game-wide rule at the cap:** a leaf reward at the cap pays 10 kashes, and a leaf pickup stays on the ground as a heart
does at full life. Nothing is wasted silently.

**Numbers (mid spending):**

| Ch end | 1 | 2 | 3 | 4 | 5 | 6 | 7–10 | 11–13 | 14 | 15 | 16 | Ep |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Thorough | 6 (cap 10) | 6 | 6 | 8 (12) | 9 | 11 (13) | 11 | 12 | 11 | 12 | 11 | 11 |
| Steady | 4.5 | 4 | 4 | 4.5 | 5.5 | 6.5 | 6.5 | 7.5 | 6.5 | 7 | 6 | 6 |

- The main player does not change (1–3).
- Wasted at the cap: 0. The thorough player stays one or two under 13 at the middle spending; the top slot is his only
  if he spends fewer leaves.

**What it costs:**
- About 17 small edits in about 11 files: the reward sites, two giver kinds, and the shop's `disabled` test in `main.js`
  and `shops.js`.
- New English and Hebrew lines for the converted rewards, since several speakers say "a clover leaf".
- No save change: flags and the cap rule stay the same.

**What it keeps:** the user's picks of 25.11 (cap 13, a leaf in each box, the keys).

### Option B — the boxes empty (they raise the cap only); everything else as now

| Ch end | 1 | 2 | 3 | 4 | 5 | 6 | 7–8 | 9–13 | 14 | 15 | 16 | Ep |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Thorough | 8 (10) | 9 | 10 | 9 (12) | 10 | 12 (13) | 12 | 13 | 12 | 13 | 12 | 12 |
| Steady | 5.5 | 5.5 | 6 | 8 | 9 | 10 | 10 | 10.5–11 | 10 | 10.5 | 9.5 | 9.5 |

- Wasted at the cap: 10 (thorough).
- **It changes almost nothing.** The thorough player fills the empty slots from the many other rewards within a chapter
  or two, so he is still at 12–13 from chapter 6.
- It reverses the user's pick 2 for 4 leaves.
- Cost: S (one line in `keysclover.js` and the box toast).

### Option C — LBA2's shape: a low base that the boxes raise (5 + 4 boxes = 9 at most), with Option A's fewer rewards

| Ch end | 1 | 2 | 3 | 4 | 5 | 6–13 | 14 | 15 | 16 | Ep |
|---|---|---|---|---|---|---|---|---|---|---|
| Thorough | 6 (cap 6) | 5 | 5 | 7 (8) | 8 | 9 (9) | 8 | 9 | 8 | 8 |
| Steady | 4.5 | 4 | 4 | 4.5 | 5.5 | 6.5–7 | 6 | 6.5 | 5.5 | 5.5 |

- The main player does not change: he holds 1–3, under 5, and never meets the cap.
- Wasted at the cap: 3 (thorough).
- **Each box is +20–25 %**, and the box row in the behaviour menu grows 5 → 9, as LBA's does.
- It reverses the user's "13" and changes the shop line ("Up to five, one more for each clover box"; Hebrew too).
- **Saves:**
  - Today an old save is clamped to its cap on load. With a base of 5, a save holding 9 leaves would lose 4.
  - The clamp must therefore change: what a save holds is kept, and the cap only stops new gains.
- Cost: M, with the save rule and a test of that load.

## 7. Defects found on the way (Source; handed to the coordinator, not fixed here)

1. **Three cap sites still compare with a hard-coded 9.**
   - The sites:
     - `story/wave4.js:348` (Mila);
     - `story/wave4.js:510` (Arthur);
     - `story/wave7.js:349` (Pippa).
   - KEYS-CLOVER §6 says every cap site reads `hero.cloverMax`, but these three were not swept.
   - With a box found and 9–12 leaves held, they pay kashes instead of a leaf, which is inconsistent with the other sites.
   - Option A removes them (they become kashes). Under B or C they need `h.cloverMax`.
2. **The game has no single rule at the cap.**
   - 5 sources pay kashes at the cap, and 3 more pay kashes from 9 leaves (item 1).
   - 16 waste the leaf silently: every pickup (`main.js collect`, `ChapterBase.settleOwed`) and the direct clamps
     (`steam.js`, `islandpeople.js` ×2, `arsenal.js` ×3, `prologue.js`).
   - A game-wide rule is part of Option A.
3. **Mixed givers are spent for good.** An early visit to the asylum desk (under 20 kashes) uses it up on 3 kashes
   forever, because a giver that may give a clover gives once ever. This is harmless but odd. Option A removes the
   clover from both givers, so they refill as other containers do.

## 8. Recommendation

**Option A.** It keeps every pick the user made on 25.11, and it fixes what 13 actually changed:
- the worth of leaf rewards (14 wasted or turned into kashes at the cap → 0);
- the shop's way round the boxes.

With it, the thorough player:
- starts the game at 6;
- passes 9 only once he has found boxes (chapter 4 on);
- holds 11–12 from chapter 6, and reaches 13 only if he spends fewer leaves than the middle estimate.

The steady player holds 4–7.5 and the main player 1–3, which is a safety net, not a stockpile.

If the user wants deaths themselves to be less rare, that is a separate request for the fights. The leaves are spent in
the depots (2–4), the bore and the ridge (14) and the core (16); chapters 10–13 have no enemy at all.

If the user prefers the leaf count to stay where it was before the boxes (9 at most), Option C is the LBA2-shaped choice,
at the cost of the save rule.

**Test for whichever is built:**
- `tests/keys-clover.mjs` once (the cap, the boxes, the shop's max, an old save at cap 9);
- then `node tools/he-bundle.mjs` and `node tests/dialogue-check.mjs` for the changed lines.

## 9. Evidence and limits

- **Source only:** every source, chapter, cap behaviour and price in §2 (`git grep` of `clover`, `cloverMax` and the
  reward helpers over `src/` at `6e026556`), and the fights in §4 (`enemyDefs`).
- **Automated runtime (old):**
  - the bot's life lost and leaves spent (`chapter-balance.md`, builds of 9.11–13.11, base campaign);
  - its saves' leaves and kashes (`tests/fixtures/campaign/*.save.json`).
  - The expanded chapters 10–13 and the waves' rewards were not in those runs.
- **Estimate:** the leaves spent (§4) and every holding (§3, §6). The steady player is an expected value. The thorough
  player's order (each source in its first chapter) is an assumption. Kashes earned by a thorough player were not
  counted, so the shop's effect in §5 is qualitative.
- **Not done:** no game run, no play, no test. No person has played; no playtime is claimed.

## סיכום בעברית

- **מה נבדק:** כל מקורות עלי התלתן במשחק, לפי פרק. אין שינוי בקוד; הכול הערכה מקריאת הקוד ומנתוני בוט ישנים. אף אדם לא שיחק.
- **ספירה:**
  - לפני הגלים ולפני הקופסאות: 20 עלים במשחק כולו (2 בהתחלה ו־18 מקורות), עם תקרה 9.
  - היום: 30 עלים (2 בהתחלה ו־28 מקורות), עם תקרה של עד 13.
  - הגלים הוסיפו 6 עלים והקופסאות 4.
  - שתי חנויות בסיטדל מוכרות עלה ב־22 קאשים, בלי הגבלת כמות.
- **מה כל שחקן מחזיק:**
  - מי שהולך רק בדרך הראשית מחזיק 1–3 עלים.
  - שחקן יסודי מגיע לתקרה כבר בפרק 3 ונשאר בה עד הסוף.
  - אצל השחקן היסודי 14 פרסים של עלה מתבזבזים, או הופכים לקאשים, כשהוא כבר בתקרה. לפני כן היו 8.
- **סכנה:** במשחק ראשון ברמה רגילה מוציאים בערך 4 עלים במשחק כולו. זה קורה בעיקר במחסנים של פרקים 2–4, בקידוח ובמעבר ההר בפרק 14, ובליבה בפרק 16. בפרקים 10–13 אין אויבים.
- **מסקנה:** התקרה לא קובעת כמה מתים. היא קובעת כמה שווה פרס. כדי שימותו יותר צריך לכוון את הקרבות, לא את התקרה.
- **אפשרויות:**
  - **A (מומלצת):** משאירים את 13 ואת העלה בכל קופסה.
    - 15 פרסים של עלה הופכים לקאשים.
    - החנות מוכרת עלים רק עד תשעה.
    - פרס שמגיע בתקרה נותן קאשים, ועלה על הקרקע נשאר במקומו. שום פרס לא מתבזבז.
    - שחקן יסודי מחזיק 6 בתחילת המשחק ו־11–12 מפרק 6. הוא מגיע ל־13 רק אם הוא מוציא פחות עלים מההערכה.
  - **B:** קופסאות ריקות. זה כמעט לא משנה, כי השחקן היסודי ממלא את המקומות מפרסים אחרים.
  - **C (הצורה של LBA2):** בסיס 5 ועוד ארבע קופסאות, עד 9. הקופסאות שוות יותר, אבל צריך כלל שמירה חדש כדי ששמירות ישנות לא יאבדו עלים.
- **ליקויים שנמצאו (לא תוקנו):** שלושה מקומות בגלים 4 ו־7 עדיין משווים למספר 9 קבוע, ולא לתקרה. בנוסף אין כלל אחד לפרס שמגיע בתקרה: יש פרסים שהופכים לקאשים ויש שמתבזבזים.

## Built · Option A (the user's pick, 25.11)

The work is on the worktree branch, based on `7ccb8532`. The report lists the commits. Nothing was published.

### The one clover rule (`src/game/actors.js`)

- **The rule's numbers:** `CLOVER_BASE = 9`, `CLOVER_FULL_KASHES = 10`, `SHOP_CLOVER_BELOW = 9`.
- **Three hero methods:**
  - `cloverFull()`: he holds his cap. The cap (`cloverMax`) is 9 + the boxes found; `keysclover.js` still keeps it.
  - `gainClover()`: a reward's leaf. At the cap it pays 10 kashes instead.
  - `shopClover()`: a shop may sell a leaf, because he holds fewer than nine.
- **Every cap site asks these methods.** `ChapterBase.giveClover(toast)` gives the leaf with its toast. At the cap it
  gives the 10 kashes with "+10 kashes: your clover leaves are full".
- **A leaf on the ground at the cap stays on the ground** (`Game.canTake`, as a heart does at full life):
  - it hops aside and is taken once there is room;
  - the ball's catch sets it down at his feet.
- **An owed leaf settled after a load** (`settleOwed`: its pickup no longer lies anywhere) counts as a reward. At the
  cap it pays 10 kashes.
- **The shops:**
  - Pippa's stall and Mr Bazoo's grey the leaf from 9 held, with "Sold only while you hold fewer than nine clover
    leaves."
  - The leaf's shop description no longer says "Up to nine, one more for each clover box".

### Changed sources

**Leaf → kashes (12):**

| Source | Ch | Now | Line changed (English + Hebrew) |
|---|---|---|---|
| Old stump (giver) | 1 | 10 kashes, once ever | — (no line) |
| Asylum register | 1 | 10 kashes | `asy_register2` |
| Tralu's cave cache | 1 | 10 kashes (owed pickup) | `sw_cache1`, `sw_toast_owed2` |
| Twinsen's old tin | 2 | 10 kashes | — (`e2_tin_kashes` existed) |
| Cloud-canal crate | 3 | 22 kashes | — |
| Ilka's tin | 4 | 10 kashes | — (`e2b_dtin_kashes` existed) |
| Coal chute | 4 | 22 kashes | `a_boards_cache` |
| Platform chapel bell | 4 | 10 kashes | `ip_chap_thanks` |
| Far quay locker | 4 | 15 kashes (owed pickup) | `dx_far_locker2` |
| Frozen chest | 6 | 20 kashes | `e2b_chest_open` |
| Knartas quay light | 9 | 15 kashes | `ip_quill_thanks` |
| Hop-pack test-step tin | 14 | 20 kashes | `a_jet_tin` |

- **The mixed givers:**
  - The asylum desk (money, life) and the Bù maze's chest (life, magic) no longer list `clover`.
  - They are no longer once-ever givers, so they refill as other containers do (defect 3).
- **Older saves:**
  - A far-quay or cave-cache leaf still owed is settled as its kashes.
  - A stump already searched stays searched.
  - No flag was renamed. The save format is still 6.

**Kept as leaves (16 sources, plus the 2 at the start):**
- the main route: Tim, Tarra, Wenna;
- the four boxes;
- the cliff top, the sewers' star chest, Bram, the strongbox after the Blow, the gorge arch chest, the hollow
  boulder;
- **Mila, Arthur and Pippa.**
  - The coordinator's brief asked for their leaf under a box-raised cap (defect 1), so they stay leaves.
  - The card's Option A list converts them. See the gap under "Holdings after".

### Defects fixed

1. **The fixed 9 in the waves.** `wave4.js` (Mila, Arthur) and `wave7.js` (Pippa) compared with a fixed 9. Each now
   asks `gainClover`.
   - With a box found and 9–12 leaves held, each gives a leaf.
   - At the cap, each pays 10 kashes:

     | | Before (at 9 and above) | Now (at the cap) |
     |---|---|---|
     | Mila | 30 kashes | 15 + 10 kashes |
     | Arthur | 10 kashes | 10 kashes |
     | Pippa | 15 kashes | 10 kashes |

   - Arthur's toast at the cap used to say "kashes from Lulu". It now uses the rule's own toast.
2. **One rule at the cap everywhere.** The game-wide sweep:
   - **Writes to `clovers`:** only `actors.js` (`gainClover`, the revive), the start and the save's load and clamp
     write the count. No site clamps silently any more.
   - **Cap sites routed through the helper:**
     - `steam.js`: Tarra;
     - `arsenal.js`: the boulder;
     - `keysclover.js`: the box;
     - `liftbelow.js`: the strongbox (at the cap +10 kashes; it was +15);
     - `main.js`: the pickup and Pippa's stall;
     - `shops.js`: Bazoo;
     - `base.js`: `settleOwed`.
   - **Fixed 9s removed:** the `|| 9` fallback in `behmenu.js` and the `> 9` in `inventory.js` now read
     `CLOVER_BASE`. `keysclover.js` re-exports `CLOVER_BASE` from `actors.js`.
   - **Left in place:** `tests/townlife`, `tests/sewers` and `tests/depth-wave3` still write `Math.min(9, …)` or
     `>= 9` for kept sources. These are test tolerances, not game code: in those runs the leaf stays below the cap.
3. **The once-ever mixed givers:** fixed by dropping their clover (above).

### Holdings after (Estimate)

From the "BUILT" rule in `calc.mjs` (session scratchpad, `clover-a/`), with mid spending:

| Ch end | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8–13 | 14 | 15 | 16 | Ep |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Main | 3 | 2 | 2 | 1 | 2 | 2 | 2 | 2–3 | 2 | 2 | 1 | 1 |
| Steady | 4.5 | 4 | 4 | 5 | 6 | 7 | 7 | 7.5–8.5 | 7.5 | 8 | 7 | 7.5 |
| Thorough (cap) | 6 (10) | 6 | 6 | 9 (12) | 10 | 12 (13) | 12 | **13** | 12 | 13 | 12 | 13 |

- **At the cap:** for the thorough player 1 reward pays 10 kashes, and nothing is wasted. Before the build, 14
  rewards reached him at the cap.
- **The gap from the card's Option A:**
  - Mila, Pippa and Arthur stayed leaves, so the thorough player holds 13 from chapter 8 to 13 and in the epilogue.
    The card's A had him at 11–12.
  - The steady player holds about one leaf more: 7–8.5, against 6–7.5.
  - **To match the card exactly,** convert those three to kashes:
    - three small edits (Mila 15 + 10, Arthur 10, Pippa 10);
    - new lines for `w4l_mila_gift`, `w4b_ar_lampgift` and `w7m_pi_done2`.
    - The user picks.

### Results (Automated runtime only: SwiftShader, headless Chromium; nobody played)

- **`tests/clover-rules.mjs`** (new; one run): **14/14 PASS**. It covers:
  - the cap: 9 with no box and 13 with four;
  - a reward at the cap: 10 kashes, with its toast;
  - an owed leaf settled at the cap;
  - a leaf on the ground: left at the cap, taken once there is room;
  - Pippa's stall: greyed at 9 with its reason, selling at 8;
  - Bazoo's: greyed at 9 and at 12;
  - Mila, Arthur and Pippa, with a box found and 10, 9 and 12 leaves held: a leaf each. At the cap: their kashes;
  - the quay light: 15 kashes;
  - the stump, the asylum desk and the Bù chest.
- **Hebrew:** `node tools/he-bundle.mjs`, then `node tests/dialogue-check.mjs`: PASS (6261 of 6261 keys).
- **The suites whose checks name a changed reward's leaf** (each run once; checks updated to the new rewards):

  | Suite | Result | What it covers here |
  |---|---|---|
  | asylum | PASS | the register: 10 kashes, no clover |
  | lba1rooms (`GAME_URL` on a local static server, since it has no `SERVE` support) | 8/8 PASS | the register |
  | island-people | PASS | the bell 10 kashes; the quay light 15 kashes |
  | arsenal | 34/34 PASS | the coal chute: 22 kashes |
  | jetpack | the test-step tin PASS (20 kashes) | 1 FAIL, not clover: the lit pack's draw calls +8 against a budget of +6 |
  | sewers-ways | the cave cache PASS (10 kashes) | 2 FAIL, not clover: Old Fenn's tavern line; Luc's pointer to Raph's guitar |
  | equip2 | the old tin PASS (10 kashes); Bram's clover PASS | 1 FAIL, not clover: the pocket-set dial's prompt by the coat |
  | equip2b | **not reached** | its first check failed (the cloud canal not built on Zeelich: `npcSpots.esmer1` missing), and the suite stopped before the crate, Ilka's tin and the frozen chest. Those three are Source only |
  | depth-wave3, part 8 | 13/13 PASS | the far quay: 15 kashes; the gate crew's chest: a leaf |
  | wave4, part B | 9/9 PASS | Mila: a leaf and 15 kashes |
  | wave7, parts A and E | 30/30 PASS | Pippa: a leaf, in chapter 8 and in the ending |

- **arsenal's first run** stopped on a page error the clover work did not cause. A mite lured by the Nitro-Meca-Penguin
  asked `hero.sneak()`, which the penguin's stand-in lacked; BEHAVIOUR-MODES added the call. **Fixed:** the stand-in
  (`gadgets.js`) now answers `sneak: () => 1`. Every enemy calls only `damage`, `sneak` and `visibility` on the hero,
  and the stand-in has all three. The second run passed.
- **depth-wave3's first run** read the far quay's kashes after the coin had already flown to him. The test now
  measures them before the search. Part 8 was then run alone.
- **Not run:**
  - `containers` and `wave6-mine`: their changed check is a label only, or the leaf is below the cap there.
  - `townlife`, `sewers` and `shops`: kept sources, unchanged checks.
  - `keys-clover`: the cap and box logic it checks are unchanged, and `clover-rules` covers the rule.

### סיכום בעברית

- **אפשרות A נבנתה** (בחירת המשתמש, 25.11). התקרה נשארת 13, ועלה תלתן נשאר בכל קופסה.
- **כלל אחד לכל המשחק** (`actors.js`):
  - פרס שהיה נותן עלה כשהגיבור בתקרה נותן במקומו 10 קאשים, עם הודעה.
  - עלה שמונח על הקרקע כשהגיבור בתקרה נשאר על הקרקע.
  - החנויות של פיפה ושל מר בזו מוכרות עלה רק כשיש לגיבור פחות מתשעה.
- **12 פרסים הפכו לקאשים:**
  - הגדם, ספר הרישום בבית המשוגעים, המחבוא במערה של טרלו, הפחית הישנה של טווינסן;
  - הארגז מתעלת העננים, הפחית של אילקה, מגלשת הפחם, הפעמון בפלטפורמה;
  - הארונית ברציף הרחוק, התיבה הקפואה, המגדלור בקנרטס, הפחית על מדרגת הניסוי.
- **שני המיכלים המעורבים** (השולחן בבית המשוגעים והתיבה במבוך של בו) כבר לא נותנים עלה. לכן הם מתמלאים מחדש כמו מיכלים אחרים.
- **מילה, ארתור ופיפה תוקנו:**
  - הם השוו למספר 9 קבוע. עכשיו הם בודקים את התקרה האמיתית.
  - עם קופסה אחת לפחות ועם 9–12 עלים, כל אחד מהם נותן עלה.
  - לפי הבקשה הם נשארו עלים. ברשימה של אפשרות A בכרטיס הם הופכים לקאשים, ולכן כאן השחקן היסודי מגיע ל־13 מפרק 8.
  - כדי להתאים לכרטיס, אפשר להפוך גם אותם לקאשים. ההחלטה של המשתמש.
- **שורות:** כל שורה שהזכירה עלה שהפך לקאשים שונתה, באנגלית ובעברית.
- **שמירות:** פורמט השמירה לא השתנה (6).
- **תוצאות (ריצה אוטומטית בלבד; אף אדם לא שיחק):**
  - חבילת הבדיקות החדשה עברה 14 מתוך 14.
  - בדיקת הדיאלוג עברה.
  - חבילות הבדיקה של הפרסים שהשתנו עברו בבדיקות הקשורות לתלתן. שלושת הפרסים של kit2b (הארגז, הפחית של אילקה והתיבה הקפואה) לא נבדקו בריצה: החבילה שלהם נעצרה בבדיקה הראשונה, מסיבה שאינה קשורה לתלתן.
  - נמצאו כשלים שאינם קשורים לתלתן: מספר קריאות הציור של חבילת הסילון, שתי שורות דיאלוג במסלולי הביוב, ומחוון ערכת הכיס.
- **תוקן בדרך:** פינגווין שמושך אויב גרם לשגיאה בדף, כי לדמות שמחליפה את הגיבור חסרה הפונקציה sneak. התיקון ב־`gadgets.js`.
