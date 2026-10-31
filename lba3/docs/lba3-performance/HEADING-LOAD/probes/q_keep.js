(async () => {
  // HEADING-LOAD: the main-pass draws under the harbour's moving parts at one heading (q_hl.js's setup): the fishing
  // boat, the ferry, the cargo lift, the story's cargo stack — each draw's material, colour, casting and triangles.
  //   W_ONLY=5
  const G = game, R = G.renderer.renderer, RR = G.renderer, DT = 1 / 30, N = 8, k = +(window.ONLY ?? 5);
  G.bench.setCamera('follow');
  const route = G.bench.routes().find((x) => x.id === 'street');
  G.state = 'play'; route.setup(); G.state = 'play';
  const h = G.hero, a0 = h.angle, W = G.world;
  const step = () => { G.testFreeze = false; try { G.advance(DT); } finally { G.testFreeze = true; } };
  G.benchTick = () => { G.doorCool = Math.max(G.doorCool || 0, 0.5); h.angle = a0 + (k * 2 * Math.PI) / N; h.vel.set(0, 0); };
  for (let i = 0; i < 40; i++) { step(); if (i % 10 === 9) await new Promise((r) => setTimeout(r, 0)); }
  G.benchTick = null;
  const roots = { boat: W.fishingBoat, ferry: W.ferry?.group, lift: W.cargoLift?.group, cargo: W.harbour?.cargo };
  const under = (o) => { for (const [n, r] of Object.entries(roots)) for (let p = o; p; p = p.parent) if (p === r) return n; return null; };
  const L = [], rbd = R.renderBufferDirect;
  R.renderBufferDirect = function (cam, scene, geo, mat, obj, group) {
    if (scene === G.scene) { const n = under(obj); if (n) L.push(`${n}: ${obj.type}${obj.name ? ' ' + obj.name : ''} [${mat.name || mat.type} #${mat.color?.getHexString?.()}${mat.map ? ' map' : ''}${mat.vertexColors ? ' vc' : ''}] cast ${obj.castShadow} · ${((geo.index ? geo.index.count : geo.attributes.position.count) / 3 * (obj.isInstancedMesh ? obj.count : 1)) | 0} tris`); }
    return rbd.apply(this, arguments);
  };
  RR.render(); R.renderBufferDirect = rbd;
  return `heading ${k}: ${L.length} main-pass draws under the harbour's moving parts\n` + L.join('\n');
})()
