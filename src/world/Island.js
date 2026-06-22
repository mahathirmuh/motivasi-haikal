// The land the garden sits on: a grass plateau ringed by a sandy beach and a
// short cliff that drops below the waterline.
import * as THREE from 'three';
import { toon } from '../gfx/toon.js';
import { COLORS, ISLAND } from '../config/constants.js';

export class Island {
  constructor(scene) {
    this.group = new THREE.Group();

    // grass plateau
    const grass = new THREE.Mesh(new THREE.CircleGeometry(ISLAND.grassR + 0.6, 72), toon(COLORS.grass));
    grass.rotation.x = -Math.PI / 2;
    grass.position.y = 0;
    grass.receiveShadow = true;
    this.group.add(grass);

    // sandy beach ring
    const sand = new THREE.Mesh(
      new THREE.RingGeometry(ISLAND.grassR - 0.8, ISLAND.sandR, 72, 1),
      toon(COLORS.sand)
    );
    sand.rotation.x = -Math.PI / 2;
    sand.position.y = -0.04;
    sand.receiveShadow = true;
    this.group.add(sand);

    // cliff skirt (open, tapered cylinder) dropping under the sea
    const cliffH = 0 - ISLAND.cliffBottom;
    const cliff = new THREE.Mesh(
      new THREE.CylinderGeometry(ISLAND.sandR, ISLAND.sandR * 0.78, cliffH, 72, 3, true),
      toon(COLORS.cliff, { flatShading: true })
    );
    cliff.position.y = ISLAND.cliffBottom + cliffH / 2;
    cliff.receiveShadow = true;
    this.group.add(cliff);

    // cap the bottom so the sea can't be seen through the island
    const base = new THREE.Mesh(
      new THREE.CircleGeometry(ISLAND.sandR * 0.78, 48),
      toon(COLORS.cliff, { flatShading: true })
    );
    base.rotation.x = Math.PI / 2;
    base.position.y = ISLAND.cliffBottom;
    this.group.add(base);

    scene.add(this.group);
  }
}
