// PERF-2 diagnostic: the in-game bench route, timed as Bench.run does (1.5 s warm-up then 6 s, camera yaw at
// 0.35 rad/s), simulated at 30 fps and drawn every 0.25 s. Counts WebGL calls (renderer.info) and GPU-level draws
// (a BatchedMesh multi-draw counted as its sub-draws), by pass.
//   Q='?nocine&nobatch' QUALITY=medium ROUTE=street CHAPTER=council node benchroute.mjs
import { launch, open } from '/home/user/geriatrics-course/.claude/worktrees/agent-aeb700a18e33d78c7/lba2-remaster/tests/lib/boot.mjs';
const Q = process.env.Q || '?nocine', quality = process.env.QUALITY || 'medium', route = process.env.ROUTE || 'street';
const chapter = process.env.CHAPTER || '';
const { browser, page, errs } = await launch({ width: 1366, height: 768 });
if (process.env.PRESAVE !== '0') await page.addInitScript((q) => { try { if (!sessionStorage.getItem('pq')) { localStorage.setItem('sunshard_settings_v1', JSON.stringify({ quality: q, qPicked: true, qv: 1, v: 2 })); sessionStorage.setItem('pq', q); } } catch {} }, quality);
await open(page, Q);
const r = await page.evaluate(async ({ quality, route, chapter, detail, camMode, view, minpx }) => {
  document.querySelector('[data-act="new"]').click(); game.testFreeze = true; game.step(0.3); game.setState('play');
  const G = game, R = G.renderer.renderer;
  if (chapter) { const f = G.flags; Object.assign(f, { prologueDone: true, intro: true, chapterKey: chapter }); f.chapter = G.story.chapters.findIndex((c) => c.key === chapter); G.hero.hasBall = true; G.story.applyFlags(); G.step(0.5); }
  if (G.settings.quality !== quality) { G.settings.quality = quality; G.applySettings(); }
  if (minpx) { const M = await import('/src/engine/shadowcull.js'); Object.assign(M.MIN_PX, JSON.parse(minpx)); }
  if (camMode) { G.settings.camera = camMode; G.applySettings(); }
  if (view) G.camRig.view = +view;
  const rt = G.bench.routes().find((x) => x.id === route);
  G.state = 'play'; rt.setup(); G.state = 'play';
  const label = (o) => {
    for (let p = o; p; p = p.parent) if (p.userData?.src) return p.userData.src + (p.name ? '/' + p.name : '');
    const names = [];
    for (let p = o; p && !p.isScene; p = p.parent) { if (p.name) names.push(p.name); if (p.parent?.isScene) { names.push('#' + p.parent.children.indexOf(p)); break; } }
    return names.slice(0, 2).reverse().join('/');
  };
  let cur = null;
  const orig = R.renderBufferDirect.bind(R);
  R.renderBufferDirect = (cam, scene, geo, mat, obj, grp) => {
    const res = orig(cam, scene, geo, mat, obj, grp);
    if (cur) {
      const pass = scene ? 'main' : 'shadow';
      const n = obj.isBatchedMesh ? obj._multiDrawCount : 1;
      cur[pass + 'Calls']++; cur[pass + 'Gpu'] += n;
      if (detail) { const deep = detail === '2' ? ' | ' + [obj.name, obj.parent?.name, obj.parent?.parent?.name].map((x) => x || '-').join('<') + ' | ' + (mat.name || mat.type.replace('Material', '')) + (mat.color ? '#' + mat.color.getHexString() : '') + (mat.map ? '+map' : '') + (mat.transparent ? '+T' : '') : ''; const k = pass + ' | ' + label(obj) + deep + (obj.isBatchedMesh ? ' (batched)' : obj.isSkinnedMesh ? ' (skinned)' : ''); cur.by[k] = (cur.by[k] || 0) + n; }
    }
    return res;
  };
  const rows = [];
  let t = 0, nextDraw = 0;
  for (let i = 0; t < 7.5; i++) {
    const dt = 1 / 30; t += dt;
    rt.drive(t, dt);
    const draw = t >= nextDraw; if (draw) nextDraw += 0.25;
    if (draw) { const gl = R.getContext(); gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array(4)); }
    cur = draw && t >= 1.5 ? { mainCalls: 0, shadowCalls: 0, mainGpu: 0, shadowGpu: 0, by: {} } : null;
    G.perf.beginFrame(); G._renderMs = 0;
    G.frame(dt, draw);
    if (cur && G._renderMs > 0) rows.push({ ...cur, room: G.room?.id || "out", info: R.info.render.calls, tris: R.info.render.triangles, ms: G._renderMs, yaw: G.camRig.yaw });
    cur = null;
  }
  R.renderBufferDirect = orig;
  const med = (k) => { const v = rows.map((x) => x[k]).sort((a, b) => a - b); return v.length ? v[Math.floor(v.length / 2)] : 0; };
  const by = {}; for (const x of rows) for (const [k, n] of Object.entries(x.by)) by[k] = (by[k] || 0) + n / rows.length;
  return {
    multi: !!R.extensions.has('WEBGL_multi_draw'), frames: rows.length, chapter: G.flags.chapterKey,
    info: med('info'), mainCalls: med('mainCalls'), shadowCalls: med('shadowCalls'), mainGpu: med('mainGpu'), shadowGpu: med('shadowGpu'), tris: med('tris'), ms: +med('ms').toFixed(1),
    min: Math.min(...rows.map((x) => x.info)), max: Math.max(...rows.map((x) => x.info)),
    perFrame: rows.map((x) => x.room + ":" + x.info + "@" + (((x.yaw % 6.2832) + 6.2832) % 6.2832).toFixed(2)).join(' '), yaw0: rows[0]?.yaw,
    npcs: G.npcs.filter((n) => n.group?.visible !== false).length,
    by: Object.entries(by).sort((a, b) => b[1] - a[1]).slice(0, 160).map(([k, n]) => n.toFixed(1).padStart(6) + ' ' + k),
  };
}, { quality, route, chapter, detail: process.env.DETAIL || '', camMode: process.env.CAM || '', view: process.env.VIEW || '', minpx: process.env.MINPX || '' });
const { by, ...rest } = r;
console.log(Q, quality, route, 'cam', process.env.CAM||'lba', 'view', process.env.VIEW||0, chapter || '(new game)', JSON.stringify(rest));
if (process.env.DETAIL) console.log(by.join('\n'));
console.log(errs.length ? errs.slice(0, 5).join('\n') : 'no errors');
await browser.close();
