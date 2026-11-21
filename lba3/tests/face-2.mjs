// FACE-2 (P86, FULL-TEST §3.2): does the dialogue camera show the face that speaks, near enough to read it? New game →
// the yard → walk up to Zoé → E, then the real conversation line by line (E, as a player), every frame stepped at 1/60:
// per line the speaker, the face the two-shot favours (camRig.tk.fav), the speaker's head on screen (px tall at the
// window's size), how far the face is turned from the lens, whether the head clears the dialogue box; over the whole talk
// and the hand back to play the cuts (a frame's jump > 0.6 m), the largest move of a frame between them, and the camera
// never in anything solid. Then, on a line of each, both faces set curious and concerned (Rig.setFace) and pictured.
//   OUT=captures/face-2/after (default)   W, H: the window (1280×720)   SPOT=yard (default) | wall: the talk with Zoé
//   from where her house's wall stands at his back
// Automated runtime only (SwiftShader): the pictures are for a person to judge.
import { launch, open, checker } from './lib/boot.mjs';
import fs from 'node:fs';
const OUT = (process.env.OUT || 'captures/face-2/after') + '/';
fs.mkdirSync(OUT, { recursive: true });
const { check, done } = checker({ info: 'always' });
const W = +(process.env.W || 1280), H = +(process.env.H || 720), SPOT = process.env.SPOT || 'yard';
const { browser, page } = await launch({ width: W, height: H });
const ev = (f, a) => page.evaluate(f, a);
await open(page, '?nocine');
await page.click('[data-act="new"]');
if (await ev(() => game.screen === 'confirmnew')) await page.click('#confirmnew [data-act="newyes"]');
await page.waitForFunction(() => game.state === 'play' && game.room?.id === 'house', null, { timeout: 600000 });
await ev(() => { game.testFreeze = true; game.step(1.2); P.yardFirst = false;
  const sp = game.room.searches.find((x) => x.id === 'cupboard'); P.use(sp.x, sp.z);
  for (let i = 0; i < 40 && game.state !== 'play'; i++) { if (game.state === 'found') P.tap('KeyE', 0.2); P.settle(); }
  game.step(1.0); P.settle(); const e = game.room.exits.find((x) => x.to === 'outdoor'); P.through(e.x, e.z); game.step(0.8); P.settle(); });
