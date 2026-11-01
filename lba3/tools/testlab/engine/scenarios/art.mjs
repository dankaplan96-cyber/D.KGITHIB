// World art: the house interior walked with real keys (the street is street-traversal), and fixed views of the
// Citadel street and Twinsen's house for before/after pictures. The same views every run: a teleport to a fixed
// point, a fixed heading, the player's own camera settled, one full frame each.
import fs from 'node:fs';
import path from 'node:path';
import { assert, newGame, replay, hold, measure } from './common.mjs';
import { gameState } from '../probe.mjs';
import { sleep } from '../util.mjs';

const M = (realInput, testApi, injectedState) => ({ realInput, testApi, injectedState, preloadedAssets: false });

export const houseWalk = {
  id: 'house-walk', title: "Twinsen's house: walk with real keys", group: 'performance', suites: ['art'], session: 'warm', timeoutS: 240,
  method: M(true, true, true),
  async run(ctx) {
    const { page, rec } = ctx;
    await newGame(page);   // (a new game starts in the house)
    await page.evaluate(() => { const c = game.room.center, h = game.hero; h.pos.set(c.x, game.physics.groundAt(c.x, c.z), c.z); h.angle = 0; });
    await sleep(2000);
    const tl = [...hold('ArrowUp', 0, 2), ...hold('ArrowRight', 2, 3), ...hold('ArrowUp', 3, 5), ...hold('ArrowRight', 5, 6), ...hold('ArrowUp', 6, 8), ...hold('ArrowRight', 8, 9), ...hold('ArrowUp', 9, 11), ...hold('ArrowRight', 11, 12)];
    const m = await measure(ctx, 'house walk 12 s', () => replay(page, tl, ctx.stopped));
    const s = await gameState(page);
    assert(rec, 'still in the house', s.room === 'house', 'house', s.room);
    assert(rec, 'frames recorded', m.stats?.frames > 300, '> 300', m.stats?.frames);
  },
};

// fixed views: [name, room|null, x, z, heading] (Citadel coordinates; house coordinates are the room's own)
export const VIEWS = [
  ['street-square', null, -46, 2, Math.PI / 2], ['street-well', null, -38, -8, -2.4], ['street-shop', null, -36, 4, 0.2],
  ['street-gardens', null, -42, 12, Math.PI], ['harbour', null, -60, 6, -Math.PI / 2],
  ['twinsen-house', null, -41.5, 79.8, -Math.PI / 2], ['nbr-house', null, -25, 75.3, -Math.PI / 2], ['south-house', null, -48.2, 31.5, Math.PI],
  ['stone-house', null, -28.6, -15, Math.PI], ['twinsen-door', null, -44.5, 82.4, -Math.PI / 2], ['museum-house', null, -61.5, 42.5, -Math.PI / 2], ['water-house', null, -60, 11, -Math.PI / 2], ['wing2-house', null, -100.8, 36, Math.PI], ['nbr-door', null, -29, 75.3, -Math.PI / 2], ['baggage-hall', null, -84.2, 36, Math.PI],
  ['house-main', 'house', 0, 0, 0], ['house-back', 'house', 0, 0, Math.PI],
];
export const artShots = {
  id: 'art-shots', title: 'World art: fixed views (Citadel street, house)', group: 'visual', suites: ['art', 'artshots'], session: 'warm', timeoutS: 300,
  method: M(false, true, true),
  async run(ctx) { return shootViews(ctx, VIEWS, 'views'); },
};
// one full frame per view, the player's own camera settled; evidence/<folder>/<name>.jpg
async function shootViews(ctx, views, folder) {
    const { page, rec, dir } = ctx;
    const out = path.join(dir, 'evidence', folder); fs.mkdirSync(out, { recursive: true });
    if ((await gameState(page)).state !== 'play') await newGame(page);
    for (const [name, room, x, z, a] of views) {
      await page.evaluate(({ room, x, z, a }) => {
        game.resetCombat?.('drop');
        if (room) { game.enterRoom(room, null, true, true); const c = game.room.center; x += c.x; z += c.z; } else game.exitRoom({ x, z, a }, true, true);
        const h = game.hero; h.pos.set(x, game.physics.groundAt(x, z), z); h.angle = a; game.camRig.recenter?.();
        // the same light and time of day every time: the clock stopped while the views are taken (if the game has one)
        if (game.env?.setTime && game.env.time != null) { window.__tlT ??= game.env.time; game.env.setTime(window.__tlT); }
      }, { room, x, z, a });
      await sleep(2500);
      await page.screenshot({ path: path.join(out, `${name}.jpg`), type: 'jpeg', quality: 88 });
      rec.evidence.push(`evidence/${folder}/${name}.jpg`);
    }
    assert(rec, 'views taken', true, views.length, views.length);
}

