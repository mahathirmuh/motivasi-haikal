// Audio via Howler.js. SFX + music are synthesized as WAV data URIs (see synth.js)
// so no external audio files are required.
import { Howl, Howler } from 'howler';
import { state } from '../core/state.js';
import { sfxClick, sfxStep, sfxWater, sfxDing, sfxPop, musicLoop, ambianceLoop } from './synth.js';

export class AudioManager {
  constructor() {
    this.ready = false;
    this.musicOn = false;
    this.ambianceOn = false;
    this.sfx = {};
    this.music = null;
    this.ambiance = null;
    this._lastStep = 0;
  }

  /** Build Howl instances. Call once, ideally after a user gesture. */
  init() {
    if (this.ready) return;
    Howler.volume(0.9);
    const mk = (uri, vol) => new Howl({ src: [uri], format: ['wav'], volume: vol });
    this.sfx = {
      click: mk(sfxClick(), 0.4),
      step: mk(sfxStep(), 0.35),
      water: mk(sfxWater(), 0.6),
      ding: mk(sfxDing(), 0.5),
      pop: mk(sfxPop(), 0.5),
    };
    this.music = new Howl({ src: [musicLoop()], format: ['wav'], loop: true, volume: 0.34 });
    this.ambiance = new Howl({ src: [ambianceLoop()], format: ['wav'], loop: true, volume: 0.7 });
    this.ready = true;
    Howler.mute(!!state.data.muted);
  }

  play(name) {
    if (!this.ready || state.data.muted) return;
    const s = this.sfx[name];
    if (s) s.play();
  }

  /** Footstep with built-in throttle (call freely from the move loop). */
  footstep(now) {
    if (now - this._lastStep > 0.34) {
      this._lastStep = now;
      this.play('step');
    }
  }

  startMusic() {
    if (!this.ready) return;
    if (!this.musicOn) {
      this.music.play();
      this.musicOn = true;
    }
  }

  stopMusic() {
    if (this.music && this.musicOn) {
      this.music.stop();
      this.musicOn = false;
    }
  }

  startAmbiance() {
    if (!this.ready) return;
    if (!this.ambianceOn) {
      this.ambiance.play();
      this.ambianceOn = true;
    }
  }

  stopAmbiance() {
    if (this.ambiance && this.ambianceOn) {
      this.ambiance.stop();
      this.ambianceOn = false;
    }
  }

  /** Start the seaside soundscape (waves + gentle music). */
  startGarden() {
    this.startAmbiance();
    this.startMusic();
  }

  stopGarden() {
    this.stopAmbiance();
    this.stopMusic();
  }

  /** Toggle the global mute (affects sfx + music). Returns the new muted state. */
  toggleMute() {
    const muted = !state.data.muted;
    state.data.muted = muted;
    state.save();
    Howler.mute(muted);
    return muted;
  }

  get muted() {
    return !!state.data.muted;
  }
}
