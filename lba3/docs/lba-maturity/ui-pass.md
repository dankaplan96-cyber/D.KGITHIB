# UI pass — menus, screens and HUD (WORKPLAN-2026-11-09 Wave B item 3)

Base: `ccr-c1c2c4b9-dep6ed` (568a05ed). Status of everything below: **Automated runtime only** (SwiftShader, headless
Chromium; no frame-rate claims; no GPU, real gamepad or real phone used). Settings keys and their stored values are
unchanged (saved settings load as before); no story file touched.

## Supported platforms and inputs (as found in the code)
- Desktop browser and the desktop app (Electron, `desktop/`): keyboard + mouse; a standard-mapping gamepad through
  `src/engine/input.js` (A confirm, B back, Menu pause, d-pad / left stick move the selection).
- Touch: `(pointer: coarse)` turns on the touch layer (`#touch`: stick + buttons) and the pause button. A real but
  secondary path; nothing here was tried on a real phone.
- Window sizes checked: 1280×720, 1366×768, 1920×1080 and a phone held upright, 390×844 (touch, `isMobile`). The
  existing `tests/display.mjs` also covers 1024×768, 800×600 and 640×360.

## Method
1. A tour of every screen (`scratchpad/uitour.mjs`, kept with the session's pictures) at the four sizes: a picture
   of each, and measured faults (text cut by its box, things outside the window, HUD pieces over each other, text
   under 12 px, where the selection is and whether it is in view).
2. The faults below, from the measurements and from looking at every picture.
3. Fixes; the same tour again (`after/`); `tests/uipass.mjs` for the behaviour.

Pictures: `/tmp/claude-0/-home-user-D-KGITHIB/ee8386c5-a577-5abe-b3f0-c10324e7c3bd/scratchpad/ui/before/` and
`…/ui/after/`, named `<screen>-<width>x<height>.png` (126 before, 126 after), with `findings-desktop.json` and
`findings-phone.json` (the measurements) in each.

## Faults found, per screen, and what was done

| # | Screen | Fault (before) | Fix |
|---|--------|----------------|-----|
| 1 | All menus | **Esc was not the same everywhere.** On Settings / Controls opened from the title Esc did nothing; opened from the pause menu it jumped straight back into play (skipping the pause menu); on the save-slot screens it went back one screen; on the New Game confirmation it did nothing. A pad's B went back only on Settings, Controls and the slot screens. | Back is one rule (`main.js` `menuNav`, `CHILD_SCREENS`): Esc, the pause key or a pad's B on any screen opened from another (Settings, Controls, both confirmations, Save / Load) returns to it with its selection restored; on the pause menu it resumes; title, game over and the ending have no "back". |
| 2 | All menus | Rebinding could take the menus' own keys away: Classic's Up rebound lost the ↑ arrow in every menu; Pause rebound away from Esc left Esc dead in menus. | Fixed menu keys in the input layer (`input.js` `MENU_KEYS`, `menu()`): arrows, Enter and Esc always move / confirm / go back in menus, the inventory, the shop and the Holomap, whatever the bindings. |
| 3 | Title, pause, game over, ending, Controls, confirmations | Two burning bars: the entry under the mouse burned (hover) as well as the keys' selected entry. | As Settings and the slot screens already did: the entry the mouse really moves onto becomes the selection (`pickSlot`, `mouseMoved`); hover alone no longer burns. |
| 4 | Title | With no save, Continue and Load Game were shown dimmed: two buttons that do nothing. | Left out until there is a save (still disabled underneath for the tests' sake). |
| 5 | Controls | **The selection was invisible on opening**: the screen was a long fixed table, then a second list of the same actions; the first selectable key sat at y≈1118 px, below the window, at every size; Back touched the window's bottom edge at 1280×720. On a first opening the selection was drawn on Reset (the list was built after the selection). The table named the default keys of *both* schemes whatever was bound: a rebound key was wrong there. | One list (`buildRebind`): each action's key beside what it does, built from the keys in use and the movement scheme chosen ("Movement: Classic (LBA2)"); two columns on a wide window (← → go across), one on a phone; the behaviours, the Free camera and the mouse as fixed rows; the pad's buttons in one line under it; Reset and Back side by side. The list is built before the selection is drawn. At 1280×720 the whole screen fits with the first key selected. |
| 6 | Controls | A pad's A on a key started "Press a key…" that only a keyboard could end. | B (or Menu) gives the wait up (`cancelRebind`). |
| 7 | Settings | Most rows said nothing about what they do (11 of 20 rows had no hint); the hints that existed were stacked under their rows, making some pages long (Controls' "Controls by device" hint ran to three lines). | One line under the panel for the selected row (`.set-desc`, `settingsDesc`): every row, the tab bar ("Tab / ← →: change page"; LB / RB on a pad) and Advanced ("More: …") say what they do, in short English, naming the keys in use (Focus Button: "L / right-click"; Dialogue Advances: the talk key). The rows' own hint elements stay (hidden) for the tests. New text: `set_h_*` in `src/game/text/common.js`. |
| 8 | Settings | Labels in two cases: "Camera distance", "Controls by device", "Weather and light changes" among Title-Case labels. | "Camera Distance", "Controls by Device", "Weather and Light" (labels only; keys unchanged; `tests/weather.mjs` follows). |
| 9 | Settings (Sound) | On the selected (burning) row the volume bar's fire fill vanished into the row's fire. | The selected row's bar is cream on black (the chosen chips' look). |
| 10 | Settings | "Subtitle Size" did not reach the story scenes' subtitles. | `body.big-text #cine-sub` larger. |
| 11 | Confirmations | New Game's confirmation stacked its answers; the slot confirmation put them side by side. Neither took ← →. | Both side by side, Back first; ← → move between side-by-side buttons anywhere (confirmations, Controls' Reset / Back, the pause menu's benchmark pair). |
| 12 | Pause | Two benchmark entries (a measuring tool the user uses) sat among the player's entries, before Save & Quit. | Kept (the user's benchmark route), moved last, smaller, side by side. |
| 13 | Game over | "No clover leaves left." did not say what Retry does. | "No clover leaves left. Retry returns to the last autosave with full health." |
| 14 | Behaviour menu | The key count had a white frame and a panel of its own: it shares the class `.keys` with the old controls table. The chosen box differed by its border colour only. | `.binfo .keys` reset; the chosen box has a thicker lit border (the label names it too). |
| 15 | HUD (LBA style) | The weapon pill kept the modern HUD's rounded translucent look among the LBA HUD's square white frames. | Square white frame in the LBA HUD (the Always-on HUD keeps its look). |
| 16 | Menus | White words on the fire bar's bright top (yellow) were faint. | A dark halo on the selected entry's text. |
| 17 | Inventory | No way to close it with the mouse or a finger. | A Close button (the Holomap has one), same frame as the menus. |
| 18 | Inventory, toasts | Hard-coded keys in English text: the ball's description said "Alt in Classic, F in Modern"; the heat flask's description and toast said "E". | `{k}` / `{e}` filled with the keys in use (`hud.toast` fills `{e}` with the talk key for any message). |
| 19 | Phone: HUD | A long message ran off both edges (no wrapping); the goal panel and the messages lay over each other; the pause button sat over the life bar. | Messages and prompts wrap inside the window; on a narrow screen the messages go under the goal panel, the bars are narrower and clear the pause button. |
| 20 | Phone: touch | The eight buttons sat over the middle of the picture (2×4, up to 490 px from the bottom); they showed through the dialogue box, the pause menu, the slot screens and the inventory, where tapping them did nothing; there was **no way to open the inventory** by touch; the buttons had no names for screen readers; prompts and toasts named keyboard keys on a phone. | A 3×3 block low on the right, above the weapon, with an Inventory button; hidden out of play (`body.hud-busy`); every button named (`aria-label`); a touch screen starts with the touch buttons' names in prompts and hints; the inventory's line says "Tap an item to look at it." |
| 21 | Phone: dialogue | A long name tag wrapped downward over the first line of text. | The tag grows upward. |
| 22 | Phone: Holomap | The title and the controls line lost their ends ("Inside: Twins…"). | They wrap on an upright phone (a short landscape window keeps one line). |
| 23 | Phone: Load Game | The slot's place / time / date line lost its end. | Wraps on a narrow screen. |
| 24 | Title | The disclaimer was faint over the bright fog. | A dark halo. |
| 25 | HUD: goal panel (PT-5, PLAYTHROUGH-REPORT) | Over Zeelich's cloud sea, the desert's sand and the Hamalayi's snow the goal's words could not be read as the panel faded: words and box faded together, faint words over bright ground. (After the fade the panel is gone by design, CLAR-2; the pictures caught the 0.5 s fade under way: they are taken right after a game step, the CSS fade runs in real time.) | On the way out the words fade first (0.25 s) over the still-dark box, then the box (0.3 s); the LBA HUD's box is darker (0.72). No more text, no arrow; the way in is as before. |
| 26 | Forced choices (`hud.openMenu`) | A choice that must be made showed Cancel, which only blinked the menu shut and open (chapter 3 now removes the button itself). | `openMenu(…, { forced: true })` (also through `game.openMenu`): no Cancel, Esc / B do nothing, an answer closes it. Other menus unchanged. Chapter 3 (a story file, not touched here) can pass the option instead of removing the button. |
| 27 | HUD | The pause button stayed on screen in dialogue, the inventory and the Holomap, where it pauses nothing. | Hidden out of play. |
| 28 | Game over | The scene showed through brightly behind "Twinsen is down". | The ending's darker backdrop. |

Checked and left as they were (no fault found): the loading screen (MEA Studio, then the shots and a real progress
bar), Save Game and Load Game (slot pictures, Latest tag, Delete beside each manual slot, empty slots dimmed on
Load and skipped by the keys), the slot confirmation's card, the Holomap at desktop sizes (frame, legend, Close,
controls line from the keys in use), the dialogue box at desktop sizes with the longest name ("Bersimon the
Weather Wizard") and a long line, the found-object box, the ending card, the chapter card. Reduced motion stops the
fire bars (`tests/display.mjs`).

## Data contract for equipment indicators
None was needed in this pass: the weapon pill (`hud.js weapon()`) and the inventory (`inventory.js items()`) already
read the equipment state (`hero.arms`, `combat.weapon`). A new piece of equipment shows in both by adding its id to
`WEAPON_INFO` / `items()` and its `it_` / `itd_` text; `{k}` (ball key) and `{e}` (talk key) may be used in its text.

## Tests
- `tests/uipass.mjs` (new): Back / Esc on every screen (also with Pause rebound to O, Up rebound to U), rapid
  pause / Settings / back ×6, the mouse's one selection, Controls (first key in view at 1280×720, → across, a rebound
  key shown at once, pad A / B), every settings row's line, the inventory's Close, the goal panel's fade (PT-5), a
  forced choice, New Game's confirmation (← →, Esc),
  a phone (touch names, Inventory button, buttons aside in pause and inventory, the life bar clear of the pause
  button, a long message inside the window).
