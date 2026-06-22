// Global gameplay modifiers derived from upgrades. Mutated by the garden when
// upgrades change; read by Flower (growth) and harvest logic (coins).
import { state } from './state.js';

export const mods = {
  growthMul: 1, // flower growth speed multiplier
  coinMul: 1, // harvest coin multiplier
  sprinkler: 0, // 0 = off; >0 auto-waters the garden
};

export function recomputeMods() {
  const u = state.data.upgrades || {};
  mods.growthMul = 1 + (u.growth || 0) * 0.12;
  mods.coinMul = 1 + (u.coin || 0) * 0.25;
  mods.sprinkler = u.sprinkler || 0;
  return mods;
}
