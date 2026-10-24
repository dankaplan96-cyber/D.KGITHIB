// Foot contact: walk and run along the lane from the front door toward the square (steered like the harness),
// every 1/60 s the world position of each foot bone; slip = horizontal travel of a foot while it is within 3 cm of
// its lowest height above the ground (contact), per contact phase, on the steady part. Start and stop timings too.
import { FRAME, DRIVE } from './lib.mjs';
export default async ({ ev, log }) => {
  await ev(`window.__F = ${JSON.stringify(FRAME)}; ${DRIVE}`);
  await ev(() => P.settle());
  const run = async (beh, secs, to) => ev(([beh, secs, to]) => {
    const h = game.hero; P.tap(beh); window.__drive(to[0], to[1], 1);
    const bones = {}; h.rig.root.traverse((o) => { if (o.isBone) bones[o.name] = o; });
    const V = h.pos.constructor, fp = (n) => { const v = new V(); bones[n].updateWorldMatrix(true, false); bones[n].getWorldPosition(v); return v; };
    const rows = [];
    for (let i = 0; i < secs * 60; i++) { window.__driveStep(1 / 60); const L = fp('footL'), R = fp('footR'); rows.push({ t: i / 60, spd: h.speed, anim: h.rig.anim, L: [L.x, L.y - game.physics.groundAt(L.x, L.z, h.pos.y + 0.5), L.z], R: [R.x, R.y - game.physics.groundAt(R.x, R.z, h.pos.y + 0.5), R.z] }); }
    P.release();
    const stop = []; for (let i = 0; i < 45; i++) { game.step(1 / 60); stop.push([+(i / 60).toFixed(3), +h.speed.toFixed(2), h.rig.anim]); }
    const res = {};
    const st = rows.slice(40).filter((r) => r.spd > (beh === 'F2' ? 4.5 : 2.0));
    for (const s of ['L', 'R']) {
      const minY = Math.min(...st.map((r) => r[s][1])); let phase = null; const slips = [];
      for (const r of st) { const c = r[s][1] < minY + 0.03; if (c) { if (!phase) phase = { a: r[s], n: 0 }; phase.b = r[s]; phase.n++; } else if (phase) { if (phase.n > 2) slips.push([+Math.hypot(phase.b[0] - phase.a[0], phase.b[2] - phase.a[2]).toFixed(3), phase.n]); phase = null; } }
      res[s] = { minY: +minY.toFixed(3), slips };
    }
    return { beh, steadyFrames: st.length, speedEnd: +rows[rows.length - 1].spd.toFixed(2), anims: [...new Set(rows.map((r) => r.anim))], slip: res, accel: rows.slice(0, 24).filter((_, i) => i % 3 === 0).map((r) => [+r.t.toFixed(2), +r.spd.toFixed(2), r.anim]), stop: stop.filter((_, i) => i % 3 === 0) };
  }, [beh, secs, to]);
  log('walk', JSON.stringify(await run('F1', 4, [-44.3, 9.8])));
  log('run', JSON.stringify(await run('F2', 4, [-44.3, 9.8])));
};
