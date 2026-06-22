// Sea life: a fish that leaps near shore, a few fish gliding along the surface,
// and a floating treasure you can sail up to.
import * as THREE from 'three';
import { toon } from '../gfx/toon.js';
import { addOutline } from '../gfx/outline.js';
import { ISLAND } from '../config/constants.js';

const rand = (a, b) => a + Math.random() * (b - a);

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

function makeTreasure() {
  const g = new THREE.Group();
  const part = (geo, c, t = 0.018) => {
    const m = new THREE.Mesh(geo, toon(c));
    m.castShadow = true;
    addOutline(m, { thickness: t });
    return m;
  };
  // floating ring buoy
  const buoy = part(new THREE.TorusGeometry(0.7, 0.18, 10, 20), '#e23b2e');
  buoy.rotation.x = Math.PI / 2;
  buoy.position.y = 0.1;
  g.add(buoy);
  // chest
  const chest = part(new THREE.BoxGeometry(0.7, 0.42, 0.5), '#8a5a2b');
  chest.position.y = 0.42;
  g.add(chest);
  const lid = part(new THREE.BoxGeometry(0.72, 0.22, 0.52), '#a06a36');
  lid.position.y = 0.7;
  g.add(lid);
  for (const yy of [0.42, 0.66]) {
    const band = part(new THREE.BoxGeometry(0.74, 0.06, 0.54), '#ffd166', 0.01);
    band.position.y = yy;
    g.add(band);
  }
  const coin = part(new THREE.CylinderGeometry(0.12, 0.12, 0.04, 12), '#ffd166', 0.01);
  coin.position.y = 0.95;
  g.add(coin);
  // tall marker so it's visible from afar
  const pole = part(new THREE.CylinderGeometry(0.03, 0.03, 1.6, 6), '#6b4a2b', 0.008);
  pole.position.y = 1.7;
  g.add(pole);
  const flag = part(new THREE.ConeGeometry(0.16, 0.3, 4), '#ffd166', 0.008);
  flag.rotation.z = -Math.PI / 2;
  flag.position.set(0.18, 2.4, 0);
  g.add(flag);
  return g;
}

export class SeaLife {
  constructor(scene) {
    this.elapsed = 0;

    // leaping fish (near shore)
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

    // fish gliding along the surface
    this.swimmers = [];
    for (let i = 0; i < 7; i++) {
      const f = makeFish();
      f.scale.setScalar(rand(0.4, 0.7));
      const a = Math.random() * Math.PI * 2;
      const cr = rand(ISLAND.sandR + 3, 30);
      f.userData = {
        cx: Math.cos(a) * cr,
        cz: Math.sin(a) * cr,
        radius: rand(3, 8),
        angle: Math.random() * Math.PI * 2,
        speed: rand(0.2, 0.5) * (Math.random() < 0.5 ? 1 : -1),
        phase: Math.random() * Math.PI * 2,
      };
      this.swimmers.push(f);
      scene.add(f);
    }

    // floating treasure
    this.treasure = makeTreasure();
    scene.add(this.treasure);
    this.treasureBaseY = ISLAND.seaY + 0.05;
    this.relocateTreasure();
  }

  relocateTreasure() {
    const a = Math.random() * Math.PI * 2;
    const r = rand(ISLAND.sandR + 6, 30);
    this.treasure.position.set(Math.cos(a) * r, this.treasureBaseY, Math.sin(a) * r);
  }

  update(dt) {
    this.elapsed += dt;
    const t = this.elapsed;

    // gliding fish
    for (const f of this.swimmers) {
      const u = f.userData;
      u.angle += u.speed * dt;
      const x = u.cx + Math.cos(u.angle) * u.radius;
      const z = u.cz + Math.sin(u.angle) * u.radius;
      f.position.set(x, ISLAND.seaY + 0.08 + Math.sin(t * 2 + u.phase) * 0.05, z);
      f.rotation.y = -u.angle + (u.speed > 0 ? 0 : Math.PI) + Math.PI / 2;
      f.rotation.z = Math.sin(t * 6 + u.phase) * 0.18;
    }

    // treasure bob
    if (this.treasure) {
      this.treasure.position.y = this.treasureBaseY + Math.sin(t * 1.5) * 0.08;
      this.treasure.rotation.y += dt * 0.4;
    }

    // leaping fish
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
    this.fish.rotation.y = Math.atan2(this.end.x - this.start.x, this.end.z - this.start.z) + Math.PI / 2;
    this.fish.rotation.z = Math.cos(k * Math.PI) * 0.9;
  }

  _spawn() {
    const a = Math.random() * Math.PI * 2;
    const r = ISLAND.sandR + 4 + Math.random() * 14;
    const cx = Math.cos(a) * r;
    const cz = Math.sin(a) * r;
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
}
