# World art: change requests from the laptop (for the cloud session)

> **Orders from the cloud for the laptop: `tools/testlab/CLOUD_ORDERS.md` (3.11.2026, night mode).**

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
- **Still open for the cloud:** (5.11: handed to the laptop as CLOUD_ORDERS 13: the vertex colour barely shows; it is
  the cliff texture's) the original has grey rock outcrops over about 24 % of the island; ours has almost
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

### ZEELICH-1 item 1 · Built: the harbour bar at Otringal and its office · the laptop, 3.11.2026 · Applied (the cloud, 3.11.2026, laptop-req)
`requests/ZEELICH-1-BAR.diff` against origin 8db08db (applies alone; with SPACEPORT-1 applied first its hook lines in
`regions.js` / `story/index.js` need `git apply -3`): `src/game/otrbar.js` (new), regions `otrbar` (REF 120, AT [9000,
0]) and `otroffice` (REF 40, AT [9200, 0]), the director's `doors()` / `exitTo()`.
- **The door:** Otringal's own harbour is the low west terrace with the pier into the clouds; the bar is the domed house
  there, `house (-42.2, -0.4)` in the island's building list (`worldfit.js` FIT; its door faces the island's middle,
  (1857.8, 1804.3) at y 4.4). The door is read from FIT, with the measured place as a fallback before the island is
  built (a save made in the bar). Walking in from the terrace and out again: checked.
- **The bar** (LBA2 scene 136, about 80 %), 20 × 14 m: sky-blue walls with a band of clouds over a dark stone dado,
  grey-and-teal tiles; the stage at the back right 0.9 m up (a stair of three, two orange curtains in a dark frame,
  footlights), the curtain's winch high on the frame's right post; green leather booths with tables on a raised floor at
  the back left behind turned balusters (a stair down), two slot machines; booths in the middle, the aquarium with its
  creature, leaf plants, globe sconces, a picture; the L-shaped bar at the front left (green top, urns and bottles,
  stools, the bottle shelf behind it); the office door in the back wall between the raised floor and the stage.
- **The office** (scene 137), 9 × 7.5 m: dark walls with a painted wave, the curtained alcove with a basin, the desk
  with a globe lamp, two cream armchairs, a picture, a plant; `npcSpots.boss` behind the desk.
