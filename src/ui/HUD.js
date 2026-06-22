// Floating garden HUD (DOM overlay): coins, missions checklist, seed inventory,
// sound toggle, and a "customize character" button.
import { el, uiRoot } from '../utils/dom.js';
import { FLOWERS, FLOWER_IDS } from '../config/flowers.js';

export class HUD {
  constructor({ onSelectSeed, onToggleMute, onCustomize }) {
    this.onSelectSeed = onSelectSeed || (() => {});
    this.onToggleMute = onToggleMute || (() => {});
    this.onCustomize = onCustomize || (() => {});
    this.seedSlots = {};
    this._toastTimer = null;
    this._build();
  }

  _build() {
    const root = uiRoot();

    // top bar
    this.coinsEl = el('span', { text: '0' });
    const coins = el('div', { class: 'hud-coins' }, [el('span', { class: 'coin', text: '🪙' }), this.coinsEl]);

    this.musicBtn = el(
      'button',
      { class: 'btn btn--ghost hud-icon-btn', title: 'Suara on/off', onClick: () => this.onToggleMute() },
      '🔊'
    );
    const custBtn = el(
      'button',
      { class: 'btn btn--ghost hud-icon-btn', title: 'Ganti karakter', onClick: () => this.onCustomize() },
      '👕'
    );
    const top = el('div', { class: 'hud-top' }, [coins, el('div', { class: 'hud-top-right' }, [this.musicBtn, custBtn])]);

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
        '<kbd>E</kbd>/<kbd>Spasi</kbd> = aksi · <kbd>1</kbd><kbd>2</kbd><kbd>3</kbd> = bibit · ' +
        '<kbd>M</kbd> = suara · <kbd>C</kbd> = kostum' +
        '<div class="credit">By Kakak Mahathir ya Haikal ^,^</div>',
    });

    this.toastEl = el('div', { class: 'toast' });

    root.append(top, missions, this.invEl, help, this.toastEl);
  }

  setCoins(n) {
    this.coinsEl.textContent = String(n);
  }

  setInventory(seeds) {
    for (const id of FLOWER_IDS) {
      if (this.seedSlots[id]) this.seedSlots[id].ct.textContent = String(seeds[id] || 0);
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
