# WAVE 2 — three optional side quests (H-3, H-4, H-5), as built

The user approved expansion wave 2 on 24.11.2026 (`CONTENT-15H.md` §3, "The user's answers"). Built 24.11.2026 on a
worktree of `ccr-c1c2c4b9-dep6ed` (base `745b7ba5`). The designs are the approved cards in `DEPTH-PLAN.md` (each card now
has a **Built** row saying where the build differs). **Automated runtime only (SwiftShader, headless Chromium)**: nobody
has played these, no frame rate or hardware result is claimed, and every minute below is an **estimate**.

| Id | Card | Place | What the player does | Reward | What stays (the "three chapters later" rule) | Est. min |
|---|---|---|---|---|---|---|
| H-3 | HAM-3 Yorna's brother's pack | the Hamalayi glacier basin, north rock (chapter 7 after the vent opens, any later chapter) | sees a pack frozen in clear ice; the ball only skips off; melts it with the **heat flask** (filled at the open vent) **or** turns the crew's **signal mirror** an eighth at a time until its spot of sunlight lands on the ice; takes the pack; gives it back to Yorna | a singing crystal (+1 max life), the brother's notebook (lore: warm ground under the ice years before the project) | the melted hollow and its meltwater; the mirror where he left it; Yorna's line about the pack by her door in a later chapter | 10 |
| H-4 | DES-1 Where the figures look | Desert Island, the sand flat between the two standing figures west of Kesh (chapter 5 once the condenser hall is dug, any later chapter) | hears Brosk's grandfather's saying ("dig where the stone people look"); looks at the two painted figures (both stare at one patch of sand; the view follows the stare); finds the only drift on the flat, borrows Brosk's shovel again, digs, opens the survey hatch | a singing crystal, the surveyors' note ("Drilling stopped. The ground SANG.") | the hatch open in its dug sand; the figures "pleased with themselves"; Brosk's line when the shovel comes back | 10 |
| H-5 | UND-1 The source | the crystal galleries, the start shelf's west wall (the descent, chapter 15, through the epilogue) | with any singing crystal in his pocket the crusted wall hums (his line, the seams glow); the **singing fork** cracks it, **or** the **lantern** shows a crack low in it and the **ball** breaks it there | a singing crystal (possibly the twelfth: COL-1's payoff, Sendell's catch in the core) | the open cell, still singing (its own line in the epilogue) | 5 |

Total for a player who does all three: about **25 min** (estimate; the cards' own figures, the bot's times not converted).
With these three, **all twelve singing crystals can be had in play** (`crystals.js`: every slot `built: true`).

## How each one plays (state and recovery)

**H-3** (`depth.js` section HAM-3). Flags: `dx_pack_ask` (Yorna's hook, after her own line), `dx_pack_seen`,
`dx_pack_mirSeen`, `dx_pack_mir` (0..7, as found 1; the light lands on the ice at 5), `dx_pack_mirSaid`,
`dx_pack_thawed` (`'flask' | 'mirror'`, set when the melt starts: leaving or saving mid-melt loses nothing),
`dx_pack_taken`, `dx_pack_given` (the chapter it was given in + 1), `dx_pack_later`; the owed crystal `dx_owe_sc_pack`.
- Teaching: the flask's heat melts ice (chapter 6, the winch); light melts ice (chapter 7, the dome). The mirror is the
  same kind as the observatory's shutter. No timing: the flask's charge lasts 90 s for a 25 m walk; the mirror's light
  stays where it is put. A wrong eighth shows where its light lands (snow, the rock beside the ice, the ice-field in
  front); the first turn says "The sunlight goes where the mirror looks."
- Order: the ice can be looked at, melted and the pack taken before Yorna asks; she still takes it back then.
  Chapter 14's first talk with Yorna is left alone (the hook waits until that talk is done).
- Fixed on the way (game-wide, the one heat source with the fault): the open vent's heat could never be drawn — its
  3.4 m collider kept its middle (where the reach was measured) out of reach. `kit2b.js heatNear` now measures to its rim.

**H-4** (`depth.js` section DES-1). Flags: `dx_gaze_ask`, `dx_gaze_f0`/`f1`/`seen`, `dx_gaze_drift`, `dx_gaze_shovel`,
`dx_gaze_dug`, `dx_gaze_open`, `dx_gaze_back`; owed crystal `dx_owe_sc_figures`.
- The geometry decided two things against the card: the twin pillars stand 150 m east of the figures (no crossing of
  gazes there), so the drift lies **between the two figures**; LBA2's figures have **no faces**, so each gets painted
  eyes on its band (a ring skin 1 cm off the band, alpha-tested), aimed exactly at the drift (the test measures 0°).
- The gaze on camera: from the play camera at a figure's foot the face is in view (the Look's talk shot frames it); after
  the line a camera beat (revealcam.js) rises over the figure's head and looks down its stare at the drift for 2.8 s, then
  hands back. From the drift itself the play camera (Far, follow) does not frame the figures' heads (they are 18–29 m
  off and 5 m tall), so the stare is read at the figures, not from the drift. This is a design judgment for the user.
