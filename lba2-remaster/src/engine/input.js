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
  retro: ['KeyV'],
};

// Standard gamepad mapping
const PADMAP = { action: [0], ball: [1], interact: [2], map: [3], prev: [4], next: [5], wheel: [6], view: [10], recenter: [11], pause: [9], up: [12], down: [13], left: [14], right: [15] };

export class Input {
  constructor(canvas) {
    this.keys = new Set();
    this.taps = new Set(); // keys pressed since last frame (so quick taps on slow frames aren't lost)
    this.now = new Set();
    this.prev = new Set();
    this.touch = { x: 0, y: 0, active: false, buttons: new Set() };
    this.mouse = { dx: 0, dy: 0, down: false, clicked: false, moved: 0 };
    this.pad = null;
    this.padAxes = [0, 0, 0, 0];
    this.lastDevice = 'kbd';

    addEventListener('keydown', (e) => {
      if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT')) return;
      this.keys.add(e.code);
      if (!e.repeat) this.taps.add(e.code);
      this.lastDevice = 'kbd';
      if (['Space', 'Tab', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'F1', 'F2', 'F3', 'F4'].includes(e.code)) e.preventDefault();
    });
    addEventListener('keyup', (e) => this.keys.delete(e.code));
    addEventListener('blur', () => this.keys.clear());

    canvas.addEventListener('pointerdown', (e) => {
      if (e.pointerType === 'touch') return;
      this.mouse.down = true; this.mouse.moved = 0;
      canvas.setPointerCapture(e.pointerId);
    });
    canvas.addEventListener('pointermove', (e) => {
      if (!this.mouse.down || e.pointerType === 'touch') return;
      this.mouse.dx += e.movementX; this.mouse.dy += e.movementY;
      this.mouse.moved += Math.abs(e.movementX) + Math.abs(e.movementY);
    });
    canvas.addEventListener('pointerup', (e) => {
      if (e.pointerType === 'touch') return;
      if (this.mouse.down && this.mouse.moved < 6 && e.button === 0) this.mouse.clicked = true;
      this.mouse.down = false;
    });
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
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
      if (this.padAxes.some((v) => v !== 0)) this.lastDevice = 'pad';
    }
    if (this.mouse.clicked) { this.now.add('click'); this.mouse.clicked = false; }
  }

  down(a) { return this.now.has(a); }
  pressed(a) { return this.now.has(a) && !this.prev.has(a); }

  // Movement vector: x = right, y = forward. Magnitude 0..1.
  move() {
    let x = 0, y = 0;
    if (this.down('left')) x -= 1;
    if (this.down('right')) x += 1;
    if (this.down('up')) y += 1;
    if (this.down('down')) y -= 1;
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
}
