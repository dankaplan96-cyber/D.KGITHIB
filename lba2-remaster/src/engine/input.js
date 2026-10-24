// Unified keyboard / gamepad / touch input with edge detection.

const KEYMAP = {
  up: ['KeyW', 'ArrowUp'],
  down: ['KeyS', 'ArrowDown'],
  left: ['KeyA', 'ArrowLeft'],
  right: ['KeyD', 'ArrowRight'],
  action: ['Space'],
  interact: ['KeyE'],
  recenter: ['Enter', 'NumpadEnter'],
  view: ['KeyQ'],
  ball: ['KeyF'],
  b1: ['Digit1', 'F1'], b2: ['Digit2', 'F2'], b3: ['Digit3', 'F3'], b4: ['Digit4', 'F4'],
  cycle: ['Tab'],
  wheel: ['ControlLeft', 'ControlRight'],
  map: ['KeyM'],
  inventory: ['KeyI', 'KeyJ'],
  pause: ['Escape', 'KeyP'],
  camL: ['KeyZ'], camR: ['KeyC'],
  // (no in-game key for the Retro 1997 look: V sat beside C and X and flipped it mid-dialogue; Settings only)
  // combat (the mouse adds: left button attack, right button focus, wheel switches target)
  attack: ['KeyK'],
  dodge: ['ShiftLeft', 'ShiftRight'],
  focus: ['KeyL'],
  swap: ['KeyR'],
  weapons: ['KeyX'],
  tswitch: ['KeyT'],
};

// Rebinding: an action's first key can be replaced (the arrows / F-keys alternatives stay)
const MODERN_KEYS = JSON.parse(JSON.stringify(KEYMAP));
// Classic: LBA2's own keyboard (the PC original) — the arrows walk and turn, Space is the behaviour's action, W
// talks and searches, Alt throws the magic ball, X dodges, Ctrl holds the behaviour menu, F1–F4 pick one, Shift
// opens the inventory, H the holomap, Enter recentres the camera, Esc the menu. (Our extras keep a key each.)
const CLASSIC_KEYS = { ...JSON.parse(JSON.stringify(KEYMAP)),
  up: ['ArrowUp'], down: ['ArrowDown'], left: ['ArrowLeft'], right: ['ArrowRight'],
  action: ['Space'], interact: ['KeyW', 'KeyE'], ball: ['AltLeft', 'AltRight', 'KeyF'], dodge: ['KeyX'],
  inventory: ['ShiftLeft', 'ShiftRight', 'KeyI'], map: ['KeyH', 'KeyM'], weapons: ['KeyG'],
  camL: ['KeyA'], camR: ['KeyD'], b1: ['F1', 'Digit1'], b2: ['F2', 'Digit2'], b3: ['F3', 'Digit3'], b4: ['F4', 'Digit4'],
};
let DEFAULT_KEYS = MODERN_KEYS;
export function setKeyScheme(scheme) { DEFAULT_KEYS = scheme === 'classic' ? CLASSIC_KEYS : MODERN_KEYS; }
// a right-button hold must stay still this long (ms) before it counts as focus (a drag before it turns the camera)
const FOCUS_HOLD = 180;
export const REBINDABLE = ['up', 'down', 'left', 'right', 'action', 'interact', 'attack', 'ball', 'dodge', 'focus', 'tswitch', 'swap', 'weapons', 'view', 'recenter', 'map', 'inventory', 'pause'];
export function keyFor(action) { return KEYMAP[action]?.[0]; }
export function applyBindings(over = {}) {
  for (const a of Object.keys(DEFAULT_KEYS)) KEYMAP[a] = [...DEFAULT_KEYS[a]];
  for (const [a, code] of Object.entries(over)) {
    if (!KEYMAP[a] || !code) continue;
    // a key does one thing: take it away from any other action first
    for (const b of Object.keys(KEYMAP)) if (b !== a) KEYMAP[b] = KEYMAP[b].filter((c) => c !== code);
    KEYMAP[a] = [code, ...KEYMAP[a].slice(1).filter((c) => c !== code)];
  }
}
export function keyLabel(code) {
  if (!code) return '—';
  const named = { Space: 'Space', ArrowUp: '↑', ArrowDown: '↓', ArrowLeft: '←', ArrowRight: '→', Enter: 'Enter', NumpadEnter: 'Enter', Escape: 'Esc', Tab: 'Tab', ControlLeft: 'Ctrl', ControlRight: 'Ctrl', ShiftLeft: 'Shift', ShiftRight: 'Shift', Mouse0: 'Left Click', Mouse2: 'Right Click', AltLeft: 'Alt', AltRight: 'Alt' };
  return named[code] ?? code.replace(/^Key/, '').replace(/^Digit/, '').replace(/^Numpad/, 'Num ');
}

