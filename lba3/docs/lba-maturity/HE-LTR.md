# HE-LTR — Hebrew: only the text right to left

The user (17.11, playing in Hebrew): "When the game is in Hebrew, switching between the modes is also reversed with
the arrows. In Hebrew, the ONLY thing that should be RTL is the text; everything else as in the English version."

Evidence label: **Automated runtime only** (Chromium, swiftshader, a snapshot served on port 8981). Nobody has played
or read these screens in a real session.

## The rule

- The page is `dir="ltr"` in every language (main.js applySettings: `<html lang="he" dir="ltr">`). Every box, its
  place, the order of tabs, slots, behaviours, segmented choices and buttons, the side of a name tag, a close button,
  the minimap and the HUD bars, and what ← / → do are English's.
- Each text reads by its own first letter: css/style.css gives every element in Hebrew `unicode-bidi: plaintext`
  (zero specificity, `:where(:root[lang=he]) :where(:not([dir]))`). An element's `direction` stays `ltr`, so its
  logical sides and a flex or grid row keep English's order; only its paragraph runs right to left when it starts in
  Hebrew. A line still in English (a fallback), a number or a key name stays left to right.
- **Alignment (chosen once, used everywhere):** a Hebrew paragraph starts at the right edge of the same box English
  starts at the left of (`text-align: start` follows the paragraph). A centred text stays centred. Boxes that fit their
  text (buttons, labels, prompts, the tip panel) look the same either way.
- An inline element (a key cap, a name in bold, a span) is an isolate, so the punctuation round it stays put. Key caps
  are left-to-right isolates; key caps side by side (with " / " or "+" between) form one left-to-right group, so
  [←][→] and WASD keep English's order inside a Hebrew sentence.
- **Key hints** keep English's arrangement (i18n.js `keyHints`, applied by `t()` in Hebrew to any string holding a
  `<kbd>`, and by the HUD prompt, the dialogue box's key hint, the inventory's More / Use buttons): a key-led hint
  ("[E] דיבור", "[W] הליכה · [←][→] פנייה", "[I]: שימוש") has its keys on the left and each label after its keys, the
  label read right to left; a label with one key after it ("עוד [Space]") keeps the key on the right; a key inside a
  sentence ("החזיקו [Alt] כדי לראות איפה הוא נוחת") stays in the Hebrew sentence. The plain-text controls lines (the
  inventory's footer, the holomap's) go through `hintLine`: each "keys: label" unit in English's order. English is
  untouched (both return English text as it was; `hintLine` only escapes it).
- A few places say more: a subtitle's speaker opens the Hebrew sentence (`#cine-sub` direction rtl: the name on the
  right of its line); an item's description is one paragraph of two spans (`.inv-desc > span` not isolated); a journal
  note's ✓ / ◆ stays at the start of its words (the right), as the tip's ✓ does; the controls' fixed key cells ("hold
  Ctrl + ← / → · F1–F4") are a row of keys left to right; the maps' painted words take the canvas's direction (the
  minimap and holomap canvases are `direction: rtl` in Hebrew: centred labels, nothing moves).
- No letter spacing on Hebrew (as HE-TEXT had it), now keyed on `:root[lang=he]`.
- New string: the story scenes' "Hold to skip" (`cine_skip`) was fixed English in index.html; it is a key now, Hebrew
  "החזקה לדילוג" (a noun, as the on-screen prompts are). For the clarity editor to confirm.

## Places found (grep of src/, css/, index.html for rtl, dir, `getLang() === 'he'`, inline-start/end, swap)

