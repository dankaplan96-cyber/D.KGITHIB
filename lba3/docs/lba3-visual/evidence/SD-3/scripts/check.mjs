// load the game, print errors, the Hamalayi's dressing log and counts
import { launch, open, menu } from '/home/user/geriatrics-course/.claude/worktrees/agent-a5c22898755b8fc79/lba2-remaster/tests/lib/boot.mjs';
const { browser, page, errs } = await launch({ width: 640, height: 360 });
await open(page, '?nocine'); await menu(page, 'new');
const r = await page.evaluate(() => {
  const R = game.rooms.hamalayi; let meshes = 0, tris = 0;
  R.group.traverse((o) => { if (o.isMesh) { meshes++; const g = o.geometry; tris += (g.index ? g.index.count : g.attributes.position.count) / 3 * (o.isInstancedMesh ? o.count : 1); } });
  return { log: R.dress.log, placed: R.dress.placed.length, meshes, tris: Math.round(tris), load: game.loadTimes.hamalayi };
});
console.log(JSON.stringify(r, null, 1));
console.log(errs.slice(0, 10).join('\n') || 'no errors');
await browser.close();
