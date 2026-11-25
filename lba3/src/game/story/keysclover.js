// KEYS-CLOVER (docs/lba-maturity/KEYS-CLOVER.md; the user's answers of 25.11): LBA's small keys and clover boxes. Not a
// chapter: the director (index.js) asks it beside the chapter in progress, as it asks liftbelow.js. Its rooms are
// src/game/keyrooms.js, its text text/keysclover.js.
//
// The rules (the user, 25.11):
//   - A SMALL KEY opens the one small lock of its area. It is found in that area, and it STAYS with Twinsen when he
//     leaves (no loss, no soft-lock) until its door uses it. The HUD shows a small brass key with the count while he
//     holds one (hud.js #smallkeys); the behaviour menu counts it; the inventory lists "Small key".
//   - A CLOVER BOX raises the clover cap by one and has a leaf in it (the cap rises, then one leaf is added). Cap =
//     9 + the boxes found, 13 with all four. The cap is never stored: it is read from the kc_box_* flags (hero.cloverMax,
//     every cap site in the game reads it). An old save has no box: cap 9, and its leaves are kept (clamped on load).
//
// The four doors and the boxes (each step's clue is in the world, on the main way past the door):
//   K1 Citadel · chapter 1 on: FunFrock's old passage, the barred mouth in the north face. The bars' tag names the yard's
//      powder chest; the key in it (search). Behind: the vaulted run under the fort (kc_tunnel), box B1 in a side niche,
//      a barred SHELTER door (left for chapter 8), and the ladder to the yard's trapdoor: its bolt drawn from below makes a
//      two-way shortcut (the trapdoor climbs down from the yard from then on).
//   K2 Otringal · chapter 4 on: the fountain's pump house (it was "nothing for a visitor"). The door's note: the key is on
//      the fountain's top, out of reach; it glints on the top bowl, and the ball knocks it down (it lies by the basin until
//      taken). Behind: the HIGH JET wheel (kc_pump_on): the plaza fountain's tall jet runs from then on, and the sweeper
//      and Ulla the fruit seller say so once each. Box B2 on the shelf.
//   K3 Lhar · chapter 6 on: Pim's grandmother's old house, the goats' now. The door's line: the goats keep nosing at their
//      hay rack; the key is in the hay (search). Behind: the stall, a stair to the loft: Grandma's trunk, the loft window
//      (the observatory across: its line after the roof's answer only), box B3.
//   K4 Zeelich · chapter 14 (Baldino's Network) on: Baldino's old mill room at the foot of the north mill, the network's
//      mill station. Scratched in the frame: SPARE KEY UP TOP. The key hangs on the gallery's railing (the stair-stones'
//      climb, as the relay's). Behind: his first workbench, a photo, the first millstone; his biscuit tin: 50 kashes.
//      (No box: the four boxes are B1–B3 and B4.)
//   B4 Desert Island · chapter 4 on: no key; box B4 on a stone ledge on the School's mask, reached on foot from the
//      hollow's east bank by a jump (not by the hop-pack alone).
//
// Flags (new only, prefix kc_; an old save has none): kc_key_<d> (its key found), kc_door_<d> (its lock opened: the key
// spent in the same step), kc_box_<b> (a box opened), kc_bolt_fort (the trapdoor's bolt drawn), kc_pump_drop (the
// fountain's key knocked down, not yet taken), kc_pump_on (the high jet), kc_tin_mill (Baldino's tin), kc_sweep /
// kc_ulla (their remark said). d: fort, pump, goat, mill; b: fort, pump, goat, mask.
import * as THREE from 'three';
import { t } from '../i18n.js';
import { ChapterBase } from './base.js';
import { OLD_DOORS } from '../island.js';
import { KR, KR_ROOMS, smallKey, powderChest, barGate, highJet, cloverBox } from '../keyrooms.js';
import { Kit } from '../props.js';
import '../text/keysclover.js';

