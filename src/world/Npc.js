// A friendly garden fairy/gnome NPC that gives Haikal motivational messages.
import * as THREE from 'three';
import { toon } from '../gfx/toon.js';
import { addOutline } from '../gfx/outline.js';

export class Npc {
  constructor(scene, pos) {
    this.group = new THREE.Group();
    this.group.position.set(pos.x, pos.y, pos.z);
    this.baseY = pos.y;
    this.headY = 1.95;

    const part = (geo, color, t = 0.018) => {
      const m = new THREE.Mesh(geo, toon(color));
      m.castShadow = true;
      addOutline(m, { thickness: t });
      return m;
    };

    // robe
    const robe = part(new THREE.ConeGeometry(0.5, 1.15, 10), '#8f7be0');
    robe.position.y = 0.575;
    this.group.add(robe);
    // head
    const head = part(new THREE.SphereGeometry(0.26, 16, 14), '#f3c9a3');
    head.position.y = 1.25;
    this.group.add(head);
    // beard
    const beard = part(new THREE.ConeGeometry(0.18, 0.34, 8), '#f4f1ea', 0.012);
    beard.rotation.x = Math.PI;
    beard.position.set(0, 1.08, 0.14);
    this.group.add(beard);
    // pointy hat
    const hat = part(new THREE.ConeGeometry(0.32, 0.6, 10), '#ef7a9b');
    hat.position.y = 1.7;
    this.group.add(hat);
    const hatTip = part(new THREE.SphereGeometry(0.07, 8, 8), '#ffd166', 0.01);
    hatTip.position.y = 2.02;
    this.group.add(hatTip);
    // eyes
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0x201a16 });
    for (const s of [-1, 1]) {
      const e = new THREE.Mesh(new THREE.SphereGeometry(0.035, 8, 8), eyeMat);
      e.position.set(s * 0.1, 1.28, 0.24);
      this.group.add(e);
    }
    // glasses
    const frameMat = new THREE.MeshBasicMaterial({ color: 0x2a2320 });
    for (const s of [-1, 1]) {
      const lens = new THREE.Mesh(new THREE.TorusGeometry(0.07, 0.014, 8, 18), frameMat);
      lens.position.set(s * 0.1, 1.28, 0.26);
      this.group.add(lens);
    }
    const bridge = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.08, 6), frameMat);
    bridge.rotation.z = Math.PI / 2;
    bridge.position.set(0, 1.28, 0.26);
    this.group.add(bridge);

    // invisible click hitbox
    this.hit = new THREE.Mesh(
      new THREE.CylinderGeometry(0.6, 0.6, 2.2, 8),
      new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false })
    );
    this.hit.position.y = 1.1;
    this.hit.userData.npc = true;
    this.group.add(this.hit);

    scene.add(this.group);
  }

  get position() {
    return this.group.position;
  }

  update(dt, t) {
    this.group.position.y = this.baseY + Math.sin(t * 1.6) * 0.05;
    this.group.rotation.y = Math.sin(t * 0.4) * 0.3; // gently look around
  }
}
