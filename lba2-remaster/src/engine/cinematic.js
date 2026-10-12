// In-engine story scenes: one explicit timeline instead of a pile of timers.
//
// A scene definition (see src/game/story/opening.js) gives:
//   length                 seconds
//   prepare()              async: build/position everything, preload; the screen stays black meanwhile
//   events  [{t, fn}]      fired once, in order, when the clock passes t (sounds, animation changes, props)
//   tracks  [{t0, t1, fn(k, t, dt)}]  called every frame inside [t0, t1] with k = 0..1; once more with k = 1
//                          when the clock passes t1 (so a frame skip never leaves a move half done)
//   shots   [{t0, t1, from, to, ease}]  camera: from/to = {pos, look, fov}; to = 'game' blends into the
//                          gameplay camera (the handoff); a shot may also be a function (t) => {pos, look, fov}
//   subs    [{t, d, who, text, color}]  subtitles
//   finish(skipped)        puts the world in its end state — the same state whether the scene played out or
//                          was skipped (so every flag, position and objective is set exactly once, here)
//   music  {name, at}      optional: a music cue started at `at`; the clock follows the cue while it plays
//
// The runner owns the camera while it plays (CameraRig.cine), hides the HUD, shows subtitles and a "hold to
// skip" prompt with the player's real binding, and pauses with the game (pause menu, lost tab focus).
import * as THREE from 'three';

const HOLD = 0.9;                 // seconds to hold for a skip
const PROMPT_SHOW = 3.5;          // the skip prompt fades after this long without input

const $ = (s) => document.querySelector(s);
const ease = (x) => { x = Math.min(1, Math.max(0, x)); return x * x * (3 - 2 * x); };
// Shots are framed for 16:9. On a narrower screen (4:3, a phone held upright) keep at least the same width of
// the scene in view by opening the vertical angle, so nobody who is in the 16:9 frame is cropped out.
const WIDE = 16 / 9;
function fitFov(fov, aspect) {
  if (!(aspect < WIDE)) return fov;
  const h = 2 * Math.atan(Math.tan((fov * Math.PI) / 360) * WIDE);
  return Math.min(100, (2 * Math.atan(Math.tan(h / 2) / aspect) * 180) / Math.PI);
}
const _a = new THREE.Vector3(), _b = new THREE.Vector3(), _q = new THREE.Quaternion();

export class Cinematic {
  constructor(game, def) {
    this.game = game;
    this.def = def;
    this.t = 0;
    this.state = 'idle';     // idle → prep → run → done
    this.paused = false;
    this.evI = 0;
    this.events = [...(def.events || [])].sort((a, b) => a.t - b.t);
    this.tracks = (def.tracks || []).map((tr) => ({ ...tr, done: false }));
    this.subI = -1;
    this.hold = 0;
    this.promptT = PROMPT_SHOW;
    this.focus = null;      // where shadows / distance detail centre while the hero is elsewhere
    this.blend = null;
  }

  // ---------------------------------------------------------------- lifecycle
  async start() {
    const g = this.game;
    this.state = 'prep';
    g.cine = this;
    g.camRig.cine = true;
    g.camRig.override = null;
    if (g.hero.rig.silhouette) g.hero.rig.silhouette.visible = false; // (gameplay aid only)
    g.setState('cinematicEnd'); // (a quiet state while preparing: no title camera, no gameplay)
    g.hud.show(false);
    document.body.classList.add('cine-on');
    $('#touch')?.classList.add('hidden');
    $('#fade').classList.add('on', 'instant');
    this.ui(true);
    try { await this.def.prepare?.(this); } catch (e) { console.error('cinematic prepare failed', e); }
    if (this.state !== 'prep') return; // skipped while preparing
    this.state = 'run';
    g.setState('cinematic');
    this.apply(0);
    // one frame rendered under the black so nothing compiles or pops on the first visible frame
    const reveal = () => $('#fade').classList.remove('instant', 'on');
    requestAnimationFrame(reveal); setTimeout(reveal, 250); // (the timer covers a frame callback that never comes)
  }

  update(dt) {
    if (this.state !== 'run' || this.paused) return;
    this.skipInput(dt);
    if (this.state !== 'run') return;
    this.t += dt;
    this.syncMusic();
    this.apply(dt);
    if (this.t >= this.def.length) this.complete(false);
  }