export const ART = [houseWalk, artShots];

// the interiors of WA-7 (later chapters: these pictures are for the developers, not shown to the player)
export const ROOM_VIEWS = ['school', 'wtent', 'archive', 'valves', 'condA', 'condB', 'butemple', 'control', 'projoffice', 'asylum', 'bumaze', 'buhalls', 'sewer', 'sewervault'].map((r) => [r, r, 0, 0, 0]);
export const artRooms = { ...artShots, id: 'art-rooms', title: 'World art: interiors (WA-7)', suites: ['artrooms'], timeoutS: 900,
  async run(ctx) { return shootViews(ctx, ROOM_VIEWS, 'rooms'); } };
ART.push(artRooms);

// ALL AREAS (the whole-game look against LBA1/LBA2): every area the game has, each from the player's own camera (two
// headings at its centre), an isometric view like the originals' (yaw 45°, 35° down, narrow lens, far off) and, for
// the outdoor ones, straight down over the whole area (to lay beside the original's ground map). The game's camera
// rig is held while the study views are taken, the fog pushed out, the hero hidden; all restored after each area.
// evidence/all/<area>-<view>.jpg (later chapters' areas: for the developers, not shown to the player).
// (WA-14: 'sewer' and 'sewervault', the Citadel sewers and their treasure room after LBA2's scenes 17 and 18, are in
//  the game's regions list, src/game/regions.js, so artall shoots them with the rest; the laptop compares 'sewer' with
//  scene 17 and 'sewervault' with scene 18)
const OUTDOOR = (id) => id === 'citadel' || id === 'desert' || id === 'hamalayi' || id === 'zeelich' || id.startsWith('isle_');
export const artAll = { ...artShots, id: 'art-all', title: 'World art: every area (player, iso, top-down views)', suites: ['artall'], timeoutS: 3600,
  async run(ctx) {
    const { page, rec, dir } = ctx;
    const out = path.join(dir, 'evidence', 'all'); fs.mkdirSync(out, { recursive: true });
    if ((await gameState(page)).state !== 'play') await newGame(page);
    const only = process.env.LBA3_AREAS ? process.env.LBA3_AREAS.split(',') : null;
    const areas = (await page.evaluate(() => ['citadel', ...[...game.regions.of.keys()]])).filter((a) => !only || only.includes(a));
    const info = [];
    for (const area of areas) {
      if (ctx.stopped?.()) break;
      let A;
      try {
        A = await page.evaluate(({ area }) => {
          game.resetCombat?.('drop');
          if (area === 'citadel') game.exitRoom({ x: -46, z: 2, a: 0 }, true, true); else game.enterRoom(area, null, true, true);
          const root = area === 'citadel' ? game.world.root : game.room?.group;
          if (!root) return { area, error: 'no room' };
          // the area's extent: its meshes, leaving out sky, sea and other planes far larger than any place
          const T = root.constructor; const b = { x0: -10, x1: 10, y0: 0, y1: 0, z0: -10, z1: 10 }, P = []; let n = 0;
          root.updateMatrixWorld(true);
          root.traverse((o) => {
            if (!o.isMesh || !o.geometry) return;
            if (!o.geometry.boundingSphere) o.geometry.computeBoundingSphere();
            const s = o.geometry.boundingSphere; if (!s) return;
            const c = s.center.clone().applyMatrix4(o.matrixWorld), r = s.radius * o.matrixWorld.getMaxScaleOnAxis();
            if (o.isInstancedMesh || r > 120 || !isFinite(r)) return;
            P.push([c.x, c.y, c.z]); n++;
          });
          // (the place itself: the 3rd to 97th percentile of its pieces' centres, 6 m round; one far piece doesn't widen it)
          const q = (k, f) => { const v = P.map((p) => p[k]).sort((a, b) => a - b); return v[Math.min(v.length - 1, Math.max(0, Math.round(f * (v.length - 1))))] ?? 0; };
          if (P.length) Object.assign(b, { x0: q(0, 0.03) - 6, x1: q(0, 0.97) + 6, y0: q(1, 0.03), y1: q(1, 0.97), z0: q(2, 0.03) - 6, z1: q(2, 0.97) + 6 });
          // (an outdoor area without a centre: the hero stays where the area's own arrival put him)
          const h = game.hero, c = area === 'citadel' ? { x: -46, z: 2 } : game.room.center ?? { x: h.pos.x, z: h.pos.z };
          if (game.room?.center || area === 'citadel') h.pos.set(c.x, game.physics.groundAt(c.x, c.z), c.z);
          h.angle = 0; game.camRig.recenter?.();
          if (game.env?.setTime && game.env.time != null) { window.__tlT ??= game.env.time; game.env.setTime(window.__tlT); }
          return { area, center: { x: c.x, z: c.z }, box: b, meshes: n };
        }, { area });
      } catch (e) { info.push({ area, error: e.message }); continue; }
      if (A.error) { info.push(A); continue; }
      await sleep(3000);
      const shot = async (view) => { const f = `${area}-${view}.jpg`; await page.screenshot({ path: path.join(out, f), type: 'jpeg', quality: 88 }); rec.evidence.push(`evidence/all/${f}`); };
      for (const [view, a] of [['player-n', 0], ['player-s', Math.PI]]) {
        await page.evaluate((a) => { game.hero.angle = a; game.camRig.recenter?.(); }, a); await sleep(1800); await shot(view);
      }
      const studies = [['iso', 'iso']]; if (OUTDOOR(area)) studies.push(['top', 'top']);
      for (const [view, kind] of studies) {
        await page.evaluate(({ kind, A }) => {
          const G = game, cam = G.camera, b = A.box;
          window.__tlHeld ??= { update: G.camRig.update, fog: G.scene.fog ? { near: G.scene.fog.near, far: G.scene.fog.far } : null, fov: cam.fov, far: cam.far, layers: G.hero.rig?.root?.layers?.mask };
          G.camRig.update = () => {};
          G.hero.rig?.root?.traverse?.((o) => o.layers.set(31));
          const cx = (b.x0 + b.x1) / 2, cz = (b.z0 + b.z1) / 2, cy = Math.max(0, (b.y0 + b.y1) / 2 * 0.3);
          const ext = Math.max(b.x1 - b.x0, b.z1 - b.z0, 8);
          const fov = kind === 'top' ? 30 : 20, dist = (ext * 0.55) / Math.tan((fov / 2) * Math.PI / 180) + ext * 0.2;
          cam.fov = fov; cam.far = dist * 3 + 500; cam.updateProjectionMatrix();
          if (kind === 'top') cam.position.set(cx, cy + dist, cz + 0.01);
          else { const yaw = Math.PI / 4, p = 35 * Math.PI / 180; cam.position.set(cx + Math.sin(yaw) * Math.cos(p) * dist, cy + Math.sin(p) * dist, cz + Math.cos(yaw) * Math.cos(p) * dist); }
          cam.lookAt(cx, cy, cz); cam.updateMatrixWorld();
          // (the environment sets the fog every frame: held out of reach while the study views are taken)
          const f = G.scene.fog; if (f && !f.__tlHeld) { f.__tlHeld = true; for (const k of ['near', 'far']) Object.defineProperty(f, k, { configurable: true, get: () => (k === 'near' ? 1e5 : 2e5), set() {} }); }
        }, { kind, A });
        await sleep(2500);
        await shot(view);
      }
      await page.evaluate(() => {
        const H = window.__tlHeld; if (!H) return; const G = game, cam = G.camera;
        G.camRig.update = H.update; delete G.camRig.update;   // (the prototype's again)
        const f = G.scene.fog; if (f?.__tlHeld) { delete f.near; delete f.far; delete f.__tlHeld; if (H.fog) { f.near = H.fog.near; f.far = H.fog.far; } }
        cam.fov = H.fov; cam.far = H.far; cam.updateProjectionMatrix();
        G.hero.rig?.root?.traverse?.((o) => o.layers.set(0));
        window.__tlHeld = null;
      });
      info.push(A);
    }
    fs.writeFileSync(path.join(out, 'areas.json'), JSON.stringify(info, null, 1));
    assert(rec, 'areas shot', info.filter((a) => !a.error).length >= areas.length - 2, `>= ${areas.length - 2}`, info.filter((a) => !a.error).length);
  } };
