// Procedural cel-shaded humanoid avatar with point-and-click movement.
//
// Built from primitives so no .glb is needed. Shape varies by gender (body
// proportions) and preset (hair/clothes/skin). Supports a click-to-walk target
// with arrival callback, plus a simple walk/idle gait.
import * as THREE from 'three';
import { toon } from '../gfx/toon.js';
import { addOutline } from '../gfx/outline.js';
import { getGender, getPreset } from '../config/characters.js';
import { AVATAR } from '../config/constants.js';
import { dampAngle, assetUrl } from '../utils/math.js';
import { loadGLB } from '../gfx/ModelLoader.js';

function part(geo, color, { outline = true, thickness = 0.02, cast = true } = {}) {
  const mesh = new THREE.Mesh(geo, toon(color));
  mesh.castShadow = cast;
  mesh.receiveShadow = false;
  if (outline) addOutline(mesh, { thickness });
  return mesh;
}

function buildHair(headG, style, color, headR) {
  const hairMat = () => color;
  const add = (geo, c, pos, rot) => {
    const m = part(geo, c, { thickness: 0.018 });
    if (pos) m.position.set(pos[0], pos[1], pos[2]);
    if (rot) m.rotation.set(rot[0], rot[1], rot[2]);
    headG.add(m);
    return m;
  };
  // base cap (slightly larger half sphere on the crown)
  const cap = add(
    new THREE.SphereGeometry(headR * 1.06, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.62),
    hairMat(),
    [0, headR * 0.12, 0]
  );

  switch (style) {
    case 'long': {
      const back = add(
        new THREE.BoxGeometry(headR * 1.7, headR * 1.9, headR * 0.5),
        hairMat(),
        [0, -headR * 0.55, -headR * 0.7]
      );
      back.castShadow = true;
      add(new THREE.BoxGeometry(headR * 0.45, headR * 1.5, headR * 1.2), hairMat(), [headR * 0.78, -headR * 0.3, 0]);
      add(new THREE.BoxGeometry(headR * 0.45, headR * 1.5, headR * 1.2), hairMat(), [-headR * 0.78, -headR * 0.3, 0]);
      break;
    }
    case 'spiky': {
      for (let i = 0; i < 7; i++) {
        const a = (i / 7) * Math.PI * 2;
        add(
          new THREE.ConeGeometry(headR * 0.22, headR * 0.5, 6),
          hairMat(),
          [Math.cos(a) * headR * 0.5, headR * 0.7, Math.sin(a) * headR * 0.5],
          [Math.sin(a) * 0.4, 0, -Math.cos(a) * 0.4]
        );
      }
      break;
    }
    case 'bun': {
      add(new THREE.SphereGeometry(headR * 0.5, 12, 12), hairMat(), [0, headR * 0.95, -headR * 0.2]);
      break;
    }
    case 'short':
    default:
      // just the cap, plus little fringe
      add(new THREE.BoxGeometry(headR * 1.5, headR * 0.4, headR * 0.4), hairMat(), [0, headR * 0.5, headR * 0.78]);
      break;
  }
  return cap;
}

export class Avatar {
  constructor(profile) {
    this.root = new THREE.Group();
    this.target = new THREE.Vector3();
    this.moveDir = new THREE.Vector3(); // keyboard direction (xz); overrides click target
    this.moving = false;
    this._onArrive = null;
    this._faceTarget = 0;
    this.time = 0;
    this.gait = 0;
    this.baseUpperY = 0;
    this.parts = {};
    this.vy = 0; // vertical velocity (jump)
    this.airY = 0; // height above ground
    this.speedMul = 1; // movement speed multiplier (e.g. slower while swimming)
    // optional GLTF model + animation
    this.mixer = null;
    this.walkAction = null;
    this.idleAction = null;
    this.currentAction = null;
    this._loadToken = 0;
    this.setAppearance(profile);
  }

