// Twinsen's bun vs head during idle and while listening to Arthur (new game, the house): bone positions in the
// head's local frame + close crops. A rigidly attached bun keeps a constant head-local offset.
import { boxAt, FRAME } from './lib.mjs';
const PROBE = `(() => { const h = game.hero, root = h.rig.root; const bones = {}; root.traverse((o) => { if (o.isBone) bones[o.name] = o; });
  const head = bones.head || h.rig.j.head; const out = { names: Object.keys(bones).join(','), anim: h.rig.anim };
  if (!head) return out; head.updateWorldMatrix(true, true); const inv = head.matrixWorld.clone().invert();
  for (const n of ['tail0', 'tail1', 'tail2']) { const b = bones[n]; if (!b) continue; const v = new h.pos.constructor(); b.getWorldPosition(v); const w = v.clone(); v.applyMatrix4(inv); out[n] = [v.x, v.y, v.z].map((x) => +x.toFixed(3)); out[n + 'w'] = [w.x, w.y, w.z].map((x) => +x.toFixed(2)); out[n + 'rot'] = [b.rotation.x, b.rotation.y, b.rotation.z].map((x) => +x.toFixed(2)); }
  const hw = new h.pos.constructor(); head.getWorldPosition(hw); out.headw = [hw.x, hw.y, hw.z].map((x) => +x.toFixed(2)); out.headRot = [head.rotation.x, head.rotation.y, head.rotation.z].map((x) => +x.toFixed(2));
  return out; })()`;
export default async ({ page, ev, shot, seqFast, log, W, H }) => {
  await page.evaluate(`window.__F = ${JSON.stringify(FRAME)}; window.__B = ${JSON.stringify(PROBE)};`);
  await ev(() => P.settle());
  log('idle', JSON.stringify(await ev(() => eval(window.__B))));
  await ev(() => { const n = P.npc('arthur'); P.go(n.pos.x, n.pos.z, { tol: 1.4 }); P.face(n.pos.x, n.pos.z); P.tap('KeyE', 0.1); });
  const r = await seqFast('bun-listen', 16, ({ i }) => { if (i === 8 && game.state === 'dialog') { game.input.keys.add('KeyE'); game.input.taps.add('KeyE'); game.step(1 / 60); game.input.keys.delete('KeyE'); } game.step(0.2); return eval(window.__B); }, { size: 150, yOff: 1.75, follow: true, cols: 8, label: (i, d) => `${i} ${d.anim} t0 ${d.tail0 ? d.tail0.join(',') : '-'}` });
  log('listen', JSON.stringify(r.data));
  await ev(() => P.settle());
  log('after', JSON.stringify(await ev(() => eval(window.__B))));
};
