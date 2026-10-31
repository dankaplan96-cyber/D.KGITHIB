(async () => {
  // CPU-WALK: a batched piece whose geometry is edited still leaves its batch at the next check (drawbatch.js GEO):
  // on the street, after the scenery has frozen, (1) one piece's position attribute marked changed (needsUpdate), (2) one
  // piece's index marked changed, (3) one piece's position attribute replaced (setAttribute) with a copy of the same
  // version number, (4) one piece moved (its frozen range must end), (5) one piece hidden. Each must be out of its batch
  // after one frame; an untouched piece must stay in.
  const G = game;
  const DB = await import('./src/engine/drawbatch.js');
  if (G.state === 'title' || G.screen === 'title') { document.querySelector('[data-act="new"]').click(); G.testFreeze = true; G.step(0.3); G.setState('play'); }
  if (!window.__prepared) { await G.bench.prepareAreas(); window.__prepared = true; }
  G.bench.setCamera('follow');
  const route = G.bench.routes().find((x) => x.id === 'street');
  G.state = 'play'; route.setup(); G.bench.camera(); G.state = 'play';
  const R = G.renderer, comp = R.composer.render; R.composer.render = () => {};
  let t = 0; const step = (n) => { for (let i = 0; i < n; i++) { t += 1 / 60; route.drive(t, 1 / 60); G.frame(1 / 60, true); } };
  step(90);
  const A = G.drawBatch.areas.get(G.world.root);
  const pick = (f) => A.members.find((M) => !M.out && M.o.__frzBy && f(M));
  const cases = [
    ['position needsUpdate', (M) => true, (M) => { M.geo.attributes.position.needsUpdate = true; }],
    ['index needsUpdate', (M) => !!M.geo.index, (M) => { M.geo.index.needsUpdate = true; }],
    ['position replaced (setAttribute, another version)', (M) => true, (M) => { const a = M.geo.attributes.position, b = a.clone(); b.version = a.version + 1; M.geo.setAttribute('position', b); }],
    ['moved 1 cm', (M) => true, (M) => { M.o.position.x += 0.01; }],
    ['hidden', (M) => true, (M) => { M.o.visible = false; }],
  ];
  const out = [`geometry / move / hide edits on frozen batched pieces (street, ${A.members.length} pieces, GEO.n ${DB.GEO.n})`];
  let bad = 0;
  for (const [name, ok, edit] of cases) {
    const M = pick((M) => ok(M) && !M.o.userData.__cwUsed); if (!M) { out.push(`  ${name}: no frozen piece found`); bad++; continue; }
    M.o.userData.__cwUsed = true;
    const keep = pick((K) => K !== M && !K.o.userData.__cwUsed && K.geo !== M.geo);
    const n0 = DB.GEO.n; edit(M); step(1);
    const okOut = M.out === true, okKeep = !keep || keep.out !== true;
    if (!okOut || !okKeep) bad++;
    out.push(`  ${name}: ${okOut ? 'left its batch' : 'STILL IN ITS BATCH'} · an untouched piece ${okKeep ? 'stayed' : 'LEFT'} · GEO.n ${n0} → ${DB.GEO.n}`);
  }
  R.composer.render = comp;
  out.push(bad ? `FAILED: ${bad}` : 'ALL AS EXPECTED');
  return { text: out.join('\n') };
})()
