// The whole game, area by area, at three points of the story (start, middle, end):
//   performance  every room and region entered through the game's own door (enterRoom with its fade): the entry
//                window (build, black, stalls), then a look around (the free camera turning, 8 s) at the start of the
//                story; a second entry later shows what the first visit's build cost
//   characters   every character standing in the area: floating above or sunk into the ground, standing inside
//                an object, and for residents with a round, every activity stop within reach of what it works on;
//                a side-view close-up of each (Twinsen hidden) for a person to judge
//   overview     one full frame of each area, for a person to judge
// The story is moved on with the game's own story.nextChapter() (injected state): later chapters' people and places.
// Nothing here is shown to the player: the pictures are evidence files for the developers.
import fs from 'node:fs';
import path from 'node:path';
import { assert, newGame, measure } from './common.mjs';
import { sleep, writeJson } from '../util.mjs';

const ev = (page, fn, arg) => page.evaluate(fn, arg);
const CITADEL = { x: -42, z: 2, a: 0 };
const REACH = { tend: { h: 0.35, down: true, max: 1.0 }, water: { h: 0.5, down: true, max: 1.0 }, draw: { h: 0.9, max: 1.0 }, dip: { h: 0.8, max: 1.0 },
  warm: { h: 1.0, max: 1.0 }, browse: { h: 0.95, max: 1.0 }, put: { h: 0.7, down: true, max: 1.3, ground: true }, knock: { h: 1.25, max: 1.2 } };

// leave dialogue and cut scenes the way a player does (E through lines, E held to skip)
async function settle(page, ms = 45000) {
  const t = Date.now();
  while (Date.now() - t < ms) {
    const s = await ev(page, () => ({ st: game.state, trans: !!game.trans, cine: !!game.cine }));
    if (s.st === 'play' && !s.trans && !s.cine) return true;
    if (s.st === 'ending' || s.st === 'gameover') return false;   // (an ending or game-over screen: not playable, reported as not entered)
    if (s.st === 'dialog') await page.keyboard.press('KeyE');
    else if (s.cine || s.st === 'cinematic' || s.st === 'cutscene') { await page.keyboard.down('KeyE'); await sleep(1300); await page.keyboard.up('KeyE'); }
    await sleep(300);
  }
  return false;
}

async function enter(page, id) {
  await ev(page, ({ id, C }) => { game.resetCombat?.('drop'); if (id === 'citadel') game.exitRoom(C, false, true); else game.enterRoom(id, null, false, true); }, { id, C: CITADEL });
  const ok = await page.waitForFunction((id) => (id === 'citadel' ? !game.room : game.room?.id === id) && !game.trans, id, { timeout: 90000 }).then(() => true).catch(() => false);
  await settle(page);
  return ok;
}

// every character in the area: the checks in the page (no picture yet)
const checkCharacters = (page, area) => ev(page, async ({ area, REACH }) => {
  const THREE = await import('/vendor/three/build/three.module.min.js');
  const G = game, inArea = (x, z) => { try { return (G.regions.sceneOf(x, z) ?? 'citadel') === area; } catch { return false; } };
  const chars = new Set([G.hero.rig?.root, ...G.npcs.map((n) => n.rig?.root), ...(G.enemies || []).map((e) => e.rig?.root)].filter(Boolean));
  const isChar = (o) => { for (let x = o; x; x = x.parent) if (chars.has(x)) return true; return false; };
  const meshes = []; G.scene.traverse((o) => { if ((o.isMesh || o.isInstancedMesh) && !o.isSkinnedMesh && !o.isBatchedMesh && o.visible && o.geometry?.attributes?.position) meshes.push(o); });
  const ray = new THREE.Raycaster(); ray.far = 4;
  const hit = (o, d) => { ray.set(o, d.normalize()); const all = []; for (const m of meshes) { try { ray.intersectObject(m, false, all); } catch {} } all.sort((a, b) => a.distance - b.distance); return all.find((h) => !isChar(h.object) && !h.object.isSprite) || null; };
  const out = [];
  G.npcs.forEach((n, k) => {
    if (n.present === false || !n.pos || !inArea(n.pos.x, n.pos.z)) return;
    const name = n.def?.id || n.id || `npc${k}`, y = n.pos.y, g = G.physics.groundAt(n.pos.x, n.pos.z, y + 1.5);
    const up = hit(new THREE.Vector3(n.pos.x, y + 0.05, n.pos.z), new THREE.Vector3(0, 1, 0));
    const c = { k, who: name, char: n.def?.char || '', ambient: !!n.ambient, x: +n.pos.x.toFixed(2), z: +n.pos.z.toFixed(2), aboveGround: +(y - g).toFixed(2), sitting: !!(n.sit || /sit|bench|seat|chair|lie|sleep/i.test(n.rig?.anim || '')), insideAt: up && up.distance < 1.2 ? +up.distance.toFixed(2) : null, anim: n.rig?.anim ?? null, stops: [] };
    for (let i = 0; i < (n.stops || []).length; i++) {
      const s = n.stops[i], R = REACH[s?.act]; if (!R || s.a == null || !inArea(s.x, s.z)) continue;
      const sy = G.physics.groundAt(s.x, s.z), dx = Math.sin(s.a), dz = Math.cos(s.a);
      const flat = hit(new THREE.Vector3(s.x, sy + R.h, s.z), new THREE.Vector3(dx, 0, dz));
      const slant = R.down ? hit(new THREE.Vector3(s.x, sy + 1.0, s.z), new THREE.Vector3(dx, -0.8, dz)) : null;
      const onGround = slant && Math.abs(slant.point.y - G.physics.groundAt(slant.point.x, slant.point.z)) < 0.05;
      const gaps = [flat, R.ground || !onGround ? slant : null].filter(Boolean).map((h) => Math.hypot(h.point.x - s.x, h.point.z - s.z));
      const inside = hit(new THREE.Vector3(s.x, sy + 0.05, s.z), new THREE.Vector3(0, 1, 0));
      c.stops.push({ i, stop: s.id, act: s.act, gap: gaps.length ? +Math.min(...gaps).toFixed(2) : null, max: R.max, insideAt: inside && inside.distance < 1.2 ? +inside.distance.toFixed(2) : null });
    }
    out.push(c);
  });
  return out;
}, { area, REACH });

