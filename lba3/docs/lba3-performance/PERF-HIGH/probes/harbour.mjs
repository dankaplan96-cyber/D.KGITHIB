// the harbour's draws by group: the fishing boat, the ferry, the cargo, the cargo lift, the rest
import { launch, open } from '../../../../tests/lib/boot.mjs';
const { browser, page } = await launch({ width: 1366, height: 768 });
const ev = (f, a) => page.evaluate(f, a);
await open(page, '?nocine');
await ev(() => { document.querySelector('[data-act="new"]').click(); game.testFreeze = true; game.step(0.3); game.setState('play'); });
await ev(() => { const r = game.bench.routes().find((x) => x.id === 'street'); r.setup(); game.state = 'play'; game.frame(1 / 30, true); game.frame(1 / 30, true); });
const r = await ev(() => {
  const W = game.world, out = {};
  const count = (name, g) => {
    if (!g) return;
    const L = []; g.traverse((o) => { if (o.isMesh) { let sh = true; for (let p = o; p; p = p.parent) if (!p.visible) sh = false; if (sh && o.layers.isEnabled(0)) L.push(o); } });
    const mats = {}; for (const o of L) { const m = o.material; const k = `${m.type}${m.map ? '+map' : ''}${m.transparent ? '+transp' : ''}${o.isInstancedMesh ? ' inst' : ''}${o.castShadow ? ' cast' : ''}`; mats[k] = (mats[k] || 0) + 1; }
    out[name] = { draws: L.length, mats };
  };
  count('fishingBoat', W.fishingBoat); count('ferry', W.ferry?.group); count('cargo', W.harbour?.cargo); count('cargoLift', W.cargoLift?.group || W.root.getObjectByName('cargoLift'));
  const h = W.root.getObjectByName('harbour'); count('harbour (all)', h);
  return out;
});
for (const [k, v] of Object.entries(r)) console.log(k.padEnd(14), v.draws, JSON.stringify(v.mats));
await browser.close();
