// LBA2-style scripting.
//
// The original engine drives every actor with two scripts:
//   * a TRACK script ("move script") - a list of movement commands
//     (GOTO_POINT, WAIT_NUM_SECOND, ANGLE, LABEL, GOTO ...)
//   * a LIFE script ("comportement") - logic evaluated every frame
//     (IF distance < x THEN ..., MESSAGE, SET_TRACK ...)
// and the world is sprinkled with ZONES (scene change, text, hidden
// object, ladder, scenaric triggers...). We keep the same three concepts.

export class TrackRunner {
  /** cmds: [{op:'goto',x,z,speed?} | {op:'wait',t} | {op:'face',a} | {op:'anim',name,t} | {op:'label',name} | {op:'jump',to} | {op:'loop'} | {op:'call',fn} ] */
  constructor(cmds) {
    this.cmds = cmds;
    this.pc = 0;
    this.t = 0;
    this.labels = {};
    cmds.forEach((c, i) => { if (c.op === 'label') this.labels[c.name] = i; });
  }

  // Returns {dx,dz,speed} (unit direction) or {dx:0,dz:0} when idle.
  step(actor, dt) {
    for (let guard = 0; guard < 16; guard++) {
      const c = this.cmds[this.pc];
      if (!c) return { dx: 0, dz: 0, speed: 0 };
      switch (c.op) {
        case 'goto': {
          const dx = c.x - actor.pos.x, dz = c.z - actor.pos.z;
          const d = Math.hypot(dx, dz);
          if (d < 0.5) { this.pc++; continue; }
          return { dx: dx / d, dz: dz / d, speed: c.speed ?? 1 };
        }
        case 'wait':
          this.t += dt;
          if (this.t >= c.t) { this.t = 0; this.pc++; continue; }
          return { dx: 0, dz: 0, speed: 0 };
        case 'anim':
          actor.forceAnim = c.name;
          this.t += dt;
          if (this.t >= c.t) { this.t = 0; actor.forceAnim = null; this.pc++; continue; }
          return { dx: 0, dz: 0, speed: 0 };
        case 'face': actor.targetAngle = c.a; this.pc++; continue;
        case 'label': this.pc++; continue;
        case 'jump': this.pc = this.labels[c.to] ?? 0; continue;
        case 'loop': this.pc = 0; continue;
        case 'call': c.fn(actor); this.pc++; continue;
        default: this.pc++;
      }
    }
    return { dx: 0, dz: 0, speed: 0 };
  }
}

// Zones are axis-aligned boxes (like LBA2 "cubes") or circles.
export class Zone {
  /** {type:'text'|'obj'|'scenaric'|'checkpoint'|'hit'|'music', x,z,r? | hw,hd, y0,y1, ...data} */
  constructor(def) {
    Object.assign(this, { y0: -10, y1: 40, once: false, done: false, inside: false }, def);
  }
  contains(p) {
    if (p.y < this.y0 || p.y > this.y1) return false;
    if (this.r != null) return Math.hypot(p.x - this.x, p.z - this.z) < this.r;
    return Math.abs(p.x - this.x) < this.hw && Math.abs(p.z - this.z) < this.hd;
  }
}

export class ZoneSystem {
  constructor() { this.zones = []; }
  add(def) { const z = new Zone(def); this.zones.push(z); return z; }

  // Fires onEnter / onExit callbacks; returns zones currently containing p.
  update(p, handlers) {
    const active = [];
    for (const z of this.zones) {
      const inside = z.contains(p);
      if (inside && !z.inside) { z.inside = true; if (!(z.once && z.done)) handlers.enter?.(z); }
      else if (!inside && z.inside) { z.inside = false; handlers.exit?.(z); }
      if (inside) active.push(z);
    }
    return active;
  }
}
