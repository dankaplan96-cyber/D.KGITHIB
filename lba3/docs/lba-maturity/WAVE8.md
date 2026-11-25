# WAVE 8 · H-19 Four ways to walk, H-20 The world notices (25.11.2026)

The user approved waves 1–8 of CONTENT-15H.md being built; nothing ships until the user picks from the pictures (P107).
The rows: CONTENT-15H.md §3 H-19, H-20; the cards: H-19 is new (this file is its card), H-20 is DEPTH-PLAN.md X-1 and
EP-1. Evidence label for everything here: **Automated runtime only (SwiftShader, headless Chromium)**. Nobody has played
it; no hardware figure; no listening; no measured playtime (the card's 15 + 8 minutes stay estimates).

CLOVER (option A, the user's pick 25.11; CLOVER-BALANCE.md): **no clover leaf is given anywhere in this wave.** The card's
"a clover" became kashes (the cellar) and a useful thing (the satchel's Meca-Penguin).

## H-19 · Four ways to walk

One visible hint per place, four regions, each opened by one behaviour. The rules are game-wide: the same in every
chapter from its window to the ending's free play; Twinsen's own body only (Zoé's and the disguise's scenes have none
of it). Nothing here opens a gate early, and nothing stands on a story path (each spot is off the ways people walk; the
overlap sweep found nothing, see Tests). The behaviours are the game's own (P125): the mode keys, the "?" and "!" of
noticemark.js, Discreet's sneak() scale, the Athletic jump, the Aggressive kick of the well's lid.

| Behaviour | Where (window) | The hint you see | What opens it | What fails, kindly | Reward |
|---|---|---|---|---|---|
| **Discreet** | Zeelich's street, behind the first house west of the dog yard's lane (chapter 3 on) | a dog asleep across a cellar hatch, a "z z" over it | sneak up in Discreet (it wakes within 3.2 m × sneak(): 3.2 m walking normally, 1.3 m sneaking, 0.8 m standing still); E at the hatch's free leaf: "Lift the hatch" | any other walk wakes it ("!", a bark): it sits up on the hatch and watches ("Big feet wake it. Soft feet might not."); it sleeps again once he has been 6 m off for 4 s | an old tobacco tin: **20 kashes**, and a note (FOR A RAINY DAY. It never rains above the clouds.) |
| **Athletic** | Desert Island, north of the ruins (chapter 4 on) | a satchel and a red rag on a stick on a rock ledge 2.15 m up; a flat rock 1.05 m high a 2 m gap away | a jump onto the flat rock, a step back for a run-up, a jump across the gap; E: "Take the satchel" | a walker steps 0.55 m: the flat rock stops him; Space in Normal is a hop on the spot | a **Meca-Penguin** (five darts if the pockets are full, as Tibbo's gift) |
| **Aggressive** | the Hamalayi, the valley floor below Lhar's terrace (chapter 6 on) | an old arch bricked up in the cliff, the mortar cracked across | Aggressive E: "Kick" (as the well's lid), or any melee blow | in another behaviour E is a look: "It might give to a good kick." | **a shortcut**: old steps up through the rock to a grate on Lhar's terrace (it unbolts from below the first time); both ways from then on. The walk round is about 126 m (the test planner) |
| **Normal** | Citadel, the Weather Wizard's tent on the north plateau (chapter 3 on) | a slate by the tent's door: WEATHER WIZARD. QUIET, PLEASE: LISTENING TO THE WIND. WALK IN. TALK PLAINLY. | talk to Bersimon in Normal (after his own stories: the pearl and the lightning, the trapdoor and the globe) | Athletic: "You came in at a gallop…"; Aggressive: "Fists down in a wizard's tent…"; Discreet: "Creeping in? The wind told me…" | **lore**: the old wizards' saying, four ways to walk, each opens a door the others can't, and where the other three are; "And the fourth way?" "You just used it." |

The journal gets a section "Four ways to walk": the saying, and each place once its hint has been met (or all four once
the saying is heard), ticked when opened.

Changed from the card (and why): the card's examples are kept, one per behaviour. Its "a quiet talk" became Normal (the
plain talk); the sleeping dog Discreet. The first plan put the quiet talk with Brother Tenpa and the cracked wall on
Citadel; Citadel's shelves are joined by ramps every few metres (the planner found no stretch where steps would save
more than ~25 m), while the Hamalayi's valley and Lhar's terrace are 9 m apart across one cliff and 126 m apart on
foot: the shortcut went there, and the quiet talk to Citadel's Weather Wizard, whose tent already invites it.

## H-20 · The world notices

**News sheets.** Every optional deed done is noticed once, in the order it was done (25 deeds: the isles' three
favours, Jaspa's gems, the waystone, the glacier pack, the stone figures' cache, the west end's heat, the project store,
Pim's kite, the sky-ferry, Old Brix's place, Tali's court, the postcard, the Lift Below and the Blow, the quiet channel,
Arthur's boat, the letters, Raph, the monks' cistern, Ilka's readings, Pippa's cart, Lumi's sail, the Great Waker).
Each has a headline in our own words (LBA2's changing newspapers as an idea only). A headline exists only for a deed
done: nothing is hinted before.
- Citadel's two street notice boards and every isle's shuttle departures board say their own notice as before, then
  "Pinned beside it, the latest news sheet:": the newest headline, and one older one (a different one each read).
- Otringal's first market stall (already unattended: BACK AFTER THE NEXT SHUTTLE) has a stack of news sheets under a
  stone on its counter (THE CLOUD CRIER. TAKE ONE.): its slate, then the front page. No new stand.

**The thanks round** (the ending's free play, after the dinner). Each person helped says thank you once, the first time
he talks to them, before their ending line: Pippa (an apple: life back), Lumi, Arthur, Odile, Ilka, Yorna, Pim, Quill,
Bzzra (royal honey: life back), Father Umber, Captain Ossel (Oshra's tea: magic back), Foreman Mott, Tali, Raph,
Brother Tenpa, Old Jaspa, Old Brix. A chapter's own pending talk comes first (TALK-ORDER).

**Open favours.** The journal's new section lists every optional story started and
not finished, one plain line each ("Kesh: Lumi's shade is torn."); in the ending it adds "People who would like a
word: …" with the names still to thank.

## Flags (new only; save format 6 unchanged)

`w8d_woke, w8d_done; w8a_seen, w8a_done; w8c_seen, w8c_open, w8c_up; w8q_slate, w8q_nudge (n), w8q_done; w8n_seen
('id,id,…', the news order); w8t_<npc>` (thanked). An old save has none; the news order is read from the deeds' own
flags at the first tick (deeds done before this build are noticed in the table's order). A dog awake, a hatch lifting,
a climb under way are not saved: a load stands each where its flags put it. Nothing on the main path reads any of it.

## Files

- `src/game/story/wave8.js` (new): both rows (the four secrets, the dog's waking, the climb, the quiet talk, the news
  and its board/stall hook, the thanks round, the journal's two sections).
- `src/game/wave8world.js` (new): the pieces — the hatch and its dog (dogs.js's rig), the arch and grate, the ledge and
  flat rock with the satchel, the tent's slate, the news sheets on the stall. Our geometry and canvas textures.
- `src/game/text/wave8.js`, `src/game/text/he/wave8.js` (new), `src/game/he-text.js` (bundled).
- `src/game/story/index.js`: wired in (import, construct, decorate, region builds, interactables, interact — before
  the boards' own handlers, which it calls —, talk after depth.js, the kick, update, flags, journal).
- `tests/wave8.mjs` (new, the one suite); `tools/wave8-sheet.py` (the contact sheet).
- docs: this file; CONTENT-15H.md (H-19, H-20 Built).

Not touched: physics.js, textures.js, keysclover.js, the clover rule (actors.js), stands.js, isleslife.js, epilogue.js,
any earlier wave's quest logic (their flags are only read).

## Visible changes (P107: the user picks)

1. Zeelich's street: a cellar hatch at the back wall of the first house west of the dog yard's lane, a brown Zeelich
   dog asleep on it.
2. Desert Island, north of the ruins: a flat rock (1.05 m) and a rock ledge (2.15 m) with a satchel and a red rag.
3. The Hamalayi, the valley floor below Lhar's terrace: a bricked-up arch in the cliff (kicked: a heap of bricks, old
   steps); a rusty grate on Lhar's terrace above it.
4. Citadel's north plateau: a slate beside the Weather Wizard's tent's name board.
5. Otringal's market: a stack of news sheets under a stone at one end of a stall's counter.

## Tests (Automated runtime only, SwiftShader)

| Run | Command | Result | Notes |
|---|---|---|---|
| 1 (the whole suite) | `BOOT_TIMEOUT=1200000 SERVE=1 SHOTS=captures/wave8 node tests/wave8.mjs` | **27 of 31 PASS**, no page/console error, no missing file | the 4 FAILs were the suite's own: A stepped back for a run-up off the flat rock (he lands near its rim, so the rock's width is the run-up: the step back removed), and the satchel check after it; Q switched to Athletic before walking to Bersimon, and the harness's walk puts him back in Normal (the key is now pressed where he stands). Both fixed in the suite, nothing in the game; then: |
| 2 | `ONLY=AQ …` | **10/10 PASS**, VERDICT PASS | the two jumps by input, the satchel; the gallop word in Athletic, the saying in Normal |
| 3 | `ONLY=E …` | **4/4 PASS**, VERDICT PASS | E with the journal's picture moved to chapter 14 (the ending's section list names chapters 15–16) and one check added for the open favours before the ending |
| text | `node tools/he-bundle.mjs && node tests/dialogue-check.mjs` | **PASS**, Hebrew 100 % (6539/6539) | after the last text change |

What the suite covers (all **Automated runtime only, SwiftShader**), from base-13-cit (chapter 14, format 5, loaded
through Continue): L — the old save loads as format 6, no w8 state made up; D — walked at the hatch in Normal (input):
the dog wakes at 3.18 m with its "!", the woke line, the hatch only looked at; walked off: asleep again after 2.4 s;
Discreet (F4), sneaked the same way: it sleeps on, the hatch lifts, 20 kashes once, the note; again: empty; Save & quit
→ Continue: kept; A — the ledge looked at from below; Normal: walked into the flat rock 3 s and Space (a hop): still on
the sand; Athletic (F2): a running jump onto the flat rock, a jump over the gap onto the ledge (input, Space); the
satchel: a Meca-Penguin once, no second prompt; C — the test planner walks from the arch's foot to the grate on Lhar's
terrace the long way (126 m; the steps open nothing that was shut); the arch in Normal: a look; Aggressive (F3): the
prompt is "Kick", E kicks it in; the steps up, the grate unbolted; the grate back down; Save & quit → Continue: open,
both ways; Q — the slate read; in the tent Bersimon's own stories first (the pearl, the globe); Athletic: the gallop
word; Normal: the saying (the three places and "You just used it."); again: his own line; the journal's four lines;
N — the square's notice board with no deed done: no news sheet; two deeds done in order: the newest first, then the
older; Otringal's shuttle board and its unattended stall: their own lines, then the news; E — chapter 14: the open
favours listed (Lumi's shade, Pippa's cart), no thank-you line; the ending: the open favours (a finished story gone),
"People who would like a word: Pippa."; Pippa's thank-you and an apple (life back) once; again her own line, the
journal no longer names her; O — every piece in each state (the hatch and its dog, the ledge, the arch shut and open,
the grate shut and open, the news sheets, the slate) scanned with the overlap sweep's library: **no finding names a
wave-8 piece**.

Not run: the full test, the chapter suites, tests/overlap-sweep.mjs over whole regions (the suite's O part scans every
new piece with its library instead), door-sweep. Not exercised by input: the hop-pack onto the ledge, a melee blow at
the arch (code: story.meleeHit; the suite used the Aggressive E kick), the thank-yous other than Pippa's, the isles'
other shuttle boards, a death near a secret (none of them hurts; a fall from the ledge is 2.15 m).

## Questions for the user

1. Keep the five visible pieces above?
2. The quiet talk is with Bersimon (Citadel) and the steps are in the Hamalayi (the first plan had them the other way
   round; see "Changed from the card"). Fine?
3. The cellar pays 20 kashes and the satchel a Meca-Penguin. Enough, or more/less?
4. The dog wakes at 3.2 m for a walker and 1.3 m for a sneak. Too strict, or too easy?
5. The news sheets show the newest deed and one older one. Would you rather see three, or only the newest?
6. The thanks round is said in person, once each, in the ending. Should the dinner scene also mention it (one line)?

## Pictures (P107: the user picks)

`captures/wave8/sheet.png` (tools/wave8-sheet.py) and the single frames in `captures/wave8/`: the play camera,
960×540; before = the same frame with this wave's pieces hidden. 01 the dog on the hatch (before/after) · 02 the dog
awake · 03 the flat rock and the ledge (before/after) · 04 on the ledge · 05 the bricked arch (before/after) · 06 the
arch kicked in · 07 the grate on Lhar's terrace · 08 the tent's slate (before/after) · 09 the square's board: a headline
· 10 Otringal's stall (before/after) · 11 the journal's "Open favours" (chapter 14). Nothing from chapters 15–16 is
shown (the HUD's goal is chapter 14's).

## Known gaps (concrete)

- The news sheets on the stall and the slate's lettering are small at the play camera (pictures 08, 10); the lines
  carry them.
- The arch faces a frozen stream on the valley floor; the suite walked to it, but a person should look at the approach.
- The dog's poses (asleep, sitting up) are the rig's parts turned by hand, not new animation; it barks with the rig's
  jaw.
- The steps are a fade between the two ends (as the isles' honey hoist), not a walked stair.
- The quiet talk waits behind Bersimon's own stories; a player who never finishes them (the pearl's errand) never hears
  the saying from him. The other three secrets do not need the saying.
- Deeds done before this build are put in the news order of the table, not of when they were done.
- The thank-yous are once per person in the ending; a person absent from the ending's world (by their chapter's
  placement) is simply not met. Only Pippa's was played by the suite.
- "Open favours" is a section of its own; where it shows in the section list follows inventory.js's ordering (not
  changed).
- Minutes: unmeasured (the card's 15 + 8 are estimates).

## Hebrew summary (סיכום בעברית)

נבנה גל 8. H-19, "ארבע דרכים ללכת": ארבעה סודות בארבעה אזורים, כל אחד נפתח בהתנהגות אחרת ויש לו רמז שרואים. דיסקרטי
(רחוב זיליך, מאחורי הבית ליד חצר הכלבים): כלב ישן על פתח של מרתף; מי שהולך רגיל מעיר אותו (סימן "!" ונביחה), ומי
שמתגנב עובר בשקט ומרים את הפתח: קופסת טבק עם 20 קאש ופתק. אתלטי (אי המדבר, צפונית לחורבות): תיק ודגלון אדום על מדף
סלע בגובה 2.15 מ', וסלע שטוח בגובה 1.05 מ' במרחק 2 מ'; רק קפיצה עולה על הסלע ורק קפיצה ממנו חוצה את הפער; בתיק פינגווין־
מכני (או חמישה חצים אם הכיסים מלאים). אגרסיבי (ההמלאיה, בעמק מתחת למרפסת של להאר): קשת ישנה סגורה בלבנים סדוקות; בעיטה
פותחת מדרגות בתוך הסלע אל סבכה במרפסת של להאר: קיצור דרך לשני הכיוונים (במקום הליכה של כ־126 מ'). רגיל (סיטדל, האוהל
של קוסם מזג האוויר): לוח ליד הדלת "שקט, בבקשה. להיכנס בהליכה. לדבר בפשטות"; ברסימון מדבר בשקט רק עם מי שבא בהתנהגות
רגילה, ואז מספר את האמרה של הקוסמים הזקנים על ארבע הדרכים ואיפה שלושת הסודות האחרים ("והדרך הרביעית?" "הרגע השתמשת
בה."). אין עלה תלתן בשום מקום. H-20, "העולם שם לב": דפי חדשות עם כותרות על מעשים שנעשו (25 מעשים, בלי רמז למה שלא נעשה)
על שני לוחות המודעות בסיטדל, על לוחות המעבורות באיים ועל דוכן בלי מוכר באוטרינגל ("כרוז העננים"); סבב תודות בסוף המשחק:
17 אנשים אומרים תודה פעם אחת, חלקם עם מתנה קטנה (חיים או קסם); וביומן נוסף פרק "טובות פתוחות" עם כל סיפור צדדי שהתחיל
ולא נגמר, ובסוף המשחק גם מי עוד רוצה לומר מילה. דגלים חדשים בלבד (w8), שמירות ישנות נטענות. הכול ריצה אוטומטית בלבד
(SwiftShader). התמונות ב־captures/wave8 ממתינות לבחירת המשתמש.

## The user's picks (25.11)
Keep and publish, everything as built: the dog wakes at 3.2 m walking and 1.3 m sneaking; the news shows the newest headline plus one older.
