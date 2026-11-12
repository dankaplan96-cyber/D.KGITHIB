// CAMPAIGN-4 (the user's treatment of 11.11.2026, section 4 "The excavation — a test with a cost"): the research post's
// bore test stand on Desert Island, and the steam drive on Kesh's wind-pump. Ours (the post is the sequel's own place:
// no original layout to match); the post's own teal and hazard paint, plain steel.
//
// What stands there (the island's local metres; desert.js builds it in its post block):
//   - outside the post's fence, a few metres south of its gate (nobody stands inside the fence during a pressure test):
//     the test stand. A steel cabinet facing west, away from the bore, with two dials on its face (DRILL: the bore's
//     load, a red CUT mark; GROUND: the listening post under the pad), a desk at its front with a chart recorder (two
//     pens; its paper runs out over the desk's edge, where the carbon is torn off), a teleprinter for the project's wire
//     (its tape: what was sent to Citadel), the cutoff lever (red) and the heat-line lever (blue, BORE / KESH) rising
//     from the desk's front; on its right, on a post, the wire's box with its handset (where Dallan works); a horn on
//     top (the wire's voice) and a lamp (SENT); a cable along the sand to the fence, toward the derrick
//   - on the derrick: the drill string (a kelly through a rotary table on the well-head, a swivel block above): it turns
//     while the drill runs
//   - at the wind-pump's foot in Kesh: the project's steam drive (a small boiler, a stack, a shaft into the tower, its
//     pipe under the sand toward the post): cold until the heat line is thrown over to Kesh
//
// CONTRACT (story/digtest.js; world points)
//   buildTestStand({ group, col, W, H, updaters, postY, bore }) → R.stand:
//     y (the ground at the desk), board {x, z} (where its dials are read from), tape {x, z} (the teleprinter)
//     cut, heat: levers { touch(): the touch point for the knob where it is now (story/reach.js), set(on) (cut: true =
//       RUN, heat: true = KESH), on }; strip: touch point (the paper's end at the desk's edge)
//     spots { dallan, hero }   wire {x, z}
//     setLoad(0..1) the DRILL needle (1 = the red mark); kick() a GROUND needle kick; setSpin(b) the drill string
//     paper: trace(drill, ground) one sample on the recorder; canned(n) the paper as after n good runs; torn(b)
//     tape: show(b) the teleprinter's tape (one trace); sent(b) the SENT lamp
//   buildSteamDrive({ group, col, W, H, updaters, x, z, tx, tz }) → R.pump's drive: { x, z, stack {x, y, z}, look {x, z},
//     setHot(b), hot }
import * as THREE from 'three';
import { mergeStatic } from '../engine/merge.js';
import { touch } from './story/reach.js';

const paint = (c, r = 0.6, extra = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: r, ...extra });
const canvasTex = (w, h, draw) => {
  const c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d'); draw(x, w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; t.userData = { c, x }; return t;
};
const dialFace = (label) => canvasTex(128, 128, (x, w) => {
  x.fillStyle = '#f2ecdc'; x.beginPath(); x.arc(64, 64, 62, 0, 7); x.fill();
  x.strokeStyle = '#2a2a2a'; x.lineWidth = 3; x.beginPath(); x.arc(64, 64, 60, 0, 7); x.stroke();
  // the scale: from lower left round the top to lower right
  for (let v = 0; v <= 10; v++) { const a = Math.PI * (0.75 + v * 0.15); x.lineWidth = v % 5 ? 2 : 4; x.beginPath(); x.moveTo(64 + Math.cos(a) * 44, 64 + Math.sin(a) * 44); x.lineTo(64 + Math.cos(a) * 56, 64 + Math.sin(a) * 56); x.stroke(); }
  if (label === 'DRILL') { x.strokeStyle = '#c8302a'; x.lineWidth = 9; x.beginPath(); x.arc(64, 64, 50, Math.PI * 2.04, Math.PI * 2.24); x.stroke(); }
  x.fillStyle = '#2a2a2a'; x.font = 'bold 19px sans-serif'; x.textAlign = 'center'; x.fillText(label, w / 2, 96);
});
const sign = (lines, bg, ink, w = 256, h = 64, size = 22) => canvasTex(w, h, (x) => {
  x.fillStyle = bg; x.fillRect(0, 0, w, h); x.fillStyle = ink; x.font = `bold ${size}px sans-serif`; x.textAlign = 'center';
  lines.forEach((l, i) => x.fillText(l, w / 2, h / 2 + size * 0.36 + (i - (lines.length - 1) / 2) * size * 1.15));
});

