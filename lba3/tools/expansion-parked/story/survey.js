// Chapter 11 of the expanded campaign — "Under the Well" (key 'survey'). OREN-GUARDIAN: OG-2 "The Fenced Square"
// (docs/future/EXPANSION_PLAN.md Revision R1.11). SV-1…SV-3, the rest of this chapter, are still documents: when they
// are built they follow OG-2 (the well is open), and Baldino's call moves to their end.
//
// The chapter begins at the fortress shelter's door, where chapter 10 ended: Gilbert wants his well back. The project
// fenced the square in chapter 8; the council ordered the fence off and Vesk's office keeps the key ("project
// property"). The fence's gate is locked by a Balance Works actuator the project cabled to its line, and Oren holds it
// (R1.4 rules 1–3: Ballastra ware, joined to the bore; he controls only what the part drives, here the bolt). He will
// open it on one condition: one cask a family while the drill pulls, because the well and the shelters drink the same
// water. He counts the three people waiting on the gate's footplate by their weight (rule 3) and hears them only at
// the lock (a metre or two of the ceramic): when the three agree, he opens. Each has an objection, an errand in any
// order:
//   Bram fears the voice will take the water. The project's draw-off beside the gate has a hand lever: Twinsen throws it
//     and holds it through a drill stroke (the lever shoves on the thump and gives way between: rule 4, a held lever
//     beats the tone); let go too soon and the next stroke slams it shut (retry). Bram feels it himself, then agrees.
//   Granny Ume's tonic wants cold, clean water; Mira fills a bottle at the Water Office, where the mains Oren holds at
//     green now run a bottle a minute (help that limits, seen before anyone complains of it).
//   Pico wants the gate's bell latch rung with the magic ball. The blow shakes Oren's hold loose for a moment (rule 4,
//     a shock beyond the part's range) and the bolt stays shut: the lock has no hand lever.
// The gate opens; its lamp turns celadon. Twinsen notices that three people in a queue agreed for the whole town.
// Gilbert answers that with a board on the gate ("say so if not"), then Baldino calls him to Zeelich; the chapter ends
// when he lands there (the network: the expanded campaign's chapters 12–13 are empty shells still).
//
// Flags (og2_): og2_started (Gilbert's ask), og2_met (Oren's condition), og2_bramAsk, og2_bram (the lever shown; Bram
// agreed), og2_umeAsk, og2_tonic (the bottle carried), og2_ume, og2_picoAsk, og2_bell (the ball rang the latch),
// og2_pico, og2_open (the gate open), og2_asked (Gilbert's board), og2_done (Baldino's call). Every errand restarts
// from its flags: nothing is in between (a save can't be made while he holds the lever: it is a scene).
// Only the expanded campaign plays this chapter (Story.inCampaign); the lock, the draw-off and the gate's state show
// only there, from this chapter on.
import * as THREE from 'three';
import { ChapterBase } from './base.js';
import { t } from '../i18n.js';
import { buildOrenPresence, buildGateLock, orenMats, LOCK_TOP } from '../orenpresence.js';
import { shelterFrame } from './shelters.js';
import { ZEELICH_ROOMS } from './throttle.js';
import { cyl, lathe, sphere, plane, canvasTex, MAT } from '../props.js';
import { Batch } from '../kit.js';
import '../text/oren.js';

const STROKE = 3.6;                       // s between the drill's strokes (R1.4 rule 4: he holds only on them)
const SLIDE = 2.55;                       // how far the gate's panel slides east, open
const FORT = { x: -50, z: -71, ry: 0.3 }; // FunFrock's fortress shelter (story/evacuation.js FORT, FORT_RY)
const FORT_F = shelterFrame(FORT.x, FORT.z, FORT.ry);
const LEVER_SHUT = 0.45, LEVER_OPEN = -0.5; // the draw-off lever's tilt (rad about x; + leans its grip toward the street)
const gold = '#ffcf4a';
const QUEUE = ['bram', 'ume', 'pico'];

export class Survey extends ChapterBase {
  get W() { return this.game.world; }
  room() { return this.game.room?.id ?? null; }
  onZeelich() { const id = this.room(); return !!id && (ZEELICH_ROOMS.has(id) || id.startsWith('isle_')); }
  inMine() { return this.reached() && this.story.inCampaign(this.key); }
  agreed() { const f = this.f; return (f.og2_bram ? 1 : 0) + (f.og2_ume ? 1 : 0) + (f.og2_pico ? 1 : 0); }
  // the square's frame: (dx, dz) from the gate's centre, x along the fence there, +z out to the street
  at(dx, dz) { const G = this.G; return { x: G.x + dx, z: G.z + dz }; }
  spot(dx, dz, a) { return { ...this.at(dx, dz), a }; }
  face(p, q) { return Math.atan2(q.x - p.x, q.z - p.z); }

