// RELEASE-AUDIT-v96: segment 05 (the audit's tolerance variant) with every hero.damage call and every change of the
// clover count written into the bot's trace (TRACE=<file>): where the chain's Twinsen lost his three clovers.
// Watches only; the steps are the segment's own.
import { steps as S } from './05-project-b-tol.mjs';
export const steps = [
  ['audit: watch damage and clovers', () => {
    const h = game.hero, d0 = h.damage.bind(h);
    h.damage = (n, from, ...a) => {
      const c0 = h.clovers, hp0 = h.hp; const r = d0(n, from, ...a);
      P.trace.push(`[DMG t=${game.time?.toFixed?.(1) ?? '?'}] n=${n} from=${from?.def?.id || from?.kind || (from ? 'obj' : 'none')} hp ${hp0}→${h.hp} clovers ${c0}→${h.clovers} body=${h.body} room=${game.room?.id || 'out'} at ${h.pos.x.toFixed(1)},${h.pos.y.toFixed(1)},${h.pos.z.toFixed(1)} state=${game.state}`);
      return r;
    };
    let c = h.clovers; setInterval(() => { if (h.clovers !== c) { P.trace.push(`[CLOVERS] ${c}→${h.clovers} body=${h.body} room=${game.room?.id || 'out'}`); c = h.clovers; } }, 0);
    return { clovers: h.clovers, hp: h.hp };
  }],
  ...S,
];
