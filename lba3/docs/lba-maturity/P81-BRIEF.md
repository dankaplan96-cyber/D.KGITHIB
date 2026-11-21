# P81 — dialogue and scene timing (the user, 20.11.2026)

Aim: the player recognises who is speaking, understands what matters, and notices that places change after Twinsen
helps. Work in the real project; edit scenes in their trigger order (what the player just saw, what the speaker wants
from the listener, what the player needs next), including pauses, triggers and repeat interactions; never isolated keys
without their call sites.

**Benchmark lines to keep** (unless their scene genuinely changes): Twinsen "I fixed that yesterday." / Zoé "It worked
yesterday."; Tessa "If you're from the lift company, you're four days late."; Vesk "I kept the water running. Write that
down too."

**Four scenes first, in order:**
1. **Mill Lane's radio and Vesk's decision** (text/answer.js, story/answer.js: co_irsa_1, co_irsa_2, co_tw_irsa, the two
   Vesk branches): one concrete radio report about Kell's cart establishes success — remove the chain of repeated
   "holding" confirmations; Vesk's response depends on the player's earlier choice; keep his accountability and the
   gameplay clue for operating the central lock.
2. **The Zeelich confrontation** (text/ch2.js, story/chapter2.js from c2_vesk_1): Baldino is not present in every
   version — both must make sense; Twinsen asks about the people excluded from the evacuation; Vesk answers with
   something he could believe himself; keep the readings and the disagreement about the drill; if the camera clearly
   shows his escape, cut the verbal play-by-play.
3. **Ballastra's customs desk and the stranded fishing boat** (text/ballastra.js, story/ballastra.js): Quill cares about
   an accurate weight, Tessa about the broken lift, Ferro about his catch — not all three a punchline; keep the red-latch
   and counterweight clues available when needed.
4. **The family opening and Zoé's report from next door** (text/opening.js and the opening/prologue scripts): Zoé reports
   what happened at the neighbour's tap; don't send the player to the well a second time if Twinsen already decided to
   go and the objective is visible; keep help for a player who returns because they are lost.

**Then every reachable chapter and the epilogue**: main-story conversations, repeated NPC interactions, and moments where
dialogue, a toast and the journal all announce the same thing (a journal entry still helps someone returning tomorrow);
essential clues on demand; conversations with room to breathe, no word-count target; no fake hesitations, slang or
random jokes.

**Revisits**: for each major region, one return visit after a story event; where the scene looks unchanged, a small
visible consequence with existing characters, props or animations — a resident resuming a specific activity rather than
another thank-you line.

**Timing**: changed timed dialogue → check subtitle duration, gesture timing, voice cues (voicemeta.js; faces) and skip;
keep meaningful pauses when removing a line. Play the four priority scenes and both variants of branching conversations
where possible. Finish: a short before/after report, the revisit changes, verified-in-play vs reviewed-in-code.

## Plan (coordinator, 20.11)
The files overlap three running workers, so: scene 4 → the TUT-MYSTERY worker now (it is reshaping that scene); scenes
1–2 → with REVIEW-TASKS task 3 (Vesk's decision: the same scenes and character), after EXP-3 (shared finale files);
scene 3 + the whole-campaign pass + revisits → the dialogue editor after EXP-3 and MILLS merge. The user: minimal tests
while working, one full test at the end.
