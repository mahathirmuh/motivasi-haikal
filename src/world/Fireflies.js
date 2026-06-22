// Glowing fireflies that drift over the island and only appear at night.
import * as THREE from 'three';
import { ISLAND } from '../config/constants.js';

export class Fireflies {
  constructor(scene, count = 70) {
    this.count = count;
    this.base = [];
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2;
      const r = Math.random() * (ISLAND.grassR - 1);
      const b = {
        x: Math.cos(a) * r,
        y: 0.4 + Math.random() * 1.8,
        z: Math.sin(a) * r,
        phase: Math.random() * Math.PI * 2,
        speed: 0.4 + Math.random() * 0.8,
      };
      this.base.push(b);
      pos[i * 3] = b.x;
      pos[i * 3 + 1] = b.y;
      pos[i * 3 + 2] = b.z;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    this.mat = new THREE.PointsMaterial({
      color: 0xfff3a0,
      size: 0.16,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true,
    });
    this.points = new THREE.Points(geo, this.mat);
    this.points.frustumCulled = false;
    scene.add(this.points);
  }

  /** nightLevel 0..1 */
  update(dt, t, nightLevel) {
    const op = Math.max(0, nightLevel - 0.2) * 1.1;
    this.mat.opacity = op;
    this.points.visible = op > 0.02;
    if (!this.points.visible) return;
    const arr = this.points.geometry.attributes.position.array;
    for (let i = 0; i < this.count; i++) {
      const b = this.base[i];
      arr[i * 3] = b.x + Math.sin(t * b.speed + b.phase) * 0.5;
      arr[i * 3 + 1] = b.y + Math.sin(t * 0.7 + b.phase) * 0.35;
      arr[i * 3 + 2] = b.z + Math.cos(t * b.speed + b.phase) * 0.5;
    }
    this.points.geometry.attributes.position.needsUpdate = true;
    // gentle twinkle
    this.mat.size = 0.14 + Math.sin(t * 3) * 0.03;
  }
}
