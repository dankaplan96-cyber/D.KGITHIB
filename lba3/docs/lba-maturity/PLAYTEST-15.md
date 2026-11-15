# PLAYTEST-15 — the user's playtest of 15.11.2026 (P32, P33, P34, P36, P37, P39)

Cloud worker, from base `afb61793`. All runtime evidence here is **Automated runtime only** (headless Chromium on
SwiftShader, a shared and heavily loaded machine): positions, rays, game states and canvas captures. No frame-rate
claims; nothing here was seen on the user's GPU. Captures: `captures/playtest-15/` (jpg, 960×540, the game's own
renderer read back from its canvas). Test: `tests/playtest-15.mjs` (`ONLY=house,ferry,square,pump` runs parts).

## P32 — "a problem in the shower with a rug or something, weirdly pixelated"

**Cause.** HOME-BATH (14.11) laid a small mat in the bathroom (`interiors.js`, `P.rug` at local −6.5, 9.95) on the
bathroom's tiled floor. `P.rug` puts its plane 12 mm over the spot it is placed on, and the bathroom's tiles are a plane
at 12 mm over the house's floor: the mat and the tiles were at the same height, 299 cells of 5 cm (the whole mat)
fought for every pixel. On SwiftShader the tiles won almost everywhere with blue specks through them (capture
`p32-before-bath.jpg`, at Twinsen's feet; `p32-after-bath.jpg`: the mat whole); on a GPU that is the shimmering "pixelated" patch the user saw.
Arthur's own rugs never overlapped the bathroom (his toy rug ends at z 8.38, the bathroom starts at 8.6).

**Fix.** The mat is placed on the tiles (12 mm over them, 24 mm over the floor), as every other rug lies on its floor.
No new object.

**Evidence.** A scan of every up-facing triangle at floor level in the house (5 cm cells; the top surface of each cell
against the next one under it): before, the mat against the tiles in 299 cells at y 0.012; after, every rug of the house
lies ≥ 6 mm over what is under it and no rug is within 4 mm of another surface (`tests/playtest-15.mjs` P32 rows).
Captures before/after at the bathroom and Arthur's toy corner.

**Left for a human.** Look at the bathroom on a real GPU (the desktop's P30 report on pixelated characters in the
house is a separate item).

## P33 — "his character disappears while he comes with the ship"

**Cause.** Not culling: probed every 0.5 s of the ride (`startArrival`), Vesk's rig was shown and drawn at every sample
(FarCull's frustum and fog tests kept him; his bounds are right). He rode at the ferry's local (1.0, deck, 1.05): the
front corner of the cabin (the cabin spans x −4.2…1.0, z ±1.5), so half his body stood inside the cabin wall and the
rest in its shade. As the ferry turned on its curve the cabin, the wheelhouse's front and the mast hid him, and at the
berth he was a dark half-figure against the cabin (captures `p33-before-*.jpg`, matching the user's picture).

**Fix.** He rides at the starboard rail in front of the cabin, the pier's side: local (1.75, deck, 1.5), 0.75 m clear
of the cabin and 0.45 m inside the rail (`chapter1.js` RIDE); his first step to the gangway follows (2.0, 1.6).

**Evidence.** `tests/playtest-15.mjs` P33: at every 0.5 s sample of the ride he is drawn after the culling, at least 3 of
5 body points are in the frame and at least 3 are clear of every ferry mesh by a ray from the camera. Captures after.

## P34 — the ferry's narration as a subtitle (coordinator's change, verified)

Verified by probe and test: the narrator's line `c1_arrive_1` is the `#cine-sub` subtitle from 1.0 s, through the
glide, and hidden at 8.5 s (the ferry berths at ~8 s); at the berth the chain is Vesk, then Gilbert; the camera's
sea / side / reveal / lead shots still run. One fix: a skip after 1.0 s took the subtitle away before it could be read
and the chain then left the line out. Now the chain says the narrator's line first unless the subtitle was up for 3 s
(`heard`, `chapter1.js`). Test rows P34 (both orders, the skip at 0.9 s).

## P36 — "people still walk in slow motion; the water came back — they should go to the well and be happy"

**What was done before.** P2 (7.11, GAIT-CADENCE, v60): a slow walker takes shorter, quicker steps (rig.js), so the
legs no longer spread wide at a crawl. That held for the cycle, but not for the pace.

**Cause 1, the pace.** The residents' rounds walk at 0.6–1.0 m/s (most 0.75–0.9), half Twinsen's 2.0: the whole
square drifted. A person strolls at 1.2–1.4 m/s.
**Cause 2, the shot.** The water's return cuts to a shot of the square (2.6 s, `waterReturns`), and every resident was
stopped where it stood during a cut-scene (`walkers.js` prep, `frozen`): the square's people stood still mid-stride
under the narration's start — the picture in the user's report.

**Fix.** `strollPace` (walkers.js, and townbusy.js for the plaza pair's own pace): a resident under 1.3 m/s walks at
s + (1.3 − s) × 0.75: 0.6 → 1.13, 0.8 → 1.18, 1.0 → 1.23, 1.15 → 1.26 m/s; 1.3 and over (the quick ones, the
children) as before; the order of the rounds is kept. The walk's cycle follows the speed as before (GAIT-CADENCE). The water shot lets the square's people go on
(`g.cutLive`, that one scene only). A cut-away shot also counts the camera's distance for the residents' detail tier
(nearest of Twinsen and the camera, only when the camera is more than 25 m from him).

**The well.** When the water returns (`waterReturns` → `townplay.js` `wellJoy`), the nearest few of the square's
people (2–4, within 32 m, not seated, not talking, not at a game or a door) get a stop round the well, 2.4 m from its
middle, on walkable ground clear of Gilbert and the doorways and 1.6 m apart. There they face the well, cheer as they
arrive and now and then, talk and listen between, and with Twinsen near say a line each, one at a time (`rp_well_0..3`:
"Water! Real water!", "It's warm, too. Feel that!", "The well's back! Ha!", "I'm fetching the big jug."). When he has
been within 22 m of the well for 24 s (and the gathering is 30 s old), or after 160 s without him, they go back to
their rounds one by one; the stop is taken out of each round as it is left. Nothing is saved: a game loaded after the
water has the ordinary square.

**Evidence.** `tests/playtest-15.mjs` P36.

**Left for a human.** Whether 1.2–1.4 m/s and the cheer read right next to Twinsen's own walk on a real screen.

## P37 / P39 — the pump room: "it's not clear that here you need to turn", "where is the bypass?", "I turned it several times and it did nothing"

**Causes.** (1) The room camera looks in from the south-east; the brick pier stood 1.55 m out from the pipes, so at
the cocks Twinsen stood half behind it and the cocks with him. (2) A cock was a short red bar; the motor's flywheel was
the same red, a loose copper length lay on the floor, the floor drain was a grey disc, and the hanging lamp's shade threw a dark disc on the
floor under it (the room has no roof; the shade's shadow from above): all read as things to use. (3) Nothing in the room said "bypass";
the objective said "Open the right line at the bypass". (4) The two cocks were 0.7 m apart with the same prompt, and
a key collision made the prompt "Turn" (`p_cock` was 'Open' in text/thread.js and 'Turn' in text/answer.js; the later
import won). (5) The square's cock opened, sprang back after 0.9 s and only 1.9 s later two thoughts in brackets came:
it read as "nothing happened".

**Fix.** (1) The pier is a pilaster now, 0.5 m deep; the alcove is open to the camera. (2) Each cock is a red handwheel,
0.4 m across, on a stem facing the room, with a stamped brass tag under it in the wall diagram's words, SQUARE and HOUSES; opening
spins the wheel two turns. The flywheel is iron grey; the spare lengths and the drain are gone; the pump room's lamp
is drawn with its shade lit from within and casting no shadow, its light under the shade. (3)–(4) Prompts `p_cock_sq` "Open the square's line" / `p_cock_ho` "Open the houses' line"; chapter 11
keeps "Turn" under its own key `p_cock_co`; `p_cock` stays 'Open' (chapter 3's lift, chapter 8's culvert). The cocks are
ranked by their wheels (the hand point is at the wheel's right, so from the lower cock's spot the upper's hand point was
as near as its own). Stand spots 0.75 m apart, the upper's clear of the pier. (5) The wrong cock: the upper run shakes and
roars at once, the thought comes at once, the wheel kicks back shut with a clang at 0.8 s and Zoé's one knock follows at
1.15 s — on the room's own timers, so they run under the thought.

**Wording (the pump room's lines, kept by the dialogue pass):**
- `ct_sub_cock`: "Behind the brick pier: open the houses' line"
- `ct_follow`: "(It runs along the back wall, behind the brick pier, to the cocks there.)"
- `ct_bypass_see`: "(Behind the pier: a cock on each old pipe, SQUARE and HOUSES. The copper pipe is bolted onto the
  houses' line under its cock, and that cock is shut. The lane's water goes down the new pipe.)"
- `ct_cock_wrong`: "(The upper pipe roars and the cock kicks back shut. That's the square's line, and the square has its water.)"
- prompts: "Open the square's line", "Open the houses' line"

**Evidence.** `tests/playtest-15.mjs` P37/P39; captures before/after from the door, on the approach and at each cock.

## Tests

(filled in below)
