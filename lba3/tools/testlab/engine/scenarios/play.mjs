// Gameplay tests: quests and doors, the magic ball, the sword, combat, regions (cold and warm entry), save/restart/
// load, death and respawn, pause/focus/fullscreen, the opening, memory over a long walk. Each says how it drives the
// game (real input, the game's API, injected state, preloaded assets) and asserts the outcome, not just "no crash".
import { assert, newGame, replay, hold, measure, dist, Blocked } from './common.mjs';
import { gameState, counters, installProbe } from '../probe.mjs';
import { launch, setFullscreen } from '../launch.mjs';
import { sleep } from '../util.mjs';
import { STREET_START } from './core.mjs';

const M = (realInput, testApi, injectedState, preloadedAssets = false) => ({ realInput, testApi, injectedState, preloadedAssets });
const ev = (page, fn, arg) => page.evaluate(fn, arg);
const until = async (page, fn, arg, ms = 10000, step = 100) => { const t = Date.now(); for (;;) { const v = await page.evaluate(fn, arg); if (v) return v; if (Date.now() - t > ms) return null; await sleep(step); } };
// dialogue: the interact key (E), as a player reads through it
async function talkThrough(page, max = 40) { for (let i = 0; i < max && (await ev(page, () => game.state)) === 'dialog'; i++) { await page.keyboard.press('KeyE'); await sleep(250); } }
async function ensurePlay(page) { if ((await gameState(page)).state !== 'play') await newGame(page); }
const toStreet = (page) => ev(page, (s) => { game.resetCombat?.('drop'); game.exitRoom(s, true, true); }, STREET_START);

// --- quests and doors -------------------------------------------------------------------------------------------
export const cupboardQuest = {
  id: 'quest-cupboard', title: 'Quest: take the ball from the cupboard', group: 'quests', suites: ['full'], session: 'warm', timeoutS: 240,
  method: M(true, true, true),   // a new game; Twinsen placed at the cupboard (as the story test does); E pressed for real
  async run(ctx) {
    const { page, rec } = ctx;
    await newGame(page);
    const o0 = await ev(page, () => ({ ball: game.hero.hasBall, obj: game.story.objective?.() || '', room: game.room?.id }));
    assert(rec, 'starts without the ball, in the house', !o0.ball && o0.room === 'house', 'no ball, house', `${o0.ball ? 'ball' : 'no ball'}, ${o0.room}`);
    await ev(page, () => { const s = game.room.searches[0]; game.hero.pos.set(s.x + 0.3, game.physics.groundAt(s.x + 0.3, s.z), s.z); game.hero.angle = -Math.PI / 2; });
    await sleep(400);
    await page.keyboard.press('KeyE'); await sleep(600); await talkThrough(page);
    const o1 = await ev(page, () => ({ ball: game.hero.hasBall, obj: game.story.objective?.() || '', state: game.state }));
    assert(rec, 'the cupboard gives the ball', o1.ball, 'hasBall', o1.ball);
    assert(rec, 'the objective moves on', o1.obj !== o0.obj, 'a new objective', o1.obj.replace(/<[^>]+>/g, ' ').slice(0, 80));
    // the quest step happens once: searching again gives nothing new and changes no objective
    await page.keyboard.press('KeyE'); await sleep(600); await talkThrough(page);
    const o2 = await ev(page, () => ({ obj: game.story.objective?.() || '', searched: [...(game.flags.searched ?? game.searched ?? [])].length }));
    assert(rec, 'the step advances only once', o2.obj === o1.obj, 'objective unchanged on a second search', o2.obj === o1.obj ? 'unchanged' : 'changed again');
  },
};

