# KEYS-CLOVER · Small keys and clover boxes: design card (25.11.2026)

**A design card, BUILT 25.11 on the branch (§6), waiting for the user's pick (P107).** It answers the user's reply of 24.11
(CONTENT-15H "The user's answers", item 3): "bring them back (one key, one door, in one area; clover boxes raise the
clover cap above 9)". §1–§5 are the card as proposed; §6 is what was built after the user's answers of 25.11.
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

## 6. Built (25.11.2026, branch; for the user's pick)

### The user's answers (25.11, P130's picks)
1. **Cap 13:** four boxes (the three behind the key-doors and the desert one on the School's mask), each raising the cap
   by one from 9. Old saves stay at 9 plus the boxes they find.
2. **A clover leaf inside each box:** the cap rises, then the leaf fills it.
3. **A small key stays with Twinsen** after he leaves its area, until its door uses it (no loss, no soft-lock).
4. **A fourth key-door in a late area** (chapters ~10–14); its reward fits; no fifth box.
5. **The key on the HUD** while held: a small key icon with the count, beside the clovers and kashes (PC).

### How it plays
- **K1 · Citadel, chapter 1 on: FunFrock's old passage.** The barred mouth in the north face has a small lock now; its
  tag reads `WATCH KEY · POWDER CHEST, YARD`. In the fort's yard (north-east corner) an old chest stencilled POWDER:
  searching it (E) gives the small key. The lock opens with it (the bar gate swings open) and the mouth is a door: a
  vaulted stone run under the fort (`kc_tunnel`). Inside: box B1 in a side niche, a barred door marked SHELTER (a look;
  it stays rusted shut — chapter 8's shelters are left alone; after chapter 8 its line says "so this is where the old
  tunnels went"), the watch's table and roster (a joke about the tea tin), and at the east end a ladder to the yard's
  trapdoor. Its bolt is drawn from below (E, on the rod beside the ladder); from then on the trapdoor is a **two-way
  shortcut** (up the ladder into the yard; from the yard, E on the trapdoor climbs down).
- **K2 · Otringal, chapter 4 on: the fountain's pump house** (it was "nothing for a visitor"). The door's note: `KEY ON
  THE FOUNTAIN TOP. OUT OF REACH OF CHILDREN AND BIRDS.` The key glints on the top bowl's rim; the **magic ball** knocks
  it off; it lands by the basin on the pump house's side and lies there (saved) until taken (E). Inside (`kc_pump`, the
  islands' Esmer room): the HIGH JET wheel (E): "out on the plaza, something starts to roar" — the plaza fountain's tall
  jet runs from then on (a visible change); BASIN and SPOUT (a look); box B2 on the shelf. The sweeper and Ulla say one
  line each about the jet on the next talk.
  - *Not* a dry fountain made to run, as the card first said: the fountain already runs in the story (its look lines
    `il_fountain*`), so the valve opens its old festival jet instead (no story line contradicted).
- **K3 · Lhar, chapter 6 on: Pim's grandmother's old house, the goats' now.** The door's line: the goats keep nosing at
  their hay rack. Searching the rack beside the door (E) gives the key ("warm, and a little chewed"). Inside
  (`kc_goats`): the goats' stall below (they are out: no goat models were added), a stair along the back wall to the
  loft: Grandma's trunk (a read: buttons sorted by colour, a cheese recipe marked NOT FOR PIM), the loft window (the
  observatory across; after the roof's answer, `rf_roof`, its line notes that Grandma had moved out — nothing answered
  early), box B3 on a crate.
- **K4 · Zeelich, chapter 14 (Baldino's Network) on: Baldino's old mill room** — the fourth door, see below.
- **B4 · Desert Island, chapter 4 on:** box B4 on a stone ledge out of the School mask's east cheek, under the brow tip,
  in the mask's own stone. No key. Reached **on foot** from the hollow's east bank (the walk planner gets there by walking:
  automated); the hop-pack is not needed.
- **The HUD:** while he holds a small key, a round-bowed brass key (`#smallkeys`, its own icon, not the well key's) with
  the count shows beside the kashes, with the panel as the clovers' and kashes' do (it shows for a few seconds after a
  change, as LBA's). The behaviour menu's key count adds the small keys; its box row draws the cap (9 … 13) with the
  leaves filled. The inventory lists "Small key" while one is held; the Clover Leaves read "7 / 11" once a box is found
  (a plain count before). A found box toasts "Clover box: you can carry N clover leaves now". A lock opening floats a
  small key over Twinsen for a second (LBA's key sprite).
- **The cap everywhere:** `hero.cloverMax` (9 + `kc_box_*`) is read at every cap site of the game (18 places: pickups,
  shops, the shop's "max", the givers, the tins and strongboxes that turn a clover into kashes at the cap). The shop's
  clover line reads "Up to nine, one more for each clover box".

### The fourth door (the user's item 4): Baldino's old mill room, Zeelich, chapter 14
- **Why there:** chapter 14 is Baldino's Network; the north mill is "Baldino's old mill", one of its five stations, and
  Twinsen climbs its stair-stones to the gallery to set the relay. The door at the mill's foot (a drawn door until now:
  "nailed shut") becomes his first workshop. LBA's own Baldino is an inventor with a workshop; the room adds lore and
  humour, not a twist.
- **The clue and the key:** from chapter 14 the door reads `SPARE KEY UP TOP · B.` scratched in its frame. The key hangs
  on a nail by the gallery's railing (round the tower from the relay, so the two prompts never meet); taken by the same
  climb (traversal: the stair-stones' jumps). Before chapter 14 the door says only "Locked", and no key hangs there.
- **Behind it:** his first workbench (a toaster that butters its own toast, marked DO NOT USE; a bicycle fan), a photo of
  young Baldino and Oku covered in flour, the cracked first millstone ("RETIRED"), and his biscuit tin: **50 kashes** and a
  note ("For whoever climbed up for the key. Buy Oku a drink."). No box (the four boxes are B1–B3 and B4).
- A save from before chapter 14 never sees it; the expanded and the base campaign both reach it (chapter key `network`).

### Rules kept
- One key per area, found in that area; leaving keeps it; it is spent only in the same step that opens its door. The
  HUD count is `kc_key_<d> && !kc_door_<d>`. Every find, bolt, valve, box and tin saves at once.
- Optional: nothing of the main story needs a key, a box or a room. No key or box hides behind a timing gate; the ball's
  key waits on the bowl for any number of throws; a missed throw changes nothing.
- **Save (format 6, new flags only):** `kc_key_{fort,pump,goat,mill}`, `kc_door_{…}`, `kc_box_{fort,pump,goat,mask}`,
  `kc_bolt_fort`, `kc_pump_drop`, `kc_pump_on`, `kc_tin_mill`, `kc_sweep`, `kc_ulla`. The cap is never stored. On load the
  leaves are clamped to the cap (an old save: 9). A door's flag also sets its key's (a save cut between the two steps
  never holds a key for an open door).

### Files
- New: `src/game/story/keysclover.js` (the module, wired in `story/index.js`), `src/game/keyrooms.js` (the four rooms and
  the outdoor pieces), `src/game/text/keysclover.js`, `src/game/text/he/keysclover.js` (bundled: `src/game/he-text.js`),
  `tests/keys-clover.mjs`, `captures/keys-clover/`.
- Changed: `actors.js` (hero.cloverMax, hero.smallKeys), the cap sites (`main.js` ×2, `story/base.js`, `islandpeople.js`
  ×2, `kit2.js` ×2, `kit2b.js` ×3, `arsenal.js` ×3, `shops.js` ×2, `steam.js`, `prologue.js`, `liftbelow.js` ×1: the one
  wave-6 line, its strongbox's cap), `hud.js` + `index.html` (`#smallkeys`), `behmenu.js`, `inventory.js`, `regions.js`
  (the four rooms), `travel.js` (their regions), `island.js` (the passage's bars drawn by the gate now: `bars: 'kc'`),
  `itemlook.js` (the small key's look), `story/ihomes.js` (the pump house's "shut" line off once it opens), `text/shops.js` + Hebrew (the shop's clover line),
  `tests/door-sweep.mjs` (`FLAGS=` env), `tests/overlap-sweep.mjs` (`kc_*` in its batches). Not touched:
  `story/depth.js`, wave 4's files, `celtemple.js`, `otrbar.js`.

### Results — automated runtime only (SwiftShader, headless Chromium; nobody played)
- `SERVE=1 SHOTS=captures/keys-clover node tests/keys-clover.mjs` — **36 PASS, 0 FAIL, no page or console error**
  (one full run; the parts were run alone while the suite was written). By input where it says INPUT; the rides between
  areas, the yard's entry and the mill's climb down are ISO (logged). It covers: the old chapter-14 save (format 5 → 6)
  at cap 9 with its 4 leaves; the load's clamp to the cap; each key got (the chest, the ball at the fountain then taken,
  the hay, the mill's gallery after the stair-stones' jumps); the key kept across areas and over Save & quit → Continue;
  each lock refused with its clue, then opened (the key spent, the HUD's key gone); each door walked in; each box (cap
  9 → 10 → 11 → 12 → 13, a leaf added each time); the bolt, the ladder to the yard and the trapdoor back down; the valve and
  the jet; the sweeper's line; the loft by the stair and down again; the tin's 50 kashes; the behaviour menu's 13 boxes
  with the leaves; the inventory's "5 / 13" and its Small key; Save & quit → Continue at cap 13.
- `node tools/he-bundle.mjs` then `node tests/dialogue-check.mjs` — **PASS** (5 950 of 5 950 keys have Hebrew).
- `SERVE=1 CHAPTERS=13 ONLY=kc_tunnel,kc_pump,kc_goats,kc_mill FLAGS='{…the four doors open…}' node tests/door-sweep.mjs`
  — **PASS**: in and out of each door, landing clear of the triggers, facing away, standing still 2.5 s goes nowhere;
  walked in straight and 0.3 m to either side at the pump house and the goats' house (the passage's landing and the mill's
  foot leave no 2.6 m run-up: "round what stands before it", as the sweep allows; the suite walked both in).
- `SERVE=1 node tests/door-levels.mjs` — **PASS** (no door with the ground over its sill). It measures the registered
  buildings (worldfit); the four doors' own sills were walked by door-sweep and the suite.
- `SERVE=1 ONLY=kc_tunnel,kc_pump,kc_goats,kc_mill,citadel,isle_otringal,hamalayi,zeelich,desert node tests/overlap-sweep.mjs`
  — **PASS, 0 open findings** in the four rooms and the five areas. After the outdoor pieces were moved into world coordinates (they had
  been placed off their areas in the first run), `ONLY=isle_otringal,zeelich,desert` again: **0 open findings from these
  pieces; 1 open finding that is not ours** — Otringal, a coplanar pair (two merged buffers, #ffffff / #ecdce4, 2.38 m²)
  at (1891.6, 1790.6), 16 m from the fountain. The same finding comes with this module's Otringal pieces switched off
  (a run with them disabled, then restored): it predates this work and is handed to the coordinator (the first run's
  wider ray grid had not sampled it).
- Not measured: frame time (four small rooms, a few dozen meshes, one more lamp per room; the outdoor pieces are a
  handful of meshes), any real GPU, a person's play.

### Pictures (P107: for the user's pick) — `captures/keys-clover/`, the play camera, 960×540, `sheet.png` all of them
kc-01 the passage barred (before) · kc-01b the powder chest in the fort's yard · kc-02 the HUD with a small key (1)
· kc-02b the inventory with the key held (before the small key had its own look) · kc-03 the lock opened: he is straight
in · kc-04 FunFrock's old passage · kc-05 the fountain with its key (before) · kc-06 the pump room · kc-07 the plaza with
the high jet (after; the box's toast over it) · kc-08 the goats' house · kc-09 Grandma's old house · kc-10 the loft ·
kc-11 the mill's gallery with the key · kc-12 Baldino's mill room · kc-13 on the School mask's ledge · kc-14 the
behaviour menu's 13 boxes · kc-15 to kc-18 close views from a staged camera, not the play camera: the key on the top bowl,
the high jet, the mask's ledge with its box, the inventory's Small key (its own round-bowed look).

### Visible world changes (each for the user's pick)
1. Citadel: the passage's bars are a gate with a small lock that swings open once unlocked (kc-01; no outside picture
   of it open: the open door takes him straight in, kc-03).
2. Citadel: the powder chest in the fort yard's north-east corner (kc-01b).
3. Otringal: a small key glinting on the fountain's top bowl; after the valve, the fountain's tall jet (kc-05, kc-15,
   kc-07, kc-16).
4. Desert Island: a stone ledge on the School mask's east cheek with a clover box (kc-13, kc-17).
5. Zeelich: a small key on the old mill's gallery railing, chapter 14 on (kc-11).
6. Four new rooms (kc-04, kc-06, kc-09/10, kc-12); the HUD's small key (kc-02); the behaviour menu's 13 boxes (kc-14);
   the inventory's Small key (kc-02b).

### Open questions and gaps
- **Balance (from §4, still open):** 13 leaves makes deaths rare for a careful player; chapter-balance's clover columns
  were not rerun. The user may prefer 12 (drop B4) later.
- **B4 is walked onto, not jumped to:** the planner reached the ledge by walking from the east bank (the card asked for a
  jump). It is reachable on foot either way; a harder spot can be chosen if the user wants a real jump there.
- The goats are out (no goat model exists; none was made: the rule against primitive characters).
- The trapdoor from the yard is offered by a prompt (E), not walked into (the yard has fights; no accidental entries).
- Opening a lock leaves him standing in the open door, so he goes straight in (as LBA's doors). If the user wants a
  moment outside first, the lock's spot can be moved a step back.
- The small key also has its own inventory look now (itemlook.js `kc_key`): a filled round bow, darker brass.
- Not tested here: a real GPU, a person's play, controller input (PC keyboard only, as the user asked), the Hebrew
  read in play (dialogue-check only), the mill's climb down (a fall; the suite puts him at the door — ISO).

### סיכום בעברית: מה נבנה (25.11)
- **התשובות של המשתמש:** תקרה 13 (ארבע קופסאות), עלה תלתן בכל קופסה, המפתח נשאר אצל טווינסן, דלת רביעית באזור מאוחר, מפתח ב־HUD.
- **ארבע הדלתות:**
  - **סיטדל (מפרק 1):** המעבר הישן של פאנפרוק. על הסורגים תווית שמפנה לתיבת אבק השריפה בחצר המבצר; בתיבה המפתח. בפנים: קופסה, דלת "מקלט" חלודה, ובקצה סולם אל דלת הרצפה בחצר. כשמושכים את הבריח נפתח קיצור דרך בשני הכיוונים.
  - **אוטרינגל (מפרק 4):** בית המשאבה של המזרקה. המפתח על הקערה העליונה של המזרקה; מפילים אותו בכדור הקסם. בפנים: גלגל "הסילון הגבוה" שמפעיל סילון גבוה במזרקה, וקופסה. מנקה הכיכר ואולה מגיבים פעם אחת.
  - **להאר (מפרק 6):** הבית הישן של סבתא, היום של העיזים. המפתח בחציר של האבוס. בפנים מדרגות לעליית הגג: התיבה של סבתא, החלון אל המצפה, וקופסה.
  - **הדלת הרביעית — זיליך (מפרק 14, הרשת של בלדינו):** חדר הטחנה הישן של בלדינו בתחתית הטחנה הצפונית. על המשקוף: "מפתח רזרבי למעלה". המפתח על המעקה במרפסת הטחנה (מטפסים באבני המדרגות). בפנים: שולחן העבודה הראשון שלו, תמונה, אבן הריחיים הסדוקה, וקופסת עוגיות עם 50 קאשים. בלי קופסת תלתן.
- **הקופסה הרביעית:** על מדף אבן בלחי המזרחית של מסכת בית הספר לקסם, באי המדבר. מגיעים ברגל מהגדה המזרחית.
- **תצוגה:** מפתח פליז קטן עם המספר ליד הקאשים כשמחזיקים מפתח; בתפריט ההתנהגות שורת קופסאות כגובה התקרה; במלאי "מפתח קטן" ו"5 / 13".
- **שמירה:** פורמט 6, דגלי kc_ חדשים בלבד; שמירה ישנה נטענת עם תקרה 9.
- **בדיקות:** אוטומטיות בלבד (SwiftShader). אף אדם לא שיחק.
- **פתוח:** איזון (13 עלים), הקופסה במדבר מגיעים אליה בהליכה ולא בקפיצה, העיזים "בחוץ" (אין דגם עז).

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