ART.push(artAll);

// WA-15 (a few Zeelich-style buildings on Citadel's harbour front): what stands on the waterfront, read from the
// running game, so a new building keeps every route, door, container and story spot clear; and fixed play-camera views
// of the harbour front (before / after). LBA3_HARBOUR_BOX=x0,z0,x1,z1 (default the harbour front), LBA3_HARBOUR_VIEWS
// = JSON [[name, x, z, heading], ...]. evidence/harbour/probe.json, top.jpg (straight down over the box), <name>.jpg.
export const HARBOUR_VIEWS = [
  ['hb-quay-north', -112, 40, 0], ['hb-quay-south', -112, 40, Math.PI], ['hb-path-west', -95, 38, -Math.PI / 2],
  ['hb-path-east', -105, 38.5, Math.PI / 2], ['hb-baggage', -86, 36, -Math.PI / 2],
];
export const artHarbour = { ...artShots, id: 'art-harbour', title: 'World art: the harbour front (WA-15 probe and views)', suites: ['artharbour'], timeoutS: 900,
  async run(ctx) {
    const { page, rec, dir } = ctx;
    const out = path.join(dir, 'evidence', 'harbour'); fs.mkdirSync(out, { recursive: true });
    if ((await gameState(page)).state !== 'play') await newGame(page);
    const box = (process.env.LBA3_HARBOUR_BOX || '-135,10,-60,70').split(',').map(Number);
    const views = process.env.LBA3_HARBOUR_VIEWS ? JSON.parse(process.env.LBA3_HARBOUR_VIEWS) : HARBOUR_VIEWS;
    const probe = await page.evaluate(([x0, z0, x1, z1]) => {
      const G = game; G.resetCombat?.('drop'); G.exitRoom({ x: (x0 + x1) / 2, z: (z0 + z1) / 2, a: 0 }, true, true);
      const inB = (x, z, m = 0) => x > x0 - m && x < x1 + m && z > z0 - m && z < z1 + m;
      const r2 = (v) => Math.round(v * 100) / 100;
      const cols = G.physics.colliders.filter((c) => c.enabled !== false && inB(c.x, c.z, 2)).map((c) => ({ type: c.type, x: r2(c.x), z: r2(c.z), hw: c.hw && r2(c.hw), hd: c.hd && r2(c.hd), r: c.r && r2(c.r), rot: c.rot && r2(c.rot), top: c.top != null ? r2(c.top) : null, noStand: !!c.noStand }));
      const doors = (G.story.doors?.() || []).filter((d) => !d.region && inB(d.x, d.z, 2)).map((d) => ({ room: d.room, x: r2(d.x), z: r2(d.z), r: d.r }));
      const containers = (G.world?.containers?.placed || []).filter((c) => inB(c.x, c.z, 2)).map((c) => ({ id: c.id, kind: c.kind, x: r2(c.x), z: r2(c.z) }));
      // the people: where they stand, and any list of points they walk (whatever the field is called)
      const npcs = [], routes = [];
      for (const n of G.npcs || []) {
        const p = n.pos || n.rig?.root?.position; if (!p) continue;
        const pts = [];
        for (const k of Object.keys(n)) { const v = n[k]; if (Array.isArray(v) && v.length > 1 && v.every((q) => q && typeof q.x === 'number' && typeof q.z === 'number')) pts.push({ k, pts: v.map((q) => [r2(q.x), r2(q.z)]) }); }
        const near = inB(p.x, p.z, 4) || pts.some((r) => r.pts.some(([x, z]) => inB(x, z)));
        if (!near) continue;
        npcs.push({ id: n.id || n.def?.id || n.name, x: r2(p.x), z: r2(p.z) });
        for (const r of pts) routes.push({ id: n.id || n.def?.id, field: r.k, pts: r.pts });
      }
      // the ground on a 1 m grid (rows of z, x0 → x1), for the shoreline and the slope under a new footprint
      const ground = []; for (let z = Math.ceil(z0); z <= z1; z++) { const row = []; for (let x = Math.ceil(x0); x <= x1; x++) row.push(r2(G.physics.groundAt(x, z))); ground.push(row); }
      return { box: [x0, z0, x1, z1], colliders: cols, doors, containers, npcs, routes, ground, hero: { x: r2(G.hero.pos.x), z: r2(G.hero.pos.z) } };
    }, box);
    fs.writeFileSync(path.join(out, 'probe.json'), JSON.stringify(probe, null, 1));
    rec.evidence.push('evidence/harbour/probe.json');
    // straight down over the box (the camera rig held, the fog pushed out, the hero hidden), for planning
    await page.evaluate(([x0, z0, x1, z1]) => {
      const G = game, cam = G.camera;
      window.__tlHeld = { fov: cam.fov, far: cam.far };
      G.camRig.update = () => {}; G.hero.rig?.root?.traverse?.((o) => o.layers.set(31));
      const ext = Math.max(x1 - x0, z1 - z0), dist = (ext * 0.55) / Math.tan(15 * Math.PI / 180);
      cam.fov = 30; cam.far = dist * 3; cam.updateProjectionMatrix();
      cam.position.set((x0 + x1) / 2, dist, (z0 + z1) / 2 + 0.01); cam.lookAt((x0 + x1) / 2, 0, (z0 + z1) / 2); cam.updateMatrixWorld();
      const f = G.scene.fog; if (f && !f.__tlHeld) { f.__tlHeld = true; for (const k of ['near', 'far']) Object.defineProperty(f, k, { configurable: true, get: () => (k === 'near' ? 1e5 : 2e5), set() {} }); }
    }, box);
    await sleep(2500);
    await page.screenshot({ path: path.join(out, 'top.jpg'), type: 'jpeg', quality: 90 }); rec.evidence.push('evidence/harbour/top.jpg');
    await page.evaluate(() => {
      const G = game, cam = G.camera, H = window.__tlHeld; delete G.camRig.update;
      const f = G.scene.fog; if (f?.__tlHeld) { delete f.near; delete f.far; delete f.__tlHeld; }
      cam.fov = H.fov; cam.far = H.far; cam.updateProjectionMatrix(); G.hero.rig?.root?.traverse?.((o) => o.layers.set(0)); window.__tlHeld = null;
    });
    // the play camera (one full frame per view, its own rig settled) and the frame's draw calls there
    const calls = {};
    for (const [name, x, z, a] of views) {
      await page.evaluate(({ x, z, a }) => {
        const h = game.hero; h.pos.set(x, game.physics.groundAt(x, z), z); h.angle = a; game.camRig.recenter?.();
        if (game.env?.setTime && game.env.time != null) { window.__tlT ??= game.env.time; game.env.setTime(window.__tlT); }
      }, { x, z, a });
      await sleep(2500);
      // (every draw of one whole frame, main and shadow passes, as tests/drawcalls.mjs counts them)
      calls[name] = await page.evaluate(() => new Promise((res) => {
        const R = game.renderer.renderer, orig = R.renderBufferDirect.bind(R), n = { main: 0, shadow: 0 };
        requestAnimationFrame(() => {
          R.renderBufferDirect = (cam, scene, ...a) => { n[scene ? 'main' : 'shadow']++; return orig(cam, scene, ...a); };
          requestAnimationFrame(() => { R.renderBufferDirect = orig; res({ ...n, total: n.main + n.shadow, quality: game.settings?.quality }); });
        });
      }));
      await page.screenshot({ path: path.join(out, `${name}.jpg`), type: 'jpeg', quality: 88 }); rec.evidence.push(`evidence/harbour/${name}.jpg`);
    }
    fs.writeFileSync(path.join(out, 'calls.json'), JSON.stringify(calls, null, 1));
    assert(rec, 'harbour probed and shot', probe.colliders.length > 0, '> 0 colliders', probe.colliders.length);
  } };
