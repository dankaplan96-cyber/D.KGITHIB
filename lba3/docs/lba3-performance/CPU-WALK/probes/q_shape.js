(async () => {
  // CPU-WALK: the shape of the shown tree on a route — for each object with children reached through shown parents:
  // its shown descendants, how many of its children are leaves, and the path. Lists the scene's top level, the area
  // root's children, and the groups with the most leaf children.
  const G = game, ROUTE = String(window.ROUTE || 'street'), CAM = String(window.CAM || 'follow');
  if (G.screen === 'title' || G.state === 'title') { document.querySelector('[data-act="new"]').click(); G.testFreeze = true; G.step(0.3); G.setState('play'); }
  if (!window.__prepared) { await G.bench.prepareAreas(); window.__prepared = true; }
  G.bench.setCamera(CAM);
  const route = G.bench.routes().find((x) => x.id === ROUTE);
  G.state = 'play'; route.setup(); G.bench.camera(); G.state = 'play';
  let t = 0; for (let i = 0; i < 60; i++) { t += 1 / 60; route.drive(t, 1 / 60); G.frame(1 / 60, true); }
  const nm = (o) => (o.name || o.type) + (o.userData?.drawBatched ? '*' : '');
  const path = (o) => { const p = []; for (let x = o; x && x !== G.scene; x = x.parent) p.push(nm(x)); return p.reverse().join('/'); };
  const info = new Map();
  const walk = (o) => { let n = 0, leaves = 0, hidden = 0; for (const k of o.children) { if (!k.visible) { hidden++; n++; continue; } n++; if (!k.children.length) leaves++; else n += walk(k); } info.set(o, { n, leaves, hidden, kids: o.children.length }); return n; };
  const total = walk(G.scene);
  const out = [`shape ${ROUTE}: ${total} objects reached through shown parents (hidden ones counted, not their subtrees)`];
  out.push('scene top level (descendants · leaf children · hidden children · children):');
  for (const k of G.scene.children) { const I = info.get(k); out.push(`  ${nm(k)}${k.visible ? '' : ' (hidden)'}: ${I ? `${I.n} · ${I.leaves} · ${I.hidden} · ${I.kids}` : 'leaf'}`); }
  const root = G.room?.group || G.world.root;
  out.push(`area root ${path(root)} children:`);
  const kids = [...root.children].map((k) => [k, info.get(k)]).sort((a, b) => (b[1]?.n || 0) - (a[1]?.n || 0));
  for (const [k, I] of kids.slice(0, 40)) out.push(`  ${nm(k)}${k.visible ? '' : ' (hidden)'}: ${I ? `${I.n} · ${I.leaves} · ${I.hidden} · ${I.kids}` : 'leaf'}`);
  out.push(`  … ${kids.length} children in all, ${kids.filter(([k, I]) => !I).length} leaves`);
  out.push('groups with the most leaf children:');
  for (const [o, I] of [...info].sort((a, b) => b[1].leaves - a[1].leaves).slice(0, 15)) out.push(`  ${path(o)}: ${I.leaves} leaves of ${I.kids}`);
  return { text: out.join('\n') };
})()
