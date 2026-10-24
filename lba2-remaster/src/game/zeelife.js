// Zeelich's street twelve years on: what changed along it (this sequel's proposed developments, docs/TWELVE_YEARS.md
// set 4; src/game/story/zeelife.js gives the places their people and the small story).
//
//   - The old watch house (east end, north side): a squat tower of dark ashlar, older than the council, its crest
//     chiselled off the lintel. Mother Snuff bakes the street's bread in it now: the guards' window is her bread hatch
//     (a counter, a striped awning, a slate, SNUFF'S BREAD painted over it), and her oven runs on the Joint Project's
//     heat (a copper feed from the depot under the street, a heat box on the east wall with a lamp: green when it runs,
//     red when it has shut itself off). The guards' stair still climbs the west wall to the flat roof, which Bzizz the
//     Mosquibee uses as his landing stage for nectar crates. One of them sits on the oven's flue (The Second Bake).
//   - The project's heat posts: lit at the bakehouse, the council house and the depot gate; dark at the west end
//     (Mr Pelleck's house, the south-west house, the moles' burrow hatch), each with a tag: CONNECTION NEXT QUARTER.
//   - The moles' burrow hatch by the market, its vent breathing warm air (the burrows below are too warm already).
//   - Mr Pelleck's dome being re-tiled: scaffold round it, the lower half in new tiles, a ladder, tile stacks.
//   - Nara's cloud flowers crated for Citadel by the shuttle pad, held while the project grounds the shuttles (ch. 3).
//
// CONTRACT (world coordinates): buildZeelichLife(ctx) → {
//   watch { hatch {x,z}, roofY, stairFoot {x,z}, stairMid {x,z}, flue {x,y,z}, use {x,z} (beside the flue, on the
//           roof), snuff {x,z,a}, bzizz {x,z,a}, tavo {x,z,a}, crateAt() → {x,y,z},
//           setCrate('flue'|'shoved'|'broken'), fall(done), setOven(hot) },
//   posts [{x,z, lit, tag}], burrow {x,z, vent{x,y,z}}, grumm {x,z,a}, pelleck {x,z,a}, scaffold {x,z},
//   flowers {x,z, setVisible(b)}, fader }
// zlClear(x, z, pad) keeps Zeelich's scatter (trees, rocks, grass) out of these places; it is applied after the
// scatter's random draws, so everything else on the island keeps its place.
import * as THREE from 'three';
import { tm, pm, ctex, bbox, boxUV, cyl, lathe, Batch, compose, tint, cached } from './kit.js';

const Y0 = 6.0;
// ---- layout (Zeelich-local coordinates)
export const WH = { x: 11, z: -11.5, w: 4.8, d: 4.6, h: 4.0 };
const X0 = WH.x - WH.w / 2, X1 = WH.x + WH.w / 2, Z0 = WH.z - WH.d / 2, Z1 = WH.z + WH.d / 2;
const DOOR = { x: 9.65, w: 1.1, h: 2.15 };
const HATCH = { x: 12.15, w: 1.45, y: 0.95, h: 0.9 };
const STAIR = { x: X0 - 0.55, n: 10, deep: 0.5, z0: Z1 + 0.9 };   // up the west wall, rising north; its top short of the north parapet
const FLUE = { x: X1 - 0.75, z: Z1 - 0.75, s: 0.7, h: 1.1 };  // the oven's flue stack in the roof's street corner (seen from the street)
const SPARE = { x: X1 - 0.75, z: Z0 + 0.75 };                 // Bzizz's other crates (the north-east corner)
const BROKEN = { x: X1 + 1.6, z: FLUE.z - 0.7 };              // where a crate knocked off the roof lands
const HEATBOX = { x: X1 + 0.16, z: Z1 - 0.95 };
const BURROW = { x: -31.6, z: 9.3 };
const FLOWERS = { x: -20.0, z: 12.6 };
const LIT = [[15.6, -6.4], [-20.6, -8.0], [9.2, 8.3]];
const DARK = [[-42.4, -7.2, 'pelleck'], [-36.2, 7.5, 'sw'], [-29.9, 8.0, 'burrow']];
const CROSS = { x: 16.0 };
// the heat feed: from the depot fence, under the street, to the bakehouse's heat box
const FEED = [[CROSS.x, 8.75], [CROSS.x, 3.7]];
const FEED2 = [[CROSS.x, -3.7], [CROSS.x, -6.1], [15.0, -7.4], [X1 + 0.22, -8.6], [X1 + 0.22, HEATBOX.z]];

export function zlClear(x, z, pad = 0.5) {
  if (x > X0 - 2.2 - pad && x < X1 + 3.0 + pad && z > Z0 - 1.2 - pad && z < Z1 + 2.2 + pad) return true;   // the watch house, stair, counter
  if (Math.hypot(x - BURROW.x, z - BURROW.z) < 2.0 + pad) return true;
  if (Math.hypot(x - FLOWERS.x, z - FLOWERS.z) < 1.8 + pad) return true;
  for (const [px, pz] of [...LIT, ...DARK]) if (Math.hypot(x - px, z - pz) < 0.7 + pad) return true;
  if (Math.abs(x - CROSS.x) < 0.6 + pad && z > -7 && z < 9) return true;
  return false;
}