  // ---------------------------------------------------------------- props: the lock, the draw-off, the board
  decorate() {
    if (!this.once('citadel')) return;
    const g = this.game, W = this.W, P = g.physics, H = (x, z) => W.H(x, z);
    const ev = this.story.chapters.find((c) => c.key === 'evacuation');
    const seg = ev?.fence?.[3];   // (the fence's south segment, across the lane to the houses: the gate)
    if (!seg || !W.well) return;
    this.seg = seg; this.ev = ev;
    this.G = { x: seg.x, z: seg.z };
    this.panel0 = { x: seg.mesh.position.x, posts: seg.posts.map((p) => p.position.x) };
    const root = new THREE.Group(); root.visible = false; W.root.add(root);
    this.props = root;
    const m = orenMats(), wood = MAT.wood('dark'), iron = MAT.iron(), steel = MAT.iron();
    const B = new Batch(root), flat = new Batch(root, { cast: false });
    const y = (p) => H(p.x, p.z);
    this.cols = [];
    const col = (p, r, top) => { const c = P.add({ type: 'cyl', x: p.x, z: p.z, r, top: y(p) + top, noStand: true, enabled: false }); this.cols.push(c); return c; };

    // the footplate where the queue stands (he feels their weight through it: R1.4 rule 3)
    const fp = this.at(0.85, 1.6);
    flat.add(new THREE.BoxGeometry(3.0, 0.03, 1.9), steel, fp.x, y(fp) + 0.015, fp.z);
    // the lock (Balance Works, no hand lever) at the gate's east end, and the cable from it along the fence into the
    // ground by the draw-off: the project's line (rule 2)
    const lk = this.at(1.75, 0.38);
    const lock = buildGateLock(); lock.group.position.set(lk.x, y(lk), lk.z); root.add(lock.group);
    this.lock = lock; this.lockP = lk;
    col(lk, 0.16, LOCK_TOP);
    const c0 = this.at(1.75, 0.2), c1 = this.at(-2.0, 0.2), cl = Math.hypot(c1.x - c0.x, c1.z - c0.z);
    flat.add(cyl(0.022, 0.022, cl, 5), MAT.flat('#2a2a2e', 0.8), (c0.x + c1.x) / 2, y(c0) + 0.03, (c0.z + c1.z) / 2, 0, 0, Math.PI / 2);
    // the bell latch on the panel's east end (it slides with the panel)
    const bell = new THREE.Group();
    bell.add(new THREE.Mesh(sphere(0.07, 10, 6), MAT.brass()));
    { const tongue = new THREE.Mesh(cyl(0.012, 0.012, 0.12, 5), iron); tongue.position.y = -0.08; bell.add(tongue); }
    bell.position.set(seg.mesh.position.x + 1.2, y(this.G) + 1.08, seg.z + 0.14);
    root.add(bell); this.bell = bell;
    // the draw-off: an iron riser from the well's pipe, a glazed valve between bronze bands, a spout west over a cask,
    // and the hand lever on its east side
    const st = this.at(-2.25, 1.25), sy = y(st);
    B.add(cyl(0.07, 0.08, 0.75, 10), iron, st.x, sy + 0.375, st.z);
    B.add(cyl(0.16, 0.16, 0.05, 12), m.bronze, st.x, sy + 0.77, st.z);
    B.add(lathe([[0.12, 0], [0.17, 0.08], [0.17, 0.26], [0.1, 0.34]], 14), m.glaze, st.x, sy + 0.79, st.z);
    B.add(cyl(0.12, 0.12, 0.05, 12), m.bronze, st.x, sy + 1.13, st.z);
    B.add(cyl(0.035, 0.035, 0.55, 8), MAT.copper(), st.x - 0.3, sy + 0.95, st.z, 0, 0, Math.PI / 2);
    B.add(cyl(0.035, 0.03, 0.18, 8), MAT.copper(), st.x - 0.56, sy + 0.88, st.z);
    B.add(cyl(0.09, 0.09, 0.06, 10), iron, st.x, sy + 0.03, st.z);
    col(st, 0.2, 1.2);
    const ck = this.at(-3.0, 1.25);
    B.add(lathe([[0.001, 0], [0.24, 0], [0.29, 0.28], [0.25, 0.58], [0.001, 0.58]], 14), wood, ck.x, y(ck), ck.z);
    col(ck, 0.3, 0.6);
    const stream = new THREE.Mesh(cyl(0.018, 0.022, 0.32, 6), MAT.flat('#a8d4f0', 0.2));
    stream.position.set(st.x - 0.56 - 0.0, sy + 0.62, st.z); stream.visible = false; root.add(stream); this.stream = stream;
    const lv = new THREE.Group(); lv.position.set(st.x + 0.22, sy + 0.55, st.z); root.add(lv);
    { const bar = new THREE.Mesh(cyl(0.025, 0.025, 0.72, 6), iron); bar.position.y = 0.36; bar.castShadow = true; lv.add(bar);
      const grip = new THREE.Mesh(cyl(0.035, 0.035, 0.3, 8), wood); grip.rotation.z = Math.PI / 2; grip.position.y = 0.72; lv.add(grip); }
    this.lever = lv; this.leverA = LEVER_SHUT; lv.rotation.x = LEVER_SHUT;
    this.standP = st;
    // Gilbert's board on the gate (after the turn): SAY SO IF NOT
    const bd = this.at(-0.95, 0.7), bg = new THREE.Group(); bg.position.set(bd.x, y(bd), bd.z); root.add(bg);
    { const post = new THREE.Mesh(cyl(0.04, 0.045, 1.25, 6), wood); post.position.y = 0.62; bg.add(post);
      const tex = canvasTex(256, 160, (x, w, h) => {
        x.fillStyle = '#e9dfc4'; x.fillRect(0, 0, w, h); x.strokeStyle = '#5a3a1a'; x.lineWidth = 6; x.strokeRect(4, 4, w - 8, h - 8);
        x.fillStyle = '#2a1e10'; x.textAlign = 'center'; x.font = 'bold 26px sans-serif';
        x.fillText('ONE CASK A FAMILY', w / 2, 44); x.font = '20px sans-serif'; x.fillText('while the drill pulls', w / 2, 74);
        x.font = 'bold 24px sans-serif'; x.fillText('SAY SO IF NOT', w / 2, 110); x.font = 'italic 18px serif'; x.fillText('— Gilbert', w / 2, 140);
      });
      const pl = new THREE.Mesh(plane(0.62, 0.39), MAT.map(tex, 0.85)); pl.position.set(0, 1.05, 0.05); bg.add(pl);
      const back = new THREE.Mesh(new THREE.BoxGeometry(0.66, 0.43, 0.03), wood); back.position.set(0, 1.05, 0.02); bg.add(back); }
    bg.visible = false; this.board = bg;
    col(bd, 0.08, 1.4);
    // the panel's collider where it stands open (the original one is the segment's own, turned off while open)
    const oc = this.at(SLIDE, 0);
    this.openCol = P.add({ type: 'box', x: oc.x, z: oc.z, hw: 1.35, hd: 0.15, rot: -seg.a + Math.PI / 2, top: y(oc) + 1.2, noStand: true, seeThrough: true, enabled: false });
    B.build(); flat.build();
    // Oren's rings, out of the lock's cap (smaller than in the valve room: the lock is a small part)
    const pres = buildOrenPresence();
    pres.group.position.set(lk.x, y(lk) + LOCK_TOP + 0.08, lk.z); pres.group.scale.setScalar(0.62);
    root.add(pres.group);
    this.pres = pres;
    this.slide = 0; this.rising = 0; this.walks = []; this.shake = 0; this.lastP = 0;
    W.updaters.push((dt) => this.tick(dt));
    this.show();
  }
  // the gate's state from the flags (and whether any of it shows: the expanded campaign, from this chapter on)
  show() {
    if (!this.props) return;
    const f = this.f, on = this.inMine();
    this.props.visible = on && this.near(60);
    for (const c of this.cols) c.enabled = on;
    this.slide = on && f.og2_open ? 1 : 0;
    this.placePanel();
    this.lock.setLamps(this.agreed(), !!f.og2_open);
    this.board.visible = !!f.og2_asked;
    this.setLever(LEVER_SHUT); this.hold = null;
    // (the rings: up while Oren is in this chapter's business; gone once it is over)
    if (on && this.isCur() && f.og2_met && !f.og2_done) { if (!this.rising) { this.pres.set(1); this.pres.setMode('turning'); } }
    else this.pres.set(0);
  }
  near(r) { const h = this.game.hero.pos; return !this.game.room && Math.hypot(h.x - this.G.x, h.z - this.G.z) < r; }
  placePanel() {
    const s = this.seg, k = this.slide * SLIDE, on = this.inMine();
    s.mesh.position.x = this.panel0.x + k;
    s.posts.forEach((p, i) => { p.position.x = this.panel0.posts[i] + k; });
    this.bell.position.x = this.panel0.x + 1.2 + k;
    // (the segment's own collider is the evacuation's (it turns it on with the fence); open, it is off and this one is on)
    const fence = this.ev?.props?.visible !== false;
    if (on && this.f.og2_open) { s.col.enabled = false; this.openCol.enabled = fence; }
    else { this.openCol.enabled = false; s.col.enabled = fence; }
  }
  setLever(a) { this.leverA = a; if (this.lever) this.lever.rotation.x = a; if (this.stream) this.stream.visible = a < 0; }

