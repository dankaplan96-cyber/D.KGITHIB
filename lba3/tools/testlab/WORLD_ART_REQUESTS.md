# World art: change requests from the laptop (for the cloud session)

The user decided (31.10.2026) that only the cloud session edits game code. The laptop session works as follows:
- It prototypes a world-art change in a separate local copy that is never pushed.
- It measures the change on the target laptop (Vega 8; baseline → candidate → baseline, plugged in and on battery)
  and shows the user matching before/after pictures (Citadel only).
- It writes the approved change here, exactly.

**The cloud session:** apply each request as written, then build. The laptop checks the build and marks the request
**Verified** below.

Status values: **Approved** (apply it) · **Applied** (the cloud) · **Verified** (the laptop, on the build).

---

## WA-1 · Citadel soil: less orange, a darker brown earth · Applied (the cloud, 31.10.2026; in the build after 0.44.0)

- **Why:** at the gameplay camera, under the warm sun, the town soil between the paths still read orange.
  LBA2's Citadel soil is a darker, browner earth (docs/LBA2_VISUAL_NOTES.md: "brown soil").
- **File:** `src/engine/textures.js`, the "dirt path" block (`T.dirt`). Same canvas size, same texture: no new
  material, texture or draw.

```diff
-    x.fillStyle = '#9a6e4c'; x.fillRect(0, 0, S, S);
-    blotches(x, S, r, 40, ['#895e3f', '#a97c58', '#7f5741'], 15, 40, 0.6);
+    // (WORLD-ART-1: still read orange at the gameplay camera under the warm sun, laptop 31.10; LBA2's town soil is a
+    //  darker, browner earth: #9a6e4c → #8a6a50, the blotches likewise, a shade less red. Same canvas, same texture.)
+    x.fillStyle = '#8a6a50'; x.fillRect(0, 0, S, S);
+    blotches(x, S, r, 40, ['#7a5d45', '#99785b', '#715542'], 15, 40, 0.6);
```

**Measured** on the laptop. Dev build, 0.44.0 at 62eb3dc, against the same with the change. Chrome on the Vega 8,
street-traversal, plugged in.
- Seven runs: baseline → candidate, ×3, then baseline.
- **No clear difference:** fps 59.98 → 60; GPU p50 9.97 → 9.88 ms (baseline spread 1.2 %); p95 16.8 → 16.8 ms.
- **On battery** (90 → 86 %, Auto Medium), the same seven runs: **no clear difference**. fps 46.85 → 47.17; GPU p50
  17.27 → 17.25 ms (baseline spread 0.3 %); p95 33.4 → 33.4 ms.

**Pictures:** before/after at the same views, shown to the user and approved
(`tools/testlab/runs/ba-soil.jpg` on the laptop).

**Also affected:** this texture is the dirt of every outdoor region that uses the town soil, not only the Citadel.
The laptop checks the other regions on the next build's sweep.

---

## WA-2 · Citadel roofs: four kinds instead of one · Approved (user, 31.10.2026)

- **Why:** every Citadel house had the same gable roof (terracotta or bright blue) with a chimney and gutters, so the
  town read uniform. The original LBA2 Citadel (the user's own GOG files, studied on the laptop) varies its roofs.
  - Twinsen's house and his neighbour's: straw thatch with a dark timber ridge.
  - The stone house and the south house (the original shop): low brown plank roofs, 18–24°.
  - The baggage hall: blue-grey slate.
  - The original has no chimneys.
- **Twelve years and the 80 % rule:** the other houses keep terracotta and blue, and three chimneys remain. The town
  gains variety; it is not rebuilt to the original.

**1. A thatch texture,** `src/engine/textures.js`, right after the planks block (after `T.planks = toTex(c);` and its
closing brace). It is one more 256 px canvas texture in the same painted style:

```js
  // thatch (WORLD-ART-2): LBA2's Citadel cottages (Twinsen's, his neighbour's) wear straw in courses under a dark ridge
  {
    const [c, x] = canvas(S); const r = rng(104);
    x.fillStyle = '#c9a66b'; x.fillRect(0, 0, S, S);
    const n = 6, h = S / n;
    for (let j = 0; j < n; j++) {
      for (let k = 0; k < 260; k++) {
        const px = r() * S, py = j * h + r() * (h - 4), len = h * 0.45 + r() * h * 0.5;
        x.strokeStyle = ['#e2c487', '#b8924f', '#d6b274', '#a8834a'][k % 4]; x.lineWidth = 1 + r();
        x.beginPath(); x.moveTo(px, py); x.lineTo(px + (r() - 0.5) * 3, Math.min(py + len, j * h + h - 3)); x.stroke();
      }
      x.fillStyle = 'rgba(70,48,22,0.45)'; x.fillRect(0, j * h + h - 3, S, 3);   // (each course's shadow on the next)
    }
    speckle(x, S, r, 160, ['#7a5a30', '#f0d8a0'], 0.3, 0.3);
    T.thatch = toTex(c);
  }
```

**2. The houses,** `src/game/town.js`, `HOUSES`. Only these fields change on six lines:

| id | before | after |
|---|---|---|
| twinsen | `roof: 'roof'` | `roof: 'thatch'` (keeps its chimney: the stove inside) |
| nbr | `roof: 'roof', … chimneyX: 0.2` | `roof: 'thatch', … chimney: false` |
| stone | `roof: 'roofBlue', … chimneyX: 0.3` | `roof: 'planks', pitch: 0.4, … chimney: false` |
| south | `roof: 'roof', … chimneyX: 0.3` | `roof: 'planks', pitch: 0.38, … chimney: false` |
| wing2 | `roof: 'roof'` | `roof: 'planks', pitch: 0.4` (keeps its chimney) |
| baggage | `roof: 'roofBlue', … chimneyX: 0.35` | `roof: 'slate', pitch: 0.5, … chimney: false` |

- **Collisions:** the walls are unchanged. The lower pitches lower three roofs' ridges by about 0.4–0.9 m. Run the
  house and occluders tests: `buildHouse`'s colliders' `top` may follow the roof.

**Measured** on the laptop. Dev build at 62eb3dc against the same with WA-1 and WA-2, Chrome on the Vega 8,
street-traversal, plugged in. Twice: unseeded, then `?seed=7`. Each time seven runs, baseline → candidate ×3 → baseline.
- **No clear difference:** fps 60 → 59.6–59.9; GPU p50 10.02–10.07 → 9.93–10.14 ms.
- **Draw calls and triangles unchanged:** 164–169 calls and about 780 k triangles in both builds.
- CPU work drifted up over each run, in the baseline too (11.1 → 12.2 ms between its first and last run). It is not
  the roofs.
- **Not measured on battery:** the user ended the fps work on this laptop (31.10).

**Pictures:** before/after at six views (Twinsen's house, the neighbour's, the south and stone houses, the baggage
hall, the gardens), shown to the user and approved (`tools/testlab/runs/ba-roofs.jpg` on the laptop).
