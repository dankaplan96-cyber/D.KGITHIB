# ACTION-SOUND-2 listening files

Four short files, one per family. Each plays the same game events twice: **BEFORE** (as the game sounded before
this pass), then a **beep** (1 kHz, 0.15 s), then **AFTER** (as it sounds now). Same events, same times. An event
that made no sound before is silence in BEFORE.

Rendered offline from the game's own code (`src/engine/audio.js`, our synthesis only: no recordings, nothing from
LBA1 or LBA2) at the default sliders (master 0.8, effects 0.8), through the effects bus and its small room: the level
is the game's. The beep is at -20 dBFS; turn up to a comfortable level on the beep. No music or voices under them.
Made with `tools/action-sound-2-listen.mjs`; numbers in `measurements.json` and `docs/lba-maturity/ACTION-SOUND-2.md`.

**Nobody has listened to these. Evidence: Automated runtime only; nothing listened to.**

## ball.mp3 (26 s)
throw, two bounces on stone, a stone wall, wood, metal, grass, (after: the ball on its way home), catch ·
throw onto an enemy (pling + body), catch · throw into the sea (after: a splash, the way home), catch ·
a throw with no magic left and its one contact, catch.
Listen for: can you tell stone, wood, metal and grass apart while the ball still sounds like the same ball? Does the
no-magic throw sound weak and its contact dull (it never bounces)? Is the sea splash clear? Is the way-home breath
welcome or fussy?

## sword.mp3 (23 s)
the sword drawn · three swings (light, light, heavy) · two cuts on a body · a hit on wood · a blow on a shield ·
the heavy strike (charge chime, swing, cut) · the sword put away and the fists taken · another weapon taken · the
blowgun twice, the laser, the lightning.
Listen for: the draw and the put-away (satisfying? too thin?); the cut on a body against the fist's thud (moves.mp3);
the lightning and laser less harsh than before?

## moves.mp3 (28 s)
the fists taken · jab, jab, kick, each on a body · the glove put on, its jab, its heavy punch · the dodge · a
behaviour change · a jump and its landing · (after: a step down off a ledge) · four steps on stone · a behaviour
change · (after: four tiptoes in Discreet, hiding).
Listen for: the kick bigger than a jab; the glove heavier than the fists; are the tiptoes audible at all on your
speakers, and quiet enough to stay out of the way?

## pickups.mp3 (27 s)
five kashes in a run · a heart · a flask · a clover · a found object (a key) · hurt, hurt again (after: with the
low-life heartbeat) · a bin searched (its bonus pops), a barrel, a crate, a suitcase · (after: a hop at a container
already searched).
Listen for: the found object clearly bigger than a kash, without being a fanfare; the heartbeat helpful or alarming;
does a bin sound like a bin, a barrel like a barrel? Is the emptied container's shrug clear?
