// Lightweight toon ocean: a big plane with vertex-displaced waves, stepped
// (banded) water colors, and animated white foam hugging the shoreline.
// Cheap on purpose — no reflections/refraction, just the Ghibli vibe.
import * as THREE from 'three';
import { COLORS, ISLAND } from '../config/constants.js';

const VERT = /* glsl */ `
  uniform float time;
  varying float vH;
  varying vec3 vPos;
  float waveH(vec3 p) {
    return sin(p.x * 0.18 + time * 0.9) * 0.16
         + sin(p.z * 0.23 - time * 0.7) * 0.13
         + sin((p.x + p.z) * 0.12 + time * 0.5) * 0.08;
  }
  void main() {
    vec3 p = position;          // geometry pre-rotated into XZ; p.y == 0
    float h = waveH(p);
    p.y += h;
    vH = h;
    vPos = p;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
  }
`;

const FRAG = /* glsl */ `
  uniform float time;
  uniform vec3 deep;
  uniform vec3 shallow;
  uniform vec3 foam;
  uniform float islandEdge;
  varying float vH;
  varying vec3 vPos;
  void main() {
    // banded toon water from wave height
    float t = clamp(vH * 2.0 + 0.5, 0.0, 1.0);
    float band = floor(t * 3.0) / 3.0;
    vec3 col = mix(deep, shallow, band);

    float r = length(vPos.xz);

    // foam ring near the shore (gaussian centered on the island edge)
    float d = r - islandEdge;
    float ring = exp(-pow(d / 1.7, 2.0));
    float stripes = step(0.45, sin(r * 2.4 - time * 2.0) * 0.5 + 0.5);
    float foamMask = clamp(ring * (0.45 + 0.55 * stripes), 0.0, 1.0);

    // a little foam on the tallest wave crests too
    foamMask = max(foamMask, smoothstep(0.17, 0.23, vH) * 0.5);

    col = mix(col, foam, foamMask);
    gl_FragColor = vec4(col, 1.0);
  }
`;

export class Sea {
  constructor(scene) {
    const geo = new THREE.PlaneGeometry(600, 600, 200, 200);
    geo.rotateX(-Math.PI / 2);

    this.uniforms = {
      time: { value: 0 },
      deep: { value: new THREE.Color(COLORS.seaDeep) },
      shallow: { value: new THREE.Color(COLORS.seaShallow) },
      foam: { value: new THREE.Color(COLORS.seaFoam) },
      islandEdge: { value: ISLAND.sandR + 0.3 },
    };
    const mat = new THREE.ShaderMaterial({
      uniforms: this.uniforms,
      vertexShader: VERT,
      fragmentShader: FRAG,
      side: THREE.DoubleSide,
    });
    this.mesh = new THREE.Mesh(geo, mat);
    this.mesh.position.y = ISLAND.seaY;
    this.mesh.renderOrder = -1;
    scene.add(this.mesh);
  }

  update(dt) {
    this.uniforms.time.value += dt;
  }
}