  // the square's own clock (every frame, dialogue and scenes too): the drill's strokes on a held lever, the panel, the
  // rings, a shock's flicker, the few steps the story walks people
  tick(dt) {
    const g = this.game, f = this.f;
    if (!this.props) return;
    const on = this.inMine();
    this.props.visible = on && this.near(60);
    this.walkStep(dt);
    if (!this.props.visible) return;
    // the panel slides open (2 s)
    const want = on && f.og2_open ? 1 : 0;
    if (this.slide !== want) { this.slide += Math.sign(want - this.slide) * Math.min(Math.abs(want - this.slide), dt / 2); this.placePanel(); }
    // the drill's stroke: the held lever is shoved back and comes again; a loose one is slammed shut
    const p = (((g.time || 0) % STROKE) + STROKE) % STROKE / STROKE;
    const H = this.hold;
    if (p < this.lastP && (H || this.leverA < LEVER_SHUT - 0.01)) this.stroke();
    this.lastP = p;
    if (H) {
      const back = Math.max(0, this.kick || 0);
      this.kick = Math.max(0, (this.kick || 0) - dt * 2.2);
      this.setLever(LEVER_OPEN + back * 0.55);
    }
    // a shock: the lamps blink out and the lock and the rings tremble, for a moment (R1.4 rule 4)
    if (this.shake > 0) {
      this.shake -= dt;
      const j = this.shake > 0 ? Math.sin(this.shake * 90) * 0.012 : 0;
      this.lock.flicker(this.shake > 0); this.lock.group.position.x = this.lockP.x + j; this.pres.group.position.x = this.lockP.x + j * 2;
    }
    if (this.pres.group.visible || this.rising) {
      if (this.rising) { this.rising = Math.min(1, this.rising + dt / 2.0); this.pres.set(this.rising); if (this.rising >= 1) this.rising = 0; }
      const h = g.hero, c = this.lockP;
      this.pres.update(dt, Math.atan2(h.pos.x - c.x, h.pos.z - c.z));
    }
  }
  stroke() {
    const g = this.game, H = this.hold;
    g.audio.play('thump');
    if (H) {
      this.kick = 1; H.strokes++;
      g.audio.play('clunk');
      if (H.by === 'hero') g.camRig.shake(0.05);
      return;
    }
    // nobody's hand on it: he takes it back
    this.setLever(LEVER_SHUT); g.audio.play('clunk');
    if (this.early) { this.early = false; this.afterEarly(); }
  }

