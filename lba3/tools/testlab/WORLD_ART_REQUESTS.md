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

## WA-2 · Citadel roofs: four kinds instead of one · Applied (the cloud, 31.10.2026; in the build after 0.44.0)

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

---

## WA-3 · Citadel: rubble walls on the two thatched cottages, the old shop's striped awning · Applied (the cloud, 31.10.2026; in the build after 0.44.0)

Prototyped on the laptop on top of WA-1 and WA-2. The pictures wait for the user (`tools/testlab/runs/ba-walls.jpg`
on the laptop).

- **Why:** in the original LBA2 Citadel (the user's own GOG files):
  - Twinsen's house and his neighbour's are dark rubble stone under thatch, LBA2's signature cottage. Ours are cream
    and pale-green plaster.
  - The original shop (our 'south' house) has pink-and-white striped awnings over its front.
- **File:** `src/game/town.js`, `HOUSES`. Only these fields change; it reuses the existing `rubble` texture and
  `buildHouse`'s awning:

| id | before | after |
|---|---|---|
| twinsen | `wall: 'plaster', tint: '#fff8ea'` | `wall: 'rubble', tint: '#f2eee8'` |
| nbr | `wall: 'plaster', tint: '#e8f0d8'` | `wall: 'rubble', tint: '#ece8e2'` |
| south | (no awning) | add `awning: '#e58aa0', awningW: 6.6, awningX: 0` |

- **Cost:** none expected (existing texture, one awning mesh). It will be checked with a quick plugged-in run when
  approved.

---

## WA-4 · Carved double doors on the two thatched cottages · Applied (the cloud, 31.10.2026; in the build after 0.44.0)

Prototyped on the laptop on top of WA-1 to WA-3 (pictures: `tools/testlab/runs/doors.jpg` on the laptop).

- **Why:** every house of ours has the same 1.05 × 2.15 m arched plank door. The original LBA2 cottages (rubble and
  thatch) have wide carved double doors, about 1.8 m in two leaves, in dark wood with gold scrollwork. It is a strong
  LBA2 detail, at a scale the gameplay camera reads.
- **1. `src/game/architecture.js`:** `buildHouse`'s door takes optional `w`, `h` and `carved`. A carved door gets:
  - the seam between its two leaves;
  - a raised frame on each leaf;
  - a gold medallion and a gold scroll pair on each leaf;
  - two knobs at the seam (no hinge bands).

  Without the new options a door is exactly as before. The exact diff:

```diff
diff --git a/lba3/src/game/architecture.js b/lba3/src/game/architecture.js
index b08741e..02ee77d 100644
--- a/lba3/src/game/architecture.js
+++ b/lba3/src/game/architecture.js
@@ -119,7 +119,8 @@ export function buildHouse(opts) {
 
   // ---- openings per side (local x along the side, y up)
   const holes = { front: [], back: [], left: [], right: [] };
-  const door = { x: o.door?.x ?? 0, y: 0.18, w: 1.05, h: 2.15, arch: o.door?.arch ?? true };
+  // (WORLD-ART-4: door { w, h, carved }: LBA2's cottages have wide carved double doors with gold scrollwork)
+  const door = { x: o.door?.x ?? 0, y: 0.18, w: o.door?.w ?? 1.05, h: o.door?.h ?? 2.15, arch: o.door?.arch ?? true, carved: !!o.door?.carved };
   holes.front.push(door);
   for (const wdw of o.windows || []) holes[wdw.side].push({ x: wdw.x, y: wdw.y ?? 1.25, w: wdw.w ?? 0.8, h: wdw.h ?? 1.0, arch: wdw.arch, win: true });
 
@@ -177,8 +178,24 @@ export function buildHouse(opts) {
         else { ds.lineTo(op.w / 2, op.h); ds.lineTo(-op.w / 2, op.h); }
         ds.lineTo(-op.w / 2, 0);
         mesh(scaleUV(new THREE.ExtrudeGeometry(ds, { depth: 0.07, bevelEnabled: false, curveSegments: 10 }), 1.1, 2.2), texMat('wood', { color: o.doorColor || '#c8905a' }), dg);
-        mesh(new THREE.SphereGeometry(0.04, 8, 6), plain('#d8b04a', 0.4, { metalness: 0.6 }), dg, op.w * 0.32, 1.0, 0.1);
-        for (const hy of [0.4, 1.6]) mesh(new THREE.BoxGeometry(op.w * 0.7, 0.05, 0.02), plain('#3a3a3a', 0.5), dg, -op.w * 0.1, hy, 0.08);
+        if (op.carved) {
+          // two leaves: the seam between them, a raised frame on each, a gold medallion and a gold scroll band on each
+          const gold = plain('#d8b04a', 0.4, { metalness: 0.6 });
+          mesh(new THREE.BoxGeometry(0.03, op.h - 0.04, 0.02), plain('#3a2614', 0.8), dg, 0, op.h / 2, 0.08);
+          for (const lx of [-1, 1]) {
+            const cx = lx * op.w / 4;
+            for (const [fy, fh] of [[op.h * 0.62, op.h * 0.5], [op.h * 0.2, op.h * 0.28]]) {
+              const fr = new THREE.Group(); fr.position.set(cx, fy, 0.085); dg.add(fr);
+              const fw = op.w / 2 - 0.16;
+              for (const s of [-1, 1]) { mesh(new THREE.BoxGeometry(fw, 0.04, 0.03), plain('#5a3a1e', 0.8), fr, 0, s * fh / 2, 0); mesh(new THREE.BoxGeometry(0.04, fh, 0.03), plain('#5a3a1e', 0.8), fr, s * fw / 2, 0, 0); }
+            }
+            const md = mesh(new THREE.TorusGeometry(0.11, 0.025, 6, 16), gold, dg, cx, op.h * 0.66, 0.11);
+            md.scale.set(1, 1.3, 1);
+            for (const s of [-1, 1]) { const sc = mesh(new THREE.TorusGeometry(0.07, 0.018, 5, 10, Math.PI), gold, dg, cx + s * 0.08, op.h * 0.2, 0.11); sc.rotation.z = s > 0 ? 0 : Math.PI; }
+            mesh(new THREE.SphereGeometry(0.035, 8, 6), gold, dg, -lx * 0.07, 1.05, 0.1);
+          }
+        } else mesh(new THREE.SphereGeometry(0.04, 8, 6), plain('#d8b04a', 0.4, { metalness: 0.6 }), dg, op.w * 0.32, 1.0, 0.1);
+        if (!op.carved) for (const hy of [0.4, 1.6]) mesh(new THREE.BoxGeometry(op.w * 0.7, 0.05, 0.02), plain('#3a3a3a', 0.5), dg, -op.w * 0.1, hy, 0.08);
         mesh(surround(op, 0.08), stone, panel, 0, 0, T - 0.02);
         mesh(new THREE.BoxGeometry(op.w + 0.6, 0.18, 0.55), stone, panel, op.x, 0.09, T + 0.26);
       }
```

- **2. `src/game/town.js`, `HOUSES`:**
  - twinsen: `door: { x: 2.6 }` → `door: { x: 2.6, w: 1.7, h: 2.5, arch: false, carved: true }, doorColor: '#7c4f2c'`
  - nbr: `door: { x: 0.0 }` → `door: { x: 0.0, w: 1.6, h: 2.4, arch: false, carved: true }, doorColor: '#7c4f2c'`
- **Check:** the door opening grows. Does the door trigger zone (`door: { x, z }`, unchanged) still sit in front of it?
  Run the house and transitions tests.
- **Cost:** about 30 small meshes per carved door, two doors in all. A quick plugged-in run when approved.

---

## WA-5 · Citadel: grey stone on three pastel houses · Applied (the cloud, 31.10.2026; in the build after 0.44.0)

Prototyped on the laptop on top of WA-1 to WA-4 (pictures: `tools/testlab/runs/ba-walls2.jpg` on the laptop, sent
to the user).

- **Why:** the original LBA2 Citadel has no pastel plaster: its houses are grey ashlar or rubble. Ours had seven
  plaster tints.
- **Twelve years and the 80 % rule:** three houses go back to stone. The pink house and bug2 keep their plaster, and
  the shop keeps its own wall, so the art kit's "warm plaster" palette stays.
- **File:** `src/game/town.js`, `HOUSES`. Only these fields change; it reuses the existing `stone` texture:

| id | before | after |
|---|---|---|
| water | `wall: 'plaster', tint: '#dfe8f2'` | `wall: 'stone', tint: '#eef0f2'` |
| museum | `wall: 'plaster', tint: '#f0e0f0'` | `wall: 'stone', tint: '#f2eef0'` |
| wing2 | `wall: 'plaster', tint: '#f4ead8'` | `wall: 'stone', tint: '#f4f0e8'` |

- **Cost:** none expected (the same texture other houses already use).

---

## WA-6 · Citadel trees: broader crowns · Applied (the cloud, 31.10.2026; in the build after 0.44.0)

Prototyped on the laptop on top of WA-1 to WA-5 (pictures: `tools/testlab/runs/ba-trees.jpg` on the laptop, sent to
the user).

- **Why:** the original LBA2 Citadel's trees have broad, chunky crowns. Measured from the original's models: round
  3.2 m wide against our 2.7, tall 3.0 against 2.2, palm 3.9 against 3.1. Ours read thin at the gameplay camera.
- **File:** `src/game/world.js`. The tree instances are widened across, with their height kept. It is the same
  geometry and the same instances: only their scale changes.
  1. Just above `const mkInst = (geo, m, list, shadow = true, colorFn = null, geoLo = null, small = false) => {` add:
     ```js
       // (WORLD-ART-6: LBA2's Citadel trees have broad, chunky crowns: round 3.2 m wide against our 2.7, tall 3.0 against 2.2,
       //  measured from the original's models; the crown (and trunk) widened across, the height kept)
       const CROWN = { round: 1.18, tall: 1.3, fruit: 1.15 };
     ```
  2. In the batched path:
     - before: `_bs.setScalar(t.s)`
     - after: `_bs.set(t.s * (CROWN[t.kind] ?? 1), t.s, t.s * (CROWN[t.kind] ?? 1))`
  3. In the instanced path:
     - before: `o.scale.setScalar(t.s)`
     - after: `o.scale.set(t.s * (CROWN[t.kind] ?? 1), t.s, t.s * (CROWN[t.kind] ?? 1))`
- **Unchanged:** bushes and pines (no `kind` in the table, so factor 1), tree colliders and positions.
- **Check:** wider crowns hide a little more from the camera. Run the camfollow and occluders tests.

---

## WA-7 · Twelve interiors: palettes and materials instead of one dark blue-grey look · Applied (the cloud, 31.10.2026; in the build after 0.44.0; the archive plaster #e6d0a4, as suggested)

- **Why:** the whole-game sweep found about a dozen rooms sharing one look: dark blue-grey walls, a grey floor and
  little floor/wall separation, so they read empty and alike. They are:
  - school, wtent, archive;
  - valves, condA, condB, butemple;
  - control, projoffice;
  - asylum, bumaze, buhalls.

  Each now gets a palette that fits its purpose, after docs/LBA2_VISUAL_NOTES.md ("Interiors", "Industrial",
  "Underground"):
  - **warm wood:** honey boards or warm floors (school, wtent, archive);
  - **industrial:** teal-painted plates, red steel rails and hazard rims (valves, condA, condB);
  - **checker floors:** sand/umber or terracotta/cream (control, projoffice);
  - **warm floors** against the walls (asylum, bumaze, buhalls).
- **What it does not add:** no lights, shaders, geometry, props or texture generators, and no change to room sizes,
  collisions or doors.
  - A few new palette keys make one small canvas texture each, once, at build time: the tiles of control and
    projoffice, the archive's plaster, and plates `'#2f8a86'`.
  - `lba1room.js` gains two optional options, `topCol` and `sideCol`. Rooms that don't pass them are exactly as before.
- **Files:**
  - wizards.js, upper.js, valveroom.js, condenser.js, temple.js, interiors.js (control, projoffice only);
  - lba1room.js and lba1places.js.
  - **The exact diff:** `tools/testlab/requests/WA-7-interiors.diff`. Apply it as is.
- **Checked on the laptop:** before/after frames of all twelve rooms (`tools/testlab/runs/ba-rooms.jpg` on the laptop;
  later chapters, so not shown to the user).
- **One thing to look at:**
  - The archive's new parchment plaster (`MAT.plaster('#f0e4c8')`) reads a little pale grey under the room's cool
    lights. A warmer `'#e6d0a4'` would hold better; it is the cloud's call.
  - In buhalls `topCol` also warms the tops of the walls (by design of the option); the floor and the wall faces
    still separate.
- **Untouched:** obsv already had warm stone walls and a light checker floor.

---

## WA-8 · Twinsen's house: terracotta tile floor and teal wallpaper, as LBA2's · Applied (the cloud, 1.11.2026; in 0.47.0)

Prototyped on the laptop on 0aed5b2 (0.46.0). Pictures (before / after / the original's bricks) were sent to the user.
The whole-game comparison behind it is `tools/testlab/examples/WORLD_LOOK_COMPARE.md`.

- **Why:** LBA2's house (scene 0) has a terracotta tile floor (#ac866a / #895f44) and teal patterned wallpaper
  (#364649 with a lighter pattern) above the wainscot. Ours has honey planks and cream plaster, and its chroma is
  34 against the original's 15. These are materials only: no geometry.
- **File:** `src/game/interiors.js`, `buildHouse` (exact diff: `tools/testlab/requests/WA-8-10.diff`).
  1. before: `const rail = MAT.wood('dark'), capM = MAT.wood('dark'), bodyM = MAT.plaster('#f0e4c8');`
     after (with the comment line above it):
     ```js
       // (WORLD-ART-8: LBA2's house (scene 0) has teal patterned wallpaper over the wainscot and a terracotta tile floor)
       const rail = MAT.wood('dark'), capM = MAT.wood('dark'), bodyM = MAT.paper('#4f6b6b', '#9cc4bc', 'diamond');
     ```
  2. In the `B.shell({...})` call:
     - before: `floor: MAT.planks('honey'),`
     - after: `floor: MAT.tiles('#ac866a', '#9a6e52', '#5e4232', false, 4),`
- **Unchanged:** the wainscot, rails, caps, furniture, rugs and windows. The inside dividers take `bodyM`, so they get
  the wallpaper too, as in the original.
- **Check:** the house test, and the review pictures of the house.

---

## WA-9 · Grass: a softer sage green · Applied (the cloud, 1.11.2026; in 0.47.0)

- **Why:** seen from above, the original Citadel's grass is #74885c, a soft sage. Ours is #497219, a deep saturated
  green, which is the largest single colour gap on the island.
- **Measured** (Citadel from above, before → after): grass #4a731a → #4d692c, chroma 33.7 → 27.4. Zeelich's islands
  have a grass texture of their own and are unchanged.
- **File:** `src/engine/textures.js`. Just before `T.grass = toTex(c);` add:
  ```js
      // (WORLD-ART-9: LBA2's lawns are a soft sage green (the original Citadel's grass from above, #74885c), ours read a
      //  deep saturated green (#497219 from above): the drawn tile taken 35 % toward its own grey, the lightness kept)
      { const d = x.getImageData(0, 0, S, S), p = d.data;
        for (let i = 0; i < p.length; i += 4) { const l = p[i] * 0.299 + p[i + 1] * 0.587 + p[i + 2] * 0.114; for (let k = 0; k < 3; k++) p[i + k] += (l - p[i + k]) * 0.35; }
        x.putImageData(d, 0, 0); }
  ```
- **Not covered:** the 3-D grass blades and the bushes keep their colours. A further step, if wanted, is the same
  treatment on those materials.

---

## WA-10 · Desert Island: a less orange light · Applied (the cloud, 1.11.2026; in 0.47.0)

- **Why:** from above, LBA2's sand is #d0aa83 (pale, pinkish beige). Ours reads #e0a646, with chroma 51 against 21.5.
  The sand's own colours in desert.js are pale already; the orange comes from the light.
- **Measured** (dev build, the desert from above, before → after): chroma 40.5 → 35.8, sand #c69039 → #c2944a. This is
  a first step only: it does not reach the original's beige.
- **File:** `src/game/desert.js`, the area's `env`:
  - before: `env: { fog: '#f0d2a2', sun: '#fff0d4', hemiSky: '#ffe6bc', hemiGround: '#b4845a', sunI: 2.9, hemiI: 1.25, fogRange: [80, 280] },`
  - after: `env: { fog: '#eadcc6', sun: '#fff6ea', hemiSky: '#f2ece2', hemiGround: '#a68a72', sunI: 2.9, hemiI: 1.25, fogRange: [80, 280] },   // (WORLD-ART-10: a less orange light; LBA2's sand is a pale pinkish beige, #d0aa83 from above)`
- **Still open for the cloud:** the original has grey rock outcrops over about 24 % of the island; ours has almost
  none. Rock on the steeper slopes (colorFn's `slope > 0.8` branch, with COL.rock a grey-beige rather than
  '#e0a080') would close part of that.

---

## WA-11 · Zeelich's islands: each one's own ground, not one green lawn · Applied (the cloud, 1.11.2026; in 0.47.0: the laptop's prototype, below)

Not prototyped on the laptop: it is design work across several builders. Numbers:
`tools/testlab/examples/WORLD_LOOK_COMPARE.md`.

- **Why:** this is the largest look gap in the game. In LBA2 each island has its own ground. Ours are almost all green
  lawn (40–60 % of the land) with purple cliffs. The originals' grey share is 39–74 %; ours is 2–11 %.
- **Each island's original ground, seen from above:**

  | Island | Original ground | Grey % (LBA2 / ours) |
  |---|---|---|
  | Otringal | pale lavender-grey paving and stone, white and grey buildings | 64 / 4 |
  | CX islet | pale grey patterned paving, crenellated stone walls, two round red-and-white emblems | 56 / 3 |
  | Knartas | grey rock, an orange-tiled terrace, round domed huts, sand edges | 47 / 6 |
  | Celebration | dark grey rock, red lava channels, the grey figure | 71 / 11 |
  | Under Celebration | dark rock, an ochre plain, red lava | 56 / 3 |
  | The Platform | dark rock and dark paving | 74 / 11 |
  | The Lift Dock | metal decks, hazard stripes, the gas tanks | 59 / 6 |
  | Mosquibee | ochre-brown rock, pale sand, a grey-white nest | 39 / 2 |

- **Ask:** give each island's terrain its original's main material (paving, rock, lava or deck) in place of lawn.
  Keep grass to small gardens (at most 15 % of the land; the originals have 0–11 %), so the twelve years still show.
  Send before/after pictures; they are for the developers, not shown to the player.

---

## WA-12 · Citadel ground: more rock and soil, less lawn · Applied (the cloud, 1.11.2026; in 0.47.0: the laptop's prototype, below)

- **Why:** LBA2's Citadel from above is 17 % grass, 36 % soil and 41 % grey (rock strata on the terrace faces, setts,
  stone). Ours is 53 % grass, 18 % soil and 18 % grey. The original's rock shows across the island's slopes, not only
  on its rim.
- **Ask:**
  - Rock (the terrain's rock layer) on the terrace slopes inside the island, not only on the coast.
  - Soil between the paths, where the original has brown earth, round the houses and below the plateau.
  - A target of grass at most 35 % and grey at least 28 % from above. That is about 80 % of the way to the original;
    the rest is twelve years of gardens.
- **Check:** the laptop measures it again with `artall` (citadel-top), and before/after pictures go to the user.

---

## WA-11 and WA-12 now prototyped (1.11.2026) · Applied (the cloud, 1.11.2026; in 0.47.0, the laptop's diff as it is)

The user asked for "more like LBA2" (1.11.2026). WA-11 and WA-12 are no longer only design requests: both were
prototyped on the laptop, and the exact code is in `tools/testlab/requests/WA-11-13.diff` (against 0aed5b2).
- **WA-12, `src/game/world.js`:**
  - A new `wildGround(x, z, n)` returns [soil, rock] patches of about 20 m outside the town (40 m round the village)
    and the fort, kept about 2.4–4.5 m off the paths.
  - `islandSplat` takes these on ground above 1.2 m: soil on w[3], rock on w[2].
  - The grass clumps skip patches where soil + rock > 0.4.
- **WA-11, `src/game/zislands.js`:**
  - A `BARE` table gives each island its rock and paving shares and its stone colour.
  - Its patches go into `splatFn` (rock on wt[2]; paving on wt[4], only where the slope is under 0.45) and into
    `colorFn` (the stone colour).
  - The landing pad and the paved squares are left as they are.
- **Measured from above with WA-13 on:** see the table under WA-13. The grass shares are now Citadel 26 %, Zeelich
  isles 0–31 %; the targets were ≤35 % and ≤15 %. Celebration and Under Celebration still have more grass than asked;
  raise their rock share if you agree.

---

## WA-13 · The whole game: LBA2's muted palette (chroma × 0.72) · Applied (the cloud, 1.11.2026; in 0.47.0)

- **Why:** ours is about twice as saturated as LBA1/LBA2 everywhere (`examples/WORLD_LOOK_COMPARE.md`).
- **Change (`src/engine/renderer.js`, prototyped):**
  - Add `const GRADE = 0.72;` and an output-pass uniform `grade`.
  - Just before three's `// color space` line in the output shader, add:
    `gl_FragColor.rgb = max(mix(vec3(dot(gl_FragColor.rgb, vec3(0.2126, 0.7152, 0.0722))), gl_FragColor.rgb, grade), 0.0);`
  - The code is in `requests/WA-11-13.diff`.
  - It is applied after tone mapping on the pass that already reads every pixel: one dot product and one mix, with no
    texture reads. Its cost was not measured.
  - The HUD (HTML) and the item preview's own renderer are not affected.
  - 0.62 was tried first. The Citadel came out greyer than LBA2 (chroma 12.7 against 17.0), so the value is 0.72.
- **Measured (Test Lab `artall`; the proto worktree is 0aed5b2 with WA-8..13).** Chroma, LBA2 / 0.46.0 / proto:

  | Area | Chroma (LBA2 / 0.46.0 / proto) | Grass % (LBA2 / proto) | Grey % (LBA2 / proto) |
  |---|---|---|---|
  | Citadel | 17.0 / 33.8 / 15.0 | 17 / 26 | 41 / 39 |
  | Desert (with WA-10) | 21.5 / 51.1 / 22.4 | | |
  | 8 Zeelich isles | 9–16 / 20–35 / 13–16 | 0–11 / 0–31 | 39–74 / 26–52 |

  | Interior | Chroma (original / 0.46.0 / proto) |
  |---|---|
  | house (with WA-8) | 14.6 / 34.1 / 18.0 |
  | cellar | 13.0 / 27.7 / 21.7 |
  | workshop | 14.8 / 25.9 / 17.4 |
  | archive | 14.4 / 21.4 / 13.9 |
  | condensers | 10.0 / 12–16 / 9–11 |

- **Still off (for the cloud to judge):**
  - The LBA1 rooms (asylum, the temple's halls and maze) are still about 2× too colourful (10–13 against 4–6).
    WA-7's warm palettes there could go back toward grey stone.
  - The Hamalayi becomes greyer than LBA1's icy cyan (5.6 against 14.4). Give its ice and snow a pale cyan tint, or
    exclude it from the grade.
- **Check:** before/after pictures were sent to the user. The laptop measures again with `artall` after the build.
- **Follow-up applied (the cloud, 1.11.2026):** `renderer.setGrade(grade, tint)` sets an area's own grade and RGB tint in
  the output pass (enterRoom/exitRoom). LBA1's rooms (asylum, bumaze, buhalls) grade 0.5; the Hamalayi grade 0.9 with a
  pale cyan tint (0.95, 1.0, 1.05). Tests lba1rooms, chapter7, chapter1, menus, perfbudget PASS. For the laptop:
  measure the chroma again with `artall` and propose numbers if still off.

### WA-13 follow-up checked on the laptop (1.11.2026, a8e5d37) · proposal WA-13b · Applied (the cloud, 1.11.2026)

The follow-up (`setGrade`: the LBA1 rooms at 0.5; the Hamalayi at 0.9 with tint 0.95/1/1.05) was measured with
`artall` on the dev build at a8e5d37. It is compared with LBA1's own scenes: chroma C* (CIE Lab), lightness L*, and
the hue of the main colour family. The originals are study renders only, not in the repository.

| Area | LBA1 | a8e5d37 (player / iso) | Proposal WA-13b (player / iso) |
|---|---|---|---|
| asylum (scene 0) | C 5.7 | 8.7 / 8.2 | **5.4 / 5.2** |
| buhalls (scene 40) | C 4.9 | 9.8 / 10.8 | **6.0 / 6.6** |
| bumaze (scene 57) | C 3.9 | 6.8 / 6.9 | **4.2 / 5.3** |
| hamalayi, snow hue | ice #a8d2d7, hue 209 | hue 261–274 (lavender) | hue 199–250 (blue-cyan) |

- **The LBA1 rooms:** `src/game/lba1places.js`, `R.grade = 0.5` → **0.32** (all three). That brings them inside
  the target 4–6.
- **The Hamalayi:**
  - The frame tint cannot make the snow cyan. Its snow and hemisphere light are lavender, so a tint only shifts it a
    little: 1.0 with tint 0.9/1.06/1.06 measured hue 251–266.
  - **Fix the colours at the source instead, and drop the tint:**
    - `grade: 1.0, gradeTint: null`.
    - `COL.snowShade` `#e4ecf8` → `#e0ecf3`.
    - `snowTex`: base `#f2f6fc` → `#f0f7fb`; drift blobs `rgba(210,222,240)` → `rgba(205,225,236)`, edge
      `rgba(230,238,250)` → `rgba(228,240,247)`; specks `rgba(170,190,220)` → `rgba(165,195,213)`.
    - `env.hemiSky` `#eef2ff` → `#eef5fd`, `env.hemiGround` `#c0bccc` → `#bcc2cb`.
  - A stronger step (snow `#dcecee`, hemiGround `#b8c8ca`) overshot into mint (hue 160–187), so the values above are
    the midpoint.
  - **What remains is structural, not a colour:** LBA1's Hamalayi is mostly blue ice and frozen water (54 % cool,
    18 % water; C 14). Ours is white snow on mauve-brown rock walls. More ice surfaces (frozen pools, ice sheets on
    the slopes) would close it; a frame tint would not.
  - The top view is not a fair measure here: the mountain walls round the area fill half of it.
- **The code:** `requests/WA-13b-14b.diff` (against a8e5d37; also the WA-14 water below).

---

## WA-14 · The Citadel sewers, as in LBA2 · Applied and approved by the user (the cloud, 1.11.2026)

The user: "What about the sewer that LBA2 has? We need to add that too." The game has no sewer area today. The well
(`buildWell`) is a crystal cave, not a sewer.

- **The original:** LBA2 scene 17 ("sewers", Citadel) and scene 18 (the sewers' treasure room). Seen in the laptop's
  own isometric render of scene 17, which is not in the repository:
  - **Layout:** a square hall flooded with pale cyan water. Narrow stone walkways and stepping slabs run along the
    walls, with several stairs up to them. Low stone arches and colonnades with barred openings stand at the back.
  - **Centre:** a raised stone island with a small square well-house (a barred door, an opening on top) and a paved,
    railed platform.
  - **Details:**
    - Iron railings.
    - Short pillars topped with pale blue glass globe lamps.
    - Barrels.
    - Clusters of round blue rocks.
    - Small dark spiked balls lining the water's edge.
    - Gargoyle heads on the corner pillars.
    - Small blue plaques on the walls.
  - **Palette (measured):**
    - Stone #4f4e48 (dark grey-brown, rough masonry).
    - Water #70b7c5.
    - Cool accents #6b9094.
    - Soil #604730.
    - Chroma 7.1, L* 40: a dark, muted place. The only colour is the water and the lamps.
- **Ask:**
  - A Citadel sewer area built in our own geometry (no original files) with the layout and palette above, about 80 %
    alike.
  - Its small treasure room behind it, as scene 18.
  - Twelve years later, for example: rust on the railings, a newer pipe or valve, some lamps out.
  - Where the entrance is and in which chapter it opens is the cloud's call, with the story documents. As in LBA2, a
    grate or hatch in the Citadel town is natural.
- **Check:** `artall` shoots it (add it to `regions`). The laptop compares it with scene 17, and before/after pictures
  go to the user.

**Applied and approved by the user (the cloud, 1.11.2026).** `src/game/sewers.js` (the rooms and the grate),
`src/game/story/sewers.js` and `src/game/text/sewers.js` (the side story), registered in `src/game/regions.js` as the
group `sewer` (rooms `sewer` and `sewervault`, built the first time they are needed).
- **The entrance:** a square iron grate in the lane north of Twinsen's house (Citadel, x -45.4, z 56.6), a few steps
  north of where the project's copper heat pipe dives under the lane by Bram's pump. Open from **chapter 1** on, in
  every chapter (an optional side trip; nothing on the main path needs it).
- **The hook:** something knocks under the grate, and Arthur's chalk is on its frame ("A + L" and an arrow).
  Twinsen lifts the grate and climbs down into the well-house on the island.
- **The hall (scene 17):** a 28 × 24 m flooded hall (the game's sea texture, tinted pale cyan), a raised north
  walkway with stairs, a west walkway and a bridge to the island, stepping slabs along the near side, an east pier,
  a colonnade before three barred arches at the back. The island has the well-house (barred door, stepped open top)
  and a railed platform. Iron railings with spear tops, globe-lamp pillars, barrels, blue rocks, spiked iron rings at
  the water's edge, gargoyle heads on the corner pillars and the colonnade, blue plaques.
- **Twelve years on:** half the railings rust, three of the nine lamps are dead, and the project's new heat pipe comes
  down the shaft into a blue valve box bolted onto the old gate winch. It knocks every few seconds. Easing the valve
  stops the knocking, and the winch raises the gate.
- **The treasure room (scene 18):** a dais with a star chest, two lamp pillars, a star plaque, a bronze disc, a
  barrel, blue rocks and spiked rings, with Arthur's chalk boat and his toy boat. The chest holds Arthur's map (the
  found-object ceremony) and a clover. The barrels in both rooms give kashes, as other containers do. Back home,
  Arthur explains it in a short talk: he and Lulu found the room before the pipe jammed the gate.
- **Palette (measured on the play camera, `03-hall-play.jpg`, SwiftShader):** water about (115, 162, 182), stone
  (61, 59, 53); the whole frame averages (69, 79, 79), against (70, 78, 76) for a study render of scene 17 (not in
  the repository).
- **Cost (one frame at High, SwiftShader counts):** the hall 34 draw calls (30 main, 4 shadow) and about 236k
  triangles; the treasure room 35 calls and about 57k triangles. Twinsen's house on the benchmark is 68 calls and
  417k triangles at High. The grate adds about 2 calls in the lane.
- **Check:** `tests/sewers.mjs` (walk in from the town, the gate, the treasure room, back out, Arthur, saves).
  `artall` shoots both rooms (they are in the regions list), and `artrooms` lists them too. Pictures:
  `docs/lba3-production/review/sewers/`.


### WA-14 checked on the laptop (1.11.2026, a8e5d37) · proposal WA-14b (the water) · Applied (the cloud, 1.11.2026)

`LBA3_AREAS=sewer,sewervault` with `artall` (dev build, a8e5d37), measured against study renders of LBA2 scenes 17
and 18 (not in the repository):

| Room | LBA2 | a8e5d37 (player / iso) | WA-14b (player / iso) |
|---|---|---|---|
| sewer: chroma | 7.1 | 13.4 / 11.9 | 13.6 / 12.4 |
| sewer: lightness | 40.1 | 52.0 / 47.4 | 51.9 / 48.1 |
| sewer: water hue (median) | #70b7c5, hue 217 | #70a0b4 / #7babbf, hue 234–235 | #7ab0bd / #7cb4c2, **hue 220–221** |
| sewer: stone | #4f4e48, hue 103 | #43413b, hue 96 | unchanged |
| sewervault: chroma / L* | 5.4 / 30.8 | 5.7 / 23.1 | unchanged |

- **The water reads too blue: yes.** Its hue is 17° bluer than the original's cyan, at a similar chroma (18.8
  against 23.3).
  - The fix, `sewers.js` `waterM`: `color: '#eaeee4', emissive: '#649494'` → `color: '#e2f6e6', emissive:
    '#5e9c92'` (same intensity 0.7). The hue becomes 220–221; the original is 217.
- **The stone is right:** #43413b against #4f4e48, a little darker.
- **The treasure room is right:** chroma 5.7 against 5.4. It is darker (L* 23 against 31), which is acceptable for a
  room lit by two lamps.
- **The hall's chroma (12–13 against 7.1)** is still higher after the water fix. The cause is the share of water in
  the view, not its colour: water is 52 % of the room from the iso view against 31 % in scene 17, and the bright
  pale walkways make it L* 48 against 40. This follows the layout and is left as it is.
- **The code:** `requests/WA-13b-14b.diff`.

### Twinsen's nose (HERO-LOOK, 0.48.0) checked against LBA2 body 1 (1.11.2026) · no change

The user asked whether Twinsen's new nose is like LBA2's. Measured on the models, in fractions of the height H:
- **LBA2 body 1 has no nose of its own.** The face itself comes to a wedge (the snout): its apex is at 0.887 H, about
  0.04 H under the eyes, and stands 0.027 H in front of the face's sides at ±0.043 H.
- **Ours:** the head's sections already make the same wedge: 0.025 H at ±0.04 H (0.858 H, about 0.04 H under our
  eyes at 0.896). The new nose (10 triangles) adds a small knob on the wedge: 0.007 H proud, ±0.01 H wide.
- **Verdict:** similar. The profile and the snout are LBA2's within about 10 %. The knob is a small close-up detail
  that cannot be seen from the play camera, so it is kept: twelve years and 80 % likeness.
- The comparison picture (study renders, not committed) was sent to the user.

---

## WA-15 · Two Zeelich buildings on Citadel's harbour front · REPLACED by WA-15b: do not apply (the user, 1.11.2026)

**On hold.** The user, on the pictures: "What do these buildings give? They feel disconnected." The laptop agrees:
- They are set dressing only: no purpose, no door, no one inside, nothing leads to them.
- B2 cannot be reached at all.
- They stand at the edge of the bay, apart from the life of the harbour (the quay, Odile's customs booth, Tobb's
  cargo).

**Where this is in LBA2:** mapped through `LAYOUT` (dx -76, dz 16) onto the original's own layout numbers
(`tools/worldscore/ref/citadel.json`):
- B1's place is the open paved harbour square in front of the harbour ticket office (scene 8; in our frame the
  baggage claim) and Paul's house (scene 7; in our frame the house beside it), by its railings.
- B2's place is open sea beside the promenade's railings.
- The original has nothing built on either place.

A new version waits for the user's choice:
- drop WA-15;
- or one building with a purpose tied to the harbour (for example, the Esmer traders' office where Tobb's cargo and
  Odile's customs lead, with a trader to meet). That is design and story work for the cloud with the story documents.

The prototype and its numbers below are kept for reference only.

The user's decision D2 of 28.10 (`docs/art-direction/EXPANSION_ART_DECISIONS.md`): "here and there a newer building on
the promenade/waterfront that looks more like Zeelich". Zeelich's building language as imported architecture, a few,
on the harbour front only, not in the old core, as a sign of trade and the twelve years.

- **Zeelich's originals (study renders of LBA2's Otringal and Knartas objects on the laptop; numbers and descriptions
  only, nothing committed):**
  - Otringal's houses are 3.3–7.4 m across and 8.2 m high (the Grand Hall 7.7 × 9.3 m).
  - They stand on eight-sided or rounded plans, with a band of square blue-turquoise tiles round the foot (about a
    third of the height).
  - Above it are pale grey-pink plaster walls and pale turquoise roofs and domes. Gold medallion bands and gold cones
    sit at the eaves, with grey stone columns and tall stone spires.
  - Knartas: rounded pods, metal huts with porthole windows and pipes, decks on stilts.
  - Our `props-esmer.js esmerBuilding`, which draws the Zeelich islands' houses, already speaks this language: a tiled
    frieze, plaster, an onion dome with a gold band and finial, lattice windows, a blue trim. WA-15 uses it as it is,
    with the islands' own materials.
- **Where (the Test Lab probe, `artharbour`; the box x -135…-60, z 10…70):**
  - North of the harbour path, every place is taken: the baggage claim, the house beside it, the shop, Odile's booth
    and the quay's goods.
  - The bay south of the path has two places:
    - **B1, the trading house:** on the shore strip x -86.3…-80.7, z 44.8…49.6. The ground is level at 2.2 m.
    - **B2, a house on piles:** over the cove x -101.9…-94.1, z 45.7…51.5. The cove is water from z 44; the path's
      railing at z 42.6 stays.
  - Both stand between the quay and the baggage claim, about 45 m from the old core's square.
- **What they are:**
  - **B1, the trading house** (`zh-trading`): 5.6 × 4.8 m, a dome to 6.4 m, walls 3.7 m.
    - A store's wide arched door facing the path, under a teal-and-cream striped awning.
    - Pale plaster with Otringal's tiled frieze, a crenellated parapet, and the turquoise onion dome with its gold
      band and finial.
  - **B2, the house on piles** (`zh-pier`): 6.2 × 4.2 m on a 7.8 × 5.8 m plank deck at the path's height (2.35 m).
    - Eight piles go down into the water; a low rail runs round three sides.
    - The same house language, with a smaller dome.
    - There is no way onto it: it is seen from the path.
- **Clear of everything (measured on the probe, a8e5d37 + WA-15):**
  - The nearest container is the museum barrel `c-museum-barrel` at (-78.5, 46.0), 2.2 m from B1, still open on
    three sides.
  - The nearest resident stop is Marda's at (-95.8, 37.4), 8.3 m away. Nell stands 11.4 m away.
  - No door, NPC, route point or story spot is within 8 m.
  - A code search finds no story coordinate on either footprint.
  - Two bushes at about (-82.3, 48.8) and (-80.1, 49.6) and the grass on the footprints are filtered out after the
    scatter, so the random draws and every prop placed after them stay put (as the WA-12 fix).
- **Draw calls** (one whole frame, main + shadow, High, laptop; before → after):

  | View | Calls |
  |---|---|
  | quay north | 142 → 146 |
  | path west | 184 → 188 |
  | path east | 258 → 260 |
  | baggage | 185 → 189 |
  | facing B1 | 122 → 125 |
  | facing B2 | 126 → 129 |

  - That is +2 to +4 calls in view. The buildings are one batch (a draw call per material), the islands' materials,
    with no new texture or shader.
  - The street budget (High ≤ 450, Medium ≤ 300) is untouched. The benchmark's street route does not see the harbour.
- **The code (`requests/WA-15.diff`, against a8e5d37):**
  - New `src/game/harbourzeelich.js`: `ZH`, `zhClear` and `buildHarbourZeelich`.
  - `src/game/world.js`:
    - The import.
    - The trees/bushes filter before `yield 'tree spots'`.
    - The grass/flowers filter after `clearLife`.
    - The build call after `buildIsland`, tagged `harbourzeelich`.
- **Pictures for the user (chapters 1–2, the play camera):** `wa15-trading-house.jpg`, `wa15-pier-house.jpg`,
  `wa15-from-above.jpg` (now / WA-15).
- **Check after the build:**
  - `node engine/cli.mjs artharbour` (the probe and the same views; `LBA3_HARBOUR_VIEWS` for more).
  - The game's own `tests/townlife.mjs`, `tests/drawcalls.mjs street` and `tests/worldfit.mjs`.

---

## WA-15b · One Esmer trading house on the harbour front, with a purpose · Approved: the user chose it (1.11.2026)

The user, on WA-15's pictures: "What do these buildings give? They feel disconnected". Then, of the two choices
(drop it, or one building with a purpose tied to the harbour), the user chose the second: "2". The two-building
version (WA-15) is replaced. No house on piles.

**What it is.** The Esmer trading house: where the Zeelich goods landed on the quay go, after Odile's customs booth
("CUSTOMS Twinsun - Zeelich"). In twelve years trade with Zeelich has grown, and the Esmers keep a house at the harbour.

**Where.** It stands on the shore south of the harbour path, between the quay and the baggage claim: building centre
(-83.5, 47.2), front toward the path, door at (-83.5, 44.8).
- In LBA2 this is the open harbour square in front of the ticket office (scene 8), by its railings; the original has
  nothing built there.
- From the quay it stands at the end of the path, past the customs booth and the stall, and Tobb walks toward it
  carrying his crate (`wa15b-from-the-quay.jpg`).

### The art part (prototyped: `requests/WA-15b.diff` against a8e5d37)

- **New `src/game/harbourzeelich.js`:**
  - `ZH`, `zhClear` and `buildHarbourZeelich(scene, physics, H)`.
  - The house is `esmerBuilding` with the islands' own materials (Otringal's plaster `#fbf0f0`, the turquoise dome
    `domeTex('#2f8a9a', '#a8e8ee')`): 5.6 × 4.8 m, the dome to 6.4 m.
  - A store's wide arched door under a teal-and-cream awning.
  - At the door:
    - a stack of four teal Zeelich cargo crates and two plain crates (the quay's goods);
    - four glazed jars;
    - a brass lamp;
    - a Zeelich flag (teal, gold, cream) on a 5.2 m pole.
  - The goods' colliders are added the way the islands add them.
- **`src/game/world.js`:**
  - The import.
  - The tree/bush filter before `yield 'tree spots'` and the grass/flower filter after `clearLife`. Both run after
    the scatter, so the random draws stay put (as in the WA-12 fix).
  - The build call after `buildIsland`, tagged `harbourzeelich`.
- **Measured** (laptop, High, one whole frame, main + shadow; now → WA-15b):

  | View | Draw calls |
  |---|---|
  | quay north | 142 → 141 |
  | path west | 184 → 184 |
  | path east | 256 → 259 |
  | baggage | 183 → 185 |
  | at the door | 119 → 123 |
  | from the quay | 262 → 267 |

  - That is +0 to +5 calls, far under the street budget (High ≤ 450, Medium ≤ 300). No new material or texture.
- **Clear:**
  - The museum barrel `c-museum-barrel` is 2.2 m from the house and still open on three sides.
  - Marda's nearest stop is 8.8 m away and Tobb's rest stop 12.2 m away.
  - No door, NPC or story spot is near.
  - The existing cypress on the path's edge (-81.6, 39.5) and the boulder stay as they are.
- **Pictures for the user (chapters 1–2, the play camera):** `wa15b-from-the-quay.jpg` and `wa15b-at-the-door.jpg`
  (now / WA-15b).

### The purpose (for the cloud: story, residents and text; not prototyped on the laptop)

1. **Tobb's route goes through it.**
   - `walkrounds.js` tobb: his rest stop `D('tobb_rest', -72.0, 36.2, { a: 0, act: 'rest', … })` moves to the trading
     house's door. Proposed at (-83.0, 43.3), facing the door (a: 0, +z), between the cargo crates and the jars.
   - His day then runs quay pile → the Esmers' door → Pippa's stall: the stall's Zeelich goods visibly come through
     the trading house.
   - Check townlife's FIX-PUMP-N and the crate piles (`townbusy.js`) after the change.
2. **An Esmer trader at the door.** One ambient resident (the Zeelich cast's look: `zeelichRoster` / props-esmer
   colours), standing by the jars, with 2–3 short lines. Suggested themes, not final text:
   - the goods from Zeelich since the ferry runs every week;
   - Odile's paperwork;
   - Citadel's rain on the dome (the twelve years, trade).
   No shop, no new mechanic.
3. **Two existing voices point to it.**
   - One Odile line ("The Zeelich crates go down to the Esmers' house once I've stamped them").
   - One Tobb line on his rest stop ("The Esmers pay on time. Their crates are still heavy").
4. **Optional:** a small sign over the door. The house was built without one, because Citadel does not set the Esmer
   sign atlas (`setSignWords`). A word like "ESMER TRADERS" would need that atlas on Citadel.

- **Check after the build:**
  - `node engine/cli.mjs artharbour` (the same views; `LBA3_HARBOUR_VIEWS` for more).
  - `tests/townlife.mjs` and `tests/drawcalls.mjs street`.
  - Before/after pictures to the user.

---

## WA-16 (character) · Twinsen's cape as LBA2 ties it to the arms: a wing, not a shirt · Approved: the user asked for it (1.11.2026)

The user, with a photo of 0.48 (Twinsen with his arms out on Citadel): "It's a shirt, not a tunic. Look at how LBA2 did
it and copy it." Picture: `runs/twinsen-cape-lba2.jpg` (study renders, not committed). It shows LBA2's own arms-out
clip, ours now, and ours with the cape tied as LBA2 ties it.

- **How LBA2 does it (body 1, measured on the laptop; points in fractions of the height H, rest pose):**
  - The body has 19 groups. Group 3 is the torso (the cape's front, back and middle, x within ±0.107 H, y 0.43–0.82 H).
  - Groups 4 and 6 are the upper arms. Each holds 12 points: the cape's outer part on that side, x 0.107–0.221 H, from
    the shoulder down to the cape's hem, y 0.538–0.726 H.
  - Groups 5 and 7 hold only the hand ball (3 points, y 0.38–0.43 H).
  - There are no weights: each point belongs to one group. There is no sleeve and no forearm cloth.
  - 15 blue polygons per side join torso points to arm points. When the arm rises, they stretch: the cape opens as a
    wing from the belt to the hand, and the hand is at its tip. ANIM.HQR clip 5 at 400 ms (both hands out at 0.43 H)
    shows it.
- **Ours now (HERO-ARMS, §21 of `docs/character-review.md`):**
  - `cut_sleeves` cuts the sleeve from the cape's front and back below the armpit.
  - `tunicBody` fills the cut, and `sleeveIn*` closes each sleeve into a tube.
  - Raised, that reads as a short boxy shirt ending at the belt, with two tube sleeves: the user's "shirt" (seen in
    jump, fall, cheer and found).
- **Checked on the laptop:**
  - The cape of `assets/poly/twinsen.json` from 9d81ea2^ (0.45, LBA2's weights, no cut) was rendered in the same
    lookdev poses.
  - Arms out, it opens as LBA2's wing (the picture's third row).
  - Re-weighting the current file without removing the cut layers is not enough: `tunicBody` and the sleeve walls
    show through.
- **Ask (`tools/blender/twinsen_poly.py`, then rebuild `assets/poly/twinsen.json`):**
  - The cape as LBA2 ties it:
    - no `cut_sleeves`, no `tunicBody`, no `sleeveIn*`;
    - the cape's outer part (beyond about 48 % of its half-width, from the shoulder down to its hem) on the upper arm;
    - the rest on the torso;
    - the cape between them one closed shell that stretches.
    - This is 0.45's cape, the parent of 9d81ea2, as LBA2's numbers above.
  - Keep everything else HERO-LOOK and HERO-ARMS added: the medallion on its gold cord, the lids, brows, nose and
    mouth, the fists. The hand comes out at the wing's tip.
  - Idle unchanged (the laptop's render of the old cape at rest matches the current idle outline).
- **I-22 (31.10) asked the opposite for the found dance**, where the wing ran from the hip to the hand. Today's
  request is explicit: LBA2's way. If the found dance's wing is too big, soften that one clip, not the cape.
- **Check:**
  - The lookdev poses jump, fall, cheer, found and idle (front, ¾, back) beside LBA2's clip 5.
  - The play camera on Citadel.
  - Pictures to the user.

---

## Verification of WA-1 … WA-15b in the game (1.11.2026, the laptop, dev build e999cd7)

The laptop's `artall`, `artshots` and `artharbour` runs on e999cd7 were set against the approved prototype pictures.
- **The code:** every added line of the laptop's diffs is in the game, except where the cloud changed one on
  purpose:
  - proto-wa1-7: 54/56 lines;
  - WA-8-10: 6/6;
  - WA-11-13: 35/38;
  - WA-13b-14b: 6/10;
  - WA-15b: 30/30.
  - The changed lines: the archive's plaster `#e6d0a4`, as suggested; the output pass's grade grew a tint uniform;
    WA-12's grass filter runs after the scatter; WA-13b's comments are reworded.
- **The pictures** (17 fixed views, approved 31.10 | now; `runs/verify-sheet-0..2.jpg` on the laptop):
  - WA-2 roofs, WA-3 rubble walls and awning, WA-4 carved doors, WA-5 grey stone, WA-6 crowns and WA-8 the house:
    **Verified**, as approved.
  - WA-1 soil and WA-9 grass are in, under WA-13's muted palette (as intended).
- **Measured against the originals** (`examples/WORLD_LOOK_COMPARE.md`, the e999cd7 section): WA-10 to WA-14
  **Verified** in their numbers.
  - WA-15b (the trading house and its purpose) is in the code. Its pictures are in the WA-15b section.
- **One fault: WA-12's bare rock reaches into house yards.**
  - It is kept 40 m off the village square and off the fort, but not off the outlying houses.
  - The neighbour's yard (-25, 75) was one grey rock slab up to his door, and a rock patch lay before Twinsen's house
    (`runs/wa12b-yards.jpg`).
  - WA-12b below fixes it.

## WA-12b · No bare rock in house yards · Approved (the user's standing approval, 1.11.2026)

- **Change** (`src/game/world.js` `wildGround`; `requests/WA-12b.diff` against e999cd7):
  - The rock share fades with the distance from the nearest house's walls (`HOUSE_FLATS`, each house's footprint in
    its own frame): `rock *= smoothstep(7, 11, yardDist)`.
  - Soil may still come close: LBA2's houses stand in brown earth.
  - It is filtered after the scatter like WA-12, so the random draws do not move.
- **Measured** (Citadel from above): grass 26 → 28 %, soil 24 → 25 %, grey 39.5 → 37 %. That is still within WA-12's
  target of grey ≥ 28 % and grass ≤ 35 % (LBA2: 17 / 36 / 41).
- **Pictures:** `runs/wa12b-yards.jpg` (the neighbour's house and Twinsen's, now | WA-12b).
- **Tried and dropped, not requested:** a fine light/shade mottle in the ground's vertex colours, to give it LBA2's
  per-cell painted variation ("busy": Citadel 4.2 against LBA2's 6.5). At ±10 % and ±25 % it changed nothing that can
  be measured from above or seen at the play camera (Citadel busy 4.22 → 4.19 / 4.22). The detail gap needs another
  approach.

---

## GAME-1 (behaviour) · A person busy at something keeps at it when Twinsen walks by · Approved: the user asked for it (1.11.2026)

The user: "Arthur in the house turns to Twinsen while he's sitting. It looks strange. He should keep busy, and turn
only if Twinsen talks to him."

- **The cause:** `src/game/actors.js` `NPC.update`. Every NPC within 3.2 m of Twinsen (`near`) turns his whole body
  to him every frame (`dampAngle(… angleTo(hero) …)`), whatever he is doing. That includes a person at a placement's
  own activity (`forceAnim`). Arthur at a new game kneels at his boat (`kneelWork`, prologue.js).
- **Measured on the laptop** (Test Lab `artbusy`: a new game, Twinsen placed 2 m off each person's side, the
  heading over 2.5 s; dev e999cd7):
  - Now: Arthur turns **90°** to Twinsen and leaves his boat.
  - With the change: **0°**.
  - Picture: `runs/game1-arthur.jpg`.
- **Change** (`requests/GAME-1.diff`, against 8489607):
  - A new `NPC.busy()`: a placement anim other than `idle` or `listen`.
  - The turn becomes `this.talking || (near && !this.busy())`.
  - A person at work (kneeling, wiping, tinkering, potting, pumping, sitting) keeps at it.
  - He turns to Twinsen once Twinsen talks to him: `talking`, as before. A person standing idle still turns to a
    passer-by, as before.
- **Affects:** every NPC placed with an `anim` (Arthur, Gilbert wiping at the well, workers and the like).
  Residents (`Resident`) and guards have their own update and are unchanged.
- **Check:**
  - `node engine/cli.mjs artbusy` (turnedDeg 0 for the busy ones).
  - A conversation with Arthur still turns him to Twinsen.
  - The game's own talk and townlife tests.

---

## LBA-CITADEL-1 · Chez Luc, the tavern of LBA2's Citadel, inside the house with the pink awning · Approved (the user asked for it; pictures sent 1.11.2026)

The user (1.11): "fixes and additions from the first and second games, and logical additions for twelve years later".
Then, on the first layout: "the stairs and the upper floor where they were too. Things change in twelve years, but it
should look about 80 % alike".

### Why this place
- In LBA2 about ten Citadel places can be entered that ours keeps shut. Mapped through `LAYOUT` onto the original's
  door zones (`tools/worldscore/ref/citadel.json`):

  | LBA2 place | Our building on that spot |
  |---|---|
  | Chez Luc tavern (scene 3) | `south`, the house with the pink awning on the square |
  | Mr Bazoo's shop (14) | `museum` |
  | the museum (15) | `water` (now the Water Office) |
  | the ticket office (8) | `baggage` |
  | Paul's house (7) | `wing2` (now Nell's repairs) |
  | the pharmacy (22) and the baggage claim (5) | Bug Street's pair |
  | the neighbour's house (9) | `nbr` |

- The tavern comes first: it is iconic in LBA2, and twelve years on it is where the harbour's people meet.

### What it is (prototyped on the laptop: `requests/LBA-CITADEL-1.diff`, regenerated 1.11 evening against origin 9205125: tavern.js as a new file plus the regions.js and story/index.js hooks; `git apply --check` passes on a clean checkout)
- **The room:** new `src/game/tavern.js`, `buildTavernRoom` (region `tavern` at x 6600). The original's layout, from
  the laptop's study render of scene 3 (numbers and descriptions only):
  - **Size:** a 10 × 15 m hall, 5.6 m high (the original: 21 × 32 cells, about 5.8 m).
  - **Walls and floor:** pale grey stone blocks, grey square tiles with a dark border.
  - **As the game's camera sees it:**
    - The long wall is on the left, with three small high windows.
    - The gallery (2.4 m up) runs along the short back wall, under two windows with red blinds, with three round
      tables and red stools on it.
    - The stair stands against the gallery's face and climbs toward the left wall, to a landing. It has teal iron
      railings and white globe lamps on the newels.
    - A shut arched door in the gallery's face leads to the original's cellar, scene 4.
    - The jukebox stands by the stair's foot, and a red sofa against the stair's side.
    - The bar is at the front left by the door: a pale counter along the wall turning into the room, a tap barrel
      and bottles, red stools, and the bottle shelf with a name board behind it.
    - Square tables with red chairs stand in the front, with teal potted plants and a picture high on the long wall.
  - **Twelve years on (ours):** a ferry timetable board by the stair's foot, glazed Esmer jars among the bottles, and
    one of the project's heat radiators under the long wall's windows.
  - `R.npcSpots.luc` is behind the bar, for the story layer. No people or lines were added: that is the cloud's part.
- **The way in and out:**
  - `tavernDoors(W)`: the `south` house's own door (`W.houses`), radius 0.9.
  - `tavernExit('tavern-out', W)`: 1.2 m before that door, facing away.
  - **Hooks:** `src/game/regions.js` gets one import and one `add('tavern', …)` line plus its REF/AT entries;
    `src/game/story/index.js` gets `doors()` and `exitTo()`.
  - The door opens in every chapter, as an optional place. If a chapter should keep it shut, that is the cloud's call.

### Measured on the laptop (dev, da4a75f + the diff)
- **Test Lab `arttavern`, real input and the game's own physics: PASS.**
  - Walking into the `south` house's door enters the tavern.
  - The route goes past the bar to the stair's foot, up the stair to the landing (y 2.40), and along the gallery
    (y 2.40).
  - Coming back down and through the tavern's door returns to Citadel at (-46.1, 29.2), before the house.
  - Pictures: `evidence/tavern/01…06`.
- **Draw calls in the room:** 30 (29 main, 1 shadow) at Medium. The interior budget is 150.
- **A fault found and fixed on the way:** the jukebox stood in the stair's only way up (its foot end); it now stands
  beside it.
- **Pictures:** `runs/tavern-vs-lba2.jpg` (the original's study render | ours) and `runs/tavern-gallery.jpg`.

### Next of the same kind (one at a time, after the user's word on this one)
Mr Bazoo's shop in `museum`, the ticket office in `baggage`, the pharmacy in Bug Street's south house, the neighbour's
house — each at its original's layout, about 80 % alike.

**Diff fixed (1.11 evening, the cloud's note: "incremental, tavern.js isn't in the repo and the regions.js hunk doesn't
apply").**
- `requests/LBA-CITADEL-1.diff` is now `git diff origin/ccr-adf00ea7-37ebl3`, made on a clean checkout of 9205125.
  - tavern.js is a new file; the hooks are in regions.js (import, REF, AT, `add`) and story/index.js (import,
    `doors()`, `exitTo()`).
- **Checked:** `git apply --check` on a fresh checkout of 9205125 passes, and `node --check` passes on the three
  files.
- **The Test Lab `arttavern` on that checkout:** PASS twice running. One earlier run in four failed, and that run is a
  real finding:
  - Twinsen walked along the stair at floor level (y 0) through its steps and stopped at the landing's face.
  - The steps are `stair: true` colliders, which the physics never blocks sideways (`physics.js`: "the height under
    the feet decides"). So a long frame that misses the 0.3 m step-up leaves him inside them.
  - It did not happen on my copy in three runs.
  - If the cloud sees it in play, a solid low kerb along the stair's open side, or a check of the step-up against
    dt, would hold him.

---

## LBA-CITADEL-2 · Mr Bazoo's shop inside the `museum` building · Approved (the user: "excellent, go on"; night mode, pictures sent)

- **Where:** LBA2 scene 14's door is where our `museum` building stands, by the harbour path (in LBA2 the museum is
  elsewhere, on our Water Office's spot).
- **Code:** `requests/LBA-CITADEL-2.diff`. It goes **on top of LBA-CITADEL-1**: apply 1, then 2. Checked: `git apply
  --check` of 1 then 2 on a fresh checkout of 9205125 passes.
  - New `src/game/bazoo.js` (region `bazoo` at x 6700).
  - Hooks after the tavern's: regions.js and story/index.js.
- **The original's layout** (study render of scene 14: 17 × 12 cells, so 8.4 × 6 m, 3.4 m high; as the camera sees
  it):
  - **Walls and floor:** the long wall at the back, the short one on the left; pale grey stone blocks and grey tiles.
  - **The counter:** a rounded pale-metal U in the middle, with the till and a tree of red baubles at one end and of
    teal at the other.
  - **Display tables on two short legs along the walls:**
    - a terracotta rabbit and a teal figure;
    - a teal vase, a red pot and a glass;
    - a bowl of red fruit and a tall candle;
    - a big green glass bottle, a clay pot and a red box;
    - a teal bottle and a bowl.
  - **The rest:** the great potted plant with red flowers by the back wall, two barrels and a crate at the front.
- **Twelve years on (ours):** a table of Zeelich goods (glazed jars in the Esmers' colours, a little domed lamp), the
  prices on a board by the door.
- **For the story:** `R.npcSpots.bazoo` is behind the counter. The door works in every chapter, as an optional place.
  No people or lines were added.
- **Measured:**
  - Test Lab `artbazoo` (or `artplaces`), on the clean checkout with both diffs: PASS. In by the `museum` door, round
    the counter, past the goods along the back wall to the Zeelich table, and out by the shop's door to Citadel at
    (-64.3, 41.1).
  - Draw calls: 24 (23 main, 1 shadow) at Medium.
- **Pictures:** `runs/bazoo-vs-lba2.jpg` (the original's study render | ours).

**LBA-CITADEL-1 and -2 diffs rebuilt (1.11, later): a door-prompt fix inside 1.**
- **The fault:** the doors of these places live in the director's `doors()` (`story/index.js`), not a chapter's. But
  `story/prologue.js` `baseInteractables` offers every house whose door is not in the chapter's `cur.doors()` as
  locked.
  - At the `museum` door, the game offered `{ kind: 'locked', label: 'p_door' }`, although walking in worked
    (measured: Test Lab `artbazoo`, the offer 1.3 m before the door).
- **The fix (in `LBA-CITADEL-1.diff`):** `const open = new Set([...cur.doors(), ...(this.story.doors?.() || [])].map((d)
  => d.house));`. With it there is no prompt at either door.
- **Checked on a fresh checkout of origin:** `git apply --check` of 1, then 2, passes. `artplaces` passes both
  places, including the new check "no locked prompt at the open door".

---

## LBA-CITADEL-3 · The ticket office inside the `baggage` building · Approved (night mode: "work to the plan"; pictures sent)

- **Where:** LBA2 scene 8's door is where our `baggage` building stands at the harbour.
- **Code:** `requests/LBA-CITADEL-3.diff`, **on top of 1 and 2** (checked: 1, 2, then `--check` of 3 on a fresh
  checkout of 0f197c3).
  - New `src/game/ticket.js` (region `ticket` at x 6800).
  - Hooks after the shop's.
- **The original's layout** (study render: 13 × 13 cells, so 6.4 × 6.4 m, 3.6 m; as the camera sees it):
  - **Walls and floor:** pale grey blocks, a black and white checkered floor.
  - **The counter:** a long pale counter across the room at half its depth. It has a brown cabinet at its left end,
    and the till and a pile of tickets on it.
  - **The staff's side behind it:** red stools and a chair, the great potted plant on a low stand, and a red bench
    with stacked red luggage.
  - **The public's side in front:** red chairs along the left wall and the front, two white globe lamps on short
    posts.
  - **The left wall:** a Temple of Bù poster (drawn, no words) under a round wall clock, and the arched door.
  - **The back wall:** two windows with red blinds and a ship poster between them.
- **Twelve years on (ours):**
  - The office sells the project's ferry to Zeelich now (the poster's ship is the ferry), with a timetable board by
    the door.
  - The Temple poster has faded.
- **For the story:** `R.npcSpots.clerk` is behind the counter. No people or lines were added.
- **Measured:**
  - `artticket`: PASS. In by the `baggage` door (no locked prompt), along the waiting chairs, round the counter's
    right end to the staff's side, and out.
  - Draw calls: 24 (23 + 1) at Medium.
  - **The test caught one fault before the push:** the room's build threw (`TEX.clock` is `CANV.clock`). When a
    region's build fails, its door does nothing and `game.doorCool` keeps climbing; fixed.
- **Picture:** `runs/ticket-vs-lba2.jpg`.

---

## LBA-CITADEL-4 · The pharmacy inside Bug Street's `bug2` house · Approved (night mode; pictures sent)

- **Where:** LBA2 scene 22's door. Our `bug2` was placed for it (town.js: "Bug Street's south house, the original's
  scene 22").
- **Code:** `requests/LBA-CITADEL-4.diff`, **on top of 1–3** (checked on a fresh checkout).
  - New `src/game/pharmacy.js` (region `pharmacy` at x 6900).
  - Hooks after the ticket office's.
- **The original's layout** (study render: 15 × 14 cells, so 7.2 × 6.6 m, 3.6 m):
  - **Walls and floor:** pale grey blocks; grey tiles with black ones scattered in them.
  - **The shelves:** both walls lined with shelves of teal apothecary jars with pale lids, a black library ladder
    between them on each wall, and a great plant against the back wall.
  - **The counter:** a long oval pale counter in the middle, with the till, a green flask and glasses, and a tree of
    blue baubles at one end and of red at the other.
  - **The rest:** white globe lamps on posts at the left front and the right, two red chairs at the front, a second
    plant, two teal jars standing on the floor.
- **Twelve years on (ours):** one shelf holds Zeelich remedies (the Mosquibees' amber honey jars), and a notice board
  for prescriptions hangs by the door.
- **For the story:** `R.npcSpots.pharmacist` is behind the counter. It ties in with the LBA2 opening's errand to the
  pharmacy (docs/lba3-team/ADVENTURE_DESIGN.md #12), if the story wants it.
- **Measured:**
  - `artpharmacy`: PASS. In by the `bug2` door (no locked prompt), across the front, round the counter's far end to
    the back shelves, and out.
  - Draw calls: 24 (23 + 1) at Medium.
- **Picture:** `runs/pharmacy-vs-lba2.jpg`.

---

## LBA-CITADEL-5 · The neighbours' house, inside the `nbr` house · Approved (night mode; pictures sent)

- **Where:** LBA2 scene 9's door is our `nbr` house, next to Twinsen's.
- **Code:** `requests/LBA-CITADEL-5.diff`, **on top of 1–4**.
  - New `src/game/nbrhouse.js` (region `nbrhouse` at x 7600).
  - Hooks after the pharmacy's. Its `doors()` hook passes `this.game.flags`.
- **The door leads in only once `flags.prologueDone`.** In the prologue Zoé stands at it (prologue.js keeps the house
  in its open set for her; text/well.js "their kettle").
- **The original's layout** (study render: 15 × 17 cells, so 7.2 × 8.2 m, 3.0 m), in the style of Twinsen's house:
  - **Walls and floor:** teal patterned paper over a wooden dado, terracotta tiles, dark wooden caps. These are
    Twinsen's house's own materials (WA-8).
  - **The left wall:** a window with cream curtains, a bookcase of old volumes over a sideboard, a lamp in the corner.
  - **The back wall:** the double bed under a portrait, a wall lamp, a writing desk with its lamp and chair, a framed
    picture, a basket of rolled papers.
  - **The middle:** a square table with a candle and two chairs on a rug, and a teal armchair on each side.
- **Twelve years on (ours), tied to chapter 1's water trouble:** a kitchen corner with the stove and the kettle Zoé
  asks about, a basin with its tap, and one of the project's heat radiators.
- **For the story:** `R.npcSpots.neighbour` is by the stove. No people or lines were added.
- **Measured:**
  - `artnbrhouse` (with `prologueDone` set and anyone at the door stood aside): PASS. In, past the table to the bed
    and the desk, to the kitchen corner, and out.
  - Draw calls: 19 (18 + 1) at Medium.
- **Picture:** `runs/nbrhouse-vs-lba2.jpg`.

**Two faults found in my own rooms on the way, fixed in every diff:**
- **The neighbours' house broke the renderer:** `props.frame(k, w, h, picture)` takes the picture's texture fourth, and
  I had passed a number, so its material had a "map" that was not a texture.
  - The shader would not compile (`'uvundefined'`), and three.js threw at `refreshMaterialUniforms`.
- **Shared geometry turned:** `cyl(…).rotateX/Z` rotated `props.cyl`'s cached, shared geometry, which every other user
  of the same cylinder would see turned. Now the part is turned instead (`{ rx }`, `{ rz }`).
  - Found in the tavern (the arched door and its knob), the ticket office (the clock) and the neighbours' house (a
    lamp bracket).

**The whole chain rebuilt and checked (1.11, late evening).**
- `requests/LBA-CITADEL-1.diff` … `-5.diff` were remade one on top of the other from origin 799cccc. Each applies with
  `git apply --check` in order on a fresh checkout.
- On that checkout, the Test Lab `artplaces` passes all five in one run:
  - each in by its house's door, with no locked prompt, and out;
  - draw calls 30 / 24 / 24 / 24 / 19 at Medium;
  - no console errors besides the server's missing favicon.
- **The game's own tests on the same checkout** (local Chrome/headless shell; the tests' Playwright path pointed at
  the laptop's for the run only, nothing of that in the diffs):
  - `prologue.mjs` 26/26, `chapter1.mjs` 23/23, `opening.mjs` 27/27 (rerun alone; the first run, beside a picture shoot, met refused connections from the local server), `transitions.mjs` 6/6 and `house.mjs` 2/2 pass.
  - Their only resource "fail" is the local server's missing favicon.ico.

---

## LBA-CITADEL-6 · Paul's house (LBA2 scene 7), now Nell's home and workshop, inside the `wing2` house · Approved (night mode; pictures sent)

- **Where:** LBA2 scene 7's door is our `wing2` house by the harbour, with NELL'S REPAIRS on it.
- **Twelve years on:** Paul's old house is Nell's. Her stall on the path outside is her counter (townlife.js); the
  engines she cannot mend there come in here.
- **Code:** `requests/LBA-CITADEL-6.diff`, **on top of 1–5** (the chain was rebuilt from origin dd19fb3; 1…6 apply in
  order on a fresh checkout).
  - New `src/game/nellhouse.js` (region `nellhouse` at x 7800).
- **The original's layout** (study render: 15 × 17 cells, so 7.2 × 8.2 m, 3.0 m), in Twinsen's house's materials:
  - **The left wall:** the bed at the front, a wall lamp, a sideboard with a bowl under a big painting, and a window
    with cream curtains at the back.
  - **The back wall:** a floor lamp, a teal armchair, a long sideboard with a model sailboat between two candles, and
    a wall lamp.
  - **The middle:** a table with a bowl of flowers and two chairs.
- **Ours on top:** Nell's workbench at the front with an Esmer engine open on it (brass drum, flywheel, pipe) and her
  tools, and a crate of spare parts.
- **For the story:** `R.npcSpots.nell` is at the bench. No people or lines were added.
- **Measured:**
  - `artnellhouse`: PASS. In by the `wing2` door (no locked prompt), past the bed to the armchair and the sailboat,
    round the table to the workbench, and out.
  - Draw calls: 16 (15 + 1) at Medium. No console errors.
- **Picture:** `runs/nellhouse-vs-lba2.jpg`.

**LBA-CITADEL-7's diff corrected (1.11, night).**
- The push 1a9e10f carried the cellar's text with an older `LBA-CITADEL-7.diff`. A chain rebuild had stopped at its
  step 7, and a pipe hid the stop.
- The cloud had meanwhile applied 1–6 (4636bd1). So `requests/LBA-CITADEL-7.diff` is now made directly against origin
  1a9e10f: the raised store (`SH = 1.0`), the 2 m walkway, and the tavern's arched-door exit. `git apply --check`
  passes on a fresh checkout.
- **On origin + 7, the Test Lab `artplaces` passes all seven places in one run:** the tavern, Mr Bazoo's, the ticket
  office, the pharmacy, the neighbours', Nell's, and the cellar route square → tavern → cellar → store → back. There
  are no console errors besides the server's favicon.

## LBA-CITADEL-8 — the baggage claim (LBA2 scene 5) in the 'bug' house; the stairs' 2 cm seam closed · SET ASIDE: about 75 %, below the 80 % target (the user, 2.11.2026: "everything below 80 % goes aside"; no more work on it now; the stair-seam fix stays)

- **Where:** LBA2 scene 5's door is our `bug` house in Bug Street (WORLD-80 step 2 placed the house for that door). It
  had no inside until now.
- **Code:** `requests/LBA-CITADEL-8.diff`, **on top of 7**. On a fresh checkout of origin d9178f8,
  `git apply LBA-CITADEL-7.diff` and then `git apply LBA-CITADEL-8.diff` both pass.
  - New `src/game/baggage.js` (region `baggage` at x 8200). The hooks go in regions.js and story/index.js.
- **The original's layout** (study render: about 16 × 44 cells, so 7.8 × 21 m, on two levels), in the tavern's pale
  grey stone:
  - **Back:** the claim hall 1.5 m up, with the luggage belt on the back wall, red benches, cardboard boxes, dark teal
    crates, and a small window.
  - **Middle:** a wall with two stone arches, and the office behind it (a table with papers, a red stool, crates).
  - **The upper level's edge:** a teal balustrade with white globe lamps, and a stair down at the left.
  - **Front:** the lower hall with barrels, a small railed platform with a lamp, black arrows on the floor, and the
    door at the front of the left wall.
- **Twelve years on (ours):**
  - The belt carries Zeelich parcels (teal crates with brass bands) among the cases.
  - A notice board by the stair for unclaimed parcels.
- **About 75 % alike:**
  - Every element is in its place.
  - The original's outline is stepped: the hall is offset, and the front block is narrower and stands higher. Ours is
    one rectangle.
- **For the story:** `R.npcSpots.clerk` is at the office table. No people or lines were added.
- **The stair fix (also in this diff):**
  - Cause: the step colliders were `run / 2 + 0.04` deep. `groundAt` shrinks each one by 5 cm, which left a 2 cm seam
    of floor between steps. Twinsen dropped into it and from there walked under the stair: measured here, at y 0
    under the 1.5 m step.
  - This is the likely cause of the tavern's walk-through, which happened in about 1 run in 4.
  - Fix: now `run / 2 + 0.08` in baggage.js, tavern.js and tavcellar.js, so the steps overlap. The engine's own stairs
    already overlap: interiors.js uses `+ 0.06`, and zislands' stairs overlap too.
- **Measured:**
  - `artbaggage`: PASS. In by the `bug` door, up the stair to the office (y 1.5), through an arch to the belt (y 1.5),
    and back out.
  - `arttavern` and `arttavcellar` also pass after the fix.
  - Draw calls: 21 (20 + 1) at Medium. No console errors.
- **Picture:** `runs/baggage-vs-lba2.jpg` (local).

## LBA-CITADEL-9 — Tralu's cave (LBA2 scene 2) behind the plateau's door; colliders of props on raised floors · SET ASIDE: about 65 %, below the 80 % target (the user, 2.11.2026; no more work on it now; the raised-floor collider fix stays)

- **Where:** WORLD-80 built the plateau's door in the bank behind the depot (island.js `OLD_DOORS.plateau`) and kept it
  shut. It now opens on the cave.
  - story/index.js gets the door `{ house: 'plateau' }`.
  - story/prologue.js no longer offers a shut door that the director has opened. It is one line, which skips
    `W.shutDoors` ids in the open set.
- **Code:** `requests/LBA-CITADEL-9.diff`, **on top of 8**. On a fresh checkout of origin d9178f8, 7, 8 and 9 apply in
  order.
  - New `src/game/tralucave.js` (region `tralucave` at x 8400).
- **The original's layout** (study render), condensed into one 18 × 14 m room. The original is a sprawling cave about
  three times that size, and that is the main difference: **about 65 % alike**. Kept:
  - **Back left:** the raised rock terrace with the barred gate in the rock, clutches of blue eggs, and globe posts at
    its edge.
  - **The stair** down from the terrace, with rusted railings.
  - **The lower cave floor:** rough rock with worn paved patches, and clusters of pale stalagmites with dark tips.
  - **Front right:** the railed pool of pale cyan water, with cyan globe posts at its corners.
  - **Back right:** the old guard house of squared blocks with barred windows. Inside are barrels, a table with
    plates and a bottle, a bench, and iron candle stands.
  - **Not here:** the arcade of arches with the water channel at the original's right end, and its second cave hall.
- **Twelve years on (ours):**
  - The eggs are empty shells, broken open long ago.
  - The gate's bars are rusted.
  - The guard house is a store again (a crate with a coil of rope and a lantern).
  - No creature and no lines were added: the story can give the cave a purpose later.
- **Engine fix (interiors.js `RoomBuilder.put`):** a piece put with `{ y }` on a raised floor now gets its collider's
  top raised with it (`fp.top + opts.y`).
  - Before, a bench on the baggage claim's upper level had its top at 0.9, below Twinsen's feet at 1.5, so he walked
    through it. The same happened to the cellar's crates and drums on the store.
  - Only the LBA-CITADEL rooms pass `{ y }` with a collider. upper.js's sconces use `noCol`.
- **Measured:**
  - `arttralucave`: PASS. In by the plateau's door (no locked or shut prompt), round the pool, into the guard house,
    up the stair to the terrace by the gate (y 1.6), and back out onto the door's landing.
  - Draw calls: 20 (19 + 1) at Medium. No console errors.
- **Picture:** `runs/tralucave-vs-lba2.jpg` (local).

## TRAVEL-1 · Every journey between planets is by spaceship, seen from outside and inside; every vehicle works · The user asked for it (2.11.2026)

The user (2.11.2026, in Hebrew, paraphrased): "Every passage from planet to planet is only by spaceship. It needs an
animation of the ship flying, seen from outside, and the ship from inside with the people who are there. Every kind of
vehicle in the game must work."

- **This answers MORNING_CHECK question 3** (the expansion's passage between two planets that is not by ship): close it.
  Between planets, the spaceship only.
- **Today (checked in `src/game/travel.js` at f08774c):** every journey (`ship`, `shuttle`, `ferry`, `glider`) is
  `startTransition` → a fade to black → the landing spot. No flight is seen and there is no inside.
- **Asked of the cloud (travel and cinematics are its code):**
  1. Ship journeys between planets: a short take-off and flight seen from outside (the ship rising from the pad, the
     planet falling away, the arrival and landing), skippable, played under the existing transition.
  2. The inside of the ship: a cabin with seats and windows and a few passengers (travellers, a crew member), where
     Twinsen is during the flight (a short scene, or a walkable cabin room on longer flights).
  3. The other vehicles: each journey shows its vehicle (the ferry leaving the quay, the glider taking off, the
     shuttle), at least as a short outside shot.
  4. A test that rides every route in `buildTravel`/`travelRegion` both ways and checks that the hero lands on the
     landing spot, on the ground, with the vehicle's shot played (the user: "every kind of vehicle must work").
- **The laptop's part (World Art, after the LBA1 places on Citadel):** the ship's outside model if a better one is
  needed, the cabin room (seats, windows, luggage racks) and the passengers' spots, as a request with a diff and
  pictures, like LBA-CITADEL-*. Spoilers: pictures only of the Citadel spaceport side.
- **Cloud: built (branch `travel-1`).** The journey films are in `src/game/travelfilm.js`, played around the existing
  scene change (`Game.startTransition(mid, need, then)`: the area swap under the black, the region's loading card,
  the landing spot and the save are as before; `then` starts the arrival film on the new area's first frame). Hold
  the skip key (E / the pad's action) to skip; a skip ends the whole journey's film. `?nocine` turns the films off.
  - Ship (Citadel Spaceport ⇄ Zeelich Spaceport): the ship lifts off the pad and climbs away (2.8 s), the cabin (4 s),
    the planet falling away and the other one ahead (2.4 s, a backdrop of stars and two painted planets), then the
    ship coming down onto the other pad (3 s) and Twinsen stepping off (0.9 s), and the camera back to play (0.9 s).
  - Ferry, glider, Esmer shuttle: the craft leaving (2.6 s), then arriving (2.6 / 2.6 / 2.4 s) and he steps off. The
    craft flown is a twin of the one parked at the stop (the parked one hidden meanwhile); a glider takes the clearest
    of 16 headings off its field; the camera is the first of a few places with nothing standing in its frame.
  - **The cabin hook:** `buildShipCabin({ view: { planet } })` in `src/game/shipcabin.js` returns a handle; the film
    reads only the handle, so a new room replaces the body of that file and keeps the handle:
    `{ group, size: {w, l, h}, seats: [{x, y, z, a}], windows: [{x, y, z, a, r}], stand: [{x, z, a, window}],
    passengers: [{ role, look, seat | stand, anim, lookAt }], hero: {x, z, a, lookAt}, shots: [{pos, look, fov}] ×2,
    update(dt), dispose() }`. Local coordinates: origin on the cabin floor at its centre, the nose toward +z; `a` is an
    actor's angle (0 faces +z). Passengers are existing bodies (`characters.js` LOOKS: today a Twinsun traveller
    dozing, a woman at a window, a Mosquibee steward by the flight-deck door); Twinsen stands at the front-left window.
    The cabin is lit by its own materials (no new light: a light would recompile every material) and casts no shadow.
  - **Left for the laptop:** the proper cabin room (the placeholder is a cream vaulted tube with red seats, brass
    racks with cases, eight round windows showing a drifting starfield), maybe a better ship model (today the Esmer
    saucer of `shuttle.js` at scale 1.4 at Zeelich, 1 at Citadel), the passengers' spots. The ship at Citadel's pad is
    `W.spaceport.ship`, at Zeelich's pad `game.travel.vehicles.zeelich_port`.
  - Test: `tests/travel.mjs` (section TRAVEL-1) rides every route both ways with the films on.

## PURPOSE-CHECK (2.11) · The cloud's answers: which places have a purpose

Asked by the laptop for the user, before building. Key: **(a)** used by the story now, **(b)** planned, **(c)** no
purpose, so don't build. The user's rules stay: no more LBA1 Citadel places; under 80 % likeness goes aside.

1. **The School of Magic: (a), the great hall only.**
   - Used now:
     - the rector (`magus`): the magic-level lines (`story/magic.js`) and the pearl errand (`story/arsenal.js`);
     - Ker'aooc: the protection ward for 20 kashes, and healing (`arsenal.js`, `prologue.js`);
     - the `sm_remedies` giver.
   - No other School scene is in the story or in EXPANSION_PLAN.md.
   - **Scene 27, the two-level great hall: yes**, as a likeness upgrade of a room the player does visit. Push it if it
     reaches 80 % and keeps:
     - `npcSpots.magus` and `npcSpots.keraooc`, both reachable on foot from the door;
     - the giver;
     - the exit;
     - `tests/wizards.mjs` and `arsenal.mjs` passing.
   - **Scene 28 (entrance hall) and scene 33 (test hall): (c)**, no purpose; don't build.
2. **The Temple of Bù: (a)**, chapter 4's climax room (`rooms.butemple`, `story/dig.js`). **A multi-level rebuild is
   welcome only as a likeness upgrade (b-priority, after the School)**, under these conditions:
   - Handles that must stay, by name: `carving` (x, z), `npcSpots.ilka`, `npcSpots.dallan`, `mites` (an array of
     spots), the spawn and the `bu-out` exit, and any `searches`/`ballTargets` that `temple.js` exports today.
   - Positions may move, but:
     - the carving is reachable on foot from the entrance without a jump puzzle (it is the chapter's reading scene);
     - Ilka's and Dallan's spots stand within 3 m of the carving, clear of the way to it (solid NPCs: see B-1 in
       GATE_REPORT.md);
     - the mites' spots share one floor with room to fight, with no railing between them and the hero;
     - every ball target has a standing spot with a clear line to it.
   - Railed walkways, mine rails, statues and the fountain: fine as scenery.
   - `tests/chapter4.mjs` must pass; write the new spot positions in your Built note.
3. **The Hamalayi's LBA1 FunFrock interiors (scenes 64, 66, 70): (c).** Chapters 6–7 and the plan's deepening cards
   (DP-6a/b, DP-7a/b/c, OP-3) use the outdoors, the monastery, the dome and the shrine, and none of these rooms. Skip.
4. **Desert Island's LBA2 interiors (the Hacienda 24/25/29/30/32, the shop 36, the beach bar 39, the ticket office 40,
   Leone's house 35, Baldino's house 38): (c).** None is in the story or planned (the plan's Desert Island work is Kesh,
   Ilka's post, the dig and DP-4/DP-5, OP-6). Don't build. If the user later wants Desert Island livelier, the beach bar
   or the shop would be the first candidates; ask then.

**What does have a purpose next:**
- **TRAVEL-1's cabin room and ship model** (the cloud's flight scenes are being built now; the placeholder cabin and its
  hook land in this file under TRAVEL-1, "Cloud: built");
- **W-1, the Float Harbor slice** on `expansion/ballastra` (the branch is approved and has the foundation and 0.49.0);
- **Zeelich likeness:** a research report, `docs/future/ZEELICH_GAP.md`, is on its way. The user will pick from it what
  to build; wait for that pick.

## ZEELICH-1 · Zeelich closer to LBA2, only what has a purpose · Ordered by the cloud (the user's alignment, 2.11.2026)

Read `docs/future/ALIGNMENT.md` (the principles and your queue: this is item 4) and `docs/future/ZEELICH_GAP.md` (the
research, with scene numbers). Each item: ≥ 80 % likeness, twelve years on, its own file under `src/game/`, handles for
the story, a diff and pictures like LBA-CITADEL-*. **Spoilers:** Zeelich is past chapter 2, so send the user no
pictures unless they ask; put them in `docs/future/world/ZEELICH-1/`.

1. **The harbour bar at Otringal** (LBA2 scene 136, the boss's office 137): the stage, the bar and the bouncers' door.
   It is the hub of OP-7. Handles: `bar.npcSpots` (boss, performer, two bouncers, three regulars), `bar.stage`,
   `bar.office` (door spot), the door into it from Otringal's harbour; OP-7 also needs `bar.counter` (a search spot
   behind it) and `bar.winch` (the stage curtain's stuck winch, high on the stage frame: a ball target).
2. **The Temple of Dark Monk on Celebration** (scene 93): the prophecy murals, a reader's lectern, the door sealed by
   four fragments (open twelve years on). Handles: `temple.murals` (4 spots with look targets), `temple.lectern`,
   `temple.sealDoor` (`setOpen(b, instant)`).
3. **The Imperial Hotel lobby at Otringal** (scene 81): the members' desk, armchairs, two coin machines (life, magic).
   Handles: `hotel.desk`, `hotel.machines` (2 spots), `hotel.npcSpots` (clerk, explorer, manicurist), `hotel.register`
   (on the desk: a read spot, for OP-7).
4. **Celebration's volcano:** the crater, the lava glow, the trail up and the temple's door on its flank, from the
   island's layout JSON. Handles: `celebration.templeDoor`, `celebration.crater` (look spot), `celebration.trail` (3
   waypoints).
5. **The Wannies' island under the gas** (the `platform` region, re-dressed): the mine mouth, the company office front,
   the village of low houses, a chapel front, a darker, thinner gas sky. It is reached by the lift from ASCENCE (the
   `liftdock` region): the lift's cage must ride down to it. Handles: `wannie.liftBottom` (spawn), `wannie.npcSpots`
   (6), `wannie.mine`, `wannie.chapelDoor`; `liftdock.lift.setLevel(t)` and `liftdock.liftTop`; for OP-7 also `liftdock.lever` (the cage's
   lever, where a plate can hang) and `wannie.crates` (the ore crates by the lift's foot).
6. **A sky and grade per island** (`R.grade`, `R.gradeTint`, the sky's colours): Otringal overcast pale grey; Celebration
   warm with a lava glow; the Wannies' island dim under the gas; the others as the research describes.

The cloud does the island life, names, travel characters, music and OP-7 meanwhile (OP-7 "The Lift Below" is written
in `docs/future/EXPANSION_PLAN.md` §4.5: it is why these rooms exist). Write **Built** notes here per item,
as before.

---

## SPACEPORT-1 · The terminals you can walk into · Ordered by the cloud (the user, 2.11.2026)

The user: "the SPACEPORT is empty, no people, you can't go in anywhere." The cloud is putting people outdoors at both
spaceports (INTERIOR-LIFE). This order is the rooms. **Purpose (PURPOSE-CHECK a, used now):** every planet crossing
starts here (TRAVEL-1); Doran's flight at the end of chapter 1 leaves from Citadel's. It moves ahead of ZEELICH-1 in your
queue: after the School's great hall and TRAVEL-1's cabin.

1. **Citadel Spaceport's terminal** (`spaceport.js`: the small terminal, Twinsun stone below, an Esmer dome above).
   LBA2 had no port on Citadel. Take LBA2's Otringal astroport departure hall (scene 78) as the 80 % model, smaller and
   in Twinsun stone: a ticket counter, a departures board inside, rows of waiting seats, a luggage weighing scale, a
   gate to the pad, a small café corner, the Joint Project's GROUNDED notice (chapters 1–3).
   Handles: `terminal.door` (from the deck), `terminal.gate` (to the pad: leaves to the ship's interactable),
   `terminal.counter` (the clerk's spot + the travel menu's interactable), `terminal.board` (read spot),
   `terminal.seats` (8+ sitting spots {x,z,a}), `terminal.npcSpots` (clerk, guard, café keeper), `terminal.notice`
   (`setVisible(b)`).
2. **Zeelich Spaceport's terminal** (the hub's spaceport deck): LBA2's departure hall (78) and arrival hall (82), here
   as one Esmer hall with both sides. Same handles under `zterminal.*`, plus `zterminal.arrivals` (where he steps in
   from the pad).

Each: its own file under `src/game/`, a region in `regions.js` like the LBA-CITADEL rooms, doors that use the
existing door transitions, ≥ 80 % likeness to scene 78/82's layout and furniture (numbers and descriptions only), a
diff and pictures in `docs/future/world/SPACEPORT-1/` (Zeelich's: no pictures to the user — past chapter 2). The cloud
wires the travel menu, the people and the lines after you push.

## BIGGER-1 · Every LBA2 room 1.5 times bigger, the camera close and following · The user asked for it (2.11.2026)

The user (2.11, in Hebrew): "make them bigger, it's really small" (answered "everything": the School and the nine
Citadel rooms). Twinsen is 2.065 m in our scale (H, `actors.js`) and the original's cell 0.867 m; the first cuts used
about 0.42–0.48 m a cell, half the original's proportion.

- **What changed** (`requests/BIGGER-1.diff` against origin 8c6c213; `git apply --check` passes on a clean checkout):
  `tavern.js`, `tavcellar.js`, `bazoo.js`, `ticket.js`, `pharmacy.js`, `nbrhouse.js`, `nellhouse.js`, `baggage.js`
  (1.5 × wide, 1.25 × long: it was long already), `tralucave.js`.
  - Floor 1.5 times the first cut, rooms a little higher (the tavern's gallery 3.0 m, its hall 7 m).
  - Furniture keeps its size; longer walls get a few more shelves, tables and stools.
  - The camera: `R.view` 10–12.5 and `R.follow` 0.55–0.7, as in Twinsen's house (10.8 / 0.8), not the whole room at
    once.
  - Every room's door, exit, entries, `npcSpots` (luc, bazoo, clerk, pharmacist, neighbour, nell, clerk) and the
    cellar's link to the tavern move with it.
- **The stair seam, closed for good:** every step collider overlaps its neighbours and the floor at its top by 12 cm
  (`run / 2 + 0.12`). With +0.08 the top step left a 2 cm seam against the landing (each brick shrinks 5 cm under
  `groundAt`): Twinsen dropped onto the room's floor and walked under the stair. Measured in the School: 10 of 15 climbs
  fell through at +0.08; 0 of 72 now (6 stairs × 4 frame rates × 3 lanes, all rooms). A first fix in `physics.js`
  (looking 6 cm further for a floor over a drop) broke `tests/deaths.mjs` (a guard falling down a stair counted
  "in the ground"): withdrawn; the engine is unchanged. This is very likely the tavern's 1-in-4 walk-through.
- **Checked on the laptop** (results below under "Verification 2.11").

## LBA-DESERT-1 · The School of Magic's great hall after LBA2's scene 27 · PURPOSE-CHECK: yes (the cloud, 2.11)

`requests/LBA-DESERT-1.diff` (`wizards.js` `buildSchoolRoom` only; applies on origin). About 80 % alike, 1.5 × the
first cut (0.63 m a cell, 0.4 m a layer):
- the classroom 3.2 m up in the back-left corner (the teacher's dais 4.0 m with a red-clothed table, two benches, a
  star on the floor; the blackboard; two rows of three benches), an arch between two columns and two round star
  windows in the left wall;
- a stair down to a walkway 2.0 m up along a ridge of rock, an iron fence on its open side, a stair down into the hall
  between two gargoyle posts, globe lamps at its front end;
- the dining hall: eight long tables with bowls, bottles and candles; a dais 1.2 m up at the back with the star chest
  and candle stands, a stepped pyramid up to it; seven tall teal windows along the back wall; the door in front.
- Kept: `npcSpots.magus` (on the teacher's dais), `npcSpots.keraooc` (by her cot and cabinet near the door),
  `sm_remedies`, the `school-out` exit; `tests/wizards.mjs` passes. Spoilers: no pictures to the user (Desert Island).
- Test Lab: `node engine/cli.mjs artschool` (door → walkway → classroom → dais → out).

## ANIM-AGGR-1 · Aggressive mode moves as in LBA2 · The user asked for it (2.11.2026)

The user: "Twinsen's movement in aggressive mode is not like LBA2". Measured on LBA2's own anims (ANIM.HQR, numbers
only): the Aggressive walk (83) is a boxer's strut (fists up before the chest, elbows bent 50–72°, the knee up to 90°,
the chest twisting up to ±45°, the head turning); the Aggressive idle (82) is a guard that shifts and looks round
(the head ±50°). Ours played the normal walk at 2.52 m/s and the normal idle unless engaged.
`requests/ANIM-AGGR-1.diff` (`rig.js`, `actors.js`; applies on origin): in Aggressive, `rig.aggro`; the idle is always
the fists' guard (the sword's with the sword) and looks round; the walk keeps the fists up and pumping, the knees
higher, the chest leaning and twisting more (milder than the original). No speed, timing, hit or input changed.
`tests/anim-combat.mjs`, `anim-polish.mjs`, `combat.mjs` pass.

## VOICE-1 · The gibberish softer, men and women told apart · The user asked for it (2.11.2026)

The user: "the gibberish is too annoying, too robotic, it feels like a clipped voice; tell men and women apart more and
make it less tiring". `requests/VOICE-1.diff` (`voice.js`; applies on origin):
- a person's syllables join at least 55 % (`leg`; the triangle-heads and machines stay clipped by design); slightly
  softer attack and release; ±8 % loudness from syllable to syllable; the level 0.21 → 0.19;
- VOICE-SEX: grown women in the ambiguous middle move up to ≥ ~215 Hz with a smaller head's formants and a little more
  breath; grown men above 160 Hz move down; children, Twinsen, Zoé, Spheros, bees and moles are untouched. A speaker
  with no voice of their own now gets a clearly male or female voice (from the WOMEN/MEN lists, else the name's hash),
  never the ambiguous middle. Mira 205 → 214 Hz (she sat on Twinsen's 195).
- The lists are the laptop's reading of names and titles (Mother, Madam, Mrs, Granny, Officer Odile, Pippa "הסוחרת"…):
  **please check them**, and say whether Sefa the trader, Esren, Ennu, Velo, Kip and the Pharmacist are women or men.
- `tests/voices.mjs`: everything passes but "every named speaker has an own voice": it fails on origin too (27 speakers
  without one: luc, mrbazoo, pharmacist, sefa …). Giving each their own voice entry is the cloud's.

## USER-ASKS (2.11.2026) · What the user asked today that is the cloud's

1. **Shops you can buy in.** "The shops: you must be able to buy in them." Pippa's stall sells; Mr Bazoo's shop, the
   pharmacy and the ticket office (LBA-CITADEL-2/3/4) are rooms with a keeper's spot and nothing to buy. LBA2: Bazoo
   sells goods, the pharmacy sells potions (life), the ticket office sells the ferry ticket.
2. **The Esmer trading house (WA-15b) does nothing.** "Does the Zeelich building give anything?" Its purpose section
   (WA-15b, "The purpose") was for the cloud: a keeper, goods to buy or trade, a reason to go in.
3. **A round stone tower with a door in the air.** The user's photo: an arched door raised above the ground on a round
   tower's stone plinth, "in the air, and it's not clear what it gives in the game". Probably the lighthouse (its lamp
   room is Zoé's in chapter 2): check the door's sill against the ground, and give Twinsen a reason to go in (or say
   so at the door).
4. **New accessories and special weapons, the jetpack, exploding penguins, the important items of LBA1 and LBA2.** The
   arsenal has most (blowgun/Blowtron, laser, glove, lightning, protection, conch, lantern, Nitro-Meca-Penguins at
   Pippa's, Baldino's hop-pack from chapter 10), but in chapters 1–2 the user sees almost none. Consider something
   earlier, and new twelve-years-on gadgets.
5. **Pre-existing test failures seen on origin** (not from these diffs): `tests/prologue.mjs` "the well's mites beaten
   with the ball"; `tests/solidnpc.mjs` setup "no free approach to tobb|marda|brix|dot"; `tests/chapter4.mjs` and
   `tests/controls.mjs` print no verdict.

### Verification 2.11 (the laptop, origin 8c6c213 + BIGGER-1 + LBA-DESERT-1 + ANIM-AGGR-1 + VOICE-1)
- Game tests: wizards, house, deaths, anim-combat, anim-polish, combat, chapter1, prologue PASS. voices: only "every
  named speaker has an own voice" (fails on origin too). npc-feet: "stops into standing take at most two steps" for Oda
  (fails identically on a clean origin).
- Test Lab walks (`artplaces`, `artschool`): tavern, bazoo, ticket, pharmacy, nbrhouse, nellhouse, tavcellar, baggage,
  tralucave, school: all pass; the stair probe 72/72 climbs (6 stairs, 1/60–1/10 s frames, 3 lanes).
- The School: its blocks overlap 6 cm (a 10 cm seam between the dais step and the dais dropped Twinsen to the
  classroom floor, from where the dais was too high).
- Draw calls (Medium): the tavern 34 main + 1 shadow; the School 25 + 1.

### SPACEPORT-1 · Built (part 1: Citadel's terminal) · the laptop, 3.11.2026
`requests/SPACEPORT-1.diff` against origin cccfc20 (`git apply --check` passes): `src/game/terminal.js` (new), the
`regions.js` hook (room `terminal`, REF 90, AT [8600, 0]) and the director's `doors()` / `exitTo()` hooks.
- About 80 % alike to LBA2's departure hall (scene 78), in Twinsun sandstone with Esmer touches: the band of glass blocks
  under the back wall's cornice; the ticket counter on a platform two steps up in the back right, two hanging TICKETS
  signs, a luggage scale at its foot, lamps on posts; the departures board on the left wall between the doors, the
  GROUNDED notice beside it; two rows of five orange seats facing the board, planters with Esmer fountain plants, a
  luggage trolley; the café corner at the back left (counter, coffee machine, stools, a round table); the gate to the
  pad between two security pillars with green screens. 16 × 12 m (the BIGGER-1 scale), `R.view` 12 / `R.follow` 0.6.
- The way in: the blue door on the deck (spaceport.js, (−2.5, 31.6)) is a door now (`house: 'spaceport'`); out again
  1.2 m before it; the gate leads out to the pad's landing spot (−1.7, 39.5), beside the shuttle.
- Handles: `TERMINAL` (exported, filled when the room is built): `door`, `gate`, `counter` {x,z,r} (the travel menu's
  interactable), `board` {x,z,r}, `seats` (10 {x,z,a}), `npcSpots` {clerk, guard, cafe}, `notice.setVisible(b)`.
- Checked (origin cccfc20 + this): the Test Lab's new `artterminal` walk (in by the deck's door, the board, the counter,
  the café, out) passes; the gate leads to the deck by the pad; `tests/spaceport.mjs`, chapter1, transitions, house,
  lazyregions PASS. `tests/travel.mjs` and `doorcull.mjs` crash the headless page on this laptop with or without the
  terminal (environment, not this diff); prologue's well-mites check fails as on origin.
- Part 2 (Zeelich's terminal) next, after TRAVEL-1's cabin.

### TRAVEL-1 · Built (the laptop's cabin room) · 3.11.2026
`requests/TRAVEL-1-CABIN.diff` against origin (replaces the body of `src/game/shipcabin.js`, keeps its handle exactly:
`group, size, seats, windows, stand, passengers, hero, shots, update, dispose`; `travelfilm.js` unchanged). After LBA2's
Esmer spacecraft (scene 41), about 80 % alike:
- a square cabin 6.2 × 6.2 m under a low cream shell with a ring of light at its crown; oval windows, two in each side
  wall and two in the nose (one view mesh as before, the stars drifting, the planet's limb low);
- a deep red U of padded seats at the back facing the nose (7 seats: 3 across, 2 down each side); the two pilots' pods
  in the nose corners (blue consoles under glass domes, a red light each); the engine's glass column in the middle
  behind a teal railing, its core pulsing (`update`); the hatch with a yellow-and-black sill in the left wall.
- Passengers: the dozing traveller at the back's middle (seat 1), the woman on the right side's front seat looking out
  of window 3, the Mosquibee steward between the pods; Twinsen at the front-left window (window 1). Two shots: from the
  back right past the engine to Twinsen, and along the left wall.
- Lit by its own materials (no light added), no shadows; geometries and the two engine meshes disposed in `dispose()`.
- Checked: rendered from both shots in the game's renderer (the laptop); `tests/travel.mjs` crashes the headless page
  on this laptop with or without it (environment), so the films' timing with the new room is untested here.

### SPACEPORT-1 · Built (part 2: Zeelich's terminal; the diff now holds both) · the laptop, 3.11.2026
`requests/SPACEPORT-1.diff` (supersedes part 1's; applies on origin 64c14f3): `terminal.js` and `zterminal.js` (new), the
`regions.js` hooks (`terminal` AT [8600, 0], `zterminal` AT [8800, 0]), the director's `doors()` / `exitTo()`, and one
hook line in `travel.js` (Zeelich's port block: `buildZTerminalOutside(Z.group, P, Y)`).
- Outside: the port's deck had no building at all; a small domed Esmer pavilion now stands on the deck's free strip
  east of the footbridge's end (local x 0.6…4.8, z 34.0…38.6; clear of the pad's ring, the lamp, the board and the
  rail), its door toward the bridge (`esmerBuilding`, lilac dome).
- Inside, one Esmer hall 18 × 12 m after LBA2's departure hall (78, left) and arrival hall (82, right): the glass-block
  band and rounded pilasters; the ticket counter on its platform with two DEPARTURES signs, the departures board
  (TWINSUN: CITADEL / BY SPACESHIP / ISLANDS: SHUTTLE OUTSIDE), a notice, two rows of four orange seats, fountain plants;
  the arrivals deck 0.8 m up with its glass-block front and railing, a stair at each end (steps overlap 12 cm), four round
  lifts to the town behind it, the arrivals board, a red bench; the gate to the pad between two pillars with red lights.
- Handles: `ZTERMINAL`: `door`, `gate`, `counter`, `board`, `seats` (8), `npcSpots` {clerk, guard, porter},
  `arrivals` {x,z,a} (inside the gate: where he steps in from the pad), `notice.setVisible(b)`.
- Checked: Test Lab `artzterminal` (board, counter, up one stair to the arrivals deck, down the other, out) passes; the
  pavilion's door leads in (region zeelich), the gate out to the pad's landing spot on the deck. Spoilers: no pictures to
  the user (Zeelich).
