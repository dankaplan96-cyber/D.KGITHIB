// FRAME-1: what the screen shows through a door in real time. Per displayed frame: the transition's clock T.t,
// the hold, the opacity the script wrote, the opacity the compositor actually shows (getComputedStyle: #fade has a
// CSS transition), and the room. Runs several doors (house <-> cellar, first and later visits).
//   GAME_URL=http://localhost:8171/ DOORS=4 [VERBOSE=1] node docs/lba3-visual/evidence/FRAME-1/fadeprobe.mjs
import { launch, open, menu } from '../../../../tests/lib/boot.mjs';
const { browser, page, errs } = await launch({ width: 640, height: 360 });
await open(page, '?nocine'); await menu(page, 'new');
for (let k = 0; k < +(process.env.DOORS || 4); k++) {
  const r = await page.evaluate(async (k) => {
    const G = game, h = G.hero;
    G.testFreeze = true;
    if (k === 0) { G.enterRoom('house', null, true); G.step(0.5); }
    const R = G.room, e = R.exits.find((x) => x.room === (R.id === 'house' ? 'cellar' : 'house')) || R.exits[0];
    h.pos.set(e.x, G.physics.groundAt(e.x, e.z, h.pos.y + 3), e.z); G.doorCool = 0;
    G.testFreeze = false;
    const f = document.querySelector('#fade'), s = [], t0 = performance.now(), from = R.id;
    const sample = () => { const T = G.trans; s.push({ ms: +(performance.now() - t0).toFixed(1), t: T ? +T.t.toFixed(3) : null, hold: !!T?.hold, called: !!T?.called, set: +(f.style.opacity || 0), shown: +(+getComputedStyle(f).opacity).toFixed(3), room: G.room?.id }); };
    await new Promise((res) => { const tick = () => { sample(); const T = G.trans; if (performance.now() - t0 < 20000 && (T || performance.now() - t0 < 400)) requestAnimationFrame(tick); else res(); }; requestAnimationFrame(tick); });
    for (let i = 0; i < 20; i++) { await new Promise((r) => requestAnimationFrame(r)); sample(); }   // (the CSS transition's tail)
    G.testFreeze = true; G.step(0.6);
    const swap = s.findIndex((x) => x.room !== from), held = s.filter((x) => x.hold);
    return { from, to: G.room?.id, frames: s.length, tAtSwap: s.find((x) => x.called)?.t, setAtSwap: s[swap]?.set, shownAtSwap: s[swap]?.shown,
      maxShown: Math.max(...s.map((x) => x.shown)), held: held.length, heldSet: held.map((x) => x.set), heldShown: held.map((x) => x.shown), samples: s };
  }, k);
  const { samples, ...sum } = r;
  console.log(JSON.stringify(sum));
  if (process.env.VERBOSE) console.log(samples.map((x) => `${x.ms}\t${x.t}\t${x.hold ? 'H' : ''}\t${x.set}\t${x.shown}\t${x.room}`).join('\n'));
}
console.log(errs.length ? errs.join('\n') : 'no errors');
await browser.close();
