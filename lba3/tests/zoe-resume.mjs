// D5 (docs/lba3-production/QA.md): a save made in Zoé's segment of chapter 2 (The Joint Project) after she found
// the plan; the game is closed; Continue. She must start her segment again from the station gate and be able
// to find the plan again. ISO: the chapter flags up to "meet Zoé" are set directly; everything after is played
// through the input harness (stealth past the guard).
import { launch, open, menu, checker } from './lib/boot.mjs';
const { check, done } = checker();
const { browser, context, page, errs } = await launch();
await open(page, '?nocine'); await menu(page, 'new');
const a = await page.evaluate(() => {
  const G = game, f = G.flags; P.settle();
  Object.assign(f, { prologueDone: true, intro: true }); G.hero.hasBall = true; G.story.nextChapter(); P.settle();
  Object.assign(f, { c1_home: true, c1_arrived: true, c1_task: true, c1_map: true, c1_valve_depot: true, c1_valve_orchard: true, c1_valve_cliff: true, c1_water: true, c1_tour: true, c1_needZoe: true });
  G.story.applyFlags(); G.exitRoom({ x: -40, z: -5, a: 0 }, true); P.settle();
  const r = P.talk('zoe', { run: true }); P.wait(1); P.settle();
  const out = { talk: r, room: G.room?.id, body: G.hero.body, zoeStart: f.c1_zoeStart };
  const L = G.room.searches.find((s) => s.id === 'locker2');
  for (let k = 0; k < 6 && !f.c1_plan; k++) { out['sneak' + k] = P.sneakTo(L.x, L.z, G.story.cur.watcher, { tol: 0.9 }); out['try' + k] = P.use(L.x, L.z, { near: 0.9 }); P.wait(1.5); P.settle(); }
  out.plan = f.c1_plan; out.searched = [...G.searched];
  out.saved = JSON.parse(localStorage.getItem('lba3_save_v1')).flags.c1_plan;
  return out;
});
check('setup: Zoé found the plan and the game autosaved it', a.plan && a.saved, a);
// the player closes the game here (no Quit menu: the last autosave is what's on disk) and comes back
await page.goto('about:blank');
await open(page, '?nocine'); await menu(page, 'continue');
const b = await page.evaluate(() => {
  const G = game, f = G.flags; P.settle();
  const out = { room: G.room?.id ?? 'citadel', body: G.hero.body, ball: G.hero.hasBall, beh: G.hero.behaviour, f: { zoeStart: f.c1_zoeStart, plan: f.c1_plan, zoeDone: f.c1_zoeDone }, searched: [...G.searched], obj: P.state().obj };
  // carry on as a player would: talk to Zoé again, look for the plan
  out.outside = !G.room;
  if (!G.room) out.talk = P.talk('zoe', { run: true }); P.wait(1); P.settle();
  out.body2 = G.hero.body;
  out.room2 = G.room?.id;
  if (G.room?.id === 'projoffice') {
    out.lockersOffered = G.room.searches.filter((s) => !G.searched.includes(s.id)).map((s) => s.id);
    const L = G.room.searches.find((s) => s.id === 'locker2');
    for (let k = 0; k < 6 && !f.c1_plan; k++) { out['sn' + k] = P.sneakTo(L.x, L.z, G.story.cur.watcher, { tol: 0.9 }); out['use' + k] = P.use(L.x, L.z, { near: 0.9 }); P.wait(1.5); P.settle(); }
    out.plan2 = f.c1_plan;
    const e = G.room.exits[0]; out.sneakOut = P.sneakTo(e.x, e.z, G.story.cur.watcher, { tol: 0.6 }); out.exit = P.through(e.x, e.z);
  }
  out.final = P.state(); out.zoeDone = f.c1_zoeDone; out.bodyEnd = G.hero.body;
  return out;
});
check('Continue: Twinsen outside at the gate, the objective back to "meet Zoé"', b.outside && /Zo/.test(b.obj), b);
check('Continue: back as Twinsen with his own ball (the save was taken after Zoé\'s swap)', b.body !== 'zoe' && b.ball === true && b.beh !== 'discreet', b);
check('Continue: the lockers can be searched again', b.lockersOffered?.includes('locker2'), b);
check('Continue: Zoé finds the plan again and gets out; the chapter goes on', b.plan2 && b.zoeDone && b.bodyEnd === 'twinsen' && b.final.room === 'citadel', b);
const fails = done(errs);
await browser.close();
process.exit(fails ? 1 : 0);