  // fire events, run tracks, place the camera, show subtitles for the current time
  apply(dt) {
    const t = this.t;
    while (this.evI < this.events.length && this.events[this.evI].t <= t) {
      const e = this.events[this.evI++];
      try { e.fn(this); } catch (err) { console.error('cinematic event', e, err); }
    }
    for (const tr of this.tracks) {
      if (tr.done || t < tr.t0) continue;
      const k = tr.t1 > tr.t0 ? Math.min(1, (t - tr.t0) / (tr.t1 - tr.t0)) : 1;
      try { tr.fn(k, t, dt); } catch (err) { console.error('cinematic track', tr, err); tr.done = true; }
      if (k >= 1) tr.done = true;
    }
    this.camera(dt);
    this.subtitles();
  }

  camera(dt) {
    const g = this.game, cam = g.camera, t = this.t;
    const shot = (this.def.shots || []).find((s) => t >= s.t0 && t < s.t1) || this.def.shots?.[this.def.shots.length - 1];
    if (!shot) return;
    if (shot.to === 'game') { this.blendToGame(shot, dt); return; }
    const k = shot.t1 > shot.t0 ? (shot.ease || ease)(Math.min(1, (t - shot.t0) / (shot.t1 - shot.t0))) : 1;
    const A = typeof shot.from === 'function' ? shot.from(t) : shot.from, B = shot.to ? (typeof shot.to === 'function' ? shot.to(t) : shot.to) : A;
    _a.copy(A.pos).lerp(B.pos, k);
    _b.copy(A.look).lerp(B.look, k);
    cam.position.copy(_a);
    cam.lookAt(_b);
    const fov = fitFov((A.fov ?? 40) + ((B.fov ?? A.fov ?? 40) - (A.fov ?? 40)) * k, cam.aspect);
    if (cam.fov !== fov) { cam.fov = fov; cam.updateProjectionMatrix(); }
    g.camRig.look.copy(_b);
  }

  // The handoff: ease from the last cinematic framing into the gameplay camera. Interpolates the look point,
  // the direction, the distance (log) and the visible width at the look point, so a long-lens gameplay view
  // (the isometric rooms) is reached without a dolly-zoom wobble or a pop.
  blendToGame(shot, dt) {
    const g = this.game, cam = g.camera, rig = g.camRig;
    if (!this.blend) {
      const look = rig.look.clone(), pos = cam.position.clone();
      this.blend = { pos, look, fov: cam.fov };
    }
    // where the gameplay camera wants to be this frame
    rig.cine = false;
    rig.update(dt || 1 / 60, g.hero.pos, g.hero.angle, false, null);
    rig.cine = true;
    const P1 = cam.position.clone(), L1 = rig.look.clone(), F1 = cam.fov;
    const A = this.blend, k = ease((this.t - shot.t0) / (shot.t1 - shot.t0));
    const L = A.look.clone().lerp(L1, k);
    const d0 = A.pos.distanceTo(A.look), d1 = P1.distanceTo(L1);
    const dir0 = _a.copy(A.pos).sub(A.look).normalize(), dir1 = _b.copy(P1).sub(L1).normalize();
    _q.setFromUnitVectors(dir0, dir1);
    const dir = dir0.clone().applyQuaternion(new THREE.Quaternion().slerp(_q, k));
    const d = Math.exp(Math.log(d0) + (Math.log(d1) - Math.log(d0)) * k);
    const w0 = 2 * d0 * Math.tan((A.fov * Math.PI) / 360), w1 = 2 * d1 * Math.tan((F1 * Math.PI) / 360);
    const w = w0 + (w1 - w0) * k;
    cam.position.copy(L).addScaledVector(dir, d);
    cam.lookAt(L);
    cam.fov = (2 * Math.atan(w / (2 * d)) * 180) / Math.PI;
    cam.updateProjectionMatrix();
  }

