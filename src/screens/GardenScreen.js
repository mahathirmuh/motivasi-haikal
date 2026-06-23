import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { Sky } from '../world/Sky.js';
import { Sea } from '../world/Sea.js';
import { Island } from '../world/Island.js';
import { Scenery } from '../world/Scenery.js';
import { Fireflies } from '../world/Fireflies.js';
import { SeaLife } from '../world/SeaLife.js';
import { Butterflies } from '../world/Butterflies.js';
import { Weather } from '../world/Weather.js';
import { Npc } from '../world/Npc.js';
import { Pet } from '../world/Pet.js';
import { Boat } from '../world/Boat.js';
import { MOTIVATION } from '../config/dialog.js';
import { el, uiRoot } from '../utils/dom.js';
import { dampAngle } from '../utils/math.js';
import { addLights, addFog } from '../gfx/lighting.js';
import { toon } from '../gfx/toon.js';
import { addOutline } from '../gfx/outline.js';
import { Avatar } from '../entities/Avatar.js';
import { Plot } from '../entities/Plot.js';
import { HUD } from '../ui/HUD.js';
import { Particles } from '../gfx/Particles.js';
import { state } from '../core/state.js';
import { GRID, ISLAND, ISLAND2, SEA_MAX, HARVEST_COINS, HARVEST_SEED_REWARD, COLORS, DAY_LENGTH, SHOP_PRICES, plotUnlockCost } from '../config/constants.js';
import { getFlower, FLOWER_IDS } from '../config/flowers.js';
import { getPreset } from '../config/characters.js';
import { ACHIEVEMENTS } from '../config/achievements.js';
import { getUpgrade, upgradeCost } from '../config/upgrades.js';
import { mods, recomputeMods } from '../core/modifiers.js';

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
    this._fogBase = this.scene.fog.color.clone();
    this._fogMist = new THREE.Color('#a9c2cf');
    this.lights = addLights(this.scene, { shadow: true, shadowSize: 16 });
    this.sun = this.lights.sun;
    this.sky = new Sky(this.scene);
    this.sea = new Sea(this.scene);
    new Island(this.scene);
    new Island(this.scene, ISLAND2);
    this.scenery = new Scenery(this.scene);
    this._islands = [
      { x: 0, z: 0, r: ISLAND.sandR },
      { x: ISLAND2.x, z: ISLAND2.z, r: ISLAND2.sandR },
    ];
    this._orchidCd = 0;
    this._buildIsland2Decor();
    this._buildDock();
    this._escortGulls = this._buildEscortGulls();
    this._stormCd = 6;
    this.particles = new Particles(this.scene);
    this.fireflies = new Fireflies(this.scene);
    this.butterflies = new Butterflies(this.scene);
    this.seaLife = new SeaLife(this.scene);
    this.weather = new Weather(this.scene);
    this.dayTime = 0.18; // start mid-morning
    this.sky.setDayNight(this.dayTime, this.lights);
    this.fishing = { state: 'idle', timer: 0, bobber: null, baseY: 0 };
    this._drowning = false;
    this._swimming = false;

    // sailboat docked at the shore
    this.boat = new Boat(this.scene, new THREE.Vector3(4, ISLAND.seaY + 0.2, ISLAND.sandR - 1));
    this._boating = false;
    this._boatDir = new THREE.Vector3();
    this._boatTarget = null;

    // garden fairy (motivational NPC) + pet companion
    this.npc = new Npc(this.scene, new THREE.Vector3(-7, 0, -3));
    this.pet = new Pet(this.scene, new THREE.Vector3(2, 0, 7));
    this._npcMsg = 0;
    this._npcTipCd = 0;
    this._npcBubble = el('div', { class: 'npc-bubble hidden', text: MOTIVATION[0] });
    uiRoot().appendChild(this._npcBubble);
    this._npcTag = el('div', { class: 'name-tag npc-tag', text: 'Mahathir' });
    uiRoot().appendChild(this._npcTag);

    // floating name tag above the avatar
    const nm = (state.data.profile.name || '').trim() || getPreset(state.data.profile.preset).name;
    this._nameTag = el('div', { class: 'name-tag', text: nm });
    uiRoot().appendChild(this._nameTag);
    // pet's name tag
    this._petTag = el('div', { class: 'name-tag pet-tag', text: 'Intan' });
    uiRoot().appendChild(this._petTag);

    this._buildPlots();

    // avatar
    this.avatar = new Avatar(state.data.profile);
    this.avatar.root.position.set(0, 0, 6);
    this.avatar.root.rotation.y = Math.PI; // face the garden
    this.avatar._faceTarget = Math.PI;
    // solid props the avatar slides around instead of phasing through
    this.avatar.obstacles = [...this.scenery.obstacles, ...(this._island2Obstacles || [])];
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
      onAction: () => this._keyboardInteract(),
      onBuyUpgrade: (id) => this._buyUpgrade(id),
      onJump: () => this._tryJump(),
      onFish: () => this._fish(),
      onReset: () => this._resetGame(),
      onWeather: () => this._cycleWeather(),
      onUiSound: () => this.app.audio?.play('click'),
      onCompass: () => this._cycleCompass(),
    });
    this._compassModes = [
      { key: 'treasure', icon: '🧰', name: 'Harta karun' },
      { key: 'island', icon: '🏝️', name: 'Pulau seberang' },
      { key: 'home', icon: '🏡', name: 'Kebun (rumah)' },
    ];
    this._compassMode = 0;
    this._lastWeather = null;

    recomputeMods(); // apply persisted upgrades

    // track already-unlocked achievements so only NEW ones toast
    this._achUnlocked = new Set(ACHIEVEMENTS.filter((a) => this._statValue(a.metric) >= a.goal).map((a) => a.id));
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
        const plot = new Plot(index, x, z, index >= state.data.unlockedPlots);
        const saved = state.data.plots?.[index];
        if (!plot.locked && saved && saved.type) plot.plant(saved.type, saved);
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
      if (k === 'e') this._keyboardInteract();
      else if (k === ' ') this._tryJump();
      else if (k === 'f') this._fish();
      else if (k === 'h') this._cycleWeather();
      else if (k === 'escape') this._onEscape();
      else if (k === '1') this._selectSeed('rose');
      else if (k === '2') this._selectSeed('tulip');
      else if (k === '3') this._selectSeed('sunflower');
      else if (k === '4') this._selectSeed('lily');
      else if (k === '5') this._selectSeed('orchid');
      else if (k === 'b') this.hud.toggleShop();
      else if (k === 'g') this.hud.toggleAlbum();
      else if (k === 'j') this._cycleCompass();
      else if (k === 't') this.hud.toggleAch();
      else if (k === 'u') this.hud.toggleUpg();
      else if (k === 'm') this.hud.setMuted(this.app.audio?.toggleMute());
      else if (k === 'c') this._openCustomize();
    };
    this._onKeyUp = (e) => this.keys.delete(e.key.toLowerCase());
    window.addEventListener('keydown', this._onKeyDown);
    window.addEventListener('keyup', this._onKeyUp);
  }

  /** Translate held movement keys into a camera-relative direction. */
  _fillCamDir(f, s, out) {
    const fwd = this._tmpFwd.set(
      this.avatar.position.x - this.camera.position.x,
      0,
      this.avatar.position.z - this.camera.position.z
    );
    if (fwd.lengthSq() < 1e-4) fwd.set(0, 0, 1);
    fwd.normalize();
    const right = this._tmpRight.set(-fwd.z, 0, fwd.x);
    out.set(fwd.x * f + right.x * s, 0, fwd.z * f + right.z * s);
  }

  _applyKeyboard() {
    if (this._drowning || this._isFishing()) {
      this.avatar.setMoveVector(0, 0); // locked while fishing / drowning
      return;
    }
    const K = this.keys;
    let f = 0;
    let s = 0;
    if (K.has('w') || K.has('arrowup')) f += 1;
    if (K.has('s') || K.has('arrowdown')) f -= 1;
    if (K.has('a') || K.has('arrowleft')) s -= 1;
    if (K.has('d') || K.has('arrowright')) s += 1;
    // touch joystick (up on stick = forward)
    if (f === 0 && s === 0 && this.hud) {
      const j = this.hud.joy;
      if (Math.hypot(j.x, j.y) > 0.18) {
        f = -j.y;
        s = j.x;
      }
    }

    if (this._boating) {
      if (f === 0 && s === 0) {
        this._boatDir.set(0, 0, 0);
      } else {
        this._fillCamDir(f, s, this._boatDir);
        this._boatTarget = null; // keys override a click target
      }
      this.avatar.setMoveVector(0, 0);
      return;
    }

    if (f === 0 && s === 0) {
      this.avatar.setMoveVector(0, 0);
      return;
    }
    const tmp = this._tmpMove || (this._tmpMove = new THREE.Vector3());
    this._fillCamDir(f, s, tmp);
    this.avatar.setMoveVector(tmp.x, tmp.z);
  }

  /** E: board/leave the boat if near it, else act on the closest plot. */
  _keyboardInteract() {
    if (this._boating) {
      this._leaveBoat();
      return;
    }
    if (this._nearBoat()) {
      this._boardBoat();
      return;
    }
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
    if (this._drowning) return;
    if (this._isFishing()) {
      this._cancelFishing(); // a click cancels fishing instead of moving
      return;
    }
    this._setPointer(e);
    this.raycaster.setFromCamera(this.pointer, this.camera);

    // while sailing: click the sea to steer the boat there
    if (this._boating) {
      const gh = this.raycaster.intersectObject(this.pickPlane, false);
      if (gh.length) {
        const p = gh[0].point;
        const r = Math.hypot(p.x, p.z);
        if (r > SEA_MAX) {
          p.x *= SEA_MAX / r;
          p.z *= SEA_MAX / r;
        }
        this._boatTarget = new THREE.Vector3(p.x, 0, p.z);
        this._boatDir.set(0, 0, 0);
      }
      return;
    }

    // board the boat by clicking it (walk over first if far)
    if (this.boat && this.raycaster.intersectObject(this.boat.hit, false).length) {
      if (this._nearBoat()) this._boardBoat();
      else this.avatar.moveTo(this.boat.position);
      return;
    }

    if (this.npc && this.raycaster.intersectObject(this.npc.hit, false).length) {
      this._talkNpc();
      return;
    }

    const plotHits = this.raycaster.intersectObjects(this.plotMeshes, false);
    if (plotHits.length) {
      this._onPlotClicked(plotHits[0].object.userData.plot);
      return;
    }
    const groundHits = this.raycaster.intersectObject(this.pickPlane, false);
    if (groundHits.length) {
      const p = groundHits[0].point;
      const max = SEA_MAX; // generous: lets you reach the 2nd island; swim/drown guards the deep sea
      const r = Math.hypot(p.x, p.z);
      if (r > max) {
        p.x *= max / r;
        p.z *= max / r;
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

  _buyUpgrade(id) {
    const u = getUpgrade(id);
    if (!u) return;
    const level = state.data.upgrades[id] || 0;
    if (level >= u.max) return;
    const cost = upgradeCost(u, level);
    if (state.data.coins < cost) {
      this.hud.toast('Koin tidak cukup 😅');
      this.app.audio?.play('click');
      return;
    }
    state.data.coins -= cost;
    state.data.upgrades[id] = level + 1;
    state.save();
    recomputeMods();
    this.app.audio?.play('ding');
    this.hud.toast(`Upgrade ${u.name} Lv.${level + 1} ✨`);
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
    if (plot.locked) {
      this._tryUnlock(plot);
      return;
    }
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

  _tryUnlock(plot) {
    const next = state.data.unlockedPlots;
    if (plot.index !== next) {
      this.hud.toast('Buka petak terdekat dulu 🔒');
      this.app.audio?.play('click');
      return;
    }
    const cost = plotUnlockCost(plot.index);
    if (state.data.coins < cost) {
      this.hud.toast(`Perlu ${cost} 🪙 untuk buka petak`);
      this.app.audio?.play('click');
      return;
    }
    state.data.coins -= cost;
    state.data.unlockedPlots += 1;
    state.save();
    this._awardXp(15);
    plot.setLocked(false);
    this.app.audio?.play('ding');
    this._fxAtPlot(plot, null, 'plant');
    this.hud.toast(`Petak baru terbuka! −${cost} 🪙`);
    this._refreshHUD();
  }

  _actOnPlot(plot) {
    if (plot.locked) this._tryUnlock(plot);
    else if (plot.isEmpty()) this._plant(plot);
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
    this._awardXp(5);
    this.app.audio?.play('pop');
    this._fxAtPlot(plot, flower, 'plant');
    this.hud.toast(`Menanam ${flower.name} 🌱`);
    const done = state.missionEvent('plant', { type });
    this._handleCompletions(done);
    this._afterAction();
  }

  _water(plot) {
    if (!plot.water()) return;
    this._awardXp(2);
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
    const base = flower?.value || HARVEST_COINS;
    const coins = Math.round(base * (mods.coinMul || 1));
    state.addSeeds(type, HARVEST_SEED_REWARD);
    state.addCoins(coins);
    state.recordHarvest(type);
    this._awardXp(10);
    this.app.audio?.play('ding');
    this._fxAtPlot(plot, flower, 'harvest');
    this._floatCoins(plot, coins);
    this.hud.toast(`Panen ${getFlower(type).name}! +${coins} 🪙`);
    const done = [...state.missionEvent('harvest'), ...state.missionEvent('earn', { amount: coins })];
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

  _floatWorld(pos, text, color = '#8a5a1a') {
    const v = pos.clone().project(this.camera);
    const x = (v.x * 0.5 + 0.5) * window.innerWidth;
    const y = (-v.y * 0.5 + 0.5) * window.innerHeight;
    this.hud.floatText(x, y, text, color);
  }

  _floatCoins(plot, amount) {
    this._floatWorld(new THREE.Vector3(plot.position.x, 1.0, plot.position.z), `+${amount} 🪙`);
  }

  // ---------- fishing ----------
  _fish() {
    const f = this.fishing;
    if (f.state === 'bite') {
      this._catchFish();
      return;
    }
    if (f.state !== 'idle') {
      this.hud.toast('Sedang memancing... 🎣');
      return;
    }
    const r = Math.hypot(this.avatar.position.x, this.avatar.position.z);
    if (r < ISLAND.grassR - 5) {
      this.hud.toast('Jalan ke tepi pantai dulu untuk memancing 🎣');
      this.app.audio?.play('click');
      return;
    }
    this.avatar.stop(); // lock in place while fishing
    this._spawnBobber();
    f.state = 'casting';
    f.timer = 2.5 + Math.random() * 3;
    this.app.audio?.play('water');
    this.hud.toast('Memancing... tunggu ikan 🎣  (klik/Esc untuk batal)');
  }

  _isFishing() {
    return this.fishing && this.fishing.state !== 'idle';
  }

  _tryJump() {
    if (this._swimming || this._drowning || this._boating || this._isFishing()) return;
    if (this.avatar.jump()) this.app.audio?.play('jump');
  }

  _cancelFishing() {
    if (!this._isFishing()) return;
    this.app.audio?.play('click');
    this._removeBobber();
    this.fishing.state = 'idle';
    this.hud.toast('Memancing dibatalkan');
  }

  /** Smallest distance to any island's shoreline (negative = on land). */
  _nearestLandMargin() {
    let best = Infinity;
    for (const isl of this._islands) {
      const d = Math.hypot(this.avatar.position.x - isl.x, this.avatar.position.z - isl.z) - isl.r;
      if (d < best) best = d;
    }
    return best;
  }

  // ---------- water: swim near any shore, then drown if too far ----------
  _updateWater(dt) {
    const SWIM_TIME = 6;
    const SWIM_RANGE = 7; // how far from a shore you can still swim

    if (this._drowning) {
      this._drownT += dt;
      this.avatar.root.position.y = ISLAND.seaY - this._drownT * 2.5; // sink under
      this.avatar.root.rotation.y += dt * 5;
      this._bubbleT = (this._bubbleT || 0) + dt;
      if (this._bubbleT > 0.12) {
        this._bubbleT = 0;
        this.particles?.bubbles(new THREE.Vector3(this.avatar.position.x, ISLAND.seaY + 0.3, this.avatar.position.z), 4);
      }
      if (this._drownT >= 0.95) this._respawn();
      return;
    }

    const margin = this._nearestLandMargin();
    if (margin > SWIM_RANGE) {
      this._startDrown();
      return;
    }
    if (margin > 0.4) {
      // swimming — slower, floats at the surface, breath runs down
      if (!this._swimming) {
        this._swimming = true;
        this._breath = SWIM_TIME;
        this.avatar.speedMul = 0.6;
        this.app.audio?.play('water');
        this.hud.toast('Berenang! 🏊 cepat kembali ke darat');
      }
      this._breath -= dt;
      this.avatar.root.position.y = ISLAND.seaY + 0.25 + Math.sin(this.app.clock.elapsedTime * 4) * 0.06;
      this.hud.setBreath(true, Math.max(0, this._breath / SWIM_TIME));
      this._bubbleT = (this._bubbleT || 0) + dt;
      if (this._bubbleT > 0.5) {
        this._bubbleT = 0;
        this.particles?.bubbles(
          new THREE.Vector3(this.avatar.position.x, ISLAND.seaY + 0.3, this.avatar.position.z),
          2
        );
      }
      if (this._breath <= 0) this._startDrown();
    } else if (this._swimming) {
      // back on land — safe
      this._swimming = false;
      this.avatar.speedMul = 1;
      this.avatar.root.position.y = 0;
      this.hud.setBreath(false);
    }
  }

  _startDrown() {
    this._drowning = true;
    this._drownT = 0;
    this._swimming = false;
    this.avatar.speedMul = 1;
    this.avatar.stop();
    this._cancelFishing();
    this.hud.setBreath(false);
    this.app.audio?.play('water');
    this.particles?.bubbles(new THREE.Vector3(this.avatar.position.x, ISLAND.seaY + 0.3, this.avatar.position.z), 10);
    this.hud.toast('Byuur! 🌊 Kembali ke pulau...');
  }

  _respawn() {
    this._drowning = false;
    this._swimming = false;
    this.avatar.speedMul = 1;
    this.avatar.root.position.set(0, 0, 6);
    this.avatar.root.rotation.y = Math.PI;
    this.avatar._faceTarget = Math.PI;
    this.avatar.vy = 0;
    this.avatar.airY = 0;
    this.avatar.stop();
    this.hud.setBreath(false);
  }

  // ---------- boat ----------
  _nearBoat() {
    const b = this.boat.position;
    return Math.hypot(this.avatar.position.x - b.x, this.avatar.position.z - b.z) < 3.2;
  }

  _boardBoat() {
    if (this._boating || !this._nearBoat()) {
      if (!this._boating) this.hud.toast('Dekati perahu untuk naik ⛵');
      return;
    }
    this._boating = true;
    this._boatDir.set(0, 0, 0);
    this._boatTarget = null;
    this._cancelFishing();
    this.avatar.stop();
    this.avatar.speedMul = 1;
    this.app.audio?.play('water');
    this.hud.toast('Berlayar! ⛵ (E dekat pantai untuk turun)');
  }

  _leaveBoat() {
    const b = this.boat.position;
    let isl = null;
    let best = Infinity;
    for (const i of this._islands) {
      const e = Math.hypot(b.x - i.x, b.z - i.z) - i.r;
      if (e < best) {
        best = e;
        isl = i;
      }
    }
    if (best > 2.0) {
      this.hud.toast('Dekati pulau untuk turun ⛵');
      return;
    }
    this._boating = false;
    this._boatDir.set(0, 0, 0);
    // step out onto that island's edge
    const dx = b.x - isl.x;
    const dz = b.z - isl.z;
    const d = Math.hypot(dx, dz) || 1;
    const land = isl.r - 1.5;
    this.avatar.root.position.set(isl.x + (dx / d) * land, 0, isl.z + (dz / d) * land);
    this.avatar.root.position.y = 0;
    this.avatar.airY = 0;
    this.avatar.vy = 0;
    this.avatar.stop();
    this.app.audio?.play('step');
    this.hud.toast('Turun dari perahu 🏝️');
  }

  _cycleCompass() {
    this._compassMode = (this._compassMode + 1) % this._compassModes.length;
    this.app.audio?.play('click');
    this.hud.toast(`Kompas → ${this._compassModes[this._compassMode].name}`);
  }

  _compassTarget() {
    const mode = this._compassModes[this._compassMode];
    if (mode.key === 'island') return { x: ISLAND2.x, z: ISLAND2.z, icon: mode.icon };
    if (mode.key === 'home') return { x: 0, z: 0, icon: mode.icon };
    const tr = this.seaLife?.treasure;
    return { x: tr ? tr.position.x : 0, z: tr ? tr.position.z : 0, icon: mode.icon };
  }

  _updateCompass() {
    if (!this.hud) return;
    const tgt = this._compassTarget();
    const ax = this.avatar.position.x;
    const az = this.avatar.position.z;
    const dx = tgt.x - ax;
    const dz = tgt.z - az;
    const dist = Math.hypot(dx, dz);
    // camera-relative angle: 0 = target straight ahead (arrow points up)
    let fx = ax - this.camera.position.x;
    let fz = az - this.camera.position.z;
    const fl = Math.hypot(fx, fz) || 1;
    fx /= fl;
    fz /= fl;
    const localF = dx * fx + dz * fz;
    const localR = dx * -fz + dz * fx;
    this.hud.setCompass(Math.atan2(localR, localF), dist, tgt.icon);
  }

  _checkDiscovery() {
    if (state.data.discoveredIsland2) return;
    const d = Math.hypot(this.avatar.position.x - ISLAND2.x, this.avatar.position.z - ISLAND2.z);
    if (d < ISLAND2.sandR) {
      state.data.discoveredIsland2 = true;
      state.addCoins(30);
      this._awardXp(20);
      this.app.audio?.play('ding');
      this.particles?.burst(new THREE.Vector3(this.avatar.position.x, 1.4, this.avatar.position.z), ['#ffd166', '#c77dff', '#ffffff'], 24);
      this.hud.toast('🏝️ Pulau Rahasia ditemukan! +30 🪙');
      this._refreshHUD();
    }
  }

  _buildDock() {
    const dir = new THREE.Vector3(4, 0, ISLAND.sandR - 1).normalize();
    const g = new THREE.Group();
    g.position.set(dir.x * 15.5, 0, dir.z * 15.5);
    g.rotation.y = Math.atan2(dir.x, dir.z);
    this.scene.add(g);
    const T = (geo, c, t = 0.016) => {
      const m = new THREE.Mesh(geo, toon(c));
      m.receiveShadow = true;
      addOutline(m, { thickness: t });
      return m;
    };
    const deck = T(new THREE.BoxGeometry(1.5, 0.14, 6), '#8a5a2b');
    deck.position.y = 0.1;
    g.add(deck);
    for (let i = -2; i <= 2; i++) {
      const plank = T(new THREE.BoxGeometry(1.5, 0.16, 0.1), '#6f3f24', 0.008);
      plank.position.set(0, 0.11, i * 1.1);
      g.add(plank);
    }
    const H = 0.1 - (ISLAND.seaY - 0.4);
    for (const sx of [-0.62, 0.62]) {
      for (const sz of [-2.6, 0, 2.6]) {
        const post = T(new THREE.CylinderGeometry(0.1, 0.1, H, 6), '#6b4a2b', 0.01);
        post.position.set(sx, 0.1 - H / 2, sz);
        g.add(post);
      }
    }
  }

  _buildEscortGulls() {
    const gulls = [];
    const mat = new THREE.MeshBasicMaterial({ color: 0xfbfbf5, side: THREE.DoubleSide });
    const wingGeo = new THREE.PlaneGeometry(0.9, 0.28);
    for (let i = 0; i < 2; i++) {
      const g = new THREE.Group();
      const body = new THREE.Mesh(new THREE.SphereGeometry(0.18, 8, 6), mat);
      body.scale.set(1, 0.6, 1.7);
      g.add(body);
      const mk = (s) => {
        const p = new THREE.Group();
        const w = new THREE.Mesh(wingGeo, mat);
        w.rotation.x = -Math.PI / 2;
        w.position.x = s * 0.45;
        p.add(w);
        g.add(p);
        return p;
      };
      g.userData = { wingL: mk(-1), wingR: mk(1), phase: i * Math.PI };
      g.visible = false;
      this.scene.add(g);
      gulls.push(g);
    }
    return gulls;
  }

  _updateEscortGulls() {
    const t = this.app.clock.elapsedTime;
    const show = this._boating;
    for (const g of this._escortGulls) {
      g.visible = show;
      if (!show) continue;
      const u = g.userData;
      const ang = t * 0.8 + u.phase;
      const b = this.boat.position;
      g.position.set(b.x + Math.cos(ang) * 3, b.y + 3.2 + Math.sin(t * 1.5 + u.phase) * 0.3, b.z + Math.sin(ang) * 3);
      g.rotation.y = -ang + Math.PI / 2;
      const flap = Math.sin(t * 10 + u.phase) * 0.6;
      u.wingL.rotation.z = flap;
      u.wingR.rotation.z = -flap;
    }
  }

  _updateStorm(dt) {
    this._stormCd -= dt;
    if (!this._boating || this._stormCd > 0) return;
    this._stormCd = 5 + Math.random() * 9;
    if (this._nearestLandMargin() > 14 && Math.random() < 0.7) {
      this.hud.flash();
      this.app.audio?.play('thunder');
    }
  }

  _updateSeaMist() {
    if (!this.scene.fog || !this._fogBase) return;
    const margin = this._nearestLandMargin();
    const t = Math.max(0, Math.min(1, margin / 12)); // 0 near land .. 1 deep sea
    this.scene.fog.near = 45 - t * 24;
    this.scene.fog.far = 150 - t * 88;
    this.scene.fog.color.copy(this._fogBase).lerp(this._fogMist, t * 0.85);
  }

  _buildIsland2Decor() {
    const g = new THREE.Group();
    g.position.set(ISLAND2.x, 0, ISLAND2.z);
    this.scene.add(g);
    this._island2Obstacles = []; // solid props on the far island (world coords)
    const T = (geo, c, t = 0.02) => {
      const m = new THREE.Mesh(geo, toon(c));
      m.castShadow = true;
      addOutline(m, { thickness: t });
      return m;
    };
    for (const [tx, tz] of [[-2.5, 1.6], [2.3, -1.7]]) {
      const trunk = T(new THREE.CylinderGeometry(0.18, 0.24, 1.6, 8), '#7a4a2b');
      trunk.position.set(tx, 0.8, tz);
      g.add(trunk);
      const fol = T(new THREE.ConeGeometry(1.1, 2.0, 8), '#57a83f');
      fol.position.set(tx, 2.3, tz);
      g.add(fol);
      this._island2Obstacles.push({ x: ISLAND2.x + tx, z: ISLAND2.z + tz, r: 0.3 });
    }
    for (const [rx, rz] of [[1.6, 2.4], [-2.1, -2.0]]) {
      const rock = T(new THREE.DodecahedronGeometry(0.5, 0), '#b9b3a6');
      rock.position.set(rx, 0.25, rz);
      g.add(rock);
      this._island2Obstacles.push({ x: ISLAND2.x + rx, z: ISLAND2.z + rz, r: 0.4 });
    }
    // signpost
    const post = T(new THREE.CylinderGeometry(0.08, 0.08, 1.4, 6), '#6b4a2b', 0.012);
    post.position.set(0, 0.7, 3.0);
    g.add(post);
    const board = T(new THREE.BoxGeometry(1.3, 0.5, 0.1), '#a06a36', 0.014);
    board.position.set(0, 1.2, 3.0);
    g.add(board);
    const orchidIco = T(new THREE.SphereGeometry(0.12, 8, 8), '#c77dff', 0.01);
    orchidIco.position.set(0, 1.2, 3.06);
    g.add(orchidIco);
    // wild orchid bush (renewable orchid seeds)
    const bush = T(new THREE.SphereGeometry(0.6, 10, 8), '#4f8f2c');
    bush.scale.y = 0.7;
    bush.position.y = 0.4;
    g.add(bush);
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2;
      const bloom = T(new THREE.SphereGeometry(0.15, 8, 8), i % 2 ? '#e9c6ff' : '#c77dff', 0.01);
      bloom.position.set(Math.cos(a) * 0.45, 0.65 + Math.sin(a) * 0.1, Math.sin(a) * 0.45);
      g.add(bloom);
    }
    this._orchidBushPos = new THREE.Vector3(ISLAND2.x, 0, ISLAND2.z);
  }

  _checkOrchidBush(dt) {
    if (this._orchidCd > 0) this._orchidCd -= dt;
    const p = this._orchidBushPos;
    if (!p || this._boating) return;
    const dx = this.avatar.position.x - p.x;
    const dz = this.avatar.position.z - p.z;
    if (dx * dx + dz * dz < 2.2 * 2.2 && this._orchidCd <= 0) {
      this._orchidCd = 12;
      state.addSeeds('orchid', 1);
      state.save();
      this._awardXp(6);
      this.app.audio?.play('pop');
      this.particles?.burst(new THREE.Vector3(p.x, 1.0, p.z), ['#c77dff', '#e9c6ff', '#ffffff'], 12);
      this.hud.toast('Memetik anggrek liar! +1 bibit 🪻');
      this._refreshHUD();
    }
  }

  _checkTreasure() {
    const tr = this.seaLife?.treasure;
    if (!tr) return;
    const dx = this.avatar.position.x - tr.position.x;
    const dz = this.avatar.position.z - tr.position.z;
    if (dx * dx + dz * dz < 3 * 3) {
      const coins = 25 + Math.floor(Math.random() * 21); // 25..45
      state.addCoins(coins);
      this._awardXp(12);
      this.app.audio?.play('ding');
      this.particles?.burst(
        new THREE.Vector3(tr.position.x, tr.position.y + 0.8, tr.position.z),
        ['#ffd166', '#ffe48a', '#ffffff'],
        22
      );
      this._floatWorld(new THREE.Vector3(tr.position.x, tr.position.y + 1.6, tr.position.z), `+${coins} 🪙`, '#8a5a1a');
      this.hud.toast(`Harta karun! +${coins} 🪙 🧰`);
      const done = state.missionEvent('earn', { amount: coins });
      this._handleCompletions(done);
      this.seaLife.relocateTreasure();
      this._refreshHUD();
    }
  }

  _updateBoat(dt) {
    const BOAT_SPEED = 7;
    const MAX_R = SEA_MAX;
    const boat = this.boat.group;
    // move by keys or toward a clicked target
    let mx = 0;
    let mz = 0;
    if (this._boatDir.lengthSq() > 1e-4) {
      const len = Math.hypot(this._boatDir.x, this._boatDir.z);
      mx = this._boatDir.x / len;
      mz = this._boatDir.z / len;
    } else if (this._boatTarget) {
      const dx = this._boatTarget.x - boat.position.x;
      const dz = this._boatTarget.z - boat.position.z;
      const d = Math.hypot(dx, dz);
      if (d < 0.4) this._boatTarget = null;
      else {
        mx = dx / d;
        mz = dz / d;
      }
    }
    if (mx !== 0 || mz !== 0) {
      boat.position.x += mx * BOAT_SPEED * dt;
      boat.position.z += mz * BOAT_SPEED * dt;
      const heading = Math.atan2(mx, mz);
      boat.rotation.y = dampAngle(boat.rotation.y, heading, 6, dt);
    }
    // keep on the open sea
    const r = Math.hypot(boat.position.x, boat.position.z);
    if (r > MAX_R) {
      boat.position.x *= MAX_R / r;
      boat.position.z *= MAX_R / r;
    }
    boat.position.y = this.boat.baseY + Math.sin(this.app.clock.elapsedTime * 2) * 0.06;
    boat.rotation.z = Math.sin(this.app.clock.elapsedTime * 1.6) * 0.04;

    // the avatar rides the boat
    this.avatar.root.position.set(boat.position.x, boat.position.y + 0.55, boat.position.z);
    this.avatar.root.rotation.y = boat.rotation.y;
    this.avatar.airY = 0;
    this.avatar.vy = 0;
  }

  _spawnBobber() {
    const ax = this.avatar.position.x;
    const az = this.avatar.position.z;
    const len = Math.hypot(ax, az) || 1;
    const bx = ax + (ax / len) * 3.5;
    const bz = az + (az / len) * 3.5;
    const b = new THREE.Group();
    const top = new THREE.Mesh(new THREE.SphereGeometry(0.16, 10, 8), toon('#e23b2e'));
    top.scale.y = 0.7;
    addOutline(top, { thickness: 0.02 });
    const bot = new THREE.Mesh(new THREE.SphereGeometry(0.16, 10, 8), toon('#fbfbf5'));
    bot.scale.y = 0.7;
    bot.position.y = -0.12;
    b.add(top, bot);
    this.fishing.baseY = ISLAND.seaY + 0.15;
    b.position.set(bx, this.fishing.baseY, bz);
    this.scene.add(b);
    this.fishing.bobber = b;

    // face the sea while fishing
    this.avatar._faceTarget = Math.atan2(bx - this.avatar.position.x, bz - this.avatar.position.z);

    // fishing rod (held by the avatar) + line to the bobber
    this.fishRod = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.055, 1.9, 6), toon('#8a5a2b'));
    addOutline(this.fishRod, { thickness: 0.02 });
    this.scene.add(this.fishRod);
    this.fishLine = new THREE.Mesh(
      new THREE.CylinderGeometry(0.012, 0.012, 1, 5),
      new THREE.MeshBasicMaterial({ color: 0x2e2620 })
    );
    this.scene.add(this.fishLine);
  }

  _orientCyl(mesh, a, b) {
    const dir = new THREE.Vector3().subVectors(b, a);
    const len = dir.length() || 0.001;
    mesh.position.copy(a).addScaledVector(dir, 0.5);
    mesh.scale.set(1, len, 1);
    mesh.quaternion.setFromUnitVectors(this._UP || (this._UP = new THREE.Vector3(0, 1, 0)), dir.normalize());
  }

  _updateFishGear() {
    if (!this.fishing.bobber) return;
    const ax = this.avatar.position.x;
    const az = this.avatar.position.z;
    const ay = this.avatar.position.y; // accounts for jumping
    const bob = this.fishing.bobber.position;
    const horiz = new THREE.Vector3(bob.x - ax, 0, bob.z - az);
    if (horiz.lengthSq() < 1e-4) horiz.set(0, 0, 1);
    horiz.normalize();
    const side = new THREE.Vector3(horiz.z, 0, -horiz.x); // avatar's right
    // rod held up and out to the side so it reads clearly from behind
    const hand = new THREE.Vector3(ax + side.x * 0.28 + horiz.x * 0.1, ay + 1.0, az + side.z * 0.28 + horiz.z * 0.1);
    const rodDir = new THREE.Vector3(
      side.x * 0.5 + horiz.x * 0.2,
      1.0,
      side.z * 0.5 + horiz.z * 0.2
    ).normalize();
    const rodLen = 1.9;
    if (this.fishRod) {
      this.fishRod.position.copy(hand).addScaledVector(rodDir, rodLen * 0.5);
      this.fishRod.quaternion.setFromUnitVectors(
        this._UP || (this._UP = new THREE.Vector3(0, 1, 0)),
        rodDir
      );
    }
    const tip = new THREE.Vector3().copy(hand).addScaledVector(rodDir, rodLen);
    if (this.fishLine) this._orientCyl(this.fishLine, tip, bob);
  }

  _removeBobber() {
    for (const key of ['fishLine', 'fishRod']) {
      const m = this[key];
      if (m) {
        this.scene.remove(m);
        m.geometry.dispose();
        m.material.dispose();
        this[key] = null;
      }
    }
    const b = this.fishing.bobber;
    if (!b) return;
    this.scene.remove(b);
    b.traverse((o) => {
      if (o.isMesh) {
        o.geometry?.dispose?.();
        o.material?.dispose?.();
      }
    });
    this.fishing.bobber = null;
  }

  _updateFishing(dt) {
    const f = this.fishing;
    if (f.state === 'idle') return;
    const t = this.app.clock.elapsedTime;
    if (f.bobber) {
      const dip = f.state === 'bite' ? 0.18 : 0;
      f.bobber.position.y = f.baseY + Math.sin(t * 3) * (f.state === 'bite' ? 0.05 : 0.12) - dip;
      this._updateFishGear();
    }
    if (f.state === 'casting') {
      f.timer -= dt;
      if (f.timer <= 0) {
        f.state = 'bite';
        f.timer = 1.3; // reaction window
        this.app.audio?.play('pop');
        this.hud.toast('❗ Ikan menggigit! Tekan 🎣 / F lagi!');
        if (this.particles && f.bobber) {
          this.particles.burst(f.bobber.position.clone(), ['#bfe9ff', '#7fc7d8', '#ffffff'], 6);
        }
      }
    } else if (f.state === 'bite') {
      f.timer -= dt;
      if (f.timer <= 0) this._missFish();
    }
  }

  _catchFish() {
    const f = this.fishing;
    const coins = 5 + Math.floor(Math.random() * 16); // 5..20
    state.addCoins(coins);
    this._awardXp(8);
    this.app.audio?.play('ding');
    if (f.bobber) {
      this.particles?.burst(f.bobber.position.clone(), ['#5fb6c9', '#dff3f6', '#ffffff'], 16);
      this._floatWorld(f.bobber.position.clone().setY(f.baseY + 1), `+${coins} 🪙 🐟`);
    }
    this.hud.toast(`Dapat ikan! +${coins} 🪙 🐟`);
    if (Math.random() < 0.3) {
      const types = ['rose', 'tulip', 'sunflower', 'lily'];
      const tt = types[Math.floor(Math.random() * types.length)];
      state.addSeeds(tt, 1);
      this.hud.toast(`Bonus bibit ${getFlower(tt).name}! 🌱`);
    }
    const done = [...state.missionEvent('fish'), ...state.missionEvent('earn', { amount: coins })];
    this._handleCompletions(done);
    this._removeBobber();
    f.state = 'idle';
    this._afterAction();
  }

  _missFish() {
    this.hud.toast('Ikan lepas 😅');
    this.app.audio?.play('click');
    this._removeBobber();
    this.fishing.state = 'idle';
  }

  // ---------- pause / esc ----------
  _onEscape() {
    if (this._isFishing()) {
      this._cancelFishing();
      return;
    }
    if (this.hud.anyPanelOpen()) this.hud.closeAllPanels();
    else this.hud.togglePause();
  }

  _resetGame() {
    state.reset();
    recomputeMods();
    this.app.sm.go('intro');
  }

  _cycleWeather() {
    const s = this.weather.cycle();
    this.hud.setWeatherIcon(s);
    this._lastWeather = s;
    this.app.audio?.play('click');
  }

  // ---------- NPC ----------
  _talkNpc() {
    this._npcMsg = (this._npcMsg + 1) % MOTIVATION.length;
    this._npcBubble.textContent = MOTIVATION[this._npcMsg];
    this.app.audio?.play('click');
    if (this._npcTipCd <= 0) {
      this._npcTipCd = 25;
      state.addCoins(5);
      this.hud.toast('Hadiah semangat dari peri! +5 🪙');
      this._refreshHUD();
    }
  }

  _updateNameTag() {
    if (!this._nameTag) return;
    const a = this.avatar.root.position;
    const v = new THREE.Vector3(a.x, a.y + 2.05, a.z).project(this.camera);
    if (v.z < 1) {
      this._nameTag.style.left = `${(v.x * 0.5 + 0.5) * window.innerWidth}px`;
      this._nameTag.style.top = `${(-v.y * 0.5 + 0.5) * window.innerHeight}px`;
      this._nameTag.classList.remove('hidden');
    } else {
      this._nameTag.classList.add('hidden');
    }
  }

  _updatePetTag() {
    if (!this._petTag || !this.pet) return;
    const p = this.pet.group.position;
    const v = new THREE.Vector3(p.x, p.y + 0.95, p.z).project(this.camera);
    if (v.z < 1) {
      this._petTag.style.left = `${(v.x * 0.5 + 0.5) * window.innerWidth}px`;
      this._petTag.style.top = `${(-v.y * 0.5 + 0.5) * window.innerHeight}px`;
      this._petTag.classList.remove('hidden');
    } else {
      this._petTag.classList.add('hidden');
    }
  }

  _updateNpc(dt) {
    if (this._npcTipCd > 0) this._npcTipCd -= dt;
    const np = this.npc.position;
    const d = Math.hypot(this.avatar.position.x - np.x, this.avatar.position.z - np.z);
    const v = new THREE.Vector3(np.x, this.npc.headY, np.z).project(this.camera);
    const onScreen = v.z < 1;
    const x = `${(v.x * 0.5 + 0.5) * window.innerWidth}px`;
    const y = `${(-v.y * 0.5 + 0.5) * window.innerHeight}px`;
    const near = d < 5;
    // near: show the motivational bubble; otherwise just the name tag
    if (onScreen && near) {
      this._npcBubble.style.left = x;
      this._npcBubble.style.top = y;
      this._npcBubble.classList.remove('hidden');
      this._npcTag.classList.add('hidden');
    } else if (onScreen) {
      this._npcTag.style.left = x;
      this._npcTag.style.top = y;
      this._npcTag.classList.remove('hidden');
      this._npcBubble.classList.add('hidden');
    } else {
      this._npcBubble.classList.add('hidden');
      this._npcTag.classList.add('hidden');
    }
  }

  _awardXp(n) {
    const gained = state.addXp(n);
    if (gained > 0) this._onLevelUp(gained);
  }

  _onLevelUp(levels) {
    const bonus = 20 * levels;
    state.addCoins(bonus);
    this.app.audio?.play('ding');
    this.particles?.burst(
      new THREE.Vector3(this.avatar.position.x, 1.3, this.avatar.position.z),
      ['#ffd166', '#ffffff', '#ffb3d1', '#9be07a'],
      24
    );
    this._floatWorld(new THREE.Vector3(this.avatar.position.x, 2.2, this.avatar.position.z), `Lv ${state.data.level}!`, '#5a8f3a');
    this.hud.toast(`🎉 Naik ke Level ${state.data.level}! +${bonus} 🪙`);
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

  _statValue(metric) {
    const d = state.data;
    switch (metric) {
      case 'plant':
        return d.plantsPlanted || 0;
      case 'harvest':
        return d.harvests || 0;
      case 'coins':
        return d.coinsEarned || 0;
      case 'variety':
        return (d.plantedTypes || []).length;
      case 'discovered':
        return FLOWER_IDS.filter((id) => (d.bouquet[id] || 0) > 0).length;
      default:
        return 0;
    }
  }

  _stats() {
    return {
      plant: this._statValue('plant'),
      harvest: this._statValue('harvest'),
      coins: this._statValue('coins'),
      variety: this._statValue('variety'),
      discovered: this._statValue('discovered'),
    };
  }

  _checkAchievements() {
    for (const a of ACHIEVEMENTS) {
      if (!this._achUnlocked.has(a.id) && this._statValue(a.metric) >= a.goal) {
        this._achUnlocked.add(a.id);
        this.hud.notifyAchievement(a);
        this.app.audio?.play('ding');
      }
    }
  }

  _refreshHUD() {
    this.hud.setCoins(state.data.coins);
    this.hud.setLevel(state.data.level, state.data.xp, state.xpForLevel(state.data.level));
    this.hud.setInventory(state.data.seeds);
    this.hud.setSelectedSeed(state.data.selectedSeed);
    this.hud.setMissions(state.data.missions);
    this.hud.setAlbum(state.data.bouquet);
    this.hud.setAchievements(this._stats());
    this.hud.setUpgrades(state.data.upgrades);
    this.hud.setMuted(!!state.data.muted);
    this._checkAchievements();
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
    if (this._boating) {
      this._updateBoat(dt);
    } else {
      this._updateWater(dt); // swim near shore, then sink & respawn if too far
      this.boat?.bob(this.app.clock.elapsedTime);
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
    this.butterflies?.update(dt, this.app.clock.elapsedTime, 1 - this.sky.nightLevel);
    this.seaLife?.update(dt);
    this._checkTreasure();
    this._checkOrchidBush(dt);
    this._checkDiscovery();
    this._updateEscortGulls();
    this._updateStorm(dt);
    this._updateSeaMist();
    this._updateCompass();
    this.weather?.update(dt);
    if (this.weather && this.weather.state !== this._lastWeather) {
      this._lastWeather = this.weather.state;
      this.hud.setWeatherIcon(this.weather.state);
    }
    this.npc?.update(dt, this.app.clock.elapsedTime);
    this.pet?.update(dt, this.avatar.position);
    this._updateNpc(dt);
    this._updateNameTag();
    this._updatePetTag();
    this._updateFishing(dt);
    // rain or the auto-sprinkler keeps the garden watered (growth boost)
    const autoWet = this.weather?.isRaining ? 0.4 : mods.sprinkler > 0 ? 0.1 + 0.15 * mods.sprinkler : 0;
    if (autoWet > 0) {
      for (const plot of this.plots) {
        if (plot.flower && !plot.flower.isBloom) plot.flower.wet = Math.max(plot.flower.wet, autoWet);
      }
    }

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
    this._removeBobber();
    dom.style.cursor = 'default';
    this.controls?.dispose();
    // ambiance keeps playing across screens (still by the sea)
  }
}
