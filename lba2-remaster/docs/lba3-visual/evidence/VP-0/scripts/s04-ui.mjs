// Chunk 4: UI layout at the given size (run at 1280×720 and 960×540) from save-01 (outdoors, prologue, ball in hand):
// play HUD, an interaction prompt, dialogue, inventory/journal, holomap, pause; then the house door both ways with a
// full screenshot at the moment control returns (the roof).
import { FRAME } from './lib.mjs';
export default async ({ page, ev, shot, log, W }) => {
  await page.evaluate(`window.__F = ${JSON.stringify(FRAME)}`);
  const vis = () => ev(() => [...document.querySelectorAll('#hud > *, #dialog, #inventory, #holomap, #pause, #toast')].filter((e) => { const s = getComputedStyle(e); return s.display !== 'none' && !e.classList.contains('hidden') && +s.opacity > 0.05; }).map((e) => { const r = e.getBoundingClientRect(); return `${e.id}:${Math.round(r.x)},${Math.round(r.y)},${Math.round(r.width)}x${Math.round(r.height)} op${getComputedStyle(e).opacity}`; }));
  await ev(() => P.settle());
  // walk a little so the LBA-style HUD shows its stats
  await ev(() => { P.holdFor(['ArrowUp'], 0.6); P.settle(); });
  log('play', JSON.stringify(await vis())); await shot(`ui-play-${W}`);
  // dialogue with Zoé
  log(await ev(() => { const n = P.npc('zoe'); const r = P.go(n.pos.x, n.pos.z, { tol: 1.5 }); P.face(n.pos.x, n.pos.z); return { r, tg: P.target() }; }));
  log('prompt', JSON.stringify(await vis())); await shot(`ui-prompt-${W}`);
  await ev(() => { P.tap('KeyE', 0.1); game.step(2.5); });
  log('dialog', JSON.stringify(await vis())); await shot(`ui-dialog-${W}`);
  await ev(() => P.settle());
  // inventory (I) and journal (J: the same screen)
  await ev(() => { P.tap('KeyI', 0.3); });
  log('inventory', JSON.stringify(await vis()), await ev(() => game.state)); await shot(`ui-inventory-${W}`);
  await ev(() => { const el = document.querySelector('.inv-journal'); if (el) el.scrollTop = 0; return el && [el.scrollHeight, el.clientHeight]; }).then((x) => log('journal scroll', x));
  await ev(() => { P.tap('KeyI', 0.3); P.settle(); });
  // holomap (M)
  await ev(() => { P.tap('KeyM', 0.5); });
  log('map', await ev(() => game.state)); await shot(`ui-holomap-${W}`);
  await ev(() => { P.tap('KeyM', 0.3); P.settle(); });
  // pause (Esc)
  await ev(() => { P.tap('Escape', 0.3); });
  log('pause', JSON.stringify(await vis()), await ev(() => game.state)); await shot(`ui-pause-${W}`);
  await ev(() => { P.tap('Escape', 0.3); P.settle(); });
  // the house door, both ways: screenshot at the first frame with control back, then 0.5 s and 1.0 s later
  log('enter', JSON.stringify(await ev(() => P.enter('house'))));
  await ev(() => { for (let i = 0; i < 200 && (game.trans || game.state !== 'play'); i++) game.step(1 / 60); });
  await shot(`door-in-control-${W}`);
  log('exit', JSON.stringify(await ev(() => { const e = game.room.exits.find((x) => !x.room); P.go(e.x, e.z, { tol: 0.25, stopOnTrans: true }); for (let i = 0; i < 400 && (game.trans || game.room); i++) game.step(1 / 60); return eval(window.__F); })));
  await shot(`door-out-control-0.0s-${W}`);
  await ev(() => game.step(0.5)); await shot(`door-out-control-0.5s-${W}`);
  await ev(() => game.step(0.5)); await shot(`door-out-control-1.0s-${W}`);
  // standing still at the door for 3 s more: is the house still between camera and Twinsen?
  await ev(() => game.step(3)); await shot(`door-out-control-4.0s-${W}`);
  log(JSON.stringify(await ev(() => ({ ...eval(window.__F), cam: game.camera.position.toArray().map((v) => +v.toFixed(1)) }))));
};
