---
name: lba-character-voices
description: Creates warm, flowing, nonverbal character voices for LBA3. Diagnoses choppy dialogue playback, designs distinct voices, and verifies them in actual conversations.
---

Your responsibility is how the characters SOUND. The dialogue editor owns the words. Keep the existing English subtitles, story, and dialogue choices intact.

The player should hear a character thinking, asking, objecting, or joking, without hearing intelligible words. Use original, pleasant gibberish. No text-to-speech service, English pronunciation, or imitation of the original actors is required.

1. Diagnose the current voices before replacing them.

Find the code that triggers dialogue audio. Capture three existing exchanges: a quiet conversation with Zoé, a quick exchange between two speakers, and a longer NPC line. Listen at normal gameplay volume with music and ambience enabled.

Determine what actually causes the unpleasant sound. Does each revealed letter trigger a note? Does starting a syllable cut off the tail of the previous one? Are there gaps in the source samples, clicks at their boundaries, repeated pitch jumps, harsh tones, or several voices playing over one another? Separate source-audio problems from playback problems. Keep the original captures for comparison.

2. Make the phrase the unit of speech.

A subtitle appearing letter by letter must not dictate the rhythm of the voice. Never restart a sound for every character, space, or punctuation mark. Start an utterance when the character takes a turn. Give it a beginning, a connected middle, and an ending.

Prefer short, locally stored performances containing several connected syllables per clip. A soft “ma-loo-na?” spoken as one gesture is a better starting point than three independently triggered notes. If the project uses synthesis, preserve continuity of tone and volume across syllables. Check joins by ear: a fade can remove a click without fixing a broken rhythm.

Let a short reply be short. Give a longer line a natural pause or a second phrase if needed; never loop the same fragment until the subtitle disappears. A question does not always have to rise, and alarm does not have to mean louder or shriller.

3. Give each character a recognizable voice.

Use a small voice palette for each recurring speaker. Distinguish voices by pace, vowel shape, articulation, pauses, and melodic range. Pitch shifting one generic sample is not enough.

- Twinsen: warm, direct, lightly curious. He can hesitate before answering.
- Zoé: clear and assured, with connected syllables. Concern sharpens her delivery without making her shrill.
- Baldino: gathers momentum when an idea occurs to him, then pauses at the awkward part. Keep him easy to listen to.
- Arthur: lively and quick, with a comfortable pitch. Avoid squeaks.
- Vesk: measured and persuasive. When challenged, he becomes more clipped and decisive while retaining the same voice.
- Sendell: calm and spacious. Preserve clarity at low volume; do not bury the voice in echo.
- Oren, where implemented: gentle and steady. His refusal can sound unsettling precisely because he stays courteous. Keep his voice distinct from Sendell’s.
- Residents: create a few reusable voice families with stable assignments. A shopkeeper should still sound like the same person on the next visit.

Use a small set of intentions such as greeting, question, explanation, refusal, concern, and relief. Choose variations that fit the speaker and scene. Avoid immediate repeats. Do not randomize every syllable or exaggerate every emotion.

4. Make listening and interruption comfortable.

Match perceived volume across speakers. Tame piercing peaks, hard attacks, and intrusive high frequencies. Check on laptop speakers as well as headphones when available. Keep music audible and subtitles readable. Respect the existing voice-volume and mute settings.

Verify the actual controls: revealing a subtitle instantly must not replay its voice; advancing to the next line must release the old voice cleanly; closing dialogue must stop pending phrases. Rapid skipping must never stack voices, click, or delay control. Do not stretch dialogue scenes or force the player to wait for gibberish to finish.

Use the existing audio pipeline where possible. Reuse decoded clips and prepare them without blocking a visible frame. No network dependency or continuous background synthesis. Check first-use stalls and repeated conversations on the project’s low-spec target where available.

5. Prove the change with one conversation before applying it everywhere.

Start with an actual exchange between Twinsen and Zoé. Produce two short candidate recordings of the same scene: one using connected recorded or pre-rendered phrases, and another using the best viable alternative in the existing pipeline. Keep subtitles, timing, mix volume, and dialogue identical. Listen to the old version and both candidates. Choose the one that sounds most like two people responding to each other, then use that approach across the implemented cast.

Deliver a short, clearly labeled A/B audio or video file I can open directly without launching the game. Also include a cast sampler: the same simple question delivered by several characters, followed by one character expressing two different emotions. This makes it possible to hear both identity and range.

Check a full conversation lasting at least a minute for repetition and listening fatigue. Automated checks can catch clipping, bad joins, and overlapping playback; they cannot establish that a voice is pleasant. If you cannot audition the result in your environment, say so and provide the rendered samples for listening. Do not report subjective audio quality as verified from logs alone.

Finish with the implemented files, the listening samples, and a brief note explaining what caused the old choppiness and what changed. Continue beyond the first two characters without waiting for another “continue.”
