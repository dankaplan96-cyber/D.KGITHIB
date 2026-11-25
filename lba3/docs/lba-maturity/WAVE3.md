# WAVE 3 — H-6, H-7, H-8 as built (25.11.2026)

The user approved waves 1–8 on 24.11 (`CONTENT-15H.md` §3, "The user's answers": the target is the thorough player,
~13–14 h). Built 25.11.2026 on a worktree of `ccr-c1c2c4b9-dep6ed` (base `596110fd`, v162). The designs are the cards
in `DEPTH-PLAN.md` (each now has a **Built** row saying where the build differs). **Automated runtime only (SwiftShader,
headless Chromium)**: nobody has played these, no frame rate or hardware result is claimed, every minute is an estimate.

| Id | Cards | Place | What the player does | Reward | What stays (three chapters later) | Est. min |
|---|---|---|---|---|---|---|
| H-6 | ZEE-1 | Zeelich's street, the west end (chapter 3 until the network chapter) | Old Grumm: "ask Garn why his posts are cold and our tunnels are warm". Garn the fitter wants proof. Twinsen feels the new capped riser at the foot of Mr Pelleck's dark post (warm), reads a post's tag, holds his hand over the burrow's vent (hot); Garn then lends his valve spanner; a quarter turn at the cap | the post lights; Grumm pays what the west end chipped in (12 kashes) | the lit post over the west end, the burrow's vent quiet, Grumm's and Garn's lines | 9 |
| H-6 | ZEE-2 | the depot yard's teal store (the network chapter on, the epilogue) | the store's door now has a motor shutter (its look says a motor holds it); with Baldino's pulse tool, the pulse at the motor stalls it and the shutter rolls up; inside, the ledger (heat cells and connection kits, all RESERVED, UPPER DISTRICTS) and a radiator kit marked PELLECK, WEST END, taken to Mr Pelleck | 15 kashes, his receipt; the ledger in the journal | the shutter up, the gap on the shelf, Pelleck's warm-feet line | 5 |
| H-7 | HAM-2 | Lhar, Kesh, Lhar's icefall (chapter 6 after the fuse; the way from chapter 7's end) | Pim's kite came back torn; Twinsen carries it to Lumi in Kesh (mended at once if Kesh's wind-catcher is done; otherwise that comes first); back to Pim: it flies, and once the peak's drone is down he tells of the goats' way. Six rock ledges by the icefall (Athletic jumps), Pim's rope from the high rock, Twinsen ties its end to the iron ring and climbs | a shortcut: Lhar → the high rock → the ridge's upper end by the observatory, past the lift, the monastery and the ridge's middle | the rope, tied; the way both up and down; Pim's line | 12 |
| H-8 | ISL-3 | Otringal's barges' yard and west quay, Mosquibee's honey islet (from the Esmer line: chapter 3 bought, chapter 9 given) | the near shore's "no way over on foot" look now points along the shore with the line; a davit's cord ring, an old mooring rock in the cloud with an Esmer arch, a ring on the far side (Mosquibee: a plank of its bridge); across and back by the line | the yard's barge crate (Madam Orla's lens came from it; 15 kashes), the dock worker's locker (his note, a clover), the hive's honey pot (full life, once a visit) | two-way crossings to three doors that were out of reach; the honey pot | 6 |
| H-8 | HAM-4 | the Hamalayi gorge by the tree bridge (chapter 6 on, with the line) | a cord ring frozen into an ice arch's crown over a rock stack in the meltwater; from the bridge or the bank onto the stack; the old gate crew's chest; back by the ring in the arch's foot | a clover, 12 kashes, the crew's joke | the arch and its two rings | 4 |

Total for a player who does all of them: about **36 min** (the cards' own estimates, not measured on a person).

## How each one plays (state, gates, recovery)

**H-6 ZEE-1** (`depth.js` ZEE-1). Flags `dx_heat_ask/tag/pipe/grate/fen/spanner/open/back/paid/late/pel`; owed kashes
`dx_owe_heat`. The fitter is the street's **Garn** (the game's name; "Fennick" was the card's working name). The tag is the
street's own look (zeelife.js); depth.js counts it when read and lets it through. The burrow's vent keeps its own look
except while the quest wants his hand over it. Garn's first ask without proof is said once; a second talk is his own line.
The spanner shows in the inventory while lent and goes back on the next talk with Garn (or, if the window closed with the
cap shut, with his "the council's crew is connecting the west end now"). The cap opened: the post's crystal is the
street's warm crystal (crystallook.js) over its dull one; the vent's warm puff (zeelife.js `ventT`) is held off. From the
network chapter the hook is no longer offered; Grumm, if he asked, says the council connects the west end anyway.
**Nobody is named as the cause**: it is "the drawing".

**H-6 ZEE-2** (`depth.js` ZEE-2). Flags `dx_store_seen/open/ledger/kit/given/later`; owed `dx_owe_store`. Before the
network chapter the shutter's look ("PROJECT STORES. STAFF ONLY. A motor holds the shutter down. The project's kind.")
replaces the old "The lock is new."; nothing opens it. From the network chapter the look adds Baldino's rule; the pulse
tool's cone and range at the motor (`index.js pulseHit` asks depth.js after the chapter). Inside is a **look-in** store:
a painted interior in the doorway (two paintings, with and without the kit), reached from the threshold.

**H-7 HAM-2** (`depth.js` HAM-2). Flags `dx_kite` (`'torn'` carried, `'left'` with Lumi, `'mended'` carried, `'given'`),
`dx_kite_left` (the chapter + 1 it was left in), `dx_kite_flew`, `dx_goatpath`, `dx_goat_ring/tied/up/thx`.
- Lumi: with the wind-catcher (`k_done`) she mends it at once ("You fixed our cool room; I fix your friend's kite");
  without, she keeps it and names the wind-catcher; it is mended once that is done or the chapter has changed.
- The gate: the ledges exist from chapter 6 (goat tracks; their top is a dead end, "Not without a rope"); the rope
  appears only when Pim has told the way, which he does only once chapter 7 is done (before: "not while that drone's up
  on the peak"). The top ledge is 18 m, the high rock's lip 26 m: no jump reaches it (jumpreach §5).
- The climb: E at the iron ring (tie, then climb), E at the stake on top (down). The body is held by the story while it
  moves along the face (`Game.heroHold`, as Kell's lift handle). A death, Retry or Save & quit keeps the rope and the way.
- Where it saves time: every visit that starts in Lhar (foothills arrivals, the glacier basin of H-3). Chapter 14's
  glider lands at the monastery, so there it saves nothing (said plainly; the card hoped for chapter 14's crawler).

**H-8 ISL-3 + HAM-4** (`depth.js` ISL-3 + HAM-4; `index.js lineTargets` adds depth.js's rings to kit2b's). Flags
`dx_far_yard/quay/honey/crate/locker/honeyN`, `dx_arch_seen`, `dx_arch`, `dx_arch_chest`; owed `dx_owe_far_yard` (15
kashes), `dx_owe_far_quay` (clover), `dx_owe_arch` (12 kashes), `dx_owe_arch_clover`.
- A ring is offered only with the line in hand and only from the side it serves (near shore → rock; rock → far or near;
  far → rock). A route rises over the highest ground or roof between and must pass the line's own clearance check
  (tools.js `clear`): a blocked route only twangs, as before.
- Measured from where he can stand on the near shore to where he can land: the yard about 20 m, the quay about 24 m,
  the honey islet about 21 m (the line reaches 14): hence a mooring rock in each Otringal gap and, for Mosquibee, a
  plank of the bridge near the islet end (its arch 1.2 m taller than the canal's, so its ring is seen from most of the
  islet's ground by the hive: 49 of 80 measured spots; from the rest he walks a few steps). The Mosquibee bridge was already there but cannot be walked:
  its slats leave gaps the physics reads as cloud (the move wants ground under his middle). Not changed (a game-wide
  physics rule); Twinsen says so ("set for Mosquibee strides, not mine"). **For the user**: should that bridge be
  walkable instead? Then the honey islet needs no ring.
- The honey pot: full life once a visit (again after he has left the area). No carried honey (the inventory has no "use").

## Files

| File | Change |
|---|---|
| `src/game/story/depth.js` (owned) | the five cards: build, state, interaction, the people's hooks (Garn, Grumm, Pelleck, Pim, Lumi), journal, items, `pulseHit`, `lineTargets`, owed rewards |
| `src/game/story/index.js` (shared: 2 one-line hooks) | `pulseHit` asks depth.js after the chapter; `lineTargets` adds depth.js's rings |
| `src/game/text/depth.js`, `src/game/text/he/depth.js`, `src/game/he-text.js` | the English lines and their Hebrew (bundled) |
| `tests/depth-wave3.mjs` (new) | the one covering suite |
| `tests/jumpreach.mjs` | §5: up the goats' ledges by jumps; not onto the high rock's lip or the gorge's stack by a jump |
| `tests/slidetraps.mjs` | `ALWAYS='x0,z0,x1,z1;…'`: every scanned spot inside those boxes is taken, past the stride |
| `tests/lib/boot.mjs` | the merge's duplicate `serveLocal` import and SERVE line removed (every suite failed to load; the coordinator made the same fix on origin) |
| `tools/wave3-shots.mjs`, `tools/wave3-sheet.py` (new) | the before/after pictures and their sheet |
| `docs/lba-maturity/DEPTH-PLAN.md`, `CONTENT-15H.md` | Built rows / marks |
| `captures/wave3/` | the pictures |

Not touched: zeelife.js, zeelich.js, hamalayi.js, kesh.js, ihomes.js, kit2b.js, tools.js, the physics, any chapter file.
Nothing existing moved; the Citadel harbour is not touched. Save format unchanged (6): every new state is a new `dx_` flag.

## Objects added, per place (nothing removed)

| Place | Added (each with its job) |
|---|---|
| Zeelich, the west end | **1 capped riser** at the foot of Mr Pelleck's dark post (a copper stub, flange, teal cap, a red valve bar, a CAPPED tag; a small collider), **1 lit crystal** over the post's dull one (shown once opened) |
| Zeelich, the depot yard's teal shed | **a roller shutter** over its door (housing, PROJECT STORES plate, two rails, slatted curtain), **a motor** on the wall (lamp, cable), **a painted interior** in the doorway (shown when open) |
| the Hamalayi, Lhar's north cliff west of the icefall | **6 rock ledges** (snow-capped, skirts to the ground), **an iron ring** on the top one; when told: **a rope** from **a stake** on the high rock's lip |
| the Hamalayi gorge, 10 m west of the tree bridge | **a rock stack** in the meltwater (sheer, flat snowy top), **an ice arch** to the north bank, **2 brass rings** frozen into it, **a tool chest** on the stack |
| Otringal, the barges' yard | **a davit** on the near shore, **a mooring rock** with an Esmer arch in the gap, **a davit** on the yard, **a barge crate** |
| Otringal, the west quay | the same: **2 davits**, **a mooring rock** with an arch, **a locker** by the house |
| Mosquibee, the honey islet's plank bridge | **2 honey-capped davits** at its ends, **a tall Esmer arch** on a plank near the islet end, **a honey pot** by the hive |

## Tests (Automated runtime only, SwiftShader, headless Chromium; the machine shared)

RESULTS

## Pictures (`captures/wave3/`)

PICTURES

## Decisions for the user

1. **The new geometry** (the pictures): the west end's riser and lit post; the store's shutter and painted interior;
   the goats' six ledges and rope; the gorge's rock stack and ice arch; the isles' davits, two mooring rocks and arches.
   Keep, change or drop each.
2. **Mosquibee's plank bridge** looks whole but cannot be walked (slat gaps read as cloud). Keep it impassable (the line
   crosses it, as built) or make bridges of slats walkable game-wide (then the honey islet needs no ring)?
3. **The goats' way in chapter 14**: the glider lands at the monastery there, so the shortcut does not skip that
   chapter's ridge crawler, as the card hoped. Fine as a shortcut for Lhar visits, or should chapter 14's landing move?
4. **Card differences**: no heat cell (ZEE-1), no person in the dock worker's house (ISL-3), honey as a pot not a carried
   jar (ISL-3), the gorge's ledge replaced by a rock stack (HAM-4), no chapter 14 radio lines (HAM-2).

## Unverified / risks

- Nobody has played these; whether a newcomer notices the riser, the ledges or the rings is not known.
- The store's inside is a painting in the doorway (look-in), not a room.
- The rope climb poses Twinsen with his hands raised ('reachHigh') while he moves; there is no climbing animation.
- `tests/depth-1.mjs`, the chapter suites and the campaign chain were not run (one suite per change).

## סיכום בעברית

נבנה גל הרחבה 3: שלוש משימות אופציונליות (H-6, H-7, H-8), כולן במקומות קיימים ובדגלים חדשים בלבד (שמירות ישנות נטענות, פורמט 6).
- **H-6, הרחוב של זיליך:** גראם הזקן מתלונן שהמחילה חמה בזמן שעמודי החום בקצה המערבי כבויים. טווינסן ממשש צינור סגור למרגלות העמוד של מר פלק (חם), קורא תווית ובודק את פתח האוורור של המחילה (לוהט). גארן המתקין משאיל מפתח שסתומים, רבע סיבוב, והעמוד נדלק. גראם משלם 12 קאשים. בפרק מאוחר, עם כלי שטווינסן מקבל שם, אפשר לעצור את המנוע של תריס המחסן בחצר המחסן, למצוא פנקס וערכת רדיאטור עם השם של מר פלק, ולהביא לו אותה (15 קאשים).
- **H-7, ההרים:** העפיפון של פים חזר קרוע. טווינסן לוקח אותו ללומי האורגת בכפר קש שבאי המדבר (אם לוכד הרוח של הכפר כבר תוקן, היא מתקנת מייד). אחרי פרק מאוחר יותר פים מגלה את שביל העיזים: שישה מדפי סלע ליד מפל הקרח בלהאר, חבל שהוא קושר למעלה וטווינסן קושר למטה, וקיצור דרך אל הרכס.
- **H-8, החבל האסמרי:** טבעות חבל חדשות מגיעות לשלוש דלתות מעבר לעננים באיים (בעזרת סלעי עגינה ישנים בענן, ובגשר הקרשים של מוסקיבי), עם טבעת לדרך חזרה בכל אחת: ארגז דוברה (15 קאשים), לוקר של פועל נמל (תלתן) וסיר דבש שמחזיר חיים בכל ביקור. בערוץ שליד גשר העץ: קשת קרח עם טבעת, עמוד סלע וארגז של צוות דרכים (תלתן ו־12 קאשים).
תוספת משוערת: כ־36 דקות לשחקן שעושה הכול (הערכה בלבד). כל שינוי חזותי מוצג בתמונות לפני/אחרי בתיקייה captures/wave3 ובגיליון wave3-sheet.jpg, לבחירתך. הבדיקות אוטומטיות בלבד (SwiftShader). אדם עוד לא שיחק בזה.
