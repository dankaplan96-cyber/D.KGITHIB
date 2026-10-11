# NEXT ACTION

**A1 – Story director.** Split `src/game/prologue.js` into `src/game/story/` (base helpers + `prologue.js`
+ `chapter1.js` …) behind a `Story` director that main.js talks to. NPC defs get an `at(flags)` placement
function (null = absent). `endPrologue()` shows a chapter card and starts chapter 1 instead of the
"to be continued" screen.

Files: src/main.js (story construction, NPC filtering), src/game/prologue.js → src/game/story/*.js,
src/game/actors.js (NPC.present), src/game/i18n.js (chapter titles).

Verify: `node scratchpad/pro.mjs` still passes; a new test `scratchpad/ch1.mjs` reaches chapter 1 start,
saves, reloads with Continue and is still in chapter 1.
