# INVENTORY-CALM: the inventory and journal window (P27, the user, 15.11)

The user, with a picture of the Inventory + Journal window in chapter 1 at about 1200×700: "the inventory is very
crowded"; then "it was crowded and ugly and not visual, and scrolling". Base: `ccr-c1c2c4b9-dep6ed`.
Status of everything below: **Automated runtime only** (SwiftShader in headless Chromium on a shared, heavily loaded
machine; no GPU, real gamepad or real phone used).

## What was wrong (before)
- One panel held everything side by side: eight item slots, the Magic Ball's seven-line description, the current
  goal with its steps, every chapter's notes and the crystal notes.
- Kashes, clovers and crystals took three of the eight slots.
- The panel was 4 px too small for its content on both axes at 1200×700 and at 1920×1080 (`overflow: auto`), so it
  showed scroll bars on both axes.
- The pad's A did nothing in the window (it gives `action`, the window waited for `interact`), though the line said
  "A: use".
- The pause menu had no way into the journal.

Pictures: `lba3/captures/inventory-calm/before-1200x700.jpg`, `before-1920x1080.jpg`.

## What changed
One window, two tabs (`src/game/inventory.js`, `css/style.css`):

**Inventory tab** (in the spirit of LBA2's inventory):
- The selected item large and turning (its own 3D model, as before) beside a page of large slots: 5 × 3, each slot
  the item's rendered model; empty slots are faint frames (not buttons), so the grid keeps one calm shape.
- Under them only the item's name (with level or count) and its first sentence. The rest of the text is on demand:
  **More** (Space on the keyboard, Y on a pad, or the button); in a short window (600 px tall or less) the whole
  text takes the place of the pictures while it is open.
- Counts are small badges on the slot (`Level 1`, `20`, `worn`, `lit`).
- Kashes, clovers and crystals left the grid for one small strip at the header's far end (the HUD's own coin and
  clover icons). Each is still selectable (↑ from the first row, or a click) for its name and line.
- A gadget shows a **Use** button naming the real key (Classic: W; Modern: E; pad: A). E, Enter, the pad's A or the
  button use it, as E did before. E on anything else still closes the window, as before.
- More items than a page holds (late game: 18 with the whole arsenal) are paged, ‹ 1 / 2 ›; → past the page's end
  turns the page. Nothing scrolls.

**Journal tab**:
- The current goal first ("Now", the story's objective with its steps).
- Then one section at a time: the current chapter's notes open; the side stories (for example the singing
  crystals) and the older chapters wait in a list beside it. ↑/↓ open another; a long section or list is paged
  (←/→), never scrolled. Done notes have a ✓, open steps a ◆ (shape, not only colour).
- An empty journal says "Nothing written yet."

**Getting there and back**:
- The inventory key opens the Inventory tab (Classic: Shift or I; Modern: I). In the Modern scheme J (its second
  inventory key) opens the Journal tab, unless J has been made the inventory's own key.
- Tab, or LB / RB on a pad, switches tabs (as on the Settings screen); the tabs can be clicked.
- The pause menu has a **Journal** button (under Resume): it opens the window on its Journal tab; closing it (Esc,
  B, the inventory key, Close) returns to the pause menu with Journal selected. Gadgets cannot be used from there
  during a cut-scene.
- Esc, the inventory key, a pad's View or B, and Close still close the window. One click handler is made once;
  rendering replaces the markup only.

**Sizes**: the slot size follows the window (`--s: clamp(44px, min(8.6vw, 12.6vh), 112px)`); under 700 px wide the
large view steps aside; under 520 px tall the grid has two rows a page. Big text (Settings) enlarges the window's
text; the description box grows for it.

