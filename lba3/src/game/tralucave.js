// LBA-CITADEL-9 (night mode: "work to the plan"): the cave behind the plateau's door, after LBA2's scene 2 (Tralu's
// cave). WORLD-80 built the door in the bank behind the depot and kept it shut (island.js OLD_DOORS.plateau); now it
// opens. Our own geometry, from a study of the original's layout (numbers and descriptions only; nothing copied):
//   - a cave of rough grey rock on two levels: a raised rock terrace at the back with a barred gate in the rock and
//     clusters of blue eggs; a stair down from it; a lower cave floor with clusters of pale spiked stalagmites; a
//     railed pool of pale cyan water; posts with cyan glass globes; an old stone guard house of squared blocks with
//     barred windows: barrels inside, a table with plates and a bottle, a bench, iron candle stands
// Twelve years on (ours): the eggs are empty shells, broken open long ago; the gate's bars are rusted; the guard house
// is a store again (a lantern, a coil of rope, a crate).
//
// CONTRACT
//   TRALUCAVE_AT                  where the room stands (regions.js)
//   buildTraluCaveRoom(scene, physics) → { tralucave }   (regions.js group 'tralucave')
//   traluCaveDoors() / traluCaveExit(to)   the plateau's door leads in ({ house: 'plateau' }: story/prologue.js no
//                                          longer offers it as shut); 'tralucave-out' leads back out before it
import * as THREE from 'three';
import { RoomBuilder } from './interiors.js';
import { Kit, MAT, M, TEX, rbox, plane, cyl, sphere, lathe, railing, table, bench, barrel, plate, jar, candle } from './props.js';
import { OLD_DOORS, PLATEAU_STAIR } from './island.js';
import { rockGeo, rockMat, floorTex } from './underground.js';
import { smoothstep } from '../engine/math.js';

export const TRALUCAVE_AT = { x: 8400, z: 0 };

const std = (map, color, rough, tile, glow = 0) => { const m = new THREE.MeshStandardMaterial({ map, color, roughness: rough, ...(glow ? { emissive: '#ffffff', emissiveMap: map, emissiveIntensity: glow } : {}) }); m.userData.tile = tile; return m; };
const blockM = () => M('tc_block', () => std(TEX.stone('grey'), '#b8b4aa', 0.9, 2, 0.14));   // (CAVE-LOOK: less of its own glow, lit by the room's key light now)
const capM = () => M('tc_cap', () => { const m = std(TEX.stone('grey'), '#c8c2b6', 0.9, 1.2, 0.12); m.userData.rockSet = true; return m; });   // (rockSet: the rubble is set into the rims it caps: rocksettle.js rocksOutOfBuilt)
const waterM = () => M('tc_water', () => { const m = new THREE.MeshStandardMaterial({ color: '#8ccfd8', emissive: '#4e9aa0', emissiveIntensity: 0.6, roughness: 0.25, metalness: 0.05, transparent: true, opacity: 0.88 }); m.userData.noShadow = true; return m; });
const boneM = () => M('tc_bone', () => new THREE.MeshStandardMaterial({ color: '#e6d4b8', roughness: 0.7, emissive: '#5a4c3c', emissiveIntensity: 0.6 })), tipM = () => MAT.paint('#5a3a2c', 0.6), rustM = () => MAT.paint('#6e4532', 0.85);
const globeM = () => MAT.glow('#d6f2ff', '#5ab0e0', 1.5), eggM = () => M('tc_egg', () => new THREE.MeshStandardMaterial({ color: '#5aa0c8', roughness: 0.3, emissive: '#1e4a66', emissiveIntensity: 0.6 }));

// CAVE-LOOK (P69, the user in the cave: "inside, everything is weird and not right"; CAVE-STAIR left it "a rectangular
// box of one dark rubble texture on floor, walls and terrace face, closer to a cellar than a cave"): the walls, the
// terrace's faces and the rims are rock now, the underground's faceted cave rock (underground.js: its texture and its
// program, flat facets with a tone per face), the floor that kit's natural rock floor; the light of the globes, the
// pool and the door is baked into their vertex colours (bake() below), so the battery profile's two lamps still show it
const caveRock = () => rockMat('#c4bcb2');
const caveFloor = () => M('tc_floorbake', () => { const m = new THREE.MeshStandardMaterial({ map: floorTex('#776b68', 'rgba(40,30,36,0.4)', 'shaft'), color: '#eceae6', vertexColors: true, flatShading: true, roughness: 0.93 }); m.userData.tile = 4.5; m.userData.rockSet = true; return m; });   // (rockSet: the cave's rock floor and the rock face's lip; rocks lie in them: rocksettle.js rocksOutOfBuilt) (the shaft's floor texture, shared; flat shading on a flat floor changes nothing and keeps the rock's program)
// the faceted rocks, 16 shapes (12 small ones) of the underground's cache: made once (~0.5 ms each), shared with it
const rk = (sd, small = false) => (small ? rockGeo(sd % 12, { detail: 0 }) : rockGeo(sd % 16));
const hash2 = (x, y, s) => { const h = Math.sin(x * 127.1 + y * 311.7 + s * 74.7) * 43758.5453; return h - Math.floor(h); };
function vn2(x, y, s = 0) {
  const ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy, u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy);
  const a = hash2(ix, iy, s), b = hash2(ix + 1, iy, s), c = hash2(ix, iy + 1, s), d = hash2(ix + 1, iy + 1, s);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