  subtitles() {
    const subs = this.def.subs || [];
    let i = -1;
    for (let j = 0; j < subs.length; j++) if (this.t >= subs[j].t && this.t < subs[j].t + subs[j].d) i = j;
    if (i === this.subI) return;
    this.subI = i;
    const el = $('#cine-sub');
    if (i < 0) { el.classList.remove('show'); return; }
    const s = subs[i];
    el.innerHTML = (s.who ? `<b style="color:${s.color || '#fff'}">${s.who}</b> ` : '') + `<span>${s.text}</span>`;
    el.classList.add('show');
  }

  // the clock follows the music cue while it plays (a slow frame then can't drift the picture off the score)
  syncMusic() {
    const m = this.def.music, mu = this.game.audio.music;
    if (this.game.testFreeze) return; // (deterministic test stepping runs faster than the audio clock)
    if (!m || !mu?.ctx || mu.ctx.state !== 'running' || this.t < m.at + 0.5) return;
    const v = mu.voices?.find((x) => x.name === m.name && !x.stopping);
    if (!v) return;
    const want = m.at + (mu.ctx.currentTime - v.start) + v.offset;
    const err = want - this.t;
    if (Math.abs(err) > 1.5) return;          // something else is going on (a seek, a stall): leave it
    if (Math.abs(err) > 0.04) this.t += err * 0.08;
  }

  // ---------------------------------------------------------------- skipping
  skipInput(dt) {
    const g = this.game, inp = g.input;
    const pad = inp.lastDevice === 'pad';
    const holding = inp.down('interact') || (pad && inp.down('action')) || this.pointerHold;
    const any = inp.now.size > 0 || this.pointerHold;
    if (any) this.promptT = 0; else this.promptT += dt;
    this.hold = holding ? this.hold + dt : Math.max(0, this.hold - dt * 3);
    const el = $('#cine-skip');
    el.classList.toggle('show', this.promptT < PROMPT_SHOW || this.hold > 0);
    el.style.setProperty('--k', (this.hold / HOLD).toFixed(3));
    el.querySelector('kbd').textContent = this.skipKey();
    if (this.hold >= HOLD) this.skip();
  }
  skipKey() {
    return this.game.input.label(this.game.input.lastDevice === 'pad' ? 'action' : 'interact');
  }
  skip() {
    if (this.state === 'done') return;
    this.complete(true);
  }

  // ---------------------------------------------------------------- pause (pause menu, tab hidden)
  pause() {
    if (this.paused) return;
    this.paused = true;
    const ctx = this.game.audio.ctx;
    if (ctx && ctx.state === 'running') { ctx.suspend(); this._suspended = true; }
  }
  resume() {
    if (!this.paused) return;
    this.paused = false;
    this.hold = 0;
    this.game.input.clearEdges?.();
    if (this._suspended) { this.game.audio.ctx?.resume(); this._suspended = false; }
  }

  // ---------------------------------------------------------------- end (played out or skipped)
  complete(skipped) {
    if (this.state === 'done') return;
    const g = this.game, was = this.state;
    this.state = 'done';
    if (this._suspended) { g.audio.ctx?.resume(); this._suspended = false; }
    this.ui(false);
    const end = () => {
      try { this.def.finish?.(skipped, this); } catch (e) { console.error('cinematic finish failed', e); }
      g.camRig.cine = false;
      g.cine = null;
      if (g.hero.rig.silhouette) g.hero.rig.silhouette.visible = true;
      document.body.classList.remove('cine-on');
    };
    if (skipped && was === 'run') {
      // a short dip to black hides the jump to the end state
      $('#fade').classList.add('on');
      setTimeout(() => { end(); setTimeout(() => $('#fade').classList.remove('on'), 40); }, 420);
      g.setState('cinematicEnd');
    } else {
      $('#fade').classList.remove('instant', 'on');
      end();
    }
  }

  ui(on) {
    $('#cine-sub').classList.remove('show');
    $('#cine-title')?.classList.remove('show');
    $('#cine-skip').classList.toggle('show', false);
    $('#cine').classList.toggle('hidden', !on);
    const skip = $('#cine-skip');
    if (on && !skip._wired) {
      skip._wired = true;
      const set = (v) => (e) => { e.preventDefault(); this.game.cine && (this.game.cine.pointerHold = v); };
      skip.addEventListener('pointerdown', set(true));
      for (const ev of ['pointerup', 'pointercancel', 'pointerleave']) skip.addEventListener(ev, set(false));
    }
  }
}
