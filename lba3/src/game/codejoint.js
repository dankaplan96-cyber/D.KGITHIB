// CAMPAIGN-8 (wave 6, story/netline.js): the cracked joint on the project's code line at the station's bore, beside
// Baldino's code box (story/network.js CODE_BOX). Ours (the sequel's). The line comes up off the deck from the shaft's
// collar onto an iron post at hand height, where its two ends meet in a clamp that is cracked through: the upper jaw
// jumps with every knock of the ground. Baldino's isolator, clipped on in a rest, holds it.
//
// buildCodeJoint({ root, physics, x, z, box }) → J
//   J.touch            the clamp, a 'tinker' touch point (story/reach.js): he faces −z at it
//   J.kick(k)          0…1: how far the upper jaw is thrown up now (the four-knock clock, story/netline.js)
//   J.clip(on)         the isolator on the clamp (shown) or not
//   J.show(on)         the whole joint (chapters 10–12 only)
// Draw calls: the post, its foot plate and the cable are one merged mesh (iron, the cable's black: vertex colours);
// the upper jaw one mesh; the isolator one small mesh, drawn only while clipped on. No shadows from the small parts.
import * as THREE from 'three';
import { MAT } from './props.js';
import { mergeStatic } from '../engine/merge.js';
import { touch } from './story/reach.js';

const CLAMP_Y = 1.215;   // the clamp's top over the deck: where a 'tinker' hand is (story/reach.js: 1.17–1.26)

export function buildCodeJoint({ root, physics, x, z, box }) {
  const gy = physics.groundAt(x, z);
  const G = new THREE.Group(); G.position.set(x, gy, z); root.add(G);
  const iron = MAT.iron(), cable = MAT.flat('#1c1c20', 0.7), brass = MAT.brass(), red = MAT.paint('#b8302a', 0.4);
  const S = new THREE.Group(); G.add(S);
  const add = (geo, m, px, py, pz, par = S) => { const o = new THREE.Mesh(geo, m); o.position.set(px, py, pz); o.castShadow = false; par.add(o); return o; };
  add(new THREE.CylinderGeometry(0.045, 0.055, CLAMP_Y - 0.05, 8), iron, 0, (CLAMP_Y - 0.05) / 2, 0);
  add(new THREE.BoxGeometry(0.26, 0.03, 0.26), iron, 0, 0.015, 0);
  add(new THREE.BoxGeometry(0.16, 0.05, 0.1), iron, 0, CLAMP_Y - 0.075, 0);   // the lower jaw (fixed), its top 0.05 under the clamp's
  // the cable: off the deck from the collar's side (−z), up the post to the clamp, out of it and down to the box
  const bx = box.x - x, bz = box.z - z;
  const run = (pts) => { const c = new THREE.CatmullRomCurve3(pts.map(([a, b, c2]) => new THREE.Vector3(a, b, c2))); add(new THREE.TubeGeometry(c, 16, 0.022, 5), cable, 0, 0, 0); };
  run([[0.05, 0.03, -1.1], [0.06, 0.03, -0.25], [0.07, 0.4, -0.06], [0.08, CLAMP_Y - 0.08, -0.04]]);
  run([[-0.08, CLAMP_Y - 0.08, 0.0], [-0.12, 0.6, 0.06], [bx * 0.5, 0.03, bz * 0.5], [bx * 0.92, 0.25, bz * 0.92]]);
  mergeStatic(S, { recolor: true });
  // the upper jaw, cracked across: it jumps on the knocks
  const jaw = new THREE.Group(); jaw.position.set(0, CLAMP_Y - 0.05, 0); jaw.userData.keep = true; G.add(jaw);
  add(new THREE.BoxGeometry(0.16, 0.05, 0.1), iron, 0, 0.025, 0, jaw);
  // Baldino's isolator on the clamp, as on Kell's feed box (zlift.js): a brass block and its red pin
  const clip = new THREE.Group(); clip.position.set(0, CLAMP_Y + 0.03, 0); clip.visible = false; clip.userData.keep = true; G.add(clip);
  add(new THREE.BoxGeometry(0.09, 0.055, 0.12), brass, 0, 0, 0, clip); add(new THREE.CylinderGeometry(0.012, 0.012, 0.03, 6), red, 0.025, 0.04, 0, clip);
  mergeStatic(clip, { recolor: true });
  const col = physics.add({ type: 'cyl', x, z, r: 0.1, top: gy + CLAMP_Y, noStand: true, seeThrough: true });
  let clipped = false;
  return {
    x, z, y: gy + CLAMP_Y,
    // (he stands south of it, facing −z, the clamp in his right hand)
    touch: touch(x, z + 0.04, Math.PI, 'tinker'),
    kick(k) { jaw.position.y = CLAMP_Y - 0.05 + (clipped ? 0.004 : 0.035) * Math.max(0, k); },
    clip(on) { clipped = !!on; clip.visible = clipped; },
    show(on) { G.visible = !!on; col.enabled = !!on; },
  };
}
