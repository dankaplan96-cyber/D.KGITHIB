// Battery or mains (PERF-BATTERY). The user's Vega 8 laptop draws the same frame ~3.9× slower on battery (its clocks
// drop: Medium's street 9.6 → 37.6 ms of GPU time), so on battery the game renders a lighter profile within the
// player's preset (renderer.js setBattery); plugged in, the preset as it is.
//   Electron (desktop app): the main process's powerMonitor (isOnBatteryPowered, 'on-battery' / 'on-ac'), handed over
//     by preload.js: the state is known synchronously before the first shader is compiled.
//   A browser: navigator.getBattery() where it exists (Chromium), its `charging` flag and 'chargingchange'.
//   Neither: unknown, treated as plugged in.
// A change is passed on once it has held for SETTLE ms (plugging in flickers), the first state at once.
export const SETTLE = 2500;

export class Power {
  constructor(onChange) {
    this.onChange = onChange; this.state = null; this.source = 'none'; this._t = 0;
    const D = typeof window !== 'undefined' ? window.desktop : null;
    if (D && typeof D.onBattery === 'boolean') {
      this.source = 'electron'; this.state = D.onBattery;
      D.onPower?.((v) => this.set(!!v));
    } else if (typeof navigator !== 'undefined' && navigator.getBattery) {
      this.source = 'browser';
      navigator.getBattery().then((b) => {
        this.set(!b.charging, true);
        b.addEventListener('chargingchange', () => this.set(!b.charging));
      }).catch(() => { this.source = 'none'; });
    }
  }
  // true: on battery, false: plugged in, null: unknown
  get onBattery() { return this.state; }
  set(v, now = false) {
    clearTimeout(this._t);
    if (v === this.state) return;
    const go = () => { this.changes = (this.changes || 0) + 1; this.state = v; this.onChange?.(v); };   // (changes: counted for the benchmark's report)
    if (now || this.state === null) go(); else this._t = setTimeout(go, SETTLE);
  }
  describe() { return this.state === null ? 'unknown (no battery information: treated as plugged in)' : this.state ? 'on battery' : 'plugged in'; }
}