export const houseDoor = {
  id: 'door-house-exit', title: 'Door: leave the house by walking through it', group: 'transitions', suites: ['quick', 'full'], session: 'warm', timeoutS: 240,
  method: M(true, true, true),   // placed 1.6 m inside the door (toward the room's centre), facing it; then ↑ held for real until the room changes
  async run(ctx) {
    const { page, rec } = ctx;
    if ((await ev(page, () => game.room?.id)) !== 'house') { await newGame(page); }
    await ev(page, () => { const h = game.hero; h.hasBall = true; const e = game.room.exits.find((x) => x.to === 'outdoor') || game.room.exits[0], c = game.room.center; const d = Math.hypot(c.x - e.x, c.z - e.z) || 1; const x = e.x + ((c.x - e.x) / d) * 1.6, z = e.z + ((c.z - e.z) / d) * 1.6; h.pos.set(x, game.physics.groundAt(x, z), z); h.angle = Math.atan2(e.x - x, e.z - z); });
    await sleep(500);
    const m = await measure(ctx, 'walk through the door', async () => {
      await page.keyboard.down('ArrowUp');
      const r = await until(page, () => game.room == null || game.room.id !== 'house', null, 8000);
      await page.keyboard.up('ArrowUp');
      // the fade ends and control returns
      await until(page, () => !game.trans && game.state === 'play' && !document.querySelector('#fade')?.classList.contains('on'), null, 15000);
      await sleep(1500);
      return r;
    });
    const s = await gameState(page), fade = await ev(page, () => document.querySelector('#fade')?.classList.contains('on'));
    assert(rec, 'the door leads outside to the Citadel', s.room === 'citadel', 'citadel', s.room);
    assert(rec, 'no black screen left behind', !fade && !s.trans, 'fade off, no transition', `fade ${fade ? 'on' : 'off'}, transition ${s.trans}`);
    assert(rec, 'control returns', s.state === 'play', 'play', s.state);
    rec.windows.at(-1).note = `visible stalls ${m.stats?.stallsVisible}, behind the fade ${m.stats?.stallsBehindLoading}`;
  },
};

// --- weapons ---------------------------------------------------------------------------------------------------
export const magicBall = {
  id: 'magic-ball', title: 'Magic ball: throw, flight, return', group: 'combat', suites: ['quick', 'full'], session: 'warm', timeoutS: 180,
  method: M(true, true, true),   // ball given if missing (injected); F tapped for real; the ball's state read each 30 ms
  async run(ctx) {
    const { page, rec } = ctx;
    await ensurePlay(page); await toStreet(page); await sleep(2000);
    await ev(page, () => { const h = game.hero; h.hasBall = true; h.combat?.equip?.('ball'); game.ball.reset?.(); h.angle = Math.PI / 2; });
    await sleep(300);
    const seen = [];
    const watch = (async () => { const t = Date.now(); while (Date.now() - t < 6000) { const st = await ev(page, () => game.ball.state); if (seen.at(-1) !== st) seen.push(st); await sleep(30); } })();
    await sleep(200); await page.keyboard.press('KeyF');
    await watch;
    assert(rec, 'the ball leaves the hand', seen.includes('fly'), 'state fly seen', seen.join(' → '));
    assert(rec, 'it comes back', seen.includes('return') || seen.includes('impact'), 'impact or return seen', seen.join(' → '));
    assert(rec, 'it ends back in the hand', seen.at(-1) === 'idle', 'ends idle', seen.at(-1));
    // charged throw: F held 0.9 s
    const s2 = []; const w2 = (async () => { const t = Date.now(); while (Date.now() - t < 6000) { const st = await ev(page, () => game.ball.state); if (s2.at(-1) !== st) s2.push(st); await sleep(30); } })();
    await replay(page, hold('KeyF', 0, 0.9)); await w2;
    assert(rec, 'a charged throw also returns', s2.includes('fly') && s2.at(-1) === 'idle', 'fly … idle', s2.join(' → '));
  },
};

export const swordSwitch = {
  id: 'sword-switch', title: 'Sword and weapon switching', group: 'combat', suites: ['full'], session: 'warm', timeoutS: 120,
  method: M(true, true, true),   // sword and ball given (injected); R (swap) and K (attack) pressed for real
  async run(ctx) {
    const { page, rec } = ctx;
    await ensurePlay(page); await toStreet(page); await sleep(1500);
    await ev(page, () => { const h = game.hero; h.hasBall = true; h.hasSword = true; h.combat?.equip?.('ball'); });
    const w0 = await ev(page, () => game.hero.combat?.weapon);
    await page.keyboard.press('KeyR'); await sleep(500);
    const w1 = await ev(page, () => game.hero.combat?.weapon);
    assert(rec, 'R switches the weapon', w1 && w1 !== w0, `not ${w0}`, w1);
    if (w1 !== 'sword') { await ev(page, () => game.hero.combat.equip('sword')); }
    const anims = new Set();
    const watch = (async () => { const t = Date.now(); while (Date.now() - t < 1500) { anims.add(await ev(page, () => game.hero.rig?.anim)); await sleep(40); } })();
    await page.keyboard.press('KeyK'); await sleep(120); await page.keyboard.press('KeyK'); await watch;
    assert(rec, 'K plays a sword attack', [...anims].some((a) => /attack|slash|sword|swing|strike|combo/i.test(a || '')), 'an attack animation', [...anims].join(', '));
    await page.keyboard.press('KeyR'); await sleep(500);
    const w2 = await ev(page, () => game.hero.combat?.weapon);
    assert(rec, 'R switches back', w2 !== 'sword', 'not sword', w2);
  },
};

