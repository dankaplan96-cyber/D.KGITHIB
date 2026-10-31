(async () => {
  // ROTATE-STALL: the benchmark's sweep route as the laptop runner calls it (electron-bench.mjs sweep), shortened: the
  // game's own loop running; visits (cold, then repeats) and then Auto as played on the same route. Checks the report's
  // "by view heading" lines (here: counts and SwiftShader frame times only).
  const G = game; G.testFreeze = false; G.setState('play');
  const S = +(window.SECS || 3);
  const a = await G.bench.visits({ routes: ['sweep'], cycles: 1, sustainS: 0, coldS: S, repeatS: S, camera: 'follow' });
  const b = window.AUTO_TOO ? await G.bench.runAuto({ routes: ['sweep'], camera: 'follow', measure: S }) : '';
  return String(a).split('\n').filter((l) => /prepar|cold|repeat|heading|over 33/.test(l)).join('\n') + '\n\n' + String(b).split('\n').filter((l) => /sweep|heading/.test(l)).join('\n');
})()
