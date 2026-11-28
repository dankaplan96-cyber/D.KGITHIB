// INSIDE-OUT (SMALLFIX-27-11, FEET-66B's "what is left" 2): every built area and room, every drawn part wound inside out.
// A static check (FEET-66B) found lathe profiles that run the wrong way (their faces point in, so a part drawn one-sided
// is culled from outside: Ballastra's islet, the Arch District's bell, small shades and caps); profiles built in code
// were not checked. This suite reads what is built instead: every area and room (?allregions, regions.ensureAll), and
// what else is in the scene (people's rigs, pickups), every mesh drawn one-sided (FrontSide or BackSide; DoubleSide left
// out), cut into its connected parts (tests/lib/insideout.js has the method):
//   FAIL  a CLOSED part (its area vectors sum to ~0) whose signed volume says its faces point in, drawn so (a BackSide
//         material counts the other way; a mirrored instance flips it, an object's mirror does not), not on KNOWN
//   listed  OPEN parts whose faces point towards their middle (a room's shell, a bowl, a cave: often on purpose), the
//         biggest first; skinned meshes are left out (Twinsen's and the cast's bodies: their parts on bones are scanned)
// SHOTS=<dir>: per FAIL (or per VIEWS entry) two pictures: the part in the scene from outside, and the part alone (every
//   other mesh hidden), from the same camera; views.json in <dir> names them (VIEWS=<dir>/views.json shoots the same
//   views again: the before/after pairs). ONLY=<area ids, comma>; REPORT=<file.json> every finding.
// SERVE=1 answers this checkout's files by request routing. Automated runtime only (SwiftShader, headless Chromium).
import { launch, open, menu, checker } from './lib/boot.mjs';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const { check, done } = checker({ info: 'always' });
const LIB = fileURLToPath(new URL('./lib/insideout.js', import.meta.url));
const ONLY = process.env.ONLY ? process.env.ONLY.split(',') : null, SHOTS = process.env.SHOTS || '', VIEWS = process.env.VIEWS || '', REPORT = process.env.REPORT || '';

// closed parts that point in on purpose (or are drawn so that it does not show): [area, path regex, why]
const KNOWN = [
  ['(scene)', /^Sphere$/, 'the sky dome: BackSide on purpose, seen from inside'],
];
const known = (f) => KNOWN.find(([a, re]) => (a === '*' || a === f.area) && re.test(f.path));

const { browser, page } = await launch({ width: 960, height: 540 });
const ev = (f, a) => page.evaluate(f, a);
await open(page, '?nocine&allregions&nobatch');
await menu(page, 'new');
await page.addScriptTag({ path: LIB });
const areas = await ev(async (ONLY) => {
  const G = game; await IO.init();
  for (let i = 0; i < 200 && G.state !== 'play'; i++) { G.input.taps.add('KeyE'); G.step(0.05); }
  G.regions.ensureAll('test'); G.step(0.1); G.scene.updateMatrixWorld(true);
  const ids = ['citadel', ...Object.keys(G.rooms).filter((id) => G.rooms[id]?.group)];
  return ids.filter((id) => !ONLY || ONLY.includes(id));
}, ONLY);
console.log(`ISO  a new game, every area and room built (?allregions, regions.ensureAll('test'), ?nobatch); ${areas.length} areas and rooms: ${areas.join(' ')}`);

const all = [], opens = [];
let meshes = 0, parts = 0, tris = 0;
const skipped = {};
for (const id of [...areas, ...(ONLY ? [] : ['(scene)'])]) {
  const r = await ev((id) => { const spec = id === 'citadel' ? { citadel: true } : id === '(scene)' ? { rest: true } : { room: id }; return IO.scan(spec, IO.roots(spec)); }, id);
  meshes += r.meshes; parts += r.parts; tris += r.tris;
  for (const [k, v] of Object.entries(r.skipped)) skipped[k] = (skipped[k] || 0) + v;
  for (const f of r.closed) all.push({ area: id, ...f });
  for (const f of r.open) opens.push({ area: id, ...f });
}
console.log(`MEASURE ${meshes} one-sided meshes, ${parts} parts, ${tris} triangles drawn (instances counted); left out: ${JSON.stringify(skipped)}`);

// closed parts inside out: one line each (a geometry shared by many meshes: once, with its count)
const groups = new Map();
for (const f of all) { const k = f.area + '|' + f.geo + '|' + f.t0; const g = groups.get(k); if (g) g.copies++; else groups.set(k, { ...f, copies: 1 }); }
const found = [...groups.values()].sort((a, b) => b.size - a.size);
let bad = 0;
for (const f of found) {
  const k = known(f); if (!k) bad++;
  console.log(`  ${k ? 'known' : 'FOUND'} ${f.area} ${f.path} [${f.gtype} ${f.geo} t${f.t0}] ${f.size} m at ${f.at.join(', ')}: closed, volume ${f.vol} m3 (fill ${f.fill}), ${f.tris} tris, ${f.side}${f.inst ? ', instances ' + f.inst + (f.mirrorInst ? ' (mirrored instances)' : '') : ''}${f.copies > 1 ? ', ' + f.copies + ' meshes' : ''}${f.shown ? '' : ', hidden now'}${f.bone ? ', on a bone' : ''} ${f.hex} ${f.tex}${k ? ' [KNOWN: ' + k[2] + ']' : ''}`);
}
const og = new Map();
for (const f of opens) { const k = f.area + '|' + f.geo + '|' + f.t0; const g = og.get(k); if (g) g.copies++; else og.set(k, { ...f, copies: 1 }); }
// (listed for a look: the small open parts whose faces point well in (dir < -0.5, under 10 m: a cap or a shade open at
//  one end, a bucket); the large ones are shells, caves, terrain tiles and sheets)
const ol = [...og.values()].filter((f) => f.dir < -0.5 && f.size < 10).sort((a, b) => b.m2 - a.m2);
console.log(`LISTED ${og.size} open parts (not closed) point towards their middle somewhere; ${ol.length} of them small (under 10 m) and pointing well in (dir < -0.5), each:`);
for (const f of ol) console.log(`  open ${f.area} ${f.path} [${f.gtype} ${f.geo} t${f.t0}] ${f.size} m at ${f.at.join(', ')}: dir ${f.dir}, open ${f.open}, area ${f.m2} m2, ${f.side}${f.copies > 1 ? ', ' + f.copies + ' meshes' : ''} ${f.hex} ${f.tex}`);
if (REPORT) fs.writeFileSync(REPORT, JSON.stringify({ closed: found, open: ol }, null, 1));
check(`no closed part drawn inside out in any area or room (${found.length} found, ${found.length - bad} known)`, bad === 0, found.filter((f) => !known(f)).map((f) => `${f.area} ${f.path} ${f.size} m at ${f.at.join(',')}`));