// a side-view close-up of one character (Twinsen hidden on a layer the camera does not draw)
async function portrait(page, c, file) {
  await ev(page, (k) => { const n = game.npcs[k], a = n.angle + 1.9, d = game.room ? 3 : 4.5, hx = n.pos.x + Math.sin(a) * d, hz = n.pos.z + Math.cos(a) * d;
    game.hero.pos.set(hx, game.physics.groundAt(hx, hz), hz); game.hero.angle = Math.atan2(n.pos.x - hx, n.pos.z - hz); game.camRig.recenter?.(); }, c.k);
  await sleep(1200);
  const clip = await ev(page, (k) => { const n = game.npcs[k], v = n.pos.clone(); v.y += 1.0; v.project(game.camera); const s = 320, x = ((v.x + 1) / 2) * innerWidth, y = ((1 - v.y) / 2) * innerHeight;
    return { x: Math.max(0, Math.min(innerWidth - s, Math.round(x - s / 2))), y: Math.max(0, Math.min(innerHeight - s, Math.round(y - s / 2))), width: s, height: s, on: v.z < 1 && x > 0 && x < innerWidth && y > 0 && y < innerHeight }; }, c.k);
  c.onScreen = clip.on;
  await page.screenshot({ path: file, type: 'jpeg', quality: 72, clip: { x: clip.x, y: clip.y, width: clip.width, height: clip.height } }).then(() => { c.picture = path.basename(file); }).catch(() => {});
}

