# KEYS-CLOVER · Small keys and clover boxes: design card (25.11.2026)

**A design card, not built.** It answers the user's reply of 24.11 (CONTENT-15H "The user's answers", item 3): "bring
them back (one key, one door, in one area; clover boxes raise the clover cap above 9)". No game code changed for it.
Labels: **Source** (read in code), **Estimate** (not measured), **Proposal** (needs the user's yes).

## 1. What LBA1 and LBA2 did (documented facts)

- **LBA2, its released source** (github.com/2point21/lba2-classic, `SOURCES/`):
  - **Small keys.** A key is a counter (`NbLittleKeys`), kept in the save. A bonus that is picked up adds to it
    (`EXTRA.CPP`). A door's script spends one (`LM_USE_ONE_LITTLE_KEY`, `GERELIFE.CPP`), and the counter shows on screen
    as it is spent. Scripts can test the count (`LF_NB_LITTLE_KEYS`).
  - **Keys stay in their scene.** `ChangeCube` sets the count to 0 (`OBJECT.CPP`). The behaviour menu prints the count
    (`COMPORTE.CPP`).
  - **Clover boxes.** `NbCloverBox` starts at 2 (`NB_CLOVER_BOX_DEFAULT`, `COMMON.H`). The most is 10
    (`MAX_CLOVER_BOX`). A script adds a box (`LM_INC_CLOVER_BOX`), and a picked leaf never goes above the boxes
    (`EXTRA.CPP`). The behaviour menu draws the boxes with their leaves.
  - **Using a leaf.** `UseOneClover` gives full life, and magic at 20 × the magic level. Twinsen is put back at a valid
    position (`OBJECT.CPP`).
- **LBA1, through ScummVM's TwinEngine** (`engines/twine`). This is a reimplementation, not the original code.
  - **The same rules.** Keys go to 0 on a scene change (`scene.cpp changeCube`). `USE_ONE_LITTLE_KEY` spends one, with
    a key sprite over Twinsen (`script_life.cpp`). `INC_CLOVER_BOX` adds a box. There are 2 boxes at the start and 10
    at most, and leaves never go above the boxes (`gamestate.cpp`).
  - **Using a leaf.** He restarts at the scene's start with full life and magic, and one leaf is spent (`twine.cpp`).
- **Not verified:** where keys and boxes lay in particular scenes, and how players liked them. No original was run and
  no footage was watched. Our interpretation: a key makes a player search one place well. A box is a permanent gain
  found off the path. Both are small and local, and neither blocks the story.

## 2. Today's code (Source)

- **Clovers.**
  - `actors.js` Hero: 2 clovers at the start. In `Hero.damage`, `depth.catchFall` comes first. Then a clover: a
    knockdown, and he gets up on the spot with full life and magic. Without one, he dies.
  - **The cap of 9 is written out at 16 places:** `main.js` ×3 (pickup, shop list, shop buy), `story/base.js`,
    `islandpeople.js` ×2, `kit2.js`, `kit2b.js` ×2 (a full cap turns the clover into 10 kashes), `arsenal.js` ×3,
    `shops.js` ×2, `steam.js`, `prologue.js`.
- **Keys today are story items** (the well's lid key, Bersimon's key, Mira's valve-room key, Baldino's override key: icons in the inventory).
  - `giveBonus` maps a `key` bonus, but `PICK` has no key model, so no key can drop.
  - `hasKey` (the well key) drives the HUD's `#keyicon` and the behaviour menu's key count.
- **HUD and menus.**
  - The HUD shows `#clovers` (a number).
  - The behaviour menu draws `max(5, clovers)` boxes and a key count.
  - The inventory lists kashes, clovers and crystals in its top row.
- **Doors.** Walk-in doors (`checkDoors`, `story.doors()`) and shut doors that give a reason (`W.shutDoors`, `ihomes.js`
  `ex`). `door-sweep.mjs` walks every door by input. `door-levels.mjs` checks every sill (P113).
- **Save.** Format 6. `flags` is open, so new flags are simply absent in old saves. `hero.clovers` is loaded without a
  clamp.

## 3. Proposal

**One rule each.** A **small key** fits only the one door of its area. It is found in that area, and it stays in the
inventory until that door uses it. Leaving the area keeps it, which is kinder than LBA's reset and means no loss and no
soft-lock. A **clover box** raises the cap by one and comes with a leaf in it. Cap = 9 + boxes found, at most 13. Old
saves keep 9.

| # | Area · chapter | The door | The key (and its clue) | Behind it | Min (est.) | Cost |
|---|---|---|---|---|---|---|
| K1 | Citadel · 1–2 | FunFrock's old passage, the barred north mouth (`OLD_DOORS.passageN`, LBA1 scene 51) | in the fort's yard, in the old powder chest, shaken out like any container. The bars' line points to the yard: "the watch kept its keys by the guns" | a short vaulted tunnel to the yard's trapdoor; its bolt drawn from below makes a **two-way shortcut** (north face ↔ fort yard). Box B1 is in a side niche. A barred side door marked SHELTER is left for chapter 8 | 8–10 | M (new tunnel) |
| K2 | Zeelich's isles, Otringal · 4+ | the plaza fountain's pump house (`otringal-16-6`, today "nothing for a visitor") | glinting on the fountain spout's ledge; a ball knocks it down | a 2.5 m valve room. One valve **starts the dry fountain**: the plaza changes, and residents remark on it on a later visit. Box B2 is on the shelf | 6–8 | S–M |
| K3 | the Hamalayi, Lhar · 6–7 | the goats' old two-storey house (`hl_goats`) | in the hay of the yard's feed rack (the goats nose at it; a look says so) | goats downstairs. A ladder to the loft (Pim's grandmother's things, a read), and **its window looks at the observatory**. Box B3 is in the loft | 6–8 | S–M |
| B4 | Desert Island · 4–5 | no key | a ledge on the School's mask brow, reached on foot from the hollow's east bank (a jump; never hop-pack only) | box B4 | 2–3 | S |

**Total, estimate:** ~22–29 min of first play for a player who finds all four (not measured). It fits one wave, well
before content complete (31.12.2026).

- **Cost: M overall.**
  - The system is S:
    - a `cloverCap()` used at all 16 cap sites;
    - a `key` pickup model;
    - a `keydoor` kind in the doors' interaction (refuse with its line, open with the key, then a walk-in door);
    - the HUD and menu changes.
  - K1 is the only new geometry (in the fort's kit). The others reuse rooms (`ihomes.js`).
- **HUD and inventory.**
  - `#keyicon` shows while he holds the small key of the area he is in. The same icon is used, and it is never
    shown together with a story key.
  - The behaviour menu's key count is the small keys for this area. Its box row draws exactly the cap, with the leaves
    filled in, as LBA does.
  - The HUD's clover number is unchanged.
  - Inventory: a "Small key" entry, its description naming the area. The Clover Leaves line reads "7 / 11".
  - A toast on finding a box, and a key sprite over Twinsen on unlocking, as LBA does.
- **Save flags (format 6, new only, prefix `kc_`).**
  - `kc_key_fort`, `kc_door_fort`, `kc_bolt_fort`, `kc_box_fort`
  - `kc_key_pump`, `kc_door_pump`, `kc_pump_on`, `kc_box_pump`
  - `kc_key_goat`, `kc_door_goat`, `kc_box_goat`
  - `kc_box_mask`
  - The cap is derived from the `kc_box_*` flags and never stored. On load, `hero.clovers` is clamped to the cap.
  - Each find saves at once (as other finds do). A key is spent only in the same step that sets its door flag.
- **Hebrew strings needed (about 18 keys; drafts for the dialogue editor):**
  - `it_kc_key` מפתח קטן
  - `itd_kc_key` פותח מנעול אחד, קרוב למקום שבו נמצא
  - `p_kc_unlock` לפתוח את המנעול
  - `p_kc_bolt` למשוך את הבריח
  - `kc_locked` חור מנעול קטן. נעול.
  - `kc_unlock` המפתח הקטן מתאים.
  - `toast_kc_box` קופסת תלתן: אפשר לשאת עכשיו {n} עלי תלתן
  - `it_kc_boxes` קופסאות תלתן: {n} מתוך {max}
  - plus each door's look, clue and inside lines: 3 × 3.
- **Test (when built):** `tests/keys-clover.mjs`, by input. For each door:
  - refused, then the key found, then opened;
  - Save & quit → Continue at each step;
  - the cap rises with each box, and the shop's "max" follows the cap;
  - an old save loads with cap 9.
  - Then `door-sweep` and `door-levels` once.

## 4. Risks

- **Story overlap.** FunFrock's tunnels are chapter 8's surprise ("Grandpa's tunnels are real!"). K1 must plant the
  idea, not open the shelter (narrative developer to agree). Lhar's goat house carries the observatory's signal story
  (`rf_roof`), so K3's loft must not answer it early. Fallback for K1: the lighthouse door (but its power state matters
  there).
- **Balance.**
  - DEPTH-PLAN advised against raising the cap, because the economy around 9 works.
  - At 13, a careful player hardly ever dies.
  - Clover rewards that turn into kashes at 9 stay clovers longer.
  - chapter-balance needs its clover columns rerun after the build.
- **Traversal.** The hop-pack (ch 10) and the jetpack must not reach B4 or the loft from outside without the door.
  Locomotion checks each spot.
- **Two kinds of key.** Small keys must look and read differently from story keys: a round-bowed brass key named
  "Small key".
- **Visible world changes** (the tunnel, the dry fountain running, the loft) need before/after pictures (P107).

## 5. Questions for the user

1. **The cap:** four boxes up to 13, or three up to 12?
2. **A box with a leaf in it** (our proposal), or an empty box that only raises the cap?
3. **Keys and leaving an area:** should a key stay with Twinsen (our proposal), or vanish on leaving, as in LBA?
4. **Three key-doors** (the town of the first chapters, an island town, a mountain village), or also one in a late
   area?
5. **The small key on the HUD while it is held** (our proposal), or only in the menus?

## סיכום בעברית

- **ההצעה בקצרה:** מחזירים את המפתחות הקטנים ואת קופסאות התלתן של LBA.
- **מפתח קטן:**
  - כל מפתח נמצא באזור שלו ופותח דלת אחת באותו אזור.
  - הוא נשאר אצל טווינסן עד שהדלת משתמשת בו, ולכן אין אובדן ואין מצב תקוע.
  - שלוש דלתות:
    - **בעיר של הפרקים הראשונים:** מעבר ישן מתחת למבצר. מאחוריו קיצור דרך דו־כיווני וקופסת תלתן.
    - **בעיירה על אחד האיים (בהמשך):** בית משאבה קטן. בפנים ברז שמפעיל מזרקה יבשה, וקופסה.
    - **בכפר בהרים (בהמשך):** בית ישן עם עליית גג. בפנים קופסה.
- **קופסת תלתן:**
  - כל קופסה מעלה את התקרה באחד ומגיעה עם עלה תלתן בתוכה.
  - התקרה היא 9 ועוד מספר הקופסאות, עד 13.
  - יש ארבע קופסאות. הרביעית בלי מפתח, על מדף שמגיעים אליו ברגל.
  - שמירות ישנות נשארות עם 9.
- **תצוגה:**
  - סמל המפתח מופיע ב־HUD כשמחזיקים מפתח של האזור.
  - בתפריט ההתנהגות מצוירות קופסאות כמספר התקרה, כמו ב־LBA.
  - במלאי מופיע "7 / 11".
- **שמירה:** פורמט 6, רק דגלים חדשים (kc_).
- **זמן:** כ־22–29 דקות למי שמוצא הכול (הערכה).
- **עלות:** בינונית (M). רק המעבר מתחת למבצר הוא מבנה חדש.
- **סיכונים:**
  - חפיפה עם סיפור של פרק מאוחר.
  - איזון: עם 13 תלתנים כמעט לא מתים.
  - כלי תעופה מאוחרים לא יעקפו את הדלתות.
- **שאלות:**
  - 13 או 12?
  - קופסה עם עלה או ריקה?
  - המפתח נשאר כשיוצאים מהאזור, או נעלם כמו ב־LBA?
  - שלוש דלתות, או גם אחת באזור מאוחר?
  - סמל מפתח ב־HUD?
