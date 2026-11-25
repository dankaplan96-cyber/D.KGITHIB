# WAVE 4 · H-9 Arthur's boat, H-10 the letters filed as cargo, H-11 Raph's guitar (25.11.2026)

The user approved waves 1–8 of CONTENT-15H.md being built; nothing ships until the user picks from the pictures (P107).
The rows: CONTENT-15H.md §3 H-9, H-10, H-11; the cards: DEPTH-PLAN.md CIT-2 (merged with EXPANSION_PLAN.md OP-4's lamp
signals), ISL-2, CIT-3. Evidence label for everything here: **Automated runtime only (SwiftShader, headless Chromium)**.
Nobody has played it; no hardware figure; no listening; no measured playtime.

## What the player does

### H-9 · Arthur's boat against Lulu's (chapters 2–7, and the ending's free play)

| Step | Where | What happens | Clue |
|---|---|---|---|
| Hook | Arthur at home, or Lulu wherever she is | "Lulu's boat beats mine every single time." Both are at the garden pond from then on (Arthur only while Twinsen is outdoors; in the house he is at home, so no scene of the house misses him). His own gift (the pocket set) or the pliers come first if due. | Arthur, Lulu |
| Watch | the garden pond | Talk to Lulu (or Arthur): "Three, two, one... go!" A short scene, the camera over the pond: Lulu's boat runs straight across; Arthur's leans in every gust and turns into the wind. Twinsen says so. | the race itself |
| Look | the pond's rim | Lulu's boat rests on the rim: a lump of lead under the hull, a keel weight. | Lulu's boat |
| Read | the pier's root (two new flag poles) | The pennants stream inland: the wind comes off the sea, from the south; across the pond (east to west) that is from the side. | the flags |
| Fix | Arthur's boat (E at the pond) | A menu: fit a keel weight (a sinker from his box; only once Lulu's is understood, else Twinsen's hint), and the sail: pulled in tight / half out / all the way out. The boom turns on the model. | — |
| Race | Lulu or Arthur (TALK, "Race now") | Played out by the two choices. No keel: it leans and turns into the wind. Tight: round in circles. All out: the sail flaps, it drifts sideways. Keel and half out: Arthur wins by a nose. A loss costs nothing; the settings stay. | Arthur's and Twinsen's lines after each |
| Reward | | Lulu's bet: 10 kashes and her secret; Arthur's and Lulu's lines after. | |
| Ending | the pier's west arm | After the win, in the ending's free play: Arthur on the pier, his boat out on the basin with a lamp on its masthead. It blinks a signal (long/short, one of three, twice); Twinsen says it back (a choice of three, or watch again). Wrong: it blinks all over, Arthur's line, the signal again. Right: it turns and sails in; 10 kashes from Arthur's tin (no leaf: clover option A, the user's pick 25.11). | Arthur: "Mira says a signal has to be said back" |

Not in chapter 8 (the children are packing) or the chapters between 8 and the ending: the quest waits; a race not won
by chapter 7 can still be won in the ending's free play.

### H-10 · The letters filed as cargo (hooked in chapters 4–9; can be finished later)

| Step | Where | What happens |
|---|---|---|
| Hook | Tellem, the workers' hostel (asylum) | He writes home every week; nothing arrives; the project sends the post with its cargo. |
| Clue | the mail sack by the customs booth (new prop) | Tag CARGO, UNDECLARED; the top letter: "To Mila, Knartas." |
| Form | Officer Odile | The sack is filed as cargo; letters are correspondence, a different form. One choice: deliver to Knartas / the project's office / Otringal (or not now). Wrong: her line, again. Right: stamped, "you are the post now": the mail sack (found). If her own crate (The Mislabelled Shipment) is still open she asks which: the crate or the letters. |
| Carry | Knartas, by spaceship and shuttle | Mila: the sack; 25 kashes (her 15 and the leaf's worth, no leaf: clover option A); her letter for Tellem (optional). Tem and Odile: a line after. |
| Optional | back at the hostel | Tellem gets Mila's letter: "the boy has grown a whole head". |

### H-11 · Raph's guitar (chapter 4 on)

| Step | Where | What happens |
|---|---|---|
| Hook | the tavern: Old Fenn, or the postcard itself | Raph kept the lighthouse until the project's beacons; he plays on Otringal now. The postcard pinned behind the bar (new): "Four strings too many. Raph." Twinsen: the case is in Tralu's cave (Luc already says so). |
| Case | Tralu's cave | The guitar case (a look before) can now be taken (found). |
| Find | Otringal | Sim the barkeep: "He plays outside, by our door. Orla won't give him the stage. Lys has it." Raph sits on a crate outside the bar's door with a borrowed Esmer harp and a tip jar. |
| Return | Raph | His case: his guitar on his lap again, 20 kashes from his tip jar, a word with Madam Orla: Knartas's lens at 8 kashes instead of 20 (her own line). |
| Ending | Citadel's lighthouse door | Raph sits by the lighthouse with his guitar: "somebody has to sing to it." |

**Raph and Lys (WAVE6):** Lys keeps the bar's stage (the curtain winch, the show). Raph is outside the bar's door, on
the quay terrace beside it; Sim's line ties the two together (Orla gives the stage to Lys, so Raph plays outside). He is
never inside the bar.

## Flags (new only; save format 6 unchanged)

`w4b_hook, w4b_seen, w4b_keelSeen, w4b_wind, w4b_keel, w4b_sail ('tight'|'half'|'free'), w4b_tries, w4b_won,
w4b_arAfter, w4b_luAfter, w4b_lampHeard, w4b_lamp, w4b_lampTries, w4b_lampSaid`;
`w4l_ask, w4l_heard, w4l_wrong, w4l_sack, w4l_given, w4l_reply, w4l_replyGiven, w4l_telSent, w4l_telAfter,
w4l_milaAfter, w4l_temAfter, w4l_odAfter`; `w4r_fenn, w4r_card, w4r_case, w4r_sim, w4r_met, w4r_found`; the
after-lines said (TASK #65): `w4b_ar8, w4b_ar12, w4l_milaCrisis, w4l_milaHome, w4l_telHome, w4r_crisis` (each only
marks a line as said; nothing else reads them). An old save has none (base-07-dig, format 5, loads with none made up). applyFlags keeps them consistent (a later step
implies the earlier ones). A race or a signal under way is not saved: a load stands the boats at rest.

## Files

- `src/game/story/wave4.js` (new): the three stories (people, placements, interactions, the race and the signals, the
  journal's three sections, the pockets).
- `src/game/wave4world.js` (new): Arthur's and Lulu's model boats (sail on a turning boom, keel weight, masthead lamp),
  the two harbour flag poles, the mail sack, the tavern's postcard, Raph's seats (crate, tip jar, harp or guitar).
- `src/game/text/wave4.js`, `src/game/text/he/wave4.js` (new), `src/game/he-text.js` (bundled).
- `src/game/story/index.js`: the module wired in (cast, a place asked before the chapters for Arthur and Lulu
  (`placeFirst`), Raph's place, decorate, region builds, doors none, talk, interact, update, rooms, flags, journal, items).
- `src/game/townlife.js`: the pond's toy boat is its own group (`W.life.toyBoat`), hidden: Arthur's boat takes its place.
- `src/game/tralucave.js`: Raph's case is its own group with `R.cache.setCase(on)` (its collider follows).
- `src/game/story/sewers.js`: the case's look steps aside once the postcard is read (the take is wave4's).
- `src/game/story/islandpeople.js`: Madam Orla's lens at the lower price with Raph's word, with her own line.
- `src/game/story/answer.js` (TASK #65): chapter 12's signal asks `story.w4.coRadio()` for Arthur's one radio line.
- `tests/wave4.mjs` (new, the one suite; part E added by TASK #65). Docs: this file; CONTENT-15H.md (H-9/10/11 Built).

Not touched: `story/depth.js` (wave 3's), `story/liftbelow.js`, `wanniemine.js`, `gasblow.js`. The harbour does not move.

## Tests (Automated runtime only, SwiftShader)

| Suite | Run | Result | What it covers |
|---|---|---|---|
| `SERVE=1 SHOTS=captures/wave4 node tests/wave4.mjs` | once, all parts (A–D) | **PASS 31/31**, no page/console error, no missing file, every line fitted its box | A old save (base-07-dig, format 5 → 6, no w4 flag made up) + H-9 by input: the hook (Arthur's pocket set came first — TALK-ORDER — then the hook), the kids at the pond, the watched race, a race lost without a keel, the keel refused before Lulu's boat is understood then fitted, tight (circles), the flags walked to and read, all out (drifts), Save & quit → Continue (keel, sail, Arthur's place kept), half out: the win and 10 kashes, the lines after, the journal; B H-10: Tellem, the sack, Odile's form wrong then right, Mila's reward and letter, Tem, Tellem's reply; C H-11: Fenn, the postcard, the case taken in Tralu's cave, Sim, Raph's return (20 kashes), Orla's lens at 8 (ISO: chapter 9's state by flags); D the ending (ISO: chapter key 'home'): Arthur's lamp signals wrong then right, the clover leaf, Raph at the lighthouse |
| `ONLY=BD SERVE=1 SHOTS=captures/wave4 node tests/wave4.mjs` | once, after the last change (Tem's after-line said once; the signals' camera; two picture spots) | **PASS 12/12** (the parts it covers), no error | B and D again on the changed code |
| `SERVE=1 ONLY=citadel,tavern,tralucave,isle_otringal node tests/overlap-sweep.mjs` | once | **PASS**: citadel, tavern, tralucave, isle_otringal 0 open findings (citadel's 19 c / 217 d / 9 e / 2 a / 1 g, Otringal's 4 b / 11 c / 3 d / 1 e are its KNOWN list) | the new pieces visible in a new game: Arthur's boat, the flags, the sack, the postcard, the case |
| scratch scan with the same library (`tests/lib/sweep.js`, not committed) | once | **0 findings** around the pieces shown only in a state: Lulu's boat on the rim (the race on), Raph's Otringal seat (chapter 4), his lighthouse seat (the ending), the sack and flags (the bounds' census: pond 33 parts, harbour 826, lighthouse 215) | what overlap-sweep's new game does not show |
| `node tools/he-bundle.mjs && node tests/dialogue-check.mjs` | after the last text change | **PASS**, Hebrew 100 % (6009/6009) | the text |
| TASK #65: `ONLY=BDE SERVE=1 node tests/wave4.mjs` | once | B **PASS 7/7** (Tem's lamp-house line with his after-line), D 2 of 3 PASS, then the page closed under the run (`Target page … has been closed` at D's walk to Raph's lighthouse seat, unchanged code; the machine was shared with two other agents' browsers) | B and D on the changed code |
| TASK #65: `ONLY=DE SERVE=1 node tests/wave4.mjs` | once (the run above was cut off) | D **PASS 3/3**; E 6 PASS, 4 FAIL — all test-side: Arthur's pocket set came first (TALK-ORDER, as in A), Mila at home by the radio in chapter 8 (not outdoors), Tellem's and Mila's short lines go over their heads (P116 remarks: read off the remark, the flag set when it closes) | D, and the first E |
| TASK #65: `ONLY=E SERVE=1 node tests/wave4.mjs` | once, after the test fixes (no game change between) | **PASS 10/10**, no page/console error, every line fitted its box | E: each new line by TALK at its chapter (8: Arthur both ways, Mila; 9: Raph; ending: Tellem, Mila, Tem), chapter 12's radio by answer.js `signal(2)` (shield stubbed), once each, Save & quit → Continue keeps the said flags |
| TASK #65: `node tools/he-bundle.mjs && node tests/dialogue-check.mjs` | after the last text change | **PASS**, Hebrew 100 % (6546/6546), no warning on a wave-4 key | the text |

During development parts of the suite ran on their own (ONLY=A, then BCD twice) while it was written; the table holds
the final runs. Not run: the full test, combat, door-sweep, the chapter suites (no shared path changed except the
director's placement order for Arthur and Lulu, covered by A).

## Pictures (P107: the user picks)

`captures/wave4/` — the play camera (deviceScaleFactor 1), 960×540, and `captures/wave4/sheet.png` (all 15). Before/after
pairs are the same frame with this wave's pieces hidden (the before is today's game):
01 the garden pond before/after (Arthur's boat in place of the toy boat; Arthur and Lulu across the pond) ·
02 the first race, watched (the close shot over the pond) · 03 the harbour's two new flag poles at the pier's root
before/after · 04 the winning race · 05 the customs booth before/after (the mail sack beside it: small at this camera) ·
06 the tavern before/after (the postcard behind the bar: hardly visible at this camera) · 07 outside Otringal's bar
before/after (Raph on his crate) · 08 Raph with his guitar, close · 09 the ending: Arthur's boat on the basin below the
pier, Arthur among the pier's people · 10 the ending: Raph by the lighthouse (Twinsen stands in front of him).

## Open questions for the user

1. Keep the new visible pieces? Arthur's boat in place of the pond's toy boat (same red hull and white sail, now with a
   turning boom); Lulu's pink boat on the pond's rim while the race is on; two flag poles at the pier's root; the mail
   sack by the customs booth (until released); the postcard behind the tavern's bar; Raph (a new person) outside
   Otringal's bar and, in the ending, by Citadel's lighthouse.
2. **Decided (the user, approved and published):** Raph outside the bar's door, so Lys keeps the stage.
3. **Decided:** no timed gust; the race is decided by the two settings only.
4. **Decided:** one of three signal patterns at random each time (kept).
5. H-10's card had Tellem at home on Knartas in the ending and Tem pointing at the lens seat: given as lines by TASK #65
   (see "Gaps filled"); a visible Tellem on Knartas stays unbuilt (no new world pieces).

## Known gaps (concrete)

- The pond's boats are toy-sized (as the toy boat was): at the play camera they are small; the races play in their own
  close shot. The sack and the postcard are small at the play camera (pictures 05, 06); picture 10 has Twinsen in front of
  Raph. Better stills need a human session or a framed shot.
- Still not built from the cards (after TASK #65): Lulu's "warm stones" pointer (her secret is how to fit a keel, as
  built and approved; the bay rocks are wave 3's story, not given away in a child's bet); Tellem seen on Knartas with
  his family in the ending (a new placement: he says it instead, and Mila does); Mila's reply carried back stays
  optional with no further reward (no new rewards; Tellem's own line is the payoff).
- The guitar case uses the 'parcel' look in the found box (no guitar-case look exists; itemlook.js is a shared registry,
  not touched). The mail sack's inventory icon is the cloth icon.
- Raph's 'sit' pose has the rig's resting head (a slight doze); his hands rest on the instrument, no strumming.
- The boats add about ten draws each on Citadel's garden (their own small batches: the sail and keel move); not measured.
- Minutes: unmeasured. The card estimates (15 + 12 + 10 min first play) are not claimed; the bot knows every answer.

## Gaps filled (TASK #65, 25.11; Automated runtime only)

Each is a line said once, in the person's own voice, at the chapter where it is true; no reward, no clover, no new piece,
nothing to do. Chapters by the game's numbers (index.js NUMBER): 8 The Evacuation, 9 The Council, 12 here means the
card's "chapter 12", the last act under the shell (The Core), where Arthur is on the radio.

| Gap (from "Known gaps") | Closed by | When | Flag |
|---|---|---|---|
| Arthur's chapter-8 line | After Grandpa's tunnels (`c8_gilbert`), his packing line (`c8_ar_after`), then: race won — "And my boat. It's in the bag. I'm not leaving it behind."; hooked, not won — "My boat stays here. Lulu says the race waits till all this is over." (the race does wait: it is open again in the ending). His pocket set or the pliers come first. | ch 8 | `w4b_ar8` |
| Arthur's chapter-12 radio line | After the two knocks heard at home ("that's Dad!") and Zoé's "Signal's going out": "Dad? My boat's here on the radio table. It won, so you will too." Only with the race won and Arthur at home on the radio (`nw_v`); answer.js asks `w4.coRadio()`. | ch 12 (The Core) | `w4b_ar12` |
| Tem showing where the quay light's lens sits | With his after-line, while the light is dark (`!pp_light`): "Dad says he counted the boats home by the lamp house at the quay's end. It's been dark since its lens went." Points at the lens quest's lamp house (islandpeople.js); Quill's lines stay the main clue. | after the sack | `w4l_temAfter` (as before) |
| Tellem with his family on Knartas in the ending | Told, not shown: Tellem at the hostel, "I'm on the next shuttle to Knartas. Mila has already told the whole quay."; Mila on Knartas, "Tellem's coming home on the next shuttle. Tem has counted every shuttle since we heard." | ending | `w4l_telHome`, `w4l_milaHome` |
| (loose state) Mila's crisis lines still waited on "slow post" after the sack was delivered | One line first while Citadel is in its shelters: "The radio talks about nothing but Citadel's shelters. No letter this week, but now I know which desk it's stuck on." Her own residents' lines follow as before. | ch 8–9 | `w4l_milaCrisis` |
| (acknowledgement) Raph and Citadel's lighthouse in the crisis | Once he is met (and his case given, if carried): "The radio says Citadel's hill families are up on my old lighthouse's cliffs. Good rock. It never moved for anybody." Only once it is true: chapter 9, or chapter 8 after Zoé's part (`c8_zoeDone`). | ch 8–9 | `w4r_crisis` |
| (bug) Lulu's 10-kash toast read "from Arthur" | `w4b_toast_kashes` was defined twice in the same English and Hebrew block (the second, Arthur's, won); Arthur's toast is now `w4b_toast_kashesAr`. | ch 2–7 | — |
| (stale) the clover-leaf toasts and this doc's leaves | `w4b_toast_clover`, `w4l_toast_gift` removed (unused since option A); the H-9 and H-10 tables say kashes. | — | — |

Continuity decisions: Tellem's relation to Mila is never stated in a line. The islands' own text makes Rook Tem's father
("Tem's out on the quay with his father") and gives Mila a sister on Twinsun, so Tellem reads as her brother and Tem's
uncle; no new line contradicts either. "Dad" in Tem's line is Rook. Character knowledge: Mila and Raph know Citadel's
crisis from the radio (their existing lines already listen to it); Raph's cliffs line waits until Zoé's plan is carried
out; Arthur's chapter-12 line needs the race won, so it can only recall something the player did.

Not re-run: part A (the hook's guard became `arthurBusy()`, the same condition, exercised by E's first check) and C
(no change on its path).

## Hebrew summary (סיכום בעברית)

**השלמת הפערים (משימה 65):** שורות "אחרי" שנאמרות פעם אחת, בקול של כל דמות, בפרק שבו הן נכונות; בלי פרס, בלי תלתן ובלי
חפץ חדש בעולם. ארתור בפרק 8 (אחרי המנהרות של סבא): הסירה בתיק, או "המרוץ מחכה עד שכל זה ייגמר" אם עוד לא ניצח; ארתור
ברדיו בפרק 12, אחרי שתי הדפיקות: "הסירה שלי כאן על השולחן של הרדיו. היא ניצחה, אז גם אתה תנצח". טם מצביע על בית הפנס
בקצה הרציף (כל עוד הפנס חשוך). מילה בזמן המשבר: יודעת עכשיו באיזה שולחן המכתב תקוע; ראף בפרק 9 (או 8 אחרי שזואי
סיימה): משפחות הגבעות על הצוקים של המגדלור הישן שלו. בסוף המשחק טלם ומילה: טלם חוזר לקנרטס במעבורת הבאה. תוקן באג:
ההודעה על עשרת הקאשים של לולו נכתבה "מארתור" (מפתח כפול). נשאר פתוח: הרמז של לולו על האבנים החמות, טלם נראה בקנרטס,
ופרס על המכתב של מילה – כולם לא נבנו בכוונה. בדיקות: חלק E החדש עבר 10/10, חלקים B ו־D עברו, dialogue-check עבר.
ריצה אוטומטית בלבד.


נבנה גל 4 (H-9, H-10, H-11). הסירה של ארתור: ארתור (או לולו) מספרים שהסירה של לולו תמיד מנצחת; ליד הבריכה בגינה צופים
במרוץ (צילום קרוב מעל הבריכה), מגלים מתחת לסירה של לולו משקולת שדרית, קוראים את הדגלים החדשים בנמל (הרוח מהים, מהצד של
המסלול), ומתקנים את הסירה של ארתור: משקולת, ומפרש מתוח / חצי פתוח / פתוח. המרוץ מתנהל לפי הבחירות: בלי משקולת היא נוטה,
מתוח – מסתובבת במעגלים, פתוח – נסחפת, חצי פתוח – ארתור מנצח; הפסד לא עולה כלום. בסוף המשחק ארתור על המזח, הסירה עם פנס
מהבהבת אות, וטווינסן חוזר עליו (שלוש אפשרויות); נכון – הסירה חוזרת ו־10 קאשים מהקופסה של ארתור (בלי עלה תלתן: אפשרות A). המכתבים: טלם בהוסטל, שק דואר שמתויק כמטען
ליד המכס, טופס של השוטרת אודיל (בחירה אחת: לאן), השק למילה בקנרטס (25 קאשים, בלי עלה תלתן), ומכתב חזרה לטלם (רשות). הגיטרה של
ראף: פן הזקן והגלויה מאחורי הבר בטברנה, הנרתיק במערה של טרלו, ראף (דמות חדשה) יושב על ארגז מחוץ לדלת של בר הנמל
באוטרינגל – ליס נשארת על הבמה – ומקבל את הגיטרה (20 קאשים, ומילה טובה אצל אורלה: העדשה בשמונה); בסוף המשחק הוא מנגן ליד
המגדלור. דגלים חדשים בלבד (w4b_/w4l_/w4r_), שמירות ישנות נטענות, הנמל לא זז. הבדיקה tests/wave4.mjs עברה 31/31 (וחלקים
B ו־D שוב אחרי התיקון האחרון, 12/12), overlap-sweep נקי, dialogue-check עבר. הכול: ריצה אוטומטית בלבד (SwiftShader).
התמונות ב־captures/wave4 ממתינות לבחירת המשתמש.