// ---- painted textures
const signTex = () => ctex('zlsign', 256, 96, (x, W, H) => {
  x.fillStyle = '#f4e4c4'; x.fillRect(0, 0, W, H);
  x.strokeStyle = '#7a4a2a'; x.lineWidth = 6; x.strokeRect(4, 4, W - 8, H - 8);
  // a loaf
  x.fillStyle = '#c8803a'; x.beginPath(); x.ellipse(40, 50, 26, 16, 0, 0, 7); x.fill();
  x.strokeStyle = '#f4d8a0'; x.lineWidth = 3; for (const dx of [-10, 0, 10]) { x.beginPath(); x.moveTo(40 + dx - 4, 42); x.lineTo(40 + dx + 4, 58); x.stroke(); }
  x.fillStyle = '#5a2a1a'; x.textAlign = 'center'; x.textBaseline = 'middle';
  x.font = 'bold 34px sans-serif'; x.fillText("SNUFF'S", 156, 34);
  x.font = 'bold 30px sans-serif'; x.fillText('BREAD', 156, 68);
}, false);
const slateTex = (hot) => ctex('zlslate' + hot, 128, 160, (x, W, H) => {
  x.fillStyle = '#2a2a30'; x.fillRect(0, 0, W, H);
  x.strokeStyle = '#8a6a44'; x.lineWidth = 10; x.strokeRect(5, 5, W - 10, H - 10);
  x.fillStyle = 'rgba(245,245,240,0.92)'; x.textAlign = 'center'; x.font = 'bold 26px "Comic Sans MS", cursive, sans-serif';
  if (hot) { x.fillText('FRESH', W / 2, 58); x.fillText('BREAD', W / 2, 92); x.font = '20px "Comic Sans MS", cursive, sans-serif'; x.fillText('hot!', W / 2, 124); }
  else { x.fillText('OVEN', W / 2, 58); x.fillText('COLD', W / 2, 92); x.font = '18px "Comic Sans MS", cursive, sans-serif'; x.fillText('sorry', W / 2, 124); }
}, false);
const tagTex = () => ctex('zltag', 128, 64, (x, W, H) => {
  x.fillStyle = '#f2ecd8'; x.fillRect(0, 0, W, H); x.fillStyle = '#7a3ab0'; x.fillRect(0, 0, W, 12);
  x.fillStyle = '#2a2a30'; x.textAlign = 'center'; x.font = 'bold 15px sans-serif'; x.fillText('CONNECTION', W / 2, 32); x.fillText('NEXT QUARTER', W / 2, 52);
}, false);
const heldTex = () => ctex('zlheld', 128, 64, (x, W, H) => {
  x.fillStyle = '#f2ecd8'; x.fillRect(0, 0, W, H); x.fillStyle = '#7a3ab0'; x.fillRect(0, 0, W, 12);
  x.fillStyle = '#2a2a30'; x.textAlign = 'center'; x.font = 'bold 16px sans-serif'; x.fillText('CITADEL', W / 2, 31); x.fillStyle = '#b02a2a'; x.font = 'bold 18px sans-serif'; x.fillText('HELD', W / 2, 54);
}, false);
// the crest above the old door, chiselled off: a blank shield of scars
const scarTex = () => ctex('zlscar', 64, 64, (x, W, H) => {
  x.fillStyle = '#c8bcd0'; x.fillRect(0, 0, W, H);
  let s = 7; const r = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < 70; i++) { const px = r() * W, py = r() * H; x.strokeStyle = `rgba(${60 + r() * 40},${50 + r() * 30},${70 + r() * 30},${0.35 + r() * 0.4})`; x.lineWidth = 1 + r() * 2; x.beginPath(); x.moveTo(px, py); x.lineTo(px + (r() - 0.5) * 10, py + 3 + r() * 6); x.stroke(); }
}, true);
const stripeTex = () => ctex('zlstripe', 64, 64, (x, S) => { for (let i = 0; i < 6; i++) { x.fillStyle = i % 2 ? '#f4ecd8' : '#2f9a8a'; x.fillRect(i * S / 6, 0, S / 6 + 1, S); } });
const shieldShape = (w, h) => { const s = new THREE.Shape(); s.moveTo(-w / 2, h / 2); s.lineTo(w / 2, h / 2); s.lineTo(w / 2, -h * 0.05); s.quadraticCurveTo(w / 2, -h * 0.35, 0, -h / 2); s.quadraticCurveTo(-w / 2, -h * 0.35, -w / 2, -h * 0.05); s.closePath(); return s; };

