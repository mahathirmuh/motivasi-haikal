import * as THREE from 'three';
import { ScreenManager } from './ScreenManager.js';

// Owns the single renderer + render loop and delegates scene/camera to the
// active screen.
export class App {
  constructor(canvas) {
    this.canvas = canvas;
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: false,
      powerPreference: 'high-performance',
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.08;

    this.clock = new THREE.Clock();
    this.sm = new ScreenManager(this);
    this.audio = null; // set by main once created

    this._onResize = this._onResize.bind(this);
    this._tick = this._tick.bind(this);
    window.addEventListener('resize', this._onResize);
    this._onResize();
  }

  start() {
    this.renderer.setAnimationLoop(this._tick);
  }

  _tick() {
    const dt = Math.min(this.clock.getDelta(), 0.05); // clamp big frame gaps
    const elapsed = this.clock.elapsedTime;
    this.sm.update(dt, elapsed);
    const screen = this.sm.current;
    if (screen && screen.scene && screen.camera) {
      this.renderer.render(screen.scene, screen.camera);
    }
  }

  _onResize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.renderer.setSize(w, h, false);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.sm.resize(w, h);
  }
}
