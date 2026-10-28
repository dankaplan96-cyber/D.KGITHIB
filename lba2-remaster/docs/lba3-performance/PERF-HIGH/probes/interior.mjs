// where the interior route's walk goes over 30 s (the as-played warm-up's length): room, position, transitions
import { launch, open } from '../../../../tests/lib/boot.mjs';
const { browser, page } = await launch({ width: 1366, height: 768 });
const ev = (f, a) => page.evaluate(f, a);
await open(page, '?nocine');
await ev(() => { document.querySelector('[data-act="new"]').click(); game.testFreeze = true; game.step(0.3); game.setState('play'); });
await ev(() => game.bench.prepareAreas());
const r = await ev(() => {
  const G = game, route = G.bench.routes().find((x) => x.id === 'interior'), out = [];
  G.state = 'play'; route.setup(); G.state = 'play';
  let t = 0;
  for (let i = 0; i < 30 * 30; i++) {
    t += 1 / 30; G.state = 'play'; route.drive(t, 1 / 30); G.frame(1 / 30, false);
    if (i % 30 === 0) out.push(`${t.toFixed(0)}s ${G.room?.id ?? 'outdoors'}${G.trans ? ' (trans)' : ''} hero ${G.hero.pos.x.toFixed(1)},${G.hero.pos.z.toFixed(1)} cam ${G.camera.position.x.toFixed(1)},${G.camera.position.z.toFixed(1)}`);
  }
  const R = G.room; return { center: R ? [R.center.x, R.center.z] : null, out };
});
console.log('room center', JSON.stringify(r.center)); for (const l of r.out) console.log(l);
await browser.close();