const fbm = (x, y, s) => vn2(x, y, s) * 0.6 + vn2(x * 2.3, y * 2.3, s + 7) * 0.3 + vn2(x * 5.1, y * 5.1, s + 13) * 0.1;
// a faceted rock face: a grid over (s along the wall, y up), each point pushed out of the wall by out(s, y), the inner
// points jittered (and pushed in or out by up to jag/2) so no facet is a square and each turns its own way; every quad two flat triangles. to(s, y, d) puts a point in the room;
// facing [x, z]: the room side. top(s): the top edge's rise (an uneven crest) and `lip` m back into the rock along it
// (the face's thickness seen from the camera above). The edges' points are not jittered, so faces meet edge to edge
function rockFace({ s0, s1, y0, y1, ds = 0.6, dy = 0.55, out, top = null, lip = 0, jag = 0.3, to, facing, seed = 1 }) {
  const ns = Math.max(1, Math.round((s1 - s0) / ds)), ny = Math.max(1, Math.round((y1 - y0) / dy)), rows = ny + (lip ? 1 : 0);
  const G = [];
  for (let j = 0; j <= rows; j++) for (let i = 0; i <= ns; i++) {
    const jj = Math.min(j, ny), inS = i > 0 && i < ns, inY = jj > 0 && jj < ny;
    const s = s0 + (i / ns) * (s1 - s0) + (inS ? (hash2(i, jj, seed) - 0.5) * (s1 - s0) / ns * 0.55 : 0);
    let y = y0 + (jj / ny) * (y1 - y0) + (inY ? (hash2(i, jj, seed + 3) - 0.5) * (y1 - y0) / ny * 0.5 : 0);
    if (jj === ny && top) y += top(s);
    const d = j > ny ? -lip : out(s, y) + (inS && inY ? (hash2(i, jj, seed + 5) - 0.5) * jag : 0);
    G.push(to(s, y, d));
  }
  const pos = [], posLip = [], at = (i, j) => G[j * (ns + 1) + i];
  const tri = (a, b, c, up) => {
    const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2], vx = c[0] - a[0], vy = c[1] - a[1], vz = c[2] - a[2];
    const nx = uy * vz - uz * vy, ny_ = uz * vx - ux * vz, nz = ux * vy - uy * vx;
    if ((up ? ny_ : nx * facing[0] + nz * facing[1]) < 0) [b, c] = [c, b];
    (up ? posLip : pos).push(...a, ...b, ...c);
  };
  for (let j = 0; j < rows; j++) for (let i = 0; i < ns; i++) {
    const a = at(i, j), b = at(i + 1, j), c = at(i, j + 1), d = at(i + 1, j + 1), up = j >= ny;
    if (hash2(i, j, seed + 9) < 0.5) { tri(a, b, d, up); tri(a, d, c, up); } else { tri(a, b, c, up); tri(b, d, c, up); }
  }
  const geo = (p) => { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(p, 3)); g.computeVertexNormals(); return g; };   // (not indexed: one normal per facet)
  return [geo(pos), posLip.length ? geo(posLip) : null];   // (the face; its lip, drawn with the floor's rock: the strata texture laid flat read as wood grain)
}
// a patch of old paving in the room's frame: flagstones laid in courses (0.5–0.7 m deep, 0.5–1.05 m long, 5 cm joints
// where the rock shows), those in a ragged rounded outline round (cx, cz), half-sizes hw × hd; each flag a 3.5 cm slab on a
// dark bed, its own tone in its vertex colours, its sides darker. Drawn with the floor's rock (one draw call with the floor)
function flags(cx, cz, hw, hd, y, seed) {
  const pos = [], col = [], hh = 0.035;
  const quad = (a, b, c, d, t) => { pos.push(...a, ...b, ...c, ...a, ...c, ...d); for (let v = 0; v < 6; v++) col.push(t[0], t[1], t[2]); };
  let row = 0;
  for (let z = cz - hd - 0.2; z < cz + hd; row++) {
    const dz = 0.5 + hash2(row, 3, seed) * 0.2;
    let col0 = 0;
    for (let x = cx - hw - 0.2 - hash2(row, 5, seed) * 0.5; x < cx + hw; col0++) {
      const dx = 0.5 + hash2(row, col0, seed + 1) * 0.55, mx = x + dx / 2, mz = z + dz / 2;
      const ex = Math.abs(mx - cx) / hw, ez = Math.abs(mz - cz) / hd;
      if (ex ** 3 + ez ** 3 < 0.7 + hash2(row, col0, seed + 2) * 0.55 && hash2(row, col0, seed + 6) > 0.06) {
        const x0 = x + 0.03, x1 = x + dx - 0.03, z0 = z + 0.03, z1 = z + dz - 0.03, t = 1.0 + hash2(row, col0, seed + 4) * 0.32, y1 = y + hh;
        const top = [t * 0.94, t * 0.97, t * 1.04], side = [t * 0.42, t * 0.42, t * 0.45], bed = [0.3, 0.29, 0.29];
        quad([x0, y1, z0], [x0, y1, z1], [x1, y1, z1], [x1, y1, z0], top);
        quad([x0 - 0.035, y + 0.004, z0 - 0.035], [x0 - 0.035, y + 0.004, z1 + 0.035], [x1 + 0.035, y + 0.004, z1 + 0.035], [x1 + 0.035, y + 0.004, z0 - 0.035], bed);   // (its bed: the joints read dark)
        quad([x0, y, z1], [x1, y, z1], [x1, y1, z1], [x0, y1, z1], side); quad([x1, y, z0], [x0, y, z0], [x0, y1, z0], [x1, y1, z0], side);
        quad([x1, y, z1], [x1, y, z0], [x1, y1, z0], [x1, y1, z1], side); quad([x0, y, z0], [x0, y, z1], [x0, y1, z1], [x0, y1, z0], side);
      }
      x += dx;
    }
    z += dz;
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.computeVertexNormals();
  return g;
}
// a cluster of pale spiked stalagmites, dark at the tips
function spikes(k, n = 5, s = 1) {
  for (let i = 0; i < n; i++) {
    const a = i * 2.4, r = i ? 0.12 + (i % 3) * 0.08 : 0, h = (0.9 - (i % 3) * 0.2) * s;
    k.add(cyl(0.001, 0.11 * s, h, 7), boneM(), Math.sin(a) * r * s, h / 2, Math.cos(a) * r * s);
    k.add(cyl(0.001, 0.034 * s, h * 0.3, 6), tipM(), Math.sin(a) * r * s, h * 0.86, Math.cos(a) * r * s);
  }
  return { r: 0.32 * s, top: 0.9 * s };
}
// a clutch of blue eggs, broken open long ago: half shells and one whole
function eggs(k, n = 4) {
  for (let i = 0; i < n; i++) {
    const a = i * 2.1, r = i ? 0.24 : 0, x = Math.sin(a) * r, z = Math.cos(a) * r;
    if (i % 2) k.add(sphere(0.17, 12, 8), eggM(), x, 0.15, z, a, { sy: 1.25 });
    else k.add(new THREE.SphereGeometry(0.17, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.55), eggM(), x, 0.03, z, a, { rx: Math.PI, sy: 1.2 });
  }
  return { r: 0.4, top: 0.4 };
}
// a short stone post with a cyan glass globe
function globePost(k) {
  k.add(rbox(0.3, 1.0, 0.3, 0.04), blockM(), 0, 0.5, 0);
  k.add(rbox(0.36, 0.08, 0.36, 0.02), capM(), 0, 1.02, 0);
  k.add(sphere(0.17, 14, 10), globeM(), 0, 1.24, 0);
  return { hw: 0.17, hd: 0.17, top: 1.4 };
}
// a wrought-iron candle stand
function candleStand(k) {
  k.add(cyl(0.16, 0.2, 0.05, 10), MAT.iron(), 0, 0.025, 0);
  k.add(cyl(0.025, 0.025, 1.3, 6), MAT.iron(), 0, 0.67, 0);
  k.add(cyl(0.09, 0.05, 0.06, 10), MAT.iron(), 0, 1.33, 0);
  k.add(cyl(0.035, 0.035, 0.16, 8), MAT.paint('#f2ead6', 0.6), 0, 1.44, 0);
  candle(k, 0, 1.33, 0);
  return { r: 0.18, top: 1.5 };
}
// a boulder against a wall's foot (CAVE-STAIR: faceted, each face its own flat projection of the rock; a round sphere's
// per-vertex projection read as a dark ring on the floor from the room's camera. CAVE-LOOK: the cave's own faceted rock)
let BSEED = 0;
function boulder(k, s = 1) {
  k.add(rk(3 + (BSEED++ % 9) * 4), caveRock(), 0, 0, 0, 0, { sx: 0.5 * s, sy: 0.42 * s, sz: 0.46 * s });
  return { r: 0.55 * s, top: 0.6 * s };
}

export function buildTraluCaveRoom(scene, physics) {
  const B = new RoomBuilder(scene, physics, 'tralucave', TRALUCAVE_AT.x, TRALUCAVE_AT.z);
  const R = B.room, k = B.k;
  // (the user 2.11, "make them bigger": the floor 1.5 times the first cut, the terrace a little higher, the camera
  //  close and following Twinsen; the props keep their size)
  const F = 1.5, W = 18 * F, D = 14 * F, H = 5.4;
  R.view = 12.5; R.follow = 0.65; R.music = 'cave';   // (ORDER 19: a rock cave, the well's dark cave piece, not the family's Home)
  // CAVE-LOOK: the room's key light from the camera's side, high (ASYLUM-4's R.indoor.sunDir): from the default side
  // (behind the far walls) every face of the rock the camera sees stood in its own shade and read as one dark sheet;
  // a cave lit by its globes and lamps, so the daylight fill is dimmed
  R.indoor = { sunDir: [0.42, 0.78, 0.46], sun: 0.6, hemi: 0.85 };
  const block = blockM(), cap = capM();
  const LX = -W / 2, BZ = -D / 2, DOORZ = 4.8 * F;
  const T = 0.7, crock = caveRock(), cfloor = caveFloor();
  // (B.shell's bounds, floor and wall colliders, unchanged; the rock round it is drawn at the end, once every spot is known)
  (R.bounds ??= []).push({ x0: B.cx - W / 2, x1: B.cx + W / 2, z0: B.cz - D / 2, z1: B.cz + D / 2 });
  B.W = W; B.D = D; B.H = H; B.t = T;
  B.col(0, 0, W / 2, D / 2, 0, { seeThrough: true, bottom: -1 });
  B.wallCols(W, D, H, T);
  R.exits.push({ x: B.cx + LX + 0.45, z: B.cz + DOORZ, r: 0.8, to: 'tralucave-out' });
  R.spawn = { x: B.cx + LX + 1.4, z: B.cz + DOORZ, a: Math.PI / 2 };

  // the worn paved patches in the rock floor (the original's darker brick)
  // (CAVE-LOOK: flagstones, each its own slab and tone, the edges ragged where flags are gone: a rectangle of one repeated
  //  3 × 3 tile texture read as a checkerboard laid on the rock)
  for (const [x, z, w, d, sd] of [[-3.0, 3.6, 4.2, 2.6, 1], [1.0, 1.4, 3.0, 1.6, 2], [-4.6, 5.8, 2.0, 1.2, 3]]) k.add(flags(x * F, z * F, w * F / 2, d * F / 2, 0, sd), cfloor);
  // --- the rock terrace at the back left, 1.6 m up, its face rough rock with boulders at its foot
  const TY = 1.8, TX1 = -1.0 * F, TZ1 = -1.6 * F;
  k.add(new THREE.BoxGeometry(TX1 - LX, TY - 0.02, TZ1 - BZ), crock, (LX + TX1) / 2, (TY - 0.02) / 2, (BZ + TZ1) / 2);   // (its faces: the rock ledge drawn over them below)
  k.add(flags(-5.0 * F, -3.4 * F, 1.8 * F, 1.2 * F, TY, 4), cfloor);
  B.col((LX + TX1) / 2, (BZ + TZ1) / 2, (TX1 - LX) / 2, (TZ1 - BZ) / 2, TY);
  for (const [x, z, s] of [[-8.0, -1.3, 0.8], [-6.4, -1.25, 0.6], [-4.6, -1.3, 0.7]]) B.put(x * F, TZ1 + 0.3, x, (kk) => boulder(kk, s));
  // the stair down at its right end, from the terrace's edge toward the front
  const SX0 = TX1 - 1.45 * F, SX1 = TX1 - 0.05, N = 6, run = 0.6, rise = TY / N;
  for (let i = 0; i < N; i++) {
    const top = rise * (N - i), z = TZ1 + (i + 0.5) * run;
    k.add(rbox(SX1 - SX0, top - 0.02, run + 0.02, 0.02), block, (SX0 + SX1) / 2, (top - 0.02) / 2, z);   // (OVERLAP-1: 2 cm inside its tread, not level with the tread's top: the two flickered)
    k.add(rbox(SX1 - SX0 + 0.04, 0.05, run + 0.04, 0.01), cap, (SX0 + SX1) / 2, top - 0.025, z);
    B.col((SX0 + SX1) / 2, z, (SX1 - SX0) / 2, run / 2 + 0.12, top, { stair: true });   // (+0.12: the steps overlap each other and the floor at their top under groundAt's 5 cm shrink)
    // CAVE-STAIR: its open east side is the steps' own stone, a wall from the floor: a stair collider never pushes
    // (physics.js: the ground under the feet decides), so from the lower floor he walked into the flight's side at
    // floor level and stood inside it. A thin brick along each step's side, its exact run, as high as its tread (none
    // reaches over the next step: on the flight he never meets one more than a step over his feet)
    B.col(SX1 - 0.05, z, 0.05, run / 2, top, { noStand: true });
  }
  // rusted railings: along the terrace's edge (open over the stair), down its right side, and down the stair
  const rail = rustM();
  k.at(0, TY, 0, 0, () => railing(k, [[LX + 0.2, TZ1 - 0.06], [SX0 - 0.05, TZ1 - 0.06]], { h: 0.95, mat: rail, step: 0.42 }));
  B.col((LX + 0.2 + SX0) / 2, TZ1 - 0.06, (SX0 - LX - 0.2) / 2, 0.06, TY + 1.0, { seeThrough: true, noStand: true });
  k.at(0, TY, 0, 0, () => railing(k, [[TX1 - 0.06, BZ + 0.2], [TX1 - 0.06, TZ1]], { h: 0.95, mat: rail, step: 0.42 }));
  B.col(TX1 - 0.06, (BZ + 0.2 + TZ1) / 2, 0.06, (TZ1 - BZ - 0.2) / 2, TY + 1.0, { seeThrough: true, noStand: true });
  railing(k, [[SX0 - 0.05, TZ1], [SX0 - 0.05, TZ1 + N * run]], { h: 0.95 + TY / 2, mat: rail, step: 0.45 });
  B.col(SX0 - 0.05, TZ1 + N * run / 2, 0.06, N * run / 2, TY + 1.0, { seeThrough: true, noStand: true });
  // the barred gate in the back rock: a stone arch with rusted bars, shut
  const GX = -5.0 * F, gw = 1.8, gh = 2.7;
  k.add(rbox(gw + 0.9, gh + 0.5, 0.5, 0.05), block, GX, TY + (gh + 0.5) / 2, BZ + 0.2);
  k.add(rbox(gw, gh - gw / 2, 0.06, 0.01), MAT.flat('#141618', 0.9), GX, TY + (gh - gw / 2) / 2, BZ + 0.46);
  k.add(new THREE.CircleGeometry(gw / 2, 16, 0, Math.PI), MAT.flat('#141618', 0.9), GX, TY + gh - gw / 2, BZ + 0.46);
  k.add(new THREE.TorusGeometry(gw / 2 + 0.06, 0.1, 6, 16, Math.PI), cap, GX, TY + gh - gw / 2, BZ + 0.5);
  for (let i = 0; i < 7; i++) { const x = GX - gw / 2 + 0.15 + i * (gw - 0.3) / 6, h = gh - 0.15 - Math.max(0, Math.abs(x - GX) - 0.25) * 0.9; k.add(cyl(0.025, 0.025, h, 6), rail, x, TY + h / 2, BZ + 0.52); }
  for (const y of [0.5, 1.4]) k.add(rbox(gw - 0.1, 0.06, 0.04, 0.01), rail, GX, TY + y, BZ + 0.52);
  // on the terrace: the egg clutches (empty shells), spikes, a globe post at each end of the edge
  for (const [x, z, n] of [[-7.6, -6.2, 5], [-3.0, -6.0, 3], [-8.2, -3.4, 4], [-3.6, -4.4, 4]]) B.put(x * F, z * F, x, (kk) => eggs(kk, n), { y: TY });
  for (const [x, z, s] of [[-6.6, -5.2, 0.9], [-2.0, -4.2, 0.8], [-8.6, -5.6, 1.0]]) B.put(x * F, z * F, 0, (kk) => spikes(kk, 5, s), { y: TY });
  for (const x of [LX + 0.45, SX0 - 0.35]) B.put(x, TZ1 - 0.35, 0, (kk) => globePost(kk), { y: TY });

  // --- the old guard house at the back right: squared blocks, a doorway and barred windows in its front
  const HX0 = 0.2 * F, HZ1 = -0.8 * F, HH = 3.3;
  const wall = { h: HH, t: 0.4, body: block, cap, dado: 0 };
  B.partition(HX0, BZ, HX0, HZ1, wall);
  B.partition(HX0, HZ1, W / 2, HZ1, { ...wall, doors: [{ at: 1.9 * F, w: 1.4 }] });
  for (const x of [4.2 * F, 6.0 * F, 7.8 * F, 9.6 * F]) {   // (the barred windows, both faces)
    for (const s of [-1, 1]) {
      k.add(rbox(0.9, 1.0, 0.04, 0.01), MAT.flat('#141618', 0.9), x, 1.6, HZ1 + s * 0.21);
      for (let i = 0; i < 4; i++) k.add(cyl(0.022, 0.022, 1.0, 6), rail, x - 0.3 + i * 0.2, 1.6, HZ1 + s * 0.24);
    }
  }
  // its pillars of blocks at the corners
  for (const [x, z] of [[HX0, HZ1], [W / 2 - 0.3, HZ1]]) { k.add(rbox(0.6, HH + 0.4, 0.6, 0.04), block, x, (HH + 0.4) / 2, z); k.add(rbox(0.7, 0.12, 0.7, 0.03), cap, x, HH + 0.46, z); B.col(x, z, 0.3, 0.3, HH + 0.5); }
  // inside: barrels, the table with plates and a bottle, a bench, candle stands; a lantern, rope and a crate (ours)
  for (const [x, z] of [[1.0, -6.3], [1.6, -6.4], [1.25, -5.8], [8.3, -2.0]]) B.put(x * F, z * F, x, (kk) => barrel(kk, { pal: 'honey' }));
  B.put(5.4 * F, -4.8 * F, 0, (kk) => { const r = table(kk, { w: 1.7, d: 0.85, pal: 'honey' }); plate(kk, -0.4, 0.78, 0); plate(kk, 0.35, 0.78, 0.05); jar(kk, 0, 0.78, -0.1, 'bottle', '#2f8a9a', 1.0); return r; });
  B.put(5.4 * F, -4.8 * F + 0.9, 0, (kk) => bench(kk, { w: 1.5, pal: 'honey' }));
  for (const x of [3.6, 7.2]) B.put(x * F, -5.0 * F, 0, (kk) => candleStand(kk));
  B.put(8.2 * F, -6.2 * F, 0.3, (kk) => { kk.add(rbox(0.75, 0.6, 0.6, 0.02), MAT.paint('#7a5a36', 0.8), 0, 0.3, 0); kk.add(cyl(0.2, 0.2, 0.12, 14, true), MAT.paint('#b89a6a', 0.9), 0, 0.66, 0); kk.add(rbox(0.12, 0.2, 0.12, 0.02), MAT.glow('#ffe0a0', '#ffb040', 0.9), 0.2, 0.7, 0.15); return { hw: 0.38, hd: 0.3, top: 0.75 }; });
  // SEWERS-1 (C-2): an echo of LBA2's rescue: the old guitar case of the lighthouse keeper the monster once held here,
  // leaning on the back wall; and the crate under the lantern is someone's cache (story/sewers.js: a clover, once)
  // (WAVE4 H-11: the case its own group, so it can go with Twinsen to Raph: R.cache.setCase, story/wave4.js)
  const caseG = new THREE.Group(); caseG.name = 'raph case'; k.group.add(caseG);
  const ck = new Kit(caseG);
  ck.at(10.2, 0, BZ + 0.32, 0, () => {
    const lm = MAT.paint('#4a2c1c', 0.7), br = MAT.brass();
    ck.add(sphere(0.27, 12, 8), lm, 0, 0.32, 0, 0, { sx: 1, sy: 1.15, sz: 0.32, rx: -0.16 });
    ck.add(sphere(0.2, 12, 8), lm, 0, 0.72, -0.06, 0, { sx: 1, sy: 1.1, sz: 0.36, rx: -0.16 });
    ck.add(rbox(0.15, 0.48, 0.1, 0.03), lm, 0, 1.08, -0.12, 0, { rx: -0.16 });
    for (const y of [0.3, 0.7]) ck.add(rbox(0.06, 0.04, 0.03, 0.01), br, 0.22, y, 0.08 - y * 0.16);
  });
  ck.flush();
  const caseCol = B.ccol(10.2, BZ + 0.32, 0.3, 1.3);
  R.cache = { case: { ...B.world(10.2, BZ + 1.15) }, crate: { ...B.world(8.2 * F, -6.2 * F + 0.95), at: B.world(8.2 * F, -6.2 * F) },
    setCase(on) { caseG.visible = !!on; caseCol.enabled = !!on; } };

  // --- the lower cave: the railed pool at the front right, globe posts at its corners, spike clusters, boulders
  const PX0 = 3.0 * F, PX1 = 7.4 * F, PZ0 = 2.0 * F, PZ1 = 5.4 * F, kerb = 0.3;
  // (FLICKER-142: the side kerbs 6 mm higher: at the corners the four kerbs' tops lay in one plane)
  // (and each 1 cm short at its ends, inside the crossing kerb: their end faces lay in the other's outer face)
  for (const [x0, z0, x1, z1, up] of [[PX0 + 0.01, PZ0, PX1 - 0.01, PZ0 + 0.3, 0], [PX0 + 0.01, PZ1 - 0.3, PX1 - 0.01, PZ1, 0], [PX0, PZ0 + 0.01, PX0 + 0.3, PZ1 - 0.01, 0.006], [PX1 - 0.3, PZ0 + 0.01, PX1, PZ1 - 0.01, 0.006]]) k.add(rbox(x1 - x0, kerb + up, z1 - z0, 0.03), block, (x0 + x1) / 2, (kerb + up) / 2, (z0 + z1) / 2);
  k.add(plane(PX1 - PX0 - 0.6, PZ1 - PZ0 - 0.6), waterM(), (PX0 + PX1) / 2, kerb - 0.08, (PZ0 + PZ1) / 2, 0, { rx: -Math.PI / 2 });
  k.at(0, kerb, 0, 0, () => railing(k, [[PX0 + 0.15, PZ0 + 0.15], [PX1 - 0.15, PZ0 + 0.15], [PX1 - 0.15, PZ1 - 0.15], [PX0 + 0.15, PZ1 - 0.15], [PX0 + 0.15, PZ0 + 0.15]], { h: 0.9, mat: rail, step: 0.45 }));
  B.col((PX0 + PX1) / 2, (PZ0 + PZ1) / 2, (PX1 - PX0) / 2, (PZ1 - PZ0) / 2, kerb + 1.0, { seeThrough: true, noStand: true });
  for (const [x, z] of [[PX0 - 0.3, PZ0 - 0.3], [PX1 + 0.3, PZ0 - 0.3], [PX0 - 0.3, PZ1 + 0.3]]) B.put(x, z, 0, (kk) => globePost(kk));
  for (const [x, z, s] of [[-6.2, 2.6, 1], [-4.2, 6.2, 0.8], [1.2, 6.0, 0.9], [8.2, 1.0, 1.1], [-0.5, -6.4, 0.9], [8.3, 6.1, 0.8], [-8.0, 0.4, 0.9]]) B.put(x * F, z * F, 0, (kk) => spikes(kk, 6, s));
  for (const [x, z, s] of [[LX + 0.5, 1.2, 0.9], [LX + 0.5, 6.4, 0.7], [W / 2 - 0.4, 3.6, 0.8]]) B.put(x, z * F, x, (kk) => boulder(kk, s));
  // a clutch of shells down here too, by the pool
  B.put(2.2 * F, 4.4 * F, 1, (kk) => eggs(kk, 3));

  // ---------------------------------------------------------------- CAVE-LOOK: the cave round it all
  const RX = W / 2, RZ = D / 2;
  {
    // the floors: grids (0.75 m) so the baked light has points to sit on; the lower floor round the terrace's foot
    const grid = (x0, z0, x1, z1, y, step = 0.75) => { const g = new THREE.PlaneGeometry(x1 - x0, z1 - z0, Math.max(1, Math.round((x1 - x0) / step)), Math.max(1, Math.round((z1 - z0) / step))); g.rotateX(-Math.PI / 2); k.add(g, cfloor, (x0 + x1) / 2, y, (z0 + z1) / 2); };
    grid(-RX, TZ1, RX, RZ, 0); grid(TX1, -RZ, RX, TZ1, 0); grid(LX, BZ, TX1, TZ1, TY);
    // the section under the floor, seen past the near rims
    k.add(new THREE.BoxGeometry(W + 2 * T, 0.8, D + 2 * T), crock, 0, -0.42, 0);
    // the far walls: a flat backing (rock), and over it the rock face: pushed out up to ~0.5 m, leaning over toward the
    // top (the start of the vault the cut-away leaves off), an uneven crest; its foot within the 0.3 m brick along it
    const wallOut = (seed, y0, near = () => 1) => (s, y) => {
      let d = 0.1 + 0.42 * fbm(s * 0.42, y * 0.62, seed) + 0.16 * (vn2(s * 0.16, y * 1.9, seed + 3) - 0.5);   // (lumps, and strata along it)
      d += 0.8 * smoothstep(H * 0.5, H + 0.3, y) * fbm(s * 0.27, 3.1, seed + 5);
      if (y < y0 + 1.7) d = Math.min(d, 0.34);
      return Math.max(0.04, d * near(s, y));
    };
    const crest = (seed) => (s) => -0.2 + 0.85 * fbm(s * 0.33, 7.7, seed);
    const back = (s, y, d) => [s, y, -RZ + d], left = (s, y, d) => [-RX + d, y, s];
    const face = (o) => { const [f, l] = rockFace({ ds: 0.6, dy: 0.55, lip: 0.55, ...o }); k.add(f, crock); if (l) k.add(l, cfloor); };
    const box = (x0, y0, z0, x1, y1, z1, m = crock) => k.add(new THREE.BoxGeometry(x1 - x0, y1 - y0, z1 - z0), m, (x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
    const DZ0 = DOORZ - 0.8, DZ1 = DOORZ + 0.8, DH = 2.6;
    // (FLICKER-142: the far walls' near ends 1 cm short of the rims' outer faces, which they lay in)
    box(-RX - T, 0, -RZ - T, RX + T - 0.01, H - 0.25, -RZ);
    box(-RX - T, 0, -RZ, -RX, H - 0.25, DZ0); box(-RX - T, 0, DZ1, -RX, H - 0.25, RZ + T - 0.01); box(-RX - T, DH, DZ0, -RX, H - 0.25, DZ1);
    // back wall: over the terrace (flat behind the gate's arch), the alcove behind the stair, over the guard house
    const gate = (s, y) => smoothstep(0, 0.8, Math.max(Math.abs(s - GX) - (gw + 0.9) / 2, y - (TY + gh + 0.55)));
    face({ s0: -RX - T, s1: TX1 + 0.3, y0: TY - 0.05, y1: H, out: wallOut(11, TY, gate), top: crest(1), to: back, facing: [0, 1], seed: 11 });
    face({ s0: TX1 - 0.3, s1: HX0, y0: 0, y1: H, out: wallOut(11, 0), top: crest(1), to: back, facing: [0, 1], seed: 12 });
    face({ s0: HX0, s1: RX + T, y0: HH + 0.35, y1: H, out: wallOut(11, HH), top: crest(1), to: back, facing: [0, 1], seed: 13 });
    box(HX0, 0, -RZ, RX, HH + 0.4, -RZ + 0.12, block);   // (the guard house's own back wall of squared blocks, against the rock)
    // left wall: over the terrace, then the lower floor round the doorway (flush at its jambs)
    const door = (s, y) => smoothstep(0, 0.9, Math.max(Math.abs(s - DOORZ) - 0.8, y - DH));
    face({ s0: -RZ, s1: TZ1 + 0.3, y0: TY - 0.05, y1: H, out: wallOut(31, TY), top: crest(2), to: left, facing: [1, 0], seed: 31 });
    face({ s0: TZ1 - 0.3, s1: DZ0, y0: 0, y1: H, out: wallOut(31, 0, door), top: crest(2), to: left, facing: [1, 0], seed: 32 });
    face({ s0: DZ0, s1: DZ1, y0: DH, y1: H, out: wallOut(31, 0, door), top: crest(2), to: left, facing: [1, 0], seed: 33 });
    face({ s0: DZ1, s1: RZ + T, y0: 0, y1: H, out: wallOut(31, 0, door), top: crest(2), to: left, facing: [1, 0], seed: 34 });
    // rock masses bedded in the faces in rough courses (the underground's rockWallRun, held to the bricks at the foot):
    // the foot's stones out at most 0.34 m, the middle's 0.6, the top's 0.85 and over the crest (the uneven skyline)
    const masses = (s0, s1, y0, y1, seed, to, keep = () => true) => {
      const tiers = Math.max(1, Math.round((y1 - y0) / 1.75)), band = (y1 - y0) / tiers;
      for (let t = 0; t < tiers; t++) {
        const top = t === tiers - 1, foot = t === 0 && y0 < 0.1 || t === 0 && y0 > TY - 0.2 && y0 < TY + 0.1;
        for (let s = s0 + (t % 2 ? 0.7 : 0.2) + hash2(t, seed, 1) * 0.5, i = 0; s < s1 - 0.2; s += 1.15 + hash2(i, t, seed) * 0.9, i++) {
          const h = (n) => hash2(i * 7 + n, t * 13, seed);
          const sx = 0.62 + h(1) * 0.5, sy = band * (0.42 + h(2) * 0.2) * (top ? 1.25 : 1), sz = 0.42 + h(3) * 0.3;
          const reach = (foot ? 0.34 : top ? 0.85 : 0.6) * (0.75 + h(4) * 0.25), y = y0 + t * band * 0.94 - (t ? 0.25 : 0.02);
          if (!keep(s, y, sx * 1.25, y + sy * 1.5)) continue;
          const [x, , z] = to(s, y, reach - sz * 1.22);
          k.add(rk(Math.floor(h(5) * 40)), crock, x, y, z, (h(6) - 0.5) * 0.8 + (to === left ? Math.PI / 2 : 0), { sx, sy, sz });
        }
      }
    };
    const noGate = (s, y, r, yt) => Math.abs(s - GX) - r > (gw + 0.9) / 2 + 0.1 || y > TY + gh + 0.6;
    const noDoor = (s, y, r) => Math.abs(s - DOORZ) - r > 0.95 || y > DH + 0.25;
    masses(-RX - 0.3, TX1, TY - 0.05, H, 41, back, noGate);
    masses(TX1, HX0 - 0.2, 0, H, 43, back);
    masses(HX0 + 0.3, RX + T, HH + 0.4, H, 45, back);
    masses(-RZ - 0.3, TZ1, TY - 0.05, H, 47, left, (s, y, r) => y > TY + 1 || Math.abs(s - (TZ1 - 0.35)) - r > 0.25);   // (the globe post on the terrace's corner)
    masses(TZ1, RZ + T, 0, H, 49, left, noDoor);
    // the doorway: a short passage into the rock, a worn sill, dark at its end; rough stones for its jambs and lintel
    box(-RX - T - 1.1, -0.06, DZ0, -RX, 0, DZ1, cap);
    box(-RX - T - 1.1, 0, DZ0 - 0.3, -RX - T, DH + 0.3, DZ0); box(-RX - T - 1.1, 0, DZ1, -RX - T, DH + 0.3, DZ1 + 0.3); box(-RX - T - 1.1, DH, DZ0, -RX - T, DH + 0.3, DZ1);
    k.add(plane(1.6, DH), MAT.flat('#121416', 0.9), -RX - T - 1.05, DH / 2, DOORZ, Math.PI / 2);
    for (const [z, sd] of [[DZ0 - 0.32, 5], [DZ1 + 0.32, 9]]) k.add(rk(sd), crock, -RX - 0.12, 0, z, sd, { sx: 0.34, sy: 1.25, sz: 0.34 });
    k.add(rk(17), crock, -RX - 0.1, DH - 0.05, DOORZ, 0.4, { sx: 1.25, sy: 0.32, sz: 0.3 });
    // the terrace: its front and east faces a rough rock ledge, flush at the top under the railing
    const ledge = (seed) => (s, y) => (0.07 + 0.34 * fbm(s * 0.7, y * 0.9, seed)) * (1 - 0.86 * smoothstep(TY - 0.6, TY, y));
    face({ s0: LX, s1: SX0 + 0.05, y0: 0, y1: TY + 0.012, ds: 0.5, dy: 0.45, lip: 0.08, out: ledge(21), to: (s, y, d) => [s, y, TZ1 + d], facing: [0, 1], seed: 21 });
    face({ s0: BZ, s1: TZ1, y0: 0, y1: TY + 0.012, ds: 0.5, dy: 0.45, lip: 0.08, out: ledge(23), to: (s, y, d) => [TX1 + d, y, s], facing: [1, 0], seed: 23 });
    // the near rims: low rock with stones along them (the cut-away's edge)
    const rh = 0.5, rr = (sd) => { const h = hash2(sd, 1, 77); return h; };
    box(-RX - T, 0, RZ, RX + T, rh, RZ + T, cfloor); box(RX, 0, -RZ - T, RX + T, rh, RZ, cfloor);
    for (let x = -RX - T + 0.4, i = 0; x < RX + T; x += 0.9 + rr(i) * 0.7, i++) k.add(rk(i, true), crock, x, 0.05, RZ + T * 0.45, rr(i + 50) * 6, { sx: 0.45 + rr(i + 9) * 0.3, sy: 0.3 + rr(i + 19) * 0.25, sz: T * 0.62 });
    for (let z = -RZ - T + 0.4, i = 0; z < RZ; z += 0.9 + rr(i + 3) * 0.7, i++) k.add(rk(i + 7, true), crock, RX + T * 0.45, 0.05, z, rr(i + 60) * 6, { sx: T * 0.62, sy: 0.3 + rr(i + 29) * 0.25, sz: 0.45 + rr(i + 39) * 0.3 });
    // rock masses in the far corners and where the terrace meets the wall (the box's corners gone), and the rock's
    // rubble on the floor: stones and pebbles off the paths (no brick: small enough to walk over)
    const mass = (x, y, z, sx, sy, sz, sd, ry = 0) => k.add(rk(sd), crock, x, y, z, ry, { sx, sy, sz });
    mass(-RX + 0.15, 0, TZ1 + 0.45, 0.75, 0.95, 0.7, 7, 0.6); B.ccol(-RX + 0.3, TZ1 + 0.4, 0.42, 1.2, { noStand: true });
    mass(-RX + 0.1, TY - 0.1, -RZ + 0.1, 0.8, 1.1, 0.8, 19, 0.3); mass(-RX + 0.05, TY + 1.5, -RZ + 0.05, 0.75, 1.0, 0.7, 23, 1.4); mass(-RX, TY + 2.7, -RZ, 0.85, 0.9, 0.85, 29, 2.2);
    B.ccol(-RX + 0.35, -RZ + 0.35, 0.55, H, { noStand: true });
    mass(TX1 + 0.1, 0, -RZ + 0.15, 0.7, 1.1, 0.65, 13, 0.9); mass(TX1, 1.4, -RZ + 0.05, 0.6, 1.0, 0.6, 31, 2.0);
    B.ccol(TX1 + 0.35, -RZ + 0.35, 0.4, H, { noStand: true });
    // two buttresses of rock out of the walls (the straight wall lines broken): off the left wall over the boulder between
    // the terrace and the door, off the back wall on the terrace beside the stair's head; a brick round each
    mass(-RX + 0.1, 0, 1.75, 0.95, 1.35, 0.85, 37, 0.2); mass(-RX, 1.6, 1.4, 0.8, 1.2, 0.75, 41, 1.1); mass(-RX + 0.05, 0, 3.0, 0.6, 0.8, 0.6, 43, 2.3);
    B.ccol(-RX + 0.55, 1.95, 0.75, H, { noStand: true });
    mass(-2.75, TY - 0.1, -RZ + 0.1, 0.8, 1.2, 0.85, 47, 0.5); mass(-2.6, TY + 1.4, -RZ, 0.7, 1.1, 0.7, 53, 1.7);
    B.ccol(-2.75, -RZ + 0.5, 0.65, H, { noStand: true });
    const clearOf = [[SX0 - 0.4, SX1 + 0.4, TZ1 - 0.2, TZ1 + N * run + 0.8], [PX0 - 0.8, PX1 + 0.8, PZ0 - 0.8, PZ1 + 0.8], [HX0 - 0.4, RX + 1, -RZ - 1, HZ1 + 0.9], [-RX - 1, -RX + 2.6, DOORZ - 1.3, DOORZ + 1.3], [LX - 1, TX1 + 0.4, -RZ - 1, TZ1 + 0.4]];
    for (let i = 0, n = 0; i < 160 && n < 46; i++) {
      const edge = hash2(i, 1, 91) < 0.55, x = edge ? (hash2(i, 2, 91) < 0.5 ? -RX + 0.35 + hash2(i, 3, 91) * 1.3 : -RX + hash2(i, 4, 91) * W) : -RX + hash2(i, 4, 91) * W;
      const z = edge && x > -RX + 1.7 ? -RZ + 0.35 + hash2(i, 5, 91) * 1.3 : -RZ + hash2(i, 6, 91) * D;
      if (clearOf.some(([a, b, c, d]) => x > a && x < b && z > c && z < d) || x > RX - 0.3 || z > RZ - 0.3) continue;
      const sz = 0.06 + hash2(i, 7, 91) ** 2 * (edge ? 0.26 : 0.14);
      k.add(rk(Math.floor(hash2(i, 8, 91) * 30), true), crock, x, -0.01, z, hash2(i, 9, 91) * 6, { sx: sz * (1 + hash2(i, 10, 91)), sy: sz * 0.75, sz }); n++;
    }
    // bricks along the faces' feet (each a little over 0.3 m out of the wall: he stops at the rock, not inside it)
    const strip = (x0, z0, x1, z1, top) => B.col((x0 + x1) / 2, (z0 + z1) / 2, (x1 - x0) / 2, (z1 - z0) / 2, top, { noStand: true });
    strip(-RX, -RZ, TX1, -RZ + 0.3, H); strip(TX1, -RZ, HX0 - 0.2, -RZ + 0.3, H);
    strip(-RX, -RZ, -RX + 0.3, TZ1, H); strip(-RX, TZ1, -RX + 0.3, DZ0 - 0.15, H); strip(-RX, DZ1 + 0.15, -RX + 0.3, RZ, H);
    strip(LX, TZ1, SX0 - 0.12, TZ1 + 0.3, TY); strip(TX1, BZ + 0.3, TX1 + 0.3, TZ1, TY);
  }

  // light: cold from the globes, warm in the guard house
  B.light('#bfe6ff', 4.5, 15, 5.2 * F, 3.0, 3.6 * F); B.light('#bfe6ff', 4, 15, -5.0 * F, TY + 2.6, -4.0 * F); B.light('#bfe6ff', 3.5, 13, -4.0 * F, 3.0, 4.0 * F);
  B.light('#ffd8a0', 4, 12, 5.4 * F, 2.6, -4.0 * F);
  B.finish();
  // the baked light (CAVE-LOOK): the rock and the floor carry their light in their vertex colours, multiplied into the
  // texture: darker toward the foot of the far walls and up toward the vault, the floor in broad patches of tone, pools
  // of the globes' cold light, the pool's glow, a warm pool round the guard house's candles and lantern, and the day's
  // light come in at the door. The room's lamps light it all as before; on the battery profile (two lamps) the pools stay
  const glow = [];
  for (const [x, z, y] of [[LX + 0.45, TZ1 - 0.35, TY], [SX0 - 0.35, TZ1 - 0.35, TY], [PX0 - 0.3, PZ0 - 0.3, 0], [PX1 + 0.3, PZ0 - 0.3, 0], [PX0 - 0.3, PZ1 + 0.3, 0]]) glow.push([x, y + 1.24, z, 4.8, 2.0, [0.36, 0.74, 1.0]]);
  for (const [x, z] of [[3.6 * F, -5.0 * F], [7.2 * F, -5.0 * F], [8.2 * F + 0.2, -6.2 * F + 0.15]]) glow.push([x, 1.4, z, 2.8, 0.5, [1.0, 0.72, 0.4]]);
  glow.push([LX + 0.3, 1.2, DOORZ, 3.0, 0.4, [1.0, 0.93, 0.8]]);
  // (straight over the arrays, one noise octave and the lamps' squared reach first: ~40 000 vertices, once per session)
  const nG = glow.length, G = glow.flat(2);   // [x, y, z, r, k, cr, cg, cb] per lamp
  for (const o of B.group.children) {
    if (!o.isMesh || (o.material !== crock && o.material !== cfloor)) continue;
    const P = o.geometry.attributes.position.array, C = o.geometry.attributes.color.array, onFloor = o.material !== crock;
    for (let i = 0; i < P.length; i += 3) {
      const x = P[i], y = P[i + 1], z = P[i + 2];
      const dl = Math.max(0, x - LX), db = Math.max(0, z - BZ), up = y > TY - 0.1 && x < TX1 + 0.2 && z < TZ1 + 0.2 ? TY : 0;
      const m = onFloor ? (0.66 + 0.4 * smoothstep(0, 2.6, Math.min(dl, db))) * (0.87 + 0.34 * vn2(x * 0.24, z * 0.24, 3))
        : (1.12 - 0.45 * smoothstep(up + 0.6, H + 0.6, y)) * (0.82 + 0.34 * vn2(x * 0.4 + z * 0.4, y * 0.55, 5)) * (0.78 + 0.22 * smoothstep(0, 1.2, y - up + Math.min(dl, db)));
      let r = m, g = m, b = m;
      for (let q = 0; q < nG * 8; q += 8) {
        const dx = x - G[q], dy = (y - G[q + 1]) * 0.6, dz = z - G[q + 2], d2 = dx * dx + dy * dy + dz * dz, R = G[q + 3];
        if (d2 >= R * R) continue;
        const f = (1 - Math.sqrt(d2) / R) ** 1.5 * G[q + 4]; r += G[q + 5] * f; g += G[q + 6] * f; b += G[q + 7] * f;
      }
      // the pool: its cold glow on the floor and kerb round it
      if (y < 1.5) {
        const pd = Math.hypot(Math.max(PX0 - x, 0, x - PX1), Math.max(PZ0 - z, 0, z - PZ1));
        if (pd < 2.6) { const f = (1 - pd / 2.6) ** 1.5 * 1.3; r += 0.36 * f; g += 0.8 * f; b += 0.9 * f; }
      }
      C[i] *= r; C[i + 1] *= g; C[i + 2] *= b;
    }
  }
  return { tralucave: R };
}

// the plateau's door leads in; coming out, Twinsen stands on the landing before it, 1 m from the door's spot, facing
// along the steps up to the plateau (REVIEW-CITADEL-ART d, island.js PLATEAU_STAIR: he faced the sea from the ledge's
// edge). The door's frame: lx along the face (toward the steps), lz out of it
const PD = OLD_DOORS.plateau;
export function traluCaveDoors() {
  return [{ house: 'plateau', x: PD.x + Math.sin(PD.ry) * 0.35, z: PD.z + Math.cos(PD.ry) * 0.35, r: 0.9, room: 'tralucave' }];
}
export function traluCaveExit(to) {
  if (to !== 'tralucave-out') return null;
  const c = Math.cos(PD.ry), s = Math.sin(PD.ry), lx = 0.95, lz = PLATEAU_STAIR.lz;   // (on the steps' axis)
  return { x: PD.x + c * lx + s * lz, z: PD.z - s * lx + c * lz, a: Math.atan2(c, -s) };
}
