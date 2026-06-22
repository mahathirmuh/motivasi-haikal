// Colorful butterflies that flutter over the island during the day.
import * as THREE from 'three';
import { ISLAND } from '../config/constants.js';

const WING_COLORS = ['#ef7a9b', '#ffd166', '#9be07a', '#7ec4ef', '#c6a8ef', '#ff9e6b'];

function makeButterfly(color) {
  const g = new THREE.Group();
  const mat = new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide, transparent: true });
  const wingGeo = new THREE.CircleGeometry(0.22, 8);
  const mkWing = (side) => {
    const pivot = new THREE.Group();
    const wing = new THREE.Mesh(wingGeo, mat);
    wing.position.x = side * 0.18;
    wing.scale.set(0.8, 1.3, 1);
    pivot.add(wing);
    g.add(pivot);
    return pivot;
  };
  g.userData.mat = mat;
  g.userData.wingL = mkWing(-1);
  g.userData.wingR = mkWing(1);
  return g;
}

export class Butterflies {
  constructor(scene, count = 9) {
    this.group = new THREE.Group();
    scene.add(this.group);
    this.items = [];
    for (let i = 0; i < count; i++) {
      const b = makeButterfly(WING_COLORS[i % WING_COLORS.length]);
      const a = Math.random() * Math.PI * 2;
      const r = 3 + Math.random() * (ISLAND.grassR - 4);
      b.userData.cx = Math.cos(a) * r;
      b.userData.cz = Math.sin(a) * r;
      b.userData.rad = 1.5 + Math.random() * 3;
      b.userData.speed = 0.3 + Math.random() * 0.5;
      b.userData.phase = Math.random() * Math.PI * 2;
      b.userData.h = 0.8 + Math.random() * 1.6;
      b.userData.flap = 8 + Math.random() * 6;
      this.items.push(b);
      this.group.add(b);
    }
  }

  /** dayLevel 0..1 (1 = full day) */
  update(dt, t, dayLevel) {
    const op = Math.max(0, dayLevel - 0.15);
    this.group.visible = op > 0.02;
    if (!this.group.visible) return;
    for (const b of this.items) {
      const u = b.userData;
      const ang = t * u.speed + u.phase;
      b.position.set(
        u.cx + Math.cos(ang) * u.rad,
        u.h + Math.sin(t * 1.3 + u.phase) * 0.4,
        u.cz + Math.sin(ang) * u.rad
      );
      // face direction of travel
      b.rotation.y = -ang + Math.PI / 2;
      const flap = Math.sin(t * u.flap + u.phase) * 0.9;
      u.wingL.rotation.y = flap;
      u.wingR.rotation.y = -flap;
      u.mat.opacity = op;
    }
  }
}
