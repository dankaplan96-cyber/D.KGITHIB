// FACE-3 (the leftovers of FACE-2, P86): the cases FACE-2 left open, each measured the same way, every frame stepped at
// 1/60 once a talk is open.
//   SEC=scenes (default): two staged spots, in one browser —
//     sign:  dialogue-scenes' D2 spot (Twinsen put 1.5 m before Zoé, by the yard's Bug St. sign; the conversation opened
//            with E): is a prop without a collider of its own (the sign's board) over either of them?
//     corla: Corla at the ticket kiosk, Twinsen put 1.5 m before her hatch (as dialogue-scenes puts him before anyone),
//            and apart 1.7 m off the kiosk's side (where FACE-2's tour walked up): the shot, her head, what hides her.
//   SEC=lba | lba97 | free | follow: the yard talk with Zoé walked up to and opened by input (as tests/face-2.mjs), under
//     the Fixed (LBA2) camera (lba97: with the 1997 look, its hard cuts), the Free orbit, or Follow: the shot, the heads,
//     and the hand back to the chosen camera after the talk (no shot over it any more; with REF=<the build before's json>, the
//     very view that build had at that moment). Follow keeps its CAM-AFTERTALK hold after a talk: not checked there.
// Per line: the speaker, the favoured face (camRig.tk.fav), the speaker's head (px tall, the head bone ± as
// p79-faces.mjs), its turn from the lens, the head's foot over the dialogue box, and what covers the two of them: rays
// from the lens to head / chest / waist / knees of each against every drawn mesh but the characters' and the grass
// (three's Raycaster: the test's own measure, not the game's), each hit named with its size.
//   OUT=captures/face-3/after (default)   W, H (1280×720)
// Automated runtime only (SwiftShader): the pictures are for a person to judge.
import { launch, open, checker } from './lib/boot.mjs';
import fs from 'node:fs';
const SEC = process.env.SEC || 'scenes';
const OUT = (process.env.OUT || 'captures/face-3/after') + '/';
fs.mkdirSync(OUT, { recursive: true });
const { check, done } = checker({ info: 'always' });
const W = +(process.env.W || 1280), H = +(process.env.H || 720);
const { browser, page } = await launch({ width: W, height: H });
const ev = (f, a) => page.evaluate(f, a);
await open(page, '?nocine');
await page.addScriptTag({ type: 'module', content: "import * as THREE from 'three'; window.__THREE = THREE;" });
await page.click('[data-act="new"]');
if (await ev(() => game.screen === 'confirmnew')) await page.click('#confirmnew [data-act="newyes"]');
await page.waitForFunction(() => game.state === 'play' && game.room?.id === 'house', null, { timeout: 600000 });
await page.waitForFunction(() => !!window.__THREE, null, { timeout: 60000 });
await ev(() => {
  const G = game, V = G.camera.position.constructor;
  G.testFreeze = true;
  window.F3 = {
    head(a) {
      const p = new V(); a.rig.j.head.getWorldPosition(p); const s = a.rig.root.scale.y || 1;
      const pts = [[0, 0.32, 0], [0, -0.22, 0], [0.25, 0.05, 0], [-0.25, 0.05, 0], [0, 0.05, 0.25], [0, 0.05, -0.25]].map(([x, y, z]) => new V(p.x + x * s, p.y + y * s, p.z + z * s).project(G.camera));
      const xs = pts.map((q) => (q.x * 0.5 + 0.5) * innerWidth), ys = pts.map((q) => (-q.y * 0.5 + 0.5) * innerHeight);
      const e = new V(); a.rig.j.eyes[0].getWorldPosition(e); const f = e.sub(p).setY(0).normalize(), c = G.camera.position.clone().sub(p).setY(0).normalize();
      return { px: Math.round(Math.max(...ys) - Math.min(...ys)), x: Math.round((Math.min(...xs) + Math.max(...xs)) / 2), bottom: Math.round(Math.max(...ys)), top: Math.round(Math.min(...ys)), turn: Math.round((Math.acos(Math.max(-1, Math.min(1, f.dot(c)))) * 180) / Math.PI) };
    },
    who() { const s = G.speaker; return s === G.hero ? 'hero' : s?.def?.id || (s ? '?' : 'narrator'); },
    fav() { const f = G.camRig.tk?.fav; return !f || !(G.camRig.why.talk > 0) ? '' : f === G.hero.pos ? 'hero' : 'npc'; },
    box() { const r = document.querySelector('#dialog')?.getBoundingClientRect(); return r && r.height ? Math.round(r.top) : innerHeight; },
    // what covers them: rays from the lens to head, chest, waist and knees of each, against every mesh drawn but the
    // characters' and the instanced grass → per actor the points hidden (of 4) and the hits [point, m from the lens,
    // the mesh's radius, its geometry]
    cover(actors) {
      const T = window.__THREE, rc = new T.Raycaster(); rc.layers.enableAll();
      const roots = new Set([G.hero, ...G.npcs].map((a) => a.rig?.root).filter(Boolean)), meshes = [];
      G.scene.traverse((o) => {
        if (!o.isMesh || o.isInstancedMesh || o.isSkinnedMesh || o.userData.drawBatch || o.userData.shadowProxy) return;
        for (let p = o; p; p = p.parent) if (!p.visible || roots.has(p)) return;
        const m = Array.isArray(o.material) ? o.material[0] : o.material;
        if (!m || m.visible === false || m.colorWrite === false || (m.transparent && m.opacity < 0.5)) return;
        meshes.push(o);
      });
      const cam = G.camera.position, out = {};
      for (const [k, a] of Object.entries(actors)) {
        const p = new V(); a.rig.j.head.getWorldPosition(p); const s = a.rig.root.scale.y || 1, hits = [];
        let hid = 0;
        for (const [n, dy] of [['head', 0.05], ['chest', -0.45], ['waist', -0.85], ['knees', -1.25]]) {
          const q = new V(p.x, p.y + dy * s, p.z), d = q.clone().sub(cam), L = d.length();
          rc.set(cam, d.normalize()); rc.near = 0.05; rc.far = L - 0.25;
          // (each mesh asked itself: a piece drawn in a draw batch has its own layer 0 off, which intersectObjects skips)
          let h = null; const got = [];
          for (const o of meshes) { got.length = 0; o.raycast(rc, got); for (const g of got) if (g.distance >= rc.near && g.distance <= rc.far && (!h || g.distance < h.distance)) h = g; }
          if (!h) continue;
          hid++;
          const o = h.object; if (!o.geometry.boundingSphere) o.geometry.computeBoundingSphere();
          const ws = new V(); o.getWorldScale(ws);
          hits.push([n, +h.distance.toFixed(2), +(o.geometry.boundingSphere.radius * Math.max(ws.x, ws.y, ws.z)).toFixed(2), o.geometry.type + (o.name ? ':' + o.name : '')]);
        }
        out[k] = { hid, hits };
      }
      return out;
    },
    rec: [], solid: 0,
    run(t) { for (let i = 0; i < Math.round(t * 60); i++) { G.step(1 / 60); const c = G.camera.position; this.rec.push([c.x, c.y, c.z, G.state === 'dialog' ? 1 : 0]); if (G.state === 'dialog' && (!G.room || G.room.outdoor) && G.camRig._solidAt(c, 0)) this.solid++; } },
    npc(id) { return G.npcs.find((n) => n.def.id === id); },
    // Twinsen put d m from someone, `off` rad round from the way they face, turned to them (dialogue-scenes' T.near)
    near(id, d = 1.5, off = 0, home = false) { const n = F3.npc(id), h = G.hero, a = (home ? n.targetAngle ?? n.def.angle ?? n.angle : n.angle) + off, x = n.pos.x + Math.sin(a) * d, z = n.pos.z + Math.cos(a) * d; h.pos.set(x, G.physics.groundAt(x, z), z); h.onGround = true; h.vy = 0; h.angle = Math.atan2(n.pos.x - x, n.pos.z - z); G.step(0.05); },
    pose() { const c = G.camera, d = new V(); c.getWorldDirection(d); return [c.position.x, c.position.y, c.position.z, d.x, d.y, d.z].map((v) => +v.toFixed(3)); },
  };
});
// one talk: up to `max` lines of `t` s each (measured, the first `pics` pictured), E as a player between them; then the
// talk closed and `after` s run
const talk = async (tag, npc, { max = 6, pics = 3, t = 3.2, after = 3 } = {}) => {
  const lines = [];
  for (let i = 0; i < max && (await ev(() => game.state)) === 'dialog'; i++) {
    const m = await ev(([t, npc]) => { F3.run(t); const s = game.speaker, a = s?.rig ? s : null, o = F3.npc(npc);
      return { who: F3.who(), fav: F3.fav(), talk: +game.camRig.why.talk.toFixed(2), line: game.hud.dialog.full.slice(0, 40), why: game.camRig.tk?.shot?.why, head: a ? F3.head(a) : null, other: a ? F3.head(a === game.hero ? o : game.hero) : null, box: F3.box(), cover: F3.cover({ hero: game.hero, [npc]: o }), mode: game.camRig.why.mode }; }, [t, npc]);
    lines.push(m);
    if (i < pics) { await ev(() => game.renderer.render()); await page.screenshot({ path: `${OUT}${tag}-line${i}-${m.who}.jpg`, type: 'jpeg', quality: 82, timeout: 180000 }); }
    await ev(() => { const D = game.hud.dialog; if (D.shown < D.full.length) P.tap('KeyE', 0.02); P.tap('KeyE', 0.02); });
  }
  await ev((after) => { for (let i = 0; i < 40 && game.state !== 'play'; i++) { if (game.state === 'dialog') P.tap('KeyE', 0.05); else game.step(0.1); } F3.rec.push(null); F3.run(after); }, after);
  return lines;
};
const res = { SEC, W, H };
const flat = (L) => L.map((l) => [l.who, l.fav, l.head?.px, l.head?.turn, l.head && l.head.bottom < l.box, l.cover]);

