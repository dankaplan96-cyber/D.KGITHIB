# H-15 · "The Francos' dig, twelve years on" — the diggers of Knartas and their Great Waker (25.11.2026)

The card: CONTENT-15H.md §3 wave 6, H-15 ("villagers still dig for their relic; the player triangulates from three
diggers' partly unreliable tips and uses the pocket set as a detector; finds it"). The user (25.11, answer to question
6): the relic may be **our own invention** and should be **funny, in LBA's humour** (an ordinary object they revere);
invent no LBA2 lore and do not claim it is from LBA2; short and clear, with a visible payoff. Reward: kashes, not a
clover leaf (CLOVER-BALANCE). Evidence label for everything here: **Automated runtime only (SwiftShader, headless
Chromium)**. Nobody has played it; no hardware figure; no listening (the alarm's sound is synthesised and unheard).

## The relic

**The Great Waker**: in the diggers' songs a thing the size of a house that woke the Founder's first shift. Dug up, it
is a **tin alarm clock with two bells**, its hands at six (the village hall's own notice: SHIFT CHANGE AT SIX). It is
still ticking: the back says SELF-WINDING, and twelve years of the diggers' own digging shook it wound. Our invention;
no player line names the Francos (Knartas's people are drawn as Esmers in this game), nothing is said to be LBA2's.

## How it plays (chapter 4 — the shuttles run — to the ending; optional)

On Knartas, on the grassy slope between the harbour and the diggers' village: a gully runs up to the **gold dome**
(the dig foreman's house). The slope is pitted with the diggers' holes.

| Step | Where | What the player does | Clues |
|---|---|---|---|
| 1 Hook | the rock over the slope | **Foreman Mott**: twelve years digging for the Great Waker; every digger knows a piece of the rhyme, nobody agrees which. A **spare spade** (found box, in the pockets). | Mott |
| 2 Tip 1 | the ledge at the gold dome's wall (up the grass ramp west of the gully) | **Old Gubb** kneels at his holes against the wall: "Below the gold dome lies the Waker." He reads *below* as *under the house*; the foreman will not let him dig the floor. Twinsen: "or just downhill from it?" | the holes at the wall |
| 3 Tip 2 | by her holes in the middle of the slope | **Pella**: "Twelve steps from the Founder's Seat, the way the Founder looked." She loses count at seven: her two holes lie on the seat's line, short of the end. | Pella's holes, the seat |
| 3b | the Founder's Seat (a worn stone seat on the slope's east side) | Look: it faces the gully below the gold dome; after Pella: "twelve steps from here, that way". | the seat |
| 4 Tip 3 | the slope's west side | **Tuffo**, ear to the ground: the Waker hums; all he hears is Gubb's spade. Twinsen: Arthur's Pocket Set hears things that hum (without the set: dig where the other tips meet). | — |
| 5 Find | the gully's floor | The two lines meet in the gully below the dome, 6–7 m from the seat. With the **Pocket Set** held out the needle points to it from 12 m (story/kit2.js hums). **E "Dig"** anywhere on the slope: earth, a line ("Stones. Worms. No Waker.", a boot that is probably Gubb's) and a hole (his own, up to five; not saved). At the spot: a dented tin box, THE GREAT WAKER, DO NOT OPEN UNTIL FOUND; the found box shows the clock; "It's... an alarm clock. And it's still ticking!"; Tuffo: "He FOUND it!" A short cut: the four stand round the hole. | needle, tips |
| 6 Payoff | at the hole | **Mott** (the others send him there): "smaller than in the songs"; Gubb: "the size of a house"; Twinsen reads SELF-WINDING; Mott: give it a turn — it **rings**, the four jump and cheer; "IT'S SO LOUD!"; Mott: twelve years they changed shifts by Gubb's stomach; **the finder's purse, 25 kashes** (no clover leaf); his spade back; "we'll set it up right where it slept". A short cut: a little **shrine** stands in the gully (a stone pillar, a shingled roof on four posts, two pennants, the clock on top, hands at six); the view goes to it (a camera beat where beats run). | — |
| After | the slope | Gubb has finally sat down on the Founder's Seat; Mott, Pella and Tuffo by the shrine, each with an after line and a second one; the shrine's Look ("its hands point to six"); the seat's Look changes. | — |

Nothing is gated: the tips come in any order, any of them can be skipped, and digging is allowed from the moment the
spade is lent. A wrong dig costs nothing. Talking to a digger while the clock rings waits for the cheer.

## Flags (new only, `fr_`; save format 6 unchanged)

`fr_hook`, `fr_spade`, `fr_gubb`, `fr_pella`, `fr_tuffo`, `fr_seat`, `fr_digs` (his empty holes, a count), `fr_found`,
`fr_given`, `fr_mottAfter`, `fr_gubbAfter`, `fr_pellaAfter`, `fr_tuffoAfter`. Each step implies the ones before it on
load (`applyFlags`). An old save has none: the dig is there as for a new player (base-07-dig, made before H-15, loads
with none made up). A dig or the ringing under way is not saved; his own holes are filled in on a load.

## Files

- `src/game/story/francos.js` (new): the quest (layout in Knartas's metres, the four diggers' places by state, the
  tips, the dig, the find, the hand-over, the journal, the pockets, the hum for the pocket set).
- `src/game/francosworld.js` (new): the pieces (open and filled holes tilted to the slope, two spades, the Founder's
  Seat, the tin box in its hole, the shrine, the Great Waker's model `clockModel`), with low colliders.
- `src/game/text/francos.js`, `src/game/text/he/francos.js` (new), `src/game/he-text.js` (bundled).
- `src/game/story/index.js`: wired (cast, places, decorate, region built, talk, interact, update, flags, journal,
  items). `src/game/story/kit2.js`: one line, the Waker in `hums()`. `src/game/itemlook.js`: the `clock` look (the
  found box, the pockets). `src/engine/audio.js`: `alarmBell` (two small bells, 1.4 s, synthesised).
- `tests/francos.mjs` (new, the one suite).
- `captures/francos/` (pictures and `sheet.png`).

Visible world changes (P107, for the user's pick): on Knartas's slope south of the village — the holes and two spades,
the Founder's Seat, four new people (Foreman Mott, Old Gubb, Pella, Tuffo; existing character models: oku_b, oku,
nara_c, desertkid_b), and after the quest the shrine in the gully. Nothing of the island's own geometry was moved;
Mila (wave 4) and the harbour's people are untouched (they are on the quay, 25–60 m away).

## Tests (Automated runtime only, SwiftShader)

| Suite | Run | Result | What it covers |
|---|---|---|---|
| `SERVE=1 SHOTS=captures/francos node tests/francos.mjs` | once on the final code (25.11, after three earlier runs while building: a placement-before-build fix and the cheer split) | **19/19 PASS**, no page errors, no missing files | old save (base-07-dig, format 5) loads with no `fr_` state; entry to Knartas (ISO travel move); Mott, spade, a wrong dig; the three tips and the seat (INPUT walking and talking; Gubb up the ramp); **death** → Game Over → **Retry** (state kept, his hole gone); the Pocket Set's needle (6.1 m), followed and dug (E); the found box (clock); the gathering; **Save & quit → Continue** before the hand-over; the hand-over (cheer seen on all four, 25 kashes, 0 clover leaves, items gone, shrine, journal done); Gubb on the seat; **return** (Otringal and back, ISO); after lines; Save & quit → Continue after |
| `SERVE=1 ONLY=isle_knartas node tests/overlap-sweep.mjs` | twice: first 3 open (all heaps of earth: a filled hole's mound, spoil heaps), then with those heaps in their own group (`francos dig earth`) and three KNOWN entries (by design, set into the ground like the rocks) | **PASS** (a 0, b 0, c 0/6 known, d 0/4, e 0/3, f 0, g 0) | the dig's pieces on Knartas; both runs with the shrine shown by a temporary switch (reverted before the commit), so the shrine, the seat and the spades were swept too: no finding on them |
| `node tools/he-bundle.mjs`, `node tests/dialogue-check.mjs` | once | PASS (Hebrew 100 %; one warning: `fr_dig_box` four short sentences) | text |

No other suite was run (the user's rule: one suite per change). The alarm's sound was not checked (headless audio).

## Pictures (play camera; before/after: the same frame with this quest's pieces hidden)

`captures/francos/` (from the final run; `sheet.png` built by `python3 tools/francos-sheet.py`):
- `francos-01-dig-before/after`: the slope below the gold dome without and with the dig (holes, Mott on the rock, Gubb
  kneeling at the wall, Pella at her holes, Tuffo).
- `francos-02-found-box`: the found box with the Great Waker over the gully.
- `francos-03-found-before/after`: the tin box in its hole, the four round it.
- `francos-04-ring`: the clock rings, the four with their arms up.
- `francos-05-shrine-before/after`: the slope after the quest without and with the shrine. In this frame the shrine is
  small and partly behind Twinsen and the diggers; `francos-06-gubb-seat` shows it clearly (and Gubb on the seat).
Inspected by the worker on the sheet only (automated pictures, SwiftShader); no person has looked at them.

## Questions for the user

1. **Keep the dig on the slope below the gold dome?** (P107: the holes, the seat, the four diggers, the shrine.) The
   alternative is the village's inner lane (smaller, between houses).
2. **The relic as an alarm clock** (the Great Waker, SELF-WINDING, wound by their own digging): keep, or another
   ordinary object?
3. **25 kashes** for the finder's purse: right, or more (the wave-4 rewards are 10–20)?

## Gaps

- **Nobody has played it.** The card's 20 minutes are not measured; the bot reads every line at once and walks straight
  (discovery is not measured by the bot, CONTENT-15H §4). Not in chapter-balance.md's ledger yet.
- **The alarm is unheard**: `alarmBell` is synthesised in audio.js; no listening here.
- **Short cuts, not walks**: the diggers gathering at the hole and the shrine's setting-up come by a short fade (a
  walking person stops to face Twinsen within 3.2 m, NPC.update, so a walk to a place beside him never ends).
- **His own empty holes are not saved** (up to five; a load fills them in; the count `fr_digs` is kept).
- **Gubb's ledge** at the gold dome's wall is reached by a grass ramp west of the gully (the suite walks it by P.talk);
  a player has to see that ramp. If it reads badly, Gubb can kneel at the gully's head instead.
- The four are drawn with existing models (oku_b, oku, nara_c, desertkid_b); Knartas has no Franco race model.
- Same lines in every chapter from 4 on (no evacuation or council variant), and nobody else on Knartas mentions the
  Waker (the canteen's Gorrin, the hall's notice); H-20's boards could carry it.
- The Hebrew is the worker's own; no native reader has checked it.
- OPEN-TASKS.he.md row 55 is left to the coordinator (its table).

## סיכום בעברית

נבנה H-15, "החפירה של הפרנקוס, שתים־עשרה שנה אחרי", בקנרטס (מפרק 4 ועד הסוף, אופציונלי). במדרון שבין הנמל לכפר, בערוץ
שמתחת לכיפת הזהב, ארבעה חופרים חדשים: מנהל העבודה מוט (נותן את רזרבי), גאב הזקן ("מתחת לכיפת הזהב" — חופר צמוד לקיר),
פלה ("שנים־עשר צעדים מכיסא המייסד" — מתבלבלת בשבע) וטאפו (המעורר מזמזם; ערכת הכיס של ארתור שומעת זמזום). שני הרמזים
נפגשים בערוץ, והמחט של ערכת הכיס מובילה לנקודה. חפירה במקום הלא נכון: אדמה ובור. במקום הנכון: קופסת פח — המעורר הגדול
הוא שעון מעורר מפח עם שני פעמונים (המצאה שלנו, לא מ־LBA2), שעדיין מתקתק כי החפירות שלהם מתחו אותו. מוט מכוון אותו, הוא
מצלצל, כולם קופצים ומריעים; ארנק המוצא: 25 קאשים (לא עלה תלתן); מקימים לו מקדש קטן בדיוק איפה שישן, וגאב סוף־סוף יושב
על כיסא המייסד. נבדק אוטומטית בלבד (SwiftShader): החבילה tests/francos.mjs, סריקת החפיפות של קנרטס, he-bundle ו־dialogue-check.
התמונות ב־captures/francos/sheet.png מחכות לבחירה שלך.
