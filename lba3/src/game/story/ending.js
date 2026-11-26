// The ending film (task #13, the user's pick 26.11): 57 s after the epilogue's dinner, before the end card. Built on the
// opening's tools (src/engine/cinematic.js: one clock for the shots, the lines, the captions, the sounds and the music; the
// same "hold to skip"; finish() puts the world in its end state whether it played out or was skipped). It shows what the
// campaign changed, in the epilogue's own words (story/epilogue.js and its end card): the family at home, the story told
// slowly; the square, where the well runs cool and Gilbert's refund came; the harbour, everyone back; the bore turning as
// a shield run by both worlds; the sea toward Kesh's oasis and Lhar's village; home again, Arthur asking once more.
//
// The cut is written to the ending music's bars (assets/music homecoming: 2.364 s a bar, started 0.3 s into the film); each
// shot starts on a bar line:
//   1  0.0-9.8    home, at the table: "So there I was..." / "With Sendell!" / "Slowly."
//   2  9.8-19.2   the square: Gilbert by the well, the heat posts lit: "Cold water at last. And my refund came."
//   3  19.2-26.3  the harbour: Doran on his quay: "Everyone's back. Now, a week of sleep."
//   4  26.3-35.8  the plateau: the bore turning (caption: a shield now, run by both worlds)
//   5  35.8-42.9  the headland and the lighthouse, the sea beyond (caption: Kesh's oasis, Lhar's village)
//   6  42.9-57.0  home: "So now can I go down there?" / "No." / "No." / "Welcome home." Fade, the end card.
// ?nocine (developers, tests) goes straight to the end card, as before.
import * as THREE from 'three';
import { Cinematic, voiceSeconds } from '../../engine/cinematic.js';
import { t } from '../i18n.js';
import '../text/ending.js';

export const ENDING_AT = 0.3, ENDING_BAR = 2.364;          // (the music's first bar on the film's clock; its bar)
const B = (k) => ENDING_AT + ENDING_BAR * k;
export const ENDING_LENGTH = B(24);                          // 57.04 s: three of the piece's 8-bar phrases
export const ENDING_SHOTS = [0, B(4), B(8), B(11), B(15), B(18), ENDING_LENGTH];   // (the cuts, for the tests)
export const endingOn = () => { try { return !new URLSearchParams(location.search).has('nocine'); } catch { return true; } };

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const sm = (x) => { x = Math.min(1, Math.max(0, x)); return x * x * (3 - 2 * x); };
const C = { zoe: '#ffb0d0', hero: '#8fc2ff', arthur: '#ffe070', gilbert: '#c8e0a0', doran: '#a8d4f0' };
// (the opening's joint offsets: a gesture is a few rotations laid over the rig's own pose, taken off again before its
//  next update so nothing accumulates)
const JOINT = { torso: (j) => j.torso.rotation, head: (j) => j.head.rotation, shR: (j) => j.armR.sh.rotation, elR: (j) => j.armR.el.rotation,
  shL: (j) => j.armL.sh.rotation, elL: (j) => j.armL.el.rotation };

