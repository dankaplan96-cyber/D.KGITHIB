# Weather and the light cycle (WEATHER-1)

The user's decision of 2.11.2026: outdoors the weather changes now and then, and the light moves slowly from
morning to noon to golden hour and back to morning. **It never gets dark.** Twinsun has two suns, so there is no
Earth-style night, no dusk and no lit-lamps night mode. This is a standing story rule. Each planet has its own
weather.

Code: `src/game/weather.js` (the director), `src/engine/environment.js` (`weatherMods`, the motes, the light floor),
`src/engine/renderer.js` (`setLightTint`), `src/engine/audio.js` (`setStorm(storm, rain, wind)`). Test:
`tests/weather.mjs`.

## How it works

- **States.** Each planet keeps one state for a few minutes (clear 5–10 min, the others 1.5–4 min), then blends
  into the next over 20–40 s. The next state is drawn from a small weighted table.
  - **Twinsun:** clear (most of the time), haze (a morning fog, three times likelier in the morning), light rain,
    wind (leaves on the air), and a rare storm. A storm only follows rain and uses the engine's existing `storm`
    value (`PAL.storm`, lightning, thunder).
    - Desert Island shows only the dry side: rain and storm become blowing dust (`wind`), and it never rains there.
    - The Hamalayi shows a light snow flurry instead of rain.
  - **Zeelich** (the main island and the shuttle islands): clear, mist (drifting cloud-sea mist), gusts (petals) and
    overcast (pale grey-violet). It never rains on Zeelich, and every state keeps the pink-violet LBA2 identity.
- **Light.** One day lasts about 20 minutes on Twinsun and 23 minutes on Zeelich: morning (cool and a little hazy),
  then noon (today's look), then golden hour (warm, with a lower sky fill so the sun's side and the shadows read
  stronger), then back to morning.
  - Only colour, intensity and fog change. The sun's direction is fixed: the rooms and views were composed under it,
    and `ShadowCache` keys its cached static casters on it, so a moving sun would redraw all of them every frame.
  - A gentle frame tint (`renderer.setLightTint`, multiplied with an area's own `gradeTint`) warms and cools the
    people as well. They are lit by their own fixed ramp (`characters.js LbaMaterial`), not by the sun's colour.
- **Floor.** The light measure (luma × intensity of the sun plus the sky fill) never drops below the storm
  palette's. A storm at the cycle's darkest point is raised to that level (`Environment._light`). A region's floor is
  its own clear light × the same ratio.
- **Layered, not replaced.** The director writes multipliers and colour mixes into `env.wx`, and `Environment.update`
  lays them over Citadel's palette or over a region's own `env`. A region's own fog (the sandstorm drives it live),
  sun and grade (`R.grade`, `R.gradeTint`) stay its own.
- **Interiors take no weather.** Indoors nothing is applied, and the storm value is 0. The planets' clocks keep
  running.
- **Clocks.** The clocks run in play and in dialogue. Menus, the inventory, the map and the pause screen freeze
  them.

## Holding it (the story wins)

```js
game.weather.hold('my-scene');        // clear, blended over 4 s; the light holds where it is
game.weather.hold('my-cut', true);    // clear at once (behind a cut or a fade)
game.weather.release('my-scene');     // the clock runs again; clear for 1.5–4 min first
```

The following hold the weather without any call:

- the title screen;
- cinematics and the opening (`game.cine`, state `cinematic`), which go clear at once;
- story cutscenes (state `cutscene`);
- the reveal beats' dialogue close-ups (`story/revealcam.js`, `game.reveal`);
- the benchmark;
- the chapter-4 sandstorm (Desert Island `R.storm.level > 0`).

The weather never starts or stops the sandstorm.

## Off

The weather is off in each of these cases:

- **Settings → Display → "Weather and light changes" set to Off.** This is `settings.weather`, and it defaults to On.
- **The `?noweather` URL flag.**
- **An automated browser** (`navigator.webdriver`) **without `?weather=1`.** Every test therefore boots to today's
  look exactly.

When the weather is off, the modifiers are not applied at all. When it is turned back on, it starts fresh at clear
and noon. Saves hold nothing of the weather, so a load starts fresh too.

Test handles:

- `game.weather.force(state, secs, planet)` and `unforce()`;
- `setPhase(0..1)`, where 0 is morning, 0.3 noon and 0.79 golden hour;
- `timeScale`;
- `info()` and `values()`;
- `?weatherseed=N` for a repeatable schedule.

## Cost

- **Lights and programs:** no new lights and no new shader programs. The rain lines and the motes are compiled
  with the scene's warm-up (`renderer.warmExtra`) when the weather is on.
- **Allocation:** none per frame. The palette mix in `Environment.update` was cloning about 10 colours a frame
  before; it now uses scratch colours.
- **Rain:** the line count is unchanged at 2400 at most. A light rain draws 40 %; Low allows at most 60 %. Only the
  drawn lines are moved.
- **Motes:** one draw of at most 320 points on High, 160 on Medium and none on Low.
- **Draw calls:** measured on the Citadel square at High in one frame (`tests/weather.mjs` COST line), a state adds
  at most one draw call. A shorter fog range lets the fog cull leave more out, so a foggy or rainy state can draw
  fewer calls than clear.