export function buildZeelichLife({ group, col, W, updaters, domeTex, pelleck: PH }) {
  const C = {
    ash: tm('fortStone', { color: '#f2e6f8', rough: 0.92 }),       // the watch house's ashlar (lilac-grey)
    ashD: tm('fortStone', { color: '#c8bcd6', rough: 0.95 }),      // its plinth, string course, merlons
    planks: tm('planks', { color: '#c8a078', rough: 0.85 }),
    stripe: tm(stripeTex(), { rough: 0.9, side: THREE.DoubleSide }),
    VC: pm('#ffffff', 0.8, { vertexColors: true }),
    MVC: pm('#ffffff', 0.4, { vertexColors: true, metalness: 0.5 }),   // copper, teal, brass, all on one material
    paper: pm('#ffffff', 0.9, { map: tagTex(), side: THREE.DoubleSide }),
  };
  const iron = '#3a3640', COPPER = '#c8743a', TEAL = '#2c7f86', BRASS = '#c89a3c', WOOD = '#8a6440';
  // a rod between two points, tinted (so it merges with the rest of its vertex-coloured material)
  const _uy = new THREE.Vector3(0, 1, 0);
  const rodT = (Bt, a, b, r, color, mat, seg = 8) => {
    const A = new THREE.Vector3(...a), Bv = new THREE.Vector3(...b), d = Bv.clone().sub(A), len = d.length();
    const q = new THREE.Quaternion().setFromUnitVectors(_uy, d.normalize());
    Bt.addM(tint(cyl(r, r, +len.toFixed(2), seg), color), mat, new THREE.Matrix4().compose(A.add(Bv).multiplyScalar(0.5), q, new THREE.Vector3(1, 1, 1)));
  };
  // ================================================================ the watch house (its own group: it fades when it hides Twinsen)
  const WG = new THREE.Group(); group.add(WG);
  const B = new Batch(WG);
  const roofY = Y0 + WH.h;
  {
    // battered plinth, the walls, a string course with corbels under the parapet
    B.add(bbox(WH.w + 0.36, 0.55, WH.d + 0.36, 0.06, 1.8), C.ashD, WH.x, Y0 + 0.2, WH.z);
    B.add(bbox(WH.w, WH.h - 0.08, WH.d, 0.05, 1.9), C.ash, WH.x, Y0 + (WH.h - 0.08) / 2, WH.z);
    B.add(bbox(WH.w + 0.26, 0.14, WH.d + 0.26, 0.03, 1.8), C.ashD, WH.x, roofY - 0.05, WH.z);
    B.add(bbox(WH.w + 0.08, 0.1, WH.d + 0.08, 0.02, 1.8), C.ashD, WH.x, Y0 + 2.45, WH.z);
    const corb = cached('zlcorb', () => bbox(0.2, 0.22, 0.16, 0.02, 1));
    for (let x = X0 + 0.3; x < X1 - 0.2; x += 0.55) for (const s of [-1, 1]) B.add(corb, C.ashD, x, roofY - 0.25, WH.z + s * (WH.d / 2 + 0.06));
    for (let z = Z0 + 0.3; z < Z1 - 0.2; z += 0.55) for (const s of [-1, 1]) B.add(corb, C.ashD, WH.x + s * (WH.w / 2 + 0.06), roofY - 0.25, z, 0, Math.PI / 2, 0);
    // the parapet: a low wall and merlons (open on the west side's north end, where the guards' stair arrives)
    const PT = 0.3, PH = 0.5, gap = [Z0 + PT, Z0 + PT + 1.45];
    const wallRun = (ax, az, bx, bz) => {
      const len = Math.hypot(bx - ax, bz - az), ry = Math.abs(bx - ax) > 1e-3 ? 0 : Math.PI / 2;
      B.add(bbox(len, PH, PT, 0.04, 1.8), C.ash, (ax + bx) / 2, roofY + PH / 2, (az + bz) / 2, 0, ry, 0);
      const n = Math.max(1, Math.round(len / 0.95));
      for (let i = 0; i < n; i++) { const t = (i + 0.5) / n; B.add(cached('zlmerlon', () => bbox(0.46, 0.46, PT + 0.04, 0.04, 1.8)), C.ashD, ax + (bx - ax) * t, roofY + PH + 0.23, az + (bz - az) * t, 0, ry, 0); }
      // (the ball may skim the merlons on its way to the crate on the flue: the parapet doesn't stop it)
      col({ type: 'box', x: (ax + bx) / 2, z: (az + bz) / 2, hw: ry ? PT / 2 : len / 2, hd: ry ? len / 2 : PT / 2, rot: 0, top: roofY + 0.95, noStand: true, seeThrough: true, noBall: true });
    };
    wallRun(X0, Z1 - PT / 2, X1, Z1 - PT / 2);                         // south (the street side)
    wallRun(X0, Z0 + PT / 2, X1, Z0 + PT / 2);                         // north
    wallRun(X1 - PT / 2, Z0 + PT, X1 - PT / 2, Z1 - PT);               // east
    wallRun(X0 + PT / 2, gap[1], X0 + PT / 2, Z1 - PT);                // west, south of the gap
    // the roof: flagstones, Bzizz's landing mark
    B.add(bbox(WH.w - 0.1, 0.04, WH.d - 0.1, 0.01, 1.6), C.ashD, WH.x, roofY + 0.0, WH.z);
    B.add(cached('zlmark', () => tint(new THREE.RingGeometry(0.62, 0.78, 24).rotateX(-Math.PI / 2), '#e8b84a')), C.VC, WH.x - 0.6, roofY + 0.03, WH.z - 0.2);
    col({ type: 'box', x: WH.x, z: WH.z, hw: WH.w / 2, hd: WH.d / 2, rot: 0, top: roofY });
    // the old door: planks, iron bands and a grilled spy window; the crest above it, chiselled off
    B.add(bbox(DOOR.w + 0.36, DOOR.h + 0.2, 0.14, 0.04, 1.8), C.ashD, DOOR.x, Y0 + (DOOR.h + 0.2) / 2, Z1 + 0.04);
    B.add(bbox(DOOR.w, DOOR.h, 0.08, 0.02, 1), C.planks, DOOR.x, Y0 + DOOR.h / 2, Z1 + 0.09);
    for (const y of [0.45, 1.05, 1.7]) B.add(cached('zlband', () => tint(bbox(DOOR.w + 0.02, 0.07, 0.03, 0.01, 1), iron)), C.VC, DOOR.x, Y0 + y, Z1 + 0.14);
    for (let k = 0; k < 4; k++) B.add(cached('zlbar', () => tint(cyl(0.015, 0.015, 0.34, 5), iron)), C.VC, DOOR.x - 0.12 + k * 0.08, Y0 + 1.4, Z1 + 0.15);
    B.add(cached('zlcrest', () => { const g = new THREE.ExtrudeGeometry(shieldShape(0.62, 0.74), { depth: 0.08, bevelEnabled: true, bevelThickness: 0.02, bevelSize: 0.02, bevelSegments: 1 }); return boxUV(g, 0.6); }), tm(scarTex(), { rough: 0.95 }), DOOR.x, Y0 + DOOR.h + 0.65, Z1 + 0.04);
    // slit windows (front, east side)
    const slit = cached('zlslit', () => tint(bbox(0.14, 0.72, 0.04, 0.01, 1), '#1e1820'));
    B.add(slit, C.VC, 10.95, Y0 + 3.0, Z1 + 0.02);
    for (const z of [WH.z - 0.9, WH.z + 0.9]) B.add(slit, C.VC, X1 + 0.02, Y0 + 2.9, z, 0, Math.PI / 2, 0);
    // the bread hatch (the guards' window, widened): a dark opening, a timber lintel and sill, the oven's mouth
    B.add(tint(bbox(HATCH.w, HATCH.h, 0.06, 0.01, 1), '#24181a'), C.VC, HATCH.x, Y0 + HATCH.y + HATCH.h / 2, Z1 + 0.01);
    B.add(bbox(HATCH.w + 0.3, 0.14, 0.2, 0.02, 1), C.planks, HATCH.x, Y0 + HATCH.y + HATCH.h + 0.07, Z1 + 0.06);
    B.add(bbox(HATCH.w + 0.2, 0.08, 0.3, 0.02, 1), C.planks, HATCH.x, Y0 + HATCH.y - 0.04, Z1 + 0.1);
    // the sign over the awning
    B.add(cached('zlsignq', () => new THREE.PlaneGeometry(1.5, 0.56)), pm('#ffffff', 0.85, { map: signTex() }), HATCH.x, Y0 + 3.05, Z1 + 0.04);
    // the awning (teal and cream), on two iron rods
    B.add(cached('zlawn', () => { const g = new THREE.PlaneGeometry(1.95, 0.95, 1, 1); g.rotateX(-Math.PI / 2 + 0.42); return g; }), C.stripe, HATCH.x, Y0 + 2.28, Z1 + 0.44);
    for (const s of [-1, 1]) rodT(B, [HATCH.x + s * 0.92, Y0 + 2.08, Z1 + 0.86], [HATCH.x + s * 0.92, Y0 + 2.6, Z1 + 0.02], 0.02, iron, C.VC);
    // the counter on its trestles
    B.add(bbox(1.8, 0.08, 0.56, 0.02, 1), C.planks, HATCH.x, Y0 + 0.94, Z1 + 0.5);
    for (const s of [-1, 1]) B.add(bbox(0.08, 0.9, 0.5, 0.02, 1), C.planks, HATCH.x + s * 0.75, Y0 + 0.45, Z1 + 0.5);
    col({ type: 'box', x: HATCH.x, z: Z1 + 0.5, hw: 0.92, hd: 0.3, rot: 0, top: Y0 + 0.98, noStand: true, seeThrough: true });
    // the project's heat box on the east wall, the feed's last metre up to it, a gauge
    B.add(tint(bbox(0.34, 0.62, 0.52, 0.04, 1), TEAL), C.MVC, HEATBOX.x, Y0 + 1.05, HEATBOX.z);
    B.add(tint(cyl(0.09, 0.09, 0.75, 10), COPPER), C.MVC, X1 + 0.22, Y0 + 0.38, HEATBOX.z - 0.0);
    B.add(cached('zlgauge', () => compose([[tint(cyl(0.1, 0.1, 0.05, 14).rotateZ(Math.PI / 2), BRASS)], [tint(new THREE.CircleGeometry(0.075, 12).rotateY(Math.PI / 2), '#f4f0e0'), 0.028, 0, 0]], true)), C.MVC, HEATBOX.x + 0.19, Y0 + 1.18, HEATBOX.z + 0.12);
    // the guards' stair up the west wall: solid treads (no seam to drop through, can't be walked under) and a
    // stepped balustrade on its open side and at its top
    const rise = WH.h / STAIR.n;
    for (let k = 0; k < STAIR.n; k++) {
      const top = Y0 + (k + 1) * rise, zc = STAIR.z0 - STAIR.deep * (k + 0.5);
      B.add(bbox(1.1, top - Y0 + 0.1, STAIR.deep + 0.01, 0.03, 1.8), C.ash, STAIR.x, (top + Y0 - 0.1) / 2, zc);
      col({ type: 'box', x: STAIR.x + 0.08, z: zc, hw: 0.63, hd: STAIR.deep / 2 + 0.06, rot: 0, top });   // (into the wall: no seam at the roof's edge)
      B.add(bbox(0.14, 0.82, STAIR.deep + 0.02, 0.03, 1.8), C.ashD, STAIR.x - 0.52, top + 0.41, zc);
      col({ type: 'box', x: STAIR.x - 0.58, z: zc, hw: 0.08, hd: STAIR.deep / 2 + 0.06, rot: 0, top: top + 0.95, noStand: true });
    }
    const zTop = STAIR.z0 - STAIR.deep * STAIR.n;   // the stair's north end (a balustrade across it)
    B.add(bbox(1.24, 0.82, 0.14, 0.03, 1.8), C.ashD, STAIR.x - 0.04, roofY + 0.41, zTop - 0.07);
    col({ type: 'box', x: STAIR.x - 0.04, z: zTop - 0.08, hw: 0.62, hd: 0.08, rot: 0, top: roofY + 0.95, noStand: true });
    // the oven's flue stack with a flat cap, and Bzizz's spare crates
    B.add(bbox(FLUE.s, FLUE.h, FLUE.s, 0.04, 1.8), C.ashD, FLUE.x, roofY + FLUE.h / 2, FLUE.z);
    B.add(tint(bbox(FLUE.s + 0.14, 0.07, FLUE.s + 0.14, 0.02, 1), iron), C.VC, FLUE.x, roofY + FLUE.h + 0.0, FLUE.z);
    col({ type: 'box', x: FLUE.x, z: FLUE.z, hw: FLUE.s / 2, hd: FLUE.s / 2, rot: 0, top: roofY + FLUE.h + 0.05, noStand: true });
    for (const [dx, dz, y, ry] of [[0, 0, 0, 0.1], [0.05, 0.02, 0.62, -0.15], [-0.5, 0.65, 0, 0.3]]) B.add(crateGeo(), C.VC, SPARE.x + dx - 0.2, roofY + y + 0.31, SPARE.z + dz + 0.1, 0, ry, 0);
    col({ type: 'box', x: SPARE.x - 0.35, z: SPARE.z + 0.4, hw: 0.6, hd: 0.7, rot: 0, top: roofY + 1.3, noStand: true });
  }
  // the moving parts (a group of their own: the fader leaves their materials alone): Bzizz's crate, its broken
  // boards and the spilled nectar, the oven's glow, the loaves, the slate
  const DG = new THREE.Group(); group.add(DG);
  const crate = new THREE.Mesh(crateGeo(), C.VC); crate.castShadow = true; DG.add(crate);
  const broken = new THREE.Group(); DG.add(broken);
  {
    const BB = new Batch(broken, { cast: false });
    for (const [dx, dz, ry, rz] of [[-0.3, 0.1, 0.4, 0.2], [0.25, -0.2, -0.7, 0], [0.05, 0.35, 1.3, -0.15], [-0.1, -0.4, 2.2, 0.1]]) BB.add(cached('zlboard', () => tint(bbox(0.62, 0.04, 0.14, 0.01, 1), '#c89a5a')), C.VC, BROKEN.x + dx, Y0 + 0.03, BROKEN.z + dz, 0, ry, rz);
    BB.add(cached('zlpuddle', () => tint(new THREE.CircleGeometry(0.85, 18).rotateX(-Math.PI / 2).scale(1.3, 1, 0.8), '#e8a020')), pm('#ffffff', 0.12, { vertexColors: true, metalness: 0.1, emissive: '#5a3000', emissiveIntensity: 0.25 }), BROKEN.x - 0.1, Y0 + 0.012, BROKEN.z + 0.05);
    BB.add(crateGeo(true), C.VC, BROKEN.x + 0.35, Y0 + 0.16, BROKEN.z - 0.15, 0.3, 0.6, 1.2);
    BB.build();
    broken.visible = false;
  }
  // the heat box's lamp: red while it has shut itself off, green when it runs
  const lampM = pm('#401010', 0.4, { emissive: '#ff3020', emissiveIntensity: 1.6 });
  const lamp = new THREE.Mesh(cached('zllamp', () => new THREE.SphereGeometry(0.06, 10, 8)), lampM);
  lamp.position.set(HEATBOX.x + 0.17, Y0 + 1.25, HEATBOX.z - 0.12); DG.add(lamp);
  const glowM = pm('#3a2018', 0.6, { emissive: '#ff8a30', emissiveIntensity: 0 });
  const glow = new THREE.Mesh(cached('zlglow', () => { const s = new THREE.Shape(); s.moveTo(-0.38, 0); s.lineTo(0.38, 0); s.lineTo(0.38, 0.22); s.absarc(0, 0.22, 0.38, 0, Math.PI, false); s.closePath(); return new THREE.ShapeGeometry(s, 12); }), glowM);
  glow.position.set(HATCH.x, Y0 + HATCH.y + 0.05, Z1 + 0.045); DG.add(glow);
  const loaves = new THREE.Mesh(cached('zlloaves', () => { const parts = []; for (let i = 0; i < 7; i++) parts.push([tint(new THREE.SphereGeometry(0.11, 10, 7).scale(1.55, 0.75, 1), i % 3 ? '#c87a34' : '#d89a4a'), -0.66 + i * 0.22, 0, (i % 2) * 0.16 - 0.08, 0, (i % 3) * 0.5, 0]); parts.push([tint(new THREE.SphereGeometry(0.09, 8, 6).scale(1, 0.8, 1), '#b8682a'), 0.6, 0.12, 0.05]); return compose(parts, true); }), C.VC);
  loaves.position.set(HATCH.x, Y0 + 1.04, Z1 + 0.5); loaves.castShadow = true; DG.add(loaves);
  const slateM = [pm('#ffffff', 0.9, { map: slateTex(false) }), pm('#ffffff', 0.9, { map: slateTex(true) })];
  const slate = new THREE.Group(); slate.position.set(HATCH.x + 1.25, Y0, Z1 + 0.62); slate.rotation.y = -0.45; DG.add(slate);
  const slateFace = new THREE.Mesh(cached('zlslateq', () => new THREE.PlaneGeometry(0.46, 0.58)), slateM[0]); slateFace.position.set(0, 0.42, 0.06); slateFace.rotation.x = -0.18; slate.add(slateFace);
  const slateBack = new THREE.Mesh(cached('zlslateb', () => tint(bbox(0.5, 0.86, 0.04, 0.01, 1), WOOD)), C.VC); slateBack.position.set(0, 0.41, 0); slateBack.rotation.x = -0.18; slate.add(slateBack);
  col({ type: 'cyl', x: HATCH.x + 1.25, z: Z1 + 0.62, r: 0.25, top: Y0 + 0.85, noStand: true, seeThrough: true });
  B.build();

  const flueTop = { x: FLUE.x, y: roofY + FLUE.h + 0.035, z: FLUE.z };
  const crateSpot = {
    flue: { x: FLUE.x, y: flueTop.y + 0.31, z: FLUE.z, ry: 0.12 },
    shoved: { x: FLUE.x - 0.3, y: roofY + 0.31, z: FLUE.z - 1.05, ry: -0.35 },
  };
  let crateState = 'flue', fallT = -1, fallDone = null;
  const placeCrate = (s) => { const p = crateSpot[s]; crate.position.set(p.x, p.y, p.z); crate.rotation.set(0, p.ry, 0); };
  placeCrate('flue');
  const crateCol = col({ type: 'box', x: FLUE.x, z: FLUE.z, hw: 0.36, hd: 0.36, rot: 0, top: flueTop.y + 0.62, noStand: true, seeThrough: true, noBall: true });   // (the ball's own target test takes it)
  void crateCol;
  const fadeBox = { x0: X0 - 1.3, z0: Z0 - 0.3, x1: X1 + 0.4, z1: Z1 + 0.2, top: roofY + 0.05 };

  // ================================================================ everything else on one batch
  const L = new Batch(group);
  const LF = new Batch(group, { cast: false });   // (flat or tiny things: no shadow pass)
  // ---- the heat feed: copper on the grass from the depot, fresh cobbles where it went under the street, the feed on
  // to the bakehouse
  {
    const pipeR = 0.085;
    const run = (pts) => { for (let i = 0; i < pts.length - 1; i++) { const [ax, az] = pts[i], [bx, bz] = pts[i + 1]; rodT(L, [ax, Y0 + pipeR, az], [bx, Y0 + pipeR, bz], pipeR, COPPER, C.MVC, 10); L.add(cached('zlelbow', () => tint(new THREE.SphereGeometry(pipeR * 1.08, 10, 7), COPPER)), C.MVC, bx, Y0 + pipeR, bz); } };
    run(FEED); run(FEED2);
    // clamps pinning it down every two metres
    for (const pts of [FEED, FEED2]) for (let i = 0; i < pts.length - 1; i++) {
      const [ax, az] = pts[i], [bx, bz] = pts[i + 1], len = Math.hypot(bx - ax, bz - az), ry = Math.atan2(bx - ax, bz - az);
      for (let d = 0.6; d < len; d += 2) LF.add(cached('zlclamp', () => tint(new THREE.TorusGeometry(pipeR + 0.025, 0.022, 5, 10, Math.PI).rotateZ(0), '#4a4650')), C.VC, ax + (bx - ax) * d / len, Y0 + pipeR - 0.01, az + (bz - az) * d / len, 0, ry + Math.PI / 2, 0);
    }
    // fresh cobbles across the street (lighter than the old), two iron covers
    LF.add(boxUV(bbox(1.1, 0.06, 7.3, 0.02, 1), 1.6), tm('cobble', { color: '#fff4ea', rough: 0.8 }), CROSS.x, Y0 + 0.028, 0);
    for (const z of [-2.2, 2.2]) LF.add(cached('zlcover', () => tint(cyl(0.38, 0.38, 0.03, 16), '#4a4650')), C.VC, CROSS.x, Y0 + 0.07, z);
    // the junction at the depot fence: a teal box with a valve wheel and the project's violet stripe
    L.add(tint(bbox(0.6, 0.7, 0.46, 0.04, 1), TEAL), C.MVC, CROSS.x + 0.1, Y0 + 0.35, 8.55);
    L.add(cached('zlwheel', () => tint(new THREE.TorusGeometry(0.17, 0.025, 6, 16), '#b02a2a')), C.VC, CROSS.x + 0.1, Y0 + 0.82, 8.55, Math.PI / 2, 0, 0);
    L.add(cached('zlstripeV', () => tint(bbox(0.62, 0.08, 0.48, 0.01, 1), '#7a3ab0')), C.VC, CROSS.x + 0.1, Y0 + 0.55, 8.55);
    col({ type: 'box', x: CROSS.x + 0.1, z: 8.55, hw: 0.32, hd: 0.25, rot: 0, top: Y0 + 0.75, noStand: true, seeThrough: true });
  }
  // ---- heat posts, after Citadel's: lit where the project's heat goes, dark (with a tag) where it is promised
  const glassLit = pm('#ffd0a0', 0.25, { emissive: '#ff9a3c', emissiveIntensity: 1.4, flatShading: true });

  const posts = [];
  const post = (x, z, lit, tag) => {
    const s = 1.3, ry = posts.length * 1.7;
    const at = (lx, ly, lz) => [x + (Math.cos(ry) * lx + Math.sin(ry) * lz) * s, Y0 - 0.04 + ly * s, z + (-Math.sin(ry) * lx + Math.cos(ry) * lz) * s];
    L.add(cached('zlpbase', () => tint(cyl(0.2, 0.24, 0.16, 8).scale(s, s, s), TEAL)), C.MVC, ...at(0, 0.08, 0));
    L.add(cached('zlppipe', () => tint(cyl(0.075, 0.075, 1.05, 10).scale(s, s, s), TEAL)), C.MVC, ...at(0, 0.66, 0));
    for (const cy of [0.2, 0.62, 1.12]) L.add(cached('zlpcol', () => tint(cyl(0.105, 0.105, 0.07, 12).scale(s, s, s), BRASS)), C.MVC, ...at(0, cy, 0));
    L.add(cached('zlpcup', () => tint(cyl(0.17, 0.09, 0.14, 8, 0, true).scale(s, s, s), BRASS)), C.MVC, ...at(0, 1.24, 0));
    if (lit) LF.add(cached('zlpgem', () => new THREE.OctahedronGeometry(0.15, 0).scale(s, 1.5 * s, s)), glassLit, ...at(0, 1.4, 0));
    else L.add(cached('zlpgemd', () => tint(new THREE.OctahedronGeometry(0.15, 0).scale(s, 1.5 * s, s), '#6a4a3a')), C.MVC, ...at(0, 1.4, 0));
    col({ type: 'cyl', x, z, r: 0.2, top: Y0 + 1.95, noStand: true, seeThrough: true });
    if (tag) {
      // the tag faces the street (south of the street for the north side, north for the south side)
      const face = z < 0 ? 0 : Math.PI;
      LF.add(cached('zltagq', () => new THREE.PlaneGeometry(0.34, 0.17)), C.paper, x + Math.sin(face) * 0.13, Y0 + 1.0, z + Math.cos(face) * 0.13, 0, face, 0.08);
    }
    posts.push({ ...W(x, z), lit, tag: tag || null, y: Y0 + 1.82 });
  };
  for (const [x, z] of LIT) post(x, z, true);
  for (const [x, z, tag] of DARK) post(x, z, false, tag);
  // ---- the moles' burrow hatch: a stone collar, a round plank lid with an iron ring, a vent pot breathing warm air
  {
    LF.add(tint(lathe([[0.62, 0], [0.86, 0.02], [0.84, 0.2], [0.72, 0.26], [0.62, 0.24]], 20), '#c8b8c0'), C.VC, BURROW.x, Y0, BURROW.z);
    LF.add(tint(cyl(0.64, 0.64, 0.08, 20), '#a87a52'), C.VC, BURROW.x, Y0 + 0.2, BURROW.z);
    LF.add(cached('zlring', () => tint(new THREE.TorusGeometry(0.12, 0.02, 6, 14).rotateX(Math.PI / 2), '#3a3640')), C.VC, BURROW.x + 0.2, Y0 + 0.25, BURROW.z);
    L.add(cached('zlvent', () => tint(lathe([[0.2, 0], [0.22, 0.05], [0.17, 0.75], [0.2, 0.8], [0.2, 0.86], [0.13, 0.86]], 12), '#c87a5a')), C.VC, BURROW.x + 0.95, Y0, BURROW.z + 0.55);
    L.add(cached('zlventcap', () => tint(lathe([[0, 0], [0.3, 0], [0.06, 0.2], [0, 0.22]], 10), iron)), C.VC, BURROW.x + 0.95, Y0 + 1.0, BURROW.z + 0.55);
    for (const k of [0, 1, 2]) rodT(LF, [BURROW.x + 0.95 + Math.cos(k * 2.1) * 0.17, Y0 + 0.86, BURROW.z + 0.55 + Math.sin(k * 2.1) * 0.17], [BURROW.x + 0.95 + Math.cos(k * 2.1) * 0.06, Y0 + 1.02, BURROW.z + 0.55 + Math.sin(k * 2.1) * 0.06], 0.012, iron, C.VC, 4);
    col({ type: 'cyl', x: BURROW.x, z: BURROW.z, r: 0.85, top: Y0 + 0.26, seeThrough: true });
    col({ type: 'cyl', x: BURROW.x + 0.95, z: BURROW.z + 0.55, r: 0.24, top: Y0 + 1.2, noStand: true, seeThrough: true });
  }
  // ---- Mr Pelleck's dome, re-tiled from the bottom up: new tiles on the lower south half, scaffold round it
  let scaffold = null;
  if (PH) {
    const R0 = PH.R0, x = PH.x, z = PH.z, y = PH.y, top = PH.roof;
    // (the old tiles stripped from the top down, the new laid from the bottom up: shiny new below, a band of bare
    // mortar, the old above)
    const grow = ([r, hh]) => [r * 1.015 + 0.012, hh];
    const fresh = [[R0, 0], [R0 * 1.12, R0 * 0.25], [R0 * 1.16, R0 * 0.5], [R0 * 1.06, R0 * 0.82]].map(grow);
    const bare = [[R0 * 1.06, R0 * 0.82], [R0 * 0.86, R0 * 1.06], [R0 * 0.62, R0 * 1.26]].map(grow);
    L.add(lathe(fresh, 28, 1.1, -Math.PI * 0.62, Math.PI * 1.24), tm(domeTex('#6a8ae8', '#f0f4ff'), { rough: 0.2, metal: 0.15 }), x, y, z);
    L.add(lathe(bare, 28, 1.1, -Math.PI * 0.62, Math.PI * 1.24), tm('plaster', { color: '#bab0b4', rough: 0.95 }), x, y, z);
    const rr = R0 * 1.55, poles = 6;
    for (let k = 0; k < poles; k++) {
      const a = (k / poles) * Math.PI * 2 + 0.3, px = x + Math.sin(a) * rr, pz = z + Math.cos(a) * rr * 0.92;
      L.add(cached('zlpole', () => tint(cyl(0.05, 0.05, 3.5, 6), WOOD)), C.VC, px, top + 1.75, pz);
    }
    for (const lvl of [1.05, 2.3]) {
      for (let k = 0; k < poles; k++) {
        const a0 = (k / poles) * Math.PI * 2 + 0.3, a1 = ((k + 1) / poles) * Math.PI * 2 + 0.3;
        const ax = x + Math.sin(a0) * rr, az = z + Math.cos(a0) * rr * 0.92, bx = x + Math.sin(a1) * rr, bz = z + Math.cos(a1) * rr * 0.92;
        const len = Math.hypot(bx - ax, bz - az), ry = Math.atan2(bx - ax, bz - az);
        // a plank on the south side (where they work), a ledger elsewhere
        const south = (Math.cos(a0) + Math.cos(a1)) > 0.2;
        if (south) L.add(cached('zlplank' + len.toFixed(2), () => bbox(0.36, 0.05, len + 0.25, 0.01, 1)), C.planks, (ax + bx) / 2 - Math.sin(ry + Math.PI / 2) * 0.12, top + lvl, (az + bz) / 2 - Math.cos(ry + Math.PI / 2) * 0.12, 0, ry, 0);
        L.add(cached('zlledger' + len.toFixed(2), () => tint(cyl(0.035, 0.035, len, 5).rotateX(Math.PI / 2), WOOD)), C.VC, (ax + bx) / 2, top + lvl + 0.5, (az + bz) / 2, 0, ry, 0);
      }
    }
    // a pulley arm on the front pole with a rope and a bucket of tiles
    const fa = 0.3 + 0, fx = x + Math.sin(fa) * rr, fz = z + Math.cos(fa) * rr * 0.92;
    rodT(L, [fx, top + 3.4, fz], [fx + 0.25, top + 3.45, fz + 0.75], 0.04, WOOD, C.VC, 6);
    rodT(LF, [fx + 0.25, top + 3.42, fz + 0.75], [fx + 0.25, Y0 + 1.3, fz + 0.75], 0.008, '#d8c8a0', C.VC, 4);
    L.add(cached('zlbucket', () => tint(cyl(0.16, 0.12, 0.26, 10), '#8a8a90')), C.MVC, fx + 0.25, Y0 + 1.17, fz + 0.75);
    // tile stacks on the roof and at the wall's foot
    const tileStack = cached('zltiles', () => { const parts = []; for (let i = 0; i < 6; i++) parts.push([tint(bbox(0.34, 0.05, 0.26, 0.01, 1), i % 2 ? '#a888f0' : '#9a78e0'), 0, i * 0.055, 0, 0, i * 0.05, 0]); return compose(parts, true); });
    L.add(tileStack, C.VC, x - 1.9, top + 0.03, z + 1.6);
    L.add(tileStack, C.VC, x + 1.75, Y0 + 0.0, PH.front + 0.55, 0, 0.4, 0);
    L.add(tileStack, C.VC, x + 2.15, Y0 + 0.0, PH.front + 0.75, 0, -0.3, 0);
    // a ladder up the front wall
    const lx = x - 2.1, lz0 = PH.front + 1.05, lz1 = PH.front + 0.05;
    for (const s of [-1, 1]) rodT(L, [lx + s * 0.24, Y0, lz0], [lx + s * 0.24, top + 0.6, lz1], 0.035, WOOD, C.VC, 6);
    for (let i = 1; i < 11; i++) { const t = i / 11; L.add(cached('zlrung', () => tint(cyl(0.025, 0.025, 0.5, 5).rotateZ(Math.PI / 2), WOOD)), C.VC, lx, Y0 + (top + 0.6 - Y0) * t, lz0 + (lz1 - lz0) * t); }
    col({ type: 'box', x: lx, z: (lz0 + PH.front) / 2, hw: 0.3, hd: 0.55, rot: 0, top: Y0 + 1.6, noStand: true, seeThrough: true });
    col({ type: 'box', x: x + 1.95, z: PH.front + 0.65, hw: 0.45, hd: 0.35, rot: 0, top: Y0 + 0.35, seeThrough: true });
    scaffold = W(lx, PH.front + 1.4);
  }
  L.build(); LF.build();
  // ---- Nara's cloud flowers, crated for Citadel by the shuttle pad (held while the shuttles are grounded)
  const FG = new THREE.Group(); group.add(FG);
  {
    const F = new Batch(FG);
    const puffs = cached('zlpuffs', () => {
      const parts = [];
      for (let i = 0; i < 9; i++) { const a = i * 2.4, r = 0.12 + (i % 3) * 0.08; parts.push([tint(new THREE.IcosahedronGeometry(0.11 + (i % 2) * 0.03, 1), i % 3 ? '#ffd8ec' : '#ffffff'), Math.cos(a) * r, 0.06 + (i % 4) * 0.03, Math.sin(a) * r]); }
      return compose(parts, true);
    });
    for (const [dx, dz, y, ry] of [[0, 0, 0, 0.1], [0.82, 0.12, 0, -0.08], [0.4, 0.05, 0.6, 0.2]]) {
      F.add(crateGeo(false, 0.78, 0.56), C.VC, FLOWERS.x + dx, Y0 + y + 0.28, FLOWERS.z + dz, 0, ry, 0);
      F.add(puffs, C.VC, FLOWERS.x + dx, Y0 + y + 0.56, FLOWERS.z + dz, 0, ry, 0);
    }
    F.add(cached('zlheldq', () => new THREE.PlaneGeometry(0.34, 0.17)), pm('#ffffff', 0.9, { map: heldTex(), side: THREE.DoubleSide }), FLOWERS.x + 0.4, Y0 + 0.62, FLOWERS.z - 0.32, 0, Math.PI, 0.06);
    F.build();
  }
  const flowerCol = col({ type: 'box', x: FLOWERS.x + 0.42, z: FLOWERS.z + 0.06, hw: 0.85, hd: 0.36, rot: 0, top: Y0 + 1.2, noStand: true, seeThrough: true });

  const watch = {
      hatch: W(HATCH.x, Z1 + 1.15), door: W(DOOR.x, Z1 + 0.9), roofY, stairFoot: W(STAIR.x, STAIR.z0 + 0.5), stairMid: W(STAIR.x, STAIR.z0 - STAIR.deep * STAIR.n * 0.5),
      flue: { ...W(FLUE.x, FLUE.z), y: flueTop.y }, use: W(FLUE.x - 1.0, FLUE.z - 0.35), heatbox: W(HEATBOX.x + 0.6, HEATBOX.z),
      snuff: { ...W(HATCH.x - 1.35, Z1 + 0.62), a: 0.35 }, bzizz: { ...W(STAIR.x - 1.1, Z1 + 1.25), a: 0.6 }, tavo: { ...W(HATCH.x + 1.25, Z1 + 1.4), a: Math.PI * 1.2 },   // (beside the counter: the hatch's front stays free to walk up to, VP-2 keeps people apart)
      broken: W(BROKEN.x, BROKEN.z),
      get crate() { return crateState; },
      crateAt() { const p = crate.position; return { ...W(p.x, p.z), y: p.y }; },
      setCrate(s) {
        crateState = s; fallT = -1;
        crate.visible = s !== 'broken'; broken.visible = s === 'broken';
        if (s !== 'broken') placeCrate(s);
        if (crateCol) crateCol.enabled = s === 'flue';
      },
      // knocked off the roof by the ball: it tips over the east parapet, falls and breaks on the grass below
      fall(done) { if (crateState !== 'flue') return; crateState = 'falling'; if (crateCol) crateCol.enabled = false; fallT = 0; fallDone = done; },
      setOven(hot) { glowM.emissiveIntensity = hot ? 1.8 : 0; loaves.visible = !!hot; slateFace.material = slateM[hot ? 1 : 0]; lampM.color.set(hot ? '#104010' : '#401010'); lampM.emissive.set(hot ? '#30ff50' : '#ff3020'); },
      update(dt) {
        if (fallT < 0) return;
        fallT += dt;
        const t = Math.min(1, fallT / 0.75), a = crateSpot.flue;
        crate.position.set(a.x + (BROKEN.x - a.x) * t, a.y + (Y0 + 0.3 - a.y) * t * t + Math.sin(t * Math.PI) * 0.5, a.z + (BROKEN.z - a.z) * t);
        crate.rotation.set(t * 1.2, a.ry, -t * 2.4);
        if (t >= 1) { fallT = -1; this.setCrate('broken'); const cb = fallDone; fallDone = null; cb?.(); }
      },
  };
  watch.setOven(false);
  updaters.push((dt) => watch.update(dt));
  return {
    group: WG,
    fadeBox,
    watch,
    posts,
    burrow: { ...W(BURROW.x, BURROW.z), vent: { ...W(BURROW.x + 0.95, BURROW.z + 0.55), y: Y0 + 1.15 } },
    grumm: { ...W(BURROW.x - 1.35, BURROW.z - 1.0), a: 0.9 },
    pelleck: PH ? { ...W(PH.x + 1.6, PH.front + 1.65), a: Math.PI - 0.35 } : null,
    scaffold,
    flowers: { ...W(FLOWERS.x + 0.4, FLOWERS.z - 0.6), setVisible(b) { FG.visible = !!b; if (flowerCol) flowerCol.enabled = !!b; } },
  };
}