  // a few steps on open ground (a person stepping up to the lock, Bram to the lever) through the given points; placed
  // exactly at the last one
  stroll(id, to, a, then) {
    const n = this.npc(id);
    if (!n?.present) { then?.(); return; }
    this.walks = this.walks.filter((w) => w.n !== n);
    n.controlled = true;
    this.walks.push({ n, pts: (Array.isArray(to) ? to : [to]).map((p) => ({ x: p.x, z: p.z })), a, then, t: 0 });
  }
  stopWalks() { for (const w of this.walks || []) w.n.controlled = false; this.walks = []; }
  walkStep(dt) {
    const P = this.game.physics;
    for (let i = this.walks.length - 1; i >= 0; i--) {
      const w = this.walks[i], n = w.n;
      while (w.pts.length > 1 && Math.hypot(w.pts[0].x - n.pos.x, w.pts[0].z - n.pos.z) < 0.25) w.pts.shift();
      const q = w.pts[0], dx = q.x - n.pos.x, dz = q.z - n.pos.z, d = Math.hypot(dx, dz);
      w.t += dt;
      if ((w.pts.length === 1 && d < 0.06) || w.t > 8) {
        const e = w.pts[w.pts.length - 1];
        n.pos.set(e.x, P.groundAt(e.x, e.z), e.z); n.angle = n.targetAngle = w.a; if (n.held) n.heldA = w.a;
        n.controlled = false; this.walks.splice(i, 1);
        n.rig.play('idle'); n.rig.update(dt, 0); n.sync();
        w.then?.();
        continue;
      }
      const sp = Math.min(1.3, d * 3 + 0.3), want = Math.atan2(dx, dz);
      n.angle += Math.atan2(Math.sin(want - n.angle), Math.cos(want - n.angle)) * Math.min(1, dt * 8);
      n.pos.x += (dx / d) * sp * dt; n.pos.z += (dz / d) * sp * dt; n.pos.y = P.groundAt(n.pos.x, n.pos.z);
      n.rig.play('walk'); n.rig.update(dt, sp); n.sync();
    }
  }

