// PERF-2: list the main-pass draws of the street route (frames at t=2.5 and 5.5 s), grouped by a detailed key, to
// find the remaining sources.  QUALITY=medium GAME_URL=... node who.mjs
import { launch, open } from '/home/user/geriatrics-course/.claude/worktrees/agent-aeb700a18e33d78c7/lba2-remaster/tests/lib/boot.mjs';
const quality = process.env.QUALITY || 'medium';
const { browser, page, errs } = await launch({ width: 1366, height: 768 });
await page.addInitScript((q) => { try { if (!sessionStorage.getItem('pq')) { localStorage.setItem('sunshard_settings_v1', JSON.stringify({ quality: q, qPicked: true, qv: 1, v: 2 })); sessionStorage.setItem('pq', q); } } catch {} }, quality);
await open(page, '?nocine');
const out = await page.evaluate(async () => {
  document.querySelector('[data-act="new"]').click(); game.testFreeze = true; game.step(0.3); game.setState('play');
  const G = game, R = G.renderer.renderer;
  const rt = G.bench.routes().find((x) => x.id === 'street'); G.state = 'play'; rt.setup(); G.state = 'play';
  const label = (o) => { const names = []; for (let p = o; p && !p.isScene; p = p.parent) { names.push((p.name || p.type) + (p.userData?.src ? '[' + p.userData.src + ']' : '')); } return names.slice(0, 5).join('<'); };
  const by = new Map(); let frames = 0;
  const orig = R.renderBufferDirect.bind(R);
  R.renderBufferDirect = (cam, scene, geo, mat, obj, grp) => {
    if (cur) { const k = (scene ? 'main ' : 'shad ') + label(obj) + ' | ' + (mat.name || mat.type) + (mat.color ? '#' + mat.color.getHexString() : '') + (mat.map ? '+map' : '') + (mat.vertexColors ? '+vc' : '') + (mat.transparent ? '+T' : '') + (obj.isInstancedMesh ? ' inst' + obj.count : '') + ' v' + (geo.attributes.position?.count ?? 0);
      by.set(k, (by.get(k) || 0) + 1); }
    return orig(cam, scene, geo, mat, obj, grp);
  };
  let cur = false, t = 0;
  for (let i = 0; t < 7.5; i++) { const dt = 1 / 30; t += dt; rt.drive(t, dt); const draw = Math.abs(t - 2.5) < 0.017 || Math.abs(t - 5.5) < 0.017 || Math.abs(t - 4.0) < 0.017; cur = draw; if (draw) frames++; G.perf.beginFrame(); G.frame(dt, draw); cur = false; }
  R.renderBufferDirect = orig;
  return { frames, rows: [...by].sort((a, b) => b[1] - a[1]).slice(0, 400).map(([k, n]) => (n / frames).toFixed(1).padStart(5) + ' ' + k) };
});
console.log('frames', out.frames); console.log(out.rows.join('\n'));
console.log(errs.length ? errs.slice(0, 5).join('\n') : 'no errors');
await browser.close();
