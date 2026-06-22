// A single plantable tile. Holds at most one Flower.
import * as THREE from 'three';
import { toon } from '../gfx/toon.js';
import { addOutline } from '../gfx/outline.js';
import { Flower } from './Flower.js';
import { GRID, COLORS } from '../config/constants.js';

export class Plot {
  constructor(index, x, z, locked = false) {
    this.index = index;
    this.group = new THREE.Group();
    this.group.position.set(x, 0, z);
    this.flower = null;
    this.hover = false;
    this.locked = locked;

    const size = GRID.tile - GRID.gap;
    this.soil = new THREE.Mesh(new THREE.BoxGeometry(size, 0.22, size), toon(COLORS.soil));
    this.soil.position.y = 0.11;
    this.soil.receiveShadow = true;
    this.soil.userData.plot = this; // for raycasting
    addOutline(this.soil, { thickness: 0.022 });
    this.group.add(this.soil);

    // grassy rim so tiles sit nicely in the lawn
    const rim = new THREE.Mesh(new THREE.BoxGeometry(GRID.tile, 0.08, GRID.tile), toon(COLORS.grassDark));
    rim.position.y = 0.04;
    rim.receiveShadow = true;
    this.group.add(rim);

    // padlock shown when the plot is locked
    this.lock = new THREE.Group();
    const metal = toon('#7a7f88');
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.28, 0.16), metal);
    body.position.y = 0.5;
    addOutline(body, { thickness: 0.016 });
    const shackle = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.035, 8, 16, Math.PI), metal);
    shackle.position.y = 0.66;
    addOutline(shackle, { thickness: 0.012 });
    const keyhole = new THREE.Mesh(new THREE.SphereGeometry(0.04, 8, 8), toon('#3a2f25'));
    keyhole.position.set(0, 0.5, 0.09);
    this.lock.add(body, shackle, keyhole);
    this.lock.visible = locked;
    this.group.add(this.lock);

    this._applySoilColor();
  }

  setLocked(locked) {
    this.locked = locked;
    this.lock.visible = locked;
    this._applySoilColor();
  }

  get position() {
    return this.group.position;
  }
  isEmpty() {
    return !this.flower;
  }
  isBloomed() {
    return !!this.flower && this.flower.isBloom;
  }

  plant(typeId, data = null) {
    if (this.locked || this.flower) return false;
    this.flower = new Flower(typeId, data);
    this.flower.group.position.y = 0.22;
    this.group.add(this.flower.group);
    return true;
  }

  water() {
    return this.flower ? this.flower.water() : false;
  }

  harvest() {
    if (!this.isBloomed()) return null;
    const type = this.flower.type.id;
    this.group.remove(this.flower.group);
    this.flower.dispose();
    this.flower = null;
    return type;
  }

  _applySoilColor() {
    if (this.locked) {
      this.soil.material.color.set('#6f6a60'); // greyed-out, locked
      if (this.hover) this.soil.material.color.offsetHSL(0, 0, 0.08);
      return;
    }
    const wet = this.flower && this.flower.wet > 0;
    this.soil.material.color.set(wet ? COLORS.soilWet : COLORS.soil);
    if (this.hover) this.soil.material.color.offsetHSL(0, 0, 0.1);
  }

  setHover(h) {
    this.hover = h;
    this.soil.position.y = h && !this.locked ? 0.13 : 0.11;
    this._applySoilColor();
  }

  /** @returns {boolean} true on the frame the flower reaches full bloom */
  update(dt) {
    let justBloomed = false;
    if (this.flower) {
      const changed = this.flower.update(dt);
      if (changed && this.flower.isBloom) justBloomed = true;
    }
    this._applySoilColor();
    return justBloomed;
  }

  serialize() {
    return this.flower ? this.flower.serialize() : null;
  }
}
