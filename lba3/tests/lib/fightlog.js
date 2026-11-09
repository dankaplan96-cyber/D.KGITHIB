// Fight log for the playthrough (watches only; tests/lib/seg.mjs loads it with FIGHTLOG=1): every point of health lost,
// by source (an enemy's blow, an enemy's bolt, a fall), the enemies' attacks started, their openings, how long each
// took to beat from its first attack, and how many attacks were under way at once when a blow landed.
// FIGHTLOG.snap() → the totals so far; FIGHTLOG.since(s) → the difference from an earlier snap.
(() => {
  const G = window.game;
  if (window.FIGHTLOG) return;
  const ATTACK = new Set(['windup', 'aim', 'lunge', 'strike', 'bash', 'slam', 'lock', 'drop']);
  const OPEN = new Set(['recover', 'open', 'stunned', 'stagger']);
  const L = (window.FIGHTLOG = { hits: [], attacks: {}, openings: {}, kills: [], first: {}, cur: null, fightT: 0 });
  const tag = (e) => (e ? e.id || e.def?.id || e.def?.kind || '?' : null);
  const wrapEnemy = (e) => {
    if (e._fl) return; e._fl = true;
    const up = e.update.bind(e);
    let last = e.state;
    e.update = (dt) => {
      L.cur = e;
      try { up(dt); } finally { L.cur = null; }
      if (e.state !== last) {
        const id = tag(e);
        if (ATTACK.has(e.state) && !ATTACK.has(last)) { L.attacks[id] = (L.attacks[id] || 0) + 1; if (L.first[id] == null) L.first[id] = G.time; }
        if (OPEN.has(e.state) && !OPEN.has(last)) L.openings[id] = (L.openings[id] || 0) + 1;
        if (e.state === 'dead' && last !== 'dead') L.kills.push({ id, t: +G.time.toFixed(1), ttk: L.first[id] != null ? +(G.time - L.first[id]).toFixed(1) : null });
        last = e.state;
      }
    };
  };
  const fire = G.bolts.fire.bind(G.bolts);
  G.bolts.fire = (...a) => { fire(...a); const b = G.bolts.list[G.bolts.list.length - 1]; if (b) b.owner = tag(L.cur); };
  const wrapHero = () => {
    const h = G.hero; if (h._fl) return; h._fl = true;
    const dmg = h.damage.bind(h);
    h.damage = (n, from, heavy) => {
      const hp0 = h.hp, cl0 = h.clovers;
      dmg(n, from, heavy);
      const lost = hp0 - h.hp + (h.clovers < cl0 ? 0 : 0);
      if (lost <= 0 && h.clovers === cl0) return;
      const bolt = from && G.bolts.list.find((b) => b.m.position === from);
      const src = L.cur ? tag(L.cur) + (heavy ? ':heavy' : ':melee') : bolt ? (bolt.owner || '?') + ':bolt' : 'other';
      const busy = G.enemies.filter((e) => e.alive && e.present && ATTACK.has(e.state)).length;
      const near = G.enemies.filter((e) => e.alive && e.present && e.pos.distanceTo(h.pos) < 9).length;
      L.hits.push({ t: +G.time.toFixed(1), src, lost: +lost.toFixed(2), hp: +h.hp.toFixed(2), clover: h.clovers < cl0, busy, near });
    };
  };
  const step = G.step.bind(G);
  G.step = (dt) => {
    wrapHero(); for (const e of G.enemies) wrapEnemy(e);
    const t0 = G.time; step(dt);
    if (G.enemies.some((e) => e.alive && e.present && !['patrol', 'idle', 'guard', 'home', 'return', 'search', 'dead'].includes(e.state) && e.pos.distanceTo(G.hero.pos) < 15)) L.fightT += G.time - t0;
  };
  L.snap = () => ({ hits: L.hits.length, kills: L.kills.length, attacks: { ...L.attacks }, openings: { ...L.openings }, fightT: L.fightT });
  L.since = (s) => {
    if (L.hits.length < s.hits || L.kills.length < s.kills) s = { hits: 0, kills: 0, attacks: {}, openings: {}, fightT: 0 };   // (a Retry reloaded the page: a new log)
    const hits = L.hits.slice(s.hits), kills = L.kills.slice(s.kills), by = {};
    for (const x of hits) { by[x.src] = by[x.src] || { n: 0, lost: 0 }; by[x.src].n++; by[x.src].lost = +(by[x.src].lost + x.lost).toFixed(2); }
    const diff = (a, b) => { const o = {}; for (const k in a) if (a[k] - (b[k] || 0)) o[k] = a[k] - (b[k] || 0); return o; };
    const att = diff(L.attacks, s.attacks), opn = diff(L.openings, s.openings), ft = L.fightT - s.fightT;
    const nAtt = Object.values(att).reduce((a, b) => a + b, 0), nOpn = Object.values(opn).reduce((a, b) => a + b, 0);
    return { fightS: +ft.toFixed(1), lost: +hits.reduce((a, x) => a + x.lost, 0).toFixed(2), bySource: by, stacked: hits.filter((x) => x.busy >= 2).length,
      attacks: att, openingsPerMin: ft > 0 ? +(nOpn / ft * 60).toFixed(1) : 0, attacksPerMin: ft > 0 ? +(nAtt / ft * 60).toFixed(1) : 0, kills, hits };
  };
})();
