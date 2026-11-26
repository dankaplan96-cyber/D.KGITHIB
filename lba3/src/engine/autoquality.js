// AUTO-QUALITY (I-13), settle-then-hold (PERF-CPU, the user 29.10). The user (28.10): "the game must detect the
// computer's capabilities automatically and run the quality and the optimal settings accordingly, without manual
// changes. 55–60 fps is the requirement." And (29.10): "there are too many settings"; "Auto should settle on the best
// settings after thinking a little, and then NOT change every few seconds — it jumps"; "if the game runs well on battery
// there's no reason it won't on mains".
//
// Quality: Auto chooses between complete, named profiles (PROFILES, best first): High · Medium (AUTO-2) · Medium-lean (P95) · CPU-eco (P137b) · Low (AUTO-FLOOR, below) · Low 75 % · Low 65 % (P137). A profile is a full set of knobs (resolution, bloom, shadow filter and map, lamps, MSAA, shadows, vegetation
// and small-caster distances, the people's animation rate, the far detail); Auto moves one profile at a time, never a
// single knob. Low / Medium / High chosen by hand are exactly the presets they always were (renderer.knobs stays null).
//
// The Governor:
//   evaluate  a short evaluation: the first ~60–90 s of real play, across at least two different scenes (or 120 s in
//             one). Each 1.5 s window of counted play is classified (ok / paced / cpu / gpu, below). Sustained pressure
//             queues one profile down; a profile that holds 55–60 with room on both sides (by the cost model) may queue
//             ONE step up, once. At the end, the profile in force is LOCKED (`hold`) and cached for this machine and
//             power source as `settled`.
//   hold      no change, except (a) a power-source change (that source's cached profile, or one profile lower on
//             battery / higher on mains, evaluated again), and (b) a sustained real problem: pressure in 80 % of the
//             windows and > 10 % missed refreshes over 30 s of play, seen in two scenes (or 60 s in one scene): one
//             profile down. Never up during a session: a session that had lots of room marks the cache, and the next
//             start tries one profile higher (evaluated; if it can't hold, it goes back and that try is not repeated
//             for a while).
//   P95       a step down is judged when play comes back to a scene measured before it: if it bought nothing (still
//             under pressure there, frame rate up < 10 %), the sharper profile comes back once and no further step of
//             that kind is taken this session (REVISIT_*). The one step up a session can make.
// Every change is visible, so every change is QUEUED and takes effect only at a commit point: a scene change (behind its
// black and shader hold), an open pause / inventory / map, a power change, the start of play. Never mid-play.
//
// Windows: frames that are not play (menus, cinematics and cutscenes, scene changes plus QUIET_AFTER after them,
// shader holds, the loading screen, a hidden window, the benchmark's fixed runs, the tests' fixed stepping) are not
// counted; a frame over STALL_MS is left out of the percentiles and one over BREAK_MS restarts the window: no stall
// ever moves a profile. Each window is
//   ok      ≥ 55 fps (27.5 under a 30 fps limit) with < 6 % of intervals over 1.2 B (B = the frame budget), the
//           stalls left out (P95); under a limit of ≥ 2 refreshes also GPU and CPU p90 ≤ PRESENT of a refresh
//   paced   slower, but CPU p90 and GPU p90 are both ≤ 0.75 B (under the limit: ≤ PRESENT of a refresh), or the
//           intervals sit tightly round one value longer than B with both sides well inside it (SLOW_PANEL, P95: a
//           panel at 40 / 48 Hz on battery): the display / OS sets the pace. Never a reason to degrade.
//   gpu/cpu slower (or, under the limit, on time but past the next refresh: 'late', P95 PRESENT), and that side's p90 is
//           the longer one (no timer query: CPU if its p90 > 0.75 B)
//
// Calibration (a machine, power source or screen not seen before): the start is the GPU name's guess, refined by the
// title screen's own frames (CAL_MS: GPU time, CPU work) with estimate() and the profiles' cost factors. The evaluation
// in play decides; the calibration only picks where it starts.

