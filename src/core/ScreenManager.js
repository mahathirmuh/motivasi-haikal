// Minimal screen state-machine. Each screen is a class with:
//   constructor(app)
//   async enter(params)   -> build scene/camera, mount UI
//   exit()                -> dispose + unmount UI
//   update(dt, elapsed)   -> per-frame
//   .scene, .camera       -> what App renders
import { clearUI } from '../utils/dom.js';

export class ScreenManager {
  constructor(app) {
    this.app = app;
    this.registry = new Map();
    this.current = null;
    this.currentName = null;
    this._transitioning = false;
  }

  register(name, ScreenClass) {
    this.registry.set(name, ScreenClass);
    return this;
  }

  async go(name, params = {}) {
    if (this._transitioning) return;
    const ScreenClass = this.registry.get(name);
    if (!ScreenClass) {
      console.error(`[ScreenManager] unknown screen: ${name}`);
      return;
    }
    this._transitioning = true;

    if (this.current) {
      try {
        this.current.exit?.();
      } catch (err) {
        console.error('[ScreenManager] exit error:', err);
      }
    }
    clearUI();

    const screen = new ScreenClass(this.app);
    this.current = screen;
    this.currentName = name;
    try {
      await screen.enter?.(params);
    } catch (err) {
      console.error(`[ScreenManager] enter error for "${name}":`, err);
    }
    this._transitioning = false;
  }

  update(dt, elapsed) {
    if (this.current && this.current.scene && this.current.camera) {
      this.current.update?.(dt, elapsed);
    }
  }

  resize(w, h) {
    const cam = this.current?.camera;
    if (cam && cam.isPerspectiveCamera) {
      cam.aspect = w / h;
      cam.updateProjectionMatrix();
    }
    this.current?.onResize?.(w, h);
  }
}