check('out in the yard', await ev(() => !game.room), await ev(() => game.room?.id ?? 'out'));
// the measures of one frame: the speaker's head (px tall, from the head bone as p79-faces.mjs), its face's turn from the
// lens (deg), its head's foot over the dialogue box's top, the camera in anything solid
await ev(() => {
  const V = game.camera.position.constructor;
  window.F2 = {
    head(a) {
      const p = new V(); a.rig.j.head.getWorldPosition(p); const s = a.rig.root.scale.y || 1;
      const pts = [[0, 0.32, 0], [0, -0.22, 0], [0.25, 0.05, 0], [-0.25, 0.05, 0], [0, 0.05, 0.25], [0, 0.05, -0.25]].map(([x, y, z]) => new V(p.x + x * s, p.y + y * s, p.z + z * s).project(game.camera));
      const xs = pts.map((q) => (q.x * 0.5 + 0.5) * innerWidth), ys = pts.map((q) => (-q.y * 0.5 + 0.5) * innerHeight);
      const e = new V(); a.rig.j.eyes[0].getWorldPosition(e); const f = e.sub(p).setY(0).normalize(), c = game.camera.position.clone().sub(p).setY(0).normalize();
      return { px: Math.round(Math.max(...ys) - Math.min(...ys)), x: Math.round((Math.min(...xs) + Math.max(...xs)) / 2), bottom: Math.round(Math.max(...ys)), top: Math.round(Math.min(...ys)), turn: Math.round((Math.acos(Math.max(-1, Math.min(1, f.dot(c)))) * 180) / Math.PI) };
    },
    who() { const s = game.speaker; return s === game.hero ? 'hero' : s?.def?.id || (s ? '?' : 'narrator'); },
    fav() { const f = game.camRig.tk?.fav; return !f ? '' : f === game.hero.pos ? 'hero' : 'npc'; },
    box() { const r = document.querySelector('#dialog')?.getBoundingClientRect(); return r && r.height ? Math.round(r.top) : H; },
    rec: [], solid: 0,
    // step `t` s a frame at a time, keeping the camera's path
    run(t) { for (let i = 0; i < Math.round(t * 60); i++) { game.step(1 / 60); const c = game.camera.position; this.rec.push([c.x, c.y, c.z, game.state === 'dialog' ? 1 : 0]); if (game.camRig._solidAt(c, 0)) this.solid++; } },
  };
});
// the talk: walk up until the Talk prompt is hers, face her, E (as p79-faces.mjs)
await ev((spot) => {
  const z = P.npc('zoe'), ready = () => { const tg = P.target(); return tg?.kind === 'npc' && tg.id === 'zoe'; };
  if (spot === 'wall') { P.go(z.pos.x - 1.6, z.pos.z + 0.4, { tol: 0.5, maxT: 30 }); }
  P.go(z.pos.x, z.pos.z, { tol: 1.4, stopWhen: ready, maxT: 40 }); P.face(z.pos.x, z.pos.z);
  for (let k = 0; k < 3 && !ready(); k++) { P.go(z.pos.x, z.pos.z, { tol: 1.0 - k * 0.2, maxT: 20 }); P.face(z.pos.x, z.pos.z); }
  P.tap('KeyE', 0.02);
}, SPOT);
check('the talk with Zoé is open', (await ev(() => game.state)) === 'dialog', await ev(() => game.state));
const lines = [];
let shotHero = false, shotZoe = false;
for (let i = 0; i < 14 && (await ev(() => game.state)) === 'dialog'; i++) {
  // a line: 3.2 s (typed out, the shot held and, for a new speaker, the cut), measured, pictured, then E as a player
  const m = await ev(() => { F2.run(3.2); const s = game.speaker, a = s?.rig ? s : null; return { who: F2.who(), fav: F2.fav(), line: game.hud.dialog.full.slice(0, 48), why: game.camRig.tk?.shot?.why, head: a ? F2.head(a) : null, other: a ? F2.head(a === game.hero ? P.npc('zoe') : game.hero) : null, box: F2.box() }; });
  lines.push(m);
  if (i < 6) await ev(() => game.renderer.render());
  if (i < 6) await page.screenshot({ path: `${OUT}line-${i}-${m.who}.jpg`, type: 'jpeg', quality: 85, timeout: 180000 });
  // on the first line of each, the two expressions FACE-1 left hardest to tell apart, both faces, pictured
  if ((m.who === 'hero' && !shotHero) || (m.who === 'zoe' && !shotZoe)) {
    if (m.who === 'hero') shotHero = true; else shotZoe = true;
    for (const n of ['curious', 'concerned']) {
      const hb = await ev((n) => { for (const a of [game.hero, P.npc('zoe')]) a.rig.setFace(n, 1, 30); F2.run(0.6); game.renderer.render(); return F2.head(game.speaker); }, n);
      await page.screenshot({ path: `${OUT}${m.who}-speaks-${n}-frame.jpg`, type: 'jpeg', quality: 90, timeout: 180000 });
      const pad = Math.max(10, hb.px * 0.45), x = Math.max(0, Math.round(hb.x - hb.px / 2 - pad)), y = Math.max(0, Math.round(hb.top - pad));
      await page.screenshot({ path: `${OUT}${m.who}-speaks-${n}-head.png`, clip: { x, y, width: Math.min(W - x, Math.round(hb.px + 2 * pad)), height: Math.min(H - y, Math.round(hb.px + 2 * pad)) }, timeout: 180000 });
    }
  }
  await ev(() => { const D = game.hud.dialog; if (D.shown < D.full.length) P.tap('KeyE', 0.02); P.tap('KeyE', 0.02); });
}
// the hand back to play: 2 s still (the shot kept), then a step away
const after = await ev(() => { for (let i = 0; i < 20 && game.state === 'found'; i++) { P.tap('KeyE', 0.2); F2.run(0.3); } F2.run(2.0); const k = game.camRig.tk; const out = { state: game.state, fav: F2.fav(), keep: !!k?.keep }; P.go(game.hero.pos.x + 3, game.hero.pos.z, { tol: 0.6, maxT: 4 }); F2.rec.push(null); F2.run(2.0); out.talk = game.camRig.why.talk; return out; });
const path = await ev(() => {
  const R = F2.rec, cuts = []; let maxMove = 0;
  for (let i = 1; i < R.length; i++) { if (!R[i] || !R[i - 1]) continue; const d = Math.hypot(R[i][0] - R[i - 1][0], R[i][1] - R[i - 1][1], R[i][2] - R[i - 1][2]); if (d > 0.6) cuts.push([i, +d.toFixed(2), R[i][3]]); else maxMove = Math.max(maxMove, d); }
  return { frames: R.length, cuts, maxMovePerFrame: +maxMove.toFixed(3), solidFrames: F2.solid };
});
fs.writeFileSync(OUT + 'face-2.json', JSON.stringify({ W, H, SPOT, lines, after, path }, null, 1));
const zl = lines.filter((l) => l.who === 'zoe' && l.head), hl = lines.filter((l) => l.who === 'hero' && l.head);
check('lines from both of them were heard', zl.length > 0 && hl.length > 0, lines.map((l) => l.who + ':' + l.fav));
check('Zoé speaking: the shot favours her, her head 100-170 px tall, her face turned under 75° from the lens, over the box', zl.every((l) => l.fav === 'npc' && l.head.px >= 100 && l.head.px <= 170 && l.head.turn < 75 && l.head.bottom < l.box), zl.map((l) => [l.fav, l.head, l.box]));
check('Twinsen speaking: his face is seen (the shot on his face, turned under 75° from the lens, 100-170 px, over the box)', hl.some((l) => l.fav === 'hero' && l.head.px >= 100 && l.head.px <= 170 && l.head.turn < 75 && l.head.bottom < l.box), hl.map((l) => [l.fav, l.head, l.box]));
check('calm: no more cuts than changes of speaker, plus the one back at the end', path.cuts.length <= lines.filter((l, i) => i && l.who !== lines[i - 1].who).length + 1, path.cuts);
check('between the cuts the view glides (no frame moves it more than 0.6 m)', path.maxMovePerFrame < 0.6, path);
check('the camera is never in anything solid, in the talk or after it', path.solidFrames === 0, path.solidFrames);
check('after the talk: back on his side, and to the chase once he walks', after.state === 'play' && after.fav !== 'hero' && after.talk === 0, after);
await browser.close();
process.exitCode = done();