// ---------------------------------------------------------------- knobs and profiles
// anim: the people's animation rate in view beyond 25 m ('eco': every other frame; out of the view it is always lower:
// drawcull.js FarCull.anim; 'deep', P137b: every other frame from 15 m and every third beyond 25 m). detail: far detail ('near': people's small parts — eyes, buttons, a brooch — dropped under
// 2.5 px instead of 0.75; drawcull.js FarCull.partPx).
export const KNOBS = ['scale', 'bloom', 'filter', 'map', 'lamps', 'msaa', 'shadows', 'veg', 'casters', 'anim', 'detail'];
export const PRESET_KNOBS = {
  high: { scale: 1, bloom: 1, filter: 'soft', map: 4096, lamps: 8, msaa: 4, shadows: 1, veg: 'high', casters: 'high', anim: 'full', detail: 'normal' },
  medium: { scale: 1, bloom: 0, filter: 'pcf', map: 1024, lamps: 4, msaa: 2, shadows: 1, veg: 'medium', casters: 'medium', anim: 'full', detail: 'normal' },
  low: { scale: 0.85, bloom: 0, filter: 'pcf', map: 1024, lamps: 2, msaa: 0, shadows: 0, veg: 'low', casters: 'low', anim: 'full', detail: 'normal' },
};
export const TOP = PRESET_KNOBS.high;
// gpu / cpu: each profile's share of High's time on that side (the cost model: from the user's Vega 8 breakdowns, build
// 244 plugged in, the old ladders' measured steps multiplied out; used to pick a start and to judge a step up's room,
// never to step down — that is measured pressure only)
// LOOK-FIRST (the user, 29.10, after build 263 held Low-lite on battery: "the game looks uglier — rendering, shadows,
// in general … I want the world to look good and sharp, not pixelated … 50–55 that looks good!"): Auto never goes below
// Medium's look: shadows, MSAA and Medium's lamps always; the floor, Medium-eco, draws at 90 % resolution ("less
// resolution is fine, but not excessively"), animates far people at half rate and drops their tiny far parts. (On
// battery the renderer's nearly invisible battery cuts apply on top: renderer.js LOOK-FIRST-2.) LOOK-FIRST-3 (the user's full
// battery benchmark, 0.40.0): Medium-eco also takes Low's grass/flower distance and small casters — on his street that was the
// biggest GPU lever left (Low street GPU 12.9 ms vs Medium without shadows 17.1) and the casters ~2.8 ms of CPU; the far grass
// and far small shadows are what goes, never the shadows, the edges or the resolution under 90 %. Low / Medium-lite /
// Low-lite are gone from Auto (Low stays a preset to pick by hand); on a weak machine on battery the game runs ~50–55
// fps in the busiest places rather than look worse (it was not faster there anyway: CPU-bound).
// AUTO-2 (the user, 30.10, after 0.41.0 on his laptop: "Auto works but it is less nice than Medium; Medium runs quite well
// on battery … I want Auto to sense the game by itself and decide the graphics by itself"): Medium-eco is gone — on his
// street it bought ~1 fps and looked worse. Auto is High or Medium, never below Medium's look; plugged in it starts at
// High (his street holds a flat 60 there) and steps down to Medium only on measured pressure; on battery it is Medium.
// AUTO-FLOOR (the user, 01.11, after the i5's battery benchmark held ~38-45 fps on Medium with Auto stuck at its floor:
// "I want Auto to always aim for 55-60 fps according to the computer's ability, that's it"): Low is back as Auto's last
// profile, reached only by the same measured, sustained pressure as any step down (never a start guess: a first start is
// at most Medium, autoapply.js). It is the Low preset exactly. Cost factors from the i5's UHD plugged in (0.48.0: street
// GPU High 24.1, Medium 11.0, Low 7.7 ms; render submit High 14.8, Medium 5.1, Low 5.4 ms with the sim's share).
// P95 (the user, 21.11: "make Auto give the best image and quality while keeping it running smoothly, in every way";
// sharpness first, then effects): Medium-lean between Medium and Low. Medium → Low dropped the resolution (85 %), the
// edges (MSAA) and the shadows in one step, so a machine a little short of Medium lost all three. Medium-lean keeps the
// resolution at 100 % and the shadows (Medium's map and filter) and drops what costs GPU time the eye misses most:
// MSAA (the edges are smoothed in the output pass instead — what Medium chosen by hand already does on a high-density
// screen, and every profile does on battery), lamps 4 → 2, the far grass and far small shadows (Low's distances), far
// people at half rate beyond 25 m and their tiny far parts. Its GPU share: Medium's × MSAA's saving (0.87–0.90 measured:
// GTX 1050 street 8.2 → 7.2–7.4 ms, Vega 8 battery −5.3 of 37 ms) × ~0.95 for the rest. On battery the battery profile
// already takes MSAA and lamps away from every profile, so there Medium-lean adds almost nothing and the ladder skips it
// (Governor opts.skip; autoapply.js). It is never a start (a guess or a calibration starts at Medium at the lowest).
// P137 (the user, 26.11, the UHD 620 laptop: "whatever we do, 30 fps just looks bad"; picked: always 60, lower the quality
// instead): three rungs below Low, so a machine Low cannot hold at 60 has somewhere to go. The four above are unchanged
// (the user's own order: LOOK-FIRST, AUTO-2, P95 — effects and edges first, resolution and shadows last). Below Low
// each rung answers one side, and `only` says which: a step down for CPU pressure never takes a resolution-only rung
// (it would cost sharpness and buy no CPU time), and one for GPU pressure steps over the CPU rung (it buys almost no GPU
// time, so P95's revisit would take it back and block every GPU step after it). Governor.below(p, kind).
//   Low-eco  (CPU) Low + far people animated at half rate beyond 25 m + their tiny far parts dropped (Medium-lean's two
//            CPU knobs, which Low, the preset, does not have). The picture at the play camera: as Low. (P137b: replaced
//            by CPU-eco, which keeps the shadows: the next paragraph.)
//   Low 75 % (GPU) Low + the two far-people knobs at 75 % resolution (Low's 85 → 75: −22 % pixels), the output pass's sharpening on.
//   Low 65 % (GPU) the same at 65 % (−25 % pixels from 75). The floor: at the UHD 620 laptop's pixel ratio 1.25 (an
//            integrated GPU on a dPR 2 screen) 0.81 of the screen's pixels across; on a dPR 1 screen 0.65 — never under
//            minDyn's 0.6. (Steps of ~−22 % pixels, not smaller: P95's revisit keeps a step that bought ≥ 7 %, and a GPU
//            pays for only part of its time by the pixel, so −11 % pixels would buy ~6 % and be taken back.)
// P137b (the user, 26.11, the same laptop's street: CPU-bound, "relieve the processor", and keep the shadows: Auto must not
// turn them off for CPU pressure): Low-eco (CPU: Low's picture, shadows OFF, + the two far-people knobs) is replaced by
// CPU-eco, the CPU side's only rung below Medium-lean. It is Medium-lean's picture exactly — its shadows (map, filter,
// casters), its full resolution, its lamps, grass and edges — with one knob more, the only visible trade the user allowed:
// far people animated at a lower rate (anim 'deep': every other frame in view from 15 m, every third beyond 25 m; out of
// the view as before). Its id stays 'loweco', so a machine that settled on Low-eco (the user's laptop after P137) comes
// back to CPU-eco: the same rung, with its shadows. It sits above Low (its GPU cost is Medium-lean's, Low's is lower; its
// CPU cost is Low's or a little more), so the list stays ordered on both sides. CPU pressure goes Medium → Medium-lean →
// CPU-eco and stops there: no rung below it is a CPU rung, so CPU pressure never takes the shadows. GPU pressure goes
// Medium-lean → Low → Low 75 % → Low 65 % exactly as in P137 (Low, Low 75 % and Low 65 % unchanged). What CPU-eco buys was
// measured small (docs/lba-maturity/CPU-RELIEF.md: ~2 % of a street frame with the follow camera, ~0 with the orbit).
// Like any step it is judged by P95's revisit only when play comes back to a scene measured at Medium-lean before it:
// then, under 7 %, Medium-lean comes back and no further CPU step is taken. Otherwise (no such revisit during the
// evaluation) CPU-eco is held: the UHD 620 model on mains settles on it (tests/autoquality.mjs).
// The CPU work no profile removes was cut for every profile instead (CPU-RELIEF: Math.hypot, …).
// Low itself is now a GPU rung (`only: 'gpu'`): from Medium-lean it lowers the resolution and turns the shadows off, but
// gives back the far-people knobs Medium-lean had, so for CPU pressure it bought ~nothing (P95's revisit took it back:
// the UHD 620's street, AUTO-P95 S4) and then blocked every CPU step after it. CPU pressure at Medium-lean went to
// Low-eco instead: Low's picture with Medium-lean's far-people knobs kept, the shadows off (the CPU side's biggest
// lever left; P137b: CPU-eco instead, its shadows kept, above). GPU pressure goes Medium-lean → Low → Low 75 % → Low 65 % as before.
// No rung below Low turns anything else off: the shadows are already off at Low (CPU-eco, above Low, keeps them); lamps stay 2 (night streets and
// interiors need them to read), the vegetation and small casters are already at Low's distances; nothing a rung
// changes touches the simulation, collision, aim or timing (visual knobs only). The gpu / cpu shares of the three are
// ESTIMATES (no hardware measured them): Low's × the pixel share at the GPU (0.55 + 0.45 · s², the test machines'
// truth) and × 0.95 · 0.94 at the CPU for the two far-people knobs; they pick nothing at a start (a start is never
// below Medium) and only judge a step up's room.
export const PROFILES = [
  { id: 'high', name: 'High', tier: 'high', K: { ...PRESET_KNOBS.high }, gpu: 1, cpu: 1 },
  { id: 'medium', name: 'Medium', tier: 'medium', K: { ...PRESET_KNOBS.medium }, gpu: 0.56, cpu: 0.8 },
  { id: 'lean', name: 'Medium-lean', tier: 'medium', K: { ...PRESET_KNOBS.medium, msaa: 0, lamps: 2, veg: 'low', casters: 'low', anim: 'eco', detail: 'near' }, gpu: 0.46, cpu: 0.74 },
  { id: 'loweco', name: 'CPU-eco', tier: 'medium', only: 'cpu', K: { ...PRESET_KNOBS.medium, msaa: 0, lamps: 2, veg: 'low', casters: 'low', anim: 'deep', detail: 'near' }, gpu: 0.46, cpu: 0.72 },
  { id: 'low', name: 'Low', tier: 'low', only: 'gpu', K: { ...PRESET_KNOBS.low }, gpu: 0.32, cpu: 0.7 },
  { id: 'low75', name: 'Low 75 %', tier: 'low', only: 'gpu', K: { ...PRESET_KNOBS.low, scale: 0.75, anim: 'eco', detail: 'near' }, gpu: 0.29, cpu: 0.63 },
  { id: 'low65', name: 'Low 65 %', tier: 'low', only: 'gpu', K: { ...PRESET_KNOBS.low, scale: 0.65, anim: 'eco', detail: 'near' }, gpu: 0.26, cpu: 0.63 },
];
export const N_PROFILES = PROFILES.length;
export const indexOfId = (id) => PROFILES.findIndex((x) => x.id === id);
export const TIER_AT = { high: 0, medium: 1, low: indexOfId('low') };   // (P137: Low by id, the rungs below it are Auto's own)
export const START_FLOOR = TIER_AT.medium;   // (AUTO-FLOOR: a guess never starts below Medium; only measured pressure goes lower)
export const profileOf = (p) => PROFILES[Math.max(0, Math.min(N_PROFILES - 1, p | 0))];
export const knobsAt = (p) => ({ ...profileOf(p).K });
export const costAt = (p, side) => profileOf(p)[side];

