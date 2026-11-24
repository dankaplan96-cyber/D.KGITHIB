// Free play after the end (LBA3-RUN progression): Continue from segment 14's save (Save & quit after "Keep Exploring").
// The save comes back in free play (the epilogue, ep_free), the ending does not play again, he walks; the ship to Zeelich
// by input; Mill Lane (THE SECOND SHIFT, docs/lba-maturity/SECOND-SHIFT-PART2.md §1): with Brum's lesson (cn_brum) Brum
// has the handle and Kell is not also at it (in Mother Snuff's bakehouse with the oven hot, zl_crate, else by the cart);
// a game without the lesson keeps Kell at his lever. No objective or toast for it.
export const steps = [
  ['continue (free play after the end)', () => { const G = game, f = G.flags; P.settle();
    return { chapter: f.chapterKey, free: f.ep_free ?? null, state: G.state, room: P.here(), brum: f.cn_brum ?? null, crate: f.zl_crate ?? null, base: !!f.exp_base,
      fail: f.chapterKey === 'home' && f.ep_free === true && G.state === 'play' ? null : 'not in free play' }; }],
  ['20 s in play: the ending does not come back', () => { const G = game; let ending = false;
    for (let t = 0; t < 20; t += 0.1) { if (G.state === 'dialog') P.settle(); else G.step(0.1); if (G.state === 'ending') ending = true; }
    return { state: G.state, ending, fail: !ending && G.state === 'play' ? null : 'the ending again' }; }],
  ['the ship to Zeelich', () => { const G = game, p = G.travel?.points?.citadel_port; if (!p) return { fail: 'no Citadel port' };
    if (P.here() === 'zeelich') return { r: 'already on Zeelich' };
    const L = p.landing || p, mx = (p.x + L.x) / 2, mz = (p.z + L.z) / 2; const where = P.sceneOf(mx, mz); if (where !== P.here()) P.enter(where, { run: true });
    P.go(mx, mz, { tol: 1.0, run: true }); P.face(p.x, p.z); const tg = P.target(); if (tg?.kind !== 'isleShuttle') return { r: 'no prompt: ' + (tg?.kind || 'none'), fail: 'ship' };
    P.tap('KeyE', 0.1); G.step(0.2); if (G.state !== 'shop') { P.settle(); return { r: 'no menu: ' + G.state, fail: 'ship' }; }
    const items = [...document.querySelectorAll('#shop .item')]; const i = items.findIndex((el) => /Zeelich/i.test(el.textContent));
    const r = P.menuPick(i < 0 ? 0 : +items[i].dataset.i); P.settle(30);
    return { ...r, menu: items.map((el) => el.textContent.trim().slice(0, 30)), room: P.here(), fail: P.here() === 'zeelich' ? null : 'not on Zeelich' }; }],
  ['Mill Lane: who has the handle', () => { const G = game, f = G.flags, L = G.rooms.zeelich?.lift || G.regions.built('zeelich')?.lift; if (!L) return { fail: 'no lift' };
    const obj0 = G.story.objective().replace(/<[^>]+>/g, ''), toasts0 = (G.hud.toastLog || []).length;
    P.go(L.lane.x + 1.5, L.lane.z + 1.5, { tol: 1.0, run: true }); G.step(1.5); P.settle();
    const S = L.spots, k = P.npc('zl_kell'), b = P.npc('councilC'), d = (n) => (n?.present ? +Math.hypot(n.pos.x - S.kell.x, n.pos.z - S.kell.z).toFixed(2) : null);
    const kellAt = d(k), brumAt = d(b);
    const ok = f.cn_brum === true ? brumAt !== null && brumAt < 0.4 && !(kellAt !== null && kellAt < 3) : kellAt !== null && kellAt < 0.4;
    return { brum: f.cn_brum ?? null, crate: f.zl_crate ?? null, kellAt, brumAt, kellRoom: k?.present ? (G.regions.sceneOf?.(k.pos.x, k.pos.z) ?? null) : 'absent', deck: +(L.deckY - L.top).toFixed(2),
      objSame: G.story.objective().replace(/<[^>]+>/g, '') === obj0, toasts: (G.hud.toastLog || []).length - toasts0, fail: ok ? null : 'the handle' }; }],
];