- Not built from the card: the new mark on Anko's sketch (a carried item with fixed text in `purposes.js`, not this
  file's). The pocket set's hum at the drift is built (one line in `kit2.js hums`).
- Shovel: Brosk lends it once the drift or both stares are found (with his saying on the first talk); a player still
  carrying chapter 5's shovel before the hall is dug can dig here too. It shows in the inventory while lent.

**H-5** (`depth.js` section UND-1). Flags: `dx_src_hum`, `dx_src_crack`, `dx_source` (`'fork' | 'ball'`); owed crystal
`dx_owe_sc_source`. Before the lantern has shown the crack the ball skips off the crust with a line (P2); once the crack
is known, a ball on the crust breaks it there. One fork strike near both Ilka's wheel and the pocket answers both (the
wheel's line is read first, then the pocket opens). Chapter 15 is meant to be empty of people: this is a find, not a person.

## Files

| File | Change |
|---|---|
| `src/game/story/depth.js` (owned this wave) | the three quests: build, state, interaction, the Yorna/Brosk hooks, journal lines, `heatHit`, `hums`, `items` |
| `src/game/crystals.js` | `sc-figures`, `sc-pack`, `sc-source` → `built: true` |
| `src/game/text/depth.js`, `src/game/text/he/depth.js`, `src/game/he-text.js` | 45 new English lines and their Hebrew (bundled) |
| `src/game/story/index.js` (shared: 3 one-line hooks) | `heatHit` asks depth after kit2b; `items()` includes depth's (the lent shovel); `forkHit` always asks depth too (the fork's note answers everything warm in reach: the pocket stands within a strike of Ilka's wheel, which took the note first) |
| `src/game/story/kit2.js` (shared: 1 line) | the pocket set's hums include depth's (the drift) |
| `src/game/story/kit2b.js` (shared: 1 fix) | the open vent's heat drawn at its rim (see H-3) |
| `tests/depth-wave2.mjs` (new) | the one covering suite |
| `tests/depth-1.mjs` | its registry check updated (all six quest slots now built) — not re-run |
| `tests/overlap-sweep.mjs` | the standard `SERVE=1` option (request routing; no http.server) |
| `docs/lba-maturity/DEPTH-PLAN.md` | a Built row on DES-1, HAM-3, UND-1 |
| `captures/wave2/` | before/after pictures |

Not touched: the chapter 15–16 story files (`answer.js`, `chapter3.js`, the core), `characters.js`, `sculpt.js`, the
opening and tutorial files. Nothing existing moved; the Citadel harbour is not touched. Save format unchanged (6): every new
state is a new `dx_` flag that an old save simply lacks.

## Objects added and removed, per place (nothing removed anywhere)

