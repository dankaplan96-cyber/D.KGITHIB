// U-2 "One More Place" (the user's own side quest; docs/lba-maturity/U2-ONE-MORE-PLACE.md): the few things it adds to
// Twinsen's house, built once the house is (story/oneplace.js builds them and shows each by the story's state).
//
//   - a fourth chair at the family table, on its north side (the table had three: Zoé's and Twinsen's at its ends, Arthur's
//     blue one on the south side): "one chair too many". From the quest's chapter on it stays at the table.
//   - four soup bowls on the table while a meal is laid (merged: one draw).
//   - Old Brix's radio: a tall old wooden set he brings along, set on the table's north-west corner, its face to the north.
//     A thumb wheel on its top (the tuning: Twinsen's right hand on it, the 'tinker' clip's hand height, reach.js), a green
//     tuning eye beside the wheel (seen from the play camera, high in the south-east), and on its face the dial with a red
//     needle (seen in the tuning's close-up from behind his shoulder).
// Our own geometry and textures; nothing from LBA1/LBA2.
//
// CONTRACT
//   buildOnePlace(game, H) → OP   H: the house room (regions.built('house')); OP:
//     setChair(on), setBowls(on), setRadio(on)       visibility (the chair's collider follows it)
//     setNeedle(k)  k 0..1 along the dial;  setEye(k) 0..1 how far the eye is open (its glow);  spinWheel(dk)
//     seats {zoe, hero, arthur, guest}: { x, z, a } world (the chair's middle and the way its sitter faces)
//     wheel {x, y, z}  world: the thumb wheel's rim top;  touch: reach.js touch point for it ('tinker', facing a = 0)
//     radio {x, z}  world: the set's middle;  dialAt, eyeAt: world points on its top (the close-up looks at the dial)
import * as THREE from 'three';
import { Kit, MAT, rbox, plane, cyl, sphere, lathe, disc, canvasTex } from './props.js';
import * as P from './props.js';
import { touch } from './story/reach.js';

// the house room's own frame (interiors.js buildHouse): the family table at (-0.45, 0.55), 1.5 × 0.9 m, top 0.78
export const TABLE = { x: -0.45, z: 0.55, top: 0.78 };
// the chairs' middles and the way their sitters face (the three as interiors.js puts them; the new one on the north side,
// toward the table's east end: Twinsen's place at the radio, west of it, stays free)
export const SEATS = {
  zoe: { x: TABLE.x - 1.05, z: TABLE.z, a: Math.PI / 2 },
  hero: { x: TABLE.x + 1.05, z: TABLE.z + 0.05, a: -Math.PI / 2 + 0.15 },
  arthur: { x: TABLE.x + 0.2, z: TABLE.z + 0.82, a: Math.PI - 0.1 },
  guest: { x: TABLE.x + 0.62, z: TABLE.z - 0.82, a: 0 },
};
// the bowls, each before its sitter, clear of what already stands on the table (the fruit bowl, the vase, the mugs, the
// bread, the lamp being mended and its cloth of screws)
const BOWLS = [[TABLE.x - 0.65, TABLE.z - 0.03], [TABLE.x + 0.63, TABLE.z + 0.07], [TABLE.x + 0.33, TABLE.z + 0.33], [TABLE.x + 0.65, TABLE.z - 0.33]];
// the radio: its middle on the table, its face to the north (−z: the set is turned half round, so its local +x is world
// −x). On its top, from Twinsen's side (he stands north of the table facing south): the thumb wheel at its east end
// (local −x: under his right hand, the 'tinker' clip's reach.js hand), the dial lying flat beside it to the west, the
// green tuning eye behind the dial (toward the room: the play camera, high in the south-east, sees it)
export const RADIO = { x: TABLE.x - 0.53, z: TABLE.z - 0.34, w: 0.4, d: 0.2, h: 0.34, wheelX: -0.14, wheelY: 0.365, wheelR: 0.05 };
// the dial on the top (local): its middle, size; where the needle runs along it (local x)
const DIAL = { x: 0.07, z: 0.032, w: 0.16, d: 0.055 };
// (the dial is read from the room's side, the south: the play camera's and the tuning's close-up; its numbers rise to the
//  east, local −x)
const NEEDLE = { x0: DIAL.x + 0.07, x1: DIAL.x - 0.07 };
const EYE = { x: DIAL.x, z: -0.055 };

