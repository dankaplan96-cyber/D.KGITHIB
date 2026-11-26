# FPS60-AUTO (P137, 26.11): always 60, lower the quality instead

The user (26.11, playing on the laptop: Intel UHD 620, 59.9 Hz screen): "Whatever we do, 30 fps just looks bad"
("לא משנה מה נעשה 30 fps נראה פשוט רע"). The user's pick: **always 60, lower the quality instead.**

Everything measured here is **automated runtime only (SwiftShader, headless Chromium)**. These runs check what Auto and
the frame pacing *decide* when frames are slow. They do not show how fast any real GPU is, or how smooth any real screen
looks. No number below is from the UHD 620, the GTX 1050 or the work computer. Order 76 (already written in
`tools/testlab/CLOUD_ORDERS.md` by the coordinator) asks for the laptop's own result.

Base: `ccr-c1c2c4b9-dep6ed` at 87b0f1a4 (P137 row). Files: `src/engine/pace.js`, `src/engine/autoquality.js`,
`src/engine/autoapply.js` (labelText), `src/main.js` (Settings' quality line only: no loop or renderer change),
`src/game/text/common.js` + `he/common.js` (+ `he-text.js`), `tests/autoquality.mjs`, `tests/fps60-auto.mjs` (new),
`tools/fps60-sheet.py` (new), `captures/fps60-auto/steps.png`.

## 1. Where 30 came from (what the code did before)

The Frame Rate setting has three chips: 30 / 60 / **Unlimited**. The stored value of Unlimited is `fps: 'auto'`, and
the coordinator's brief calls it "Auto". It has been the default since qv 4. Two different parts of the game are
involved:

- **Auto quality** (`autoquality.js` Governor, `autoapply.js`) never sets or writes the Frame Rate. It moves between
  picture profiles: High · Medium · Medium-lean · Low. It works to the frame budget of the current pace
  (`paceBudgetMs`, never under 16.67 ms).
- **Unlimited's even pace** (`pace.js` EvenPace, PACE-ALL / P101b) applies only on screens faster than 70 Hz. When the
  game cannot fill every refresh there, it draws every n-th refresh. Its floor was 45 fps, **or 80 % of what the game
  draws now**. That escape let a slow game go to 30. A game drawing ~37–45 fps (`tests/autoquality.mjs`, the same
  modelled game, 20 s) was paced at:

  | screen (Hz) | 75 | 90 | 100 | 120 | 144 | 165 | 240 |
  |---|---|---|---|---|---|---|---|
  | before P137 (fps) | 25 | 30 | 33.3 | **30** | 36 | 33 | 40 |
  | now (fps) | 75 (every refresh) | 45 | 50 | **60** | 72 | 55 | 60 |

  Because a pace below 60 lowered Auto's budget (every 4th refresh on 120 Hz is a 33.3 ms budget), Auto would then
  *keep* the heavier picture at 30. That is the "Auto can settle on 30" the brief describes.
- **On a 50 / 59.9 / 60 Hz screen, the user's laptop included, nothing caps the frame rate under Unlimited.** The even
  pace is off there (≤ 70 Hz), and Auto changes only the picture. On the laptop, 30 came from one of two things:
  - **Frame Rate 30 picked by hand.** The P88 / P94 / FPS30 work (18–22.11) was tested on this laptop at 30, and a stored
    `'30'` stays (§3).
  - **Auto at its old floor (Low) still below 60.** On a fixed 60 Hz panel that means a mix of 16.7 and 33.4 ms
    frames: 40–50 fps, uneven.

  The second cause is what §2's new rungs address, and §4 says where they cannot.

## 2. What changed

### 2.1 The even pace never goes below the screen's ~60 class (`pace.js` floorRefreshes)

The deepest pace Unlimited may take on a screen is now the whole-refresh rate nearest 60 Hz, measured by ratio, with
ties going to the faster rate. The `KEEP` escape (80 % of the delivered rate) is gone. A frame that needs more than the
floor gets the floor's pace, and Auto quality then lowers the picture until it fits. Already at the floor, it is not
paced deeper; the refusal is noted once in the log.

| screen (Hz) | 50 | 59.9 | 60 | 75 | 90 | 100 | 120 | 144 | 165 | 240 |
|---|---|---|---|---|---|---|---|---|---|---|
| slowest even pace (fps) | 50 | 59.9 | 60 | 75 | 45 | 50 | 60 | 72 | 55 | 60 |

- The values are stable at ±0.5 % of each rate (for example 144.1 Hz → 72).
- 50 Hz screens keep their own rate (never paced, as before).
- 120 and 240 Hz stop at 60. 144 Hz stops at 72: 48 is as far below 60 as 72 is above it, and a tie takes the faster.
- **For the coordinator to decide:**
  - The brief does not name 75 / 90 / 100 / 165 Hz. Under this rule 90 Hz may pace to 45, 100 Hz to 50 and 165 Hz to 55.
    Those are the even rates nearest 60 on those screens. The 50 on 100 Hz is P101's fix on the user's work computer
    (protected in START.md); a flat 58-fps floor would undo it and bring back the 10 / 20 ms mix the user reported.
  - 75 Hz now never paces at 37.5. Before, it did for a game under ~47 fps.

  If the user wants "never under 60" literally on 90 / 100 / 165 Hz, the alternative is to leave those screens unpaced
  (an uneven mix at 60–100 fps). That is one constant to change.

### 2.2 Auto's ladder: three rungs below Low (`autoquality.js` PROFILES)

The four profiles above are unchanged. They are the user's own order (LOOK-FIRST 29.10, AUTO-2 30.10, AUTO-FLOOR 01.11,
P95 21.11): effects, edges and far detail go first; resolution and shadows go last, at Low. The brief suggested
resolution first. That would reorder a ladder the user tuned step by step, so it was not done. The new rungs follow
the brief's order below Low (resolution in steps, then detail). Shadows are already off at Low.

