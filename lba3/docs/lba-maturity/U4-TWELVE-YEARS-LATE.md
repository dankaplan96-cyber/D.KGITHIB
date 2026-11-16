# U-4 "Twelve Years Late" — as built

The user's own side quest (brief: `DEPTH-PLAN.md`, "The user's five side quests", U-4). Built 16.11.2026 on
`ccr-c1c2c4b9-dep6ed` (worktree base `e4485694`). **Automated runtime only** (headless Chromium, SwiftShader): nobody has
played it, nothing was listened to, no frame rate is claimed.

## Where, and why there

Zeelich's street (the terminal island), from chapter 3 (`zeelich`) on. The terminal island has no post office (Otringal's
is on another island, a shuttle away). Its post already goes through the council: Rezz "flies the council's post"
(`text/zeelife.js`), Oma keeps the council's box and notices. So the letter is "left at the post office" the island has:
pinned on the council house's arcade, beside its notice. No building was added.

The brief's three examples are translated into the street's own twelve-year changes (`docs/TWELVE_YEARS.md`, fourth set),
so nothing new has to be claimed about places that already have a history:

| Brief | Here |
|---|---|
| the chimney is still there | the old north mill (stone tower, balcony, stair-stones) still stands right behind the house |
| the stairs became a ramp | the stone step at Nara's door has a plank ramp over it now (her pot trolley's); the old picture has the bare step |
| a bakery stands where the clinic was | Mother Snuff's bakehouse is the old watch house; twelve years ago it was the street's clinic (CLINIC on a bracket sign, the window shuttered) |
| (more, seen in the picture) | PORTRAITS over Nara's door (the glass house was Ysel's studio); no heat posts, copper feed, burrow hatch, scaffold or held flower crates; no shuttles in the sky |

