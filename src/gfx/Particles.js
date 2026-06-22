// Lightweight particle bursts (petals / sparkles) for harvest & celebration FX.
// Small, short-lived quads with gravity + fade. Pooled-ish: created on burst,
// disposed on death.
import * as THREE from 'three';

const GEO = new THREE.PlaneGeometry(0.16, 0.16);

export class Particles {
  constructor(scene) {
    this.scene = scene;
    this.group = new THREE.Group();
    scene.add(this.group);
    this.alive = [];
  }

  /**
   * @param {THREE.Vector3} pos world position
   * @param {string[]} colors hex colors to pick from
   * @param {number} count number of particles
   */
  burst(pos, colors, count = 14) {
    for (let i = 0; i < count; i++) {
      const color = colors[(Math.random() * colors.length) | 0];
      const mat = new THREE.MeshBasicMaterial({
        color,
        side: THREE.DoubleSide,
        transparent: true,
        depthWrite: false,
      });
      const m = new THREE.Mesh(GEO, mat);
      m.position.copy(pos);
      const ang = Math.random() * Math.PI * 2;
      const spd = 1.6 + Math.random() * 2.2;
      const p = {
        mesh: m,
        vel: new THREE.Vector3(Math.cos(ang) * spd * 0.6, 2.4 + Math.random() * 2.2, Math.sin(ang) * spd * 0.6),
        spin: new THREE.Vector3((Math.random() - 0.5) * 8, (Math.random() - 0.5) * 8, (Math.random() - 0.5) * 8),
        life: 0,
        ttl: 0.9 + Math.random() * 0.5,
        scale: 0.7 + Math.random() * 0.8,
      };
      m.scale.setScalar(p.scale);
      this.group.add(m);
      this.alive.push(p);
    }
  }

  update(dt) {
    for (let i = this.alive.length - 1; i >= 0; i--) {
      const p = this.alive[i];
      p.life += dt;
      if (p.life >= p.ttl) {
        this.group.remove(p.mesh);
        p.mesh.material.dispose();
        this.alive.splice(i, 1);
        continue;
      }
      p.vel.y -= 6.5 * dt; // gravity
      p.mesh.position.addScaledVector(p.vel, dt);
      p.mesh.rotation.x += p.spin.x * dt;
      p.mesh.rotation.y += p.spin.y * dt;
      p.mesh.rotation.z += p.spin.z * dt;
      const k = 1 - p.life / p.ttl;
      p.mesh.material.opacity = Math.min(1, k * 1.6);
    }
  }
}
