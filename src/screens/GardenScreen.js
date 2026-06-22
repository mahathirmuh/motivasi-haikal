import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { Sky } from '../world/Sky.js';
import { Sea } from '../world/Sea.js';
import { Island } from '../world/Island.js';
import { Scenery } from '../world/Scenery.js';
import { Fireflies } from '../world/Fireflies.js';
import { SeaLife } from '../world/SeaLife.js';
import { addLights, addFog } from '../gfx/lighting.js';
import { Avatar } from '../entities/Avatar.js';
import { Plot } from '../entities/Plot.js';
import { HUD } from '../ui/HUD.js';
import { Particles } from '../gfx/Particles.js';
import { state } from '../core/state.js';
import { GRID, ISLAND, HARVEST_COINS, HARVEST_SEED_REWARD, COLORS, DAY_LENGTH, SHOP_PRICES } from '../config/constants.js';
import { getFlower } from '../config/flowers.js';

export class GardenScreen {
  constructor(app) {
    this.app = app;
    this.plots = [];
    this.plotMeshes = [];
    this._hovered = null;
    this.keys = new Set();
    // temp vectors (avoid per-frame allocations)
    this._desired = new THREE.Vector3();
    this._newTarget = new THREE.Vector3();
    this._delta = new THREE.Vector3();
    this._tmpFwd = new THREE.Vector3();
    this._tmpRight = new THREE.Vector3();
  }

  enter() {
    this.scene = new THREE.Scene();
    this.scene.background = COLORS.skyHorizon.clone();
    this.camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 1000);

    addFog(this.scene, 45, 150);
    this.lights = addLights(this.scene, { shadow: true, shadowSize: 16 });
    this.sun = this.lights.sun;
    this.sky = new Sky(this.scene);
    this.sea = new Sea(this.scene);
    new Island(this.scene);
    this.scenery = new Scenery(this.scene);
    this.particles = new Particles(this.scene);
    this.fireflies = new Fireflies(this.scene);
    this.seaLife = new SeaLife(this.scene);
    this.dayTime = 0.18; // start mid-morning
    this.sky.setDayNight(this.dayTime, this.lights);

    this._buildPlots();

    // avatar
    this.avatar = new Avatar(state.data.profile);
    this.avatar.root.position.set(0, 0, 6);
    this.avatar.root.rotation.y = Math.PI; // face the garden
    this.avatar._faceTarget = Math.PI;
    this.scene.add(this.avatar.root);