export const DOORS = ['fort', 'pump', 'goat', 'mill'];
export const BOXES = ['fort', 'pump', 'goat', 'mask'];
export const CLOVER_BASE = 9;
export const MILL_KASHES = 50;
// the clover cap from a set of flags: 9 and one for each box found (13 at most)
export const cloverCap = (f) => CLOVER_BASE + BOXES.reduce((n, b) => n + (f?.['kc_box_' + b] ? 1 : 0), 0);
// the small keys held: found and not yet spent
export const keysHeld = (f) => DOORS.reduce((n, d) => n + (f?.['kc_key_' + d] && !f?.['kc_door_' + d] ? 1 : 0), 0);
// the room behind each door, and the box in each room
const ROOM_OF = { fort: 'kc_tunnel', pump: 'kc_pump', goat: 'kc_goats', mill: 'kc_mill' };
const BOX_IN = { kc_tunnel: 'fort', kc_pump: 'pump', kc_goats: 'goat' };
// Citadel's spots (island.js OLD_DOORS): the bar gate's face, the yard's trapdoor, the powder chest in the yard's north-east
const PN = OLD_DOORS.passageN, PS = OLD_DOORS.passageS;
const CHEST = { x: -20.6, z: -75.35, ry: 0 };
// Otringal: the fountain (zislands.js landmark, the island's frame) and where its key lands
const FOUNT_LOCAL = { x: -5, z: 6.6 };
// Zeelich's north mill: the key on the gallery's railing (angle round the tower, from +z; the relay's spot is at 0)
const MILL_KEY_A = -1.2;
// Desert Island: box B4 on the School's mask (desertold.js SCHOOL_SITE; the ledge's place, the mask's frame: u along the
// face, east −; v out of it, south)
export const MASK_LEDGE = { u: -3.3, v: 2.25, y: 7.15, w: 1.3, d: 1.5 };

export class KeysClover extends ChapterBase {
  constructor(story) { super(story); this.fx = []; this.jet = null; this.fountKey = null; this.drop = null; }
  get h() { return this.game.hero; }
  here() { return this.game.room?.id || null; }
  built(id) { return this.game.regions?.built?.(id); }
  able() { const b = this.game.hero.body; return !b || b === 'twinsen'; }
  // (a chapter reached, by its key, in either campaign)
  past(key) { const i = this.story.chapters.findIndex((c) => c.key === key); return i >= 0 && this.story.index >= i; }
  late() { return this.past('network'); }
  // a door that opens with its key (the director's other parts ask: ihomes.js keeps its "shut" line off it)
  opened(doorId) { const f = this.f; return (doorId === 'otringal-16-6' && !!f.kc_door_pump); }
  cap() { return cloverCap(this.f); }

