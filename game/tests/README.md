# Tests

`node tests/smoke.js` opens `index.html` in headless Chromium (Playwright) and plays through the
main systems: a timed hit, auto-battle, an annoy storm-off, the shop by touch, every menu window,
a tower floor, the daily challenge, a boss fight, the opening film, and save/load. It exits
non-zero if any check fails or the page throws an error. Takes about a minute.

`node tests/balance.js [fights] [big]` is the balance simulation: it plays real battles with the
game's own engine, stepped as fast as the machine allows, for every area's wild enemies, trainers,
masters and the daily boss, under three play styles (auto-battle, timed hits, annoy). It prints win
rate, turns and the lowest HP the player was pushed to. `big` limits it to masters and bosses.
