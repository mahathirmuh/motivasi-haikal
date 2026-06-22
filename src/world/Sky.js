// Gradient sky dome + warm sun + drifting clouds + a day/night cycle with stars.
import * as THREE from 'three';
import { COLORS } from '../config/constants.js';
import { toon } from '../gfx/toon.js';

const DOME_VERT = /* glsl */ `
  varying vec3 vWorld;
  void main() {
    vec4 w = modelMatrix * vec4(position, 1.0);
    vWorld = w.xyz;
    gl_Position = projectionMatrix * viewMatrix * w;
  }
`;
const DOME_FRAG = /* glsl */ `
  uniform vec3 top;
  uniform vec3 bottom;
  uniform float offset;
  uniform float exponent;
  varying vec3 vWorld;
  void main() {
    float h = normalize(vWorld + vec3(0.0, offset, 0.0)).y;
    float t = pow(clamp(max(h, 0.0), 0.0, 1.0), exponent);
    gl_FragColor = vec4(mix(bottom, top, t), 1.0);
  }
`;

// Day/night key frames. `at` is the cycle phase [0,1).
const PHASES = [
  { at: 0.0, top: '#ffd9a0', bot: '#ffb98a', sun: '#ffdca8', sunI: 1.0, hemiI: 0.7, ambI: 0.3, star: 0.0 }, // sunrise
  { at: 0.22, top: '#8fd2ef', bot: '#ffe6c4', sun: '#fff0cf', sunI: 1.8, hemiI: 0.9, ambI: 0.25, star: 0.0 }, // midday
  { at: 0.5, top: '#f6a98a', bot: '#ffd29a', sun: '#ff9866', sunI: 1.1, hemiI: 0.6, ambI: 0.32, star: 0.0 }, // sunset
  { at: 0.62, top: '#3a3f6e', bot: '#7a6a8a', sun: '#c9b6d8', sunI: 0.5, hemiI: 0.4, ambI: 0.4, star: 0.6 }, // dusk
  { at: 0.8, top: '#141a3a', bot: '#2a2f55', sun: '#9fb4e0', sunI: 0.25, hemiI: 0.22, ambI: 0.45, star: 1.0 }, // night
  { at: 1.0, top: '#ffd9a0', bot: '#ffb98a', sun: '#ffdca8', sunI: 1.0, hemiI: 0.7, ambI: 0.3, star: 0.0 }, // loop
];

const lerp = (a, b, f) => a + (b - a) * f;

function makeCloud() {
  const g = new THREE.Group();
  const mat = toon(COLORS.cloud, { steps: 3 });
  const puffs = 3 + Math.floor(Math.random() * 3);
  for (let i = 0; i < puffs; i++) {
    const r = 2 + Math.random() * 2.5;
    const m = new THREE.Mesh(new THREE.SphereGeometry(r, 10, 8), mat);
    m.position.set((i - puffs / 2) * 2.4, Math.random() * 1.2, Math.random() * 1.5);
    m.scale.y = 0.6;
    g.add(m);
  }
  return g;
}