// the dial: a cream strip with ticks and numbers (no station names: the eye and the ear find them)
const dialTex = () => canvasTex(256, 64, (x, W, H) => {
  x.fillStyle = '#efe2bf'; x.fillRect(0, 0, W, H);
  const g = x.createLinearGradient(0, 0, 0, H); g.addColorStop(0, 'rgba(255,240,200,0.0)'); g.addColorStop(1, 'rgba(120,80,30,0.25)'); x.fillStyle = g; x.fillRect(0, 0, W, H);
  x.strokeStyle = '#4a3a2a'; x.lineWidth = 2; x.beginPath(); x.moveTo(10, 40); x.lineTo(W - 10, 40); x.stroke();
  for (let i = 0; i <= 40; i++) { const px = 10 + (i / 40) * (W - 20), big = i % 5 === 0; x.lineWidth = big ? 2 : 1; x.beginPath(); x.moveTo(px, 40); x.lineTo(px, big ? 26 : 33); x.stroke(); }
  x.fillStyle = '#3a2a1a'; x.font = 'bold 13px serif'; x.textAlign = 'center';
  ['55', '60', '70', '80', '100', '120', '140', '160', '180'].forEach((s, i) => x.fillText(s, 10 + (i / 8) * (W - 20), 20));
  x.font = '9px serif'; x.fillText('kc', W - 14, 56);
});