  // ---------------------------------------------------------------- cast
  place(id) {
    const f = this.f, R = this.game.rooms;
    if (!this.isCur() || !this.G) return undefined;   // (this chapter's spots end with it)
    const atGate = !f.og2_open;
    switch (id) {
      case 'gilbert': { const p = FORT_F.at(2.6, 0.3); return { x: p.x, z: p.z, a: FORT.ry }; }
      case 'tim': { const p = FORT_F.at(2.3, 1.7); return { x: p.x, z: p.z, a: FORT.ry - 0.6 }; }
      case 'lulu': { const p = FORT_F.at(2.0, 2.6); return { x: p.x, z: p.z, a: FORT.ry - 0.9 }; }
      case 'bram': {
        if (atGate) return this.spot(0.55, 1.2, Math.PI);
        const p = this.at(-2.55, 2.1); return { ...p, a: this.face(p, this.at(0, 2.6)) };
      }
      case 'ume': case 'pico': {
        if (!atGate) return undefined;   // (the gate open: back to their rounds: citizens.js)
        const p = id === 'ume' ? this.spot(1.0, 2.3, Math.PI - 0.25) : this.spot(1.75, 2.95, Math.PI + 0.35);
        const n = this.npc(id);
        if (n?.ambient && n.storyHold) n.storyHold(p);
        return p;
      }
      case 'mira': return R.office?.npcSpots?.mira ?? undefined;
      case 'zoe': return R.house?.npcSpots?.zoe ?? undefined;
      case 'arthur': return R.house?.npcSpots?.arthur ?? undefined;
      case 'vesk': return null;
    }
    return undefined;
  }
  // where one of the queue stands to speak at the lock (a metre or two of the ceramic: rule 3)
  lockSpot() { const p = this.at(1.2, 1.0); return { ...p, a: this.face(p, this.lockP) }; }
  queueSpot(id) { return this.place(id) || this.spot(0.55, 1.2, Math.PI); }

  // ---------------------------------------------------------------- flow
  begin() {
    const g = this.game, h = g.hero, f = this.f;
    this.begun = true;
    h.swapBody?.('twinsen'); h.hasBall = true; h.disguised = false;
    // (from the shelter's thanks he is at its door; a save that ended chapter 10 elsewhere is brought there)
    const door = FORT_F.at(4.2, 0.3);
    if (g.room || Math.hypot(h.pos.x - door.x, h.pos.z - door.z) > 14) {
      const to = { x: door.x, z: door.z, a: FORT.ry + Math.PI };
      if (g.room) g.exitRoom(to, true); else { h.pos.set(to.x, g.physics.groundAt(to.x, to.z), to.z); h.angle = to.a; }
    }
    this.show();
    this.story.refreshCast();
    this.chain([['gilbert', 'og2_gil_1'], ['gilbert', 'og2_gil_2'], ['hero', 'og2_tw_g1'], ['gilbert', 'og2_gil_3']], () => {
      f.og2_started = true; g.updateObjective(); g.save(false);
    });
  }
  update(dt) {
    const g = this.game, f = this.f, h = g.hero;
    if (!this.isCur()) return;
    const free = g.state === 'play' && !g.trans;
    if (!f.og2_started && free && !this.begun) { this.begun = true; this.begin(); return; }
    // at the gate: Oren speaks first (or the lock is inspected)
    if (f.og2_started && !f.og2_met && free && this.lockP && !g.room && Math.hypot(h.pos.x - this.lockP.x, h.pos.z - this.lockP.z) < 2.8) { this.meet(); return; }
    const atStand = f.og2_bramAsk && !f.og2_bram && !g.room && this.standP && Math.hypot(h.pos.x - this.standP.x, h.pos.z - this.standP.z) < 4;
    this.nudge(dt, 'og2_lever', atStand, 40, 'og2_nudge_lever');
    this.nudge(dt, 'og2_bell', f.og2_picoAsk && !f.og2_bell && this.near(9), 40, 'og2_nudge_bell');
    // Baldino's call answered: the chapter ends when he lands on Zeelich
    if (f.og2_done && free && this.onZeelich() && !this.leaving) { this.leaving = true; g.startTransition(() => this.story.nextChapter(), this.story.nextAreas()); }
  }
  // Oren at the gate: his condition
  meet() {
    const g = this.game, f = this.f;
    if (f.og2_met || this.meeting) return;
    this.meeting = true;
    g.audio.play('orenTone');
    this.rising = 0.001; this.pres.setMode('attending');
    this.chain([['oren', 'og2_oren_1'], ['hero', 'og2_tw_o1'], ['oren', 'og2_oren_2'], ['hero', 'og2_tw_o2'], ['oren', 'og2_oren_3'], ['oren', 'og2_oren_4'], ['hero', 'og2_tw_o3'], ['oren', 'og2_oren_5']], () => {
      this.meeting = false; f.og2_met = true; this.pres.setMode('turning');
      g.updateObjective(); g.save(false);
    });
  }