// in words, for Settings and the benchmark: the profile's name (and, in the benchmark, what it runs)
const WORD = {
  bloom: { 1: 'bloom', 0: 'no bloom' }, filter: { soft: 'soft shadows', pcf: 'plain shadow edges' },
  map: { 4096: 'shadow map 4096', 2048: 'shadow map 2048', 1024: 'shadow map 1024' }, lamps: { 8: '8 lamps', 4: '4 lamps', 2: '2 lamps' },
  msaa: { 4: 'MSAA 4×', 2: 'MSAA 2×', 0: 'no MSAA (edges smoothed in the output pass)' }, shadows: { 1: 'shadows', 0: 'no shadows' },
  veg: { high: "High's grass distance", medium: "Medium's grass distance", low: "Low's grass" },
  casters: { high: "High's small shadows", medium: "Medium's small shadows", low: "Low's small shadows" },
  anim: { full: 'full-rate animation', eco: 'far people animated at half rate', deep: 'far people animated at half rate from 15 m, a third beyond 25 m' }, detail: { normal: 'full far detail', near: 'far small parts dropped' },
};
export function describe(K) {
  const P = PROFILES.find((x) => KNOBS.every((k) => x.K[k] === K[k]));
  if (P) return { tier: P.tier, id: P.id, diffs: [], text: P.name };
  // (not a profile — the benchmark's fixed knobs: the nearest profile and what differs)
  let best = null;
  for (const X of PROFILES) { let n = 0; for (const k of KNOBS) if (X.K[k] !== K[k]) n++; if (!best || n < best.n) best = { X, n }; }
  const diffs = KNOBS.filter((k) => k !== 'scale' && best.X.K[k] !== K[k]).map((k) => WORD[k]?.[K[k]] ?? `${k} ${K[k]}`);
  if (K.scale !== best.X.K.scale) diffs.push(`resolution ${Math.round(K.scale * 100)} %`);
  return { tier: best.X.tier, id: best.X.id, diffs, text: `${best.X.name}${diffs.length ? ', ' + diffs.join(', ') : ''}` };
}
// what a profile runs, in words (the benchmark's report and AUTO_QUALITY.md)
export const spell = (p) => { const K = profileOf(p).K; return `${profileOf(p).name}: resolution ${Math.round(K.scale * 100)} %, ${WORD.msaa[K.msaa]}, ${WORD.bloom[K.bloom]}, ${K.shadows ? `${WORD.filter[K.filter]}, ${WORD.map[K.map]}, ${WORD.casters[K.casters]}` : 'no shadows'}, ${WORD.lamps[K.lamps]}, ${WORD.veg[K.veg]}, ${WORD.anim[K.anim]}, ${WORD.detail[K.detail]}`; };

// Start position from measurements at a known profile (calibration). gpuMs / cpuMs: p90 of the title's frames at
// profile p0; null when not measured (no timer query: the GPU side is not limited). MARGIN: the title's view is lighter
// than play (fewer people, no combat): its numbers are scaled up before they are compared with the budget.
export const CAL = { budgetShare: 0.7, marginGpu: 1.15, marginCpu: 1.3 };
export function estimate({ gpuMs = null, cpuMs = null, p0 = 0, budget = 1000 / 60 }) {
  const lim = CAL.budgetShare * budget;
  const hiG = gpuMs > 0 ? (gpuMs * CAL.marginGpu) / costAt(p0, 'gpu') : null, hiC = cpuMs > 0 ? (cpuMs * CAL.marginCpu) / costAt(p0, 'cpu') : null;
  for (let p = 0; p < N_PROFILES; p++) if ((hiG == null || hiG * costAt(p, 'gpu') <= lim) && (hiC == null || hiC * costAt(p, 'cpu') <= lim)) return { p };
  return { p: N_PROFILES - 1 };
}

// the cache of calibrations / settled profiles: per GPU, power source and screen (and processor in the desktop app)
// P95: v5 adds Medium-lean between Medium and Low, so an index changed meaning; each entry now also carries its profile's
// id. v4 entries (High · Medium · Low) are read once and moved over by id (migrateCache), so a machine's settled profile
// survives the update.
export const CACHE_KEY = 'lba3_autoq_v5', CACHE_KEY_V4 = 'lba3_autoq_v4', V4_IDS = ['high', 'medium', 'low'];
// a stored cache (any version) → v5 entries: by id when the entry has one, else by the old index; anything unreadable dropped
export function migrateCache(c, fromV4 = false) {
  const out = {};
  if (!c || typeof c !== 'object') return out;
  for (const [k, E] of Object.entries(c)) {
    if (!E || typeof E !== 'object') continue;
    const p = typeof E.id === 'string' ? indexOfId(E.id) : fromV4 ? indexOfId(V4_IDS[E.p] ?? '') : E.p;
    if (!(Number.isInteger(p) && p >= 0 && p < N_PROFILES)) continue;
    out[k] = { ...E, p, id: PROFILES[p].id };
  }
  return out;
}
export const machineKey = ({ gpu = '?', battery = false, screen = '?', cpu = '' }) => `${gpu}|${battery ? 'battery' : 'mains'}|${screen}${cpu ? '|' + cpu : ''}`;