  // ================================================================ the hero's numbers (each frame, and on a load)
  sync() {
    const h = this.h, f = this.f; if (!h) return;
    h.cloverMax = cloverCap(f);
    h.smallKeys = keysHeld(f);
  }
  applyFlags() {
    const f = this.f, h = this.h;
    for (const k of Object.keys(f)) if (k.startsWith('kc_') && f[k] !== true && !Number.isFinite(f[k])) delete f[k];
    // (a door open means its key was found and spent: a save cut between the two steps never holds a key for an open door)
    for (const d of DOORS) if (f['kc_door_' + d]) f['kc_key_' + d] = true;
    if (f.kc_key_pump) delete f.kc_pump_drop;
    this.sync();
    // (KEYS-CLOVER: a save's leaves are kept up to its cap: an old save has cap 9)
    if (h && Number.isFinite(h.clovers)) h.clovers = Math.max(0, Math.min(h.cloverMax, h.clovers));
    this.drop = null; for (const F of this.fx) this.game.scene?.remove(F.obj); this.fx.length = 0;
    this.buildAreas();
    this.applyWorld();
  }
  // ================================================================ the world from the flags
  decorate() {
    const g = this.game, W = g.world;
    if (W?.root && this.once('kc_citadel')) this.buildCitadel();
    this.buildAreas();
    this.applyWorld();
  }
  // (each area's pieces once it is built, whenever that was: a chapter may build its areas before this part is asked)
  buildAreas() { this.buildOtringal(); this.buildHamalayi(); this.buildZeelich(); this.buildDesert(); }
  regionBuilt() { this.buildAreas(); this.applyWorld(); }
  buildCitadel() {
    const g = this.game, W = g.world, P = g.physics;
    const grp = new THREE.Group(); grp.name = 'kc-citadel'; W.root.add(grp);
    // the passage's bar gate (island.js draws the mouth without its bars now: OLD_DOORS.passageN.bars 'kc')
    const sill = W.shutDoors?.find((d) => d.id === 'passageN')?.y ?? P.groundAt(PN.x, PN.z - 0.6, 40);
    this.gate = barGate(grp, PN.x, sill, PN.z, PN.ry);
    // the powder chest against the yard's north wall
    const y = P.groundAt(CHEST.x, CHEST.z, 40), k = new Kit(grp);
    const fp = k.at(CHEST.x, y, CHEST.z, CHEST.ry, () => powderChest(k));
    k.flush();
    P.add({ type: 'box', x: CHEST.x, z: CHEST.z, hw: fp.hw, hd: fp.hd, rot: CHEST.ry, top: y + fp.top, noStand: true });
    this.chest = { x: CHEST.x, z: CHEST.z + 0.85, y };
  }
  buildOtringal() {
    const g = this.game, R = this.built('isle_otringal'); if (!R || R._kcb) return;
    R._kcb = true;
    const f0 = (R.items || []).find((u) => u.kind === 'fountain');
    if (!f0) return;
    const P = g.physics, gy = P.groundAt(f0.x, f0.z, 80);
    this.fount = { x: f0.x, z: f0.z, y: gy };
    // the high jet out of the finial (3.62 m over the basin's foot)
    this.jet = highJet(R.group, f0.x, gy + 3.55, f0.z);
    // the key on the top bowl's rim (2.95 m up), glinting; a ball target there
    const key = smallKey(true); key.position.set(f0.x + 0.42, gy + 2.98, f0.z + 0.1); key.rotation.set(-Math.PI / 2, 0, 0.6); R.group.add(key);
    this.fountKey = key;
    this._fountT = { x: key.position.x, y: key.position.y, z: key.position.z, r: 0.5, material: 'machine', result: 'switch', done: false, onHit: () => this.knockKey() };
    R.ballTargets.push(this._fountT);
    // where it lands: by the basin, on the side toward the pump house
    const ux = R.shutDoors?.find((d) => d.id === 'otringal-16-6');
    const ang = ux ? Math.atan2(ux.x - f0.x, ux.z - f0.z) : Math.PI / 2;
    this.fountLand = { x: f0.x + Math.sin(ang) * 2.75, z: f0.z + Math.cos(ang) * 2.75 };
    this.fountLand.y = P.groundAt(this.fountLand.x, this.fountLand.z, gy + 2);
  }
  buildHamalayi() {
    const g = this.game, R = this.built('hamalayi'); if (!R?.goatHouse || R._kcb) return;
    R._kcb = true;
    const G = R.goatHouse, P = g.physics;
    // (hamalayi.js: the house turned half round; its door 2.7 m out on −z, the hay rack 1.25 m east of the house's middle)
    this.goat = { door: { x: G.door.x, z: G.door.z }, wall: G.z - 1.8, hay: { x: G.x + 1.25, z: G.z - 2.55 - 0.75 } };
    this.goat.hay.y = P.groundAt(this.goat.hay.x, this.goat.hay.z, 60);
    this.goat.door.y = P.groundAt(G.door.x, G.door.z, 60);
  }
  buildZeelich() {
    const g = this.game, R = this.built('zeelich'); if (!R?.mills?.[0] || R._kcb) return;
    R._kcb = true;
    const m = R.mills[0], top = R.millTop;
    const cx = m.x + (top.x - m.x) - 0, cz = top.z - 3.3;   // (the tower's middle in the world: millTop is 3.3 m out on +z)
    const ang = MILL_KEY_A;
    this.mill = {
      door: { x: m.door.x, z: m.door.z, y: g.physics.groundAt(m.door.x, m.door.z, 40) },
      centre: { x: cx, z: cz },
      key: { x: cx + Math.sin(ang) * 3.3, z: cz + Math.cos(ang) * 3.3, y: top.y },
      out: { x: cx + Math.sin(ang) * 3.92, z: cz + Math.cos(ang) * 3.92 },
    };
    const key = smallKey(true); key.position.set(this.mill.out.x, top.y + 0.78, this.mill.out.z); key.rotation.set(0, -ang + Math.PI / 2, -Math.PI / 2); R.group.add(key);
    this.millKey = key;
  }
  buildDesert() {
    const g = this.game, R = this.built('desert'); if (!R?.school || R._kcb) return;
    R._kcb = true;
    const S = R.school, L = MASK_LEDGE, P = g.physics;
    // the mask's frame (desertold.js frame with ry = π): world x = S.x − u, z = S.z − v
    const at = (u, v) => ({ x: S.x - u, z: S.z - v });
    const c = at(L.u, L.v), grp = new THREE.Group(); grp.name = 'kc-mask-ledge'; R.group.add(grp);
    const k = new Kit(grp);
    const stone = new THREE.MeshStandardMaterial({ color: '#cdc6da', roughness: 0.7, emissive: '#2e2a3a', emissiveIntensity: 0.55 });
    // a ledge of the mask's own stone out of its east cheek under the brow, a corbel under it
    k.at(c.x, L.y, c.z, Math.PI, () => {
      k.add(new THREE.BoxGeometry(L.w, 0.3, L.d), stone, 0, -0.15, 0);
      k.add(new THREE.BoxGeometry(L.w * 0.7, 0.6, L.d * 0.6), stone, 0, -0.6, -L.d * 0.2);
    });
    // the box on it
    k.at(c.x, L.y, c.z - 0.05, Math.PI, () => cloverBox(k));
    k.flush();
    const lid = new THREE.Group(); lid.position.set(c.x, L.y + 0.26, c.z - 0.05 + 0.17); grp.add(lid);
    { const lm = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.06, 0.36), new THREE.MeshStandardMaterial({ color: '#4a2e1c', roughness: 0.6 })); lm.position.set(0, 0.03, -0.17); lm.castShadow = true; lid.add(lm); }
    this.maskLid = lid;
    P.add({ type: 'box', x: c.x, z: c.z, hw: L.w / 2, hd: L.d / 2, rot: 0, top: L.y, bottom: L.y - 0.9 });
    this.mask = { x: c.x, z: c.z + 0.45 * 0, y: L.y, box: { x: c.x, z: c.z - 0.05 } };
  }
  applyWorld() {
    const f = this.f;
    this.gate?.setOpen(!!f.kc_door_fort);
    if (this.fountKey) { this.fountKey.visible = !f.kc_key_pump; if (this._fountT) this._fountT.done = !!(f.kc_pump_drop || f.kc_key_pump); if (!f.kc_key_pump && !this.drop) this.placeFountKey(); }
    this.jet?.set(!!f.kc_pump_on);
    if (this.millKey) this.millKey.visible = this.late() && !f.kc_key_mill;
    if (this.maskLid) this.maskLid.rotation.x = f.kc_box_mask ? 1.9 : 0;
    const T = this.built('kc_tunnel') && KR.kc_tunnel; if (T) { T.setBolt(!!f.kc_bolt_fort); T.setBox(!!f.kc_box_fort); }
    const Pm = this.built('kc_pump') && KR.kc_pump; if (Pm) { Pm.setJet(!!f.kc_pump_on); Pm.setBox(!!f.kc_box_pump); }
    const Gt = this.built('kc_goats') && KR.kc_goats; if (Gt) Gt.setBox(!!f.kc_box_goat);
    const Ml = this.built('kc_mill') && KR.kc_mill; if (Ml) Ml.setTin(!!f.kc_tin_mill);
  }
  // the fountain's key: on its rim, or lying by the basin once knocked down
  placeFountKey() {
    const k = this.fountKey, f = this.f; if (!k || !this.fount) return;
    if (f.kc_pump_drop && this.fountLand) { k.position.set(this.fountLand.x, this.fountLand.y + 0.03, this.fountLand.z); k.rotation.set(-Math.PI / 2, 0, 0.4); }
    else { k.position.set(this.fount.x + 0.42, this.fount.y + 2.98, this.fount.z + 0.1); k.rotation.set(-Math.PI / 2, 0, 0.6); }
  }
  knockKey() {
    const g = this.game, f = this.f;
    if (f.kc_key_pump || f.kc_pump_drop || !this.fountKey) return;
    f.kc_pump_drop = true; if (this._fountT) this._fountT.done = true;
    const k = this.fountKey, from = k.position.clone(), to = new THREE.Vector3(this.fountLand.x, this.fountLand.y + 0.03, this.fountLand.z);
    g.audio.play('clunk', from);
    this.drop = { t: 0, from, to };
    this.chain([['hero', 'kc_pump_fall']], () => g.save(false));
  }

  // ================================================================ doors
  doors() {
    const f = this.f, g = this.game, out = [];
    // (every open small-key door of a built area, wherever he is: Game.checkDoors keeps to the area he is in)
    if (f.kc_door_fort) out.push({ house: 'passageN', x: PN.x, z: PN.z - 0.45, r: 0.8, room: 'kc_tunnel' });
    if (f.kc_door_pump && this.built('isle_otringal')) {
      const d = this.built('isle_otringal')?.shutDoors?.find((q) => q.id === 'otringal-16-6');
      if (d?.sill) { const a = d.ry ?? 0; out.push({ region: 'isle_otringal', house: 'otringal-16-6', x: d.sill.x + Math.sin(a) * 0.45, z: d.sill.z + Math.cos(a) * 0.45, r: 0.85, room: 'kc_pump' }); }
    }
    if (f.kc_door_goat && this.goat && this.built('hamalayi')) out.push({ region: 'hamalayi', house: 'kc_goats', x: this.goat.door.x, z: this.goat.wall - 0.5, r: 0.8, room: 'kc_goats' });
    if (f.kc_door_mill && this.mill && this.built('zeelich')) { const M = this.mill; const ux = (M.door.x - M.centre.x), uz = (M.door.z - M.centre.z), l = Math.hypot(ux, uz) || 1; out.push({ region: 'zeelich', house: 'kc_mill', x: M.centre.x + ux / l * 3.05, z: M.centre.z + uz / l * 3.05, r: 0.75, room: 'kc_mill' }); }
    void g;
    return out;
  }
  exitTo(to) {
    const g = this.game;
    if (to === 'kc-fort-n') return { x: PN.x, z: PN.z - 1.5, a: Math.PI };
    if (to === 'kc-fort-yard') { const S = g.world?.shutDoors?.find((d) => d.id === 'passageS'); return { x: (S?.x ?? PS.x + 1) + 0.5, z: S?.z ?? PS.z, a: Math.PI / 2 }; }
    if (to === 'kc_pump-out') {
      const R = this.built('isle_otringal'), d = R?.shutDoors?.find((q) => q.id === 'otringal-16-6');
      if (!d?.sill) return R ? { room: 'isle_otringal', x: R.spawn.x, z: R.spawn.z, a: R.spawn.a } : null;
      const a = d.ry ?? 0; return { room: 'isle_otringal', x: d.sill.x + Math.sin(a) * 1.45, z: d.sill.z + Math.cos(a) * 1.45, a };
    }
    if (to === 'kc_goats-out') { const R = this.built('hamalayi'); if (!R?.goatHouse) return R ? { room: 'hamalayi', x: R.spawn.x, z: R.spawn.z, a: R.spawn.a } : null; this.buildHamalayi(); return { room: 'hamalayi', x: this.goat.door.x, z: this.goat.wall - 1.5, a: Math.PI }; }
    if (to === 'kc_mill-out') {
      const R = this.built('zeelich'); if (!R?.mills?.[0]) return R ? { room: 'zeelich', x: R.spawn.x, z: R.spawn.z, a: R.spawn.a } : null;
      this.buildZeelich(); const M = this.mill, ux = M.door.x - M.centre.x, uz = M.door.z - M.centre.z, l = Math.hypot(ux, uz) || 1;
      return { room: 'zeelich', x: M.centre.x + ux / l * 4.2, z: M.centre.z + uz / l * 4.2, a: Math.atan2(ux, uz) };
    }
    return null;
  }

  // ================================================================ interaction
  interactables(consider, dist) {
    const g = this.game, h = g.hero, f = this.f, here = this.here();
    if (!this.able() || h.actT > 0 || g.state !== 'play' || this.drop) return;
    const y = h.pos.y, near = (yy, r = 1.4) => Math.abs(y - yy) < r;
    // (each lock's offer wins over the door's own look or "shut" line at the same spot: 0.3 m nearer)
    if (!here) {
      const N = g.world?.shutDoors?.find((d) => d.id === 'passageN');
      if (N && !f.kc_door_fort && near(N.y)) consider(dist(N.x, N.z) - 0.3, 1.6, { kind: 'kc_lock', door: 'fort', label: f.kc_key_fort ? 'p_kc_unlock' : 'p_door' });
      if (this.chest && !f.kc_key_fort && near(this.chest.y)) consider(dist(this.chest.x, this.chest.z), 1.3, { kind: 'kc_chest', label: 'p_search' });
      const S = g.world?.shutDoors?.find((d) => d.id === 'passageS');
      if (S && f.kc_bolt_fort && near(S.y)) consider(dist(S.x, S.z) - 0.3, 1.6, { kind: 'kc_hatch', label: 'p_kc_down' });
      return;
    }
    if (here === 'isle_otringal') {
      const R = g.room, d = R.shutDoors?.find((q) => q.id === 'otringal-16-6');
      if (d && !f.kc_door_pump && near(d.y)) consider(dist(d.x, d.z) - 0.3, 1.6, { kind: 'kc_lock', door: 'pump', label: f.kc_key_pump ? 'p_kc_unlock' : 'p_door' });
      if (f.kc_pump_drop && !f.kc_key_pump && this.fountLand && near(this.fountLand.y)) consider(dist(this.fountLand.x, this.fountLand.z) - 0.2, 1.4, { kind: 'kc_take', door: 'pump', label: 'p_kc_take' });
      return;
    }
    if (here === 'hamalayi' && this.goat) {
      const G = this.goat;
      if (!f.kc_door_goat && near(G.door.y)) consider(dist(G.door.x, G.door.z) - 0.3, 1.9, { kind: 'kc_lock', door: 'goat', label: f.kc_key_goat ? 'p_kc_unlock' : 'p_door' });
      if (near(G.hay.y)) consider(dist(G.hay.x, G.hay.z), 1.3, { kind: 'kc_hay', label: f.kc_key_goat ? 'p_look' : 'p_search' });
      return;
    }
    if (here === 'zeelich' && this.mill) {
      const M = this.mill;
      if (!f.kc_door_mill && near(M.door.y)) consider(dist(M.door.x, M.door.z) - 0.3, 1.6, { kind: 'kc_lock', door: 'mill', label: f.kc_key_mill ? 'p_kc_unlock' : 'p_door' });
      if (this.late() && !f.kc_key_mill && near(M.key.y, 1.0)) consider(dist(M.key.x, M.key.z), 1.5, { kind: 'kc_take', door: 'mill', label: 'p_kc_take' });
      return;
    }
    if (here === 'desert' && this.mask) {
      const M = this.mask;
      if (!f.kc_box_mask && near(M.y, 0.9)) consider(dist(M.box.x, M.box.z), 1.3, { kind: 'kc_box', box: 'mask', label: 'p_kc_box' });
      return;
    }
    if (KR_ROOMS.includes(here) && KR[here]) {
      const K = KR[here], b = BOX_IN[here];
      if (b && !f['kc_box_' + b] && near(K.box.y ?? 0, 1.0)) consider(dist(K.box.x, K.box.z), 1.2, { kind: 'kc_box', box: b, label: 'p_kc_box' });
      for (const l of K.looks || []) if (near(l.y ?? 0, 1.0)) consider(dist(l.x, l.z), l.r, { kind: 'kc_look', room: here, key: l.key, label: 'p_look' });
      if (here === 'kc_tunnel' && !f.kc_bolt_fort) consider(dist(K.bolt.x, K.bolt.z), 1.2, { kind: 'kc_bolt', label: 'p_kc_bolt' });
      if (here === 'kc_pump') consider(dist(K.valve.x, K.valve.z), 1.1, { kind: 'kc_valve', label: f.kc_pump_on ? 'p_look' : 'p_kc_valve' });
      if (here === 'kc_mill') consider(dist(K.tin.x, K.tin.z), 1.0, { kind: 'kc_tin', label: f.kc_tin_mill ? 'p_look' : 'p_kc_tin' });
    }
  }
  interact(it) {
    if (typeof it?.kind !== 'string' || !it.kind.startsWith('kc_')) return false;
    const g = this.game, f = this.f, h = g.hero;
    const hero = (keys, done) => this.chain(keys.map((k) => ['hero', k]), done);
    switch (it.kind) {
      case 'kc_lock': return this.lock(it.door);
      case 'kc_chest':
        g.audio.play('chest', this.chest);
        if (f.kc_key_fort) { hero(['kc_fort_chest_empty']); return true; }
        hero(['kc_fort_chest'], () => this.giveKey('fort'));
        return true;
      case 'kc_hay':
        if (f.kc_key_goat) { hero(['kc_goat_hay']); return true; }
        g.audio.play('rummage');
        hero(['kc_goat_find'], () => this.giveKey('goat'));
        return true;
      case 'kc_take':
        if (it.door === 'pump') { hero(['kc_pump_take'], () => { delete f.kc_pump_drop; this.giveKey('pump'); }); return true; }
        if (it.door === 'mill') { hero(['kc_mill_find'], () => this.giveKey('mill')); return true; }
        return true;
      case 'kc_hatch':
        g.audio.play('doorIn');
        g.enterRoom('kc_tunnel', (R) => KR.kc_tunnel?.fromYard || R.spawn);
        return true;
      case 'kc_bolt':
        f.kc_bolt_fort = true; g.audio.play('clunk', h.pos); g.audio.play('door', h.pos);
        KR.kc_tunnel?.setBolt(true);
        hero(['kc_fort_bolt'], () => g.save(false));
        return true;
      case 'kc_box': return this.openBox(it.box);
      case 'kc_valve':
        if (f.kc_pump_on) { hero(['kc_pump_valve_on']); return true; }
        f.kc_pump_on = true; g.audio.play('valveShut', h.pos); g.audio.play('rumble');
        KR.kc_pump?.setJet(true); this.jet?.set(true);
        hero(['kc_pump_plate', 'kc_pump_valve'], () => g.save(false));
        return true;
      case 'kc_tin':
        if (f.kc_tin_mill) { hero(['kc_mill_tin_empty']); return true; }
        f.kc_tin_mill = true; KR.kc_mill?.setTin(true);
        h.coins += MILL_KASHES; g.audio.play('coin'); g.hud.toast('toast_kc_kashes', { n: MILL_KASHES }); g.hud.stats?.(h);
        hero(['kc_mill_tin'], () => g.save(false));
        return true;
      case 'kc_look': {
        const key = it.room === 'kc_tunnel' ? (it.key === 'shelter' ? (this.past('evacuation') ? 'kc_fort_shelter_after' : 'kc_fort_shelter') : 'kc_fort_roster')
          : it.room === 'kc_pump' ? 'kc_pump_small'
            : it.room === 'kc_goats' ? (it.key === 'window' ? (f.rf_roof ? 'kc_goat_window2' : 'kc_goat_window') : it.key === 'trunk' ? 'kc_goat_trunk' : 'kc_goat_stall')
              : 'kc_mill_' + it.key;
        hero([key]);
        return true;
      }
    }
    return false;
  }
  // a lock: its line without the key (the clue); with it, the key spent and the door open in the same step
  lock(d) {
    const g = this.game, f = this.f, h = g.hero;
    if (!f['kc_key_' + d]) {
      g.audio.play('doorLocked');
      g.say('', [t(d === 'mill' && !this.late() ? 'kc_mill_shut' : 'kc_' + d + '_locked')]);
      return true;
    }
    f['kc_door_' + d] = true;   // (the key is spent in this same step: keysHeld counts found and not yet used)
    this.sync();
    g.audio.play('clunk', h.pos); g.audio.play('door', h.pos);
    this.keyFx();
    if (d === 'fort') this.gate?.setOpen(true);
    g.hud.stats?.(h);
    this.chain([['hero', 'kc_unlock']], () => g.save(false));
    return true;
  }
  giveKey(d) {
    const g = this.game, f = this.f;
    if (f['kc_key_' + d]) return;
    f['kc_key_' + d] = true;
    this.sync(); this.applyWorld();
    g.found('key', 'it_kc_key', () => { g.hud.stats?.(g.hero); g.save(false); }, { icon: 'key' });
  }
  openBox(b) {
    const g = this.game, f = this.f, h = g.hero;
    if (f['kc_box_' + b]) return true;
    f['kc_box_' + b] = true;
    this.sync();
    // (the cap rises first, then the leaf inside fills it)
    h.clovers = Math.min(h.cloverMax, h.clovers + 1);
    g.audio.play('chest', h.pos); g.audio.play('pickClover');
    this.applyWorld();
    g.hud.toast('toast_kc_box', { n: h.cloverMax }, 3200); g.hud.stats?.(h);
    this.chain([['hero', 'kc_box_open']], () => g.save(false));
    return true;
  }
  // LBA's key over Twinsen's head as a lock opens: a small key rising and fading for a second
  keyFx() {
    const g = this.game, h = g.hero, k = smallKey(false);
    k.position.set(h.pos.x, h.pos.y + 2.2, h.pos.z); k.scale.setScalar(2.2);
    for (const c of k.children) { c.material = c.material.clone(); c.material.transparent = true; c.castShadow = false; }
    g.scene.add(k);
    this.fx.push({ obj: k, t: 0 });
  }
  // the sweeper and Ulla on the plaza, once each, after the high jet
  talkFirst(npc) {
    const id = npc?.def?.id, f = this.f;
    if (!f.kc_pump_on || !this.able()) return false;
    const say = (flag, key) => { if (f[flag]) return false; f[flag] = true; npc.engage?.(); this.chain([[id, key]], () => { npc.release?.(); this.game.save(false); }); return true; };
    if (id === 'ot_sweep') return say('kc_sweep', 'kc_sweep_jet');
    if (id === 'ot_ulla') return say('kc_ulla', 'kc_ulla_jet');
    return false;
  }

  // ================================================================ each frame
  update(dt) {
    this.sync();
    const g = this.game;
    this.jet?.update(dt);
    if (this.drop && this.fountKey) {
      const D = this.drop; D.t += dt;
      const k = Math.min(1, D.t / 0.7), y = D.from.y + (D.to.y - D.from.y) * k * k;
      this.fountKey.position.set(D.from.x + (D.to.x - D.from.x) * k, y + Math.sin(k * Math.PI) * 0.6, D.from.z + (D.to.z - D.from.z) * k);
      this.fountKey.rotation.z += dt * 12;
      if (k >= 1) { this.drop = null; this.placeFountKey(); g.audio.play('clunk', this.fountKey.position); }
    }
    for (let i = this.fx.length - 1; i >= 0; i--) {
      const F = this.fx[i]; F.t += dt;
      F.obj.position.y += dt * 0.6; F.obj.rotation.y += dt * 3;
      for (const c of F.obj.children) c.material.opacity = Math.max(0, 1 - F.t / 1.2);
      if (F.t >= 1.2) { g.scene.remove(F.obj); this.fx.splice(i, 1); }
    }
    for (const K of [this.fountKey, this.millKey]) { const s = K?.userData.glint; if (s && K.visible) s.material.opacity = 0.35 + 0.35 * Math.max(0, Math.sin(g.time * 2.6 + (K === this.millKey ? 1.7 : 0))); }
  }
  onEnterRoom() { this.applyWorld(); }

  // ================================================================ the pockets
  items() { const n = keysHeld(this.f); return n ? [{ id: 'kc_key', icon: 'key', n: n > 1 ? n : undefined }] : []; }
}
