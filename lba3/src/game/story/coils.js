// OREN-GUARDIAN: OG-6 "Coils and Consent" (docs/future/EXPANSION_PLAN.md Revision R1.11), inside chapter 14 of the
// expanded campaign (key 'network', story/network.js: the mill station). Not a chapter: the network owns it (net.og6)
// and asks it first at each hook; in the base campaign (exp_base) every hook here is inert and none of it shows.
//
// Since last month (the project's crews, the same round that bolted the governor into the valve room, OG-1) three
// Zeelich machines run on Balance Works coils: Oku's old mill (the coil is the drive coupling between the sails and the
// stones: even flour), the depot's feed pumps (the street's heat posts never cut out) and the shuttle pad's mooring clamp
// (a shuttle held steady in a crosswind: on time forty days). How Oren reaches them, by R1.4: nothing on Zeelich is
// joined by metal to the bore (the planets are joined by spaceship only), so no part there carries him: he neither hears,
// counts nor speaks on Zeelich (rules 2-3). The coils obey Vesk's central command instead, the project's channel, whose
// setting comes from the bore's governors at Citadel; Oren holds those on the drill's strokes (rule 3: a governor's
// setting; rule 4: only on the strokes). So every coil on the island grips on the drill's beat and slackens between,
// and the depot's "LOCAL SHUT-OFF · CENTRAL CONSENT" wheel turns itself back on the next tick: Vesk's design, refused by
// the centre Oren holds (R1.6 C). Vesk's wrong (central command, no local refusal) stays his.
//
// The mill (the station's job, in this order; nothing missable, no fail):
//   Baldino (his briefing, or at the mill on an older save) wants the coil out before his relay goes on: it runs on the
//   mill's wind, and whatever holds her drive holds his signal. Oku: brake her (the ball, as before). At her foot Baldino
//   hears the tick; Twinsen names it (the drill's beat; between beats he lets go: OG-2, rule 4) and teaches Baldino the
//   rule. Three clamp bolts loosen between ticks (on a tick the coil grips and kicks the wrench back: no damage). The coil
//   comes out and stops ticking. Baldino's dead coupling (oak and leather: turns a shaft or joins a pipe and carries
//   nothing else, not a signal, not warmth: introduced here by use, OG-5 relies on it) goes in its place, and his brass
//   float off the workshop hoist on the brake (it feels only the shaft; it can't guess the wind: somebody sets its band).
//   Then the relay on the balcony (as before), and the mill turns: racing, because Baldino's band is BREEZE in a gale.
//   Oku reads the sails, Twinsen sets the band (CALM · BREEZE · GALE, one notch a press, as the lighthouse dials); the
//   wind drops once and the band must follow it. Oku: "So that's my job now." The station is done (1/5).
// The street (optional; the vote changes lines and the aftermath, never access — R1.11's accept):
//   Councillor Brum (by the fountain) won't have coils pulled without the street; he asks Twinsen to show one machine
//   without the tick and to hear Snuff (flour), Pelleck (heat: his books) and Tavo (the shuttles' timetable). With the
//   mill on brass and the three heard, the street meets by the fountain; Twinsen proposes (a choice, retried at will):
//   only "one station at a time, with a person at each lever" is agreed. Pelleck writes the names (mill: Oku, pumps:
//   Pelleck, shuttle clamp: Tavo) and Brum puts up a board.
//
// Flags (og6_): og6_brief (Baldino told), og6_out (left the workshop since: Baldino goes to the mill), og6_beat (the tick
// recognised), og6_plan (the plan at the mill), og6_bolt 0-3, og6_coilOut (the coil off; the coupling carried),
// og6_fitted (coupling and float in), og6_relay (the relay up; the band to set), og6_dial 0-2 (CALM, BREEZE, GALE),
// og6_band 0-2 (set for the gale; set for the lull: done), og6_lull (the wind has dropped), og6_pump (the shut-off wheel
// tried), og6_brumAsk, og6_snuff, og6_pel, og6_tavo (heard), og6_vote (the street agreed). A save is never made inside a
// timing (each bolt, the dial and the band save at once); a load sets every part from the flags.
// A save from before OG-6 that already set the mill's relay the old way (c10_mill, no og6_relay) keeps it: the mill's
// part is not offered and the coil stays on (active()).
import * as THREE from 'three';
import { ChapterBase, SPEAKER_COLORS } from './base.js';
import { t } from '../i18n.js';
import { orenMats, plateMat } from '../orenpresence.js';
import { cyl, lathe, sphere, plane, canvasTex } from '../props.js';
import { Batch } from '../kit.js';
import '../text/oren.js';

const STROKE = 3.6;          // s between the drill's strokes (survey.js): the project's channel carries the beat here
const GRIP = 0.3;            // the first 30 % after a stroke the coils grip (R1.4 rule 4: he holds only on the strokes)
const PHI = -0.75;           // where the old mill's drive comes out of her wall (rad round her, 0 = +z, the street side)
const BANDS = ['calm', 'breeze', 'gale'];
const PRESET = 1;            // Baldino's float comes set for a breeze
const SPEED = { right: 0.75, race: 1.75, crawl: 0.25 };   // the old mill's sail speed (zeelich.js: 0.75 is her own)
const LULL_AFTER = 6;        // s after the gale's band is right, the wind drops
const MEET_C = { x: -19.2, z: 0 };   // the street meeting, east of the fountain (Zeelich local)
const MEET = { councilC: [0, 1.9], zmole2: [1.8, 1.0], ztri1: [-1.8, 1.0], ztri2: [1.7, -1.0], oku: [-1.7, -1.0], hero: [0, -1.9] };
const BRUM = [0, 1.9];       // where Brum stands by the fountain (from MEET_C)
const BOARD = { x: -19.6, z: 3.5 };
const FOLK = { zmole2: 'og6_snuff', ztri1: 'og6_pel', ztri2: 'og6_tavo' };

