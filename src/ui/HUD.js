// Floating garden HUD (DOM overlay): coins, missions checklist, seed inventory,
// sound toggle, and a "customize character" button.
import { el, uiRoot } from '../utils/dom.js';
import { FLOWERS, FLOWER_IDS } from '../config/flowers.js';
import { SHOP_PRICES } from '../config/constants.js';
import { ACHIEVEMENTS } from '../config/achievements.js';
import { UPGRADES, upgradeCost } from '../config/upgrades.js';

export class HUD {
  constructor({ onSelectSeed, onToggleMute, onCustomize, onBuySeed, onAction, onBuyUpgrade, onJump, onFish, onReset, onWeather, onUiSound, onCompass }) {
    this.onSelectSeed = onSelectSeed || (() => {});
    this.onToggleMute = onToggleMute || (() => {});
    this.onCustomize = onCustomize || (() => {});
    this.onBuySeed = onBuySeed || (() => {});
    this.onAction = onAction || (() => {});
    this.onBuyUpgrade = onBuyUpgrade || (() => {});
    this.onJump = onJump || (() => {});
    this.onFish = onFish || (() => {});
    this.onReset = onReset || (() => {});
    this.onWeather = onWeather || (() => {});
    this.onUiSound = onUiSound || (() => {});
    this.onCompass = onCompass || (() => {});
    this._pauseOpen = false;
    this.seedSlots = {};
    this._toastTimer = null;
    this._coins = 0;
    this._seeds = {};
    this._bouquet = {};
    this._stats = {};
    this._upgrades = {};
    this._shopOpen = false;
    this._albumOpen = false;
    this._achOpen = false;
    this._upgOpen = false;
    this.joy = { x: 0, y: 0 }; // touch joystick vector
    this._build();
  }

