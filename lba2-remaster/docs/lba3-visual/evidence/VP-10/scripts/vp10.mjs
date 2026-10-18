// VP-10 before/after by input (node run.mjs vp10.mjs 1280 720; TAG=before|after; PART=A,B,C,D,E — default all).
// Each frame's label: what the player sees of Twinsen (seen % of his unoccluded pixels, silhouette off for the
// measure), the camera's pitch (deg, from him), veil = meshes drawn see-through by a fader, gone = meshes drawn as
// nothing that still cast a shadow (colorWrite off).
//  A  leaving the house (VP-3's repro): take the ball, out of the door by input, 3 s away, Enter (re-centre), back
//  B  walking round behind three town houses (Bug Street, the stone house, the south house), from in front of each
//  C  the harbour lane to the customs post (Nell's lean-to roof, D8)
//  D  the spaceport's waiting side: to the benches, face the pad, Enter (the terminal and its dome, D8)
//  E  the fortress / station: through the gate, along the inside of the south wall, Enter; behind a tower; behind a
//     project building
import { PROBE } from './probe.mjs';
import { FRAME, DRIVE } from './lib.mjs';
const M = `window.__m = () => { const f = eval(window.__F), c = window.__cam(), s = window.__seen();
  let veil = 0, gone = 0; game.world.root.traverse((o) => { if (!o.isMesh || !o.visible) return; const ms = [].concat(o.material);
    if (ms.some((m) => m.transparent && m.opacity < 0.98 && m.depthWrite === false && !m.userData.alwaysTransparent)) veil++; if (o.castShadow && ms.every((m) => m.colorWrite === false) && !ms.some((m) => m.type === 'MeshBasicMaterial')) gone++; });
  return { ...f, pitch: c.pitch, seen: s.pct, veil, gone }; };`;
