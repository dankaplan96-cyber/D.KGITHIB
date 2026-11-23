// The opening (new game), 88 s (the notebook cut, LBA3-RUN, switchable: 88.8 s). What a player who never played LBA should
// take from it:
//   (notebook cut) the history first, over Twinsen's own sketchbook: FunFrock ruled Twinsun with clones and teleporters;
//           Twinsen stood up to him; later lightning struck the Dino-Fly, and on Zeelich he brought the stolen children
//           home. Then his face over the book: where and when (a caption); the last page's drawing becomes the island
//   where   Citadel Island on the planet Twinsun, twelve years after Twinsen's last adventure (a caption; the classic
//           cut adds Sendell, FunFrock and his clones in a second)
//   what changed   the Joint Project (Twinsun + Zeelich) is unloading at the harbour and promises its heat to
//           every home ("Vesk promised"); its drill turns in FunFrock's old fortress and the ground hums
//   who     Twinsen (mending the lamp), his son Arthur ("Dad!"), his wife Zoé (the tap)
//   hook    the tap stops, then runs warm; the camera goes down the well: something under the island glows
//           in time with the hum
//   first   "I'll check the well." / Zoé: "Take your magic ball." → she goes next door (the game's door transition: a
//           dip to black, then outside, the title; the notebook cut hears the door from inside), control in the house,
//           the objective "Check the well" with the step "Take the magic ball from the cupboard"
//
// Built on src/engine/cinematic.js. Every action is an event or a track on one clock; finish() puts the world in
// its end state (the same whether the scene played out or was skipped) and hands control over.
// Times are in seconds. The music cue `opening` (tools/music/tracks/opening.py) is written to these sections:
// harbour 2.5–13, the lift 13–29, home 29–41, the tap 41–59, "That's warm." 59–66.5, the decision 66.5–76,
// the title 76–83. The notebook cut's cue `opening_nb` (tools/music/tracks/opening_nb.py), on its scene clock: the notebook
// 0.6–17.6, the title over the island 17.6–22.6, then the same sections 9.6 s later to the decision's end (85.6), the tail.
import * as THREE from 'three';
import { Cinematic, voiceSeconds } from '../../engine/cinematic.js';
import { angleDiff, damp, dampAngle } from '../../engine/math.js';
import { solveHand, keepJoint, restoreJoints } from '../../engine/handik.js';
import { createCharacter } from '../characters.js';
import { glowSprite } from '../interiors.js';
import { MAT, Kit } from '../props.js';
import { t } from '../i18n.js';
import '../text/opening.js';
import { SHIFT, pierW, pierAng } from '../island.js';

// LBA3-RUN: two cuts of the film. `classic` (the default, the film as it was, 88 s) and `notebook` (for the user to choose,
// ?opening=notebook or localStorage lba3_opening = 'notebook'): it opens on Twinsen's sketchbook, 0–NB_END s of the
// scene's clock: the history in four captions over its pages (LBA1: FunFrock's clones and teleporters, Twinsen stands up to
// him; LBA2: the storm and the Dino-Fly, the stolen children brought home from Zeelich), his face over the book twelve years
// on (where and when), and the island's drawing turning into the real island: the aerial picks up at its old 8 s, with the
// title over it. Its outside shot (old 75.2–81.6: Zoé next door, the title) is cut: the door is heard from inside; 88.8 s.
// Everything after the notebook is written below on the classic film's own clock ("old" seconds); newOf / oldOf convert
// (in the classic cut they change nothing).
export const openingCut = () => {
  try { return (new URLSearchParams(location.search).get('opening') || localStorage.getItem('lba3_opening')) === 'notebook' ? 'notebook' : 'classic'; } catch { return 'classic'; }
};
export function cutClock(cut) {
  if (cut !== 'notebook') {
    const id = (o) => o;
    return { cut: 'classic', NB: 0, D2: 0, NB_END: 0, OLD_END: 88.0, LENGTH: 88.0, MUSIC_AT: 2.5, MUSIC: 'opening', newOf: id, oldOf: id, newEnd: id };
  }
  const NB = 9.6, CUT0 = 75.2, CUT1 = 81.6, D2 = NB - (CUT1 - CUT0), OLD_END = 85.6;   // (scene time = old + NB up to the cut)
  return {
    cut: 'notebook', NB, D2, NB_END: 8.0 + NB, OLD_END, LENGTH: OLD_END + D2, MUSIC_AT: 0.6, MUSIC: 'opening_nb',   // (NB_END: the drawing turns into the island)
    newOf: (o) => (o < CUT0 ? o + NB : o >= CUT1 ? o + D2 : null),
    oldOf: (n) => (n < CUT0 + NB ? n - NB : n - D2),
    newEnd: (o) => (o <= CUT0 ? o + NB : o < CUT1 ? CUT0 + NB : o + D2),
  };
}

const V = (x, y, z) => new THREE.Vector3(x, y, z);
// the harbour's shots and walks are written in its design frame (island.js buildHarbour); HV/HP put them where it stands
const HS = SHIFT.harbour;
const HV = (x, y, z) => V(x + HS.x, y, z + HS.z);
const HP = (x, z) => ({ x: x + HS.x, z: z + HS.z });
// CITADEL-ORIG-2: the lift, the barge and the pier's end stand on the stone L's leg now, turned a quarter about its elbow
// (island.js PIER_L): the shots, spots and walks round them are written in the old design frame and turned with them
const PV = (x, y, z) => { const q = pierW(x, z); return V(q.x, y, q.z); };
const PP = (x, z) => pierW(x, z);
const sm = (x) => { x = Math.min(1, Math.max(0, x)); return x * x * (3 - 2 * x); };