export const combatArena = {
  id: 'combat-arena', title: 'Combat in the arena', group: 'combat', suites: ['quick', 'full'], session: 'warm', timeoutS: 240,
  method: M(true, true, true),   // the arena (game.devArena) with its enemies; fought with real keys: F throws, K strikes, arrows
  async run(ctx) {
    const { page, rec } = ctx;
    await ensurePlay(page);
    await ev(page, () => { const h = game.hero; h.hasBall = true; h.hasSword = true; game.devArena(); game.state = 'play'; for (const e of game.enemies) if (e.id?.startsWith('a_')) e.setPresent(true); });
    await sleep(2000);
    const hp0 = await ev(page, () => game.enemies.filter((e) => e.id?.startsWith('a_') && e.present !== false).reduce((a, e) => a + (e.hp || 0), 0));
    if (!hp0) throw new Blocked('no arena enemies present');
    const tl = []; for (let t = 0; t < 14; t += 0.7) tl.push([t, 'tap', 'KeyF']);
    tl.push(...hold('ArrowLeft', 2, 2.6), ...hold('ArrowUp', 3, 4.5), ...hold('ArrowRight', 6, 6.5), ...hold('ArrowUp', 7, 8));
    const m = await measure(ctx, 'arena fight 15 s', () => replay(page, tl, ctx.stopped));
    const s = await ev(page, () => ({ hp: game.enemies.filter((e) => e.id?.startsWith('a_')).reduce((a, e) => a + Math.max(0, e.hp || 0), 0), hero: game.hero.hp, dead: game.hero.dead, state: game.state }));
    assert(rec, 'the enemies take damage', s.hp < hp0, `< ${hp0}`, s.hp);
    assert(rec, 'Twinsen is alive and playing', !s.dead && ['play', 'dialog'].includes(s.state), 'alive, play', `${s.dead ? 'dead' : 'alive'}, ${s.state}`);
    assert(rec, 'frames recorded', m.stats?.frames > 300, '> 300', m.stats?.frames);
    await ev(page, () => game.resetCombat?.('drop'));
  },
};

// --- regions: cold (first) and warm (second) entry ----------------------------------------------------------------
const REGIONS = ['zeelich', 'desert', 'hamalayi'];
export const regionEntry = {
  id: 'region-entry', title: 'Regions: first and second visit', group: 'regions', suites: ['full'], session: 'fresh', timeoutS: 600,
  method: M(false, true, false),   // the game's own door (enterRoom with its fade), as a ship or a door does; nothing preloaded
  async run(ctx) {
    const { page, rec } = ctx;
    await newGame(page); await toStreet(page); await sleep(2000);
    for (const visit of ['first', 'second']) for (const id of REGIONS) {
      if (ctx.stopped()) return;
      const pre = await ev(page, (id) => game.regions.stateOf?.(id), id);
      const m = await measure(ctx, `${id} · ${visit} visit (built before: ${pre})`, async () => {
        await ev(page, (id) => { game.hud?._bases?.delete(id); game.enterRoom(id, null, false, true); }, id);
        const ok = await until(page, (id) => game.room?.id === id && !game.trans && game.state === 'play', id, 60000);
        await sleep(6000); return ok;
      });
      const s = await gameState(page);
      assert(rec, `${id} ${visit} visit arrives`, s.room === id && !s.trans, id, `${s.room}${s.trans ? ' (in transition)' : ''}`);
      rec.windows.at(-1).entry = visit;
      await ev(page, (s) => game.exitRoom(s, false, true), STREET_START);
      await until(page, () => game.room?.id == null || game.room?.id === 'citadel', null, 30000); await sleep(2500);
    }
  },
};

