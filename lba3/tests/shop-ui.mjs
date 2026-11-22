// SHOP-UI (the user, 22.11, the pharmacy in Hebrew: "The coins' label and 'pharmacy' are on top of each other. And it
// doesn't say what each thing does."). The shop panel (hud.js openShop, css #shop):
//   - the title and the purse (coin + count) never overlap: English and Hebrew, 1280×720, 1366×768, 1920×1080 and a
//     narrow 1000×700 window and a short 900×500 one (the compact layout), the normal and the large text size, the shops' real titles and a long one; the panel
//     stays inside the window and its parts inside the panel (HE-LTR: the purse on the right in both languages);
//   - openMenu (the same panel: Hesk's glider, chapter 3's choice) keeps a long title inside the panel;
//   - the selected good says what it does (.shop-what, under its name and price), in both languages, for every good a
//     shop sells: Pippa's stall, the town's shops (story/shops.js), the arsenal's stalls, the islands' counters.
// ISO (logged): chapter 1 by its flags; the hero put outside the pharmacy's door and walked in by input (as
// tests/shops.mjs); kashes 3 and life 3 so the user's view (honey selected, 5 kashes short) is shown; the language is
// switched by the settings object (applySettings) and the panel redrawn; the stock lists are read from the stock
// functions with their gates opened (owned blowgun, laser, pocket set) plus the gated or island goods listed by hand.
// Pictures (env SHOTS, default /dev/shm/shop-ui-shots; TAG names them): the pharmacy in English and Hebrew at 1366×768.
import { launch, open, menu, checker } from './lib/boot.mjs';
import fs from 'node:fs';
import path from 'node:path';
const { check, checkVisual, done } = checker();
const { browser, page } = await launch({ width: 1366, height: 768 });
const ev = (f, a) => page.evaluate(f, a);
const iso = (s) => console.log('ISO  ' + s);
const SHOTS = process.env.SHOTS || '/dev/shm/shop-ui-shots'; fs.mkdirSync(SHOTS, { recursive: true });
const TAG = process.env.TAG ? '-' + process.env.TAG : '';

await open(page, '?nocine'); await menu(page, 'new');
await ev(() => {
  const G = game, f = G.flags; P.settle();
  Object.assign(f, { prologueDone: false, intro: true, chapterKey: 'well' }); f.chapter = G.story.chapters.findIndex((c) => c.key === 'well'); G.hero.hasBall = true; G.story.applyFlags(); G.step(0.2);
  window.SU = {
    lang(l) { game.settings.lang = l; game.applySettings(); if (game.state === 'shop') game.hud.shopRender(); game.step(0.05); },
    // the title's letters, the purse, the panel and its parts, as boxes
    layout() {
      const S = document.querySelector('#shop'), h2 = S.querySelector('h2'), c = S.querySelector('.coins');
      const box = (r) => r && { l: Math.round(r.left), t: Math.round(r.top), r: Math.round(r.right), b: Math.round(r.bottom) };
      const rg = document.createRange(); rg.selectNodeContents(h2); const tr = rg.getBoundingClientRect();
      const P0 = S.getBoundingClientRect(), C = c?.getBoundingClientRect();
      const over = C ? !(tr.right <= C.left || C.right <= tr.left || tr.bottom <= C.top || C.bottom <= tr.top) : false;
      const inside = (r) => r.left >= P0.left - 0.5 && r.right <= P0.right + 0.5 && r.top >= P0.top - 0.5 && r.bottom <= P0.bottom + 0.5;
      const parts = [...S.querySelectorAll('h2, .coins, .shop-name, .shop-price, .shop-what, .shop-why, .shop-big, .leave')].filter((e) => e.offsetParent);
      const outside = parts.filter((e) => !inside(e.getBoundingClientRect())).map((e) => e.className || e.tagName);
      // a text cut by its own box (one line squeezed, an ellipsis)
      const cut = parts.filter((e) => e.scrollWidth > e.clientWidth + 1 && !e.classList.contains('shop-big')).map((e) => e.className || e.tagName);
      return { title: box(tr), coins: box(C), panel: box(P0), over, outside, cut, inView: P0.left >= 0 && P0.top >= 0 && P0.right <= innerWidth && P0.bottom <= innerHeight, coinsRight: C ? C.left > P0.left + P0.width / 2 : null };
    },
    look() { const S = document.querySelector('#shop'); return { name: S.querySelector('.shop-name')?.textContent, what: S.querySelector('.shop-what')?.textContent || '', why: S.querySelector('.shop-why')?.textContent, sel: S.querySelector('button.sel span')?.textContent }; },
  };
});
iso('chapter 1 (the dry well) set by its flags; life 3, kashes 3 (the user\'s view: honey selected, 5 kashes short)');
const p0 = await ev(() => { const G = game, h = G.hero; h.hp = 3; h.coins = 3;
  const o = G.story.exitTo('pharmacy-out'); G.exitRoom({ ...o, a: o.a + Math.PI }, true, true); G.step(0.3); const r = P.enter('pharmacy').r; P.settle();
  const t = P.talk('pharmacist'); return { enter: r, talk: t.r, state: G.state, title: document.querySelector('#shop h2')?.textContent }; });
