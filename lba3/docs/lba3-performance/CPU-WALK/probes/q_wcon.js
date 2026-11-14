(async () => {
  // CPU-WALK: is the walk check on in this page (WALKCHECK=1 through tests/lib/boot.mjs, or ?walkcheck)? Five renders.
  const MW = (await import('./src/engine/drawcull.js')).MW;
  for (let i = 0; i < 5; i++) game.renderer.render();
  return 'walkcheck: ' + JSON.stringify(MW.check && { frames: MW.check.frames, compared: MW.check.compared, bad: MW.check.bad });
})()
