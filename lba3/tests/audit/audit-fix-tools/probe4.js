(async () => {
  const G = game;
  if (!window.CW) { const s = document.createElement('script'); s.src = '/tests/lib/camwalk.js'; document.head.appendChild(s); await new Promise((r) => { s.onload = r; }); }
  CW.place({ room: 'desert', x: 3478.07, z: 11.89, y: 1.49, a: 4.27 });
  CW.setup(); CW.place({ room: "desert", x: 3478.07, z: 11.89, y: 1.49, a: 4.27 }); G.step(2.0); G.renderer.render();
  const R = G.room, T = R?.terrain || G.physics.terrain, PH = G.physics;
  const rows = [];
  for (let z = -6; z <= 24; z += 1.5) {
    let row = (z.toFixed(1)).padStart(6) + ' ';
    for (let x = 3460; x <= 3492; x += 1.5) { const h = PH.groundAt(x, z, 30); row += (h < -0.2 ? ' ~~' : h < 0.3 ? ' __' : (' ' + Math.round(h * 10) / 10).slice(-3).padStart(3)); }
    rows.push(row);
  }
  return { room: R?.id, rows };
})();
