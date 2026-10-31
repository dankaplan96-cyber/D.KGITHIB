// ANIM-COMBAT metrics from cap.mjs samples: usage: node metrics.mjs <dir> <seq> [...]
// - pops: the fastest joint rotation step (rad/s) per joint and where it happens (> 25 rad/s is a visible snap)
// - foot slide: while a foot is planted (within 1.5 cm of the lowest foot height and ≤ 3 cm above the ground under it),
//   how far it travels over the ground (cm); the body's own travel is not counted as slide only when the foot moves with it
// - release: the ball's launch point vs the hand (cm), the hand's position relative to the body at the release
//   (forward / up, m), and the release time on the throw's clock
// - melee: first / last step with the move in its active frames, and the step of the first hit
import fs from 'fs';
const [dir, ...seqs] = process.argv.slice(2);
for (const seq of seqs) {
  const { samples: S, fps } = JSON.parse(fs.readFileSync(`${dir}/${seq}.json`));
  const out = { seq, fps, steps: S.length };
  // pops
  const pops = {};
  for (let i = 1; i < S.length; i++) {
    const a = S[i - 1].rot, b = S[i].rot, dt = S[i].dt;
    for (const k of Object.keys(b)) for (let ax = 0; ax < 3; ax++) {
      const v = Math.abs(b[k][ax] - a[k][ax]) / dt;
      const key = k + 'xyz'[ax];
      if (!pops[key] || v > pops[key][0]) pops[key] = [+v.toFixed(1), +S[i].t.toFixed(3), S[i].anim];
    }
  }
  out.topPops = Object.entries(pops).sort((p, q) => q[1][0] - p[1][0]).slice(0, 6).map(([k, v]) => `${k} ${v[0]} rad/s @${v[1]} ${v[2]}`);
  // foot slide (horizontal travel of a foot while it bears weight)
  for (const f of ['footL', 'footR']) {
    let slide = 0, planted = 0, worst = 0;
    for (let i = 1; i < S.length; i++) {
      const low = Math.min(S[i].footL[1], S[i].footR[1]);
      const p = S[i][f], q = S[i - 1][f];
      if (p[1] - low < 0.015 && p[1] - S[i].pos[1] < 0.2) {
        const d = Math.hypot(p[0] - q[0], p[2] - q[2]);
        slide += d; planted += S[i].dt; worst = Math.max(worst, d / S[i].dt);
      }
    }
    out[f] = { plantedS: +planted.toFixed(2), slideCm: +(slide * 100).toFixed(1), worstCmS: +(worst * 100).toFixed(0) };
  }
  // walking: the stance foot (the lower one) should stand still while the body moves over it: its mean ground speed
  // over the body's mean speed (0 = no skating, 1 = the foot glides with the body), over steps moving faster than 0.5 m/s
  {
    let fv = 0, bv = 0, n = 0;
    for (let i = 1; i < S.length; i++) {
      const s = S[i], p = S[i - 1];
      if (s.speed < 0.5) continue;
      const f = s.footL[1] < s.footR[1] ? 'footL' : 'footR';
      fv += Math.hypot(s[f][0] - p[f][0], s[f][2] - p[f][2]) / s.dt; bv += s.speed; n++;
    }
    if (n > 5) out.walkStance = { steps: n, bodyMs: +(bv / n).toFixed(2), stanceFootMs: +(fv / n).toFixed(2), ratio: +(fv / bv).toFixed(2) };
  }
  // release
  const ri = S.findIndex((s, i) => i > 0 && s.ball.state === 'fly' && S[i - 1].ball.state === 'inhand');
  if (ri > 0) {
    const s = S[ri], p = S[ri - 1], h = p.handR, a = s.angle, fx = Math.sin(a), fz = Math.cos(a);
    const rel = (q) => [+(((q[0] - p.pos[0]) * fx + (q[2] - p.pos[2]) * fz)).toFixed(2), +((q[1] - p.pos[1])).toFixed(2)];
    // ball position on its first flight frame minus its velocity step ~ launch point; the hand at the step before
    out.release = { t: s.t, clock: s.thr?.at, handPrevFwdUp: rel(h), handNowFwdUp: rel(s.handR), ballFirstFwdUp: rel(s.ball.pos), anim: s.anim };
  }
  // melee
  const act = S.filter((s) => s.move);
  if (act.length) {
    const firstHit = S.find((s) => s.move?.hits);
    out.melee = { moves: [...new Set(act.map((s) => s.move.key))], firstHit: firstHit ? [firstHit.move.key, firstHit.move.t] : null };
  }
  console.log(JSON.stringify(out, null, 1));
}
