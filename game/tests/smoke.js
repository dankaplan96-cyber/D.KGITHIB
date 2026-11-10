// Smoke test: drives the real game through its main systems and fails on any page error
// or wrong end state. Run: node tests/smoke.js
const boot = require('./boot.js');
const checks = [];
const ok = (name, cond, info) => { checks.push([name, !!cond, info]); console.log((cond ? 'PASS ' : 'FAIL ') + name + (info ? '  ' + info : '')); };
(async () => {
  const { b, p, errs } = await boot({ hasTouch: true });
  const drain = async n => { for (let i = 0; i < n; i++) { await p.waitForTimeout(250); await p.evaluate(() => { if (battle && battle.phase === 'MSG' && battle.pendingCb && !battle.timing) battleConfirm(); }); } };
  const place = () => p.evaluate(() => { currentMap = 1; px = 5; py = 4; hero.x = 220; hero.y = 180; });
  await place();
  await p.evaluate(() => { for (let i = 0; i < 6; i++) { player.exp = player.nextExp; gainLevelsQuietly(); } player.pendingLearn = []; player.hp = player.maxHp; });

  // 1. a timed hit lands as "perfect"
  await p.evaluate(() => startEncounter('busker')); await p.waitForTimeout(2700); await drain(10);
  await p.evaluate(() => { battle.enemy.spd = 1; battle.phase = 'MOVES'; battle.moveIndex = 0; battleConfirm(); });
  for (let i = 0; i < 30 && !(await p.evaluate(() => !!(battle && battle.timing))); i++) await p.waitForTimeout(40);
  const lead = await p.evaluate(() => battle.timing ? battle.timing.lead - battle.timing.t : -1);
  await p.waitForTimeout(Math.max(0, lead - 70)); await p.touchscreen.tap(450, 150); await p.waitForTimeout(350);
  const tm = await p.evaluate(() => battle.msg); ok('timed hit', tm.includes('תזמון'), tm);

  // 2. auto-battle finishes the fight
  await p.evaluate(() => { player.autoBattle = true; });
  let st = ''; for (let i = 0; i < 90; i++) { await p.waitForTimeout(400); st = await p.evaluate(() => gameState); if (st !== 'BATTLE') break; }
  ok('auto-battle ends', st === 'OVERWORLD' || st === 'LEARN', st);
  await p.evaluate(() => { if (gameState === 'LEARN') learnSkip(); player.autoBattle = false; player.timedHits = false; });

  // 3. nerves: the sore spot twice over makes an ordinary enemy storm off
  await place(); await p.evaluate(() => startEncounter('alarmClock')); await p.waitForTimeout(2700); await drain(10);
  for (let r = 0; r < 10; r++) { const ph = await p.evaluate(() => battle ? battle.phase : 'none'); if (ph === 'none') break;
    if (ph === 'MENU') await p.evaluate(() => { player.hp = player.maxHp; const l = annoyList(); battle.phase = 'ANNOY'; battle.annoyIndex = l.findIndex(a => a.id === peeveOf(battle.enemy)); battleConfirm(); });
    await drain(12); }
  await p.waitForTimeout(1200);
  ok('annoy storm-off', await p.evaluate(() => (player.stats.irkWins || 0) >= 1 && gameState !== 'BATTLE'));
  await p.evaluate(() => { if (gameState === 'LEARN') learnSkip(); });

  // 4. the shop opens from a touch and sells
  await p.evaluate(() => { px = 5; py = 2; hero.x = 220; hero.y = 100; player.gold = 500; attemptMove(0, -1); }); await p.waitForTimeout(700);
  ok('shop opens', await p.evaluate(() => gameState === 'SHOP'));
  await p.evaluate(() => buyItem('pill', 60));
  ok('shop sells', await p.evaluate(() => player.gold === 440));
  await p.evaluate(() => closeShop());

  // 5. every menu window opens and closes
  for (const w of ['status', 'inventory', 'journal', 'map', 'progress', 'achievements', 'settings']) { await p.evaluate(w => { openGameMenu(); launchGameMenu(w); }, w); await p.waitForTimeout(200); await p.evaluate(() => { pressB(); pressB(); }); await p.waitForTimeout(150); }
  ok('menus', await p.evaluate(() => gameState === 'OVERWORLD'));

  // 6. tower floor and daily challenge
  await p.evaluate(() => { player.story.day_done_1 = true; openTower(); towerStart(1); towerFight(); }); await p.waitForTimeout(2700); await drain(10);
  await p.evaluate(() => { battle.enemy.hp = 1; battle.enemy.spd = 1; battle.phase = 'MOVES'; battle.moveIndex = 0; battleConfirm(); });
  for (let i = 0; i < 12 && !(await p.evaluate(() => gameState === 'TOWER')); i++) await drain(6);
  ok('tower floor', await p.evaluate(() => gameState === 'TOWER' && player.tower.best === 1));
  await p.evaluate(() => dailyFight()); await p.waitForTimeout(2700); await drain(10);
  await p.evaluate(() => { battle.enemy.hp = 0; winBattle(); });
  for (let i = 0; i < 12 && !(await p.evaluate(() => player.daily && player.daily.streak === 1)); i++) await drain(6);
  ok('daily challenge', await p.evaluate(() => player.daily && player.daily.streak === 1));
  await p.evaluate(() => { if (gameState === 'LEARN') learnSkip(); if (gameState === 'TOWER') closeTower(); });

  // 7. a boss fight renders; the film plays through; save and reload keep the level
  await place(); await p.evaluate(() => startEncounter('burnout')); await p.waitForTimeout(2800);
  ok('boss battle', await p.evaluate(() => gameState === 'BATTLE' && battle.enemy.boss));
  await p.evaluate(() => { battle = null; gameState = 'OVERWORLD'; playFilm(() => {}); });
  for (const t of [3, 15, 30, 37, 44, 50]) { await p.evaluate(t => { film.t = t; }, t); await p.waitForTimeout(200); }
  await p.evaluate(() => endFilm());
  const lv = await p.evaluate(() => { saveGame(); return player.level; });
  await p.evaluate(() => { continueGame(); }); await p.waitForTimeout(300);
  ok('save and load', await p.evaluate(lv => player.level === lv, lv));

  // 8. a transfer code carries the save across; a charm changes a rule; the town map draws
  const xf = await p.evaluate(async () => { dialogue = null; gameState = 'OVERWORLD'; player.gold = 4321; charmGive('needle'); player.charm = 'needle';
    const code = await saveCodeMake(); player.gold = 1; player.charm = null; const back = await saveCodeRead(code);
    let bad = false; try { await saveCodeRead('BOFFI1:abc'); } catch (e) { bad = true; }
    return code.startsWith('BOFFI') && back.gold === 4321 && back.charm === 'needle' && bad; });
  ok('transfer code', xf);
  await p.evaluate(() => { openGameMenu(); launchGameMenu('map'); }); await p.waitForTimeout(200);
  ok('town map', await p.evaluate(() => document.querySelectorAll('#townmap-body .tm-node').length >= 20));
  await p.evaluate(() => { pressB(); pressB(); });
  ok('side quests', await p.evaluate(() => Object.keys(QUESTS).length >= 12 && Object.values(QUESTS).every(q => { const [m, k] = q.giver.split(':'); return MAPS[+m].npc && MAPS[+m].npc[k]; })));

  ok('no page errors', errs.length === 0, errs.join(' | ').slice(0, 400));
  await b.close();
  const failed = checks.filter(c => !c[1]).length;
  console.log(failed ? failed + ' FAILED' : 'ALL ' + checks.length + ' PASSED');
  process.exit(failed ? 1 : 0);
})();
