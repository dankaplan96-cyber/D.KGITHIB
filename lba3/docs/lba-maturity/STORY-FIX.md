# STORY-FIX (19.11.2026): the contradictions DIALOGUE-EDIT flagged, and residents heard in the wrong state

Plan item 4 of NEXT-SESSION.md ("The plan to continue"). Worker branch `worktree-agent-ab6c21d2e138f5cc8`, from
`ccr-c1c2c4b9-dep6ed` at `f6e7ce5c`. Brief: fix the line or its gating, not the scene; keep voices and outcomes; no flag
changes their meaning; no save field added. Every changed English line has its Hebrew (`src/game/text/he/<file>.js`,
`node tools/he-bundle.mjs`).

**Evidence labels.** *Source*: read in the code that plays it (the story module, its conditions). *Automated runtime
only*: `tests/story-fix.mjs` started a new game in headless Chromium (SwiftShader), set each state through the story's
own flags (`chapterKey`, `c5_vent`, …) and asked the residents' own code what it says (hostel.js `talkFirst`,
desertlife.js `interact`, ihomes.js `talkFirst`, kesh.js `lifePhase`), reading every line from `game.say`. Staged, not
played: nobody walked to these people, and no line was heard or read in its scene by a person.

## 1. Dallan and the dock guard

**What was wrong (source).** STORY_BIBLE said Dallan was the guard who took the evacuation plan on Zeelich. The game
never says so: the dock guard is an unnamed "Project security" (`c2_guard_dock*`, chapter2.js `confiscate`), and Dallan
himself says he "stood guard over that dig for a year" (`c9_dallan_3`, `c10_dallan_1`). Two of Twinsen's lines assumed
the bible's version: `c4_tw_d1` ("Your guards took…", dig.js, chapter 4) and `c5_tw_gate2` ("You knew that on Zeelich",
steam.js and digtest.js, chapter 5 at the relief gate). Dallan was never on Zeelich before chapter 9.

**Change.** The game's version wins (it is what the player sees); the lines point at what the player saw.

| Key | Old | New |
|---|---|---|
| `c4_tw_d1` EN | Your guards took Vesk's evacuation plan from me on Zeelich. You know what it says. | Project security took Vesk's evacuation plan off me on Zeelich. You know what it says. |
| `c4_tw_d1` HE | השומרים שלך לקחו ממני את תוכנית הפינוי של וסק בזיליך. אתה יודע מה כתוב בה. | אבטחת המיזם לקחה ממני את תוכנית הפינוי של וסק בזיליך. אתה יודע מה כתוב בה. |
| `c5_tw_gate2` EN | Your orders say sixty people stay behind. You knew that on Zeelich. | Your orders say sixty people stay behind. 'Thirty percent. I know.' Your words, at the dig. |
| `c5_tw_gate2` HE | …ידעת את זה בזיליך. | …"שלושים אחוז. אני יודע." המילים שלך, בחפירה. |

"Project security" echoes the dock guard's own first words and Dallan's later "I was project security": same uniform, not
the same man. The gate line quotes `c4_dallan_3` ("...Thirty percent. I know."), which plays in the dig scene that always
comes before either gate scene. STORY_BIBLE's chapter-4 cast line now says Dallan is not the dock guard.

## 2. Chapter 8: the shelters and the lane's cart

**What was wrong (source).** The main path puts the town in FunFrock's shelters because the project's ships take only
its list (`c8_zoe_2`); the lane thread (laneline.js) has Zoé work to get Bram, Hedda and Tobin onto the project's list
cart, which drives them to the ships' queue on the bridge. The thread's own schedule says why (they are on the list:
`ev_z_sched`), but nobody said it as the reason for choosing the cart over the shelters, and the journal ended at "the
lane boarded it" with no destination.

