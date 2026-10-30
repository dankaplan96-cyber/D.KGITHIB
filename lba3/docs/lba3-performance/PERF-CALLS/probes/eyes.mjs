// PERF-CALLS: the polygon people's eyes in world space, open and blinking (scale.y 0.12, as Rig does), for every look
// with a polygon model: printed as one checksum line per look, to compare the base build (two eye meshes) with this
// one (both eyes in one mesh). GAME_URL=http://localhost:8322/ node eyes.mjs > a.txt; GAME_URL=… node eyes.mjs > b.txt
import { launch, open } from '../../../../tests/lib/boot.mjs';
const { browser, page } = await launch({ width: 640, height: 360 });
await open(page, '?nocine');
const out = await page.evaluate(async () => {
  const C = await import('/src/game/characters.js'); await C.preloadCharacters?.();
  const THREE = await import('three');
  const res = [], raw = {};
  for (const name of Object.keys(C.LOOKS)) {
    if (C.LOOKS[name].poly === null) continue;
    let rig; try { rig = C.createCharacter(name); } catch (e) { res.push(name + ' error ' + e.message); continue; }
    const eyes = rig.j?.eyes || [];
    const RAW = []; raw[name] = RAW;
    const pts = (s) => {
      for (const e of eyes) e.scale.y = s;
      rig.root.updateMatrixWorld(true);
      const P = [];
      for (const e of eyes) e.traverse((o) => { if (!o.isMesh) return; const p = o.geometry.attributes.position, c = o.geometry.attributes.color, v = new THREE.Vector3();
        for (let i = 0; i < p.count; i++) { v.fromBufferAttribute(p, i).applyMatrix4(o.matrixWorld); P.push([v.x, v.y, v.z, c.getX(i), c.getY(i), c.getZ(i)].map((x) => Math.round(x * 1e5)).join(',')); RAW.push([s, v.x, v.y, v.z, c.getX(i), c.getY(i), c.getZ(i)]); } });
      return P.sort();
    };
    const a = pts(1), b = pts(0.12);
    res.push(`${name} meshes ${eyes.reduce((n, e) => { let k = 0; e.traverse((o) => { if (o.isMesh) k++; }); return n + k; }, 0)} verts ${a.length} open ${a.join(';').length}:${[...a.join(';')].reduce((h, ch) => (h * 31 + ch.charCodeAt(0)) >>> 0, 7)} blink ${[...b.join(';')].reduce((h, ch) => (h * 31 + ch.charCodeAt(0)) >>> 0, 7)}`);
  }
  return { res, raw };
});
for (const l of out.res) console.log(l);
if (process.env.RAW) (await import('node:fs')).writeFileSync(process.env.RAW, JSON.stringify(out.raw));
await browser.close();
