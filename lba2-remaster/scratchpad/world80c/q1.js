(() => {
  const W = game.world;
  const C = W.containers;
  return {
    skipped: C.skipped, placed: C.placed.filter((p) => p.moved > 0.01 || /bug|west/.test(p.id)),
    shut: W.shutDoors, houses: W.houses.map((h) => [h.id, +h.x.toFixed(2), +h.z.toFixed(2), +h.g.toFixed(2), +h.door.x.toFixed(2), +h.door.z.toFixed(2)]),
    stones0: W.stones && W.stones[0] && { ground: +W.stones[0].ground.toFixed(3), top: +W.stones[0].top.toFixed(3), n: W.stones.length },
    trapFixes: W.trapFixes, propsSkipped: W.propsSkipped, cityDress: W.cityDress && { placed: W.cityDress.placed, skipped: W.cityDress.skipped?.length },
    signs: W.signs.filter((s) => /cliff/.test(s.key)).map((s) => [s.x, s.z]),
    flowerBeds: W.flowerBeds, load: game.loadTimes,
  };
})()