// a slatted crate (vertex coloured): Bzizz's nectar crates (honey-yellow ends), or a flower crate
function crateGeo(lidOff = false, w = 0.62, h = 0.62) {
  return cached('zlcrate' + lidOff + w + h, () => {
    const parts = [];
    const slat = '#c89a5a', end = lidOff ? '#c89a5a' : '#e8b84a';
    for (let i = 0; i < 4; i++) for (const s of [-1, 1]) parts.push([tint(bbox(w, h * 0.2, 0.03, 0.005, 1), slat), 0, -h / 2 + h * 0.13 + i * h * 0.25, s * (w / 2 - 0.015)]);
    for (const s of [-1, 1]) parts.push([tint(bbox(0.03, h, w, 0.005, 1), end), s * (w / 2 - 0.015), 0, 0]);
    parts.push([tint(bbox(w - 0.04, 0.03, w - 0.04, 0.005, 1), '#7a5a30'), 0, -h / 2 + 0.02, 0]);
    if (!lidOff) parts.push([tint(bbox(w, 0.03, w, 0.005, 1), slat), 0, h / 2 - 0.015, 0]);
    for (const s of [-1, 1]) for (const t of [-1, 1]) parts.push([tint(bbox(0.05, h + 0.01, 0.05, 0.01, 1), '#8a6a3a'), s * (w / 2 - 0.02), 0, t * (w / 2 - 0.02)]);
    return compose(parts, true);
  });
}