export function buildOnePlace(game, H) {
  const o = H.group.position, wx = (x) => o.x + x, wz = (z) => o.z + z;
  const OP = {};
  // ---- the fourth chair (Brix's old green cushion)
  const chair = new THREE.Group(); chair.name = 'op_chair'; chair.userData.keep = true; H.group.add(chair);
  { const k = new Kit(chair); k.at(SEATS.guest.x, 0, SEATS.guest.z, SEATS.guest.a, () => P.chair(k, { cushion: '#7f9a4a' })); k.flush(); }
  const col = game.physics.add({ type: 'box', x: wx(SEATS.guest.x), z: wz(SEATS.guest.z), hw: 0.25, hd: 0.25, rot: SEATS.guest.a, top: 0.5, noStand: true, seeThrough: true });
  H.colliders?.push(col);
  // ---- the bowls (soup in them)
  const bowls = new THREE.Group(); bowls.name = 'op_bowls'; bowls.userData.keep = true; H.group.add(bowls);
  { const k = new Kit(bowls), bowl = lathe([[0.001, 0], [0.035, 0], [0.06, 0.02], [0.072, 0.05], [0.068, 0.052], [0.055, 0.025], [0.001, 0.008]], 14);
    for (const [bx, bz] of BOWLS) { k.add(bowl, MAT.flat('#e8dcc4', 0.35), bx, TABLE.top, bz); k.add(disc(0.056, 14), MAT.flat('#c8743a', 0.6), bx, TABLE.top + 0.04, bz, 0, { rx: -Math.PI / 2 }); }
    k.flush(); }
  // ---- the radio
  const radio = new THREE.Group(); radio.name = 'op_radio'; radio.userData.keep = true;
  radio.position.set(RADIO.x, TABLE.top, RADIO.z); radio.rotation.y = Math.PI; H.group.add(radio);
  const R = RADIO, hd = R.d / 2, top = R.h + 0.01;
  { const k = new Kit(radio), md = MAT.wood('dark'), mr = MAT.wood('red'), br = MAT.brass();
    k.add(rbox(R.w + 0.02, 0.025, R.d + 0.02, 0.008), md, 0, 0.0125, 0);                  // (the plinth)
    k.add(rbox(R.w, R.h - 0.025, R.d, 0.03), mr, 0, 0.025 + (R.h - 0.025) / 2, 0);        // (the cabinet)
    k.add(rbox(R.w + 0.012, 0.02, R.d + 0.012, 0.008), md, 0, R.h, 0);                     // (its top's lip: its top at `top`)
    // the face (local +z): the speaker's cloth behind brass bars, the old volume knob (it does nothing in the quest)
    k.add(plane(0.28, 0.2), MAT.cloth('#6a4a2a', '#d8a868'), -0.02, 0.17, hd + 0.002);
    for (let i = -3; i <= 3; i++) k.add(rbox(0.008, 0.2, 0.008, 0.003), br, -0.02 + i * 0.036, 0.17, hd + 0.006);
    k.add(cyl(0.022, 0.024, 0.02, 12), br, 0.16, 0.07, hd + 0.01, 0, { rx: Math.PI / 2 });
    // on the top: the dial's brass frame and the dial lying in it (read from the room's side)
    k.add(rbox(DIAL.w + 0.016, 0.006, DIAL.d + 0.016, 0.003), br, DIAL.x, top + 0.003, DIAL.z);
    k.add(plane(DIAL.w, DIAL.d), MAT.map(dialTex(), 0.6, { emissive: '#ffe6a8', emissiveIntensity: 0.25 }), DIAL.x, top + 0.0065, DIAL.z, Math.PI, { rx: -Math.PI / 2 });
    // the wheel's slot, the eye's brass rim
    k.add(rbox(0.035, 0.006, 0.07, 0.002), MAT.flat('#1a120c', 0.9), R.wheelX, top + 0.003, 0);
    k.add(cyl(0.03, 0.032, 0.012, 16), br, EYE.x, top + 0.006, EYE.z);
    k.flush(); }
  // the thumb wheel (it turns with the tuning), its axle along the face's normal: rolled sideways under his fingers
  const wheel = new THREE.Mesh(cyl(R.wheelR, R.wheelR, 0.026, 18), MAT.flat('#2a2a2a', 0.5));
  wheel.rotation.x = Math.PI / 2; wheel.position.set(R.wheelX, R.wheelY, 0); wheel.castShadow = true; radio.add(wheel);
  const knurl = new THREE.Mesh(cyl(R.wheelR * 0.55, R.wheelR * 0.55, 0.028, 6), MAT.brass()); knurl.rotation.x = Math.PI / 2; wheel.add(knurl);
  // the tuning eye: green glass in its rim, its glow the eye's opening (an emissive only: no light of its own)
  const eyeMat = new THREE.MeshStandardMaterial({ color: '#1e3a26', emissive: '#4cff7a', emissiveIntensity: 0.15, roughness: 0.2 });
  const eye = new THREE.Mesh(sphere(0.024, 14, 8), eyeMat); eye.scale.y = 0.55; eye.position.set(EYE.x, top + 0.012, EYE.z); radio.add(eye);
  // the needle, lying on the dial across it
  const needle = new THREE.Mesh(new THREE.BoxGeometry(0.004, 0.002, DIAL.d * 0.9), new THREE.MeshBasicMaterial({ color: '#c81e14' }));
  needle.position.set(NEEDLE.x0, top + 0.0085, DIAL.z); radio.add(needle);

  // ---- the handles
  const W = (x, z) => ({ x: wx(x), z: wz(z) });
  OP.seats = Object.fromEntries(Object.entries(SEATS).map(([k, s]) => [k, { ...W(s.x, s.z), a: s.a }]));
  // (the wheel's local +x is world −x: the set is turned half round)
  OP.wheel = { ...W(R.x - R.wheelX, R.z), y: TABLE.top + R.wheelY + R.wheelR };
  OP.touch = touch(OP.wheel.x, OP.wheel.z, 0, 'tinker');
  OP.radio = W(R.x, R.z);
  OP.dialAt = new THREE.Vector3(wx(R.x - DIAL.x), TABLE.top + top, wz(R.z - DIAL.z));
  OP.eyeAt = new THREE.Vector3(wx(R.x - EYE.x), TABLE.top + top + 0.012, wz(R.z - EYE.z));
  OP.table = W(TABLE.x, TABLE.z);
  OP.chair = chair; OP.bowls = bowls; OP.radioGroup = radio; OP.col = col;
  OP.state = { chair: null, bowls: null, radio: null, needle: 0, eye: 0 };
  OP.setChair = (on) => {
    on = !!on; if (OP.state.chair === on) return;
    OP.state.chair = on; chair.visible = on; col.enabled = on;
    // (the household rounds' planner remembers the floor it has looked at: a chair that came or went is news to it)
    const RW = game.roomWalkers; if (RW?.nav) { RW.nav.cells.clear(); RW.nav.cache.clear(); }
  };
  OP.setBowls = (on) => { on = !!on; if (OP.state.bowls !== on) { OP.state.bowls = on; bowls.visible = on; } };
  OP.setRadio = (on) => { on = !!on; if (OP.state.radio !== on) { OP.state.radio = on; radio.visible = on; } };
  OP.setNeedle = (k) => { k = Math.min(1, Math.max(0, k)); OP.state.needle = k; needle.position.x = NEEDLE.x0 + (NEEDLE.x1 - NEEDLE.x0) * k; };
  OP.setEye = (k) => { k = Math.min(1, Math.max(0, k)); OP.state.eye = k; eyeMat.emissiveIntensity = 0.15 + 2.6 * k; eye.scale.set(1, 0.55 + 0.25 * k, 1); };
  OP.spinWheel = (dk) => { wheel.rotation.y += dk * 14; };
  OP.setChair(false); OP.setBowls(false); OP.setRadio(false); OP.setNeedle(0.08); OP.setEye(0);
  return OP;
}
