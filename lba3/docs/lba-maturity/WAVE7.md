# WAVE 7 · H-17 Missing Deliveries, H-18 Dallan's Debt (25.11.2026)

The user approved waves 1–8 of CONTENT-15H.md being built; nothing ships until the user picks from the pictures (P107).
The rows: CONTENT-15H.md §3 H-17, H-18; the cards: docs/future/EXPANSION_PLAN.md §4.5 OP-1 and OP-6 (the world parts:
EXPANSION_WORLD_SPEC.md W-8c). Evidence label for everything here: **Automated runtime only (SwiftShader, headless
Chromium)**. Nobody has played it; no hardware figure; no listening; no measured playtime.

## What the player does

### H-17 · Missing Deliveries (chapters 8–14 on Citadel; from Pippa's supplies in chapter 8 until the network ends)

| Step | Where | What happens | Clue |
|---|---|---|---|
| Hook | Pippa at her stall (or Tim, wherever he is) | Her second cart for the depot shelter never came: blankets and water casks. She chalked SHELTER on every crate. | Pippa; Tim |
| Chalk | beside Pippa's stall | One of her crates: SHELTER in chalk, a loop on the S (her hand). | the crate |
| Compare | the harbour's cargo lift (the opening's, not moved) | The lift has stalled with its hook down on a crate aboard the barge. E at the lift's control: the crate under the hook is stencilled STATION over Pippa's chalk SHELTER; the barge's other crate has nothing under its stencil (the project's own). A clamp on the lever: HELD, UNCLAIMED GOODS, KEY AT THE BAGGAGE CLAIM. | the tag |
| Ledger (optional) | Officer Odile | The lift crew restencilled them; the station never collected; the paper and the key went to Osk at the baggage claim. "It's all perfectly in order. That's the trouble." | Odile |
| Claim | the baggage claim (the 'bug' house in Bug Street), Osk upstairs | Held for the station: what's in them? Drill parts / blankets and water casks / lamp oil and rope. Wrong: "What would Pippa chalk on a crate?" (nothing lost). Right: never the station's; the back store opens off the old conveyor's lever, which "only listens to a kick". | Osk |
| Kick | the back store: a wire cage in the front hall | The lever (E): seized solid. A melee hit (fists, sword) frees it. | Osk's line |
| Lever | the same | Run it in: the wrong way (the bales bump the back door; nothing lost). Run it out: the roller shutter rolls up, the conveyor brings the bales out. | |
| Inside | the cage | The lift's key on its hook (found, carried). The back door (E): unbolted. It opens the back passage: a door on the house's west wall, behind the house by the sea wall's stair; it stays open for the rest of the game. | |
| Lift | the cargo lift | The key frees the clamp. A menu: Hoist / Swing over and lower / Lower it back. Swinging first only heels the barge (nothing moves); Hoist, then Swing: the crate set down on the pier. | |
| Delivery | Pippa | "Tim! Lulu! Take the cart." A clover leaf (15 kashes at nine). | |
| After | the depot shelter; the harbour | Blankets and water casks stacked by the shelter's door while the shelters are in use (chapters 8–16); the crate gone from the pier meanwhile; Tim's line ("Lulu rode on top the whole way"), Pippa's, Osk's. In the ending the lift is as the opening left it. | |

### H-18 · Dallan's Debt (chapter 14 after the bore's relay is held, and the ending's free play; Kesh)

| Step | Where | What happens |
|---|---|---|
| Torn | Lumi's loom | The vent's blast tore her shade: what is left sags between the two low poles, a rag hangs off one, the rest lies by the high pole's foot. |
| Ask | Lumi | A choice. "Dallan should pay for this." — "With an apology? I've had the project's apology. It was a form." (nothing gained). "What do you need?" — canvas, two poles, the top ring back on its hook; the canvas is the project's. |
| Dallan | at the bore (or in Kesh, in the ending) | Twinsen tells him. "The store key is still on my belt." "I can carry it." "No. I'll carry it." No apology. He is at the sail with the canvas roll and two poles; the two low corners tied, the third corner on the ground with its ring. |
| Ring | the high pole's hook | A ball target: the ball takes the ring up onto the hook. The sail is up. Lumi: "The sail's straight. That's something." Dallan: "I'll check the knots after the next wind." |
| After | | Lumi: "I check it every morning anyway." Dallan: "Knots held." Lumi is not won over. |

