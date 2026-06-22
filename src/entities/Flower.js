// A growing flower: seed -> sprout -> bloom, on a timer (watering speeds it up).
import * as THREE from 'three';
import { toon } from '../gfx/toon.js';
import { addOutline } from '../gfx/outline.js';
import { getFlower } from '../config/flowers.js';
import { GROWTH, STAGES } from '../config/constants.js';
import { mods } from '../core/modifiers.js';

function mesh(geo, color, { outline = true, thickness = 0.015 } = {}) {
  const m = new THREE.Mesh(geo, toon(color));
  m.castShadow = true;
  if (outline) addOutline(m, { thickness });
  return m;
}

export class Flower {
  constructor(typeId, data = null) {
    this.type = getFlower(typeId);
    this.group = new THREE.Group();
    this.top = new THREE.Group(); // swaying part
    this.group.add(this.top);
    this.stage = data?.stage ?? STAGES.SEED;
    this.progress = data?.progress ?? 0;
    this.wet = data?.wet ?? 0;
    this.time = Math.random() * 10;
    this._pop = 1;
    this.rebuild();
  }

  rebuild() {
    while (this.top.children.length) this.top.remove(this.top.children[0]);
    if (this.stage === STAGES.SEED) this._buildSeed();
    else if (this.stage === STAGES.SPROUT) this._buildSprout();
    else this._buildBloom();
    this._pop = 0.2; // grow-in animation
  }

  _buildSeed() {
    const mound = mesh(new THREE.SphereGeometry(0.16, 10, 8, 0, Math.PI * 2, 0, Math.PI * 0.5), this.type.center, {
      thickness: 0.01,
    });
    mound.position.y = 0.01;
    this.top.add(mound);
  }

  _stem(height) {
    const stem = mesh(new THREE.CylinderGeometry(0.035, 0.05, height, 6), this.type.stem, { thickness: 0.012 });
    stem.position.y = height / 2;
    this.top.add(stem);
    // a couple leaves
    for (const side of [-1, 1]) {
      const leaf = mesh(new THREE.SphereGeometry(0.12, 8, 6), this.type.stem, { thickness: 0.01 });
      leaf.scale.set(1.5, 0.35, 0.8);
      leaf.position.set(side * 0.12, height * 0.4, 0);
      leaf.rotation.z = side * 0.6;
      this.top.add(leaf);
    }
    return height;
  }

  _buildSprout() {
    const h = this._stem(0.28);
    const bud = mesh(new THREE.SphereGeometry(0.1, 10, 8), this.type.center, { thickness: 0.012 });
    bud.position.y = h + 0.04;
    this.top.add(bud);
  }

  _buildBloom() {
    const h = this._stem(0.55);
    const headY = h + 0.05;
    if (this.type.shape === 'sunflower') {
      const center = mesh(new THREE.SphereGeometry(0.17, 14, 12), this.type.center, { thickness: 0.012 });
      center.scale.y = 0.6;
      center.position.y = headY;
      this.top.add(center);
      const n = 14;
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2;
        const petal = mesh(new THREE.ConeGeometry(0.07, 0.26, 5), this.type.petal, { thickness: 0.01 });
        petal.position.set(Math.cos(a) * 0.26, headY, Math.sin(a) * 0.26);
        petal.rotation.z = Math.PI / 2;
        petal.rotation.y = -a;
        this.top.add(petal);
      }
    } else if (this.type.shape === 'tulip') {
      const n = 5;
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2;
        const petal = mesh(new THREE.SphereGeometry(0.13, 8, 8), i % 2 ? this.type.petalInner : this.type.petal, {
          thickness: 0.012,
        });
        petal.scale.set(0.55, 1.1, 0.55);
        petal.position.set(Math.cos(a) * 0.07, headY + 0.12, Math.sin(a) * 0.07);
        petal.rotation.z = Math.cos(a) * 0.3;
        petal.rotation.x = Math.sin(a) * 0.3;
        this.top.add(petal);
      }
    } else if (this.type.shape === 'lily') {
      // 6 pointed tepals splayed open like a star, with stamens
      const center = mesh(new THREE.SphereGeometry(0.06, 8, 8), this.type.center, { thickness: 0.01 });
      center.position.y = headY + 0.05;
      this.top.add(center);
      const n = 6;
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2;
        const petal = mesh(new THREE.ConeGeometry(0.09, 0.34, 4), i % 2 ? this.type.petalInner : this.type.petal, {
          thickness: 0.012,
        });
        petal.scale.set(0.6, 1, 1);
        petal.position.set(Math.cos(a) * 0.16, headY + 0.04, Math.sin(a) * 0.16);
        petal.rotation.z = Math.PI / 2;
        petal.rotation.y = -a;
        // tilt each tepal slightly upward-outward
        petal.rotation.x = 0.5;
        this.top.add(petal);
      }
      // stamens
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * Math.PI * 2;
        const st = mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.12, 4), '#e0b24a', { outline: false });
        st.position.set(Math.cos(a) * 0.03, headY + 0.1, Math.sin(a) * 0.03);
        st.rotation.z = Math.cos(a) * 0.3;
        st.rotation.x = Math.sin(a) * 0.3;
        const tip = mesh(new THREE.SphereGeometry(0.02, 6, 6), '#c8761f', { outline: false });
        tip.position.set(Math.cos(a) * 0.06, headY + 0.16, Math.sin(a) * 0.06);
        this.top.add(st, tip);
      }
    } else {
      // rose — layered cluster
      const layers = [
        { r: 0.0, y: 0.16, s: 0.16, c: this.type.center },
        { r: 0.1, y: 0.12, s: 0.13, c: this.type.petalInner },
        { r: 0.16, y: 0.06, s: 0.14, c: this.type.petal },
      ];
      for (const L of layers) {
        const count = L.r === 0 ? 1 : 6;
        for (let i = 0; i < count; i++) {
          const a = (i / count) * Math.PI * 2;
          const petal = mesh(new THREE.SphereGeometry(L.s, 8, 8), L.c, { thickness: 0.012 });
          petal.scale.set(1, 0.7, 1);
          petal.position.set(Math.cos(a) * L.r, headY + L.y, Math.sin(a) * L.r);
          this.top.add(petal);
        }
      }
    }
  }

  water() {
    if (this.stage === STAGES.BLOOM) return false;
    this.wet = GROWTH.waterDuration;
    return true;
  }

  get isBloom() {
    return this.stage === STAGES.BLOOM;
  }

  update(dt) {
    this.time += dt;
    if (this.wet > 0) this.wet = Math.max(0, this.wet - dt);

    let changed = false;
    if (this.stage !== STAGES.BLOOM) {
      const dur = this.stage === STAGES.SEED ? GROWTH.seedToSprout : GROWTH.sproutToBloom;
      const boost = this.wet > 0 ? GROWTH.waterBoost : 1;
      this.progress += (dt / dur) * boost * (mods.growthMul || 1);
      if (this.progress >= 1) {
        this.progress = 0;
        this.stage += 1;
        this.rebuild();
        changed = true;
      }
    }

    // gentle sway + grow-in pop
    if (this._pop < 1) this._pop = Math.min(1, this._pop + dt * 3);
    const sway = Math.sin(this.time * 1.4) * 0.05;
    this.top.rotation.z = sway;
    this.top.scale.setScalar(this._pop);

    return changed;
  }

  serialize() {
    return { type: this.type.id, stage: this.stage, progress: this.progress, wet: this.wet };
  }

  dispose() {
    this.group.traverse((o) => {
      if (o.isMesh) {
        o.geometry?.dispose?.();
        o.material?.dispose?.();
      }
    });
  }
}
