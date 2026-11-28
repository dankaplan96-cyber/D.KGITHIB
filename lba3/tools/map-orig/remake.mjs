// Drive lba2remake.net (original LBA2/LBA1 data) with a render hook so any camera can be used.
// No original data or picture is stored in the repository: the app and its data are fetched at run time, and the
// pictures go to <outdir>, which must be outside lba3/ (docs/lba-maturity/MAP-ORIG.md: /dev/shm/mapcmp/).
// usage: node remake.mjs <game lba2|lba1> <scene> <shots.json> <outdir> [bootWaitMs]
// shots.json: { list: [{ name, pos: [x, y, z], target: [x, y, z], fov, fogK, hide }] } in the app's three.js units (gen.py
// writes it from island-centred metres), dump: true to write the scene graph's summary.
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import fs from 'fs';
const [game, scene, shotsFile, outdir, bootWait = '120000'] = process.argv.slice(2);
const shots = JSON.parse(fs.readFileSync(shotsFile, 'utf8'));
fs.mkdirSync(outdir, { recursive: true });
// the app's bundle, fetched now (never stored), patched in memory: a render hook (any camera) and, with SUNNY=1, the
// island's sunny state (CITABAU) in place of the opening's rain
function patch(bundle) {
  const HOOK = 'const s=new l.WebGLRenderer(o);';
  if (!bundle.includes(HOOK)) throw new Error('hook point not found');
  const RAIN='e.getState().flags.quest[y.LBA2GameFlags.CHAPTER]<2&&"CITABAU"===n&&(n="CITADEL")';
  if (process.env.SUNNY) { if (!bundle.includes(RAIN)) throw new Error('rain point not found'); bundle = bundle.replace(RAIN, 'false'); }
  bundle = bundle.replace(HOOK, HOOK + `window.__R=s;{const _r=s.render.bind(s);s.render=(sc,ca)=>{if(sc&&sc.isScene&&sc.children.length>2&&ca&&ca.isPerspectiveCamera&&!window.__LOCK){window.__SC=sc;window.__CA=ca;}const o=window.__CAMOVR;if(o&&sc===window.__SC){if(!window.__MYCAM){window.__MYCAM=new ca.constructor(45,1,0.05,2000);}const c=window.__MYCAM;for(const nm of (o.hide||[])){const q=sc.getObjectByName(nm);if(q)q.visible=false;}if(o.fogK!=null){sc.traverse(q=>{const ms=Array.isArray(q.material)?q.material:q.material?[q.material]:[];for(const m of ms){const u=m.uniforms&&m.uniforms.fogDensity;if(u){if(u.__o==null)u.__o=u.value;u.value=u.__o*o.fogK;}}});}c.fov=o.fov;c.aspect=o.aspect;c.near=o.near||0.05;c.far=o.far||2000;c.position.set(...o.pos);c.up.set(0,1,0);c.lookAt(...o.target);c.updateProjectionMatrix();c.updateMatrixWorld(true);return _r(sc,c);}return _r(sc,ca);};}`);
  return bundle;
}
const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required', '--mute-audio'] });
const W = shots.w || 960, H = shots.h || 540;
const p = await b.newPage({ viewport: { width: W, height: H } });
p.on('pageerror', e => console.log('[err]', e.message.slice(0, 200)));
await p.route('**/bundle.js', async (r) => { const res = await r.fetch(); await r.fulfill({ response: res, body: patch(await res.text()) }); });
await p.route(/googletagmanager|google-analytics/, r => r.abort());
await p.addInitScript(() => { try { localStorage.setItem('disclaimerShown', 'yes'); } catch (e) {} });
await p.goto(`https://lba2remake.net/#game=${game}&scene=${scene}`, { timeout: 180000 });
const t0 = Date.now();
while (Date.now() - t0 < +bootWait) {
  await p.waitForTimeout(5000);
  const ok = await p.evaluate(() => !!window.__SC && window.__SC.children.length > 3);
  if (ok) { await p.waitForTimeout(15000); break; }
}
console.log('boot', (Date.now() - t0) / 1000, 's');
await p.addStyleTag({ content: 'body *:not(canvas){visibility:hidden!important} canvas{visibility:visible!important}' });
if (shots.dump) {
  const info = await p.evaluate(() => {
    const sc = window.__SC, ca = window.__CA; const out = { cam: { pos: ca.getWorldPosition(new ca.position.constructor()).toArray(), fov: ca.fov }, nodes: [] };
    const V = ca.position.constructor;
    sc.traverse(o => {
      if (o.isMesh || o.isGroup || o.isObject3D && o.children.length) {
        if (o.geometry) { o.geometry.computeBoundingBox && o.geometry.computeBoundingBox(); }
        let bb = null;
        if (o.geometry && o.geometry.boundingBox) { const B = o.geometry.boundingBox.clone().applyMatrix4(o.matrixWorld); bb = [B.min.toArray().map(v => +v.toFixed(2)), B.max.toArray().map(v => +v.toFixed(2))]; }
        const wp = o.getWorldPosition(new V());
        out.nodes.push({ n: o.name, t: o.type, d: (() => { let d = 0, q = o; while (q.parent) { d++; q = q.parent; } return d; })(), c: o.children.length, wp: wp.toArray().map(v => +v.toFixed(2)), bb, vis: o.visible });
      }
    });
    return out;
  });
  fs.writeFileSync(outdir + '/dump.json', JSON.stringify(info));
  await p.screenshot({ path: outdir + '/dump.jpg', type: 'jpeg', quality: 85, timeout: 300000 });
  console.log('nodes', info.nodes.length, 'cam', info.cam);
}
for (const s of (shots.list || [])) {
  await p.evaluate(o => { window.__CAMOVR = o; }, { pos: s.pos, target: s.target, fov: s.fov || 45, aspect: W / H, near: s.near, far: s.far, hide: s.hide || ['Clouds', 'Rain'], fogK: s.fogK ?? null });
  await p.waitForTimeout(s.wait || 4000);
  await p.screenshot({ path: `${outdir}/${s.name}.jpg`, type: 'jpeg', quality: 88, timeout: 300000 });
  console.log('shot', s.name);
}
await b.close();
