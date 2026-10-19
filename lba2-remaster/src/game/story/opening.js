// The opening (new game), about 88 s. What a player who never played LBA should take from it:
//   where   Citadel Island on the planet Twinsun, twelve years after Twinsen's last adventure (a caption)
//   what changed   the Joint Project (Twinsun + Zeelich) is unloading at the harbour and promises its heat to
//           every home ("Vesk promised"); its drill turns in FunFrock's old fortress and the ground hums
//   who     Twinsen (mending the lamp), his son Arthur ("Dad!"), his wife Zoé (the tap)
//   hook    the tap stops, then runs warm; the camera goes down the well: something under the island glows
//           in time with the hum
//   first   "I'll check the well." / Zoé: "Take your magic ball." → she goes next door (the game's door
//           transition: a dip to black, then outside), the title, control in the house, the objective
//           "Check the well" with the step "Take the magic ball from the cupboard"
//
// Built on src/engine/cinematic.js. Every action is an event or a track on one clock; finish() puts the world in
// its end state (the same whether the scene played out or was skipped) and hands control over.
// Times are in seconds. The music cue `opening` (tools/music/tracks/opening.py) is written to these sections:
// harbour 2.5–13, the lift 13–29, home 29–41, the tap 41–59, "That's warm." 59–66.5, the decision 66.5–76,
// the title 76–83.
import * as THREE from 'three';
import { Cinematic } from '../../engine/cinematic.js';
import { dampAngle } from '../../engine/math.js';
import { createCharacter } from '../characters.js';
import { glowSprite } from '../interiors.js';
import { MAT, Kit } from '../props.js';
import { t } from '../i18n.js';
import '../text/opening.js';
import { SHIFT } from '../island.js';

export const OPENING_LENGTH = 88.0;
export const MUSIC_AT = 2.5;          // the cue starts after a moment of sea sound

const V = (x, y, z) => new THREE.Vector3(x, y, z);
// the harbour's shots and walks are written in its design frame (island.js buildHarbour); HV/HP put them where it stands
const HS = SHIFT.harbour;
const HV = (x, y, z) => V(x + HS.x, y, z + HS.z);
const HP = (x, z) => ({ x: x + HS.x, z: z + HS.z });
const sm = (x) => { x = Math.min(1, Math.max(0, x)); return x * x * (3 - 2 * x); };

