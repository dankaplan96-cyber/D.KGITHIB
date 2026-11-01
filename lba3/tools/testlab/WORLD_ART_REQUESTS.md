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

---

## WA-14 · The Citadel sewers, as in LBA2 · Applied (the cloud, 1.11.2026; awaiting the user's approval)

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

**Applied (the cloud, 1.11.2026; awaiting the user's approval).** `src/game/sewers.js` (the rooms and the grate),
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

