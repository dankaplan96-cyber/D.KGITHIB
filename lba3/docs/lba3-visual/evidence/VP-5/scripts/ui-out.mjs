// VP-5 (outdoors, prologue save-01): the talk prompt near Zoé, then dialogue, inventory, holomap, pause, and back to
// play: the prompt and weapon pill per state, a screenshot of each.
import { VIS, settleCss } from './vis.mjs';
export default async ({ page, ev, shot, log, W }) => {
  // (CSS fades run on the wall clock: read what is visible once they have finished)
  const V = async () => { await page.waitForTimeout(150); await settleCss(page); return ev(() => eval(window.__V)); };
  const T = process.env.TAG || 'x';
  await ev(`window.__V = ${JSON.stringify(VIS)}`);
  const vis = async (label) => { const v = await V(); log(label, JSON.stringify(v)); return v; };
  await ev(() => P.settle());
  log(JSON.stringify(await ev(() => { const n = P.npc('zoe'); const r = P.go(n.pos.x, n.pos.z, { tol: 1.5 }); P.face(n.pos.x, n.pos.z); game.hud.weaponFlash(); game.step(0.2); return { r, tg: P.target()?.kind }; })));
  await vis('play+prompt'); await shot(`ui-prompt-${W}-${T}`);
  await ev(() => { game.hud.weaponFlash(); game.step(0.05); P.tap('KeyE', 0.1); game.step(1.0); });
  await vis('dialog'); await shot(`ui-dialog-${W}-${T}`);
  await ev(() => P.settle());
  await vis('play after dialog');
  await ev(() => { P.tap('KeyI', 0.3); }); await vis('inventory'); await shot(`ui-inventory-${W}-${T}`);
  await ev(() => { P.tap('KeyI', 0.3); P.settle(); }); await vis('play after inventory');
  await ev(() => { P.tap('KeyM', 0.5); }); await vis('map');
  await ev(() => { P.tap('KeyM', 0.3); P.settle(); }); await vis('play after map');
  await ev(() => { P.tap('Escape', 0.3); }); await vis('pause'); await shot(`ui-pause-${W}-${T}`);
  await ev(() => { P.tap('Escape', 0.3); P.settle(); game.step(0.3); });
  await vis('play after pause'); await shot(`ui-back-${W}-${T}`);
  // walk away 4 m: the prompt goes; back: it returns
  await ev(() => { const n = P.npc('zoe'); P.go(n.pos.x + 4.5, n.pos.z, { tol: 0.5 }); game.step(0.3); }); await vis('away');
  await ev(() => { const n = P.npc('zoe'); P.go(n.pos.x, n.pos.z, { tol: 1.5 }); P.face(n.pos.x, n.pos.z); game.step(0.3); }); await vis('back near Zoe');
};
