# SMALLFIX 25–26.11: the five small fixes (#59, #62, #63, #64, #45)

Branch: the worktree branch from `3788d0cd` (ccr-c1c2c4b9-dep6ed). One commit per fix. Every result is **automated
runtime only (SwiftShader, headless Chromium)**; nobody played it and there was no real GPU. Pictures: one contact
sheet, `captures/smallfix/sheet.png` (before/after, the play camera at Far unless it says otherwise; a new game in
chapter 1, nothing from chapters 15–16).

## #59 The Citadel orchard crystal (`sc-orchard`)

- **Cause.** It stood at (−85, −49.5) on the cliff's edge, in a crack between the cliff-top rocks, with the ground
  falling away to the sea under it (13.5 m there, 16 m a metre east). From the play camera nothing of it showed
  (sheet row 1, before); the desktop's close picture showed a sliver.
- **Fix.** Moved 12.1 m to **(−91, −60)**: the grass patch between the trees west of the project's fenced yard, 8.9 m
  from the Weather Wizard's slate. Chosen by a search of every point within 15 m (flat to ±0.35 m within 1.6 m, no drop
  of 0.8 m within 2.5 m, no collider within 1.2 m, nothing drawn over it by a ray from above), then by pictures of
  four candidates from the play camera. Kept away from the orchard cage (12 m) and its throw spots on the cage's east
  side, and off the brown dirt where people walk.
- **Changed:** `src/main.js` crystalSpots, `src/game/citydress.js` (dressing kept clear), `src/game/containers.js`
  CRYSTALS. `story/wave5.js` keeps (−85, −49.5) as one of the tin stacks' search centres: a field, not the crystal; left.
- **Old saves.** The id is the same: a save that took it keeps it (spawnCrystals skips a collected id); one that did
  not finds it at the new place.
