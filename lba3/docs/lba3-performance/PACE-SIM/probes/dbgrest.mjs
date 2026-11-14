// PACE-SIM (debug): why an actor does or does not rest off-scene — its scene, distances, state, position drift per step.
import { launch, open } from '../../../../tests/lib/boot.mjs';
const { browser, page } = await launch({ width: 640, height: 360 });
const ev = (f, a) => page.evaluate(f, a);
await open(page, '?nocine');
await ev(() => { document.querySelector('[data-act="new"]').click(); game.testFreeze = true; game.step(0.3); game.setState('play'); });
const out = await ev(async () => {
  const G = game; G.enterRoom('house', null, true, true); G.state = 'play';
  const L = [];
  for (let i = 0; i < 240; i++) {
    G.frame(1 / 60, false);
    if (i % 40 === 0) for (const e of G.enemies.filter((x) => x.present && x.alive)) {
      const p = e.pos, h = G.hero.pos, c = G.camera.position;
      L.push(`${i} ${e.id} ${e.state} room=${G.room?.id} dHero=${Math.hypot(p.x - h.x, p.z - h.z).toFixed(1)} dCam=${Math.hypot(p.x - c.x, p.z - c.z).toFixed(1)} pos=${p.x.toFixed(4)},${p.y.toFixed(4)},${p.z.toFixed(4)} rest=${JSON.stringify(e._offRest)}`);
    }
  }
  return L;
});
console.log(out.join('\n'));
await browser.close();