check('the pharmacy opens by input (walked in, the Pharmacist talked to)', p0.state === 'shop' && p0.title === 'The Pharmacy', p0);

// ---- the user's view, in both languages, at 1366×768 (the pictures)
const views = {};
for (const lang of ['en', 'he']) {
  views[lang] = await ev((l) => { SU.lang(l); game.hud.shopSel = 1; game.hud.shopRender(); game.step(0.1); return { ...SU.layout(), ...SU.look() }; }, lang);
  await ev(() => { game.step(0.1); game.renderer.render?.(); });
  await page.screenshot({ path: path.join(SHOTS, `pharmacy-${lang}-1366x768${TAG}.png`) });
}
checkVisual('1366×768, English: the title and the purse do not overlap; the purse on the right', !views.en.over && views.en.coinsRight, views.en);
checkVisual('1366×768, Hebrew (the user\'s report): the title and the purse do not overlap; the purse on the right as in English (HE-LTR)', !views.he.over && views.he.coinsRight, views.he);
check('the honey says what it does, under its name and price (English)', /spoonful/.test(views.en.what) && /three/.test(views.en.what), views.en);
check('the honey says what it does in Hebrew too (Hebrew letters, not the English line)', /[֐-׿]/.test(views.he.what) && !/[A-Za-z]/.test(views.he.what), views.he);
check('the price and the "5 more kashes" line stay as they were', /5 more kashes/.test(views.en.why) && /5/.test(views.he.why), { en: views.en.why, he: views.he.why });

// ---- every row of the pharmacy, every size, both languages; a long title
const SIZES = [[1280, 720], [1366, 768], [1920, 1080], [1000, 700], [900, 500]];   // (900×500: the compact layout, css max-height 520)
const bad = [];
for (const [w, h] of SIZES) {
  await page.setViewportSize({ width: w, height: h });
  for (const lang of ['en', 'he']) for (const size of ['normal', 'large']) {
    const r = await ev(([l, s]) => {
      game.settings.textSize = s; SU.lang(l); const out = [];
      const n = document.querySelectorAll('#shop .item').length;
      for (let i = 0; i < n; i++) { game.hud.shopSel = i; game.hud.shopRender(); out.push({ i, ...SU.layout(), what: SU.look().what }); }
      return out;
    }, [lang, size]);
    for (const x of r) if (x.over || x.outside.length || x.cut.length || !x.inView || !x.coinsRight || !x.what) bad.push({ w, h, lang, size, ...x });
  }
}
checkVisual(`the pharmacy at ${SIZES.map((s) => s.join('×')).join(', ')}, English and Hebrew, normal and large text, each row selected: no overlap, nothing outside the panel or cut, the panel in the window, every row says what it does`, !bad.length, bad.slice(0, 4));

