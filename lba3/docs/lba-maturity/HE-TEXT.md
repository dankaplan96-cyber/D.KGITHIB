# HE-TEXT — the whole game in Hebrew, alongside the English

**The standing rule: every new or changed English player line gets its Hebrew line the same day**, in the matching
`src/game/text/he/<file>.js`. `node tests/dialogue-check.mjs` lists the English keys with no Hebrew (a warning with a
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
| Ker'aooc | קר'אווק | female in Hebrew (the English says "she"); see open points |
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

## Examples (English → Hebrew)

- Twinsen: "Then give the water back." → "אז תחזירו את המים." · "The shell? What shell?" → "הקליפה? איזו קליפה?"
- Zoé: "Don't worry. I raised Arthur. I know how to sneak." → "אל תדאג. גידלתי את ארתור. אני יודעת להתגנב."
- Arthur: "I fixed the radio! Me! That counts as helping, right?" → "תיקנתי את הרדיו! אני! זה נחשב עזרה, נכון?"
- Baldino: "No, no, no! Stop it halfway and the shell cracks on its own." → "לא, לא, לא! תעצור אותה באמצע, והקליפה תיסדק מעצמה."
- Vesk: "I'm an engineer, Zoé. I calculate capacities. I don't make promises." → "אני מהנדס, זואי. אני מחשב קיבולות. אני לא מבטיח הבטחות."
- Gilbert: "So I'm paying for an empty pipe?" → "אז אני משלם על צינור ריק?"
- Mira: "This is the water office. I tell them: zone wet." → "זה משרד המים. אני אומרת להם: אזור רטוב."
- A tip: "{k} Switch to Athletic: run and jump" → "{k} מעבר לאתלטי: ריצה וקפיצה"

## Coverage (dialogue-check --he; keys translated / keys the English file sets)

See the latest numbers with `node tests/dialogue-check.mjs --he`. Done so far (each file complete):
i18n.js 260/260, opening, well, ch1 (chapter 2), ch2 (chapter 3), common, thread, world, map, magic, life, walkers,
interiors, storylife, stands, shops, purposes, sewers, hostel, arsenal, kit2, kit2b, workshop.

## Tests

- `node tests/dialogue-check.mjs [--he] [--he-missing [file]]` — the static checks above. PASS.
- `tests/hebrew.mjs` (browser, Automated runtime only): the Language row by clicks, kept after a reload; the house's
  tip panel and Arthur's box in Hebrew, right to left, inside the screen; the cupboard; the yard's tip; Zoé's box at
  1280×720 and 1920×1080 (no spill); the rest of the yard (P.openingYard) with no dialogue overflow; every line shown in
  Hebrew voiced from its English source (a spy on the voice's line); the objective, the pause menu's objective, the
  inventory and journal in Hebrew (no scroll, no spill, both sizes); back to English. `SHOTS=1` writes
  captures/hebrew/*.jpg (1920×1080).

## Open points

- Ker'aooc: the English text calls her "she" (purposes.js), the voice table lists her among the men (voice.js MEN).
  The Hebrew follows the text. A story/voice decision for the campaign director.
- "קשים" vs "קאשים" for kashes; "אי סיטדל" vs "האי המצודה" (see the glossary): one replace each if the user prefers.
- 3D painted sign textures stay English (world art).
- Switching language mid-game re-renders the menus, HUD and objective at once; texts built once into a scene (a
  sign's canvas, a holomap label already drawn) follow at the next build of that scene.

## Resume point

Run `node tests/dialogue-check.mjs --he` for the files still at 0. The order chosen: chapter 3's remaining
(zeelife, islandpeople, islands, ihomes), chapter 4–5 (ch4, digtest, depth, deeplife, desertlife, kesh, ch5), 6–7
(ch6, passline, hamlife, ch7), 8–10 (ch8, laneline, ch9, cnline, ch10, netline, isleslife), 11–12 and the epilogue
(ch3, answer), the side quests U-1…U-5 (ferry, oneplace, offwall, yearslate, quietchannel). For each: read the English
file with its comments, write `he/<file>.js` with the same keys in the same order, run dialogue-check, commit.
