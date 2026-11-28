// what a character is made of: meshes per actor, their materials and parents
import { launch, open } from '../../../../tests/lib/boot.mjs';
const { browser, page } = await launch({ width: 1366, height: 768 });
const ev = (f, a) => page.evaluate(f, a);
await open(page, '?nocine');
await ev(() => { document.querySelector('[data-act="new"]').click(); game.testFreeze = true; game.step(0.3); game.setState('play'); });
const r = await ev(() => {
  const G = game, out = [];
  const lists = { npcs: G.npcs || [], walkers: G.walkers?.list || G.residents || [] };
  const seen = new Set();
  const doActor = (a, tag) => {
    const root = a?.rig?.root; if (!root || seen.has(root)) return; seen.add(root);
    const meshes = []; root.traverse((o) => { if (o.isMesh) meshes.push(o); });
    const vis = meshes.filter((o) => { for (let p = o; p && p !== root.parent; p = p.parent) if (!p.visible) return false; return true; });
    const mats = new Set(vis.map((o) => o.material?.uuid));
    const kinds = {}; for (const o of vis) { const k = (o.isSkinnedMesh ? 'S:' : '') + (o.material?.type || '?') + (o.material?.name ? '/' + o.material.name : '') + (o.geometry?.attributes?.color ? '+vc' : '') + '@' + (o.parent?.isBone ? 'bone' : o.parent?.type); kinds[k] = (kinds[k] || 0) + 1; }
    out.push({ tag, id: a.id || a.name || a.look || '?', total: meshes.length, shown: vis.length, mats: mats.size, cast: vis.filter((o) => o.castShadow).length, tris: vis.reduce((s, o) => s + (o.geometry.index ? o.geometry.index.count : o.geometry.attributes.position.count) / 3, 0) | 0, kinds, names: vis.map((o) => o.name || '-').slice(0, 30).join(',') });
  };
  for (const [tag, L] of Object.entries(lists)) for (const a of L) doActor(a, tag);
  return { keys: Object.keys(G).filter((k) => /npc|walk|resid|actor/i.test(k)), out };
});
console.log('game keys', r.keys.join(','));
for (const x of r.out.slice(0, 60)) console.log(x.tag, x.id, 'meshes', x.total, 'shown', x.shown, 'mats', x.mats, 'cast', x.cast, 'tris', x.tris, JSON.stringify(x.kinds), x.names);
await browser.close();