  // ---------------------------------------------------------------- interaction
  interactables(consider, dist) {
    const f = this.f;
    if (!this.isCur() || this.game.room || !this.G) return;
    consider(dist(this.lockP.x, this.lockP.z + 0.25), 1.1, { kind: 'og2lock', label: 'p_governor' });
    const lv = this.at(-1.95, 1.75);
    if (!f.og2_open) consider(dist(lv.x, lv.z), 1.0, { kind: 'og2lever', label: f.og2_bramAsk && !f.og2_bram ? 'p_lever' : 'p_look' });
    if (f.og2_open) consider(dist(this.W.well.x, this.W.well.z), 2.4, { kind: 'og2well', label: 'p_look' });
  }
  interact(it) {
    const f = this.f, n = this.agreed();
    switch (it.kind) {
      case 'og2lock':
        if (!f.og2_met) { this.meet(); return true; }
        this.chain([['hero', f.og2_open ? 'og2_lock_open' : 'og2_lock_look']].concat(f.og2_open ? [] : [['hero', ['og2_lamps0', 'og2_lamps1', 'og2_lamps2', 'og2_lamps2'][n]]]));
        return true;
      case 'og2lever':
        if (!(f.og2_bramAsk && !f.og2_bram)) { this.chain([['hero', f.og2_bram ? 'og2_stand_after' : 'og2_stand_look']]); return true; }
        this.takeLever();
        return true;
      case 'og2well':
        this.chain([['hero', 'og2_well_look']]);
        return true;
    }
    return false;
  }
  // he throws the draw-off's lever and holds it: a scene of its own (no save) until a stroke has shoved it and he has
  // held on, or he lets go (any move, E or Space)
  takeLever() {
    const g = this.game, h = g.hero, sp = this.at(-1.95, 1.9);
    this.early = false;
    h.pos.x = sp.x; h.pos.z = sp.z; h.angle = Math.PI; h.vel.set(0, 0);
    g.audio.play('tapSqueak'); g.audio.play('waterRun');
    this.hold = { by: 'hero', t: 0, strokes: 0 }; this.kick = 0;
    this.setLever(LEVER_OPEN);
    g.setState('cutscene');
    g.cutscene = (dt) => {
      const H = this.hold, I = g.input;
      if (!H) return;
      H.t += dt;
      h.rig.play('pumpGrip'); h.rig.update(dt, 0); h.sync();
      if (H.strokes >= 1 && this.kick <= 0.15) { this.release(true); return; }
      const go = ['up', 'down', 'left', 'right', 'interact', 'action', 'pause', 'dodge'].some((a) => I.pressed(a));
      if (H.t > 0.4 && go) this.release(false);
    };
    if (!this.toldHold) { this.toldHold = true; g.hud.toast('og2_toast_hold'); }
  }
  release(held) {
    const g = this.game;
    this.hold = null;
    g.cutscene = null; g.setState('play');
    if (held) { this.demo(); return; }
    // let go before the stroke: the lever stays over until the drill's next stroke, then he slams it shut (tick)
    this.early = true;
  }
  afterEarly() {
    if (!this.isCur() || this.f.og2_bram) return;
    if (this.game.state !== 'play') return;
    this.chain([['bram', 'og2_bram_shut'], ['hero', 'og2_tw_shut']]);
  }
  // held through a stroke: Bram feels it himself, lets go, and agrees
  demo() {
    const g = this.game, f = this.f, h = g.hero;
    this.hold = { by: 'hero', t: 0, strokes: 1 }; this.setLever(LEVER_OPEN);   // (his hands stay on it while they talk)
    const bramAt = this.at(-2.55, 1.95), lever = this.at(-1.95, 1.25);
    this.chain([['bram', 'og2_bram_d1'], ['hero', 'og2_tw_d1'], ['bram', 'og2_bram_d2'], ['bram', 'og2_bram_d3'], ['bram', 'og2_bram_d4'], ['oren', 'og2_oren_shut'], ['bram', 'og2_bram_d5']], () => {
      this.agree('bram', 'og2_bram_yes', () => { f.og2_bram = true; });
    }, (i, id, key) => {
      if (key === 'og2_bram_d2') { this.stroll('bram', bramAt, this.face(bramAt, lever), () => { this.hold = { by: 'bram', t: 0, strokes: 0 }; }); h.angle = Math.PI; }
      if (key === 'og2_bram_d4') this.hold = null;   // (he lets go)
      if (key === 'og2_oren_shut') { this.hold = null; this.setLever(LEVER_SHUT); g.audio.play('clunk'); g.audio.play('orenTone'); }
    });
  }
  // one of the queue steps up to the lock and says it; Oren counts; at three the gate opens
  agree(id, key, set) {
    const g = this.game, ls = this.lockSpot(), back = this.queueSpot(id);
    // (Bram comes from the draw-off: round in front of Twinsen at its lever, not through him)
    this.stroll(id, id === 'bram' ? [this.at(-2.4, 2.8), this.at(0.4, 2.6), ls] : ls, ls.a, null);
    set();
    const n = this.agreed();
    this.lock.setLamps(n, false);
    g.audio.play('tick');
    this.chain([[id, key], ['oren', ['og2_oren_n1', 'og2_oren_n1', 'og2_oren_n2', 'og2_oren_n3'][n]]], () => {
      g.updateObjective(); g.save(false);
      if (n >= 3) { this.open(); return; }
      this.stroll(id, id === 'bram' ? [this.at(0.4, 2.6), back] : back, back.a, null);
    });
  }
  // three: the bolt draws, the panel slides, the lamp turns celadon. Then the turn.
  open() {
    const g = this.game, f = this.f;
    f.og2_open = true;
    g.audio.play('clunk'); g.audio.play('door'); g.audio.play('orenTone');
    this.lock.setLamps(3, true);
    this.placePanel();
    this.chain([['oren', 'og2_oren_open1'], ['hero', 'og2_tw_turn1'], ['oren', 'og2_oren_open2'], ['bram', 'og2_bram_turn'], ['hero', 'og2_tw_turn2']], () => {
      this.stopWalks(); this.story.refreshCast();   // (Ume and Pico back to their rounds; Bram to the draw-off)
      g.updateObjective(); g.save(false);
    });
  }
  ballHit(p) {
    const g = this.game, f = this.f, b = this.bell;
    if (!this.isCur() || g.room || !b || !f.og2_met || f.og2_open) return false;
    const w = b.getWorldPosition(new THREE.Vector3());
    if (Math.hypot(p.x - w.x, p.y - w.y, p.z - w.z) > 0.8) return false;
    g.audio.play('clang'); g.audio.play('rattle');
    this.shake = 1.4;
    if (f.og2_bell) return true;   // (again: it rings and shakes; nothing more)
    f.og2_bell = true;
    const lines = [['oren', 'og2_oren_bell'], ...(f.og2_picoAsk ? [['pico', 'og2_pico_bell']] : [])];
    this.chain(lines, () => {
      this.pres.setMode('turning');
      if (f.og2_picoAsk && !f.og2_pico) { this.picoYes(); return; }
      g.updateObjective(); g.save(false);
    });
    return true;
  }
  ballTargets() {
    const f = this.f, b = this.bell;
    if (!this.isCur() || this.game.room || !b || !f.og2_met || f.og2_open || f.og2_pico) return [];
    const w = b.getWorldPosition(new THREE.Vector3());
    return [{ x: w.x, y: w.y, z: w.z }];
  }
  picoYes() { this.chain([['pico', 'og2_pico_yes1']], () => this.agree('pico', 'og2_pico_yes2', () => { this.f.og2_pico = true; })); }

