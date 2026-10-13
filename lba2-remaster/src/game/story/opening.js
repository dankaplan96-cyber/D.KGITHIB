// The opening (new game): Citadel Island is awake → the project's cargo lift at work → home → the tap that
// coughs and runs warm → "I'll check the well." / "I'll ask next door." → title → control, in the house.
//
// Built on src/engine/cinematic.js. Every action is an event or a track on one clock; finish() puts the world
// in its end state (the same whether the scene played out or was skipped) and hands control over.
// Times are in seconds; the music cue `opening` (tools/music/tracks/opening.py) is written to these times.
import * as THREE from 'three';
import { Cinematic } from '../../engine/cinematic.js';
import { dampAngle } from '../../engine/math.js';
import { createCharacter } from '../characters.js';
import { glowSprite } from '../interiors.js';
import { t } from '../i18n.js';
import '../text/opening.js';
import { SHIFT } from '../island.js';

export const OPENING_LENGTH = 84.5;
export const MUSIC_AT = 2.5;          // the cue starts after a moment of harbour sound

const V = (x, y, z) => new THREE.Vector3(x, y, z);
// the harbour's shots and walks are written in its design frame (island.js buildHarbour); HV/HP put them where it stands
const HS = SHIFT.harbour;
const HV = (x, y, z) => V(x + HS.x, y, z + HS.z);
const HP = (x, z) => ({ x: x + HS.x, z: z + HS.z });
const sm = (x) => { x = Math.min(1, Math.max(0, x)); return x * x * (3 - 2 * x); };
const span = (k, a, b) => sm((k - a) / (b - a));

