(async () => {
  // the loose meshes directly under the scene's 'actors' groups (drawn on their own, moving every frame)
  const G = game, out = [];
  const route = G.bench.routes().find((x) => x.id === 'street'); G.state = 'play'; route.setup(); G.state = 'play';
  for (let i = 0; i < 10; i++) G.frame(1 / 30, i === 9);
  const A = G.scene.children.filter((c) => c.userData.src === 'actors' && c.visible);
  const ms = []; for (const g of A) g.traverseVisible((c) => { if (c.isMesh && !c.isSkinnedMesh && !c.isInstancedMesh && c.position.distanceTo(G.hero.pos) < 300) ms.push(c); });
  const path = (o) => { const a = []; for (let p = o; p && p !== G.scene; p = p.parent) a.push(p.name || p.type); return a.join(' < '); };
  for (const c of ms) out.push(path(c) + ' · ' + `${c.name || '(no name)'} · ${c.geometry.type} ${(c.geometry.index ? c.geometry.index.count : c.geometry.attributes.position.count) / 3} tris · mat ${c.material.type} ${c.material.name || ''} transparent ${c.material.transparent} · cast ${c.castShadow} · userData ${JSON.stringify(c.userData).slice(0, 80)} · pos ${c.position.toArray().map((v) => v.toFixed(1))} · hero d ${c.position.distanceTo(G.hero.pos).toFixed(1)}`);
  return `${A.length} actor roots shown, ${ms.length} rigid meshes\n` + out.slice(0, 40).join('\n');
})()
