// Chunk 2: Citadel in the prologue, from the house door (save-01) through segment 01's steps by input, with
// baseline shots (Zoé, the square, Bug Street, the harbour, Gilbert) and motion (run start/stop, sneak), down the well.
import { boxAt, FRAME, DRIVE } from './lib.mjs';
import { steps } from '../../../../../tests/playthrough/01-prologue-surface.mjs';
export default async ({ page, ev, shot, seq, seqFast, grab, log, W, H, EVD }) => {
  await page.evaluate(`window.__F = ${JSON.stringify(FRAME)}; ${DRIVE}`);
  const L = (i, d) => `${i} ${d.anim} ${d.spd}`;
  const step = async (label) => { const s = steps.find((x) => x[0] === label); const r = await ev(s[1], s[2]); const st = await ev(() => P.state()); log(`STEP ${label}: ${JSON.stringify(r)?.slice(0, 300)} | ${st.room} ${JSON.stringify(st.pos)} | ${st.obj}`); return r; };
  // 1) control returned outside the front door (Continue puts him where he saved: just outside)
  await ev(() => P.settle());
  await shot(`citadel-door-continue-${W}`);
  // the same walk out of the door as a player: walk 6 m away from the house, frames every 1/10 s (the roof fade)
  const zoe = await ev(() => { const n = P.npc('zoe'); return [n.pos.x, n.pos.y, n.pos.z]; });
  log('zoe at', zoe);
  await ev((z) => window.__drive(z[0], z[2], 2.0), zoe);
  const r0 = await seqFast('citadel-leave-door', 16, () => window.__driveStep(1 / 10), { full: true, cols: 4, label: (i, d) => `${i} ${d.anim} (${d.pos[0]},${d.pos[2]})` });
  await shot(`zoe-garden-wide-${W}`);
  await ev(() => { for (let i = 0; i < 300; i++) { const f = window.__driveStep(1 / 30); if (Math.hypot(game.hero.pos.x - window.__D.tx, game.hero.pos.z - window.__D.tz) < 2.0) break; } P.release(); P.settle(); });
  const zb = await boxAt(page, [zoe[0], zoe[1] + 0.9, zoe[2]], 320, W, H); await shot(`zoe-closeup-${W}`, { clip: zb });
  await shot(`twinsen-closeup-out-${W}`, { clip: await boxAt(page, await ev(() => [game.hero.pos.x, game.hero.pos.y + 0.9, game.hero.pos.z]), 320, W, H) });
  // talk to Zoé: dialog shot and both faces through the lines
  log(await ev(() => { const n = P.npc('zoe'); P.face(n.pos.x, n.pos.z); const tg = P.target(); P.tap('KeyE', 0.1); return { tg, st: game.state }; }));
  await shot(`zoe-dialog-${W}`);
  const mid = await ev(() => { const n = P.npc('zoe'), h = game.hero; return [(n.pos.x + h.pos.x) / 2, h.pos.y + 1.0, (n.pos.z + h.pos.z) / 2]; });
  const r1 = await seqFast('zoe-talk', 16, ({ i }) => { if (i && i % 4 === 0 && game.state === 'dialog') { game.input.keys.add('KeyE'); game.input.taps.add('KeyE'); game.step(1 / 60); game.input.keys.delete('KeyE'); } game.step(0.25); const f = eval(window.__F); f.sp = game.speaker === game.hero ? 'tw' : game.speaker?.def?.id || '-'; f.z = P.npc('zoe').rig?.anim; f.dlg = document.querySelector('#dialog .text')?.textContent.slice(0, 80); return f; }, { at: mid, size: 340, label: (i, d) => `${i} ${d.sp}: tw ${d.anim} / z ${d.z}` });
  log('zoe talk', JSON.stringify(r1.data.map((d) => [d.st, d.sp, d.anim, d.z, d.dlg])));
  log(await ev(() => P.settle()));
  // 2) run start / stop toward the square (Athletic, F2): 22 frames held, then let go
  await ev(() => { P.tap('F2'); return game.hero.behaviour; });
  await ev(() => window.__drive(-44.3, 9.8, 1.0));
  const r2 = await seqFast('run-start-stop', 30, ({ i }) => { if (i < 20) return window.__driveStep(1 / 15); P.release(); game.step(1 / 15); return eval(window.__F); }, { follow: true, size: 260, label: L });
  log('run', JSON.stringify(r2.data.map((d) => [d.anim, d.spd])));
  const r2b = await seqFast('walk-cycle-close', 16, () => { if (!window.__D2) { P.tap('F1'); window.__drive(-44.3, 9.8, 1.0); window.__D2 = 1; } return window.__driveStep(1 / 20); }, { follow: true, size: 200, cols: 8, label: L });
  log('walk', JSON.stringify(r2b.data.map((d) => [d.anim, d.spd])));
  // 3) segment 01 by input, with shots
  await step('look at the well');
  await shot(`citadel-square-${W}`);
  const gil = await ev(() => { const n = P.npc('gilbert'); return [n.pos.x, n.pos.y, n.pos.z]; });
  log('gilbert at', gil);
  // Gilbert: approach, first line, shot, the talk as a sequence, then the rest of the step
  log(await ev(() => { const n = P.npc('gilbert'); const r = P.go(n.pos.x, n.pos.z, { tol: 1.6, run: true }); P.face(n.pos.x, n.pos.z); return { r, tg: P.target() }; }));
  await shot(`gilbert-approach-prompt-${W}`);
  await shot(`gilbert-closeup-${W}`, { clip: await boxAt(page, [gil[0], gil[1] + 0.9, gil[2]], 300, W, H) });
  await ev(() => P.tap('KeyE', 0.1));
  await shot(`gilbert-dialog-${W}`);
  const gm = await ev(() => { const n = P.npc('gilbert'), h = game.hero; return [(n.pos.x + h.pos.x) / 2, h.pos.y + 1.0, (n.pos.z + h.pos.z) / 2]; });
  const r3 = await seqFast('gilbert-talk', 16, ({ i }) => { if (i && i % 4 === 0 && game.state === 'dialog') { game.input.keys.add('KeyE'); game.input.taps.add('KeyE'); game.step(1 / 60); game.input.keys.delete('KeyE'); } game.step(0.25); const f = eval(window.__F); f.sp = game.speaker === game.hero ? 'tw' : game.speaker?.def?.id || '-'; f.g = P.npc('gilbert').rig?.anim; f.dlg = document.querySelector('#dialog .text')?.textContent.slice(0, 80); return f; }, { at: gm, size: 340, label: (i, d) => `${i} ${d.sp}: tw ${d.anim} / g ${d.g}` });
  log('gilbert talk', JSON.stringify(r3.data.map((d) => [d.st, d.sp, d.anim, d.g, d.dlg])));
  await step('Gilbert: the key');
  await step('Xil');
  await shot(`xil-${W}`);
  await step('Doran: the stamp');
  await shot(`harbour-doran-${W}`);
  await step('Xil: the rope');
  await step('Tim and Lulu');
  // Bug Street baseline (on the way: the lane off the square)
  log(await ev(() => P.go(-50.5, -10.8, { tol: 0.8, run: true })));
  await ev(() => { P.face(-53.2, -12.6); P.settle(); });
  await shot(`bug-street-${W}`);
  // sneaking (Discreet) as a motion sheet, then the overhear step
  const tim = await ev(() => { const t = P.npc('tim'); return [t.pos.x, t.pos.z]; });
  await ev(() => P.tap('F4'));
  await ev((t) => window.__drive(t[0] + 6, t[1], 1.0), tim);
  const r4 = await seqFast('sneak', 16, () => window.__driveStep(1 / 15), { follow: true, size: 220, label: L });
  await ev(() => P.tap('F1'));
  await step('overhear (Discreet)');
  await step('Tim confesses');
  await step('the clover Tim gives back');
  // down the well: walk to it, then a full-frame sequence through the fade (DOM fade value in the labels)
  log(await ev(() => { const w = game.world.well; const r = P.go(w.x, w.z, { tol: 2.0, run: true, stopWhen: () => { const t = P.target(); return t && t.kind !== 'npc' && Math.hypot(game.hero.pos.x - w.x, game.hero.pos.z - w.z) < 2.2; } }); P.face(w.x, w.z); return { r, tg: P.target() }; }));
  await shot(`well-prompt-${W}`);
  const r5 = await seqFast('well-descend', 24, ({ i }) => { if (i === 0) { game.input.keys.add('KeyE'); game.input.taps.add('KeyE'); game.step(1 / 60); game.input.keys.delete('KeyE'); } if (game.state === 'dialog') { game.input.keys.add('KeyE'); game.input.taps.add('KeyE'); game.step(1 / 60); game.input.keys.delete('KeyE'); } game.step(1 / 10); return eval(window.__F); }, { full: true, cols: 4, label: (i, d) => `${i} ${d.st} ${d.room} f${d.fade || '-'} ${d.anim}` });
  log('well', JSON.stringify(r5.data.map((d) => [d.st, d.room, d.fade, d.anim, d.pos])));
  await ev(() => P.settle());
  await shot(`well-arrive-${W}`);
  log(JSON.stringify(await ev(() => P.state())));
};
