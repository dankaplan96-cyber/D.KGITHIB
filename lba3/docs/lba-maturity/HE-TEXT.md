# HE-TEXT — the whole game in Hebrew, alongside the English

**The standing rule: every new or changed English player line gets its Hebrew line the same day**, in the matching
`src/game/text/he/<file>.js`, **then `node tools/he-bundle.mjs`** (16.11: the game loads the Hebrew packed into one
module, `src/game/he-text.js` — the artifact holds at most 512 files; dialogue-check fails while it is out of date). `node tests/dialogue-check.mjs` lists the English keys with no Hebrew (a warning with a
count; `--he` per file, `--he-missing [file]` the keys) and fails on a Hebrew line whose placeholders, list length or
markup differ from the English, on an empty Hebrew line and on a night word in Hebrew.

The user (16.11, confirmed): the whole game available in Hebrew too — every dialogue line, objective, journal note,
prompt, caption and item text — switched by the language setting. English stays the default and the source of truth.
Evidence labels: **Automated runtime only** (tests/hebrew.mjs, dialogue-check) and **Source only** (the translation
itself, read against the English and its scene's comments). No line was heard or read in a played session.

## Architecture

- `src/game/text/<file>.js` fills `STR.en`; its Hebrew is `src/game/text/he/<file>.js` (same file name), which fills
  `STR.he`. Each English file imports its Hebrew file on its second line (`import './he/<file>.js'`), so the Hebrew
  loads exactly when, and in the order, the English does (a key the English defines twice keeps the same "later file
  wins" in Hebrew). `t(key)` = `STR[lang][key] ?? STR.en[key] ?? key`: a key with no Hebrew shows the English.
- i18n.js's own English table (menus, settings, saves, the HUD's words, the prologue lines kept there) has its Hebrew
  in `src/game/text/he/i18n.js` (a plain exported object: i18n.js imports it, no cycle). The old Hebrew tables in
  i18n.js and inside ch1.js / ch2.js / common.js / world.js (from the game's Hebrew beginnings, stale against today's
  English) were removed; dialogue-check fails if an English text file sets `STR.he` again (it would override he/).
- Same keys, same placeholders (`{n}`, `{k}` …), same number of entries in a list (code may index a list).
- **The voices speak the English.** The dialogue box and the subtitles are given text, not keys; the voice plans its
  phrases, length and delivery (text/voicemeta.js, looked up by the English text) from the words. `spoken(text)` in
  i18n.js maps a displayed Hebrew line back to its English source (a reverse table built from STR.he/STR.en, list
  entries one by one, a line with placeholders by its pattern; rebuilt when a text module adds keys). It is applied in
  `engine/voice.js`: `Babble.chars` (every line the box or a subtitle types: `babble.said` keeps what was voiced) and
  `planVoiceLine` (a cinematic's gesture timing). With English on screen it returns the text untouched, so the English
  game is unchanged. A Hebrew line it cannot map (a line built from pieces) is voiced from its own text and listed in
  `spoken.miss`. No voice clip depends on a line's text (the banks are phrase clips chosen at runtime): nothing to
  regenerate.
- **The setting**: Settings → Game → Language (`settings.lang`, `en` | `he`, with a one-line hint). A language stored
  before this row existed (`langV` missing) loads as English: the game was English-only, whatever was stored. Changing
  it applies at once (applySettings: `<html lang dir>`, the `data-i18n` menus, the HUD, the objective).
- **Right to left**: `<html dir="rtl">` in Hebrew; the layout already used logical sides (inset-inline, margin-inline,
  text-align: start), so the dialogue box's name tag and arrow, the tip panel, the objective, the inventory and journal
  mirror by themselves. css/style.css "HE-TEXT" block: no letter spacing on Hebrew (tabs, the journal's "Now", the
  chapter card, the settings tabs and fold, title captions); key caps (`kbd`), `bdi`, the speaker's name and a
  subtitle's speaker are bidi-isolated; the dialogue text, subtitles, item and journal lines, toasts and the found-box
  name use `unicode-bidi: plaintext` so a line still in English (a fallback) keeps its own direction. `#cine-sub b`
  uses margin-inline-end.
- Not translated (by design or out of reach): the 3D painted signs on Citadel (props.js LABELS "SQUARE", "LIGHTHOUSE";
  the valve room's board) are textures in the world's art, English in both languages; developer views (voicelab).

## Glossary (names transliterated once, used everywhere)

| English | Hebrew | note |
|---|---|---|
| Twinsen | טווינסן | male; the player is addressed in the masculine |
| Zoé | זואי | |
| Arthur | ארתור | |
| Baldino | בלדינו | |
| Vesk | וסק | |
| Sendell | סנדל | **female** (the English says "she") |
| FunFrock | פאנפרוק | |
| Twinsun | טווינסאן | the planet, feminine |
| Zeelich | זיליך | |
| Citadel Island | אי סיטדל | not "האי המצודה": the island has a real fortress (המבצר הישן) |
| Desert Island | האי המדברי | |
| Kashes | קאשים (sing. קאש) | the brief suggested קשים; קאשים kept (the old Hebrew table's word, and קשים reads "hard") — one replace if the user prefers |
| Kesh | קש | |
| the Joint Project | המיזם המשותף / המיזם | |
| the bore / the drill | הקידוח / המקדחה | |
| the shell | הקליפה | |
| heat post | עמוד חום | |
| holomap | הולומפה | |
| magic ball | כדור הקסם | |
| clover leaf | עלה תלתן | |
| behaviours | רגיל · אתלטי · אגרסיבי · דיסקרטי | |
| Esmer(s) | אסמרי / אסמרים | |
| Grobo(s) | גרובו / גרובואים | |
| Sphero(s) | ספרו / ספרואים | |
| Mosquibee(s) | מוסקיבים | |
| Wannie(s) | וואני / וואנים | |
| Quetch | קווץ' | |
| Dino-Fly | הדינו־זבוב | |
| Meca-Penguin | פינגווין מכני | |
| Ker'aooc | קר'אווק | male (the user, 17.11: "by the look": the bearded gnome wizard; he in English and Hebrew) |
| Bersimon, Weather Wizard | ברסימון, קוסם מזג האוויר | |
| Rector Hougo | הרקטור הוגו | |
| School of Magic | בית הספר לקסם | |
| Whispering Cliffs | צוקי הלחישה | |
| water office | משרד המים | |
| spaceport | נמל החלל | |
| bypass valve | שסתום עקיפה; a cock = מגוף | |
| pump room / gauge strip | חדר המשאבות / רצועת המד | |
| Mill Lane / Irsa's Pump Works | סמטת הטחנה / בית המלאכה למשאבות של אירסה | |
| Kettle Crystals | גבישי הקומקום | |
| override key | מפתח עקיפה | |
| Hamalayi | ההמלאיה | |
| Lila (a pupil) | לילי | לילה is "night": the night-word rule |

Speakers' sex (for verbs and adjectives): engine/voice.js `WOMEN` / `MEN` lists, then the English text's pronouns; the
residents' bodies (walkrounds.js `char`) for the rest (Safi a girl, Tamu a boy, Neska a woman, Dot a girl).

Style: objectives and journal "to do" lines in the infinitive (לבדוק את הבאר); journal notes in Twinsen's first person,
past tense; system tips and settings in the plural imperative (לחצו, בחרו), as the menus' Hebrew already was;
on-screen prompts as nouns (דיבור, בדיקה, פתיחה). No night, evening, sunset or dawn words (לילה, ערב, שקיעה, זריחה,
שחר, דמדומים): "back for dinner" is "בזמן לאוכל".

## Examples (English → Hebrew), one or two per voice

- Twinsen (warm, direct): "Then give the water back." → "אז תחזירו את המים." · "I'm coming home. Tell your mother. Tell everyone: nobody gets left behind." → "אני חוזר הביתה. תגיד לאמא. תגיד לכולם: אף אחד לא נשאר מאחור."
- Zoé (clear, assured, dry): "Don't worry. I raised Arthur. I know how to sneak." → "אל תדאג. גידלתי את ארתור. אני יודעת להתגנב." · "Not bad for an old hero. Now, the well." → "לא רע בשביל גיבור ותיק. עכשיו, הבאר."
- Arthur (lively): "I fixed the radio! Me! That counts as helping, right?" → "תיקנתי את הרדיו! אני! זה נחשב עזרה, נכון?" · "Knock, knock, knock. If it's a plumber, he's very small." → "טוק, טוק, טוק. אם זה שרברב, הוא קטן מאוד."
- Baldino (excitable inventor): "No, no, no! Stop it halfway and the shell cracks on its own." → "לא, לא, לא! תעצור אותה באמצע, והקליפה תיסדק מעצמה." · "One isolator, one relay. Never two. I tried. Twice. The second time I lost an eyebrow." → "מבודד אחד, ממסר אחד. אף פעם לא שניים. ניסיתי. פעמיים. בפעם השנייה איבדתי גבה."
- Vesk (measured, persuasive): "I'm an engineer, Zoé. I calculate capacities. I don't make promises." → "אני מהנדס, זואי. אני מחשב קיבולות. אני לא מבטיח הבטחות." · "A bypass left on the wrong setting. My fitters will hear of it." → "מעקף שהושאר על הכיוון הלא נכון. המתקינים שלי ישמעו על זה."
- Sendell: "I cannot do this alone any more. You will have to help me, all of you." → "אני לא יכולה לעשות את זה לבד יותר. תצטרכו לעזור לי, כולכם."
- Residents: Gilbert "So I'm paying for an empty pipe?" → "אז אני משלם על צינור ריק?" · Mira "This is the water office. I tell them: zone wet." → "זה משרד המים. אני אומרת להם: אזור רטוב." · Doran "Waiting is what harbours are for." → "בשביל זה יש נמלים, בשביל לחכות." · Mr Pelleck "I do not panic. I file." → "אני לא נכנס לפאניקה. אני מתייק."
- UI: "{k} Switch to Athletic: run and jump" → "{k} מעבר לאתלטי: ריצה וקפיצה" · objective "Check the well" → "לבדוק את הבאר" · journal "Mira won't unlock the well for what she calls a pipe fault." → "מירה לא תפתח את הבאר בגלל מה שהיא קוראת לו תקלה בצנרת."

## Coverage (dialogue-check --he; keys translated / keys the English file sets)

**4,730 of 4,730 keys in src/game/text/*.js (100 %)**, plus i18n.js's own table (261/261, in text/he/i18n.js) and the
Dino-Fly's five lines (in dinofly.js beside their English). Per file: i18n.js 261/261 · answer 63/63 · arsenal 105/105 ·
ch1 146/146 · ch10 97/97 · ch2 117/117 · ch3 128/128 · ch4 141/141 · ch5 76/76 · ch6 69/69 · ch7 54/54 · ch8 63/63 ·
ch9 84/84 · cnline 92/92 · common 244/244 · deeplife 33/33 · depth 41/41 · desertlife 127/127 · digtest 72/72 ·
ferry 97/97 · hamlife 71/71 · hostel 58/58 · ihomes 162/162 · interiors 188/188 · islandpeople 243/243 · islands 51/51 ·
isleslife 93/93 · kesh 50/50 · kit2 37/37 · kit2b 59/59 · laneline 67/67 · life 89/89 · magic 20/20 · map 76/76 ·
netline 57/57 · offwall 65/65 · oneplace 79/79 · opening 74/74 · passline 36/36 · purposes 63/63 · quietchannel 58/58 ·
sewers 67/67 · shops 38/38 · stands 39/39 · storylife 130/130 · thread 165/165 · walkers 191/191 · well 55/55 ·
workshop 48/48 · world 18/18 · yearslate 57/57 · zeelife 116/116. No Hebrew line carries a Latin word other than key
names and brand names (a scan of STR.he).

Order of work (commits): the architecture; chapters 1–2 (opening, well, ch1, common) and the RTL CSS with
tests/hebrew.mjs; chapter 3 (ch2, thread, workshop) with the signs, holomap and magic; Citadel's people (walkers,
interiors, life, storylife, stands, shops, purposes, sewers, hostel, arsenal, kit2, kit2b); Zeelich's street and islands;
chapters 4–5 (ch4, digtest, depth, deeplife, desertlife, kesh, ch5); 6–8 (ch6, passline, hamlife, ch7, ch8, laneline);
9–10 (ch9, cnline, ch10, netline, isleslife); 11–12 and the epilogue (ch3, answer); the side quests U-1…U-5 (ferry,
oneplace, offwall, yearslate, quietchannel).

## Tests

- `node tests/dialogue-check.mjs [--he] [--he-missing [file]]` — the static checks above. PASS; Hebrew 4,730 / 4,730.
- `tests/hebrew.mjs` (browser, Automated runtime only): the Language row by clicks, kept after a reload; the house's
  tip panel and Arthur's box in Hebrew, right to left, inside the screen; the cupboard; the yard's tip; Zoé's box at
  1280×720 and 1920×1080 (no spill); the rest of the yard (P.openingYard) with no dialogue overflow; every line shown in
  Hebrew voiced from its English source (a spy on the voice's line: 8 lines, none voiced in Hebrew); the objective,
  the pause menu's objective, the inventory and journal in Hebrew (no scroll, no spill, both sizes); back to English.
  `SHOTS=1` writes captures/hebrew/*.jpg (1920×1080). **PASS (17/17).**
- Run on a snapshot of the worktree (port 8987, swiftshader), one browser at a time: hebrew PASS · menus PASS (updated:
  the Language row, Camera Shake under Advanced) · inventory-calm PASS (its own Hebrew section) · opening-tutorial PASS
  · chapter1 PASS · voices PASS (after its file list skipped the new he/ folder) · voice-phrase: one timing check failed
  in each of two runs, a different one each time (an Expressive line's start 6.8 ms against 5; the Words voice's first
  sound 438 ms against 400), on a machine shared with other agents' suites; every functional check passed. English mode
  does no extra work per line (spoken() returns at once). · save-migration PASS (27 checks, 62 min).
- Pictures (chapter 1, 1920×1080): captures/hebrew/01-house-dialogue.jpg (Arthur), 02-yard-tip.jpg (the tip panel and
  Zoé's call), 03-yard-zoe-dialogue.jpg, 04-inventory.jpg, 05-journal.jpg.

## Open points

- Ker'aooc: **decided by the user, 17.11: male** ("go by the look"): the English and the Hebrew say he; the voice stays among the men.
  The Hebrew follows the text. A story/voice decision for the campaign director.
- "קשים" vs "קאשים" for kashes; "אי סיטדל" vs "האי המצודה" (see the glossary): one replace each if the user prefers.
- Settings: the Language row is first on the Game page; to keep every page at five rows before Advanced (the menus
  test's rule), Camera Shake moved under a new Advanced fold on the Game page.
- English left inside Hebrew on purpose: key and button names ("Space", "Shift", "LT"), brand names; a few hints the code
  puts together with an English fragment (the lock hint's "/ right-click", the Auto quality hint's ", settling") stay
  English in both languages.
- 3D painted sign textures (props.js LABELS: SQUARE, LIGHTHOUSE …; the valve room's board) are world art: English in
  both languages.
- Chapter 4's coil of rope: the coordinator renamed it on main to `it_ropecoil` / `itd_ropecoil` (`it_rope` is now the
  prologue's Rope Ladder only). text/he/ch4.js already uses the new keys; on this branch, before the merge, ch4.js's
  English still says `it_rope`, so dialogue-check counts 2 of its keys without Hebrew. After the merge: 100 %.
- Switching language mid-game re-renders the menus, HUD and objective at once; a text drawn once into a scene (a
  canvas sign) follows at the next build of that scene.
- Not read in play by a Hebrew reader: the translation is source-reviewed; hebrew.mjs only shows it is on screen,
  laid out and voiced from the English.

## Resume point

The translation is complete by key count. What remains is review, not coverage: a native read of the Hebrew in play
(chapters 3–12 and the side quests were checked from source and by dialogue-check only), the open points above, and
keeping the standing rule. A new English line: write its Hebrew in the matching text/he/<file>.js the same day, run
`node tests/dialogue-check.mjs --he`, and the Hebrew line count must stay 100 %.
