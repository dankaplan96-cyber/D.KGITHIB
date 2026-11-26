# UI-P92 — less UI clutter, clearer actions (P92, task 4)

The owner's brief: "less UI clutter, clearer actions". **The HUD rule:** from a distance, show where to go (not the
action); within reach, show the action and its button; after a failed attempt, say why; after success, let the result
speak. Kell's lift labels (`p_feed`, `p_hook`, `p_zt_bell`) were already done; a shared label used by unrelated objects is
not changed (a specific key is added instead).

Evidence label: **Automated runtime only** (headless Chromium, SwiftShader, 1366×768, a shared loaded machine; keyboard
by the input harness, the pad a `navigator.getGamepads` stub). Nobody has played or read these screens in a real session.

## Where prompts, labels and toasts are decided

- `src/main.js` `findInteractable()` ranks what is in reach (distance + a facing penalty, people a little ahead, the
  special cases) and `updatePlay` hands the winner's `label` key to `hud.prompt()`.
- `src/game/hud.js` `prompt()`: shown only after 0.15 s in reach and never while running; `<kbd>` with the key in use
  (`input.label`: the pad's button after a pad press, the remapped key otherwise). `toast()`: dedups, max 3.
- The story's `interactables(consider, dist)` (e.g. `story/hometap.js`, `story/pumpline.js`) choose each thing's
  `label:` key; `src/game/tutorial.js` draws the opening's step panel (goal, the "where" line, the key line).

## Per case (before → after; pictures in `lba3/captures/ui-p92/`, `before-*` / `after-*`, same names)

| Case | Before | After |
|---|---|---|
| Kitchen tap within reach (`h_tap`; also the yard standpipe and chapter 2's dry tap, all three taps: `p_tap`) | "[W] Try" — try what? (`en-kbd-tap-near`, `en-pad-tap-near`: "[A] Try"; Hebrew "ניסיון") | "[W] Try Tap" / "[A] Try Tap"; Hebrew "ניסיון בברז", the same words as the tutorial's own key line |
| Kitchen tap from across the room | no prompt (already right) | unchanged (`en-kbd-tap-far`) |
| Tap used (a failed attempt) | his line says why: "Not a drop, but something knocks…" (`en-kbd-tap-why`) | unchanged; no success toast either way |
| Tutorial step "Try the garden tap" / "Talk to Zoé" from far away | the panel showed the action and its key ("[W] Try the tap") at 8.6 m, and while he aimed the ball at the barrels (`en-kbd-tapstep-far`) | the key line comes up within 3.5 m of the step's marked thing, as the cupboard's already did; from further the goal, the "where" line and the gold marker (`tutorial.js` `NEAR_KEY`, `nearMark`) |
| Two adjacent things: the pump room's three pipes (chapter 2) | turning in place between them, one prompt "[W] Touch" was for the upper pipe and then for the lower one — nothing told which (`en-kbd-pump-pipes`) | "Touch Upper Pipe" / "Touch Lower Pipe" / "Touch Copper Pipe" (new keys `p_feel_up/lo/cu`; `p_feel` stays for the well's pool) |
| Flicker between adjacent things | measured, not found: turning 6.5 s in place by the pipes, the cocks and the plate: 0–5 target changes, none bouncing straight back (the 0.15 s dwell already hides a pass-by) | no change (a hysteresis was tried and taken out again: no evidence for it, and `findInteractable` is shared) |
| Item pickup | the magic ball: the found box, then one toast naming its keys "Magic ball (Alt) · Holomap (H)"; a coin from the dresser ("[W] Search"): a float "+5" and the counter, no toast (`en-found-ball`, `en-after-ball`, `en-pickup`) | unchanged (already without clutter) |
| Inventory | opens on its key (keyboard Shift; pad View), the footer names the device's keys ("D-pad: select · View / B: close"), held keys do not reach the world, Esc / B / the key close it, 6 rapid taps leave one consistent state | unchanged |
| Ball aim (HUD side) | while the ball key is held no prompt or panel covers the aim; the weapon pill names the ball and the swap key (`en-kbd-aim`) | unchanged; the far-away tap key line no longer sits beside the aim (above) |

Not found anywhere checked: a redundant "Done!" toast. The tutorial's ✓ tick (1.1 s on the step that was done) is
progress in a teaching panel and stays. Success toasts elsewhere are counts ("Valve opened (2/3)") or say what changed.

## Hebrew mixed-direction lines

Rule kept from HE-LTR: the page is LTR; only text runs right to left. Found (an audit in `tests/ui-p92.mjs` B5 renders
every Hebrew line that holds a key placeholder or a code, with real key names — keyboard and pad labels — put in):

- **25 lines** in plain text (toasts, lines, hints) with a key put in had it turned round: a pad's "D-pad →" read
  "(→ D-pad)" in `hint_jump` (seen on screen: `before-he-pad-toasts`), "Left Click", "Num 4" likewise.
- **3 lines** that open with a code read left to right as a whole paragraph (the code on the left, the full stop at the
  wrong end): `th_tw_exp1` "B-7 אחד. …", `bh_te_brass` "B-8: בלי זיגוג…", `wk_card` "(J-17. …".
- Codes inside a Hebrew sentence ("ה-B-7", "ארגז 212/3", "B-8 …" mid-line) and key caps (`<kbd>`, laid out by
  `keyHints` since HE-LTR) were already right.

Fix (`src/game/i18n.js` `t()` → `bidiHe`, Hebrew only, plain-text lines only — a line with `<kbd>` is still keyHints'):
a key name put into a Hebrew line is a left-to-right isolate (U+2066…U+2069); a line led by a key keeps its LTR paragraph
(U+200E, HE-LTR's key-on-the-left rule); a sentence that opens with a code gets U+200F (right to left). English is
untouched. `spoken()` strips the marks, so the voice still finds the English line.

## Tests

All Automated runtime only (swiftshader, port 85xx, one browser at a time on a shared machine).

- `tests/ui-p92.mjs` (new; `SHOTS=before|after`, `ONLY=ABC`): before (the base served from an untouched copy)
  **9 FAIL** — "Try" without the tap (A1 ×2, A3 pad), the far key line (A6), Hebrew "ניסיון" (B1), "(→ D-pad)" in a
  toast (B2), the audit's 25 turned keys and 3 code-led lines (B5 ×2), "Touch" shared by two pipes (C1). After:
  **PASS 29/29**, errors none. The before Hebrew captures come from an earlier run of the same script (its pad
  section's switch back to the keyboard pressed a different key, nothing else differs).
- After merging origin/ccr-c1c2c4b9-dep6ed (P95 Auto, depot, narrative text; `he-text.js` regenerated, no diff):
  `tests/ui-p92.mjs` again **PASS 29/29**, errors none; dialogue-check **PASS**. The suites below ran before the merge.
- `tests/opening-tutorial.mjs` **PASS 43/43** (A8 now expects the Talk key from 3.5 m).
- `tests/hebrew.mjs` **PASS 24/24**; `tests/inventory-calm.mjs` **PASS 23/23**; `tests/uipass.mjs` **PASS 25/25**;
  `tests/campaign-thread.mjs` `ONLY=A` (chapter 2's pump room, the pipes and cocks by input) **PASS 13/13**.
- `node tests/dialogue-check.mjs` **PASS** (Hebrew 100 %).
- Not run: `tests/controls.mjs` (nothing it covers changed; its 3 "no lurch" failures are known), the B-7/B-8 lines in
  their own scenes (chapters 12–13: checked by the B5 audit's layout measurement only, no pictures past chapter 2).

Also (the coordinator's P95 note): Settings' Auto line said "to hold 55–60 fps" even under the 30 FPS limit; it now says
the target that applies (`set_h_q_auto` `{f}`: 60, or 30 with the 30 limit), English and Hebrew. Checked in code and by
dialogue-check only.

## Files changed

- `src/game/i18n.js` — `bidiHe` in `t()`; `spoken()` strips the marks.
- `src/game/tutorial.js` — the step key line within `NEAR_KEY` (3.5 m) of the marked thing for the Zoé and tap steps.
- `src/game/text/thread.js`, `src/game/text/he/thread.js`, `src/game/he-text.js` (regenerated) — `p_tap` "Try Tap" /
  "ניסיון בברז"; new `p_feel_up`, `p_feel_lo`, `p_feel_cu` with Hebrew.
- `src/game/story/pumpline.js` — the three pipes use their own labels.
- `src/game/text/common.js`, `src/game/text/he/common.js`, `src/main.js` (one argument on the Settings hint line) — Auto's target.
- `tests/ui-p92.mjs` (new), `tests/opening-tutorial.mjs` (A8: the Talk key line from 3.5 m).

## Open risks

- The isolates and marks are invisible characters inside Hebrew strings: a test or tool that compares a Hebrew `t()`
  result with the raw table text must strip `[‎‏⁦-⁩]` (as `spoken()` now does).
- The "opens with a code" rule is a heuristic (a Latin first letter and sentence punctuation at the end): a future
  key-led hint that ends with a full stop would be turned right to left. The B5 audit lists any such line.
- The tutorial's Zoé and tap key lines now wait for 3.5 m: a player far off sees the goal, the where line and the marker
  (and Zoé's call), not the key.