export function playOpening(story, cut = openingCut()) {
  const CK = cutClock(cut), NBCUT = CK.cut === 'notebook';
  const { NB, NB_END, OLD_END, MUSIC_AT, newOf, oldOf, newEnd } = CK, OPENING_LENGTH = CK.LENGTH;
  const g = story.game, W = g.world, R = g.rooms.house, H = g.hero, WR = g.rooms.well;
  const zoe = story.cur.npc('zoe'), arthur = story.cur.npc('arthur');
  const xil = g.npcs.find((n) => n.def.id === 'xil');   // (on the pier behind the lift: he listens in)
  const L = W.cargoLift, K = R.kitchen, TB = R.table, BT = R.boat;
  const hx = (x, z) => ({ x: R.center.x + x, z: R.center.z + z });   // house-local → world
  const hv = (x, y, z) => V(R.center.x + x, y, R.center.z + z);
  const wv = (x, y, z) => V(WR.center.x + x, y, WR.center.z + z);   // well-cave-local → world
  const harbourFocus = PV(-82, 1.8, -3);
  // (the user, 5.11: "in the opening film Vesk's ship is already in the harbour, it isn't logical": the project's
  //  ferry brings him in chapter 2 — chapter1.js startArrival — so it is not at the pier in the opening; the barge
  //  and the lift are being unloaded)
  W.ferry?.setVisible?.(false);
  const bore = W.station.bore, boreY = g.physics.groundAt(bore.x, bore.z);
  const home = W.houses[0], nbr = W.houses.find((h) => h.id === 'nbr');
  const out = (hs, d) => ({ x: hs.door.x + Math.sin(hs.ry) * d, z: hs.door.z + Math.cos(hs.ry) * d });
  const homeOut = out(home, 1.4), nbrSpot = out(nbr, 1.1);   // (where the game's door puts you; where Zoé waits)

  // ---------------------------------------------------------------- cast
  const cast = [];
  const temps = [];                                   // scene-only objects, removed by finish()
  const loops = [];                                   // running sound loops, stopped by finish()
  const unseen = [];                                  // things hidden for a shot: [object, was visible, its shadow]
  // (ANIM-POLISH-3: the scene places its people's feet itself — its own planted steps and pose layers on the legs — so the rig's
  // own foot planting (plantLite) is off for the scene, and back on after it: finish)
  // (NO-AIR: nor the rig's own hand-on-the-thing layer, workhands.js: the scene's grips put every hand)
  const actor = (a) => { cast.push(a); a._speed = 0; a.rig.noFidget = true; a._plantLite = a.rig.plantLite; a.rig.plantLite = false; a._contact = a.rig.contact; a.rig.contact = null; return a; };
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
  // (OPEN-FILM: the eyes blink as the gaze moves on to something else, as people's do; the rig's own random blink keeps
  // going in between)
  const look = (a, p) => {
    const was = a.rig.lookAt, moved = !was !== !p || (was && p && was.distanceTo(p) > 0.4);
    if (moved && a.rig.blinkT > 0.6) a.rig.blinkT = 0.11;
    a.rig.lookAt = p;
  };
  const head = (a, h = 1.5) => V(a.pos.x, a.pos.y + h * (a.rig.root.scale.y || 1), a.pos.z);
  // (ARTHUR-12) where a kneeling Arthur's eyes are, from his head bone when the look is given: at twelve his head is
  // well above the small boy's (a fixed 0.9 × his scale had his father look at his chest)
  const eyesOf = (a) => a.rig.j.head.getWorldPosition(V(0, 0, 0)).add(V(0, 0.18 * (a.rig.root.scale.y || 1), 0));
  const loop = (name, opts) => { const h = g.audio.loop?.(name, opts); if (h) loops.push(h); return h; };
  const sfx = (name) => g.audio.play(name);
  const fade = (on, quick = true) => { const f = document.querySelector('#fade'); f.classList.toggle('quick', quick); f.classList.toggle('on', on); };

  const tw = actor(H), zo = actor(zoe), ar = actor(arthur);
  const worker = extra('worker'), resident = extra('farmerB');
  // (the worker stands a step off the lift column's base: at (-84.35, -3.05) his body was in it)
  const wkSpot = PP(-84.25, -3.1), resSpot = PP(-83.3, -4.3), column = PP(-85.0, -2.75);
  const crSpot = PP(-84.12, -3.66);   // (where the worker meets the crate: an arm's length from its near edge)
  const resSpot2 = PP(-82.3, -4.4);   // (where he stands after the drill's cutaway: clear of the crate in shot 4's view)

  // ---------------------------------------------------------------- props held in hands
  const hold = (obj, a, pos, rot, side = 'R') => { const hand = a.rig.j['arm' + side].hand; hand.add(obj); obj.position.set(...pos); obj.rotation.set(...rot); };
  const rest = (obj, parent, p, extraRot = [0, 0, 0]) => { parent.add(obj); obj.position.set(p.x, p.y, p.z); obj.rotation.set(extraRot[0], p.ry ?? 0, extraRot[2]); obj.scale.setScalar(1); };
  // where he lays the screwdriver down: under his right hand at the bottom of setDown (measured), on the table's near
  // edge by the fruit bowl — the room's own rest spot is 0.75 m from his hand, so it jumped there when let go
  // (NO-AIR: that spot, with the tool lying across him, was at his arm's end: the hand stopped 5 cm over it and the tool
  //  dropped the rest. It lies by the table's near edge now, pointing away from him, as a hand lays a tool down: the
  //  handle under his wrist at the bottom of the move — the grip `toolDown` below)
  const sdRest = { x: TB.sdRest.x - 0.6, y: TB.sdRest.y, z: TB.sdRest.z - 0.09, ry: Math.PI / 2 + 0.25 };
  const mastFitted = { x: BT.mastRest.x, y: BT.mastRest.y + 0.005, z: BT.mastRest.z, ry: BT.mastRest.ry }; // (room-local; the boat stands on Arthur's building crate)

  // ---------------------------------------------------------------- the tap
  const stream = K.stream;
  let flowWobble = 0;
  const steam = [0, 1, 2].map(() => { const s = glowSprite('#ffffff', 0.16, 0.0); s.visible = false; R.group.add(s); temps.push(s); return s; });
  let steamOn = 0, steamT = 0;
  const water = (k) => {
    stream.visible = k > 0.01;
    if (stream.visible) stream.scale.set(k, 1, k);
  };
  // where Zoé's hand goes (R5, the grips below): on the cross handle, palm down, the fingers over it toward the wall,
  // turning with the handle (0.7 of its turn: the wrist and forearm take the rest); and palm up under the spout, the
  // water landing on it (just over the watering can's handle, 1.02)
  const STREAM_PALM_Y = 1.075;
  const tapAt = () => K.handle.getWorldPosition(V(0, 0, 0));
  const fromShoulder = (p) => { const s = zo.rig.j.armR.sh.getWorldPosition(V(0, 0, 0)); return V(p.x - s.x, 0, p.z - s.z).normalize(); };
  const onTap = (liftAt) => (tt) => {
    const h = tapAt(), d = fromShoulder(h).applyAxisAngle(V(0, 1, 0), 0.7 * K.handle.rotation.y);
    const palm = h.clone().add(V(0, 0.03, 0)).addScaledVector(d, -0.01);
    if (liftAt != null) palm.y += 0.05 * sm((tt - liftAt) / 0.35);   // (letting go: the hand comes up off it)
    return { palm, fingers: d.clone().add(V(0, -0.35, 0)), normal: V(0, -1, 0) };
  };
  const inStream = () => {
    const p = V(K.spout.x, STREAM_PALM_Y, K.spout.z);
    return { palm: p, fingers: fromShoulder(p).add(V(0, -0.1, 0)), normal: V(0, 1, 0) };
  };

  // ---------------------------------------------------------------- the house as a set
  // The game draws the house as an open set (the east and south walls cut away, no ceiling) for its own camera; the
  // scene's low cameras looked over the walls into the black around the room. For the scene the house gets a
  // ceiling and its east wall back (room-local, in the room's group: hidden with it outdoors); both fade out as the
  // handoff's camera rises into the game's view (83.6–84.0), and finish() removes them.
  const setMats = [];
  const flats = new THREE.Group(); flats.name = 'openingSet';
  const caveFlat = new THREE.Group(); caveFlat.name = 'openingSetCave';
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
    // the well's cave gets its east wall too (the vein's chamber is at that end: x 4.5..10.5, walls 4 m, 0.5 thick)
    const kc = new Kit(caveFlat); kc.recolor = false;
    kc.add(new THREE.BoxGeometry(0.5, 4.0, 14.5), own(MAT.stone('slate', 2)), 10.75, 2.0, 0);
    kc.flush();
    caveFlat.traverse((o) => { if (o.isMesh) o.castShadow = false; });
  }
  const setFade = (k) => {
    for (const m of setMats) { m.transparent = k < 1; m.opacity = k; m.depthWrite = k > 0.5; m.needsUpdate = true; }
    flats.visible = k > 0.01;
  };

  // ---------------------------------------------------------------- shots (world positions)
  // (written on the old clock: a shot that starts in the cut is gone)
  const shot = (t0, t1, from, to, extra2 = {}) => (newOf(t0) == null ? null : { t0: newOf(t0), t1: newEnd(t1), from, to, ...extra2 });
  const ot = () => oldOf(cine.t);
  const P = (pos, lk, fov = 40) => ({ pos, look: lk, fov });
  const twSpot = hx(-0.45, -0.25), zoTray = hx(-1.78, -2.6), zoSink = hx(-2.42, -2.55);   // (sink: 0.12 m west of the spout's line, her right hand's side; clear of the stove)
  const cupboard = hv(-4.1, 1.25, -1.6);
  const twEnd = hx(1.55, -1.75), twEndA = Math.atan2(-1, 0.25);
  // (indoors the house is an open set like LBA2's: the south and east walls are cut away for the game's camera,
  // so every shot in it looks north or west, and is pitched so the frame stays under the wall tops)
  const shots = [
    // 1 — Citadel Island from the air, then down over the water to the harbour (the caption: where, when)
    // (OPEN-FILM: one move from 0 to 13 s through the same three framings. It was two eased shots: the camera came to a
    // dead stop over the water at 9.0 (the frames 6.5-9.5 s are all but identical) and set off again into a 4 s dive.
    // Now it drifts over the island under the caption, gathers speed and dives over the quay's roofs to the lift
    // without stopping: position and aim on one smooth curve, the speed continuous through 9 s.)
    shot(0, 13.0, () => aerial(ot()), null),
    // 2 — the project's lift: the crate comes up off the barge; a resident asks the worker about the heat
    shot(13.0, 19.6, P(PV(-79.7, 3.3, -1.75), PV(-85.1, 2.25, -3.05), 44), P(PV(-79.9, 3.2, -1.85), PV(-85.1, 2.4, -3.1), 44)),
    // 3 — the hum: the drill turning in FunFrock's old fortress, up on the plateau, the town beyond
    shot(19.6, 23.8, P(V(bore.x + 22, boreY + 9, bore.z + 12), V(bore.x, boreY + 5, bore.z), 46), P(V(bore.x + 18, boreY + 7.6, bore.z + 10), V(bore.x, boreY + 5.6, bore.z), 46)),
    // 4 — back at the pier, a little above head height: the lantern settles; "Just the drill."; the crate is set
    // down. (The look point is on the people, 0.7 m over the deck (2.16): it was below the deck, which put their
    // heads at the top edge, cut.)
    // (from the ferry's side of the pier, so the worker answers toward us and his bend to the crate reads; from the
    // town's side the resident hid him)
    shot(23.8, 29.0, P(PV(-80.9, 3.85, 0.3), PV(-83.8, 2.8, -3.9), 44), P(PV(-81.1, 3.8, 0.1), PV(-83.8, 2.75, -4.0), 44)),
    // 5 — home: the whole family at their own things; over Arthur's shoulder: "Dad! The mast fits!"
    shot(29.0, 31.2, P(hv(4.35, 2.75, 4.35), hv(0.2, 0.6, -0.55), 44), P(hv(4.2, 2.68, 4.2), hv(0.15, 0.6, -0.58), 44)),
    // (Arthur's face: a three-quarter close-up as he shows the mast; then over his shoulder for his father's answer)
    // (ARTHUR-12: at twelve, kneeling, his eyes are at 1.2 m, not 0.85: the close-up's lens and aim 0.28 m higher,
    // the same angle; the over-the-shoulder camera 0.15 m higher so his head sits in the corner, not over his father)
    shot(31.2, 33.1, P(hv(0.4, 1.5, 2.35), hv(2.0, 1.1, 2.05), 42), P(hv(0.45, 1.48, 2.33), hv(2.0, 1.1, 2.05), 42)),
    shot(33.1, 35.0, P(hv(3.4, 2.05, 3.0), hv(0.0, 0.8, -0.5), 42), P(hv(3.3, 2.03, 2.9), hv(0.0, 0.8, -0.5), 42)),
    // 6 — Zoé at the counter, then the tap
    // (R5: from the kitchen's west end a little over her eye level, three-quarter front: her face, her hands on the tray
    // and the tap, Twinsen at his table behind her; one shot with a slow push in as she goes to the tap. Pitched so the
    // frame's top stays near the far ceiling (about 7 % of the frame, was 20 % in the side-on view from the east, her
    // profile, with a near-identical cut at 41.0); higher, it looked down on her scalp, lower it filled with ceiling)
    // (OPEN-FILM: at the tap she leans in and looks down at it, and from 1.84 m the camera saw the top and back of her head
    // through the whole business with the tap (41-45 s). As she reaches, the camera now comes down to her shoulder's height
    // and a little nearer (1.62 m, aimed at 1.44): her face in profile over her arm, the hand on the handle, the spout, and
    // Twinsen at his table behind her — the same side, the same lens family, one move with her reach instead of a cut)
    shot(35.0, 45.3, () => tapCam(ot()), null),
    // (...and as she turns from the tap to call him, her face from his side of the room: the cut on her turn)
    shot(45.3, 48.0, P(hv(-0.9, 1.75, -1.0), hv(-2.4, 1.45, -2.5), 42), P(hv(-0.95, 1.74, -1.05), hv(-2.4, 1.46, -2.52), 41)),
    // 7 — the exchange: Twinsen answers from the table; over his shoulder for hers
    // (R5: from her side of the room, his face as he answers her, Arthur at his boat behind him — the reverse of her
    // line's shot. From the west, with his head turned to her, the camera saw the back of his head and the knot)
    shot(48.0, 50.8, P(hv(-2.45, 1.8, -0.95), hv(-0.5, 1.45, -0.3), 46), P(hv(-2.4, 1.79, -0.92), hv(-0.5, 1.45, -0.3), 45)),
    shot(50.8, 53.4, () => overShoulder(), null),
    // 8 — the house hums too: dust from the beams, all three look up; Arthur knows what it is
    // (from the bed's foot: all three in one frame as the dust falls and they look up; then Arthur's close-up for his
    // line, the same angle as his first)
    shot(53.4, 54.8, P(hv(-3.0, 2.3, 3.0), hv(0.3, 1.0, -0.6), 54), P(hv(-2.9, 2.27, 2.9), hv(0.3, 1.0, -0.6), 54)),
    shot(54.8, 58.0, P(hv(0.4, 1.5, 2.35), hv(2.0, 1.1, 2.05), 42), P(hv(0.47, 1.48, 2.32), hv(2.0, 1.1, 2.05), 42)),
    // 9 — the second try: a warm trickle, steam
    shot(58.0, 60.1, P(hv(-3.5, 1.62, -3.2), hv(-2.2, 1.44, -2.7), 50), P(hv(-3.47, 1.62, -3.2), hv(-2.22, 1.43, -2.72), 49)),   // (the first try's angle, where it ended)
    // (OPEN-FILM: her face with her hand: from the stove's side at her hand's height, her palm in the stream, the steam, and
    // her face over it as she says it — the shot was the basin and her forearm, her line spoken off the frame)
    shot(60.1, 62.4, P(hv(-1.28, 1.3, -3.0), hv(-2.33, 1.3, -2.83), 56), P(hv(-1.34, 1.3, -3.0), hv(-2.33, 1.3, -2.83), 54)),   // (the palm above the subtitles)
    // 10 — where the warmth comes from: under the well, something in the rock glows with the hum
    // (inside the last chamber, low, facing the vein: the glowing rock fills the frame and pulses with the hum, the
    // pool in front; it was seen from high above through the barrier's crystals)
    shot(62.4, 66.5, P(wv(7.7, 1.55, 0.6), wv(8.0, 1.9, -6.2), 50), P(wv(7.85, 1.6, -0.8), wv(8.0, 1.95, -6.2), 48)),
    // 11 — the decision; Zoé goes out of the room toward the hall
    shot(66.5, 72.2, P(hv(-1.9, 2.05, 2.6), hv(-0.7, 1.05, -1.4), 46), P(hv(-1.8, 2.05, 2.7), hv(-0.45, 1.02, -1.15), 47)),
    // (then from the east wall: she comes toward us past him saying "Take your magic ball." — from the first camera
    // she passed behind him as she said it)
    shot(72.2, 75.2, () => goingOut(), null),
    // 13 — inside again: Twinsen turns to the cupboard (the ball); then into the game's own camera
    shot(81.6, 83.6, P(hv(3.3, 2.3, 0.3), V(twEnd.x - 1.6, 1.1, twEnd.z + 0.1), 46), P(hv(3.5, 2.6, 0.6), V(twEnd.x - 2.0, 1.05, twEnd.z + 0.1), 46)),
    // 12 — outside (the game's door transition): Zoé goes next door, past the house's new heat post; the title
    // (LBA3-RUN: not in the notebook cut)
    shot(75.2, 81.6, () => street(), null),
    shot(83.6, OLD_END, null, 'game'),
  ].filter(Boolean);
  // the opening's aerial move (0-13 s): a Catmull-Rom curve through the three framings it used to stop at (high over
  // the island; high over the water by the pier, at 9 s; low over the quay at the lift, at 13 s), the camera's position
  // and aim alike; the time warp starts from rest, passes 9 s at speed and settles at 13 s (one curve, C1 throughout)
  const AER = { pos: [HV(-34, 26, 58), HV(-50, 17, 38), PV(-72.5, 8.5, 4.0)], look: [HV(-2, 6, -38), HV(-30, 4, -42), PV(-83.4, 2.2, -3.2)] };
  const crPt = (Q, u) => {
    const i = u < 0.5 ? 0 : 1, s = Math.min(1, (u - 0.5 * i) / 0.5);
    const P1 = Q[i], P2 = Q[i + 1], P0 = i === 0 ? Q[0].clone().multiplyScalar(2).sub(Q[1]) : Q[0], P3 = i === 1 ? Q[2].clone().multiplyScalar(2).sub(Q[1]) : Q[2];
    const s2 = s * s, s3 = s2 * s, o = V(0, 0, 0);
    o.addScaledVector(P0, -s + 2 * s2 - s3).addScaledVector(P1, 2 - 5 * s2 + 3 * s3).addScaledVector(P2, s + 4 * s2 - 3 * s3).addScaledVector(P3, -s2 + s3);
    return o.multiplyScalar(0.5);
  };
  function aerial(t) {
    const N = 2.2, C = (0.5 * N / 9) * 8;   // (du/dt at 9 s from either side: 0.5·N/9)
    let u;
    if (t <= 9) u = 0.5 * Math.pow(Math.max(0, t) / 9, N);
    else { const x = Math.min(1, (t - 9) / 4); u = 0.5 + 0.5 * (3 * x * x - 2 * x * x * x + C * (x * x * x - 2 * x * x + x)); }
    const k = Math.max(0, (u - 0.5) / 0.5);
    const pos = crPt(AER.pos, u);
    pos.y += 4.2 * Math.sin(Math.PI * k) ** 2 * (1 - 0.3 * k);   // (over the quay's roofs: the coal shed's)
    return P(pos, crPt(AER.look, u), 50 - 6 * sm(k));
  }
  function tapCam(t) {
    const A0 = P(hv(-3.65, 1.84, -3.12), hv(-2.0, 1.44, -2.52)), A1 = P(hv(-3.62, 1.84, -3.15), hv(-2.1, 1.47, -2.55)), T = P(hv(-3.5, 1.62, -3.2), hv(-2.2, 1.44, -2.7));
    const k1 = sm((t - 35.0) / 5.9), k2 = sm((t - 40.5) / 1.8);
    const pos = A0.pos.clone().lerp(A1.pos, k1).lerp(T.pos, k2), lk = A0.look.clone().lerp(A1.look, k1).lerp(T.look, k2);
    return P(pos, lk, 54 - 1 * k1 - 3 * k2);
  }
  function overShoulder() {     // (behind Twinsen's shoulder, toward Zoé)
    const a = angleTo(tw, zo.pos), f = { x: Math.sin(a), z: Math.cos(a) }, r = { x: -Math.cos(a), z: Math.sin(a) };
    // (further back and wider of his shoulder: his head was a third of the frame and his shrug was out of it)
    return P(V(tw.pos.x - f.x * 1.95 + r.x * 0.95, 1.85, tw.pos.z - f.z * 1.95 + r.z * 0.95), head(zo, 1.25), 40);
  }
  // ...and as she turns for the hall the camera eases back along the wall and pans with her, so she leaves the room
  // in frame, whole, instead of walking past the lens with her head cut
  function goingOut() {
    const k = sm((ot() - 73.3) / 1.4);
    const pos = hv(3.6 + 0.3 * k, 1.95 + 0.1 * k, 0.4 + 0.55 * k);
    const lk = hv(-1.0, 1.1, -1.6).lerp(V(zo.pos.x, zo.pos.y + 1.1, zo.pos.z), 0.85 * k);
    return P(pos, lk, 46);
  }
  // in front of the house, from the lane's far side (north-east of the door, clear of the trees): she comes out by
  // the door, comes up the path toward us and turns along the lane past the neighbours' fence; the camera pans with
  // her, rising a little for the title, their red roof and green shutters ahead of her
  const stY = g.physics.groundAt(-44.4, 81.2);
  function street() {
    const k = sm((ot() - 75.2) / 6.4);
    const pos = V(-44.6 + 0.7 * k, stY + 1.75 + 0.45 * k, 81.15 + 0.2 * k);
    const her = V(zo.pos.x, zo.pos.y + 1.15, zo.pos.z), door = V(home.door.x, stY + 1.3, home.door.z), ahead = V(nbr.door.x - 4.5, stY + 1.4, nbr.door.z + 2.6);
    const lk = door.lerp(her, sm((ot() - 75.5) / 1.4)).lerp(ahead, 0.3 * sm((ot() - 77.5) / 4.0));
    // (from the title on, she is kept right of centre and low: the title sits over the middle of the sky)
    // (OPEN-FILM: higher, and from 75.8: at 77-78 s her head was under the title's second line)
    lk.add(V(-0.8, 1.0, -1.05).multiplyScalar(sm((ot() - 75.8) / 1.3)));
    return P(pos, lk, 46);
  }

  // ---------------------------------------------------------------- tracks
  const tracks = [];
  // (a track on the old clock: its function is given old seconds and its k on them; one that starts in the cut is gone, one
  // that runs into it ends where the cut starts. trackN: on the scene's own clock)
  const track = (t0, t1, fn) => {
    if (newOf(t0) == null) return;
    tracks.push({ t0: newOf(t0), t1: newEnd(t1), fn: (k, n, dt) => fn(k >= 1 ? 1 : Math.min(1, Math.max(0, (oldOf(n) - t0) / ((t1 - t0) || 1))), oldOf(n), dt) });
  };
  const trackN = (t0, t1, fn) => tracks.push({ t0, t1, fn });
  // walk along points at a steady pace; the rig is told the real speed so the feet don't slide
  // (R5: `acc` / `dec`: seconds to get up to speed and to slow to a stop, so a walk starts from a standing weight
  // shift and settles instead of starting and stopping at full pace; each adds half its time to the walk)
  const walk = (a, pts, t0, speed, end = 'idle', endAngle = null, { acc = 0, dec = 0 } = {}) => {
    const seg = []; let len = 0;
    for (let i = 1; i < pts.length; i++) { const d = Math.hypot(pts[i].x - pts[i - 1].x, pts[i].z - pts[i - 1].z); seg.push(d); len += d; }
    const T = len / speed + (acc + dec) / 2, t1 = t0 + T;
    // distance covered after τ seconds, and the speed then
    const dist = (u) => (u < acc ? (speed * u * u) / (2 * acc) : u > T - dec ? len - (speed * (T - u) ** 2) / (2 * dec) : speed * (u - acc / 2));
    const vel = (u) => (u < acc ? (speed * u) / acc : u > T - dec ? (speed * (T - u)) / dec : speed);
    track(t0, t1, (k, tt, dt) => {
      let d = Math.min(len, Math.max(0, dist(k * T))), i = 0;
      const v = Math.max(0.15, vel(k * T));
      while (i < seg.length - 1 && d > seg[i]) { d -= seg[i]; i++; }
      const p0 = pts[i], p1 = pts[i + 1], u = seg[i] ? Math.min(1, d / seg[i]) : 1;
      const x = p0.x + (p1.x - p0.x) * u, z = p0.z + (p1.z - p0.z) * u;
      a.pos.set(x, g.physics.groundAt(x, z), z);
      // (the last steps already turn toward the end facing; the rest of the turn follows on the spot: it used to snap
      // to endAngle in one frame — Zoé turned 95° at the sink at 40.93)
      let face = Math.atan2(p1.x - p0.x, p1.z - p0.z);
      if (endAngle != null) { const e = sm((tt - (t1 - 0.4)) / 0.4) * 0.6, dd = Math.atan2(Math.sin(endAngle - face), Math.cos(endAngle - face)); face += dd * e; }
      a.angle = dampAngle(a.angle, face, 9, dt || 1 / 60);
      if (k < 1) { a._speed = v; a.rig.play('walk'); } else { a._speed = 0; a.rig.play(end); }
    });
    if (endAngle != null) turn(a, endAngle, t1, 0.35);
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
  // (R5: the feet step round under the pose layer's foot planting, one foot at a time, instead of the gameplay turn's
  // shuffle (turnL / turnR), whose alternating lift let the planted foot skate round with the body; the head leads
  // the turn and the chest follows, through the rig's turn lean)
  const pivot = (a, ang, t0, dur, during = 'idle', after = null) => {
    turn(a, ang, t0, dur);
    track(t0, t0 + dur + 0.2, (k, tt) => {
      if (tt < t0 + 0.05) a.rig.play(during);
      const d = Math.atan2(Math.sin(ang - a.angle), Math.cos(ang - a.angle));
      a.rig.turn = k < 1 && tt < t0 + dur ? Math.max(-1, Math.min(1, d * 1.5)) : 0;
      if (k >= 1 && after) a.rig.play(after);
    });
  };

  // (OPEN-FILM) a look over the shoulder past what the neck turns (the rig's head and chest reach 63 degrees): the chest
  // twists the rest of the way, up to 0.45 rad more, so the eyes get there (the worker's glance back at the man asking stopped
  // 65 degrees short, at the lift's column; Zoé's at Arthur 45)
  const reachLook = (a, t0, t1, p) => bend(a, t0, t1, () => {
    const rel = angleDiff(a.angle, Math.atan2(p().x - a.pos.x, p().z - a.pos.z));
    return { torso: [0, Math.sign(rel) * Math.min(0.45, Math.max(0, Math.abs(rel) - 1.0)), 0] };
  });

  // the lift's unload cycle on the clock
  const liftU = [[6.0, 0], [13.0, 0.16], [14.2, 0.22], [21.0, 0.45], [24.8, 0.7], [27.0, 0.88], [28.6, 1.0]];
  track(0, 29.0, (k, tt) => {
    let u = 0;
    for (let i = 1; i < liftU.length; i++) if (tt <= liftU[i][0]) { const [a0, u0] = liftU[i - 1], [a1, u1] = liftU[i]; u = u0 + (u1 - u0) * Math.min(1, Math.max(0, (tt - a0) / (a1 - a0))); break; } else u = liftU[i][1];
    L.pose(u, true);   // (the control's lever stays where the cycle leaves it: nobody is at it when the hook is up)
    // the hum (18.6–25.0): the lantern and the hook tremble, the puddle ripples
    L.shake(Math.max(0, Math.sin(Math.min(1, Math.max(0, (tt - 18.6) / 6.4)) * Math.PI)) * 0.85);
    W.boatSurge = Math.sin(Math.min(1, Math.max(0, (tt - 1.0) / 4.0)) * Math.PI) * 0.32;
  });
  // the tap: stream thickness by time, with a sputter
  track(41.0, 72.0, (k, tt, dt) => {
    let f = 0;
    if (tt > 42.95 && tt < 43.6) f = 1;
    else if (tt >= 43.6 && tt < 43.95) f = Math.sin((tt - 43.6) * 40) > 0 ? 0.6 : 0;
    else if (tt > 59.2 && tt < 69.8) f = 0.5 + Math.sin(tt * 7) * 0.06;
    flowWobble += (dt || 0) * 30;
    water(f);
    if (f > 0) stream.scale.x = stream.scale.z = f * (1 + Math.sin(flowWobble) * 0.08);
    // (R5: while her hand is under the spout the water lands on it: the stream ends at her palm, not through it)
    const onHand = sm((tt - 60.05) / 0.3) * sm((62.4 - tt) / 0.1);
    if (f > 0) stream.scale.y = 1 + (Math.max(0.2, (K.spout.y - STREAM_PALM_Y - 0.03) / (K.spout.y - K.basin.y)) - 1) * onHand;
    steamOn = tt > 59.6 && tt < 70.0 ? Math.min(1, (tt - 59.6) / 1.2) : Math.max(0, steamOn - (dt || 0));
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
  track(58.55, 59.15, (k) => { handle.rotation.y = -1.6 * sm(k); });   // (R5: a quarter turn and a bit, not 2.2 rad: one grip)
  track(69.4, 69.9, (k) => { handle.rotation.y = -1.6 * (1 - sm(k)); });
  // under the island: the vein brightens and fades with the hum
  track(83.6, 84.0, (k) => setFade(1 - k));
  track(62.4, 66.5, (k) => { WR.vein.power = Math.sin(k * Math.PI) * 0.9 + Math.max(0, Math.sin(k * Math.PI * 5)) * 0.25 * Math.sin(k * Math.PI); });

  // walks
  // the resident waits by the lift for his word with the worker, then goes on down the pier
  // (the worker steps to the crate's side of the pier, by its west face, while the resident is still there; the
  // resident then turns away from him toward the ferry — their walks no longer meet: they passed within 0.39 m)
  walk(resident, [resSpot2, PP(-83.0, -5.0), PP(-84.4, -5.3)], 26.4, 1.2, 'idle', pierAng(Math.PI));   // (NO-AIR: 0.3 m in from the pier's edge: his left foot ended over the water)
  walk(worker, [wkSpot, crSpot], 24.6, 1.0, 'idle', angleTo({ pos: crSpot }, L.cratePierW));
  walk(zo, [zoTray, zoSink], 39.95, 1.0, 'idle', Math.PI, { acc: 0.25, dec: 0.3 });   // (there by 40.87; the turn to the tap runs into the reach)
  // Zoé out of the family room and down the hall to the front door (seen as far as the hall; the door is the cut)
  // (wide of the chair at the table's east end: the corner at hx(0.7, -1.4) took her through it)
  walk(zo, [zoSink, hx(1.15, -1.2), hx(1.25, 2.6), hx(1.2, 6.5)], 71.0, 1.45, 'idle', null, { acc: 0.35 });
  // outside: from where the game's door puts you, round the neighbours' fenced yard (the pickets of
  // citadel-layout.js run x -41.8, z 70.9–78.5 and z ≈ 77.8, x -41..-37.3) and their house, to their door on the far
  // side. (A straight line went through the fence and the house.) Only the first 8.6 m are seen; finish() puts
  // her at the door.
  walk(zo, [homeOut, { x: -43.3, z: 77.5 }, { x: -42.2, z: 79.3 }, { x: -37.6, z: 79.4 }, { x: -36.4, z: 80.9 },
    { x: -33.0, z: 81.0 }, { x: -30.4, z: 79.6 }, { x: -28.6, z: 77.7 }, nbrSpot], 75.2, 1.35, 'idle');

  // turns
  // she turns to him as her line ends (he answers to her face, not her back) and listens with her arms at rest
  pivot(zo, Math.PI, 57.35, 0.8);   // (R5: back to the tap stepping round: a plain turn skated her feet; then the reach, 58.1)
  turn(tw, -0.9, 67.4, 0.5);    // (half toward her: "I'll check the well.")
  pivot(zo, angleTo({ pos: zoSink }, twSpot), 70.0, 0.75, 'wipe');   // (R5: after she lets go of the tap, not while holding it)
  turn(tw, twEndA, 81.7, 0.7);   // to the cupboard, where the ball is

  // The scene's own pose layer: small offsets on top of the rig's actions where a hand must land on something (the
  // crate's top, the stream, the table). bend(actor, t0, t1, offsets) eases in over the first 0.3 s and out over the
  // last 0.3 s; offsets are joint rotations (torso/head/shoulder/elbow/knee, radians) and hips (metres, down < 0).
  // Each frame the last offsets are taken off before the rig updates and the new ones put on after, so the rig's
  // own damping never sees (or compounds) them.
  const bends = [];
  const bend = (a, t0, t1, o) => bends.push({ a, t0, t1, o });
  // (OPEN-FILM) a talking gesture with a shape: a small wind-up the other way (0.14 s), the move (0.3 s, a touch past
  // and back: follow-through), a hold that sinks a little while the words are said, the settle (0.5 s). Offsets as bend's.
  const gest = (a, t0, d, o) => {
    const env = (u) => {
      if (u < 0) return -0.12 * sm((u + 0.14) / 0.14);
      if (u < 0.3) return -0.12 + 1.17 * sm(u / 0.3);
      if (u < 0.5) return 1.05 - 0.05 * sm((u - 0.3) / 0.2);
      const hold = 1 - 0.08 * Math.min(1, (u - 0.5) / Math.max(0.1, d - 0.5));
      return u < d ? hold : hold * (1 - sm((u - d) / 0.5));
    };
    bend(a, t0 - 0.45, t0 + d + 0.8, (tt) => {
      const e = env(tt - t0), r = {};
      for (const [k, v] of Object.entries(o)) r[k] = Array.isArray(v) ? v.map((x) => x * e) : v * e;
      return r;
    });
  };
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
  // R5: contact poses. Two more layers on top of the rig and the bends, each set every frame from the rig's own pose
  // and taken off again before the next rig update (the joints' values are kept and put back), so the rig's damping
  // never sees them and nothing is left over when they end:
  //   grip(actor, side, t0, t1, target)   the hand on a thing: target(t) gives where the palm goes (world), which way
  //                 the fingers point and the palm faces; the shoulder and elbow are solved for the wrist (damped least
  //                 squares from the rig's own arm, so the elbow keeps the action's shape) and the hand turned to the
  //                 orientation, eased in and out over `ein` / `eout` seconds
  //   feet          a planted foot stays where it was put down: the hip turns to hold it (in place and in direction)
  //                 while the body turns or the action shifts the legs; when it can't (more than 10 cm or 0.4 rad
  //                 away) the foot steps there (lifted, 0.3 s), one foot at a time. Not while walking or kneeling.
  const saved = (a) => (a._ov ??= []);
  const keep = (a, obj) => keepJoint(saved(a), obj);
  const restore = (a) => { if (a._ov) restoreJoints(a._ov); };
  const grips = [];
  const grip = (a, side, t0, t1, target, { ein = 0.35, eout = 0.35, palm = V(0.008, -0.062, 0.012) } = {}) => grips.push({ a, side, t0, t1, target, ein, eout, palm });
  // (NO-AIR: the solve itself is src/engine/handik.js now, shared with the residents' work: src/game/workhands.js)
  const solveArm = (a, g, tt) => {
    const w = sm((tt - g.t0) / g.ein) * sm((g.t1 - tt) / g.eout);
    if (w <= 0) return;
    const T = g.target(tt);
    if (!T) return;
    solveHand(a.rig.j['arm' + g.side], g.side, T, w, saved(a), g.palm);
  };
  const STEP = 0.28, NOFEET = /^(walk|run|sneak|kneel)/;
  const plantFeet = (a, tt, dt) => {
    const F = (a._feet ??= { L: { lock: null, yaw: 0, step: null, off: null }, R: { lock: null, yaw: 0, step: null, off: null } });
    const j = a.rig.j, ankle = (s) => j['leg' + s].foot.getWorldPosition(V(0, 0, 0));
    const off = !a.rig.root.visible || NOFEET.test(a.rig.anim);
    // a released foot's hold eases off (a turn's own step lifts it, or a walk starts) instead of jumping
    const residual = (f, hip, knee) => {
      if (!f.off) return;
      const d = Math.exp(-(dt || 0) * 10), o = f.off;
      o.x *= d; o.y *= d; o.z *= d; o.k *= d;
      keep(a, hip); keep(a, knee);
      hip.rotation.x += o.x; hip.rotation.y += o.y; hip.rotation.z += o.z; knee.rotation.x += o.k;
      hip.updateMatrixWorld(true);
      if (Math.abs(o.x) + Math.abs(o.y) + Math.abs(o.z) + Math.abs(o.k) < 0.002) f.off = null;
    };
    a.rig.root.updateMatrixWorld(true);
    const nat = { L: ankle('L'), R: ankle('R') };
    for (const s of ['L', 'R']) {
      const f = F[s], o = F[s === 'L' ? 'R' : 'L'], hip = j['leg' + s].hip, knee = j['leg' + s].knee, n = nat[s];
      const lifted = !f.step && n.y - nat[s === 'L' ? 'R' : 'L'].y > 0.025;      // (the action lifts it: a turn's step)
      if (off || lifted || (f.lock && Math.hypot(n.x - f.lock.x, n.z - f.lock.z) > 0.5)) { f.lock = null; f.step = null; residual(f, hip, knee); continue; }
      if (!f.lock) { residual(f, hip, knee); f.lock = ankle(s); f.yaw = a.angle + (f.off?.y || 0); continue; }
      const x0 = hip.rotation.x, y0 = hip.rotation.y, z0 = hip.rotation.z, k0 = knee.rotation.x;
      let dyaw = Math.atan2(Math.sin(f.yaw - a.angle), Math.cos(f.yaw - a.angle));
      if (!f.step && !o.step && o.lock && (Math.hypot(n.x - f.lock.x, n.z - f.lock.z) > 0.1 || Math.abs(dyaw) > 0.4)) f.step = { t0: tt, from: f.lock.clone(), yaw: f.yaw };
      let want = f.lock, lift = 0;
      if (f.step) {
        const k = Math.min(1, (tt - f.step.t0) / STEP), e = sm(k);
        want = f.step.from.clone().lerp(n, e); lift = Math.sin(k * Math.PI);
        dyaw = Math.atan2(Math.sin(f.step.yaw - a.angle), Math.cos(f.step.yaw - a.angle)) * (1 - e);
        if (k >= 1) { f.lock = n.clone(); f.yaw = a.angle; f.step = null; dyaw = 0; want = f.lock; lift = 0; }
      }
      keep(a, hip); keep(a, knee);
      hip.rotation.y += Math.max(-0.7, Math.min(0.7, dyaw));
      if (lift) { hip.rotation.x -= 0.3 * lift; knee.rotation.x += 0.6 * lift; }   // (the foot clears the floor by ~4 cm: a step, not a march, under a long dress)
      // hip flexion / abduction to bring the ankle over the planted spot (a 2×2 Newton step, twice)
      for (let it = 0; it < 2; it++) {
        hip.updateMatrixWorld(true);
        const p0 = ankle(s), ex = want.x - p0.x, ez = want.z - p0.z;
        if (Math.hypot(ex, ez) < 0.002) break;
        hip.rotation.x += 1e-3; hip.updateMatrixWorld(true); const px = ankle(s); hip.rotation.x -= 1e-3;
        hip.rotation.z += 1e-3; hip.updateMatrixWorld(true); const pz = ankle(s); hip.rotation.z -= 1e-3;
        const a11 = (px.x - p0.x) * 1000, a21 = (px.z - p0.z) * 1000, a12 = (pz.x - p0.x) * 1000, a22 = (pz.z - p0.z) * 1000, det = a11 * a22 - a12 * a21;
        if (Math.abs(det) < 1e-6) break;
        const dx = (a22 * ex - a12 * ez) / det, dz = (-a21 * ex + a11 * ez) / det;
        hip.rotation.x += Math.max(-0.35, Math.min(0.35, dx)); hip.rotation.z += Math.max(-0.35, Math.min(0.35, dz));
      }
      // (the sole stays level: the foot takes back the pitch the hip and knee offsets gave it)
      const foot = j['leg' + s].foot; keep(a, foot);
      foot.rotation.x -= (hip.rotation.x - x0) + (knee.rotation.x - k0);
      hip.updateMatrixWorld(true);
      f.off = { x: hip.rotation.x - x0, y: hip.rotation.y - y0, z: hip.rotation.z - z0, k: knee.rotation.x - k0 };
    }
  };
  // (OPEN-FILM) the head moves with the voice: a small dip into each stressed syllable (the mouth's opening, smoothed to
  // the pace of the words, not the flicker of each syllable) and, for the length of a line, the chin a little up and the
  // head a little to one side; it settles after the line. Under 3.5 degrees at most: it is speech, not nodding.
  const SIDE = new Map([[tw, 1], [zo, -1], [ar, 1], [worker, -1], [resident, 1]]);
  const speech = (a, dt) => {
    if (!(dt > 0)) dt = 0;
    const mo = a.rig.mOpen || 0;
    a._spF = damp(a._spF || 0, mo, mo > (a._spF || 0) ? 14 : 6, dt);
    a._spS = damp(a._spS || 0, mo > 0.05 ? 1 : 0, mo > 0.05 ? 3 : 1.6, dt);
    if (a._spF < 0.002 && a._spS < 0.002) return;
    const hd = a.rig.j.head; keep(a, hd);
    hd.rotation.x += 0.06 * a._spF - 0.035 * a._spS;
    hd.rotation.z += 0.04 * a._spS * (SIDE.get(a) || 1);
  };
  // everyone's rig, every frame (after the moves above)
  // (on the scene's clock from its first frame, the notebook's too; bends and grips are on the old clock: negative in the
  // notebook)
  trackN(0, OPENING_LENGTH, (k, n, dt) => {
    const tt = oldOf(n);
    for (const a of cast) {
      restore(a);
      applyBend(a, -1); a._bend = null;
      if (dt > 0) a.rig.update(dt, a._speed || 0);
      for (const b of bends) {
        if (b.a !== a || tt < b.t0 || tt > b.t1) continue;
        const w = sm((tt - b.t0) / 0.3) * sm((b.t1 - tt) / 0.3), o = a._bend ??= {};
        for (const [key, v] of Object.entries(typeof b.o === 'function' ? b.o(tt) : b.o)) {
          if (key === 'hips') o.hips = (o.hips || 0) + v * w;
          else { const c = o[key] ??= [0, 0, 0]; v.forEach((x, i) => (c[i] += x * w)); }
        }
      }
      applyBend(a, 1);
      speech(a, dt);
      a.sync();
      a.rig.root.updateMatrixWorld(true);
      for (const g of grips) if (g.a === a && tt >= g.t0 && tt <= g.t1) solveArm(a, g, tt);
      plantFeet(a, tt, dt);
    }
  });

  // ---------------------------------------------------------------- events
  const ev = [];
  const at = (tt, fn) => { const n = newOf(tt); if (n != null) ev.push({ t: n, fn }); };   // (old clock; in the cut: gone)
  const atN = (n, fn) => ev.push({ t: n, fn });                                              // (the scene's clock)
  atN(MUSIC_AT, () => g.audio.cue(CK.MUSIC));
  if (NBCUT) {
    // the harbour's sounds come in with the drawing turning into the island (old 8 s)
    at(8.0, () => { loop('lap'); loop('winch', { quiet: true }); });
    at(8.5, () => sfx('ropeCreak'));
    at(9.6, () => sfx('ropeCreak'));
  } else {
    // sound of the place first, the music after a moment
    at(0, () => loop('lap'));
    at(2.2, () => sfx('ropeCreak'));
    at(3.4, () => sfx('ropeCreak'));
    at(6.2, () => loop('winch', { quiet: true }));
  }
  at(13.6, () => sfx('clunk'));
  // (NO-AIR: his left hand goes to the control's lever after the hook clunks on, and throws it as the motor starts:
  //  the grips and the arm's bend below; the rig's `reach` is a right arm held out, and the lever is on his left, the
  //  camera's side)
  at(14.2, () => { loop('motor'); look(resident, head(worker)); });
  // the worker glances back at the man asking while his hand stays on the control; Xil, on the pier behind, turns
  // to listen in, looks up at the lift when the hum shakes it, and listens again on the way back
  at(15.0, () => look(worker, head(resident)));
  reachLook(worker, 14.9, 17.1, () => resident.pos);
  at(14.8, () => { if (xil) xil.listenTo = resident; });
  at(18.7, () => { if (xil) { xil.listenTo = null; xil.rig.lookAt = V(column.x, 4.6, column.z); } });
  at(23.9, () => { if (xil) { xil.rig.lookAt = null; xil.listenTo = worker; } });   // (a hand on the lift's control)
  at(16.85, () => { play(worker, 'idle'); look(worker, head(resident)); });
  turn(worker, Math.atan2(resSpot.x - wkSpot.x, resSpot.z - wkSpot.z) - 0.35, 16.85, 0.5);
  turn(worker, angleTo({ pos: wkSpot }, column), 19.7, 0.3);
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
  // (NO-AIR, the user 10.11: the crate came down by itself and he bowed to it with one hand afterwards. Now he meets it
  //  as it comes down, both hands on its top, and goes down with it to the deck (the thump); then his right hand frees
  //  the hook, he straightens and watches the hook go up)
  at(25.6, () => { play(worker, 'potting'); look(worker, L.crate.getWorldPosition(new THREE.Vector3())); });   // (both arms forward: the grips below put the palms on the crate)
  at(26.15, () => look(worker, head(resident)));
  at(26.4, () => look(resident, null));
  at(26.75, () => look(worker, L.crate.getWorldPosition(new THREE.Vector3()).setY(L.cratePierW.y + 0.3)));
  bend(worker, 25.6, 28.15, () => { const k = crateLow(); return { torso: [0.36 * k], kneeL: [0.12 * k], kneeR: [0.12 * k], hipL: [-0.07 * k], hipR: [-0.07 * k], hips: -0.03 * k }; });
  at(27.0, () => { sfx('thump'); });
  at(27.85, () => { play(worker, 'idle'); worker.rig.blendT = 0.45; });
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
  });
  // "Dad! The mast fits!" / "Told you. Now the sail."
  at(31.15, () => { play(ar, 'kneelShow'); look(ar, head(tw)); });
  at(31.6, () => { play(tw, 'idle'); look(tw, eyesOf(ar)); });
  at(33.1, () => tw.rig.doGesture('nod'));
  at(35.2, () => { play(tw, 'tinker'); look(tw, null); });
  at(35.0, () => { play(ar, 'kneelWork'); look(ar, null); });
  at(36.2, () => sfx('tick'));   // (the mast home in its step, in his hand: the grips below)
  at(36.55, () => rest(BT.mast, R.group, mastFitted));   // (he lets go: it stands where his hand left it)
  // (OPEN-FILM: 35-39.5 s was four and a half seconds of the potting loop and the tinkering loop with nothing happening.
  // The mast clicks into place: both parents glance over at Arthur, and back to their work; Zoé presses the last seedling
  // in with a small nod (done), then dries her hands and sees the tap)
  at(36.3, () => look(zo, head(ar, 1.1)));
  reachLook(zo, 36.2, 37.75, () => ar.pos);
  at(36.45, () => look(tw, eyesOf(ar)));
  at(37.3, () => look(tw, null));
  at(37.6, () => look(zo, null));
  at(38.65, () => zo.rig.doGesture('nod'));
  at(39.5, () => play(zo, 'wipe'));
  // the tap (R5): her eyes go to it as she sets off from the tray; she reaches as the last step settles, her hand
  // lands on the cross handle (grip below) and turns with it; she watches the pipe knock, the water come and stop;
  // she turns it off, breathes out, lifts her hand away, and only then looks round to him and turns
  at(40.05, () => look(zo, tapAt()));
  at(40.95, () => play(zo, 'reach'));
  at(41.5, () => sfx('tapSqueak'));
  at(42.3, () => sfx('pipeKnock'));
  at(42.65, () => sfx('pipeKnock'));
  at(42.95, () => { sfx('waterRun'); g.particles.burst(K.basin.x, K.basin.y + 0.05, K.basin.z, '#cfe8ff', 6, 0.8); });
  at(43.65, () => sfx('gurgle'));
  at(42.25, () => look(zo, V(K.spout.x, K.tapY + 0.05, K.spout.z - 0.12)));   // (the knocks: up at the pipe)
  at(42.95, () => look(zo, V(K.basin.x, K.basin.y + 0.1, K.basin.z)));        // (the water)
  at(43.75, () => look(zo, V(K.spout.x, K.spout.y, K.spout.z)));              // (...and nothing: a beat on the spout)
  at(44.0, () => look(zo, tapAt()));
  at(44.45, () => zo.rig.doGesture('sigh'));
  at(44.55, () => { play(zo, 'idle'); zo.rig.blendT = 0.35; });
  at(44.7, () => look(zo, head(tw)));       // (the head leads the turn)
  pivot(zo, angleTo({ pos: zoSink }, twSpot), 44.85, 0.9, 'listen');   // (she turns from the tap to call him: he is behind her; 140°, three steps)
  // he turns round from the lamp to answer her (she is behind him: a look alone stopped at his shoulder, facing
  // the lens), and back to Arthur when Arthur speaks
  at(46.2, () => { play(tw, 'idle'); look(tw, head(zo)); });
  pivot(tw, -1.95, 46.35, 0.75);
  pivot(tw, 0.35, 54.9, 0.8);
  at(52.25, () => tw.rig.doGesture('shrug'));   // (OPEN-FILM: his answer to her dry line, as it ends and in the shot over his shoulder; at 53.0 it was half cut off by the cut to the wide)
  // her hand on the tap's handle: the palm on the cross, the fingers over it toward the wall, turning with it (R5:
  // CHAR-2's hand reaches 12 cm past the wrist, and the old offsets for `reach` left the fingers through the stem
  // or beside the cross; the arm is now solved for the palm, so the hand meets the handle whatever the rig does)
  bend(zo, 40.95, 44.75, { torso: [0.2] }); bend(zo, 58.05, 60.1, { torso: [0.2] }); bend(zo, 69.0, 70.05, { torso: [0.2] });
  grip(zo, 'R', 40.95, 44.85, onTap(44.4), { ein: 0.45, eout: 0.45 });
  grip(zo, 'R', 58.2, 60.15, onTap(null), { ein: 0.35, eout: 0.4 });   // (from once the reach has the arm up: from the arm at her side the solve swung it wide)
  grip(zo, 'R', 59.75, 62.4, inStream, { ein: 0.45, eout: 0.1 });
  grip(zo, 'R', 69.0, 70.35, onTap(69.85), { ein: 0.4, eout: 0.55 });

  // ---------------------------------------------------------------- NO-AIR: hands on things
  // (the user, 10.11.2026: "the people at the harbour, Arthur and Twinsen — the actions they do in the air". Every hand
  //  that works in the film is on the thing it works at, by the grips above, and the thing answers: the lift's lever is
  //  thrown under the worker's palm; the crate comes down with both his hands on its top; Twinsen's screwdriver sits in a
  //  screw on the lamp's collar and the screw turns in with each stroke of his wrist, his other hand on the shade; Arthur
  //  holds his hull on its stand and seats the mast in its step with his own hand — the click — before he lets go; Zoé's
  //  palms press the soil of the tray's last two pots.)
  const UP = V(0, 1, 0), PALM = V(0.008, -0.062, 0.012);
  // the lift's control (island.js cargoLift): the palm on the lever's knob, the fingers over it toward the mast
  const onLever = () => {
    const k = L.knob.getWorldPosition(V(0, 0, 0)), d = V(column.x - worker.pos.x, 0, column.z - worker.pos.z).normalize();
    return { palm: k.add(V(0, 0.03, 0)), fingers: d.add(V(0, -0.55, 0)), normal: V(0, -1, 0) };
  };
  for (const [t0, t1] of [[13.7, 16.95], [20.0, 23.4]]) {
    bend(worker, t0, t1 - 0.1, { shL: [-1.05], elL: [-0.5], torso: [0.1] });   // (the arm up and forward, a little lean: then the palm onto the knob)
    grip(worker, 'L', t0 + 0.05, t1, onLever, { ein: 0.45, eout: 0.4 });
  }
  // the crate: both palms on its top's near edge, wherever it hangs; how far down it has come (0 at his chest, 1 on
  // the deck) bends him with it
  const crateTop = () => { const c = L.crate.getWorldPosition(V(0, 0, 0)); c.y += 0.4; return c; };
  const crateLow = () => Math.min(1, Math.max(0, (worker.pos.y + 1.3 - crateTop().y) / 0.48));
  const onCrate = (sd) => () => {
    const c = crateTop(), n = V(worker.pos.x - c.x, 0, worker.pos.z - c.z).normalize(), tn = V(n.z, 0, -n.x);   // (tn: his right)
    return { palm: c.addScaledVector(n, 0.33).addScaledVector(tn, sd * 0.19).add(V(0, 0.006, 0)), fingers: n.clone().negate().add(V(0, -0.25, 0)), normal: V(0, -1, 0) };
  };
  const onHook = () => {
    const h = L.hook.getWorldPosition(V(0, 0, 0)), n = V(worker.pos.x - h.x, 0, worker.pos.z - h.z).normalize();
    return { palm: h.add(V(0, -0.09, 0)).addScaledVector(n, 0.065), fingers: n.clone().multiplyScalar(-0.4).add(V(0, -1, 0)), normal: n.clone().negate() };
  };
  grip(worker, 'L', 25.6, 28.0, onCrate(-1), { ein: 0.5, eout: 0.35 });
  grip(worker, 'R', 25.6, 27.45, onCrate(1), { ein: 0.5, eout: 0.3 });
  grip(worker, 'R', 27.2, 28.0, onHook, { ein: 0.3, eout: 0.35 });
  // the lamp: the screwdriver's tip in the screw on the stem's collar (interiors.js: R.table.lamp), its shaft in line
  // with the screw; each stroke turns the screw in with his wrist (a radian), then the tip lifts a hair and the wrist
  // comes back for the next. The strokes run while he is at it (not while he looks over at Arthur). His left hand
  // stays on the lamp's shade the whole time.
  const LMP = TB.lamp, sdv = TB.screwdriver;
  const tipLocal = V(0, -0.28, 0), axisLocal = V(0, -1, 0);   // (the tool's tip and the way it points, in his hand: set in prepare, once he holds it)
  const SCREW = { T: 1.15, turn: 1.0, win: [[29.0, 31.5], [35.6, 36.4], [37.45, 46.0]] };
  const screwing = (tt) => {
    let act = 0; for (const [a, b] of SCREW.win) act += Math.max(0, Math.min(tt, b) - a);
    const n = Math.floor(act / SCREW.T), ph = act / SCREW.T - n, fwd = sm(ph / 0.5), back = sm((ph - 0.62) / 0.26);
    return { theta: (n + fwd) * SCREW.turn, roll: SCREW.turn * (fwd - back - 0.5), lift: 0.007 * sm((ph - 0.5) / 0.1) * (1 - sm((ph - 0.9) / 0.1)) };
  };
  const SCREW_END = screwing(99).theta;
  const setScrew = (th) => { LMP.screw.rotation.z = -th; LMP.screw.position.copy(LMP.at).addScaledVector(LMP.n, LMP.out * (1 - th / SCREW_END)); };
  track(28.9, 46.1, (k, tt) => setScrew(screwing(tt).theta));
  const _qa = new THREE.Quaternion(), _qb = new THREE.Quaternion();
  const onScrew = (tt) => {
    const st = screwing(tt), aw = LMP.n.clone().negate();
    const tip = LMP.screw.getWorldPosition(V(0, 0, 0)).addScaledVector(LMP.n, LMP.head + st.lift);
    _qa.setFromUnitVectors(axisLocal, aw);
    // (the hand turned round the shaft so the palm faces down and to his left, then by the stroke)
    const x0 = V(1, 0, 0).applyQuaternion(_qa), want = V(0.55, -0.83, 0);
    _qb.setFromAxisAngle(aw, Math.atan2(want.dot(aw.clone().cross(x0)), want.dot(x0)) + st.roll).multiply(_qa);
    return { palm: tip, fingers: V(0, -1, 0).applyQuaternion(_qb), normal: V(1, 0, 0).applyQuaternion(_qb) };
  };
  const onShade = () => ({ palm: V(R.center.x + LMP.shade.x, LMP.shade.y + 0.004, R.center.z + LMP.shade.z), fingers: LMP.shadeDir.clone().add(V(0, -0.2, 0)), normal: V(0, -1, 0) });
  grip(tw, 'R', 28.5, 31.6, onScrew, { ein: 0.35, eout: 0.4, palm: tipLocal });
  grip(tw, 'R', 35.2, 46.25, onScrew, { ein: 0.45, eout: 0.4, palm: tipLocal });
  grip(tw, 'L', 28.5, 31.7, onShade, { ein: 0.35, eout: 0.45 });   // (off the lamp while he looks up and answers Arthur: held on, the arm across him hid the screwdriver's point at the boat)
  grip(tw, 'L', 35.2, 46.3, onShade, { ein: 0.45, eout: 0.45 });
  // ...and laid down (66.65-67.15): his hand comes to where the screwdriver lies on the table when he lets go — the hand
  // that holds it at exactly its resting place — so it does not move as it leaves his hand (it jumped 11 cm)
  const toolDown = (() => {
    let T = null;
    return () => {
      if (T) return T;
      const hs = tw.rig.j.armR.hand.getWorldScale(V(0, 0, 0)).x || 1;
      const local = new THREE.Matrix4().compose(sdv.position.clone().multiplyScalar(hs), new THREE.Quaternion().setFromEuler(sdv.rotation), V(1, 1, 1));
      const lie = new THREE.Matrix4().compose(hv(sdRest.x, sdRest.y, sdRest.z), new THREE.Quaternion().setFromAxisAngle(UP, sdRest.ry), V(1, 1, 1));
      const hand = lie.multiply(local.invert()), p = V(0, 0, 0), q = new THREE.Quaternion(), sc = V(1, 1, 1);
      hand.decompose(p, q, sc);
      return (T = { palm: PALM.clone().applyQuaternion(q).add(p), fingers: V(0, -1, 0).applyQuaternion(q), normal: V(1, 0, 0).applyQuaternion(q) });
    };
  })();
  grip(tw, 'R', 66.7, 67.6, toolDown, { ein: 0.4, eout: 0.4 });
  // Arthur's boat on its stand (interiors.js: R.boat): his left palm on the deck by the stern, holding the hull; his right
  // hand round the mast's foot — the mast upright in his fist (fingers ahead, the palm against it from his right). It
  // rests on the deck by the step as he tries it, goes up as he shows it, comes down over the step and in (home at 36.2:
  // the click), he holds it there a moment and lets go; then that hand rubs the deck by the bow smooth.
  const aA = R.npcSpots.arthur.a, aF = V(Math.sin(aA), 0, Math.cos(aA)), aLeft = V(aF.z, 0, -aF.x);
  const hullAxis = V(Math.cos(BT.ry), 0, -Math.sin(BT.ry));
  const hullPt = (lx, lz, up = 0) => V(BT.x + Math.cos(BT.ry) * lx + Math.sin(BT.ry) * lz, BT.deck + up, BT.z - Math.sin(BT.ry) * lx + Math.cos(BT.ry) * lz);
  const mastFoot = hv(mastFitted.x, mastFitted.y, mastFitted.z);
  const palmSeat = mastFoot.clone().addScaledVector(UP, 0.045).addScaledVector(aLeft, -0.012);
  // the mast in his hand, such that with his palm at palmSeat it stands exactly where it is fitted (so letting go moves nothing)
  const mastInHand = (() => {
    const q = new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(aLeft, aF.clone().negate(), UP));
    const hand = new THREE.Matrix4().compose(palmSeat.clone().sub(PALM.clone().applyQuaternion(q)), q, V(1, 1, 1));
    const fit = new THREE.Matrix4().compose(mastFoot, new THREE.Quaternion().setFromAxisAngle(UP, mastFitted.ry), V(1, 1, 1));
    const p = V(0, 0, 0), r = new THREE.Quaternion(), sc = V(1, 1, 1);
    hand.invert().multiply(fit).decompose(p, r, sc);
    return { p, r };
  })();
  const mastHand = (tt) => {
    const nat = ar.rig.j.armR.hand.localToWorld(PALM.clone());   // (where the action itself has his palm: held up to show)
    const show = sm((tt - 31.15) / 0.45) * (1 - sm((tt - 35.0) / 0.7));
    const lift = tt < 33 ? 0.008 : 0.075 * (1 - sm((tt - 35.75) / 0.45)), side = tt < 33 ? 0.032 : 0;
    return { palm: palmSeat.clone().addScaledVector(UP, lift).addScaledVector(hullAxis, side).lerp(nat, show), fingers: aF, normal: aLeft };
  };
  const onDeck = (lx, rub = 0) => (tt) => ({ palm: hullPt(lx + rub * Math.sin(tt * 5.2), 0, 0.004), fingers: aF.clone().add(V(0, -0.25, 0)), normal: V(0, -1, 0) });
  grip(ar, 'R', -NB - 0.5, 36.95, mastHand, { ein: 0.35, eout: 0.4 });   // (LBA3-RUN: from the notebook on: he is at it all along)
  grip(ar, 'R', 36.85, 53.85, onDeck(0.105, 0.028), { ein: 0.5, eout: 0.35 });
  grip(ar, 'R', 58.2, OPENING_LENGTH, onDeck(0.105, 0.028), { ein: 0.45, eout: 0.01 });
  grip(ar, 'L', -NB - 0.5, 31.3, onDeck(-0.115), { ein: 0.35, eout: 0.4 });
  grip(ar, 'L', 34.9, 53.85, onDeck(-0.115), { ein: 0.5, eout: 0.35 });
  grip(ar, 'L', 58.2, OPENING_LENGTH, onDeck(-0.115), { ein: 0.45, eout: 0.01 });
  // Zoé's tray: her palms on the soil of the two pots she is filling, pressing in turn
  const onPot = (i, ph) => (tt) => { const p = K.pots[i]; return { palm: V(p.x, p.y + 0.006 - 0.006 * Math.max(0, Math.sin(tt * 4.2 + ph)), p.z), fingers: V(0, -0.45, -1), normal: V(0, -1, 0) }; };
  grip(zo, 'L', -NB - 0.5, 39.65, onPot(0, 0), { ein: 0.35, eout: 0.4 });
  grip(zo, 'R', -NB - 0.5, 39.65, onPot(1, Math.PI), { ein: 0.35, eout: 0.4 });
  // the house hums: dust from the beams, everybody looks up; Arthur knows what it is
  at(53.6, () => { sfx('hum'); sfx('rattle'); for (const [x, z] of [[-0.5, 0.5], [1.5, -1.0], [-2.0, -2.0]]) { const p = hx(x, z); g.particles.burst(p.x, 2.85, p.z, '#d8c8a8', 5, 0.4); } });
  at(53.8, () => { look(tw, hv(-0.4, 3.0, 0.2)); look(zo, hv(-1.6, 3.0, -2.0)); play(ar, 'kneelLook'); look(ar, hv(2.0, 3.0, 1.6)); });
  at(54.8, () => { look(ar, head(tw)); look(tw, eyesOf(ar)); look(zo, eyesOf(ar)); });
  at(57.25, () => { look(zo, tapAt()); });   // (her eyes back to the tap first, then she turns)
  at(58.1, () => play(zo, 'reach'));
  at(58.0, () => { look(tw, head(zo)); play(ar, 'kneelWork'); look(ar, null); });
  at(58.6, () => sfx('tapSqueak'));
  at(59.0, () => sfx('gurgle'));
  at(59.2, () => loop('trickle'));
  // (her hand stays at the tap while she looks at the water, then goes straight from the tap to the stream: dropping
  // to the idle between swept it through the basin and the watering can; `from` skips touchWater's ease-in from
  // the arms-down pose, so the hand travels tap → stream instead of dipping to her side and back)
  at(59.2, () => look(zo, V(K.spout.x, STREAM_PALM_Y + 0.05, K.spout.z)));
  at(60.0, () => from(zo, 'touchWater'));
  at(60.45, () => zo.rig.doGesture('start'));   // (the warmth: a small start)
  // her palm under the stream (touchWater's lean; the arm and hand from the grip above)
  bend(zo, 60.0, 66.3, { torso: [0.12], head: [0.05] });
  // down the well (a dip, the cave, a dip back)
  at(62.05, () => fade(true));
  at(62.4, () => {
    g.enterRoom('well', null, true, true);
    g.hero.pos.set(twSpot.x, 0, twSpot.z);     // (the hero stays at home; the room change moved him)
    // the cave's crystal mites stand still while nothing runs them: out of the picture until the prologue
    for (const e of g.enemies || []) if (e.rig?.root && Math.abs(e.pos.x - WR.center.x) < 40) { unseen.push([e, e.rig.root.visible, e.shadow?.visible]); e.rig.root.visible = false; if (e.shadow) e.shadow.visible = false; }
    sfx('hum');
  });
  at(63.9, () => sfx('hum'));
  at(66.1, () => fade(true));
  at(66.5, () => {
    reveal();
    WR.vein.power = 0;
    g.enterRoom('house', twSpot, true, true);
    put(tw, twSpot.x, twSpot.z, 0, 'idle');    // (turned to the table, to put the screwdriver down)
    play(zo, 'idle'); look(zo, head(tw));
  });
  // the decision
  at(66.65, () => play(tw, 'setDown'));
  bend(tw, 66.75, 67.45, { torso: [0.5], kneeL: [0.2], kneeR: [0.2], hipL: [-0.1], hipR: [-0.1], hips: -0.045, shR: [0.06], elR: [0.4] });   // (down to the table top; NO-AIR: lower, so his hand gets all the way down to where the tool lies)
  at(67.15, () => { rest(TB.screwdriver, R.group, { x: sdRest.x, y: sdRest.y, z: sdRest.z, ry: sdRest.ry }); sfx('put'); });
  at(68.85, () => look(zo, tapAt()));
  at(69.0, () => play(zo, 'reach'));
  at(69.45, () => sfx('tapSqueak'));
  at(69.85, () => stopLoop('trickle'));
  at(69.8, () => look(zo, head(tw)));
  at(70.0, () => { zo.rig.blendT = 0.45; });   // (the arm comes down from the tap with the turn, not in a frame)
  at(72.4, () => look(zo, head(tw)));     // (over her shoulder, walking: "Take your magic ball.")
  at(74.3, () => { look(zo, null); look(tw, head(zo)); });
  // the front door: the game's door transition (a dip to black, the door, and she is outside)
  // (the notebook cut: the picture comes back on Twinsen as the door shuts behind her; the shot of her outside, under the
  //  title, is cut, and the title is over the island. The clock drops the events from 75.2 to 81.6 s)
  at(74.85, () => fade(true));
  at(75.2, () => {
    sfx('door');
    stopLoop('room');
    g.exitRoom({ ...homeOut, a: home.ry }, true, true);
    cine.focus = V(homeOut.x, 0, homeOut.z);
    // (the hero waits inside, out of sight; the exit moved him to the door)
    put(tw, twEnd.x, twEnd.z, twEndA + 0.6, 'idle'); look(tw, null);
    loop('lap', { quiet: true });
  });
  at(76.4, () => document.querySelector('#cine-title').classList.add('show'));
  at(81.0, () => document.querySelector('#cine-title').classList.remove('show'));
  at(81.25, () => fade(true));
  at(81.6, NBCUT ? () => {
    sfx('door');
    zoe.setPresent(false);            // (she is at the neighbours' door; finish() places her there)
    cine.focus = null;
    put(tw, twEnd.x, twEnd.z, twEndA + 0.6, 'idle'); look(tw, null);
  } : () => {
    stopLoop('lap');
    g.enterRoom('house', twEnd, true, true);
    zoe.setPresent(false);            // (she is at the neighbours' door; finish() places her there)
    cine.focus = null;
    put(tw, twEnd.x, twEnd.z, twEndA + 0.6, 'idle');
    loop('room');
  });
  at(82.0, () => look(tw, cupboard));

  // the dips' way back up, on the scene's clock (R5: they were wall-clock timers, outside the timeline: they ran on
  // under a pause, and never inside a test's stepped frames, where the picture then read as black from 28.6 s on and
  // the per-frame checks "while the picture is up" covered only the harbour)
  for (const tt of [29.04, 62.44, 66.54, 75.26, 81.64]) at(tt, () => fade(false));
  // footsteps while walking: on the boards (house), on the lane (outside)
  // (OPEN-FILM: each step is heard as the foot comes down — the ankle's lowest point after a lift of 5 cm or more — on the
  // floor the game gives that spot (wood in the house, the lane's stone, a path's dirt), as the player's own steps are. They
  // were a metronome, 2.6 a second whatever the feet did: 21 sounds for her 19 footfalls, 12 of those with no sound within 0.1 s.)
  const steps = (a, t0, t1) => {
    const F = { L: { h: null, hi: -1, down: false }, R: { h: null, hi: -1, down: false } };
    const _p = V(0, 0, 0);
    track(t0, t1, (k, tt, dt) => {
      if (!(dt > 0) || !a.rig.root.visible) return;
      const fl = g.physics.groundAt(a.pos.x, a.pos.z), walking = a.rig.anim === 'walk';
      for (const sd of ['L', 'R']) {
        const h = a.rig.j['leg' + sd].foot.getWorldPosition(_p).y - fl, f = F[sd];
        if (f.h != null && walking) {
          if (h < f.h) f.down = true;
          else if (f.down) { f.down = false; if (f.hi - f.h > 0.05) sfx('step-' + (g.surfaceAt?.(a.pos) || 'stone')); f.hi = f.h; }
          f.hi = Math.max(f.hi, h);
        } else { f.hi = h; f.down = false; }
        f.h = h;
      }
    });
  };
  steps(zo, 39.95, 41.0);
  steps(zo, 71.0, 75.0);
  steps(zo, 75.3, 81.2);

  function reveal() { for (const [e, v, sv] of unseen.splice(0)) { e.rig.root.visible = v; if (e.shadow && sv != null) e.shadow.visible = sv; } }
  function stopLoop(name) { for (const h of loops) if (h.name === name) h.stop(); }

  // ---------------------------------------------------------------- the notebook (LBA3-RUN), on the scene's clock
  // Twinsen at the table where he will mend the lamp, his old sketchbook open in his hands: the camera over his right
  // shoulder; his right hand turns the pages by their corner, his left holds the book. Two spreads of the history, a cut to
  // his face (twelve years on: where and when), the last page (the island, in pencil); the camera comes down onto it and
  // the drawing turns into the real island (a picture of the page laid over the screen, faded out over the aerial).
  const NBX = !NBCUT ? null : (() => {
  const NBK = drawNotebook();
  const PW = 0.17, PH = 0.238, H0 = 0.0103, SEG = 18;
  const nbTex = [], nbMats = [], nbGeos = [];
  const ntex = (c) => { const tx = new THREE.CanvasTexture(c); tx.colorSpace = THREE.SRGBColorSpace; tx.anisotropy = 8; nbTex.push(tx); return tx; };
  const nmat = (o) => { const m = new THREE.MeshStandardMaterial({ roughness: 0.9, metalness: 0, ...o }); nbMats.push(m); return m; };
  const book = new THREE.Group(); book.name = 'openingNotebook'; book.userData.keep = true;   // (its leaves move: never batched)
  {
    const cover = nmat({ map: ntex(NBK.cover), roughness: 0.75 }), edge = nmat({ color: '#e6d8b8' });
    const box = (w, h, d, m, x, y) => { const g2 = new THREE.BoxGeometry(w, h, d); nbGeos.push(g2); const me = new THREE.Mesh(g2, m); me.position.set(x, y, 0); book.add(me); };
    for (const sd of [-1, 1]) { box(PW + 0.008, 0.003, PH + 0.012, cover, sd * (PW + 0.008) / 2, 0.0015); box(PW, 0.007, PH, edge, sd * PW / 2, 0.0065); }
    box(0.014, 0.005, PH + 0.012, cover, 0, 0.0015);
  }
  const PAPER = '#e2d9ca';   // (the paper's own white under the room's lamp: the canvases are already light)
  const flatPage = (c, x0) => { const g2 = new THREE.PlaneGeometry(PW, PH); g2.rotateX(-Math.PI / 2); nbGeos.push(g2); const me = new THREE.Mesh(g2, nmat({ map: ntex(c), color: PAPER })); me.position.set(x0, H0, 0); book.add(me); return me; };
  flatPage(NBK.L1, -PW / 2); flatPage(NBK.R3, PW / 2);
  // a leaf: front and back, bent across its width as it goes over (the free edge leads as it lifts, lags as it lands);
  // layR / layL: how far over the page under it it lies on the right / on the left
  const bendAt = (th, u) => th + 0.45 * Math.sin(2 * th) * u;
  const leaf = (front, back, layR, layL) => {
    const pos = new THREE.BufferAttribute(new Float32Array((SEG + 1) * 2 * 3), 3), uvF = [], uvB = [], idx = [];
    for (let i = 0; i <= SEG; i++) { const u = i / SEG; uvF.push(u, 1, u, 0); uvB.push(1 - u, 1, 1 - u, 0); }
    for (let i = 0; i < SEG; i++) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 2, a + 1, a + 3); }
    const side = (uv, c, s) => { const g2 = new THREE.BufferGeometry(); g2.setAttribute('position', pos); g2.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g2.setIndex(idx); nbGeos.push(g2); const tx = ntex(c); const me = new THREE.Mesh(g2, nmat({ map: tx, side: s, color: PAPER })); me.frustumCulled = false; book.add(me); return { me, tx }; };
    const F = side(uvF, front, THREE.FrontSide), B = side(uvB, back, THREE.BackSide);
    const L = { F, B, th: null, layR, layL };
    L.set = (th) => {
      if (th === L.th) return; L.th = th;
      const lay = H0 + (th < Math.PI / 2 ? layR : layL), ds = PW / SEG;
      let x = 0, y = 0;
      for (let i = 0; i <= SEG; i++) {
        pos.setXYZ(i * 2, x, lay + y, -PH / 2); pos.setXYZ(i * 2 + 1, x, lay + y, PH / 2);
        const ph = bendAt(th, (i + 0.5) / SEG); x += Math.cos(ph) * ds; y += Math.sin(ph) * ds;
      }
      pos.needsUpdate = true;
      F.me.geometry.computeVertexNormals();
      if (!B.me.geometry.getAttribute('normal')) B.me.geometry.setAttribute('normal', F.me.geometry.getAttribute('normal'));
      F.me.geometry.computeBoundingSphere();
    };
    // a point on the leaf, s along it from the spine and z across (book-local), with the leaf's normal there
    L.at = (s, z, th = L.th ?? 0) => {
      const n = Math.max(1, Math.round(s / (PW / SEG))), ds = s / n;
      let x = 0, y = 0, ph = th;
      for (let i = 0; i < n; i++) { ph = bendAt(th, ((i + 0.5) * ds) / PW); x += Math.cos(ph) * ds; y += Math.sin(ph) * ds; }
      return { p: V(x, H0 + (th < Math.PI / 2 ? layR : layL) + y, z), n: V(-Math.sin(ph), Math.cos(ph), 0), along: V(Math.cos(ph), Math.sin(ph), 0) };
    };
    return L;
  };
  const leafA = leaf(NBK.R1, NBK.L2, 0.0016, 0.0008), leafB = leaf(NBK.R2, NBK.L3, 0.0008, 0.0016);
  leafA.set(0); leafB.set(0);
  // the trail of dashes from the teleporter's stamp: on the left page, then on the first leaf
  const trail = (pts, x0, y0) => {
    const out = [], P = pts.map(([a, b]) => [x0 + (a / NB_PX) * PW, -PH / 2 + (b / NB_PY) * PH]);
    let carry = 0;
    for (let i = 1; i < P.length; i++) {
      const [ax, az] = P[i - 1], [bx, bz] = P[i], L = Math.hypot(bx - ax, bz - az), dx = (bx - ax) / L, dz = (bz - az) / L;
      for (let s = carry; s < L; s += 0.0052) {
        const cx = ax + dx * s, cz = az + dz * s, hl = 0.0014, hw = 0.00055;
        const q = [[cx - dx * hl - dz * hw, cz - dz * hl + dx * hw], [cx + dx * hl - dz * hw, cz + dz * hl + dx * hw], [cx + dx * hl + dz * hw, cz + dz * hl - dx * hw], [cx - dx * hl + dz * hw, cz - dz * hl - dx * hw]];
        for (const k of [0, 1, 2, 0, 2, 3]) out.push(q[k][0], y0, q[k][1]);
        carry = s + 0.0052 - L;
      }
    }
    const g2 = new THREE.BufferGeometry(); g2.setAttribute('position', new THREE.Float32BufferAttribute(out, 3)); g2.computeVertexNormals(); nbGeos.push(g2);
    const me = new THREE.Mesh(g2, nmat({ color: '#2b2118', polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }));
    me.geometry.setDrawRange(0, 0); book.add(me);
    return { me, n: out.length / 18 };
  };
  const trailL = trail(NB_TRAIL.L, -PW, H0 + 0.0003), trailR = trail(NB_TRAIL.R, 0, H0 + 0.0016 + 0.0003);
  // (the dashes reach the clones with the first caption, Twinsen with the second; at the first turn the leaf's own dashes
  // are drawn into its page, which carries them over)
  const CLONES = 0.52;   // (the share of the left page's dashes up to the clones)
  const showDashes = (n) => {
    const a = n < 1.0 ? 0 : n < 3.6 ? CLONES * sm((n - 1.0) / 2.6) : n < 4.1 ? CLONES : CLONES + (1 - CLONES) * Math.min(1, (n - 4.1) / 1.6);
    trailL.me.geometry.setDrawRange(0, Math.round(a * trailL.n) * 6);
    trailR.me.geometry.setDrawRange(0, Math.round(Math.max(0, Math.min(1, (n - 5.7) / 0.9)) * trailR.n) * 6);
  };
  const bakeTrail = () => {
    const x = NBK.r1, P = NB_TRAIL.R;
    x.save(); x.strokeStyle = '#2b2118'; x.lineWidth = 3.4; x.lineCap = 'butt'; x.setLineDash([9.8, 8.6]);
    x.beginPath(); x.moveTo(P[0][0], P[0][1]); for (const [a, b] of P.slice(1)) x.lineTo(a, b); x.stroke(); x.restore();
    leafA.F.tx.needsUpdate = true; trailR.me.visible = false;
  };
  // where the book is: open on the table's free west end, square to him (he stands at the table's north side, west of where
  // he mends the lamp; the harbour's cut moves him there). Pages face up, so the camera can look straight down on them
  const nbSpot = hx(-0.95, -0.2), NB_A = -0.06;
  const placeBook = () => {
    const a = NB_A, f = V(Math.sin(a), 0, Math.cos(a)), X = V(-Math.cos(a), 0, Math.sin(a)), Y = V(0, 1, 0), Z = f.clone().negate();
    const c = hv(-0.95, TB.top + 0.0005, 0.31);
    BM.makeBasis(X, Y, Z).setPosition(c);
    book.quaternion.setFromRotationMatrix(BM);
    book.position.set(c.x - R.center.x, c.y, c.z - R.center.z);   // (the room's group stands at its centre, unturned)
    R.group.add(book); temps.push(book);
  };
  // (the book's own world frame, kept here: the shots and grips ask for it on frames the scene graph's matrices haven't
  // been brought up to date yet — the test's unrendered steps)
  const BM = new THREE.Matrix4();
  const bw = (x, y, z) => V(x, y, z).applyMatrix4(BM);
  const bd = (v) => v.clone().transformDirection(BM);
  // the turns: [start, leaf]; each 0.85 s: the corner lifts (0.25 s), the leaf goes over, lands
  const TURNS = [[7.05, leafA], [15.3, leafB]], TT = 0.85;
  const thetaAt = (n, t0) => { const u = (n - t0) / TT; return u <= 0 ? 0 : u >= 1 ? Math.PI : u < 0.3 ? 0.3 * sm(u / 0.3) : 0.3 + (Math.PI - 0.3) * sm((u - 0.3) / 0.7); };
  trackN(0, NB_END, (k, n) => {
    if (k < 1 && TOPDOWN(n)) g.camera.up.copy(bd(V(0, 0, -1))); else g.camera.up.set(0, 1, 0);   // (the engine's lookAt follows it)
    for (const [t0, L] of TURNS) L.set(thetaAt(n, t0));
    showDashes(n);
    if (n > TURNS[0][0] + TT) trailL.me.visible = false;   // (under the first leaf now)
  });
  // his hands (grips on the old clock: o = n - NB). The left holds the left board's edge, the palm against it, the
  // fingers over the margin; the right the same on its side, and turns the pages by the corner nearest him
  const gripN = (side, n0, n1, target, o) => grip(tw, side, n0 - NB, n1 - NB, (tt) => target(tt + NB), o);
  // (his hands rest on the table either side of the book, near its edge — at the frame's foot, the pages clear; the right
  //  one goes to a page's corner to turn it)
  const edgeHold = (sd) => () => ({ palm: bw(sd * (PW + 0.05), 0.012, 0.118), fingers: bd(V(-sd * 0.3, -0.05, -1)).normalize(), normal: bd(V(0, -1, 0)) });
  // (the corner where the leaf is at this very moment: the leaf itself is bent by a track that runs after the hands')
  const corner = (L, t0) => (n) => {
    const c = L.at(0.88 * PW, 0.3 * PH, thetaAt(n, t0));
    return { palm: c.p.clone().addScaledVector(c.n, 0.009).applyMatrix4(BM), fingers: bd(c.along.clone().multiplyScalar(-0.45).add(V(0, 0, -1))).normalize(), normal: bd(c.n.clone().negate()) };
  };
  gripN('L', -0.5, 16.35, edgeHold(-1), { ein: 0.3, eout: 0.5 });
  gripN('R', -0.5, 6.75, edgeHold(1), { ein: 0.3, eout: 0.35 });
  gripN('R', 6.45, 7.75, corner(leafA, TURNS[0][0]), { ein: 0.35, eout: 0.3 });
  gripN('R', 7.6, 14.95, edgeHold(1), { ein: 0.45, eout: 0.35 });
  gripN('R', 14.65, 15.95, corner(leafB, TURNS[1][0]), { ein: 0.35, eout: 0.3 });
  // (the last page turned, he straightens and lets go, his eyes still on the drawing)
  atN(15.95, () => { play(tw, 'idle'); tw.rig.blendT = 0.6; });
  const bookMid = () => bw(0, 0.01, 0.01);
  // (bent over the book a little more than the tinkering pose, so his hands reach the table top beside it and its pages'
  //  corners: from the tinkering pose they stopped 5-8 cm short; straightening as he lets go, 15.95)
  bend(tw, -NB - 0.5, 15.95 - NB, { torso: [0.2], hips: -0.02, kneeL: [0.08], kneeR: [0.08] });
  atN(0, () => look(tw, bookMid()));
  for (const [t0] of TURNS) { atN(t0, () => sfx('paper')); atN(t0 + TT - 0.08, () => sfx('paper')); }
  atN(TURNS[0][0], bakeTrail);
  // the cut to his face: a smile at the children; a look over at his own son at his boat; back to the book
  atN(13.55, () => tw.rig.setFace('pleased', 0.6, 2.4));
  atN(14.15, () => look(tw, eyesOf(ar)));
  atN(14.9, () => look(tw, bookMid()));
  // the camera: over his right shoulder (book-local), easing in a little over the two spreads; his face from across the
  // table; back over the book and down onto the last page until its drawing fills the frame
  // (from above his right shoulder, not in his way: the book's pages face him, so this is the one side they read from)
  // (straight down on the pages, turned so their top is the frame's top — the camera's `up` is the page's — his hands coming
  //  in from below. Over his shoulder his head hid the book: he stands over it; from his side the pages lay across the frame)
  const overBook = (u) => P(bw(0, 0.62 - 0.04 * u, 0.03), bw(0, 0, 0.004), 34 - 1.5 * u);
  const nearBook = () => P(bw(0, 0.5, 0.015), bw(0, 0, 0.002), 33);
  const TOPDOWN = (n) => n < 13.4 || (n >= 16.2 && n < NB_END);
  const lerpP = (A, B2, k) => P(A.pos.clone().lerp(B2.pos, k), A.look.clone().lerp(B2.look, k), A.fov + (B2.fov - A.fov) * k);
  shots.unshift(
    { t0: 0, t1: 13.4, from: () => overBook(sm(cine.t / 13.4)), to: null },
    // (his face from the front and to his left: Arthur's side, so his look over at his son turns his face to us)
    { t0: 13.4, t1: 16.2, from: P(hv(-0.42, 1.46, 1.62), hv(-0.97, 1.5, -0.2), 36), to: P(hv(-0.45, 1.47, 1.54), hv(-0.97, 1.52, -0.2), 35) },
    { t0: 16.2, t1: NB_END, from: () => lerpP(overBook(1), nearBook(), sm((cine.t - 16.2) / 0.7)), to: null },
  );
  // the drawing turns into the island: a picture of the last spread laid over the screen exactly where the page is (a
  // projective transform of its four corners), faded in over the lit page; it opens out to fill the screen; the scene
  // changes under it (the aerial, old 8 s); it fades away over the island
  let overlay = null;
  const dropOverlay = () => { overlay?.remove(); overlay = null; };
  const quadCss = (w, h, q) => {   // (the CSS matrix3d taking a w × h box onto the quad q: TL, TR, BR, BL, in px)
    const [[x0, y0], [x1, y1], [x2, y2], [x3, y3]] = q, dx1 = x1 - x2, dx2 = x3 - x2, dx3 = x0 - x1 + x2 - x3, dy1 = y1 - y2, dy2 = y3 - y2, dy3 = y0 - y1 + y2 - y3;
    const det = dx1 * dy2 - dx2 * dy1, G = det ? (dx3 * dy2 - dx2 * dy3) / det : 0, Hh = det ? (dx1 * dy3 - dx3 * dy1) / det : 0;
    const a = x1 - x0 + G * x1, b = x3 - x0 + Hh * x3, d = y1 - y0 + G * y1, e = y3 - y0 + Hh * y3;
    return `matrix3d(${a / w},${d / w},0,${G / w},${b / h},${e / h},0,${Hh / h},0,0,1,0,${x0},${y0},0,1)`;
  };
  const OV0 = 16.9, OV1 = 17.0, OV2 = 17.55;
  trackN(OV0, NB_END + 1.45, (k, n) => {
    if (k >= 1) { dropOverlay(); return; }
    const c = NBK.S3, W0 = innerWidth, H1 = innerHeight;
    if (!overlay) {
      overlay = document.createElement('div'); overlay.id = 'opening-page';
      overlay.style.cssText = 'position:absolute;inset:0;pointer-events:none;overflow:hidden;opacity:0';
      c.style.cssText = 'position:absolute;left:0;top:0;transform-origin:0 0;filter:sepia(0.3) saturate(1.15) brightness(0.93)';   // (about the lit page's tone)
      overlay.appendChild(c); document.querySelector('#cine').prepend(overlay);
    }
    const cam = g.camera; cam.updateMatrixWorld();
    const scr = (v) => { v.project(cam); return [(v.x + 1) / 2 * W0, (1 - v.y) / 2 * H1]; };
    const q0 = [scr(bw(-PW, H0, -PH / 2)), scr(bw(PW, H0, -PH / 2)), scr(bw(PW, H0, PH / 2)), scr(bw(-PW, H0, PH / 2))];
    const sc = Math.max(W0 / 1120, H1 / 630), cx = W0 / 2, cy = H1 / 2;   // (the drawing's 16:9 frame over the screen)
    const q1 = [[cx - 600 * sc, cy - 420 * sc], [cx + 600 * sc, cy - 420 * sc], [cx + 600 * sc, cy + 420 * sc], [cx - 600 * sc, cy + 420 * sc]];
    const e = sm((n - OV1) / (OV2 - OV1)), q = q0.map((p, i) => [p[0] + (q1[i][0] - p[0]) * e, p[1] + (q1[i][1] - p[1]) * e]);
    c.style.transform = quadCss(c.width, c.height, q);
    overlay.style.opacity = String(n < NB_END ? Math.min(1, (n - OV0) / 0.2) : Math.max(0, 1 - sm((n - NB_END) / 1.3)));
  });
  // the title over the island
  atN(18.2, () => document.querySelector('#cine-title').classList.add('show'));
  atN(21.2, () => document.querySelector('#cine-title').classList.remove('show'));
  // ...and at the island (old 8 s): the house hidden, the book put away; Twinsen to the lamp, the screwdriver in his hand
  at(8.0, () => {
    stopLoop('room');
    g.exitRoom({ ...HP(-80, -4), a: 0 }, true, true);
    cine.focus = harbourFocus;
    book.visible = false;
    play(tw, 'tinker'); look(tw, null);   // (he goes to the lamp under the dip at old 29 s, where the film puts him)
    hold(TB.screwdriver, tw, [0, -0.05, 0.02], [-0.3, 0, Math.PI / 2]);
    tipLocal.set(-0.23, 0.016, 0).applyEuler(sdv.rotation).add(sdv.position); axisLocal.set(-1, 0, 0).applyEuler(sdv.rotation).normalize();
  });
  return {
    start: () => { put(tw, nbSpot.x, nbSpot.z, NB_A, 'tinker'); placeBook(); leafA.set(0); leafB.set(0); showDashes(0); },
    dispose: () => { dropOverlay(); for (const x of [...nbGeos, ...nbMats, ...nbTex]) x.dispose(); },
    test: { book, leaves: [leafA.F.me, leafB.F.me], turns: TURNS.map(([t0]) => t0), turnLen: TT, end: NB_END },
  };
  })();

  // ---------------------------------------------------------------- lines (each speaker babbles in their own voice)
  const C = { zoe: '#ffb0d0', hero: '#8fc2ff', arthur: '#ffe070', worker: '#9fe0d8', resident: '#e8d8a0' };
  const subs = [];
  // say(at, speaker, text key, seconds, the actor who talks; beat: the line's one gesture, or none)
  // (OPEN-FILM: the rig's `talk` swung the arms on a 1.3 s sine for as long as a line lasted, and nodded the head at 1.1 Hz:
  // hands talking on a loop, the same for every line. A line now has at most one gesture of its own — beat(actor, at,
  // seconds, joint offsets): a small wind-up the other way, the move, a hold while the words that carry it are said, and a
  // settle — and the head moves with the voice itself (speech, in the rig track below); the body stays in its idle.)
  const say = (tt, id, key, d, a = null, beat = null) => {
    subs.push({ t: newOf(tt), d, who: t('n_' + id), color: C[id], text: t(key), voice: 'n_' + id });
    if (a && beat) gest(a, tt + (beat.at ?? 0.15), beat.d ?? Math.min(d - 0.5, voiceSeconds(t(key), d, 'n_' + id)), beat.o);
  };
  say(14.6, 'resident', 'op_res_1', 2.3, resident, { at: 0.35, d: 1.2, o: { shR: [-0.55, 0, -0.3], elR: [-2.0], head: [0.03, 0, 0.07] } });   // (NO-AIR: a thumb back over his shoulder at the harbour row; it was both forearms held up in front of him, as if he carried something)
  say(16.95, 'worker', 'op_wk_1', 2.6, worker);   // (his hand stays on the lift's control; ends with the cut to the drill at 19.6)
  say(24.0, 'resident', 'op_res_2', 1.7, resident, { at: 0.1, d: 1.1, o: { shL: [-0.62, 0, 0.22], elL: [-0.45], head: [-0.08, 0, 0.06] } });   // (an open hand up, toward the hum)
  say(25.8, 'worker', 'op_wk_2', 2.4, worker);
  say(31.3, 'arthur', 'op_ar_1', 1.8, ar);
  say(33.2, 'hero', 'op_tw_0', 1.9, tw, { at: 0.55, d: 0.95, o: { shR: [-0.62, 0, -0.08], elR: [0.12] } });   // ("Now the sail.": the screwdriver at the boat)
  say(45.4, 'zoe', 'op_zoe_1', 2.5, zo, { at: 0.75, d: 0.95, o: { shL: [0.32, 0, 0.22], elL: [-0.75], head: [0, 0, -0.06] } });   // ("The tap's stopped": a hand back at it, and a glance)
  at(46.1, () => look(zo, tapAt()));
  at(46.8, () => look(zo, head(tw)));
  say(48.3, 'hero', 'op_tw_1', 2.4, tw, { at: 0.2, d: 1.6, o: { shR: [-0.5, 0, -0.1], elR: [-0.55] } });   // (the screwdriver's hand, toward the tap)
  say(51.0, 'zoe', 'op_zoe_2', 1.8, zo, { at: 0.15, d: 0.85, o: { shL: [-0.4, 0, 0.16], elL: [-0.75], head: [0.04, 0, 0.08] } });   // (one open hand, dry)
  say(54.8, 'arthur', 'op_ar_2', 3.8, ar);   // (70 characters: 18 a second, readable; it runs on over the cut to the tap)
  say(60.4, 'zoe', 'op_zoe_3', 2.0, zo);   // (as her hand feels it; it was 60.6 for 1.8 s and its voice ran on 0.2 s after the text)
  say(67.9, 'hero', 'op_tw_2', 1.7, tw);   // (decided: a nod, no hands)
  at(68.0, () => tw.rig.doGesture('nod'));
  say(69.6, 'zoe', 'op_zoe_4', 1.7, zo);
  say(72.3, 'zoe', 'op_zoe_5', 2.55, zo);

  // where and when: two captions over the island
  // (P83 / S-7: then who, for a newcomer: Sendell, FunFrock and his clones. The first caption was up 7.0 s for 70
  //  characters; 5.0 leaves the second about 17 characters a second, ending 0.8 s before the resident's first line)
  // (LBA3-RUN: the history over the notebook's pages, a line at a time (about 15 characters a second, a short gap between
  //  them so each one reads as new); then where and when over his face, twelve years on)
  const caps = NBCUT ? [
    { t: 0.5, d: 3.2, text: t('op_nb_1'), cls: 'recap' }, { t: 3.9, d: 3.1, text: t('op_nb_2'), cls: 'recap' },
    { t: 7.95, d: 2.6, text: t('op_nb_3'), cls: 'recap' }, { t: 10.75, d: 2.65, text: t('op_nb_4'), cls: 'recap' },
    { t: 13.65, d: 3.2, text: t('op_cap_place'), sub: t('op_cap_time') },
  ] : [{ t: 1.6, d: 5.0, text: t('op_cap_place'), sub: t('op_cap_time') }, { t: 7.0, d: 6.8, text: t('op_cap_lore'), sub: t('op_cap_lore_sub') }];

  // ---------------------------------------------------------------- prepare / finish
  let stationWas = false;
  const cine = new Cinematic(g, {
    length: OPENING_LENGTH,
    events: ev, tracks, shots, subs, caps,
    music: { name: CK.MUSIC, at: MUSIC_AT },
    async prepare(c) {
      g.audio.setMood(null);                   // the title music fades out under the black
      stationWas = !!W.station.active;
      for (const a of [zoe, arthur]) a.controlled = true;
      if (NBCUT) {
        // (the notebook cut: the notebook first, at home; the harbour from the aerial on, old 8 s. The hero at the table
        //  with his notebook; the screwdriver lies there until the cut to the island)
        g.enterRoom('house', twSpot, true, true);
        c.focus = null;
        NBX.start();
        loop('room');
      } else {
        g.exitRoom({ ...HP(-80, -4), a: 0 }, true, true);
        c.focus = harbourFocus;
        // the hero is at home (out of sight while the camera is at the harbour)
        put(tw, twSpot.x, twSpot.z, 0, 'tinker');
        hold(TB.screwdriver, tw, [0, -0.05, 0.02], [-0.3, 0, Math.PI / 2]);
        tipLocal.set(-0.23, 0.016, 0).applyEuler(sdv.rotation).add(sdv.position); axisLocal.set(-1, 0, 0).applyEuler(sdv.rotation).normalize();
      }
      setScrew(0);
      put(zo, zoTray.x, zoTray.z, Math.PI, 'potting');
      put(ar, R.npcSpots.arthur.x, R.npcSpots.arthur.z, R.npcSpots.arthur.a, 'kneelWork');
      { const hand = ar.rig.j.armR.hand; ar.rig.root.updateMatrixWorld(true);   // (in his fist, upright: mastInHand)
        const hs = hand.getWorldScale(V(0, 0, 0)).x || 1;
        hand.add(BT.mast); BT.mast.position.copy(mastInHand.p).divideScalar(hs); BT.mast.quaternion.copy(mastInHand.r); BT.mast.scale.setScalar(1 / hs); }
      zoe.setPresent(true);
      R.group.add(flats); temps.push(flats); setFade(1);
      WR.group.add(caveFlat); temps.push(caveFlat);
      put(worker, wkSpot.x, wkSpot.z, angleTo({ pos: wkSpot }, column), 'idle');
      put(resident, resSpot.x, resSpot.z, Math.atan2(wkSpot.x - resSpot.x, wkSpot.z - resSpot.z), 'idle');
      L.pose(0); L.shake(0); W.boatSurge = 0; WR.vein.power = 0;
      handle.rotation.y = 0; water(0);
      // compile every material the scene will show while the screen is still black
      const r = g.renderer.renderer;
      R.group.visible = true; WR.group.visible = true; W.root.visible = true;
      try { await (r.compileAsync ? r.compileAsync(g.scene, g.camera) : r.compile(g.scene, g.camera)); } catch { /* the first frames compile instead */ }
      WR.group.visible = false;
      if (NBCUT) W.root.visible = false; else R.group.visible = false;   // (as the game's room leaves them: in the house, or outside)
      // the cue decoded before the picture starts, so it can enter on time
      if (g.audio.ctx) await Promise.race([Promise.resolve(g.audio.music.ready).then(() => g.audio.music.load(CK.MUSIC)), new Promise((res) => setTimeout(res, 5000))]);
    },
    finish(skipped) {
      // (the scene's pose layers off every joint: the gameplay rig never turns a hand bone, so a grip's hand turn would stay)
      for (const a of cast) { restore(a); applyBend(a, -1); a._bend = null; a._feet = null; a.rig.turn = 0; a._spF = a._spS = 0; }
      g.camera.up.set(0, 1, 0);   // (the notebook's straight-down view turns the camera's up to the page's top)
      for (const h of loops) h.stop(skipped ? 0.2 : 0.8);
      for (const o of temps) o.parent?.remove(o);
      for (const g2 of [flats, caveFlat]) g2.traverse((o) => o.geometry?.dispose()); for (const m of setMats) m.dispose();
      NBX?.dispose();   // (the notebook)
      for (const a of cast) { a.rig.lookAt = null; a._speed = 0; a.rig.noFidget = false; if (a._plantLite != null) a.rig.plantLite = a._plantLite; if (a._contact) a.rig.contact = a._contact; }
      if (skipped) { g.audio.endCue(); }
      document.querySelector('#fade').classList.remove('quick');
      document.querySelector('#cine-title').classList.remove('show');
      // the house as the player finds it
      if (g.room !== R) g.enterRoom('house', twEnd, true, true);
      cine.focus = null;
      rest(TB.screwdriver, R.group, sdRest);
      rest(BT.mast, R.group, mastFitted); setScrew(SCREW_END);
      handle.rotation.y = 0; water(0); steam.forEach((s) => (s.visible = false));
      L.pose(1); L.shake(0); W.boatSurge = 0; WR.vein.power = 0;
      W.station.setActive(stationWas);
      reveal();
      for (const a of [zoe, arthur]) a.controlled = false;
      if (xil) { xil.listenTo = null; xil.rig.lookAt = null; }
      put(tw, twEnd.x, twEnd.z, twEndA, 'idle');
      story.cur.afterOpening();   // flags, the family's places, control, objective (with the ball step), save
    },
  });
  cine.extras = { worker, resident };   // (the scene-only cast, for the tests' per-frame checks)
  cine.speakers = { n_worker: worker, n_resident: resident };   // (OPEN-FILM: their mouths move with their voices: voice.js driveMouth)
  cine.notebook = NBX?.test ?? null;   // (LBA3-RUN: for the tests)
  cine.clock = { cut: CK.cut, nb: NB, d2: CK.D2 };
  return cine;
}

