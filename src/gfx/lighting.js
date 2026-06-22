// Warm, soft lighting + fog for the Ghibli mood.
import * as THREE from 'three';
import { COLORS } from '../config/constants.js';

/**
 * Add a hemisphere + key directional light + ambient fill. With `shadow`, the
 * directional light casts soft shadows sized to cover the garden.
 * @returns {{sun:THREE.DirectionalLight, hemi:THREE.HemisphereLight, ambient:THREE.AmbientLight}}
 */
export function addLights(scene, opts = {}) {
  const hemi = new THREE.HemisphereLight(0xfff2d6, 0x9fb88a, 0.85);
  scene.add(hemi);

  const sun = new THREE.DirectionalLight(0xfff0cf, 1.7);
  sun.position.set(8, 14, 6);
  if (opts.shadow) {
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    const s = opts.shadowSize ?? 16;
    const cam = sun.shadow.camera;
    cam.left = -s;
    cam.right = s;
    cam.top = s;
    cam.bottom = -s;
    cam.near = 0.5;
    cam.far = 60;
    sun.shadow.bias = -0.0004;
    sun.shadow.normalBias = 0.02;
  }
  scene.add(sun);
  scene.add(sun.target);

  const ambient = new THREE.AmbientLight(0xffe9c7, 0.25);
  scene.add(ambient);

  return { sun, hemi, ambient };
}

/** Soft warm fog so distant scenery melts into the sky. */
export function addFog(scene, near = 22, far = 70) {
  scene.fog = new THREE.Fog(COLORS.fog.clone(), near, far);
}