**Change.** Outcome kept (the user's treatment: the lane is on the list and the cart skips it). Zoé now says the reason,
and the journal says where they went and who the shelters are for.

| Key | Old | New |
|---|---|---|
| `ev_z_go` EN | Then they wait at the cart's own stop, where the driver can't miss them. The landing by the pump house. | Those three are on the list: the seats on the ships are theirs. So they wait at the cart's own stop, the landing by the pump house, where the driver can't miss them. |
| `ev_z_go` HE | אז שיחכו בתחנה של העגלה עצמה, איפה שהנהג לא יכול לפספס אותם. הרחבה ליד בית המשאבה. | שלושתם ברשימה: המקומות בספינות שייכים להם. אז שיחכו בתחנה של העגלה עצמה, ברחבה ליד בית המשאבה, איפה שהנהג לא יכול לפספס אותם. |
| `ev_j_board` EN | The cart came in through the gate, and the lane boarded it. | The cart came in through the gate, and the lane rode it to the ships' queue on the bridge. The shelters are for everyone the list left out. |
| `ev_j_board` HE | העגלה נכנסה דרך השער, ואנשי הסמטה עלו עליה. | העגלה נכנסה דרך השער, ואנשי הסמטה נסעו בה לתור לספינות על הגשר. המקלטים הם לכל מי שהרשימה השאירה בחוץ. |

## 3. Gilbert, "Grandpa"

**What was wrong (source).** Arthur says "Grandpa Gilbert" (`c8_ar_2`, the user's `om_m_council_4`); the family speaks of
"Grandpa's radio" (chapter 2) and Zoé of "Grandpa's old charts" (chapter 5, `idle_zoe_pass`); chapter 1 shows Gilbert as
a neighbour with his water bill, called "Gilbert" by Twinsen. U2-ONE-MORE-PLACE.md had already settled it: "Grandpa
Gilbert" is Arthur's own name for him. What was missing: any tie between Gilbert and Arthur in chapter 1, a first
"Grandpa" that says who is meant, and Zoé (talking to her husband) using the child's name without it.

**Change.** Gilbert stays the old neighbour; Arthur's title for him is shown, not explained.

| Key | Old | New |
|---|---|---|
| `pr_gil_told` EN (ch. 1, after the lid's kick, if Gilbert is near) | Told you. | Told you. Same kick I taught Arthur. |
| `pr_gil_told` HE | אמרתי לך. | אמרתי לך. אותה בעיטה שלימדתי את ארתור. |
| `c1_zoe_home3` EN (ch. 2, home) | Arthur, you promised to fix Grandpa's radio. … | Arthur, you promised to fix Grandpa Gilbert's radio. … |
| `c1_zoe_home3` HE | …את הרדיו של סבא. … | …את הרדיו של סבא גילברט. … |
| `c5_zoe_radio1` EN | …Ilka's map matches Grandpa's old charts. … | …Ilka's map matches Gilbert's old charts. … |
| `c5_zoe_radio1` HE | …למפות הישנות של סבא. … | …למפות הישנות של גילברט. … |
| `idle_zoe_pass` EN | Take the thick scarf. Grandpa's charts say… | Take the thick scarf. Gilbert's old charts say… |
| `idle_zoe_pass` HE | …במפות של סבא כתוב… | …במפות הישנות של גילברט כתוב… |

Arthur's own "Grandpa's radio" lines (`c1_ar_radio1`, `c1_ar_idle`, `om_ar_here`) and both "Grandpa Gilbert" lines stay:
after Zoé's line they read as Gilbert's radio in Arthur's mouth. Gilbert's charts fit his part ("old FunFrock days").

## 4. Residents heard in the wrong state (deeplife, hostel, sewers, Kesh)

Each module's conditions were read against the chapters in which they play.

| Module | Found (source) | Change |
|---|---|---|
| `story/deeplife.js` (under the shell) | Nothing wrong. Phases `shell`/`core`/`home` from the chapter key; Baldino's collar lines follow `c3_cooled`/`c3_sendell`; the chamber's arch is grown shut after Sendell (answer.js), so `dp_bal_shell2` is only reachable in an old save, where it is still true; the core is closed during the fight and the chapter ends at once after it (chapter3.js `canExit`, `finish`). `dp_tea` "That was weeks ago" is loose against the chapter-8 deadline (see Open) but not wrong. | none |
| `story/hostel.js` | Phase `l` is chapters 9–12 **and** the epilogue. The cook's `hs_cook_l` "When this is all done I'm cooking for the whole town" was heard after it was all done. Phase `v` is chapter 1 on: the foreman named "Mr Vesk" in chapter 1, a chapter written to have no Vesk until Zoé names him in chapter 2. | Cook: a line true in both. Foreman: "the chief engineer". |
| `story/sewers.js` | Nothing wrong: Fosse, Bersimon and Arthur follow their own flags (`sw_valve`, `sw_works`, `sw_chest`, `sw_globe`); every line is true in every chapter they can play in. | none |
| `story/kesh.js` + its readers (desertlife.js, citizens.js, ihomes.js) | `lifePhase` 'after' runs from the vent's opening **in chapter 5** through chapters 6, 7, 9, 11 and 12. Three 'after' lines were only true in chapters 6–7: Hesk's board "GLIDER. HESK IS NORTH. BACK SOON" (and "the ferry's line is back") was read in chapter 5 after the vent, while the ferry was still the project's (kesh.js keeps it gone until chapter 6) and Hesk still in Kesh, and again in 9, 11, 12 after he had come back south (ch. 8); Tamu's "Hesk flew off in FunFrock's glider" before he had; Hanna's "Hesk's mat has been empty since he flew north" before he had and after he was back. The rest of Kesh's lines (Brosk, Lumi, Sani, the homes, the boards) hold in their states. | Board: chapter 5 after the vent reads the chapter's own NO FERRY board (a gating line in desertlife.js `interact`, beside the existing chapter-5 `early` rule); the 'after' board, Tamu and Hanna: lines true in every 'after' chapter. |

| Key | Old | New |
|---|---|---|
| `hs_cook_l` EN | When this is all done I'm cooking for the whole town. You'll come. Bring your boy, the one with the radio. | Soon I cook for the whole town. A feast, not shelter soup. You'll come. Bring your boy, the one with the radio. |
| `hs_cook_l` HE | כשכל זה ייגמר, אני מבשלת לכל העיר. … | בקרוב אני מבשלת לכל העיר. משתה, לא מרק של מקלט. … |
| `hs_foreman_v[1]` EN | …Mr Vesk's own men keep it. … | …The chief engineer's own men keep it. … |
| `hs_foreman_v[1]` HE | …האנשים של מר וסק עצמו שומרים עליו. … | …האנשים של המהנדס הראשי עצמו שומרים עליו. … |
| `dl_board` EN | Hesk's stop. The ferry's line is back. A new line in chalk: GLIDER. HESK IS NORTH. BACK SOON. | Hesk's stop. The ferry's line is back. A new line in chalk: GLIDER. ASK HESK, IF YOU CAN CATCH HIM. |
| `dl_board` HE | …דאון. הסק בצפון. תכף חוזר. | …דאון. לשאול את הסק, אם מצליחים לתפוס אותו. |
| `rs_tamu_kafter` EN | Hesk flew off in FunFrock's glider. I ran after it till the beach ran out. | When the vent blew, I ran there first. Then I ran away first. Still first. |
| `rs_tamu_kafter` HE | הסק עף בדאון של פאנפרוק. רצתי אחריו עד שנגמר החוף. | כשהפתח התפרץ, רצתי לשם ראשון. ואז ברחתי משם ראשון. עדיין ראשון. |
| `ih_hanna_after` EN | Hesk's mat has been empty since he flew north. Nobody else sleeps on it. House rule. | Hesk's mat stays made for whenever he's back. Nobody else sleeps on it. House rule. |
| `ih_hanna_after` HE | המחצלת של הסק ריקה מאז שהוא עף צפונה. … | המחצלת של הסק נשארת מוצעת לכל פעם שהוא חוזר. … |

Gating change (story/desertlife.js `interact`, one condition): the board, in chapter 5 with the ferry taken and Kesh
already 'after', reads `dl_board_steam` (the chapter's own NO FERRY board). No flag added or changed.

## Verification

| Check | Result | Label |
|---|---|---|
| `node tests/dialogue-check.mjs` | PASS at every commit (5193 keys; Hebrew 100 %) | static |
| `GAME_URL=… node tests/story-fix.mjs` | PASS 15/15, no page or console errors | Automated runtime only (staged) |
| tests' regexes against the old wording | none of the changed English is asserted by another suite (grep of tests/) | source |

story-fix.mjs, what it shows: the edited texts in English and Hebrew as the game loads them; the cook's line in chapters
9, 12 and the epilogue (phase `l`); the foreman's three chapter-1 lines without "Vesk"; Kesh's state and Hesk's board and
Hanna in chapter 5 before and after the vent, chapters 6, 9, 10, 11 and the epilogue (10 and the epilogue keep their own
lines). Tamu's line is checked as text only (citizens.js picks it by `rs_tamu_k<state>`, which the state check covers).
Not run: the chapter suites (chapter 4/5/8 scenes play the same keys in the same order; no chain or condition of theirs
changed), and no line was seen in its dialogue box.

## Open (for the user / the narrative owner)

- **The chapter-8 deadline.** Vesk says "Full depth in three days" (`c8_vesk_1`, `c9_tw_arrive`); chapters 9 and 10 then
  have Twinsen at Zeelich's council and at five stations across both planets before the descent. Not contradicted by any line
  this pass found, but tight; worth a look when the timeline is next checked (`dp_tea`'s "weeks ago" sits in it too).
- **dl_carving** (the temple's carving after chapter 4): "someone has added a second tick, far to the north" is read in
  chapter 5 after the vent, before Zoé has found the northern vent on the radio. Left: a tick can mean "found", and it
  is only wrong for a few minutes of chapter 5.
- DIALOGUE-EDIT's remaining items 2–3 (the spaceport/terminal lines after SPACEPORT-2/3, the pump room after P37/P39)
  were not part of this job.