// ---------------------------------------------------------------- the notebook's pages (LBA3-RUN)
// Twinsen's own sketchbook, drawn here on canvases (ink, pencil, a little wash on cream paper): no picture or sound from
// LBA1/LBA2, only what their stories say. A page is NB_PX × NB_PY; `S3` is the last spread, both pages in one picture (the
// island seen from the sea, as the film's aerial sees it when the drawing turns into the real view). No words on the
// pages: the captions carry the words, in every language.
export const NB_PX = 600, NB_PY = 840;
// the trail's dashes (page pixels): from the teleporter's stamp past the clones (first caption), on over the gutter to
// Twinsen (the second)
export const NB_TRAIL = {
  L: [[176, 300], [128, 372], [110, 446], [150, 520], [220, 566], [262, 612], [236, 690], [262, 770], [380, 806], [520, 800], [600, 786]],
  R: [[0, 786], [96, 770], [178, 734], [250, 690], [318, 660], [356, 652]],
};
export function drawNotebook() {
  let seed = 7;
  const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  const mk = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return [c, c.getContext('2d')]; };
  const INK = '#2b2118', PEN = '#4a4650';
  const paper = (x, W, H, gutter) => {
    x.fillStyle = '#f0e4c6'; x.fillRect(0, 0, W, H);
    for (let i = 0; i < W * H / 260; i++) { x.fillStyle = rnd() < 0.5 ? 'rgba(120,90,40,0.045)' : 'rgba(255,255,255,0.06)'; x.fillRect(rnd() * W, rnd() * H, 1 + rnd() * 2, 1 + rnd() * 2); }
    for (let i = 0; i < 5; i++) { const gx = rnd() * W, gy = rnd() * H, g = x.createRadialGradient(gx, gy, 4, gx, gy, 60 + rnd() * 120); g.addColorStop(0, 'rgba(170,130,70,0.05)'); g.addColorStop(1, 'rgba(170,130,70,0)'); x.fillStyle = g; x.fillRect(0, 0, W, H); }
    const e = x.createLinearGradient(0, 0, 0, H); e.addColorStop(0, 'rgba(120,80,30,0.10)'); e.addColorStop(0.06, 'rgba(120,80,30,0)'); e.addColorStop(0.94, 'rgba(120,80,30,0)'); e.addColorStop(1, 'rgba(120,80,30,0.12)'); x.fillStyle = e; x.fillRect(0, 0, W, H);
    for (const gx of gutter) {   // (the fold: shade toward the spine)
      const g = x.createLinearGradient(gx, 0, gx + (gx === 0 ? 70 : -70), 0); g.addColorStop(0, 'rgba(80,55,25,0.30)'); g.addColorStop(1, 'rgba(80,55,25,0)'); x.fillStyle = g; x.fillRect(gx === 0 ? 0 : gx - 70, 0, 70, H);
    }
  };
  // a hand-drawn line through points: two light passes, a little off each other
  const line = (x, pts, { w = 2.2, col = INK, jit = 1.4, passes = 2, close = false, alpha = 0.9, sharp = false } = {}) => {
    x.save(); x.strokeStyle = col; x.lineCap = 'round'; x.lineJoin = 'round'; x.globalAlpha = alpha;
    for (let p = 0; p < passes; p++) {
      const J = () => (rnd() - 0.5) * jit * 2, q = pts.map(([a, b]) => [a + J(), b + J()]);
      if (close) q.push(q[0]);
      x.lineWidth = w * 1.5 * (p ? 0.6 : 1);   // (read on a page a third of the screen wide)
      x.beginPath(); x.moveTo(q[0][0], q[0][1]);
      for (let i = 1; i < q.length - 1; i++) if (sharp) x.lineTo(q[i][0], q[i][1]); else x.quadraticCurveTo(q[i][0], q[i][1], (q[i][0] + q[i + 1][0]) / 2, (q[i][1] + q[i + 1][1]) / 2);
      x.lineTo(q[q.length - 1][0], q[q.length - 1][1]); x.stroke();
    }
    x.restore();
  };
  const wash = (x, pts, col, alpha = 0.32) => {
    x.save(); x.globalAlpha = Math.min(1, alpha * 1.25); x.fillStyle = col; x.beginPath(); x.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) x.lineTo(pts[i][0] + (rnd() - 0.5) * 2, pts[i][1] + (rnd() - 0.5) * 2);
    x.closePath(); x.fill(); x.restore();
  };
  const ell = (cx, cy, rx, ry, n = 22, a0 = 0, a1 = Math.PI * 2) => Array.from({ length: n + 1 }, (_, i) => { const a = a0 + (a1 - a0) * i / n; return [cx + Math.cos(a) * rx, cy + Math.sin(a) * ry]; });
  const blob = (x, cx, cy, rx, ry, col, alpha = 0.32) => wash(x, ell(cx, cy, rx, ry), col, alpha);
  const hatch = (x, x0, y0, x1, y1, gap, col = PEN, w = 1.1, alpha = 0.45, slope = 0.8) => {
    x.save(); x.beginPath(); x.rect(x0, y0, x1 - x0, y1 - y0); x.clip();
    for (let k = x0 - (y1 - y0); k < x1; k += gap) line(x, [[k, y1], [k + (y1 - y0) * slope, y0]], { w, col, jit: 1.2, passes: 1, alpha });
    x.restore();
  };
  // little people: a clone soldier (round tin helmet, greatcoat, rifle), Twinsen (tunic, a tail of hair), a child
  const clone = (x, cx, by, s) => {
    blob(x, cx, by - 46 * s, 13 * s, 9 * s, '#7a8a6a', 0.5);
    line(x, ell(cx, by - 44 * s, 14 * s, 11 * s, 10, Math.PI, Math.PI * 2), { w: 1.8 * s });
    line(x, [[cx - 15 * s, by - 44 * s], [cx + 15 * s, by - 44 * s]], { w: 1.6 * s });
    line(x, ell(cx, by - 38 * s, 7 * s, 7 * s, 12), { w: 1.3 * s });
    const coat = [[cx - 9 * s, by - 31 * s], [cx + 9 * s, by - 31 * s], [cx + 13 * s, by - 6 * s], [cx - 13 * s, by - 6 * s]];
    wash(x, coat, '#5f6a7a', 0.42); line(x, coat, { w: 1.6 * s, close: true });
    line(x, [[cx - 5 * s, by - 6 * s], [cx - 5 * s, by]], { w: 1.6 * s }); line(x, [[cx + 5 * s, by - 6 * s], [cx + 5 * s, by]], { w: 1.6 * s });
    line(x, [[cx + 10 * s, by - 8 * s], [cx + 17 * s, by - 50 * s]], { w: 1.8 * s });
  };
  const hero = (x, cx, by, s, { arm = 'up', face = -1, ball = true } = {}) => {
    const f = face;   // (-1: looks left)
    line(x, ell(cx, by - 92 * s, 11 * s, 13 * s, 14), { w: 2 * s }); blob(x, cx, by - 92 * s, 11 * s, 13 * s, '#f0c49b', 0.45);
    line(x, [[cx - 8 * f * s, by - 102 * s], [cx - 20 * f * s, by - 100 * s], [cx - 26 * f * s, by - 86 * s]], { w: 3 * s, col: '#3b2414' });   // (the tail of hair)
    const t = [[cx - 12 * s, by - 78 * s], [cx + 12 * s, by - 78 * s], [cx + 15 * s, by - 34 * s], [cx - 15 * s, by - 34 * s]];
    wash(x, t, '#3a6fc4', 0.45); line(x, t, { w: 2 * s, close: true });
    line(x, [[cx - 6 * s, by - 34 * s], [cx - 9 * s, by]], { w: 2.2 * s }); line(x, [[cx + 6 * s, by - 34 * s], [cx + 9 * s, by]], { w: 2.2 * s });
    if (arm === 'up') {
      line(x, [[cx + 10 * f * s, by - 74 * s], [cx + 24 * f * s, by - 96 * s], [cx + 30 * f * s, by - 118 * s]], { w: 2.2 * s });
      if (ball) {
        blob(x, cx + 32 * f * s, by - 126 * s, 8 * s, 8 * s, '#e8b830', 0.6); line(x, ell(cx + 32 * f * s, by - 126 * s, 8 * s, 8 * s, 12), { w: 1.6 * s });
        for (const r of [14, 20]) line(x, ell(cx + 32 * f * s, by - 126 * s, r * s, r * s, 8, -2.2, -1.0), { w: 1 * s, alpha: 0.6 });
      }
      line(x, [[cx - 10 * f * s, by - 74 * s], [cx - 18 * f * s, by - 52 * s]], { w: 2.2 * s });
    } else {   // (arms open: welcoming)
      line(x, [[cx - 11 * s, by - 72 * s], [cx - 34 * s, by - 60 * s]], { w: 2.2 * s }); line(x, [[cx + 11 * s, by - 72 * s], [cx + 34 * s, by - 60 * s]], { w: 2.2 * s });
    }
  };
  const child = (x, cx, by, s, col) => {
    line(x, ell(cx, by - 40 * s, 7 * s, 8 * s, 12), { w: 1.6 * s }); blob(x, cx, by - 40 * s, 7 * s, 8 * s, '#f0c49b', 0.4);
    const t = [[cx - 7 * s, by - 32 * s], [cx + 7 * s, by - 32 * s], [cx + 9 * s, by - 12 * s], [cx - 9 * s, by - 12 * s]];
    wash(x, t, col, 0.5); line(x, t, { w: 1.5 * s, close: true });
    line(x, [[cx - 4 * s, by - 12 * s], [cx - 6 * s, by]], { w: 1.6 * s }); line(x, [[cx + 4 * s, by - 12 * s], [cx + 6 * s, by]], { w: 1.6 * s });
    line(x, [[cx + 7 * s, by - 28 * s], [cx + 15 * s, by - 22 * s]], { w: 1.5 * s });
  };

  // L1 — FunFrock's Twinsun: the teleporter's stamp; the dashes (3D, on the page: NB_TRAIL) run from it to his clones
  const [L1, l1] = mk(NB_PX, NB_PY); paper(l1, NB_PX, NB_PY, [NB_PX]);
  {
    const x = l1, cx = 176, cy = 196;
    // (the stamp on its own canvas, worn like a rubber stamp's print, then laid on the page)
    const [st, sx] = mk(240, 240), c0 = 120;
    sx.globalAlpha = 0.85;
    line(sx, ell(c0, c0, 96, 96, 40), { w: 9, col: '#a8322a', jit: 0.8, passes: 1 }); line(sx, ell(c0, c0, 78, 78, 36), { w: 3, col: '#a8322a', jit: 0.6, passes: 1 });
    // the teleporter: a booth with a domed top and a door, a beam on each side
    const b = [[c0 - 26, c0 + 52], [c0 - 26, c0 - 22], [c0 + 26, c0 - 22], [c0 + 26, c0 + 52]];
    wash(sx, b, '#a8322a', 0.22); line(sx, b, { w: 4, col: '#a8322a', jit: 0.6, passes: 1, sharp: true });
    line(sx, ell(c0, c0 - 22, 26, 22, 14, Math.PI, Math.PI * 2), { w: 4, col: '#a8322a', jit: 0.5, passes: 1 });
    line(sx, [[c0, c0 - 8], [c0, c0 + 52]], { w: 2.4, col: '#a8322a', passes: 1 });
    for (const s of [-1, 1]) for (const r of [38, 50]) line(sx, ell(c0, c0 + 14, r, r * 0.9, 6, s > 0 ? -0.6 : Math.PI - 0.6, s > 0 ? 0.6 : Math.PI + 0.6), { w: 2.2, col: '#a8322a', passes: 1, alpha: 0.8 });
    sx.globalCompositeOperation = 'destination-out';
    for (let i = 0; i < 130; i++) { const a = rnd() * 7, r = rnd() * 100; sx.globalAlpha = 0.25 + rnd() * 0.4; sx.beginPath(); sx.arc(c0 + Math.cos(a) * r, c0 + Math.sin(a) * r, 1 + rnd() * 3.5, 0, 7); sx.fill(); }
    x.save(); x.translate(cx, cy); x.rotate(-0.12); x.drawImage(st, -c0, -c0); x.restore();
    // FunFrock's fortress, a blocky keep and a tower with his flag, low on the page; the clones in rows before it
    const f = [[300, 600], [300, 500], [330, 500], [330, 486], [356, 486], [356, 500], [404, 500], [404, 430], [428, 412], [452, 430], [452, 500], [500, 500], [500, 486], [526, 486], [526, 500], [560, 500], [560, 600]];
    wash(x, f, '#6a6a78', 0.3); line(x, f, { w: 2.4 });
    hatch(x, 304, 504, 556, 598, 9, PEN, 1, 0.35);
    line(x, [[428, 412], [428, 352]], { w: 2 }); wash(x, [[428, 352], [474, 362], [428, 376]], '#a8322a', 0.55); line(x, [[428, 352], [474, 362], [428, 376]], { w: 1.6 });
    for (const [wx, wy] of [[420, 448], [436, 448], [340, 540], [380, 540], [480, 540], [520, 540]]) line(x, [[wx, wy], [wx, wy + 14]], { w: 3 });
    for (let r = 0; r < 3; r++) for (let i = 0; i < 5; i++) clone(x, 312 + i * 54 + (r % 2) * 20 - r * 4, 650 + r * 62, 0.85 + r * 0.17);
  }
  // R1 — Twinsun with its two suns; Twinsen stands up to them, the magic ball raised
  const [R1, r1] = mk(NB_PX, NB_PY); paper(r1, NB_PX, NB_PY, [0]);
  {
    const x = r1, px = 320, py = 230;
    blob(x, px, py, 112, 112, '#7ab4d8', 0.3); line(x, ell(px, py, 112, 112, 40), { w: 2.6 });
    const belt = []; for (let i = 0; i <= 16; i++) belt.push([px - 108 + i * 13.5, py + (i % 2 ? -14 : 8) + (rnd() - 0.5) * 6]);
    wash(x, [[px - 110, py + 12], ...belt, [px + 110, py + 12]], '#8a7a6a', 0.45); line(x, belt, { w: 2 });
    blob(x, px - 20, py - 60, 44, 22, '#6aa860', 0.35); blob(x, px + 30, py + 64, 50, 24, '#6aa860', 0.35);
    for (const sy of [py - 152, py + 152]) {
      blob(x, px, sy, 24, 24, '#f0c030', 0.65); line(x, ell(px, sy, 24, 24, 16), { w: 2 });
      for (let i = 0; i < 10; i++) { const a = i * 0.628; line(x, [[px + Math.cos(a) * 32, sy + Math.sin(a) * 32], [px + Math.cos(a) * 44, sy + Math.sin(a) * 44]], { w: 1.8, passes: 1 }); }
    }
    const rock = [[300, 720], [330, 662], [372, 646], [430, 650], [470, 676], [500, 720]];
    wash(x, rock, '#9a8a70', 0.35); line(x, rock, { w: 2.2 }); hatch(x, 320, 680, 490, 720, 10, PEN, 1, 0.3);
    hero(x, 392, 648, 1.25, { arm: 'up', face: -1 });
  }
  // L2 — the storm; lightning strikes the Dino-Fly
  const [L2, l2] = mk(NB_PX, NB_PY); paper(l2, NB_PX, NB_PY, [NB_PX]);
  {
    const x = l2;
    for (let i = 0; i < 14; i++) { const cx = 40 + rnd() * 520, cy = 70 + rnd() * 190, r = 50 + rnd() * 60; blob(x, cx, cy, r, r * 0.6, '#4a4a5a', 0.16); line(x, ell(cx, cy, r, r * 0.6, 18, Math.PI * 0.95, Math.PI * 2.05), { w: 2, alpha: 0.7 }); }
    hatch(x, 0, 120, NB_PX, 280, 7, PEN, 1.1, 0.4, 0.5);
    const bolt = [[330, 250], [292, 360], [330, 362], [268, 500], [306, 498], [246, 600], [358, 452], [318, 454], [372, 352], [338, 350], [370, 250]];
    wash(x, bolt, '#f2d040', 0.7); line(x, bolt, { w: 2.4, close: true });
    for (let i = 0; i < 70; i++) { const rx = rnd() * NB_PX, ry = 280 + rnd() * 470; line(x, [[rx, ry], [rx - 10, ry + 26]], { w: 1, alpha: 0.35, passes: 1, col: PEN }); }
    // the Dino-Fly, wings out, knocked sideways (hurt, not lost: the eye open)
    x.save(); x.translate(300, 660); x.rotate(0.32);
    const wingL = [[-20, -10], [-150, -110], [-170, -40], [-110, -6], [-40, 8]], wingR = [[20, -10], [130, -120], [168, -60], [110, -8], [40, 8]];
    for (const w of [wingL, wingR]) { wash(x, w, '#d8c060', 0.5); line(x, w, { w: 2.2, close: true }); }
    blob(x, 0, 0, 74, 28, '#4f9a50', 0.55); line(x, ell(0, 0, 74, 28, 24), { w: 2.4 });
    blob(x, 0, 12, 50, 10, '#e8d070', 0.5);
    blob(x, 88, -18, 28, 20, '#4f9a50', 0.55); line(x, ell(88, -18, 28, 20, 16), { w: 2.2 });
    line(x, ell(98, -24, 6, 6, 10), { w: 1.6 }); blob(x, 99, -24, 2.5, 2.5, INK, 0.9);
    line(x, [[-70, 6], [-120, 30], [-150, 14]], { w: 4 });
    for (const [a, b] of [[-30, -60], [40, -58], [-60, 40]]) line(x, [[a, b], [a + 10, b - 14], [a + 4, b - 16], [a + 14, b - 30]], { w: 1.6, col: '#c89020', passes: 1 });
    x.restore();
    for (let i = 0; i < 8; i++) line(x, [[i * 80, 800], [i * 80 + 30, 790], [i * 80 + 60, 800]], { w: 1.6, alpha: 0.6 });
  }
  // R2 — Zeelich; an Esmer shuttle; the children come home to Twinsen's open arms
  const [R2, r2] = mk(NB_PX, NB_PY); paper(r2, NB_PX, NB_PY, [0]);
  {
    const x = r2;
    blob(x, 330, -260, 560, 520, '#b48ac8', 0.22); line(x, ell(330, -260, 560, 520, 50, 0.15, Math.PI - 0.15), { w: 2.6 });
    for (let i = 0; i < 5; i++) line(x, ell(330, -260, 560 - 40 - i * 46, 520 - 40 - i * 46, 40, 0.5, Math.PI - 0.5), { w: 1.2, alpha: 0.45, passes: 1 });
    // the shuttle: red base ring, a gold hull, a blue canopy; three legs
    const sx = 400, sy = 360;
    blob(x, sx, sy - 34, 40, 30, '#6ab0e8', 0.5); line(x, ell(sx, sy - 34, 40, 30, 18, Math.PI, Math.PI * 2), { w: 2.2 });
    blob(x, sx, sy, 92, 30, '#d8a838', 0.55); line(x, ell(sx, sy, 92, 30, 28), { w: 2.4 });
    blob(x, sx, sy + 22, 70, 13, '#c8402e', 0.6); line(x, ell(sx, sy + 22, 70, 13, 20, 0, Math.PI), { w: 2 });
    for (const lx of [-50, 0, 50]) line(x, [[sx + lx, sy + 30], [sx + lx * 1.3, sy + 70]], { w: 2 });
    for (let i = 0; i < 3; i++) line(x, [[sx - 120 - i * 30, sy - 20 + i * 14], [sx - 170 - i * 30, sy - 10 + i * 14]], { w: 1.2, alpha: 0.5, passes: 1 });
    line(x, [[0, 724], [140, 716], [300, 728], [600, 718]], { w: 2 }); hatch(x, 0, 728, NB_PX, 790, 12, PEN, 1, 0.25);
    const cols = ['#e05a3a', '#e8b830', '#5fa858', '#4a7ad8', '#d06aa8'];
    for (let i = 0; i < 5; i++) child(x, 70 + i * 62, 720 + (i % 2) * 4, 1.05 + (i % 3) * 0.12, cols[i]);
    hero(x, 470, 722, 1.15, { arm: 'open' });
  }
  // S3 — the island now, in pencil: the sea, the town, the plateau with the old fort, as the aerial first sees it
  const [S3, s3] = mk(NB_PX * 2, NB_PY); paper(s3, NB_PX * 2, NB_PY, []);
  {
    const x = s3, X0 = 40, Y0 = 105, RW = 1120, RH = 630, P = (u, v) => [X0 + u * RW, Y0 + v * RH];
    const g = x.createLinearGradient(NB_PX - 70, 0, NB_PX + 70, 0); g.addColorStop(0, 'rgba(80,55,25,0)'); g.addColorStop(0.5, 'rgba(80,55,25,0.26)'); g.addColorStop(1, 'rgba(80,55,25,0)'); x.fillStyle = g; x.fillRect(NB_PX - 70, 0, 140, NB_PY);
    const W2 = (pts, c, a) => wash(x, pts.map(([u, v]) => P(u, v)), c, a), L2_ = (pts, o) => line(x, pts.map(([u, v]) => P(u, v)), { col: PEN, ...o });
    for (let i = 0; i < 5; i++) { const u = 0.08 + i * 0.2 + rnd() * 0.06, v = 0.08 + rnd() * 0.12; L2_(ell(u, v, 0.08, 0.035, 14, Math.PI, Math.PI * 2), { w: 1.6, alpha: 0.5 }); }
    W2([[0, 0.44], [1, 0.44], [1, 1], [0, 1]], '#7ab8d8', 0.22);
    // the plateau: its cliff, the old fort's towers on top
    const cliff = [[0.16, 0.5], [0.165, 0.37], [0.19, 0.345], [0.45, 0.335], [0.63, 0.34], [0.68, 0.37], [0.7, 0.5]];
    W2(cliff, '#9a9aa8', 0.35); L2_(cliff, { w: 2 });
    { const cr = []; for (let i = 0; i <= 22; i++) { const u = 0.47 + i * 0.0095; cr.push([u, 0.336 - (i % 2 ? 0.012 : 0)], [u + 0.0095, 0.336 - (i % 2 ? 0.012 : 0)]); } L2_(cr, { w: 1.4, sharp: true, passes: 1 }); }   // (the fort's battlements)
    for (let i = 0; i < 18; i++) { const u = 0.18 + i * 0.028; L2_([[u, 0.36 + (i % 3) * 0.01], [u - 0.01, 0.48]], { w: 1, alpha: 0.35, passes: 1 }); }
    for (const [u, v] of [[0.545, 0.215], [0.645, 0.225]]) { const t = [[u - 0.018, v + 0.09], [u - 0.018, v + 0.03], [u, v], [u + 0.018, v + 0.03], [u + 0.018, v + 0.09]]; W2(t, '#8a8a98', 0.35); L2_(t, { w: 1.8 }); }
    L2_([[0.5, 0.31], [0.5, 0.27], [0.6, 0.27], [0.6, 0.3]], { w: 1.6 });
    L2_([[0.395, 0.3], [0.41, 0.2], [0.425, 0.3]], { w: 1.4 }); L2_([[0.4, 0.26], [0.42, 0.26]], { w: 1.2 });   // (the drill's derrick)
    // the town: its ground, roofs and walls
    W2([[0.16, 0.5], [0.7, 0.5], [0.86, 0.48], [1, 0.47], [1, 0.58], [0.72, 0.62], [0.56, 0.66], [0.5, 0.72], [0.46, 0.73], [0.2, 0.75], [0.16, 0.62]], '#d8c8a0', 0.45);
    const house = (u0, v0, u1, v1, roof) => {
      W2([[u0, v0], [u1, v0], [u1, v1], [u0, v1]], '#e8dcc0', 0.6); L2_([[u0, v0], [u1, v0], [u1, v1], [u0, v1]], { w: 1.6, close: true, sharp: true });
      const r = [[u0 - 0.008, v0], [(u0 + u1) / 2, v0 - (v1 - v0) * 0.55], [u1 + 0.008, v0]]; W2(r, roof, 0.5); L2_(r, { w: 1.8, sharp: true });
      for (let k = 1; k < 3; k++) L2_([[u0 + (u1 - u0) * k / 3, v0 + (v1 - v0) * 0.35], [u0 + (u1 - u0) * k / 3, v0 + (v1 - v0) * 0.6]], { w: 2.2, passes: 1 });   // (windows)
    };
    house(0.2, 0.57, 0.28, 0.63, '#9a6a4a'); house(0.335, 0.54, 0.48, 0.61, '#5a5a66'); house(0.52, 0.58, 0.64, 0.66, '#c8503a');
    house(0.63, 0.51, 0.71, 0.56, '#c8503a'); house(0.77, 0.51, 0.84, 0.56, '#c8503a'); house(0.67, 0.46, 0.72, 0.5, '#9a6a4a');
    W2(ell(0.44, 0.62, 0.032, 0.04, 14, Math.PI, Math.PI * 2), '#5aa8a0', 0.5); L2_([[0.405, 0.62], [0.405, 0.71], [0.475, 0.71], [0.475, 0.62]], { w: 1.6, sharp: true }); L2_(ell(0.44, 0.62, 0.035, 0.04, 14, Math.PI, Math.PI * 2), { w: 1.6 });
    // the shore, the grass and its trees, the quay below
    const grass = [[0.5, 0.72], [0.56, 0.66], [0.72, 0.62], [1, 0.58], [1, 1], [0.6, 1], [0.55, 0.85]];
    W2(grass, '#6aa858', 0.32); L2_([[0.5, 0.72], [0.53, 0.8], [0.55, 0.88], [0.6, 1]], { w: 2 });
    for (const [u, v, r] of [[0.6, 0.72, 0.025], [0.77, 0.85, 0.03], [0.88, 0.66, 0.02], [0.95, 0.62, 0.02], [0.8, 0.6, 0.018]]) { W2(ell(u, v, r, r * 1.4, 12), '#3f8a3a', 0.45); L2_(ell(u, v, r, r * 1.4, 12), { w: 1.4 }); L2_([[u, v + r * 1.4], [u, v + r * 2.6]], { w: 1.4 }); }
    L2_([[0, 0.76], [0.2, 0.75], [0.36, 0.74], [0.46, 0.73]], { w: 2 }); L2_([[0, 0.83], [0.1, 0.86], [0.14, 0.95]], { w: 1.6 });
    for (let i = 0; i < 26; i++) { const u = rnd() * 0.5, v = 0.78 + rnd() * 0.2; L2_([[u, v], [u + 0.025, v]], { w: 1, alpha: 0.4, passes: 1 }); }
    for (let i = 0; i < 10; i++) { const u = rnd() * 0.16, v = 0.5 + rnd() * 0.1; L2_([[u, v], [u + 0.02, v]], { w: 1, alpha: 0.35, passes: 1 }); }
  }
  const half = (side) => { const [c, x] = mk(NB_PX, NB_PY); x.drawImage(S3, side === 'L' ? 0 : -NB_PX, 0); return c; };
  // the cover: worn brown leather, a pressed ring
  const [CV, cv] = mk(256, 256);
  {
    cv.fillStyle = '#5a3d28'; cv.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 900; i++) { cv.fillStyle = rnd() < 0.5 ? 'rgba(0,0,0,0.08)' : 'rgba(255,220,170,0.06)'; cv.fillRect(rnd() * 256, rnd() * 256, 2 + rnd() * 3, 2 + rnd() * 3); }
    cv.strokeStyle = 'rgba(30,18,10,0.5)'; cv.lineWidth = 3; cv.beginPath(); cv.arc(128, 128, 54, 0, 7); cv.stroke();
  }
  return { L1, R1, L2, R2, L3: half('L'), R3: half('R'), S3, cover: CV, r1 };
}