  setAppearance(profile) {
    this._dispose();
    this.mixer = null;
    this.walkAction = this.idleAction = this.currentAction = null;
    this._loadToken += 1;
    while (this.root.children.length) this.root.remove(this.root.children[0]);
    this.parts = {};

    const gender = getGender(profile.gender);
    const preset = getPreset(profile.preset);
    if (preset.kind === 'dino') {
      this._buildCreature(gender, preset, { scale: 1.0, spikeSize: 0.13, spikeCount: 6, headScale: 1.0, teeth: false });
    } else if (preset.kind === 'godzilla') {
      this._buildCreature(gender, preset, { scale: 1.28, spikeSize: 0.28, spikeCount: 8, headScale: 1.18, teeth: true });
    } else if (preset.kind === 'pokemon') {
      this._buildPokemon(gender, preset);
    } else {
      this._buildHumanoid(gender, preset);
    }
    this.root.updateMatrixWorld(true);

    // Optional: swap the procedural placeholder for a real .glb (e.g. a Mixamo
    // character). Falls back to the placeholder if it fails to load.
    if (preset.model) this._loadModel(preset, this._loadToken);
  }

  async _loadModel(preset, token) {
    try {
      const gltf = await loadGLB(assetUrl(preset.model));
      if (token !== this._loadToken) return; // a newer appearance was selected
      this._dispose();
      while (this.root.children.length) this.root.remove(this.root.children[0]);
      this.parts = {};
      const model = gltf.scene;
      if (preset.modelScale) model.scale.setScalar(preset.modelScale);
      model.traverse((o) => {
        if (o.isMesh) o.castShadow = true;
      });
      this.root.add(model);

      if (gltf.animations && gltf.animations.length) {
        this.mixer = new THREE.AnimationMixer(model);
        const find = (re) => gltf.animations.find((c) => re.test(c.name.toLowerCase()));
        const walkClip = find(/walk|run/) || gltf.animations[0];
        const idleClip = find(/idle|stand/) || gltf.animations[0];
        this.walkAction = this.mixer.clipAction(walkClip);
        this.idleAction = this.mixer.clipAction(idleClip);
        this.idleAction.play();
        this.currentAction = this.idleAction;
      }
    } catch (err) {
      console.warn('[avatar] model load failed, keeping placeholder:', preset.model, err?.message || err);
    }
  }

