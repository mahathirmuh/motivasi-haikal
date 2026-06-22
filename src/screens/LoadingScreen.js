import * as THREE from 'three';
import { Sky } from '../world/Sky.js';
import { addFog } from '../gfx/lighting.js';
import { el, mountUI } from '../utils/dom.js';
import { COLORS } from '../config/constants.js';

export class LoadingScreen {
  constructor(app) {
    this.app = app;
  }

  enter(params = {}) {
    this.next = params.next || 'garden';
    this.nextParams = params.nextParams || {};
    this.t = 0;
    this.dur = 1.4;
    this.done = false;

    this.scene = new THREE.Scene();
    this.scene.background = COLORS.skyHorizon.clone();
    this.camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 1000);
    this.camera.position.set(0, 8, 24);
    this.camera.lookAt(0, 6, 0);
    addFog(this.scene, 50, 160);
    this.sky = new Sky(this.scene);

    this.bar = el('i', {});
    const wrap = el('div', { class: 'loading-wrap' }, [
      el('div', { class: 'loading-flower', text: '🌸' }),
      el('div', { class: 'loading-text', text: 'LOADING' }),
      el('div', { class: 'loading-bar' }, [this.bar]),
    ]);
    mountUI(el('div', { class: 'screen' }, [wrap]));
  }

  update(dt) {
    this.t += dt;
    const p = Math.min(1, this.t / this.dur);
    this.bar.style.width = `${Math.round(p * 100)}%`;
    this.sky?.update(dt);
    if (p >= 1 && !this.done) {
      this.done = true;
      this.app.sm.go(this.next, this.nextParams);
    }
  }
}
