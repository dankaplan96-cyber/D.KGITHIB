// Chunk 3: the well (save-02): crystal mites by input (quick throws: ball vs right hand, frame by frame), the three
// crystals (segment 02), Sendell, the chapter card, then home along the lane: Zoé and Arthur's scene. KEEP save-03.
import { boxAt, FRAME, DRIVE } from './lib.mjs';
import { steps } from '../../../../../tests/playthrough/02-prologue-cave.mjs';
const THROWF = `(() => { const f = eval(window.__F), h = game.hero, b = game.ball, hand = h.rig.j?.armR?.hand; let hp = null;
  if (hand) { hand.updateWorldMatrix(true, false); const v = new h.pos.constructor(); hand.getWorldPosition(v); hp = [v.x, v.y, v.z]; }
  const bp = b.mesh.visible ? [b.mesh.position.x, b.mesh.position.y, b.mesh.position.z] : null;
  f.ball = b.state; f.bvis = b.mesh.visible; f.hand = hp && hp.map((x) => +x.toFixed(2)); f.bpos = bp && bp.map((x) => +x.toFixed(2));
  f.dHand = hp && bp ? +Math.hypot(hp[0] - bp[0], hp[1] - bp[1], hp[2] - bp[2]).toFixed(2) : null;
  f.over = h.rig.over ? h.rig.over.kind + ':' + (+h.rig.over.t).toFixed(2) + ':w' + (+h.rig.over.w).toFixed(2) : '-';
  f.thr = h.combat.throwing ? (+h.combat.throwing.at).toFixed(2) + (h.combat.throwing.released ? 'R' : '') : '-';
  return f; })()`;
