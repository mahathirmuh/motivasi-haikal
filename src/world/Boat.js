// A little sailboat docked at the shore. Board it to sail the open sea.
import * as THREE from 'three';
import { toon } from '../gfx/toon.js';
import { addOutline } from '../gfx/outline.js';

export class Boat {
  constructor(scene, pos) {
    this.group = new THREE.Group();
    this.group.position.copy(pos);
    this.baseY = pos.y;

    const part = (geo, color, t = 0.02) => {
      const m = new THREE.Mesh(geo, toon(color));
      m.castShadow = true;
      addOutline(m, { thickness: t });
      return m;
    };

    const hull = part(new THREE.BoxGeometry(1.2, 0.5, 2.2), '#8a5a2b');
    hull.position.y = 0.12;
    this.group.add(hull);
    const bow = part(new THREE.ConeGeometry(0.62, 1.0, 4), '#8a5a2b');
    bow.rotation.x = Math.PI / 2;
    bow.rotation.y = Math.PI / 4;
    bow.scale.set(1, 1, 0.55);
    bow.position.set(0, 0.12, 1.35);
    this.group.add(bow);
    const inner = part(new THREE.BoxGeometry(0.92, 0.32, 1.85), '#caa777', 0.012);
    inner.position.y = 0.3;
    this.group.add(inner);

    const mast = part(new THREE.CylinderGeometry(0.04, 0.05, 1.7, 6), '#6b4a2b', 0.012);
    mast.position.set(0, 1.05, 0.2);
    this.group.add(mast);
    const sailMat = toon('#fff3d6');
    sailMat.side = THREE.DoubleSide;
    const sail = new THREE.Mesh(new THREE.PlaneGeometry(1.0, 1.2), sailMat);
    sail.position.set(0, 1.05, 0.2);
    sail.rotation.y = Math.PI / 2;
    this.group.add(sail);
    const flag = part(new THREE.ConeGeometry(0.1, 0.2, 4), '#ef7a9b', 0.008);
    flag.rotation.z = -Math.PI / 2;
    flag.position.set(0, 1.85, 0.2);
    this.group.add(flag);

    // invisible click/board hitbox
    this.hit = new THREE.Mesh(
      new THREE.BoxGeometry(1.7, 2.2, 2.8),
      new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false })
    );
    this.hit.position.y = 0.8;
    this.hit.userData.boat = true;
    this.group.add(this.hit);

    scene.add(this.group);
  }

  get position() {
    return this.group.position;
  }

  /** idle bob when no one's aboard */
  bob(t) {
    this.group.position.y = this.baseY + Math.sin(t * 1.8) * 0.06;
    this.group.rotation.z = Math.sin(t * 1.5) * 0.03;
  }
}
