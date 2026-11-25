# WAVE 6 · H-16 "The Lift Below" — the Wannies' deep seam and the Blow (25.11.2026)

The user (24.11, CONTENT-15H.md "The user's answers" item 4): "build the Wannies' mine and the optional gas-monster
boss (catch its fireballs with the glove, throw them back)". The card: CONTENT-15H.md §3 H-16 (EXPANSION_PLAN.md OP-7
"The Lift Below", ALIGNMENT 2.11). Evidence label for everything here: **Automated runtime only (SwiftShader, headless
Chromium)**. Nobody has played it; no hardware figure; no listening.

## What was built

Chapter 4 (the shuttles run) to the end, optional; the main story needs none of it. Places: the Lift Dock, Otringal's
Imperial Hotel and harbour bar, the Platform, and one new place under the Platform: the deep seam (three rooms).

| Step | Where | What the player does | Clues |
|---|---|---|---|
| 1 Hook | the Platform; the Lift Dock | Foreman Krum: four of his miners went down the deep seam in the project's cage and it never came back; Mother Pudd lowers bread down an air shaft to her son Tull; Burr: the old incline is boarded and wedged from below. The mine mouth is a door now: in at the old incline's head, behind the project's boards (CLOSED · ORE BY LIFT ONLY), the deep shift's voice through them: "get the cage down, the buyer has the key". | Krum, Pudd, Burr, the voice, the stencil |
| 2 The lift | the Lift Dock | The lever is locked (LIFT RESERVED · PROJECT KEY ONLY). Vash the operator: the project's buyer Sorrel has the key; he stopped coming; he sleeps at the Imperial and drinks at the harbour bar on the project's account. | the plate, Vash |
| 3 The hotel | Otringal, the Imperial Hotel | The register (SORREL, project buyer, account at the Kingo); Clerk Edda; **Old Haskel** the explorer (new, beside his armchair in the lounge): the cage's motor coughs in the gas, brake on the cough. | register, Edda, Haskel |
| 4 The key | the harbour bar | Madam Orla holds Sorrel's key against his 40-kash tab. **Pay it** at her counter, **or** throw the ball at the stage's jammed curtain winch high on its frame: the curtains open, **Lys** (new, the singer) sings, the full room pays the tab. Either way: the key and Sorrel's bill. | Orla, Lys |
| 5 The ride | the Lift Dock's tower | The key in the lever: the cage goes down the tower into the gas (the camera beside it). On the last stretch the motor coughs: **E brakes**; too late and the safety catch stops it and Vash winds it back up (try again, no harm). Braked: down to the deep landing. | Vash, Haskel, the toast "The motor coughs! E: brake" |
| 6 The deep shift | wm_landing | **Gant** the ganger keeps the project's rule out of fear (the plate: ore only, a Wannie in the cage and the week is docked; their own incline wedged). A choice: show him Sorrel's bill, or not now. Shown: "Forty kashes. While Marl rationed the lamp oil": he decides, and gives his **Wannie glove** (the reward). **Marl** the lamp fitter: the oil jar; and the Blow (only its own fire hurts it). **Tull**: his mother's notes. | Gant, Marl, Tull |
| 7 Light | wm_gallery | The gallery is dark past the camp: the oil jar, then three lamp posts lit; the seam's gems glitter; the last lamp shows the boards and the two wedges. In the dark the boards say "too dark to see what holds them". | the lamps |
| 8 The boards | wm_gallery | The glove knocks out both wedges (a bare fist: "too solid, a Wannie glove would shift it"); the boards slide into the sump. Up the 3 m incline and out of the old mouth onto the Platform. | Gant |
| 9 Consequence | the Platform, the Lift Dock, the bar | The shift is home: Tull at his mother's ("fed me again"), Mother Pudd ("three loaves"), Gant at the mouth beside Krum ("our mouth, our gems; the project's crates can wait"), Marl relighting the seam below; Burr's own way down again; Vash's lift runs for anyone; the bar's curtains stay open and Lys sings to a full room (the winch way). The mouth stays a door both ways: the shortcut. | — |
| Optional · the Blow | wm_blow | The gas pocket the project's drill opened. Without a glove it sleeps ("not without a Wannie glove"). With one it wakes: it swells, its mouth glows orange then white with a rising hiss (1.4 / 1.2 / 1.0 s), and spits a slow fireball (6 / 6.8 / 7.5 m/s; 1, 2, then 3 a volley). A glove punch as a fireball comes in **catches** it; the next glove punch **throws it back** (aimed at the Blow within ±60°). Three hits. A fireball that lands burns 2 life (of 10+); no contact damage, no instant death; the ball and blades go through its gas (a hint). A death: Game Over → Retry at the room's door, full life, the Blow whole. Beaten: the vents calm, the gas thins, the seam turns blue; the deep shift's strongbox: 40 kashes and a clover leaf (kashes instead at nine leaves). | Marl, the striped board THE BLOW · NO LAMPS, the toasts |

