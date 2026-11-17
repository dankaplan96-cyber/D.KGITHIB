# WEAPON-SWITCH: choosing a weapon, and Arthur's Pocket Set (P60, P61; the user, 17.11)

The user, playing the artifact in Chrome with the keyboard and the Classic controls (the default):
- P60 "Switching from the ball is not comfortable" — asked: between the Magic Ball and the fists, the sword and the
  other weapons (the key, or the order).
- P61 "Using Arthur's device is not clear" — asked: Arthur's Pocket Set.

Base: `ccr-c1c2c4b9-dep6ed`. Status of everything below: **Automated runtime only** (SwiftShader in headless Chromium
on a shared machine; no GPU, no real gamepad, no real phone).

## P60 — how a weapon was chosen (before)

| Way | Keyboard (Classic) | Pad | What it did |
| --- | --- | --- | --- |
| Swap key | R | LB | to the **previous** weapon (a toggle between the last two) |
| Wheel | hold G (Modern: X) + an arrow, let go | hold RT + left stick | direct choice among up to 13 slots; the world slows |
| Inventory | — | — | only the five tools had Use; the weapons could not be chosen there |
| Ball key | Alt / F | Y | throws the ball whatever is in hand (does not take it in hand) |

Ball → fists → sword → ball, measured on the old build:
- with the toggle: R gives the fists only if the fists were the previous weapon; the sword needs the wheel (the toggle
  goes back to the ball); so in practice: hold G + ←, let go; hold G + →, let go; hold G + ↑, let go — **three holds
  with a direction each** (or R, then the wheel, then R, depending on history: the order depends on what was held
  before, which is what read as "not comfortable").
- the pad: the same with RT + the stick, or LB depending on history.
- The pill named the swap key only with the previous weapon ("R: Fists"), only for a moment after a change.

LBA2 chose its weapon in the inventory and the Magic Ball was the default; a single key that cycles is the modern
comfort the brief asked for.

## P60 — what changed

- **The swap key cycles** what he owns in one fixed order — the ball, the fists, the sword, the glove, the blowgun,
  the laser pistol, the lightning spell, the pulse tool, then the tools (pocket set, lance, fork, line, heat flask) —
  and wraps round to the ball (`combat.js` `CYCLE`, `cycleList()`, `nextOf()`, `cycle()`). A tap acts on release.
- **Back to the ball: hold the swap key 0.4 s** (`SWAP_HOLD`, `toBall()`). The ball key (Alt / F / Y) still throws the
  ball whatever is in hand, as before.
- **Ball → fists → sword → ball now: R, R, R** (three taps, with three weapons owned); with more owned, R, R, then hold R.
  The same on a pad with LB (tap / hold), and on touch with ⇄.
- **The wheel** (hold G Classic / X Modern / RT) stays the direct choice; while it is open the swap key steps its
  choice in the cycle's order (`hud.weaponSelect`).
- **The inventory's Use** takes a weapon in hand (the Magic Ball, the glove, the blowgun, the laser, the lightning), as
  LBA2 chose its weapon there (`inventory.js` `USE`, `gadgets.js use()`).
- **The weapon pill** (bottom right) shows the one in hand by name, the key and what it gives next ("R ▸ Sword"), and,
  when the next one is not the ball, "hold R: Magic Ball"; while the key is held the hint turns to the ball and fills
  (`--hold`). A strip of what he owns, in the cycle's order, the one in hand lit and the next ringed, shows for a
  moment after a change or while the key is held (`hud.weaponStrip`). Keys are the ones bound, in the device in use
  (LB on a pad, a rebound key by its name).
- **Rebindable**: the same action (`swap`), now named "Next Weapon" in Settings → Controls ("Next weapon (hold: back to
  the Magic Ball)"); the pad's controls line says "LB: next weapon (hold: the ball)".
- **A tip** (`tutorial.js` lesson `wswitch`): the first time a third weapon arrives in play (not one a load brought):
  "R Next weapon · hold R: back to the Magic Ball · hold G: the wheel" (touch: without the wheel), for at most 14 s;
  done the first time the swap key or the wheel is used with a choice to make. Settings → Tips Off hides it.