// the needle's angle for a dial value 0..1 (the scale runs from lower left, over the top, to lower right)
const needleA = (v) => -(Math.PI * 0.75) + Math.PI * 1.5 * Math.min(1.05, Math.max(0, v));

export function buildTestStand({ group, col, W, H, updaters, postY, bore }) {
  // the desk's front edge at x = SX − 0.6; the cabinet's face at SX − 0.18; facing west (−x): the hero faces +x (a = π/2)
  const SX = 23.6, SZ = -25.2;
  const Y = Math.max(H(SX - 1.1, SZ), H(SX - 1.1, SZ + 0.6), H(SX, SZ), H(SX - 1.1, SZ - 0.9), H(SX - 1.0, SZ + 1.8));
  const S = new THREE.Group(); group.add(S);       // what never moves: merged at the end
  const D = new THREE.Group(); group.add(D);       // what moves or changes
  const add = (geo, m, x, y, z, rx = 0, ry = 0, rz = 0, to = S) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); o.rotation.set(rx, ry, rz); o.castShadow = o.receiveShadow = true; to.add(o); return o; };
  const dyn = (geo, m, x, y, z, parent = D) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); parent.add(o); return o; };
  const box = (w, h, d) => new THREE.BoxGeometry(w, h, d), cyl = (a, b, h, n = 12) => new THREE.CylinderGeometry(a, b, h, n);
  const teal = paint('#2f7a8a', 0.55, { metalness: 0.3 }), steel = paint('#8a9096', 0.45, { metalness: 0.6 }), dark = paint('#2a2e34', 0.7);
  const red = paint('#c8302a', 0.45), blue = paint('#2f6aa8', 0.45), cream = paint('#ece4d0', 0.85), concrete = paint('#bdb6aa', 0.95);

  // ---- the plinth, the cabinet, the desk
  add(box(1.5, 0.1, 3.3), concrete, SX - 0.4, Y - 0.03, SZ + 0.55);   // (a pad flush with the sand: he stands on the ground)
  add(box(0.36, 1.85, 1.3), teal, SX, Y + 0.97, SZ);
  add(box(0.4, 0.06, 1.36), steel, SX, Y + 1.92, SZ);
  add(box(0.44, 0.06, 1.3), steel, SX - 0.4, Y + 0.97, SZ, 0, 0, 0.08);                 // the desk (a little sloped toward him)
  add(box(0.4, 0.9, 0.05), dark, SX - 0.38, Y + 0.5, SZ - 0.6); add(box(0.4, 0.9, 0.05), dark, SX - 0.38, Y + 0.5, SZ + 0.6);   // its two cheeks
  add(box(0.04, 0.5, 1.2), teal, SX - 0.58, Y + 0.68, SZ);                                // its front panel, the levers' slots over it
  // the dials' faces and bezels on the cabinet's face (DRILL on his left, GROUND on his right)
  const DIAL = { y: Y + 1.5, zd: SZ - 0.29, zg: SZ + 0.29, x: SX - 0.19 };
  for (const [z, label] of [[DIAL.zd, 'DRILL'], [DIAL.zg, 'GROUND']]) {
    add(new THREE.TorusGeometry(0.17, 0.02, 6, 20), steel, DIAL.x, DIAL.y, z, 0, Math.PI / 2, 0);
    const face = add(new THREE.CircleGeometry(0.165, 20), new THREE.MeshStandardMaterial({ map: dialFace(label), roughness: 0.6 }), DIAL.x - 0.005, DIAL.y, z, 0, -Math.PI / 2, 0);
    face.castShadow = false;
  }
  // the name plate over the dials, the wire's horn and the SENT lamp on top
  add(new THREE.PlaneGeometry(1.0, 0.16), new THREE.MeshStandardMaterial({ map: sign(['BORE TEST · No. 14'], '#e8eef0', '#1e3a44', 512, 64, 30), roughness: 0.7 }), SX - 0.185, Y + 1.78, SZ, 0, -Math.PI / 2, 0);
  add(cyl(0.05, 0.16, 0.3, 10), dark, SX + 0.05, Y + 2.08, SZ + 0.45, 0, 0, Math.PI / 2 - 0.3);
  // the recorder on the desk: a box, its two pens' arms, the paper running out over the desk's edge
  add(box(0.24, 0.16, 0.36), steel, SX - 0.32, Y + 1.09, SZ + 0.08);
  add(cyl(0.035, 0.035, 0.34, 8), cream, SX - 0.25, Y + 1.2, SZ + 0.08, Math.PI / 2, 0, 0);
  // the teleprinter for the wire, on the desk's left
  add(box(0.24, 0.13, 0.22), dark, SX - 0.33, Y + 1.07, SZ - 0.26);
  // the wire's box on its post, right of the cabinet, and its handset on the hook
  const WB = { x: SX - 0.35, z: SZ + 1.8 };   // (a step right of the cutoff: Dallan at it is not in the way of the lever)
  add(cyl(0.04, 0.05, 0.86, 8), steel, WB.x, Y + 0.45, WB.z);
  add(box(0.36, 0.26, 0.3), teal, WB.x, Y + 0.99, WB.z);
  add(box(0.08, 0.06, 0.26), dark, WB.x - 0.1, Y + 1.15, WB.z, 0, 0, 0);
  // the cable from the cabinet's back along the sand to the fence, toward the derrick
  { const c = new THREE.CatmullRomCurve3([[SX + 0.18, Y + 0.3, SZ], [SX + 0.6, H(SX + 0.6, SZ) + 0.03, SZ + 0.3], [SX + 1.6, H(SX + 1.6, SZ + 1.0) + 0.03, SZ + 1.4], [26.1, postY + 0.03, -22.6]].map((p) => new THREE.Vector3(...p)));
    add(new THREE.TubeGeometry(c, 16, 0.03, 5, false), dark, 0, 0, 0); }
  col({ type: 'box', x: SX - 0.18, z: SZ, hw: 0.26, hd: 0.66, top: Y + 1.95 });     // (the cabinet and the desk to 0.44 m in front of its face: the desk's lip and the levers' knobs stand out past it)
  col({ type: 'cyl', x: WB.x, z: WB.z, r: 0.1, top: Y + 1.12 });   // (its post: Dallan stands close at the box, his hands on its top)

  // ---- what moves: the dials' needles, the levers, the paper, the tape, the lamp
  const needle = (z) => { const n = new THREE.Group(); n.position.set(DIAL.x - 0.014, DIAL.y, z); n.rotation.y = -Math.PI / 2; D.add(n); const m = dyn(new THREE.BoxGeometry(0.012, 0.14, 0.006), dark, 0, 0.06, 0, n); m.castShadow = false; dyn(new THREE.CylinderGeometry(0.018, 0.018, 0.012, 8), dark, 0, 0, 0, n).rotation.x = Math.PI / 2; return n; };
  const nd = needle(DIAL.zd), ng = needle(DIAL.zg);
  const lever = (z, mat) => {
    const p = new THREE.Group(); p.position.set(SX - 0.53, Y + 0.93, z); D.add(p);
    dyn(new THREE.BoxGeometry(0.04, 0.3, 0.04), steel, 0, 0.15, 0, p); dyn(new THREE.SphereGeometry(0.05, 10, 8), mat, 0, 0.31, 0, p);
    mergeStatic(p, { recolor: true, retex: true });
    return p;
  };
  const cutP = lever(SZ + 0.46, red), heatP = lever(SZ - 0.5, blue);
  add(new THREE.PlaneGeometry(0.26, 0.07), new THREE.MeshStandardMaterial({ map: sign(['CUTOFF'], '#c8302a', '#fff4e4', 256, 64, 34), roughness: 0.7 }), SX - 0.605, Y + 0.86, SZ + 0.46, 0, -Math.PI / 2, 0);
  add(new THREE.PlaneGeometry(0.3, 0.09), new THREE.MeshStandardMaterial({ map: sign(['HEAT LINE', 'BORE · KESH'], '#2f6aa8', '#fff4e4', 256, 80, 26), roughness: 0.7 }), SX - 0.605, Y + 0.84, SZ - 0.5, 0, -Math.PI / 2, 0);
  const RUN = -0.42, CUT = 0.52;   // (the cutoff's two places: back toward the board = the drill runs; toward him = cut)
  const knob = (p, rz) => ({ x: p.position.x - Math.sin(rz) * 0.31, y: p.position.y + Math.cos(rz) * 0.31, z: p.position.z });
  // the recorder's paper: a canvas the two pens draw on (drill above in blue, ground below in red), out over the desk's edge
  const paperT = canvasTex(256, 96, (x, w, h) => { x.fillStyle = '#f4eedf'; x.fillRect(0, 0, w, h); });
  const paper = dyn(new THREE.PlaneGeometry(0.34, 0.2), new THREE.MeshStandardMaterial({ map: paperT, roughness: 0.9, side: THREE.DoubleSide }), SX - 0.5, Y + 1.012, SZ + 0.08);
  paper.rotation.set(-Math.PI / 2 + 0.08, -Math.PI / 2, 0, 'YXZ');   // (flat on the sloped desk: across it, read from his side)
  paper.castShadow = false;
  const hang = dyn(new THREE.PlaneGeometry(0.34, 0.1), paper.material, SX - 0.62, Y + 0.96, SZ + 0.08); hang.rotation.y = -Math.PI / 2; hang.castShadow = false;
  // the teleprinter's tape: what went to Citadel (one trace), hanging over the desk's edge
  const tapeT = canvasTex(256, 96, (x, w, h) => {
    x.fillStyle = '#f6f2e6'; x.fillRect(0, 0, w, h); x.fillStyle = '#1e2a33'; x.font = 'bold 15px monospace'; x.fillText('TEST 14 > CITADEL', 10, 20);
    x.font = '12px monospace'; x.fillText('DRILL', 10, 46); x.fillText('GROUND: ---', 10, 84);
    x.strokeStyle = '#2f5fa8'; x.lineWidth = 2; x.beginPath(); x.moveTo(60, 52); x.lineTo(150, 40); x.lineTo(156, 64); x.lineTo(246, 64); x.stroke();
  });
  const tape = dyn(new THREE.PlaneGeometry(0.2, 0.18), new THREE.MeshStandardMaterial({ map: tapeT, roughness: 0.9, side: THREE.DoubleSide }), SX - 0.5, Y + 1.0, SZ - 0.26);
  tape.rotation.set(-Math.PI / 2 + 0.08, -Math.PI / 2, 0, 'YXZ'); tape.castShadow = false; tape.visible = false;
  const lampM = paint('#3a4a3a', 0.4, { emissive: '#000000' });
  dyn(new THREE.SphereGeometry(0.05, 10, 8), lampM, SX - 0.1, Y + 1.98, SZ - 0.45);
  mergeStatic(S, { recolor: true, retex: true });

  // ---- the drill string on the derrick: a rotary table on the well-head, the kelly, the swivel block (turns as one)
  const spin = new THREE.Group(); spin.position.set(bore.x, postY, bore.z); group.add(spin);
  { const k = new THREE.Group(); const a2 = (geo, m, y) => { const o = new THREE.Mesh(geo, m); o.position.y = y; o.castShadow = true; k.add(o); };
    const iron = paint('#5a6066', 0.4, { metalness: 0.6 });
    a2(cyl(0.48, 0.48, 0.14, 14), iron, 1.78); a2(box(0.17, 5.2, 0.17), iron, 4.4); a2(box(0.42, 0.62, 0.42), paint('#d8a030', 0.5, { metalness: 0.4 }), 7.3);
    for (const s of [-1, 1]) { const o = new THREE.Mesh(box(0.08, 0.1, 0.5), iron); o.position.set(s * 0.32, 1.88, 0); k.add(o); }
    a2(cyl(0.02, 0.02, 3.4, 5), iron, 9.3);   // (the line up to the crown)
    mergeStatic(k, { recolor: true }); spin.add(k); }

  // ---- state
  const st = { load: 0, spinning: false, kickT: null, kickA: 0, samples: [], n: 0 };
  const P = paperT.userData.x;
  const drawPaper = () => {
    P.fillStyle = '#f4eedf'; P.fillRect(0, 0, 256, 96);
    P.strokeStyle = '#d8ccb0'; P.lineWidth = 1; for (let x = 0; x < 256; x += 32) { P.beginPath(); P.moveTo(x, 0); P.lineTo(x, 96); P.stroke(); }
    P.beginPath(); P.moveTo(0, 48); P.lineTo(256, 48); P.stroke();
    const s = st.samples, n = s.length, x0 = 256 - n * 2;
    P.lineWidth = 2;
    P.strokeStyle = '#2f5fa8'; P.beginPath(); s.forEach((v, i) => { const y = 42 - v[0] * 32; i ? P.lineTo(x0 + i * 2, y) : P.moveTo(x0 + i * 2, y); }); P.stroke();
    P.strokeStyle = '#c8302a'; P.beginPath(); s.forEach((v, i) => { const y = 78 - v[1] * 22; i ? P.lineTo(x0 + i * 2, y) : P.moveTo(x0 + i * 2, y); }); P.stroke();
    paperT.needsUpdate = true;
  };
  const A = {
    y: Y, board: W(SX - 0.95, SZ), tape: W(SX - 0.5, SZ - 0.26), wire: W(WB.x, WB.z), dials: { ...W(DIAL.x, SZ), y: DIAL.y },
    spots: { dallan: { ...W(WB.x - 0.45, WB.z), a: Math.PI / 2 }, hero: { ...W(SX - 1.15, SZ + 0.1), a: Math.PI / 2 } },
    // (the touch points: story/reach.js; 'tinker' puts the hand at 1.17–1.26 m, the knobs stand at ~1.24 m)
    cut: { on: true, set(b) { this.on = !!b; cutP.rotation.z = b ? RUN : CUT; }, touch() { const k = knob(cutP, cutP.rotation.z), p = W(k.x, k.z); return touch(p.x, p.z, Math.PI / 2, 'tinker'); } },
    heat: { on: false, set(b) { this.on = !!b; heatP.rotation.z = b ? CUT : RUN; }, touch() { const k = knob(heatP, heatP.rotation.z), p = W(k.x, k.z); return touch(p.x, p.z, Math.PI / 2, 'tinker'); } },
    strip: (() => { const p = W(SX - 0.6, SZ + 0.08); return touch(p.x, p.z, Math.PI / 2, 'setDown'); })(),
    setLoad(v) { st.load = v; },
    get load() { return st.load; },
    kick() { st.kickT = 0; },
    setSpin(b) { st.spinning = !!b; },
    get spinning() { return st.spinning; },
    paper: {
      // one sample (drill 0..1, ground −1..1), drawn as it comes (the last 128 kept)
      trace(d, gv) { st.samples.push([d, gv]); if (st.samples.length > 128) st.samples.shift(); drawPaper(); },
      // the paper as it stands after n good runs (a load): the run, the stop, three kicks, a rest, three kicks
      canned(n) {
        st.samples = [];
        for (let r = 0; r < Math.max(1, n); r++) {
          for (let i = 0; i < 14; i++) st.samples.push([Math.min(1, 0.4 + i * 0.06) * (r < n || n === 0 ? 1 : 0), 0.03]);
          if (r >= n) continue;
          for (let i = 0; i < 6; i++) st.samples.push([Math.max(0, 1 - i * 0.2), 0]);
          for (const k of [1, 1, 1, 0, 0, 0, 1, 1, 1]) { st.samples.push([0, k ? 0.9 : 0]); st.samples.push([0, k ? -0.5 : 0]); }
          for (let i = 0; i < 4; i++) st.samples.push([0, 0]);
        }
        while (st.samples.length > 128) st.samples.shift();
        drawPaper();
      },
      torn(b) { hang.visible = !b; },
    },
    showTape(b) { tape.visible = !!b; },
    sent(b) { lampM.emissive.set(b ? '#40ff60' : '#000000'); lampM.color.set(b ? '#8aff9a' : '#3a4a3a'); },
  };
  A.cut.set(true); A.heat.set(false); A.paper.canned(0);
  updaters.push((dt) => {
    if (st.spinning) spin.rotation.y += dt * 5.5;
    const jit = st.spinning ? Math.sin(performance.now() * 0.03) * 0.02 : 0;
    nd.rotation.z = -needleA(st.load + jit);
    let gk = st.spinning ? 0.06 + Math.sin(performance.now() * 0.021) * 0.03 : 0.02;
    if (st.kickT != null) { st.kickT += dt; gk += 0.9 * Math.exp(-st.kickT * 9) * Math.abs(Math.cos(st.kickT * 26)); if (st.kickT > 0.5) st.kickT = null; }
    ng.rotation.z = -needleA(gk);
  });
  return A;
}

