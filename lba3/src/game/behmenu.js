// The behaviour menu shown while Ctrl is held, modelled on LBA2's
// DrawMenuComportement (COMPORTE.CPP): four framed boxes, each showing an
// animated 3D Twinsen in that behaviour (the selected one turns slowly),
// the behaviour's name underneath, and an info panel with life, magic
// (bar length grows with magic level), kashes, keys and clover boxes.
import * as THREE from 'three';
import { createCharacter } from './characters.js';
import { BEHAVIOURS } from './actors.js';
import { t } from './i18n.js';

const POSE = { normal: ['idle', 0], athletic: ['run', 6.5], aggressive: ['punch', 0], discreet: ['sneak', 1.6] };

export class BehaviourMenu {
  constructor(game, heroLook) {
    this.game = game;
    this.el = document.getElementById('behmenu');
    this.boxes = [...this.el.querySelectorAll('.bbox')];
    this.label = this.el.querySelector('.blabel');
    this.scene = new THREE.Scene();
    this.scene.add(new THREE.HemisphereLight('#ffffff', '#445566', 1.6));
    const d = new THREE.DirectionalLight('#ffffff', 2.2);
    d.position.set(2, 4, 5);
    this.scene.add(d);
    this.cam = new THREE.PerspectiveCamera(28, 100 / 120, 0.1, 50);
    this.rigs = BEHAVIOURS.map((b, i) => {
      const r = createCharacter(heroLook);
      r.root.position.x = i * 6;
      this.scene.add(r.root);
      return r;
    });
    this.beta = 0;
    this.open = false;
    this.punchT = 0;
  }

  show(on) {
    if (on === this.open) return;
    this.open = on;
    this.el.classList.toggle('hidden', !on);
    document.getElementById('floats').style.visibility = on ? 'hidden' : '';
    if (on) this.refresh();
  }

  refresh() {
    const h = this.game.hero;
    const sel = BEHAVIOURS.indexOf(h.behaviour);
    this.boxes.forEach((b, i) => b.classList.toggle('on', i === sel));
    this.label.textContent = t('beh_' + h.behaviour);
    const q = (s) => this.el.querySelector(s);
    q('.life i').style.width = (100 * h.hp) / h.maxHp + '%';
    // magic bar frame length grows with the magic level, like the original
    q('.magic').style.width = (h.magicLevel / 4) * 100 + '%';
    q('.magic i').style.width = (100 * h.mp) / h.mpMax + '%';
    q('.kash b').textContent = h.coins;
    q('.keys b').textContent = h.hasKey ? 1 : 0;
    const boxes = Math.max(5, h.clovers);
    q('.clovers').innerHTML = Array.from({ length: boxes }, (_, i) => `<span class="${i < h.clovers ? 'full' : ''}"></span>`).join('');
    q('.shardrow').innerHTML = h.shards.map((s) => `<span class="${s ? 'got' : ''}"></span>`).join('');
  }

  // Draw the four portraits into the boxes' screen rectangles.
  render(renderer, dt) {
    if (!this.open) return;
    const h = this.game.hero;
    const sel = BEHAVIOURS.indexOf(h.behaviour);
    this.beta += dt * 1.6;
    this.punchT += dt;
    if (this.punchT > 0.6) this.punchT = 0;
    this.rigs.forEach((r, i) => {
      const b = BEHAVIOURS[i];
      let [anim, speed] = POSE[b];
      if (b === 'aggressive') { anim = this.punchT < 0.3 ? 'punch' : 'punch2'; if (this.punchT < dt) r.actionT = 0; }
      r.play(anim);
      r.update(dt, speed);
      r.root.rotation.y = i === sel ? this.beta : 0.5;
    });
    const r = renderer;
    const size = r.getSize(new THREE.Vector2());
    const prevAuto = r.autoClear;
    r.autoClear = false;
    r.setScissorTest(true);
    const clear = new THREE.Color();
    this.boxes.forEach((box, i) => {
      const rc = box.getBoundingClientRect();
      const y = size.y - rc.bottom;
      r.setViewport(rc.left + 2, y + 2, rc.width - 4, rc.height - 4);
      r.setScissor(rc.left + 2, y + 2, rc.width - 4, rc.height - 4);
      clear.set(i === sel ? '#3b2a7a' : '#06080c');
      r.setClearColor(clear, 1);
      r.clear(true, true, false);
      this.cam.aspect = rc.width / rc.height;
      this.cam.updateProjectionMatrix();
      this.cam.position.set(i * 6, 1.25, 5.2);
      this.cam.lookAt(i * 6, 0.9, 0);
      r.render(this.scene, this.cam);
    });
    r.setScissorTest(false);
    r.setViewport(0, 0, size.x, size.y);
    r.setClearColor(0x000000, 1);
    r.autoClear = prevAuto;
  }
}
