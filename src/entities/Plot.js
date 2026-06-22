// A single plantable tile. Holds at most one Flower.
import * as THREE from 'three';
import { toon } from '../gfx/toon.js';
import { addOutline } from '../gfx/outline.js';
import { Flower } from './Flower.js';
import { GRID, COLORS } from '../config/constants.js';

export class Plot {
  constructor(index, x, z) {
    this.index = index;
    this.group = new THREE.Group();
    this.group.position.set(x, 0, z);
    this.flower = null;
    this.hover = false;

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
    if (this.flower) return false;
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
    const wet = this.flower && this.flower.wet > 0;
    this.soil.material.color.set(wet ? COLORS.soilWet : COLORS.soil);
    if (this.hover) this.soil.material.color.offsetHSL(0, 0, 0.1);
  }

  setHover(h) {
    this.hover = h;
    this.soil.position.y = h ? 0.13 : 0.11;
    this._applySoilColor();
  }

  update(dt) {
    if (this.flower) this.flower.update(dt);
    this._applySoilColor();
  }

  serialize() {
    return this.flower ? this.flower.serialize() : null;
  }
}
