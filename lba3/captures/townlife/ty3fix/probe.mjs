// TY-3-FIX probe (runtime, normal game camera). node probe.mjs <shop|pump> <tag>
// GAME_URL selects the server. Screenshots -> captures/townlife/ty3fix/<tag>-*.png; JSON log -> <tag>-<scenario>.json.
// ISO lines are flag setups (chapter 2 by flags, as tests/townlife.mjs does); everything else is input (P.go/P.use/E).
// before = 0.26.0 (0e278f0) served separately, after = 0.26.1; the PNGs are composed into ../ty3fix-*.jpg and removed.
import { launch, open, menu } from '../../../tests/lib/boot.mjs';
import path from 'node:path';
import fs from 'node:fs';
const DIR = path.dirname(new URL(import.meta.url).pathname);
const [SC, TAG = 'run'] = process.argv.slice(2);
const out = {};
const log = (k, v) => { out[k] = v; console.log(k + ': ' + JSON.stringify(v)?.slice(0, 1400)); };
const iso = (s) => console.log('ISO  ' + s);
const { browser, page, errs } = await launch({ width: 1280, height: 720 });
const ev = (f, a) => page.evaluate(f, a);
await open(page, '?nocine'); await menu(page, 'new');
await ev(() => P.settle());
iso('chapter 2 (project) by flags, c1_water');
await ev(() => { const G = game, f = G.flags; Object.assign(f, { prologueDone: true, intro: true, chapterKey: 'project', c1_water: true }); f.chapter = G.story.chapters.findIndex((c) => c.key === 'project'); G.hero.hasBall = true; G.story.applyFlags(); P.settle(); });
const shot = async (name, clip) => { await ev(() => game.renderer.render()); await page.screenshot({ path: path.join(DIR, `${TAG}-${name}.png`), ...(clip ? { clip } : {}) }); };
// a world point's pixel, for crops
const px = (p) => ev(async (p) => { const THREE = await import('three'); const v = new THREE.Vector3(...p).project(game.camera); return [Math.round((v.x + 1) / 2 * innerWidth), Math.round((1 - v.y) / 2 * innerHeight), v.z < 1]; }, p);
const crop = async (p, w = 360, h = 260) => { const [x, y] = await px(p); return { x: Math.max(0, Math.min(1280 - w, x - w / 2)), y: Math.max(0, Math.min(720 - h, y - h / 2)), width: w, height: h }; };
const vis = (pts) => ev(async (pts) => {
  const THREE = await import('three');
  game.renderer.render?.();
  const cam = game.camera, cp = new THREE.Vector3(); cam.getWorldPosition(cp);
  const rc = new THREE.Raycaster();
  const shown = (o) => { for (let x = o; x; x = x.parent) if (!x.visible) return false; return true; };
  const owner = (o) => { for (let x = o; x; x = x.parent) { if (x === game.hero.rig?.root || x === game.hero.mesh) return 'TWINSEN'; for (const n of game.npcs) if (x === n.rig?.root || x === n.mesh) return 'NPC:' + n.def.id; } return null; };
  const meshes = []; game.scene.traverse((o) => { if ((o.isMesh || o.isSkinnedMesh || o.isInstancedMesh) && !o.isSprite && shown(o)) meshes.push(o); });
  rc.camera = cam; const res = {};
  for (const [n, p] of Object.entries(pts)) {
    const v = new THREE.Vector3(p[0], p[1], p[2]); const ndc = v.clone().project(cam);
    const on = Math.abs(ndc.x) <= 1 && Math.abs(ndc.y) <= 1 && ndc.z < 1;
    const dir = v.clone().sub(cp), d = dir.length(); dir.normalize(); rc.set(cp, dir); rc.far = d + 0.3;
    const hits = rc.intersectObjects(meshes, false).filter((h) => !(h.object.material?.transparent && (h.object.material.opacity < 0.6 || h.object.material.depthWrite === false)) && !h.object.userData?.fx);
    const first = hits[0]; const blocked = first && first.distance < d - 0.2; const bp = first?.point;
    res[n] = on ? (blocked ? 'HIDDEN by ' + (owner(first.object) || first.object.name || first.object.geometry?.type || 'mesh') + ' @' + [bp.x, bp.y, bp.z].map((q) => q.toFixed(1)).join(',') : 'seen') : 'off-screen';
  }
  return res;
}, pts);
const camInfo = () => ev(() => { const c = game.camera.position, h = game.hero.pos; return { cam: [c.x, c.y, c.z].map((v) => +v.toFixed(1)), hero: [h.x, h.z].map((v) => +v.toFixed(2)), yawDeg: Math.round(game.camRig.yaw * 180 / Math.PI) }; });