  talk(npc) {
    const g = this.game, f = this.f, id = npc.def.id;
    if (!this.isCur()) return false;
    const c = (lines, done) => { this.chain(lines, done); return true; };
    const save = () => { g.updateObjective(); g.save(false); };
    switch (id) {
      case 'gilbert':
        if (f.og2_open && !f.og2_asked) {
          return c([['gilbert', 'og2_gil_o1'], ['hero', 'og2_tw_go1'], ['gilbert', 'og2_gil_o2'], ['hero', 'og2_tw_go2'], ['gilbert', 'og2_gil_o3'], ['balradio', 'og2_bal_1'], ['hero', 'og2_tw_b1']], () => {
            f.og2_asked = true; f.og2_done = true;
            this.show();   // (the board up; Oren's rings settle back into the lock)
            save();
          });
        }
        return c([['gilbert', f.og2_asked ? 'og2_gil_after' : f.og2_started ? 'og2_gil_wait' : 'og2_gil_1']]);
      case 'tim': return c([['tim', f.og2_asked ? 'og2_tim_2' : 'og2_tim_1']]);
      case 'lulu': return c([['lulu', f.og2_asked ? 'og2_lulu_2' : 'og2_lulu_1']]);
      case 'bram':
        if (f.og2_open) return c([['bram', 'og2_bram_after']]);
        if (!f.og2_met) return c([['bram', 'og2_bram_0']]);
        if (f.og2_bram) return c([['bram', 'og2_bram_wait']]);
        if (!f.og2_bramAsk) return c([['bram', f.l_pump ? 'og2_bram_1p' : 'og2_bram_1'], ['bram', 'og2_bram_2'], ['hero', 'og2_tw_b2'], ['bram', 'og2_bram_3']], () => { f.og2_bramAsk = true; save(); });
        return c([['bram', 'og2_bram_3']]);
      case 'ume':
        if (!f.og2_met) return c([['ume', 'og2_ume_0']]);
        if (f.og2_ume) return c([['ume', 'og2_ume_wait']]);
        if (f.og2_tonic) return c([['hero', 'og2_tw_u3'], ['ume', 'og2_ume_4']], () => { f.og2_tonic = false; this.agree('ume', 'og2_ume_yes', () => { f.og2_ume = true; }); });
        if (!f.og2_umeAsk) return c([['ume', 'og2_ume_1'], ['ume', 'og2_ume_2'], ['hero', 'og2_tw_u1'], ['ume', 'og2_ume_3']], () => { f.og2_umeAsk = true; save(); });
        return c([['ume', 'og2_ume_where']]);
      case 'pico':
        if (!f.og2_met) return c([['pico', 'og2_pico_0']]);
        if (f.og2_pico) return c([['pico', 'og2_pico_wait']]);
        if (f.og2_bell) { f.og2_picoAsk = true; return c([['pico', 'og2_pico_saw']], () => this.picoYes()); }
        if (!f.og2_picoAsk) return c([['pico', 'og2_pico_1'], ['pico', 'og2_pico_2'], ['hero', 'og2_tw_p1'], ['pico', 'og2_pico_3']], () => { f.og2_picoAsk = true; save(); });
        return c([['pico', 'og2_pico_where']]);
      case 'mira':
        if (f.og2_umeAsk && !f.og2_ume && !f.og2_tonic) {
          return c([['hero', 'og2_tw_m1'], ['mira', 'og2_mira_1'], ['mira', 'og2_mira_2'], ['hero', 'og2_tw_m2'], ['mira', 'og2_mira_3']], () => {
            f.og2_tonic = true; g.audio.play('waterRun'); g.hud.toast('og2_toast_tonic'); save();
          });
        }
        return c([['mira', f.og2_open ? 'og2_mira_after' : 'og2_mira_0']]);
      case 'zoe': return c([['zoe', f.og2_open ? 'og2_zoe_2' : 'og2_zoe_1']]);
      case 'arthur': return c([['arthur', f.og2_open ? 'og2_ar_2' : 'og2_ar_1']]);
    }
    return false;
  }