export function playEnding(epi, done) {
  const g = epi.game, story = epi.story, W = g.world, R = g.rooms.house, H = g.hero;
  const zoe = epi.npc('zoe'), arthur = epi.npc('arthur'), gilbert = epi.npc('gilbert'), doran = epi.npc('doran');
  const hx = (x, z) => ({ x: R.center.x + x, z: R.center.z + z });
  const hv = (x, y, z) => V(R.center.x + x, y, R.center.z + z);
  const ground = (x, z, y) => g.physics.groundAt(x, z, y);
  const home = W.houses[0];
  const homeOut = { x: home.door.x + Math.sin(home.ry) * 1.4, z: home.door.z + Math.cos(home.ry) * 1.4, a: home.ry };

  // ---------------------------------------------------------------- the family (the scene moves them; the town's people
  // keep their own places and actions: the game updates them as in a cinematic)
  const cast = [];
  const loops = [];
  const actor = (a) => {
    cast.push(a);
    a._noFid = a.rig.noFidget; a.rig.noFidget = true;           // (no idle fidget over the scene's own beats)
    a._contact = a.rig.contact; a.rig.contact = null;           // (no work-hands layer reaching for the thing at his old spot)
    return a;
  };
  const tw = actor(H), zo = actor(zoe), ar = actor(arthur);
  const put = (a, p, ang, anim = 'idle') => {
    a.pos.set(p.x, ground(p.x, p.z), p.z);
    a.angle = ang; a.rig.play(anim); a.sync();
  };
  const face = (a, b) => Math.atan2(b.x - a.x, b.z - a.z);
  const look = (a, p) => { if (a.rig.lookAt && p && a.rig.lookAt.distanceTo(p) > 0.4 && a.rig.blinkT > 0.6) a.rig.blinkT = 0.11; a.rig.lookAt = p; };
  const headOf = (a) => V(a.pos.x, a.pos.y + 1.5 * (a.rig.root.scale.y || 1), a.pos.z);   // (the opening's head(): eye height)
  const shown = (on) => { H.rig.root.visible = on; if (H.shadow) H.shadow.visible = on; };
  const loop = (name, opts) => { const h = g.audio.loop?.(name, opts); if (h) loops.push(h); return h; };
  const stopLoops = (f) => { for (const h of loops.splice(0)) h.stop(f); };

  // where they stand at the table (house-local; the house is an open set whose shots look north or west, so the three are
  // on the table's north and west sides, all faces to the room): Twinsen up from his place at its north side to tell it,
  // Arthur beside him, Zoé behind her chair at its west end (as the One Place meal has her: she does not sit in her long
  // dress). Arthur stands west of the north-east corner, clear of the One Place quest's fourth chair when it is out.
  const T0 = { x: R.table.x - R.center.x, z: R.table.z - R.center.z };
  const twAt = hx(T0.x - 0.68, T0.z - 0.86), arAt = hx(T0.x + 0.08, T0.z - 0.8), zoAt = hx(T0.x - 1.58, T0.z + 0.02);
  const mid = hv(T0.x - 0.7, 1.25, T0.z - 0.25);
  const stage = () => {
    put(tw, twAt, face(twAt, hx(T0.x - 1.2, T0.z + 0.5)));
    put(zo, zoAt, face(zoAt, hx(T0.x - 0.3, T0.z - 0.35)), 'listen');
    put(ar, arAt, face(arAt, hx(T0.x - 0.6, T0.z + 0.6)), 'idle');
  };

  // ---------------------------------------------------------------- gestures (the opening's shape: a small wind-up the
  // other way, the move with a touch of overshoot, a hold that sinks while the words are said, the settle)
  const bends = [];
  const gest = (a, t0, d, o) => {
    const env = (u) => {
      if (u < 0) return -0.12 * sm((u + 0.14) / 0.14);
      if (u < 0.3) return -0.12 + 1.17 * sm(u / 0.3);
      if (u < 0.5) return 1.05 - 0.05 * sm((u - 0.3) / 0.2);
      const hold = 1 - 0.08 * Math.min(1, (u - 0.5) / Math.max(0.1, d - 0.5));
      return u < d ? hold : hold * (1 - sm((u - d) / 0.5));
    };
    bends.push({ a, t0: t0 - 0.2, t1: t0 + d + 0.55, o, env: (tt) => env(tt - t0) });
  };
  const unbend = (a) => {
    const o = a._bend; if (!o) return;
    for (const [k, v] of Object.entries(o)) { const r = JOINT[k](a.rig.j); r.x -= v[0] || 0; r.y -= v[1] || 0; r.z -= v[2] || 0; }
    a._bend = null;
  };
  const bendNow = (a, tt) => {
    let o = null;
    for (const b of bends) {
      if (b.a !== a || tt < b.t0 || tt > b.t1) continue;
      const e = b.env(tt); o ??= {};
      for (const [k, v] of Object.entries(b.o)) { const c = o[k] ??= [0, 0, 0]; v.forEach((x, i) => (c[i] += x * e)); }
    }
    if (!o) return;
    for (const [k, v] of Object.entries(o)) { const r = JOINT[k](a.rig.j); r.x += v[0]; r.y += v[1]; r.z += v[2]; }
    a._bend = o;
  };

  // ---------------------------------------------------------------- lines
  const subs = [];
  const say = (tt, id, key, d, a = null, beat = null) => {
    subs.push({ t: tt, d, who: t('n_' + id), color: C[id] || '#fff', text: t(key), voice: 'n_' + id });
    if (a && beat) gest(a, tt + (beat.at ?? 0.15), beat.d ?? Math.min(d - 0.5, voiceSeconds(t(key), d, 'n_' + id)), beat.o);
  };
  // 1 — at the table
  say(1.1, 'hero', 'en_tw_1', 2.7, tw, { at: 0.35, d: 1.5, o: { shR: [-0.35, 0, 0.05], elR: [-0.8], head: [0.04, 0, 0] } });   // (a forearm up, the hand turned down: under the island)
  say(4.15, 'arthur', 'en_ar_1', 1.7, ar, { at: 0.05, d: 1.0, o: { shR: [-0.75, 0, -0.1], elR: [-0.9], torso: [-0.06, 0, 0] } });   // (up on his toes, a fist forward)
  say(6.4, 'zoe', 'en_zoe_1', 1.6, zo, { at: 0.1, d: 0.8, o: { shL: [-0.32, 0, 0.18], elL: [-0.7], head: [0.06, 0, 0] } });   // (one open hand, palm down: slow)
  // 2 — the square
  say(B(4) + 2.2, 'gilbert', 'en_gilbert', 3.0);
  // 3 — the harbour
  say(B(8) + 1.6, 'doran', 'en_doran', 2.9);
  // 6 — home again
  say(B(18) + 1.5, 'arthur', 'en_ar_2', 2.3, ar, { at: 0.2, d: 1.3, o: { shR: [-0.42, 0, -0.2], elR: [-0.95], head: [0, 0.05, 0.05] } });   // (a hand toward the floor: down there)
  say(B(18) + 4.05, 'zoe', 'en_zoe_2', 0.9);
  say(B(18) + 4.75, 'hero', 'en_tw_2', 0.9);
  say(B(18) + 8.0, 'zoe', 'en_zoe_3', 2.2);
  const caps = [
    { t: B(11) + 1.4, d: 6.2, text: t('en_cap_bore'), sub: t('en_cap_bore_sub') },
    { t: B(15) + 0.9, d: 5.2, text: t('en_cap_isles'), sub: t('en_cap_isles_sub') },
  ];

  // ---------------------------------------------------------------- shots
  const P = (pos, lk, fov = 40) => ({ pos, look: lk, fov });
  // the square: Gilbert by the well, from in front of him, the well and the heat posts behind
  const gp = gilbert?.pos.clone() ?? V(W.well.x + 2.2, ground(W.well.x, W.well.z), W.well.z + 1.4);
  const gF = gilbert ? V(Math.sin(gilbert.angle), 0, Math.cos(gilbert.angle)) : V(-0.58, 0, 0.81);
  const gS = V(gF.z, 0, -gF.x);   // (his right)
  const wellAt = V(W.well.x, gp.y + 0.9, W.well.z);
  // (at his eye level: the epilogue's bunting crosses the square at head height and from above it cut across his face)
  const sqA = P(gp.clone().addScaledVector(gF, 5.4).addScaledVector(gS, -1.5).add(V(0, 1.45, 0)), gp.clone().lerp(wellAt, 0.35).add(V(0, 1.3, 0)), 42);
  const sqB = P(gp.clone().addScaledVector(gF, 4.5).addScaledVector(gS, -0.6).add(V(0, 1.4, 0)), gp.clone().lerp(wellAt, 0.22).add(V(0, 1.35, 0)), 40);
  // the harbour: Doran on his quay, the water behind
  const dp = doran?.pos.clone() ?? V(W.pierStart.x, 1.8, W.pierStart.z + 2.2);
  const dF = doran ? V(Math.sin(doran.angle), 0, Math.cos(doran.angle)) : V(0, 0, -1);
  const dS = V(dF.z, 0, -dF.x);
  // (from his right, a little wide: the bell's post stands close at his left and filled every view from that side)
  const hbA = P(dp.clone().addScaledVector(dF, 4.3).addScaledVector(dS, 2.9).add(V(0, 1.75, 0)), dp.clone().add(V(0, 1.2, 0)).addScaledVector(dS, 0.45), 42);
  const hbB = P(dp.clone().addScaledVector(dF, 3.9).addScaledVector(dS, 2.6).add(V(0, 1.65, 0)), dp.clone().add(V(0, 1.25, 0)).addScaledVector(dS, 0.4), 40);
  // the bore: the opening's view of it (shot 3), held longer and slower
  const bore = W.station.bore, boreY = ground(bore.x, bore.z);
  const brA = P(V(bore.x + 24, boreY + 10, bore.z + 13), V(bore.x, boreY + 5, bore.z), 46);
  const brB = P(V(bore.x + 19, boreY + 8, bore.z + 10.5), V(bore.x, boreY + 5.4, bore.z), 46);
  // the headland: the lighthouse over the sea
  const lh = { x: -107.5, z: 97.5 }, lhY = ground(lh.x, lh.z);
  const lhA = P(V(lh.x + 24, lhY + 9, lh.z - 22), V(lh.x - 2, lhY + 7, lh.z + 6), 44);
  const lhB = P(V(lh.x + 21, lhY + 8, lh.z - 20), V(lh.x - 5, lhY + 6.5, lh.z + 8), 44);
  // home: the table from its south-east (the house is an open set: its shots look north or west)
  // (from the south, a little east of the middle: the three side by side across the frame, Zoé left, Twinsen, Arthur
  //  right; from the south-east Arthur stood behind his father's shoulder)
  const hmA = P(hv(T0.x - 0.1, 2.05, T0.z + 3.7), mid.clone().add(V(0, -0.1, 0)), 40);
  const hmB = P(hv(T0.x - 0.25, 1.9, T0.z + 3.1), mid.clone().add(V(0, 0, 0)), 38);
  const hmC = P(hv(T0.x - 0.35, 1.78, T0.z + 2.7), mid.clone().add(V(-0.05, 0.05, -0.05)), 36);
  const hmD = P(hv(T0.x + 0.2, 2.35, T0.z + 4.6), mid.clone().add(V(0, -0.2, 0)), 42);
  // "Welcome home.": over his right shoulder onto her face (she turns to him, away from the room's camera)
  const zoHead = V(zoAt.x, 1.5, zoAt.z), twHead = V(twAt.x, 1.55, twAt.z);
  const toZ = zoHead.clone().sub(twHead).setY(0).normalize(), twRight = V(-toZ.z, 0, toZ.x);
  const zoA = P(twHead.clone().addScaledVector(toZ, -0.75).addScaledVector(twRight, 1.3).add(V(0, -0.05, 0)), zoHead.clone().lerp(twHead, 0.12).add(V(0, -0.16, 0)), 38);
  const zoB = P(twHead.clone().addScaledVector(toZ, -0.65).addScaledVector(twRight, 1.22).add(V(0, -0.06, 0)), zoHead.clone().lerp(twHead, 0.1).add(V(0, -0.15, 0)), 36);
  const shots = [
    { t0: 0, t1: B(4), from: hmA, to: hmB },
    { t0: B(4), t1: B(8), from: sqA, to: sqB },
    { t0: B(8), t1: B(11), from: hbA, to: hbB },
    { t0: B(11), t1: B(15), from: brA, to: brB },
    { t0: B(15), t1: B(18), from: lhA, to: lhB },
    { t0: B(18), t1: B(18) + 7.55, from: hmB, to: hmC },
    { t0: B(18) + 7.55, t1: B(18) + 11.0, from: zoA, to: zoB },
    { t0: B(18) + 11.0, t1: ENDING_LENGTH + 0.01, from: hmC, to: hmD, ease: (x) => sm(x) * 0.85 + x * 0.15 },
  ];

  // the house is an open set with no ceiling (the game's camera looks down into it); the film's lower cameras saw the
  // black over the walls: a ceiling for the film, as the opening's set has (opening.js flats), taken away by finish()
  const ceiling = new THREE.Mesh(new THREE.BoxGeometry(18.8, 0.12, 15.8), new THREE.MeshStandardMaterial({ color: '#4a3424', roughness: 0.95 }));
  ceiling.position.set(-4.5, 3.06, 4.0); ceiling.castShadow = false; ceiling.name = 'endingCeiling';

  // ---------------------------------------------------------------- events and tracks (one clock)
  const ev = [];
  const at = (tt, fn) => ev.push({ t: tt, fn });
  let cine = null;
  const inside = () => {
    if (g.room !== R) g.enterRoom('house', { ...twAt, a: tw.angle }, true, true);
    shown(true); cine.focus = null;
    stage(); loop('room');
  };
  const outside = (focus) => {
    if (g.room) g.exitRoom(homeOut, true, true);
    shown(false); cine.focus = focus;
  };
  at(ENDING_AT, () => g.audio.cue('homecoming'));
  // 1 — at the table: he tells it; Arthur can't wait; Zoé
  at(0.0, () => { look(tw, mid.clone().add(V(0.5, 0, 0.6))); look(zo, headOf(tw)); look(ar, headOf(tw)); tw.rig.setFace('pleased', 0.5, 4); ar.rig.setFace('curious', 0.8, 4); zo.rig.setFace('pleased', 0.35, 9); });
  at(1.6, () => look(tw, headOf(ar)));
  at(3.9, () => { look(zo, headOf(ar)); ar.rig.setFace('pleased', 1, 2.5); });
  at(5.8, () => { look(tw, headOf(zo)); look(ar, headOf(zo)); });
  at(6.3, () => look(zo, headOf(ar)));
  at(7.6, () => { tw.rig.setFace('pleased', 0.8, 2); look(zo, headOf(tw)); });
  // 2 — the square
  at(B(4), () => { stopLoops(0.4); outside(gp.clone()); loop('trickle', { quiet: true }); });
  // 3 — the harbour
  at(B(8), () => { stopLoops(0.3); cine.focus = dp.clone(); loop('lap', { quiet: true }); });
  // 4 — the bore: its hum under the music
  at(B(11), () => { stopLoops(0.3); cine.focus = V(bore.x, boreY, bore.z); g.audio.play('hum'); });
  // 5 — the headland
  at(B(15), () => { cine.focus = V(lh.x, lhY, lh.z); loop('lap', { quiet: true }); });
  // 6 — home again: Arthur asks; two answers at once; Zoé
  at(B(18), () => {
    stopLoops(0.3); inside();
    look(tw, headOf(zo)); look(zo, headOf(tw)); look(ar, headOf(tw));
    tw.rig.setFace('pleased', 0.4, 5); zo.rig.setFace('pleased', 0.4, 5); ar.rig.setFace('curious', 0.9, 4);
  });
  at(B(18) + 1.2, () => { look(tw, headOf(ar)); look(zo, headOf(ar)); });
  at(B(18) + 4.0, () => zo.rig.setFace('neutral', 1, 1.2));
  at(B(18) + 4.7, () => { tw.rig.doGesture('nod'); tw.rig.setFace('pleased', 0.7, 3); });
  at(B(18) + 5.6, () => { ar.rig.setFace('annoyed', 0.6, 2.2); look(ar, hv(T0.x, 0.85, T0.z)); });   // (a sulk at the table)
  at(B(18) + 7.4, () => { look(zo, headOf(tw)); look(tw, headOf(zo)); zo.rig.setFace('pleased', 0.9, 6); });
  at(B(18) + 8.6, () => { look(ar, headOf(zo)); ar.rig.setFace('pleased', 0.5, 4); tw.rig.setFace('pleased', 1, 5); });
  at(ENDING_LENGTH - 1.6, () => { const f = document.querySelector('#fade'); f.classList.remove('quick'); f.classList.add('on'); });   // (into the end card)

  const tracks = [{
    t0: 0, t1: ENDING_LENGTH, fn: (k, n, dt) => {
      for (const a of cast) {
        unbend(a);
        if (dt > 0) a.rig.update(dt, 0);
        bendNow(a, n);
        a.sync();
      }
    },
  }];

  // ---------------------------------------------------------------- prepare / finish
  cine = new Cinematic(g, {
    length: ENDING_LENGTH,
    events: ev, tracks, shots, subs, caps,
    music: { name: 'homecoming', at: ENDING_AT },
    async prepare(c) {
      g.audio.setMood(null);   // (the house's music fades out under the black; the film's cue enters on its first bar)
      for (const a of [zoe, arthur]) { a.controlled = true; a.setPresent(true); }
      epi.sheathe?.();
      if (g.room !== R) g.enterRoom('house', { ...twAt, a: 0 }, true, true);
      c.focus = null;
      R.group.add(ceiling);
      stage();
      loop('room');
      // every material the film shows compiled while the screen is black (the house and the island)
      const r = g.renderer.renderer, wasR = R.group.visible, wasW = W.root.visible;
      R.group.visible = true; W.root.visible = true;
      try { await (r.compileAsync ? r.compileAsync(g.scene, g.camera) : r.compile(g.scene, g.camera)); } catch { /* the first frames compile instead */ }
      R.group.visible = wasR; W.root.visible = wasW;
      if (g.audio.ctx) await Promise.race([Promise.resolve(g.audio.music.ready).then(() => g.audio.music.load('homecoming')), new Promise((res) => setTimeout(res, 5000))]);
    },
    finish(skipped) {
      for (const a of cast) { unbend(a); a.rig.lookAt = null; a.rig.noFidget = a._noFid; if (a._contact) a.rig.contact = a._contact; a._contact = null; }
      stopLoops(skipped ? 0.2 : 0.8);
      document.querySelector('#fade').classList.remove('quick');
      // home, as the end card shows it (played or skipped: the same place, the same frame)
      if (g.room !== R) g.enterRoom('house', { ...twAt, a: tw.angle }, true, true);
      shown(true); cine.focus = null;
      ceiling.parent?.remove(ceiling); ceiling.geometry.dispose(); ceiling.material.dispose();
      // (the three stay at the table under the end card, as its last frame showed them; Keep Exploring sends Zoé and Arthur
      //  back to their epilogue places: epilogue.js afterEnding)
      stage();
      for (const a of [zoe, arthur]) a.controlled = false;
      const cam = g.camera, E = hmD;
      cam.position.copy(E.pos); cam.up.set(0, 1, 0); cam.lookAt(E.look); cam.fov = E.fov; cam.updateProjectionMatrix(); g.camRig.look.copy(E.look);
      done?.(skipped);
    },
  });
  cine.speakers = {};
  cine.ending = { shots: ENDING_SHOTS, cast: { tw, zo, ar } };   // (for the tests)
  return cine;
}