// the benchmark's own repeated visits (cold entry, cycles, sustained play, resource snapshots): its report kept as evidence
export const repeatedVisits = {
  id: 'repeated-visits', title: 'Repeated visits and resource growth (game.bench.visits)', group: 'regions', suites: ['full'], session: 'warm', timeoutS: 900,
  method: M(false, true, true, true),   // the benchmark drives (teleports along fixed routes); it prepares its areas first
  async run(ctx) {
    const { page, rec, dir } = ctx;
    await ensurePlay(page);
    const text = await ev(page, () => game.bench.visits({ routes: ['street', 'arrival'], cycles: 3, sustainS: 60 }));
    if (!text) throw new Blocked('the benchmark was busy or refused');
    (await import('node:fs')).writeFileSync(`${dir}/evidence/repeated-visits.txt`, text); rec.evidence.push('evidence/repeated-visits.txt');
    const g = text.match(/growth over the cycles and the sustained play: geometries (-?\d+) · textures (-?\d+) · programs (-?\d+).*?heap (-?[\d.]+|\?)/);
    if (g) {
      assert(rec, 'GPU geometries do not grow over repeated visits', +g[1] <= 20, '≤ 20', g[1]);
      assert(rec, 'GPU textures do not grow over repeated visits', +g[2] <= 5, '≤ 5', g[2]);
      assert(rec, 'JS heap growth over repeated visits', g[4] === '?' || +g[4] < 30, '< 30 MB', g[4] + ' MB');
    } else assert(rec, 'the visits report has a growth line', false, 'growth line', 'not found');
  },
};

// --- save, exit, restart, load -------------------------------------------------------------------------------------
export const saveRestartLoad = {
  id: 'save-restart-load', title: 'Save, exit, restart and load', group: 'saves', suites: ['quick', 'full'], session: 'warm', timeoutS: 600,
  method: M(true, true, true),   // a known state set (position, coins, ball); saved by the game; the game closed and started again; Continue clicked
  async run(ctx) {
    const { rec } = ctx; let page = ctx.page;
    await ensurePlay(page); await toStreet(page); await sleep(1500);
    await ev(page, () => { const h = game.hero; h.hasBall = true; h.coins = 37; });
    await replay(page, hold('ArrowUp', 0, 1.5)); await sleep(800);   // (walked there on the ground: a save in mid-air keeps the last safe point, by design)
    const r = await ev(page, () => game.save(false));
    const want = await ev(page, () => ({ coins: game.hero.coins, ball: game.hero.hasBall, room: game.room?.id ?? 'citadel', pos: [game.hero.pos.x, game.hero.pos.z], chapter: game.flags.chapterKey }));
    assert(rec, 'the game saves', r === 'ok', 'ok', r);
    if (r !== 'ok') return;
    // exit the game completely and start it again on the same test profile
    await ctx.H.close();
    const H2 = await launch({ target: ctx.cfg.target, game: ctx.cfg.game, project: ctx.cfg.project, profileDir: ctx.H.profileDir, query: '?nocine', appArgs: ctx.cfg.appArgs || [] });
    ctx.H.replaced = H2; page = H2.page; await installProbe(page);
    const cont = await ev(page, () => !!document.querySelector('[data-act="continue"]') && getComputedStyle(document.querySelector('[data-act="continue"]')).display !== 'none');
    assert(rec, 'Continue is offered after the restart', cont, 'Continue visible', cont);
    if (!cont) return;
    await page.click('[data-act="continue"]');
    await until(page, () => game.state === 'play' && !game.trans, null, 120000);
    await sleep(1000);
    const got = await ev(page, () => ({ coins: game.hero.coins, ball: game.hero.hasBall, room: game.room?.id ?? 'citadel', pos: [game.hero.pos.x, game.hero.pos.z], chapter: game.flags.chapterKey }));
    assert(rec, 'same place after loading', got.room === want.room && dist([got.pos[0], 0, got.pos[1]], [want.pos[0], 0, want.pos[1]]) < 2, `${want.room} near ${want.pos.map((v) => v.toFixed(1))}`, `${got.room} at ${got.pos.map((v) => v.toFixed(1))}`);
    assert(rec, 'coins kept', got.coins === want.coins, want.coins, got.coins);
    assert(rec, 'inventory kept (the ball)', got.ball === true, 'ball', got.ball);
    assert(rec, 'chapter kept', got.chapter === want.chapter, want.chapter, got.chapter);
  },
};