export const WINDOW = 1500, QUIET_AFTER = 1500, STALL_MS = 100, BREAK_MS = 250;
// the evaluation: at least EVAL_MS of counted play across EVAL_SCENES scenes (or EVAL_MAX in one); a step down after
// DOWN_RUN pressure windows in a row (or DOWN_OF of the last DOWN_IN); it passes with ≤ PASS_PRESSURE of its windows
// under pressure and ≤ PASS_MISS of the intervals missed outside display-paced windows; a step up needs UP_MIN of counted
// play over 2 scenes, no window under pressure, and the model's prediction for the profile above ≤ UP_SHARE·B on both
// sides in ≥ UP_FIT of the windows (P95: was every window — one noisy window blocked the step for the whole evaluation)
export const EVAL_MS = 60000, EVAL_SCENES = 2, EVAL_MAX = 120000, DOWN_RUN = 3, DOWN_OF = 4, DOWN_IN = 6;
export const PASS_PRESSURE = 0.1, PASS_MISS = 0.05, UP_MIN = 30000, UP_SHARE = 0.72, UP_FIT = 0.9;
// hold: a sustained real problem = over the last HOLD_SPAN of counted play, ≥ HOLD_PRESSURE of the windows under
// pressure and > HOLD_MISS of the intervals missed, the pressure seen in two scenes (or HOLD_ONE_SCENE in one scene);
// after a step, HOLD_COOL before another
export const HOLD_SPAN = 30000, HOLD_PRESSURE = 0.8, HOLD_MISS = 0.1, HOLD_ONE_SCENE = 60000, HOLD_COOL = 60000;
// the next start's try one profile up: when the held session had room for it in ≥ MARGIN_SHARE of ≥ MARGIN_MIN of play
export const MARGIN_MIN = 180000, MARGIN_SHARE = 0.9, UP_TRY_BLOCK = 3;
export const SETTLE_MS = 60000, CAL_MS = 1500, CAL_WAIT = 600;
// P95 — the display's own pace and the 30 limit:
//   SLOW_PANEL  a window whose intervals sit tightly round one value (p10 ≥ 0.85·p50, p90 ≤ 1.2·p50) longer than the
//               budget (p50 ≥ 1.1·B), with the CPU and GPU p90 both ≤ SLOW_PANEL·p50, is a display refreshing slower than
//               the budget — a laptop panel switched to 40 / 48 Hz on battery (GTX1050-BATTERY: 41.0 Hz with nothing
//               drawn; Auto went Medium → Low on "GPU pressure 38.1 fps, GPU p90 17.1 ms" and Low ran the same 41 fps).
//               A game too slow for a fixed 60 Hz panel cannot make such a window: its intervals are whole refreshes
//               (16.7 / 33.3 ms, a mix). It is 'paced': never a reason to degrade. (Needs the GPU timer: without it a
//               variable-refresh screen showing a GPU-bound game looks the same, and the old rule stands.)
//   PRESENT     under a limit of two or more refreshes (30 on a 60 Hz screen) a frame is drawn on one refresh and must be
//               ready by the next to be shown on time: one whose GPU (or CPU) work runs past that refresh is shown a
//               refresh late — a 50 ms then a 16.7 ms picture — although every requestAnimationFrame interval reads
//               33.3 ms (FPS30-PRESENT counts presented ≥ 50 ms intervals; FPS30.md §7: the UHD 620 at 30 drew with GPU
//               17–18.5 ms a frame, and the user: "30 isn't even"). So under such a limit the GPU and CPU p90 must stay
//               ≤ PRESENT of a refresh (16.7 ms at most counted: on a 120 Hz screen a refresh late is a smaller step);
//               above it the window is pressure ('late') even when every interval is on time. This is also why a step up
//               at 30 is judged on 60's budget (upBudget): the time a 30 limit leaves between frames cannot be spent on a
//               slower frame.
export const SLOW_PANEL = 0.85, PRESENT = 0.85;
// P95 — a step down that did not help goes back: after a step down, the first windows in a scene measured at the
// profile above (≥ REVISIT_BEFORE there, ≥ REVISIT_AFTER at the new one) decide. Kept when at least half of them are
// 'ok', or the pressure eased by ≥ REVISIT_GAIN (frame rate up; for a 'late' window the pressure side's p90 down).
// Otherwise the step bought nothing — CPU work no profile removes, the browser's own pacing on battery (FPS30-PRESENT:
// Low at 60 on battery still missed refreshes, main thread p95 28.8 ms) — and the sharper profile comes back (queued,
// at a commit point, once per step) and no further step of that kind is taken this session: Auto keeps the picture
// rather than lose sharpness for nothing.
export const REVISIT_BEFORE = 2, REVISIT_AFTER = 4, REVISIT_GAIN = 0.07, REC_KEEP = 8, KA_SCALE = 0.5;
// GPU-TIMER-KA (P96-HW, the desktop 21.11: with the keep-alive mark — main.js _keepAlive, a 1 px change on each refresh the
// frame-rate limit skips — the GTX 1050's GPU timer read 16–20 ms a frame at 30 against 6–8 ms without it, while
// nvidia-smi's load did not rise; at 60 (no skipped refresh, no mark) it read as before). The query cannot span a skipped
// refresh (renderer.js begins and ends it round composer.render() in one task); on ANGLE/D3D11 a TIME_ELAPSED query is two
// GPU timestamps on the queue the whole browser shares, so it also counts whatever the GPU process runs or waits for
// between them — most likely the compositor's extra frames and presents the mark brings. Such a reading is not the frame's
// own work, so it cannot by itself say a frame is shown late. A window that is 'late' by the GPU reading alone (every
// interval on time, CPU p90 within PRESENT) with most of its GPU samples taken after a mark is `suspect`:
//   - in the evaluation it is pressure as before, but a step down it causes is the only one of its kind until P95's
//     revisit has judged it (the step back when it bought nothing, REVISIT_*): a reading the mark inflates barely falls
//     with the profile, so the step comes back and no further GPU step is taken this session; a GPU that is really past
//     the refresh (the UHD 620 at 30, FPS30.md §7) falls with it and keeps going down, one judged step at a time;
//     (Kept when its GPU reading fell by ≥ KA_SCALE of the drop the profiles' cost model predicts for the step — a reading
//     made of the frame's own work falls about as predicted: the UHD 620's street, Medium → Medium-lean, truth 0.85
//     against the model's 0.82 — or when the part that fell, scaled back by the model (fall / (1 − ratio)), was itself
//     past the 'heavy' line: the frame's own work was late, whatever fixed share the mark adds. Otherwise it comes back.)
//   - in hold it is not a sustained problem (the evaluation, where steps are judged, decides);
//   - the title calibration sets such readings aside (the name's guess stands; the CPU side may still lower it).
// Everything else — CPU 'late', windows with missed intervals, readings without a mark (no limit, or
// localStorage.lba3_keepalive = '0') — is judged exactly as before.

