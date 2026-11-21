// P87c: the off-the-wall slate / sand repaint probe. Loads a save (default the fixture base-07-dig: chapter 4 on Desert
// Island, the court open) the way a player continues, at Medium 1366x768, areas built on their first visit as in play
// (only the save's own areas are built at load), then evaluates q_ow.js in the page and prints what it returns.
// OUT=dir also writes the slate and sand canvases as PNGs (after the route, and after the story's change).
//   GAME_URL=http://localhost:8222/ OUT=/tmp/x node run_ow.mjs [fixture]
import { launch, open, menu } from '../../../../tests/lib/boot.mjs';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
const fx = process.argv[2] || 'base-07-dig';
const FIX = fileURLToPath(new URL(`../../../../tests/fixtures/campaign/${fx}.save.json`, import.meta.url));
const st = JSON.parse(fs.readFileSync(FIX, 'utf8'));
const raw = st.origins.flatMap((o) => o.localStorage).find((i) => i.name === 'lba3_save_v1').value;
const { browser, page } = await launch({ width: 1366, height: 768 });
await page.addInitScript(([s, q]) => {
  try { if (!localStorage.getItem('lba3_save_v1')) localStorage.setItem('lba3_save_v1', s); localStorage.setItem('sunshard_settings_v1', JSON.stringify({ quality: q, qPicked: true, qv: 1, v: 2 })); } catch {}
}, [raw, 'medium']);
page.on('console', (m) => { if (/^(DBG|PROBE)/.test(m.text())) console.log(m.text()); });
const ev = (f, a) => page.evaluate(f, a);
await open(page, '?nocine');
await menu(page, 'continue');
await ev(async () => {
  game.settings.qualityAuto = false; game.settings.quality = 'medium'; game.applySettings();
  for (let i = 0; i < 40; i++) game.step(0.05);
  game.warmGraphics?.(); for (let i = 0; i < 200 && game.gfxHold; i++) await new Promise((r) => setTimeout(r, 50));
});
const code = fs.readFileSync(fileURLToPath(new URL('./q_ow.js', import.meta.url)), 'utf8');
const r = await ev(code);
console.log(r.text);
if (process.env.OUT) {
  fs.mkdirSync(process.env.OUT, { recursive: true });
  for (const [k, url] of Object.entries(r.png || {})) fs.writeFileSync(`${process.env.OUT}/${k}.png`, Buffer.from(url.split(',')[1], 'base64'));
}
await browser.close();
