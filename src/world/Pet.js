// A little chick that hops along behind the avatar.
import * as THREE from 'three';
import { toon } from '../gfx/toon.js';
import { addOutline } from '../gfx/outline.js';

export class Pet {
  constructor(scene, start) {
    this.group = new THREE.Group();
    this.group.position.copy(start);

    const part = (geo, color, t = 0.014) => {
      const m = new THREE.Mesh(geo, toon(color));
      m.castShadow = true;
      addOutline(m, { thickness: t });
      return m;
    };

    const body = part(new THREE.SphereGeometry(0.26, 14, 12), '#ffd83b');
    body.scale.set(1, 0.92, 1);
    body.position.y = 0.26;
    this.group.add(body);
    const head = part(new THREE.SphereGeometry(0.18, 14, 12), '#ffd83b');
    head.position.set(0, 0.5, 0.06);
    this.group.add(head);
    const beak = part(new THREE.ConeGeometry(0.07, 0.16, 6), '#f0922e', 0.01);
    beak.rotation.x = Math.PI / 2;
    beak.position.set(0, 0.48, 0.26);
    this.group.add(beak);
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0x201a16 });
    for (const s of [-1, 1]) {
      const e = new THREE.Mesh(new THREE.SphereGeometry(0.03, 8, 8), eyeMat);
      e.position.set(s * 0.08, 0.55, 0.2);
      this.group.add(e);
    }
    for (const s of [-1, 1]) {
      const wing = part(new THREE.SphereGeometry(0.12, 8, 8), '#ffe480', 0.01);
      wing.scale.set(0.4, 0.8, 1);
      wing.position.set(s * 0.24, 0.26, 0);
      this.group.add(wing);
    }
    for (const s of [-1, 1]) {
      const foot = part(new THREE.CylinderGeometry(0.02, 0.02, 0.1, 5), '#f0922e', 0.008);
      foot.position.set(s * 0.08, 0.03, 0.04);
      this.group.add(foot);
    }

    scene.add(this.group);
    this.hop = 0;
  }

  /** Follow `target` (avatar position), keeping a small gap; hop while moving. */
  update(dt, target) {
    const dx = target.x - this.group.position.x;
    const dz = target.z - this.group.position.z;
    const dist = Math.hypot(dx, dz);
    let moving = 0;
    if (dist > 1.4) {
      const sp = Math.min(dist - 1.2, 5.5 * dt);
      this.group.position.x += (dx / dist) * sp;
      this.group.position.z += (dz / dist) * sp;
      this.group.rotation.y = Math.atan2(dx, dz);
      moving = 1;
    }
    this.hop += dt * (moving ? 13 : 3);
    this.group.position.y = Math.abs(Math.sin(this.hop)) * (moving ? 0.2 : 0.04);
  }
}