    // invisible ground for movement picking
    this.pickPlane = new THREE.Mesh(
      new THREE.PlaneGeometry(80, 80),
      new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false })
    );
    this.pickPlane.rotation.x = -Math.PI / 2;
    this.scene.add(this.pickPlane);

    // camera + orbit/follow controls
    this.controls = new OrbitControls(this.camera, this.app.renderer.domElement);
    this.controls.enablePan = false;
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.minDistance = 6;
    this.controls.maxDistance = 22;
    this.controls.maxPolarAngle = 1.45;
    this.controls.target.set(this.avatar.root.position.x, 1.1, this.avatar.root.position.z);
    this.camera.position.set(0, 7, 16);
    this.controls.update();

    // picking
    this.raycaster = new THREE.Raycaster();
    this.pointer = new THREE.Vector2();

    // HUD
    this.hud = new HUD({
      onSelectSeed: (type) => this._selectSeed(type),
      onToggleMute: () => this.hud.setMuted(this.app.audio?.toggleMute()),
      onCustomize: () => this._openCustomize(),
      onBuySeed: (type) => this._buySeed(type),
    });

    this._refreshHUD();

    // input
    this._bindInput();
    this._bindKeys();

    // sound
    this.app.audio?.startGarden();
  }

  _buildPlots() {
    const startX = -((GRID.cols - 1) * GRID.tile) / 2;
    const startZ = -((GRID.rows - 1) * GRID.tile) / 2;
    let index = 0;
    for (let r = 0; r < GRID.rows; r++) {
      for (let c = 0; c < GRID.cols; c++) {
        const x = startX + c * GRID.tile;
        const z = startZ + r * GRID.tile;
        const plot = new Plot(index, x, z);
        const saved = state.data.plots?.[index];
        if (saved && saved.type) plot.plant(saved.type, saved);
        this.scene.add(plot.group);
        this.plots.push(plot);
        this.plotMeshes.push(plot.soil);
        index++;
      }
    }
  }

  // ---------- input ----------
  _bindInput() {
    const dom = this.app.renderer.domElement;
    this._onDown = (e) => {
      this._downX = e.clientX;
      this._downY = e.clientY;
      this._downT = performance.now();
    };
    this._onUp = (e) => {
      const moved = Math.hypot(e.clientX - this._downX, e.clientY - this._downY);
      const dur = performance.now() - this._downT;
      if (moved < 7 && dur < 450) this._handleClick(e);
    };
    this._onMove = (e) => this._handleHover(e);
    dom.addEventListener('pointerdown', this._onDown);
    dom.addEventListener('pointerup', this._onUp);
    dom.addEventListener('pointermove', this._onMove);
  }

  _bindKeys() {
    const MOVE = ['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '];
    this._onKeyDown = (e) => {
      const k = e.key.toLowerCase();
      if (MOVE.includes(k)) e.preventDefault();
      if (e.repeat) return;
      this.keys.add(k);
      if (k === 'e' || k === ' ') this._keyboardInteract();
      else if (k === '1') this._selectSeed('rose');
      else if (k === '2') this._selectSeed('tulip');
      else if (k === '3') this._selectSeed('sunflower');
      else if (k === '4') this._selectSeed('lily');
      else if (k === 'b') this.hud.toggleShop();
      else if (k === 'm') this.hud.setMuted(this.app.audio?.toggleMute());
      else if (k === 'c') this._openCustomize();
    };
    this._onKeyUp = (e) => this.keys.delete(e.key.toLowerCase());
    window.addEventListener('keydown', this._onKeyDown);
    window.addEventListener('keyup', this._onKeyUp);
  }

  /** Translate held movement keys into a camera-relative direction. */
  _applyKeyboard() {
    const K = this.keys;
    let f = 0;
    let s = 0;
    if (K.has('w') || K.has('arrowup')) f += 1;
    if (K.has('s') || K.has('arrowdown')) f -= 1;
    if (K.has('a') || K.has('arrowleft')) s -= 1;
    if (K.has('d') || K.has('arrowright')) s += 1;
    if (f === 0 && s === 0) {
      this.avatar.setMoveVector(0, 0);
      return;
    }
    // forward = camera -> avatar (flattened); right = forward rotated 90°
    const fwd = this._tmpFwd.set(
      this.avatar.position.x - this.camera.position.x,
      0,
      this.avatar.position.z - this.camera.position.z
    );
    if (fwd.lengthSq() < 1e-4) fwd.set(0, 0, 1);
    fwd.normalize();
    const right = this._tmpRight.set(-fwd.z, 0, fwd.x);
    this.avatar.setMoveVector(fwd.x * f + right.x * s, fwd.z * f + right.z * s);
  }

  /** E / Space: act on the closest plot if the avatar is standing by it. */
  _keyboardInteract() {
    let best = null;
    let bestD = Infinity;
    for (const p of this.plots) {
      const dx = p.position.x - this.avatar.position.x;
      const dz = p.position.z - this.avatar.position.z;
      const d = dx * dx + dz * dz;
      if (d < bestD) {
        bestD = d;
        best = p;
      }
    }
    const reach = GRID.tile * 1.15;
    if (best && bestD <= reach * reach) this._actOnPlot(best);
    else this.hud.toast('Dekati petak dulu untuk berinteraksi 🌱');
  }

  _setPointer(e) {
    this.pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
    this.pointer.y = -(e.clientY / window.innerHeight) * 2 + 1;
  }

  _handleClick(e) {
    this._setPointer(e);
    this.raycaster.setFromCamera(this.pointer, this.camera);

    const plotHits = this.raycaster.intersectObjects(this.plotMeshes, false);
    if (plotHits.length) {
      this._onPlotClicked(plotHits[0].object.userData.plot);
      return;
    }
    const groundHits = this.raycaster.intersectObject(this.pickPlane, false);
    if (groundHits.length) {
      const p = groundHits[0].point;
      const r = Math.hypot(p.x, p.z);
      if (r > ISLAND.walkR) {
        p.x *= ISLAND.walkR / r;
        p.z *= ISLAND.walkR / r;
      }
      this.avatar.moveTo(p);
    }
  }

  _handleHover(e) {
    this._setPointer(e);
    this.raycaster.setFromCamera(this.pointer, this.camera);
    const hits = this.raycaster.intersectObjects(this.plotMeshes, false);
    const hovered = hits.length ? hits[0].object.userData.plot : null;
    if (hovered !== this._hovered) {
      this._hovered?.setHover(false);
      hovered?.setHover(true);
      this._hovered = hovered;
      this.app.renderer.domElement.style.cursor = hovered ? 'pointer' : 'default';
    }
  }

  // ---------- gameplay ----------
  _selectSeed(type) {
    state.data.selectedSeed = type;
    state.save();
    this.hud.setSelectedSeed(type);
    this.app.audio?.play('click');
  }

  _buySeed(type) {
    const price = SHOP_PRICES[type] ?? 10;
    if (state.data.coins < price) {
      this.hud.toast('Koin tidak cukup 😅');
      this.app.audio?.play('click');
      return;
    }
    state.data.coins -= price;
    state.addSeeds(type, 1);
    state.save();
    this.app.audio?.play('pop');
    this.hud.toast(`Beli bibit ${getFlower(type).name} 🌱`);
    this._refreshHUD();
  }

  _standPoint(plot) {
    const p = plot.position;
    const dir = new THREE.Vector3(this.avatar.position.x - p.x, 0, this.avatar.position.z - p.z);
    if (dir.lengthSq() < 1e-4) dir.set(0, 0, 1);
    dir.normalize();
    return new THREE.Vector3(p.x + dir.x * GRID.tile * 0.6, 0, p.z + dir.z * GRID.tile * 0.6);
  }

  _onPlotClicked(plot) {
    if (plot.isEmpty()) {
      const type = state.data.selectedSeed;
      if ((state.data.seeds[type] || 0) <= 0) {
        this.hud.toast(`Bibit ${getFlower(type).name} habis 😅`);
        this.app.audio?.play('click');
        return;
      }
    }
    const stand = this._standPoint(plot);
    this.avatar.moveTo(stand, () => this._actOnPlot(plot));
  }

  _actOnPlot(plot) {
    if (plot.isEmpty()) this._plant(plot);
    else if (plot.isBloomed()) this._harvest(plot);
    else this._water(plot);
  }

  _plant(plot) {
    const type = state.data.selectedSeed;
    if ((state.data.seeds[type] || 0) <= 0) {
      this.hud.toast(`Bibit ${getFlower(type).name} habis 😅`);
      return;
    }
    const flower = getFlower(type);
    state.data.seeds[type] -= 1;
    plot.plant(type);
    state.recordPlant(type);
    this.app.audio?.play('pop');
    this._fxAtPlot(plot, flower, 'plant');
    this.hud.toast(`Menanam ${flower.name} 🌱`);
    const done = state.missionEvent('plant', { type });
    this._handleCompletions(done);
    this._afterAction();
  }

  _water(plot) {
    if (!plot.water()) return;
    this.app.audio?.play('water');
    this._fxAtPlot(plot, plot.flower?.type, 'water');
    this.hud.toast('Disiram 💧 tumbuh lebih cepat!');
    const done = state.missionEvent('water');
    this._handleCompletions(done);
    this._afterAction();
  }

  _harvest(plot) {
    const flower = plot.flower?.type;
    const type = plot.harvest();
    if (!type) return;
    state.addSeeds(type, HARVEST_SEED_REWARD);
    state.addCoins(HARVEST_COINS);
    state.recordHarvest(type);
    this.app.audio?.play('ding');
    this._fxAtPlot(plot, flower, 'harvest');
    this._floatCoins(plot, HARVEST_COINS);
    this.hud.toast(`Panen ${getFlower(type).name}! +${HARVEST_COINS} 🪙`);
    const done = [...state.missionEvent('harvest'), ...state.missionEvent('earn', { amount: HARVEST_COINS })];
    this._handleCompletions(done);
    this._afterAction();
  }

  /** Reward + announce completed missions, then rotate in fresh ones. */
  _handleCompletions(list) {
    if (!list || !list.length) return;
    for (const m of list) {
      state.addCoins(m.reward);
      this.hud.toast(`✓ Misi: ${m.text}  +${m.reward} 🪙`);
    }
    this.app.audio?.play('ding');
    state.replaceCompleted();
  }

  _onBloom(plot) {
    const f = plot.flower?.type;
    if (this.particles) {
      const pos = new THREE.Vector3(plot.position.x, 0.95, plot.position.z);
      this.particles.burst(pos, [f ? f.petal : '#fff', f ? f.petalInner : '#fff', '#ffffff'], 12);
    }
    this.app.audio?.play('pop');
    this.hud.toast(`${f ? f.name : 'Bunga'} mekar! 🌸 siap panen`);
  }

  _fxAtPlot(plot, flower, kind) {
    if (!this.particles) return;
    const pos = new THREE.Vector3(plot.position.x, 0.75, plot.position.z);
    if (kind === 'harvest' && flower) {
      this.particles.burst(pos, [flower.petal, flower.petalInner, flower.center], 18);
    } else if (kind === 'plant') {
      this.particles.burst(pos, ['#9be07a', '#6fb83f', flower ? flower.center : '#fff'], 8);
    } else {
      this.particles.burst(pos, ['#bfe9ff', '#7fc7d8', '#ffffff'], 8);
    }
  }

  _floatCoins(plot, amount) {
    const v = new THREE.Vector3(plot.position.x, 1.0, plot.position.z).project(this.camera);
    const x = (v.x * 0.5 + 0.5) * window.innerWidth;
    const y = (-v.y * 0.5 + 0.5) * window.innerHeight;
    this.hud.floatText(x, y, `+${amount} 🪙`, '#8a5a1a');
  }

  _afterAction() {
    this._persist();
    this._refreshHUD();
  }

  _persist() {
    const plots = {};
    for (const plot of this.plots) {
      const s = plot.serialize();
      if (s) plots[plot.index] = s;
    }
    state.data.plots = plots;
    state.save();
  }

  _refreshHUD() {
    this.hud.setCoins(state.data.coins);
    this.hud.setInventory(state.data.seeds);
    this.hud.setSelectedSeed(state.data.selectedSeed);
    this.hud.setMissions(state.data.missions);
    this.hud.setMuted(!!state.data.muted);
  }

  _openCustomize() {
    this._persist();
    this.app.audio?.play('click');
    this.app.sm.go('character-select', { fromGarden: true });
  }

  // ---------- loop ----------
  update(dt) {
    this._applyKeyboard();
    this.avatar.update(dt, this.app.audio);
    // keep the avatar on the island
    const r = Math.hypot(this.avatar.root.position.x, this.avatar.root.position.z);
    if (r > ISLAND.walkR) {
      const k = ISLAND.walkR / r;
      this.avatar.root.position.x *= k;
      this.avatar.root.position.z *= k;
    }
    for (const plot of this.plots) {
      if (plot.update(dt)) this._onBloom(plot);
    }

    this.sky?.update(dt);
    this.dayTime = (this.dayTime + dt / DAY_LENGTH) % 1;
    this.sky?.setDayNight(this.dayTime, this.lights);
    this.sea?.update(dt);
    this.scenery?.update(dt, this.app.clock.elapsedTime);
    this.particles?.update(dt);
    this.fireflies?.update(dt, this.app.clock.elapsedTime, this.sky.nightLevel);
    this.seaLife?.update(dt);

    // keep the shadow-casting light centred on the avatar; direction from day/night
    if (this.sun) {
      this.sun.target.position.copy(this.avatar.root.position);
      this.sun.position.copy(this.avatar.root.position).add(this.sky.sunOffset);
    }

    // third-person follow: translate camera with the target, preserve orbit
    this._desired.set(this.avatar.position.x, 1.1, this.avatar.position.z);
    this._newTarget.copy(this.controls.target).lerp(this._desired, 1 - Math.exp(-6 * dt));
    this._delta.subVectors(this._newTarget, this.controls.target);
    this.camera.position.add(this._delta);
    this.controls.target.copy(this._newTarget);
    this.controls.update();
  }

  exit() {
    const dom = this.app.renderer.domElement;
    dom.removeEventListener('pointerdown', this._onDown);
    dom.removeEventListener('pointerup', this._onUp);
    dom.removeEventListener('pointermove', this._onMove);
    window.removeEventListener('keydown', this._onKeyDown);
    window.removeEventListener('keyup', this._onKeyUp);
    dom.style.cursor = 'default';
    this.controls?.dispose();
    // ambiance keeps playing across screens (still by the sea)
  }
}