  _build() {
    const root = uiRoot();

    // top bar
    this.coinsEl = el('span', { text: '0' });
    const coins = el('div', { class: 'hud-coins' }, [el('span', { class: 'coin', text: '🪙' }), this.coinsEl]);

    this.levelEl = el('span', { text: '1' });
    this.xpFill = el('i', {});
    const levelChip = el('div', { class: 'hud-level' }, [
      el('span', { class: 'lvl-badge' }, ['Lv ', this.levelEl]),
      el('div', { class: 'xp-bar' }, [this.xpFill]),
    ]);
    const left = el('div', { class: 'hud-left' }, [coins, levelChip]);

    const upgBtn = el(
      'button',
      { class: 'btn btn--ghost hud-icon-btn', title: 'Upgrade (U)', onClick: () => this.toggleUpg() },
      '🔧'
    );
    const achBtn = el(
      'button',
      { class: 'btn btn--ghost hud-icon-btn', title: 'Pencapaian (T)', onClick: () => this.toggleAch() },
      '🏆'
    );
    const albumBtn = el(
      'button',
      { class: 'btn btn--ghost hud-icon-btn', title: 'Album bunga (G)', onClick: () => this.toggleAlbum() },
      '🏵️'
    );
    const shopBtn = el(
      'button',
      { class: 'btn btn--ghost hud-icon-btn', title: 'Toko bibit (B)', onClick: () => this.toggleShop() },
      '🛒'
    );
    this.weatherBtn = el(
      'button',
      { class: 'btn btn--ghost hud-icon-btn', title: 'Ganti cuaca (H)', onClick: () => this.onWeather() },
      '☀️'
    );
    this.musicBtn = el(
      'button',
      { class: 'btn btn--ghost hud-icon-btn', title: 'Suara on/off (M)', onClick: () => this.onToggleMute() },
      '🔊'
    );
    const custBtn = el(
      'button',
      { class: 'btn btn--ghost hud-icon-btn', title: 'Ganti karakter (C)', onClick: () => this.onCustomize() },
      '👕'
    );
    const top = el('div', { class: 'hud-top' }, [
      left,
      el('div', { class: 'hud-top-right' }, [this.weatherBtn, upgBtn, achBtn, albumBtn, shopBtn, this.musicBtn, custBtn]),
    ]);

    // missions
    this.missionsBody = el('div', {});
    const missions = el('div', { class: 'hud-missions' }, [el('h4', { text: 'Misi 🌼' }), this.missionsBody]);

    // inventory
    this.invEl = el('div', { class: 'hud-inventory' });
    for (const id of FLOWER_IDS) {
      const f = FLOWERS[id];
      const ct = el('span', { class: 'ct', text: '0' });
      const slot = el('div', { class: 'seed-slot', title: f.name, onClick: () => this.onSelectSeed(id) }, [
        ct,
        el('span', { class: 'ico', text: f.icon }),
        el('span', { class: 'nm', text: f.name }),
      ]);
      this.seedSlots[id] = { slot, ct };
      this.invEl.appendChild(slot);
    }

    const help = el('div', {
      class: 'hud-help',
      html:
        '<b>🖱️ Mouse:</b> klik tanah = jalan · klik petak = tanam/siram/panen<br>' +
        '<b>⌨️ Keyboard:</b> <kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd>/panah = jalan · ' +
        '<kbd>Spasi</kbd> = lompat · <kbd>E</kbd> = aksi / naik perahu ⛵ · <kbd>F</kbd> = mancing · ' +
        '<kbd>1</kbd>-<kbd>5</kbd> = bibit · <kbd>B</kbd> toko · <kbd>U</kbd> upgrade · ' +
        '<kbd>H</kbd> cuaca · <kbd>M</kbd> suara · <kbd>C</kbd> kostum · <kbd>Esc</kbd> jeda' +
        '<div class="credit">By Kakak Mahathir ya Haikal ^,^</div>',
    });

    this.toastEl = el('div', { class: 'toast' });

    // shop (hidden until opened)
    this.shopBody = el('div', { class: 'shop-body' });
    this.shopCoins = el('span', {});
    const shopPanel = el('div', { class: 'shop-panel' }, [
      el('button', { class: 'shop-close', title: 'Tutup', onClick: () => this.closeShop() }, '✕'),
      el('h3', { text: '🛒 Toko Bibit' }),
      el('div', { class: 'shop-coins' }, [el('span', { class: 'coin', text: '🪙' }), this.shopCoins]),
      this.shopBody,
    ]);
    this.shopEl = el('div', { class: 'shop-modal hidden', onClick: (e) => {
      if (e.target === this.shopEl) this.closeShop();
    } }, [shopPanel]);

    // album (hidden until opened) — reuses the shop modal styling
    this.albumBody = el('div', { class: 'shop-body' });
    this.albumCount = el('span', {});
    const albumPanel = el('div', { class: 'shop-panel' }, [
      el('button', { class: 'shop-close', title: 'Tutup', onClick: () => this.closeAlbum() }, '✕'),
      el('h3', { text: '🏵️ Album Bunga' }),
      el('div', { class: 'shop-coins' }, ['Ditemukan: ', this.albumCount]),
      this.albumBody,
    ]);
    this.albumEl = el('div', { class: 'shop-modal hidden', onClick: (e) => {
      if (e.target === this.albumEl) this.closeAlbum();
    } }, [albumPanel]);

    // achievements (hidden until opened)
    this.achBody = el('div', { class: 'shop-body' });
    this.achCount = el('span', {});
    const achPanel = el('div', { class: 'shop-panel' }, [
      el('button', { class: 'shop-close', title: 'Tutup', onClick: () => this.closeAch() }, '✕'),
      el('h3', { text: '🏆 Pencapaian' }),
      el('div', { class: 'shop-coins' }, ['Terbuka: ', this.achCount]),
      this.achBody,
    ]);
    this.achEl = el('div', { class: 'shop-modal hidden', onClick: (e) => {
      if (e.target === this.achEl) this.closeAch();
    } }, [achPanel]);

    // upgrades (hidden until opened)
    this.upgBody = el('div', { class: 'shop-body' });
    this.upgCoins = el('span', {});
    const upgPanel = el('div', { class: 'shop-panel' }, [
      el('button', { class: 'shop-close', title: 'Tutup', onClick: () => this.closeUpg() }, '✕'),
      el('h3', { text: '🔧 Upgrade' }),
      el('div', { class: 'shop-coins' }, [el('span', { class: 'coin', text: '🪙' }), this.upgCoins]),
      this.upgBody,
    ]);
    this.upgEl = el('div', { class: 'shop-modal hidden', onClick: (e) => {
      if (e.target === this.upgEl) this.closeUpg();
    } }, [upgPanel]);

    // touch controls (shown on coarse-pointer devices via CSS)
    this.joyKnob = el('div', { class: 'joy-knob' });
    this.joyBase = el('div', { class: 'joy-base' }, [this.joyKnob]);
    const actionBtn = el('button', { class: 'touch-action', title: 'Aksi' }, '✿');
    const jumpBtn = el('button', { class: 'touch-btn touch-jump', title: 'Lompat' }, '⤴');
    const fishBtn = el('button', { class: 'touch-btn touch-fish', title: 'Mancing' }, '🎣');
    this.touchEl = el('div', { class: 'touch-controls' }, [this.joyBase, actionBtn, jumpBtn, fishBtn]);
    this._bindJoystick(actionBtn);
    jumpBtn.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      this.onJump();
    });
    fishBtn.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      this.onFish();
    });

    // pause / menu overlay
    const pausePanel = el('div', { class: 'shop-panel pause-panel' }, [
      el('h3', { text: '⏸️ Jeda' }),
      el('div', { class: 'pause-btns' }, [
        el('button', { class: 'btn btn--primary', onClick: () => this.closePause() }, 'Lanjutkan'),
        el('button', { class: 'btn btn--ghost', onClick: () => this.onCustomize() }, '👕 Ganti Karakter'),
        el('button', { class: 'btn btn--ghost', onClick: () => this.onToggleMute() }, '🔊 Suara on/off'),
        el(
          'button',
          {
            class: 'btn btn--ghost',
            onClick: () => {
              if (window.confirm('Reset semua progres? Tindakan ini tidak bisa dibatalkan.')) this.onReset();
            },
          },
          '↺ Reset Progres'
        ),
      ]),
    ]);
    this.pauseEl = el('div', { class: 'shop-modal hidden', onClick: (e) => {
      if (e.target === this.pauseEl) this.closePause();
    } }, [pausePanel]);

    // breath bar (shown while swimming)
    this.breathFill = el('i', {});
    this.breathEl = el('div', { class: 'breath hidden' }, [
      el('span', { class: 'breath-label', text: '🫧 Napas' }),
      el('div', { class: 'breath-bar' }, [this.breathFill]),
    ]);

    // compass (arrow + distance) — click to change target
    this.compassArrow = el('div', { class: 'compass-arrow' });
    this.compassDist = el('span', { class: 'compass-dist', text: '' });
    this.compassIco = el('span', { class: 'compass-ico', text: '🧰' });
    this.compassEl = el('div', { class: 'compass', title: 'Ganti target (J)', onClick: () => this.onCompass() }, [
      this.compassIco,
      this.compassArrow,
      this.compassDist,
    ]);

    // lightning flash overlay
    this.flashEl = el('div', { class: 'flash' });

    root.append(top, missions, this.invEl, help, this.toastEl, this.breathEl, this.compassEl, this.flashEl, this.shopEl, this.albumEl, this.achEl, this.upgEl, this.pauseEl, this.touchEl);
  }

  flash() {
    this.flashEl.classList.remove('go');
    void this.flashEl.offsetWidth; // restart the animation
    this.flashEl.classList.add('go');
  }

  setCompass(angleRad, dist, icon) {
    this.compassArrow.style.transform = `rotate(${angleRad}rad)`;
    this.compassDist.textContent = `${Math.round(dist)} m`;
    if (icon) this.compassIco.textContent = icon;
  }

  setBreath(visible, frac = 1) {
    this.breathEl.classList.toggle('hidden', !visible);
    if (visible) this.breathFill.style.width = `${Math.max(0, Math.min(100, frac * 100))}%`;
  }

  setWeatherIcon(state) {
    if (!this.weatherBtn) return;
    this.weatherBtn.textContent = state === 'rain' ? '🌧️' : state === 'rainbow' ? '🌈' : '☀️';
  }

  anyPanelOpen() {
    return this._shopOpen || this._albumOpen || this._achOpen || this._upgOpen || this._pauseOpen;
  }
  closeAllPanels() {
    this.closeShop();
    this.closeAlbum();
    this.closeAch();
    this.closeUpg();
    this.closePause();
  }
  togglePause() {
    this.onUiSound();
    this._pauseOpen ? this.closePause() : this.openPause();
  }
  openPause() {
    this._pauseOpen = true;
    this.pauseEl.classList.remove('hidden');
  }
  closePause() {
    this._pauseOpen = false;
    this.pauseEl.classList.add('hidden');
  }

  _bindJoystick(actionBtn) {
    const R = 46; // max knob travel (px)
    let active = false;
    const setFromEvent = (e) => {
      const rect = this.joyBase.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      let dx = e.clientX - cx;
      let dy = e.clientY - cy;
      const len = Math.hypot(dx, dy) || 1;
      const cl = Math.min(len, R);
      dx = (dx / len) * cl;
      dy = (dy / len) * cl;
      this.joyKnob.style.transform = `translate(${dx}px, ${dy}px)`;
      this.joy.x = dx / R;
      this.joy.y = dy / R;
    };
    const reset = () => {
      active = false;
      this.joy.x = 0;
      this.joy.y = 0;
      this.joyKnob.style.transform = 'translate(0,0)';
    };
    this.joyBase.addEventListener('pointerdown', (e) => {
      active = true;
      this.joyBase.setPointerCapture?.(e.pointerId);
      setFromEvent(e);
    });
    this.joyBase.addEventListener('pointermove', (e) => active && setFromEvent(e));
    this.joyBase.addEventListener('pointerup', reset);
    this.joyBase.addEventListener('pointercancel', reset);
    actionBtn.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      this.onAction();
    });
  }

  setCoins(n) {
    this._coins = n;
    this.coinsEl.textContent = String(n);
    if (this._shopOpen) this._renderShop();
    if (this._upgOpen) this._renderUpg();
  }

  setLevel(level, xp, need) {
    this.levelEl.textContent = String(level);
    this.xpFill.style.width = `${Math.min(100, Math.round((xp / need) * 100))}%`;
  }

  setUpgrades(upgrades) {
    this._upgrades = upgrades || {};
    if (this._upgOpen) this._renderUpg();
  }

  toggleUpg() {
    this.onUiSound();
    this._upgOpen ? this.closeUpg() : this.openUpg();
  }
  openUpg() {
    this._upgOpen = true;
    this.upgEl.classList.remove('hidden');
    this._renderUpg();
  }
  closeUpg() {
    this._upgOpen = false;
    this.upgEl.classList.add('hidden');
  }

  _renderUpg() {
    this.upgCoins.textContent = String(this._coins);
    while (this.upgBody.firstChild) this.upgBody.removeChild(this.upgBody.firstChild);
    for (const u of UPGRADES) {
      const level = this._upgrades[u.id] || 0;
      const maxed = level >= u.max;
      const cost = maxed ? 0 : upgradeCost(u, level);
      const afford = this._coins >= cost;
      const dots = '●'.repeat(level) + '○'.repeat(u.max - level);
      const buy = el(
        'button',
        {
          class: 'btn btn--ghost shop-buy' + (maxed || !afford ? ' disabled' : ''),
          onClick: () => !maxed && afford && this.onBuyUpgrade(u.id),
        },
        maxed ? 'MAX' : `${cost} 🪙`
      );
      const row = el('div', { class: 'shop-row' }, [
        el('span', { class: 'shop-ico', text: u.icon }),
        el('div', { class: 'ach-info' }, [
          el('div', { class: 'ach-name', text: `${u.name}  ${dots}` }),
          el('div', { class: 'ach-desc', text: u.desc }),
        ]),
        buy,
      ]);
      this.upgBody.appendChild(row);
    }
  }

  setInventory(seeds) {
    this._seeds = seeds;
    for (const id of FLOWER_IDS) {
      if (this.seedSlots[id]) this.seedSlots[id].ct.textContent = String(seeds[id] || 0);
    }
    if (this._shopOpen) this._renderShop();
  }

  toggleShop() {
    this.onUiSound();
    this._shopOpen ? this.closeShop() : this.openShop();
  }
  openShop() {
    this._shopOpen = true;
    this.shopEl.classList.remove('hidden');
    this._renderShop();
  }
  closeShop() {
    this._shopOpen = false;
    this.shopEl.classList.add('hidden');
  }

  _renderShop() {
    this.shopCoins.textContent = String(this._coins);
    while (this.shopBody.firstChild) this.shopBody.removeChild(this.shopBody.firstChild);
    for (const id of FLOWER_IDS) {
      const f = FLOWERS[id];
      const price = SHOP_PRICES[id] ?? 10;
      const owned = this._seeds[id] || 0;
      const afford = this._coins >= price;
      const buy = el(
        'button',
        { class: 'btn btn--ghost shop-buy' + (afford ? '' : ' disabled'), onClick: () => afford && this.onBuySeed(id) },
        `Beli · ${price} 🪙`
      );
      const row = el('div', { class: 'shop-row' }, [
        el('span', { class: 'shop-ico', text: f.icon }),
        el('span', { class: 'shop-name', text: f.name }),
        el('span', { class: 'shop-own', text: `x${owned}` }),
        buy,
      ]);
      this.shopBody.appendChild(row);
    }
  }

  setAlbum(bouquet) {
    this._bouquet = bouquet || {};
    if (this._albumOpen) this._renderAlbum();
  }

  toggleAlbum() {
    this.onUiSound();
    this._albumOpen ? this.closeAlbum() : this.openAlbum();
  }
  openAlbum() {
    this._albumOpen = true;
    this.albumEl.classList.remove('hidden');
    this._renderAlbum();
  }
  closeAlbum() {
    this._albumOpen = false;
    this.albumEl.classList.add('hidden');
  }

  _renderAlbum() {
    const discovered = FLOWER_IDS.filter((id) => (this._bouquet[id] || 0) > 0).length;
    this.albumCount.textContent = `${discovered}/${FLOWER_IDS.length}`;
    while (this.albumBody.firstChild) this.albumBody.removeChild(this.albumBody.firstChild);
    for (const id of FLOWER_IDS) {
      const f = FLOWERS[id];
      const n = this._bouquet[id] || 0;
      const found = n > 0;
      const row = el('div', { class: 'shop-row' + (found ? '' : ' locked') }, [
        el('span', { class: 'shop-ico', text: found ? f.icon : '❔' }),
        el('span', { class: 'shop-name', text: found ? f.name : '???' }),
        el('span', { class: 'shop-own', text: found ? `dipanen x${n}` : 'belum ditemukan' }),
      ]);
      this.albumBody.appendChild(row);
    }
  }

  setAchievements(stats) {
    this._stats = stats || {};
    if (this._achOpen) this._renderAch();
  }

  toggleAch() {
    this.onUiSound();
    this._achOpen ? this.closeAch() : this.openAch();
  }
  openAch() {
    this._achOpen = true;
    this.achEl.classList.remove('hidden');
    this._renderAch();
  }
  closeAch() {
    this._achOpen = false;
    this.achEl.classList.add('hidden');
  }

  _renderAch() {
    const unlocked = ACHIEVEMENTS.filter((a) => (this._stats[a.metric] || 0) >= a.goal).length;
    this.achCount.textContent = `${unlocked}/${ACHIEVEMENTS.length}`;
    while (this.achBody.firstChild) this.achBody.removeChild(this.achBody.firstChild);
    for (const a of ACHIEVEMENTS) {
      const cur = Math.min(this._stats[a.metric] || 0, a.goal);
      const done = cur >= a.goal;
      const row = el('div', { class: 'ach-row' + (done ? ' done' : '') }, [
        el('span', { class: 'shop-ico', text: done ? a.icon : '🔒' }),
        el('div', { class: 'ach-info' }, [
          el('div', { class: 'ach-name', text: a.name }),
          el('div', { class: 'ach-desc', text: a.desc }),
        ]),
        el('span', { class: 'shop-own', text: done ? '✓' : `${cur}/${a.goal}` }),
      ]);
      this.achBody.appendChild(row);
    }
  }

  /** Called by the garden when a new achievement unlocks. */
  notifyAchievement(a) {
    this.toast(`🏆 ${a.name}!`);
  }

  setSelectedSeed(type) {
    for (const id of FLOWER_IDS) {
      this.seedSlots[id]?.slot.classList.toggle('is-active', id === type);
    }
  }

  setMissions(missions) {
    while (this.missionsBody.firstChild) this.missionsBody.removeChild(this.missionsBody.firstChild);
    for (const m of missions) {
      const row = el('div', { class: 'mission' + (m.done ? ' done' : '') }, [
        el('span', { class: 'box', text: m.done ? '✓' : '' }),
        el('span', { class: 'label', text: m.text }),
        el('span', { class: 'prog', text: `${Math.min(m.progress, m.target)}/${m.target}` }),
      ]);
      this.missionsBody.appendChild(row);
    }
  }

  /** Floating "+12 🪙"-style number at a screen position; rises and fades. */
  floatText(x, y, text, color = '#8a5a1a') {
    const node = el('div', { class: 'float-num', text });
    node.style.left = `${x}px`;
    node.style.top = `${y}px`;
    node.style.color = color;
    uiRoot().appendChild(node);
    // force reflow then animate
    requestAnimationFrame(() => node.classList.add('go'));
    setTimeout(() => node.remove(), 1200);
  }

  setMuted(muted) {
    this.musicBtn.textContent = muted ? '🔇' : '🔊';
  }

  toast(msg) {
    this.toastEl.textContent = msg;
    this.toastEl.classList.add('show');
    if (this._toastTimer) clearTimeout(this._toastTimer);
    this._toastTimer = setTimeout(() => this.toastEl.classList.remove('show'), 1900);
  }
}