**New (ours, not LBA1/LBA2):** Ysel (Nara's mother, the street's photographer), Mara and Jory (the card's senders, only
named on it), the clinic in the old watch house twelve years ago and its doctor moving up to Otringal's high town (its
clinic exists: `ihomes.js` `otringal-52--60`), "Clinic Row" as the old name of the street's east end, the ramp. Snuff's
own line ("This house was built for watching people. Now it feeds them.") still holds: the clinic was between the two.
Suggested for `docs/TWELVE_YEARS.md` (not edited here: not this task's file).

## What the player finds and does

1. **The card.** On the council house's arcade, the pier east of the middle arch: a postcard and Oma's note,
   UNDELIVERABLE. ANYONE? (Look at it, or ask Oma: it came back with the council's post, stamped NOT KNOWN by every
   island for twelve years; Clinic Row went when the doctor moved up to Otringal.) **Take** (E): his right hand on it
   (`reach`). The card close up: the picture on the left, its back on the right ("To the lady with the camera / Portraits,
   Clinic Row / Zeelich", Mara's three lines, the islands' stamps). E puts it away; Twinsen: "This street, twelve years
   ago … The picture will have to be the address."
2. **The search.** While he carries it on the street, the card sits in the screen's corner (no arrow, no marker, no
   journal hint beyond "find the house in it"). Doors he can **Knock** at (E, his hand on the door; the door does not
   let him in while he knocks): Mr Pelleck's, Oku's, the bakehouse, Nara's. A wrong door gets a kind answer that points
   at one thing on the card:
   - Pelleck (from his scaffold): his house has a minaret, the card's has no tower;
   - Wenna (through Oku's door): on the card the old mill stands right behind the house, from here it's half the street away;
   - Snuff: "This was the clinic, yes!", but on the card it's far off: whoever took it stood up the street.
   Nobody there: Twinsen says the same difference himself. After the second wrong door he looks again ("Eight walls and a
   wide, flat cap … the old mill right over its shoulder"), after the third he reads the clinic's place ("up the street
   from the bakery, on the same side"). Oma, asked after two wrong doors: "The picture is your address, dear. Look at the
   roofs." Asking the same people face to face (Wenna indoors, Snuff at the hatch, Pelleck) gives the same answer.
3. **The right door: Nara's flower house** (the octagonal hall, the old mill behind it, the clinic far off at the end).
   Lissa: "Portraits? Gran!" Ysel comes to the door, reads her card (Mara and Jory came up for his arm and went home with
   a picture), says the glass house was her studio (Nara grows her flowers under her skylights now), and hands him her
   album: "Stand where I stood and open it. You'll see what changed. Nobody has to tell you." She goes back in.
   The other way in: into the flower house with the card, Lissa or Ysel asked indoors: the same.
4. **The album** (the reward: something new to do in the world). At each of her spots, **Open the album** (E): the camera
   goes to where her lens was, her old picture lies over today's view, full screen ("Then"), with one line of her
   caption. E: today's view from the same spot ("Now"), the picture lifted off; E again: then. Escape (pause key): shut.
   - **Clinic Row** (Zeelich's street, across from the flower house): the card's own view.
   - **The West Pier** (its far end, looking back at the ferry and the gateway): the Patience with her bridge down and the
     board without LINE CLOSED, no shuttles in the sky, no drill tower through the gate. Ties to U-1: once the line runs
     again, "now" looks more like "then".
   - **Citadel's harbour** (the quay path's end, looking west along the quay): no customs booth, no Nell's shop, no cargo
     from Zeelich (`townlife.js`'s harbour block hidden), the lighthouse rock behind.
   Each first look: a toast ("Ysel's album: n of 3"); the journal keeps the count and the three places.

## How the old pictures are made (no images from LBA1/LBA2, no files)

`src/game/yearslate.js capture(game, spot)`: the game's own camera at her spot; for one synchronous frame the people
(every rig, the hero, dogs), the twelve years' additions (`zeelife.js` `now`: the heat feed and posts, the burrow's hatch,
Pelleck's scaffold and new tiles, the bakehouse's moving parts, Nara's held crates; the sky's shuttles; on the pier also
everything of the island's group wholly east of the shield gate; at Citadel the harbour block of `townlife.js`) are hidden,
the period pieces shown (PORTRAITS, CLINIC, the shutters; the pier's ferry set running); two renders; the canvas copied
(at most 800 px wide, the screen's shape); everything put back in the same frame and the screen drawn again. The copy is
toned in a 2D canvas (`agePhoto`: sepia, faded black and white, a vignette, grain, dust specks, three scratches). One
canvas a picture, made when it is first needed (the card when taken, or when the corner card is first shown after a
load; an album page each time it is opened). **No asset was added; nothing goes into the save.** Measured: the card
picture 640×360, the album pages 800×450 at the test's 960×540 (about 1.4 MB of canvas memory each while shown, released
with the view); the renders cost two frames' draw time at the moment of opening.

## How it changes with the story (the "come back in three chapters" test)

From the next chapter after she was found (or once he has been off the terminal island since): Ysel takes pictures
again, at her camera on its tripod by her door (west of it, facing the street); the council's board carries three new
cards of the street, "NEW CARDS: YSEL" (look: "Each one is signed: Ysel"). Her first word in each part of the story:

| Story (`phase()`) | Her line |
|---|---|
| chapter 3 | twelve years in a drawer; "my hands remember the shutter better than the stairs" |
| chapters 4–8 | taking the street again, same spots; "Pelleck's scaffold will look historic one day" |
| chapter 9 | everyone at the council house, so she took the empty street: it looks like her old cards |
| chapters 10–12 | Baldino wants his relays photographed heroic; "they look like kettles" |
| epilogue | the ground is quiet, good for long exposures; Mara wrote back: the kettle's still on |

After all three pages: "Then you've seen more of my twelve years than Nara has." Before anyone brings the card, she is in
the flower house ("Mind the pots. Nara counts them.") and says nothing about photographs (no spoiler of the puzzle).
Nothing on the main path depends on any of it; no line refers to story beyond the part it is said in.

## State (all `dx_tyl_`, default absent: an old save loads with the card on its pin, Ysel indoors)

`dx_tyl_card` (taken), `dx_tyl_knocked` ('pel,oku,bak'), `dx_tyl_wrong`, `dx_tyl_hint` (0–2), `dx_tyl_oma`,
`dx_tyl_omaHint`, `dx_tyl_found` (the album given), `dx_tyl_ch` (the chapter it happened in), `dx_tyl_away` (been off the
island since), `dx_tyl_seen` ('row,pier,harbour'), `dx_tyl_heard` (her later words said), `dx_tyl_all`. `applyFlags`
keeps them consistent (found implies the card; seen/away/heard only after found; unknown door or spot ids dropped). A
knock, the card close-up or an album view in progress is not saved; a load closes them.

## Files

- `src/game/yearslate.js` (new): the card and the new cards on the arcade, the ramp, the tripod, the period pieces, the
  spots, `capture`, `agePhoto`.
- `src/game/story/yearslate.js` (new): the quest (Ysel, the card, the knocks, the answers, the scene at the door, the
  card close-up, the corner card, the album view, journal, items).
- `src/game/text/yearslate.js` (new): English text (57 keys).
- `src/game/story/index.js`: registered beside U-1..U-3 (cast, placement, decorate, journal, items, interactables,
  interact, talk, update, applyFlags, regionBuilt) and `doors()` passed through `tyl.filterDoors` (the door he knocks at
  holds while his hand is on it).
- `src/game/zeelife.js` (shared, additive, two lines): its contract returns `now` (the twelve years' batch meshes, the
  bakehouse's moving parts, the flower crates) for the old pictures. Nothing else in it changed.
- `src/engine/voice.js`: `tyl_ysel` (Esmer, seed 1814, slow, falling, a little vibrato).
- `tests/twelve-years-late.mjs` (new). Captures: `captures/twelve-years-late/`.

No-clutter count: the council's arcade +1 (the card, later the new cards), Nara's door +1 (the ramp), +1 after the quest
(the tripod). The period pieces exist only inside the old pictures.

## Tests (Automated runtime only)

(filled in below with the runs of this build)

## Left for a human to judge

- Whether the card's picture is enough to find the house at a glance from the play camera (the corner card is about a
  quarter of the screen's width; the octagonal cap and the mill behind it are its strongest marks). Three wrong doors
  and two second looks are the safety net; the right door can also be found by asking indoors.
- Whether the sepia toning reads as "a photograph" or as "a filter"; the grain and scratches' strength.
- The pier picture: the Patience fills its right half; whether the board's missing LINE CLOSED strip is noticed.
- Ysel's model (`nara_c`, an Esmer woman in a headcloth) as an old photographer; she has no camera in hand when she
  hands over the album; her `reach` shows while the next line plays.
- The ramp is a low plank wedge over a 0.14 m step: it reads up close, not from far off.
