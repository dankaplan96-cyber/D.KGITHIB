# NEXT ACTION

1. Merge the two parallel branches when they report: the underground rooms (src/game/underground.js +
   RoomBuilder export + one registration line in main.js) and the soundtrack (assets/music, src/engine/music.js,
   audio.js). Review their screenshots/report first.
2. Write a chapter-3 playthrough test (like scratchpad ch2.mjs): shaft → deep (diagram, ball switch, valves A+C)
   → gallery (3 pillars, stones) → Sendell → core (3 pylons with the guardian) → epilogue → end screen. Fix
   whatever breaks; check save/load mid-chapter (valves, ladder, pillars, pylons).
3. Remove the chapter-2 "End of Demo" fallback once chapter 3 runs; update the title badge (no "DEMO").
4. Visual pass on the underground rooms from the game camera; then the rest of Citadel (flower beds, kerbs,
   fences along paths) and Zeelich.
5. Republish the playable link (tools/artifact-page.py; see PROGRESS.md session notes).
