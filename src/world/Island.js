// A grass plateau ringed by a sandy beach and a short cliff that drops below the
// waterline. Used for the home island and (smaller) for a second island.
import * as THREE from 'three';
import { toon } from '../gfx/toon.js';
import { COLORS, ISLAND } from '../config/constants.js';

export class Island {
  constructor(scene, opts = {}) {
    const grassR = opts.grassR ?? ISLAND.grassR;
    const sandR = opts.sandR ?? ISLAND.sandR;
    const cliffBottom = opts.cliffBottom ?? ISLAND.cliffBottom;

    this.group = new THREE.Group();
    this.group.position.set(opts.x ?? 0, 0, opts.z ?? 0);

    // grass plateau
    const grass = new THREE.Mesh(new THREE.CircleGeometry(grassR + 0.6, 64), toon(COLORS.grass));
    grass.rotation.x = -Math.PI / 2;
    grass.receiveShadow = true;
    this.group.add(grass);

    // sandy beach ring
    const sand = new THREE.Mesh(new THREE.RingGeometry(grassR - 0.8, sandR, 64, 1), toon(COLORS.sand));
    sand.rotation.x = -Math.PI / 2;
    sand.position.y = -0.04;
    sand.receiveShadow = true;
    this.group.add(sand);

    // cliff skirt (open, tapered cylinder) dropping under the sea
    const cliffH = 0 - cliffBottom;
    const cliff = new THREE.Mesh(
      new THREE.CylinderGeometry(sandR, sandR * 0.78, cliffH, 64, 3, true),
      toon(COLORS.cliff, { flatShading: true })
    );
    cliff.position.y = cliffBottom + cliffH / 2;
    cliff.receiveShadow = true;
    this.group.add(cliff);

    // cap the bottom so the sea can't be seen through the island
    const base = new THREE.Mesh(
      new THREE.CircleGeometry(sandR * 0.78, 40),
      toon(COLORS.cliff, { flatShading: true })
    );
    base.rotation.x = Math.PI / 2;
    base.position.y = cliffBottom;
    this.group.add(base);

    scene.add(this.group);
  }
}