ART.push(artHarbour);

// GAME-1 (the user: Arthur, busy at home, turns to Twinsen whenever he passes): in the house at a new game, Twinsen
// placed 2 m from each person there; their heading measured over 2.5 s, and one frame. evidence/busy/<id>.jpg, busy.json
export const artBusy = { ...artShots, id: 'art-busy', title: 'People busy at something keep at it when Twinsen passes (GAME-1)', suites: ['artbusy'], timeoutS: 300,
  async run(ctx) {
    const { page, rec, dir } = ctx;
    const out = path.join(dir, 'evidence', 'busy'); fs.mkdirSync(out, { recursive: true });
    await newGame(page);
    await sleep(2500);
    const ids = await page.evaluate(() => game.npcs.filter((n) => n.present && n.distTo(game.hero) < 12).map((n) => n.def.id));
    const res = [];
    for (const id of ids) {
      const a0 = await page.evaluate((id) => {
        const n = game.npcs.find((q) => q.def.id === id), h = game.hero;
        // Twinsen 2 m off the person's right side, facing him (inside the 3.2 m "near" of NPC.update)
        const a = n.angle + Math.PI / 2, x = n.pos.x + Math.sin(a) * 2, z = n.pos.z + Math.cos(a) * 2;
        h.pos.set(x, game.physics.groundAt(x, z), z); h.angle = Math.atan2(n.pos.x - x, n.pos.z - z); game.camRig.recenter?.();
        return { angle: n.angle, anim: n.forceAnim || 'idle' };
      }, id);
      await sleep(2500);
      const a1 = await page.evaluate((id) => game.npcs.find((q) => q.def.id === id).angle, id);
      const turned = Math.abs(Math.atan2(Math.sin(a1 - a0.angle), Math.cos(a1 - a0.angle)));
      await page.screenshot({ path: path.join(out, `${id}.jpg`), type: 'jpeg', quality: 88 }); rec.evidence.push(`evidence/busy/${id}.jpg`);
      res.push({ id, anim: a0.anim, turnedDeg: Math.round(turned * 180 / Math.PI) });
    }
    fs.writeFileSync(path.join(out, 'busy.json'), JSON.stringify(res, null, 1));
    assert(rec, 'people measured', res.length > 0, '> 0', res.length);
  } };