const pct = (a, p) => { if (!a.length) return null; const v = a.slice().sort((x, y) => x - y); return v[Math.min(v.length - 1, Math.floor(p * v.length))]; };
const med = (a) => pct(a, 0.5);
const isPressure = (x) => x.kind === 'cpu' || x.kind === 'gpu';

export class Governor {
  // opts: budget() → the frame budget in ms (16.7, or 33.3 under a 30 fps limit); upBudget() → the budget a step up is
  // judged on (60's under a 30 limit); refresh() → the display's measured refresh interval (ms, or null: 16.7 assumed);
  // skip(p) → true when profile p adds nothing in the current state (Medium-lean on battery): the ladder steps over it;
  // onChange(info) → a queued step (the game shows nothing yet); log: an array the decisions are pushed to
  constructor(opts = {}) {
    this.budget = opts.budget || (() => 1000 / 60);
    // FPS30: the budget a step UP is judged against: 60 fps's even under a 30 fps limit (P95, PRESENT above: a frame must
    // still be ready by the next refresh); pressure and steps down use budget() and the PRESENT rule
    this.upBudget = opts.upBudget || this.budget;
    this.refresh = opts.refresh || (() => null);
    this.skip = opts.skip || (() => false);
    this.onChange = opts.onChange || (() => {});
    this.log = opts.log || [];
    this.p = 0; this.applied = 0; this.phase = 'evaluate'; this.enabled = true;
    this.win = null; this.quietUntil = 0; this.since = 0; this.windows = 0; this.gpuSeen = false;
    this.ev = null; this.hold = null; this.upUsed = false; this.lastStep = -1e9; this.room = { n: 0, ok: 0 };
    this.rec = new Map(); this.lastDown = null; this.noHelp = {}; this.pressured = new Set();
    this.startEval(0, 'start');
  }
  // the next profile below / above p on the ladder (skipping what adds nothing now); null at the end. kind: the pressure a
  // step down answers ('cpu' | 'gpu'): a rung for the other side only (P137's rungs below Low) is stepped over
  below(p = this.applied, kind = null) { for (let q = p + 1; q < N_PROFILES; q++) if (!this.skip(q) && !(kind && PROFILES[q].only && PROFILES[q].only !== kind)) return q; return null; }
  // (P137: up from a rung for one side, the rungs for the other side are stepped over — up from Low 75 % is Low, not
  //  Low-eco, whose GPU cost was Low's: a GPU-bound game would go up into the load it just left and down again;
  //  P137b: up from Low is Medium-lean, never CPU-eco, for the same reason)
  above(p = this.applied) { const o = PROFILES[p]?.only; for (let q = p - 1; q >= 0; q--) if (!this.skip(q) && !(PROFILES[q].only && PROFILES[q].only !== o)) return q; return null; }
  // ---- where it stands: wanted (queued) and in force (applied at the last commit point)
  wanted() { return knobsAt(this.p); }
  knobs() { return knobsAt(this.applied); }
  pending() { return this.p !== this.applied ? ['profile'] : []; }
  label() { return describe(this.knobs()); }
  // the queued profile takes effect (the game compiles its programs now): returns what changed
  commit(why = 'scene change') {
    if (this.p === this.applied) return [];
    const from = this.applied; this.applied = this.p;
    const ch = [`${profileOf(from).name} → ${profileOf(this.p).name}`];
    this.note({ kind: 'commit', why, what: ch[0] });
    // (a fresh look at the profile now in force)
    if (this.phase === 'evaluate') this.resetEval();
    this.resetWin(this.since + QUIET_AFTER);
    return ch;
  }
  // put it somewhere (calibration, cache, power change, the benchmark); commitNow: in force at once (a commit point)
  setProfile(p, why, { phase = 'evaluate', commitNow = false, t = this.since, trial = false } = {}) {
    this.p = Math.max(0, Math.min(N_PROFILES - 1, p | 0));
    if (commitNow) this.applied = this.p;
    this.lastDown = null; this.pressured = new Set();   // (a new start: no step of the governor's own left to judge)
    this.note({ kind: 'set', why, what: `${profileOf(this.p).name}${phase === 'hold' ? ' (held)' : ' (evaluating)'}` });
    if (phase === 'hold') this.lock('set', t); else this.startEval(t, why, trial);
  }
  startEval(t, why, trial = false) { this.phase = 'evaluate'; this.upUsed = trial; this.trial = trial ? { from: this.p } : null; this.ev = { t0: t, scenes: new Set(), ms: 0, w: [], why }; this.hold = null; this.resetWin(t); }
  resetEval() { if (this.ev) { this.ev.ms = 0; this.ev.w = []; } }
  lock(why, t = this.since) {
    this.phase = 'hold'; this.hold = { w: [], cool: t, since: t }; this.ev = null; this.room = { n: 0, ok: 0, ms: 0 };
    this.note({ kind: 'settled', why, what: `${profileOf(this.p).name} held` });
  }
  note(e) { e.t = Math.round(this.since); e.state = profileOf(this.applied).name; if (this.p !== this.applied) e.pending = profileOf(this.p).name; this.log.push(e); if (this.log.length > 400) this.log.splice(0, this.log.length - 400); }
  resetWin(until = 0) { this.win = { f: [], cpu: [], dur: 0, stalls: 0, miss: 0, t0: null }; this.quietUntil = Math.max(this.quietUntil || 0, until); }

  // one displayed frame. f: { t: ms (a clock), ms: interval, cpu: the game's CPU work (ms), play: counted, scene: id }
  frame(f) {
    this.since = f.t;
    if (!this.enabled) return null;
    if (!f.play) { this.win = { f: [], cpu: [], dur: 0, stalls: 0, miss: 0, t0: null }; this.quietUntil = Math.max(this.quietUntil, f.t + QUIET_AFTER); return null; }
    if (f.scene != null && f.scene !== this.scene) { this.scene = f.scene; this.sceneAt = f.t; }
    if (f.t < this.quietUntil) return null;
    if (f.ms > BREAK_MS) { this.win = { f: [], cpu: [], dur: 0, stalls: 0, miss: 0, t0: null }; this.quietUntil = f.t + QUIET_AFTER; return null; }
    const W = this.win;
    if (W.t0 == null) W.t0 = f.t - f.ms;
    W.dur += f.ms;
    if (f.ms > STALL_MS) W.stalls++; else { W.f.push(f.ms); if (f.cpu != null) W.cpu.push(f.cpu); }
    if (W.dur < WINDOW) return null;
    this.win = { f: [], cpu: [], dur: 0, stalls: 0, miss: 0, t0: null };
    if (W.f.length < 5) return null;   // (a window of stalls: nothing to judge)
    const w = this.classify(W, f.t);
    w.scene = this.scene; w.at = this.applied;
    this.windows++; this.lastWindow = w;
    this.record(w);
    return this.phase === 'evaluate' ? this.evaluate(w, f.t) : this.held(w, f.t);
  }
  // the GPU's own time for a frame drawn at about time t (arrives a few frames late)
  // (GPU-TIMER-KA: ka — measured after a keep-alive mark)
  gpu(t, ms, ka = false) { (this.gpuBuf ??= []).push([t, ms, !!ka]); this.gpuSeen = true; if (this.gpuBuf.length > 600) this.gpuBuf.splice(0, 300); }