  // ---------------------------------------------------------------- moving about
  doors() { return this.isCur() ? this.story.townDoors() : []; }

  // ---------------------------------------------------------------- state
  applyFlags() {
    this.leaving = false; this.meeting = false; this.rising = 0; this.early = false; this.begun = !!this.f.og2_started;
    this.stopWalks();
    if (this.f.og2_tonic && this.f.og2_ume) this.f.og2_tonic = false;
    this.show();
  }
  objective() {
    const f = this.f;
    if (!f.og2_started) return '';
    if (f.og2_done) return this.goal('og2_obj_ship');
    if (f.og2_open) return this.goal('og2_obj_gilbert');
    if (!f.og2_met) return this.goal('og2_obj_gate');
    const sub = (done, asked, k) => this.sub(done, done ? `og2_sub_${k}_ok` : asked ? `og2_sub_${k}` : `og2_sub_${k}_0`);
    return this.goal('og2_obj_agree', { n: this.agreed() }) + sub(!!f.og2_bram, !!f.og2_bramAsk, 'bram') + sub(!!f.og2_ume, !!f.og2_umeAsk, f.og2_tonic ? 'ume2' : 'ume') + sub(!!f.og2_pico, !!f.og2_picoAsk, 'pico');
  }
  items() { return this.isCur() && this.f.og2_tonic ? [{ id: 'tonic', icon: 'flask' }] : []; }
  markers() {
    const f = this.f, W = this.W, m = [];
    if (!this.isCur() || !f.og2_started || !this.G || this.onZeelich()) return m;
    const mk = (p, label) => m.push({ x: p.x, z: p.z, kind: 'star', color: gold, r: 7, edge: true, label: t(label) });
    if (f.og2_done) { if (W.spaceport) mk(W.spaceport.pad, 'og_mk_port'); return m; }
    if (f.og2_open) { mk(FORT_F.at(2.0, 0), 'og_mk_shelter'); return m; }
    if (f.og2_umeAsk && !f.og2_tonic && !f.og2_ume) { const o = W.houses?.find((x) => x.id === 'water'); if (o) mk(o.door, 'og_mk_office'); }
    mk(this.at(0.6, 1.2), 'og2_mk_gate');
    return m;
  }
  journal() {
    const f = this.f;
    return [
      { key: 'og2_j_ask', done: !!f.og2_started },
      { key: 'og2_j_cond', done: !!f.og2_met },
      { key: 'og2_j_lever', done: !!f.og2_bram },
      { key: 'og2_j_mira', done: !!(f.og2_tonic || f.og2_ume) },
      { key: 'og2_j_bell', done: !!f.og2_bell },
      { key: 'og2_j_open', done: !!f.og2_open },
      { key: 'og2_j_board', done: !!f.og2_asked },
    ].filter((l) => l.done);
  }
}