// Standard gamepad mapping. A: behaviour action (talks when something is in reach) · B: dodge · X: attack
// (hold: charge / heavy) · Y: magic ball (again: recall) · LB: quick weapon swap · RB: focus · LT: behaviour
// menu · RT: weapon selector · View: holomap · Menu: pause · L3: camera distance · R3: switch target
// (recenter the camera when nothing is focused) · D-pad: move / menus
const PADMAP = { action: [0], dodge: [1], attack: [2], ball: [3], swap: [4], focus: [5], wheel: [6], weapons: [7], map: [8], pause: [9], view: [10], r3: [11], up: [12], down: [13], left: [14], right: [15] };
export const PAD_LABELS = { action: 'A', dodge: 'B', attack: 'X', ball: 'Y', swap: 'LB', focus: 'RB', wheel: 'LT', weapons: 'RT', map: 'View', pause: 'Menu', view: 'L3', tswitch: 'R3', interact: 'A' };

export class Input {
  constructor(canvas) {
    this.keys = new Set();
    this.taps = new Set(); // keys pressed since last frame (so quick taps on slow frames aren't lost)
    this.now = new Set();
    this.prev = new Set();
    this.touch = { x: 0, y: 0, active: false, buttons: new Set() };
    this.mouse = { dx: 0, dy: 0, down: false, clicked: false, moved: 0, x: 0, y: 0, lastMove: -1e9, left: false, leftTap: false, right: false, rightDrag: false, rightTap: false, rightAt: 0, wheel: 0, inside: false };
    this.pad = null;
    this.padAxes = [0, 0, 0, 0];
    this.lastDevice = 'kbd';

    addEventListener('keydown', (e) => {
      if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT')) return;
      this.keys.add(e.code);
      if (!e.repeat) this.taps.add(e.code);
      this.lastDevice = 'kbd';
      if (['Space', 'Tab', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'F1', 'F2', 'F3', 'F4', 'AltLeft', 'AltRight'].includes(e.code)) e.preventDefault();
    });
    addEventListener('keyup', (e) => { this.keys.delete(e.code); if (e.code === 'AltLeft' || e.code === 'AltRight') e.preventDefault(); }); // (a lone Alt must not reach the window menu)
    addEventListener('blur', () => this.keys.clear());

    // mouse: left = attack (and a click advances dialogue), right = focus (a right or middle drag turns the
    // free camera instead), wheel = switch target; the cursor is the aim
    const M = this.mouse;
    canvas.addEventListener('pointerdown', (e) => {
      if (e.pointerType === 'touch') return;
      this.lastDevice = 'kbd';
      if (e.button === 0) { M.left = true; M.leftTap = true; M.moved = 0; M.down = true; }
      if (e.button === 2) { M.right = true; M.rightDrag = false; M.moved = 0; M.rightAt = performance.now(); }
      if (e.button === 1) { M.mid = true; e.preventDefault(); }
      canvas.setPointerCapture(e.pointerId);
    });
    canvas.addEventListener('pointermove', (e) => {
      if (e.pointerType === 'touch') return;
      M.x = e.clientX; M.y = e.clientY; M.lastMove = performance.now(); M.inside = true;
      // moving the mouse is a deliberate switch back to mouse + keyboard (a stick or a touch switches away)
      if (Math.abs(e.movementX) + Math.abs(e.movementY) > 2) this.lastDevice = 'kbd';
      if (M.right || M.mid) {
        M.moved += Math.abs(e.movementX) + Math.abs(e.movementY);
        if (M.mid || M.moved > 8) { M.rightDrag = M.right; M.dx += e.movementX; M.dy += e.movementY; }
      } else if (M.left) M.moved += Math.abs(e.movementX) + Math.abs(e.movementY);
    });
    canvas.addEventListener('pointerleave', () => { M.inside = false; });
    canvas.addEventListener('pointerup', (e) => {
      if (e.pointerType === 'touch') return;
      if (e.button === 0) { if (M.left && M.moved < 6) M.clicked = true; M.left = false; M.down = false; }
      // a short right click without a drag is a focus tap; a drag turns the camera and never focuses
      if (e.button === 2) { if (M.right && !M.rightDrag && performance.now() - M.rightAt < FOCUS_HOLD) M.rightTap = true; M.right = false; M.rightDrag = false; }
      if (e.button === 1) M.mid = false;
    });
    canvas.addEventListener('wheel', (e) => { M.wheel += Math.sign(e.deltaY); e.preventDefault(); }, { passive: false });
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    addEventListener('blur', () => { M.left = M.right = M.mid = false; });
    this._setupTouch();
  }

