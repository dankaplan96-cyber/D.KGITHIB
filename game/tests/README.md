# Tests

`node tests/smoke.js` opens `index.html` in headless Chromium (Playwright) and plays through the
main systems: a timed hit, auto-battle, an annoy storm-off, the shop by touch, every menu window,
a tower floor, the daily challenge, a boss fight, the opening film, and save/load. It exits
non-zero if any check fails or the page throws an error. Takes about a minute.
