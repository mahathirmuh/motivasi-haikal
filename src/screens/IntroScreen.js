import * as THREE from 'three';
import { FontLoader } from 'three/addons/loaders/FontLoader.js';
import { TextGeometry } from 'three/addons/geometries/TextGeometry.js';
import { Sky } from '../world/Sky.js';
import { Sea } from '../world/Sea.js';
import { Island } from '../world/Island.js';
import { Scenery } from '../world/Scenery.js';
import { addLights, addFog } from '../gfx/lighting.js';
import { toon } from '../gfx/toon.js';
import { addOutline } from '../gfx/outline.js';
import { el, mountUI } from '../utils/dom.js';
import { assetUrl } from '../utils/math.js';
import { COLORS } from '../config/constants.js';

export class IntroScreen {
  constructor(app) {
    this.app = app;
  }

  async enter() {
    this.scene = new THREE.Scene();
    this.scene.background = COLORS.skyHorizon.clone();
    this.camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 1000);

    addFog(this.scene, 50, 160);
    addLights(this.scene, { shadow: false });
    this.sky = new Sky(this.scene);
    this.sea = new Sea(this.scene);
    new Island(this.scene);
    this.scenery = new Scenery(this.scene);

    this.angle = 0;
    this.fallbackTitle = false;
    await this._buildTitle();
    this._buildUI();

    // Browsers block audio before a user gesture, so start music + sea ambiance
    // on the first interaction anywhere on the intro (click/tap/key).
    this._audioStarted = false;
    this._startAudioOnce = () => {
      if (this._audioStarted) return;
      this._audioStarted = true;
      this.app.audio?.init();
      this.app.audio?.startMusic();
      this.app.audio?.startAmbiance();
      this._soundHint?.remove();
    };
    window.addEventListener('pointerdown', this._startAudioOnce);
    window.addEventListener('keydown', this._startAudioOnce);
  }

  async _buildTitle() {
    let font = null;
    try {
      font = await new Promise((resolve, reject) => {
        new FontLoader().load(assetUrl('assets/fonts/helvetiker_bold.typeface.json'), resolve, undefined, reject);
      });
    } catch (err) {
      console.warn('[intro] 3D font unavailable, using DOM title:', err?.message || err);
    }

    if (!font) {
      this.fallbackTitle = true;
      return;
    }

    const make = (txt) => {
      const g = new TextGeometry(txt, {
        font,
        size: 2.1,
        depth: 0.35,
        curveSegments: 5,
        bevelEnabled: true,
        bevelThickness: 0.06,
        bevelSize: 0.05,
        bevelSegments: 2,
      });
      g.center();
      return g;
    };

    this.title = new THREE.Group();
    const m1 = new THREE.Mesh(make('FLOWER'), toon('#ff9eb6'));
    m1.position.y = 1.5;
    addOutline(m1, { thickness: 0.05 });
    const m2 = new THREE.Mesh(make('GARDEN'), toon('#ffd98a'));
    m2.position.y = -1.4;
    addOutline(m2, { thickness: 0.05 });
    this.title.add(m1, m2);
    this.title.position.set(0, 8, 0);
    this.scene.add(this.title);
  }

  _buildUI() {
    const kids = [];
    if (this.fallbackTitle) {
      kids.push(el('div', { class: 'intro-title-fallback', html: 'FLOWER<br>GARDEN' }));
    }
    const begin = el('button', { class: 'btn btn--primary', onClick: () => this._begin() }, 'BEGIN');
    this._soundHint = el('div', { class: 'intro-hint', text: '🔊 klik di mana saja untuk musik' });
    const bottom = el('div', { class: 'intro-bottom' }, [
      el('div', { class: 'intro-hint', text: '🌊  by the Sea  ·  berkebun di tepi laut' }),
      begin,
      this._soundHint,
      el('div', { class: 'intro-credit', text: 'By Kakak Mahathir ya Haikal ^,^' }),
    ]);
    mountUI(el('div', { class: 'screen' }, [...kids, bottom]));
  }

  _begin() {
    this._startAudioOnce?.();
    this.app.audio?.play('click');
    this.app.sm.go('character-select');
  }

  update(dt) {
    this.angle += dt * 0.12;
    const R = 27;
    const H = 11;
    this.camera.position.set(Math.cos(this.angle) * R, H, Math.sin(this.angle) * R);
    this.camera.lookAt(0, 6.5, 0);

    this.sky?.update(dt);
    this.sea?.update(dt);
    this.scenery?.update(dt, this.app.clock.elapsedTime);

    if (this.title) {
      // keep the title facing the orbiting camera (yaw only)
      this.title.rotation.y = Math.atan2(this.camera.position.x, this.camera.position.z);
      this.title.position.y = 8 + Math.sin(this.app.clock.elapsedTime * 0.8) * 0.25;
    }
  }

  exit() {
    window.removeEventListener('pointerdown', this._startAudioOnce);
    window.removeEventListener('keydown', this._startAudioOnce);
    // music + ambiance keep playing across screens
  }
}