| Place | Added (each with its job) |
|---|---|
| Hamalayi, glacier basin north rim | **1 ice wall** (a faceted block of clear ice against the rock, the pack inside; collider), **1 ice shelf** (the pack lies on it; stays), **1 meltwater puddle** (after the melt), **1 pack** (taken), **1 signal mirror on a stone post** (turns; collider; a brass plate SIGNAL / OBSERVATORY), **1 light shaft + 1 light spot** (where the mirror's sunlight lands: the puzzle's read-out) |
| Desert Island, west of Kesh | **2 painted faces** on the existing standing figures' bands (the gaze; the figures themselves unchanged and unmoved), **1 sand drift** (the dig spot; standable collider), under it **1 survey hatch** (concrete collar, hinged iron lid stencilled SURVEY 7, dark hole, a box; shown once dug), **2 small spoil heaps** (the dug sand) |
| Crystal galleries (underground) | **1 crusted pocket** on the west wall of the start shelf: 4 rim rocks, a dark hollow, 8 crust plates with glowing seams, a crack (shown by the lantern), a cluster of 5 crystals inside (shown once open); collider |

## Tests (Automated runtime only, SwiftShader)

- `SERVE=1 node tests/depth-wave2.mjs` (one run): see the result block below.
- `node tests/overlap-sweep.mjs` once for the new props (`ONLY=desert,hamalayi,c3gallery`): see below.
- `node tools/he-bundle.mjs` then `node tests/dialogue-check.mjs`: **PASS** (5739 of 5739 keys in Hebrew; no warning on a
  new key).

### Results (24.11.2026; Automated runtime only, SwiftShader, headless Chromium; the machine shared, load 8–20)

**`SERVE=1 node tests/depth-wave2.mjs`** — **PASS: 38 passed, 0 failed; errors none; resources none missing** (run 4, the final code).
The checks, in order: the registry (12, all obtainable); H-3 found, looked at before Yorna, the ball skips off, Yorna's
hook after her own line, the mirror looked at and turned three eighths (snow, rock, rock), Save & quit → Continue keeps
the eighth, the fourth eighth on the ice melts it (mirror way), the pack by hand: crystal +1 max life once, used again: no
second crystal, the pack back to Yorna, a later chapter: hollow, mirror, Yorna's line; H-3 from a fresh state: heat drawn
at the open vent, let out at the ice (flask way), Save & quit mid-melt → Continue: ice gone, pack there, taken once; H-4
not offered before the hall is dug, the drift and the gazes (bearing error 0 for both), both figures looked at, the drift
wants a shovel, Brosk's saying and the lent shovel (inventory), dug, Save & quit → Continue keeps the dug hatch, opened:
crystal once, the shovel back, chapter 8: hatch still open; H-5 nothing before chapter 15, the hum with a crystal held,
the ball skips off before the crack, the lantern shows the crack, the ball then breaks it: crystal; fresh state: the fork
cracks it (the same strike also turns Ilka's wheel, both lines read): crystal once; the epilogue: still open; the journal;
an old format-6 save in the galleries loads with no new state made up.
Earlier runs of the same suite on this branch (each fixed before the next): run 1 found the open vent's heat could not be
drawn (fixed in `kit2b.js`) and harness walks too long for one go (logged ISO puts); run 2 found the ball target too
small on the crust and the fork strike taken by Ilka's wheel first (fixed: one crust target; `index.js forkHit` asks depth
too); run 3: 37 of 38, the one fail the harness picking up the crystal while a line was open (fixed in the test).

**`SERVE=1 ONLY=desert,hamalayi,c3gallery node tests/overlap-sweep.mjs`** (one run; `tests/overlap-sweep.mjs` gained the
standard `SERVE=1` option for it): **PASS** — 3 areas scanned, (a)–(g) 0 open findings; known (by design, all pre-existing
rocks and buildings): desert c 1, d 3, e 1; hamalayi c 7, d 26; c3gallery none. The sweep sees the places as found (the
ice whole, the drift undug, the crust shut); the after-states (hatch, puddle, open cell) were looked at in the pictures,
not swept.

**`node tools/he-bundle.mjs` + `node tests/dialogue-check.mjs`**: PASS (5739 of 5739 keys in Hebrew; no warning on a new
key).