if (SEC === 'scenes') {
  // ---- the yard as dialogue-scenes reaches it: out of the house's door, Zoé's kettle talk opened from 1.5 m before her
  await ev(() => { const G = game, e = G.room.exits[0]; G.hero.hasBall = true; Object.assign(G.flags, { pr_arTrick: true, pr_tap: true });
    for (let i = 0; i < 60 && G.state !== 'play'; i++) { if (G.state === 'dialog') G.input.taps.add('KeyE'); G.step(0.05); }
    const tp = (x, z, a) => { const h = G.hero; h.pos.set(x, G.physics.groundAt(x, z), z); h.angle = a; h.onGround = true; h.vy = 0; G.camRig.lba.init = false; G.step(0.1); };
    tp(e.x, e.z + 1.6, Math.PI); G.step(1.6); tp(e.x, e.z, Math.PI); G.step(1.2);
    for (let i = 0; i < 160 && G.state !== 'play'; i++) { if (G.state === 'dialog') G.input.taps.add('KeyE'); G.step(0.05); } G.step(0.5); });
  check('out in the yard', await ev(() => !game.room && game.state === 'play'), await ev(() => [game.room?.id ?? 'out', game.state]));
  // (put there, E; a remark of his own on the way — not the talk asked for — is let run and the talk asked again)
  const openTalk = (id, d, off, home = false) => ev(([id, d, off, home]) => {
    for (let k = 0; k < 5; k++) { F3.near(id, d, off, home); game.step(0.3); F3.near(id, d, off, home); P.tap('KeyE', 0.02); if (game.state === 'dialog' && game.talkers?.has(F3.npc(id))) break; P.settle(); }
    return game.state === 'dialog' && game.talkers?.has(F3.npc(id)) ? 'dialog' : game.state; }, [id, d, off, home]);
  check('sign: the talk with Zoé opens at D2\'s spot', (await openTalk('zoe', 1.5, 0)) === 'dialog', await ev(() => game.state));
  // (the cost of the props' walk, asked once a talk: ms for the walk of the scene, how many found, here)
  res.propsWalk = await ev(() => { const R = game.camRig, z = F3.npc('zoe').pos, ms = [];
    let n = -1; for (let i = 0; i < 5; i++) { const t0 = performance.now(); n = R.propsNear ? R.propsNear(z.x, z.z, 7, 1.6, 0.1).length : -1; ms.push(+(performance.now() - t0).toFixed(2)); }
    let n2 = -1, ms2 = 0; if (R._fvProps) { R.tk && (R.tk.props = null); const t0 = performance.now(); n2 = R._fvProps(z.x, z.z).length; ms2 = +(performance.now() - t0).toFixed(2); R.tk && (R.tk.props = null); }
    return { walkMs: ms, found: n, gatherMs: ms2, gathered: n2 }; });
  console.log('props walk:', JSON.stringify(res.propsWalk));
  res.sign = await talk('sign', 'zoe', { max: 5, pics: 4 });
  // ---- Corla's kiosk: from the hatch, then from its side
  const kiosk = async (tag, d, off) => {
    const st = await openTalk('cs_corla', d, off, true);
    const w = await ev(() => { const n = F3.npc('cs_corla'), h = game.hero.pos; return { corla: [+n.pos.x.toFixed(2), +n.pos.z.toFixed(2), +n.angle.toFixed(2)], hero: [+h.x.toFixed(2), +h.z.toFixed(2)] }; });
    if (st !== 'dialog') return { st, w };
    return { st, w, lines: await talk(tag, 'cs_corla', { max: 3, pics: 2 }) };
  };
  res.corlaHatch = await kiosk('corla-hatch', 1.5, 0);
  res.corlaSide = await kiosk('corla-side', 1.7, Math.PI / 2);
} else {
  // ---- the yard talk with Zoé under the camera asked for (as tests/face-2.mjs: walked up to, E)
  await ev((sec) => { const G = game; G.settings.autoControls = 'off'; G.settings.camera = sec === 'lba97' ? 'lba' : sec; G.settings.visual = sec === 'lba97' ? '1997' : '2026'; G.applySettings(); }, SEC);
  await ev(() => { game.step(1.2); P.yardFirst = false;
    const sp = game.room.searches.find((x) => x.id === 'cupboard'); P.use(sp.x, sp.z);
    for (let i = 0; i < 40 && game.state !== 'play'; i++) { if (game.state === 'found') P.tap('KeyE', 0.2); P.settle(); }
    game.step(1.0); P.settle(); const e = game.room.exits.find((x) => x.to === 'outdoor'); P.through(e.x, e.z); game.step(0.8); P.settle(); });
  check('out in the yard', await ev(() => !game.room), await ev(() => game.room?.id ?? 'out'));
  res.mode = await ev(() => [game.settings.camera, game.settings.visual, game.camRig.mode, game.camRig.cut]);
  const before = await ev(() => { const z = F3.npc('zoe'), ready = () => { const tg = P.target(); return tg?.kind === 'npc' && tg.id === 'zoe'; };
    P.go(z.pos.x, z.pos.z, { tol: 1.4, stopWhen: ready, maxT: 40 }); P.face(z.pos.x, z.pos.z);
    for (let k = 0; k < 3 && !ready(); k++) { P.go(z.pos.x, z.pos.z, { tol: 1.0 - k * 0.2, maxT: 20 }); P.face(z.pos.x, z.pos.z); }
    P.release(); F3.run(2.5); const v = { pose: F3.pose(), hero: [game.hero.pos.x, game.hero.pos.z, game.hero.angle], lba: { ...game.camRig.lba, focus: game.camRig.lba.focus.toArray(), goal: game.camRig.lba.goal.toArray() }, why: game.camRig.why.mode };
    P.tap('KeyE', 0.02); return v; });
  check('the talk with Zoé is open', (await ev(() => game.state)) === 'dialog', await ev(() => game.state));
  res.lines = await talk(SEC, 'zoe', { max: 8, pics: 4, after: 4 });
  const after = await ev(() => ({ pose: F3.pose(), hero: [game.hero.pos.x, game.hero.pos.z, game.hero.angle], talk: game.camRig.why.talk, mode: game.camRig.why.mode }));
  res.handback = { before: before.pose, after: after.pose, heroBefore: before.hero, heroAfter: after.hero, talkAfter: after.talk, modeBefore: before.why, modeAfter: after.mode };
  // (the talk over and eased out: the chosen camera's own view, no shot over it; and with REF — this suite's json from the
  //  build before, same SEC — the very view that build had at this moment: the camera ran on under the talk as before.
  //  Him turning to Zoé in the talk moves the view a little in both builds, so the view before the talk is no reference)
  if (SEC !== 'follow') check(`hand back: after the talk the ${SEC} camera is its own view again, no shot over it`, after.talk === 0 && after.mode === before.why, res.handback);
  if (process.env.REF) {
    const R = JSON.parse(fs.readFileSync(process.env.REF, 'utf8')).handback, d = (a, b, i0, i1) => Math.hypot(...a.slice(i0, i1).map((v, i) => v - b[i0 + i]));
    res.handback.ref = { dPos: +d(after.pose, R.after, 0, 3).toFixed(3), dDir: +d(after.pose, R.after, 3, 6).toFixed(3), dHero: +d(after.hero, R.heroAfter, 0, 2).toFixed(3) };
    check(`hand back: the ${SEC} camera's view after the talk is the one the build before had (same walk, same talk)`, res.handback.ref.dHero < 0.02 && res.handback.ref.dPos < 0.05 && res.handback.ref.dDir < 0.01, res.handback.ref);
  }
}
const path = await ev(() => {
  const R = F3.rec, cuts = []; let maxMove = 0;
  for (let i = 1; i < R.length; i++) { if (!R[i] || !R[i - 1]) continue; const d = Math.hypot(R[i][0] - R[i - 1][0], R[i][1] - R[i - 1][1], R[i][2] - R[i - 1][2]); if (d > 0.6) cuts.push(+d.toFixed(2)); else maxMove = Math.max(maxMove, d); }
  return { frames: R.length, cuts, maxMovePerFrame: +maxMove.toFixed(3), solid: F3.solid };
});
res.path = path;
fs.writeFileSync(OUT + `face-3-${SEC}.json`, JSON.stringify(res, null, 1));
check('the camera never in anything solid in a talk', path.solid === 0, path);
if (SEC === 'scenes') {
  console.log('sign:', JSON.stringify(flat(res.sign)));
  for (const k of ['corlaHatch', 'corlaSide']) console.log(k, JSON.stringify(res[k].w), res[k].st, JSON.stringify(flat(res[k].lines || [])), JSON.stringify((res[k].lines || []).map((l) => l.why)));
} else console.log(SEC, JSON.stringify(flat(res.lines)), JSON.stringify(res.lines.map((l) => [l.why, l.mode])));
// (the measures judged: a prop — a mesh up to 1.6 m round, the game's own limit — within 3 m of the lens over a head,
//  a chest or a waist; an NPC's line framed on them, the head 100-170 px, under 75° from the lens, over the box)
const propOver = (l) => Object.values(l.cover).some((c) => c.hits.some(([pt, d, r]) => pt !== 'knees' && d < 3 && r <= 1.6));
const npcShot = (L, min = 100) => L.filter((l) => l.who !== 'hero' && l.who !== 'narrator').map((l) => l.fav === 'npc' && l.head && l.head.px >= min && l.head.px <= 170 && l.head.turn < 75 && l.head.bottom < l.box);
if (SEC === 'scenes') {
  check('sign: no prop drawn without a collider (the Bug St. board) over a head, chest or waist in the foreground, any line', !res.sign.some(propOver), res.sign.map((l) => [l.who, l.cover]));
  check('sign: Zoé speaking, the shot favours her (head 100-170 px, face under 75°, over the box)', npcShot(res.sign).every(Boolean), flat(res.sign));
  check('Corla from her hatch: the shot favours her (head 100-170 px, face under 75°, over the box) and her head is not hidden', npcShot(res.corlaHatch.lines || []).every(Boolean) && (res.corlaHatch.lines || []).length > 0 && (res.corlaHatch.lines || []).every((l) => !l.cover.cs_corla.hits.some(([pt]) => pt === 'head')), flat(res.corlaHatch.lines || []));
  console.log('INFO Corla from the kiosk\'s side (staged, as FACE-2\'s tour walked up):', JSON.stringify(flat(res.corlaSide.lines || [])));
} else {
  // (the Free orbit stands further out and wider (55°): its side of the line can leave the search only the 1.28× distance — 99-103 px there)
  const ok = npcShot(res.lines, 90);
  check(`${SEC}: Zoé speaking, the shot favours her (head 90-170 px, face under 75°, over the box), most lines`, ok.filter(Boolean).length >= 0.75 * ok.length && ok.length > 0, flat(res.lines));
}
await browser.close();
process.exitCode = done();