let LAMP = null;
const lampMats = () => (LAMP ??= {
  tick: new THREE.MeshStandardMaterial({ color: '#e0a648', emissive: '#e0a648', emissiveIntensity: 0, roughness: 0.4 }),   // (every coil's lamp: one material, so they tick together)
  dead: new THREE.MeshStandardMaterial({ color: '#3a3833', roughness: 0.6 }),
  amber: new THREE.MeshStandardMaterial({ color: '#e0a648', emissive: '#e0a648', emissiveIntensity: 0.9, roughness: 0.4 }),
  green: new THREE.MeshStandardMaterial({ color: '#8fd08a', emissive: '#5ab858', emissiveIntensity: 0.8, roughness: 0.4 }),
  iron: new THREE.MeshStandardMaterial({ color: '#4a4c54', roughness: 0.5, metalness: 0.5 }),
  cable: new THREE.MeshStandardMaterial({ color: '#2a2a2e', roughness: 0.8 }),
  oak: new THREE.MeshStandardMaterial({ color: '#9a6a3c', roughness: 0.75 }),
  leather: new THREE.MeshStandardMaterial({ color: '#5a3420', roughness: 0.85 }),
  brass: new THREE.MeshStandardMaterial({ color: '#d8a848', roughness: 0.35, metalness: 0.7 }),
});
const M4 = (x, y, z, rx = 0, ry = 0, rz = 0) => new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz, 'YXZ')), new THREE.Vector3(1, 1, 1));
const H = Math.PI / 2;

export class Coils extends ChapterBase {
  constructor(net) { super(net.story); this.net = net; this.shoveT = 0; }
  isCur(f) { return this.net.isCur(f); }
  reached(f) { return this.net.reached(f); }
  get Z() { return this.game.regions?.built('zeelich'); }   // (never builds it)
  get exp() { return this.story.inCampaign('throttle'); }
  get on() { return this.exp && this.net.isCur(); }
  // the coils are on Zeelich's machines from chapter 10 of the expanded campaign ("last month")
  shown() { const i = this.story.chapters.findIndex((c) => c.key === 'throttle'); return this.exp && i >= 0 && this.story.index >= i; }
  // the mill's part is played (an older save that set the relay the old way keeps it)
  active() { const f = this.f; return this.on && (!f.c10_mill || !!f.og6_relay); }
  room() { return this.game.room?.id; }
  here() { return this.room() === 'zeelich' && !!this.Z; }
  phase() { return ((((this.game.time || 0) % STROKE) + STROKE) % STROKE) / STROKE; }
  gripping() { return this.phase() < GRIP; }
  millDone() { return (this.f.og6_band | 0) >= 2; }
  heard() { const f = this.f; return !!(f.og6_snuff && f.og6_pel && f.og6_tavo); }
  wind() { return this.f.og6_lull ? 1 : 2; }   // (the band the wind wants: a gale, then a breeze)
  // the sails against the band: 'race' (set for less wind than this), 'crawl' (for more) or 'right'
  state() { const d = this.f.og6_dial ?? PRESET, w = this.wind(); return d === w ? 'right' : d < w ? 'race' : 'crawl'; }
  bandName(i = this.f.og6_dial ?? PRESET) { return t('og6_band_' + BANDS[i]); }

  // ---------------------------------------------------------------- places (world coordinates)
  // the old mill's frame: u out of her wall at the drive, v along it
  frame() {
    if (this.F) return this.F;
    const Z = this.Z; if (!Z) return null;
    const m = Z.mills[0], c = { x: m.x, z: m.z }, u = { x: Math.sin(PHI), z: Math.cos(PHI) }, v = { x: Math.cos(PHI), z: -Math.sin(PHI) };
    const at = (r, s = 0) => ({ x: c.x + u.x * r + v.x * s, z: c.z + u.z * r + v.z * s });
    const spot = (phi, r) => { const p = { x: c.x + Math.sin(phi) * r, z: c.z + Math.cos(phi) * r }, d = at(3.1); return { ...p, a: Math.atan2(d.x - p.x, d.z - p.z) }; };
    this.F = { c, u, v, at, drive: at(2.95), face: at(3.3), float: at(3.15, 0.8), stand: at(4.35), dead: at(3.55, -1.15),
      baldino: spot(PHI + 0.42, 4.7), oku: spot(PHI - 0.5, 4.6) };
    return this.F;
  }
  local(p) { const g = this.Z.group.position; return { x: p.x - g.x, z: p.z - g.z }; }
  world(x, z) { const g = this.Z.group.position; return { x: g.x + x, z: g.z + z }; }
  gy(x, z) { return this.game.physics.groundAt(x, z, 7); }   // (under the old mill's gallery: the ground, not its planks)