// --- death and respawn ---------------------------------------------------------------------------------------------
export const deathRespawn = {
  id: 'death-respawn', title: 'Death and respawn', group: 'saves', suites: ['full'], session: 'warm', timeoutS: 300,
  method: M(true, true, true),   // no clovers, a fatal hit (injected); Retry clicked for real
  async run(ctx) {
    const { rec } = ctx; let page = ctx.page;
    await ensurePlay(page); await toStreet(page); await sleep(1000);
    await ev(page, () => game.save(false));
    await ev(page, () => { const h = game.hero; h.clovers = 0; h.damage(99); });
    const over = await until(page, () => game.state === 'gameover', null, 15000);
    assert(rec, 'game over after a fatal hit without clovers', over, 'gameover', await ev(page, () => game.state));
    if (!over) return;
    const reloaded = page.waitForEvent('load', { timeout: 60000 }).catch(() => null);   // (handled: never an unhandled rejection)
    await page.click('#gameover [data-act="retry"]');
    await reloaded;
    await until(page, () => window.game && game.state === 'play' && !game.trans, null, 120000);
    await installProbe(page);
    const s = await ev(page, () => ({ hp: game.hero.hp, dead: game.hero.dead, state: game.state }));
    assert(rec, 'back in play with life after Retry', s.state === 'play' && s.hp > 0 && !s.dead, 'play, hp > 0', `${s.state}, hp ${s.hp}`);
  },
};

// --- pause, focus, fullscreen --------------------------------------------------------------------------------------
export const pauseFocus = {
  id: 'pause-focus-fullscreen', title: 'Pause, resume, focus loss, fullscreen', group: 'system', suites: ['quick', 'full'], session: 'warm', timeoutS: 180,
  method: M(true, false, false),
  async run(ctx) {
    const { page, rec, H } = ctx;
    await ensurePlay(page);
    await page.keyboard.press('Escape'); await sleep(500);
    assert(rec, 'Esc pauses', (await ev(page, () => game.state)) === 'pause', 'pause', await ev(page, () => game.state));
    await page.keyboard.press('Escape'); await sleep(500);
    assert(rec, 'Esc resumes', (await ev(page, () => game.state)) === 'play', 'play', await ev(page, () => game.state));
    // focus loss: the window blurred as when the player switches to another program
    if (H.app) {
      await H.app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].blur()); await sleep(800);
      const st = await ev(page, () => ({ state: game.state, bg: !!game.background }));
      // by design (PERF-BATTERY) play goes on behind another window, drawn at the background rate; a cinematic pauses instead
      assert(rec, 'losing focus: the game draws in the background', st.bg && st.state === 'play', 'background drawing, still play', `background ${st.bg}, ${st.state}`);
      await H.app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].focus()); await sleep(800);
      const st2 = await ev(page, () => ({ state: game.state, bg: !!game.background }));
      assert(rec, 'focus back: full rate again', !st2.bg && st2.state === 'play', 'not background, play', `background ${st2.bg}, ${st2.state}`);
    } else rec.note = 'focus loss: Not Tested in the browser build';
    const size0 = await ev(page, () => [innerWidth, innerHeight]);
    await setFullscreen(H, false); await sleep(1000);
    const size1 = await ev(page, () => [innerWidth, innerHeight, game.renderer.renderer.domElement.width]);
    await setFullscreen(H, true); await sleep(1000);
    const size2 = await ev(page, () => [innerWidth, innerHeight, game.renderer.renderer.domElement.width, game.state]);
    assert(rec, 'leaving fullscreen resizes the view', size1[0] !== size0[0] || size1[1] !== size0[1], 'a different size', `${size0} → ${size1.slice(0, 2)}`);
    assert(rec, 'back to fullscreen and still playing', size2[0] === size0[0] && size2[1] === size0[1] && size2[3] === 'play', `${size0}, play`, `${size2.slice(0, 2)}, ${size2[3]}`);
  },
};

