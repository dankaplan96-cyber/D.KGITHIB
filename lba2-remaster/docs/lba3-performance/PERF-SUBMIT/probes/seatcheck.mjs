// "near the statue a woman sits INSIDE the bench": every resident sitting or sitting down, after each path that can put
// one on a bench — normal play, the benchmark's street route setup, a save snapshot put back (the benchmark's end),
// a load — with its body against its bench's seat pose (walkers.js seatPose): feet / bottom height, distance from the
// pose's spot. Off by more than a few cm = sitting in the bench.
//   GAME_URL=http://localhost:8351/ node seatcheck.mjs
import { launch, open } from '../../../../tests/lib/boot.mjs';
const { browser, page } = await launch({ width: 960, height: 540 });
const ev = (f, a) => page.evaluate(f, a);
await open(page, '?nocine');
await ev(() => { document.querySelector('[data-act="new"]').click(); game.testFreeze = true; game.step(0.3); game.setState('play'); });
const list = (tag) => ev((tag) => {
  const G = game, W = G.walkers, out = [];
  for (const r of W?.res || []) {
    if (!(r.st === 'seated' || r.st === 'sitin') || r.away) continue;
    const s = r.stop, seat = r.sit?.seat || s?.seat;
    const P = seat && s ? r.seatPose(s) : null;
    out.push(`${tag}: ${r.def.id} (${r.def.char}) ${r.st} at ${r.pos.x.toFixed(2)},${r.pos.y.toFixed(2)},${r.pos.z.toFixed(2)} · seat ${seat ? `${seat.x.toFixed(1)},${seat.z.toFixed(1)} spec ${seat.spec ? 'own' : 'BENCH_RED'}` : 'none'} · pose ${P ? `${P.x.toFixed(2)},${P.y1.toFixed(2)},${P.z.toFixed(2)}` : '-'} · off ${P ? `xz ${Math.hypot(r.pos.x - P.x, r.pos.z - P.z).toFixed(2)} y ${(r.pos.y - P.y1).toFixed(2)}` : '?'} · sit ${r.sit ? 'set' : 'null'} · stop ${s?.id}`);
  }
  return out;
}, tag);
const step = (s) => ev((s) => { game.state = 'play'; game.step(s); }, s);
await step(20);
console.log((await list('play 20 s')).join('\n') || 'play 20 s: nobody seated');
await ev(() => game.bench.prepareAreas());
await ev(() => { const G = game, r = G.bench.routes().find((x) => x.id === 'street'); G.state = 'play'; r.setup(); });
await step(1);
console.log((await list('bench street setup + 1 s')).join('\n') || 'bench setup: nobody seated');
await step(20);
console.log((await list('bench street + 21 s')).join('\n') || 'bench +21 s: nobody seated');
await ev(() => { const G = game, s = G.snapshot(); G.step(5); G.applySave(s); });
await step(0.5);
console.log((await list('snapshot put back + 0.5 s')).join('\n') || 'snapshot back: nobody seated');
await step(20);
console.log((await list('snapshot back + 20 s')).join('\n') || 'snapshot back +20 s: nobody seated');
await browser.close();
