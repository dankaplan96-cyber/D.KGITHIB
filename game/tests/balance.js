// Balance simulation: plays real battles with the game's own engine, stepped as fast as the
// machine allows, across the whole route. For every area it fights the wild enemies, the trainers
// and the master at the level a player would arrive with, under three play styles:
//   auto   – the auto-battle picker, no timed hits
//   timed  – the same, landing most timed hits (60% perfect, 25% good)
//   annoy  – opens by needling the enemy's sore spot until it storms off (ordinary enemies only)
// Prints win rate, average turns and the lowest HP the player was pushed to (0 for a loss).
// A second argument 'big' runs only masters and bosses. Run: node tests/balance.js [fights-per-row]
const boot = require('./boot.js');
const N = +process.argv[2] || 12, ONLY = process.argv[3] || '';
(async () => {
  const { b, p, errs } = await boot();
  const rows = await p.evaluate(async ([N, ONLY]) => {
    const out = [];
    const setup = (lv, day, map) => {
      newGame(); if (film) endFilm(); if (cutscene) endCutscene(); dialogue = null;
      player.story.prologue_done = true; player.day = day; currentMap = map; player.timedHits = true; player.autoBattle = false;
      while (player.level < lv) { player.exp = player.nextExp; gainLevelsQuietly();
        (player.pendingLearn || []).forEach(id => { let wi = 0; player.moves.forEach((m, i) => { if ((MOVES[m].power || 0) < (MOVES[player.moves[wi]].power || 0)) wi = i; });
          if ((MOVES[id].power || 0) > (MOVES[player.moves[wi]].power || 0)) player.moves[wi] = id; }); player.pendingLearn = []; }
      player.hp = player.maxHp; player.ap = player.maxAp;
      player.inventory.pill = 3; player.inventory.kit = lv >= 10 ? 1 : 0; transition = null;
    };
    const fight = (key, opts, style) => {
      let mode = style;
      timingResult = function () { if (battle) battle.timing = null; if (mode !== 'timed') return null; const r = Math.random(); return r < .6 ? 'perfect' : r < .85 ? 'good' : null; };
      startBattle(key, opts); gameState = 'BATTLE';
      let turns = 0, guard = 0, low = 1;
      while (battle && gameState === 'BATTLE' && !battle.rewarded && player.hp > 0 && guard++ < 60000) {
        if (battle.phase === 'MENU') { turns++;
          if (style === 'annoy' && !battle.enemy.boss && !battle.enemy.master && turns <= 8) { const l = annoyList(); const i = l.findIndex(a => a.id === peeveOf(battle.enemy)); battle.phase = 'ANNOY'; battle.annoyIndex = Math.max(0, i); battleConfirm(); }
          else autoAct(); }
        low = Math.min(low, Math.max(0, player.hp) / player.maxHp);
        stepBattle(60); if (battle && battle.phase === 'MSG' && battle.pendingCb && battle.msgTimer == null) battleConfirm();
      }
      const won = !!(battle && battle.rewarded) && player.hp > 0;
      const r = { won, turns, hp: won ? low : 0 };
      battle = null; gameState = 'OVERWORLD'; dialogue = null;
      return r;
    };
    const stages = [];
    MAPS.forEach((m, i) => { if (!m.lv) return; const day = i <= 3 ? 1 : i <= 7 ? 2 : i <= 9 ? 3 : i <= 12 ? 4 : 5;
      const trainers = [...new Set(Object.values(m.trainers || {}).map(t => t.key || t.enemy).filter(Boolean))];
      stages.push({ map: i, name: m.name, lv: m.lv[0], day, wild: (m.encounters || []).slice(0, 3), trainers }); });
    for (const s of stages) for (const style of ['auto', 'timed', 'annoy']) {
      for (const [kind, keys, opts] of [['wild', s.wild, null], ['trainer', s.trainers.filter(k => !ENEMY_BASE[k].master && !ENEMY_BASE[k].lv), { trainer: true }], ['master', s.trainers.filter(k => ENEMY_BASE[k].master || ENEMY_BASE[k].lv), { trainer: true }]]) {
        if (!keys.length || (style === 'annoy' && kind === 'master') || (ONLY === 'big' && kind !== 'master')) continue;
        let w = 0, t = 0, h = 0, n = 0;
        for (let i = 0; i < N; i++) { const key = keys[i % keys.length]; setup(s.lv + (kind === 'master' ? 2 : 0), s.day, s.map); const r = fight(key, opts, style); w += r.won; t += r.turns; h += r.hp; n++; }
        out.push([s.map, s.name, s.lv, kind, style, Math.round(w / n * 100), +(t / n).toFixed(1), Math.round(h / n * 100)]);
      }
      await new Promise(r => setTimeout(r, 0));
    }
    // the daily boss, at the level each day usually ends on
    for (const [day, lv] of [[1, 6], [2, 9], [3, 11], [4, 13], [5, 15]]) for (const style of ['auto', 'timed']) {
      let w = 0, t = 0, h = 0;
      for (let i = 0; i < N; i++) { setup(lv, day, 4); const r = fight('burnout', null, style); w += r.won; t += r.turns; h += r.hp; }
      out.push([4, 'השחיקה יום ' + day, lv, 'boss', style, Math.round(w / N * 100), +(t / N).toFixed(1), Math.round(h / N * 100)]);
    }
    return out;
  }, [N, ONLY]);
  console.log('map  lv  kind     style  win%  turns  lowest-hp%  area');
  for (const r of rows) console.log(String(r[0]).padStart(3), String(r[2]).padStart(3), ' ' + r[3].padEnd(8), r[4].padEnd(6), String(r[5]).padStart(4), String(r[6]).padStart(6), String(r[7]).padStart(8), '    ' + r[1]);
  if (errs.length) console.log('PAGE ERRORS:\n' + errs.join('\n'));
  await b.close();
})();