  _buildHumanoid(gender, preset) {
    const b = gender.body;
    const H = b.height;

    const skin = preset.skin;
    const shirt = preset.cloth.primary;
    const pants = preset.cloth.secondary;
    const hairColor = preset.hair.color;
    const shoeColor = '#3b2f26';

    const hip = 0.34 * b.hips;
    const shoulder = 0.46 * b.shoulders;
    const legLen = 0.6 * H;
    const torsoLen = 0.6 * H;
    const headR = 0.2 * b.headScale * H;

    this.baseUpperY = legLen;

    // ---- legs ----
    const makeLeg = (side) => {
      const g = new THREE.Group();
      g.position.set(side * hip * 0.5, legLen, 0);
      const leg = part(new THREE.CapsuleGeometry(0.1 * H, legLen * 0.62, 4, 8), pants);
      leg.position.y = -legLen * 0.5;
      g.add(leg);
      const shoe = part(new THREE.BoxGeometry(0.2 * H, 0.13 * H, 0.3 * H), shoeColor);
      shoe.position.set(0, -legLen + 0.05 * H, 0.05 * H);
      g.add(shoe);
      this.root.add(g);
      return g;
    };
    this.parts.legL = makeLeg(-1);
    this.parts.legR = makeLeg(1);

    // ---- upper body (hips up) ----
    const upper = new THREE.Group();
    upper.position.y = legLen;
    this.root.add(upper);
    this.parts.upper = upper;

    const torso = part(
      new THREE.CylinderGeometry(shoulder * 0.5 * b.torsoTaper, hip * 0.6, torsoLen, 14),
      shirt
    );
    torso.position.y = torsoLen * 0.5;
    torso.receiveShadow = true;
    upper.add(torso);

    // little accent collar
    const collar = part(new THREE.TorusGeometry(shoulder * 0.34, 0.04 * H, 8, 16), preset.accent, {
      thickness: 0.012,
    });
    collar.rotation.x = Math.PI / 2;
    collar.position.y = torsoLen * 0.96;
    upper.add(collar);

    // ---- arms ----
    const makeArm = (side) => {
      const g = new THREE.Group();
      g.position.set(side * (shoulder * 0.5 + 0.03), torsoLen * 0.86, 0);
      const arm = part(new THREE.CapsuleGeometry(0.075 * H, torsoLen * 0.52, 4, 8), shirt);
      arm.position.y = -torsoLen * 0.32;
      g.add(arm);
      const hand = part(new THREE.SphereGeometry(0.085 * H, 10, 10), skin);
      hand.position.y = -torsoLen * 0.62;
      g.add(hand);
      upper.add(g);
      return g;
    };
    this.parts.armL = makeArm(-1);
    this.parts.armR = makeArm(1);

    // ---- head ----
    const headG = new THREE.Group();
    headG.position.y = torsoLen + headR * 0.55;
    upper.add(headG);
    this.parts.headG = headG;

    const head = part(new THREE.SphereGeometry(headR, 18, 16), skin);
    head.castShadow = true;
    headG.add(head);

    // eyes (no outline; flattened dark spheres on +Z face)
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0x2a2320 });
    const mkEye = (side) => {
      const e = new THREE.Mesh(new THREE.SphereGeometry(headR * 0.12, 8, 8), eyeMat);
      e.position.set(side * headR * 0.36, headR * 0.05, headR * 0.88);
      e.scale.z = 0.5;
      headG.add(e);
    };
    mkEye(-1);
    mkEye(1);

    // rosy cheeks
    const cheekMat = new THREE.MeshBasicMaterial({ color: 0xff9bb0, transparent: true, opacity: 0.5 });
    const mkCheek = (side) => {
      const c = new THREE.Mesh(new THREE.CircleGeometry(headR * 0.14, 12), cheekMat);
      c.position.set(side * headR * 0.5, -headR * 0.12, headR * 0.84);
      headG.add(c);
    };
    mkCheek(-1);
    mkCheek(1);

    buildHair(headG, preset.hair.style, hairColor, headR);
  }

  _buildCreature(gender, preset, opts) {
    const S = opts.scale * gender.body.height;
    const { body, belly, spike } = preset;
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0x201a16 });

    const legLen = 0.5 * S;
    const hipW = 0.5 * S;
    this.baseUpperY = legLen;

    // ---- legs (with clawed feet) ----
    const makeLeg = (side) => {
      const g = new THREE.Group();
      g.position.set(side * hipW * 0.5, legLen, 0);
      const thigh = part(new THREE.CapsuleGeometry(0.17 * S, legLen * 0.5, 5, 8), body);
      thigh.position.y = -legLen * 0.45;
      g.add(thigh);
      const foot = part(new THREE.BoxGeometry(0.28 * S, 0.14 * S, 0.42 * S), body);
      foot.position.set(0, -legLen + 0.06 * S, 0.1 * S);
      g.add(foot);
      for (const t of [-1, 0, 1]) {
        const claw = part(new THREE.ConeGeometry(0.04 * S, 0.12 * S, 4), spike, { thickness: 0.01 });
        claw.rotation.x = Math.PI / 2;
        claw.position.set(t * 0.09 * S, -legLen + 0.04 * S, 0.31 * S);
        g.add(claw);
      }
      this.root.add(g);
      return g;
    };
    this.parts.legL = makeLeg(-1);
    this.parts.legR = makeLeg(1);

    // ---- upper body ----
    const upper = new THREE.Group();
    upper.position.y = legLen;
    this.root.add(upper);
    this.parts.upper = upper;

    const torso = part(new THREE.SphereGeometry(0.5 * S, 16, 14), body);
    torso.scale.set(0.92, 1.05, 1.12);
    torso.position.set(0, 0.45 * S, 0);
    torso.rotation.x = -0.1;
    torso.receiveShadow = true;
    upper.add(torso);

    const bellyM = part(new THREE.SphereGeometry(0.4 * S, 14, 12), belly, { thickness: 0.012 });
    bellyM.scale.set(0.72, 0.96, 0.6);
    bellyM.position.set(0, 0.4 * S, 0.28 * S);
    upper.add(bellyM);

    // ---- tail (sways) ----
    const tail = new THREE.Group();
    tail.position.set(0, 0.32 * S, -0.4 * S);
    upper.add(tail);
    this.parts.tail = tail;
    let tz = 0;
    let ty = 0;
    const segs = 5;
    for (let i = 0; i < segs; i++) {
      const r = Math.max(0.06, (0.26 - i * 0.045) * S);
      const seg = part(new THREE.SphereGeometry(r, 10, 8), body, { thickness: 0.012 });
      tz -= 0.27 * S;
      ty -= 0.035 * S;
      seg.position.set(0, ty, tz);
      tail.add(seg);
      if (i < segs - 1) {
        const sp = part(new THREE.ConeGeometry(opts.spikeSize * 0.45 * S, opts.spikeSize * 0.9 * S, 4), spike, {
          thickness: 0.012,
        });
        sp.position.set(0, ty + r * 0.7, tz);
        tail.add(sp);
      }
    }

    // ---- tiny arms ----
    const makeArm = (side) => {
      const g = new THREE.Group();
      g.position.set(side * 0.42 * S, 0.62 * S, 0.2 * S);
      const arm = part(new THREE.CapsuleGeometry(0.08 * S, 0.26 * S, 4, 6), body);
      arm.position.y = -0.15 * S;
      arm.rotation.x = -0.6;
      g.add(arm);
      const claw = part(new THREE.ConeGeometry(0.05 * S, 0.12 * S, 4), spike, { thickness: 0.01 });
      claw.position.set(0, -0.3 * S, 0.09 * S);
      claw.rotation.x = Math.PI / 2;
      g.add(claw);
      upper.add(g);
      return g;
    };
    this.parts.armL = makeArm(-1);
    this.parts.armR = makeArm(1);

    // ---- head ----
    const headG = new THREE.Group();
    const hs = opts.headScale;
    headG.position.set(0, 0.86 * S, 0.34 * S);
    upper.add(headG);
    this.parts.headG = headG;

    const head = part(new THREE.SphereGeometry(0.34 * S * hs, 16, 14), body);
    head.scale.set(1, 0.9, 1.15);
    head.castShadow = true;
    headG.add(head);

    const snout = part(new THREE.BoxGeometry(0.34 * S * hs, 0.26 * S * hs, 0.42 * S * hs), body);
    snout.position.set(0, -0.05 * S, 0.32 * S * hs);
    headG.add(snout);

    if (opts.teeth) {
      for (let i = 0; i < 5; i++) {
        const tooth = part(new THREE.ConeGeometry(0.03 * S, 0.1 * S, 4), '#fdfdf5', { outline: false });
        tooth.rotation.x = Math.PI;
        tooth.position.set((i - 2) * 0.07 * S, -0.17 * S, 0.5 * S * hs);
        headG.add(tooth);
      }
    }

    const mkEye = (side) => {
      const e = new THREE.Mesh(new THREE.SphereGeometry(0.06 * S * hs, 8, 8), eyeMat);
      e.position.set(side * 0.18 * S, 0.1 * S, 0.3 * S * hs);
      headG.add(e);
      const brow = part(new THREE.BoxGeometry(0.16 * S, 0.06 * S, 0.06 * S), body, { outline: false });
      brow.position.set(side * 0.18 * S, 0.2 * S, 0.31 * S * hs);
      brow.rotation.z = side * (opts.teeth ? 0.5 : 0.2);
      headG.add(brow);
    };
    mkEye(-1);
    mkEye(1);

    // ---- dorsal spikes along the back ----
    const n = opts.spikeCount;
    for (let i = 0; i < n; i++) {
      const f = i / (n - 1);
      const sp = part(new THREE.ConeGeometry(opts.spikeSize * 0.5 * S, opts.spikeSize * S * (1 - f * 0.25), 4), spike, {
        thickness: 0.012,
      });
      sp.position.set(0, (0.5 + Math.sin(f * Math.PI) * 0.38) * S, (0.08 - f * 0.6) * S);
      upper.add(sp);
    }
  }

  _buildPokemon(gender, preset) {
    const S = gender.body.height * 0.95;
    const mon = preset.mon;
    const body = preset.body;
    const accent = preset.accent;
    const tip = preset.tip || '#3a2f25';
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0x201a16 });
    const whiteMat = new THREE.MeshBasicMaterial({ color: 0xffffff });

    const legLen = 0.28 * S;
    this.baseUpperY = legLen;

    const makeLeg = (side) => {
      const g = new THREE.Group();
      g.position.set(side * 0.22 * S, legLen, 0);
      const foot = part(new THREE.SphereGeometry(0.16 * S, 10, 8), body);
      foot.scale.set(1, 0.7, 1.3);
      foot.position.y = -legLen * 0.7;
      g.add(foot);
      this.root.add(g);
      return g;
    };
    this.parts.legL = makeLeg(-1);
    this.parts.legR = makeLeg(1);

    const upper = new THREE.Group();
    upper.position.y = legLen;
    this.root.add(upper);
    this.parts.upper = upper;

    const torso = part(new THREE.SphereGeometry(0.45 * S, 16, 14), body);
    torso.scale.set(1, 1.05, 0.95);
    torso.position.y = 0.4 * S;
    torso.receiveShadow = true;
    upper.add(torso);

    const makeArm = (side) => {
      const g = new THREE.Group();
      g.position.set(side * 0.42 * S, 0.45 * S, 0.05 * S);
      const arm = part(new THREE.SphereGeometry(0.12 * S, 8, 8), body);
      arm.scale.set(0.8, 1.2, 0.8);
      arm.position.y = -0.1 * S;
      g.add(arm);
      upper.add(g);
      return g;
    };
    this.parts.armL = makeArm(-1);
    this.parts.armR = makeArm(1);

    const headG = new THREE.Group();
    headG.position.y = mon === 'jiggly' ? 0.7 * S : 0.8 * S;
    upper.add(headG);
    this.parts.headG = headG;

    const headR = (mon === 'jiggly' ? 0.5 : 0.42) * S;
    const head = part(new THREE.SphereGeometry(headR, 18, 16), body);
    head.castShadow = true;
    headG.add(head);

    const mkEye = (side) => {
      if (mon === 'jiggly') {
        const white = new THREE.Mesh(new THREE.SphereGeometry(headR * 0.26, 14, 14), whiteMat);
        white.position.set(side * headR * 0.4, headR * 0.12, headR * 0.78);
        white.scale.z = 0.5;
        headG.add(white);
        const iris = new THREE.Mesh(new THREE.SphereGeometry(headR * 0.17, 14, 14), new THREE.MeshBasicMaterial({ color: accent }));
        iris.position.set(side * headR * 0.42, headR * 0.08, headR * 0.86);
        iris.scale.z = 0.4;
        headG.add(iris);
        const pup = new THREE.Mesh(new THREE.SphereGeometry(headR * 0.08, 10, 10), eyeMat);
        pup.position.set(side * headR * 0.42, headR * 0.06, headR * 0.92);
        pup.scale.z = 0.4;
        headG.add(pup);
        const sh = new THREE.Mesh(new THREE.SphereGeometry(headR * 0.05, 8, 8), whiteMat);
        sh.position.set(side * headR * 0.48, headR * 0.18, headR * 0.95);
        headG.add(sh);
      } else {
        const e = new THREE.Mesh(new THREE.SphereGeometry(headR * 0.13, 12, 12), eyeMat);
        e.position.set(side * headR * 0.4, headR * 0.18, headR * 0.84);
        e.scale.z = 0.5;
        headG.add(e);
        const sh = new THREE.Mesh(new THREE.SphereGeometry(headR * 0.05, 8, 8), whiteMat);
        sh.position.set(side * headR * 0.36, headR * 0.26, headR * 0.9);
        headG.add(sh);
      }
    };
    mkEye(-1);
    mkEye(1);

    const nose = new THREE.Mesh(new THREE.SphereGeometry(headR * 0.05, 8, 8), eyeMat);
    nose.position.set(0, -headR * 0.02, headR * 0.96);
    headG.add(nose);

    if (mon === 'pika') {
      for (const side of [-1, 1]) {
        const ear = part(new THREE.ConeGeometry(0.1 * S, 0.5 * S, 6), body, { thickness: 0.015 });
        ear.position.set(side * headR * 0.5, headR * 0.95, -headR * 0.1);
        ear.rotation.z = side * -0.4;
        headG.add(ear);
        const tipM = part(new THREE.ConeGeometry(0.1 * S, 0.18 * S, 6), tip, { outline: false });
        tipM.position.set(side * headR * 0.5 + side * 0.08 * S, headR * 0.95 + 0.21 * S, -headR * 0.1);
        tipM.rotation.z = side * -0.4;
        headG.add(tipM);
        const cheek = new THREE.Mesh(new THREE.CircleGeometry(headR * 0.18, 14), new THREE.MeshBasicMaterial({ color: accent }));
        cheek.position.set(side * headR * 0.62, -headR * 0.18, headR * 0.78);
        headG.add(cheek);
      }
      for (let i = 0; i < 2; i++) {
        const st = part(new THREE.BoxGeometry(0.5 * S, 0.06 * S, 0.12 * S), tip, { outline: false });
        st.position.set(0, 0.55 * S - i * 0.16 * S, -0.42 * S);
        upper.add(st);
      }
      // lightning-bolt tail
      const tail = new THREE.Group();
      tail.position.set(0, 0.3 * S, -0.42 * S);
      upper.add(tail);
      this.parts.tail = tail;
      const base = part(new THREE.BoxGeometry(0.14 * S, 0.18 * S, 0.1 * S), tip, { outline: false });
      tail.add(base);
      const z1 = part(new THREE.BoxGeometry(0.5 * S, 0.22 * S, 0.1 * S), body, { thickness: 0.015 });
      z1.position.set(-0.2 * S, 0.2 * S, 0);
      z1.rotation.z = 0.5;
      tail.add(z1);
      const z2 = part(new THREE.BoxGeometry(0.52 * S, 0.24 * S, 0.1 * S), body, { thickness: 0.015 });
      z2.position.set(0.02 * S, 0.45 * S, 0);
      z2.rotation.z = -0.6;
      tail.add(z2);
      const z3 = part(new THREE.BoxGeometry(0.62 * S, 0.3 * S, 0.1 * S), body, { thickness: 0.015 });
      z3.position.set(-0.18 * S, 0.74 * S, 0);
      z3.rotation.z = 0.5;
      tail.add(z3);
    } else if (mon === 'dedenne') {
      // big round ears + cheeks + whiskers + cream belly + little tail
      for (const side of [-1, 1]) {
        const ear = part(new THREE.SphereGeometry(0.26 * S, 12, 10), body, { thickness: 0.014 });
        ear.scale.set(1, 1, 0.3);
        ear.position.set(side * headR * 0.75, headR * 0.9, -headR * 0.05);
        ear.rotation.z = side * -0.2;
        headG.add(ear);
        const inner = new THREE.Mesh(new THREE.CircleGeometry(0.16 * S, 14), new THREE.MeshBasicMaterial({ color: tip }));
        inner.position.set(side * headR * 0.75, headR * 0.9, -headR * 0.05 + 0.08 * S);
        inner.rotation.z = side * -0.2;
        headG.add(inner);
        const cheek = new THREE.Mesh(new THREE.CircleGeometry(headR * 0.17, 12), new THREE.MeshBasicMaterial({ color: accent }));
        cheek.position.set(side * headR * 0.6, -headR * 0.06, headR * 0.82);
        headG.add(cheek);
        for (let w = 0; w < 2; w++) {
          const whisk = part(new THREE.CylinderGeometry(0.012 * S, 0.012 * S, 0.55 * S, 4), tip, { outline: false });
          whisk.position.set(side * headR * 0.95, -headR * 0.02 - w * 0.09 * S, headR * 0.45);
          whisk.rotation.z = Math.PI / 2;
          whisk.rotation.y = side * 0.3;
          headG.add(whisk);
        }
      }
      // cream belly
      const belly = part(new THREE.SphereGeometry(0.3 * S, 12, 10), '#f3e7c0', { thickness: 0.01 });
      belly.scale.set(0.7, 0.9, 0.5);
      belly.position.set(0, 0.4 * S, 0.28 * S);
      upper.add(belly);
      // little tail
      const tail = new THREE.Group();
      tail.position.set(0, 0.35 * S, -0.4 * S);
      upper.add(tail);
      this.parts.tail = tail;
      const seg = part(new THREE.ConeGeometry(0.1 * S, 0.42 * S, 6), body, { thickness: 0.012 });
      seg.rotation.x = -0.7;
      seg.position.set(0, 0.12 * S, -0.08 * S);
      tail.add(seg);
    } else {
      // jigglypuff: small pointed ears + forehead curl
      for (const side of [-1, 1]) {
        const ear = part(new THREE.ConeGeometry(0.12 * S, 0.22 * S, 6), body, { thickness: 0.014 });
        ear.position.set(side * headR * 0.55, headR * 0.82, -headR * 0.1);
        ear.rotation.z = side * -0.5;
        headG.add(ear);
        const inner = part(new THREE.ConeGeometry(0.06 * S, 0.14 * S, 6), tip, { outline: false });
        inner.position.set(side * headR * 0.55, headR * 0.84, -headR * 0.04);
        inner.rotation.z = side * -0.5;
        headG.add(inner);
      }
      const curl = part(new THREE.TorusGeometry(0.14 * S, 0.05 * S, 8, 16, Math.PI * 1.5), body, { thickness: 0.014 });
      curl.position.set(0, headR * 0.92, headR * 0.45);
      curl.rotation.set(0.5, 0, 0.3);
      headG.add(curl);
    }
  }

  /** Walk to a world point (y ignored). Optional callback fires on arrival. */
  moveTo(point, onArrive = null) {
    this.target.set(point.x, 0, point.z);
    this._onArrive = onArrive;
    this.moving = true;
  }

  /** Continuous (keyboard) movement direction in world XZ. (0,0) to stop.
   *  A non-zero direction cancels any click-to-walk target. */
  setMoveVector(x, z) {
    this.moveDir.set(x, 0, z);
    if (x !== 0 || z !== 0) {
      this.moving = false;
      this._onArrive = null;
    }
  }

  stop() {
    this.moving = false;
    this._onArrive = null;
    this.moveDir.set(0, 0, 0);
  }

  /** Hop, if currently on the ground. Returns true if it actually jumped. */
  jump() {
    if (this.airY <= 0.001) {
      this.vy = 5.8;
      return true;
    }
    return false;
  }

  get isAirborne() {
    return this.airY > 0.001;
  }

  get position() {
    return this.root.position;
  }

  update(dt, audio = null) {
    this.time += dt;
    let moving01 = 0;
    const spd = AVATAR.speed * (this.speedMul ?? 1);

    if (this.moveDir.lengthSq() > 1e-4) {
      // keyboard / directional movement
      const len = Math.hypot(this.moveDir.x, this.moveDir.z);
      const nx = this.moveDir.x / len;
      const nz = this.moveDir.z / len;
      this.root.position.x += nx * spd * dt;
      this.root.position.z += nz * spd * dt;
      this._faceTarget = Math.atan2(nx, nz);
      moving01 = 1;
      if (audio) audio.footstep(this.time);
    } else if (this.moving) {
      const dx = this.target.x - this.root.position.x;
      const dz = this.target.z - this.root.position.z;
      const dist = Math.hypot(dx, dz);
      if (dist <= AVATAR.arriveDist) {
        this.moving = false;
        const cb = this._onArrive;
        this._onArrive = null;
        if (cb) cb();
      } else {
        const step = Math.min(dist, spd * dt);
        const nx = dx / dist;
        const nz = dz / dist;
        this.root.position.x += nx * step;
        this.root.position.z += nz * step;
        this._faceTarget = Math.atan2(nx, nz);
        moving01 = 1;
        if (audio) audio.footstep(this.time);
      }
    }

    // face movement direction smoothly
    this.root.rotation.y = dampAngle(this.root.rotation.y, this._faceTarget, AVATAR.turnSpeed, dt);

    // gait
    this.gait += dt * (moving01 ? 9 : 0);
    const swing = Math.sin(this.gait) * (moving01 ? 0.55 : 0);
    if (this.parts.legL) this.parts.legL.rotation.x = swing;
    if (this.parts.legR) this.parts.legR.rotation.x = -swing;
    if (this.parts.armL) this.parts.armL.rotation.x = -swing * 0.8;
    if (this.parts.armR) this.parts.armR.rotation.x = swing * 0.8;

    const bob = moving01 ? Math.abs(Math.sin(this.gait)) * 0.06 : Math.sin(this.time * 2) * 0.012;
    if (this.parts.upper) this.parts.upper.position.y = this.baseUpperY + bob;

    // creature tail sway
    if (this.parts.tail) {
      this.parts.tail.rotation.y = Math.sin(this.gait * 0.5 + this.time * 1.6) * (moving01 ? 0.35 : 0.12);
    }

    // jump physics (vertical hop of the whole avatar)
    if (this.vy !== 0 || this.airY > 0) {
      this.vy -= 16 * dt;
      this.airY += this.vy * dt;
      if (this.airY <= 0) {
        this.airY = 0;
        this.vy = 0;
      }
      this.root.position.y = this.airY;
    }

    // GLTF animation (if a real model was loaded): crossfade walk/idle
    if (this.mixer) {
      const want = moving01 ? this.walkAction : this.idleAction;
      if (want && want !== this.currentAction) {
        want.reset().fadeIn(0.2).play();
        this.currentAction?.fadeOut(0.2);
        this.currentAction = want;
      }
      this.mixer.update(dt);
    }
  }

  _dispose() {
    this.root.traverse((o) => {
      if (o.isMesh) {
        o.geometry?.dispose?.();
        if (Array.isArray(o.material)) o.material.forEach((m) => m.dispose?.());
        else o.material?.dispose?.();
      }
    });
  }
}