- Untouched: the behaviours (F1–F4, 1–4, Tab, Ctrl + ←/→, the D-pad), the ball key, every other binding.
- A swap key held into a dialogue or a menu never acts after it (`setState` drops the press).

## P61 — the Pocket Set (before)

What the code does (`tools.js`): held out (it is the weapon in hand), it listens for hidden things that hum
(`story/kit2.js hums()`: the cellar's old tin, Vesk's humming crate in the hostel store) in the same room, within
12 m and 4 m of height; the nearer, the quicker the pips (about 1/s at the edge to near-steady on top), the model's own
small needle swings, and a flat arrow lies at his feet pointing the way. The attack key: a squeal; project drones
within 10 m lose their aim for 3 s; 8 s to recover. It came with Arthur saying "something in the cellar hums" — the
first thing to find was a room away, the only feedback was sound and a small arrow, and the only key hint was a toast
naming the wheel.

## P61 — what changed

- **A hands-on moment at once**: giving it, Arthur says how to read it, in his own words, and that he hid one of his
  old radio valves in the house ("Go on, find it!"); without Arthur, his note says the same. The valve hums in the
  hall's big plant pot by the front door, ~9 m from the rug, so everything rises as he crosses the house. Held out
  there: Take (E); a moment of the valve in the pot; Arthur cheers and sends him on to the cellar and tells him of the
  squeal (or a second note does). No reward (it is Arthur's valve). Flags `e2_hide`, `e2_tube`; a save from before
  this has no valve to find.
- **A tip** (`tutorial.js` lesson `pset`, in the house while the valve is to find): "R Hold out the Pocket Set (press
  until it is in your hand)", then, held: "The needle at your feet and the dial show the way · E Take it · hold R:
  put it away". With tips Off, a toast says the keys instead.
- **A visible meter** — the pill shows a dial while the set is held out (`hud.pocketMeter`): its needle swings from
  rest to the far end as a hum nears, its face lights with each pip of the whistle, and a reading beside it ("9 m",
  "here!", "quiet"). Readable with the sound off. The pill stays shown while the set is held out.
- **The inventory's line**: "Hold it out to find hidden things that hum within 12 m: the whistle quickens, the dial
  rises, a needle at your feet points the way. Attack: a squeal that throws project drones off aim for 3 s."
- **The journal** names it once: "Arthur hid one of his radio valves in the house to try his Pocket Set on." (done
  when found), then "Arthur says something hums in the cellar too."; an older save: "Arthur says something hums in the
  cellar. His Pocket Set will find it."
- Later payoff unchanged: the cellar's tin, Vesk's humming crate (ASYLUM-2), the squeal against the depot's drones.

## Text

Every new or changed line in English and Hebrew (`src/game/text/kit2.js`, `wswitch.js` (new), `common.js`,
`i18n.js`; `text/he/` the same, then `node tools/he-bundle.mjs`). No night words. dialogue-check passes. Removed keys:
`e2_ar_set2`, `e2_set_note` (replaced by `e2_ar_set2b`, `e2_set_note2`).

## Tests

- `tests/weapon-switch.mjs` (new): the cycle by keys, the hold back to the ball, the wheel stepped by R and by an
  arrow, the inventory's Use, the behaviours' keys untouched, R held into a dialogue, a faked gamepad (LB tap / hold),
  rebinding through Settings → Controls (click + key), the pill (name, key hint, strip), the tip with Tips Off / On,
  Hebrew.
- `tests/equip2.mjs` (extended): the hands-on moment (the valve's hum, the tip naming R, R until in hand, the dial's
  needle and reading as he crosses the house, its light on the pips, the needle at his feet, Take, no reward, the
  journal, hold R puts it away and the dial goes); then the cellar as before.
- Test helpers following the new key: `tests/lib/player.js` and `tests/playthrough/09-pass.mjs` tap R until the
  weapon they want; `tests/crosssystem.mjs` holds R to go back to the ball.

Results and pictures: see the end of this file.