| # | profile | what it is | for |
|---|---|---|---|
| 1 | High | as before | |
| 2 | Medium | as before | |
| 3 | Medium-lean | as before (skipped on battery) | |
| 4 | Low | the Low preset: 85 % resolution, no shadows, no MSAA (output-pass edges), 2 lamps, Low's grass and small casters | |
| 5 | **Low-eco** | Low + far people (beyond 25 m) animated at half rate + their tiny far parts dropped | CPU pressure only |
| 6 | **Low 75 %** | Low-eco at 75 % resolution (−22 % pixels), sharpened in the output pass | GPU pressure only |
| 7 | **Low 65 %** | Low-eco at 65 % (−25 % pixels from 75 %): **the floor** | GPU pressure only |

- **One side per rung (`Governor.below(p, kind)`).** A step down for CPU pressure never takes a resolution-only rung:
  that would cost sharpness and buy no CPU time. A step for GPU pressure steps over Low-eco, which buys almost no GPU
  time. Without this, P95's revisit (a step that bought < 7 % goes back and blocks further steps of its kind) would
  take Low-eco back and stop every GPU step after it.
- **Step size.** Each resolution rung is ~−22 % of the pixels, not smaller. A GPU pays only part of its time by the
  pixel, so a −11 % step would buy ~6 % and be taken back by that same 7 % rule.