  // ---------------------------------------------------------------- props
  decorate() {
    const Z = this.Z;
    if (!Z || !this.once('zeelich')) return;
    const g = this.game, P = g.physics, F = this.frame(), m = orenMats(), L = lampMats(), gp = Z.group.position;
    const root = new THREE.Group(); root.visible = false; Z.group.add(root); this.root = root;
    const B = new Batch(root), flat = new Batch(root, { cast: false });
    this.cols = [];
    const col = (p, r, top, on = true) => { const c = P.add({ type: 'cyl', x: p.x, z: p.z, r, top: this.gy(p.x, p.z) + top, noStand: true, enabled: false }); c.og6 = on; this.cols.push(c); return c; };
    // one Balance Works coil (frame, glazed drum, bronze bands and cap, maker's plate, lamp, the cable into the ground),
    // its drum's axis along the frame's +z, merged into the batch at matrix W
    const coil = (W, { cable = true, lamp = true } = {}) => {
      const add = (geo, mat, mm, b = B) => b.addM(geo, mat, W.clone().multiply(mm));
      add(new THREE.BoxGeometry(0.5, 0.06, 0.5), L.iron, M4(0, 0.03, 0), flat);
      add(cyl(0.06, 0.07, 0.62, 8), L.iron, M4(0, 0.34, 0));
      add(new THREE.BoxGeometry(0.4, 0.05, 0.42), L.iron, M4(0, 0.66, 0));
      add(cyl(0.24, 0.24, 0.5, 16), m.glaze, M4(0, 0.93, 0, H, 0, 0));
      for (const z of [-0.2, 0.2]) add(cyl(0.26, 0.26, 0.05, 16), m.bronze, M4(0, 0.93, z, H, 0, 0), flat);
      add(cyl(0.17, 0.2, 0.05, 14), m.bronze, M4(0, 0.93, 0.27, H, 0, 0), flat);
      add(plane(0.26, 0.1), plateMat(), M4(0, 0.93, 0.297), flat);
      if (lamp) add(sphere(0.035, 8, 6), L.tick, M4(0, 1.19, 0.08), flat);
      if (cable) { add(cyl(0.02, 0.02, 0.62, 5), L.cable, M4(0.12, 0.36, -0.12), flat); add(cyl(0.02, 0.02, 0.7, 5), L.cable, M4(0.47, 0.03, -0.12, 0, 0, H), flat); }
    };
    const Wat = (p, ry) => { const q = this.local(p); return M4(q.x, this.gy(p.x, p.z), q.z, 0, ry, 0); };
    const ryOut = Math.atan2(F.u.x, F.u.z);
    // ---- the old mill's drive: the sail shaft out of her wall, the coil on it (a group: it comes off), a pulley and the
    // belt back up into her stones
    {
      const W = Wat(F.drive, ryOut);
      const add = (geo, mat, mm, b = B) => b.addM(geo, mat, W.clone().multiply(mm));
      add(cyl(0.06, 0.06, 0.55, 8), L.iron, M4(0, 0.93, -0.5, H, 0, 0));
      add(cyl(0.06, 0.06, 0.2, 8), L.iron, M4(0, 0.93, 0.36, H, 0, 0));
      add(cyl(0.15, 0.15, 0.08, 14), m.bronze, M4(0, 0.93, 0.48, H, 0, 0));
      add(new THREE.BoxGeometry(0.06, 1.15, 0.03), L.leather, M4(0, 1.45, 0.08, -0.62, 0, 0));
      add(new THREE.BoxGeometry(0.5, 0.06, 0.5), L.iron, M4(0, 0.03, 0), flat);
      add(cyl(0.06, 0.07, 0.62, 8), L.iron, M4(0, 0.34, 0));
      add(new THREE.BoxGeometry(0.4, 0.05, 0.42), L.iron, M4(0, 0.66, 0));
      // the coil itself (its own group: on the shaft, then lying beside her, quiet)
      const cg = new THREE.Group(), q = this.local(F.drive);
      const mk = (geo, mat, x, y, z, rx = 0) => { const o = new THREE.Mesh(geo, mat); o.position.set(x, y, z); o.rotation.x = rx; o.castShadow = false; cg.add(o); return o; };
      mk(cyl(0.24, 0.24, 0.5, 16), m.glaze, 0, 0, 0, H).castShadow = true;
      for (const z of [-0.2, 0.2]) mk(cyl(0.26, 0.26, 0.05, 16), m.bronze, 0, 0, z, H);
      mk(cyl(0.17, 0.2, 0.05, 14), m.bronze, 0, 0, 0.27, H);
      mk(plane(0.26, 0.1), plateMat(), 0, 0, 0.297);
      this.coilLamp = mk(sphere(0.035, 8, 6), L.tick, 0, 0.26, 0.08);
      this.bolts = [-1, 0, 1].map((k) => mk(cyl(0.03, 0.03, 0.05, 6), L.iron, Math.sin(k * 2.1) * 0.13, Math.cos(k * 2.1) * 0.13, -0.27, H));
      this.coilOn = { x: q.x, y: this.gy(F.drive.x, F.drive.z) + 0.93, z: q.z, ry: ryOut, rx: 0 };
      const d = this.local(F.dead); this.coilOff = { x: d.x, y: this.gy(F.dead.x, F.dead.z) + 0.25, z: d.z, ry: ryOut + 0.9, rx: 0.12 };
      root.add(cg); this.coilG = cg;
      // the dead coupling (oak, two leather straps) where the coil was
      const dc = new THREE.Group();
      { const o = new THREE.Mesh(cyl(0.16, 0.16, 0.42, 12), L.oak); o.rotation.x = H; o.castShadow = true; dc.add(o);
        for (const z of [-0.12, 0.12]) { const s = new THREE.Mesh(cyl(0.172, 0.172, 0.06, 12), L.leather); s.rotation.x = H; s.position.z = z; dc.add(s); } }
      dc.position.set(q.x, this.coilOn.y, q.z); dc.rotation.y = ryOut; dc.visible = false; root.add(dc); this.couplingG = dc;
      // Baldino's brass float on the brake: an iron stand, the oil cup, the float's rod, the band's dial with its pointer,
      // and a lamp (amber: the band is wrong for the wind; green: right)
      const fl = new THREE.Group(), fq = this.local(F.float);
      { const st = new THREE.Mesh(cyl(0.04, 0.05, 0.7, 8), L.iron); st.position.y = 0.35; fl.add(st);
        const cup = new THREE.Mesh(lathe([[0.001, 0], [0.13, 0], [0.15, 0.06], [0.15, 0.3], [0.12, 0.34], [0.001, 0.34]], 14), L.brass); cup.position.y = 0.7; cup.castShadow = true; fl.add(cup);
        const rod = new THREE.Mesh(cyl(0.012, 0.012, 0.45, 5), L.brass); rod.position.set(0, 1.25, 0); fl.add(rod); this.floatRod = rod;
        const tex = canvasTex(128, 128, (x, w, h) => {
          x.fillStyle = '#efe4c8'; x.beginPath(); x.arc(w / 2, h / 2, w / 2 - 2, 0, Math.PI * 2); x.fill(); x.strokeStyle = '#5a3a14'; x.lineWidth = 5; x.stroke();
          x.fillStyle = '#2a1e10'; x.font = 'bold 15px sans-serif'; x.textAlign = 'center';
          x.fillText('CALM', w * 0.24, h * 0.62); x.fillText('BREEZE', w / 2, h * 0.26); x.fillText('GALE', w * 0.77, h * 0.62);
        });
        const dial = new THREE.Mesh(new THREE.CircleGeometry(0.1, 20), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.6 })); dial.position.set(0, 0.86, 0.152); fl.add(dial);
        const ptr = new THREE.Group(); ptr.position.set(0, 0.86, 0.158); const pm = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.08, 0.006), L.iron); pm.position.y = 0.035; ptr.add(pm); fl.add(ptr); this.pointer = ptr;
        this.floatLamp = new THREE.Mesh(sphere(0.03, 8, 6), L.amber); this.floatLamp.position.set(0.1, 1.06, 0.06); fl.add(this.floatLamp); }
      fl.position.set(fq.x, this.gy(F.float.x, F.float.z), fq.z); fl.rotation.y = ryOut; fl.visible = false; root.add(fl); this.floatG = fl;
      this.driveCol = col(F.at(3.05), 0.36, 1.25);
      this.floatCol = col(F.float, 0.2, 1.3, false);
      this.deadCol = col(F.dead, 0.3, 0.5, false);
    }
    // ---- the depot's feed pumps: a coil outside the north fence west of the gate, its pipe through the chain-link; the
    // LOCAL SHUT-OFF wheel on its side (a mesh of its own: it turns, and turns back)
    {
      const p = this.world(6.4, 8.25), W = Wat(p, H);
      coil(W);
      B.addM(cyl(0.05, 0.05, 0.3, 8), L.iron, W.clone().multiply(M4(0, 1.2, 0)));   // (up out of the drum)
      B.addM(cyl(0.05, 0.05, 1.5, 8), L.iron, Wat(this.world(6.4, 9.0), 0).multiply(M4(0, 1.33, 0, H, 0, 0)));   // (back through the chain-link into the yard)
      const wh = new THREE.Group(), q = this.local(p);
      { const ring = new THREE.Mesh(new THREE.TorusGeometry(0.11, 0.015, 5, 16), L.iron); wh.add(ring);
        for (const a of [0, H]) { const s = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.014, 0.014), L.iron); s.rotation.z = a; wh.add(s); } }
      const wq = new THREE.Vector3(0.3, 0.93, 0).applyAxisAngle(new THREE.Vector3(0, 1, 0), H);
      wh.position.set(q.x + wq.x, this.gy(p.x, p.z) + wq.y, q.z + wq.z); root.add(wh); this.pumpWheel = wh;
      this.pumpP = p; this.pumpLook = { x: p.x, z: p.z - 0.55 };
      col(p, 0.34, 1.25);
    }
    // ---- the shuttle pad's mooring clamp: a coil at the pad's rim, toward the street, with its slate: ON TIME 40 DAYS
    {
      const sp = Z.shuttlePad;
      if (sp) {
        const a0 = Math.atan2(gp.x - sp.x, gp.z - sp.z);
        let p = null;
        for (const [da, r] of [[0.6, 5.0], [0.75, 5.2], [0.45, 5.2], [0.9, 5.0], [0.3, 5.4]]) { const q = { x: sp.x + Math.sin(a0 + da) * r, z: sp.z + Math.cos(a0 + da) * r }; if (!P.blockedAt(q.x, q.z, this.gy(q.x, q.z) + 0.2, 0.5)) { p = q; break; } }
        p ??= { x: sp.x + Math.sin(a0 + 0.6) * 5.0, z: sp.z + Math.cos(a0 + 0.6) * 5.0 };
        const ry = Math.atan2(sp.x - p.x, sp.z - p.z) + Math.PI;   // (its cap toward the street, its back to the pad)
        coil(Wat(p, ry));
        const tex = canvasTex(128, 64, (x, w, h) => { x.fillStyle = '#2c3330'; x.fillRect(0, 0, w, h); x.strokeStyle = '#8a6a40'; x.lineWidth = 6; x.strokeRect(3, 3, w - 6, h - 6); x.fillStyle = '#f2efe4'; x.font = 'bold 17px sans-serif'; x.textAlign = 'center'; x.fillText('ON TIME', w / 2, 28); x.fillText('40 DAYS', w / 2, 50); });
        flat.addM(plane(0.32, 0.16), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.8 }), Wat(p, ry).multiply(M4(0, 0.5, 0.215)));
        this.padP = p; this.padLook = { x: p.x + Math.sin(ry) * 0.55, z: p.z + Math.cos(ry) * 0.55 };
        col(p, 0.34, 1.25);
      }
    }
    // ---- Brum's board by the fountain (after the vote): THE STREET AGREES
    {
      const p = this.world(BOARD.x, BOARD.z), q = this.local(p), bg = new THREE.Group();
      bg.position.set(q.x, this.gy(p.x, p.z), q.z); bg.rotation.y = Math.PI;
      const post = new THREE.Mesh(cyl(0.04, 0.045, 1.3, 6), L.oak); post.position.y = 0.65; bg.add(post);
      const tex = canvasTex(256, 176, (x, w, h) => {
        x.fillStyle = '#2c3330'; x.fillRect(0, 0, w, h); x.strokeStyle = '#a07a48'; x.lineWidth = 8; x.strokeRect(4, 4, w - 8, h - 8);
        x.fillStyle = '#f2efe4'; x.textAlign = 'center'; x.font = 'bold 22px sans-serif'; x.fillText('THE STREET AGREES', w / 2, 34);
        x.font = '17px sans-serif'; x.fillText('One station at a time.', w / 2, 62); x.fillText('A person at each lever.', w / 2, 84);
        x.font = 'italic 16px serif'; x.fillText('Mill: Oku', w / 2, 112); x.fillText('Pumps: Pelleck', w / 2, 132); x.fillText('Shuttle clamp: Tavo', w / 2, 152);
      });
      const pl = new THREE.Mesh(plane(0.66, 0.45), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.85 })); pl.position.set(0, 1.12, 0.03); bg.add(pl);
      bg.visible = false; root.add(bg); this.board = bg; this.boardP = p;
      this.boardCol = col(p, 0.1, 1.5, false);
    }
    B.build(); flat.build();
    Z.updaters.push((dt) => this.tick(dt));
    this.show();
  }

  // the world as the flags have it (a load, an area's build, each step)
  show() {
    if (!this.root) return;
    const f = this.f, on = this.shown();
    this.root.visible = on;
    const out = on && !!f.og6_coilOut, fit = on && !!f.og6_fitted;
    const pos = out ? this.coilOff : this.coilOn;
    this.coilG.position.set(pos.x, pos.y, pos.z); this.coilG.rotation.set(pos.rx, pos.ry, 0, 'YXZ');
    this.coilLamp.material = out ? lampMats().dead : lampMats().tick;
    this.bolts.forEach((b, i) => { b.position.z = -0.27 - (out || i < (f.og6_bolt | 0) ? 0.05 : 0); });
    this.couplingG.visible = fit; this.floatG.visible = fit;
    this.setDial(f.og6_dial ?? PRESET);
    this.board.visible = on && !!f.og6_vote;
    for (const c of this.cols) c.enabled = on && (c.og6 || (c === this.floatCol && fit) || (c === this.deadCol && out) || (c === this.boardCol && !!f.og6_vote));
  }
  setDial(i) { if (this.pointer) this.pointer.rotation.z = [1.1, 0, -1.1][i]; if (this.floatRod) this.floatRod.position.y = 1.18 + 0.05 * i; }

  // Zeelich's own clock (every frame on Zeelich, dialogue too): the coils' lamps on the beat, the tick, the shut-off
  // wheel, the mill's sails against the band, a kicked-back wrench
  tick(dt) {
    const g = this.game, f = this.f, h = g.hero;
    if (!this.root) return;
    if (this.root.visible !== this.shown()) this.show();
    const mill = this.Z?.mills?.[0];
    if (mill) mill.goal = this.active() && f.og6_relay && !this.millDone() ? SPEED[this.state()] : null;
    if (!this.root.visible) return;
    const p = this.phase(), grip = p < GRIP;
    lampMats().tick.emissiveIntensity = grip ? 0.95 : 0;
    if (p < (this.lastP ?? 0) && g.state !== 'title') {
      const near = (q) => q && Math.hypot(h.pos.x - q.x, h.pos.z - q.z) < 9;
      if ((!f.og6_coilOut && near(this.F?.drive)) || near(this.pumpP) || near(this.padP)) g.audio.play('tick');
      if (this.pumpBack) { this.pumpBack = false; this.wheelGoal = 0; g.audio.play('clunk'); }
    }
    this.lastP = p;
    if (this.pumpWheel) { const w = this.wheelGoal || 0; this.wheelA = (this.wheelA || 0) + (w - (this.wheelA || 0)) * Math.min(1, dt * 6); this.pumpWheel.rotation.z = this.wheelA; }
    if (this.floatLamp && f.og6_fitted) this.floatLamp.material = !f.og6_relay ? lampMats().dead : this.millDone() || this.state() === 'right' ? lampMats().green : lampMats().amber;
    if (this.shoveT > 0) { const d = Math.min(dt, this.shoveT); g.physics.move(h, this.shove.x * 2.0 * d, this.shove.z * 2.0 * d); this.shoveT -= dt; }
  }

  // ---------------------------------------------------------------- the network's hooks
  // Baldino's briefing in the workshop gains the coil (the network's begin)
  briefLines() { return this.exp ? [['hero', 'og6_tw_brief'], ['baldino', 'og6_bal_brief1'], ['baldino', 'og6_bal_brief2'], ['baldino', 'og6_bal_brief3'], ['hero', 'og6_tw_brief2'], ['baldino', 'og6_bal_brief4']] : []; }
  briefDone() { if (this.exp) this.f.og6_brief = true; }
  // (out of the workshop — onto Zeelich's street, or anywhere: rooms are entered — Baldino goes ahead to the mill)
  onEnterRoom(id) { if (this.on && id !== 'workshop' && this.f.og6_brief) this.f.og6_out = true; }
  onExitRoom(id) { if (this.on && id === 'workshop' && this.f.og6_brief) this.f.og6_out = true; }
  // the relay on the balcony waits for the swap; set, the band follows (network.js c10mill)
  relayWaits() { return this.active() && !this.f.og6_fitted; }
  takesRelay() { return this.active() && !!this.f.og6_fitted; }
  afterRelay() {
    const g = this.game, f = this.f;
    f.og6_relay = true; f.og6_dial ??= PRESET;
    this.chain([['narrator', 'c10_relay_mill'], ['oku', 'og6_oku_relay_race']], () => { g.updateObjective(); g.save(false); this.story.refreshCast(); });
  }
  brakeLine() { return this.active() ? 'og6_oku_brake' : 'c10_oku_brake'; }
  // the street's people OG-6 talks to before Zeelich's street life does (story/zeelife.js asks)
  claims(npc) {
    const id = npc.def.id, f = this.f;
    if (!this.on || !this.here()) return false;
    if (FOLK[id]) return !!f.og6_brumAsk && !f[FOLK[id]];
    return false;
  }

  place(id) {
    const f = this.f;
    if (!this.on || !this.Z) return undefined;
    const F = this.frame();
    if (this.meeting && MEET[id] && id !== 'hero') return this.meetSpot(id);
    switch (id) {
      case 'councilC': if (!f.c10_started) return undefined; { const p = this.world(MEET_C.x + BRUM[0], MEET_C.z + BRUM[1]), fo = this.world(-24, 0); return { ...p, a: Math.atan2(fo.x - p.x, fo.z - p.z) }; }
      case 'baldino':
        if (!this.active() || this.millDone() || this.net.done() >= 5) return undefined;
        if (this.room() === 'workshop' && !f.og6_out) return undefined;   // (he's still at his bench while Twinsen is there)
        return { ...F.baldino };
      case 'oku': return this.active() && f.og6_relay ? { ...F.oku } : undefined;
    }
    return undefined;
  }
  meetSpot(id) { const [dx, dz] = MEET[id], p = this.world(MEET_C.x + dx, MEET_C.z + dz), c = this.world(MEET_C.x, MEET_C.z); return { ...p, a: Math.atan2(c.x - p.x, c.z - p.z) }; }

  // ---------------------------------------------------------------- interaction
  interactables(consider, dist) {
    const f = this.f;
    if (!this.root?.visible || !this.here()) return;
    const F = this.frame(), h = this.game.hero;
    if (h.pos.y > this.gy(h.pos.x, h.pos.z) + 1.5) return;   // (up on the mill's stones or gallery: nothing here)
    if (!f.og6_coilOut) consider(dist(F.face.x, F.face.z), 1.3, { kind: 'og6coil', label: this.on && f.og6_plan && f.c10_millBraked ? 'p_loosen' : 'p_look' });
    else {
      consider(dist(F.dead.x, F.dead.z), 1.0, { kind: 'og6dead', label: 'p_look' });
      if (!f.og6_fitted) consider(dist(F.face.x, F.face.z), 1.3, { kind: 'og6fit', label: 'p_fit' });
      else consider(dist(F.face.x, F.face.z), 1.1, { kind: 'og6coupling', label: 'p_look' });
    }
    if (f.og6_fitted) consider(dist(F.float.x, F.float.z), 1.15, { kind: 'og6band', label: this.active() && f.og6_relay && !this.millDone() ? 'p_band' : 'p_look' });
    if (this.pumpLook) consider(dist(this.pumpLook.x, this.pumpLook.z), 1.0, { kind: 'og6pump', label: 'p_valve' });
    if (this.padLook) consider(dist(this.padLook.x, this.padLook.z), 1.0, { kind: 'og6pad', label: 'p_look' });
    if (f.og6_vote) consider(dist(this.boardP.x, this.boardP.z - 0.5), 1.0, { kind: 'og6board', label: 'p_look' });
  }
  interact(it) {
    const g = this.game, f = this.f, h = g.hero;
    const look = (keys, done) => { this.chain(keys.map((k) => (Array.isArray(k) ? k : ['hero', k])), done); return true; };
    const beat = () => (f.og6_beat ? [] : (f.og6_beat = true, ['og6_beat']));
    switch (it.kind) {
      case 'og6coil':
        if (this.on && f.og6_plan && f.c10_millBraked) { h.act('use', 0.6, () => this.loosen(), 0.3); return true; }
        if (this.on && f.og6_plan) return look([['baldino', 'og6_bal_brake']]);
        return look(['og6_coil_look', ...beat()]);
      case 'og6fit': h.act('use', 0.9, () => this.fit(), 0.4); return true;
      case 'og6dead': return look(['og6_dead_look']);
      case 'og6coupling': return look(['og6_coupling_look']);
      case 'og6band':
        if (this.active() && f.og6_relay && !this.millDone()) { h.act('use', 0.5, () => this.turnBand(), 0.25); return true; }
        g.say('n_hero', [t('og6_float_look', { b: this.bandName() })], null, h, SPEAKER_COLORS.hero);
        return true;
      case 'og6pump':
        h.act('use', 0.6, () => {
          this.wheelGoal = -Math.PI * 0.9; g.audio.play('tapSqueak'); this.pumpBack = true;
          const first = !f.og6_pump; f.og6_pump = true;
          this.chain([['hero', 'og6_pump_look'], ['narrator', 'og6_pump_try'], ...(first ? [['hero', 'og6_tw_pump']] : []), ...beat().map((k) => ['hero', k])], () => g.save(false));
        }, 0.3);
        return true;
      case 'og6pad': return look(['og6_pad_look', ...beat()]);
      case 'og6board': return look(['og6_board_look']);
    }
    return false;
  }
  // a clamp bolt: between ticks it turns; on a tick the coil grips and the wrench kicks back
  loosen() {
    const g = this.game, f = this.f, h = g.hero;
    if (f.og6_coilOut || !this.on) return;
    if (this.gripping()) {
      g.audio.play('clang'); g.camRig.shake(0.1);
      const F = this.frame(); this.shove = { x: F.u.x, z: F.u.z }; this.shoveT = 0.35;
      if (!this.toldGrip) { this.toldGrip = true; this.chain([['hero', 'og6_tw_grip']]); }
      return;
    }
    f.og6_bolt = Math.min(3, (f.og6_bolt | 0) + 1);
    g.audio.play('clunk'); g.audio.play('select');
    this.show(); g.updateObjective();
    if (f.og6_bolt >= 3) { this.coilOut(); return; }
    g.save(false);
    this.chain([['baldino', f.og6_bolt === 1 ? 'og6_bal_bolt1' : 'og6_bal_bolt2']]);
  }
  // the third bolt: the coil comes off, stops ticking; Baldino hands over his dead coupling
  coilOut() {
    const g = this.game, f = this.f;
    f.og6_coilOut = true;
    g.audio.play('thump');
    this.show(); g.updateObjective();
    this.chain([['baldino', 'og6_bal_out1'], ['hero', 'og6_tw_out'], ['baldino', 'og6_bal_out2']], () => {
      g.found('coupling', 'it_coupling', () => this.chain([['baldino', 'og6_bal_c1'], ['baldino', 'og6_bal_c2'], ['baldino', 'og6_bal_c3']], () => { g.updateObjective(); g.save(false); }), { icon: 'part' });
      g.save(false);
    });
  }
  fit() {
    const g = this.game, f = this.f;
    if (f.og6_fitted || !f.og6_coilOut) return;
    f.og6_fitted = true; f.og6_dial ??= PRESET;
    g.audio.play('put'); g.audio.play('clunk');
    this.show(); g.updateObjective();
    this.chain([['narrator', 'og6_fit'], ['baldino', 'og6_bal_f1'], ['baldino', 'og6_bal_f2'], ['baldino', 'og6_bal_f3']], () => { g.updateObjective(); g.save(false); });
  }
  // one notch of the band; Oku reads the sails a moment later (update)
  turnBand() {
    const g = this.game, f = this.f;
    f.og6_dial = ((f.og6_dial ?? PRESET) + 1) % 3;
    this.setDial(f.og6_dial);
    g.audio.play('select');
    g.hud.toast('og6_toast_band', { b: this.bandName() });
    this.readT = 1.3;
    g.save(false);
  }
  // Oku's reading of the sails against the band
  read() {
    const g = this.game, f = this.f, s = this.state();
    // (NW-1: the first wrong band here is heard on the line by a station already on it, story/bands.js)
    if (s !== 'right') { this.chain([['oku', s === 'race' ? 'og6_oku_race' : 'og6_oku_crawl'], ...(this.net.nw1?.complain('mill') || [])]); return; }
    if (!f.og6_lull) { f.og6_band = 1; this.lullT = 0; this.chain([['oku', 'og6_oku_right1']], () => { g.updateObjective(); g.save(false); }); return; }
    f.og6_band = 2;
    this.chain([['oku', 'og6_oku_right2'], ['baldino', 'og6_bal_end'], ['hero', 'og6_tw_end'], ['oku', 'c10_oku_2']], () => {
      this.story.refreshCast();
      this.net.stationDone('mill');
    });
  }

  update(dt) {
    const g = this.game, f = this.f;
    if (!this.on) return;
    const play = g.state === 'play' && !g.trans;
    if (this.readT > 0 && play) { this.readT -= dt; if (this.readT <= 0) this.read(); }
    if (this.active() && f.og6_relay && (f.og6_band | 0) === 1 && !f.og6_lull && play) {
      this.lullT = (this.lullT || 0) + dt;
      // (the wind drops; a band already turned to suit it is read at once)
      if (this.lullT >= LULL_AFTER) { f.og6_lull = true; this.chain([['oku', 'og6_oku_lull']], () => { g.updateObjective(); g.save(false); if (this.state() === 'right') this.read(); }); }
    }
    // the meeting's choice put off (the menu's Cancel): Brum lets him think; walked away, the street goes back to its business
    if (this.menuOpen && play) { this.menuOpen = false; this.chain([['councilC', 'og6_meet_cancel']]); }
    if (this.meeting && !this.menuOpen && play && this.Z) { const c = this.world(MEET_C.x, MEET_C.z); if (Math.hypot(g.hero.pos.x - c.x, g.hero.pos.z - c.z) > 9) { this.meeting = false; this.story.refreshCast(); } }
    const F = this.F, h = g.hero, nearDrive = F && this.here() && Math.hypot(h.pos.x - F.stand.x, h.pos.z - F.stand.z) < 4;
    this.nudge(dt, 'og6_bolt', this.active() && !!f.og6_plan && !!f.c10_millBraked && !f.og6_coilOut && nearDrive, 40, 'og6_nudge_bolt');
    this.nudge(dt, 'og6_band', this.active() && !!f.og6_relay && !this.millDone() && this.state() !== 'right' && nearDrive && !(this.readT > 0), 35, 'og6_nudge_band');
  }

  talk(npc) {
    const g = this.game, f = this.f, id = npc.def.id;
    if (!this.on) return false;
    const c = (lines, done) => { this.chain(lines, done); return true; };
    const save = () => { this.story.refreshCast(); g.updateObjective(); g.save(false); };
    switch (id) {
      case 'oku': {
        if (!this.active()) return false;
        if (!f.c10_okuAsk) return c([['oku', 'og6_oku_1'], ['oku', 'og6_oku_2']], () => { f.c10_okuAsk = true; save(); });
        if (!f.c10_millBraked) return c([['oku', 'og6_oku_wait']]);
        if (!f.og6_fitted) return c([['oku', 'og6_oku_swap']]);
        if (!f.og6_relay) return c([['oku', 'og6_oku_relay']]);
        if (!this.millDone()) { const s = this.state(); return c([['oku', s === 'race' ? 'og6_oku_race' : s === 'crawl' ? 'og6_oku_crawl' : f.og6_lull ? 'og6_oku_right2' : 'og6_oku_right1']]); }
        return c([['oku', 'og6_oku_after']]);
      }
      case 'baldino': {
        if (!this.active() || this.millDone() || this.room() !== 'zeelich') return false;   // (in the workshop: his own lines)
        const brief = f.og6_brief ? [] : [['hero', 'og6_tw_brief'], ['baldino', 'og6_bal_brief1'], ['baldino', 'og6_bal_brief2'], ['baldino', 'og6_bal_brief3']];
        if (brief.length) f.og6_brief = true;
        if (!f.c10_millBraked) return c([...brief, ['baldino', 'og6_bal_brake']], save);
        if (!f.og6_plan) return c([...brief, ['baldino', 'og6_bal_m1'], ['baldino', 'og6_bal_m2'], ['hero', 'og6_tw_m1'], ['baldino', 'og6_bal_m3'], ['hero', 'og6_tw_m2'], ['hero', 'og6_tw_m3'], ['baldino', 'og6_bal_m4']], () => { f.og6_plan = true; f.og6_beat = true; save(); });
        if (!f.og6_coilOut) return c([['baldino', 'og6_bal_bolts']]);
        if (!f.og6_fitted) return c([['baldino', 'og6_bal_fit']]);
        if (!f.og6_relay) return c([['baldino', 'og6_bal_relay']]);
        return c([['baldino', 'og6_bal_band']]);
      }
      case 'councilC': {
        if (!f.og6_brumAsk) return c([['councilC', 'og6_brum_1'], ['councilC', 'og6_brum_2'], ['hero', 'og6_tw_brum'], ['councilC', 'og6_brum_3']], () => { f.og6_brumAsk = true; save(); });
        if (f.og6_vote) return c([['councilC', 'og6_brum_after']]);
        if (!this.heard()) return c([['councilC', 'og6_brum_need']]);
        if (!this.millDone()) return c([['councilC', 'og6_brum_mill']]);
        this.meet();
        return true;
      }
      case 'zmole2': case 'ztri1': case 'ztri2': {
        const k = FOLK[id], who = { zmole2: 'snuff', ztri1: 'pel', ztri2: 'tavo' }[id];
        if (!this.claims(npc)) return false;
        return c([['hero', `og6_tw_${who}`], [id, `og6_${who}_1`], [id, `og6_${who}_2`], ['hero', `og6_tw_${who}2`], [id, `og6_${who}_3`]], () => { f[k] = true; save(); });
      }
    }
    return false;
  }

  // ---------------------------------------------------------------- the street meeting (by the fountain)
  meet() {
    const g = this.game;
    if (this.meeting) { this.propose(true); return; }
    const first = !this.met;
    g.startTransition(() => {
      this.meeting = true; this.met = true;
      this.story.refreshCast();
      const p = this.meetSpot('hero'), b = this.meetSpot('councilC'), h = g.hero;
      h.pos.set(p.x, g.physics.groundAt(p.x, p.z), p.z); h.angle = Math.atan2(b.x - p.x, b.z - p.z); h.vel?.set(0, 0);
    }, null, () => {
      const open = [['councilC', 'og6_brum_ready'], ['councilC', 'og6_meet_1'], ['oku', 'og6_meet_oku'], ['zmole2', 'og6_meet_snuff'], ['ztri1', 'og6_meet_pel'], ['ztri2', 'og6_meet_tavo'], ['councilC', 'og6_meet_ask']];
      this.chain(first ? open : [['councilC', 'og6_brum_again']], () => this.propose());
    });
  }
  propose(again = false) {
    const g = this.game;
    const go = () => g.openMenu('og6_menu_title', [{ key: 'og6_prop_all', id: 'all' }, { key: 'og6_prop_none', id: 'none' }, { key: 'og6_prop_one', id: 'one' }], (it) => this.answer(it.id));
    if (again) this.chain([['councilC', 'og6_brum_again']], go); else go();
    // (the menu's Cancel: Brum lets him think; the street goes back to its business)
    this.menuOpen = true;
  }
  answer(id) {
    const g = this.game, f = this.f;
    this.menuOpen = false;
    if (id === 'all') { this.chain([['ztri1', 'og6_re_all1'], ['councilC', 'og6_re_all2']], () => this.propose()); return; }
    if (id === 'none') { this.chain([['oku', 'og6_re_none1'], ['councilC', 'og6_re_none2']], () => this.propose()); return; }
    this.chain([['ztri2', 'og6_re_one1'], ['ztri1', 'og6_re_one2'], ['zmole2', 'og6_re_one3'], ['councilC', 'og6_re_one4'], ['ztri1', 'og6_re_one5']], () => {
      f.og6_vote = true; g.audio.play('bonus');
      this.show();
      this.disperse(() => { g.updateObjective(); g.save(false); });
    });
  }
  disperse(then) {
    const g = this.game;
    g.startTransition(() => { this.meeting = false; this.story.refreshCast(); }, null, then);
  }

  // ---------------------------------------------------------------- state
  applyFlags() {
    const f = this.f;
    this.meeting = false; this.menuOpen = false; this.readT = 0; this.lullT = 0; this.shoveT = 0; this.pumpBack = false; this.wheelGoal = 0;
    if ((f.og6_bolt | 0) > 3) f.og6_bolt = 3;
    if (f.og6_band > 2) f.og6_band = 2;
    if (f.og6_dial != null && !(f.og6_dial >= 0 && f.og6_dial <= 2)) f.og6_dial = PRESET;
    this.game.regions?.whenBuilt('zeelich', () => { this.decorate(); this.show(); });
  }
  regionBuilt() { this.show(); }
  // the mill's step on the network's objective (null: the network's own line)
  millSub() {
    const f = this.f;
    if (!this.active() || f.c10_mill || !f.c10_okuAsk) return null;
    if (!f.c10_millBraked) return ['og6_sub_brake'];
    if (!f.og6_plan) return ['og6_sub_baldino'];
    if (!f.og6_coilOut) return ['og6_sub_bolts', { n: f.og6_bolt | 0 }];
    if (!f.og6_fitted) return ['og6_sub_fit'];
    if (!f.og6_relay) return ['og6_sub_relay'];
    return ['og6_sub_band'];
  }
  // the optional street meeting, once the mill turns on brass
  voteSub() {
    const f = this.f;
    if (!this.on || !this.millDone() || f.og6_vote) return '';
    return this.sub(false, 'og6_sub_vote');
  }
  items() { const f = this.f; return this.on && f.og6_coilOut && !f.og6_fitted ? [{ id: 'coupling', icon: 'part' }] : []; }
  journal() {
    const f = this.f;
    if (!this.exp) return [];
    return [
      { key: 'og6_j_brief', done: !!f.og6_brief },
      { key: 'og6_j_beat', done: !!f.og6_plan },
      { key: 'og6_j_swap', done: !!f.og6_fitted },
      { key: 'og6_j_band', done: this.millDone() },
      { key: 'og6_j_street', done: this.heard() },
      { key: 'og6_j_vote', done: !!f.og6_vote },
    ].filter((l) => l.done);
  }
}
