// STABILIZATION: the Follow camera's path on a route, frame by frame (fixed 60 Hz steps), from two builds — A and B —
// compared number for number: a refactor of the camera's clearance tests must give the very same camera. Also the
// LBA camera (CAM2=lba). Prints the frames compared and the largest difference.
//   A=http://localhost:8352/ B=http://localhost:8351/ ROUTES=street,arrival,hamalayi FRAMES=600 [CAMS=follow,lba] node camtrace.mjs
import { launch, open } from '../../../../tests/lib/boot.mjs';
const ROUTES = (process.env.ROUTES || 'street,arrival,hamalayi').split(','), FR = +(process.env.FRAMES || 600), CAMS = (process.env.CAMS || 'follow,lba').split(',');
const trace = async (url) => {
  process.env.GAME_URL = url;
  const { browser, page } = await launch({ width: 1366, height: 768 });
  const ev = (f, a) => page.evaluate(f, a);
  await page.addInitScript(() => { Math.random = (() => { let s = 12345; return () => ((s = (s * 16807) % 2147483647) / 2147483647); })(); });
  await page.goto(url + '?nocine', { waitUntil: 'load', timeout: 180000 });
  await page.waitForFunction(() => window.game && document.querySelector('#loading').classList.contains('hidden') && !window.game.preparing, null, { timeout: 900000 });
  await ev(() => { game.testFreeze = true; document.querySelector('[data-act="new"]').click(); game.testFreeze = true; game.step(0.3); game.setState('play'); });
  await ev(() => game.bench.prepareAreas());
  const out = {};
  for (const cam of CAMS) for (const id of ROUTES) {
    out[cam + ' ' + id] = await ev(({ id, cam, FR }) => {
      const G = game, route = G.bench.routes().find((x) => x.id === id), T = [];
      G.state = 'play'; route.setup(); G.state = 'play';
      G.camRig.setMode(cam); G.camRig.setFollowDistance?.('far'); G.camRig.snap?.();
      let t = 0;
      for (let i = 0; i < FR; i++) { t += 1 / 60; route.drive(t, 1 / 60); G.frame(1 / 60, false); const p = G.camera.position, q = G.camera.quaternion; T.push(p.x, p.y, p.z, q.x, q.y, q.z, q.w); }
      return T;
    }, { id, cam, FR });
  }
  await browser.close();
  return out;
};
const A = await trace(process.env.A || 'http://localhost:8352/'), B = await trace(process.env.B || 'http://localhost:8351/');
let bad = 0;
for (const k of Object.keys(A)) {
  const a = A[k], b = B[k]; let max = 0, first = -1;
  for (let i = 0; i < a.length; i++) { const d = Math.abs(a[i] - b[i]); if (d > max) max = d; if (d > 0 && first < 0) first = Math.floor(i / 7); }
  if (max > 0) bad++;
  console.log(`${k.padEnd(18)} frames ${a.length / 7} · largest difference ${max}${first >= 0 ? ' (first at frame ' + first + ')' : ''}`);
}
console.log(bad ? 'VERDICT: FAIL (the camera moved differently)' : 'VERDICT: PASS (the same camera, number for number)');
