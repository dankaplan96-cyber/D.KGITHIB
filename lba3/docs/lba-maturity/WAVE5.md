# WAVE 5 · H-12 Nell's bench and Baldino's tins, H-13 the cistern and the seam, H-14 Ilka's breathing ground (25.11.2026)

The user approved waves 1–8 of CONTENT-15H.md being built; nothing ships until the user picks from the pictures (P107).
The rows: CONTENT-15H.md §3 H-12, H-13, H-14; the cards: DEPTH-PLAN.md CIT-1, R-1, R-2, R-3, DES-3. Evidence label for
everything here: **Automated runtime only (SwiftShader, headless Chromium)**. Nobody has played it; no hardware figure;
no listening; no measured playtime (the card's minutes, 16 + 12 + 10, stay estimates).

CLOVER (CLOVER-BALANCE.md, being changed by another worker): **no clover leaf is given anywhere in this wave**. The cards'
clover (R-2's store) became kashes and a lasting use (the tea). Every reward is kashes or a useful thing.

## How it plays

### H-12 · Nell's bench (Citadel lane; from the end of The Mislabelled Shipment, chapter 2 on) and Baldino's tins

| Step | Where | What happens | Clue |
|---|---|---|---|
| Hook | Nell at her stall | After her own line: "Bring me the right part and I'll tune any of your gadgets. I charge, but I charge fair. What each one needs is chalked on my bench." | Nell |
| List | a small chalk slate on legs at her bench's end | One line per tool he owns: PUMP LANCE — an Esmer pressure bulb, Pello on the Orchard, 15 K; HEAT FLASK — a copper sleeve, ask Tashi in Lhar, 20 K; HOP-PACK — Baldino's three prototype tins, ask him where, 25 K. The list grows with the tools (no spoiler of a tool he hasn't got). | the slate |
| Bulb | Pello the press-master (Orchard) | Asked (once the list or Nell's word is known, with the lance): "The bulb on the shelf in my nectar house? Take it. It never fitted." | Pello |
| Sleeve | Tashi (Lhar; the monastery yard in later chapters) | Asked nicely (with the flask): "Here, the offcut from the flask itself. Tell Nell she owes me a cup." | Tashi |
| Tins | Baldino (his workshop, once he has given the pack) | "My first prototype went up nicely and came down wherever it liked. Three tins of its parts are still up on rocks all over Twinsun. One on Citadel under the Whispering Cliffs, one by the School of Magic, one under Lhar's frozen falls. Lilac paint." | Baldino |
| Stacks | three rock stacks, 2.35 m high (a jump reaches ~1.2–1.4 m) | From below (E): "A lilac tin… one storey up: a job for the hop-pack." Athletic, jump and hold: the pack lands him on top; the tin (E): parts and 8 kashes. Each stack stands free: from its top neither a jump nor the pack reaches anything new (see the rule below). The tins can be taken before Baldino's word. | the tins' lilac (Baldino's colour, as on his pack) |
| Tune-ups | Nell (TALK) | "What are we tuning?" — a menu of what she can do now (the tool owned, its part in hand). Too few kashes: "That's more kashes than you have. I charge fair, not free." Paid: the pump lance 8 → **12 jets a tank** (15), the heat flask holds heat 90 → **150 s** (20), the hop-pack's thrust 2.2 → **3.0 s** (25; its lift cap, 2.4 m, and every other rule unchanged: "It still won't lift you higher than a storey. Nothing will."). | Nell |

The tuned numbers are written onto the tools' own tables (tools.js `LANCE.tank`, `FLASK.keep`; jetpack.js `JET.fuel`) from
the flags at every load (story/wave5.js `applyTunes`), and the tools' descriptions read the tuned text (both languages).
No change to tools.js or jetpack.js.

**The stacks' rule (the card's risk: the tuned pack must not clear any gate).** A stack is placed by a search (like
Baldino's test step, arsenal.js `stepSpot`): its ground level within 0.6 m for 2.4 m round, nothing in the way within
2.4 m, and within 6 m no standable thing (a roof, a wall's top, a crate) more than 0.6 m above its foot and no rise of the
ground more than 1.8 m above it. So its top (2.35 m) brings nothing in reach that the pack could not reach from the
ground already. The pack's cap is a height above the take-off ground, so the longer thrust adds only hover time (a longer
hop over ground a walker crosses anyway): fences, ceilings, the sea, cliffs and chasms hold as before. Citadel's stack
could not stand on the Whispering Cliffs' plateau as the card wanted: the plateau's standing stones (3.5 m, standable)
are within 6 m of every spot on it; it stands below the cliffs instead (question 2).

### H-13 · The monastery cistern (the yard; chapter 7, The Observatory, on)

| Step | Where | What happens |
|---|---|---|
| Hook | Brother Tenpa in the hall (after his waystone's word, HAM-1, if that is due) | "The old cistern door in the yard opens when its basin is full. The spring under it froze years ago. … The monks' seed store is under there, if the mice left any." |
| Look | the yard's east wall, between the brazier and the gate | A stone head with a low stone door; an iron arm holds a stone basin on its chain. E: empty; its weight should lift the door; "There is a bucket by the trough. The lance would be quicker." Before chapter 7: ice in the bottom, nobody has used it for years. |
| Bucket | the monks' trough (its ice broken at the spout) | The bucket by the trough (E), filled at the trough (E), poured into the basin (E): **one step of six**. Trough to basin ~5 m: six trips at most (the card's cap: no padding). |
| Lance | the same | Each jet into the basin: half a step (a miss: nothing). The lance is refilled at the same trough (E). An untuned tank (8) fills four steps; a tuned one (12, H-12) all six. |
| Door | | Full: "The chain runs, and the stone door grinds up." The bucket goes back by the trough. |
| Store | the doorway | The monks' seed store: jars of seed, a tea urn on a warm stone, a bowl of old offering coins: **20 kashes**, once. Then **the tea** (E) fills his magic, every time he passes (a lasting use, not a one-off); when full: "The tea will keep." |
| Lore | Tenpa | "My teacher said the first keepers sat on the vent to keep the seed dry. Drink the tea whenever you pass." Once. |

### H-13 · The old adit's seam (Under Celebration; chapter 4, the shuttles, on)

Fitted to what exists (wave 6 built the Wannies' deep seam under the Platform; the old adit under Celebration is where the
glove is found, arsenal.js): beside the old adit, a second, older timber frame packed with loose stones, in the island's
own rock. No edit to wanniemine.js or liftbelow.js.

| Step | What happens |
|---|---|
| Hint | Old Jaspa (Knartas), once his gems are sorted (ISL-1): "The Wannies used to say a seam whistles behind the loose stones there. Bring me what you find." |
| Find | the pocket set whistles at it (kit2.js `hums`, through depth.js); the frame (E) in the dark: "Too dark behind them"; with the lantern lit: "something glints in the crack behind them" (the glint shows) |
| Break | a bare fist (or the sword): a thud, "A Wannie glove might shift them"; the glove: the stones tumble out, a **rough gem** (found) |
| Sell | Old Jaspa: "Good colour, honest weight. Twenty-five kashes." **25 kashes**, once |

### H-14 · Ilka's breathing ground (Desert Island; chapter 5, Steam and Sand, on)

| Step | What happens |
|---|---|
| Hook | Ilka (after her own line): "The vent breathes. I need it in numbers, or the council will call it a feeling. I put three stakes in: by the oasis, on the dig's rim, and by Hesk's flags. Strike your fork by each one. Or just watch its little flag. Then pin the readings to my board, or bring them to me." |
| Stakes | three numbered survey stakes with a little red tell-tale flag. Before the hook: a look only. A reading: strike the **singing fork** within its reach ("rings low and long: warm ground"), **or** stand by the stake and watch (E): about three seconds, the flag lifts in the warm air (the slower way, no tool; walking off ends it, nothing lost). |
| Hand-in | Ilka ("Three for three. It breathes, and it breathes on a schedule." Her map.) or, when she is away, pinned to her survey board at her camp (her map hangs under it). |
| Reward | **Ilka's warm-ground map on the holomap**: the planet inset rings (violet, dashed) each place where a singing crystal is still to be found, "◌ still hums"; a ring goes when that place's crystals are all found. And, if done before chapter 9's vote, Dallan's proof scene adds "three stakes' worth of warm ground, read by hand across the island", and Councillor Brum says his vote out loud ("I vote yes, and you may all write that down"); the vote itself is unchanged (story/council.js reads `w5b_done`, both of its branches). |

## Flags (new only; save format 6 unchanged)

`w5n_ask, w5n_list, w5n_bulb, w5n_sleeve, w5n_lance, w5n_flask, w5n_pack; w5t_ask, w5t_1, w5t_2, w5t_3;
w5c_ask, w5c_seen, w5c_fill (0..12 half-steps), w5c_bucket ('empty'|'full'), w5c_open, w5c_store, w5c_lore;
w5s_hint, w5s_broke, w5s_gem, w5s_sold; w5b_ask, w5b_1, w5b_2, w5b_3 ('fork'|'flag'), w5b_done ('ilka'|'board'), w5b_thx`.
An old save has none (base-13-desert and base-12-plans, format 5, load with none made up; the tools' numbers as before).
applyFlags keeps them consistent (a later step implies the earlier ones; a bad value is dropped). A door rising or a flag
being watched is not saved: a load stands each where its flags put it. Nothing on the main path needs any of it.

## Files

- `src/game/story/wave5.js` (new): the three quests (talk, interactions, the tune-ups and the tools' numbers, the stacks'
  search, the basin, the store, the seam, the readings, the holomap's layer `humRegions`, the journal's section
  "Odd Jobs", the inventory's items).
- `src/game/wave5world.js` (new): the pieces — Nell's chalk slate, the rock stacks with their tins, the cistern (head,
  door, arm, basin and its water, the seed store), the bucket, the trough's broken ice, the seam's frame and stones and
  glint, the stakes and their flags. Our geometry and canvas textures only.
- `src/game/text/wave5.js`, `src/game/text/he/wave5.js` (new), `src/game/he-text.js` (bundled).
- `src/game/story/depth.js` (the wave's only door into the director; I am its only writer): `this.w5`; its hooks
  pass on (decorate/flags, region builds, interactables, interact, talk before and after its own, the fork, the
  pocket set's hums, items, update); and three director hooks that do not ask depth.js — the lance's jet, a melee hit,
  the journal — are wrapped on the director instance in Depth's constructor (its own answer first). **No line in index.js.**
- `src/game/story/council.js`: `breathLines()` and its two uses (the readings' two lines in both verdict branches).
- `src/game/hud.js`: the holomap's planet inset draws the rings (asks `story.depth.w5.humRegions()`).
- `tests/wave5.mjs` (new): the one covering suite.
- docs: this file; CONTENT-15H.md (H-12, H-13, H-14 Built).

## Tests (Automated runtime only, SwiftShader)

RESULTS

## Pictures (P107: the user picks)

PICTURES

## Questions for the user

1. Keep the new pieces in the world (each listed in the pictures): Nell's chalk slate, the three rock stacks with
   Baldino's lilac tins, the cistern head with its basin in the monastery yard (and the bucket, the trough's broken ice),
   the second timber frame by the old adit, Ilka's three survey stakes?
2. Citadel's stack: the card put it on the Whispering Cliffs' plateau; the stones there make that unsafe for the pack's
   rule, so it stands below the cliffs. Keep it there, or move it (e.g. a lower stone on the plateau with the stones
   made unstandable)?
3. The tuned hop-pack: 3.0 s of thrust (the card). It hovers longer at the same height cap. Enough, or too much?
4. The cistern opens in chapter 7 (the card); the seam from chapter 4 (with the old adit's glove), not after chapter 10
   as the card said (the old adit has no crisis rope). Fine?
5. The tea urn as the store's lasting reward (magic refilled whenever he passes) instead of the card's carried jar and
   clover. Fine?

## Known gaps (concrete)

GAPS

## Hebrew summary (סיכום בעברית)

נבנה גל 5. H-12: נל מכווננת מכשירים על השולחן שלה תמורת חלק וקאשים; רשימת גיר בקצה השולחן אומרת מה צריך. נורת לחץ מפלו
במטע הצוף מכוונת את רומח המשאבה ל־12 סילונים (15 קאש); שרוול נחושת מטאשי מכוון את בקבוק החום ל־150 שניות (20 קאש); שלוש
פחיות האב־טיפוס של בלדינו, על שלושה עמודי סלע בגובה קומה בסיטדל, ליד בית הספר לקסם ומתחת למפל של להאר, מכוונות את תרמיל
הקפיצה ל־3 שניות דחף (25 קאש). הגובה המרבי של התרמיל לא השתנה, וכל עמוד עומד לבד כך שמראשו לא מגיעים לשום דבר חדש: שום
שער לא נפתח. H-13: בחצר המנזר, אגן אבן על שרשרת פותח את דלת בור המים כשהוא מלא: דלי מהשוקת הוא שלב אחד מתוך שישה, סילון
רומח חצי שלב. בפנים מחסן הזרעים: 20 קאש, וקומקום תה שממלא את הקסם בכל פעם שעוברים. ליד המנהרה הישנה מתחת לאי החגיגה,
מסגרת עם אבנים רופפות: ערכת הכיס שורקת, הפנס מראה ניצוץ, כפפת הוואני שוברת; אבן חן גולמית שג'אספה קונה ב־25 קאש. H-14:
שלוש יתדות מדידה של אילקה במדבר: מקישים במזלג השר או מסתכלים על הדגלון שמתרומם באוויר החם. המדידות לאילקה או ללוח שלה:
המפה שלה מסמנת בהולומפה איפה עוד מזמזם גביש שר, ובפרק 9 דאלן מוסיף את המספרים וברום מצביע בקול. אין עלה תלתן בשום מקום
בגל הזה. דגלים חדשים בלבד (w5), שמירות ישנות נטענות. התוצאות: ריצה אוטומטית בלבד (SwiftShader). התמונות ב־captures/wave5
ממתינות לבחירת המשתמש.