## Flags (new only; save format 6 unchanged)

`w7m_hook, w7m_labels, w7m_tag, w7m_ledger, w7m_claim, w7m_wrong (n), w7m_free, w7m_store, w7m_key, w7m_back,
w7m_unclamp, w7m_hoist, w7m_lift, w7m_done, w7m_piAfter, w7m_timAfter, w7m_osAfter, w7m_home` (delivered in the
ending: to Pippa's stall; see Ending);
`w7d_paid, w7d_need, w7d_dallan, w7d_up, w7d_luAfter, w7d_daAfter`. An old save has none (base-11-town and
base-13-desert, format 5, load with none made up). applyFlags keeps them consistent (a later step implies the earlier
ones). A lift, shutter or lever moving is not saved: a load stands each where its flags put it.

Nothing on the main path needs either story; neither changes a main-path rule. H-17 is open while the shelters are in
use (the depot shelter is where the goods go) and, since 25.11, in the ending's free play for a player who has not
finished it (see Ending); a player who never does it loses nothing.

## Files

- `src/game/story/wave7.js` (new): both stories (talk, interactions, the lift's and the store's moves, the kick, the ring,
  the journal's two sections, the pocket).
- `src/game/wave7world.js` (new): the pieces (below).
- `src/game/text/wave7.js`, `src/game/text/he/wave7.js` (new), `src/game/he-text.js` (bundled).
- `src/game/story/index.js`: wired in (placeFirst for Dallan, decorate, region builds, doors and the back exit, talk,
  interact, the kick, update, flags, journal, items).
- `src/game/baggage.js`: BAGGAGE_PLAN.store; the back door's opening in the left wall; the two drums moved from where
  the cage stands to the front rim; the striped cloth moved past the front door.
- `src/game/roomlife.js`: Osk `stays` in the evacuation (he signs for held goods; the rooms otherwise empty then).
- `src/game/keshlife.js`: the sail's mesh, poles and ground function exposed (`out.sail`), nothing changed in its look.
- `tests/wave7.mjs` (new, the one suite). Docs: this file; CONTENT-15H.md (H-17/H-18 Built).

Not touched: `story/depth.js`, any keys/clover file, the harbour's layout (the lift, barge, crates stay where they were).

## Visible changes (P107: the user picks)

1. The cargo lift (chapters 8–14 while the story is open): the hook down on its crate aboard the barge (the opening's
   own crate, the cycle's first pose) instead of the crate on the pier; STATION stencils on the lift's two crates; a
   clamp and a red tag on its lever. After the delivery the pier spot is empty until the ending.
2. A chalked crate beside Pippa's stall (chapters 8–14 while open).
3. The baggage claim: a wire cage with a roller shutter and a sign (BACK STORE · STAFF ONLY) against the front hall's
   left wall, a lever outside it, a short conveyor and two bales inside, a key on a hook; a back door in the left wall
   (always there; bolted until opened). The two drums moved to the front rim, the striped cloth past the front door.
4. The 'bug' house's west wall: a plank back door with a frame, lintel and step (always there; it opens once unbolted).
5. The depot shelter's door: three bales and two water casks after the delivery (chapters 8–16).
6. Kesh: Lumi's shade torn (chapter 14 after the bore, and the ending, until fixed), rigged by Dallan with a canvas
   roll and two poles beside it, then up again (the original sail).
7. Osk is in the baggage claim during the evacuation (the rooms were empty then except Luc and Mr Bazoo).

## Tests (Automated runtime only, SwiftShader)

| Suite | Run | Result | What it covers |
|---|---|---|---|
| `SERVE=1 SHOTS=captures/wave7 node tests/wave7.mjs` | once, all parts (A, S, B), on the final code | **PASS 27/27**, no page/console error, no missing file | A from base-11-town (chapter 8, format 5 → 6, no w7 flag made up): Pippa's hook, her chalked crate, the lift's compare and tag, Odile's ledger, the baggage claim by its door, Osk wrong then right, the lever seized then kicked free, run in (nothing lost) then out, the key and the back door, out by the back passage and in again, **a death in the baggage claim → Game Over → Retry** (all kept), the clamp off and Swing first (refused), **Save & quit → Continue** (kept), Hoist and Swing (the crate on the pier), Pippa's delivery (a clover leaf), the shelter stocked, Tim at the shelter, the ending (ISO: the lift as the opening left it, the back passage still open); S the pieces shown only in a state scanned with the sweep library (0 findings naming a wave-7 piece); B from base-13-desert (chapter 14, the bore's relay held): the torn shade, Lumi wrong then right, Dallan at the bore (walked to), the rigged sail, **Save & quit → Continue** (kept), the ball at the hook, the sail up, the lines after |
| `SERVE=1 ONLY=citadel,baggage,desert node tests/overlap-sweep.mjs` | once | **PASS**: citadel, baggage, desert 0 open findings (citadel's 2 a / 19 c / 217 d / 9 e / 1 g and the desert's 1 c / 3 d / 1 e are its KNOWN list) | the always-visible pieces (the cage, the back door, the moved drums and cloth) in a new game |
| `node tools/he-bundle.mjs && node tests/dialogue-check.mjs` | after the last text change | **PASS**, Hebrew 100 % (6110/6110) | the text |

An earlier run of the suite (the same code but one shortened line) stopped being useful at its first Save & quit: the
suite's own reboot did not press Continue on the title, so the checks after it read a game not yet loaded. The suite
was fixed (Continue pressed as a player does) and run once more on the final code: the row above. During development
the flows were tried in scratch probes (not committed). Not run: the full test, the chapter suites, door-sweep,
interior-life (Osk's `stays` changes the baggage claim's evacuation cast: covered by A's talk with him).

## Pictures (P107: the user picks)

`captures/wave7/` — the play camera (deviceScaleFactor 1), 960×540, and `captures/wave7/sheet.png` (all of them).
Before/after pairs are the same frame with this wave's pieces hidden or in their old state (the before is today's game):
01 the cargo lift before/after (the crate on the pier; stalled on the barge with stencils and the clamp) ·
02 Pippa's stall before/after (her chalked crate; small at this camera) · 03 the baggage claim's back store shut ·
04 the same, open (the shutter up, the bales out) · 05 the 'bug' house's west wall before/after (the back door, open) ·
06 the lift swinging the crate over the pier · 07 the depot shelter's door before/after (the bales and casks) ·
08 Lumi's loom before/after (the shade whole today; torn) · 09 the shade rigged by Dallan (the canvas roll and poles) ·
10 the shade up again (close: the camera after the throw).
Pictures 01, 05 and 07 were retaken after the suite with a scratch script (the same states set by flags, the hero
placed beside the piece, the camera rig snapped: closer than the Far default) because the suite's frames had the hero
in front of the piece or missed it.

## Questions for the user

1. Keep the visible pieces above? In particular the back door on the 'bug' house's west wall and the cage in the
   baggage claim (both always visible; the cage moved two drums and a cloth).
2. The card had the cart "on the cargo lift … lowered to the path side". The opening's lift is a derrick that swings
   crates from the barge onto the pier (it was not moved), so the stalled load is its own crate on the barge and the
   lowering is its hoist-and-swing. Keep, or should the lift get a second stop?
3. The back passage is a short way (behind the house, by the sea wall's stair, to Bug Street and the square), not a
   long shortcut. Is that enough, or should it lead somewhere further (a new path would mean world changes)?
4. Osk now stays in the evacuation. Keep, or should the claim in chapter 8 go through someone else?
5. (Answered 25.11: open in the ending's free play too; see Ending.) H-17 closes when the network ends (the shelters empty). Should it stay open in the ending's free play too (the card
   said "postgame (outcome kept)", read here as: the outcome stays, the story does not start then)?

## Known gaps (concrete)

- Tim and Lulu do not visibly push the cart (Pippa sends them; the result shows at the shelter).
- The shelter's stock is not referred to by anyone in chapters 9–14 except Tim and Pippa (one line each, once).
- Dallan is placed at the sail (he does not walk the 100 m from the bore on screen).
- The stencils and the chalk are small at the play camera (pictures 01, 02); the lines carry them.
- The canvas roll and the rigged sail use the sail's own striped material; no new texture.
- Minutes: unmeasured. The card estimates (25 + 10 min first play) are not claimed; the bot knows every answer.

## Ending (H-17 in the ending's free play; the user, 25.11)

H-17 can now also be started and finished in the ending's free play: chapter key `home`, after the dinner
(`ep_dinner`). The window opens for a player who has not finished it, whether he never started it or stopped partway
in chapters 8–14. A player who finished it in chapters 8–14 sees the ending exactly as before. The chapters 8–14
version is unchanged: same lines, same pieces, same checks (A).

| Step | In the ending |
|---|---|
| Hook | Pippa: "My second cart never came. Blankets and water casks, from when we all went up to the shelters. That's my stock, and my stall's half bare." Then the same chalk line. Tim: "Pippa's still cross about her second cart…" Neither line says anyone is waiting in the shelters. |
| Lift | The cargo lift is still stalled, with the mislabelled crate under the hook (the same stencils and clamp). The crate's last look ends with "This one is Pippa's." instead of "the shelter's". |
| Claim | Twinsen to Osk: "Pippa's goods, stencilled STATION over her chalk." Osk, Odile, the kick, the lever, the key and the back door are unchanged. The back-passage shortcut opens and stays open as before. |
| Delivery | Pippa: "…Take the cart. The pier, the baggage claim, then back here." The reward is the same (a clover leaf, or 15 kashes at nine), given once. |
| After | The goods sit by her stall (two bales of blankets with her chalk, a water cask, beside her chalked crate). The depot shelter gets no stock, and the pier spot is empty. Pippa: "My stock's back. Blankets, in this heat. The casks will sell, though." Next time she gives her own ending line. Tim: "We wheeled it all back to the stall. Lulu rode on top the whole way." Journal: "Pippa's second cart never came". |

State: one new flag, `w7m_home` (delivered in the ending; it implies `w7m_done`). `homeOpen()` = chapter `home`
&& `ep_dinner` && (not done || `w7m_home`). The ending's line keys are the chapter keys plus `h` (8 new keys, English and
Hebrew). Save format 6 is unchanged. The ending is still not saved as its own fixture (see Tests below).

Visible change (P107: the user picks): **8. Pippa's stall in the ending, only when H-17 was delivered there:** two
bales and a water cask beside her chalked crate (`wave7world.js buildStallStock`, the stall's own frame, at its west
end). Nothing new is shown otherwise.

Tests. All results are **automated runtime only (SwiftShader, headless Chromium)**:

| Suite | Run | Result |
|---|---|---|
| `SERVE=1 ONLY=E node tests/wave7.mjs` | once | **PASS 11/11**, no page or console error. Starts from base-11-town with the ending set (ISO, logged: chapter key `home`, `ep_dinner`, `ep_free`; no w7 state). Covers the lift stalled with the crate; Pippa's ending hook; the lift compare ("This one is Pippa's") and the journal's ending line; Osk; the kick, Run it out, the key, the back door; **Save & quit → Continue in the ending** (kept); Hoist and Swing; the delivery (`w7m_home`, a clover leaf, the goods by the stall, no shelter stock, the pier empty); Pippa twice more (her after line, then her own ending line, no second reward); Tim's ending line; the stall's goods scanned with the sweep library (0 findings naming a wave-7 piece) |
| `SERVE=1 ONLY=AS node tests/wave7.mjs` | once, on the final code | **PASS 20/20**, no error. Covers chapters 8–14 unchanged. A's last check now also verifies that a player who finished in chapter 8 sees nothing by Pippa's stall in the ending, gets no ending story from her (`talkFirst` false) and keeps the original journal line |
| `node tools/he-bundle.mjs && node tests/dialogue-check.mjs` | once | **PASS**, Hebrew 100 % (6213/6213) |

E's picture lines were removed from the suite after that run (only the pictures; no check changed). B (Kesh) was not
rerun because its code is unchanged. overlap-sweep.mjs was not run: the only new piece is visible only in a state, so
E scans it with the sweep library instead.

Pictures: `captures/wave7-ending/` and `sheet.png`, taken with the play camera (deviceScaleFactor 1, 960×540) by a
scratch script (not committed). It sets the states by flags, places the hero and snaps the camera rig. 01 the lift in
the ending: before (as the opening left it, as today) / after (stalled, the hook on the barge's crate). 02 Pippa's stall
in the ending: before (delivered in chapters 8–14: nothing, as today) / after (delivered in the ending: the bales, the
cask, the chalked crate). 03 the pier after the ending's delivery (the crate gone). The stencils are small at this camera.

Gaps: no committed save fixture in the ending (E sets it by ISO from the chapter-8 save). Tim and Lulu are not shown
moving the cart. In the ending Odile's ledger lines are unchanged; they speak only of the label and the station, not of
the shelters.

### Hebrew summary of the ending (סיכום בעברית)

לפי ההחלטה מ־25.11, אפשר עכשיו להתחיל ולסיים את "משלוחים שנעלמו" גם במשחק החופשי של סוף המשחק (אחרי ארוחת הערב), אם
השחקן לא סיים אותה בפרקים 8–14. מי שסיים בפרקים 8–14 לא רואה שום שינוי בסוף, והגרסה שבתוך הפרקים לא השתנתה. בסוף
המשחק המנוף עדיין תקוע עם הארגז. פיפה רוצה בחזרה את הסחורה שלה לדוכן ("הדוכן שלי חצי ריק"), בלי להזכיר אנשים שמחכים
במקלטים. החידה, קיצור הדרך האחורי והפרס (עלה תלתן, פעם אחת) נשארו כמו שהם. אחרי המסירה בסוף המשחק הסחורה מופיעה ליד
הדוכן של פיפה (שתי חבילות שמיכות וחבית מים ליד הארגז עם הגיר), ולא ליד המקלט. נוסף דגל חדש אחד (w7m_home), ושמונה
שורות חדשות באנגלית ובעברית. הבדיקות: wave7 חלק E עבר 11/11 (כולל שמירה וטעינה בסוף המשחק, ופרס שניתן פעם אחת),
וחלקים A ו־S עברו 20/20. גם dialogue-check עבר. הכול ריצה אוטומטית בלבד (SwiftShader). התמונות נמצאות ב־captures/wave7-ending.


## Hebrew summary (סיכום בעברית)

נבנה גל 7 (H-17, H-18). משלוחים שנעלמו (פרקים 8–14, סיטדל): פיפה מספרת שהעגלה השנייה שלה למקלט לא הגיעה – שמיכות
וחביות מים, ועל כל ארגז כתבה בגיר "מקלט". במנוף המטען בנמל (המנוף של הפתיחה, לא הוזז) הוו מונח על ארגז על הדוברה:
מעליו שבלונה "תחנה" ומתחתיה הגיר של פיפה; על הארגז השני אין כלום מתחת לצבע. הידית נעולה במלחציים עם תווית: המפתח
במחלקת המטען. אודיל (רשות) מסבירה מהפנקס שלה. באולם המטען אוסק שואל מה יש בארגזים (בחירה; טעות לא עולה כלום); אחרי
התשובה הנכונה – המחסן האחורי, כלוב רשת באולם התחתון, נפתח בידית של המסוע הישן שמקשיבה רק לבעיטה. בעיטה משחררת אותה;
"פנימה" זה הכיוון הלא נכון, "החוצה" מרים את התריס. בפנים: המפתח של המנוף, ודלת אחורית שנפתחת למעבר מאחורי הבית (קיצור
דרך מהמדרגות של חומת הים לכיכר, נשאר פתוח). במנוף: קודם להרים, אחר כך לסובב ולהוריד – הארגז על המזח. פיפה שולחת את
טים ולולו עם העגלה, עלה תלתן; ליד דלת המקלט במחסן מופיעות שמיכות וחביות. החוב של דאלן (פרק 14 אחרי הממסר בקידוח, וסוף
המשחק, קש): הסוכך של לומי נקרע. לשאול אותה "מה את צריכה?" (ולא "דאלן צריך לשלם"), דאלן אומר "לא. אני אסחוב אותו",
קושר את הפינות התחתונות, והכדור מעלה את הטבעת העליונה לוו. "המפרש ישר. זה משהו." – בלי התנצלות. דגלים חדשים בלבד
(w7m_/w7d_), שמירות ישנות נטענות, הנמל לא זז. tests/wave7.mjs עבר 27/27 (כולל מוות וניסיון חוזר, שמירה וטעינה),
overlap-sweep נקי, dialogue-check עבר. הכול ריצה אוטומטית בלבד (SwiftShader). התמונות ב־captures/wave7 ממתינות לבחירת
המשתמש.