export default async ({ page, ev, shot, seq, seqFast, grab, log, W, H }) => {
  await page.evaluate(`window.__F = ${JSON.stringify(FRAME)}; ${DRIVE}; window.__T = ${JSON.stringify(THROWF)};`);
  const step = async (label) => { const s = steps.find((x) => x[0] === label); const r = await ev(s[1], s[2]); const st = await ev(() => P.state()); log(`STEP ${label}: ${JSON.stringify(r)?.slice(0, 300)} | ${st.room} ${JSON.stringify(st.pos)} hp ${st.hp} | ${st.obj}`); return r; };
  await step('continue in the cave');
  await shot(`well-cave-${W}`);
  const en = await ev(() => game.enemies.filter((e) => e.alive && e.present).map((e) => ({ id: e.id, kind: e.kind || e.def?.kind, st: e.state, p: [e.pos.x, e.pos.y, e.pos.z].map((v) => +v.toFixed(1)), d: +e.pos.distanceTo(game.hero.pos).toFixed(1) })));
  log('enemies', JSON.stringify(en));
  // the hand probe available?
  log('hand joint', await ev(() => ({ hand: !!game.hero.rig.j?.armR?.hand, keys: Object.keys(game.hero.rig.j || {}) })));
  // a standing quick throw at the nearest mite (approach to ~6 m first), frame by frame at 1/30 s
  for (let k = 0; k < 3; k++) {
    const tgt = await ev(() => { const h = game.hero; const e = game.enemies.filter((e) => e.alive && e.present).sort((a, b) => a.pos.distanceTo(h.pos) - b.pos.distanceTo(h.pos))[0]; if (!e) return null; if (e.pos.distanceTo(h.pos) > 6.5) P.go(e.pos.x, e.pos.z, { tol: 5.5, maxT: 10, fight: false }); for (let w = 0; w < 120 && game.ball.state !== 'idle'; w++) game.step(1 / 30); P.face(e.pos.x, e.pos.z, 1.5); return { id: e.id, d: +e.pos.distanceTo(h.pos).toFixed(1), st: e.state, hp: e.hp }; });
    log('throw target', JSON.stringify(tgt)); if (!tgt) break;
    const moving = k === 1;   // second throw: while walking (Up held)
    const r = await seqFast(`throw-${moving ? 'walking' : 'standing'}-${k}`, 20, ({ i, arg }) => { const I = game.input; if (arg) I.keys.add('ArrowUp'); if (i === 0) { I.keys.add('KeyF'); I.taps.add('KeyF'); game.step(1 / 60); I.keys.delete('KeyF'); game.step(1 / 60); } else game.step(1 / 30); return eval(window.__T); }, { arg: moving, follow: true, size: 220, yOff: 1.0, cols: 10, label: (i, d) => `${i} ${d.anim} ${d.thr} ${d.ball} h${d.dHand ?? '-'}` });
    await ev(() => P.release());
    log(`throw ${k}`, JSON.stringify(r.data.map((d) => [d.anim, d.thr, d.over, d.ball, d.dHand, d.bpos, d.hand, d.spd])));
    log('after', JSON.stringify(await ev(() => game.enemies.filter((e) => e.present).map((e) => [e.id, e.alive, e.hp, e.state]))));
  }
  // let the harness finish the mites as a player (quick throws), then the crystals as in segment 02
  log('fight', JSON.stringify(await ev(() => P.fight({ maxT: 60 }))));
  await shot(`well-after-fight-${W}`);
  await step('wake the crystals');
  await shot(`well-crystals-lit-${W}`);
  // to the vein: walk there, then the Sendell scene as frames (full) every 0.25 s, dialog lines advanced with E
  log(await ev(() => { const R = game.room; window.__drive(R.chamberX + 1.5, R.vein.z, 0.8); for (let i = 0; i < 1800 && game.state === 'play' && !game.cutscene; i++) window.__driveStep(1 / 30); P.release(); return eval(window.__F); }));
  const r6 = await seqFast('sendell-scene', 24, ({ i }) => { if (game.state === 'dialog' && i % 3 === 2) { game.input.keys.add('KeyE'); game.input.taps.add('KeyE'); game.step(1 / 60); game.input.keys.delete('KeyE'); } game.step(0.25); const f = eval(window.__T); f.dlg = document.querySelector('#dialog .text')?.textContent.slice(0, 50); return f; }, { full: true, cols: 4, label: (i, d) => `${i} ${d.st} ${d.anim} ${d.ball} fade${d.fade || '-'}` });
  log('sendell', JSON.stringify(r6.data.map((d) => [d.st, d.anim, d.ball, d.bvis, d.bpos, d.hand, d.fade, d.room, d.dlg])));
  await shot(`sendell-mid-${W}`);
  // the rest of the scene, chapter card, morning: shots through the card
  for (let k = 0; k < 8; k++) {
    const s = await ev(() => { if (game.state === 'dialog') P.tap('KeyE', 0.12); game.step(0.5); return { st: game.state, room: game.room?.id ?? 'citadel', fade: document.querySelector('#fade').style.opacity, chap: getComputedStyle(document.querySelector('#chapter')).opacity + ' ' + document.querySelector('#chapter').textContent.slice(0, 60) }; });
    log('after sendell', k, JSON.stringify(s));
    if (k === 2 || k === 5) await shot(`prologue-end-${k}-${W}`);
  }
  log(await ev(() => P.settle(200)));
  await shot(`chapter1-morning-${W}`);
  log(JSON.stringify(await ev(() => ({ ...P.state(), flags: { done: game.flags.prologueDone, ch: game.flags.chapterKey } }))));
  // back home: through the lane to the house as a player, into the house (door transition frames), Zoé and Arthur
  log('to house', JSON.stringify(await ev(() => { const d = game.story.doors().find((x) => x.room === 'house'); const r = P.go(d.x, d.z, { tol: 2.5, run: true, maxT: 240 }); P.face(d.x, d.z); return { r, d: [d.x, d.z] }; })));
  await shot(`house-door-outside-${W}`);
  const r7 = await seqFast('house-enter', 20, ({ i }) => { if (game.state === 'play') game.input.keys.add('ArrowUp'); game.step(1 / 15); return eval(window.__F); }, { full: true, cols: 4, label: (i, d) => `${i} ${d.room} f${d.fade || '-'} ${d.anim}` });
  log('enter', JSON.stringify(r7.data.map((d) => [d.room, d.fade, d.anim, d.pos])));
  await ev(() => { P.release(); P.settle(); });
  await shot(`house-chapter1-${W}`);
  log(await ev(() => { const n = P.npc('zoe'); if (!n?.present) return 'zoe absent'; const r = P.go(n.pos.x, n.pos.z, { tol: 1.5 }); P.face(n.pos.x, n.pos.z); P.tap('KeyE', 0.1); return { r, st: game.state, room: game.room?.id }; }));
  await shot(`house-zoe-dialog-${W}`);
  const mid = await ev(() => { const z = P.npc('zoe'), a = P.npc('arthur'), h = game.hero; return [(z.pos.x + a.pos.x + h.pos.x) / 3, h.pos.y + 1.0, (z.pos.z + a.pos.z + h.pos.z) / 3]; });
  const r8 = await seqFast('home-scene', 24, ({ i }) => { if (game.state === 'dialog' && i % 4 === 3) { game.input.keys.add('KeyE'); game.input.taps.add('KeyE'); game.step(1 / 60); game.input.keys.delete('KeyE'); } game.step(0.25); const f = eval(window.__F); f.sp = game.speaker === game.hero ? 'tw' : game.speaker?.def?.id || '-'; f.z = P.npc('zoe').rig?.anim; f.a = P.npc('arthur').rig?.anim; f.dlg = document.querySelector('#dialog .text')?.textContent.slice(0, 60); return f; }, { at: mid, size: 420, cols: 6, label: (i, d) => `${i} ${d.sp}: t ${d.anim} z ${d.z} a ${d.a}` });
  log('home scene', JSON.stringify(r8.data.map((d) => [d.st, d.sp, d.anim, d.z, d.a, d.dlg])));
  log(await ev(() => P.settle()));
  log(JSON.stringify(await ev(() => P.state())));
};