try {
  if (SC === 'shop') {
    log('odile+crate+nell', await ev(() => { const L = game.world.life, f = game.flags; P.talk('odile'); P.use(L.crate.x, L.crate.z, { near: 0.8, kind: 'lcrate' }); P.talk('nell'); return { open: !!f.l_crateOpen, cs: f.l_cs }; }));
    const pts = await ev(() => { const c = game.world.life.shop.coupler; const o = {}; for (const [n, dx, dy, dz] of [['top', 0, 0.27, 0], ['front_s', 0, 0.13, 0.16], ['side_w', -0.16, 0.13, 0], ['side_e', 0.16, 0.13, 0]]) o[n] = [c.x + dx, c.y + dy, c.z + dz]; return o; });
    const cpos = await ev(() => { const c = game.world.life.shop.coupler; return [c.x, c.y + 0.15, c.z]; });
    // approaches a player takes, the camera recentred behind him (Enter) as he heads for the bench: from the harbour
    // path (south-east), from the south, from the quay (west), from the lane (east)
    const appr = [['SE', 4, 5], ['S', 0, 5.5], ['W', -5, 2.5], ['E', 5, 1.2]];
    for (const [n, dx, dz] of appr) {
      const r = await ev(([dx, dz]) => { const L = game.world.life, b = L.shop.bench, f = game.flags; const g0 = P.go(b.x + dx, b.z + dz, { tol: 0.5, maxT: 60 }).r; P.face(b.x, b.z); P.tap('Enter', 0.8);
        const g = P.go(b.x, b.z, { tol: 0.1, stopWhen: () => P.target()?.kind === 'lbench' }); const before = f.l_cs, from = P.state().pos; if (P.target()?.kind === 'lbench') P.tap('KeyE', 0);
        let t = 0; while (t < 8 && f.l_cs === before) { game.step(1 / 30); t += 1 / 30; } P.settle(); P.wait(0.8); return { g0, go: g.r, from, before, cs: f.l_cs, t: +t.toFixed(2), at: P.state().pos }; }, [dx, dz]);
      log(n + ': placed', { ...r, ...(await camInfo()) });
      for (const [tg, tgt] of [['h05', 0.05], ['h30', 0.3], ['h60', 0.6], ['h115', 1.12]]) {
        await ev((tgt) => { let t = 0; while (game.story.life.heat < tgt && t < 14 && game.flags.l_cs === 'bench') { game.step(1 / 30); t += 1 / 30; } }, tgt);
        log(`  ${n} ${tg}`, { heat: await ev(() => +game.story.life.heat.toFixed(2)), stage: await ev(() => game.world.life.shop.coupler.stage), v: await vis(pts) });
        await shot(`bench-${n}-${tg}`, await crop(cpos, 480, 300));
      }
      await shot(`bench-${n}-full`);
      // the far view (Q) at the last stage, then back
      await ev(() => { P.tap('KeyQ', 0.8); }); log(`  ${n} far view`, { v: await vis(pts) }); await shot(`bench-${n}-far`); await ev(() => { P.tap('KeyQ', 0.8); });
      await ev(() => { let t = 0; while (game.flags.l_cs === 'bench' && t < 14) { game.step(1 / 30); t += 1 / 30; } P.settle(); });
    }
    // standing on the harbour path while it heats, walking along it both ways (camera behind him, Enter), near and far view
    await ev(() => { const L = game.world.life, b = L.shop.bench; P.go(b.x, b.z, { tol: 0.1, stopWhen: () => P.target()?.kind === 'lbench' }); P.tap('KeyE', 0); let t = 0; while (t < 8 && game.flags.l_cs !== 'bench') { game.step(1 / 30); t += 1 / 30; } P.settle(); });
    const spots = await ev(() => { const W = game.world, s = { x: -102.8, z: 33.9 }, res = [];
      for (let a = 0; a < 360; a += 15) for (const r of [6, 8]) { const x = s.x + Math.sin(a * Math.PI / 180) * r, z = s.z + Math.cos(a * Math.PI / 180) * r; if (W.pathDist(x, z) < 0.6) res.push([a, r, +x.toFixed(1), +z.toFixed(1)]); }
      return res; });
    const pick = []; for (const s of spots) if (!pick.some((p) => Math.abs(p[0] - s[0]) < 50)) pick.push(s);
    log('path points', pick);
    for (const [a, r, x, z] of pick.slice(0, 2)) {
      for (const dir of [-1, 1]) {
        const at = await ev(([x, z, dir]) => { const r0 = P.go(x + dir * 6, z, { tol: 0.5 }).r; P.face(x, z); P.tap('Enter', 0.8); const rr = P.go(x, z, { tol: 0.4 }); P.wait(0.6); return { r0, r: rr.r }; }, [x, z, dir]);
        iso('coupler put back to heating at 0.6 (glowing) for the view from the path');
        await ev(() => { const S = game.story.life; S.cs = 'bench'; S.heat = 0.6; game.world.life.shop.coupler.setVisible(true); game.step(1 / 30); });
        const tag = `path-${a}-${dir < 0 ? 'eastbound' : 'westbound'}`;
        log(tag, { at, heat: await ev(() => +game.story.life.heat.toFixed(2)), ...(await camInfo()), v: await vis(pts) });
        await shot(tag);
        await ev(() => { P.tap('KeyQ', 0.8); }); log(tag + ' far', { v: await vis(pts) }); await shot(tag + '-far'); await ev(() => { P.tap('KeyQ', 0.8); });
      }
    }
  }
  if (SC === 'pump') {
    log('pliers + pin by input', await ev(() => { const L = game.world.life, f = game.flags; P.talk('bram'); P.use(L.pump.x, L.pump.z + 1.4, { near: 1.0, kind: 'lpump' }); P.talk('arthur'); P.use(L.boatBox.x, L.boatBox.z, { near: 0.8, kind: 'lbox' }); const r = P.use(L.pump.x + 1.0, L.pump.z + 1.1, { near: 0.3, kind: 'lpump' }); P.settle(); return { pliers: !!f.l_pliers, pin: !!f.l_pin, r: r.r, pos: P.state().pos }; }));
    // N3: right after the pin (trough side), what does the prompt say, from where he stands and round the pump
    log('prompt where the pin came out', await ev(() => { const t = P.target(); return t ? t.kind + ':' + t.label : null; }));
    log('prompts round the pump', await ev(() => { const L = game.world.life, out = {}; for (const [n, dx, dz] of [['E trough', 1.0, 1.1], ['NE', 1.0, -1.0], ['N', 0.0, -1.2], ['S', 0.2, 1.2], ['W grip', -1.4, 0], ['SW', -1.0, 0.9], ['NW', -1.0, -0.9]]) { const r = P.go(L.pump.x + dx, L.pump.z + dz, { tol: 0.3, maxT: 20 }); P.face(L.pump.x, L.pump.z); const t = P.target(); out[n] = { r: r.r, prompt: t ? t.kind + ':' + t.label : null }; } return out; }));
    // the stroke, from each approach: walk until the prompt shows, press E; frame by frame (1/60) until it ends
    for (const [n, dx, dz] of [['N', 0.3, -4], ['E trough', 1.0, 1.1]]) {
      const r = await ev(([dx, dz]) => { const L = game.world.life, U = L.pump.use, h = game.hero, f = game.flags;
        P.go(L.pump.x + dx, L.pump.z + dz, { tol: 0.3, maxT: 30 }); const g0 = P.go(U.x, U.z, { tol: 0.05, stopWhen: () => P.target()?.kind === 'lpump' && P.target()?.label === 'p_pump' });
        const bones = {}; h.rig.root.traverse((o) => { if (/^hand[LR]$|^foot[LR]$/.test(o.name)) bones[o.name] = o; });
        const wp = (o) => o.getWorldPosition(o.position.clone());
        const from = +Math.hypot(h.pos.x - U.x, h.pos.z - U.z).toFixed(2), s0 = f.l_strokes || 0;
        const label = P.target()?.label;
        P.tap('KeyE', 0); const rows = []; let maxSpeed = 0, prev = [h.pos.x, h.pos.z];
        for (let i = 0; i < 360; i++) { game.step(1 / 60); const g = L.pump.grip(); const mid = wp(bones.handL).add(wp(bones.handR)).multiplyScalar(0.5);
          const sp = Math.hypot(h.pos.x - prev[0], h.pos.z - prev[1]) * 60; prev = [h.pos.x, h.pos.z]; maxSpeed = Math.max(maxSpeed, sp);
          rows.push([h.rig.anim, +(h.rig.actionT || 0).toFixed(3), +mid.distanceTo(g).toFixed(3), +sp.toFixed(2), +(L.pump.handleAngle ? L.pump.handleAngle() : 0).toFixed(3)]);
          if (h.actT <= 0 && !h.steer && h.rig.anim !== 'pump' && i > 10 && !game.story.life.glide) break; }
        P.settle();
        const pr = rows.filter((r) => r[0] === 'pump');
        return { go: g0.r, label, promptFrom: from, strokes: [s0, f.l_strokes], maxSpeed: +maxSpeed.toFixed(2), approachFrames: rows.findIndex((r) => r[0] === 'pump'), pumpFrames: pr.length, worst: Math.max(...pr.map((r) => r[2])), rows: rows.map((r) => r.join(' ')) }; }, [dx, dz]);
      log('stroke from ' + n, { ...r, rows: undefined }); log('  rows (anim actionT handGap speed handle)', r.rows);
    }
    // the third stroke from the lane to the south, stepped 0.1 s at a time with a still of each step (normal camera)
    await ev(() => { const L = game.world.life, U = L.pump.use; P.go(L.pump.x + 0.4, L.pump.z + 4, { tol: 0.3, maxT: 30 }); P.face(L.pump.x, L.pump.z); P.tap('Enter', 0.8); P.go(L.pump.x, L.pump.z, { tol: 0.3, stopWhen: () => P.target()?.label === 'p_pump' }); });
    const gp = await ev(() => { const L = game.world.life; return [L.pump.x - 0.7, game.physics.groundAt(L.pump.x, L.pump.z) + 0.9, L.pump.z]; });
    const cl = await crop(gp, 420, 330);
    await ev(() => P.tap('KeyE', 0));
    const stills = [];
    for (let i = 0; i < 40; i++) {
      const r = await ev(() => { const h = game.hero, L = game.world.life; const bones = []; h.rig.root.traverse((o) => { if (/^hand[LR]$/.test(o.name)) bones.push(o); }); const m = bones[0].getWorldPosition(bones[0].position.clone()).add(bones[1].getWorldPosition(bones[1].position.clone())).multiplyScalar(0.5); return [h.rig.anim, +h.rig.actionT.toFixed(2), +m.distanceTo(L.pump.grip()).toFixed(3), +(L.pump.handleAngle ? L.pump.handleAngle() : 0).toFixed(3), !!h.steer, game.flags.l_strokes, game.state]; });
      stills.push(r.join(' '));
      if (r[0] === 'walk' && i % 4) { await ev(() => game.step(0.1)); continue; }
      await shot('stroke-' + String(i).padStart(2, '0') + '-' + r[0] + '-' + r[1], cl);
      if (r[6] !== 'play') break;
      await ev(() => game.step(0.1));
    }
    log('third stroke stills (anim actionT gap handle steer strokes state)', stills);
  }
} catch (e) { console.log('ERROR', e.stack); }
log('errors', errs.slice(0, 10));
fs.writeFileSync(path.join(DIR, `${TAG}-${SC}.json`), JSON.stringify(out, null, 1));
await browser.close();
