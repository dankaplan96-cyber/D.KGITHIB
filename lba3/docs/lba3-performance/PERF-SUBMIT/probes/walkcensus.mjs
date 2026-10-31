// PERF-SUBMIT: what the per-frame scene walks (drawcull's shown-world update, three's projectObject and the shadow
// pass's walk) visit on a benchmark route: every object under shown parents, by kind; and which materials make three
// look up the program again (getProgram) in a frame: a material shared by draws of different kinds (skinned / not,
// instanced / not, vertex alphas…) or whose version moves every frame.
//   GAME_URL=http://localhost:8351/ Q=medium BATTERY=1 ROUTE=street node walkcensus.mjs
import { launch, open } from '../../../../tests/lib/boot.mjs';
const Q = process.env.Q || 'medium', ID = process.env.ROUTE || 'street';
const { browser, page } = await launch({ width: 1366, height: 768 });
await page.addInitScript((q) => { try { if (!localStorage.getItem('perf_q')) { localStorage.setItem('sunshard_settings_v1', JSON.stringify({ quality: q, qPicked: true, qv: 1, v: 2 })); localStorage.setItem('perf_q', q); } } catch {} }, Q);
const ev = (f, a) => page.evaluate(f, a);
await open(page, '?nocine' + (process.env.QS || ''));
await ev(() => { document.querySelector('[data-act="new"]').click(); game.testFreeze = true; game.step(0.3); game.setState('play'); });
await ev(() => game.bench.prepareAreas());
await ev((q) => { game.settings.quality = q; game.settings.qualityAuto = false; game.applySettings(); }, Q);
if (process.env.BATTERY) await ev(() => game.setBattery(true));
await page.waitForFunction(() => !game.gfxHold && !game.preparing, null, { timeout: 600000 }).catch(() => {});
const r = await ev(({ id, cam }) => {
  const G = game, R = G.renderer.renderer, route = G.bench.routes().find((x) => x.id === id);
  G.state = 'play'; G.benching = true; route.setup(); G.state = 'play';
  if (cam) { G.settings.camera = cam; G.camRig.setMode(cam); G.settings.camDist = 'far'; G.applySettings(); G.camRig.cut = false; }
  let t = 0;
  for (let i = 0; i < 300; i++) { t += 1 / 60; route.drive(t, 1 / 60); G.frame(1 / 60, i % 4 === 0); }
  // the walk as the render sees it (pre has run: far actors hidden): inside renderer.mid
  let cats = {}, kids0 = 0, total = 0;
  const mid = G.renderer.mid;
  G.renderer.mid = () => {
    mid();
    const rigRoots = new Set(); for (const a of [...G.npcs, ...G.enemies, G.hero]) if (a?.rig?.root) rigRoots.add(a.rig.root);
    const walk = (o, inRig) => {
      total++;
      const rig = inRig || rigRoots.has(o);
      let k;
      if (o.userData?.drawBatched) k = 'batched piece (layer 0 off)';
      else if (rig) k = o.isBone ? 'rig: bone' : o.isMesh ? 'rig: mesh' : 'rig: group/other';
      else if (o.userData?.drawBatch) k = 'draw batch mesh';
      else if (o.userData?.shadowProxy) k = 'shadow batch mesh';
      else if (o.isInstancedMesh) k = 'instanced';
      else if (o.isMesh) k = (o.layers.mask & 1) ? (o.castShadow ? 'mesh drawn, casting' : 'mesh drawn') : 'mesh, layer 0 off (not batched)';
      else if (o.isLight) k = 'light';
      else if (o.isSprite || o.isPoints || o.isLine) k = 'sprite/points/line';
      else k = o.children.length ? 'group' : 'empty object';
      if (!o.children.length) kids0++;
      cats[k] = (cats[k] || 0) + 1;
      for (const c of o.children) if (c.visible) walk(c, rig);
    };
    walk(G.scene, false);
  };
  // materials: per draw, the flags three keys a program on
  const seen = new Map(), vers = new Map();
  const rbd = R.renderBufferDirect;
  const relook = new Map(); let relookN = 0;
  R.renderBufferDirect = function (c, sc, g, m, o) {
    // (would three look the program up again for this draw? the same tests as its setProgram, on what it keeps)
    { const P = R.properties.get(m), tgt = R.getRenderTarget(); let why = '';
      if (P.__version === undefined || P.__version !== m.version) why = 'version';
      else if (P.needsLights && P.lightsStateVersion !== P.__lsv) why = '';
      if (!why && P.instancing !== undefined) {
        if (!!o.isInstancedMesh !== P.instancing) why = 'instancing'; else if (!!o.isSkinnedMesh !== P.skinning) why = 'skinning'; else if (!!o.isBatchedMesh !== P.batching) why = 'batching';
        else if (o.isInstancedMesh && (o.instanceColor !== null) !== P.instancingColor) why = 'instanceColor';
        else if ((m.vertexColors === true && !!g.attributes.color && g.attributes.color.itemSize === 4) !== P.vertexAlphas) why = 'vertexAlphas';
        else if ((m.toneMapped && (tgt === null) ? R.toneMapping : 0) !== P.toneMapping) why = 'toneMapping';
        else if (m.fog === true && P.fog !== (sc?.isScene ? sc.fog : null)) why = 'fog';
      }
      if (why) { relookN++; const k = `${sc === null ? 'shadow' : 'main'} ${why}: ${m.type}#${m.id} "${m.name}" (${o.name || o.parent?.name || o.type}${o.isSkinnedMesh ? ' skinned' : ''}${o.isInstancedMesh ? ' instanced' : ''})`; relook.set(k, (relook.get(k) || 0) + 1); } }
    if (sc !== null) {
      const f = `${o.isSkinnedMesh ? 'S' : ''}${o.isInstancedMesh ? 'I' : ''}${o.isBatchedMesh ? 'B' : ''}${g.attributes.color?.itemSize === 4 ? 'A' : ''}${g.attributes.tangent ? 'T' : ''}${g.morphAttributes?.position ? 'M' : ''}${o.isInstancedMesh && o.instanceColor ? 'C' : ''}|${o.receiveShadow ? 'r' : ''}`;
      let s = seen.get(m); if (!s) seen.set(m, (s = { flags: new Set(), names: new Set(), n: 0 })); s.flags.add(f.split('|')[0]); s.n++; if (s.names.size < 4) s.names.add(o.name || o.parent?.name || o.type);
    }
    return rbd.apply(this, arguments);
  };
  for (let i = 0; i < 20; i++) {
    t += 1 / 60; route.drive(t, 1 / 60);
    for (const m of seen.keys()) vers.set(m, [vers.get(m)?.[0] ?? m.version, m.version]);
    G.perf.beginFrame(); G.frame(1 / 60, true);
    if (i === 0) G.renderer.mid = mid;
  }
  R.renderBufferDirect = rbd;
  const mixed = [...seen].filter(([, s]) => s.flags.size > 1).map(([m, s]) => `${m.type}#${m.id} "${m.name}" kinds [${[...s.flags].join(' / ')}] draws ${s.n} (${[...s.names].join(', ')})`);
  const moving = [...seen.keys()].filter((m) => m.version - (vers.get(m)?.[0] ?? m.version) >= 10).map((m) => `${m.type}#${m.id} "${m.name}" version +${m.version - vers.get(m)[0]} in 20 frames (${[...seen.get(m).names].join(', ')})`);
  return { cats, total, kids0, mixed, moving, mats: seen.size, relookN: relookN / 20, relook: [...relook].sort((a, b) => b[1] - a[1]).slice(0, 30).map(([k, n]) => `${(n / 20).toFixed(1)} a frame · ${k}`) };
}, { id: ID, cam: process.env.CAM || '' });
console.log(`PERF-SUBMIT walk census · ${Q}${process.env.BATTERY ? ' battery' : ''} · ${ID}: ${r.total} objects under shown parents (${r.kids0} leaves)`);
for (const [k, v] of Object.entries(r.cats).sort((a, b) => b[1] - a[1])) console.log(`  ${String(v).padStart(5)}  ${k}`);
console.log(`main-pass materials ${r.mats}; drawn with more than one program kind (three looks the program up again at each alternation):`);
for (const l of r.mixed) console.log('  ' + l);
console.log('materials whose version moved every other frame or more (program looked up again):');
for (const l of r.moving) console.log('  ' + l);
console.log(`program looked up again (setProgram's tests) a frame: ${r.relookN}`);
for (const l of r.relook) console.log('  ' + l);
await browser.close();