A player who already has the glove (the old adit under Celebration, story/arsenal.js) keeps it: Gant says so ("you know
what to do with it") and the shift's whip-round pays 30 kashes when he talks to Gant at home. The adit's find is
unchanged (R-3's rule).

## Flags (new only, `zo_`; save format 6 unchanged)

`zo_heard`, `zo_krum`, `zo_pudd`, `zo_puddDone`, `zo_burr`, `zo_burr2`, `zo_reserved`, `zo_register`, `zo_tab`,
`zo_winch`, `zo_key` ('paid'|'winch'), `zo_miss` (brake misses), `zo_down`, `zo_gant` (1 told, 2 decided),
`zo_glove` ('given'|'own'), `zo_paid`, `zo_oil`, `zo_lamps` (bits 1|2|4), `zo_wedges` (bits 1|2), `zo_open`,
`zo_done`, `zo_orlaAfter`, `zo_blow`, `zo_box`. An old save has none: the quest is there as for a new player
(base-07-dig, format 5, loads with none made up). A ride, the boards' fall or a fight under way is not saved (a save
mid-ride stands him at the lift's front; the Blow starts asleep on every visit).

## Files

- `src/game/wanniemine.js` (new): the three rooms (wm_landing, wm_gallery, wm_blow; regions group `wanniemine`, AT
  12000–12200), the cage, the lamp posts, the bulkhead and wedges, the incline, the vents, the strongbox; the Platform
  mine mouth's door and exit.
- `src/game/gasblow.js` (new): the Blow (model, states, fireballs, catch, throw, hits).
- `src/game/story/liftbelow.js` (new): the quest (people, hooks, the ride, the lamps, the boards, the fight, the journal).
- `src/game/text/liftbelow.js`, `src/game/text/he/liftbelow.js` (new), `src/game/he-text.js` (bundled).
- `src/game/otrbar.js`: the two curtains are their own meshes now (`BAR.setCurtain`).
- `src/game/story/index.js`: the module wired in (cast, places, doors, exits, talk, interact, ball, melee, update,
  rooms, flags, journal, items). `src/game/regions.js`: the group. `src/game/travel.js`: the rooms are on the Platform.
- `tests/wave6-mine.mjs` (new, the one suite); `tests/overlap-sweep.mjs`: `wm_*` added to the islands' batch.
- docs: this file; CONTENT-15H.md (H-16 Built); CRYSTALS-ONE-LOOK.md (row 23: the seam's gems use crystallook.js).

Crystals: the gem veins are `crystalCluster` with `crystalMats` (violet, cyan, vein; the Blow's seam a copy of the warm
tint's shell that turns cyan when it is beaten). Original art only: our geometry, our textures (canvas), no LBA1/LBA2
data; LBA2's Wannies, their mine, the lift between the layers and the glove's catch guided the design only.

## Tests (Automated runtime only, SwiftShader)

| Suite | Run | Result | What it covers |
|---|---|---|---|
| `SERVE=1 SHOTS=captures/wave6 node tests/wave6-mine.mjs` | once, final code | **PASS 34/34**, no page/console error, no missing file | A old save (base-07-dig, format 5 → 6) + Platform hooks + the mouth door; B the hotel, the bar: the WINCH way and the PAY way; C the ride: a miss (catch, wound back) then the brake; D Gant's choice, the glove, oil, three lamps, Save & quit → Continue in the gallery, fist vs glove on the wedges, the fall, out of the mouth, the shift home, back in by the shortcut; E the Blow: a death → Game Over → Retry (the room's autosave, full life, the Blow whole), the ball through its gas, the fight by input (3 caught, 3 thrown, 3 hits), the strongbox, the ride back up, Vash after |
| `SERVE=1 ONLY=wm_landing,wm_gallery,wm_blow,otrbar node tests/overlap-sweep.mjs` | once, then the two rooms with findings again after the fix | wm_blow, otrbar: **0 findings**. First run: wm_gallery 2 (c) the wedges 9 cm over the floor + 4 (g) rubble through the boards; wm_landing 1 (g) a wall rock through a timber set → fixed; rerun wm_landing, then wm_gallery: **0** | the new rooms and the bar's new curtains |
| `SERVE=1 node tests/combat.mjs` | once | **PASS 84/84** | the glove and the shared combat (untouched code paths still pass) |
| `node tools/he-bundle.mjs && node tests/dialogue-check.mjs` | after the last text change | **PASS**, Hebrew 100 %, no warning on the new keys | the text |

During development parts of the suite ran on their own (ONLY=A, AB, CD, E, CE) while it was written; the table is the
final runs. Not run: the full test, door-sweep, room-cutaway, place-scan (the new rooms are not on their lists; see
open points).

## Pictures (P107: the user picks)

`captures/wave6/` — the play camera (deviceScaleFactor 1), 960×540, and `captures/wave6/sheet.png` (all of them):
01 the Platform by the mine mouth (Krum) · 02 inside the mouth: the incline's head behind the project's boards ·
03 the Lift Dock's lever · 04 the bar, curtains drawn · 05 the bar, curtains open, Lys singing · 06 the ride: the cage
under the dock among the stilts, going into the gas, the cough · 07 the deep landing (the cage, the crates, the camp,
Gant, Tull, Marl) · 08 the deep seam lit (the boards and wedges at its end) · 09 the boards down, the incline open ·
10 the Platform after: the shift home · 11 Game Over in the Blow · 12 the Blow awake (taken while a fireball hit him:
the red flash; the Blow itself is at the top edge) · 13 a fireball on the glove, the Blow over its vent · 14 the Blow
gone, the seam blue.

## Open for the user

1. Keep the new place (the deep seam's three rooms), the two new people above it (Lys, Old Haskel), the bar's
   curtains that open, and the mine mouth as a door? (P107)
2. The glove now has two sources (the old adit under Celebration and Gant). Keep both, or make Gant's the only one?
3. The Blow's difficulty (the catch is generous: any glove punch while a fireball is within 2.6 m in front of him).
4. The card's step 6 (the Temple of the Dark Monk's murals and the foreman stopping the shipments) is folded into
   Gant's own decision on the bill; the murals step is not built.

## Known gaps (concrete)

- Pictures 12 and 13 frame the Blow at the top of the room camera's view; a better boss picture needs the room camera
  to favour it (or a still from a human session).
- The new rooms are not yet on door-sweep's, room-cutaway's and place-scan's lists (only overlap-sweep's).
- Found, not fixed (outside this wave): `travel.js regionOf` answers 'citadel' inside Otringal's bar and hotel and the
  Dark Monk's temple (not on its INSIDE list); the deep seam's rooms are on it (the Platform).
- Minutes: the card's estimate (35–40 min first play) is unmeasured; the bot's fight took 14 s of game time (it knows
  the answer). Only a person's play measures it.
- The bar's tab can be paid with the kashes the bot is given in the suite (ISO); in the fixture he has 12, so a real
  chapter-4 player meets the winch way first unless he saved up.

## Hebrew summary (סיכום בעברית)

נבנה H-16 "המעלית למטה": מפתח המעלית השמורה תלוי בבר הנמל של אוטרינגל כנגד חשבון של 40 קאש של סורל, מפקח הרכש של
הפרויקט. אפשר לשלם, או להעיף בכדור את הכננת התקועה של מסך הבמה: המסך עולה, ליס שרה, והחשבון נסגר. ברציף המעלית
המפתח מפעיל את הכלוב; בקטע האחרון המנוע משתעל וצריך לבלום (E); מי שמאחר נעצר בתופסן ומגולגל חזרה למעלה, בלי נזק.
למטה, בעורק העמוק של הוואנים (שלושה חדרים חדשים: הרציף העמוק, המסדרון, הנשיפה) תקועה המשמרת העמוקה: גאנט, טול ומארל.
גאנט מחזיק בכלל של הפרויקט מפחד; אחרי שמראים לו את החשבונית של סורל הוא מחליט בעצמו ונותן את כפפת הוואני. מדליקים
שלוש מנורות, מעיפים בכפפה שני טריזים, לוחות הפרויקט נופלים, והמשמרת עולה הביתה במדרון שלה אל הפלטפורמה; פי המכרה
נשאר דלת לשני הכיוונים. בוס אופציונלי: הנשיפה, מפלצת גז שיורקת כדורי אש אחרי התנפחות ושריקה ברורות; תופסים את האש
בכפפה ומחזירים אותה, שלוש פגיעות. אין מוות מיידי, ומוות מחזיר לפתח החדר עם חיים מלאים. דגלים חדשים בלבד (zo_),
שמירות ישנות נטענות. הבדיקה tests/wave6-mine.mjs עברה 34/34, overlap-sweep נקי אחרי תיקון, combat.mjs עבר 84/84,
dialogue-check עבר. כל התוצאות: ריצה אוטומטית בלבד (SwiftShader). התמונות ב־captures/wave6 ממתינות לבחירת המשתמש.
