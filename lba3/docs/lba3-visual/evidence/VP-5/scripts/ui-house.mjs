// VP-5 (house, new game): the cupboard gives the ball (the weapon pill shows), then straight to Arthur: is the pill or
// a prompt under the dialogue box? Then back to play: the prompt comes back.
import { VIS, settleCss } from './vis.mjs';
export default async ({ page, ev, shot, log, W }) => {
  // (CSS fades run on the wall clock: read what is visible once they have finished)
  const V = async () => { await page.waitForTimeout(150); await settleCss(page); return ev(() => eval(window.__V)); };
  const T = process.env.TAG || 'x';
  await ev(`window.__V = ${JSON.stringify(VIS)}`);
  log(JSON.stringify(await ev(() => P.settle())));
  const cb = await ev(() => { const s = game.room.searches[0]; return [s.x, s.z]; });
  log(JSON.stringify(await ev((c) => { const r = P.go(c[0], c[1], { tol: 1.1, stopWhen: () => { const t = P.target(); return t && t.kind !== 'npc' && Math.hypot(game.hero.pos.x - c[0], game.hero.pos.z - c[1]) < 2.2; } }); P.face(c[0], c[1]); return { r, tg: P.target()?.kind }; }, cb)));
  log('cupboard prompt', JSON.stringify(await V()));
  await ev(() => { P.tap('KeyE', 0.1); P.settle(); });
  log('after ball', JSON.stringify(await V()), await ev(() => game.hero.hasBall));
  // to Arthur at once (the pill is still showing from the new weapon)
  log(JSON.stringify(await ev(() => { const n = P.npc('arthur'); const r = P.go(n.pos.x, n.pos.z, { tol: 1.4 }); P.face(n.pos.x, n.pos.z); return { r, tg: P.target()?.kind }; })));
  log('arthur prompt', JSON.stringify(await V()));
  // ISO: the pill is shown as it is for 2.5 s after the ball is taken (the walk to Arthur takes ~3.4 s)
  await ev(() => { game.hud.weaponFlash(); game.step(0.05); P.tap('KeyE', 0.1); game.step(0.4); });
  log('arthur dialog', JSON.stringify(await V()));
  await shot(`house-arthur-dialog-${W}-${T}`);
  await ev(() => P.settle());
  log('back in play', JSON.stringify(await (async () => { await ev(() => game.step(0.3)); return V(); })()));
  await shot(`house-back-in-play-${W}-${T}`);
};
