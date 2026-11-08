// CHAPTER-BALANCE: what the game time of a scripted route was spent on (loaded into the page by tests/lib/seg.mjs
// when STATS=<file.json> is set). It only watches: it wraps game.frame and game.say to add up the time per state,
// the dialogue lines and words, the hero's walked distance in free play, the health lost and the deaths. It never
// changes the game. The bot advances dialogue at once, so the dialogue's game time here is the bot's, not a
// reader's: a first-play estimate uses the word count instead (docs/lba-maturity/chapter-balance.md).
(() => {
  const G = window.game;
  if (!G || G.__stats) return;
  const S = (window.STATS = G.__stats = { play: 0, dialog: 0, trans: 0, scene: 0, menu: 0, other: 0, lines: 0, words: 0, says: 0, walked: 0, hpLost: 0, deaths: 0, rooms: new Set(), chapter: null });
  let lx = null, lz = null, lhp = null, dead = false, lcl = null;
  S.revives = 0;   // (a clover spent: a death the clover box caught)
  const frame = G.frame.bind(G);
  G.frame = (dt, render) => {
    const st = G.state, h = G.hero;
    if (G.trans) S.trans += dt;
    else if (st === 'play') S.play += dt;
    else if (st === 'dialog') S.dialog += dt;
    else if (st === 'cutscene' || st === 'cinematic' || st === 'cinematicEnd' || st === 'found' || st === 'ending') S.scene += dt;
    else if (st === 'shop' || st === 'inventory' || st === 'map' || st === 'pause') S.menu += dt;
    else S.other += dt;
    const r = frame(dt, render);
    if (h) {
      const room = G.room?.id || G.region || 'outdoors';
      S.rooms.add(room);
      if (st === 'play' && !G.trans && lx != null && G.state === 'play') {
        const d = Math.hypot(h.pos.x - lx, h.pos.z - lz);
        if (d < 2) S.walked += d;   // (a door or a cut moves him further in one frame: not walked)
      }
      lx = h.pos.x; lz = h.pos.z;
      if (lhp != null && h.hp < lhp) S.hpLost += lhp - h.hp;
      lhp = h.hp;
      if (h.dead && !dead) S.deaths++;
      if (lcl != null && h.clovers < lcl) S.revives++;
      lcl = h.clovers;
      dead = !!h.dead;
    }
    S.chapter = G.flags?.chapterKey ?? S.chapter;
    return r;
  };
  const say = G.say.bind(G);
  G.say = (name, lines, ...rest) => {
    const arr = Array.isArray(lines) ? lines : [lines];
    S.says++; S.lines += arr.length;
    for (const l of arr) S.words += String(typeof l === 'string' ? l : (l?.text ?? '')).split(/\s+/).filter(Boolean).length;
    return say(name, lines, ...rest);
  };
  S.snap = () => ({ play: +S.play.toFixed(1), dialog: +S.dialog.toFixed(1), trans: +S.trans.toFixed(1), scene: +S.scene.toFixed(1), menu: +S.menu.toFixed(1), other: +S.other.toFixed(1),
    lines: S.lines, words: S.words, says: S.says, walked: Math.round(S.walked), hpLost: S.hpLost, deaths: S.deaths, rooms: S.rooms.size, chapter: S.chapter, coinsNow: G.hero?.coins ?? 0, hpNow: G.hero?.hp ?? 0, cloversNow: G.hero?.clovers ?? 0, revives: S.revives });
})();
