# FACE-1 (P67 phase 4): simple, readable faces

The user, 18.11 (REPAIR-PASS-18-11.md item 3): "characters lack even basic facial expressions". The brief: neutral,
curious, concerned, pleased, determined/annoyed; blink and gaze; tied to dialogue intent; the talking mouth separate.

## What it does
- **Expressions** (src/engine/rig.js `FACES`, `Rig.setFace(name, strength, hold)`): six — neutral, curious, concerned,
  pleased, determined, annoyed — plus the voice's other intentions mapped onto them (uncertain = a softer concern,
  urgent = determined, relieved = pleased). Each is a mix of:
  - **brows**: three morph targets on the brows that are part of Twinsen's and Zoé's bodies (characters.js
    `addBrowMorphs`: raised; drawn down and in; inner ends up). Each moved brow point is put back on the skin at its
    own height over it (the face's triangles are ray-cast), so a lowered brow never sinks into a curved forehead;
  - **eyes**: their opening (narrower for pleased, determined, annoyed; wider for curious), over the blink as before;
  - **mouth**: its corners bent up (smile) or down, a little wider or narrower — drawn into the mouth's own vertices
    and divided by its current height, so the **talking mouth** (the voice's syllables, unchanged) opens over the same
    curve.
  Eased in about a third of a second; held a few seconds past its line, then back to neutral.
- **Gaze** (`Rig._gazeStep`): only the iris and pupil move across the eye (characters.js `irisOf` finds them by colour);
  in a conversation the listeners look at the speaker and the speaker at the nearest listener; otherwise small glances
  now and then. Blink unchanged.
- **Tied to dialogue intent** (main.js `faceLine`, called by the dialogue box as each line begins): the line's
  intention is the one its **voice** is delivered with — text/voicemeta.js (written by hand for the scenes that
  matter), else read from its words (voiceplan.js intentOf, a softer face). The strongest sentence wins. The others in
  the conversation answer more softly (her worry → his concern; his pleasure → hers). Works in Hebrew (the English
  source of the line is looked up, as the voice does).
- Every character gets the eyes', mouth's and gaze's part; Twinsen and Zoé also the brows (the other models' brows are
  not separate colours yet — a follow-up per model: BROW_COLS in characters.js).

## Cost
Per character per frame: a few multiplies; the iris (a few dozen vertices) and the mouth (48–96) are rewritten only when
they change. Twinsen's and Zoé's bodies carry three morph targets (48 non-zero vertices each): one shader variant for
those two models.

## Evidence (Automated runtime only)
`tests/faces.mjs` **5/5 PASS**: morphs, iris and mouth set up on both; every expression sets brows, lids and mouth;
the gaze follows a point; a real conversation in the yard sets the faces from its lines (Zoé's "Same next door. Their tap
ran warm…" → concerned, and Twinsen answers concerned) and the speaker looks at the listener; afterwards both ease back
to neutral and the gaze is let go. Close-ups: `captures/faces/sheet.jpg` (top Twinsen, bottom Zoé: neutral, curious,
concerned, pleased, determined, annoyed) and the single shots beside it.

Open: a human's eye in play (strong enough from the play camera? the brows are modest by design); brows for the rest
of the cast.
