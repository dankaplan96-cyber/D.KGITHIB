---
name: lba3-structure-over-fps
description: "From 31.10.2026 evening the user stopped the fps chase on this weak laptop; the focus is the game's structure (world and buildings)"
metadata:
  node_type: memory
  type: feedback
  originSessionId: 5ab6eb84-7519-44bc-bb3c-9b5d6a3ccabd
  modified: 2026-10-31T20:06:17.398Z
---

The user, 31.10.2026: "We stop chasing fps, this computer is weak. Now we focus on the structure of the game."

**Why:** the laptop (Vega 8) sets a ceiling the art work can't move. Long battery A/B runs were taking the user's time for changes that cost nothing.

**How to apply:**
- World Art requests no longer wait for battery A/B runs.
- One plugged-in sanity check (draw calls, triangles, a quick compare) is enough, and only for a change that adds geometry, materials or textures.
- Don't propose performance investigations unless the user asks.
- Put the time into the game's structure: buildings, walls, roofs, doors, street furniture, layout and composition, compared with LBA2 for craft. See [[lba3-twelve-years]] (80 % likeness).
- The flow is unchanged: prototype in lba3-proto, show before/after, write approved changes to tools/testlab/WORLD_ART_REQUESTS.md for the cloud. See [[lba3-world-art-role]].