export function playOpening(story) {
  const g = story.game, W = g.world, R = g.rooms.house, H = g.hero, WR = g.rooms.well;
  const zoe = story.cur.npc('zoe'), arthur = story.cur.npc('arthur');
  const L = W.cargoLift, K = R.kitchen, TB = R.table, BT = R.boat;
  const hx = (x, z) => ({ x: R.center.x + x, z: R.center.z + z });   // house-local → world
  const hv = (x, y, z) => V(R.center.x + x, y, R.center.z + z);
  const wv = (x, y, z) => V(WR.center.x + x, y, WR.center.z + z);   // well-cave-local → world
  const harbourFocus = HV(-82, 1.8, -3);
  const bore = W.station.bore, boreY = g.physics.groundAt(bore.x, bore.z);
  const home = W.houses[0], nbr = W.houses.find((h) => h.id === 'nbr');
  const out = (hs, d) => ({ x: hs.door.x + Math.sin(hs.ry) * d, z: hs.door.z + Math.cos(hs.ry) * d });
  const homeOut = out(home, 1.4), nbrSpot = out(nbr, 1.1);   // (where the game's door puts you; where Zoé waits)

  // ---------------------------------------------------------------- cast
  const cast = [];
  const temps = [];                                   // scene-only objects, removed by finish()
  const loops = [];                                   // running sound loops, stopped by finish()
  const unseen = [];                                  // things hidden for a shot: [object, was visible, its shadow]
  const actor = (a) => { cast.push(a); a._speed = 0; a.rig.noFidget = true; return a; };
  const extra = (name) => {
    const rig = createCharacter(name);               // (the poly cast: assets/poly/<name>.json)
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
  // go into an everyday action already at its held pose: the joints still ease there from wherever they are (the rig's
  // damping), without the action's own wind-up from rest
  const from = (a, anim, at = 0.6) => { a.rig.play(anim); a.rig.actionT = at; };
  const look = (a, p) => { a.rig.lookAt = p; };
  const head = (a, h = 1.5) => V(a.pos.x, a.pos.y + h * (a.rig.root.scale.y || 1), a.pos.z);
  const loop = (name, opts) => { const h = g.audio.loop?.(name, opts); if (h) loops.push(h); return h; };
  const sfx = (name) => g.audio.play(name);
  const fade = (on, quick = true) => { const f = document.querySelector('#fade'); f.classList.toggle('quick', quick); f.classList.toggle('on', on); };

  const tw = actor(H), zo = actor(zoe), ar = actor(arthur);
  const worker = extra('worker'), resident = extra('farmerB');
  const wkSpot = HP(-84.35, -3.05), resSpot = HP(-83.3, -4.3), column = HP(-85.0, -2.75);
  const resSpot2 = HP(-82.3, -4.4);   // (where he stands after the drill's cutaway: clear of the crate in shot 4's view)

  // ---------------------------------------------------------------- props held in hands
  const hold = (obj, a, pos, rot, side = 'R') => { const hand = a.rig.j['arm' + side].hand; hand.add(obj); obj.position.set(...pos); obj.rotation.set(...rot); };
  const rest = (obj, parent, p, extraRot = [0, 0, 0]) => { parent.add(obj); obj.position.set(p.x, p.y, p.z); obj.rotation.set(extraRot[0], p.ry ?? 0, extraRot[2]); };
  const sdRest = { x: TB.sdRest.x, y: TB.sdRest.y, z: TB.sdRest.z, ry: TB.sdRest.ry };
  const mastFitted = { x: BT.mastRest.x, y: 0.085, z: BT.mastRest.z, ry: BT.mastRest.ry }; // (room-local)

  // ---------------------------------------------------------------- the tap
  const stream = K.stream;
  let flowWobble = 0;
  const steam = [0, 1, 2].map(() => { const s = glowSprite('#ffffff', 0.16, 0.0); s.visible = false; R.group.add(s); temps.push(s); return s; });
  let steamOn = 0, steamT = 0;
  const water = (k) => {
    stream.visible = k > 0.01;
    if (stream.visible) stream.scale.set(k, 1, k);
  };

  // ---------------------------------------------------------------- the house as a set
  // The game draws the house as an open set (the east and south walls cut away, no ceiling) for its own camera; the
  // scene's low cameras looked over the walls into the black around the room. For the scene the house gets a
  // ceiling and its east wall back (room-local, in the room's group: hidden with it outdoors); both fade out as the
  // handoff's camera rises into the game's view (83.6–84.0), and finish() removes them.
  const setMats = [];
  const flats = new THREE.Group(); flats.name = 'openingSet';
  {
    const own = (m) => { const c = m.clone(); setMats.push(c); return c; };
    const ceil = own(new THREE.MeshStandardMaterial({ color: '#4a3424', roughness: 0.95, side: THREE.DoubleSide }));
    const plaster = own(MAT.plaster('#f0e4c8')), low = own(MAT.wainscot('honey')), cap = own(MAT.wood('dark'));
    // (the Kit gives the textures their world-scale tiling, as the house's own walls have; house frame: x -13.5..4.5,
    // z -3.5..11.5, walls 3.0 high, 0.4 thick)
    const k = new Kit(flats); k.recolor = false;
    k.add(new THREE.BoxGeometry(18.8, 0.12, 15.8), ceil, -4.5, 3.06, 4.0);
    k.add(new THREE.BoxGeometry(0.4, 3.0, 15.4), plaster, 4.7, 1.5, 3.8);           // the east wall
    k.add(new THREE.BoxGeometry(0.03, 1.05, 15.0), low, 4.49, 0.525, 4.0);          // its panelling
    k.add(new THREE.BoxGeometry(0.07, 0.07, 15.0), cap, 4.47, 1.05, 4.0);           // and rail
    k.flush();
    flats.traverse((o) => { if (o.isMesh) o.castShadow = false; });
  }
  const setFade = (k) => {
    for (const m of setMats) { m.transparent = k < 1; m.opacity = k; m.depthWrite = k > 0.5; m.needsUpdate = true; }
    flats.visible = k > 0.01;
  };

  // ---------------------------------------------------------------- shots (world positions)
  const shot = (t0, t1, from, to, extra2 = {}) => ({ t0, t1, from, to, ...extra2 });
  const P = (pos, lk, fov = 40) => ({ pos, look: lk, fov });
  const twSpot = hx(-0.45, -0.25), zoTray = hx(-1.78, -2.6), zoSink = hx(-2.42, -2.55);   // (sink: 0.12 m west of the spout's line, her right hand's side; clear of the stove)
  const cupboard = hv(-4.1, 1.25, -1.6);
  const twEnd = hx(1.55, -1.75), twEndA = Math.atan2(-1, 0.25);
  // (indoors the house is an open set like LBA2's: the south and east walls are cut away for the game's camera,
  // so every shot in it looks north or west, and is pitched so the frame stays under the wall tops)
  const shots = [
    // 1 — Citadel Island from the air, then down over the water to the harbour (the caption: where, when)
    shot(0, 9.0, P(HV(-34, 26, 58), HV(-2, 6, -38), 50), P(HV(-50, 17, 38), HV(-30, 4, -42), 50)),
    shot(9.0, 13.0, P(HV(-50, 17, 38), HV(-30, 4, -42), 50), P(HV(-74.2, 5.6, 5.9), HV(-83.4, 2.0, -2.9), 44)),
    // 2 — the project's lift: the crate comes up off the barge; a resident asks the worker about the heat
    shot(13.0, 19.6, P(HV(-79.7, 3.3, -1.75), HV(-85.1, 2.25, -3.05), 44), P(HV(-79.9, 3.2, -1.85), HV(-85.1, 2.4, -3.1), 44)),
    // 3 — the hum: the drill turning in FunFrock's old fortress, up on the plateau, the town beyond
    shot(19.6, 23.8, P(V(bore.x + 22, boreY + 9, bore.z + 12), V(bore.x, boreY + 5, bore.z), 46), P(V(bore.x + 18, boreY + 7.6, bore.z + 10), V(bore.x, boreY + 5.6, bore.z), 46)),
    // 4 — back at the pier, a little above head height: the lantern settles; "Just the drill."; the crate is set
    // down. (The look point is on the people, 0.7 m over the deck (2.16): it was below the deck, which put their
    // heads at the top edge, cut.)
    // (from the ferry's side of the pier, so the worker answers toward us and his bend to the crate reads; from the
    // town's side the resident hid him)
    shot(23.8, 29.0, P(HV(-80.9, 3.85, 0.3), HV(-83.8, 2.8, -3.9), 44), P(HV(-81.1, 3.8, 0.1), HV(-83.8, 2.75, -4.0), 44)),
    // 5 — home: the whole family at their own things; over Arthur's shoulder: "Dad! The mast fits!"
    shot(29.0, 31.2, P(hv(4.35, 2.75, 4.35), hv(0.2, 0.6, -0.55), 44), P(hv(4.2, 2.68, 4.2), hv(0.15, 0.6, -0.58), 44)),
    // (Arthur's face: a three-quarter close-up as he shows the mast; then over his shoulder for his father's answer)
    shot(31.2, 33.1, P(hv(0.4, 1.22, 2.35), hv(2.0, 0.82, 2.05), 42), P(hv(0.45, 1.2, 2.33), hv(2.0, 0.82, 2.05), 42)),
    shot(33.1, 35.0, P(hv(3.4, 1.9, 3.0), hv(0.0, 0.8, -0.5), 42), P(hv(3.3, 1.88, 2.9), hv(0.0, 0.8, -0.5), 42)),
    // 6 — Zoé at the counter, then the tap
    shot(35.0, 41.0, P(hv(0.15, 1.8, -2.85), hv(-2.2, 1.55, -2.75), 46), P(hv(0.05, 1.8, -2.87), hv(-2.25, 1.55, -2.77), 46)),
    shot(41.0, 48.0, P(hv(-0.05, 1.8, -2.9), hv(-2.3, 1.5, -2.95), 44), P(hv(-0.2, 1.8, -2.92), hv(-2.3, 1.5, -2.95), 43)),
    // 7 — the exchange: Twinsen answers from the table; over his shoulder for hers
    // (from the west, so his face is seen as he turns round to her)
    shot(48.0, 50.8, P(hv(-2.9, 1.85, 1.5), hv(-1.05, 1.0, -1.6), 46), P(hv(-2.85, 1.83, 1.4), hv(-1.05, 1.0, -1.6), 46)),
    shot(50.8, 53.4, () => overShoulder(), null),
    // 8 — the house hums too: dust from the beams, all three look up; Arthur knows what it is
    // (from the bed's foot: all three in one frame as the dust falls and they look up; then Arthur's close-up for his
    // line, the same angle as his first)
    shot(53.4, 54.8, P(hv(-3.0, 2.3, 3.0), hv(0.3, 1.0, -0.6), 54), P(hv(-2.9, 2.27, 2.9), hv(0.3, 1.0, -0.6), 54)),
    shot(54.8, 58.0, P(hv(0.4, 1.22, 2.35), hv(2.0, 0.82, 2.05), 42), P(hv(0.47, 1.2, 2.32), hv(2.0, 0.82, 2.05), 42)),
    // 9 — the second try: a warm trickle, steam
    shot(58.0, 60.1, P(hv(-0.2, 1.8, -2.92), hv(-2.3, 1.5, -2.95), 43), P(hv(-0.3, 1.8, -2.93), hv(-2.3, 1.48, -2.95), 42)),
    shot(60.1, 62.4, P(hv(-1.35, 1.45, -3.0), hv(-2.3, 0.98, -3.18), 38), P(hv(-1.4, 1.43, -3.0), hv(-2.3, 0.98, -3.18), 35)),
    // 10 — where the warmth comes from: under the well, something in the rock glows with the hum
    shot(62.4, 66.5, P(wv(2.0, 8.0, 5.0), wv(6.5, 0.8, -4.5), 46), P(wv(3.5, 6.5, 2.5), wv(7.0, 0.9, -4.8), 44)),
    // 11 — the decision; Zoé goes out of the room toward the hall
    shot(66.5, 72.2, P(hv(-1.9, 2.05, 2.6), hv(-0.7, 1.05, -1.4), 46), P(hv(-1.8, 2.05, 2.7), hv(-0.45, 1.02, -1.15), 47)),
    // (then from the east wall: she comes toward us past him saying "Take your magic ball." — from the first camera
    // she passed behind him as she said it)
    shot(72.2, 75.2, () => goingOut(), null),
    // 12 — outside (the game's door transition): Zoé goes next door, past the house's new heat post; the title
    shot(75.2, 81.6, () => street(), null),
    // 13 — inside again: Twinsen turns to the cupboard (the ball); then into the game's own camera
    shot(81.6, 83.6, P(hv(3.3, 2.3, 0.3), V(twEnd.x - 1.6, 1.1, twEnd.z + 0.1), 46), P(hv(3.5, 2.6, 0.6), V(twEnd.x - 2.0, 1.05, twEnd.z + 0.1), 46)),
    shot(83.6, OPENING_LENGTH, null, 'game'),
  ];
  function overShoulder() {     // (behind Twinsen's shoulder, toward Zoé)
    const a = angleTo(tw, zo.pos), f = { x: Math.sin(a), z: Math.cos(a) }, r = { x: -Math.cos(a), z: Math.sin(a) };
    return P(V(tw.pos.x - f.x * 1.45 + r.x * 0.7, 1.95, tw.pos.z - f.z * 1.45 + r.z * 0.7), head(zo, 1.35), 40);
  }
  // ...and as she turns for the hall the camera eases back along the wall and pans with her, so she leaves the room
  // in frame, whole, instead of walking past the lens with her head cut
  function goingOut() {
    const k = sm((cine.t - 73.3) / 1.4);
    const pos = hv(3.6 + 0.3 * k, 1.95 + 0.1 * k, 0.4 + 0.55 * k);
    const lk = hv(-1.0, 1.1, -1.6).lerp(V(zo.pos.x, zo.pos.y + 1.1, zo.pos.z), 0.85 * k);
    return P(pos, lk, 46);
  }
  // in front of the house, from the lane's far side (north-east of the door, clear of the trees): she comes out by
  // the door, comes up the path toward us and turns along the lane past the neighbours' fence; the camera pans with
  // her, rising a little for the title, their red roof and green shutters ahead of her
  const stY = g.physics.groundAt(-44.4, 81.2);
  function street() {
    const k = sm((cine.t - 75.2) / 6.4);
    const pos = V(-44.6 + 0.7 * k, stY + 1.75 + 0.45 * k, 81.15 + 0.2 * k);
    const her = V(zo.pos.x, zo.pos.y + 1.15, zo.pos.z), door = V(home.door.x, stY + 1.3, home.door.z), ahead = V(nbr.door.x - 4.5, stY + 1.4, nbr.door.z + 2.6);
    const lk = door.lerp(her, sm((cine.t - 75.5) / 1.4)).lerp(ahead, 0.3 * sm((cine.t - 77.5) / 4.0));
    // (from the title on, she is kept right of centre and low: the title sits over the middle of the sky)
    lk.add(V(-0.8, 0.45, -1.05).multiplyScalar(sm((cine.t - 76.0) / 1.2)));
    return P(pos, lk, 46);
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
  // a turn on the spot with the feet stepping round (the gameplay turn: turnL / turnR), then `after`
  const pivot = (a, ang, t0, dur, after = 'idle') => {
    turn(a, ang, t0, dur);
    track(t0, t0 + dur, (k) => { if (k < 1) { const d = Math.atan2(Math.sin(ang - a.angle), Math.cos(ang - a.angle)); if (Math.abs(d) > 0.05) a.rig.play(d > 0 ? 'turnR' : 'turnL'); } else a.rig.play(after); });
  };

  // the lift's unload cycle on the clock
  const liftU = [[6.0, 0], [13.0, 0.16], [14.2, 0.22], [21.0, 0.45], [24.8, 0.7], [27.0, 0.88], [28.6, 1.0]];
  track(0, 29.0, (k, tt) => {
    let u = 0;
    for (let i = 1; i < liftU.length; i++) if (tt <= liftU[i][0]) { const [a0, u0] = liftU[i - 1], [a1, u1] = liftU[i]; u = u0 + (u1 - u0) * Math.min(1, Math.max(0, (tt - a0) / (a1 - a0))); break; } else u = liftU[i][1];
    L.pose(u);
    // the hum (18.6–25.0): the lantern and the hook tremble, the puddle ripples
    L.shake(Math.max(0, Math.sin(Math.min(1, Math.max(0, (tt - 18.6) / 6.4)) * Math.PI)) * 0.85);
    W.boatSurge = Math.sin(Math.min(1, Math.max(0, (tt - 1.0) / 4.0)) * Math.PI) * 0.32;
  });
  // the tap: stream thickness by time, with a sputter
  track(41.0, 72.0, (k, tt, dt) => {
    let f = 0;
    if (tt > 42.95 && tt < 43.6) f = 1;
    else if (tt >= 43.6 && tt < 43.95) f = Math.sin((tt - 43.6) * 40) > 0 ? 0.6 : 0;
    else if (tt > 59.2 && tt < 69.6) f = 0.5 + Math.sin(tt * 7) * 0.06;
    flowWobble += (dt || 0) * 30;
    water(f);
    if (f > 0) stream.scale.x = stream.scale.z = f * (1 + Math.sin(flowWobble) * 0.08);
    steamOn = tt > 59.6 && tt < 69.9 ? Math.min(1, (tt - 59.6) / 1.2) : Math.max(0, steamOn - (dt || 0));
    steamT += dt || 0;
    steam.forEach((s, i) => {
      const ph = (steamT * 0.45 + i / 3) % 1;
      s.visible = steamOn > 0.01;
      s.position.set(K.basin.x - R.center.x + Math.sin(ph * 6 + i) * 0.03, K.basin.y + 0.08 + ph * 0.35, K.basin.z - R.center.z + 0.02);
      s.material.opacity = steamOn * Math.sin(ph * Math.PI) * 0.38;
      s.scale.setScalar(0.1 + ph * 0.14);
    });
  });
  const handle = K.handle;
  track(41.4, 42.2, (k) => { handle.rotation.y = -1.4 * sm(k); });
  track(44.0, 44.6, (k) => { handle.rotation.y = -1.4 * (1 - sm(k)); });
  track(58.5, 59.1, (k) => { handle.rotation.y = -2.2 * sm(k); });
  track(69.2, 69.7, (k) => { handle.rotation.y = -2.2 * (1 - sm(k)); });
  // under the island: the vein brightens and fades with the hum
  track(83.6, 84.0, (k) => setFade(1 - k));
  track(62.4, 66.5, (k) => { WR.vein.power = Math.sin(k * Math.PI) * 0.9 + Math.max(0, Math.sin(k * Math.PI * 5)) * 0.25 * Math.sin(k * Math.PI); });

  // walks
  // the resident waits by the lift for his word with the worker, then goes on to the ferry
  // (the worker steps to the crate's side of the pier, by its west face, while the resident is still there; the
  // resident then turns away from him toward the ferry — their walks no longer meet: they passed within 0.39 m)
  walk(resident, [resSpot2, HP(-83.0, -5.0), HP(-84.4, -5.6)], 26.4, 1.2, 'idle', Math.PI);
  walk(worker, [wkSpot, HP(-84.2, -3.65)], 24.6, 1.0, 'idle', angleTo({ pos: HP(-84.2, -3.65) }, L.cratePierW));
  walk(zo, [zoTray, zoSink], 40.2, 0.9, 'idle', Math.PI);   // (done by 40.91, before her reach at 41.0)
  // Zoé out of the family room and down the hall to the front door (seen as far as the hall; the door is the cut)
  // (wide of the chair at the table's east end: the corner at hx(0.7, -1.4) took her through it)
  walk(zo, [zoSink, hx(1.15, -1.2), hx(1.25, 2.6), hx(1.2, 6.5)], 71.0, 1.45);
  // outside: from where the game's door puts you, round the neighbours' fenced yard (the pickets of
  // citadel-layout.js run x -41.8, z 70.9–78.5 and z ≈ 77.8, x -41..-37.3) and their house, to their door on the far
  // side. (A straight line went through the fence and the house.) Only the first 8.6 m are seen; finish() puts
  // her at the door.
  walk(zo, [homeOut, { x: -43.3, z: 77.5 }, { x: -42.2, z: 79.3 }, { x: -37.6, z: 79.4 }, { x: -36.4, z: 80.9 },
    { x: -33.0, z: 81.0 }, { x: -30.4, z: 79.6 }, { x: -28.6, z: 77.7 }, nbrSpot], 75.2, 1.35, 'idle');

  // turns
  // she turns to him as her line ends (he answers to her face, not her back) and listens with her arms at rest
  pivot(zo, angleTo({ pos: zoSink }, twSpot), 47.7, 0.6, 'listen');
  turn(zo, Math.PI, 57.6, 0.4);
  turn(tw, -0.9, 67.4, 0.5);    // (half toward her: "I'll check the well.")
  turn(zo, angleTo({ pos: zoSink }, twSpot), 69.85, 0.45);
  turn(tw, twEndA, 81.7, 0.7);   // to the cupboard, where the ball is

  // The scene's own pose layer: small offsets on top of the rig's actions where a hand must land on something (the
  // crate's top, the stream, the table). bend(actor, t0, t1, offsets) eases in over the first 0.3 s and out over the
  // last 0.3 s; offsets are joint rotations (torso/head/shoulder/elbow/knee, radians) and hips (metres, down < 0).
  // Each frame the last offsets are taken off before the rig updates and the new ones put on after, so the rig's
  // own damping never sees (or compounds) them.
  const bends = [];
  const bend = (a, t0, t1, o) => bends.push({ a, t0, t1, o });
  const JOINT = { torso: (j) => j.torso.rotation, head: (j) => j.head.rotation, shR: (j) => j.armR.sh.rotation, elR: (j) => j.armR.el.rotation,
    shL: (j) => j.armL.sh.rotation, elL: (j) => j.armL.el.rotation, kneeL: (j) => j.legL.knee.rotation, kneeR: (j) => j.legR.knee.rotation,
    hipL: (j) => j.legL.hip.rotation, hipR: (j) => j.legR.hip.rotation };
  const applyBend = (a, sign) => {
    const j = a.rig.j, o = a._bend;
    if (!o) return;
    for (const [key, v] of Object.entries(o)) {
      if (key === 'hips') { j.hips.position.y += sign * v; continue; }
      const r = JOINT[key](j); r.x += sign * (v[0] || 0); r.y += sign * (v[1] || 0); r.z += sign * (v[2] || 0);
    }
  };
  // everyone's rig, every frame (after the moves above)
  track(0, OPENING_LENGTH, (k, tt, dt) => {
    for (const a of cast) {
      applyBend(a, -1); a._bend = null;
      if (dt > 0) a.rig.update(dt, a._speed || 0);
      for (const b of bends) {
        if (b.a !== a || tt < b.t0 || tt > b.t1) continue;
        const w = sm((tt - b.t0) / 0.3) * sm((b.t1 - tt) / 0.3), o = a._bend ??= {};
        for (const [key, v] of Object.entries(b.o)) {
          if (key === 'hips') o.hips = (o.hips || 0) + v * w;
          else { const c = o[key] ??= [0, 0, 0]; v.forEach((x, i) => (c[i] += x * w)); }
        }
      }
      applyBend(a, 1);
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
  at(14.2, () => { loop('motor'); play(worker, 'reach'); look(resident, head(worker)); });   // (a hand on the lift's control)
  at(16.85, () => { play(worker, 'idle'); look(worker, head(resident)); });
  turn(worker, Math.atan2(resSpot.x - wkSpot.x, resSpot.z - wkSpot.z) - 0.35, 16.85, 0.5);
  turn(worker, angleTo({ pos: wkSpot }, column), 19.7, 0.3);
  at(20.0, () => play(worker, 'reach'));
  turn(worker, Math.atan2(resSpot.x - wkSpot.x, resSpot.z - wkSpot.z) - 0.35, 23.3, 0.3);
  at(23.3, () => play(worker, 'idle'));
  // the hum: at the pier, then the drill, then the pier again
  at(18.6, () => { sfx('hum'); look(worker, L.puddle.getWorldPosition(new THREE.Vector3())); });
  at(19.2, () => sfx('rattle'));
  at(19.55, () => { cine.focus = V(bore.x, boreY, bore.z); W.station.setActive(true); });
  at(20.8, () => sfx('hum'));
  at(23.75, () => { W.station.setActive(stationWas); cine.focus = harbourFocus; put(resident, resSpot2.x, resSpot2.z, Math.atan2(wkSpot.x - resSpot2.x, wkSpot.z - resSpot2.z)); });
  at(22.6, () => { look(worker, null); });
  at(23.9, () => { look(resident, head(worker)); look(worker, head(resident)); });
  // the worker answers over his shoulder, then bends to the crate and frees the hook (his hand on the crate's
  // top as it settles: the thump), straightens and watches the hook go up
  at(26.4, () => { look(worker, L.crate.getWorldPosition(new THREE.Vector3()).setY(L.cratePierW.y + 0.3)); look(resident, null); });
  at(26.6, () => play(worker, 'setDown'));
  bend(worker, 26.75, 27.55, { torso: [0.34], kneeL: [0.12], kneeR: [0.12], hipL: [-0.06], hipR: [-0.06], shR: [-0.2] });   // (down to the crate's top, 0.82 m: setDown is for a table)
  at(27.0, () => { sfx('thump'); });
  at(27.9, () => look(worker, L.crate.getWorldPosition(new THREE.Vector3()).setY(L.cratePierW.y + 2.4)));
  at(28.6, () => { stopLoop('motor'); stopLoop('winch'); look(worker, null); });
  // to the house: a short dip to black
  at(28.62, () => fade(true));
  at(29.0, () => {
    stopLoop('lap');
    g.enterRoom('house', twSpot, true, true);
    cine.focus = null;
    put(tw, twSpot.x, twSpot.z, 0, 'tinker');
    loop('room');
    setTimeout(() => fade(false), 40);
  });
  // "Dad! The mast fits!" / "Told you. Now the sail."
  at(31.15, () => { play(ar, 'kneelShow'); look(ar, head(tw)); });
  at(31.6, () => { play(tw, 'idle'); look(tw, head(ar, 0.9)); });
  at(33.1, () => tw.rig.doGesture('nod'));
  at(35.2, () => { play(tw, 'tinker'); look(tw, null); });
  at(35.0, () => { play(ar, 'kneelWork'); look(ar, null); });
  at(36.2, () => { rest(BT.mast, R.group, mastFitted); sfx('tick'); });
  at(39.5, () => play(zo, 'wipe'));
  // the tap
  at(41.0, () => play(zo, 'reach'));
  at(41.35, () => from(zo, 'tapTurn', 0.4));   // (from: the hand stays on the handle as the twist starts)
  at(41.5, () => sfx('tapSqueak'));
  at(42.3, () => sfx('pipeKnock'));
  at(42.65, () => sfx('pipeKnock'));
  at(42.95, () => { sfx('waterRun'); g.particles.burst(K.basin.x, K.basin.y + 0.05, K.basin.z, '#cfe8ff', 6, 0.8); });
  at(43.65, () => sfx('gurgle'));
  at(44.0, () => from(zo, 'reach', 0.4));
  at(44.6, () => { play(zo, 'idle'); look(zo, V(K.spout.x, K.spout.y, K.spout.z)); });
  at(45.2, () => look(zo, head(tw)));
  pivot(zo, angleTo({ pos: zoSink }, twSpot), 44.75, 0.6, 'listen');   // (she turns from the tap to call him: he is behind her)
  // he turns round from the lamp to answer her (she is behind him: a look alone stopped at his shoulder, facing
  // the lens), and back to Arthur when Arthur speaks
  at(46.2, () => { play(tw, 'idle'); look(tw, head(zo)); });
  pivot(tw, -1.95, 46.35, 0.75);
  pivot(tw, 0.35, 54.9, 0.8);
  at(53.0, () => tw.rig.doGesture('shrug'));
  bend(zo, 45.0, 58.0, { shL: [0, 0, -0.22], shR: [0, 0, 0.22] });
  // her hand on the tap's handle (reach / tapTurn lift the arm straight ahead of the shoulder, beside the tap)
  const TAPHAND = { shR: [-0.12, 0, 0.55], elR: [0.25], torso: [0.14] };
  bend(zo, 41.0, 44.7, TAPHAND); bend(zo, 58.0, 60.15, TAPHAND); bend(zo, 69.0, 70.35, TAPHAND);   // (her listening arms at rest: the idle's stand off her sides, NEEDS-MODEL #28)
  // the house hums: dust from the beams, everybody looks up; Arthur knows what it is
  at(53.6, () => { sfx('hum'); sfx('rattle'); for (const [x, z] of [[-0.5, 0.5], [1.5, -1.0], [-2.0, -2.0]]) { const p = hx(x, z); g.particles.burst(p.x, 2.85, p.z, '#d8c8a8', 5, 0.4); } });
  at(53.8, () => { look(tw, hv(-0.4, 3.0, 0.2)); look(zo, hv(-1.6, 3.0, -2.0)); play(ar, 'kneelLook'); look(ar, hv(2.0, 3.0, 1.6)); });
  at(54.8, () => { look(ar, head(tw)); look(tw, head(ar, 0.9)); look(zo, head(ar, 0.9)); });
  at(57.6, () => { look(zo, null); });
  at(58.0, () => { play(zo, 'reach'); look(tw, head(zo)); play(ar, 'kneelWork'); look(ar, null); });
  at(58.5, () => from(zo, 'tapTurn', 0.4));
  at(58.6, () => sfx('tapSqueak'));
  at(59.0, () => sfx('gurgle'));
  at(59.2, () => loop('trickle'));
  // (her hand stays at the tap while she looks at the water, then goes straight from the tap to the stream: dropping
  // to the idle between swept it through the basin and the watering can; `from` skips touchWater's ease-in from
  // the arms-down pose, so the hand travels tap → stream instead of dipping to her side and back)
  at(59.4, () => look(zo, V(K.spout.x, K.spout.y - 0.1, K.spout.z)));
  at(60.0, () => from(zo, 'touchWater'));
  // her fingers into the stream under the spout (touchWater holds the hand at chest height, 0.44 m to her right)
  bend(zo, 60.0, 66.3, { shR: [0.0, 0, 0.6], elR: [0.45], torso: [0.22], head: [0.05] });
  // down the well (a dip, the cave, a dip back)
  at(62.05, () => fade(true));
  at(62.4, () => {
    g.enterRoom('well', null, true, true);
    g.hero.pos.set(twSpot.x, 0, twSpot.z);     // (the hero stays at home; the room change moved him)
    // the cave's crystal mites stand still while nothing runs them: out of the picture until the prologue
    for (const e of g.enemies || []) if (e.rig?.root && Math.abs(e.pos.x - WR.center.x) < 40) { unseen.push([e, e.rig.root.visible, e.shadow?.visible]); e.rig.root.visible = false; if (e.shadow) e.shadow.visible = false; }
    sfx('hum'); setTimeout(() => fade(false), 40);
  });
  at(63.9, () => sfx('hum'));
  at(66.1, () => fade(true));
  at(66.5, () => {
    reveal();
    WR.vein.power = 0;
    g.enterRoom('house', twSpot, true, true);
    put(tw, twSpot.x, twSpot.z, 0, 'idle');    // (turned to the table, to put the screwdriver down)
    play(zo, 'idle'); look(zo, head(tw));
    setTimeout(() => fade(false), 40);
  });
  // the decision
  at(66.65, () => play(tw, 'setDown'));
  at(67.1, () => { rest(TB.screwdriver, R.group, { x: sdRest.x, y: sdRest.y, z: sdRest.z, ry: sdRest.ry }); sfx('put'); });
  at(69.0, () => { play(zo, 'reach'); look(zo, null); });
  at(69.3, () => from(zo, 'tapTurn', 0.4));
  at(69.5, () => { stopLoop('trickle'); sfx('tapSqueak'); });
  at(70.3, () => { play(zo, 'wipe'); look(zo, head(tw)); });
  at(71.3, () => { play(zo, 'idle'); });
  at(72.4, () => look(zo, head(tw)));     // (over her shoulder, walking: "Take your magic ball.")
  at(74.3, () => { look(zo, null); look(tw, head(zo)); });
  // the front door: the game's door transition (a dip to black, the door, and she is outside)
  at(74.85, () => fade(true));
  at(75.2, () => {
    sfx('door');
    stopLoop('room');
    g.exitRoom({ ...homeOut, a: home.ry }, true, true);
    cine.focus = V(homeOut.x, 0, homeOut.z);
    // (the hero waits inside, out of sight; the exit moved him to the door)
    put(tw, twEnd.x, twEnd.z, twEndA + 0.6, 'idle'); look(tw, null);
    loop('lap', { quiet: true });
    setTimeout(() => fade(false), 60);
  });
  at(76.4, () => document.querySelector('#cine-title').classList.add('show'));
  at(81.0, () => document.querySelector('#cine-title').classList.remove('show'));
  at(81.25, () => fade(true));
  at(81.6, () => {
    stopLoop('lap');
    g.enterRoom('house', twEnd, true, true);
    zoe.setPresent(false);            // (she is at the neighbours' door; finish() places her there)
    cine.focus = null;
    put(tw, twEnd.x, twEnd.z, twEndA + 0.6, 'idle');
    loop('room');
    setTimeout(() => fade(false), 40);
  });
  at(82.0, () => look(tw, cupboard));

  // footsteps while walking: on the boards (house), on the lane (outside)
  const steps = (t0, t1, kind, rate = 2.6) => { let acc = 0; track(t0, t1, (k, tt, dt) => { acc += (dt || 0) * rate; if (acc > 1) { acc = 0; sfx(kind); } }); };
  steps(71.5, 75.0, 'step-wood');
  steps(75.4, 81.2, 'step-stone', 2.4);

  function reveal() { for (const [e, v, sv] of unseen.splice(0)) { e.rig.root.visible = v; if (e.shadow && sv != null) e.shadow.visible = sv; } }
  function stopLoop(name) { for (const h of loops) if (h.name === name) h.stop(); }

  // ---------------------------------------------------------------- lines (each speaker babbles in their own voice)
  const C = { zoe: '#ffb0d0', hero: '#8fc2ff', arthur: '#ffe070', worker: '#9fe0d8', resident: '#e8d8a0' };
  const subs = [];
  // say(at, speaker, text key, seconds, the actor who talks; talk: play the talk gestures)
  // talk: true plays the rig's talk with a gesture of its choosing; a number picks the gesture (rig.js: 0 the right
  // hand forward, 1 both hands, 2 a hand raised, 3 the left hand presenting, 4 hands together)
  const say = (tt, id, key, d, a = null, talk = true) => {
    subs.push({ t: tt, d, who: t('n_' + id), color: C[id], text: t(key), voice: 'n_' + id });
    if (a && talk !== false) { at(tt, () => { play(a, 'talk'); if (typeof talk === 'number') a.rig.gesture = talk; }); at(tt + d - 0.15, () => { if (a.rig.anim === 'talk') play(a, 'idle'); }); }
  };
  say(14.6, 'resident', 'op_res_1', 2.3, resident);
  say(16.95, 'worker', 'op_wk_1', 2.6, worker, false);   // (ends with the cut to the drill at 19.6, not over it)
  say(24.0, 'resident', 'op_res_2', 1.7, resident);
  say(25.8, 'worker', 'op_wk_2', 2.4, worker, false);
  say(31.3, 'arthur', 'op_ar_1', 1.8, ar, false);
  say(33.2, 'hero', 'op_tw_0', 1.9, tw);
  say(45.4, 'zoe', 'op_zoe_1', 2.5, zo, false);   // (called across the room, no arm waving: the talk gesture swung her arm out over the stove)
  say(48.3, 'hero', 'op_tw_1', 2.0, tw);
  say(51.0, 'zoe', 'op_zoe_2', 1.8, zo);
  say(54.8, 'arthur', 'op_ar_2', 3.8, ar, false);   // (70 characters: 18 a second, readable; it runs on over the cut to the tap)
  say(60.6, 'zoe', 'op_zoe_3', 1.8, zo, false);
  say(67.9, 'hero', 'op_tw_2', 1.7, tw);
  say(69.6, 'zoe', 'op_zoe_4', 1.7, zo, false);
  say(72.4, 'zoe', 'op_zoe_5', 2.4, zo, false);

  // where and when: two captions over the island
  const caps = [{ t: 1.6, d: 7.0, text: t('op_cap_place'), sub: t('op_cap_time') }];

  // ---------------------------------------------------------------- prepare / finish
  let stationWas = false;
  const cine = new Cinematic(g, {
    length: OPENING_LENGTH,
    events: ev, tracks, shots, subs, caps,
    music: { name: 'opening', at: MUSIC_AT },
    async prepare(c) {
      g.audio.setMood(null);                   // the title music fades out under the black
      g.exitRoom({ ...HP(-80, -4), a: 0 }, true, true);
      c.focus = harbourFocus;
      stationWas = !!W.station.active;
      for (const a of [zoe, arthur]) a.controlled = true;
      // the hero is at home (out of sight while the camera is at the harbour)
      put(tw, twSpot.x, twSpot.z, 0, 'tinker');
      hold(TB.screwdriver, tw, [0, -0.05, 0.02], [-0.3, 0, Math.PI / 2]);
      put(zo, zoTray.x, zoTray.z, Math.PI, 'potting');
      put(ar, R.npcSpots.arthur.x, R.npcSpots.arthur.z, R.npcSpots.arthur.a, 'kneelWork');
      hold(BT.mast, ar, [0, -0.03, 0.01], [Math.PI, 0, 0]);
      zoe.setPresent(true);
      R.group.add(flats); temps.push(flats); setFade(1);
      put(worker, wkSpot.x, wkSpot.z, angleTo({ pos: wkSpot }, column), 'idle');
      put(resident, resSpot.x, resSpot.z, Math.atan2(wkSpot.x - resSpot.x, wkSpot.z - resSpot.z), 'idle');
      L.pose(0); L.shake(0); W.boatSurge = 0; WR.vein.power = 0;
      handle.rotation.y = 0; water(0);
      // compile every material the scene will show while the screen is still black
      const r = g.renderer.renderer;
      R.group.visible = true; WR.group.visible = true;
      try { await (r.compileAsync ? r.compileAsync(g.scene, g.camera) : r.compile(g.scene, g.camera)); } catch { /* the first frames compile instead */ }
      R.group.visible = false; WR.group.visible = false;
      // the cue decoded before the picture starts, so it can enter on time
      if (g.audio.ctx) await Promise.race([Promise.resolve(g.audio.music.ready).then(() => g.audio.music.load('opening')), new Promise((res) => setTimeout(res, 5000))]);
    },
    finish(skipped) {
      for (const h of loops) h.stop(skipped ? 0.2 : 0.8);
      for (const o of temps) o.parent?.remove(o);
      flats.traverse((o) => o.geometry?.dispose()); for (const m of setMats) m.dispose();
      for (const a of cast) { a.rig.lookAt = null; a._speed = 0; a.rig.noFidget = false; }
      if (skipped) { g.audio.endCue(); }
      document.querySelector('#fade').classList.remove('quick');
      document.querySelector('#cine-title').classList.remove('show');
      // the house as the player finds it
      if (g.room !== R) g.enterRoom('house', twEnd, true, true);
      cine.focus = null;
      rest(TB.screwdriver, R.group, sdRest);
      rest(BT.mast, R.group, mastFitted);
      handle.rotation.y = 0; water(0); steam.forEach((s) => (s.visible = false));
      L.pose(1); L.shake(0); W.boatSurge = 0; WR.vein.power = 0;
      W.station.setActive(stationWas);
      reveal();
      for (const a of [zoe, arthur]) a.controlled = false;
      put(tw, twEnd.x, twEnd.z, twEndA, 'idle');
      story.cur.afterOpening();   // flags, the family's places, control, objective (with the ball step), save
    },
  });
  cine.extras = { worker, resident };   // (the scene-only cast, for the tests' per-frame checks)
  return cine;
}
