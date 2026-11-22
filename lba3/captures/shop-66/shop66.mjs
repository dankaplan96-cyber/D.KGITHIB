// ORDER 66.3: the shop panel (P104 SHOP-UI) on the real GPU: the pharmacy, Pippa's stall and the Zeelich arsenal, in
// English and Hebrew, at 1536×819 (this desktop's game window) and 1366×768. A picture of each with its second row
// selected, and every row measured: the title's letters against the purse, parts outside the panel, text cut by its box.
// usage: node shop66.mjs <OUT> <lba3 ROOT>
import { chromium } from 'file:///C:/Users/danka/dev/D.KGITHIB/lba3/tools/testlab/node_modules/playwright/index.mjs';
import { serve } from 'file:///C:/Users/danka/dev/D.KGITHIB/lba3/tools/testlab/engine/server.mjs';
import fs from 'node:fs';
const [OUT, ROOT] = process.argv.slice(2); fs.mkdirSync(OUT, { recursive: true });
const server = await serve(ROOT);
const browser = await chromium.launch({ channel: 'chrome', headless: false, args: ['--window-size=1560,900', '--use-angle=d3d11', '--ignore-gpu-blocklist'] });
const page = await (await browser.newContext({ viewport: { width: 1536, height: 819 } })).newPage();
const errs = []; page.on('pageerror', (e) => errs.push(String(e)));
await page.goto(server.url + '?nocine', { waitUntil: 'load', timeout: 180000 });
await page.waitForFunction(() => window.game && document.querySelector('#loading').classList.contains('hidden') && !window.game.preparing, null, { timeout: 300000 });
await page.click('[data-act="new"]'); await page.waitForTimeout(800);
if (await page.evaluate(() => game.screen === 'confirmnew')) await page.click('[data-act="newyes"]');
await page.waitForFunction(() => game.state && !game.preparing, null, { timeout: 300000 });
await page.evaluate(() => { const G = game; G.testFreeze = true; for (let i = 0; i < 80 && G.state !== 'play'; i++) { G.input.taps.add('KeyE'); G.step(0.05); }
  G.hero.coins = 3; G.hero.hp = 3; G.step(0.2);
  window.SU = {
    lang(l) { game.settings.lang = l; game.applySettings(); if (game.state === 'shop') game.hud.shopRender(); game.step(0.05); },
    layout() {   // (as tests/shop-ui.mjs measures)
      const S = document.querySelector('#shop'), h2 = S.querySelector('h2'), c = S.querySelector('.coins');
      const rg = document.createRange(); rg.selectNodeContents(h2); const tr = rg.getBoundingClientRect();
      const P0 = S.getBoundingClientRect(), C = c?.getBoundingClientRect();
      const gap = C ? Math.max(C.left - tr.right, tr.left - C.right, C.top - tr.bottom, tr.top - C.bottom) : null;
      const inside = (r) => r.left >= P0.left - 0.5 && r.right <= P0.right + 0.5 && r.top >= P0.top - 0.5 && r.bottom <= P0.bottom + 0.5;
      const parts = [...S.querySelectorAll('h2, .coins, .shop-name, .shop-price, .shop-what, .shop-why, .shop-big, .leave')].filter((e) => e.offsetParent);
      return { title: h2.textContent, gap: gap == null ? null : Math.round(gap), outside: parts.filter((e) => !inside(e.getBoundingClientRect())).map((e) => e.className || e.tagName),
        cut: parts.filter((e) => e.scrollWidth > e.clientWidth + 1 && !e.classList.contains('shop-big')).map((e) => e.className || e.tagName),
        inView: P0.left >= 0 && P0.top >= 0 && P0.right <= innerWidth && P0.bottom <= innerHeight,
        what: S.querySelector('.shop-what')?.textContent || '', name: S.querySelector('.shop-name')?.textContent || '' };
    },
  };
});
const SHOPS = [['pharmacy', 'pharmacy'], ['pippa', null], ['arsenal', 'zeelich']];
const rows = [];
for (const [w, h] of [[1536, 819], [1366, 768]]) {
  await page.setViewportSize({ width: w, height: h });
  for (const [tag, where] of SHOPS) for (const lang of ['en', 'he']) {
    const r = await page.evaluate(({ where, lang }) => {
      const G = game; if (G.state === 'shop') G.hud.shopClose(); G.setState('play');
      SU.lang(lang); G.openShop(where || undefined); G.step(0.1);
      if (G.state !== 'shop') return { error: 'no shop: ' + G.state };
      const n = document.querySelectorAll('#shop .item').length, out = [];
      for (let i = 0; i < n; i++) { G.hud.shopSel = i; G.hud.shopRender(); out.push({ i, ...SU.layout() }); }
      G.hud.shopSel = Math.min(1, n - 1); G.hud.shopRender(); G.step(0.05);
      return { n, out };
    }, { where, lang });
    await page.waitForTimeout(300);
    await page.screenshot({ path: `${OUT}/${tag}-${lang}-${w}x${h}.png` });
    if (r.error) { console.log(tag, lang, w, r.error); continue; }
    for (const x of r.out) rows.push({ shop: tag, lang, size: `${w}x${h}`, ...x });
    const worst = Math.min(...r.out.map((x) => x.gap ?? 99));
    console.log(`${tag} ${lang} ${w}x${h}: ${r.n} rows; title "${r.out[0].title}"; least gap title–purse ${worst} px; outside ${r.out.filter((x) => x.outside.length).length}; cut ${r.out.filter((x) => x.cut.length).length}; no line ${r.out.filter((x) => !x.what).length}; in view ${r.out.every((x) => x.inView)}`);
  }
}
fs.writeFileSync(`${OUT}/rows.json`, JSON.stringify(rows, null, 1));
console.log('page errors:', errs.length ? errs.join(' | ').slice(0, 400) : 'none');
await browser.close(); server.close?.(); process.exit(0);
