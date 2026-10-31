(async () => {
  // The in-game benchmark itself, cut down (window.QS presets, window.BROUTES routes, no breakdown): checks that the
  // "as played" runs run with the automatic resolution on and report it. Runs in real time (the game's loop unfrozen).
  const G = game;
  G.testFreeze = false; G.last = performance.now();
  const text = await G.bench.run((window.QS || 'medium').split(','), { routes: (window.BROUTES || 'street,hamalayi').split(','), breakdown: false });
  G.testFreeze = true;
  return text.split('\n').map((l) => 'PROBE ' + l).join('\n');
})()