- **The floor, in pictures.**
  - On the UHD 620 laptop (an integrated GPU on a dPR 2 screen, Auto's base pixel ratio 1.25), Low 65 % draws 0.81
    of the screen's pixels across.
  - On a dPR 1 screen it draws 0.65, never under the renderer's 0.6 rule.
  - Shadows are off from Low down. Lamps stay at 2, because night streets and interiors need them to read. Silhouettes,
    the HUD and the menus (HTML) are never scaled.
- **What the rungs do not change.** Nothing below Low touches the simulation, collision, aim or any timing: the knobs
  are visual only (`KNOBS`, unchanged). The resolution steps change only the scene pass's viewport (`applyScale`). No
  render target is rebuilt between Low and Low 65 % (same pixel ratio, same MSAA 0). As always, a profile changes only
  at a commit point: a scene change behind its black, or an open pause, inventory or map.
- **Unchanged rules.** Hysteresis, cooldowns and the step back up are as before:
  - ≥ 3 pressure windows of 1.5 s before a step;
  - a step judged at the revisit;
  - one step up per evaluation when the cost model says the profile above fits;
  - in hold, only a sustained problem steps down (80 % of windows over 30 s);
  - the next start tries one up when the session had room.

  Stalls, scene changes, menus, a hidden or unfocused window and shader holds are never counted.
- **Estimates, not measurements.** The new rungs' gpu / cpu shares (0.31 / 0.29 / 0.26 and 0.63) are estimates (§5).
  They pick no start (a start is never below Medium) and only judge a step up's room.

### 2.3 Settings' text

No line said Auto may choose 30, so no line needed that change. The Settings quality line shows the profile Auto runs
(`set_h_q_auto`, "Auto ({s}) …"). That name was English in the Hebrew menu, as was ", settling". This is now game-wide:
every profile's name comes from `q_prof_<id>`, plus `set_h_q_settling`, in English and Hebrew. Hebrew: גבוהה, בינונית,
בינונית חסכונית, נמוכה, נמוכה חסכונית, נמוכה, רזולוציה של 75% / 65%. `node tools/he-bundle.mjs` was run;
`node tests/dialogue-check.mjs` PASS (6640 / 6640). The benchmark's report keeps the English `label()`.

## 3. Saves: a stored 30 is the player's

Only two things have ever written `settings.fps`:

- the Settings chip (`wireUI`: `this.settings[seg.dataset.setting] = b.dataset.v`);
- the qv 4 migration (SETTINGS-FEW, 30.10), which set **everyone** to `'auto'` once.

Auto quality, the even pace, the benchmark (`benchCapMs`), power changes and the battery profile never write it
(`git log -S` over `src`, and a grep of every `settings.fps` write). So a `'30'` in a save is always the player's own
choice, and it stays. **No qv 5 migration was added.** Saves with `'auto'` (nearly everyone: the default since qv 4)
get the new rule at once. `tests/fps60-auto.mjs` A covers this: nothing stored → Unlimited; Unlimited → Unlimited;
30 → 30 (33.33 ms limit); 60 → 60; qv unchanged.

**Flag:** the user's own laptop very likely still holds `'30'` from the FPS30 tests (P88 / P94). It stays at 30 until
Frame Rate → Unlimited is picked. Order 76 must check this first (§7).

## 4. What Auto cannot do: the CPU-bound street

AUTO-P95 S4 and FPS30 §10, from the user's own UHD 620 report (19.11, `HARDWARE/2026-11-19-intel-uhd620-mains`):

- On the Citadel street the CPU work was p50 16.4 / p95 22.3 ms a frame at Medium (21.9 at High).
- Low's CPU is about Medium's (render submission 5.4 vs 5.1 ms on the i5 UHD).
- On battery, Low at 60 still missed refreshes, with a main-thread p95 of 28.8 ms (FPS30-PRESENT).

The simulation and submission costs no picture setting removes are the larger part of a frame there. **So on that
street, no profile can promise 60.** The rungs below Low help GPU-bound views. Low-eco takes what the two far-people
knobs save on the CPU (~10 % by the test truth).

The synthetic decision table (`tests/autoquality.mjs`; each machine's truth from those reports, the new rungs' truth an
assumption; 8 min of street / interior / street / combat):

| machine | power | before P137: settles on, street fps | now |
|---|---|---|---|
| UHD 620 (dPR 2) | mains | Medium-lean, 44.1 | Medium-lean, 44.1 (the step to Low bought nothing and went back, so no CPU step after it) |
| UHD 620 (dPR 2) | battery | Low, 36.6 | **Low-eco, 41.2** |
| UHD 620 light CPU (GPU-bound) | mains / battery | Medium-lean / Low, 60 | the same, 60 |
| UHD 620 light CPU, Frame Rate 30 by hand | battery | Low, late 0.06 | Low 65 %, late 0.05 |

The rest of the table (fast GPU, GTX 1050 mains / battery / 41 Hz / paced) is unchanged. The last row is a side
effect: under a hand-picked 30 limit with GPU frames shown late, Auto may now go below Low by resolution too.

The remaining gap on the street is CPU work. That belongs to the runtime performance engineer (the street's
simulation / submission), not to this ladder. Handed to the coordinator.

## 5. Tests (automated runtime only, SwiftShader)

- `node tests/autoquality.mjs`, updated to the new rule: **94 / 94 PASS**. Changed or new checks:
  - seven profiles, with TIER_AT.low by id;
  - the three rungs' knobs and sides;
  - a CPU-bound machine goes down to Low-eco, never a resolution rung;
  - new 9b: a GPU-bound machine Low cannot hold goes to Low 75 % at 58 fps and steps over Low-eco;
  - the even pace's counts (144 Hz / 16 ms frames: every 2nd refresh, no longer every 3rd at 48);
  - the slowest even pace per screen (table §2.1, ±0.5 %);
  - a ~37–45 fps game on 75–240 Hz never paced below the screen's class at any moment (the before row above:
    `BEFORE_PACE=<old pace.js>`);
  - 75 Hz never 37.5.

  The P95 / GPU-TIMER-KA tables print before and after with `BEFORE=<old autoquality.js>`.
