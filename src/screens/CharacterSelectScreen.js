import * as THREE from 'three';
import { Sky } from '../world/Sky.js';
import { Sea } from '../world/Sea.js';
import { Island } from '../world/Island.js';
import { addLights, addFog } from '../gfx/lighting.js';
import { toon } from '../gfx/toon.js';
import { addOutline } from '../gfx/outline.js';
import { Avatar } from '../entities/Avatar.js';
import { GENDERS, PRESETS, getPreset } from '../config/characters.js';
import { el, mountUI } from '../utils/dom.js';
import { state } from '../core/state.js';

export class CharacterSelectScreen {
  constructor(app) {
    this.app = app;
  }

  enter(params = {}) {
    this.fromGarden = !!params.fromGarden;
    this.selection = { ...state.data.profile };
    if (!GENDERS.find((g) => g.id === this.selection.gender)) this.selection.gender = 'female';

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 1000);
    this.camera.position.set(0, 2.6, 7.0);
    this.camera.lookAt(0, 1.5, 0);

    addFog(this.scene, 40, 150);
    addLights(this.scene, { shadow: false });
    this.sky = new Sky(this.scene);
    this.sea = new Sea(this.scene);
    new Island(this.scene);

    // pedestal
    const pedestal = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.3, 0.4, 24), toon('#e6cd95'));
    pedestal.position.y = 0.2;
    addOutline(pedestal, { thickness: 0.02 });
    this.scene.add(pedestal);

    // rotating avatar preview
    this.pivot = new THREE.Group();
    this.pivot.position.y = 0.4;
    this.scene.add(this.pivot);
    this.avatar = new Avatar(this.selection);
    this.pivot.add(this.avatar.root);

    this._buildUI();
  }

  _rebuildAvatar() {
    this.avatar.setAppearance(this.selection);
  }

  _buildUI() {
    // side arrows to flip presets
    const left = el('button', { class: 'btn cs-arrow', onClick: () => this._changePreset(-1) }, '‹');
    const right = el('button', { class: 'btn cs-arrow', onClick: () => this._changePreset(1) }, '›');
    const arrows = el('div', { class: 'cs-arrows' }, [left, right]);

    // gender toggle
    this.genderBtns = {};
    const genderRow = el('div', { class: 'cs-row' }, [el('div', { class: 'cs-label', text: 'Gender' })]);
    for (const g of GENDERS) {
      const b = el(
        'button',
        { class: 'btn btn--ghost', onClick: () => this._changeGender(g.id) },
        `${g.icon} ${g.label}`
      );
      this.genderBtns[g.id] = b;
      genderRow.appendChild(b);
    }

    // preset name
    this.presetNameEl = el('div', { class: 'cs-preset-name', text: getPreset(this.selection.preset).name });
    const presetRow = el('div', { class: 'cs-row' }, [
      el('div', { class: 'cs-label', text: 'Karakter' }),
      this.presetNameEl,
    ]);

    // name input
    this.nameInput = el('input', {
      class: 'cs-name-input',
      type: 'text',
      maxlength: '16',
      placeholder: 'Nama (opsional)',
      value: this.selection.name || '',
    });
    this.nameInput.addEventListener('input', (e) => {
      this.selection.name = e.target.value;
    });
    const nameRow = el('div', { class: 'cs-row' }, [this.nameInput]);

    // actions
    const start = el('button', { class: 'btn btn--primary', onClick: () => this._start() }, 'MULAI');
    const actionRow = el('div', { class: 'cs-row' }, [start]);
    if (this.fromGarden) {
      actionRow.insertBefore(
        el('button', { class: 'btn btn--ghost', onClick: () => this.app.sm.go('garden') }, 'Kembali'),
        start
      );
    }

    const panel = el('div', { class: 'cs-panel' }, [genderRow, presetRow, nameRow, actionRow]);
    const header = el('div', { class: 'cs-header', text: 'Pilih Karakter' });

    mountUI(el('div', { class: 'screen' }, [header, arrows, panel]));
    this._syncGenderButtons();
  }

  _syncGenderButtons() {
    for (const id of Object.keys(this.genderBtns)) {
      this.genderBtns[id].classList.toggle('is-active', id === this.selection.gender);
    }
  }

  _changeGender(id) {
    this.selection.gender = id;
    this._syncGenderButtons();
    this._rebuildAvatar();
    this.app.audio?.play('click');
  }

  _changePreset(delta) {
    const n = PRESETS.length;
    this.selection.preset = (((this.selection.preset + delta) % n) + n) % n;
    this.presetNameEl.textContent = getPreset(this.selection.preset).name;
    this._rebuildAvatar();
    this.app.audio?.play('click');
  }

  _start() {
    this.selection.name = (this.nameInput.value || '').trim();
    state.setProfile(this.selection);
    this.app.audio?.play('click');
    this.app.sm.go('loading', { next: 'garden' });
  }

  update(dt) {
    this.pivot.rotation.y += dt * 0.6;
    this.avatar.update(dt); // idle breathing
    this.sky?.update(dt);
    this.sea?.update(dt);
  }
}
