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