export class Sky {
  constructor(scene) {
    this.group = new THREE.Group();

    this.domeMat = new THREE.ShaderMaterial({
      uniforms: {
        top: { value: COLORS.skyTop.clone() },
        bottom: { value: COLORS.skyHorizon.clone() },
        offset: { value: 40 },
        exponent: { value: 0.7 },
      },
      vertexShader: DOME_VERT,
      fragmentShader: DOME_FRAG,
      side: THREE.BackSide,
      depthWrite: false,
    });
    this.group.add(new THREE.Mesh(new THREE.SphereGeometry(400, 32, 16), this.domeMat));

    // sun + halo
    this.sunDisc = new THREE.Mesh(new THREE.CircleGeometry(22, 40), new THREE.MeshBasicMaterial({ color: 0xfff4d4 }));
    this.halo = new THREE.Mesh(
      new THREE.CircleGeometry(40, 40),
      new THREE.MeshBasicMaterial({ color: 0xffe7b0, transparent: true, opacity: 0.35, depthWrite: false })
    );
    this.sunDisc.position.set(-130, 95, -280);
    this.halo.position.copy(this.sunDisc.position);
    this.group.add(this.halo, this.sunDisc);

    // moon (shown at night)
    this.moon = new THREE.Mesh(
      new THREE.CircleGeometry(16, 36),
      new THREE.MeshBasicMaterial({ color: 0xf2f3ff, transparent: true, opacity: 0, depthWrite: false })
    );
    this.group.add(this.moon);

    // stars
    const N = 420;
    const pos = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) {
      const u = Math.random() * Math.PI * 2;
      const v = Math.random() * 0.5 * Math.PI; // upper hemisphere
      const r = 380;
      pos[i * 3] = Math.cos(u) * Math.sin(v) * r;
      pos[i * 3 + 1] = Math.cos(v) * r * 0.9 + 20;
      pos[i * 3 + 2] = Math.sin(u) * Math.sin(v) * r;
    }
    const sgeo = new THREE.BufferGeometry();
    sgeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    this.starMat = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 2.4,
      sizeAttenuation: false,
      transparent: true,
      opacity: 0,
      depthWrite: false,
    });
    this.stars = new THREE.Points(sgeo, this.starMat);
    this.group.add(this.stars);

    // clouds
    this.clouds = [];
    this.bound = 260;
    for (let i = 0; i < 9; i++) {
      const c = makeCloud();
      c.position.set((Math.random() * 2 - 1) * this.bound, 55 + Math.random() * 55, -60 - Math.random() * 220);
      c.userData.speed = 1.2 + Math.random() * 1.6;
      this.clouds.push(c);
      this.group.add(c);
    }

    this.sunOffset = new THREE.Vector3(8, 14, 6); // direction for the shadow-casting light
    this.nightLevel = 0;
    scene.add(this.group);
  }

  update(dt) {
    for (const c of this.clouds) {
      c.position.x += c.userData.speed * dt;
      if (c.position.x > this.bound) c.position.x = -this.bound;
    }
  }

  /** Apply a time-of-day phase t in [0,1). Optionally drive scene lights. */
  setDayNight(t, lights = null) {
    t = ((t % 1) + 1) % 1;
    let a = PHASES[0];
    let b = PHASES[1];
    for (let i = 0; i < PHASES.length - 1; i++) {
      if (t >= PHASES[i].at && t < PHASES[i + 1].at) {
        a = PHASES[i];
        b = PHASES[i + 1];
        break;
      }
    }
    const f = (t - a.at) / (b.at - a.at || 1);
    const topC = new THREE.Color(a.top).lerp(new THREE.Color(b.top), f);
    const botC = new THREE.Color(a.bot).lerp(new THREE.Color(b.bot), f);
    const sunC = new THREE.Color(a.sun).lerp(new THREE.Color(b.sun), f);
    const sunI = lerp(a.sunI, b.sunI, f);
    const hemiI = lerp(a.hemiI, b.hemiI, f);
    const ambI = lerp(a.ambI, b.ambI, f);
    const star = lerp(a.star, b.star, f);

    this.domeMat.uniforms.top.value.copy(topC);
    this.domeMat.uniforms.bottom.value.copy(botC);
    this.starMat.opacity = star;
    this.nightLevel = star; // 0 (day) .. 1 (night)

    // sun arc: rises +x, peaks overhead, sets -x, below horizon at night
    const elev = Math.sin(t * Math.PI * 2);
    const horiz = Math.cos(t * Math.PI * 2);
    const sx = horiz * 230;
    const sy = 60 + elev * 200;
    const sz = -250;
    this.sunDisc.position.set(sx, sy, sz);
    this.halo.position.copy(this.sunDisc.position);
    this.sunDisc.material.color.copy(sunC);
    const sunUp = elev > -0.15 ? 1 : 0;
    this.sunDisc.visible = sunUp === 1;
    this.halo.visible = sunUp === 1;
    // moon opposite the sun
    this.moon.position.set(-sx, 60 - elev * 200, sz);
    this.moon.material.opacity = star;
    this.moon.visible = star > 0.05;

    // shadow-casting light direction (kept as an offset; the garden re-centres it on the avatar)
    this.sunOffset.set(sx, Math.max(8, sy), sz + 250 + 6).setLength(20);

    if (lights) {
      if (lights.sun) {
        lights.sun.color.copy(sunC);
        lights.sun.intensity = sunI;
      }
      if (lights.hemi) lights.hemi.intensity = hemiI;
      if (lights.ambient) lights.ambient.intensity = ambI;
    }
  }
}
