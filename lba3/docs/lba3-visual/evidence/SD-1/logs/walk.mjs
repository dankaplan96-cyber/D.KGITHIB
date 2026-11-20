// SD-1 walk check by input (tests/lib/player.js P.go): routes through the dressed places; no blocking.
import { launch, open, menu, checker } from '/home/user/geriatrics-course/.claude/worktrees/agent-a1c4957c846e50461/lba2-remaster/tests/lib/boot.mjs';
const { check, done } = checker();
const { browser, page, errs } = await launch();
const ev = (f, a) => page.evaluate(f, a);
await open(page, '?nocine'); await menu(page, 'new');
await ev(() => { const G = game, f = G.flags; P.settle(); Object.assign(f, { prologueDone: true, intro: true, chapterKey: 'project' }); f.chapter = G.story.chapters.findIndex((c) => c.key === 'project'); G.hero.hasBall = true; G.story.refreshCast(); });
// legs: [name, from {x,z} | null (carry on), to {x,z}, tol, run]
const legs = await ev(() => {
  const G = game, h = G.hero, S = G.world.spaceport, out = [];
  const leg = (name, from, to, tol = 0.8, run = true) => {
    if (from) G.exitRoom({ x: from.x, z: from.z, a: from.a ?? 0 }, true);
    P.settle();
    const n0 = P.trace.length;
    const r = P.go(to.x, to.z, { tol, run, maxT: 200 });
    const notes = P.trace.slice(n0);
    out.push({ name, r: r.r, t: +(r.t || 0).toFixed(1), stuck: notes.filter((s) => /stuck/.test(s)).length, at: [h.pos.x, h.pos.y, h.pos.z].map((v) => +v.toFixed(2)), notes: notes.filter((s) => /stuck|drop/.test(s)).slice(0, 4) });
  };
  leg('house door → spaceport pad', { x: -44.4, z: 77.2, a: Math.PI / 2 }, { x: S.pad.x, z: S.pad.z }, 3.8);
  leg('pad → board reading spot', null, { x: S.board.x + 0.9, z: S.board.z }, 0.6);
  leg('board → kiosk hatch', null, { x: -10.4, z: 43.6 }, 0.6);
  leg('kiosk → waiting benches', null, { x: -9.3, z: 34.2 }, 0.6);
  leg('benches → shuttle', null, { x: S.pad.x, z: S.pad.z }, 3.8);
  leg('square → harbour', { x: -42, z: -4, a: Math.PI }, { x: -113.5, z: 44 }, 0.8);
  leg('harbour → pier head', null, { x: -123, z: 44 }, 1.0);
  leg('pier → customs (Odile)', null, { x: -109.5, z: 37.2 }, 1.0);
  leg('quay → ferry timetable', null, { x: -109.4, z: 46.6 }, 0.6);
  leg('quay → lane junction', null, { x: -45, z: 31 }, 0.8);
  leg('junction → square', null, { x: -42, z: -2 }, 0.8);
  leg('square → shop door', null, { x: -34.6, z: -1.1 }, 0.6, false);
  leg('shop → bug street door', null, { x: -54.0, z: -12.3 }, 0.8);
  leg('bug street → pump (Bram)', null, { x: -43.6, z: 62.0 }, 1.2);
  return out;
});
for (const l of legs) check(`walk: ${l.name} (${l.r}, ${l.t}s, stuck ${l.stuck})`, l.r === 'arrived' && l.stuck === 0, l);
const fails = done(errs);
await browser.close();
process.exit(fails ? 1 : 0);
