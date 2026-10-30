// does rendering (and its culling) change the game's logic? N rendered frames from a new game, then the state of
// every actor, the dogs and the random stream; compare between builds
import { launch, open } from '../../../../tests/lib/boot.mjs';
const { browser, page } = await launch({ width: 1366, height: 768 });
await page.addInitScript(() => { Math.random = (() => { let s = 12345; return () => ((s = (s * 16807) % 2147483647) / 2147483647); })(); });
const ev = (f, a) => page.evaluate(f, a);
await open(page, '?nocine');
const r = await ev(async (n) => {
  // the stream from here on: reseeded so the title's real-time frames don't matter
  let s = 777; Math.random = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  document.querySelector('[data-act="new"]').click(); game.testFreeze = true; game.step(0.3); game.setState('play');
  const G = game; G.settings.camera = 'follow'; G.camRig.setMode('follow'); G.applySettings();
  const route = G.bench.routes().find((x) => x.id === 'street'); route.setup(); G.state = 'play';
  G.settings.camera = 'follow'; G.camRig.setMode('follow');
  let t = 0, culled = 0;
  for (let i = 0; i < n; i++) { t += 1 / 30; route.drive(t, 1 / 30); G.frame(1 / 30, true); culled += G.farCull.nView || 0; }
  const f = (v) => v.toFixed(3);
  const st = [...G.npcs.filter((a) => a.present).map((a) => `${a.id}:${f(a.pos.x)},${f(a.pos.z)},${f(a.angle)}`), ...(G.world.dogs?.list || G.world.dogs || []).map?.((d) => `dog:${f(d.pos?.x ?? d.x ?? 0)},${f(d.pos?.z ?? d.z ?? 0)}`) || []];
  return { culled, next: Math.random(), state: st.join(' ') };
}, +(process.env.N || 150));
console.log('culled (sum over frames)', r.culled, 'next random', r.next);
console.log(r.state);
await browser.close();