- **Handles** (`BAR`): `npcSpots` {boss (the corner booth on the raised floor), performer (on the stage), bouncer1,
  bouncer2 (either side of the office door), regular1, regular2 (the bar's stools), regular3 (the middle booth)},
  `stage`, `office` (the door's spot), `counter` (behind the bar, a search spot), `winch` {x, y, z, r} (the ball target:
  the cloud adds it to `R.ballTargets` with OP-7's effect).
- Checked: Test Lab `artotrbar` (behind the bar, up on the stage, into the office and round it, back, out to the
  harbour) passes. Spoilers: no pictures to the user (Zeelich).

### ZEELICH-1 item 3 · Built: the Imperial Hotel's lobby at Otringal · the laptop, 3.11.2026 · Applied (the cloud, 3.11.2026, laptop-req)
`requests/ZEELICH-1-HOTEL.diff` against origin (applies alone; with the bar or SPACEPORT-1 applied first, its hook lines
need `git apply -3`): `src/game/otrhotel.js` (new), region `otrhotel` (REF 120, AT [9400, 0]), the director's hooks.
- **The door:** the pink-domed house on the plaza's north-west side, `house (-15.4, -10.2)` (its door faces the plaza;
  read from FIT, the measured place as the fallback). Out again onto the plaza: checked.
- **The lobby** (LBA2 scene 81, about 80 %), 22 × 16 m: dark teal walls with gilded scrolls under a patterned frieze, a
  terracotta floor; an L of raised floor 0.9 m up along the back and the left with brass posts and a rope along its
  edge, two stairs down; on it the members' desk (two curved counters, stools, a bowl, the register), shelves of tall
  vases, three round tables with their stools, tiered globe lamps, bushy plants in brass urns, two tall doorways
  between twisted columns, the two coin machines (life, magic) between them; the sunken lounge with four cream
  armchairs between globe lamps on blocks; the pool at the front right behind its kerb, two striped deck chairs.
- **Handles** (`HOTEL`): `desk`, `register` (a read spot on the desk, for OP-7), `machines` [{x,z,a,kind}] (life,
  magic: where Twinsen stands to use them), `npcSpots` {clerk (behind the desk), explorer (in a lounge armchair),
  manicurist (by a round table)}.
- Checked: Test Lab `artotrhotel` (the left strip's stair to the tables, along the back strip to the desk and the
  machines, down the other stair to the lounge, out to the plaza) passes. No pictures to the user (Zeelich).

### ZEELICH-1 item 2 · Built: the Temple of the Dark Monk (and the way in, part of item 4) · the laptop, 3.11.2026 · Applied (the cloud, 3.11.2026, laptop-req)
`requests/ZEELICH-1-TEMPLE.diff` against origin (applies alone; with others applied first, `git apply -3`):
`src/game/celtemple.js` (new), region `celtemple` (REF 120, AT [9600, 0]), the director's hooks, and one hook line in
`zislands.js` (`if (name === 'celebration') R.templePortal = buildCelPortal(group, physics)`).
- **Where:** our Celebration's top is the paved plaza round the great figure (9.5–10 m; measured: the ground falls to
  the sea on every side, so the "crater" is filled and paved as the island's own design says). The temple lies under
  the summit; its **portal** stands on the plaza's north edge at local (2.2, −9.2), facing the figure: a plinth, two
  dark granite pillars, a lintel with two horned heads, a dark stairwell between them (a see-through collider keeps
  Twinsen out of the hole; the door takes him down). Clear of the festival masts (the nearest 4 m off). Checked: in
  through the portal, out again onto the plaza.
- **The hall** (LBA2 scene 93, about 80 %), 18 × 15 m: dark granite, rosettes in the floor; nine carved columns with
  four dark globes in gold clasps; two horned heads with glowing eyes and mouths on the left wall; three lava pools
  (railed off by see-through colliders); the lava altar with two white orbs between the Dark Monk's statue and the
  insect figure; the prophecy murals (four framed panels with turquoise medallions) over a stepped bench on the back
  wall, the reader's lectern before them; the sealed door up a short stair in the left wall at the back (its stone
  leaf rises into the lintel when open; four empty sockets over it).
- **Handles** (`TEMPLE`): `murals` [4 × {x, z, a, look: {x, y, z}}], `lectern` {x, z, r}, `sealDoor` {x, z, open,
  setOpen(b, instant)} (open by default: twelve years on; shut, its collider blocks the doorway).
- **Item 4 (the volcano):** the summit is already the island's plaza and the slopes fall away round it; I did not
  carve a crater or add lava there (it would undo the festival plaza the cloud designed). `celebration.templeDoor` is
  `R.templePortal.door`. The trail (three waypoints) and a lava glow on the flanks are left: say if they are still
  wanted on this shape.
- Checked: Test Lab `artceltemple` (a mural, the lectern, up to the open sealed door, out) passes. No pictures to the
  user (Zeelich).

### ZEELICH-1 item 6 · Built: a sky and grade per island · the laptop, 3.11.2026 — applied by the cloud (3.11, branch laptop-req2)
`requests/ZEELICH-1-SKY.diff` against origin (`zislands.js` only; applies alone): the island's `R` now carries
`grade` / `gradeTint` from its style (main.js already calls `setGrade(R.grade, R.gradeTint)` on entering), and the cloud
sea's three layers and its shore puffs take the style's `cloudTint` (white as before where none is set).
- **Otringal:** overcast, misty and pale grey (LBA2): grey fog and sky light, a softer sun, grade 0.82, a grey cloud sea.
- **Celebration:** a warm haze, the light lava-tinted (tint 1.04 / 0.98 / 0.93), a warm cloud sea.
- **The platform (the Wannies' island, under the gas):** dim, warm and hazy, the fog and sky light amber-brown, grade
  0.9, an amber gas sea under it (a first darker try clashed with the pink sea; the sea is tinted now too).
- **Mosquibee:** LBA2 puts the Mosquibees under the gas: a mildly warmer, hazier light; the meadow keeps its colour.
- The others (Knartas, the CX islet, the Lift Dock, Under Celebration's own env) unchanged.
- Checked: pictures of Otringal, Celebration and the platform from the play camera (on the laptop; none to the user).

### ZEELICH-1 item 5 · Built: the Wannies' island under the gas, the lift's ride down · the laptop, 3.11.2026 — applied by the cloud (3.11, branch laptop-req2, after SKY)
`requests/ZEELICH-1-WANNIE.diff` (`props-esmer.js`, `zislands.js`). **Apply `ZEELICH-1-SKY.diff` first**: both touch
the platform's style line (its env and gas colours are item 6's); checked on a fresh worktree of origin 3e5f458: SKY
alone applies, then WANNIE applies on it (WANNIE alone does not).
- **The platform re-dressed as LBA2's Wannies' island:** the yard is the Building Company's (its board "BUILDING
  COMPANY" over the yard, the arrival target), the ore crates by the lift's foot, barrels and warnings ("MINE", "KEEP
  CLEAR", "NO NAKED FLAMES") round the mine; the ramp down to the village of low houses; the chapel (the village's
  southernmost house, up on its terrace, its stair from the east) with a bell frame below it; signs VILLAGE, CHAPEL.
- **New pieces (props-esmer):** `mineMouth` (compact rock over a timbered mouth, the word MINE, rails with an ore cart, a
  lamp; 5.8 × 3.8 m), `bellFrame`, `boardSign`. The planner places them: the yard itself is all routes and the pad's
  ways, so the mine stands on the ramp down to the village (local 27.5, −9.5, facing west) and the lift's foot at the
  ramp's head (26.9, −21.5); both pass the planner's route checks (nothing cut off).
- **The lift (`liftTower`, also on the Lift Dock):** its cage now drops 18 m through a hatch at the foot. `R.lift` (on
  `liftdock` and on `platform`): `setLevel(t, instant)` (1 = top, 0 = the bottom; the cage moves 0.1 a second; until
  first called it idles up and down as before), `level`, `moving`, `setLever(b)` / `pulled`, `top` {x, z, y}, `lever`
  {x, z} (the lever's post beside the tower: OP-7's plate), `front` {x, z, a}. The ride itself (the hero in the cage, the
  cut to the platform) is the cloud's: `liftdock.lift.top` is where he boards, `wannie.liftBottom` where he steps off.
- **Handles `R.wannie` (world coordinates, each with `a`):** `liftBottom`, `mine` (before the mouth, clear of the cart),
  `chapelDoor` (on the terrace before the door), `crates`, `npcSpots` {miner1, miner2, foreman, villager1, villager2,
  chaplain}.
- Checked on the laptop (numbers): every handle stands on ground and is clear of colliders (radius 0.3); the chapel's
  door is reachable (its stair: no step up over 0.32); `setLevel(0)` then `(1)` reaches 0 and 1, the lever pulls; the
  Lift Dock's `R.lift` exists. On a copy with every ZEELICH-1 diff and both terminals: `tests/zislands.mjs`
  passes; `tests/zeelich-life.mjs` fails one check (chapter 9: "the street argues about the council", another speaker
  answers), and fails the same way on clean origin 3e5f458: not these diffs.
- Not done: pictures (the headless browser here does not redraw the island; none to the user anyway, Zeelich). The
  company office front is the target house with its board, not a new facade.

### ZEELICH-1 · where it stands (3.11.2026)
Items 1 (bar), 2 (temple + its portal), 3 (hotel), 5 (the Wannies' island, the lift) and 6 (skies) are built as request
diffs. Item 4: see item 2's note (the summit is already the festival plaza; say if a carved crater, a lava glow or the
trail are still wanted).

### The laptop's pending diffs · apply order (3.11.2026, against origin 5b0491c)
SPACEPORT-1 is merged, so BAR, HOTEL and TEMPLE were rebuilt on top of it (their hook lines in `regions.js` and
`story/index.js` follow the two terminals). Apply in this order; each was checked with `git apply --check` on a fresh
worktree of origin 5b0491c with the ones before it applied: `ZEELICH-1-SKY` → `ZEELICH-1-WANNIE` → `ZEELICH-1-BAR` →
`ZEELICH-1-HOTEL` → `ZEELICH-1-TEMPLE` → `DOORS-1`. SKY and DOORS-1 also apply alone; the other four need the ones
before them (or `git apply -3`, keeping both sides of each list). On the whole chain: the game boots, every new room
builds and is entered (terminal, zterminal, otrbar, otroffice, otrhotel, celtemple, the platform, Otringal,
Celebration, the Lift Dock), no page errors; the bar's and the hotel's doors still lead in (no "Locked." there).

## DOORS-1 · Every building an entrance and windows; every door answers · the laptop, 3.11.2026 (the user's ask) · Applied (the cloud, 3.11.2026, laptop-req)
The user: "every place has people, every building has an entrance and windows". The audit (every building in the
FIT registry, every outdoor area; numbers only) found on Zeelich's islands 107 houses: 44 with a door and windows, 29
hollow ones with no door (packed between others, or too low for a door under the frieze), and no island or Zeelich door
that answered anything (walking up to one did nothing). `requests/DOORS-1.diff` (`props-esmer.js`, `zislands.js`,
`zeelich.js`, `desert.js`, `story/prologue.js`):
- **Low houses (walls under 2.6 m):** no frieze; the door and windows reach up under the cornice (taller houses as
  before).
- **Packed houses:** when no side has open ground before it, the door goes onto the alley beside it (ground a metre
  out within 0.3 m of the floor, a narrow strip free of other houses); none where the ground before it falls away
  (the rule tests/worldfit.mjs uses: 0.5–1 m out, more than 0.1 m under the floor).
- **Every door answers:** each island house door, Zeelich's street houses, Kesh's houses and the post's cabins are in
  `R.shutDoors` ("Locked."). Where the story has a door into the same house (the bar, the hotel, the council, Tarra's
  house, the workshop) that door is offered instead: the room branch of `baseInteractables` skips a shut door within
  2.2 m of a story door entry.
- **`R.peopleSpots`** on every island: up to 10 places for people (before house doors facing the street, at the
  landmarks, beside the pad), on ground, clear of colliders, 4 m apart: Otringal 10, Knartas 10, the platform 7,
  Mosquibee 5, Tralu 5, the orchard 3, Under the Gas 3, Celebration 2, the Lift Dock 2, the Old Watch 2, the CX
  islet 1. See PEOPLE-1.
- After: 65 houses with a door and windows, 6 hollow ones without a door (no side with ground at the floor's level),
  0 doors without an answer on the islands and Zeelich. Left as they are: 34 solid pieces (6 × 1.3 m garden walls
  and low blocks under 2.3 m), the 2 doors that would hang over a drop.
- Checked (on origin 731a70d + DOORS-1): zislands, doorcull, desert-life, chapter1 pass; worldfit fails only on
  Citadel's neighbours' house ("door overlaps window", the same on clean origin); in the game, P.target() is "shut" at
  16 of 16 doors tried (Otringal 4, Knartas 4, Zeelich 4, Kesh 4). zeelich-life: under the laptop's load the reload
  after save-and-quit did not finish in 5 minutes, the same on clean origin at the same time (15 checks passed before
  it on both); earlier, unloaded, on the full copy it ran through with only the existing chapter-9 failure.
- Not done here: Citadel's harbour shed and the project building's office doors (no answer; Citadel's doors are
  C-4's), Hamalayi (its buildings are not in the FIT registry), Kesh's and the post's windows (drawn, but missing from
  the registry only).

## PEOPLE-1 · People on Zeelich's islands · for the cloud (the user's ask: "every place has people") · NOT applied (see below)
No one stands on any of the 11 islands: no npcDefs there in any chapter (the cast by area: Citadel 30, Zeelich 12,
Desert Island 10, Hamalayi 5, the islands 0). Please give each island its residents, with a purpose each (a trade, a
line about the island, a small favour), on `R.peopleSpots` (DOORS-1) and the item-5 handles (`R.wannie.npcSpots` on
the platform, the bar's and hotel's `npcSpots`). Rooms with nobody, for you to judge (most are caves, mazes, sewers
or machine rooms where that is right): well, office, control, workshop, lighttop, cellar, the c3 rooms, the
condensers, butemple, asylum, bumaze/buhalls, valves, arena, sewer, tralucave.

## CAMPAIGN-1 · The campaign director's fixes · the laptop, 3.11.2026 (the user's ask: the lba-campaign-director agent) · Applied (the cloud, 3.11.2026, laptop-req)
`requests/CAMPAIGN-1.diff` (story/epilogue.js, evacuation.js, network.js, zeelife.js, storylife.js, guards.js,
roomlife.js, text ch3/ch8/ch10; tests chapter8, chapter10, cast-rounds, playthrough/11, the new epilogue-home.mjs; and
docs/campaign/CAMPAIGN_DIRECTOR.md: the story as now played, the coverage table, every fix with its before/after and
route, the motive table, the opening's promises against the ending, what is open). Applies alone on origin a8ca37a5
and after the laptop's chain above. The agent played the whole campaign by input from a new game to Keep Exploring
(tests/playthrough 01–14 chained through real saves, all PASS; the Zeelich depot's fight and the bore's partly finished
by ISO, logged).
- **EPILOGUE-HOME** (the biggest gap): after the ending Gilbert still stood at the fortress shelter, Tim and Lulu at
  the depot, Ilka and Dallan at the bore, Lhar's people in the monks' camp; Doran, Nara, Oku, Hesk, Pim were nowhere;
  Baldino behind a door with no prompt; everyone off Citadel said only "Hello, Twinsen." Now everyone is home with a
  line of their own (Dallan carries Kesh's water; Tarra has not forgiven him), Baldino's workshop and Sefa's dome open,
  the end card answers the 30 % plan (half heat for every house).
- **C8 LIGHTHOUSE-GATHER:** Zoé's hill families gathered on the northern plateau, 150 m from the lighthouse that her
  words, the objective and the signposts point to; now below the lighthouse headland.
- **C8 VESK-ANSWERS:** Vesk's broadcast answers the vents Twinsen opened (and drills on); Zoé says Vesk switched the
  heat posts off: his decision, seen.
- **C10 STAND-DOWN:** at the bore Dallan orders his old Grobo guard to stand down under the council's order; he walks
  back to his cabin and stays gone after a load (`c10_guardDown`); only FunFrock's clone and the sentry fight.
- **C12 ALLIES-STILL-THERE:** the core's radio no longer has Oku "releasing the mills" a third time.
- Checked again here on the agent's branch: `epilogue-home`, `save-migration` (old v4 epilogue saves too), `chapter10`
  PASS. The agent also ran chapter8 and cast-rounds (chapter 8) PASS.
- Open (in the doc): no map marker outside Citadel in chapters 3–7 and 9–12 (read in the code only); the old mill's
  stair-stone hop missed by the bot in 2 of 3 runs (needs a person); the ISO-finished fights never balance-tested by a
  person; only three allies heard at the core; the Hebrew synopsis (five pylons, chapters 11–12 twice) and STORY_MAP
  (the Core inside the Shell) not updated; Dallan's chapter-9 trip thin, no Vesk scene after the coil; the lighthouse
  lamp room shut after the ending.

### The cloud applied the laptop's chain · 3.11.2026 (branch `laptop-req` from ccr-adf00ea7-37ebl3 895deb1; not pushed)
One commit per request, in this order: CAMPAIGN-1 → DOORS-1 → ZEELICH-1-BAR → ZEELICH-1-HOTEL → ZEELICH-1-TEMPLE.
- **CAMPAIGN-1:** applied as delivered (clean). No new speaker keys (`n_*`), so no new `VOICES` entry was needed.
- **DOORS-1:** applied, one line adapted: the diff took the `id` off Citadel's shut doors in `story/prologue.js`
  baseInteractables, which would have turned C-4's own lines (`text/world.js` `w_door_<id>`) back into "Locked.".
  The `id` stays; the room branch (islands, Zeelich, Kesh, the post) is the diff's, with its 2.2 m story-door rule.
- **BAR, HOTEL, TEMPLE:** the new files as delivered; the hook lines in `regions.js` (REF, AT, `add`) and
  `story/index.js` (`doors()`, `exitTo()`) merged by hand onto the base (SEWERS-1 had changed `sewerDoors` /
  `sewerExit` and added `sewerglobe` on the same lines). TEMPLE's `zislands.js` lines (the import and
  `R.templePortal = buildCelPortal(...)`) applied by hand (the base moved). SKY and WANNIE were not part of this
  batch and are still not applied; BAR, HOTEL and TEMPLE do not need them.
- **Checked** (a snapshot of the chain's head, SwiftShader container): epilogue-home, chapter1, chapter2, chapter8,
  chapter10, cast-rounds, world-consistency, interior-life, voices, sewers-ways, occluders, stability, zislands,
  doorcull PASS. A scratch probe (not committed): the bar, the hotel and the temple are each walked into by their
  door and out again (input); before the bar's door its house's shut door gives no "Locked." prompt; an Otringal
  house door says "Locked." and Citadel's dome door still says its C-4 line (both with him placed a metre before the
  door, ISO: the test harness's path planner reported "stuck" walking to 8 Otringal house doors, not looked into).
- **PEOPLE-1: not applied.** There is no diff, and the entry asks for the islands' residents to be written (who,
  what trade, what line, which chapters): story content of its own, not a mechanical change. The handles it needs
  are now in (`R.peopleSpots`, the bar's and the hotel's `npcSpots`; `R.wannie.npcSpots` waits for WANNIE).
### The laptop's pending diffs · apply order, again (3.11.2026, against origin 895deb15, after SEWERS-1)
SEWERS-1 changed the same hook lines, so BAR, HOTEL and TEMPLE were rebuilt once more: their `doors()` / `exitTo()`
lines and regions.js's REF / AT lines are now origin's lines with only the request's own entries added (checked: no
entry twice). Order, each checked with `git apply --check` on a fresh worktree of 895deb15 with the ones before it:
`ZEELICH-1-SKY` → `ZEELICH-1-WANNIE` → `ZEELICH-1-BAR` → `ZEELICH-1-HOTEL` → `ZEELICH-1-TEMPLE` → `DOORS-1` →
`CAMPAIGN-1` → `BG-STUCK-1`. SKY, DOORS-1, CAMPAIGN-1 and BG-STUCK-1 also apply alone. On the whole chain the game
boots and every new room builds and is entered (and the sewer and tavern still do), no page errors.

## BG-STUCK-1 · 8 fps after Esc in the desktop app · the laptop, 3.11.2026 (the user's report) — applied by the cloud (3.11)
The user: after Esc the game runs at 8 fps (first blamed on a talk with Pippa, then found to be Esc). 8 is `BG_FPS`,
the frame rate PERF-BATTERY draws at while the window is in the background (`setBackground`: document hidden, the DOM
blur, or the desktop app's `lba3:window` report not focused). A "not focused" that is never followed by its "focus"
keeps it there until the window is focused again. Not reproduced here: in the installed app 0.48.0 (bench profile)
synthetic Esc presses left `background` false and the frame rate unchanged. What fires the stray blur on the user's
machine is unknown. `requests/BG-STUCK-1.diff` (main.js, tests/bg-stuck.mjs) makes the state end on its own:
- a trusted key press, click, wheel or moved mouse in the window brings it back to the front (`foreground()`);
- while in the background, once a second: if the page is not hidden and has focus (`document.hasFocus()`), the same;
- a window that is really hidden or behind another stays at BG_FPS as before.
- Checked: `tests/bg-stuck.mjs` PASS (a stale report ends on a key press; on its own within the second; a hidden page
  stays in the background).

## CAMPAIGN-2 · The campaign director's second round · the laptop, 3.11.2026 (the user: "let the agent continue") — applied by the cloud (3.11, branch laptop-req2)
`requests/CAMPAIGN-2.diff` (after CAMPAIGN-1, which is merged; applies alone on origin 35aaa16). The agent's open items:
- **GUIDE:** away from Citadel no chapter showed its objective on the holomap or minimap (Desert Island's "Find the
  professor" had no pointer at all). Each chapter 3–7, 9, 10 now puts a gold star on what its objective needs (the
  person, the object, the next door, chapter 10's unfinished stations, the code box); `ChapterBase.star/starNpc/stars`.
- **C12 FINALE-ALLIES:** the overload is answered on the radio by Ilka and Dallan (the desert vent) and Pim and Sefa
  (the dome), the two stations without a pylon.
- **C12 VESK-CHOICE:** after the coil a choice that can't be dismissed: pull Vesk clear, or leave him for the
  council's guards (`c3_veskHelped`); he answers as himself; the end card and Baldino after the ending remember it.
  Saves without the flag read as before.
- **C9 DALLAN'S WAY:** Dallan says how he reached Zeelich (Hesk's glider from Kesh, then a project ship).
- **LIGHTHOUSE-OPEN:** the lamp room opens after the ending (a line at Zoé's microphone); it found a real bug: the
  stair out sent Twinsen through chapter 3's exit to Baldino's workshop; the epilogue has its own way out now.
- Measured and left: the old mill's hop (seven identical hops, 1.09 m up and 1.71 m apart; the jump rises 1.19 m:
  a 0.5 s window at a run; the misses were the bot's run-up), the ISO-finished fights (one step harder than their
  neighbours, not clearly harsher).
- Docs: STORY_MAP.md (chapters 11 and 12 apart); the Hebrew synopsis's corrections listed in CAMPAIGN_DIRECTOR.md.
- Checked: the agent replayed playthrough 06–14 by input with everything live (9 PASS), chapter3, epilogue-home,
  save-migration PASS; again here: epilogue-home, save-migration, chapter3 PASS.
- Still open: no person has played the two ISO-finished fights; chapter 8's new gathering spot not looked at closely;
  chapter 5's objective runs ahead of the hangar's glider and hatch; chapters 11–12 have no stars (rooms in a line).
- Applied by the cloud (branch laptop-req2): the diff applied cleanly on origin after VOICES-PIPER, SEWERS-1 and EQUIP-2a.
  `tests/epilogue-home.mjs` failed "Keep Exploring" (and so the lamp room) on that base without this diff too: EQUIP-2a's
  Arthur calls out once in the house, and the test walked to the door with the line still open. The test now hears the
  line out (`T.talkAll()`) before the door, as a player would; every check as before. Then PASS. `tests/chapter3.mjs`
  ("Keep Exploring: in play") failed the same way and got the same fix: PASS.

### ZEELICH-1-WANNIE rebuilt on origin 35aaa16 (3.11.2026)
DOORS-1 and TEMPLE are merged, so WANNIE was rebuilt on them: apply `ZEELICH-1-SKY` first, then `ZEELICH-1-WANNIE`
(both checked on a fresh worktree of 35aaa16; CAMPAIGN-2 applies after them too). The only overlap was the end of
`buildIsland`: the temple's portal line and the platform's `R.wannie` block, both kept. With DOORS-1's houses in
place the planner puts the mine and the lift's foot where it did before; every `R.wannie` handle stands on ground,
clear of colliders; the lift goes to 0 and to 1 and its lever pulls. `tests/zislands.mjs` PASS on origin + SKY + WANNIE.

## LINE-CLEAR-1 · A street lamp inside a pennant line · the laptop, 3.11.2026 (the user's picture) — applied by the cloud (3.11)
The user's picture (an Esmer island street): a lamp's head inside the pennant line strung from it. The lines are
strung between neighbouring lamps and banner poles (`api.street`, `lines: true`), tied to a lamp's pole at 3.3 m,
under its arm; a line leaving the lamp on the arm's side runs through the lamp's head. Counted from the planner's own
plan on origin 3ea2f99: Otringal 1, Knartas 1, Tralu 4 such lines. Nothing checked what stands under a line either
(lamps, poles and banners are not in the planner's height map, for the camera's sake). `requests/LINE-CLEAR-1.diff`
(`zislands.js` only; applies alone on 3ea2f99, and after SKY → WANNIE → CAMPAIGN-2):
- a line leaves a lamp only on the side away from its arm (the arm reaches along the lamp's local +x);
- `clearUnder`: along the line (a metre clear of its posts), at its height under the sag less 0.45 m for the
  pennants, nothing within 0.8 m either side stands higher: the height map (roofs, trees) and the thin uprights
  (lamps with their arms, poles, banners, posts, the original's and ours);
- a pair that fails is not strung; the others are as before.
- After: no line through a lamp's head on any island; the lines left: Otringal 2 → 1, Knartas 1 → 0, Celebration
  14 → 13, Tralu 11 → 9 (the rest have none). `tests/zislands.mjs` PASS.

## ISO-CLOSE-1 · Twinsen tiny in the big rooms · the laptop, 3.11.2026 (the user: "Twinsen is very small against the map, maybe zoom in")
The user's picture: the asylum (LBA1), whose fixed indoor view shows 24 m (`R.view`); the homes show 10–12. Measured
(Twinsen's height as a share of the screen's, 1280×720, the room's spawn): the house 0.149, the tavern 0.133, the
asylum 0.065, the Bu halls 0.064, the Bu maze and the temple 0.101, the sewer 0.094, the arena 0.066.
`requests/ISO-CLOSE-1.diff` (`engine/camera.js`, `game/arena.js`, `game/underground.js`; applies alone on ea569d3,
and after LINE-CLEAR-1):
- the fixed indoor view shows at most `ISO_MAX` by Settings → Camera distance: far (the default) 14 m, medium 12.5,
  near 11; a room built wider is shown at that, and the view then follows him more (follow ≥ 0.85, the frame's
  keep-him-in-the-middle margins from the shown size);
- rooms under it (the homes, the shops: 9.5–13) are as before; `R.wide` keeps a room's own view: the arena and the
  underground's boss ring (a fight that needs the whole floor).
- After: the asylum 0.113, the Bu halls 0.111, the Bu maze, the temple and the sewer 0.114; the house 0.149 and the
  tavern 0.133 unchanged; the arena 0.066 (wide). `tests/lba1rooms.mjs` (walks the asylum) and `tests/transitions.mjs`
  PASS.
- Text: Settings' hint for Camera distance (`set_h_cd`) speaks of the Follow camera only; it now sets the rooms' zoom
  too (the cloud's line to change, if wanted).

## ASYLUM-2 · What the asylum becomes, tied to Zeelich (the user leans to the Esmer workers' hostel) · the user, 3.11.2026 · QUESTION for the cloud
The user played the asylum: "where is the main entrance and where is the side entrance, nothing there makes sense,
and it's completely empty", then asked what it gives the game (today: an optional nostalgia stop; the register's line
and a clover, Twinsen's cell, its marks and five kashes, the warm pipe as a hint of the dig, a giver; no quest goes
through it, and no one stands in it: the header's guards, trooper and dogs were never placed), and decided it should be
converted into something tied to Zeelich. Offered: (1) **the Joint Project's hostel for its Esmer workers** (the
user's lean), (2) a medical arrivals station for travellers from Zeelich, (3) Zeelich's consulate on Citadel. The user
then said to consult the cloud first: **please answer here** (which fits the story and its chapters, or what else; who
is there and when; whether it serves chapter 8's shelters or the breach as a way into the project's tunnels). Until
then the laptop builds only the two entrances and the npcSpots; the dressing below waits for the answer.
- **If (1): the laptop builds the place** (a request diff follows, with pictures): LBA1's two exits as they were, the main
  entrance on the upper level (a real front door outside) and the low stair-well (the block-house) as the side
  entrance, both ways; the rooms dressed as a lived-in hostel with Esmer touches (the cells as sleeping rooms,
  Twinsen's cell kept as the workers' curiosity with a blank plaque, the office as the foreman's, the nurses' station
  as the kitchen and mess, the project's store kept); `R.npcSpots` at the original actors' places (worker1…, cook,
  foreman, a sleeper).
- **Please (the story's part):**
  - ASYLUM-1's lore ("bricked up and forgotten; the dig broke back into it") and its lines
    (`asy_register1/2`, `as_cell1–3`) as fits a hostel: the register can stay the old one the workers found; the
    breach is now theirs to complain about.
  - The people: a foreman, a cook, three or four Esmer workers (off shift, homesick, curious about the hero whose
    cell they keep), each with a line or a small favour; placed on the npcSpots, in the chapters where the project
    has workers on Citadel. The plaque's text in Twinsen's cell.
  - The front door's line or sign if it needs one ("JOINT PROJECT HOSTEL" or as you like).

### ASYLUM-2 · the cloud's answer (3.11.2026)
The user decided in the cloud session (same day) for **Vesk's hidden storehouse**, and asked that the reason the asylum
is missing from LBA2 be clear. That and the hostel fit together, so the decision is **both, one place**:
- **Why LBA2 never showed it:** a plaque at the old bricking by the stair-well: "SEALED BY ORDER OF THE CITADEL ISLAND
  COUNCIL AFTER FUNFROCK'S FALL. NEVER AGAIN." (the bricking broken, as ASYLUM-1 built). Madam Rondo's line adds that
  everyone was glad to forget it until the project's diggers broke in. Vesk's notebook says he found the sealed asylum
  on FunFrock's old plans and chose it because no one would look there.
- **Officially the project's hostel for its Esmer workers** (the laptop's dressing as proposed: the cells as sleeping
  rooms, Twinsen's cell kept as their curiosity, the foreman's office, the kitchen and mess). Front door: a sign
  "JOINT PROJECT · WORKERS' HOSTEL". This gives the Zeelich tie the user asked for on the laptop.
- **Behind it, Vesk's storehouse:** the project's store (keep it) is his: crates of warm crystals stamped "ZEELICH"
  that the workers are told are "pipe fittings", one hidden crate that hums (Arthur's pocket set finds it), and a
  locked office (Vesk's, separate from the foreman's) with his notebook. Two of Vesk's guards on the store, not on
  the hostel; a short sneak or the ball.
- **Chapters:** 1–2 the hostel lived in (foreman, cook, 3–4 Esmer workers off shift) and the store guarded; 3–7 after
  Vesk is gone the store is cleared (crates gone, guards gone), the workers still there, uneasy; 8 the hostel becomes
  one of the shelters (it fits "FunFrock dug tunnels under everything": the workers help Twinsen open it); the later
  "secret way into the fort" (ASYLUM-LATER in WORLD_CONSISTENCY.md) stays a later card. Epilogue: the workers.
- **Split of work:** the laptop builds the two entrances, the hostel's dressing, the store's crates and the two
  offices, the plaque and the sign as objects, and `R.npcSpots` (worker1…, cook, foreman, sleeper, guard1–2,
  hiddenCrate, veskDesk, plaque). The cloud writes the people, lines, the notebook, the crate find, the guards'
  patrol and the chapter states on those handles, after the diff is merged. Text in English, short; Esmer naming.

## HARBOUR-1 · Citadel's harbour wing in one language (CLOUD_ORDERS 3, "Cacophony") · the laptop, 4.11.2026
`requests/HARBOUR-1.diff` (island.js `cargoLift` only, harbourshed.js, town.js the `wing2` row, townlife.js Nell's
roof, travel.js the Citadel stop board, citydress.js; applies clean on origin fdad24e). The wing now reads as LBA2's
harbour: stone and rubble houses under slate and boards, plank sheds, the Esmer trading house as the one foreign
building, the project shown by its emblems and crate stack. No story place, door, interaction spot, flag or line moved.
- The barge and its slewing lift **kept** (the opening uses them, 13–29 s: `W.cargoLift.pose/shake`, the crate,
  `cratePierW`): the look only, shapes, sizes, poses and colliders unchanged. The teal column and arm become a dark
  timber mast and boom with iron straps; the brass winch housing slate-grey iron (the emblem kept); the teal hull a
  darker plank lighter with a rubbing strake (the emblem kept).
- The harbour master's shed: the blue tile roof becomes weathered boards (one material fewer).
- Nell's home (`wing2`): block stone becomes rubble (as LBA2's body 49), pairing with Doran's shed.
- Nell's stall: the orange painted roof becomes boards with a little old red paint (its own material: the fade works).
- The ferry stop board faces the quay and the way from town (the camera saw only its blank back); timber posts.
- **Removed:** citydress's second ferry timetable board, 6 m from the stop's own board (nothing used it).
- Left as they were: the ticket office (LBA2's ashlar hall), Mr Bazoo's, the customs booth, the project ferry, the
  quay's project crate stack (the story shows and hides it), the Esmer trading house with its dome (approved, WA-15b).
- Draw calls (SwiftShader, one frame, main / shadow): customs 128/48 → 127/48, pier 107/59 → 106/59, trading house
  180/48 = , ticket office and Nell's 133/56 → 132/56, Bazoo's 152/54 = ; triangles about −0.1 %.
- Checked on the agent's base f520b75: chapter1 PASS, shops PASS, worldfit only the existing house-nbr failure. On
  fdad24e: the diff applies clean, the game boots without errors (13 minutes under the night's load: chapter1 and
  opening timed out waiting for the boot, not on a check). To rerun on fdad24e when the laptop is quiet: chapter1,
  opening (the lift), shops.
- Left (notes): the customs booth's navy roof; the town's blue-globe lamps (LBA2's harbour lamps were warm yellow);
  the project ferry's teal hull. Cut 9 (the ticket office into the baggage claim, Nell's interior) is the story's.

### ASYLUM-2 · Built: the hostel, Vesk's store, the two entrances · the laptop, 4.11.2026
`requests/ASYLUM-2.diff` (new `src/game/asylumhostel.js`; `lba1places.js`; `WORLD_MAP.md`'s row; applies alone on
origin aba783e and after HARBOUR-1).
- **Two entrances as LBA1:** the front door, a brick portico with a slate pediment, an Esmer tile roundel and the sign
  "JOINT PROJECT · WORKERS' HOSTEL", against the old fort's south wall at (−26.5, −50.6) facing south: where the only
  stair onto the fort's terrace (`ASYLUM_STEPS`) arrives, the first thing seen on the way up; inside, LBA1's tall
  portal at the upper walk's east end (`asylum-front`). The block-house on the east wall is the side door (its sign
  "Joint Project / Service stair · staff only"). Both ways, every chapter; `lba1Doors` lists the front first.
- **The hostel:** the dormitory (bunks on LBA1's brick bed plinths, lockers, a washing line, a shrine), the common
  room (hammocks), the hall, the kitchen and mess in the nurses' station, cell A as a sleeping room (a door cut, a step
  down), Twinsen's cell kept as the workers' curiosity (a rope barrier, a brass plaque "CELL 2"; ASYLUM-1's marks,
  pipe and look untouched), the foreman's office (ledgers, a duty board, the clone statues in the corner with coats
  on them), the service hall by the side stair with the Council's plaque at the broken bricking. Warm lamps; the
  room's grade 0.32 → 0.45, a little warm.
- **Vesk's store:** in the boiler room under the side stair, crate stacks stamped ZEELICH in two aisles with cover,
  two guard posts, the humming crate behind the boiler; **Vesk's office** (LBA1's sealed room, a door cut at z 30):
  his desk, notebook, FunFrock's plans, a strongbox, an open crate of crystals.
- **Handles:** `R.npcSpots` foreman, worker1–4 (worker4 'sit'), cook, sleeper ('lie'), guard1, guard2 (each with x, y,
  z, a, role and the LBA1 place it came from); `R.ways.front/side`; `R.asylumHostel.spots` hiddenCrate, veskDesk,
  plaque, register, cellPlaque (`{x, z, r}`); `R.asylumHostel.veskOffice.door.setOpen(b, instant)` (shut at first,
  collision follows); `R.asylumHostel.store.setCleared(b)` (the crates, the humming crate and the guard posts and
  their 9 colliders); `R.asylumHostel.hum.setOn(b)`. No save state of its own.
- **Draw calls** (SwiftShader, one frame, 11 spots in the room): 134–191 → 206–292; triangles about 70–86k →
  220–300k; outside the front door 202 → 216. The room was already the heaviest LBA1 room (its cut-away meshes); real
  GPU numbers follow with the night's hardware checks.
- Checked on b9bf660 (the agent's base): lba1rooms 8/8 (the plateau stair, in by the front, out by the stair-well),
  transitions 6/6, asylum 10/10 (save → quit → Continue); by input both doors both ways, the cell, the register, the
  giver, the store's aisles and the hidden crate, Vesk's office shut and open. On aba783e: the merge (the DECLUTTER
  header and `LBA1_AT` without the Bu halls) and a smoke run (the room builds, both doors, every handle, no page
  errors); the full tests to rerun when the laptop is quiet.
- **For the cloud:** `lba1EnemyDefs` still posts Quetch guards at all seven nurse spots, an fclone and two dogs (one
  dog at cell (30, 5, 30) is inside a wall): per your answer, two of Vesk's guards on guard1/guard2 in chapters 1–2,
  none in 3–7 (and `lba1rooms.mjs`'s "8 or more guards" with it); the people, lines and chapters on the npcSpots; the
  finds (the hidden crate, the notebook, a look at the Council plaque, the cell plaque's text); the chapter states
  (Vesk's door, `store.setCleared(true)` in 3–7, set on each entry; close Vesk's door only with Twinsen outside); the
  text (`asy_register1/2`, `as_cell1–3`, Madam Rondo's `idle_sphero2`, `room_asylum` in text/map.js, STORY_BIBLE
  line 278, COMBAT line 529, CONNECTIONS_AUDIT's asylum rows). Grass grows to the front step (`keepClearNew` in
  island.js would clear it; left alone).

### CLOUD_ORDERS 5 and a new one · the user's corrections (4.11.2026)
- **Order 5 is the climb up to the asylum, not the tavern.** The user: "not to the tavern but up to the asylum; see how
  it is in the second game." The laptop is paving the way from the town up to the old fort's terrace and the
  asylum's front door as LBA2's climb north of the square (one straight paved way, dressed stone steps or ramp, stone
  retaining walls, capped posts, a railing). Request diff to follow (CLIMB-1).
- **New: no tree inside a house.** The user found a tree inside Twinsen's house. The laptop is checking every tree and
  plant against every building and room in every area and fixing them at the cause (TREES-1 to follow).

## OTRINGAL-1 · Fewer buildings, each a kind (CLOUD_ORDERS 3, "Cacophony") · the laptop, 4.11.2026
`requests/OTRINGAL-1.diff` (`zislands.js`: Otringal's layout, house kinds, `yardWall`, per-cell batching; `props-esmer.js`:
optional `balconyP`/`awningP`, defaults as before; applies clean on origin 1babed1; zislands.js and props-esmer.js
unchanged there since the agent's base fdad24e).
- **52 → 28 registered buildings.** The cargo yard's wall (the original's body 146, 20 lengths 1.34 m thick, which
  our size rule had made into 18 arcaded house shells and two barges) is a wall again: a stone footing, plaster, a
  tiled band and coping, stone piers with brass knobs at its open corners; the same colliders.
- **Merges:** the high town's three slivers into one domed hall (a small square west of it, a lane north); two
  high-town houses into one flat two-storey house; two south-terrace houses into one long house; the lower town's two
  identical copies into the TRADING POST store; the hotel's neighbour and the high town's store off the walls they
  shared. One 2 m box on the high town's rim dropped.
- **Kinds:** warehouses by the harbour and the yard (dressed stone, a wide door, a hoist, flat roofs); stores
  TRADING POST and MARKET (the island's word list); civic halls with cream domes; houses with flat roofs and parapets,
  awnings on six, balconies on three. Domes 24 → 10 (the Grand Hall, the hotel, the bar and four others keep theirs
  for the silhouette). Crate stacks and barrels in the yard. Every door's front kept clear.
- **Unchanged:** the bar `house (-42.2, -0.4)` and the hotel `house (-15.4, -10.2)` (place, size, facing, doors, FIT);
  `R.shutDoors` 31 → 26 and `R.peopleSpots` (10) from the doors as before; every other island identical (objects,
  meshes, triangles, colliders, FIT, doors, spots, samples, POIs compared).
- **Draw calls and triangles** (SwiftShader, 1280×720 Medium, eight play-camera views): every view down, e.g. the pad
  37 → 35 calls (340.7k → 332.6k triangles), the plaza 35 → 31, the harbour 27 → 22, the lower town 30 → 26
  (291k → 242k). Otringal's pieces are batched per 48 m cell (`S.cellBatch`), so a rare wall colour no longer makes one
  island-wide batch drawn from everywhere.
- Checked: `tests/zislands.mjs` PASS 13/13; by input the bar's and the hotel's doors lead in; worldfit's scan on
  Otringal finds nothing (small overlaps 129 → 60).
- Left: the high town and the south terrace are not on the landing's walkable area (silhouette and dressing there);
  Otringal's random dressing is reshuffled (a bench near the arrival view); the yard wall could take a gate arch;
  WORLD_SIMILARITY's objects score for Otringal not re-run; real-GPU timing not measured.

## JUMP-CAPE-1 · Twinsen's tunic in the jump · the laptop, 4.11.2026 (the user: "when Twinsen jumps the tunic looks strange at the arms")
Pictured in lookdev (Twinsen, jumpPrep / jump 0.1 and 0.3 / fall, four sides): the robed jump (rig.js, `j.skirt`) puts
the arms out to the sides for balance (`armOut 0.7`, arms −1.3/−1.1); Twinsen's cape sides are tied to the arms
(WA-16, outfit 'lba'), so they were pulled into flat wings from the body to the wrists, their dark undersides showing.
`requests/JUMP-CAPE-1.diff` (`engine/rig.js`, `game/characters.js`; applies alone on origin):
- `rig.capeArms` (set for looks with outfit 'lba': Twinsen); in the jump and the fall his arms stay in and a little
  forward, elbows bent (arms −0.7/−0.6 up, −0.5 falling, elbows −1.0, armOut 0.2); the landing reach keeps them in
  (armOut 0.25 instead of 0.75). Other robed characters as before.
- After (the same lookdev frames): the cape keeps hanging and folds forward with the arms; no wings. Not run: the
  animation tests (a pose-number change only); worth a look in play and in anim-polish when you merge.

## The laptop's status for the new cloud session (4.11.2026)
**Waiting to be applied** (each checked with `git apply --check` on a fresh worktree of origin d9c1c89, alone and all
five in this order): `ISO-CLOSE-1` → `HARBOUR-1` → `ASYLUM-2` → `OTRINGAL-1` → `JUMP-CAPE-1`.
- ISO-CLOSE-1 keys the rooms' zoom to Camera distance (near 11 m, medium 12.5, far 14); with Medium now the default
  (674f42e) the big rooms open at 12.5 m.
- HARBOUR-1 and ASYLUM-2: the full tests on the newest base are still to rerun on the laptop when it is quiet
  (chapter1, opening, shops; lba1rooms, transitions, asylum); they passed on the agents' bases.
- ASYLUM-2's story part is yours (its "For the cloud" list).

**In progress on the laptop:** CLIMB-1 (order 5 as corrected: the paved climb to the asylum), TREES-1 (no tree or
plant inside any building or room, the user's find in Twinsen's house).

**Still to do on the laptop:** order 2 (real-GPU checks: the playthrough chain 01–14 and 14-shell, the asylum's frame
time with ASYLUM-1's lids and ASYLUM-2's dressing, the skies' pictures) once the laptop is quiet; order 6 (Zeelich
closer to LBA2's: the hub, Baldino's side, the spaceport deck; Otringal's part partly done by OTRINGAL-1).

**Waiting on the user:** W-1's pictures (Float Harbor and its people; W-2 waits); ZEELICH-1 item 4 (Celebration's
summit: a crater, a lava glow or the trail, if still wanted).

**Expansion branch:** the base game's merge into `expansion/ballastra` (aborted on the laptop on 3.11: conflicts in
`story/citizens.js` and `story/zeelife.js`, the story's files) is yours.

## The cloud applied the five · and ASYLUM-2's story part (the new cloud session, 4.11.2026)
Branch `ccr-c1c2c4b9-dep6ed` (from ccr-adf00ea7-37ebl3 5f7e611): `ISO-CLOSE-1` → `HARBOUR-1` → `ASYLUM-2` → `OTRINGAL-1`
→ `JUMP-CAPE-1` applied clean in that order, a commit each. Settings' Camera distance hint (`set_h_cd`) now names the big
rooms' view too.
- **Checked on the applied five (SwiftShader):** asylum, lba1rooms, transitions, chapter1, opening PASS; zislands one
  FAIL ("Knartas → back to Zeelich, beside its pad: no prompt"), compared against the base below.
- **ASYLUM-2's story part** (`src/game/story/hostel.js`, `text/hostel.js`), on your handles, nothing of the place moved:
  - People on `R.npcSpots` every chapter: Foreman Ordo (ztri1), Mama Pufa the cook (zmole2), Zizi (zbee1), Tellem (ztri2),
    Gorro (zmole1, the hint: "something in the store sings"), Old Kesso (oku, sitting on the bench), Wix asleep in the
    lower bunk (zbee2: no talk, a Listen). Lines by phase: chapters 1–2, 3–7 (uneasy), 8 (the hostel takes people in),
    9 on. The cook's soup heals once a visit. NPCs now take `y` (the floor where floors lie over each other) and
    `pin` (held there: 'sit', and a new rig pose 'sleep').
  - Vesk's two guards on guard1 (Quetch) / guard2 (Grobo), chapters 1–2 after the prologue only; LBA1's nurse posts,
    the trooper and both dogs removed (`lba1EnemyDefs`; lba1rooms expects 2; purposes' conch check uses the arena's dog).
  - Finds (flags `hs_`): the humming crate (pocket set held: kit2 `hums()`; chapters 1–2) → Vesk's office key; his door
    (`Unlock` from the corridor at cell (42, 31.3)) → the notebook (three lines: FunFrock's plans, "pipe fittings", the
    readings) and the strongbox (20 kashes); the Council's plaque and the cell plaque are looks. From chapter 3:
    `store.setCleared(true)`, the hum off, his door open (shut only with Twinsen outside).
  - Text: the register, Madam Rondo's line, `room_asylum` = "Workers' Hostel (old asylum)", STORY_BIBLE, COMBAT,
    CONNECTIONS_AUDIT.
  - Not done: chapter 8's shelter as a mechanic (the workers' lines only; `story/shelters.js` untouched); grass to the
    front step (left, as you said).

## TREES-1 · No tree, bush or grass inside a building · the laptop, 5.11.2026 (the user: "there's a tree inside Twinsen's house; send an agent that checks no tree stands in a house")
The tree the user saw: a random tall tree at (−52.25, 83.67), trunk 0.83 m inside Twinsen's house, its crown through the
thatch by the chimney; two random bushes in his north and west walls. Cause: world.js `okSpot` kept the scatter out of the
square's ring only; no house further out was kept clear. A probe (every tree, palm, bush, shrub, pine, nectar tree, grass,
flower and tulip against every building's walls, crown reach measured on the sculpts at its scale; 43 interiors' potted
plants) found 384 cases → 0:
- Citadel: 5 trees (Twinsen's, wing2 ×3, the water house), 10 bushes (Twinsen's ×2, museum ×3, stone house ×2, baggage
  hall ×2, one up through the spaceport footbridge), 354 grass/flowers/tulips in house floors (100 in Twinsen's).
- Desert: 4 shrubs (Kesh houses 2 and 3, S40, the condenser hall). Hamalayi: 1 pine into Lhar's third house.
- Zeelich's islands (the original's layout objects): Otringal 2, Knartas 3, Platform 2, the Nectar Orchard 2 (press house
  and store). Zeelich itself, Mosquibee, Celebration, Under-gas, the Lift Dock, the Old Watch: none.
`requests/TREES-1.diff` (applies alone on origin ebcc06bf; **apply it before CLIMB-1**):
- `world.js`: a keep-clear round every house, the asylum's block-house and the spaceport footbridge; a tree/palm/bush is
  dropped (shrunk to nothing, no collider) when its trunk is nearer a wall than its crown's reach (0.15 m slack for trees,
  0.1 for bushes, so the original's tree by the harbour wing stays); grass, flowers, tulips whose foot is in a floor go,
  those at a wall's foot stay. All after the random draws: every other plant keeps its place.
- `spaceport.js`: `BRIDGE` exported. `desert.js`: shrubs instanced after the old places, filtered against the FIT registry
  and the condenser hall. `hamalayi.js`: pines kept their widest tier's reach from each house's eaves.
- `zislands.js` `cutPlants`: a layout tree/bush/plant/nectar tree that reaches > 0.15 m into a house or tower, or up into
  a deck, draws nothing and gets no collider (its colour is still drawn: the island's random sequence is unchanged).
  7 of about 460 cut.
- Draw calls unchanged at four spots round Twinsen's house (238/315/160/130), triangles −1 to −2 %; Citadel's leaf batch
  186 → 171, live grass/flowers 2846 → 2492. `assets/bake.bin` needs no rebuild (no plant design changed).
- Checked on ebcc06bf + TREES-1 (SwiftShader): the probe 0 cases; zislands, house, chapter1 PASS (also worldfit on the
  old base: only the known "house nbr: door overlaps window").
- Found in passing (not in this diff, ASYLUM-2's, the laptop will fix it): one potted plant in the hostel stands in a wall
  collider (room point (2.25, −22.11), floor 2.17).

## CLIMB-1 · The paved climb up to the asylum · the laptop, 5.11.2026 (CLOUD_ORDERS 5, the user's correction: "up to the asylum, look how it is in the second game")
As LBA2's 31_game_bugstreet_north (its b29 capped posts, its rails at z −28): one straight paved way from the square to
the hostel's front door, the ground heights unchanged. `requests/CLIMB-1.diff` (`lba1places.js`, `world.js`; **applies
after TREES-1**, on origin ebcc06bf; the two only shared world.js's import line and the grass filter, both kept):
- The ramp (world.js PATHS[0], square (−42, −4) → fork (−34, −36), 3.1 m): the town's cobbles instead of dirt, granite
  kerbs like the streets; past the stone house's yard (a 3–4 m drop) a dressed-stone retaining wall with a cream coping,
  capped posts every ~3 m and a teal iron railing.
- `ASYLUM_STEPS`: straight on from the fork, (−33.0, −37.2) at ~9.5 m → (−31.5, −47.5) at the terrace's 15.9 m: 27
  sandstone steps, 2.6 m clear, risers 0.23–0.25 m (the first 0.34), cheek walls with coping, capped posts at the foot,
  half way and the top, railings where the ground beside falls more than 1.2 m; a 1.5 m landing level with the terrace.
  The old 1 m stair is gone. Clear of the water main's legs, the stump's clover and the stone house's upper door.
- The terrace, paved from the stair's top to the fort's south wall (ASYLUM-2's portico), a railing on a plinth along the
  cliff edge. Scatter cleared in the masonry and on the paving (after the draws); the cliff rocks the stair passes
  through dropped whole (126 of 10 366 triangles), every rock still a closed solid.
- 4 merged meshes + 1 instanced kerb mesh, 3 casting shadows (the old stair: 6 meshes). Draw calls at four spots
  71→76, 76→75, 100→99, 173→171; shadow calls −3 each.
- Checked on ebcc06bf + CLIMB-1 (SwiftShader): lba1rooms 8/8 (its walk from the plateau now goes round by the fork and
  up the new stair, in by the front door), asylum 10/10, chapter1 23/23; rocks.mjs PASS on the old base.
- Changed for the player: from the plateau (−40, −46) there is no more scramble straight up the ledge onto the terrace;
  the way is the stair. Left: the town's kerb ring round the square still crosses the ramp's mouth as a low line; no sign
  boards (would need text: yours if you want one).

### TREES-1 and CLIMB-1 · Applied (the cloud, 5.11.2026, ccr-c1c2c4b9-dep6ed → ccr-adf00ea7-37ebl3)
In that order, clean, a commit each, on f2f9bbc. Checked (SwiftShader): chapter1, lba1rooms, asylum, house, rocks,
transitions PASS. The stair's sign: none added (the hostel's own sign tops the climb; R11). The hostel's potted plant
in a wall collider: yours, as you said.
Also from the cloud since (not world art, for your base): out of a door he lands 1 m further out where that ground is
open and level (`Game.doorStep`, main.js; the street spots the story gives are unchanged); journey films for the ends of
chapters 2 and 8 (the ship's landing) and chapter 10's glider menu (the parked gliders fly: `network.js gliderSpot`).

### USER-ASKS of 2.11 · where each stands (the cloud, 5.11.2026)
1. Shops you can buy in: done (SHOPS-1, `story/shops.js`: Bazoo, the pharmacy, the ticket office, Pippa).
2. The Esmer trading house: done (SHOPS-1: Sefa at its door; Tobb's rest stop, Odile's and Tobb's lines, WA-15b's purpose).
3. The lighthouse's door in the air: the headland falls ~1.1 m in front of it; four stone steps now go up to the door
   (`lighthouse.js` LH_STEPS, `world.js` their stair colliders), walked by input; where no chapter opens it, a look
   says it is locked (`purposes.js` pp_lighthouse).
4. Gadgets earlier: done (EQUIP-2a/b: five new gadgets, Arthur's pocket set from chapter 2).
5. The old test failures: see the cloud's next note.

## ZEELICH-2 · Zeelich closer to LBA2's (CLOUD_ORDERS 6 / 10) · the laptop, 5.11.2026
Measured from LBA2's Otringal (the laptop's study maps, numbers only) against our play camera, the biggest gaps:
1. **Ground and rock:** LBA2's Otringal has no grass: neutral grey granite (k-means #51504a–#a8a196, lights #dbd3c9),
   pale lavender-grey paving (#d3ced9 / #afa5ad). Ours: green turf and violet cliffs; the hub one big lawn. Share in
   the play shots (original: green 5 %, violet 0 %, saturation 0.17): Otringal before green 4–34 %, violet 0.4–38 %,
   saturation 0.26–0.35 → after green 0–4.8 %, violet 0.8–4.7 %, saturation 0.14–0.24.
2. **Buildings:** LBA2's walls are taupe stucco (#9e9795–#baafac) with glass-block bands (#68a9ce on a dark joint) and
   teal glass; roofs low faceted octagonal caps, aqua (#78a1a7–#a1b9ba) or gold (#ab7945), a gold spike. Ours: cream
   and lilac, violet lattice windows, tall onion domes (violet, rose, orange, teal) under scalloped merlons.
3. **Wrong silhouettes on Otringal:** the size classifier drew the original's street lamps (body 1 ×15, heads
   floating 2.5 m up), the golden fan plant (18 ×13, as 3.8 m jars), the plaza's covered market (86–95), posters (29),
   planks (114/115/119) and house parts (12, 13, 48, 108) as terracotta jars; a mossy rock (8) as a crate, a flag (24)
   as a floating rock.
4. **Rails and plants:** LBA2 has grey posts with teal rails (body 5 ×90) and a hazard bar (50 ×16), street trees as
   square planters with a golden plume (52–54 ×24). Ours: wooden fences, dark green trees; the hub's puff trees pink.
5. Sky: Otringal already grey (ZEELICH-1-SKY); the hub's pink sky left (no original, and your ship-arrival films).
`requests/ZEELICH-2.diff` (`props-esmer.js`, `zeelich.js`, `zeelife.js`, `zislands.js`; applies alone on 189dfd4):
- `props-esmer.js`: a look switch `setLook`, on only while Otringal and the hub are built: `domeStack` an octagonal
  drum, a glass-block band and a low cap instead of the onion; `esmerBuilding` glass-block frieze and door frames, teal
  glass, a plain coping and a low hipped roof instead of merlons. New: `capParts`, `capSpike`, `capM`, `glassM`,
  `tealGlassM`, `archTiles`, `windowM`, `frondTree`, `goldPlant`, `railing`. Every other island draws as before.
- `zislands.js`: `OTR_LBA2` (palette, ground, rock, paving, rails) and the body map `OTR_SHAPE`/`otrShape` in
  `STYLE.otringal`; `buildIsland` wraps `buildIsland0` to switch the look; `turfRock` grass → granite (`graniteTex`);
  new kinds `frond`, `goldplant`, `canopy`, `poster`, `planks`, `annex`, `drum` (body 48), rails in `fence`; the lamp
  case covers body 1; TREES-1's `cutPlants` covers the new plants.
- `zeelich.js` (the hub): the same houses, places, sizes, doors and roles in stucco, glass-block bands, teal glass,
  octagonal drums with aqua or gold caps (the council's gold), coping instead of merlons, steep caps on the minarets;
  the gateway a glass-block arch; ground pale granite instead of the lawn, grey-white cliff strata, lavender paving,
  grass in a few patches, golden puff trees. Left: the wooden pier, the dog yard, the mills, the depot, the sky.
- `zeelife.js`: Mr Pelleck's half re-tiled dome follows the cap (aqua new tiles over five of its eight faces).
- Otringal unchanged in play: objects 548, shut doors 26, people spots 10, landmarks GRAND HALL and FOUNTAIN; door
  fronts as OTRINGAL-1 (only otringal-55--47 still blocked, as before).
- Draw calls (main + shadow) / triangles, same spots, before → after: hub port 78→77 / 516k→469k, street 122→128 /
  559k→512k, workshop 118→120, dock 191→192, mills 72→73, depot 93→93 (triangles −7 to −9 %); Otringal pad 61→54 /
  1.02M→822k, plaza 139→139 / 1.14M→1.01M, harbour 122→120 / 612k→420k, the other five ±2 calls.
- Checked (SwiftShader): zislands, doorcull, island-people PASS; worldfit only the known Citadel "house nbr: door
  overlaps window" (the same on the base). zeelich-life 37/38: the one FAIL is "the street argues about the council"
  (chapter 9): Pelleck's first talk now opens the petition (`text/ch9.js` "With a petition…") instead of his tilers
  line; ZEELICH-2 touches no text or story, but the laptop's base run of that test stopped at a 300 s wait under load
  before that check, so the base verdict is not measured: yours to look at. containers: no check failed, the run did
  not finish (a Windows path bug in the test's `URL.pathname` for player.js, then a page-load timeout under load).
- Pictures (chapter 3 on: **not shown to the user**, ask first): `docs/future/world/ZEELICH-2/sheet-compare-hub.jpg`,
  `sheet-compare-otr.jpg` (before left, after right, 6 hub and 8 Otringal spots, play camera).

## GPU-7 · The real-GPU check of the cloud's changes (CLOUD_ORDERS 7) · the laptop, 5.11.2026 · report only, nothing fixed
Measured on 0b0393b (game code = 189dfd4): the installed Chrome 156, headed, fresh profile; ANGLE AMD Radeon Vega 8
(D3D11), real GPU, GPU timer working (0 disjoint); fullscreen 1366×768, dpr 1; Medium, Auto off, full resolution,
MSAA, Camera Follow at Medium; plugged in (AC) 100 % at start and end; no other test running. Chapter 2 reached by a
save and `nextChapter` (as tests/asylum.mjs), the hostel in its chapter 1–2 phase: the store full, Quetch and Grobo on
it. Each spot: 5 s settle, 10 s measured (~565 frames), two passes (pass 1 / pass 2):
| spot | frame mean / p95 / p99 ms | draw calls | triangles | GPU ms p50 / p95 | CPU submit p50 |
|---|---|---|---|---|---|
| Twinsen's house (ref) | 17.6 / 18.2 / 18.5 | 55 | 219k | 9.6 / 12.4 | 2.5 |
| Citadel square (ref) | 17.7 / 18.2 / 18.4 | 136 / 147 | 589k / 598k | 10.3 / 16.2 | 6.5 / 6.9 |
| Hostel dormitory | 17.6 / 18.2 / 18.5 | 78 | 135k | 10.7 / 14.6 · 9.7 / 11.0 | 3.5 |
| Hostel mess | 17.8 / 18.3 / 18.5 | 129 | 178k | 10.1 / 13.2 | 5.2 |
| Vesk's store | 17.7 / 18.2 / 18.5 | 63 | 149k | 9.4 / 13.1 | 2.9 |
- Every spot holds the display's refresh (frames 17.6–17.8 ms, the refresh measured 17.5–17.8): no hostel spot costs
  more than the square. The mess is the heaviest by calls (129, 35 of them in the shadow pass) but below the square in
  triangles and GPU time. One frame over 33 ms in all ten windows (36 ms, mess pass 2), none over 50. No page or
  console errors. Shader programs 148 → 150 on the hostel's first visit.
- **The store's view:** about 40 % of the frame is black void below the store's floor at the iso view's edge
  (`GPU-7/hostel-store.jpg`): the laptop's (ASYLUM-2), taken into order 8.
- **Doors (Follow, walked out holding ArrowUp so `Game.doorStep` runs):** at the swap the camera is ~2.2 m behind and
  2.1 m above his head (~43° down), easing out to its normal ~2.9 m back, 2.0 m up (~35°) within 0.3 s of the picture
  showing, always straight behind him; never over his head (before: ~4.3 m up, 1.3 m back). All three moved the full
  1 m.
  - Twinsen's house: (−44.75, 77.2) → (−43.75, 77.2); lands in the front garden facing the white picket fence 1.5–2 m
    ahead, the path to his right: his first view is a fence (`door-house-full-3s.jpg`); the picture shows 0.58 s after
    the swap (the shops 0.30 s); the door's lamp post big in the corner.
  - Bazoo's (museum): → (−64.05, 41.1), open grass facing the square: fine.
  - Pharmacy: → (−56.05, −8.8), a wedge of dirt edged by kerbs, the square ahead: not blocked, a little boxed in.
- **Sendell's call, the wide shot** (`sendell-wide-a.jpg`): Twinsen left, side-on, the whole fan and the flash ring
  centre-right, reads clearly. Weakening it: the top-right quarter is black void (the lens looks over the chamber's
  wall), the tallest crystals' tops cut by the frame's top, a mite in the bottom-right corner; on screen only 1.8 → 2.6 s
  before the first line's face shot. Frame times there: mean 17.7, p99 18.5, GPU 8.8 / 10.0 ms; 60 calls, 213k tris.
- Noticed, NOT VERIFIED (chapter 2 reached by `nextChapter`, not by play): the prologue cave's four mites ("well")
  still count as present and idle in chapter 2 (simulation 1.4–2.1 ms at the hostel, small).
- Pictures in `docs/future/world/GPU-7/` (chapters 1–2): hostel-dorm, hostel-mess, hostel-store, door-house-full-3s,
  door-bazoo-full-3s, door-pharmacy-full-3s, sendell-wide-a.

### GPU-7 · the cloud's answer (5.11.2026)
- Sendell's wide shot: fixed (a24f3e0): lower (1.6 m) and wider (64°), looking a little higher; from two standing spots
  the cave's walls now stand behind the fan, no void beside the wall; the whole fan, the ring, Twinsen on the left.
  The dark band at the frame's top is the cave's own dark (no ceiling drawn). The mite stays (the cave's life).
- The door step at Twinsen's house (facing his fence 1.5–2 m on): kept; it is his garden, the path is a step to the
  right, and the camera is behind him, which was the point. The pharmacy's kerbed wedge: kept.
- The prologue's mites present in chapter 2: by design (the well's cave keeps its living mites if he goes back; the
  ones he beat stay down); their 1.4–2.1 ms is noted, not acted on.
- The store's void: yours (order 8), as you wrote.

### ZEELICH-2 · Applied (the cloud, 5.11.2026, 0def3e4)
Applied clean on the night's base. Checked (SwiftShader): zislands 13/13, island-people 65/65; on the
expansion: oren-bands, oren-first PASS. doorcull: no verdict here (40 min on SwiftShader under load; yours PASS on the
GPU). zeelich-life's council check, your question: it failed the same before ZEELICH-2; the cause is the test, not
the game: Old Grumm says "the **Wannies** say stop" (the user's naming), the check still looked for "moles say stop".
The check fixed; Pelleck's and Snuff's lines were there all along. Pictures stay in `docs/future/world/ZEELICH-2/`
(chapter 3 on: not shown to the user).

## CHEST-1 · Funfrock's chest at the depot: open, but closed on top · the laptop, 5.11.2026 (the user: "the crate is open but closed on top", a photo)
`chestGeo` (island.js) built the chest's body as one solid box (1.24 × 0.66 × 0.76) with the three iron straps as full
0.7 × 0.8 boxes over it, so when the lid swings up (prologue `chest` → `W.chest.open`, lid −1.9 rad) the body under it
stays closed on top. `requests/CHEST-1.diff` (island.js only; applies alone on ed7e9ae): the body is an open box, four
walls (0.07 thick) and a floor at 0.12 m, the same outer size, material and collider; the straps run down the front and
back only (0.025 thick plates). Only the depot chest uses `chestGeo`. Syntax checked; the game boots with it and the
chest opens (openT 1). Pictures: inconclusive. The laptop's before run shows the lid up over a closed top; the after
run's frames came out unlit (no light, no ground textures) on the heavily loaded laptop, which a geometry change can't
cause, so look at it by eye when you apply (open the chest from the depot path).

**CHEST-1 · the cloud's answer (5.11):** applied as your diff (`island.js chestGeo` only). Checked by picture in
SwiftShader from three sides, closed and open: closed it looks as before; open, the lid stands up over an open box
with its floor and walls showing, the straps on the front and back only. Nothing else changed.
## FIDGET-1 · People (and Twinsen) standing with their hands up · the laptop, 5.11.2026 (the user: "it's strange that the characters stand and raise their hands, it isn't natural, Twinsen too")
Cause: rig.js's idle fidgets. Every idle rig picks one of five fidgets every 5–12 s, all equally likely; two of them
raise the arms: 3, a head scratch (right arm −2.4 rad), and 4, a stretch with both arms straight up (−2.7 rad). So 40 %
of fidgets were hands in the air, and in any group someone always had them up. `requests/FIDGET-1.diff` (rig.js only;
applies alone on origin):
- The pick is weighted to the quiet ones: a look round 35 %, the weight shifted 30 %, a glance up 20 %, a scratch 12 %,
  3 % nothing. The stretch only once the rig has stood idle 30 s without a break (`_idleT0`, reset when idle stops for
  0.5 s), and once in that wait (`_stretched`). 7–14 s between fidgets (was 5–12).
- The scratch: the hand to the back of the head, the elbow out (arm −2.1, elbow −2.1). The stretch: the hands behind
  the head (arms −2.0, elbows −1.7), no longer both arms straight up.
- Tests that measure poses still switch the fidgets off with `fidgetT = 99` (anim-polish, npc-feet): unchanged. Syntax
  checked; not run in the game yet (worth a look at the square's crowd when you merge).

## ASYLUM-3 · The hostel's leftovers (CLOUD_ORDERS 8) and the user's "the stairs disappear", "this area is full of bugs" · the laptop, 5.11.2026
`requests/ASYLUM-3.diff` (asylumhostel.js, lba1places.js, lba1room.js; applies alone on 4373bc5). The causes:
- **Stairs and landings vanish (the user's photos):** lba1room.js put each 16-cell block's leftover ceilings into one lid,
  floors Twinsen stands on included; on the west landing or the flight the beams beside him on his sight line cut that
  lid, so his own floor faded and he stood in black (drawn floor 2.17 under him at 6.5). Now floors he can stand on (a
  slab over nothing, a slope) are lids of their own, and the lid under his feet is never cut. Drawn floor = his feet
  along the flight (6.5 / 6.07 / 5.2 / 4.34).
- **Steps as bare floating tops:** slope cells were drawn as their top only. Now with side faces; a step hanging less
  than 1.74 m over the floor is filled down to it, with a collider (seeThrough, noStand). Every LBA1 room; bumaze has
  no slope cells, so only the asylum changes.
- **Beams floating over the cells and corridor:** LBA1's ceiling beams rested on pillars the camera-side cut removes;
  `opts.clear` (lba1room.js) clears x 44–63, z 30–62 from height 17 up for the asylum.
- **Floors ending in black at the grid's edge, the store's void:** a two-cell parapet in the wall stone, with a
  collider, where a floor reaches the camera-side edge with no wall; `opts.footing` carries the outer camera-side walls
  of the lowest levels 9 m down into the dark (one mesh, +1 draw call, +564 tris). A fade, not a fill: the black share
  at the store 56 % → 53.5 %.
- **Undressed rooms:** LBA1's west room is the kitchen's larder (pantry shelves, jars, sacks, a work table, barrels
  under the flight, a lamp); the loft over the dorm the linen loft (blankets, a washing line of sheets, a chest, a
  basket); the landing at 9 a bench and a plant. New builders `sack`, `pantryShelf`, `linenShelf`.
- Order 8's items: the common-room pot was half inside LBA1's cabinet collider: moved in front of it (all 8 pots now
  clear); the front step's grass: none on CLIMB-1's paving, no change; Kesso (worker4, sit) sat 0.49 m over the bench
  with his knees through the table: `y = Y + 0.08`; Wix (sleeper): hands 4 cm in the west wall, moved 0.12 cell toward
  his feet (his lower half still 0.25 m in the mattress: raising him lifts his head off the pillow).
- Lids 18 → 26 (meshes 44 → 60); not measured on the GPU. Checked (SwiftShader): asylum 12/12, lba1rooms 8/8 (bumaze
  included). Pictures (chapters 1–2): `docs/future/world/ASYLUM-3/` cmp-west-flight, cmp-corridor-cells, cmp-store-south
  (before left, after right).

**ASYLUM-3 · the cloud's answer (5.11):** applied as your diff (asylumhostel.js, lba1places.js, lba1room.js), clean on
da44a727 + your branch. Checked (SwiftShader): asylum PASS, lba1rooms 8/8; your before/after pictures looked at. Published.

## CLIMB-2 · The climb to the asylum, the user's photos and CLOUD_ORDERS 16 (a)(b)(d) · the laptop, 5.11.2026
The user: "not good" (the ramp's paving folding into a pit by its wall), "a gap" at the top, "make a turn toward the door's
forecourt, now it leads into a wall", "going up the stairs the camera sticks to Twinsen", "the stones flicker".
`requests/CLIMB-2.diff` (lba1places.js, world.js; applies alone on 54af45d, your `climbRampFill` kept as is:
`islandHeight` = `climbGround(climbRampFill(houseFlats(islandHeight0)))`):
- **The ramp:** the ground inside its corridor (`climbGround`) is one smooth incline, level across within 1.8 m of the
  centre line (never falling as it climbs), easing back to the natural ground by 2.6 m; physics walks the same
  heightfield the cobbles are painted on. Cross-fall within 1.25 m of the centre ≤ 0.05 m (was up to 2.2 m at the
  wall). The scatter still reads the old ground there (`scatterGround`): nothing else moves. A base course 8 cm proud at
  the wall's foot; kerbs on the highest ground under them.
- **The stair, square to the portico (16 a):** 23 steps due north from (−32.6, −35.0) to a landing on the low shelf
  (~14.5 m, centred (−32.6, −45.2)), then 6 steps due east (x −31.3 → −29.0) onto the forecourt, the door ahead; risers
  ~0.24 (≤ 0.26). No post between the stair top and the forecourt. New step texture: joints across the stair only (no
  stripes), a 3 cm nosing, a darker riser.
- **The trench (16 b):** gone: the terrace filled level both sides of the second flight behind dressed walls with coping
  and railing; the south fill stops at TERRACE_RAIL.
- **The camera (16 d):** he arrives ~5 m before the fort wall; Follow's arm there 8.70–8.72 m. Up both flights the arm
  stays full (8.75 m). Railings and posts are `camSkip` (each wall a camera-solid stone collider plus a rail collider the
  camera ignores), cheek colliders in shorter pieces; camera.js unchanged (a stair-steps-as-ground change was tried and
  reverted: the steps never pulled it in). **Left for you:** going DOWN the first flight he faces south with the fort wall
  and portico 6–10 m behind: arm min 4.05 m, 61/157 frames under 6 m (by camera.js's design); and the slow recovery
  after an in-cut on stairs generally (0.6 s hold, ≤ 2.5 m/s; Zeelich's lift-dock stair going down: min 3.28 m).
- **The flicker (the user's photo at the fort's west gate): yours, island.js:** the gatehouse's extruded arch leaves a
  strip under the arched opening whose top lies exactly at ground level (15.88), coplanar with the ground in the passage
  round (−41.6, −65.6), x −43.1…−38.7: start the hole below the ground or lower that strip ~5 cm. None of the climb's own
  surfaces overlaps another within 2 cm (the fill's edge kept 15 cm over the ground; a kerb at 2 cm seated higher).
  Next to the climb, not the laptop's: a pipeline footing at (−34.7, −44.6) 2 cm from the ground.
- Checked on the final code (SwiftShader): the walk by input square → ramp → landing → second flight → front door in and
  out → back to the square; lba1rooms 8/8, asylum 10/10, chapter1 23/23, rocks 8/8 (509 placements, deterministic).
  Draw calls main/shadow: ramp wall 78/56, below 79/43, top 111/61, landing 99/59, climbing 101/58.
- Left: a 15 cm lip where the north fill meets the terrace reads as a thin dark seam; order 15 (the ramp's likeness to
  LBA2's) not started. Pictures (chapters 1–2): `docs/future/world/CLIMB-2/` cmp-1-ramp-wall, cmp-stair-door, climbing.

## PLAY-3 · The user's playtest photos: the project office's door and light, the "green ring on a stick" · the laptop, 5.11.2026
`requests/PLAY-3.diff` (environment.js, interiors.js, windowviews.js, world.js, main.js; applies alone on the newest
origin; one conflict with your own "Zoé's scene is too brightly lit" in buildProjOffice resolved to this version, which
covers it):
- **ROOM-LIGHT ("the room is too bright, it doesn't make sense with a lamp"):** `environment.js update()` applied the full
  island sun (2.6) and sky fill (1.42) in every interior; `setInterior(on, light)` now takes a room's own `{ sun, hemi }`
  (`R.indoor`, passed by `main.js enterRoom`; rooms without it unchanged). Project office `{ sun: 0.22, hemi: 0.42 }`:
  each hanging lamp has its own light (22, range 6.5) at the lamp, the four sconces small cyan pools, the lampless corner
  light gone, the hologram unchanged. Control room `{ sun: 0.4, hemi: 0.6 }` (its one window looks into the shaft). Mean
  grey: project office 80 → 62 (a lamp pool 85 → 101, the lampless corner 87 → 39), control room 85 → 64; with only 2
  lights (Low, battery) dim but readable. The water office (two windows, a street door) left as it was.
- **The door onto a wall ("it looks like there's a wall there"):** the project office's and the control room's doors are
  the real exits to the station yard, but their view was `outsideView('fort')`, a stone corridor painted 5 cm behind the
  opening. New `station` tile in the window-view atlas (`windowviews.js`, free slot 7): the yard in daylight (the white
  and teal block with portholes and a dish, a cyan lamp post, concrete slabs, the hazard line); both doors use it; each
  door's small cyan light is a warm daylight spill.
- **TARGET-1 (the photo of "a green ring on a stick"):** the Whispering Cliffs' ball target (world.js, (−69, −29)): a
  bare brown pole up to the middle, a thick emissive torus and a pale disc, the torus turned green once hit. Now a straw
  target board (red and cream rings round a gold middle, both sides) with a thin glowing hoop on its rim (orange, green
  once hit), hung on a pin on a post braced by two stays (the post stops at the board's foot); the board rocks on the
  pin. Position, `W.target`, collider and hit radius unchanged; static parts merged (draw calls 3 → 4).
- **Hands up (the user: "they stand and raise their hands… it came down after a minute"):** not reproduced beyond the
  idle fidgets: in Athletic, up the asylum flight and stood 90 s, the arms went up six times, each a fidget ≤ 2.2 s
  (scratch, stretch): FIDGET-1 is the fix. Ruled out: slides and air states on the climb (1880 teleport spots, runs,
  jumps), `found` (3 s), `cheer` (1.6 s), scripted anims. **Found in passing (CLIMB-1's shape, maybe gone with CLIMB-2):**
  at (−29.5, −46.1), the steep ground outside the old flight's east cheek, he slides in place and after 1 s
  `actors.js:377` respawns him for a life, in the `fall` pose with the arms spread.
- Checked (SwiftShader): chapter1 PASS (with Zoé's segment in the project office), zoe-resume 5/5; camclear 14/14
  functional, 29/30 visual: the one is the cliffs' grid placement (−74, −50), the camera 0.149 m from the water main's
  pipe against 0.15 (no collider or camera volume added here; not compared with the base). Pictures (chapters 1–2):
  `docs/future/world/PLAY-3/` cmp-projoffice, cmp-projoffice-door, cmp-target-close-hit.

**CLIMB-2 and PLAY-3 · the cloud's answer (5.11 night):** both applied as your diffs. PLAY-3 over the cloud's own R.dim
(reverted: your `R.indoor` lighting covers it); the cloud keeps Zoé's harder guard (enemies.js Watcher notice/cool/speed/
glance, chapter1.js range 7.5, fov 0.82). The gate's flicker was already fixed (island.js: the hole starts 0.4 m down).
Tests queued (SwiftShader); results in HANDOFF.

## CHARS-1 · The Grobos' trunks and a pass over the cast · the laptop, 6.11.2026 (the user: "go over all the characters, mainly the elephants: their trunk doesn't look good")
**Not a diff file: branch `laptop/CHARS-1`** (one commit, b5ca51e, on 4154e08): 38 model files in `assets/poly/` are
single-line JSON, so the diff was 53 MB. Merge or cherry-pick it. Files: characters.js, rig.js (the trunk block only),
tools/blender/{lbapoly,cast_poly,baldino_poly}.py, art/characters/skeletons.json (3 trunk bones added for the 10
generic Grobos, nothing else changed), assets/poly (the 11 Grobos, 24 seam looks, vesk, zmole1, zmole2). Rebuilt with
the repo's own Blender scripts through a small stand-in bpy/mathutils (no Blender on the laptop), checked first by
rebuilding doran, guard and baldino from the old sources: same to 2.7 mm. `assets/bake.bin` untouched.
- **What was wrong (measured):** LBA2's Grobo (body 99, numbers only): the trunk leaves the face just below the eyes
  (0.72 H), arcs about 0.2 H out in front of the belly, hangs to the belt (0.29 H), about even thickness. Ours, the 10
  generic Grobos (doran, guard, vguardG, councilC, farmerC, yorna, pim, hesk, desertTrader, bram): four straight thin
  tubes (r 0.10 → 0.05) kinked at each join, two squashed balls like pipe clamps, a ball on the tip, hanging straight down
  against the belly, rigid to the head, clipping into the body up to 16 cm. Baldino: nine 10-sided rings joined
  straight (a fold where it turns down), a flat cut tip, height-only weights; it swayed 28° at the tip walking.
- **The fix:** one smooth tube for every Grobo (`lbapoly.trunk_loft`: a curve through the control points, the radius
  tapering on it, 10 sides, rings every 6.5 cm, three faint wrinkles, a rounded tip) with weights handed over along its
  length (`trunk_weights`: head → trunk0 → trunk1 → trunk2). Generic Grobos: the curve from `grobo_trunk()` (cast_poly.py)
  = `groboTrunk()` (characters.js, which places the bones on it; the build warns if they differ): out from the muzzle,
  over the belly 8.5 cm clear, to the belt with the tip flicked forward, r 0.125 → 0.064. Baldino: his own centre line
  on the smooth curve. rig.js: walk sway 0.35 → 0.21 per bone, each lower bone a little later (tip ~15–18°; Baldino 28.3
  → 17.6°), a small idle breathing curl, a lift while talking, forward/back rotation capped at +0.02 so it never swings
  into the belly. Clipping 0 for every Grobo in idle, walk and run (talk: 3.6 cm on pim, 0.3 on farmerC at the chin).
- **The pass over the cast** (all 55 looks, idle/walk/run/talk, ranked by how visible in play): 2. the waist seam on 24
  Quetch/Rabbibunny looks: the tunic top (torso bone) and skirt (hips bone) shared one ring, so walking opened a 3–5 cm
  gap and the skirt edge poked through the belt: one torso-to-hips hand-over for both and for the belt, buckle, bow and
  pouch (SEAM-1), tears 0 (≈1 cm left on tim, nell, lharWoman's hair). 3. Vesk's coat front: its violet strip spread to
  a 20 cm wedge at the hem in every stride (stretched 13–15×): it moves with the coat's centre line now (≤ 3.5×). 4. The
  moles (zmole1/2): sleeve and forearm 5–6 cm apart at the elbow running/talking: 0. Left: long robes and dresses
  stretch ~3× between the legs (cloth would need a redesign); Twinsen's cape (JUMP-CAPE, as designed); lharWoman's hair
  tail 3.3 cm in run; the Esmers' strong lean in walk.
- Cost: draw calls unchanged (the trunk is in the body mesh); +1,120 triangles in all (Baldino +440). Tests
  (SwiftShader): anim-polish, solidnpc, chapter1 PASS; npc-feet 2 FAIL in "residents in play" (foot slip, stops into
  standing), which the base also failed once: traced to FarCull putting the walkers on the far animation rate (lodN 8)
  differently from run to run; not settled, worth a run on your side.
- Pictures (Citadel's cast, chapters 1–2): `docs/future/world/CHARS-1/` (before above, after below).

## GLIDER-1 · Chapter 10's glider take-off, and the Hamalayi glider in the monastery wall (CLOUD_ORDERS 11, 14 g) · the laptop, 6.11.2026
`requests/GLIDER-1.diff` (story/network.js `decorate`, travelfilm.js `watchShot`; applies alone on the newest origin;
your glider body collider follows `gliderAt`, so it moves with them). Rays from the film's camera to the glider every
frame (78 take-off frames a place):
- **Citadel, 30 hidden:** pine #49 of the tree batch at (−56.6, −57.9), 2.6 m from the landing (15 frames), the rock
  shelf north of z −51 (14), grass (1). Parked glider landing + (5, −3) heading 0.6 → landing + (0, −7) = (−58, −67),
  heading 3.3: it runs south down the open field (the small turn west keeps it off a bush collider at (−57.4, −68.8)).
- **Desert Island, 17 hidden:** a notice board 4.7 m in front of the camera. (3318, −3) → (3316, −3), heading −π/2
  kept: 2 m toward the pier, the camera clear of the board.
- **Hamalayi, 2 hidden, and 14 (g):** the parked glider straddled the yard's east wall box (4343, −39.5), the south-east
  corner pillar, the gate wall and its lantern (the "frozen chest" is the icy trough by the east wall). (4342, −36),
  0.4 → (4337.5, −41.5), −0.3: inside the yard between the landing and the hall, its nose to the gate, touching nothing.
- **travelfilm.js:** when the 250 ms camera search ran out before trying the high spots, the fallback kept y = 0, under
  the ground (78/78 hidden on a slow machine): it now takes its height (`cam = high[1]; cam.y = max(B.y + cam.hi,
  ground + 3)`). Drop it if you want order 11 alone.
- Hidden frames before → after (full flights with Hesk aboard): Citadel 30 → 0 (mostly hidden 33 → 0, arrival 4 → 0),
  Desert Island 17 → 0 (11 → 0), Hamalayi 2 → 0 (9 → 0, arrival 13 → 1). No glider footprint cuts a collider at any of
  the three (the wheel and skid tips just under the ground). Hesk's spots, landings, text and flags unchanged; no tree
  removed; world.js unchanged.
- Checked (SwiftShader): chapter10 27/27, story-journeys 30/30. Left: the Hamalayi film still takes the high fallback
  camera (11 spots tried; reads clearly, villagers crowd the tail); the Citadel glider now sits on a path junction
  (−58, −66); Hesk 1.2 m from the Desert glider (was 0.4); the 250 ms camera budget is easily overrun under load, so the
  shot picked can differ by machine. Pictures: chapter 10, not for the user (the laptop keeps them).

## ROCK-13 · Desert Island's grey rock (CLOUD_ORDERS 13) · the laptop, 6.11.2026
`requests/ROCK-13.diff` (desert.js only; applies alone on the newest origin). Overhead at a fixed camera, the same
classifier as the original's study: grey share LBA2 23.5 % · ours before 4.7 % (mostly paving) · after 19.8 % (about
84 % of it); warm red-brown 2.9 % → 0.1 % (LBA2 0.5 %); grey median #877e7b (LBA2 #8c8782).
- **Why recolouring did little:** the terrain multiplies the vertex colour by `TX.cliff` (grey-violet), and `COL.rock`
  '#e0a080' made it reddish-brown; colorFn blended to rock only at smoothstep(0.8, 1.6, slope) while the texture showed
  rock from 1.0, so most rock pixels kept the sand colour; and rock lived only on faces steeper than 1.0, edge-on from
  above. The rock meshes carried Citadel's moss (olive here) and a pink instance colour.
- **The original's rock is not a steep-face material:** from its heightfield, grey is 15 % of the ground under 2 m,
  22 % at 2–4 m, 28–36 % at 4–8 m, 41–47 % above 8 m; 22 % even on flat ground.
- **Changed:** `COL.rock` linear (1.06, 1.1, 0.94), cancelling the texture's violet (`TX.cliff` shared with Citadel,
  untouched). New `rockAt(x, z, h, slope)` used by both colorFn and splatFn (colour and texture agree): the old rule
  everywhere, plus, away from places, tracks and paving, a lower slope threshold (0.5–0.95) and outcrop patches from a
  fixed sine noise lifted by height and slope (no random draws; a crisp edge near places). `dryRock()`: a cached clone of
  vegetation.js `rockGeometry` in dry grey, no moss. `placeRocks()`: about 87 scree rocks on steep grey slopes from their
  own `rng(4313)` after all other draws (nothing else moves), ≥ 5 m off tracks, 3 m off places and coast, `keshClear`,
  `inBuilding`-filtered, into the same three batches (under 1 m: the coarse sculpt). Old rocks keep spots and variants;
  instance colour '#e8a888' → '#ece6de'. Rock colliders 106 → 134 (seeThrough, none within 2.5 m of a door, NPC, spot,
  exit, search, trough or giver).
- **Cost (SwiftShader counts, not frame times):** draw calls unchanged in all five views (spawn 35/12, crater 29/4,
  east 47/12, north 91/10, overhead 167/11); triangles +4–18 % in play views, +20 % overhead. Vega 8 not measured.
- **Checked:** desert-life 30/0, residents 182/0, wizards 6/0, world-consistency 37/0, overlaps (desert) 0; chapter4 43
  passed then stopped at a save fixture the laptop copy lacks; lazyregions 1 FAIL (expects 11 Zeelich isles, the game has
  9 since DECLUTTER: not desert.js). worldscore desert 82.6 → 83.1.
- **Look by eye:** from the play camera the flat outcrops read as painted grey patches on the sand (as the original's
  are texture only; the relief comes from the scree), a few with a hard edge. If that reads wrong to you, lower the patch
  term near the play paths or soften `smoothstep(0.3, 0.5, rk)`. Soil fell 11.9 → 7.3 % (LBA2 14.4 %): shaded slope
  sand became rock. Outcrop bias 0.35 → 0.32 would add about 1 point of grey. Pictures: chapter 3+, not for the user
  (the laptop keeps them).

## CLIMB-15 · the Citadel climb's likeness to LBA2 (CLOUD_ORDERS 15) · the laptop, 6.11.2026
`requests/CLIMB-15.diff` (lba1places.js, world.js; applies alone on the newest origin e3385dd, and with POLISH-14).
Compared with LBA2's climb north of the square (heights from the original's island file, numbers only; our game rendered
at the reference picture's camera). Pictures (chapter 1, the user may see them): docs/future/world/CLIMB-15/.
- **Differences, largest first:** (1) LBA2 climbs in level terraces (0.4 → 4.2 → 5.9 → 7.5 → 9.2 m), each behind a sheer
  face, the ramps running along them; ours had shelves at nearly the same levels (6.1, 9.6 m) ending in soft grass and
  rock banks, so the ramp read as a paved strip on a hillside. (2) Posts: LBA2 four big capped posts (~1.1 × 1.0 m,
  1.6 m) at terrace corners only; ours 13 small ones every ~3 m. (3) Railings: LBA2's ramps have none; ours had teal
  balusters on the ramp's parapet. (4) The 5.5 m sheer face toward Bug Street with two posts: ours a soft bank.
  (5) Ramp 4.5 m wide in two ~21° legs vs ours 3.1 m at ~13° then the stair. (6) Faces slightly battered vs ours
  vertical with cream coping.
- **Fixed (1–3):** `CLIMB_SHELF`, `climbShelfWall`, `inShelf`: along the ramp's second leg the 9.6 m shelf's edge is a
  dressed retaining wall (coping level 9.73 m, 0.7–2.2 m over the paving, base course), turning due west 4.6 m along the
  shelf's face (a 3.5 m terrace face), capped posts at the corner and the return's end; behind them the shelf filled
  level in stone by CLIMB-2's rule (the fill's edge ≥ 15 cm over the ground). Terrain unchanged; the shelf still reached
  at the ramp's head. `climbPost` in LBA2's proportions (0.72 m shaft, 0.92 m cap, ~1.45 m), at corners and ends only;
  `climbFlight` posts lined up with the cheeks (the stair keeps 2.6 m), the two halfway posts gone; `climbRampWall` east
  parapet solid masonry 0.8 m, railing and in-between posts gone (camSkip still 1.1 m); `climbMasonry` box to x −44.5
  (scatter keeps out: the pine west of the stair's foot goes); world.js `dropRocks` for the climb from x −45.
- **Kept:** (5) as CLIMB-2 settled the corridor; (6) the town's coping; the stair's and terraces' teal railings where the
  ground falls over 1.2 m. Stump, pipe branch, stair, landing, forecourt untouched.
- **Checked (SwiftShader, on e3385dd + this):** overlaps PASS (25 areas), lba1rooms PASS (the walk up ASYLUM_STEPS),
  asylum PASS, chapter1 PASS, camclear 43/1 (only the old 0.149 m at (−74, −50)); walkers 36/1 as origin (marda_b2).
  By input: square → stair → shelf round the wall's end, shelf → mid-ramp, stair → landing → forecourt → square, all
  arrive; walking into the wall blocks, along it he never stands on it. Climb group 6 meshes before and after (no new
  calls), +1,172 triangles; Vega 8 not measured.
- **Left (next, if you agree):** (4) the face toward the square: a retaining wall at about z −21 from x −54 to the
  ramp's west kerb, top 6.06 m, with LBA2's two corner posts; first check what stands on that bank (a crate near
  (−45, −24), a fruit tree, flowers, the west street's ramp at x −55…−66). The shelf fill's top is wall stone (reads as a
  paved strip); paving or grass edging later.

## POLISH-14 · the polish passes' visual leftovers (CLOUD_ORDERS 14 a–f) · the laptop, 6.11.2026
`requests/POLISH-14.diff` (asylumhostel.js, tavcellar.js, town.js, walkrounds.js, world.js; applies alone on the newest
origin, and together with CLIMB-15). Pictures SwiftShader 960×540, Follow, Medium; chapter 1 places: docs/future/world/POLISH-14/ (b, d before | after).
- **(a) The hostel's north door, cream band:** the portico had colliders on its piers only, so the camera's clearance
  test saw air over the doorway; out of the door Follow stood inside the lintel's brick (3.6 m up, 0.4–0.8 m behind its
  face), and the near-cut showed the architrave's and pilasters' cream trim across the frame (worst when doorStep falls
  back to the door's own spot). One collider over the doorway from the opening's head up (`bottom: gy + oh`, noStand):
  he walks under it; the camera now stands in front of the portico (z −48.76, 3.9 m up), clean frame.
- **(b) The "lantern" at lower right out of a door** was the Joint Project heat post: it stood 1 m out from the door's
  spot along the house-middle → door line, 8–42° off the wall's normal on off-centre doors, 1.6–2 m out from the wall,
  just where Follow stands the first second out (inside the frame within 2.2–2.5 m of the lens on 7 of 9 street doors).
  Now each stands against its front wall (`HEAT_POST_OUT` 0.45 m from the wall, the wall's normal from `ry`), 1.45 m to
  the right of the way out or the first clear of `HEAT_POST_SIDES` (Twinsen's house and the shop take the fallback:
  pots, a barrel). After: no post within 4 m in frame on any of the 9 doors. brix_warm and marda_warm (walkrounds.js)
  follow their posts, on the post's far side from the door (doorDist 1.37 / 1.32 m). Pippa's stall post unchanged.
- **(c) The wizard tent's grass/bush in front of the camera:** not reproduced (Near/Medium/Far, rays from the lens and
  renders out of the door and on the approach from the east): no change. Three smallPool grass blades stand inside the
  tent's footprint, hidden by the cloth. If the user meets it again we need the way he walked.
- **(d) The tavern cellar's lower floor near-black:** the drop's bottom was one `MAT.flat('#121216')` plane. Now rubble
  with a little self-light (emissive 0.2, as the walls' tv_stone) round a ragged black hole under the railing's gap (the
  way down to the sewers' hall), clear of the broken rail. No light added (light pool and R.indoor untouched). Mean luma
  over the pit from the walkway 21 → 41 (pixels under 20: 81 % → 20 %), from the store 21 → 41.
- **(e) GL_INVALID_OPERATION:** SwiftShader only. Real GPU (Chrome, Vega 8, D3D11), boot → street → door in and out →
  tavern cellar: Medium 22,242 draws checked with getError, 0 errors; High 29,086 draws, 0. In SwiftShader all 307 come
  in boot: Game.drawArea (main.js ~931) renders the start room before the sun's shadow map exists, and three r180 binds
  the plain emptyTexture to null entries of a sampler2DShadow array (`directionalShadowMap[0]`). Harmless; if you want
  SwiftShader quiet, make the sun's shadow map before drawArea/drawPart. No change.
- **(f) The Citadel landing (−58, −60):** two scattered bushes had their colliders over the spot (one with the landing
  inside it). `GLIDER_LANDING`/`LANDING_CLEAR` 1.6 m + the bush's radius, filtered after the scatter (no draw moves).
  Nearest collider now a trunk 2.56 m off.
- **Checked (SwiftShader, on fda1fc5 + this):** camera-doors 30/30, overlaps PASS, asylum PASS, chapter1 23/0.
  Same as the origin baseline (not this diff): walkers 36/1 (marda_b2 not walkable), sewers-ways 31/2 (out of the Works
  door d 2.97, out on the stone-house terrace d 2.37, both > 2.2: doorStep?), camclear 43/1 (the old 0.149 m at
  (−74, −50)). travel: the chapter-2 Doran check fails on origin too (doranAtPort false, 26/1), not this diff.

## GPU-9 · order 2's remainder (CLOUD_ORDERS 9): the playthrough chain on the real GPU · the laptop, 6.11.2026
Measured on origin 3bcc70a (src as e3385dd), installed Chrome headed, ANGLE D3D11 on the AMD Radeon Vega 8, through
tests/lib/seg.mjs (a local copy whose boot.mjs launches that Chrome instead of SwiftShader), the segments chained through
real saves (KEEP → LOAD), ASSIST=1.
- **tests/playthrough 01–14: all 14 ran every step to its end ("the segment ran every step to its end" PASS in each),
  0 deaths, 0 Retries.** ISO fight assists: 04 project-valves 1 (drone1, drone2, gdog1), 06 zeelich 1 (zdrone2, zguard1,
  zgdog1; the depot fight by input to 3 HP), 13 network 2 (ndrone0; nclone, nsentry); none elsewhere. 14-shell: the
  pylons from their plates by input (3/3), Vesk's coil by input (3/3), the epilogue "The console sparks over Vesk",
  "The End", Keep Exploring. Game time per segment 7–280 s; wall time about 37 min for the chain.
- The only FAIL in every segment is the resource check's favicon.ico 404 from the laptop's plain file server, not the
  game. No pageerror, no GL warning on the GPU.
- The skies' pictures (SKY, WANNIE) on the same GPU, play camera: Otringal reads right (overcast grey, pale lavender
  sea, contrast kept). The Wannies' platform reads wrong: flat pale cloud slabs cross the island at walking height, its
  cloud sea is pink where the style asks amber, and ground, walls and props sink into one dark sepia. A fix is in work
  on the laptop (SKY-9, its own request). Pictures are chapter 3+: kept on the laptop.

## SKY-9 · the Wannies' platform under its sky (CLOUD_ORDERS 9, SKY/WANNIE pictures: "fix what reads wrong") · the laptop, 6.11.2026
`requests/SKY-9.diff` (zislands.js, zeelich.js; applies alone on the newest origin). Real GPU (Vega 8, headed Chrome),
the same 8 play-camera spots before and after; chapter 3+, pictures kept on the laptop.
- **White slabs through the island:** the hero walks at y 3.0–4.4; the island's edges sit at 0.2–1.3 m, and its narrow
  channels between the terraces are sea cells (terrain −9). The cloud planes (−3.9 solid, −1.4, −0.3) and 54 puffs 5–11 m
  tall at −0.8…1.0 filled them 3–5 m under the paths: a pale, near-untextured patch (one billow tile 140 m) read as a
  floor, cut hard by the straight channel walls; some puff billows reached their texture's border (square edges).
  Fix: `cloudYOf(S)` / per-island `CY`; the platform `cloudDrop: 4.5` (planes at −8.4/−5.9/−4.8, the solid one above the
  −9 bed, capped), `R.cloudY` and the plinths, barges, skiffs, footings and stilts follow `CY` (other islands keep −1.4);
  `cloudRep: 2`, `cloudOp [1, 0.85, 0.3]`, `puffScale: 0.6`. zeelich.js `puffTex` fades out before its border (all
  islands' puffs, edges only; Otringal's frame stats unchanged ±1). Walkable ground unchanged (under −0.35 is blocked).
- **Pink sea although the tint is amber:** `cloudTex` paints a lavender-pink base (#d0a0cc) and lavender shadows; the
  amber tint multiplied them into dusty rose; and the platform had no `S.rock`, so its cliffs took Zeelich's pink rock.
  Fix: a greyscale variant of `cloudTex(solid, grey)` and `puffTex(grey)` (own cache key), the platform `cloudGrey: true`
  with tint ['#7a5030', '#b07a48', '#d09a60']; `rock '#b0a498'`, `rockHi '#c4b8a8'`.
- **One murky sepia:** fog #b09a80, sun #ffcc98 2.4, hemi sky #ccb8a0, ground #94704c 1.6 (the light from below the
  gas), grade 0.88, gradeTint [1.02, 0.985, 0.94]. Mean luma 65 → 73, darkest 5 % 11 → 24, saturation 185 → 167.
  Lamps stay lit (dim place under the gas). The mine's boulders still read dark (their own material, untouched).
- **Checked on the GPU:** zislands 13/13, zeelich-life 38/38, overlaps (ONLY=isle_platform) 1/1 + 2/2 visual; only
  FAIL in each the local server's favicon 404. Draw calls, triangles, textures unchanged (142/117/108/118 calls on the
  four spots); median frame 15–21 ms both, within run-to-run noise; +2 greyscale 512² cloud canvases, +1 128² puff.
- **Left:** where the gas meets the stepped channel walls the cut is still hard, now 5–6 m under the paths and amber.

## FOCUS-1 · Test Lab finding: losing focus no longer reads as background play (the user: "send it") · the laptop, 6.11.2026
Test Lab quick check on the installed desktop app 0.48.0 (build 330), Vega 8, plugged in, own test profile: 7/8 pass
(cold launch, new game → play, street walk 56.9 fps, door, magic ball, arena fight 56.2 fps, save → restart → load).
- **Failed twice in a row (the run and one reproduce):** pause-focus-fullscreen, "losing focus: the game draws in the
  background": after `BrowserWindow.blur()` and 800 ms the game reports `background false, play` (expected true, play).
  Esc pause/resume, focus back, leaving and re-entering fullscreen all pass. The same test passed on 0.43.3 (31.10).
- **Likely cause (not verified):** BG-STUCK-1 (35aaa16, main.js ~2406) checks once a second while in the background
  and calls `foreground()` when `!document.hidden && document.hasFocus()`. A programmatic blur in fullscreen leaves no
  other window in front, so `hasFocus()` may still be true and the game returns to full rate within the test's 800 ms.
  If so, a real switch to another program is fine and the test needs changing (mine, Test Lab); if `hasFocus()` is
  true even with another program in front, the background cap never holds (battery cost). Your call which; I can
  test it with a real second window if you want it measured.
- Also seen (light, structure-first): new game → play 3 frames over 50 ms (worst 89 ms, +5 geometries in that frame),
  the arena fight 2 (worst 141 ms). Tonight's requests are not in this build.
- Run: `lba3/tools/testlab/runs/2026-11-06T08-45-29-quick/` (local only, not committed).

## MUSIC-19 · music by place (CLOUD_ORDERS 19, and 23f's bar and terminal) · the laptop, 6.11.2026
Diff: `requests/MUSIC-19.diff` (against 7b5d5b0b, `git apply --check` clean). Every room and region listed with its mood
(ROOM_MUSIC, R.music, setOutdoorArea, story cues). The pieces that did not fit, set against how LBA1/LBA2 scored such
places (descriptions only, nothing transcribed):

| place | was | now | why |
|---|---|---|---|
| asylum | stealth (facility minus brass) | `asylum`: its own piece, **The Old Asylum** (score only) | LBA1 gives the asylum its own sparse tense piece; ours was the fort's mix going on through the door |
| cellar | none (the town playlist, full) | home | a home's cellar keeps the home piece |
| tavern | home | village | an inn is the town's lively register, not the family theme |
| tavcellar, bazoo, pharmacy, ticket, baggage | home | office (the square through the walls) | shops and public halls keep the town's everyday tune indoors |
| tralucave | home | cave (The Well) | caves are slow dark ambient |
| terminal (Citadel) | home | island | a departure hall goes on with the region's travel music |
| otrbar | home | zeelich (full) | 23f: a lively bar, on Zeelich, not Citadel's Home |
| zterminal, otrhotel | home | `zeelich_in` (new MOODS entry, as office: gain 0.6, low-pass 1100) | 23f: Zeelich heard through the walls |

- **The Old Asylum** (`tools/music/tracks/asylum.py`, original, written by hand): an uneasy music-box waltz, B minor,
  3/4, 76 bpm, chamber colours, no brass or drums; B (D major) for the hostel lived in, C for Vesk's store with the
  Entity cell once, bent. Intro 9.5 s, loop 1:35 (from the score). `lint.py` passes all 17 tracks (with a stub `mido`).
  **Not rendered:** the laptop has no FluidSynth, FFmpeg, soundfont or the Python packages, and I installed nothing.
  The wiring keeps it safe: `MOODS.asylum = { track: 'asylum', alt: 'facility_stealth' }` and a one-line `_alt()` in
  `target()` plays `alt` while the track is missing from the manifest; after `build.py asylum` it plays with no code
  change. **For the cloud:** render it (MUSIC.md setup, then `build.py asylum`), ~1.7 MB at the shipped rate.
- celtemple dropped from my diff: REVIEW-ZEELICH (d7b5ecce) already moved it to 'cave'.
- **Tests (SwiftShader, local copies):** audio 6/6, music 26/26, asylum 10/10, chapter1 23/23; a mood check entering
  each remapped room and reading `music.state()` 19/19 (order 19) and 4/4 on the rebased diff (zterminal and otrhotel
  `zeelich_in` with low-pass 1100, otrbar `zeelich` full, office unchanged). menus (2 settings checks + a reload timeout)
  and timing (60 fps cap on a 144 Hz screen) fail the same on origin.
- **Left, no better piece yet:** Bersimon's tent and the School of Magic (Home; a mystical piece is a candidate), the
  Hamalayi outdoors (The Well), the Desert (the island pieces).

## REVIEW-UNDER · the underground from the player's camera (CLOUD_ORDERS 18c) · the laptop, 6.11.2026
Diff: `requests/REVIEW-UNDER.diff` (underground.js only; against c6d7554a, `git apply --check` clean). Walked on the
Vega 8 (headed Chrome, 1280×720) along playthrough 14's route from save-13; every c3 room uses the fixed iso room camera,
so no Follow-camera faults here. Pictures (chapter 11+) stay on the laptop.

| spot (world) | what a player sees | status |
|---|---|---|
| c3shaft, the tunnel mouth to the deep hall (1805, −6.2) | the tunnel reads blocked: cave-wall boulders ~1 m into the opening, side rocks to ±0.55 m of its middle | fixed |
| c3shaft, crystal rock (1804.4, −3.9) | a crystal rock on the cable-trench grating, on the walk | fixed: smaller (0.32), at the bore's foot beside the grating |
| c3deep, the left wall's near end (1889, 8.5, y 6) | boulders hang past the wall's end over the room (floating rocks) | fixed |
| c3deep, the drain sign (1908.3, 3.6) | the plate edge-on to the camera: a bare black pole | fixed: turned +π/4 to face the camera |
| c3deep, the heat exchanger's top (1902.8, −2.4) | a solid brass sheet over the fins reads as a wooden lid | fixed: a brass frame, the fins show |
| c3gallery, the entrance tunnel (1987, 5) and far arch (2008.6, −10) | the same boulder overhang into the doorways | fixed (same rule) |
| c3deep, under the catwalk (1892, −7) | Twinsen hard to see under the deck | for the cloud, only if a player is meant to walk there |
| c3sendell, c3core | nothing crooked or floating | — |

- How: `rockWallRun` gets `ends` and `inset` (boulders kept inside a run where it meets a doorway or a free end);
  `caveShell` sets `ends` beside every opening; the deep hall's runs `inset` 0.35; the gallery's four runs `ends`.
- Tests: overlaps (c3shaft, c3deep, c3gallery, c3sendell, c3core) 5/5; playthrough 14-shell from save-13 every step,
  0 deaths, 0 assists. chapter3.mjs 13 checks passed, then its own fixed 240 s reload wait timed out on SwiftShader
  (the test ignores BOOT_TIMEOUT; not run on origin). No lights added; draw calls not measured.

## REVIEW-HAMALAYI · the Hamalayi from the player's camera (CLOUD_ORDERS 18b) · the laptop, 6.11.2026
Diff: `requests/REVIEW-HAMALAYI.diff` (hamalayi.js `buildHamalayiSteps` only; against 1f6f848c, `git apply --check`
clean). Walked on the Vega 8 (headed Chrome, 1280×720, Follow, Medium) along playthrough 09–10 from save-08/09, outdoor
spots also turned 180°. Pictures (chapter 6+) stay on the laptop. Local coords; world = local x + 4300.

| spot | what a player sees | status |
|---|---|---|
| the old gate (−6, 62), the ledge start (23, −2.6) | pines beside the walks, boughs over the walk: the Follow camera sits in a tree (a green blade fills the frame) | fixed (pines dropped where boughs reach a walk: `hw + 0.3 + 1.5 × scale`) |
| the lift foot | one pine still blocks the view when you come from the ledge (not the story path) | left |
| the trail cairns (all three runs) | cairns in the middle of the walk | fixed: 2.9 m out, square to each run |
| the lift top → the monastery gate (28, −33.1) | a snow drift on the walk, Twinsen wades through | fixed: drift removed |
| the frozen waterfall behind Lhar (−10, −15.5) | a free-standing ice column 8–12 m before the cliff, walked through | fixed: it pours off a rock spur back to the cliff; spur and ice block walking, both `seeThrough` for the camera (a solid spur pulled the camera to 2.26 m at (−11.9, −14.3); now 9.5 as origin). Pim's kite target unchanged |
| the tree bridge's north end (−6, 33.8) | Twinsen stands on a scattered rock | fixed: rocks kept off the walks |
| the gorge's south bank, camera (4293, y 8, 59) | camera in the old gate's lintel, a white slab fills the frame | **for the cloud (camera)** |
| the tree bridge's north end, camera (4285, y 8.2, 35.4) | camera against the cliff, the frame all rock | **for the cloud (camera)** |
| Lhar by the falls, hero (4291.5, −7.0) turned south | camera on his shoulder against the balcony house (the same on origin, with or without the new colliders) | **for the cloud (camera)** |
| the observatory door, camera (4287, y 34.9, −64.8) turning to the descent | the door canopy fills the frame | **for the cloud (camera)** |
| the heat station (4320, −17) | camera behind the cabinet's snowy top, Twinsen an x-ray outline | **for the cloud (camera)** |
| the observatory inside | a square 13 × 13 m hall inside a round drum | not fixed: a layout question for you |
| Lhar houses 3 and 5 (4302.15, 14.49, −3.06), (4305.92, 14.53, 18.11) | overlaps flags 2 flicker spots under the roofs | pre-existing (same values on origin) |

- No new draws from the island's random sequence: every other pine, rock and prop stays put; the dressing log empty.
- Tests: playthrough 09-pass (from save-08) every step, 0 deaths, the kite step passes; 10-observatory pass; chapter7
  9/9; overlaps obsv pass, hamalayi the 2 pre-existing spots. chapter6.mjs did not boot within its fixed 240 s on
  SwiftShader (09-pass covers it). Not measured: draw calls (+4 batched rock meshes, fewer pine/rock instances; no lights).
- Not done: order 14(g), the chapter-10 glider at the monastery (story/network.js).

## CLIMB-17 · the climb's foot straight, and CLIMB-21 · the slide trap past the east flight (CLOUD_ORDERS 17, 21) · the laptop, 6.11.2026
Diff: `requests/CLIMB-17.diff` (lba1places.js, world.js; against 913f8f55, `git apply --check` clean). Pictures:
`docs/future/world/CLIMB-17/` (before|after, Follow, Medium; chapter 1, sent to the user).
- **17:** the ramp's last ~8 m runs on the flight's axis x −32.6 straight into the first step: the shelf's wall on its
  west, the parapet on its east, kerbs in line with the cheeks and posts. The round FOOT apron is a square landing
  3.4 m wide, level at 9.45 (CLIMB_FOOT_Y); the dark notch at the left cheek's foot is filled by the shelf's fill.
  **Deviation:** one bend onto the axis does not fit: the stone house's back corner (−31.8, −25.9), eave z −26.6, sits
  0.8 m east of the axis, so a diagonal leg puts its parapet on the eaves. The leg keeps PATHS[0]'s line to a landing at
  the yard's edge, CLIMB_JOG (x −36.85…−30.98, z −29.6…−27.64), square to the flight: leg, landing, straight, flight.
  New CLIMB_JOG/STRAIGHT/FOOT, `climbShelfRows`, `inShelf`, `climbDropRock`, `climbParapet` (sheared, plumb ends);
  world.js `climbGround` + `climbNorth`; CLIMB_BOX x1 −30.6 → −29.0. Scatter unchanged (terrain hash outside the climb
  identical; collider changes only inside the flight's box). Risers 0.223–0.228. Triangles 22,782 → 25,194, same 6 meshes.
- **21:** not fixed on origin (e8154735 only added the order). Before: standing at (−28.85, −45.7) or walking the east
  flight at z −45.15 / −46.0 slid, stuck and `respawnFromFall` fired every time. New `climbTopThreshold` (from
  `climbTerraceFill`): the top step carries on level (yt 15.93) as a stone threshold, row by row, to where the
  forecourt is within 4 cm; +20 colliders. After: 5 stand-and-turn spots and the flight both ways: no slide, no
  teleport, 0 hp lost. Left: a thin dark line at the threshold's east edge, its grey reads apart from the cobbles.
- **Tests:** on the agent's base f3001989: lba1rooms 8/8, asylum 12/12, rocks 10/10, world-consistency 37/37, overlaps
  26/26, chapter1 23/23; input walks and 12 A* legs arrive. Rebased on 913f8f55: world-consistency 37/37,
  lba1rooms 8/8; rocks timed out (my 900 s cap on SwiftShader, no verdict), not rerun.
- The straight is steeper (~0.44 rise per m); the shelf's fill covers ~7 × 6 m of the old ramp's west half.

## ASYLUM-20 · the asylum against LBA1's own files (CLOUD_ORDERS 20) · the laptop, 7.11.2026
Diff: `requests/ASYLUM-20.diff` (lba1room.js, lba1places.js, props.js one `TEX.stone` palette `cell`, tests/asylum.mjs; against
ae665e73, `git apply --check` clean). LBA1's scene 0 rendered with its own bricks and palette (study only, never in the
repo) and compared at the user's two spots (the west landing, the loft by the clothes line) and the store; layout z =
grid z − 1. Pictures (ours only, the room's camera, Vega 8): `docs/future/world/ASYLUM-20/pair-{landing,loft,store,upper}.jpg`.

| difference | LBA1 | ours before | after |
|---|---|---|---|
| wall tone | teal-grey brick, lit edges; camera-left #716e6d (L≈110), camera-right #424b4b (L≈72) | warm brown-grey L 51–60 | teal-grey brick (stone `cell`), sun lower: right L 69–73, left L 91–95 |
| floor | dark flagstones L≈71–80, darker than the walls | cream checker L 95, brighter than the walls | L 77, under the lit walls |
| walks, landings, stairs | teal grates #709398 (1217 teal tops) | pale mint plaster | grate texture on the teal tops |
| wall tops | brick caps / dark brown trim | cream plaster (read as floor) | stone caps |
| maroon posts and beams | open lattice girders, pyramid caps, two floodlights per tall post | solid maroon brick | 142 cells as lattice girders with caps; floodlights on arms; colliders kept |
| lattice windows (loft wall x 13) | black diamond lattice in a dark frame | black slabs | lattice over each 2×6 window |
| the boiler (store, x 9–11, z 51–53) | dark green boiler, copper bands and dome, gauge | 2.6 m brick tower | a boiler; its cells hidden, colliders kept |
| drums under the west stair | 11 pale drums, red caps | grey blocks | 11 drums |
| lamps | teal domes, white rim, over a white disc | a green dome on a 2.6 m rod (read as a floor lamp) | teal dome, white rim, cable to the ceiling, 1.5 m over its table |
| pipes | round teal-grey runs, bends, red valves | boxes at bends and valves, a doubled run as a ladder, ends in mid-air | 270 cells: bends and valves joined, one pipe for the doubled run, 20 free ends into the wall, 3 flanged |
| past a floor's edge | black | 9 m footing fading to black | kept (the user disliked black voids) |
| camera-side walls | 4–5 cells high | 2-cell rim | kept (colliders, the hero hidden) |

- New `lba1room.js` options, all off by default (bumaze unchanged): `hidden`, `girders`, `grate`, `capWalls`,
  `grilles`, `lowLamps`, `pipeCol`; `R.fittings` also lists pipe ends, girders, hidden cells. `R.indoor.sunDir`
  (0.34, 0.6, 0.72), sideGain 3.6. tests/asylum.mjs: the "a wall hides him" spot (9, 1, 49) → (8.5, 1, 49.5) (the
  round boiler covers 43 % at the old spot, 74 % at the new).
- **Tests** (SwiftShader): asylum 12/12, lba1rooms 8/8, overlaps 26/26 (before the test-spot move), chapter1 23/23,
  world-consistency 37/37, walkers 36/1 (the known marda_b2; not rerun on origin). By input on the GPU: the west
  stair both ways, landing → loft, round the boiler, store → service hall, past the drums; the boiler stops him; the
  lattice window holds (x ≤ 12.46); re-entry ×2, resize, quality low → high → medium without errors. One walk run
  crashed the page once and not again (cause not found).
- **Cost (Vega 8, 1280×720, Medium):** draw calls +9…+25 per spot (lid meshes 68 → 91: grate, girder and grille are
  new materials per lid; mergeable if needed), triangles ±2 %, +4 small canvas textures. Frame time not claimed: the
  laptop was heavily loaded (medians swung 17–72 ms).
- **Left:** the upper walk's FunFrock desk, stool and statue, the round wall lamps, the valve block by the landing, a
  teal box at (1, 21–22, 12–13), a grey block at (1, 9–11, 33) still cell blocks; no stair handrails, valve wheels,
  vent, fan or porthole; combat visibility not checked.

## DECISION · Zeelich's main island is a new city (the user, 7.11.2026) · the laptop
The user, after "Zeelich again doesn't look like it at all": **"you can say it is a new place on Zeelich, another
city we were not in in the previous game."** So the terminal island (the spaceport deck, the Esmer street, the mills,
the depot, the drill platform) stays our own layout. There is no original to match its geography or landmarks
(WORLD_SIMILARITY.md "n/a" stands, the pack's rule: a new place gets no invented original counterpart).
**What it must have instead: Zeelich's identity, as LBA2's own Zeelich islands show it**:
- the Esmer architecture's shapes;
- the palette and materials;
- the cloud sea and the light;
- the vegetation;
- the inhabitants (Esmer, Quetch);
- the everyday interactions.

The new city should read as one more town of the same world beside Otringal, Celebration and Knartas, which are built
on the original's numbers. The laptop will measure what makes those islands read as Zeelich (palette, building
silhouettes and proportions, roof and wall shapes, plant kinds and density, light and fog), score the city against
them with the pack's rubric minus the geography and landmark parts, and send the art changes as requests. Layout,
paths, doors and story spots stay as they are unless a request says otherwise.

## WORLDSCORE-7.11 · every world against its original again, on the current game (6b97f4a5+) · the laptop, 7.11.2026
`tools/worldscore.mjs` (SwiftShader, `?allregions`; a local copy with the test boot's Playwright path). Height = the
mean absolute difference (MAE) after one uniform lift, against the original's own spread.

| place | score | coast IoU | lift | height MAE / spread | objects orig → ours |
|---|---|---|---|---|---|
| Citadel Island | 82.7 (was 84.9) | 0.908 | +1.79 m | 0.91 / 4.55 m | 270 → 600 |
| Desert Island | 83.1 (was 85.0) | 0.976 | 0.01 | 0.40 / 1.85 | 315 → 239 |
| Otringal | 90.0 (was 92.6) | 1.0 | 0 | 0.11 / 6.51 | 555 → 399 |
| Knartas | 94.7 | 1.0 | 0 | 0.18 / 1.09 | 263 → 278 |
| Mosquibee | 84.5 | 1.0 | 0 | 0.41 / 6.04 | 145 → 94 |
| Celebration | 91.1 | 1.0 | 0 | 0.00 / 3.09 | 24 → 40 |
| Under Celebration | 91.3 | 1.0 | 0 | 0.04 / 6.20 | 61 → 118 |
| The Platform | 89.4 | 0.992 | 0 | 0.25 / 2.27 | 168 → 136 |
| The Lift Dock | 37.7 (partial; decks are its ground) | — | — | — | 53 → 89 |
| The Hamalayi (LBA1) | 27.4 (ours by design) | | | | |
| Zeelich's terminal island | n/a: a new city (the user's DECISION above) | | | | |

- Height gaps worth a look (ground lower than the original, after the lift): Mosquibee ~7.0 m over ~135 m² at
  (2545.4, 1828.3) and ~6.8 m at (2584.8, 1818.7); the Platform ~5.9–6.0 m at (3908.8, 1825.7) and (3905.7, 1814.8);
  Under Celebration ~3.9 m at (3227.2, 1761.8). Small areas (0.6 points each at most).
- Citadel's and Desert Island's drops (−2.2 / −1.9) and Otringal's (−2.6) come from the objects and landmark parts as
  the world changed since the last run, not from the ground: coast and height are as before. The ranked list per
  place is in the run's JSON (kept on the laptop; can be committed if wanted).

## ASYLUM-21 · the black slot by the foreman's office, the clone statues (the user's photo, 7.11.2026) · the laptop
Diff: `requests/ASYLUM-21.diff` (lba1room.js, lba1places.js, asylumhostel.js; against da4c68b6, which has
ASYLUM-20; `git apply --check` clean). Picture: `docs/future/world/ASYLUM-21/pair-a21-office.jpg` (the photo's spot).
The user: "the asylum still has a strange bug, and some props stand in strange places" (photo: Twinsen on a narrow
wall top beside a deep black slot under the upper floor).
- **Cause:** the foreman's office (LBA1's upper office, floor at layout y 9 over x 48–62, z 19–28, nothing under
  it). Its east wall, x 63, z 20–28 (the grid's last column on the camera's side), is solid in LBA1 from y 1 to 10,
  its top one cell over the office floor. Our camera-side cut measured the rim from the wall's own floor (y 2) and cut
  it to y 4: the space under the office slab showed as a black slot, and the cut top was a ledge reachable from the
  corridor's east end.
- **Fix:** `lba1room.js opts.meetFloors` (on for the asylum): a camera-side wall whose inner neighbour is a floor slab
  two or more cells above the cut keeps its rim over that floor, as LBA1 builds it. 12 columns change (x 63, z 19–28;
  x 36, z 2–3). Colliders follow the cells: the ledge is gone. By input on the GPU: along the office's east side both
  ways, standing and turning in the south-east corner (stays at y 10), the corridor's east end now leads up the stair;
  the 2.2 m drop off the office's south edge is LBA1's own.
- **The statues:** the two suits on white plinths are `asylumhostel.js`'s clone statues used as coat stands (the
  twelve-years joke); one stood on the floor's very edge over the slot. Both now stand against the east wall (x 61.4,
  z 26.5 and 27.75), facing the room. The green-headed figure on the rug is a story NPC (`R.npcSpots`): unchanged.
- **Tests:** lba1rooms 8/8, overlaps 26/26, chapter1 23/23; asylum.mjs 11/12 twice: its 12th step (save → quit →
  Continue, the find and the cut-away kept) timed out reopening the game on the loaded laptop both times (ASYLUM-20
  passed it 12/12; this change does not touch saving): **unverified here, please rerun.**
- **Left (not story logic):** the maroon gantry beam (x 55, y 17–18, z 25–40) still brick boxes, reading as a bench on
  the office floor; LBA1's FunFrock statue cells at the office's back wall (x 57–59, y 10–15, z 20–21) still a block.

## REVIEW-DESERT-ART · Desert Island's art (CLOUD_ORDERS 22) · the laptop, 7.11.2026
Diff: `requests/REVIEW-DESERT-ART.diff` (desert.js, condenser.js, wizards.js; against 422f8ee2, `git apply --check` clean).
Pictures (chapter 4+) stay on the laptop. Checked on the Vega 8 (headed Chrome, Follow, Medium).

| spot | what a player sees | status |
|---|---|---|
| (a) SCHOOL OF MAGIC sign | mirrored from the bridge (confirmed on the GPU) | fixed: a dark-wood board with a one-sided painted face each side; both read |
| (b) project ferry | an open lathe bowl (white sliver), the teal box floating on it, a cyan disc under the hull | fixed: closed hull with its own deck rim, plank deck, teal strake, 0.5 m lower; the cabin on the deck; no disc |
| (c) hangar tarp | 10.5 × 6.2 m past the floor rim, his legs inside its edge at boarding | fixed: 9 × 5 m, 0.9 m toward the nose, flat over the wing to its tips; he is clear of it where he boards |
| (d) School interior wall (x 5588.2) | two textures in one plane (four coplanar faces at x 5587.09) | fixed: block sides against the walls run 0.3 m into them, the classroom block starts at the dais (lx 29); overlaps 0 coplanar in school |
| (e) pump pipe | walked through at the joint | fixed: two thin colliders (noStand, seeThrough) over the low run and the joint; he is pushed out; still passes under the high end by the tank |
| (f) the Bù maze tones | on the GPU wall tops read light, floors dark; the inverted reading not reproduced | **left**: walls and floors share one `top` material, differing only by vertex colour; brighten up-faces at y > 1.2, darken at y < 1.0 in `buildLba1Temple` |
| (g) School pits' boulders | shiny black boulders | fixed: matte (0.97), flat-shaded, three rock tones #9a8f80 #8a8072 #a89c8a |
| (h) pupils reuse Lulu and Tim | — | dropped for DRESS-1 (not verified that it varies them) |

- Tests (GPU copy): overlaps (desert, school, condB, zeelich) 4/4, world-consistency 37/37, wizards 6/6, desert-life
  30/30, zislands 13/13, playthrough 07-dig and 08-steam every step, 0 deaths (the glider board works with the tarp).
  Only fail: the local server's favicon 404. Not rerun on origin (nothing failed).
- Draw calls (main/shadow, one frame, 1280×720): sign 32/5 = 32/5 (+142 tris), ferry 23/5 =, school wall 38/23 →
  39/24 and pits 29/29 → 30/30 (the matte rock is its own merged mesh), tarp 37/24 =. Frame times not measured.

## REVIEW-ZEELICH-ART · Zeelich's art (CLOUD_ORDERS 23) · the laptop, 7.11.2026
Diff: `requests/REVIEW-ZEELICH-ART.diff` (zeelich.js, walkrounds.js; against 422f8ee2, `git apply --check` clean).

| spot | what a player sees | status |
|---|---|---|
| (a) Esmer looks | — | dropped for DRESS-1, except: **Kira takes the existing `lharWoman` model instead of `councilB` (Councillor Sela's)** in walkrounds.js (roster + `ZEELICH_BODY`); not framed in a picture |
| (b) Otringal bar door behind the back-bar | confirmed: he enters hidden behind the back-bar at z 2.85 | **left**: move the door to about z 6 in front of the bar (the plant at (LX+0.6, 6.4) moves, the stools' clearance checked) |
| (c) the dog yard's gate | confirmed: 2 m in front of the gate is the council house's roof (y 11.3) | **left**: shift the gap west to about local x −32 (the lane between houses 0 and 1) and `R.dogYard.gate` with it; tests/purposes.mjs walks to `gate + 2.2 z`, which today points into the house |
| (d) mooring ropes in the air | the story hides the ferry, the ropes were in the island's group | fixed: the ropes are in the ferry's group and hide with it (pier 72/207 → 70/199 calls) |
| (e) Celebration's summit plaza | folds, a bench on the slope (terrain splat `paveAt` r 10 at (2,1), slope < 0.7) | **left** |

- Tests: zeelich-life 38/38, playthrough 06-zeelich 0 deaths (1 ISO assist, logged); 12-council not run.

## REVIEW-CITADEL-ART · Citadel's art follow-ups (CLOUD_ORDERS 26) · the laptop, 7.11.2026
Diff: `requests/REVIEW-CITADEL-ART.diff` (island.js, lba1places.js `climbTerraceFill` only, town.js, tralucave.js,
world.js; against e434cf38, `git apply --check` clean). Pictures (Follow, Medium, SwiftShader; chapter 1–2):
`docs/future/world/REVIEW-CITADEL-ART/pair-{a3,b1,b2,c2,d1}.jpg`.

| spot | what a player saw | status |
|---|---|---|
| (a) the pit north of the hostel stair's landing | your collider, nothing drawn: a dark crevice; from it the bank north rose 1.27 in 1 and he slid back 54 frames | fixed: an `M.wall` block drawn at the collider's height (15.29), 3 cm into the landing's north wall, its west face on the landing's; a 0.32 m step (15.61, own collider 7 cm back over the block's) up to the terrace |
| (b) Bug Street's foot | a dirt pocket before the pharmacy and baggage-claim doors; three kerb runs in a stepped knot by the bench | fixed: one paved forecourt to both doors (`BUG_FOOT`, `bugFootDist` in the splat), curb stones and the square's ring skipped inside it, one new kerb from Bug Street's north kerb to the north house's front |
| (c) the Water Office yard | the first shelf's knoll ran ~2 m past the office's front; its rock face a block heap left of the door (`buildCliffRocks` on that slope) | tidied: `waterKnoll` caps the ground in `KNOLL_BOX` [−68.6, 15.2, −62.5, 21.4] to the office's front line; the scatter and rocks decide on the old ground (`KNOLL_OFF`, as CLIMB_BOX), so no random draw moves |
| (d) Tralu's cave door | out onto a ledge facing the sea, drops west and north; the way back an unreadable gap | fixed: `PLATEAU_STAIR` 12 steps west from the landing (12.92) to the slope (≈15.4), sheared cheeks with copings (noStand, seeThrough colliders); the exit on the stair's axis facing up it (a = −π/2) |
| (e) Bersimon's tent music | Home | left: no existing mood fits (`well` = the sewer under his trapdoor, `office` = the square through walls, `island` = outdoors); he and the School of Magic each want a piece of their own |

- Walks (scripted, physics, keys and the planner): (a) onto the block, stand, turn, east to its end, west, back, up
  the step to the terrace: no slide, 0 respawns. (d) out of the cave, up the steps (13.35 → 15.18), turn, down; the
  planner from the plateau path into the door and back: 0 slides, 0 respawns.
- Tests (SwiftShader): world-consistency 37/0, overlaps 1 + 25 visual, rocks 8/0 + 2 visual (509 placements kept,
  deterministic), walkers 37/0 (marda_b2 did not occur), lba1rooms 8/0, chapter1 23/0; sewers-ways 29 pass + the two
  known out-of-door fails (2.97/2.37), its last section not reached (a reload timed out); **camclear not finished**
  (ch1–5: 18/0; the cliffs check not reached on the loaded laptop). Not run on origin.
- Left: (a) the block is 6 cm over the landing's north parapet coping, so he can step over it down to the landing
  (raise that parapet's collider: yours); a jagged dark line along the existing north fill's outer edge (x −29.5…−31.5,
  z ≈ −48). (c) the new face is a plain straight rock face. (d) the landing's old 0.9–1.7 m drops north and east (no
  parapet: not asked); he shows as an x-ray outline behind the south cheek as he comes out.

## STEALTH-COVER · Zoé seen while crouched behind the desk (the user, 7.11) · the laptop, 8.11.2026
The user: "in Zoé's part he sees her even when she crouches behind the desk". Diff: `requests/STEALTH-COVER.diff`
(enemies.js `Watcher.update` only, +5/−1; `git apply --check` clean on 11f39e14).
- **Cause:** the Watcher sees by cone plus `physics.lineOfSight` from his eye (1.6 m) to her at 0.6 m when hiding
  (discreet + action). The office's desks are 0.78 m high and stand against the walls, so a desk is never between him
  and her (chapter1.js `updateCone` says he sees over desks on purpose), and hiding only scales his notice rate to 0.15.
  `interiors.js buildProjOffice` fills `R.cover` (15 spots: desks, crates, cabinets, each with a radius), but nothing in
  src read it.
- **Fix:** `covered` = hero hiding, more than 1.5 m from him, and within r + 0.35 of a room cover spot: then she is out
  of his cone (and his suspicion cools as usual). Standing, crouched in the open, or with him on top of her: as before.
  The only other Watcher (council.js, the chapter-9 archive) has no `R.cover`: unchanged.
- **Measured in the game** (SwiftShader, the guard 4 m away kept facing her, 5 s at each spot):

| case | origin ea2a6ebb | with the fix |
|---|---|---|
| crouched beside each of the 15 cover spots | spotted at 13 (2 hidden by a tall piece in the line) | spotted at 0 |
| standing at the same spots | spotted at 15 | spotted at 15 |
| crouched in the open, (1295, −0.5), clear line | (not run: the run was killed) | spotted |
| crouched at cover, the guard 1.2 m away | spotted at 14 (the plan table blocks the 15th) | spotted at 14 (same) |

- **Tests on the fix:** zoe-resume 5/5 (sneaks past him to the plan, save and Continue), chapter1 23/23.

## CAST-POLISH-HEROES · Twinsen's cuffs and Zoé's necklace (the Blender pass: the first two of its queue) · the laptop, 7.11.2026
Diff: `requests/CAST-POLISH-HEROES.diff` (tools/blender/twinsen_poly.py, tools/blender/zoe_poly.py; against db5a1c9c, the
same files on ddad5c12; `git apply --check` clean). The two new model files, to replace `assets/poly/twinsen.json` and
`assets/poly/zoe.json` (single-line JSON, so not in the diff): `requests/CAST-POLISH-HEROES/{twinsen,zoe}.json`, built
from the patched scripts by the installed Blender 5.2.3 through `tools/blender-bridge` (`script` op). Working copies,
jobs, Blender views and reports: `art/blender/characters/{twinsen,zoe}/`, `art/blender/characters/jobs/`. Pictures
(ours, chapter 1, the game's renderer; before | after): `docs/future/characters/{twinsen,zoe}/`.
- **Twinsen, CUFF-HEM.** Looked at in the game (Follow/Medium, the dialogue with Dot, 1.9 m close-ups, 13 poses): at
  the play camera nothing reads wrong; up close the sleeve's cuff ended in the cone's bare edge (no thickness, a knife
  edge from every side) over a flat dark lid. Now the cloth turns under in a rolled hem (out a little, under and back in
  by 1.5 cm) over a dark inner wall and lid. Same place, length and bone (the forearm) as before; the fist is
  untouched, so the ball, sword, glove and blowgun sit as before. `TW_CUFF_OLD=1` builds the old cuff. The unchanged
  script rebuilt by Blender 5.2.3 gives the committed file exactly (every array equal), so the new file differs only by
  the cuffs.
- **Zoé, NECKLACE-ZOE.** The necklace was laid by rays cast at the skin and the dress but not at her neck (its own
  part), so its two back ends found nothing and stayed where the original's lines are, 3.5 cm behind our slimmer neck,
  and the loop was open there: in the close-ups two blue sticks stood in the air behind her neck. Now it is one closed,
  smooth cord round the base of her neck: the measured V and collarbone points in front, behind it rests on the neck
  just above the body's shell (ours: the original's back points are off our neck), each point laid on the nearest
  surface and smoothed. Same colour, width, weights (torso → neck) and part. The V's upper arms are narrower than the
  original's (they turn in to the neck instead of running out over the shoulder). `ZOE_NECKLACE_OLD=1` builds the old
  one. Note: the unchanged script rebuilt by Blender 5.2.3 already differs from the committed file in 180 normals of
  the necklace (positions identical); the new file carries that too.
- **Contracts kept (checked on the files):** bone names and order, `eyes` and `mouths` entries identical, 4 weights per
  vertex summing to 1, no new vertex colour (both edits use colours the models had: Twinsen's tunic #2a86ad and inner
  #123f58, Zoé's #1b4b67), feet and top unchanged (Twinsen 0–2.1005 m, Zoé 0.004–2.0154 m). `validate`: no failure; one
  warning each, the same as the baseline's (Twinsen: the eye objects' transforms; Zoé: 4 loose vertices). The bridge's own skeleton check reads `skeletons.json[look]`'s
  keys instead of its `bones` (a bridge bug), so the bones were checked against `skeletons.json` separately.
- **Budget** (triangles incl. eyes and mouth): Twinsen 3078 → 3274 (+6.4 %), Zoé 5474 → 5704 (+4.2 %); in the game's
  frame the hero adds 4 draw calls before and after (body, silhouette pass, eyes, mouth) and 6048 → 6440 / 10860 →
  11320 triangles (the body is drawn twice, by the silhouette pass too); no texture, no material, no bone added.
- **In the game** (SwiftShader, both files served in place of `assets/poly/*.json`; the village square, Follow/Medium;
  `docs/future/characters/*/`): at the Follow camera both read as before (the edits are for the close-ups, as
  intended); in the 1.9 m close-ups and the review scene the cuff ends in a rounded hem, and Zoé's necklace sits on
  her neck all the way round. Poses (a second rig in the developer yard, side and ¾: idle, walk, run, turn, jump, fall,
  throw, sword, talk, pickup, use, hurt, doze): the hem rides the forearm with the cuff, the cord follows the neck and
  chest, no new tear or clipping. The hero's frame: 4 draws before and after.
  Evidence labels: **Automated runtime only** (tests, SwiftShader); the pictures were looked at, not played.
- **Tests** (SwiftShader, both candidates in `assets/poly`): solidnpc 54/54 PASS; chapter1 23/23 PASS; story-journeys
  30/30 PASS; cast-rounds 196 passed and 0 failed before its browser was closed from outside at the last case (the
  epilogue's household rounds), that case alone then 14/14 PASS. Earlier runs of chapter1 and story-journeys stopped
  the same way (a browser closed while booting), and chapter1 also once on its own 240 s boot limit (raised in the test
  copy only). They passed from a renamed copy of the headless shell.
- **GPU, a light run** (installed Chrome on the Vega 8, 1280×720, quality high, the village square at Follow/Medium,
  20 s each, two before/after pairs, other agents' tests running): medians 34.9 / 36.2 ms before and 39.4 / 35.1 ms
  after for Twinsen, 35.3 / 35.4 before and 17.9 / 35.4 after for Zoé, with means anywhere from 26 to 82 ms in either. The
  laptop's load swamps any difference: **frame time not claimed**. The frame's triangles go up by 0.2 % (Twinsen) and 1 %
  (Zoé) and the draw calls are unchanged. Reports: `art/blender/characters/reports/gpu-*.json`.
- **Left:** Twinsen's cuffs show only up close (at Follow/Medium nothing changes, as intended). Zoé's V is narrower at
  the top than the original's, and there is a small kink where the cord passes over the body's shell beside the neck.
  The game pictures are taken from the same spot and camera, but the idle and the people around were not frozen in the
  same phase. Character `textured` previews in the bridge are white (only the neutral views are useful).
- To apply: `git apply requests/CAST-POLISH-HEROES.diff`, then copy `requests/CAST-POLISH-HEROES/{twinsen,zoe}.json` to
  `assets/poly/`. To rebuild them: `twinsen_poly.py` / `zoe_poly.py` with `art/characters/skeletons.json`.
- Ready for the cloud as one batch: `requests/CAST-POLISH-HEROES.diff` (the two scripts; `git apply --check` clean on
  the current origin) + `requests/CAST-POLISH-HEROES/{twinsen,zoe}.json` (the new `assets/poly` files). Merge, test, publish.

## REV-HAM-ART · the Hamalayi's art follow-ups (CLOUD_ORDERS 25) · the laptop, 8.11.2026
Diff: `requests/REV-HAM-ART.diff` (hamalayi.js, props-mountain.js, engine/softfx.js, engine/music.js, obsroom.js,
tests/music.mjs, tools/music: new `tracks/mountain.py`, `__init__.py`, docs/MUSIC.md; against 201869e0, `git apply
--check` clean). Vega 8, headed Chrome, Follow, Medium. Pictures (chapter 6+) stay on the laptop.

| spot | what a player sees | status |
|---|---|---|
| (a1) the heat station's shed | still wrong: turning from the post to the winch the camera looks down over the shed's roof, his legs x-rayed through it (the shed stood on the post → camera line) | fixed: the shed backs onto the cliff foot at (4315.0, −23.0), gauge to the yard, on its lowest corner; the pipe follows the snow (0.14 m) to the post's foot; pines/rocks kept clear (filters only); the post → winch camera line passes ~2 m clear |
| (a2) the glider field sign | reads right | — |
| (a3) the ch 10 glider and landing at the gate | reads right (wing ~1 m from the signpost, ~3.5 m from the pillar) | — |
| (a4) the trail's rope rail | a post on leg 3's rock bank under the terrace's snow lip, its rope through the lip; lone posts left without rope; leg 2's posts on the cut's walls | fixed: a post is skipped where the ground 0.9 m out is > 1 m higher; the rope breaks between posts > 1 m apart in height; a run needs ≥ 2 posts. Posts 12 → 8 (leg 2, a cut, none) |
| the trail switchback (4329.5, 24) facing leg 2 | the Follow camera inside the bend's rock, he x-rayed (same on origin) | **for the cloud (camera)** |
| (b) the vent steam from (4254, −47.8) looking west | a grey-brown speckled column | fixed: ~48 larger puffs (was ~72), alpha 0.7, plain white, holding density longer; A/B in one session: mean luma 146–152 → 168–171, grain 4.0–4.2 → 3.1–3.3. `Plume` takes `cell`, `fi`, `fo` (defaults = the old values: the desert's plumes unchanged) |
| (c) Lhar roof flicker (4302.15, 14.49, −3.06), (4305.92, 14.53, 18.11) | `mountainHouse`: the eaves' timber band's top level with the rubble wall's top (one plane) | fixed: the band's top 2 cm proud (still under the roof slab); every mountain house; overlaps hamalayi 0 failing (was 2), listed spots 7 → 2 (monastery, pre-existing) |
| (d) music | the Hamalayi outdoors and the observatory played The Well | **Prayer Flags** (`tools/music/tracks/mountain.py`, original, by hand): A dorian, 4/4, 72 bpm; intro 13.3 s, loop 2:13; pan flute over a hummed drone and harp, the tune an octave up with a horn answering, a monastery chant in C lydian with the bell, at the peak the Entity cell up a fifth (Sendell's shrine). Mood `mountain { track, alt: 'well' }`, `PLAYLISTS.hamalayi = ['mountain']` (`_list` maps a missing piece to its mood's `alt`), the observatory → `mountain`. **Score only: please run `build.py mountain`**; until then it plays The Well, with no code change after the render |

- Tests (GPU): overlaps hamalayi pass; music 26/26 (the manifest check now accepts a playlist piece whose stand-in is
  in the manifest; two crossfade-timing checks flaked once and passed on rerun), audio 6/6, chapter6 17/17, chapter7
  9/9; playthrough 09-pass (15 steps) and 10-observatory (9 steps) 0 deaths, 0 assists; a scratch walk check 20/20
  (the post, winch, bell, lantern, round the shed, all three trail legs both ways, 0 respawns; hamalayi ↔ obsv twice,
  resize, quality low → high → medium); moods 7/7. lint.py: all 18 scores ok.
- Cost at the steam: draw calls and triangles unchanged at every view; live puffs ~72 → ~48, puff area ~0.87×.
  Whole Hamalayi: 313 meshes =, triangles 851,249 → 850,253, colliders 1,365 → 1,361. No frame-time claim (loaded laptop).
- Not checked: combat visibility through the new steam (the vent's drone fight passed in 10-observatory); the
  laptop on battery.

## CAST-POLISH-CITADEL · Gilbert's moustache and the aprons (Pippa, farmerB, weaver) · the laptop, 8.11.2026
Diff: `requests/CAST-POLISH-CITADEL.diff` (tools/blender/cast_poly.py only; against db5a1c9c, the same file on ddad5c12 and
c2684be7's CAST-POLISH-HEROES does not touch it; `git apply --check` clean). New model files for `assets/poly/`:
`requests/CAST-POLISH-CITADEL/{gilbert,pippa,farmerB,weaver}.json`, built by `cast_poly.py <skel> <out> gilbert pippa
farmerB weaver` in Blender 5.2.3 through the bridge (`CAST_BLEND` pointed outside `art/characters/`). HEAD's script
rebuilt here gives the committed files to 1e-5 m (positions) and 1e-4 (normals), so the new files differ by the edits only.
Pictures (ours, chapters 1–2, before | after): `docs/future/characters/{gilbert,pippa,farmerB}/`.
- **Which people:** a census of Citadel in chapters 1 and 2 (the game, `census.mjs`) lists the story people present in
  both: Zoé, Arthur, Gilbert, Mira, Pippa, Doran, Tim, Lulu, Joe, Bram, Odile, Nell, the guard, the Spheros, Dot (pim).
  I surveyed seven of them in the review scene (Arthur, Pippa, Mira, Gilbert, Bram, Odile, Nell). Picked by visibility
  and weakness: Gilbert (the Water Office story, chapter 1) and Pippa (her stall stands on the square where Citadel
  starts).
- **Gilbert, MOUSTACHE-1** (CAST `moustacheSwept`, his entry only; lharMan and dallan keep the balls): his moustache was
  three balls a side, a string of beads in the close-ups. Now each side is one soft, tapered lobe along the same line,
  flat on the lip, the two overlapping under the nose, still clear of the mouth (it talks). His hair hex #cfcfcf (role
  `hair`). 3872 → 3856 triangles (−16).
- **APRON-EDGE** (build(), every apron it makes: Pippa; farmerB, 7 people: hedda, tavi, farmer2, dg_cook, lh_mira,
  up_wait, maro; weaver, 2: fenn, lomba. `APRON_EDGE_OLD=1` builds the old one): the apron was one sheet 1.2 cm off the
  tunic, paper from the side. Its sides, foot and the bib's top now turn back 1 cm toward the body, in the exact apron
  hex (role `apron`), with a hard edge between face and side. +32 triangles each (Pippa 2476 → 2508, farmerB and weaver
  2396 → 2428). DRESS-1, checked on the game's own code (`dresscheck.mjs`, farmerB variants 1–6): the apron recolours
  completely in every variant, none of its 192 vertices keeps the base hex. Separately, farmerB's `shoes` role never
  recolours (3600 vertices keep #e8d0b8): that was already so before this pass, so nothing here caused it.
- **Contracts:** bones (names, order), `eyes` and `mouths` identical; 4 weights summing to 1; no new colour; feet and top
  unchanged. Hero frame with each as the hero (swapBody): 4 draw calls before and after.
- **Looked at:**
  - In the game (SwiftShader, `gamecap.mjs`), with each as the hero at the same square spot: Follow/Medium, Follow ¾,
    the dialogue with Dot, close-ups front/¾/back.
  - Poses (a second rig in the developer yard, side and ¾): idle, walk, run, turn, jump, fall, throw, sword, talk,
    pickup, use, hurt, doze. The moustache rides the head. The apron's edges follow the apron with no tear.
  - In the throw and the sword the bib sinks behind the tunic, before and after alike (not this edit).
  - In Blender: the four views of Gilbert and Pippa, neutral and in colour (`turnaround-blender-after.jpg`).
  - Both edits read up close and in the dialogue. At Follow/Medium, Gilbert's moustache reads as one shape; the apron's
    edge is a pixel.
- **Tests** (SwiftShader, the four files in `assets/poly`, a renamed copy of the headless shell): solidnpc 54/54,
  chapter1 23/23, cast-rounds 209/209, story-journeys 30/30, all PASS.
  Evidence labels: **Automated runtime only**; pictures looked at, not played.
- **Cost:** −16 / +32 triangles a model, no draw call, material or texture added. The Vega 8 frame time was not run for
  so small a change: the last pair (CAST-POLISH-HEROES) showed the machine's noise swamps far larger ones.
- **Left:**
  - Gilbert's side fringe is still a row of balls (the G1-ART design); lharMan and dallan keep the bead moustache.
  - The Rabbibunnies' necks are plain long tubes (a race-wide proportion, not checked against LBA2 here).
  - The bib-sinks-in-the-throw problem above.

## CAST-POLISH-CITADEL-2 · Mira's glasses, Bram's and Odile's cap peaks, Nell's goggles · the laptop, 8.11.2026
Diff: `requests/CAST-POLISH-CITADEL-2.diff` (tools/blender/cast_poly.py only). It goes **on top of CAST-POLISH-CITADEL.diff**,
which a7d14466 carries as a request and has not applied; `git apply --check` is clean on that base. New model files
for `assets/poly/`: `requests/CAST-POLISH-CITADEL-2/{mira,bram,odile,nell}.json`. They were built by `cast_poly.py
<skel> <out> mira bram odile nell` in Blender 5.2.3 through the bridge.
Pictures (ours, chapters 1–2, before | after): `docs/future/characters/{mira,bram,odile,nell}/`.
Each change is behind a CAST flag of that person only; with the flag off, the old shape is built.
- **Mira, GLASSES-MIRA** (`glassesRim`):
  - Before: her spectacles were flat wire rings 1.2 cm off the face and wider than it. From the side and ¾ they stood
    in the air round the eyes like a scribble.
  - Now: round rims (a thin cord) laid on the face round each eye, a bridge over the snout and an arm back toward each
    ear, in the same dark colour. In the close-ups they read as glasses.
  - 2330 → 2650 triangles (+13.7 %).
- **Bram, PEAK-BRAM** (`peakCurved`):
  - Before: the flat cap's peak was a flat box, a plank sticking out from the side.
  - Now: a curved visor tucked under the crown's front, sloping down, shorter toward its sides, in the hat's shade.
  - 3630 → 3670 triangles.
- **Odile, PEAK-ODILE** (`peakCurved`):
  - Before: the customs cap's peak was the same plank.
  - Now: a curved visor from under the gold band, in the hat's shade.
  - 2436 → 2476 triangles.
- **Nell, GOGGLES-NELL** (`gogglesGlass`):
  - Before: the goggles were two gold drums with flat gold faces, coins on her brow.
  - Now: brass cups with a rolled rim round a dark glass lens, joined by a bridge. The lens colour is #382b14 (0.28 ×
    the brass, not a LOOKS role; Nell's model is hers alone).
  - Her file also takes CAST-POLISH-CITADEL's apron edge, which her model had not been rebuilt for.
  - 2768 → 3126 triangles (+12.9 %, the apron's +32 included).
- **Contracts:**
  - Bone names, eyes and mouths are identical.
  - Mira's `bones` list comes out in a different order (kneeL before hipL); the game maps bones by name.
  - 4 weights per vertex summing to 1. Feet and top unchanged.
  - The hero frame is 4 draw calls before and after, with each as the hero.
- **Looked at:**
  - The review scene: face front, ¾ and side.
  - The game (SwiftShader, `gamecap.mjs`, each as the hero at the same square spot): Follow/Medium, the dialogue with
    Dot, close-ups front, ¾ and back, and 13 poses × 2 views.
  - At Follow/Medium Nell's goggles and Mira's glasses now read as such. The two peaks show in close-up and in the
    dialogue only.
- **Tests** (SwiftShader, the four files in `assets/poly`, a renamed copy of the headless shell): solidnpc 54/54,
  chapter1 23/23, cast-rounds 209/209, story-journeys 30/30, all PASS.
  Evidence labels: **Automated runtime only**; pictures looked at, not played.
- **validate:** 0 fails and 2 warnings, both already there before this batch:
  - Bram's feet 1.2 cm below the floor;
  - loose vertices in bram_coat, bram_trousers and odile_hat (the cap dome's culled faces).
- **Cost:** +40 to +358 triangles a model (Mira +13.7 %, Nell +12.9 %; within the +25 % rule). No draw call, material
  or texture added. Vega 8 frame time not run (the same reason as CAST-POLISH-CITADEL).
- **Left:**
  - Nell's leather apron: the tunic's flare shows through its lower part in a stride, and its pocket and buckle are
    pale patches. Both already so before.
  - Bram's peak shows only from the side and in the dialogue.
  - The Rabbibunny neck tube (race-wide, not touched).
- Order: apply `CAST-POLISH-CITADEL.diff` first (a7d14466 carries it as a request); this diff applies cleanly on top.

## MUSIC-CRACKLE · the music crackle on the user's laptop (CLOUD_ORDERS 27b) · the laptop, 8.11.2026
Diff: `requests/MUSIC-CRACKLE.diff` (engine/audio.js, tests/audio.mjs, docs/MUSIC.md, new `tools/music/crackle/` (10
measuring tools, 568 lines); against cca490df, `git apply --check` clean).
**Not reproduced in what the game outputs; one real click source fixed.** Ryzen 5 3500U, Windows 11, plugged in, Realtek
48 kHz; the dev build (Electron 43.7.9 with the desktop app's switches, `AudioContextPlayoutStats` on) and the
installed 0.48.0 exe fullscreen (own `--user-data-dir`); a ~190 s scripted Citadel session per run (walking, the water
office in and out, ducking, the slider, an area change, combat, Home's loop seam, a piece's end) and a stress run;
the CPU at 100 % from other agents throughout (frame p95 52–274 ms).
- Source files (Automated runtime): every MP3 decoded as the game does: no clipping (peaks 0.52–0.83), lengths =
  the manifest (padding trimmed), 0 discontinuities, loop points on whole frames, seams continuous.
- Null test, game against source (Automated runtime): the music bus tapped (AudioWorklet) and subtracted from the
  decoded file sample-aligned: median residual −70.8 dB outdoors, −72.6 dB at Home's seam; 0 gain steps.
- Clicks: 0 per minute in every phase before and after (the detector catches ~75 % of planted 128-frame dropouts).
- Underruns (Chromium's playout counter): 0–2 events per ~3 min (5–13 ms), none near a long frame; decodes and doors
  caused none. Never more than 2 music voices (a crossfade).
- **The defect:** the volume sliders set the bus gains with `.value =` (a 0.55 → 0.35 jump between two samples): clicks
  while a slider is dragged. Fixed: after init every bus change glides (`setTargetAtTime`, 30 ms `VOL_GLIDE`; changes
  < 0.002 skipped); largest per-block change 0.35 → 0.030, realtime hits in the slider phase 3 → 0. tests/audio.mjs
  reads the gains after 500 ms.
- Source only, not changed: pausing a story scene calls `ctx.suspend()` at once (cuts mid-wave); a fade first would
  delay the suspend ~0.25 s, which tests/voices.mjs (0.2 s) forbids: for the character-voices owner. Music decodes
  again on most area changes (only 3 kept): under load 1–24 s late starts (not crackle).
- Blocked: Windows' own output (loopback) could not be captured, so the mixer and driver are not measured; battery not
  tested (the laptop stays plugged in).
- Tests (GPU mode, the CPU at 100 %): audio 6/6, music 26/26 (favicon-only fail), chapter1 23/23; timing 27/2 (a
  quality-resize check that also fails on HEAD in GPU mode; the 144 Hz cap borderline 16.35 vs 16.67 ± 0.3 ms).
- **For the user's ears** (the WAVs are on the laptop): source vs game of village_b (sample-identical), Home's seam,
  the office in and out, the slider before/after. If the source crackles too, the renders are the cause (a re-render
  or higher bitrate: yours); if neither does but the live game does, it is after Chromium (Windows' mixer/driver
  under load) or battery power.

## ZSTYLE-1 · Zeelich's new city reads as Zeelich (the user's DECISION, 7.11; CLOUD_ORDERS 27a for the hub) · the laptop, 8.11.2026
Diff: `requests/ZSTYLE-1.diff` (zeelich.js, travel.js, zterminal.js, zeelife.js; against bceb4486, `git apply --check`
clean; origin's house `arcade` kept, the dome occluder uses `DH` and the council's 1.22 cap). Layout, paths, doors,
colliders, story spots and the random scatter unchanged. Pictures (chapter 3+) stay on the laptop.
**Zeelich's identity, measured from the user's LBA2 files (numbers only, kept in lba-study):** no lawn, grey granite
ground (Otringal #838079 / #62625c / #aaa19a / #454440, pale paving #d6d1d4); walls granite #6c6e6a, dark metal
#414b44, ochre wood #90643c, taupe stucco #a79d98, glass blocks #6c95a0; roofs grey/taupe/slate with aqua or gold
caps; props grey-green rails and gold; Otringal's civic halls 7.4–9.3 m on octagonal plans, glass blocks over the
lower third, columned drums, faceted aqua/gold caps with a gold spike; Knartas hive domes; Mosquibee white cocoons
with red fins; golden-plume trees in square planters and golden fan plants (~26/ha); an overcast pale-grey misty sky.
**Rubric without geography and landmarks (editorial, medium-low confidence): 29/55 (53 %) → 43/55 (78 %), below 85.**
Architecture 11 → 16 /20, palette and materials 7 → 12 /15, vegetation and environment 4 → 8 /10, inhabitants 7 → 7 /10.
- What changed: an overcast pale-grey sky and fog; the cloud sea in SKY-9's grey textures under a lavender-grey tint
  (no pink); a speckled granite (`graniteTex`) for ground, cliffs and the old mill; a glass-block foot on every
  house (the frieze's material: no new draw); the council house a 2.3 m drum ringed by 8 grey columns under a gold
  cap; the planters alternate `frondTree` and `goldPlant` (the old plants' draws burnt, so every later scatter keeps
  its place); the plaza star in pale border stone, a glass-block band on the fountain, teal bench backs, rust/teal/
  ochre awnings, warm white lamp glass; the mills taupe stucco with glass bands, aqua or gold faceted caps, grey sails;
  ochre bulbs, golden tufts; the spaceport deck paler lavender-grey with teal rails (LBA2's port deck); the terminal
  pavilion in the same look; the watch house taupe stucco over grey stone (was a dark blue block).
- Cost (Vega 8, whole frame, all passes): draw calls 875 → 873, 649 → 645, 390 → 390, 1006 → 1001; triangles +0.4–1 %;
  one 512² granite canvas, two grey 512² cloud canvases, one 128² puff (shared with the Platform). Frame time not
  measured. **Already so before: the hub draws 390–1006 calls against 73–202 on the isles: worth a performance look.**
- Tests: on the agent's base (ddad5c12) zeelich-life 38/38, overlaps (zeelich) pass, world-consistency 37/37,
  playthrough 06-zeelich every step (1 ISO assist as on GPU-9). Rebased: zeelich-life hit "the platform gate:
  transition, not arrived" and stopped before its verdict; **the same check fails on origin without this diff
  (37/1)**, so it is not from it: yours (the platform gate walk). overlaps (zeelich) on the rebased tree crashed the
  page under load: not rerun.
- Left, to reach 85: one or two round or barrel-vault house bodies at the same footprints and doors; ribbed metal on
  the depot and workshop; a less Citadel-like parapet on the watch house; lighter lavender-grey street paving and a
  gravel look for the tracks; the inhabitants (street police, posters, a coin machine: the people owners);
  zislands.js's default environment for islands without their own still carries the old pink.

## CAST-POLISH-CITADEL-3 · the guard's visor (and why the others of chapters 1–2 are left as they are) · the laptop, 8.11.2026
Diff: `requests/CAST-POLISH-CITADEL-3.diff` (tools/blender/cast_poly.py only; it goes **on top of CAST-POLISH-CITADEL.diff
and CAST-POLISH-CITADEL-2.diff**, `git apply --check` clean on that base). New model file:
`requests/CAST-POLISH-CITADEL-3/guard.json` for `assets/poly/`. Pictures: `docs/future/characters/guard/`.
- **Surveyed** in the review scene (faces front and ¾, the turnaround): Tim, Lulu, Doran, Joe, the guard and Dot (pim),
  with Arthur done earlier. Only the guard has something that reads wrong at Follow/Medium and in the dialogue:
  - his visor was a flat box across the eyes;
  - its square corners stood off the round helmet;
  - with the trunk in front of its middle, it read as two black bricks.

  The others read as designed, so I propose no change for them. Forcing one change each would have made them worse,
  not better.
- **Guard, VISOR-GUARD** (CAST `visorCurved`, his entry only; vguardG, the Zeelich guards, keep the box): a band of the
  helmet's own curve round the front (116°), 1–1.6 cm proud of it, in the same dark glass (#1a2830, not a role). The
  'guard' look is the project security guard of chapters 1–2 alone; the enemy guards use vguard/vguardG.
  3578 → 3718 triangles (+3.9 %).
- **Contracts:** bones, eyes and mouths identical; 4 weights; no new colour; feet and top unchanged.
  `validate`: 0 fails; its 2 warnings were already there before this change: the feet sit 1.2 cm below the floor, and
  the coat, trousers and helmet have loose vertices.
- **Looked at:**
  - The review scene before and after (`lookdev-visor.jpg`).
  - In the game (`gamecap.mjs`, LOOKS=guard): Follow/Medium, the dialogue with Dot, close-ups front, ¾ and back, and 13
    poses.
  - Blender views in colour (`turnaround-blender-after.jpg`).
  - In the close-up and the dialogue the visor reads as one curved glass across the helmet.
- **Tests** (SwiftShader, guard.json in `assets/poly`, a renamed copy of the headless shell): solidnpc 54/54,
  chapter1 23/23, cast-rounds 209/209, story-journeys 30/30, all PASS.
  Evidence labels: **Automated runtime only**; pictures looked at, not played.
- **Cost:** +140 triangles, no draw call, material or texture. Vega 8 frame time not run.
- **Left:** the visor hides his eyes, as the box did (the design); the Grobos' flat ears (race-wide).
- **Next:** Citadel's chapter 1–2 story people are done. The laptop moves to queue item 5 (CLOUD_ORDERS 28, by region).
- Order: CAST-POLISH-CITADEL, then -2, then this one (clean `git apply --check` on that base).

## ZSTYLE-2 · Zeelich's new city, step 2: Otringal's buildings, ribbed metal, paving · the laptop, 8.11.2026
Diff: `requests/ZSTYLE-2.diff` (zeelich.js, zeelife.js, zislands.js). **Apply after ZSTYLE-1**: checked on 2a3054e8
+ ZSTYLE-1.diff, `git apply --check` clean. Merged with origin's VP-10 house code (camSkip colliders, `roomocc` boxes):
the dome occluder (`rev`) now only for houses with a drum and cap; the octagonal hall and the vaulted house get a roof
box up to +1.6 m instead. Layout, paths, doors, colliders, story spots and the random stream unchanged. Pictures
(chapter 3+) stay on the laptop.
- **Octagonal hall** (the house at (−11, −10.6), Otringal's body 9, `octa`): corners chamfered 1.1 m (four straight and
  four diagonal walls, the door kept, its two front windows gone), cornice, deck, frieze, glass-block foot and eight
  slim piers on the octagon, a broad faceted aqua cap (`polyCap`) with a gold eave ring and spike. Its colliders are
  the old rectangle: a planter with a golden fan plant fills each open corner, so nothing invisible stops him.
- **Barrel vault** (the south-west house at (−38.5, 10.6), body 51, `vault`): a faceted vault rising 1.5 m in the cap
  mosaic, a glass-block band over the crown, stucco gables, brass ribs, gold spikes; the minaret kept.
- **Ribbed metal** (bodies 0 and 69): `ribTex` teal-grey ribbed walls on the depot's shed, bolted ribbed panels on
  Baldino's back and east walls (clear of windows, foot band, frieze).
- **Paving:** `paveTex` pale lavender-grey flags on the street, plaza, depot spur and arcade floor; `kerbTex` lighter
  border stone along the street edges and on the plaza star; `gravelTex` on the mill tracks.
- **The watch house** (zeelife.js): no square merlons; a glass-block band, a rounded coping, brass knobs (collider and
  stair gap unchanged).
- **zislands.js:** an island without its own sky takes the hub's overcast pale grey (and the lavender-grey sea if it
  has no sea of its own): visible on Knartas and the Lift Dock; islands with their own sky or sea unchanged.
- **Rubric (editorial, medium-low): 43 → ~46/55 (84 %, range 45–47)**: architecture 16 → 17, palette 12 → 14,
  vegetation 8, inhabitants 7. Below 85 mainly on the inhabitants: patrolling police, posters, a coin machine (the
  people owners).
- Cost (Vega 8, whole frame): 0 to +3 draw calls, +0.7–2.6 % triangles; new canvases: ribbed 128², flags 256², kerb
  128², gravel 256². Frame time not measured.
- Tests on the merged tree (origin + ZSTYLE-1 + ZSTYLE-2, SwiftShader): zeelich-life 38/38 (the platform gate passed
  this time), overlaps (zeelich) 1 + 1 visual pass, world-consistency 37/37.

## CAST-POLISH-ZEELICH · the Esmers: robe edges with thickness, LBA2's boots, thicker arms (all six Esmer looks) · the laptop, 8.11.2026
Diff: `requests/CAST-POLISH-ZEELICH.diff` (tools/blender/cast_poly.py only: `build_esmer`, a new `esmer_boot`, and a `foot`
argument on `limb_legs` whose default is unchanged). It goes **on top of CAST-POLISH-HEROES, -CITADEL, -CITADEL-2 and
-CITADEL-3**: `git apply --check` is clean on origin `2a3054e8` with those four applied. New model files for `assets/poly/`:
`requests/CAST-POLISH-ZEELICH/{keeper,oku,xil,nara,clerk,councilChair}.json`. Pictures (**chapter 3+: not for the user**):
`docs/future/characters/{keeper,oku,xil,nara,clerk,councilChair}/`.
- **Why the Esmers.** The census (all 147 people at load) and a survey of Zeelich's and Otringal's people in the review
  scene showed that the six Esmer looks read worst of the region. Between them they dress 28 people at load: keeper ×8,
  clerk ×6, oku ×5, xil ×4, councilChair ×3, nara ×2. The isles' folk (`islandlife.js`) add about 20 more. In chapter 3,
  seven of them stand on Zeelich's street: Nara, Oku, Ilo, Aven, Marl, Ennu and Oshra.
  - The capsule body is LBA2's own and stays. I measured the user's LBA2 files read-only, numbers only, with
    `tools/lba-source/measure.py`; nothing was extracted.
  - Bodies 80 and 186: one capsule ±0.10–0.107 H from 0.2 H to the top.
  - Three things were below the original or below our own finish standard:
    - the robe was paint, with no thickness;
    - the shoes were flat slippers half the original's size, under shins that ended in the air above them;
    - the arms were sticks.

  It is one builder, so the fix is race-wide. Faces, hats, glasses and colours are unchanged.
- **ROBE-EDGE-ESMER:**
  - the robe stands 0.8 cm off the body;
  - its hem is a rolled edge, 1.6 cm out, with a flat underside back to the trousers;
  - its collar is a rolled edge that turns in to the skin;
  - both are in the trim's exact hex.
- **BOOTS-ESMER:** the original's feet are 0.2 H long (−0.07 to +0.13 H about the ankle), 0.09 H wide and 0.05–0.066 H
  tall. Ours were 0.04 H wide and 0.03 H tall. Now:
  - each boot is 0.19 H long, 0.06 H wide and 0.06 H tall, with a flat sole and a rounded toe and heel. It is not the full
    0.09 H wide because our legs stand closer together than the original's (±0.042 H against ±0.08 H), and wider boots
    would touch;
  - a shaft round the ankle covers the shin's end. Its lower half follows the foot and its upper half the shin;
  - everything is in the shoes' hex.
- **ARMS-ESMER:**
  - LBA2's arms are ±0.021–0.027 H thick above the elbow; ours were 0.014–0.017 H. Now they are 0.017–0.020 H, as thick
    as they can be and still clear the robe at the elbow (rest spread 0.03 rad);
  - the cuffs grew with them.
- `ESMER_OLD=1` rebuilds the old capsule, shoes and arms. With it, the rebuild equals the committed six files exactly
  (every array equal).
- **Contracts** (`art/blender/characters/jobs/polycheck.py`, reports in `art/blender/characters/zeelich/reports/`):
  - bones, in the same order, eyes and mouths are identical;
  - 4 weights a vertex, all summing to 1;
  - no new colour;
  - feet at 0.004 and the top unchanged.
  - DRESS-1 (`dresscheck.mjs`, keeper, oku and clerk, variants 1–6): 0 vertices keep a base hex that a variant
    overrides, so the new hem, collar and boots recolour with tunicTrim, tunic and shoes.
  - `validate` (Blender, keeper and oku): 0 fails. One warning, loose vertices, was already there before (968 → 1224,
    the cast's separate parts).
- **Budget:**

  | look | triangles before → after (body) | change | with eyes and mouth |
  |---|---|---|---|
  | keeper, xil, nara | 1504 → 1776 | +18.1 % | 1584 → 1856 |
  | clerk | 1536 → 1808 | +17.7 % | 1616 → 1888 |
  | oku, councilChair | 1884 → 2156 | +14.4 % | 1964 → 2236 |

  - Draw calls are unchanged: the hero as an Esmer is 4 calls before and after (body, silhouette pass, eyes, mouth).
  - Zeelich's street in chapter 3, Follow camera at Medium: 797 = 797 calls on SwiftShader and 760 = 760 on the Vega 8.
    Triangles went up by 1360, 5 Esmers in view × 272.
  - Each model gains 816 vertices, about +49 KB of vertex data at 60 B a vertex.
  - No texture, no material, no new bone.
- **Vega 8 frame time** (installed Chrome on this laptop's GPU, the game's own loop, 20 s, Zeelich's street, quality
  medium; two before/after pairs):
  - before: median 17.7 / 17.7 ms, p95 18.4 / 18.5 ms;
  - after: median 17.6 / 17.6 ms, p95 18.2 / 18.3 ms.

  There was no measurable regression. The frame sits at the 60 Hz cap, so headroom was not measured. Reports:
  `gpu-*.json`.
- **Looked at:**
  - The review scene (lookdev, the game's own renderer): turnaround, face ¾, hand and walk before and after for all six.
    Poses for keeper (slim) and oku (stooped and wide), side and ¾, before and after: idle, walk, run, turn, jump, fall,
    throw, sword (heavy), talk, pickup, use, hurt, doze.
  - In the game, with the hero swapped to each look (`gamecap.mjs`, Citadel's square, chapter 1): Follow/Medium, the
    dialogue two-shot, and close-ups front, ¾ and back, before and after for all six.
  - Zeelich's street in chapter 3 (`zeecap.mjs`), before and after.
  - Blender views of keeper (before and after) and oku (after).

  What I saw:
  - at Follow/Medium the feet now read as boots, where they had been grey points;
  - in the close-up the collar and hem are visible lips;
  - in the walk and run the boots stay on the ground and the shafts stay on the shins.
- **Tests** (SwiftShader, the six files in `assets/poly`, a renamed headless shell):
  - solidnpc 54/54 PASS;
  - chapter1 23/23 PASS;
  - cast-rounds 209/209 PASS;
  - story-journeys 30/30 PASS.

  `assets/poly` was put back afterwards. Evidence labels: **Automated runtime only**. The pictures were looked at, not
  played.
- **Left:**
  - In the doze pose the Esmer's feet lie apart from the ends of the shins. This was already so with the old shoes, and
    the bigger boots make it easier to see. It is the rig's pose, not the mesh, so it is not changed here.
  - The hands are still LBA2's cone with three fingers and a thumb.
  - keeper ×8 and oku ×5 are still one body each, apart from DRESS-1's colours. Their `_b` shape variants (order 24)
    are the next Zeelich batch.
  - The other Esmer looks share one face shape.
  - Otringal's Quetch (councilB on Kira, Sanna and Ama; lharWoman on zc_petit) are not touched in this batch.
- Order: HEROES, CITADEL, CITADEL-2, CITADEL-3, then this one. Re-test after merging: the worktree's game was at db5a1c9c, before your GAIT-CADENCE rig.js.

## ZPERF-1 · Zeelich's hub draw calls on the Vega 8 (CLOUD_ORDERS 27c) · the laptop, 8.11.2026
Diff: `requests/ZPERF-1.diff` (engine/drawcull.js, engine/perf.js, main.js; against ff85b2b6, `git apply --check`
clean; independent of ZSTYLE-1/2). **Correction of the ZSTYLE-1 note:** the hub's 390–1006 calls were a test-path
artifact: `game.step()` + a bare `renderer.render()` never runs `game.frame(dt, true)`, so `shadowCull.update(root)`
never runs and `renderer.mid` skips `drawBatch` (it batches only areas in `shadowCull.areas`). **In play the hub is
batched like Citadel** (53 batches, 506 pieces, BoxCull, the shadow cache): arrival 48, plaza 123, street 236, mills 70
calls (main + shadow). Vega 8, Chrome D3D11, 1366×768, Medium by hand, chapter 3.
- **The one real cost:** Citadel's scene-level pieces (wizards.js `wizardTent`, the LBA1 asylum front and block-house
  from `buildLba1Door`, lba1places `asylum-climb`, kit2.js `kit2lane`, six story-prop groups) are added to the scene,
  not to `world.root`, so `enterRoom` hiding the root leaves them shown; from Zeelich's street looking west they are
  2,400 m off (far plane 2,500, fog ends at 290 m) and drawn in the fog colour. BoxCull and FarCull never test them.
- **Fix:** `BoxCull.hideFar(scene, root, camera, far, shadows)`: for one frame, leaves out the scene's top-level
  subtrees other than the area root whose world box is wholly beyond the fog's end and out of view or beyond the fog
  in depth (casters only beyond 400 m, clear of the sun's box); never subtrees with lights, skinned/instanced/batched
  meshes, points, lines, sprites, non-culled or onBeforeRender meshes, unfogged or non-normal-blended materials. Boxes
  refresh when a root moves and every 30 frames; candidates every 120 frames or on a child-count change. `?nofar` /
  `boxCull.far = false` for A/B. main.js `renderer.mid` calls it after `boxCull.hide` (3 lines).
- **Before → after (exact):** street 236–237 → 165 calls, triangles 354.5k → 335.7k main; arrival, plaza, mills
  unchanged (±2 = people and dogs moving). Pixels: rule off / on / off again from one frozen state: 0 px different at
  plaza, street and mills.
- `perf.js GpuTimer` drops non-finite or ≥ 10,000 ms results (counted as `invalid`): one 737,873 ms sample came back
  without the disjoint flag.
- Tests (headless): zeelich-life, overlaps (zeelich), zeelich-doors (ch 3 and 5), world-consistency: pass.
- Not verified: any frame-time gain (other agents loaded the laptop; sim time swung 5–80 ms between runs), battery,
  play. **For your tests and probes:** counting calls through `game.step` + `renderer.render()` over-reports; use
  `game.frame(dt, true)` or `shadowCull.update(root)` first. **Root cause left:** the builders that use the scene
  instead of `world.root` (wizards, lba1, sewers, kit2); moving them changes Citadel's batches, so they are culled
  here instead. The same pieces may cost in other outdoor regions within 2,500 m of Citadel (the desert near x ≈ 1000).
