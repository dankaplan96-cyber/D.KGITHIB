// PERF-CPU: the distance detail's decisions (shadowcull.js, Medium/Low: a static piece under MIN_PX pixels is left out)
// taken only when the camera/focus odometer says one may flip — are they the decisions of testing every piece every
// frame? After every drawn frame each judged piece's state is checked against the rule with its hysteresis: shown ⇒
// px > 0.85·MIN_PX or within KEEP_NEAR of the focus (or unjudgeable); hidden ⇒ px ≤ MIN_PX and not near the focus.
//   GAME_URL=http://localhost:8214/ Q=low ROUTES=street,arrival FRAMES=240 node ddcheck.mjs
import { launch, open } from '../../../../tests/lib/boot.mjs';
const Q = process.env.Q || 'low', ROUTES = (process.env.ROUTES || 'street,interior,arrival').split(','), FR = +(process.env.FRAMES || 240);
const { browser, page } = await launch({ width: 960, height: 540 });
await page.addInitScript((q) => { try { if (!localStorage.getItem('perf_q')) { localStorage.setItem('sunshard_settings_v1', JSON.stringify({ quality: q, qPicked: true, qv: 1, v: 2 })); localStorage.setItem('perf_q', q); } } catch {} }, Q);
const ev = (f, a) => page.evaluate(f, a);
await open(page, '?nocine');
await ev(() => { document.querySelector('[data-act="new"]').click(); game.testFreeze = true; game.step(0.3); game.setState('play'); });
await ev(() => game.bench.prepareAreas());
await ev((q) => { game.settings.quality = q; game.applySettings(); }, Q);
let bad = 0;
for (const id of ROUTES) {
  const r = await ev(({ id, FR }) => {
    const G = game, route = G.bench.routes().find((x) => x.id === id), V = G.camera.position.constructor, c = new V();
    G.state = 'play'; route.setup(); G.state = 'play';
    let t = 0, judged = 0, wrong = 0; const samples = [];
    const MIN = { high: 0, medium: 4, low: 7 }[G.shadowCull.quality], KEEP = 16;
    for (let i = 0; i < FR; i++) {
      t += 1 / 60; route.drive(t, 1 / 60); const draw = i % 2 === 0; G.frame(1 / 60, draw);
      if (!draw || !MIN) continue;
      const A = G.shadowCull.area, cam = G.camera, focus = G.cine?.focus || G.hero.pos;
      const pxK = innerHeight / (2 * Math.tan(((cam.fov || 55) * Math.PI) / 360));
      for (const C of [...A.members, ...(A.quiet || [])]) {
        const o = C.o; if (o.userData.drawBatched || C.mwF !== (o.__mwF ?? -1)) continue;
        c.copy(C.c).applyMatrix4(o.matrixWorld);
        const px = (C.r * o.matrixWorld.getMaxScaleOnAxis() * pxK) / Math.max(0.1, c.distanceTo(cam.position));
        const near = Math.hypot(focus.x - c.x, focus.z - c.z) < KEEP;
        const ok = C.shown ? !(px >= 0) || near || px > MIN * 0.85 : px <= MIN && !near;
        judged++;
        if (!ok) { wrong++; if (samples.length < 6) samples.push(`${C.shown ? 'shown' : 'hidden'} px ${px.toFixed(2)} near ${near} @${i}`); }
        if ((o.layers.mask & 1) !== (C.shown ? 1 : 0)) { wrong++; if (samples.length < 6) samples.push(`layer ≠ state @${i}`); }
      }
    }
    return { judged, wrong, samples };
  }, { id, FR });
  bad += r.wrong;
  console.log(`${id}: ${r.judged} piece-frames checked, ${r.wrong} wrong`); for (const s of r.samples) console.log('   ', s);
}
console.log(bad ? `WRONG: ${bad}` : 'ALL CONSISTENT');
await browser.close();