// ---------------------------------------------------------------- pictures
if (SHOTS || VIEWS) {
  const dir = SHOTS || path.dirname(VIEWS); fs.mkdirSync(dir, { recursive: true });
  // (one view per kind of part: the same colour, triangles and size are copies of one piece; the open ones listed too)
  const kinds = new Map();
  for (const f of [...found.filter((f) => !known(f)), ...ol]) { if (f.area === '(scene)') continue; const k = `${f.hex}|${f.tris}|${f.size}`; if (!kinds.has(k)) kinds.set(k, f); }
  const views = VIEWS ? JSON.parse(fs.readFileSync(VIEWS, 'utf8')) : [...kinds.values()].map((f, i) => ({ name: `v${String(i).padStart(2, '0')}-${f.area}`, area: f.area, box: f.box, path: f.path, kind: ol.includes(f) ? 'open' : 'closed' }));
  if (!VIEWS) fs.writeFileSync(path.join(dir, 'views.json'), JSON.stringify(views, null, 1));
  for (const v of views) {
    const urls = await ev((v) => {
      const G = game, THREE = window.__T3;
      if (v.area === 'citadel') { if (G.room) G.exitRoom({ x: v.box[0], z: v.box[2], a: 0 }, true, true); } else if (G.room?.id !== v.area) G.enterRoom(v.area, null, true);
      for (let i = 0; i < 6; i++) G.step(0.05);
      G.scene.updateMatrixWorld(true);
      const cam = G.camera, gp = cam.position.clone(), gq = cam.quaternion.clone(), near = cam.near;
      const c = [(v.box[0] + v.box[3]) / 2, (v.box[1] + v.box[4]) / 2, (v.box[2] + v.box[5]) / 2];
      const r = Math.max(0.25, Math.hypot(v.box[3] - v.box[0], v.box[4] - v.box[1], v.box[5] - v.box[2]) / 2);
      const dist = r / Math.sin((cam.fov || 40) * Math.PI / 360) * 1.1;
      const d = [0.62, 0.48, 0.62], L = Math.hypot(...d);
      cam.position.set(c[0] + d[0] / L * dist, c[1] + d[1] / L * dist, c[2] + d[2] / L * dist); cam.lookAt(c[0], c[1], c[2]);
      cam.near = Math.min(near, dist / 50); cam.updateProjectionMatrix(); cam.updateMatrixWorld();
      const hv = G.hero.rig?.root?.visible; if (G.hero.rig?.root) G.hero.rig.root.visible = false;
      const shoot = () => { G.renderer.render(); return G.renderer.renderer.domElement.toDataURL('image/jpeg', 0.85); };
      // the part's meshes (by its path, over its box); a part hidden in this state (a bell put up later) shown for the shot
      const pathOf = (o) => { const p = []; for (let q = o, k = 0; q && q !== G.scene && k < 7; q = q.parent, k++) p.push(q.name || (q.isMesh ? (q.geometry?.type || 'Mesh').replace('Geometry', '') : q.type)); return p.join('<'); };
      const targets = new Set(), shown = [];
      G.scene.traverse((o) => { if (!o.isMesh) return; const box = new THREE.Box3().setFromObject(o); if (pathOf(o) === v.path && box.max.x >= v.box[0] - 0.05 && box.min.x <= v.box[3] + 0.05 && box.max.z >= v.box[2] - 0.05 && box.min.z <= v.box[5] + 0.05) targets.add(o); });
      for (const o of targets) for (let q = o; q && q !== G.scene; q = q.parent) if (!q.visible) { q.visible = true; shown.push(q); }
      const scene = shoot();
      // the part alone: every mesh but the part's hidden
      const was = [];
      G.scene.traverse((o) => { if (o.isMesh && !targets.has(o) && o.visible) { was.push(o); o.visible = false; } });
      const alone = shoot();
      for (const o of was) o.visible = true;
      for (const q of shown) q.visible = false;
      if (G.hero.rig?.root) G.hero.rig.root.visible = hv;
      cam.position.copy(gp); cam.quaternion.copy(gq); cam.near = near; cam.updateProjectionMatrix(); cam.updateMatrixWorld();
      return [scene, alone];
    }, v);
    fs.writeFileSync(path.join(dir, v.name + '-scene.jpg'), Buffer.from(urls[0].split(',')[1], 'base64'));
    fs.writeFileSync(path.join(dir, v.name + '-alone.jpg'), Buffer.from(urls[1].split(',')[1], 'base64'));
    console.log(`SHOT ${v.name} ${v.path}`);
  }
}
await browser.close();
done();