ART.push(artBusy);

// LBA-CITADEL (LBA2's Citadel places that ours kept shut, each inside the building on its original's spot): each one
// walked — in by its house's door with real keys, a route inside through the player's own walking (the game's input
// reports a stick toward the next waypoint: the physics, steps and colliders as by hand; the story cancels hero.walkTo
// indoors), out by its own door — with its frames and draw calls. evidence/<room>/*.jpg, walk.json.
//   legs: [{ name, pts: [[x, z] room-local], minY? }]; the last leg ends at the room's exit.
function placeWalk({ id, title, suite, room, house, legs }) {
  return { ...artShots, id, title, suites: [suite, 'artplaces'], timeoutS: 600,
    async run(ctx) {
      const { page, rec, dir } = ctx;
      const out = path.join(dir, 'evidence', room); fs.mkdirSync(out, { recursive: true });
      if ((await gameState(page)).state !== 'play') await newGame(page);
      const shot = async (n) => { await page.screenshot({ path: path.join(out, n + '.jpg'), type: 'jpeg', quality: 88 }); rec.evidence.push(`evidence/${room}/${n}.jpg`); };
      const st = () => page.evaluate(() => ({ room: game.room?.id ?? 'citadel', x: +game.hero.pos.x.toFixed(2), y: +game.hero.pos.y.toFixed(2), z: +game.hero.pos.z.toFixed(2) }));
      // outside: the arrow keys the camera maps, each tried for a beat, the one that brings him nearer kept
      const keyTo = async (tx, tz, maxS = 12) => {
        const keys = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'], t0 = Date.now();
        while (Date.now() - t0 < maxS * 1000) {
          const p0 = await st(); const d0 = Math.hypot(p0.x - tx, p0.z - tz); if (d0 < 0.5) return true;
          let best = null, bd = d0;
          for (const k of keys) {
            await page.keyboard.down(k); await sleep(250); await page.keyboard.up(k); await sleep(80);
            const p = await st(); if (p.room !== p0.room) return true;
            const d = Math.hypot(p.x - tx, p.z - tz); if (d < bd - 0.05) { bd = d; best = k; break; }
          }
          if (!best) return false;
          await page.keyboard.down(best); await sleep(Math.min(1200, bd * 260)); await page.keyboard.up(best);
        }
        return false;
      };
      const walk = async (pts, maxS = 30) => {
        const res = await page.evaluate(async ({ pts, maxS, room }) => {
          const g = game, h = g.hero; if (!g.room) return 'not in a room'; const c = g.room.center, P = pts.map(([x, z]) => ({ x: c.x + x, z: c.z + z }));
          const om = g.input.move.bind(g.input), classic = g.settings.controls === 'classic';
          let k = 0, stuckT = 0, last = { x: h.pos.x, z: h.pos.z }, out = 'done';
          // (Modern: the stick that walks toward the waypoint under the camera's heading, Hero.moveDir inverted;
          //  Classic: forward along his heading, turned to the waypoint each tick)
          g.input.move = () => {
            const p = P[Math.min(k, P.length - 1)], dx = p.x - h.pos.x, dz = p.z - h.pos.z, d = Math.hypot(dx, dz) || 1, wx = dx / d, wz = dz / d;
            if (classic) { h.angle = Math.atan2(wx, wz); return { x: 0, y: 1, analog: true }; }
            const yaw = g.camRig.yaw, fx = -Math.sin(yaw), fz = -Math.cos(yaw), rx = Math.cos(yaw), rz = -Math.sin(yaw);
            return { x: wx * rx + wz * rz, y: wx * fx + wz * fz, analog: true };
          };
          const t0 = performance.now();
          try {
            while (k < P.length) {
              await new Promise((r) => setTimeout(r, 50));
              if (g.room?.id !== room) { out = 'left the room'; break; }
              const p = P[k]; if (Math.hypot(p.x - h.pos.x, p.z - h.pos.z) < 0.3) { k++; continue; }
              const moved = Math.hypot(h.pos.x - last.x, h.pos.z - last.z); last = { x: h.pos.x, z: h.pos.z };
              stuckT = moved < 0.01 ? stuckT + 0.05 : 0;
              if (stuckT > 1.5) { out = 'stuck before waypoint ' + k + ' at ' + (h.pos.x - c.x).toFixed(2) + ',' + (h.pos.z - c.z).toFixed(2); break; }
              if (performance.now() - t0 > maxS * 1000) { out = 'timeout at waypoint ' + k; break; }
            }
          } finally { g.input.move = om; }
          return out;
        }, { pts, maxS, room });
        await sleep(400); return res;
      };
      const log = [];
      // 1. outside, a few steps before the house's door; walk in
      const door = await page.evaluate((house) => { const h = game.world.houses.find((x) => x.id === house); game.resetCombat?.('drop'); game.exitRoom({ x: h.door.x + Math.sin(h.ry) * 3, z: h.door.z + Math.cos(h.ry) * 3, a: h.ry + Math.PI }, true, true); game.camRig.recenter?.(); return { x: h.door.x, z: h.door.z }; }, house);
      await sleep(2500); await shot('01-outside-door');
      // what the game offers at the door, 1.3 m before it and facing it (a "locked" prompt there would contradict the open door)
      const offer = await page.evaluate((house) => { const h = game.world.houses.find((x) => x.id === house), H = game.hero; H.pos.set(h.door.x + Math.sin(h.ry) * 1.3, game.physics.groundAt(h.door.x + Math.sin(h.ry) * 1.3, h.door.z + Math.cos(h.ry) * 1.3), h.door.z + Math.cos(h.ry) * 1.3); H.angle = h.ry + Math.PI; const it = game.findInteractable(); return it ? { kind: it.kind, label: it.label } : null; }, house);
      log.push({ offerAtDoor: offer });
      assert(rec, `no "locked" prompt at the ${house} building's open door`, offer?.kind !== 'locked', 'not locked', offer?.kind ?? 'none');
      await keyTo(door.x, door.z, 10); await sleep(3500);
      let s = await st(); log.push({ step: 'in by the door', ...s }); await shot('02-inside');
      log.push({ calls: await page.evaluate(() => new Promise((res) => {
        const R = game.renderer.renderer, orig = R.renderBufferDirect.bind(R), n = { main: 0, shadow: 0 };
        requestAnimationFrame(() => { R.renderBufferDirect = (cam, scene, ...a) => { n[scene ? 'main' : 'shadow']++; return orig(cam, scene, ...a); };
          requestAnimationFrame(() => { R.renderBufferDirect = orig; res({ ...n, total: n.main + n.shadow, quality: game.settings?.quality }); }); });
      })) });
      assert(rec, `the ${house} building's door leads into ${room}`, s.room === room, room, s.room);
      if (s.room !== room) { fs.writeFileSync(path.join(out, 'walk.json'), JSON.stringify(log, null, 1)); return; }
      // 2. the route inside, leg by leg; 3. the last leg out by the room's own door
      for (const [n, leg] of legs.entries()) {
        const res = await walk(leg.pts); s = await st(); log.push({ step: leg.name, result: res, ...s }); await shot(`${String(n + 3).padStart(2, '0')}-${leg.name.replace(/\W+/g, '-')}`);
        if (leg.minY != null) assert(rec, `${leg.name}: y ≥ ${leg.minY}`, s.y >= leg.minY, `>= ${leg.minY}`, s.y);
      }
      await sleep(3500); s = await st(); log.push({ step: 'out by the door', ...s }); await shot('99-out');
      assert(rec, `${room}'s door leads back to Citadel`, s.room === 'citadel', 'citadel', s.room);
      fs.writeFileSync(path.join(out, 'walk.json'), JSON.stringify(log, null, 1));
    } };
}
// Chez Luc (LBA-CITADEL-1, LBA2 scene 3, the 'south' house): past the bar to the stair's foot, up to the landing and
// the gallery, down again and out
export const artTavern = placeWalk({ id: 'art-tavern', title: 'Chez Luc: in by the door, up to the gallery, out again', suite: 'arttavern', room: 'tavern', house: 'south', legs: [
  { name: 'stair foot', pts: [[-1.5, 5.0], [-1.2, 0.5], [2.2, -0.2], [2.2, -2.35]] },
  { name: 'landing', pts: [[1.0, -2.35], [-2.6, -2.35], [-3.8, -2.35]], minY: 2.2 },
  { name: 'gallery', pts: [[-3.8, -3.6], [0.3, -3.8]], minY: 2.2 },
  { name: 'out', pts: [[-3.8, -3.6], [-3.8, -2.35], [1.0, -2.35], [2.2, -2.35], [2.2, -0.2], [-1.2, 0.5], [-1.5, 5.0], [-4.6, 6.1]] },
] });
ART.push(artTavern);
// Mr Bazoo's shop (LBA-CITADEL-2, LBA2 scene 14, the 'museum' building): round the counter to the goods along the
// back wall, past the Zeelich table, and out
export const artBazoo = placeWalk({ id: 'art-bazoo', title: "Mr Bazoo's shop: in by the door, round the counter, out again", suite: 'artbazoo', room: 'bazoo', house: 'museum', legs: [
  { name: 'behind the counter', pts: [[-2.2, 1.8], [-2.4, -1.6], [0.2, -1.7]] },
  { name: 'by the Zeelich goods', pts: [[2.6, -1.4], [3.0, -0.9]] },
  { name: 'out', pts: [[2.8, 1.6], [0.2, 1.7], [-2.6, 1.8], [-3.9, 1.8]] },
] });
ART.push(artBazoo);
