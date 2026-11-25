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
3. The Blow's difficulty (the catch is generous: any glove punch while a fireball is within 2.6 m in front of him). (Second round: 1.8 m.)
4. The card's step 6 (the Temple of the Dark Monk's murals and the foreman stopping the shipments) is folded into
   Gant's own decision on the bill; the murals step is not built. (Second round: built, below.)

## Known gaps (concrete)

- Pictures 12 and 13 frame the Blow at the top of the room camera's view; a better boss picture needs the room camera
  to favour it (or a still from a human session).
- The new rooms are not yet on door-sweep's, room-cutaway's and place-scan's lists (only overlap-sweep's).
- ~~Found, not fixed: `travel.js regionOf` answers 'citadel' inside Otringal's bar and hotel and the Dark Monk's
  temple~~ — fixed game-wide in the second round (below).
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

## Second round (25.11.2026): "keep, and light it"

The user saw `captures/wave6/` on 25.11 and picked: keep the place; light it; a harder catch; build the murals step;
check the prompts. The glove keeps both sources (the old adit and Gant), as before. Evidence label: **Automated runtime
only (SwiftShader, headless Chromium)**; nobody has played it; no hardware figure.

### What changed

1. **Light** (`wanniemine.js`, `gasblow.js`). No new shadow-casting light; the light is self-lit glass, halo sprites and
   unlit additive pools on the floor (as Tralu's cave's and the lamp room's), which stay on Low.
   - The room key light (`R.indoor`): the landing 0.45/0.7 → 0.7/0.95, the gallery 0.4/0.65 → 0.62/0.85, the Blow
     0.35/0.55 → 0.6/0.85 (sun/hemi).
   - The landing: caged bulbs on the three back timbers, the left timber and the cage's guide; warm pools under them,
     the camp's pool round the stove and bedrolls, the cage's work light on the rails, the tunnel's mouth; one more
     lamp marker over the camp.
   - The gallery: two bulbs always lit at the landing's end (the camp's side) with their pools, the landing tunnel's and
     the Blow's way's glow on the floor. The three posts keep the beat: before, a faint pool (0.05) and dark glass;
     lit, a warm pool (0.42), a halo and the lamp (5.2) as before. The incline's head: a bulb on the timber over the
     mouth, two pools on the top landing (not over the steps), the mouth's light 2.4 → 4.0.
   - The Blow's room: the vents' glow round each vent (dimmed when it is beaten), the seam's warm pool at the back
     wall's foot (blue once beaten), the door's cold pool.
   - The Blow: a brighter, more solid bag (opacity 0.86 → 0.94, emissive 0.9 → 1.3, lighter skin), a warm halo round it
     (brighter in the wind-up, a flicker when hit), and its light on the floor: a pool under it that follows it (wider
     and fainter the higher it hangs; it fades as it dies).
2. **Harder catch** (`gasblow.js`): `BLOW.catchReach` 2.6 → **1.8 m** in front of him. Hints, 2 damage a burn and the
   retry at the room's door are unchanged.
