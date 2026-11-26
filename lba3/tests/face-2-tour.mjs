// FACE-2 (P86): the speaker-favouring two-shot beyond Zoé's yard — a new game, out of the house, then the nearest people
// out on Citadel who talk (up to N), each walked up to and talked to with E as a player; every line 3.2 s, each frame
// stepped at 1/60: the camera never in anything solid, the cuts (a frame's jump > 0.6 m) no more than the changes of
// speaker, and per line the favoured face (camRig.tk.fav), the speaker's head (px tall) and its turn from the lens. The
// first line of each talk and his first line pictured.
//   OUT=captures/face-2/tour (default)   N=5   W, H (1280×720)
// Automated runtime only (SwiftShader).
import { launch, open, checker } from './lib/boot.mjs';
import fs from 'node:fs';
const OUT = (process.env.OUT || 'captures/face-2/tour') + '/';
fs.mkdirSync(OUT, { recursive: true });
const { check, done } = checker({ info: 'always' });
const W = +(process.env.W || 1280), H = +(process.env.H || 720), N = +(process.env.N || 5);
const { browser, page } = await launch({ width: W, height: H });
const ev = (f, a) => page.evaluate(f, a);
await open(page, '?nocine');
await page.click('[data-act="new"]');
if (await ev(() => game.screen === 'confirmnew')) await page.click('#confirmnew [data-act="newyes"]');
await page.waitForFunction(() => game.state === 'play' && game.room?.id === 'house', null, { timeout: 600000 });
await ev(() => { game.testFreeze = true; game.step(1.2); P.yardFirst = false;
  const sp = game.room.searches.find((x) => x.id === 'cupboard'); P.use(sp.x, sp.z);
  for (let i = 0; i < 40 && game.state !== 'play'; i++) { if (game.state === 'found') P.tap('KeyE', 0.2); P.settle(); }
  game.step(1.0); P.settle(); const e = game.room.exits.find((x) => x.to === 'outdoor'); P.through(e.x, e.z); game.step(0.8); P.settle();
  const V = game.camera.position.constructor;
  window.F2 = {
    head(a) {
      const p = new V(); a.rig.j.head.getWorldPosition(p); const s = a.rig.root.scale.y || 1;
      const pts = [[0, 0.32, 0], [0, -0.22, 0], [0.25, 0.05, 0], [-0.25, 0.05, 0], [0, 0.05, 0.25], [0, 0.05, -0.25]].map(([x, y, z]) => new V(p.x + x * s, p.y + y * s, p.z + z * s).project(game.camera));
      const ys = pts.map((q) => (-q.y * 0.5 + 0.5) * innerHeight), xs = pts.map((q) => (q.x * 0.5 + 0.5) * innerWidth);
      const e = new V(); a.rig.j.eyes[0].getWorldPosition(e); const f = e.sub(p).setY(0).normalize(), c = game.camera.position.clone().sub(p).setY(0).normalize();
      return { px: Math.round(Math.max(...ys) - Math.min(...ys)), x: Math.round((Math.min(...xs) + Math.max(...xs)) / 2), bottom: Math.round(Math.max(...ys)), turn: Math.round((Math.acos(Math.max(-1, Math.min(1, f.dot(c)))) * 180) / Math.PI) };
    },
    who() { const s = game.speaker; return s === game.hero ? 'hero' : s?.def?.id || (s ? '?' : 'narrator'); },
    fav() { const f = game.camRig.tk?.fav; return !f ? '' : f === game.hero.pos ? 'hero' : 'npc'; },
    box() { const r = document.querySelector('#dialog')?.getBoundingClientRect(); return r && r.height ? Math.round(r.top) : H; },
    rec: [], solid: [],
    run(t) { for (let i = 0; i < Math.round(t * 60); i++) { game.step(1 / 60); const c = game.camera.position; this.rec.push([c.x, c.y, c.z]); if (game.state === 'dialog' && (!game.room || game.room.outdoor) && game.camRig._solidAt(c, 0)) this.solid.push([+c.x.toFixed(2), +c.y.toFixed(2), +c.z.toFixed(2)]); } },
  };
});
// the nearest people out here (not Zoé: tests/face-2.mjs), by straight distance
const ids = await ev((N) => { const h = game.hero.pos; return game.npcs.filter((n) => n.present && n.pos && n.def?.id && n.def.id !== 'zoe' && Math.hypot(n.pos.x - h.x, n.pos.z - h.z) < 90).sort((a, b) => Math.hypot(a.pos.x - h.x, a.pos.z - h.z) - Math.hypot(b.pos.x - h.x, b.pos.z - h.z)).slice(0, N + 4).map((n) => n.def.id); }, N);
const talks = [];
for (const id of ids) {
  if (talks.length >= N) break;
  const open1 = await ev((id) => {
    const n = P.npc(id), ready = () => { const tg = P.target(); return tg?.kind === 'npc' && tg.id === id; };
    if (!n?.present) return 'absent';
    const r = P.go(n.pos.x, n.pos.z, { tol: 1.5, stopWhen: ready, maxT: 60 }); P.face(n.pos.x, n.pos.z);
    for (let k = 0; k < 3 && !ready() && game.state === 'play'; k++) { P.go(n.pos.x, n.pos.z, { tol: 1.1 - k * 0.2, maxT: 15 }); P.face(n.pos.x, n.pos.z); }
    if (game.state !== 'play') { P.settle(); return 'interrupted'; }
    if (!ready()) return 'no prompt (' + r.r + ')';
    F2.rec.push(null); P.tap('KeyE', 0.02); return game.state;
  }, id);
  if (open1 !== 'dialog') { talks.push({ id, skipped: open1 }); continue; }
  const lines = []; let heroShot = false;
  for (let i = 0; i < 8 && (await ev(() => game.state)) === 'dialog'; i++) {
    const m = await ev(() => { F2.run(3.2); const s = game.speaker, a = s?.rig ? s : null; return { who: F2.who(), fav: F2.fav(), why: game.camRig.tk?.shot?.why, head: a ? F2.head(a) : null, box: F2.box(), out: !game.room || !!game.room.outdoor }; });
    lines.push(m);
    if (i === 0 || (m.who === 'hero' && !heroShot)) {
      if (m.who === 'hero') heroShot = true;
      await ev(() => game.renderer.render());
      await page.screenshot({ path: `${OUT}${id}-line${i}-${m.who}.jpg`, type: 'jpeg', quality: 80, timeout: 180000 });
    }
    await ev(() => { const D = game.hud.dialog; if (D.shown < D.full.length) P.tap('KeyE', 0.02); P.tap('KeyE', 0.02); });
  }
  await ev(() => { for (let i = 0; i < 30 && game.state !== 'play'; i++) { if (game.state === 'found') P.tap('KeyE', 0.2); else P.settle(); } F2.run(1.0); });
  talks.push({ id, lines });
}
const path = await ev(() => {
  const R = F2.rec, cuts = []; let maxMove = 0;
  for (let i = 1; i < R.length; i++) { if (!R[i] || !R[i - 1]) continue; const d = Math.hypot(R[i][0] - R[i - 1][0], R[i][1] - R[i - 1][1], R[i][2] - R[i - 1][2]); if (d > 0.6) cuts.push(+d.toFixed(2)); else maxMove = Math.max(maxMove, d); }
  return { frames: R.length, cuts, maxMovePerFrame: +maxMove.toFixed(3), solid: F2.solid.slice(0, 10), solidN: F2.solid.length };
});
fs.writeFileSync(OUT + 'tour.json', JSON.stringify({ W, H, talks, path }, null, 1));
const done1 = talks.filter((t) => t.lines);
const all = done1.flatMap((t) => t.lines.filter((l) => l.head && l.out));
const changes = done1.reduce((s, t) => s + t.lines.filter((l, i) => i && l.who !== t.lines[i - 1].who).length + 2, 0);
check(`talks held (${done1.length} of ${talks.length} tried)`, done1.length >= Math.min(3, N), talks.map((t) => t.id + ':' + (t.skipped || t.lines.map((l) => l.who + '/' + l.fav).join(','))));
check('the camera is never in anything solid in a talk', path.solidN === 0, path.solid);
check('calm: the cuts no more than the changes of speaker plus the way in and out of each talk', path.cuts.length <= changes, { cuts: path.cuts, changes });
check('an NPC speaking out of doors: the shot favours them, head 100-170 px, face under 75° from the lens, over the box (most lines)', all.filter((l) => l.who !== 'hero').filter((l) => l.fav === 'npc' && l.head.px >= 100 && l.head.px <= 170 && l.head.turn < 75 && l.head.bottom < l.box).length >= 0.75 * all.filter((l) => l.who !== 'hero').length, all.filter((l) => l.who !== 'hero').map((l) => [l.who, l.fav, l.head?.px, l.head?.turn, l.why]));
check('Twinsen speaking out of doors: his face seen where the line was long enough to cut to it', all.filter((l) => l.who === 'hero' && l.fav === 'hero').every((l) => l.head.turn < 75 && l.head.px >= 100), all.filter((l) => l.who === 'hero').map((l) => [l.fav, l.head?.px, l.head?.turn, l.why]));
await browser.close();
process.exitCode = done();