const longT = { en: 'The Esmer Trading House and Spice Tea Rooms of the Harbour Front', he: 'בית המסחר האסמרי וחדרי תה התבלינים של חזית הנמל' };
const badLong = [];
for (const [w, h] of [[1000, 700], [1366, 768]]) {
  await page.setViewportSize({ width: w, height: h });
  for (const lang of ['en', 'he']) {
    const r = await ev(([l, title]) => {
      game.settings.textSize = 'large'; SU.lang(l);
      const items = () => [{ id: 'honey', key: 'sh_honey', price: 8, shop: true }];
      game.hud.shopClose(); game.setState('shop');
      game.hud.openShop(items, () => {}, () => game.setState('play'), title);   // (t() shows an unknown key as itself)
      const a = SU.layout(); game.hud.shopClose();
      game.openMenu(title, [{ key: 'menu_cancel' }], () => {});
      const b = SU.layout(); game.hud.shopClose();
      return { shop: a, menu: b };
    }, [lang, longT[lang]]);
    if (r.shop.over || r.shop.outside.length || r.shop.cut.length || !r.shop.inView) badLong.push({ w, h, lang, kind: 'shop', ...r.shop });
    if (r.menu.outside.length || r.menu.cut.length || !r.menu.inView) badLong.push({ w, h, lang, kind: 'menu', ...r.menu });
  }
}
checkVisual('a long title (English and Hebrew, large text, 1000×700 and 1366×768) wraps beside the purse and never under it; openMenu keeps it inside the panel', !badLong.length, badLong.slice(0, 3));
await ev(() => { game.settings.textSize = 'normal'; SU.lang('en'); game.step(0.1); });

// ---- every good any shop sells says what it does, in English and in Hebrew
const cover = await ev(async () => {
  const G = game, h = G.hero, f = G.flags, A = h.arms, I = await import('./src/game/i18n.js');
  const saved = { A: { ...A }, f: { ...f } };
  Object.assign(f, { prologueDone: true }); Object.assign(A, { pocketset: true });
  const all = [];
  for (const own of [false, true]) {   // (the arsenal sells the blowgun or darts, the laser or cells, by what he owns)
    Object.assign(A, { blowgun: own, laser: own, lantern: false });
    for (const w of ['citadel', 'zeelich', 'bazoo', 'pharmacy', 'ticket', 'esmer', 'gadget']) {
      all.push(...(w === 'citadel' ? [{ id: 'potion', key: 'shop_potion' }, { id: 'flask', key: 'shop_flask' }, { id: 'clover', key: 'shop_clover' }] : []),
        ...(G.story.shops?.stock(w) || []), ...(G.story.arsenal?.shopItems(w) || []));
    }
  }
  // gated by place or chapter (the Blowtron at the pass, the Esmer line), and the islands' counters (islandpeople.js)
  all.push({ id: 'blowtron', key: 'a_sh_blowtron', arsenal: true }, { id: 'line', key: 'a_sh_line', arsenal: true },
    { id: 'lens', key: 'ip_sh_lens' }, { id: 'honey', key: 'sh_honey' }, { id: 'flask', key: 'ip_sh_cordial', desc: 'shd_cordial' }, { id: 'lantern', key: 'a_sh_lantern' });
  Object.assign(A, saved.A); for (const k of Object.keys(f)) if (!(k in saved.f)) delete f[k]; Object.assign(f, saved.f);
  const seen = new Map();
  for (const it of all) { const k = G.hud.shopWhat?.(it) || ''; seen.set(it.key + '|' + (it.desc || it.id), { item: it.key, desc: k, en: I.STR.en[k] || '', he: I.STR.he[k] || '' }); }
  return [...seen.values()];
});
const missing = cover.filter((c) => !c.en || !c.he || c.en.length > 150);
check(`every good a shop sells has its line (${cover.length} goods), in English and Hebrew, at most 150 characters`, cover.length >= 18 && !missing.length, missing);
console.log('LINES ' + JSON.stringify(cover.map((c) => [c.item, c.en])));
check('the islands\' nectar cordial (id flask, a full refill) says its own line, not the half flask\'s', cover.find((c) => c.item === 'ip_sh_cordial')?.en !== cover.find((c) => c.item === 'shop_flask')?.en, cover.filter((c) => /flask|cordial/.test(c.item)));

await browser.close();
done();