3. **The murals step** (`celtemple.js`, `story/liftbelow.js`). Under the prophecy in the Temple of the Dark Monk on
   Celebration: the Wannies' carving, an ochre band above the bench, four scenes (the miners at the seam by lamplight;
   the gas spitting fire, caught in a miner's glove; a line of Wannies carrying gems up their own incline; a Wannie
   hand over the mine's mouth). Its Look (E) tells it (`zo_murals`). Gant's first talk now ends with the clue: their
   paper says the seam is the project's, his grandmother said the old ones carved it in the Dark Monk's temple on
   Celebration (`zo_temple`). His menu offers what is left: Sorrel's bill, the temple's carving (once seen), Not now.
   One alone is not enough ("A cheat, then. But a cheat with a paper…" / "Old stone, though…"); after both he decides,
   gives the glove (or the adit's-glove line) as before. The journal lists the bill and the carving while he waits.
   Until his word the wedges hold ("Not without the deep shift's word. Talk to Gant first."), so a player with the
   adit's glove cannot skip him. Old saves: past the decision (`zo_gant` 2, or a wedge out, or the boards down)
   nothing changes; a save at `zo_gant` 1 hears the temple clue on the next talk. New flags only: `zo_temple`,
   `zo_murals`, `zo_billShown`, `zo_muralsTold` (save format 6 unchanged).
4. **Prompts** (the key-name helper `hud.key`, the player's current controls). Checked: the ride's brake toast names
   `{e}` = the interact key (Classic, the default: W; Modern: E; the brake also takes the action key, Space): right.
   The Blow's toasts name `{k}` = attack (K): right. The glove's toast said "hold {w} to take it in hand" (G in
   Classic: the wheel, right but half the story); it now reads as the other new weapons' toasts: "{r} until it is in
   your hand (or hold {w}: the wheel). {k}: punch" (R / G / K in Classic; R / X / K in Modern). The burn hint now names
   the punch key too. The other prompts (Talk, Look, Ride down …) are the HUD's own and use the same helper.
5. **Game-wide fix: `travel.js regionOf`** answered 'citadel' inside every interior missing from its INSIDE list.
   Swept every door that names a region and every regions.js room: added Otringal's bar and hotel (isle_otringal), the
   Dark Monk's temple (isle_celebration), Zeelich's four homes (zeelich: Pelleck, Nara, Oku, the bakehouse) and
   EXP-3's two Ballastra rooms (bl_cradles → bl_arches, bl_house → bl_gardens). The rest of the list was right;
   Citadel's own interiors answer 'citadel' as before.
   Also in the gallery: a lantern on the incline's rail half way up (an iron rod and arm over the rail, out of the
   way up) and one more lamp marker there.

### Tests (Automated runtime only, SwiftShader)

| Suite | Run | Result | What it covers |
|---|---|---|---|
| `SERVE=1 node tests/wave6-mine.mjs` (extended) | once, final code | **PASS 37/37**, no page/console error, no missing file | as before, plus: B the region inside the bar is isle_otringal; D Gant's first talk names the temple, the bill alone does not decide him (no glove; the journal lists the bill and the carving), the temple by its portal (INPUT, ISO: put 2.2 m before it), the region inside is isle_celebration, the carving (E), back at the landing (ISO: put at the cage) the carving told (a pick): the decision and the glove; E the catch's reach: a fireball 2.2 m in front is not caught, 1.6 m is (1.8 m). The fight by input is still won: 3 caught, 3 thrown, 3 hits, 14.1 s of game time, 1 burn |
| `SERVE=1 ONLY=wm_landing,wm_gallery,wm_blow,celtemple node tests/overlap-sweep.mjs` | once; then wm_gallery, wm_blow again after the incline lantern | **0 findings** both times | the new bulbs, pools, the lantern, the carving |
| `node tools/he-bundle.mjs && node tests/dialogue-check.mjs` | after the last text change | **PASS**, Hebrew 100 % (5902 keys), no warning on the new keys | the text |

Not run: combat.mjs (the glove's moves are untouched; only the Blow's catch reach changed, covered above), door-sweep,
the full test.

### Pictures (P107: the user picks)

`captures/wave6b/before/` (the branch before this round) and `captures/wave6b/after/`, the play camera
(deviceScaleFactor 1, 960×540), and `captures/wave6b/sheet.png` (before | after, side by side): 01 the deep landing ·
02 the gallery before the lamps (oil taken) · 03 the gallery, three lamps lit · 04 the boards' end lit · 05 the
incline's head, in from the mouth · 06 the Blow asleep · 07 the Blow awake, hovering between spits · 08 its wind-up ·
09 cooling after a spit (a fireball in the air) · 10 the temple's carving, the play camera (after only) · 11 the
carving close (not the play camera: the camera put 4 m before it; after only). Made by a scratch script (the same
save, flags set, the hero put in each room); not part of the suite.

### Gaps (concrete)

- Nobody has looked at it on a real GPU; the pools are tuned on SwiftShader's picture only. On Low (two lamps) the
  bulbs, halos and pools stay (unlit), the lamp markers drop to the two nearest: not pictured.
- The temple's carving is our own drawing (four scenes on a canvas); in the play camera it reads as a band of figures,
  its story in its Look text. The fourth panel (the hand) is partly behind a column from the reading spot.
- The suite reaches the temple by putting Twinsen on Celebration's pad and 2.2 m before the portal (ISO, logged); the
  walk from the pad up to the plaza is travel.mjs's and the islands' ground, not run here.
- Many rooms still have no `room_<id>` display name (the map's and a save's room name falls back to the id in title
  case: Otrbar, Otrhotel, Celtemple, the sewers, Ballastra's rooms …; 31 found by a scratch scan). Not fixed (outside
  this round); handed to the coordinator.
- Minutes: still unmeasured; the murals add a shuttle ride to Celebration and back (the bot does not measure it).

### Hebrew summary (סיכום בעברית, סבב שני)

המשתמש בחר "להשאיר ולהאיר". חדרי המכרה (הרציף העמוק, המסדרון, חדר הנשיפה) וראש המדרון קיבלו אור חם: נורות בכלוב על
הקורות, הילה סביבן וכתמי אור על הרצפה (בלי אורות חדשים שמטילים צל). במסדרון עדיין רואים שינוי: לפני ההדלקה עמום (לא
שחור), אחרי ההדלקה כתמי אור חמים. הנשיפה עצמה בהירה ומוצקה יותר, עם הילה ועם כתם אור על הרצפה שזז איתה, ונראית בכל
שלב. תפיסת כדור האש בכפפה רק עד 1.8 מטר מול טווינסן (היה 2.6). נבנה שלב ציורי הקיר: במקדש הנזיר האפל באי החגיגה,
מתחת לנבואה, חריטה של הוואנים (הכורים, הגז, המדרון שלהם, יד של וואני מעל פי המכרה). גאנט מזכיר את המקדש, ומחליט רק
אחרי שני הדברים: החשבונית של סורל וסיפור החריטה (בחירה בתפריט, בכל סדר). עד אז הטריזים לא זזים. שמירות ישנות שכבר
עברו את ההחלטה לא נפגעות. ההודעות על המקשים נבדקו: הבלם (W במקשים הקלאסיים, E במודרניים) והמכה (K) נכונים; הודעת
הכפפה מנוסחת עכשיו כמו של שאר הכלים (R עד שהיא ביד, או להחזיק G לגלגל, K למכה). תוקן באג באזור המפה: בתוך הבר
והמלון של אוטרינגל, המקדש, בתי זיליך ושני חדרים בבלסטרה המשחק חשב שטווינסן בסיטדל. הבדיקה wave6-mine עברה 37/37,
overlap-sweep נקי, dialogue-check עבר. הכול ריצה אוטומטית בלבד (SwiftShader). תמונות לפני ואחרי ב־captures/wave6b
ממתינות לבחירתך.
