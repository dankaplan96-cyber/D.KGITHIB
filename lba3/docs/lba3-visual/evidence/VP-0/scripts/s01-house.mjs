// Chunk 1: the house in the prologue. Baseline shots (Twinsen, Zoé, the interior), idle, locomotion start/stop/turn,
// the cupboard interaction, a talk with Zoé, the walk out through the door (fade). KEEP saves outside.
import { boxAt, FRAME } from './lib.mjs';
export default async ({ page, ev, shot, seq, log, W, H }) => {
  await page.evaluate(`window.__F = ${JSON.stringify(FRAME)}`);
  const L = (i, d) => `${i} ${d.anim} ${d.spd}`;
  log(await ev(() => P.settle()));
  const info = await ev(() => { const z = P.npc('zoe'), a = P.npc('arthur'); return { hero: [game.hero.pos.x, game.hero.pos.y, game.hero.pos.z], zoe: z && [z.pos.x, z.pos.y, z.pos.z], arthur: a && [a.pos.x, a.pos.y, a.pos.z], searches: game.room.searches.map((s) => [s.x, s.z, s.label]), exits: game.room.exits.map((e) => [e.x, e.z, e.room || e.to || 'out']), hud: getComputedStyle(document.querySelector('#hud')).display + ' ' + document.querySelector('#stats').getBoundingClientRect().width }; });
  log(JSON.stringify(info));
  await shot(`house-start-${W}`);
  await shot(`twinsen-house-idle-${W}`, { clip: await boxAt(page, [info.hero[0], info.hero[1] + 0.9, info.hero[2]], 300, W, H) });
  if (info.arthur) await shot(`arthur-house-${W}`, { clip: await boxAt(page, [info.arthur[0], info.arthur[1] + 0.6, info.arthur[2]], 260, W, H) });
  await seq('house-tw-idle', 12, () => { game.step(0.25); return eval(window.__F); }, { size: 240, cols: 6, label: L });
  // walk start → stop toward the cupboard (Classic: Up)
  const cb = info.searches[0];
  await ev((c) => P.face(c[0], c[1]), cb);
  const r1 = await seq('house-walk-start-stop', 24, ({ i, arg }) => { const k = game.input.keys; const d = Math.hypot(game.hero.pos.x - arg[0], game.hero.pos.z - arg[1]); if (i < 14 && d > 1.8) k.add('ArrowUp'); else k.delete('ArrowUp'); game.step(1 / 15); return eval(window.__F); }, { arg: cb, size: 260, follow: true, label: L });
  log('walk', JSON.stringify(r1.data.map((d) => [d.anim, d.spd, d.pos[0], d.pos[2]])));
  // turn in place (Left) 12 frames
  const r2 = await seq('house-turn-in-place', 12, () => { game.input.keys.add('ArrowLeft'); game.step(1 / 15); return eval(window.__F); }, { size: 240, cols: 6, label: (i, d) => `${i} ${d.anim} a${d.ang}` });
  await ev(() => P.release());
  // the cupboard: approach until its prompt shows, a full shot with the prompt, then E as a sequence
  log(await ev((c) => { const r = P.go(c[0], c[1], { tol: 1.1, stopWhen: () => { const t = P.target(); return t && t.kind !== 'npc' && Math.hypot(game.hero.pos.x - c[0], game.hero.pos.z - c[1]) < 2.2; } }); P.face(c[0], c[1]); return { r, tg: P.target(), f: eval(window.__F) }; }, cb));
  await shot(`house-cupboard-prompt-${W}`);
  const r3 = await seq('house-cupboard-use', 24, ({ i }) => { if (i === 0) { game.input.keys.add('KeyE'); game.input.taps.add('KeyE'); game.step(1 / 60); game.input.keys.delete('KeyE'); } game.step(1 / 15); const f = eval(window.__F); f.ball = game.hero.hasBall; f.dlg = document.querySelector('#dialog').textContent.slice(0, 60); f.toast = document.querySelector('#toast').textContent; return f; }, { size: 300, label: (i, d) => `${i} ${d.st} ${d.anim} ${d.ball ? 'B' : ''}` });
  log('cupboard', JSON.stringify(r3.data.map((d) => [d.st, d.anim, d.ball, d.prompt, d.dlg, d.toast])));
  await shot(`house-cupboard-after-${W}`);
  log(await ev(() => P.settle()));
  await shot(`house-after-ball-hud-${W}`);
  // talk with Zoé: the first line, a shot, and both characters for 2 s (who talks, who listens)
  log(await ev(() => { const n = P.npc('arthur'); const r = P.go(n.pos.x, n.pos.z, { tol: 1.4 }); P.face(n.pos.x, n.pos.z); const tg = P.target(); P.tap('KeyE', 0.1); return { r, tg, st: game.state }; }));
  await shot(`house-arthur-dialog-${W}`);
  const mid = await ev(() => { const n = P.npc('arthur'), h = game.hero; return [(n.pos.x + h.pos.x) / 2, h.pos.y + 0.9, (n.pos.z + h.pos.z) / 2]; });
  const r4 = await seq('house-arthur-talk', 16, ({ i }) => { if (i && i % 5 === 0 && game.state === 'dialog') { game.input.keys.add('KeyE'); game.input.taps.add('KeyE'); game.step(1 / 60); game.input.keys.delete('KeyE'); } game.step(0.2); const f = eval(window.__F); f.sp = game.speaker === game.hero ? 'tw' : game.speaker?.def?.id || '-'; f.zoe = P.npc('arthur').rig?.anim; f.dlg = document.querySelector('#dialog').textContent.slice(0, 70); return f; }, { at: mid, size: 360, label: (i, d) => `${i} ${d.sp}: tw ${d.anim} / ar ${d.zoe}` });
  log('arthur', JSON.stringify(r4.data.map((d) => [d.st, d.sp, d.anim, d.zoe, d.dlg])));
  log(await ev(() => P.settle()));
  // out through the door: full frames every 1/20 s while walking into the exit
  const ex = await ev(() => { const e = game.room.exits.find((x) => !x.room); return [e.x, e.z]; });
  log(await ev((e) => { const r = P.go(e[0], e[1], { tol: 1.6 }); P.face(e[0], e[1]); return { r, f: eval(window.__F) }; }, ex));
  const r5 = await seq('house-exit-fade', 28, ({ i }) => { if (game.state === 'play') game.input.keys.add('ArrowUp'); game.step(1 / 20); return eval(window.__F); }, { full: true, cols: 4, label: (i, d) => `${i} ${d.room} fade ${d.fade || '-'} ${d.anim}` });
  log('exit', JSON.stringify(r5.data.map((d) => [d.room, d.fade, d.trans, d.anim, d.spd, d.st])));
  await ev(() => { P.release(); P.settle(); });
  await shot(`citadel-house-door-${W}`);
  log(JSON.stringify(await ev(() => P.state())));
};
