(() => {
  // GATE-1 probe: segment 01's steps up to Zoé, then the walk to Mira, logging every dialog that opens on the way
  const G = game, out = { log: [] };
  P.settle();
  const s = G.room.searches[0]; P.use(s.x, s.z);
  const e = G.room.exits.find((x) => !x.room); P.through(e.x, e.z);
  const w = G.world.well; P.use(w.x, w.z, { near: 2.0, run: true });
  P.talk('gilbert', { run: true });
  P.talk('zoe', { run: true });
  const m = P.npc('mira');
  out.miraAt = m && [m.pos.x, m.pos.z].map((v) => +v.toFixed(1));
  out.before = P.state();
  // watch the dialog box while walking
  const box = document.querySelector('#dialog');
  const origStep = G.step.bind(G);
  let seen = 0;
  G.step = (dt) => { origStep(dt); if (G.state === 'dialog' && seen < 6) { const t = box.querySelector('.name').textContent + ': ' + box.querySelector('.text').textContent; if (out.log[out.log.length - 1] !== t) { out.log.push(t); seen++; } } };
  const osay = G.say.bind(G); out.says = []; G.say = (name, lines, ...a) => { out.says.push({ name, lines: JSON.stringify(lines).slice(0, 400), stack: new Error().stack.split('\n').slice(2, 7).join(' | ') }); return osay(name, lines, ...a); };
  const inv0 = String(G.hero.hp) + '/' + String(G.hero.maxHp);
  const r = P.go(m.pos.x, m.pos.z, { tol: 1.6, run: true });
  out.inv0 = inv0; out.inv1 = String(G.hero.hp) + '/' + String(G.hero.maxHp); out.maxHp = G.hero.maxHp; out.clovers = G.hero.clovers;
  out.go = r; out.after = P.state();
  out.flags = Object.keys(G.flags).filter((k) => /^pr_|key|kettle/.test(k)).reduce((a, k) => (a[k] = G.flags[k], a), {});
  // what is near him
  const h = G.hero.pos;
  out.near = (G.npcs || []).filter((n) => n.present && n.pos.distanceTo(h) < 4).map((n) => [n.id, +n.pos.distanceTo(h).toFixed(1)]);
  G.step = origStep;
  return out;
})()
