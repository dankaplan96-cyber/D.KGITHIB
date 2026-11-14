---
name: lba3-layout-like-original
description: When rebuilding an LBA1/LBA2 place, keep its layout (where stairs, upper floors, bar, doors stand) ~80% like the original; changes from the 12 years are details on top
metadata:
  type: feedback
---

When I rebuild a place from LBA1/LBA2 (e.g. the Chez Luc tavern, LBA2 scene 3), the layout must match the original as seen from the game camera: where the stairs run, where the upper floor/gallery is, which wall has the windows, where the bar and the door are. Twelve-years changes are added on top as details (props, uses), not by moving the structure.

**Why:** the user, 1.11.2026, on my first tavern prototype (gallery and stair placed my own way): "also the location of the stairs and the second floor — it makes sense that things change after 12 years, but it should look 80% similar… in general".
**How to apply:** measure the original's layout from its brick render (iso_lba2.py) and map its walls to our iso camera (our camera shows the back and left walls; the original's long wall may need W/D swapped). Check the picture side by side before sending. See [[lba3-twelve-years]].