| Place | Before | Now |
|---|---|---|
| main.js applySettings | `<html dir="rtl">` in Hebrew | `dir="ltr"` always |
| inventory.js nav | ← / → swapped when `documentElement.dir === 'rtl'` (items grid and journal pages) | the arrows as in English |
| hud.js say | the dialogue box `dir="rtl"` (name tag and ▼ mirrored) | no dir: the box as English, its text by plaintext |
| hud.js openShop / openMenu | the shop `dir="rtl"` / `ltr` | no dir |
| css/style.css | `:root[dir=rtl]` rules (letter spacing, isolates, plaintext on six selectors) | the HE-LTR block |
| css/style.css, tutorial.js, JS inline styles | ~40 logical properties (`inset-inline-*`, `margin-inline-*`, `border-inline-*`, `text-align: start`) mirrored everything by the page's dir | unchanged: they resolve as in English now |
| the behaviour menu, settings' segmented choices and sliders, the holomap, the HUD, the shop, the pause menu | mirrored by the page's dir: the index-based arrows then ran against the picture (the user's report: Ctrl + → lit the box on the left) | not mirrored: → is the next, on the right |
| index.html `#cine-skip` | "Hold to skip" fixed English | `data-i18n="cine_skip"` |
| the language buttons (`English` dir ltr, `עברית` dir rtl) | — | kept |

Not changed: canvas textures in the 3D world (signs, boards) are English art in both languages (HE-TEXT). Story and
world files were not touched (the U-4 card's texts follow from the stylesheet and `t()`).

## Tests (Automated runtime only; a snapshot of this worktree after merging ccr-c1c2c4b9-dep6ed, port 8981, swiftshader)

- `tests/hebrew.mjs` (rewritten to the new rule): **PASS 24/24**. The page stays `dir="ltr"` after choosing עברית and
  after a reload; the house's tip panel on the left, its goal read right to left, its key hint with the key caps on the
  left in English's order (↑ · ← before →); Arthur's and Zoé's boxes: the name tag where English has it, the line read
  right to left, nothing spills at 1280×720 and 1920×1080; the yard; the voice from the English (8 lines); the
  objective on the right, read right to left; the pause menu; settings (tabs, choices and labels in English's order, →
  Normal → Hard and ← back, → turns the music up); the behaviour menu (Ctrl + → Normal → Athletic, the lit box moves
  right, the boxes in English's order — the user's report); the inventory and journal (tabs, slots, large view, Close
  where English has them; name, text and notes read right to left; → the next slot); an audit of every Hebrew
  paragraph on the pause menu (10), settings (25) and inventory/journal (5–10): none reads left to right; back in
  English the same keys do the same and no key-hint markup is added. "Reads right to left" is measured on screen (the
  paragraph's first letter at its line's right end).
- `tests/menus.mjs` (a Hebrew block added: page LTR, Ctrl + → / ←, the inventory's →): **PASS 40/40**.
- `tests/inventory-calm.mjs` (its Hebrew section now checks English's layout and arrows): **PASS 23/23** (17.11, on this
  branch before the merge; not re-run after it).
- `node tests/dialogue-check.mjs`: **PASS** (Hebrew 5,137 / 5,137; `he-text.js` regenerated after the merge, unchanged).
- On 17.11, before the merge: items-ceremony **PASS 20/20**, uipass **PASS 25/25**. opening-tutorial, chapter1, shops
  and controls were not completed: their pages were killed by the shared machine's out-of-memory killer (dmesg:
  "Memory cgroup out of memory: Killed process … chrome-headless"), three tries each; not re-run (the coordinator asked
  for hebrew and menus only). They are English-mode suites; HE-LTR changes nothing they draw in English except escaping
  the inventory's and holomap's hint lines (same text).
- The same hebrew.mjs run on the base (before) fails 14 checks, which documents the old behaviour: the behaviour boxes
  laid right to left (x 835, 705, 575, 445: Ctrl + → lit the box on the left), the inventory's → went to the slot on the
  left, settings' choices mirrored, the tip's [←][→] reversed, the name tag and the objective on the other side.

## Pictures (chapter 1, Hebrew, 1920×1080; captures/he-ltr/)

`after-*` with this change (merged code): 01-dialogue (Arthur), 02-yard-tip, 03-inventory, 04-journal, 05-settings
(from the pause menu), 06-behaviour-menu (Ctrl held, → once: Athletic). `before-*` (01–05) from the base of 17.11, the
page right to left. There is no before picture of the behaviour menu (the run that made it pictured the English pass by
mistake; it was removed); the before run's measurements above describe it.

## Open

- opening-tutorial, chapter1, shops and controls to re-run on a machine with memory to spare.
- "החזקה לדילוג" (the story scenes' Hold to skip) for the clarity editor.
- Not read by a person in a played session.

## HE-FONT (P68, 18.11): one font, and the minimap back in its corner

The user, 18.11: "in Hebrew make one uniform font; the minimap does move to the left — make sure that apart from the
language itself nothing changes, only the language itself RTL".

- **Font**: the bundled Rubik had Latin letters only, so every Hebrew letter fell back to the system's font (Segoe UI /
  Arial…) beside Rubik's Latin, key caps and numbers. Rubik's own Hebrew is bundled now (`assets/fonts/rubik-hebrew.woff2`,
  the variable font: one file for every weight; OFL like the rest; from @fontsource-variable/rubik), declared in
  `assets/fonts/rubik.css` under the same family name with the Hebrew unicode-range: HTML text and the maps' canvases
  (already `Rubik, …`) take it with no other change. The twelve-years-late card (story/yearslate.js, a handwriting font with
  no Hebrew) falls back to Rubik for Hebrew letters, its stamps are Rubik. World signs stay English art (HE-TEXT).
  Files: 508 of 512.
- **Minimap**: `#minimap` was placed by `inset-inline-end`, and Hebrew gives the minimap itself `direction: rtl` (for its
  painted words): a logical inset follows the element's own direction, so it turned into `left: 16px`. It is placed by
  `right: 16px` now. Checked in the browser: Hebrew left auto / right 16px, as English (before the fix: left 16px).
  The other two elements with their own `direction: rtl` (the holomap's canvas, a flex item; the story subtitle, centred
  by left 50%) do not move.
- Automated runtime only (Chromium): the Hebrew font file fetched and loaded (`document.fonts`), the minimap's computed
  place. `tests/hebrew.mjs` not rerun (the user: keep tests minimal).
