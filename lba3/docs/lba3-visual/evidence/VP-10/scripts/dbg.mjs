// VP-10 debug: one spot, what the scenery volumes say about the shot
import { PROBE } from './probe.mjs';
import { behind } from './explore.mjs';
export default async ({ ev, log }) => {
  await ev(PROBE);
  const s = await ev(behind(process.env.HOUSE || 'stone', 2));
  const r = await ev((s) => { const G = game, h = G.hero, occ = G.world.occ;
    G.exitRoom({ x: s.x, z: s.z, a: s.a }, true, true); h.angle = s.a; G.camRig.lba.init = false;
    const out = [];
    for (let i = 0; i < 6; i++) { G.step(i ? 0.25 : 1 / 60); const c = G.camera.position, e = { x: h.pos.x, y: h.pos.y + 0.65, z: h.pos.z }; occ.setUnder(h.pos);
      out.push({ t: i, cam: [c.x, c.y, c.z].map((v) => +v.toFixed(2)), goalPitch: +(G.camRig.lba.goalPitch * 57.3).toFixed(1), pitch: +(G.camRig.pitch * 57.3).toFixed(1), clear: G.camRig.lba.clear, blocked: occ.blocked(c, e), focus: [G.camRig.lba.focus.x, G.camRig.lba.focus.z].map((v) => +v.toFixed(2)), goal: [G.camRig.lba.goal.x, G.camRig.lba.goal.z].map((v) => +v.toFixed(2)) }); }
    const near = occ.near(h.pos.x, h.pos.z).map((v) => ({ n: v.name, x: +v.x.toFixed(2), z: +v.z.toFixed(2), y0: +v.y0.toFixed(2), y1: +(v.y1 ?? v.top).toFixed(2), hw: v.hw, hd: v.hd, rot: v.rot, slope: v.slope }));
    return { hero: [h.pos.x, h.pos.y, h.pos.z], out, near, who: window.__who() }; }, s);
  log(JSON.stringify(r, null, 0));
};
