// node dresscheck.mjs <look> [candidate.json] — DRESS-1 on the game's own code: for the look's people variants
// (dressVariant 1..6), build the recoloured character and check that no vertex keeps a role's base hex that the variant
// overrides (a colour that matches no role can't be varied); also renders each variant side by side (dress-<look>.png).
import { chromium } from 'file:///C:/Users/dan/lba3/lba3/tools/testlab/node_modules/playwright/index.mjs';
const [LOOK, CAND] = process.argv.slice(2);
const browser = await chromium.launch({ executablePath: process.env.SHELL_EXE || undefined, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const ctx = await browser.newContext({ viewport: { width: 1200, height: 600 } });
if (CAND) await ctx.route(`**/assets/poly/${LOOK}.json`, (r) => r.fulfill({ path: CAND, contentType: 'application/json' }));
const page = await ctx.newPage();
await page.goto(`http://127.0.0.1:8257/lookdev.html?c=${LOOK}&yaw=1.5708&labels=0&grid=0&props=0&light=outdoor`, { waitUntil: 'load', timeout: 300000 });
await page.waitForFunction(() => window.lookdev && window.lookdev.rigs?.length, null, { timeout: 600000 });
const res = await page.evaluate(async (look) => {
  const CH = await import('/src/game/characters.js');
  const L = CH.LOOKS[look], hex = (c) => '#' + c.getHexString();
  const colours = (rig) => { const s = new Map(); rig.root.traverse((o) => { if (o.isMesh && o.geometry.attributes.color) { const a = o.geometry.attributes.color.array; for (let i = 0; i < a.length; i += 3) { const k = [a[i], a[i + 1], a[i + 2]].map((v) => v.toFixed(4)).join(','); s.set(k, (s.get(k) || 0) + 1); } } }); return s; };
  const out = [];
  const base = colours(CH.createCharacter(look));
  for (let n = 1; n <= 6; n++) {
    const ov = CH.dressVariant(look, n); if (!ov) continue;
    const r = CH.createCharacter(look, ov), c = colours(r);
    // for each overridden role: how many vertices still carry exactly the base look's colour for it (in linear, as stored)
    const THREE = await import('three');
    const left = {};
    for (const [role, v] of Object.entries(ov)) {
      if (!L[role] || L[role] === v) continue;
      const col = new THREE.Color(); col.setStyle(L[role], THREE.SRGBColorSpace);
      const k = [col.r, col.g, col.b].map((x) => x.toFixed(4)).join(',');
      left[role] = { base: L[role], to: v, verticesStillBase: c.get(k) || 0, inBase: base.get(k) || 0 };
    }
    out.push({ n, overrides: ov, left });
  }
  return out;
}, LOOK);
console.log(JSON.stringify(res, null, 1));
await browser.close();
