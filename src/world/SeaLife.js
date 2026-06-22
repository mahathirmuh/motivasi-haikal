// A little fish that periodically leaps out of the sea near the shore in an arc.
import * as THREE from 'three';
import { toon } from '../gfx/toon.js';
import { addOutline } from '../gfx/outline.js';
import { ISLAND } from '../config/constants.js';

function makeFish() {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.45, 12, 10), toon('#5fb6c9'));
  body.scale.set(1.6, 0.8, 0.7);
  addOutline(body, { thickness: 0.02 });
  g.add(body);
  const belly = new THREE.Mesh(new THREE.SphereGeometry(0.32, 10, 8), toon('#dff3f6'));
  belly.scale.set(1.4, 0.6, 0.5);
  belly.position.y = -0.12;
  g.add(belly);
  const tail = new THREE.Mesh(new THREE.ConeGeometry(0.3, 0.5, 4), toon('#4f9fb0'));
  tail.rotation.z = Math.PI / 2;
  tail.position.x = -0.8;
  tail.scale.set(1, 1, 0.4);
  addOutline(tail, { thickness: 0.02 });
  g.add(tail);
  const fin = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.3, 4), toon('#4f9fb0'));
  fin.position.y = 0.32;
  fin.scale.set(1, 1, 0.4);
  g.add(fin);
  return g;
}

export class SeaLife {
  constructor(scene) {
    this.fish = makeFish();
    this.fish.visible = false;
    scene.add(this.fish);
    this.active = false;
    this.timer = 2 + Math.random() * 3;
    this.t = 0;
    this.dur = 1.5;
    this.start = new THREE.Vector3();
    this.end = new THREE.Vector3();
    this.height = 2.5;
  }

  _spawn() {
    const a = Math.random() * Math.PI * 2;
    const r = ISLAND.sandR + 4 + Math.random() * 14;
    const cx = Math.cos(a) * r;
    const cz = Math.sin(a) * r;
    // a short arc roughly tangent to the shore
    const tang = a + Math.PI / 2;
    const len = 3 + Math.random() * 2;
    this.start.set(cx - Math.cos(tang) * len * 0.5, ISLAND.seaY - 0.3, cz - Math.sin(tang) * len * 0.5);
    this.end.set(cx + Math.cos(tang) * len * 0.5, ISLAND.seaY - 0.3, cz + Math.sin(tang) * len * 0.5);
    this.height = 2.0 + Math.random() * 1.5;
    this.dur = 1.3 + Math.random() * 0.5;
    this.t = 0;
    this.active = true;
    this.fish.visible = true;
  }

  update(dt) {
    if (!this.active) {
      this.timer -= dt;
      if (this.timer <= 0) this._spawn();
      return;
    }
    this.t += dt;
    const k = this.t / this.dur;
    if (k >= 1) {
      this.active = false;
      this.fish.visible = false;
      this.timer = 4 + Math.random() * 6;
      return;
    }
    const x = this.start.x + (this.end.x - this.start.x) * k;
    const z = this.start.z + (this.end.z - this.start.z) * k;
    const y = this.start.y + Math.sin(k * Math.PI) * this.height;
    this.fish.position.set(x, y, z);
    // face travel direction, tilt up on the way up and down on the way down
    this.fish.rotation.y = Math.atan2(this.end.x - this.start.x, this.end.z - this.start.z) + Math.PI / 2;
    this.fish.rotation.z = Math.cos(k * Math.PI) * 0.9;
  }
}