- **Evidence (automated).** By the harness's walk (P.go): from (−78, −44) and from (−92, −50) he walks to it and takes
  it (max life 10 → 11, the crystal's line, the pickup gone), no life lost, in 18 s and 7 s.

## #62 Modern: a held lock against a throw plate's line

- **Cause.** `combat.js aimDir` returned the lock's direction before it asked `aimPlate()`, and `throwTarget` returned
  the lock before anything else: locked on the Core's guardian, a ball thrown from a plate went at the guardian.
- **Fix (game-wide, every throw plate, Modern and Classic).** On a plate, lined up (aimPlate true), aimDir returns the
  plate's line (`src: 'plate'`), and throwTarget ignores the lock for that throw. **Melee keeps the lock** (my choice):
  aimDir carries the lock's way as `melee`, and the strike, the heavy strike, the combo, the pulse, the shooters and
  the tools use it. The lock itself is not released (stepping off the plate, it is still held). The marker shows what
  the ball will go to (the pylon), the lock's yellow when he steps off.
- **Test.** `tests/tester-fixes.mjs` C gains C5: on the Core's second plate, the guardian locked, the mouse elsewhere:
  the throw goes along the plate's line, converts the pylon, and the lock is still held. Result: below.

## #63 The coplanar overlap by the Otringal fountain (1891.6, 1790.6)

- **Not reproduced on the current build.** `SERVE=1 ONLY=isle_otringal node tests/overlap-sweep.mjs` (the islands'
  batch built together, as in KEYS-CLOVER's run): **PASS, (b) 0 open**; the four (b) spots it lists are all on the known
  list (the cloud sea at the island's foot, the retaining wall), none within 50 m of the spot. A direct scan of an
  11 × 11 m box round the spot (step 0.2 m) and a scan of the whole island (step 0.25 m) give no up-facing pair within
  3 mm there either. At the spot today: the terrain at 12.9 m and a sloped stone surface (#ecdce4, normal y 0.95) at
  15.4 m; nothing white lies on it.
- The finding (two merged buffers, #ffffff on #ecdce4, 2.38 m²) was reported at revision dbeb7f57's merge. The five
  commits since that touched zislands.js or props-esmer.js did not change Otringal's pieces; what removed it was not found. **Nothing was
  changed for #63.** A question for the coordinator below.

## #64 Lettering too small at the Far camera; the arch's approach

The sweep for this kind of fault found a cause, not only small type: **a rounded `rbox` carries UVs in metres**
(ExtrudeGeometry), so a canvas texture on it shows only a corner. Every lettered or pictured texture on a rounded rbox
in `src/` (grep): the survey stake's post, the bricked arch's infill, the TEST STEP sign (story/arsenal.js) and the
CLOUD CANAL sign (story/kit2b.js) are now plain boxes (`rbox(…, 0)`, each face the whole texture). Left: the rolling
shutter's slats in story/depth.js (a repeating pattern, not lettering). The two signs were not pictured.

- **The Weather Wizard's slate (Citadel, wave8world.js).** Cause: the board leaned toward the reader (+0.12 rad) and
  its lettered face away from it (−0.12), so the face's top half was inside the board and only "WALK IN. TALK
  PLAINLY." showed, the prop leg standing in front of it (sheet row 3). Now board, face and front legs lean back
  together, the prop leg behind; board 0.84 × 0.64 → 0.98 × 0.72 m, face 0.76 × 0.56 → 0.9 × 0.62 m; the canvas twice
  as fine, three lines each as large as fits: WEATHER WIZARD (white), QUIET, PLEASE (yellow), WALK IN · TALK PLAINLY.
  At the Far camera the first two lines read (row 2).
- **Otringal's unattended stall (wave8world.js).** The flat stack read as a white fleck. Added: the day's news bill on
  the stall's front post beside it, as a news seller hangs one, at eye height, 0.42 × 0.58 m: CLOUD CRIER, NEWS in big
  type, a red band, lines of print. At Far, NEWS reads (row 4 and its crops). The stack is unchanged.
- **Wave 5's survey stakes (wave5world.js).** The post 10 → 13 cm, painted as a surveyor's stake (orange bands, its
  number), a 24 cm cap with the number on its four sides on top, the tell-tale 6 → 13 cm wide in flagging-tape orange
  that glows a little. Heights as before (the cap's top at 1.41 m; the collider 0.13 m, top 1.41). Row 5–6.
- **The Hamalayi arch's approach.** Walked by keys straight at the arch from the stream's far bank, he crossed the ice
  and stopped at the bank's foot: a 1.5–2.4 m bank under the ledge, too steep (`footOfSlope`); the planner got up a
  metre to the side after a replan (39 s from the spawn). Added: old stone steps from the ice up the bank in line with
  the arch, built from the terrain at build time (11 steps, risers ≤ 0.24 m as the isles' flights, each step 5 cm over
  the bank's highest ground in its footprint, its foot under the lowest; `stair` colliders overlapping, as the game's
  stairs). Now by keys straight on and 0.5 m to either side: from the far bank to the arch's prompt spot in 5.3 s; back
  down to the ice in 3.1 s; the planner from the spawn 32.5 s, no replan; no life lost (row 7).
- **Also found and fixed (tests):** the overlap checks of `tests/wave5.mjs` O, `wave7.mjs` E/S and `wave8.mjs` O called
  the async `SW.scan` without `await`, so they scanned nothing and always passed. Now awaited (wave8's arch box also
  takes in the new steps). wave7 was not run (not touched by these fixes).

## #45 Rooms with no display name

`mapdraw.js roomName(id)` showed the id in title case when `room_<id>` had no text: on the minimap's and Holomap's
room name, the door labels and a save's place. A runtime census of every room the regions know (152): **31 named rooms
and 70 island/Kesh/Hamalayi houses** had none (the houses showed "Ih_otringal_6_m29").

| id | English | Hebrew |
|---|---|---|
| sewer / sewervault / sewerglobe | The old sewers / The sewer vault / Bersimon's globe room | הביוב הישן / הכספת שבביוב / חדר הכדור של ברסימון |
| tavern / tavcellar | Chez Luc / Chez Luc's cellar | אצל לוק / המרתף של לוק |
| bazoo / ticket / pharmacy | Mr Bazoo's shop / Ticket office / The pharmacy | החנות של מר באזו / משרד הכרטיסים / בית המרקחת |
| nbrhouse / nellhouse | The neighbours' house / Nell's house | הבית של השכנים / הבית של נל |
| pumproom / baggage / tralucave | Mill Lane pump room / Baggage claim / Tralu's cave | חדר המשאבה בסמטת הטחנה / איסוף המזוודות / המערה של טרלו |
| otrbar / otrhotel / celtemple | Harbour bar / The Imperial Hotel / Temple of the Dark Monk | בר הנמל / המלון האימפריאלי / מקדש הנזיר האפל |
| ham_hall | Monastery hall | אולם המנזר |
| ih_s28 / ih_hall / ih_house_s40 | The dig crew's bunkhouse / The pupils' dormitory / Bashir's house | בית הלינה של צוות החפירה / הפנימייה של התלמידים / הבית של באשיר |
| ballastra / bl_shed / bl_arches | Float Harbor / Tessa's shed / The Arch District | נמל המצופים / הצריף של טסה / רובע הקשת |
| bl_oren / bl_mags / bl_pump | Oren's house / Mags's house / The old pump room | הבית של אורן / הבית של מגס / חדר המשאבות הישן |
| bl_cradles / bl_gardens / bl_tunnel | The Cradle Hall / The Water Gardens / The service tunnel | אולם העריסות / גני המים / מנהרת השירות |
| bl_kiln / bl_house | Corvin's kiln / The House of Balances | הכבשן של קורווין / בית המאזניים |

The 70 houses (the commit message says 72: a miscount) (the same fault, game-wide): **kind and place**, "Tea room, Otringal", "Bunk cabin, Research post",
"Weaver's room, Lhar" (`ihomes.js ihomeName`, 33 kind names `ihn_<kind>` and `ihn_fmt`, both languages). Names already
used in the game's text were reused (Float Harbor, Tessa's shed, the House of Balances, Corvin's kiln, the Imperial
Hotel, the Dark Monk). Runtime check after: no room shows an id or an underscore in either language (152 rooms).
`node tools/he-bundle.mjs` and `node tests/dialogue-check.mjs`: **PASS** (6 604 of 6 604 keys with Hebrew).

## Tests run (each once)

| Fix | Suite | Result |
|---|---|---|
| #59 | the crystal walk (probe: P.go from both points, taken, life +1) | arrived both, taken |
| #62 | `SERVE=1 SHOTS=0 node tests/tester-fixes.mjs` | first run 9 of 10: C5 failed as written (on the second plate, after the first pylon, the plate did not line him up: `lined` 0.35, so the lock's aim stood). C5 moved to a fresh boot on the first plate, `ONLY=C` rerun: **PASS** (C1-C5: the ball along the line, the pylon converted, the lock 3.1 rad off and still held); A, B, D passed in the first run |
| #63 | `SERVE=1 ONLY=isle_otringal node tests/overlap-sweep.mjs` | PASS, 0 open in all seven categories |
| #64 | `SERVE=1 ONLY=CQNO node tests/wave8.mjs` (arch, slate, stall, the pieces scanned) | **PASS** 16/16, no page errors (O now really scans: the arch with its steps, the stall with the bill, the slate) |
| #64 | `SERVE=1 ONLY=DO node tests/wave5.mjs` (the stakes, the pieces scanned) | **PASS** 12/12, no page errors (the stakes' readings, the flag lifts; O scans the stakes) |
| #45 | `node tools/he-bundle.mjs`, `node tests/dialogue-check.mjs`; the runtime room-name census | PASS; 0 ids shown |

## Visible changes for the user's pick

1. The orchard crystal's new place (row 1). 2. The slate: bigger, lettering whole (rows 2–3). 3. Otringal's news bill on
the stall's post (row 4). 4. The survey stakes' paint, cap and flag (rows 5–6). 5. The stone steps up the bank to the
arch, and its brick infill now drawn whole (row 7). 6. The TEST STEP and CLOUD CANAL signs' lettering drawn whole (not
pictured). 7. Room names on the map and in saves.

## Questions

1. #63: the finding is not there on this build. Close it, or does someone have the run's REPORT file with its raw
   finding (the objects' paths) so it can be traced?
2. The stall's bill: a new piece rather than a bigger stack. Fine, or should the stack itself grow instead?
3. The arch's steps are new world geometry in the Hamalayi (ours, built from the terrain). Fine, or a ramp instead?

## Seen, not fixed (handed on)

- In the Hamalayi stream his feet sink about 10 cm into the drawn ice (he stands on the terrain under it; rows 7).
- The stakes' number on the post's side is drawn on a 13 cm face: readable close, not from Far (the cap carries it).

## סיכום בעברית

- **#59 הקריסטל במטע:** עבר 12 מטר מהסדק בסלעים אל דשא פתוח בין העצים (−91, −60). מגיעים אליו ברגל משתי הנקודות;
  שמירות ישנות: מי שלקח אותו – נשאר לקוח.
- **#62 נעילה מול לוחית:** על לוחית זריקה, הכדור הולך לאורך החץ של הלוחית גם כשיש נעילה; מכות וכלי ירייה נשארים עם
  הנעילה. בדיקה C5 נוספה.
- **#63 החפיפה ליד המזרקה:** לא קיימת בגרסה הנוכחית (סריקת אוטרינגל: 0 ממצאים פתוחים). לא שיניתי כלום; שאלה למתאם.
- **#64 כיתוב קטן:** הלוח של קוסם מזג האוויר היה חצי בתוך הקרש – תוקן והוגדל; בדוכן באוטרינגל נוסף שלט עיתון "NEWS"
  על העמוד; יתדות המדידה נצבעו, קיבלו כובע עם מספר ודגל רחב. הסיבה הכללית: טקסטורה עם כתב על קופסה מעוגלת מציגה רק
  פינה – תוקן בכל ארבעת המקומות במשחק. לקשת בהמלאיה נוספו מדרגות אבן מהקרח עד אליה (5.3 שניות הליכה ישרה).
- **#45 שמות חדרים:** 31 חדרים קיבלו שם באנגלית ובעברית, ו־70 בתים באיים, בקש ובהמלאיה מקבלים "סוג, מקום".
- הכול בדיקה אוטומטית בלבד (SwiftShader). תמונות: `captures/smallfix/sheet.png`.
