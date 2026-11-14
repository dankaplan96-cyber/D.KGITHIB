// VP-10 exploration: stand Twinsen at fixed spots (placed like tests/lib/shots.mjs, camera re-initialised behind
// him), and log what hides him from the play camera. TAG=before|after.
import { PROBE } from './probe.mjs';
export const SPOTS = [
  ['customs', { x: -107, z: 37, a: -1.2 }],
  ['deck-wait', { x: -6.5, z: 36.5, a: 0, deckY: true }],
  ['deck-wait-n', { x: -6.5, z: 33.4, a: 0, deckY: true }],
  ['spaceport', { spaceport: true }],
  ['harbour-lane', { x: -80, z: 37, a: -1.5 }],
];
// behind a house: on its far side from the camera, facing away from it (the camera then sits over the house)
export const behind = (id, side = 0) => `(() => { const h = game.world.houses.find((q) => q.id === '${id}'); const a = h.ry + ${side} * Math.PI / 2; const r = (${side} % 2 ? h.w : h.d) / 2 + 1.6; return { x: h.x + Math.sin(a) * r, z: h.z + Math.cos(a) * r, a }; })()`;
export default async ({ page, ev, shot, log, W }) => {
  const T = process.env.TAG || 'x';
  await ev(PROBE);
  const spots = [...SPOTS];
  for (const [id, side] of [['bug', 2], ['stone', 2], ['south', 2], ['shop', 2], ['pink', 2], ['twinsen', 2]]) spots.push(['behind-' + id, await ev(behind(id, side))]);
  for (const [name, s0] of spots) {
    const r = await ev((s) => { const G = game, h = G.hero, Wd = G.world;
      if (s.spaceport) { const L = Wd.spaceport.landing; s = { x: L.x, z: L.z, a: L.a }; }
      G.exitRoom({ x: s.x, z: s.z, a: s.a }, true, true);
      if (s.deckY) h.pos.y = Wd.spaceport.deck.y;
      G.step(0.5); h.angle = s.a; G.camRig.lba && (G.camRig.lba.init = false); G.step(1.5);   // (settled first: a fresh shot behind him)
      return { pos: [h.pos.x, h.pos.y, h.pos.z].map((v) => +v.toFixed(2)), cam: window.__cam(), seen: window.__seen(), who: window.__who() }; }, s0);
    log(name, JSON.stringify(r));
    await shot(`explore-${name}-${T}`);
  }
};
