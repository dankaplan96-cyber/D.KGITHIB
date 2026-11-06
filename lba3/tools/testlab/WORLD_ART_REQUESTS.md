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