// --- the opening cinematic -----------------------------------------------------------------------------------------
export const openingCinematic = {
  id: 'opening-cinematic', title: 'Opening cinematic: playback and handover', group: 'cinematic', suites: ['full'], session: 'fresh', query: '', timeoutS: 300,
  method: M(true, false, false),   // no ?nocine: New Game plays the opening; 12 s measured, then E held to skip
  async run(ctx) {
    const { page, rec } = ctx;
    await page.waitForFunction(() => game.screen === 'title' && !game.preparing && !!document.querySelector('[data-act="new"]')?.offsetParent, null, { timeout: 300000 });
    await page.click('[data-act="new"]');
    const run = await until(page, () => game.cine?.state === 'run', null, 60000);
    assert(rec, 'the opening starts', run, 'cine running', await ev(page, () => game.cine?.state ?? 'none'));
    if (!run) return;
    const m = await measure(ctx, 'opening playback 12 s', () => sleep(12000));
    const adv = await ev(page, () => game.cine?.t ?? null);
    assert(rec, 'the opening advances', m.stats?.frames > 300, '> 300 frames', m.stats?.frames);
    await replay(page, hold('KeyE', 0, 1.3));
    const back = await until(page, () => game.state === 'play' && !game.cine && !game.camRig.cine && game.flags.opening && game.room?.id === 'house' && !document.querySelector('#fade')?.classList.contains('on'), null, 20000);
    assert(rec, 'controls return after the opening', back, 'play in the house, flags.opening', JSON.stringify(await gameState(page)));
    const p0 = (await gameState(page)).pos; await replay(page, hold('ArrowUp', 0, 1)); const p1 = (await gameState(page)).pos;
    assert(rec, 'Twinsen moves after the opening', dist(p0, p1) > 0.4, '> 0.4 m', `${dist(p0, p1).toFixed(2)} m`);
    rec.cineT = adv;
  },
};

// --- memory over a long walk ----------------------------------------------------------------------------------------
export const longWalk = {
  id: 'memory-long-walk', title: 'Extended traversal: memory and GPU resources', group: 'performance', suites: ['full'], session: 'warm', timeoutS: 600,
  method: M(true, true, true),
  async run(ctx) {
    const { page, rec } = ctx;
    await ensurePlay(page); await toStreet(page); await sleep(3000);
    const c0 = await counters(page);
    const tl = []; for (let k = 0; k < 9; k++) { const b = k * 20; tl.push(...hold('ArrowUp', b, b + 3), ...hold('ArrowRight', b + 3, b + 4), ...hold('ArrowUp', b + 4, b + 7), ...hold('ArrowRight', b + 7, b + 8), ...hold('ArrowUp', b + 8, b + 11), ...hold('ArrowRight', b + 11, b + 12), ...hold('ArrowUp', b + 12, b + 15), ...hold('ArrowRight', b + 15, b + 16), ...hold('ArrowUp', b + 16, b + 20)); }
    await measure(ctx, 'street loop 3 min', async () => { for (let k = 0; k < 9 && !ctx.stopped(); k++) { await replay(page, tl.filter(([t]) => t >= k * 20 && t < k * 20 + 20).map(([t, a, b]) => [t - k * 20, a, b]), ctx.stopped); await ev(page, (s) => { if (Math.hypot(game.hero.pos.x - s.x, game.hero.pos.z - s.z) > 25) game.exitRoom(s, true, true); }, STREET_START); } });
    const c1 = await counters(page);
    rec.resources = { before: c0, after: c1 };
    assert(rec, 'GPU geometries stable over 3 min', c1.geometries - c0.geometries <= 20, '≤ +20', `${c0.geometries} → ${c1.geometries}`);
    assert(rec, 'GPU textures stable over 3 min', c1.textures - c0.textures <= 5, '≤ +5', `${c0.textures} → ${c1.textures}`);
    if (c0.heapMB != null) assert(rec, 'JS heap stable over 3 min', c1.heapMB - c0.heapMB < 40, '< +40 MB', `${c0.heapMB} → ${c1.heapMB} MB`);
  },
};
