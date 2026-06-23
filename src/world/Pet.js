// A little chick that hops along behind the avatar.
import * as THREE from 'three';
import { toon } from '../gfx/toon.js';
import { addOutline } from '../gfx/outline.js';
import { clamp, damp, dampAngle } from '../utils/math.js';

export class Pet {
  constructor(scene, start) {
    this.group = new THREE.Group();
    this.group.position.copy(start);

    const part = (geo, color, t = 0.014) => {
      const m = new THREE.Mesh(geo, toon(color));
      m.castShadow = true;
      addOutline(m, { thickness: t });
      return m;
    };

    const body = part(new THREE.SphereGeometry(0.26, 14, 12), '#ffd83b');
    body.scale.set(1, 0.92, 1);
    body.position.y = 0.26;
    this.group.add(body);
    const head = part(new THREE.SphereGeometry(0.18, 14, 12), '#ffd83b');
    head.position.set(0, 0.5, 0.06);
    this.group.add(head);
    const beak = part(new THREE.ConeGeometry(0.07, 0.16, 6), '#f0922e', 0.01);
    beak.rotation.x = Math.PI / 2;
    beak.position.set(0, 0.48, 0.26);
    this.group.add(beak);
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0x201a16 });
    for (const s of [-1, 1]) {
      const e = new THREE.Mesh(new THREE.SphereGeometry(0.03, 8, 8), eyeMat);
      e.position.set(s * 0.08, 0.55, 0.2);
      this.group.add(e);
    }
    for (const s of [-1, 1]) {
      const wing = part(new THREE.SphereGeometry(0.12, 8, 8), '#ffe480', 0.01);
      wing.scale.set(0.4, 0.8, 1);
      wing.position.set(s * 0.24, 0.26, 0);
      this.group.add(wing);
    }
    for (const s of [-1, 1]) {
      const foot = part(new THREE.CylinderGeometry(0.02, 0.02, 0.1, 5), '#f0922e', 0.008);
      foot.position.set(s * 0.08, 0.03, 0.04);
      this.group.add(foot);
    }

    scene.add(this.group);
    this.hop = 0;
    this.spd = 0; // eased ground speed (smooth accel/decel)
    this.obstacles = null; // solid props to slide around: [{x,z,r}]
    this.bodyR = 0.3; // collision radius of the chick
    this.vy = 0; // jump velocity
    this.airY = 0; // jump height above ground
  }

  /** Little hop, if on the ground. Returns true if it jumped. */
  jump() {
    if (this.airY <= 0.001) {
      this.vy = 4.8;
      return true;
    }
    return false;
  }

  /** Push out of any solid prop so the chick can't waddle through it. */
  _resolveObstacles() {
    const list = this.obstacles;
    if (!list || !list.length) return;
    const p = this.group.position;
    for (const o of list) {
      const dx = p.x - o.x;
      const dz = p.z - o.z;
      const min = o.r + this.bodyR;
      const d2 = dx * dx + dz * dz;
      if (d2 >= min * min) continue;
      if (d2 > 1e-6) {
        const d = Math.sqrt(d2);
        const push = (min - d) / d;
        p.x += dx * push;
        p.z += dz * push;
      } else {
        p.x += min; // dead-centre: nudge out along +x
      }
    }
  }

  /** Follow `target` (avatar position), keeping a small gap; hop while moving. */
  update(dt, target) {
    const pos = this.group.position;
    const dx = target.x - pos.x;
    const dz = target.z - pos.z;
    const dist = Math.hypot(dx, dz);
    const GAP = 1.3;

    // Desired speed ramps up smoothly the farther past the gap we are (no on/off
    // toggle), then we ease the actual speed toward it so starts & stops glide.
    const desired = clamp((dist - GAP) * 4, 0, 5.5);
    this.spd = damp(this.spd, desired, 9, dt);

    // Step toward the target but never cross into the gap (prevents overshoot
    // jitter when catching up).
    const step = Math.min(this.spd * dt, Math.max(0, dist - GAP));
    if (step > 1e-4 && dist > 1e-4) {
      const inv = 1 / dist;
      pos.x += dx * inv * step;
      pos.z += dz * inv * step;
      // Turn to face travel direction, damped so it never snaps or jitters.
      this.group.rotation.y = dampAngle(this.group.rotation.y, Math.atan2(dx, dz), 10, dt);
    }
    this._resolveObstacles(); // can't waddle through rocks/palm trunks

    // Hop amplitude + frequency blend with the eased speed, so the bounce grows
    // and fades smoothly instead of popping between walk/idle.
    const m = clamp(this.spd / 4, 0, 1);
    this.hop += dt * (3 + 10 * m);
    const bounce = Math.abs(Math.sin(this.hop)) * (0.04 + 0.16 * m);
    // jump arc (when hopping along with the player), on top of the walk bounce
    if (this.vy !== 0 || this.airY > 0) {
      this.vy -= 16 * dt;
      this.airY += this.vy * dt;
      if (this.airY <= 0) {
        this.airY = 0;
        this.vy = 0;
      }
    }
    pos.y = bounce + this.airY;
  }
}