- Changed: `tests/menus.mjs` and `tests/display.mjs` (Esc in the pause's Settings now returns to the pause menu; a
  second Esc resumes), `tests/weather.mjs` (the row's new label). `tests/menus.mjs` also knew only 18 settings and
  4 rows a page: Dialogue Advances (the user's, 5.11) had made it 19 and the Game page 5 before this pass.

Results (9.11, this branch, SwiftShader on a shared machine; `BOOT_TIMEOUT=900000`):

| Suite | Verdict | Note |
|---|---|---|
| uipass | PASS (25/25) | new |
| menus | PASS (39/39) | |
| display | PASS | 1920×1080 … 640×360, settings fit, Esc paths |
| saveslots, holomap, items-ceremony, crosssystem, resume, opening, voices, chapter1 | PASS | |
| controls | FAIL (3): the camera's acceleration limits (accMax 25.0–25.1 against ≤ 25, p95 12.5–14.3 against ≤ 12) | the same three, the same numbers, on the base commit 568a05ed: not from this pass |
| weather | FAIL (1): Zeelich's fog colour in one light | the same on the base commit; the label check passes |
| autoquality-game | 20 checks PASS (the Graphics row's hint included), then `page.goto … ?nocine&autoq` times out at "load" (twice) | see below |

## Left
- Hebrew: the old fixed controls table (`controls_html`) is no longer shown; the generated list has English text
  only (the language cannot be chosen in Settings any more).
- A real gamepad, a real phone and a GPU were not available: pad and touch are simulated (the input layer's own
  paths), pictures are SwiftShader's.
- Copy for the clarity editor: speakers' names mix cases ("Bersimon the Weather Wizard" / "Ker'aooc the healing
  wizard"); `map_close` ("M / Esc to close") is unused.
- The settings' Controls page (Controls by Device, Keys) and the Controls screen mean little on a touch-only phone;
  left visible.
- Game over offers only Retry; loading a manual slot from there needs a reload path that keeps the dead session's
  state out (not done here).
