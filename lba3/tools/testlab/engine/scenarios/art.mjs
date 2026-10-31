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
  ['stone-house', null, -28.6, -15, Math.PI], ['twinsen-door', null, -44.5, 82.4, -Math.PI / 2], ['nbr-door', null, -29, 75.3, -Math.PI / 2], ['baggage-hall', null, -84.2, 36, Math.PI],
  ['house-main', 'house', 0, 0, 0], ['house-back', 'house', 0, 0, Math.PI],
];
export const artShots = {
  id: 'art-shots', title: 'World art: fixed views (Citadel street, house)', group: 'visual', suites: ['art', 'artshots'], session: 'warm', timeoutS: 300,
  method: M(false, true, true),
  async run(ctx) {
    const { page, rec, dir } = ctx;
    const out = path.join(dir, 'evidence', 'views'); fs.mkdirSync(out, { recursive: true });
    if ((await gameState(page)).state !== 'play') await newGame(page);
    for (const [name, room, x, z, a] of VIEWS) {
      await page.evaluate(({ room, x, z, a }) => {
        game.resetCombat?.('drop');
        if (room) { game.enterRoom(room, null, true, true); const c = game.room.center; x += c.x; z += c.z; } else game.exitRoom({ x, z, a }, true, true);
        const h = game.hero; h.pos.set(x, game.physics.groundAt(x, z), z); h.angle = a; game.camRig.recenter?.();
        // the same light and time of day every time: the clock stopped while the views are taken (if the game has one)
        if (game.env?.setTime && game.env.time != null) { window.__tlT ??= game.env.time; game.env.setTime(window.__tlT); }
      }, { room, x, z, a });
      await sleep(2500);
      await page.screenshot({ path: path.join(out, `${name}.jpg`), type: 'jpeg', quality: 88 });
      rec.evidence.push(`evidence/views/${name}.jpg`);
    }
    assert(rec, 'views taken', true, VIEWS.length, VIEWS.length);
  },
};

export const ART = [houseWalk, artShots];