  classify(W, t) {
    const B = this.budget(), R = this.refresh(), L = R > 0 && R < 50 ? R : 1000 / 60;
    // (P95: stalls — frames over STALL_MS: compiles, uploads, a GC — are left out of the rate and the misses that judge a
    //  window, as they always were of the percentiles: no stall moves a profile; they are still counted for the report)
    const f = W.f, nS = f.length, durS = f.reduce((s, x) => s + x, 0), n = nS + W.stalls;
    const fps = (nS * 1000) / Math.max(1, durS), p50 = pct(f, 0.5) ?? B, p10 = pct(f, 0.1) ?? B, p90 = pct(f, 0.9) ?? B;
    const missN = f.filter((x) => x > 1.2 * B).length, miss = missN / Math.max(1, nS);
    const cpu = pct(W.cpu, 0.9);
    const gs = (this.gpuBuf || []).filter(([ts]) => ts >= W.t0 - 100 && ts <= t + 100), g = gs.map((x) => x[1]);
    const gpu = g.length >= 8 ? pct(g, 0.9) : null, gka = g.length ? gs.filter((x) => x[2]).length / g.length : 0;
    const want = (1000 / B) * (55 / 60), onTime = fps >= want && miss < 0.06;
    // under a limit of ≥ 2 refreshes (P95 PRESENT): a frame must be ready by the next refresh; the 'heavy' line is that
    // share of a refresh (at most 16.7 ms counted) instead of 0.75 of the budget
    const capped = B > 20 && B >= 1.5 * L, H = capped ? Math.min(PRESENT * Math.max(L, 1000 / 60), 0.75 * B) : 0.75 * B;
    const late = capped && ((gpu != null && gpu > H) || (cpu != null && cpu > H));
    let kind;
    if (onTime && !late) kind = 'ok';
    else if (onTime) kind = gpu != null && gpu > H && gpu >= (cpu ?? 0) ? 'gpu' : 'cpu';   // ('late': on time by rAF, shown a refresh late)
    else if (gpu != null) {
      const slowPanel = p50 >= 1.1 * B && p10 >= 0.85 * p50 && p90 <= 1.2 * p50 && gpu <= SLOW_PANEL * p50 && (cpu ?? 0) <= SLOW_PANEL * p50;
      kind = ((cpu ?? 0) <= H && gpu <= H) || slowPanel ? 'paced' : gpu >= (cpu ?? 0) ? 'gpu' : 'cpu';
    } else kind = cpu > H ? 'cpu' : miss < 0.08 && p90 <= 1.17 * B ? 'paced' : 'gpu';
    // (GPU-TIMER-KA: on time, late by the GPU reading alone, and that reading mostly taken after keep-alive marks)
    const suspect = onTime && late && kind === 'gpu' && gka >= 0.5 && !(cpu != null && cpu > H);
    return { t: Math.round(t), dur: W.dur, n, kind, late: onTime && late, suspect, gka: +gka.toFixed(2), line: +H.toFixed(1), fps: +fps.toFixed(1), p50: +p50.toFixed(1), p90: +p90.toFixed(1), miss: +miss.toFixed(3), missN, cpu: cpu == null ? null : +cpu.toFixed(1), gpu: gpu == null ? null : +gpu.toFixed(1), stalls: W.stalls };
  }
  why(ws) {
    if (!ws.length) return '';
    const f = (k) => (ws.every((x) => x[k] != null) ? Math.max(...ws.map((x) => x[k])) : null), n = ws.reduce((s, x) => s + x.n, 0), m = ws.reduce((s, x) => s + x.missN, 0);
    const late = ws.some((x) => x.late) ? ` · ${ws.filter((x) => x.late).length} window(s) on time but past the next refresh (shown late under the limit)` : '';
    return `${(ws.reduce((s, x) => s + x.fps, 0) / ws.length).toFixed(1)} fps over ${(ws.reduce((s, x) => s + x.dur, 0) / 1000).toFixed(0)} s · frame p90 ≤ ${f('p90')} ms · CPU p90 ≤ ${f('cpu') ?? '?'} ms · GPU p90 ≤ ${f('gpu') ?? 'n/a'} ms · missed ${Math.round((100 * m) / Math.max(1, n))} %${late}`;
  }
  // would the profile above fit? (the model, from the windows given: none under pressure, both sides ≤ UP_SHARE·B in
  // ≥ UP_FIT of them; one window alone: that window)
  fitsAbove(w, up = this.above(this.applied)) {
    if (up == null) return false;
    const B = Math.min(this.budget(), this.upBudget());
    return w.cpu != null && (w.cpu * costAt(up, 'cpu')) / costAt(this.applied, 'cpu') <= UP_SHARE * B
      && (w.gpu == null ? w.p90 <= 1.03 * B && w.miss < 0.02 : (w.gpu * costAt(up, 'gpu')) / costAt(this.applied, 'gpu') <= UP_SHARE * B);
  }
  roomAbove(ws) {
    const up = this.above(this.applied);
    if (up == null || !ws.length || ws.some(isPressure)) return false;
    return ws.filter((w) => this.fitsAbove(w, up)).length >= Math.max(1, Math.ceil(UP_FIT * ws.length));
  }
  // a step (queued: in force at the next commit point) to profile `to`; kind/late: the pressure it answers (a step down)
  stepTo(to, t, why, { kind = null, late = false, suspect = false, revert = false } = {}) {
    if (to == null || to < 0 || to >= N_PROFILES || to === this.applied || this.p !== this.applied) return null;
    const dir = to > this.applied ? 'down' : 'up';
    const info = { kind: dir, what: `${profileOf(this.applied).name} → ${profileOf(to).name} (at the next scene change or menu)`, why, from: this.applied, to, revert };
    if (dir === 'down') { this.lastDown = { from: this.applied, to, kind, late, suspect, t, done: false }; this.pressured.add(this.applied); }
    this.p = to; this.lastStep = t;
    this.note(info); this.onChange(info);
    return info;
  }
  step(dir, t, why, opt) { return this.stepTo(dir > 0 ? this.below(this.applied, opt?.kind) : this.above(this.applied), t, why, opt); }
  // the pressure the windows show: the side most of them name, and whether they were 'late' (PRESENT)
  pressureOf(ws) {
    const P = ws.filter(isPressure); if (!P.length) return { kind: null, late: false };
    const g = P.filter((x) => x.kind === 'gpu').length;
    return { kind: g * 2 >= P.length ? 'gpu' : 'cpu', late: P.filter((x) => x.late).length * 2 > P.length, suspect: P.filter((x) => x.suspect).length * 2 > P.length };
  }
  // (GPU-TIMER-KA: a step down taken for suspect pressure, in force and not yet judged by the revisit)
  suspectPending() { const D = this.lastDown; return !!D && D.suspect && !D.done && this.applied === D.to; }
  // may it step down for this kind of pressure? (not from where a step of that kind already bought nothing, or lower)
  mayStepDown(kind) { return this.below(this.applied, kind) != null && !(kind && this.noHelp[kind] != null && this.applied >= this.noHelp[kind]); }
  // (the windows of each scene at each profile, for judging a step: the last REC_KEEP)
  record(w) {
    const k = `${w.scene}|${w.at}`, a = this.rec.get(k) || [];
    a.push(w); if (a.length > REC_KEEP) a.shift();
    this.rec.set(k, a);
  }
  // P95: the last step down, judged in a scene measured at the profile above (REVISIT_* above): null, or the step back
  judgeStep(w, t) {
    const D = this.lastDown;
    if (!D || D.done || this.applied !== D.to || this.p !== this.applied || w.at !== D.to) return null;
    const before = this.rec.get(`${w.scene}|${D.from}`) || [], after = this.rec.get(`${w.scene}|${D.to}`) || [];
    if (before.length < REVISIT_BEFORE || after.length < REVISIT_AFTER) return null;
    D.done = true;
    if (after.filter((x) => x.kind === 'ok').length * 2 >= after.length) return null;
    const side = D.kind === 'cpu' ? 'cpu' : 'gpu', b = med(before.map((x) => x[side]).filter((x) => x != null)), a = med(after.map((x) => x[side]).filter((x) => x != null));
    const fb = med(before.map((x) => x.fps)), fa = med(after.map((x) => x.fps));
    const gain = D.late ? (b > 0 && a != null ? 1 - a / b : 0) : fa / Math.max(1, fb) - 1;
    // (GPU-TIMER-KA: a step taken for suspect pressure is kept when its GPU reading fell by at least KA_SCALE of what the
    //  profiles' cost model predicts for it — a reading of the frame's own work falls about that much, one with a share
    //  the step cannot touch falls by less; or when the part of the reading that fell, scaled back to the profile above
    //  (own = fall / (1 − c), c the model's ratio), was itself past the 'heavy' line: the frame's own work was late,
    //  whatever else the reading holds)
    const c = costAt(D.to, 'gpu') / costAt(D.from, 'gpu'), need = D.suspect ? Math.max(REVISIT_GAIN, KA_SCALE * (1 - c)) : REVISIT_GAIN;
    const line = med(before.map((x) => x.line).filter((x) => x != null));
    if (gain >= need || (D.suspect && b > 0 && a != null && c < 1 && line != null && (b - a) / (1 - c) > line)) return null;
    const k = D.kind || 'gpu';
    this.noHelp[k] = D.from;
    const what = (D.late ? `${side.toUpperCase()} p90 ${b} → ${a} ms` : `${fb} → ${fa} fps`) + (D.suspect ? `, a reading taken after keep-alive marks: needed −${Math.round(100 * need)} %` : '');
    return this.stepTo(D.from, t, `the step down to ${profileOf(D.to).name} did not help in ${w.scene} (${what}): back to ${profileOf(D.from).name}, no further ${k.toUpperCase()} step this session`, { revert: true });
  }
  // (a step down is being judged in this scene: no further step down until it is)
  judging(w) { const D = this.lastDown; return !!D && !D.done && this.applied === D.to && (this.rec.get(`${w.scene}|${D.from}`)?.length ?? 0) >= REVISIT_BEFORE; }
  evaluate(w, t) {
    const E = this.ev;
    if (this.p !== this.applied) return null;   // (a step is queued: the windows wait for the profile it brings)
    E.w.push(w); E.ms += w.dur; if (w.scene != null) E.scenes.add(w.scene);
    const back = this.judgeStep(w, t);
    if (back) { this.upUsed = true; return back; }
    if (this.judging(w)) return null;
    const L = E.w, last = L.slice(-DOWN_IN);
    // sustained pressure: one profile down (queued)
    if ((L.length >= DOWN_RUN && L.slice(-DOWN_RUN).every(isPressure)) || last.filter(isPressure).length >= DOWN_OF) {
      const P = this.pressureOf(last);
      if (this.below(this.applied, P.kind) == null) { this.lock(`evaluation: ${P.kind ? P.kind.toUpperCase() + ' ' : ''}pressure at the lowest profile for it (${this.why(last)})`, t); return { kind: 'settled', p: this.p }; }
      if (!this.mayStepDown(P.kind)) { this.lock(`evaluation: ${P.kind.toUpperCase()} pressure, but a lower profile did not help here: held (${this.why(last)})`, t); return { kind: 'settled', p: this.p }; }
      if (P.suspect && this.suspectPending()) return null;   // (GPU-TIMER-KA: the last such step is still to be judged)
      if (this.trial && this.applied === this.trial.from) { this.trial.failed = true; }
      return this.step(+1, t, `evaluation: ${P.kind.toUpperCase()} pressure${P.late ? ' (frames shown a refresh late under the limit)' : ''}${P.suspect ? ' (by a GPU reading taken after keep-alive marks: judged at the revisit before any further such step)' : ''}: ${this.why(last)}`, P);
    }
    // room for the profile above: once per evaluation, never in a trial that is already one up, never back to a profile
    // this evaluation stepped down from under pressure (P95: it went down and straight back up between two scenes)
    if (!this.upUsed && E.ms >= UP_MIN && E.scenes.size >= EVAL_SCENES && !this.pressured.has(this.above(this.applied)) && this.roomAbove(L)) {
      this.upUsed = true;
      return this.step(-1, t, `evaluation: room for the profile above in ${L.filter((x) => this.fitsAbove(x)).length} of ${L.length} windows: ${this.why(L)}`);
    }
    // the end of the evaluation
    if ((E.ms >= EVAL_MS && E.scenes.size >= EVAL_SCENES) || E.ms >= EVAL_MAX) {
      // (P95: the misses of display-paced windows are the display's, not the game's: not counted)
      const own = L.filter((x) => x.kind !== 'paced'), pr = L.filter(isPressure).length / L.length, n = own.reduce((s, x) => s + x.n, 0), m = own.reduce((s, x) => s + x.missN, 0);
      if (pr <= PASS_PRESSURE && m / Math.max(1, n) <= PASS_MISS) { this.lock(`evaluation passed: ${this.why(L)}`, t); return { kind: 'settled', p: this.p }; }
      const P = this.pressureOf(L), k = P.kind || 'gpu';
      if (this.below(this.applied, k) == null) { this.lock(`evaluation: the lowest profile for ${k.toUpperCase()} pressure (${this.why(L)})`, t); return { kind: 'settled', p: this.p }; }
      if (!this.mayStepDown(k)) { this.lock(`evaluation: a lower profile did not help here: held (${this.why(L)})`, t); return { kind: 'settled', p: this.p }; }
      if (P.suspect && this.suspectPending()) { this.lock(`evaluation: GPU readings taken after keep-alive marks, the last step down for them not yet judged: held (${this.why(L)})`, t); return { kind: 'settled', p: this.p }; }
      return this.step(+1, t, `evaluation failed (${Math.round(pr * 100)} % of windows under pressure): ${this.why(L)}`, { kind: k, late: P.late, suspect: P.suspect });
    }
    return null;
  }
  held(w, t) {
    const H = this.hold;
    // the session's margin for the next start: room for the profile above in this window?
    this.room.ms += w.dur; this.room.n++; if (this.roomAbove([w])) this.room.ok++;
    if (this.p !== this.applied) return null;
    // (P95: a step down taken in the evaluation or in hold that bought nothing goes back once, at a commit point)
    const back = this.judgeStep(w, t);
    if (back) { H.cool = t; H.w = []; return back; }
    H.w.push(w);
    if (this.judging(w)) return null;
    let ms = 0, k = H.w.length;
    while (k > 0 && ms < Math.max(HOLD_SPAN, HOLD_ONE_SCENE)) ms += H.w[--k].dur;
    H.w.splice(0, k);
    if (t - H.cool < HOLD_COOL) return null;
    // the last HOLD_SPAN (spanning a scene change) or HOLD_ONE_SCENE of play
    const span = (lim) => { const out = []; let s = 0; for (let i = H.w.length - 1; i >= 0 && s < lim; i--) { out.unshift(H.w[i]); s += H.w[i].dur; } return s >= lim ? out : null; };
    // (a 'late' window's frames are all shown a refresh late at worst: they count as missed here; paced ones not at all)
    // (GPU-TIMER-KA: a suspect window — late by a GPU reading taken after keep-alive marks — is not a real problem here)
    const real = (x) => isPressure(x) && !x.suspect;
    const bad = (ws) => { if (!ws) return false; const own = ws.filter((x) => x.kind !== 'paced'), n = own.reduce((s, x) => s + x.n, 0), m = own.reduce((s, x) => s + (x.late && !x.suspect ? x.n : x.missN), 0); return ws.filter(real).length / ws.length >= HOLD_PRESSURE && m / Math.max(1, n) > HOLD_MISS; };
    const a = span(HOLD_SPAN), b = span(HOLD_ONE_SCENE);
    const scenes = (ws) => new Set(ws.filter(real).map((x) => x.scene)).size;
    if ((bad(a) && scenes(a) >= 2) || bad(b)) {
      const ws = (a && bad(a) ? a : b).filter((x) => !x.suspect), P = this.pressureOf(ws);
      if (!this.mayStepDown(P.kind)) { if (t - (this._floorNoted || -1e9) > 120000) { this._floorNoted = t; this.note({ kind: 'floor', why: `a sustained problem ${this.below(this.applied, P.kind) == null ? 'at the lowest profile for it' : 'that a lower profile did not help'}: ${this.why(ws)}` }); } return null; }
      H.cool = t; H.w = [];
      return this.step(+1, t, `held, but a sustained problem${bad(a) && scenes(a) >= 2 ? ' across scene changes' : ' for 60 s'}: ${this.why(ws)}`, P);
    }
    return null;
  }
  // the held session's room for the profile above (for the cache: the next start tries it)
  margin() { return this.phase === 'hold' && this.room.ms >= MARGIN_MIN && this.room.ok / Math.max(1, this.room.n) >= MARGIN_SHARE && this.above(this.applied) != null; }
  state() {
    return { p: this.p, applied: this.applied, phase: this.phase, knobs: this.knobs(), wanted: this.wanted(), pending: this.pending(), label: describe(this.knobs()).text, last: this.lastWindow || null, windows: this.windows, gpuTimer: this.gpuSeen,
      eval: this.ev ? { s: Math.round(this.ev.ms / 1000), scenes: this.ev.scenes.size, windows: this.ev.w.length } : null, margin: this.margin(), trial: this.trial || null, noHelp: { ...this.noHelp } };
  }
}