  _setupTouch() {
    const stick = document.getElementById('stick');
    const knob = stick?.querySelector('i');
    if (!stick) return;
    let id = null, cx = 0, cy = 0;
    const R = 50;
    stick.addEventListener('touchstart', (e) => {
      const t = e.changedTouches[0];
      id = t.identifier;
      const r = stick.getBoundingClientRect();
      cx = r.left + r.width / 2; cy = r.top + r.height / 2;
      this.touch.active = true;
      this.lastDevice = 'touch';
      e.preventDefault();
    }, { passive: false });
    stick.addEventListener('touchmove', (e) => {
      for (const t of e.changedTouches) {
        if (t.identifier !== id) continue;
        let dx = t.clientX - cx, dy = t.clientY - cy;
        const d = Math.hypot(dx, dy);
        if (d > R) { dx *= R / d; dy *= R / d; }
        this.touch.x = dx / R; this.touch.y = -dy / R;
        knob.style.transform = `translate(${dx}px, ${dy}px)`;
      }
      e.preventDefault();
    }, { passive: false });
    const end = (e) => {
      for (const t of e.changedTouches) if (t.identifier === id) {
        id = null; this.touch.x = this.touch.y = 0; this.touch.active = false;
        knob.style.transform = '';
      }
    };
    stick.addEventListener('touchend', end);
    stick.addEventListener('touchcancel', end);
    document.querySelectorAll('[data-touch]').forEach((b) => {
      const a = b.dataset.touch;
      b.addEventListener('touchstart', (e) => { this.touch.buttons.add(a); this.lastDevice = 'touch'; e.preventDefault(); }, { passive: false });
      b.addEventListener('touchend', () => this.touch.buttons.delete(a));
      b.addEventListener('touchcancel', () => this.touch.buttons.delete(a));
    });
    // camera drag on the canvas with a second finger / free finger
    let camId = null, lx = 0, ly = 0;
    const cv = document.querySelector('#game');
    cv.addEventListener('touchstart', (e) => {
      const t = e.changedTouches[0];
      camId = t.identifier; lx = t.clientX; ly = t.clientY;
    }, { passive: true });
    cv.addEventListener('touchmove', (e) => {
      for (const t of e.changedTouches) if (t.identifier === camId) {
        this.mouse.dx += (t.clientX - lx) * 1.5; this.mouse.dy += (t.clientY - ly) * 1.5;
        lx = t.clientX; ly = t.clientY;
      }
    }, { passive: true });
  }

