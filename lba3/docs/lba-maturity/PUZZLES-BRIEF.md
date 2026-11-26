# PUZZLES — the user's puzzle brief (20.11.2026; status.md P80) — **queued: "a task for later, but don't forget it"**

Improve the existing puzzles throughout the game, from Twinsen's house to the epilogue, in the game itself: the visual
problem-solving, physical interactions and everyday humour of LBA1 and LBA2; the main route approachable.

Start by playing the current opening and inspecting the real quest scripts, triggers, level geometry, camera and the
LBA1/LBA2 references. A short working list of the puzzles the player really meets: chapter, place, what the player knows
on arrival, what they do, what visibly changes; chapters skipped by normal progression as a separate finding. Keep what
works; spend the time on the weak ones.

1. **The tap and the barrels first** (overlaps REVIEW-TASKS task 4, TUT-MYSTERY): check from the normal gameplay
   camera; the markers and timed hints exist — verify they point at the right object at the right moment before adding
   UI. A concrete problem: the tap is dry; using it produces a clue in the world (a pipe knocks, a loose joint drips,
   Arthur looks toward the sound) — the version that fits the room and is visible from Twinsen's position. If the next
   step needs the ball: a visible target and a reason to hit it (an arbitrary barrel to tick "throw" is weak). A player
   who investigates the barrels first is rewarded, never sent back to repeat a done action.
2. **A visual question and a visible answer**: before acting the player sees what is wrong; after, what changed (a
   wheel catches, a counterweight rises, a gate opens halfway, a worker can cross); intermediate progress for several
   steps; sound reinforces but muted and colour-blind play still read it. Framing, silhouettes, movement and placement
   before text; if still hard to identify, briefly pulse the object's existing outline — local, no room full of glowing
   props.
3. **Vary what the player notices**: review consecutive chapters together; three valves on Citadel then three switches
   on Zeelich → redesign one (a new prop with the same decision is not enough). Candidates (only where no better puzzle
   exists): Citadel — trace a water fault by watching which section of pipe reacts, the final repair restores something
   the player already tried to use; Zeelich — the mill as a working place: watch a full cycle, notice when a delivery
   platform lines up with a walkway, use it to cross; a generous window, a miss costs one short cycle; the mill's water
   role consistent with the later story (see MILLS.md); a later installation — a learned mechanism with a new question
   (keep one branch running while another stops; both consequences visible from the controls). Some puzzles about
   people, routes, the magic ball or the movement modes — not a tour of control panels.
4. **Fair mandatory puzzles**: one unfamiliar rule at a time; later ones combine two familiar rules; no pixel hunting,
   tiny precision throws, unexplained interaction modes, long walks after a failure; a reasonable wrong try gets useful
   feedback (a jammed wheel moves slightly and stops against the obstruction), not a generic beep. Progressive hints
   with the existing hint system: attention to the clue → the relationship → the exact action; never interrupt a
   player experimenting successfully. Harder variations for optional discoveries with worthwhile rewards (a shortcut,
   another way to help a resident).
5. **Verify in the campaign**: a new game to each changed puzzle by normal progression; the intended solution, one
   plausible wrong action, leaving and returning, saving halfway; the clue visible with the normal follow camera;
   supported controls; journal, dialogue and the world agree after; aiming and timed actions at 30 and 60 FPS (30 must
   not shorten the window). Visual style and performance kept: animate existing props or change their pose before adding
   lights, particles or a render pass. Short English text (Hebrew per the standing rules).

Deliver the implementation, not an audit: a chapter-by-chapter list — which puzzles changed, what the player now notices
or decides, what was tested; a puzzle verified in play kept apart from one reviewed only in code.

**When**: after REVIEW-TASKS-19-11 (tasks 2–7) and the full test; item 1 is being folded into task 4 now.
