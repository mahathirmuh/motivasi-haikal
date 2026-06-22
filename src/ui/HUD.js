// Floating garden HUD (DOM overlay): coins, missions checklist, seed inventory,
// sound toggle, and a "customize character" button.
import { el, uiRoot } from '../utils/dom.js';
import { FLOWERS, FLOWER_IDS } from '../config/flowers.js';
import { SHOP_PRICES } from '../config/constants.js';

export class HUD {
  constructor({ onSelectSeed, onToggleMute, onCustomize, onBuySeed }) {
    this.onSelectSeed = onSelectSeed || (() => {});
    this.onToggleMute = onToggleMute || (() => {});
    this.onCustomize = onCustomize || (() => {});
    this.onBuySeed = onBuySeed || (() => {});
    this.seedSlots = {};
    this._toastTimer = null;
    this._coins = 0;
    this._seeds = {};
    this._bouquet = {};
    this._shopOpen = false;
    this._albumOpen = false;
    this._build();
  }

  _build() {
    const root = uiRoot();

    // top bar
    this.coinsEl = el('span', { text: '0' });
    const coins = el('div', { class: 'hud-coins' }, [el('span', { class: 'coin', text: '🪙' }), this.coinsEl]);

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
      coins,
      el('div', { class: 'hud-top-right' }, [albumBtn, shopBtn, this.musicBtn, custBtn]),
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
        '<kbd>E</kbd>/<kbd>Spasi</kbd> = aksi · <kbd>1</kbd>-<kbd>4</kbd> = bibit · ' +
        '<kbd>B</kbd> = toko · <kbd>M</kbd> = suara · <kbd>C</kbd> = kostum' +
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

    root.append(top, missions, this.invEl, help, this.toastEl, this.shopEl, this.albumEl);
  }

  setCoins(n) {
    this._coins = n;
    this.coinsEl.textContent = String(n);
    if (this._shopOpen) this._renderShop();
  }

  setInventory(seeds) {
    this._seeds = seeds;
    for (const id of FLOWER_IDS) {
      if (this.seedSlots[id]) this.seedSlots[id].ct.textContent = String(seeds[id] || 0);
    }
    if (this._shopOpen) this._renderShop();
  }

  toggleShop() {
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