- `tests/fps60-auto.mjs` (new, the real `Game.loop`, synthetic display, modelled frame cost, the governor on with
  `?autoq`; RESULTS-B-D)
- `tests/fps30.mjs` and `tests/autoquality-game.mjs` once: RESULTS-OTHER

## 6. The picture sheet

`captures/fps60-auto/steps.png` shows the seven profiles, best first: the same frame of the Citadel street (the
benchmark's `street` route start, play camera, time held), with a 2× inset of the middle of the view. Made with
`SERVE=1 ONLY=S node tests/fps60-auto.mjs` and `python3 tools/fps60-sheet.py`. It is SwiftShader at dPR 1, 960×540.
On the laptop every profile is drawn at 1.25× this pixel ratio. The far-people knobs (Low-eco: half-rate far
animation, tiny far parts) do not show in a still. SHEET-NOTES

## 7. For order 76 (the laptop)

Order 76 is already written. These points would make its result readable:

- Note the Frame Rate found on arrival, before changing anything. If it is 30, that was the user's own pick (§3): set
  **Unlimited** (the chip the brief calls "Auto").
- Note whether the laptop is on mains or battery.
- Cross scenes or open the pause menu: a queued step takes effect only at a commit point.
- At the end, paste `game.autoQ.report()` and `game.autoQ.log`. The `last window` line, with its kind and CPU / GPU
  p90, on the street and in an interior, tells "the floor is too high" (GPU) from "CPU-bound" (§4).

## 8. Untested / uncertain

- No real hardware: whether the laptop holds 60 anywhere at Low 65 % is order 76's to answer.
- The new rungs' cost shares are estimates.
- No real display was used. The pipelined frame-cost model in `fps60-auto` is an assumption about how a GPU-bound
  browser spaces its frames.
- The governor still calls a window "holding 60" at ≥ 55 fps with < 6 % of the intervals over 20 ms (P95, unchanged).
  On a fixed 60 Hz panel, a machine can therefore settle with about one doubled frame in 17. A stricter bar would mean
  more steps down for everyone; that is a decision for the user.