// the project's steam drive at the wind-pump's foot: a squat boiler, its stack, a shaft into the tower, its pipe off under
// the sand toward the post (tx, tz). Cold until the heat line comes (story/digtest.js puffs its stack)
export function buildSteamDrive({ group, col, W, H, x, z, px, pz, tx, tz }) {
  const y = H(x, z);
  const S = new THREE.Group(); group.add(S);
  const add = (geo, m, px, py, pz, rx = 0, ry = 0, rz = 0) => { const o = new THREE.Mesh(geo, m); o.position.set(px, py, pz); o.rotation.set(rx, ry, rz); o.castShadow = o.receiveShadow = true; S.add(o); return o; };
  const iron = paint('#4a4440', 0.55, { metalness: 0.5 }), teal = paint('#2f7a8a', 0.55, { metalness: 0.3 }), brass = paint('#b8903a', 0.4, { metalness: 0.6 });
  add(new THREE.BoxGeometry(1.0, 0.16, 0.8), paint('#bdb6aa', 0.95), x, y + 0.05, z);
  add(new THREE.CylinderGeometry(0.34, 0.36, 0.8, 14), teal, x, y + 0.53, z, 0, 0, Math.PI / 2);
  add(new THREE.CylinderGeometry(0.07, 0.08, 1.1, 8), iron, x + 0.25, y + 1.3, z);
  add(new THREE.CylinderGeometry(0.11, 0.11, 0.16, 10), brass, x - 0.44, y + 0.53, z, 0, 0, Math.PI / 2);
  // the shaft into the tower toward its rod, and the pipe that dives under the sand toward the post
  add(new THREE.TubeGeometry(new THREE.LineCurve3(new THREE.Vector3(x - 0.46, y + 0.53, z), new THREE.Vector3(px, y + 0.53, pz)), 1, 0.04, 6), iron, 0, 0, 0);
  const a = Math.atan2(tz - z, tx - x);
  add(new THREE.CylinderGeometry(0.07, 0.07, 1.4, 8), iron, x + Math.cos(a) * 0.9, y + 0.15, z + Math.sin(a) * 0.9, 0, -a, Math.PI / 2 - 0.25);
  mergeStatic(S, { recolor: true, retex: true });
  col({ type: 'box', x, z, hw: 0.55, hd: 0.45, top: y + 0.95, noStand: true });
  const p = W(x, z), s = W(x + 0.25, z), l = W(x - 0.95, z + 0.6);
  return { ...p, y, stack: { ...s, y: y + 1.9 }, look: l, hot: false, setHot(b) { this.hot = !!b; } };
}
