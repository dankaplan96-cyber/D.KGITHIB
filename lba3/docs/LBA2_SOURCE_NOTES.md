# Notes from the LBA2 engine source (github.com/2point21/lba2-classic, GPL-2.0)

Read for behaviour/values only; no code copied. 1024 units ≈ 1 m (HOLO.H:37), angles 4096 = 360°,
TimerRefHR = 1000 Hz, extras (projectiles) use 50 Hz ticks.

- Hero rotation 90°/s with left/right (OBJECT.CPP:4206); standing turn plays turn-in-place anims.
- Walk/run/jump distances come from animation data (ANIM.HQR), not code. Jump only in Sporty mode.
- Falling: constant −2.5 m/s. Fall ≥ 2 m: −5 HP and hard-landing anim; ≥ 4 m: death (OBJECT.CPP:2790).
- Magic ball: 1 MP per throw; with MP > 0 it bounces 4 times and returns on the 5th contact; hitting an
  enemy returns it at once; returns at ~9.8 m/s; arc restarts from the same Vy after each bounce.
  Damage by magic level 0..4: 10, 10, 20, 30, 40 (level 4 = fire ball). Recall by pressing again.
- Melee damage by magic level: 5, 8, 18, 28, 38; aggressive mode picks one of 3 blows.
- Max life 255, max MP = 20 × magic level. Heart = 5×amount HP, flask = 2×amount MP; bonuses last 20 s.
- Hit: target turns to attacker, plays hit anim; no invulnerability timer in code.
- Death with a clover: revive on the spot (or at the last valid position) with full life/magic,
  a clover shown for up to 5 s. No clover: Game Over.
- Exterior camera: focal 600 on 640×480; views dist 10500/17000 at pitch 26°/47°; look-at 2.4 m ahead;
  cuts when the hero leaves the screen box (x 80–539); Enter = behind the hero. Occlusion: the camera
  rises above the obstacle.
- Dialogue: 50 chars/s typing, newest letters fade through the speaker colour; 3-line box at the bottom;
  speech-bubble sprite alternates left/right per speaker; game clock paused during dialogue.
- Anim play modes: repeat / then (interruptible one-shot) / all_then (uninterruptible) / tempo / final;
  every anim change blends from the current pose to frame 0.
- Saves: autosave on every scene change; named save slots; current position snapshot.
- Keys: Space = behaviour action, W = talk/search in any behaviour, Alt = ball, X = dodge, Ctrl = behaviour menu.
