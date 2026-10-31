# LBA3: The Awakening — 60-second trailer brief (the user, 26.10.2026; NOT NOW)

**Status 28.10.2026 (TRAILER, WORKLIST #36): produced, outside the repository.** A spoiler-free cut for the email asking the rights holders'
permission (chapters 1-2 only; Desert Island, the Hamalayi and Zeelich as scenic travel shots; "stakes" kept to a hum, a turning derrick, the project's gate
and a glow under the well). 60.000 s, 1920x1080 / H.264 / AAC 48 kHz / constant 30 fps, plus a 720p email copy, shot list, production
folder and README, kept out of the repo because of its size (the session's scratchpad: `.../scratchpad/trailer/`). Footage is the real engine captured
frame by frame (Chromium/SwiftShader, `game.frame` stepping, the game's AudioEngine on an `OfflineAudioContext` so the game's own sounds are
sample-synchronous); no change to `src/` was needed, so there is no capture mode in the game. Music: an original 60 s cue from the project's score tool
(`tools/music`), rendered offline with FluidSynth and the system FluidR3_GM soundfont (the MuseScore one could not be fetched there); unverified by ear.
Not done / not claimed: a listening pass, a real-GPU capture, Nera and anything of chapters 3+ (not shown on purpose).

Deferred by the user ("לא לעכשיו"): do after the current game is verified end to end. The full brief is kept
verbatim below so a future session can execute it unchanged.

Summary: capture real footage from this project (developer capture mode: repeatable scene loads, scripted input,
camera markers, HUD hiding), edit a 60 s trailer to the given structure (Home 0–7 · First sign 7–15 · Journey 15–28
· What you do 28–41 · Stakes 41–51 · Last burst 51–56 · Title 56–60), original music, game sounds kept, overlays
in a bundled font, export LBA3_The_Awakening_Trailer_60s.mp4 1920×1080 H.264/AAC 48 kHz, exactly 60 s, plus an
editable production folder and README; verify the exported file; no spoilers of the ending, no LBA1/2 footage,
no fabricated content (no Nera unless implemented). Tools here: Playwright/Chromium capture, ffmpeg if installed.

---
(The user's full brief follows, pasted from chat.)

Create an actual 60-second trailer for LBA3: The Awakening using footage captured from this project. Produce the finished video, not just a storyboard, a trailer webpage, or a written proposal. Inspect the available capture and video-editing tools, then implement the capture, editing, audio, titles, and export pipeline. Read the current story synopsis, story bible, story map, and future expansion brief before planning the trailer. Use the full story to understand the emotional arc, but show only content that actually exists in the playable build. If Nera or Sendell's expanded underground world has not been implemented, do not fabricate gameplay or present concept art as playable footage.

GOAL: make viewers feel "I want to explore this world, meet these people, and find out what is happening." Convey: a familiar home twelve years later; a useful project with a hidden cost; a journey through strange, inhabited places; playful exploration, environmental puzzles, responsive action; a conflict that matters personally to Twinsen and his family. Warm, curious, adventurous, increasingly urgent; LBA charm, not generic dark fantasy.

1. INSPECT BEFORE CAPTURING: run the game, make a shot list (location/story state, action, framing, capture setup, duration, spoiler risk). Real gameplay, clean framing; no broken animations, empty regions, placeholders, debug overlays. Fix small capture-blocking defects only.

2. STRUCTURE (exactly 60 s): 0:00–0:07 HOME (harbour/street/home, Twinsen + Zoé or Arthur moment, ambient first; overlay "Twelve years later."; no logos/black) · 0:07–0:15 THE FIRST SIGN (trembling object, hot water, the well; "Something is wrong with the water."; no invented voice acting) · 0:15–0:28 THE JOURNEY (3–4 implemented locations each with life/action; "Follow the trouble beyond home."; Nera only if implemented) · 0:28–0:41 WHAT YOU DO (ball throw that hits, mechanism responding, traversal, short combat, a distinctive resident; cause and effect in one shot; several seconds with the normal camera and HUD; optional "Explore. Solve. Fight.") · 0:41–0:51 THE STAKES (evacuation, machinery, Vesk, Sendell, Zoé acting; "Getting home means helping everyone."; no ending/arrest/shield/entity reveal) · 0:51–0:56 LAST BURST (2–3 strongest shots, music peak, clear beat) · 0:56–1:00 TITLE ("LBA3: The Awakening" + "An unofficial fan project"; no dates/platforms/wishlist claims).

3. CAPTURE: the actual engine; a developer-only capture mode allowed (repeatable loads/saves, scripted input, camera markers, HUD hiding, overlay suppression); handles before/after actions; no fake FPS/interactions; no LBA1/2 footage; preserve normal gameplay timing; note offline capture in production notes.

4. EDITING: polished, readable compositions, controlled camera, Twinsen visible; no constant orbiting/DoF/blur/shake/flashing; consistent colour; direct cuts; 12–18 shots; brief English overlays, one at a time, bundled licensed font, safe margins, phone-readable.

5. MUSIC/SOUND: original or licensed track (curiosity → unease → travel → rhythmic energy → rise and short resolution; warm, melodic; no LBA melody, no generic drone); keep game sounds (footsteps, ball, mechanism, water, ship, impacts); no clipping; if no music available, say so and don't label it finished.

6. EXPORT: LBA3_The_Awakening_Trailer_60s.mp4, 1920×1080, H.264 (compatible pixel format), AAC 48 kHz, constant 30 fps (60 only if consistent), exactly 60 s, no watermarks; plus an editable production folder (clips, titles, audio + licence notes, timeline or editing script, capture instructions, README).

7. VERIFY the exported file (duration, resolution, codec, fps, audio; cuts; frozen/black frames; titles; audio sync/clipping; spoilers; shown gameplay exists). At least one editorial revision after the first cut. Final response: video path, project path, short description, genuine limitations.
