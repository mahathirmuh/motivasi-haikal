// Decorative cel-shaded props: palm trees, rocks, grass tufts, little wild
// flowers, and a few seagulls circling far overhead.
import * as THREE from 'three';
import { toon } from '../gfx/toon.js';
import { addOutline } from '../gfx/outline.js';
import { COLORS, ISLAND } from '../config/constants.js';

const rand = (a, b) => a + Math.random() * (b - a);
function ringPoint(rMin, rMax) {
  const a = Math.random() * Math.PI * 2;
  const r = rand(rMin, rMax);
  return [Math.cos(a) * r, Math.sin(a) * r];
}

function makePalm() {
  const g = new THREE.Group();
  const trunkMat = toon(COLORS.palmTrunk, { flatShading: true });
  const segs = 4;
  const segH = 0.9;
  let x = 0;
  let y = 0;
  for (let i = 0; i < segs; i++) {
    const r0 = 0.27 - 0.04 * i;
    const r1 = 0.27 - 0.04 * (i + 1);
    const c = new THREE.Mesh(new THREE.CylinderGeometry(r1, r0, segH, 8), trunkMat);
    const bend = i * 0.07;
    c.position.set(x, y + (segH / 2) * Math.cos(bend), 0);
    c.rotation.z = -bend;
    c.castShadow = true;
    addOutline(c, { thickness: 0.02 });
    g.add(c);
    x += Math.sin(bend) * segH;
    y += Math.cos(bend) * segH;
  }

  const top = new THREE.Group();
  top.position.set(x, y, 0);
  g.add(top);

  const leafMat = toon(COLORS.palmLeaf, { flatShading: true });
  const n = 7;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const fg = new THREE.Group();
    fg.rotation.y = a;
    const frond = new THREE.Mesh(new THREE.ConeGeometry(0.3, 2.6, 4), leafMat);
    frond.position.set(0, -0.2, 1.2);
    frond.rotation.x = Math.PI / 2 + 0.55; // outward + drooping
    frond.scale.set(0.7, 1, 1);
    frond.castShadow = true;
    addOutline(frond, { thickness: 0.02 });
    fg.add(frond);
    top.add(fg);
  }
  // coconuts
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2;
    const co = new THREE.Mesh(new THREE.SphereGeometry(0.15, 8, 8), toon('#5a3a1f'));
    co.position.set(Math.cos(a) * 0.24, -0.05, Math.sin(a) * 0.24);
    top.add(co);
  }

  g.userData.top = top;
  g.userData.swayPhase = Math.random() * Math.PI * 2;
  return g;
}

function makeRock(scale) {
  const m = new THREE.Mesh(
    new THREE.DodecahedronGeometry(scale, 0),
    toon(Math.random() < 0.5 ? COLORS.rock : COLORS.rockDark, { flatShading: true })
  );
  m.rotation.set(Math.random() * 3, Math.random() * 3, Math.random() * 3);
  m.position.y = scale * 0.45;
  m.scale.y = rand(0.6, 0.9);
  m.castShadow = true;
  m.receiveShadow = true;
  addOutline(m, { thickness: 0.025 });
  return m;
}

function makeTuft() {
  const g = new THREE.Group();
  const mat = toon(Math.random() < 0.5 ? COLORS.grass : COLORS.grassDark);
  for (let i = 0; i < 3; i++) {
    const blade = new THREE.Mesh(new THREE.ConeGeometry(0.06, rand(0.3, 0.5), 4), mat);
    blade.position.set(rand(-0.12, 0.12), 0.2, rand(-0.12, 0.12));
    blade.rotation.z = rand(-0.3, 0.3);
    g.add(blade);
  }
  return g;
}

const DECO_COLORS = ['#ef7a9b', '#ffd166', '#9be07a', '#c6a8ef', '#7ec4ef', '#ff9e6b'];
function makeDecoFlower() {
  const g = new THREE.Group();
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.025, 0.3, 5), toon(COLORS.leafDark));
  stem.position.y = 0.15;
  g.add(stem);
  const head = new THREE.Mesh(
    new THREE.SphereGeometry(0.1, 8, 8),
    toon(DECO_COLORS[Math.floor(Math.random() * DECO_COLORS.length)])
  );
  head.position.y = 0.34;
  head.scale.y = 0.8;
  g.add(head);
  return g;
}

function makeGull() {
  const g = new THREE.Group();
  const mat = new THREE.MeshBasicMaterial({ color: COLORS.gull, side: THREE.DoubleSide });
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.5, 8, 6), mat);
  body.scale.set(1, 0.6, 1.7);
  g.add(body);
  const wingGeo = new THREE.PlaneGeometry(2.4, 0.7);
  const mkWing = (side) => {
    const pivot = new THREE.Group();
    const wing = new THREE.Mesh(wingGeo, mat);
    wing.rotation.x = -Math.PI / 2;
    wing.position.x = side * 1.2;
    pivot.add(wing);
    g.add(pivot);
    return pivot;
  };
  g.userData.wingL = mkWing(-1);
  g.userData.wingR = mkWing(1);
  g.userData.angle = Math.random() * Math.PI * 2;
  g.userData.radius = rand(60, 95);
  g.userData.speed = rand(0.05, 0.1);
  g.userData.height = rand(28, 42);
  g.userData.flapPhase = Math.random() * Math.PI * 2;
  g.scale.setScalar(rand(0.7, 1.1));
  return g;
}

export class Scenery {
  constructor(scene) {
    this.group = new THREE.Group();
    scene.add(this.group);
    this.palms = [];
    this.gulls = [];

    // palms near the beach
    for (let i = 0; i < 6; i++) {
      const p = makePalm();
      const [x, z] = ringPoint(ISLAND.grassR - 3.5, ISLAND.sandR - 0.8);
      p.position.set(x, 0, z);
      p.rotation.y = Math.random() * Math.PI * 2;
      p.scale.setScalar(rand(0.85, 1.2));
      this.palms.push(p);
      this.group.add(p);
    }

    // rocks
    for (let i = 0; i < 11; i++) {
      const r = makeRock(rand(0.4, 1.1));
      const [x, z] = ringPoint(7, ISLAND.sandR - 0.5);
      r.position.x = x;
      r.position.z = z;
      this.group.add(r);
    }

    // grass tufts
    for (let i = 0; i < 46; i++) {
      const t = makeTuft();
      const [x, z] = ringPoint(6.5, ISLAND.grassR - 0.5);
      t.position.set(x, 0, z);
      this.group.add(t);
    }

    // wild flowers
    for (let i = 0; i < 14; i++) {
      const f = makeDecoFlower();
      const [x, z] = ringPoint(6.5, ISLAND.grassR - 1);
      f.position.set(x, 0, z);
      this.group.add(f);
    }

    // seagulls
    for (let i = 0; i < 4; i++) {
      const gull = makeGull();
      this.gulls.push(gull);
      this.group.add(gull);
    }
  }

  update(dt, t) {
    for (const p of this.palms) {
      if (p.userData.top) p.userData.top.rotation.z = Math.sin(t * 0.8 + p.userData.swayPhase) * 0.04;
    }
    for (const g of this.gulls) {
      const u = g.userData;
      u.angle += u.speed * dt;
      g.position.set(Math.cos(u.angle) * u.radius, u.height, Math.sin(u.angle) * u.radius - 40);
      g.rotation.y = -u.angle + Math.PI / 2;
      const flap = Math.sin(t * 6 + u.flapPhase) * 0.5;
      u.wingL.rotation.z = flap;
      u.wingR.rotation.z = -flap;
    }
  }
}