**Text** (English; Hebrew added alongside for the hidden Hebrew table): More, Less, Use, Previous page, Next page,
Now, Nothing written yet., Tap a section to read it., and Journal (the pause button reuses the journal's title).
No new text names a time of day.

**Data contract for equipment indicators** (for the equipment specialist): an item in `Inventory.items()` is
`{ id, icon, n }`; `n` (a number or a short word such as `worn`) is shown as the slot's badge and next to the name.
Text: `it_<id>` (name) and `itd_<id>` (description; the first sentence is the short line). Items used from the
window are listed in `USE` (`inventory.js`) and go through `gadgets.use(id)`. Counters (`counters()`) are Kashes,
clovers and crystals only.

**Old saves**: the window stores nothing in the save; a format-3 save (no arsenal) loads and the window opens.

## Sizes measured (chapter 1, `tests/inventory-calm.mjs`)
Panel (left, top, width, height in CSS px) on the Inventory tab, its height with More open and with big text + More:

| Window | Slot | Panel (Inventory tab) | + More | Big text + More | Scroll bars |
|---|---|---|---|---|---|
| 1200×700 | 88 px | 191,110 818×480 | 517 | 530 | none |
| 1280×720 | 91 px | 221,116 838×487 | 524 | 538 | none |
| 1366×768 | 97 px | 240,131 886×505 | 542 | 556 | none |
| 1920×1080 | 112 px | 456,265 1008×551 | 566 | 577 | none |
| 960×540 | 68 px | 152,60 656×419 | 419 | 431 | none |
| 844×390 | 49 px | 198,38 448×313 | 313 (the text replaces the pictures) | 337 | none |

The Journal tab has the Inventory tab's size (at 844×390 it is taller, 366, to leave room for its notes; with big text there the goal's steps are left to the pause menu and the Holomap). Checked on every size and on both tabs: the window, the panel and every
pane have scrollWidth ≤ clientWidth and scrollHeight ≤ clientHeight (a pane holding an LBA frame may measure 4 px over:
the frame's corner marks sit 4 px outside its border by design), no box spills out of its pane, nothing in the window
is set to scroll, and the panel lies inside the window.

## Pictures (chapter 1, deviceScaleFactor 2)
`lba3/captures/inventory-calm/`: `before-1200x700.jpg`, `before-1920x1080.jpg`; after: `after-items-*.jpg` (the
Inventory tab, the Magic Ball selected), `after-items-more-*.jpg` (its whole text open), `after-journal-*.jpg`, each at
1200x700 and 1920x1080. No later-chapter inventory is pictured.

## Tests (Automated runtime only)
Served from a snapshot of the worktree (`python3 -m http.server`), Playwright + SwiftShader, one browser at a time, on a
shared machine with a load average of 11–30.

| Test | Result | Notes |
|---|---|---|
| `tests/inventory-calm.mjs` (new) | **PASS**, 23/23 | the sizes above (six windows × both tabs × More × big text); a picture per item; keyboard select, the counters' strip, More, use (the lantern, its Use button naming W in Classic), Tab, J (Modern); the journal's goal first and its sections; the pause route; the pad (View, LB/RB, Y, A, B); the mouse (tabs, slot, counter, More once after many openings, Close); rapid open/close; Hebrew (since HE-LTR, 17.11: laid out as in English, → the next item, only the texts right to left); a late-game page turn (18 items, ‹ 1 / 2 ›); an old format-3 save |
| `tests/items-ceremony.mjs` | **PASS** | one line changed: the Kashes count is read from the strip |
| `tests/containers.mjs` | **PASS** (second run) | the first run's page crashed (memory; 3 GB free at the time) |
| `tests/chapter1.mjs` | **PASS** | |
| `tests/equip2.mjs` | **PASS** | uses gadgets from the window with → and E |
| `tests/jetpack.mjs` | FAIL 1, not this task's | its inventory checks pass ("worn", taking the pack off and on with E); the failure is the lit pack's draw calls (8 over the worn pack, limit 6) |
| `tests/controls.mjs` | FAIL 3, not this task's | "pad: View opens the inventory and closes it again" passes; the failures are camera smoothness (acceleration p95 12.5–14.3 against 12) |
| `tests/uipass.mjs` | stopped (timeout), environment | a click on the pause menu waits > 30 s for two animation frames (measured: two frames took 45 s while paused). The **base commit fails the same way** (`uipass` on `ccr-c1c2c4b9-dep6ed`: the click at line 93 timed out); with a 120 s timeout the same click succeeds on this branch. Its inventory checks (Close button, touch hint) were not reached in this run; `inventory-calm` covers Close and the hints |
| `tests/menus.mjs` | stopped (timeout), environment | same cause (a pause-menu click at line 114; once a page reload over 30 s). Its inventory-hint checks were not reached; the hint code is unchanged |

## Open points
- The LBA HUD still shows the life bar, clovers and Kashes at the top left while the window is open (it did before);
  the strip repeats the two counts. Hiding the HUD there is a HUD decision, left as it was.
- Hebrew: since HE-LTR (17.11, docs/lba-maturity/HE-LTR.md) the window is no longer mirrored in Hebrew: the same
  layout and arrows as English, only its texts right to left.
- Nothing was tried on a real gamepad or a real phone.
