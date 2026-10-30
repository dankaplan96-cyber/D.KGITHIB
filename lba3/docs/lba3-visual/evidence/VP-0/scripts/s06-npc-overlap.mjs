// Does Twinsen stop at a person? Walk (Classic Up) straight at Zoé from 4 m and log the centre distance each frame.
import { FRAME } from './lib.mjs';
export default async ({ ev, seqFast, log }) => {
  await ev(`window.__F = ${JSON.stringify(FRAME)}`);
  await ev(() => P.settle());
  log(JSON.stringify(await ev(() => { const n = P.npc('zoe'); const r = P.go(n.pos.x - 4, n.pos.z, { tol: 0.4 }); P.face(n.pos.x, n.pos.z); return { r, d: +Math.hypot(game.hero.pos.x - n.pos.x, game.hero.pos.z - n.pos.z).toFixed(2), npcR: n.radius, heroR: game.hero.radius }; })));
  const r = await seqFast('walk-into-zoe', 24, () => { game.input.keys.add('ArrowUp'); game.step(1 / 10); const n = P.npc('zoe'), f = eval(window.__F); f.d = +Math.hypot(game.hero.pos.x - n.pos.x, game.hero.pos.z - n.pos.z).toFixed(2); f.zst = n.state || n.rig?.anim; return f; }, { follow: true, size: 240, label: (i, d) => `${i} d=${d.d} ${d.anim} ${d.spd}` });
  log('dist', JSON.stringify(r.data.map((d) => [d.d, d.anim, d.spd, d.pos])));
};
