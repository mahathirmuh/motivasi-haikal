// Occasional rain (which auto-waters the garden) followed by a rainbow.
// State machine: dry -> rain -> rainbow -> dry.
import * as THREE from 'three';
import { ISLAND } from '../config/constants.js';

const RAINBOW_COLORS = ['#ff6b6b', '#ffa94d', '#ffe066', '#8ce99a', '#74c0fc', '#b197fc'];

export class Weather {
  constructor(scene) {
    this.scene = scene;
    this.state = 'dry';
    this.timer = 18 + Math.random() * 22; // first rain after a while
    this.rainDuration = 0;
    this.fade = 0; // rain opacity 0..1

    // rain points
    this.count = 700;
    this.area = ISLAND.sandR + 4;
    const pos = new Float32Array(this.count * 3);
    this.vy = new Float32Array(this.count);
    for (let i = 0; i < this.count; i++) {
      pos[i * 3] = (Math.random() * 2 - 1) * this.area;
      pos[i * 3 + 1] = Math.random() * 28;
      pos[i * 3 + 2] = (Math.random() * 2 - 1) * this.area;
      this.vy[i] = 16 + Math.random() * 10;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    this.rainMat = new THREE.PointsMaterial({
      color: 0xbfe9ff,
      size: 0.14,
      transparent: true,
      opacity: 0,
      depthWrite: false,
    });
    this.rain = new THREE.Points(geo, this.rainMat);
    this.rain.frustumCulled = false;
    this.rain.visible = false;
    scene.add(this.rain);

    // rainbow (concentric half-torus arcs), hidden until shown
    this.rainbow = new THREE.Group();
    this.rainbowMats = [];
    RAINBOW_COLORS.forEach((c, i) => {
      const r = 26 + i * 1.7;
      const geoR = new THREE.TorusGeometry(r, 1.3, 8, 80, Math.PI);
      const matR = new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: 0, depthWrite: false });
      this.rainbowMats.push(matR);
      this.rainbow.add(new THREE.Mesh(geoR, matR));
    });
    this.rainbow.position.set(0, -4, -48);
    this.rainbow.visible = false;
    scene.add(this.rainbow);
    this.rainbowAlpha = 0;
  }

  get isRaining() {
    return this.state === 'rain';
  }

  /** Manually advance weather: dry -> rain -> rainbow -> dry. Returns new state. */
  cycle() {
    if (this.state === 'dry') {
      this.state = 'rain';
      this.rainDuration = 14 + Math.random() * 10;
      this.rain.visible = true;
    } else if (this.state === 'rain') {
      this.state = 'rainbow';
      this.timer = 9;
    } else {
      this.state = 'dry';
      this.timer = 35 + Math.random() * 40;
    }
    return this.state;
  }

  _setRainbow(a) {
    this.rainbowAlpha = a;
    this.rainbow.visible = a > 0.01;
    for (const m of this.rainbowMats) m.opacity = a * 0.85;
  }

  update(dt) {
    // advance state machine
    this.timer -= dt;
    if (this.state === 'dry' && this.timer <= 0) {
      this.state = 'rain';
      this.rainDuration = 14 + Math.random() * 12;
      this.rain.visible = true;
    } else if (this.state === 'rain') {
      this.rainDuration -= dt;
      if (this.rainDuration <= 0) {
        this.state = 'rainbow';
        this.timer = 9; // rainbow lingers ~9s
      }
    } else if (this.state === 'rainbow' && this.timer <= 0) {
      this.state = 'dry';
      this.timer = 35 + Math.random() * 40; // long dry spell
    }

    // rain fade + fall
    const targetFade = this.state === 'rain' ? 1 : 0;
    this.fade += (targetFade - this.fade) * Math.min(1, dt * 2);
    this.rainMat.opacity = this.fade * 0.6;
    if (this.fade < 0.02) {
      this.rain.visible = false;
    } else {
      this.rain.visible = true;
      const arr = this.rain.geometry.attributes.position.array;
      for (let i = 0; i < this.count; i++) {
        let y = arr[i * 3 + 1] - this.vy[i] * dt;
        if (y < 0) {
          y = 24 + Math.random() * 6;
          arr[i * 3] = (Math.random() * 2 - 1) * this.area;
          arr[i * 3 + 2] = (Math.random() * 2 - 1) * this.area;
        }
        arr[i * 3 + 1] = y;
      }
      this.rain.geometry.attributes.position.needsUpdate = true;
    }

    // rainbow fade (in during 'rainbow' state, out otherwise)
    const targetRb = this.state === 'rainbow' ? 1 : 0;
    this._setRainbow(this.rainbowAlpha + (targetRb - this.rainbowAlpha) * Math.min(1, dt * 1.5));
  }
}