const lab = (i, d) => `${i} ${d.room} seen ${d.seen ?? '-'}%% pitch ${d.pitch ?? '-'} veil ${d.veil ?? '-'} gone ${d.gone ?? '-'}${d.fade ? ' fade ' + (+d.fade).toFixed(2) : ''}`;
export default async ({ ev, shot, seqFast, seq, log }) => {
  const T = process.env.TAG || 'x', PARTS = (process.env.PART || 'A,B,C,D,E').split(',');
  await ev(`window.__F = ${JSON.stringify(FRAME)}; ${DRIVE}`);
  await ev(PROBE); await ev(M);
  const sum = (name, data) => { const s = data.map((d) => d.seen).filter((v) => v != null); const hidden = s.filter((v) => v < 20).length; log(`${name}: frames ${s.length}, seen min ${Math.min(...s)}% mean ${Math.round(s.reduce((a, b) => a + b, 0) / Math.max(1, s.length))}%, frames <20% seen ${hidden}, veil max ${Math.max(...data.map((d) => d.veil ?? 0))}, gone max ${Math.max(...data.map((d) => d.gone ?? 0))}, pitch ${Math.min(...data.map((d) => d.pitch ?? 99))}–${Math.max(...data.map((d) => d.pitch ?? 0))}`); };
  // place and settle, then a fresh shot behind him (as tests/lib/shots.mjs)
  const place = (s) => ev((s) => { const G = game, h = G.hero; G.exitRoom({ x: s.x, z: s.z, a: s.a }, true, true); if (s.deckY) h.pos.y = G.world.spaceport.deck.y; G.step(0.5); h.angle = s.a; G.camRig.lba.init = false; G.step(1.0); return [h.pos.x, h.pos.y, h.pos.z].map((v) => +v.toFixed(2)); }, s);
  // walk by input to (x, z) with frames every `every` steps of 1/10 s (seqFast, full frames)
  const walk = async (name, x, z, n = 16, every = 3, tol = 0.8) => {
    await ev(([x, z, tol]) => window.__drive(x, z, tol), [x, z, tol]);
    const r = await seqFast(`${name}-${T}`, n, ({ arg }) => { for (let k = 0; k < arg; k++) window.__driveStep(1 / 10); return window.__m(); }, { full: true, cols: 4, arg: every, label: lab });
    await ev(() => P.release());
    sum(name, r.data); return r;
  };

  if (PARTS.includes('A')) {
    await ev(() => P.settle());
    const cb = await ev(() => { const s = game.room.searches[0]; return [s.x, s.z]; });
    log('ball', JSON.stringify(await ev((c) => { P.go(c[0], c[1], { tol: 1.1, stopWhen: () => { const t = P.target(); return t && t.kind !== 'npc' && Math.hypot(game.hero.pos.x - c[0], game.hero.pos.z - c[1]) < 2.2; } }); P.face(c[0], c[1]); P.tap('KeyE', 0.1); P.settle(); return { ball: game.hero.hasBall }; }, cb)));
    const ex = await ev(() => { const e = game.room.exits.find((x) => !x.room); return [e.x, e.z]; });
    await ev((e) => { P.go(e[0], e[1], { tol: 1.6 }); P.face(e[0], e[1]); }, ex);
    const r = await seqFast(`A1-exit-${T}`, 28, () => { if (game.state === 'play') game.input.keys.add('ArrowUp'); game.step(1 / 20); return game.room ? eval(window.__F) : window.__m(); }, { full: true, cols: 4, label: lab });
    sum('A1 exit', r.data.filter((d) => d.room === 'citadel'));
    await ev(() => { P.release(); for (let i = 0; i < 400 && (game.trans || game.state !== 'play'); i++) game.step(1 / 60); });
    log('A control', JSON.stringify(await ev(() => window.__m())));
    await shot(`A2-door-control-${T}`);
    const r2 = await seqFast(`A3-away-${T}`, 12, () => { game.input.keys.add('ArrowUp'); game.step(1 / 4); return window.__m(); }, { full: true, cols: 4, label: lab });
    sum('A3 walk away 3 s', r2.data);
    await ev(() => { P.release(); game.step(0.3); });
    await shot(`A4-away-${T}`);
    const r3 = await seqFast(`A5-recentre-${T}`, 16, ({ i }) => { if (i === 0) { game.input.keys.add('Enter'); game.input.taps.add('Enter'); } game.step(1 / 20); game.input.keys.delete('Enter'); return window.__m(); }, { full: true, cols: 4, label: lab });
    sum('A5 Enter re-centre', r3.data);
    await shot(`A6-recentred-${T}`);
    // turn back to the door and walk to it
    const door = await ev(() => { const h = game.world.houses.find((q) => q.id === 'twinsen'); return [h.door.x, h.door.z]; });
    await walk('A7-back-to-door', door[0], door[1], 12, 3, 1.4);
  }

  if (PARTS.includes('B')) {
    for (const id of (process.env.BH || 'bug,stone,south').split(',')) {
      const s = await ev((id) => { const h = game.world.houses.find((q) => q.id === id); const a = h.ry; const fx = h.x + Math.sin(a) * (h.d / 2 + 6), fz = h.z + Math.cos(a) * (h.d / 2 + 6);
        const bx = h.x - Math.sin(a) * (h.d / 2 + 2.2), bz = h.z - Math.cos(a) * (h.d / 2 + 2.2);
        return { x: fx, z: fz, a: a + Math.PI, back: [bx, bz] }; }, id);
      log(`B ${id} from`, JSON.stringify(await place(s)), 'to', JSON.stringify(s.back));
      await shot(`B-${id}-0-front-${T}`);
      await walk(`B-${id}-round`, s.back[0], s.back[1], 20, 3, 0.9);
      await shot(`B-${id}-1-behind-${T}`);
    }
  }

  if (PARTS.includes('C')) {
    log('C from', JSON.stringify(await place({ x: -93, z: 38.5, a: -Math.PI / 2 })));
    await walk('C1-lane-to-customs', -107, 37, 16, 3, 0.8);
    await shot(`C2-customs-${T}`);
    log('C static (shots.mjs spot)', JSON.stringify(await place({ x: -107, z: 37, a: -1.2 })), JSON.stringify(await ev(() => window.__m())));
    await shot(`C3-customs-spot-${T}`);
  }

  if (PARTS.includes('D')) {
    log('D from', JSON.stringify(await place({ x: -6.5, z: 38.5, a: Math.PI, deckY: true })));
    await walk('D1-to-benches', -9.0, 33.6, 10, 3, 0.5);
    await ev(() => { P.face(-9.0, 40); P.release(); game.step(0.2); });
    const r = await seqFast(`D2-enter-${T}`, 16, ({ i }) => { if (i === 0) { game.input.keys.add('Enter'); game.input.taps.add('Enter'); } game.step(1 / 10); game.input.keys.delete('Enter'); return window.__m(); }, { full: true, cols: 4, label: lab });
    sum('D2 Enter at the benches', r.data);
    await shot(`D3-waiting-${T}`);
    log('D static (deck-wait-n)', JSON.stringify(await place({ x: -6.6, z: 33.76, a: 0, deckY: true })), JSON.stringify(await ev(() => window.__m())));
    await shot(`D4-deck-wait-n-${T}`);
  }

  if (PARTS.includes('E')) {
    const F = await ev(() => ({ x: game.world.station.x, z: game.world.station.z, gate: game.world.gate && [game.world.gate.x, game.world.gate.z] }));
    log('E station', JSON.stringify(F));
    log('E from', JSON.stringify(await place({ x: F.x - 24, z: F.z, a: Math.PI / 2 })));
    await shot(`E0-gate-approach-${T}`);
    await walk('E1-through-gate', F.x - 6, F.z + 0.5, 20, 3, 0.8);
    await walk('E2-to-south-wall', F.x - 3, F.z + 8.4, 12, 3, 0.8);
    await ev(() => { P.face(game.hero.pos.x, game.hero.pos.z - 10); P.release(); game.step(0.2); });
    const r = await seqFast(`E3-enter-south-wall-${T}`, 16, ({ i }) => { if (i === 0) { game.input.keys.add('Enter'); game.input.taps.add('Enter'); } game.step(1 / 10); game.input.keys.delete('Enter'); return window.__m(); }, { full: true, cols: 4, label: lab });
    sum('E3 Enter by the south wall', r.data);
    await shot(`E4-south-wall-${T}`);
    const tw = await place({ x: F.x + 13 + 5.2, z: F.z + 13 + 5.2, a: Math.PI / 4 });
    log('E tower spot', JSON.stringify(tw), JSON.stringify(await ev(() => window.__m())));
    await shot(`E5-tower-${T}`);
  }
};
