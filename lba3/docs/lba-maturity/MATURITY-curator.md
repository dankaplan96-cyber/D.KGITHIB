## MATURITY-curator · Citadel and Zeelich · the laptop, 8.11.2026

Order 27a (lba-world-reference-curator).
- **Build:** HEAD `21bf522d` (contains origin `c5bf5608`), served from a `git archive` copy in scratch. Fresh profile;
  Chrome ANGLE D3D11 on the Vega 8.
- **Labels:** our side **Automated runtime only** (pictures looked at, nothing played). References **Source only**:
  decoded from the user's LBA2/LBA1 files in place; no gameplay screenshots, remakes or fan models; no download.
- **Scores** are provisional editorial judgements on the 85/100 rubric, not reviewed by the user.

**Files** (scratch: `C:\Users\dan\AppData\Local\Temp\claude\deb53b226b83eb12\5ab6eb84-7519-44bc-bb3c-9b5d6a3ccabd\scratchpad\curator\`):
- `resemblance-citadel.md`, `resemblance-zeelich.md`: per district, the six categories with their reference, capture,
  reason, confidence and correction;
- `BUILDING_REGISTER.csv`: the 123 rows kept (their 13 columns unchanged), 10 rows added, and three columns added:
  `in_original`, `has_door`, `story_locked`;
- pictures: `ours\`, `ref\` and the sheets in `work\`. **Zeelich pictures are not for the user.**

### Scores (/100; no district reaches 85)
- **Citadel:**
  - harbour 73; square and Bug Street 75; lower town south 78; terraces 71; Twinsen's quarter 83;
  - **lighthouse 67 (critical: wrong silhouette)**; north plateau, the fort and the asylum 71;
    **NW plateau, Bersimon's tent 66 (critical: the tent's colour and form)**; sewer 76;
  - west islet withheld (the dome excluded; not seen in play).
- **The terminal island (new city):** compatibility only, 60–69 normalised:
  - the street and plaza 69, the spaceport 65, the pier and gate 65, the industrial east 60.
- **The isles:**
  - Otringal: harbour 66, plaza 66, **high town 61**, astroport 68; the upper town withheld;
  - **Knartas:** village 58, harbour 58;
  - **Mosquibee:** nest 56, upper village 62;
  - **Celebration 59**; Under Celebration 62;
  - **Platform:** tower 54, village 57;
  - Lift Dock 65.

Critical landmark or architecture failures (bold above):
- Knartas's Franco huts and its zeppelin;
- Mosquibee's cocoon nest;
- Celebration's figure;
- the Platform's lift tower;
- Otringal's palace cluster.

Interiors by eye:
- Otringal bar and hotel: close;
- Celebration's temple: fair;
- Zeelich Spaceport's hall: plain beside LBA2's astroport;
- Citadel's rooms: their layouts match LBA2's, their stone is darker.

### Top fixes for the cloud (the points they buy)
1. **The isles' own architecture** instead of the Esmer box everywhere:
   - Knartas: Franco round dome huts with portholes;
   - Mosquibee: the white cocoon nest and a stake palisade;
   - the Platform: the lattice lift tower and metal blocks.

   Gain: +4 to +10 per district. Owner: world-art. Size: L.
2. **Otringal's ground value.** The rendered paving is #605b60 against zislands' own target #d3ced9 to #ece8de and
   LBA2's #d0cdc5 (measured on the captures): something darkens it. Gain: +5 in each of 4 districts. Owner: world-art.
   Size: S–M.
3. **The Citadel lighthouse in LBA2's shape:** a white square stone tower, grey quoins, a lantern with a domed cap, an
   annex. Gain: +13. Owner: world-art. Size: M.
4. **Citadel's harbour:** barrel roofs on the long hall (the ticket office) and Nell's; a straight paved quay with
   white bollards. Gain: +9. Owner: world-art and world-polish. Size: M.
5. **Landmark pieces:**
   - Knartas's zeppelin;
   - Celebration's rough grey figure with its gold halo, and its temple door on LBA2's building;
   - the Lift Dock's red frame and hazard decks;
   - the red ember veins and crystals of the volcano islands.

   Gain: +4 to +6 each. Owner: world-art (buildings-interiors for the temple door). Size: M.

Then:
- Bersimon's red tent (+7);
- Bug Street's flat roofs, the school's hip roof and the statue's four gold lamps (+6, +3);
- pale rounded stone in Citadel's rooms (about +3 a room);
- the terminal island's rock skirt and round drum houses (compatibility about 65 → 80).

### Unverified
- LBA2's lighting, sky and cloud colour: no gameplay capture.
- LBA1's Citadel exterior was not rendered.
- Every "inhabited" score rests on source and tests.
- Not captured: the Water Office's room, Otringal's upper town, the Platform's church.
- Black shaft columns at the sewer hatches show only in the orthographic captures, not in three Follow shots. Check
  from a high VP-10 shot.
- `tools/worldscore` was not re-run on this build.

### Not done
No fix is implemented and nothing was re-evaluated after changes: the repo was read-only for this order. The register's
Desert Island and Hamalayi rows got the new columns but no original comparison (outside 27a). Next for the curator:
Desert Island and the Hamalayi; then a re-score after each fix batch.