export function playOpening(story) {
  const g = story.game, W = g.world, R = g.rooms.house, H = g.hero;
  const zoe = story.cur.npc('zoe'), arthur = story.cur.npc('arthur');
  const L = W.cargoLift, K = R.kitchen, TB = R.table, BT = R.boat;
  const hx = (x, z) => ({ x: R.center.x + x, z: R.center.z + z });   // house-local → world
  const hv = (x, y, z) => V(R.center.x + x, y, R.center.z + z);
  const harbourFocus = HV(-82, 1.8, -3);

  // ---------------------------------------------------------------- cast
  const cast = [];
  const temps = [];                                   // scene-only objects, removed by finish()
  const loops = [];                                   // running sound loops, stopped by finish()
  const actor = (a) => { cast.push(a); a._speed = 0; a.rig.noFidget = true; return a; };
  const extra = (name) => {
    const rig = createCharacter(name);
    g.scene.add(rig.root); temps.push(rig.root);
    return actor({ pos: V(0, 0, 0), angle: 0, rig, sync() { rig.root.position.copy(this.pos); rig.root.rotation.y = this.angle; } });
  };
  const put = (a, x, z, ang, anim = 'idle') => {
    a.pos.set(x, g.physics.groundAt(x, z), z);
    a.angle = ang; a._speed = 0;
    a.rig.play(anim);
    a.sync();
  };
  const play = (a, anim) => a.rig.play(anim);
  const look = (a, p) => { a.rig.lookAt = p; };
  const head = (a, h = 1.5) => V(a.pos.x, a.pos.y + h * (a.rig.root.scale.y || 1), a.pos.z);
  const loop = (name, opts) => { const h = g.audio.loop?.(name, opts); if (h) loops.push(h); return h; };
  const sfx = (name) => g.audio.play(name);

  const tw = actor(H), zo = actor(zoe), ar = actor(arthur);
  const worker = extra('worker'), passer = extra('farmerB');

  // ---------------------------------------------------------------- props held in hands
  const hold = (obj, a, pos, rot, side = 'R') => { const hand = a.rig.j['arm' + side].hand; hand.add(obj); obj.position.set(...pos); obj.rotation.set(...rot); };
  const rest = (obj, parent, p, extraRot = [0, 0, 0]) => { parent.add(obj); obj.position.set(p.x, p.y, p.z); obj.rotation.set(extraRot[0], p.ry ?? 0, extraRot[2]); };
  const sdRest = { x: TB.sdRest.x, y: TB.sdRest.y, z: TB.sdRest.z, ry: TB.sdRest.ry };
  const mastFitted = { x: BT.mastRest.x, y: 0.085, z: BT.mastRest.z, ry: BT.mastRest.ry }; // (room-local)

  // ---------------------------------------------------------------- the tap
  const stream = K.stream;
  let flow = 0, flowWobble = 0;                         // 0 = off, 1 = a full stream, ~0.35 = a trickle
  const steam = [0, 1, 2].map(() => { const s = glowSprite('#ffffff', 0.16, 0.0); s.visible = false; R.group.add(s); temps.push(s); return s; });
  let steamOn = 0, steamT = 0;
  const water = (k) => {
    flow = k;
    stream.visible = k > 0.01;
    if (stream.visible) stream.scale.set(k, 1, k);
  };

  // ---------------------------------------------------------------- shots (world positions)
  const shot = (t0, t1, from, to, extra2 = {}) => ({ t0, t1, from, to, ...extra2 });
  const P = (pos, lk, fov = 40) => ({ pos, look: lk, fov });
  const twSpot = hx(-0.45, -0.25), zoTray = hx(-1.78, -2.6), zoSink = hx(-2.3, -2.6);
  const shots = [
    // 1 — the harbour wakes: water and the bow line, then one move up and back to the pier and the lift
    shot(0, 5.6, P(HV(-76.5, 1.0, 1.5), HV(-78.0, 0.85, -1.7), 40), P(HV(-76.62, 1.05, 1.38), HV(-78.05, 0.88, -1.75), 40)),
    shot(5.6, 13.0, P(HV(-76.62, 1.05, 1.38), HV(-78.05, 0.88, -1.75), 40), P(HV(-74.2, 5.6, 5.9), HV(-83.4, 2.0, -2.9), 44)),
    // 2 — the lift: the crate comes up off the barge; the worker at the controls; a passer-by goes to the ferry
    shot(13.0, 21.0, P(HV(-79.7, 3.3, -1.75), HV(-85.1, 2.25, -3.05), 44), P(HV(-79.9, 3.2, -1.85), HV(-85.1, 2.4, -3.1), 44)),
    shot(21.0, 29.0, P(HV(-80.2, 2.75, -2.35), HV(-83.6, 2.0, -3.95), 44), P(HV(-80.35, 2.65, -2.45), HV(-83.6, 1.95, -4.05), 42)),
    // 3 — home: the whole family at their own things, then Zoé at the counter
    shot(29.0, 35.0, P(hv(4.35, 2.75, 4.35), hv(0.2, 0.75, -0.55), 44), P(hv(4.05, 2.6, 4.05), hv(0.1, 0.75, -0.6), 44)),
    shot(35.0, 41.0, P(hv(-0.15, 1.85, -1.95), hv(-2.0, 1.32, -2.95), 44), P(hv(-0.25, 1.82, -2.0), hv(-2.1, 1.3, -2.95), 44)),
    // 4 — the tap; the exchange
    shot(41.0, 48.0, P(hv(-0.55, 1.8, -2.05), hv(-2.3, 1.3, -3.0), 42), P(hv(-0.65, 1.78, -2.1), hv(-2.3, 1.3, -3.0), 41)),
    shot(48.0, 50.8, P(hv(-1.85, 1.75, -2.2), hv(-0.45, 1.45, -0.25), 42)),
    shot(50.8, 53.4, () => overShoulder(), null),
    shot(53.4, 58.0, P(hv(0.75, 1.2, 0.8), hv(2.1, 0.55, 2.1), 42), P(hv(0.8, 1.18, 0.85), hv(2.1, 0.57, 2.1), 42)),
    shot(58.0, 60.1, P(hv(-0.8, 1.72, -2.2), hv(-2.3, 1.22, -3.02), 40), P(hv(-0.84, 1.7, -2.22), hv(-2.3, 1.21, -3.02), 39)),
    shot(60.1, 62.1, P(hv(-1.62, 1.28, -2.62), hv(-2.3, 0.98, -3.12), 34), P(hv(-1.66, 1.26, -2.64), hv(-2.3, 0.97, -3.12), 32)),
    shot(62.1, 64.2, P(hv(-0.88, 1.68, -2.25), hv(-2.3, 1.2, -3.02), 38)),
    shot(64.2, 66.5, P(hv(-1.85, 1.8, -2.1), hv(-0.45, 1.55, -0.25), 38)),
    // 5 — the decision, wide enough for both of them
    shot(66.5, 72.5, P(hv(1.75, 1.95, -2.45), hv(-1.05, 1.15, -1.35), 48), P(hv(1.65, 1.92, -2.42), hv(-1.05, 1.15, -1.4), 48)),
    // 6 — following Twinsen to the door; the title; then into the game's own camera
    shot(72.5, 80.0, () => follow(), null),
    shot(80.0, OPENING_LENGTH, null, 'game'),
  ];
  function overShoulder() {
    const a = tw.angle, f = { x: Math.sin(a), z: Math.cos(a) }, r = { x: -Math.cos(a), z: Math.sin(a) };
    return P(V(tw.pos.x - f.x * 1.45 + r.x * 0.7, 1.95, tw.pos.z - f.z * 1.45 + r.z * 0.7), head(zo, 1.35), 40);
  }
  function follow() {
    const k = sm((cine.t - 72.5) / 7.5);
    const pos = hv(2.55, 2.05, 1.6).lerp(hv(3.15, 2.45, 1.05), k);
    return P(pos, V(tw.pos.x - 0.35, 1.05, tw.pos.z - 0.55), 44);
  }

  // ---------------------------------------------------------------- tracks
  const tracks = [];
  const track = (t0, t1, fn) => tracks.push({ t0, t1, fn });
  // walk along points at a steady pace; the rig is told the real speed so the feet don't slide
  const walk = (a, pts, t0, speed, end = 'idle', endAngle = null) => {
    const seg = []; let len = 0;
    for (let i = 1; i < pts.length; i++) { const d = Math.hypot(pts[i].x - pts[i - 1].x, pts[i].z - pts[i - 1].z); seg.push(d); len += d; }
    const t1 = t0 + len / speed;
    track(t0, t1, (k, tt, dt) => {
      let d = k * len, i = 0;
      while (i < seg.length - 1 && d > seg[i]) { d -= seg[i]; i++; }
      const p0 = pts[i], p1 = pts[i + 1], u = seg[i] ? Math.min(1, d / seg[i]) : 1;
      const x = p0.x + (p1.x - p0.x) * u, z = p0.z + (p1.z - p0.z) * u;
      a.pos.set(x, g.physics.groundAt(x, z), z);
      a.angle = dampAngle(a.angle, Math.atan2(p1.x - p0.x, p1.z - p0.z), 9, dt || 1 / 60);
      if (k < 1) { a._speed = speed; a.rig.play('walk'); } else { a._speed = 0; a.rig.play(end); if (endAngle != null) a.angle = endAngle; }
    });
    return t1;
  };
  const turn = (a, ang, t0, dur = 0.45) => {
    let from = null;
    track(t0, t0 + dur, (k) => {
      from ??= a.angle;
      let d = ang - from; d = Math.atan2(Math.sin(d), Math.cos(d));
      a.angle = from + d * sm(k);
    });
  };
  const angleTo = (a, p) => Math.atan2(p.x - a.pos.x, p.z - a.pos.z);

  // the lift's unload cycle on the clock
  const liftU = [[6.0, 0], [13.0, 0.16], [14.2, 0.22], [21.0, 0.45], [24.8, 0.7], [27.0, 0.88], [28.6, 1.0]];
  track(0, 29.0, (k, tt) => {
    let u = 0;
    for (let i = 1; i < liftU.length; i++) if (tt <= liftU[i][0]) { const [a0, u0] = liftU[i - 1], [a1, u1] = liftU[i]; u = u0 + (u1 - u0) * Math.min(1, Math.max(0, (tt - a0) / (a1 - a0))); break; } else u = liftU[i][1];
    L.pose(u);
    // the faint vibration (19.2–22.0)
    L.shake(Math.max(0, Math.sin(Math.min(1, Math.max(0, (tt - 19.2) / 2.8)) * Math.PI)) * 0.85);
    // the bow line pulls tight once as the boat surges on a swell (1.0–5.0)
    W.boatSurge = Math.sin(Math.min(1, Math.max(0, (tt - 1.0) / 4.0)) * Math.PI) * 0.32;
  });
  // the tap: stream thickness by time, with a sputter
  track(41.0, 72.0, (k, tt, dt) => {
    let f = 0;
    if (tt > 42.95 && tt < 43.6) f = 1;
    else if (tt >= 43.6 && tt < 43.95) f = Math.sin((tt - 43.6) * 40) > 0 ? 0.6 : 0;
    else if (tt > 59.2 && tt < 69.0) f = 0.5 + Math.sin(tt * 7) * 0.06;
    flowWobble += (dt || 0) * 30;
    water(f);
    if (f > 0) stream.scale.x = stream.scale.z = f * (1 + Math.sin(flowWobble) * 0.08);
    // steam over the basin while it runs warm
    steamOn = tt > 59.6 && tt < 69.4 ? Math.min(1, (tt - 59.6) / 1.2) : Math.max(0, steamOn - (dt || 0));
    steamT += dt || 0;
    steam.forEach((s, i) => {
      const ph = (steamT * 0.45 + i / 3) % 1;
      s.visible = steamOn > 0.01;
      s.position.set(K.basin.x - R.center.x + Math.sin(ph * 6 + i) * 0.03, K.basin.y + 0.08 + ph * 0.35, K.basin.z - R.center.z + 0.02);
      s.material.opacity = steamOn * Math.sin(ph * Math.PI) * 0.38;
      s.scale.setScalar(0.1 + ph * 0.14);
    });
  });
  // the tap handle turns open, closed
  const handle = K.handle;
  track(41.4, 42.2, (k) => { handle.rotation.y = -1.4 * sm(k); });
  track(44.0, 44.6, (k) => { handle.rotation.y = -1.4 * (1 - sm(k)); });
  track(58.5, 59.1, (k) => { handle.rotation.y = -2.2 * sm(k); });
  track(68.7, 69.2, (k) => { handle.rotation.y = -2.2 * (1 - sm(k)); });

  // walks
  walk(passer, [HP(-73.8, -4.7), HP(-83.6, -5.0), HP(-84.4, -5.65)], 15.0, 1.25, 'idle', Math.PI);
  walk(worker, [HP(-84.15, -3.2), HP(-84.0, -4.5), HP(-83.55, -4.65)], 22.4, 1.0, 'idle', angleTo({ pos: HP(-83.55, -4.65) }, L.cratePierW));
  walk(zo, [zoTray, zoSink], 40.3, 0.9, 'idle', Math.PI);
  const zoOut = [zoSink, hx(1.25, -1.0), hx(1.25, 1.6), hx(0.9, 4.4)]; // (out through the hall)
  walk(zo, zoOut, 72.0, 1.5);
  walk(tw, [twSpot, hx(0.9, 1.4), hx(1.3, 3.6)], 72.4, 1.25, 'idle'); // (toward the hall and the front door)

  // turns
  turn(tw, angleTo({ pos: twSpot }, zoSink), 46.5, 0.55);
  turn(zo, angleTo({ pos: zoSink }, twSpot), 50.6, 0.5);
  turn(zo, Math.PI, 57.6, 0.4);
  turn(tw, 0, 66.2, 0.45);
  turn(tw, angleTo({ pos: twSpot }, zoSink), 67.35, 0.45);
  turn(zo, angleTo({ pos: zoSink }, twSpot), 69.35, 0.45);
  turn(tw, Math.atan2(-1, 0.25), 78.2, 0.6);   // a look back into the room, toward the cupboard

  // everyone's rig, every frame (after the moves above)
  track(0, OPENING_LENGTH, (k, tt, dt) => {
    for (const a of cast) {
      if (dt > 0) a.rig.update(dt, a._speed || 0);
      a.sync();
    }
  });

  // ---------------------------------------------------------------- events
  const ev = [];
  const at = (tt, fn) => ev.push({ t: tt, fn });
  // sound of the place first, the music after a moment
  at(0, () => loop('lap'));
  at(2.2, () => sfx('ropeCreak'));
  at(3.4, () => sfx('ropeCreak'));
  at(MUSIC_AT, () => g.audio.cue('opening'));
  at(6.2, () => loop('winch', { quiet: true }));
  at(13.6, () => sfx('clunk'));
  at(14.2, () => { loop('motor'); play(worker, 'use'); });
  at(19.2, () => { sfx('hum'); });
  at(19.8, () => sfx('rattle'));
  at(20.2, () => look(worker, L.puddle.getWorldPosition(new THREE.Vector3())));
  at(21.3, () => { look(worker, null); });
  at(22.3, () => play(worker, 'idle'));
  at(24.2, () => { play(worker, 'reach'); look(worker, L.crate.getWorldPosition(new THREE.Vector3())); });
  at(27.0, () => { sfx('thump'); });
  at(27.4, () => { play(worker, 'setDown'); });
  at(28.6, () => { stopLoop('motor'); stopLoop('winch'); look(worker, null); });
  // to the house: a short dip to black
  at(28.62, () => document.querySelector('#fade').classList.add('on', 'quick'));
  at(29.0, () => {
    stopLoop('lap');
    g.enterRoom('house', hx(-0.45, -0.25), true, true);
    cine.focus = null;
    put(tw, twSpot.x, twSpot.z, 0, 'tinker');
    loop('room');
    setTimeout(() => document.querySelector('#fade').classList.remove('on'), 40);
  });
  at(29.3, () => document.querySelector('#fade').classList.remove('quick'));
  // body language before anyone speaks
  at(31.5, () => { play(ar, 'kneelShow'); look(ar, head(tw)); });
  at(32.4, () => { play(tw, 'idle'); look(tw, head(ar, 0.9)); });
  at(32.8, () => tw.rig.doGesture('nod'));
  at(34.0, () => { play(tw, 'tinker'); look(tw, null); });
  at(34.2, () => { play(ar, 'kneelWork'); look(ar, null); });
  at(36.2, () => { rest(BT.mast, R.group, mastFitted); sfx('tick'); });
  at(39.5, () => play(zo, 'wipe'));
  // the tap
  at(41.0, () => play(zo, 'reach'));
  at(41.35, () => play(zo, 'tapTurn'));
  at(41.5, () => sfx('tapSqueak'));
  at(42.3, () => sfx('pipeKnock'));
  at(42.65, () => sfx('pipeKnock'));
  at(42.95, () => { sfx('waterRun'); g.particles.burst(K.basin.x, K.basin.y + 0.05, K.basin.z, '#cfe8ff', 6, 0.8); });
  at(43.65, () => sfx('gurgle'));
  at(44.0, () => play(zo, 'reach'));
  at(44.6, () => { play(zo, 'idle'); look(zo, V(K.spout.x, K.spout.y, K.spout.z)); });
  at(45.2, () => look(zo, head(tw)));
  at(45.4, () => play(zo, 'talk'));
  at(46.2, () => { play(tw, 'idle'); look(tw, head(zo)); });
  at(47.9, () => play(zo, 'idle'));
  at(48.5, () => play(tw, 'talk'));
  at(50.6, () => play(tw, 'idle'));
  at(51.1, () => play(zo, 'talk'));
  at(52.9, () => { play(zo, 'idle'); });
  at(53.0, () => tw.rig.doGesture('shrug'));
  at(54.0, () => { play(ar, 'kneelLook'); look(ar, hv(-1.4, 1.3, -1.4)); look(zo, head(ar, 0.9)); look(tw, head(ar, 0.9)); });
  at(55.0, () => ar.rig.doGesture('nod'));
  at(57.6, () => { play(ar, 'kneelLook'); look(zo, null); });
  at(58.0, () => { play(zo, 'reach'); look(tw, head(zo)); });
  at(58.5, () => play(zo, 'tapTurn'));
  at(58.6, () => sfx('tapSqueak'));
  at(59.0, () => sfx('gurgle'));
  at(59.2, () => loop('trickle'));
  at(59.4, () => { play(zo, 'idle'); look(zo, V(K.spout.x, K.spout.y - 0.1, K.spout.z)); });
  at(60.0, () => play(zo, 'touchWater'));
  at(63.2, () => look(zo, head(tw)));
  at(64.4, () => tw.rig.doGesture('start'));
  at(64.6, () => { play(ar, 'kneelWork'); look(ar, null); });
  // the decision
  at(66.65, () => play(tw, 'setDown'));
  at(67.1, () => { rest(TB.screwdriver, R.group, { x: sdRest.x, y: sdRest.y, z: sdRest.z, ry: sdRest.ry }); sfx('put'); });
  at(67.9, () => play(tw, 'talk'));
  at(68.6, () => { play(zo, 'reach'); look(zo, null); });
  at(68.9, () => play(zo, 'tapTurn'));
  at(69.0, () => { stopLoop('trickle'); sfx('tapSqueak'); });
  at(69.5, () => play(tw, 'idle'));
  at(69.8, () => { play(zo, 'talk'); look(zo, head(tw)); });
  at(70.6, () => play(zo, 'wipe'));
  at(71.8, () => { play(zo, 'idle'); look(zo, null); look(tw, null); });
  at(74.3, () => look(tw, head(zo)));
  at(75.3, () => sfx('door'));
  at(75.9, () => { zoe.setPresent(false); });
  at(76.0, () => document.querySelector('#cine-title').classList.add('show'));
  at(78.0, () => look(tw, hv(-4.0, 1.2, -1.6)));
  at(80.6, () => document.querySelector('#cine-title').classList.remove('show'));
  at(81.5, () => look(tw, null));

  // footsteps on the boards while walking (house)
  let stepAcc = 0;
  track(72.0, 76.0, (k, tt, dt) => { stepAcc += (dt || 0) * 2.6; if (stepAcc > 1) { stepAcc = 0; sfx('step-wood'); } });

  function stopLoop(name) { for (const h of loops) if (h.name === name) h.stop(); }

  // ---------------------------------------------------------------- subtitles
  const who = (id) => t('n_' + id);
  const C = { zoe: '#ffb0d0', hero: '#8fc2ff', arthur: '#ffe070' };
  const subs = [
    { t: 45.4, d: 2.6, who: who('zoe'), color: C.zoe, text: t('op_zoe_1') },
    { t: 48.5, d: 2.1, who: who('hero'), color: C.hero, text: t('op_tw_1') },
    { t: 51.1, d: 1.9, who: who('zoe'), color: C.zoe, text: t('op_zoe_2') },
    { t: 55.0, d: 2.7, who: who('arthur'), color: C.arthur, text: t('op_ar_1') },
    { t: 62.2, d: 1.9, who: who('zoe'), color: C.zoe, text: t('op_zoe_3') },
    { t: 67.9, d: 1.9, who: who('hero'), color: C.hero, text: t('op_tw_2') },
    { t: 69.8, d: 2.0, who: who('zoe'), color: C.zoe, text: t('op_zoe_4') },
  ];

  // ---------------------------------------------------------------- prepare / finish
  const cine = new Cinematic(g, {
    length: OPENING_LENGTH,
    events: ev, tracks, shots, subs,
    music: { name: 'opening', at: MUSIC_AT },
    async prepare(c) {
      g.audio.setMood(null);                   // the title music fades out under the black
      g.exitRoom({ ...HP(-80, -4), a: 0 }, true, true);
      c.focus = harbourFocus;
      for (const a of [zoe, arthur]) a.controlled = true;
      // the hero is at home (out of sight while the camera is at the harbour)
      put(tw, twSpot.x, twSpot.z, 0, 'tinker');
      hold(TB.screwdriver, tw, [0, -0.05, 0.02], [-0.3, 0, Math.PI / 2]);
      put(zo, zoTray.x, zoTray.z, Math.PI, 'potting');
      put(ar, R.npcSpots.arthur.x, R.npcSpots.arthur.z, R.npcSpots.arthur.a, 'kneelWork');
      hold(BT.mast, ar, [0, -0.03, 0.01], [Math.PI, 0, 0]);
      zoe.setPresent(true);
      put(worker, -84.15 + HS.x, -3.2 + HS.z, -0.34, 'idle');
      put(passer, -73.8 + HS.x, -4.7 + HS.z, -Math.PI / 2, 'idle');
      L.pose(0); L.shake(0); W.boatSurge = 0;
      handle.rotation.y = 0; water(0);
      // compile every material the scene will show while the screen is still black
      const r = g.renderer.renderer;
      R.group.visible = true;
      try { await (r.compileAsync ? r.compileAsync(g.scene, g.camera) : r.compile(g.scene, g.camera)); } catch { /* the first frames compile instead */ }
      R.group.visible = false;
      // the cue decoded before the picture starts, so it can enter on time
      if (g.audio.ctx) await Promise.race([Promise.resolve(g.audio.music.ready).then(() => g.audio.music.load('opening')), new Promise((res) => setTimeout(res, 5000))]);
    },
    finish(skipped) {
      for (const h of loops) h.stop(skipped ? 0.2 : 0.8);
      for (const o of temps) o.parent?.remove(o);
      for (const a of cast) { a.rig.lookAt = null; a._speed = 0; a.rig.noFidget = false; }
      if (skipped) { g.audio.endCue(); }
      document.querySelector('#fade').classList.remove('quick');
      // the house as the player finds it
      if (g.room !== R) g.enterRoom('house', hx(1.55, -1.75), true, true);
      cine.focus = null;
      rest(TB.screwdriver, R.group, sdRest);
      rest(BT.mast, R.group, mastFitted);
      handle.rotation.y = 0; water(0); steam.forEach((s) => (s.visible = false));
      L.pose(1); L.shake(0); W.boatSurge = 0;
      for (const a of [zoe, arthur]) a.controlled = false;
      const end = hx(1.55, -1.75);
      put(tw, end.x, end.z, Math.atan2(-1, 0.25), 'idle');
      g.audio.setMood('home');
      story.cur.afterOpening();   // flags, the family's places, control, objective, save
    },
  });
  return cine;
}
