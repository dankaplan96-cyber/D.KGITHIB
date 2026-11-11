# EQUIP-1 · the magic ball and the sword (art queue item 8) · the laptop, 9.11.2026

Diff: `requests/EQUIP-1.diff`, code only, made with `git diff HEAD` on **68315019** (= origin `ccr-c1c2c4b9-dep6ed`);
`git apply --cached --check` on a scratch index read from that commit: clean. It does not touch `tools/blender/zoe_poly.py`
or any `assets/poly` file. (It does not apply to `ccr-adf00ea7-37ebl3`, whose hud.js / inventory.js differ.)

Files: `src/game/equiplook.js` (new), `src/game/actors.js` (buildSword, MagicBall look only), `src/game/itemlook.js`
(the ball and sword looks), `src/game/inventory.js` (the ball's slot in the level's colour), `src/game/hud.js` (drawn icons).
Art: `art/blender/props/equip/{ball,sword}/` (job list, polyprops, inspect/validate reports, in-game numbers, sheet jpgs;
the .blend and png previews stay on the laptop). Pictures (ours, Citadel, chapter 1; may go to the user):
`docs/future/items/{ball,sword}/`, all before | after on the Vega 8.

## What was wrong (in the game, Follow/Medium, Vega 8, Auto = Medium, no bloom)
- **Ball:** a standard material at emissive 2.2 (thrown) to 4 (charged) burns out under the neutral tone mapping: a
  flat near-white disc. The level hardly read (red came out pink, the fire ball salmon); the halo (its picture's core
  the ball's own size) was hidden behind the ball. The ball in his hand kept the **last throw's** colour.
- **Sword:** at Follow a 3 px grey line, the hilt invisible; the blade met the camera edge-on in the guard and in two of
  the three strikes, and it struck with the **flat** in the backhand and the overhead blow (measured: the tip's velocity
  along the flat's normal 0.8-0.97).
- **Icons:** the HUD showed a star glyph for the ball and crossed swords for one sword; the inventory ball a pale peach sphere.

## The originals (the user's LBA2 SPRIRAW.HQR and BODY.HQR, decoded to a scratch folder, looked at, deleted; descriptions only)
The magic ball is a 14 px shaded marble per level: gold (centre about #e3af53), green (#63a36b), red (#bf3b37), each with
a white glint upper left and a dark rim lower right; the fire ball a flat yellow-orange flame; a 50 % dithered disc of the
same colour round it, and smaller balls of it for the trail. No sword reference was used: the sword is this game's own
(Yorna's, chapter 6).

## Now (equiplook.js; nothing in behaviour changed)
- **Ball:** the same sphere (r 0.12, 18 x 12), its shading painted in vertex colours per level (base, light, dark rim, a
  white glint) and turned to the camera each frame, so it reads as a marble from any side; a moderate glow in the
  level's colour (emissive 0.24 held, 0.40 thrown, 0.58 charged; was 0.6 / 2.2 / 4); the halo's picture now a soft disc
  wider than the ball inside a soft glow, opacity 0.3 + 0.09 x glow (was 0.25 + 0.08 x); the fire ball's halo flickers.
  `BALL_LEVEL`'s glow colours (trail, halo, flashes, sparks) unchanged. Painted at `holdIn` too (his level, not the last throw's).
- **Sword:** same length, grip and blade positions (slashtrail.js's sample points, the tests' tip at -0.75/-0.8 unchanged):
  a broader sabre blade (6.4 cm, was 4.6) with a flat and a bevelled edge (crisp facets), a curved guard with ball ends
  (24 cm), a pommel, a wrapped grip; turned a quarter about its own line (`rotation.y = π/2`), so the edge leads the
  backhand and the overhead blow and the camera sees the flat in the guard and those swings. Three meshes, their geometries
  and materials made once and shared (were four meshes, materials made per call).
- **Interface:** the inventory's ball is the same marble in his level's colour (looks `ball`, `ball2`-`ball4`); the sword's
  look shows its flat. HUD pill and selector ring: drawn SVG icons (a marble in the level's colour; one sabre).

## Measured (Vega 8, installed Chrome, Citadel square, chapter 1, Follow/Medium, 1280 x 720; renderer.info, with/without)
| | before | after |
|---|---|---|
| ball in flight (body, halo, trail, blob shadow): draw calls / triangles | 5 / 478 | 5 / 522 |
| ball in hand, charged | 2 / 354 | 2 / 398 |
| sword held (main + shadow pass) | 8 / 656 | **6** / 1,030 |
| sword mid-swing (with the slash trail) | 9 / 678 | **7** / 1,052 |
| shader programs after the whole run | 86 | 86 (nothing new compiles: the ball uses the standard + vertex-colour program the props already use) |
| GPU geometries / textures after the run | 1,145 / 354 | 1,147 / 355 (+3 ball level geometries met in play, -1 sword piece; +1 64 x 64 glow texture, ~22 KB) |
The frame has ~440,000-860,000 triangles; +44 (ball) and +187 per pass (sword). Blender (5.2.3 through the bridge,
`jobs/equip-1.json`, 33 jobs OK): baseline and candidates imported, inspected, validated 13/13 pass each, four views
grey and coloured, exported back with the same triangle counts (ball 396, sword 515).

**Frame time: not verified.** One clean run before the change (idle 18.5 ms mean, throwing 18.9, swinging 23.7); every
later run, before and after alike, was on a machine loaded by another agent's SwiftShader browser (before rerun: idle
47 ms), so no comparison is claimed.

## Tests (SwiftShader, the worktree served in-process, the tests copied to a scratch folder with the Test Lab's Playwright
and longer boot timeouts)
- **combat 75/76**: the one FAIL is the known base failure "dodge distance consistent at 30 and 60 fps" (d30 0, d60 1.56).
  HEAD control: the same 75/76 and the same single FAIL with HEAD's actors.js, itemlook.js, hud.js, inventory.js served in place: pre-existing.
- **anim-combat 35/35** (the sword's blade and the swings), **ball-close 6/6**, **anim-polish 55/55**, **equip2 30/30**
  (the weapon wheel's slots), **chapter1 23/23**, **givers 16/16**, **items-ceremony 20/20**, **shops 31/31: PASS**.
- **magic-levels**: **26/26 PASS** (levels 1-4 through the story, saves; rerun alone, 30 min).
- First tries that stopped on the harness, not the change (the laptop was loaded by another agent's SwiftShader browser):
  anim-combat's boot wait (300 s) and magic-levels' reload wait (480 s) timed out, items-ceremony hit the copy's Windows
  path to `lib/player.js`. In the copy only: boot/reload waits raised to 900-1500 s, `fileURLToPath` for lib/player.js.
  The reruns are the results above.

## Evidence labels
- Look of the ball (four levels, in flight, charged), the sword (guard, swing), inventory and HUD: **Automated runtime only**
  (pictures on the Vega 8 at fixed states, looked at; not played by hand).
- Draw calls, triangles, programs: **Automated runtime only** (renderer.info).
- Frame time: **Implemented unverified** (machine shared).
- Behaviour unchanged (arc, bounces, reach, damage, hand attach, sounds): **Source-reviewed** (no behaviour line in the diff) + **Automated runtime only** (the suites above).

## Not verified / left
- Not played by hand; bloom (High) not captured: with bloom the ball's glow will be stronger.
- The sword in the dialogue close shot is sheathed (as before), so it was not looked at there; the third strike (forehand)
  still shows the edge and leads with the flat.
- The ball's "back" (seen in Blender) never shows in the game (it faces the camera); in Retro 1997 there is no halo (as before).
- The fire ball reads as an orange marble with a flickering halo and the old flame sparks, not as LBA2's flat flame.
- No sword reference from the originals was compared.