// Calibration on the title screen: frames measured for CAL_MS after CAL_WAIT; then estimate()
export class Calibration {
  constructor({ p0 = 0, budget = () => 1000 / 60 } = {}) { this.p0 = p0; this.budget = budget; this.t0 = null; this.f = []; this.cpu = []; this.g = []; this.gAside = 0; this.done = false; this.result = null; }
  frame(t, ms, cpu) {
    if (this.done) return null;
    if (this.t0 == null) this.t0 = t;
    if (t - this.t0 < CAL_WAIT) return null;
    if (ms < BREAK_MS) { this.f.push(ms); if (cpu != null) this.cpu.push(cpu); }
    if (t - this.t0 < CAL_WAIT + CAL_MS || this.f.length < 30) return null;
    return this.finish();
  }
  // (GPU-TIMER-KA: a reading taken after a keep-alive mark is set aside, counted)
  gpu(ms, ka = false) { if (!this.done && this.t0 != null) { if (ka) this.gAside++; else this.g.push(ms); } }
  finish() {
    this.done = true;
    const gpuMs = this.g.length >= 8 ? pct(this.g, 0.9) : null, cpuMs = pct(this.cpu, 0.9), fMs = pct(this.f, 0.5);
    let est = estimate({ gpuMs, cpuMs, p0: this.p0, budget: this.budget() });
    const aside = gpuMs == null && this.gAside >= 8;
    // (GPU-TIMER-KA: the title's GPU readings all taken after keep-alive marks — under a frame-rate limit — are not used: the
    //  name's guess stands for the GPU side, the CPU side may lower it; and the no-timer rule below does not apply: there
    //  is a timer, and the limit, not the GPU, spaces the title's frames)
    if (aside) est = { p: Math.max(est.p, this.p0) };
    // (no GPU timer: a title already missing refreshes with light CPU work is GPU-bound at the guess — one profile down)
    else if (gpuMs == null && fMs > 1.2 * this.budget() && cpuMs < 0.75 * this.budget()) est = { p: Math.max(est.p, Math.min(N_PROFILES - 1, this.p0 + 1)) };
    est = { ...est, p: Math.min(est.p, START_FLOOR) };   // (AUTO-FLOOR: the title's frames start no lower than Medium; play decides lower)
    this.result = { ...est, gpuMs: gpuMs == null ? null : +gpuMs.toFixed(2), cpuMs: cpuMs == null ? null : +cpuMs.toFixed(2), frameMs: fMs == null ? null : +fMs.toFixed(2), frames: this.f.length, gpuFrames: this.g.length, gpuAside: this.gAside, p0: this.p0 };
    return this.result;
  }
}
// one profile lower (dir −1: battery) or higher (+1: mains) — a power change without a cached profile for the new source
export const nextProfile = (p, dir = -1) => Math.max(0, Math.min(N_PROFILES - 1, p - dir));
