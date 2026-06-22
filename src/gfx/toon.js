// Cel-shading: MeshToonMaterial + a procedurally generated stepped gradient map.
import * as THREE from 'three';
import { TOON_STEPS } from '../config/constants.js';

const cache = new Map();

/** A 1-D stepped gradient texture; banding count = `steps`. Cached per step count. */
export function gradientMap(steps = TOON_STEPS) {
  if (cache.has(steps)) return cache.get(steps);
  const data = new Uint8Array(steps);
  for (let i = 0; i < steps; i++) {
    data[i] = Math.round((i / (steps - 1)) * 255);
  }
  const tex = new THREE.DataTexture(data, steps, 1, THREE.RedFormat);
  tex.minFilter = THREE.NearestFilter;
  tex.magFilter = THREE.NearestFilter;
  tex.generateMipmaps = false;
  tex.needsUpdate = true;
  cache.set(steps, tex);
  return tex;
}

/** Build a cel-shaded material. */
export function toon(color, opts = {}) {
  const mat = new THREE.MeshToonMaterial({
    color: new THREE.Color(color),
    gradientMap: gradientMap(opts.steps),
  });
  if (opts.emissive) {
    mat.emissive = new THREE.Color(opts.emissive);
    mat.emissiveIntensity = opts.emissiveIntensity ?? 0.4;
  }
  if (opts.transparent) {
    mat.transparent = true;
    mat.opacity = opts.opacity ?? 1;
  }
  if (opts.flatShading) mat.flatShading = true;
  return mat;
}