function stage(id, label, chapters, { lookAround, revisit }) {
  return {
    id: `sweep-${id}`, title: `Whole game, ${label}: every area and character`, group: 'sweep', suites: ['sweep'], session: 'warm', timeoutS: 4800,
    method: { realInput: false, testApi: true, injectedState: chapters > 0, preloadedAssets: false },
    async run(ctx) {
      const { page, rec, dir } = ctx;
      await newGame(page);
      for (let k = 0; k < chapters; k++) { await ev(page, () => game.story.nextChapter()); await settle(page, 30000); }
      rec.chapter = await ev(page, () => game.flags.chapterKey);
      let areas = ['citadel', ...(await ev(page, () => [...game.regions.groups.values()].flatMap((G) => G.rooms)))];
      if (process.env.LBA3_SWEEP_AREAS) areas = areas.filter((a) => process.env.LBA3_SWEEP_AREAS.split(',').includes(a));   // (a short trial)
      const out = path.join(dir, 'evidence', `sweep-${id}`); fs.mkdirSync(out, { recursive: true });
      rec.areas = [];
      for (let ai = 0; ai < areas.length && !ctx.stopped(); ai++) {
        const area = areas[ai];
        ctx.emit('status', { text: `${label}: ${area} (${ai + 1} of ${areas.length})` });
        const A = { area, chapter: rec.chapter };
        const built = await ev(page, (a) => (a === 'citadel' ? 'ready' : game.regions.stateOf?.(game.regions.groupOf?.(a) ?? a) ?? '?'), area);
        const m = await measure(ctx, `${area} · entry (${built === 'unloaded' ? 'first visit' : 'built before'})`, async () => { A.entered = await enter(page, area); await sleep(2500); });
        A.entry = m.stats; A.firstVisit = built === 'unloaded';
        if (!A.entered) { assert(rec, `${area}: entered`, false, 'the area on screen', await ev(page, () => game.room?.id ?? 'citadel')); rec.areas.push(A); continue; }
        if (lookAround) {
          const cam0 = await ev(page, () => { const C = game.camRig; const c0 = { view: C.view, yaw: C.yaw, pitch: C.pitch }; game.bench.camera(); window.__tlSpin = setInterval(() => { game.camRig.yaw += 0.35 / 20; }, 50); return c0; });
          const w = await measure(ctx, `${area} · look around 8 s`, () => sleep(8000));
          await ev(page, (c0) => { clearInterval(window.__tlSpin); game.bench.restoreCamera?.(c0); }, cam0);
          A.look = w.stats; A.gpuPasses = rec.windows.at(-1).gpuPasses;
        }
        await page.screenshot({ path: path.join(out, `${area}-overview.jpg`), type: 'jpeg', quality: 65 }).catch(() => {});
        A.overview = `${area}-overview.jpg`;
        A.characters = await checkCharacters(page, area).catch((e) => { A.charError = String(e).slice(0, 200); return []; });
        await ev(page, () => game.hero.rig.root.traverse((o) => { if (o.userData.__tlLayers == null) o.userData.__tlLayers = o.layers.mask; o.layers.set(31); }));
        for (const c of A.characters) { if (ctx.stopped()) break; await portrait(page, c, path.join(out, `${area}-${c.who}.jpg`)); }
        await ev(page, () => game.hero.rig.root.traverse((o) => { if (o.userData.__tlLayers != null) o.layers.mask = o.userData.__tlLayers; }));
        for (const c of A.characters) {
          if (!c.sitting && Math.abs(c.aboveGround) > 0.25) assert(rec, `${area}: ${c.who} on the ground`, false, '|height above ground| ≤ 0.25 m', `${c.aboveGround} m`);
          if (c.insideAt != null) assert(rec, `${area}: ${c.who} not inside an object`, false, 'free above the feet', `a surface ${c.insideAt} m above the feet`);
          // (knocking: the resident goes in at once when placed there, so it cannot be seen; its gap is kept as information)
          for (const s of c.stops) if (s.act !== 'knock' && (s.gap == null || s.gap > s.max)) assert(rec, `${area}: ${c.who} · ${s.act} at ${s.stop} within reach`, false, `≤ ${s.max} m`, s.gap == null ? 'nothing within 4 m' : `${s.gap} m`);
        }
        rec.areas.push(A);
      }
      if (revisit) for (const area of areas.filter((a) => rec.areas.find((x) => x.area === a)?.entered)) {
        if (ctx.stopped()) break;
        ctx.emit('status', { text: `${label}: second visit, ${area}` });
        const m = await measure(ctx, `${area} · second visit`, async () => { await enter(page, area); await sleep(2500); });
        rec.areas.find((x) => x.area === area).second = m.stats;
      }
      writeJson(path.join(out, 'areas.json'), rec.areas);
      fs.writeFileSync(path.join(out, 'index.html'), `<!doctype html><meta charset="utf-8"><title>Sweep ${label}</title><style>body{font:13px system-ui;background:#111;color:#ddd;margin:10px}section{margin:14px 0}img{height:200px;margin:2px}.bad{color:#ff7a7a}</style><h2>${label} (chapter ${rec.chapter})</h2>${rec.areas.map((A) => `<section><h3>${A.area}</h3>${A.entry ? `entry: max ${A.entry.max} ms, ${A.entry.over50} frames > 50 ms (${A.entry.stallsBehindLoading} behind loading)` : 'not entered'}${A.look ? ` · look around: ${A.look.fps} fps, GPU ${A.look.gpuP50} ms, CPU ${A.look.cpuWorkP50} ms` : ''}${A.second ? ` · second visit max ${A.second.max} ms` : ''}<br>${A.overview ? `<img src="${A.overview}">` : ''}${(A.characters || []).map((c) => `<span style="display:inline-block;text-align:center">${c.picture ? `<img src="${c.picture}">` : ''}<br>${c.who}${!c.sitting && Math.abs(c.aboveGround) > 0.25 ? ` <b class="bad">${c.aboveGround} m off the ground</b>` : ''}${c.insideAt != null ? ' <b class="bad">inside</b>' : ''}${c.stops.filter((s) => s.gap == null || s.gap > s.max).map((s) => ` <b class="bad">${s.act} gap ${s.gap}</b>`).join('')}</span>`).join('')}</section>`).join('')}`);
      rec.evidence.push(`evidence/sweep-${id}/index.html`, `evidence/sweep-${id}/areas.json`);
      rec.needsVisualJudgment = `Look at evidence/sweep-${id}/index.html: every area's overview and every character's close-up.`;
      assert(rec, 'areas visited', rec.areas.length > 0, '> 0', `${rec.areas.filter((a) => a.entered).length} of ${areas.length} entered`);
    },
  };
}

export const SWEEP = [stage('start', 'start of the story', 0, { lookAround: true, revisit: true }), stage('mid', 'middle of the story', 6, { lookAround: false, revisit: false }), stage('end', 'end of the story (last chapter, before the epilogue)', 11, { lookAround: false, revisit: false })];
