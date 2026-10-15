// extra gameplay-camera views in the Hamalayi: node views.mjs <outdir> '<json [[name,x,z,a],...]>' (region-local x)
import { launch, open, menu } from '/home/user/geriatrics-course/.claude/worktrees/agent-a5c22898755b8fc79/lba2-remaster/tests/lib/boot.mjs';
import fs from 'fs';
import path from 'path';
const [OUT, LIST] = process.argv.slice(2); fs.mkdirSync(OUT, { recursive: true });
const { browser, page, errs } = await launch({ width: 1280, height: 720 });
await open(page, '?nocine'); await menu(page, 'new');
for (const [name, x, z, a] of JSON.parse(LIST)) {
  const img = await page.evaluate(([x, z, a]) => { const G = game; G.enterRoom('hamalayi', { x: 4300 + x, z, a }, true, true); G.hero.angle = a; G.camRig.lba.init = false; G.step(2); G.renderer.render(); return G.renderer.canvas.toDataURL('image/jpeg', 0.85); }, [x, z, a]);
  fs.writeFileSync(path.join(OUT, name + '.jpg'), Buffer.from(img.split(',')[1], 'base64'));
  console.log('shot', name);
}
console.log(errs.slice(0, 5).join('\n') || 'no errors');
await browser.close();