  // Call once per frame before reading.
  update() {
    this.prev = this.now;
    this.now = new Set();
    for (const [a, codes] of Object.entries(KEYMAP)) if (codes.some((c) => this.keys.has(c) || this.taps.has(c))) this.now.add(a);
    this.taps.clear();
    for (const b of this.touch.buttons) this.now.add(b);
    const M = this.mouse;
    // a tap shorter than one frame still counts (leftTap/rightTap remember it)
    if (M.left || M.leftTap) this.now.add('attack');
    M.leftTap = false;
    // focus from the right button: a tap, or a hold that stays still for FOCUS_HOLD (never a camera drag)
    if (M.rightTap || (M.right && !M.rightDrag && performance.now() - M.rightAt >= FOCUS_HOLD)) this.now.add('focus');
    M.rightTap = false;
    this.wheelSteps = M.wheel; M.wheel = 0;
    if (this.wheelSteps) this.now.add('tswitch');
    this.padAction = false;

    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    this.pad = null;
    for (const p of pads) if (p && p.connected) { this.pad = p; break; }
    this.padAxes = [0, 0, 0, 0];
    if (this.pad) {
      const dz = (v) => (Math.abs(v) < 0.18 ? 0 : v);
      this.padAxes = [0, 1, 2, 3].map((i) => dz(this.pad.axes[i] || 0));
      for (const [a, idx] of Object.entries(PADMAP)) {
        if (idx.some((i) => this.pad.buttons[i]?.pressed)) { this.now.add(a); this.lastDevice = 'pad'; }
      }
      if (this.now.has('action') && this.lastDevice === 'pad') this.padAction = true;
      // R3: switch target when something is focused, otherwise recenter (the game decides; both are offered)
      if (this.now.has('r3')) { this.now.add('tswitch'); this.now.add('recenterPad'); }
      // the left stick also drives menus and the behaviour menu (as the d-pad does)
      const [ax, ay] = this.padAxes;
      if (ax < -0.6) this.now.add('left'); if (ax > 0.6) this.now.add('right');
      if (ay < -0.6) this.now.add('up'); if (ay > 0.6) this.now.add('down');
      if (this.padAxes.some((v) => v !== 0)) this.lastDevice = 'pad';
    }
    if (this.mouse.clicked) { this.now.add('click'); this.mouse.clicked = false; }
  }

  // what to show for an action on the device in use: the pad button, the touch button's glyph, or the (rebound) key.
  // The one place prompts get their labels from.
  label(a) {
    if (this.lastDevice === 'pad') return PAD_LABELS[a] ?? '';
    if (this.lastDevice === 'touch') { const b = document.querySelector(`[data-touch="${a}"]`); if (b) return b.textContent; }
    return keyLabel(keyFor(a));
  }
  down(a) { return this.now.has(a); }
  pressed(a) { return this.now.has(a) && !this.prev.has(a); }

  // Movement vector: x = right, y = forward. Magnitude 0..1.
  move() {
    let x = 0, y = 0;
    const stick = this.padAxes[0] !== 0 || this.padAxes[1] !== 0;
    if (!stick) {
      if (this.down('left')) x -= 1;
      if (this.down('right')) x += 1;
      if (this.down('up')) y += 1;
      if (this.down('down')) y -= 1;
    }
    x += this.padAxes[0] + this.touch.x;
    y += -this.padAxes[1] + this.touch.y;
    const m = Math.hypot(x, y);
    if (m > 1) { x /= m; y /= m; }
    return { x, y, analog: this.lastDevice !== 'kbd' };
  }

  // Camera delta (consumed).
  camera() {
    let dx = this.mouse.dx * 0.005 + this.padAxes[2] * 0.045;
    let dy = this.mouse.dy * 0.004 + this.padAxes[3] * 0.03;
    if (this.down('camL')) dx -= 0.035;
    if (this.down('camR')) dx += 0.035;
    this.mouse.dx = this.mouse.dy = 0;
    return { dx, dy };
  }

  clearEdges() { this.prev = new Set(this.now); }
  // the mouse cursor is the aim while it is over the canvas and mouse + keyboard is the device in use; a still
  // cursor stays a valid aim (only another device, leaving the canvas, or the game state changes that)
  mouseAiming() { const M = this.mouse; return M.inside && this.lastDevice === 'kbd' && M.lastMove > 0; }
}