## Pictures (`captures/wave2/`)

`-before` = the baseline build (`745b7ba5`'s depth.js, crystals.js, index.js, kit2.js served in place of the new ones),
`-after` = this build; same place, same staging, same camera. `-play` = the play camera (Follow, Far, 960×540);
`NOTPLAY` = a fixed camera for a close look (labelled so).

- H-3: `h3-glacier-play-{before,after}`, `h3-glacier-mirror-on-ice-play-after`, `h3-glacier-done-play-after`,
  `h3-ice-close-NOTPLAY-after`
- H-4: `h4-sandflat-play-{before,after}`, `h4-sandflat-hatch-open-play-after`, `h4-figure0-face-NOTPLAY-{before,after}`,
  `h4-figure1-face-NOTPLAY-{before,after}`, `h4-look-figure1-talkshot-play-after`, `h4-look-figure1-gaze-beat-play-after`
- H-5: `h5-galleries-play-{before,after}`, `h5-lantern-crack-play-after`, `h5-galleries-open-play-after`,
  `h5-crust-close-NOTPLAY-after`, `h5-cell-close-NOTPLAY-after` (the close looks with a 45° lens; the room camera's own
  lens is long)
- `h4-look-figure1-gaze-beat-play-after` is the camera beat after the Look (over the figure's cap, down its stare to the
  drift), taken with beats forced on; the other `-play` pictures are the plain play camera.

## Decisions for the user

1. **The figures' painted eyes (H-4)** change the look of two LBA2-derived landmarks. Keep, or keep the quest with the
   gaze carried only by Brosk's saying and the Look lines (the faces off)?
2. **Where the gaze reads**: at the figures (talk shot + the beat), not from the drift (the play camera does not frame
   their heads from there). Enough, or should the drift move nearer one figure?
3. The H-3 ice wall and mirror post, and the H-5 crusted pocket, are new geometry in existing places (pictures above).

## Unverified / risks

- Nobody has played these; whether a newcomer notices the drift, the mirror's rule or the crust is not known.
- The camera beat along the gaze runs only in normal play (beats are off with `?nocine` and in the tests); its picture
  was taken with the beat forced.
- The overlap sweep ran once; findings are listed above.
- `tests/depth-1.mjs`'s registry check was updated, not re-run (rule: one suite per change).
- Wave 1 (another worker) edits the chapter 15–16 files; the galleries' pocket is in `c3gallery`, which wave 1 does not
  list; `index.js` has three one-line hooks here that must be merged with wave 1's.

## סיכום בעברית (קצר, בלי ספוילרים מעבר לפרק 2)

נבנו שלוש משימות צד אופציונליות במקומות קיימים:
- **אגן הקרחון בהרי ההמלאיה:** תרמיל קפוא בתוך קיר קרח צלול. הכדור לא עוזר; אפשר להמיס את הקרח בבקבוק החום, או לסובב מראת איתות על עמוד עד שכתם אור השמש נוחת על הקרח. בתוך התרמיל גביש שר ומחברת, ואפשר להחזיר אותו לבעלים.
- **אי המדבר, מערבית לכפר:** לשני פסלי האבן העומדים צוירו עיניים, ושניהם בוהים באותו תל חול. שואלים את חפירת הסוחר שוב, חופרים ומוצאים פתח מדידה ישן עם גביש שר.
- **גלריות הגבישים מתחת לאדמה:** קיר מכוסה קרום מזמזם כשיש לשחקן גביש בכיס. המזלג המזמר סודק אותו, או שהפנס חושף סדק שהכדור שובר.
עם שלושתן אפשר לאסוף את כל שנים־עשר הגבישים השרים. תוספת משוערת: כ־25 דקות לשחקן שעושה את שלושתן. כל השינויים בעולם מוצגים בתמונות "לפני/אחרי" בתיקייה captures/wave2 לבחירת המשתמש. הבדיקות אוטומטיות בלבד (SwiftShader).
