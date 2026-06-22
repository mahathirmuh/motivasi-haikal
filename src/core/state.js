// Game state singleton — profile + progress, persisted to localStorage.
import { SAVE_KEY, MISSION_COUNT } from '../config/constants.js';
import { DEFAULT_PROFILE } from '../config/characters.js';
import { generateMissions, generateMission } from '../config/missions.js';

function freshState() {
  return {
    profile: { ...DEFAULT_PROFILE },
    coins: 0,
    seeds: { rose: 5, tulip: 3, sunflower: 3, lily: 2 },
    bouquet: { rose: 0, tulip: 0, sunflower: 0, lily: 0 },
    selectedSeed: 'rose',
    muted: false,
    // stats
    plantsPlanted: 0,
    harvests: 0,
    coinsEarned: 0, // cumulative (never decreases when spending)
    plantedTypes: [],
    // dynamic, rotating missions (array of mission objects)
    missions: generateMissions(MISSION_COUNT),
    // serialized garden: { [plotIndex]: {type, stage, progress, wet} }
    plots: {},
  };
}

class GameState {
  constructor() {
    this.data = freshState();
  }

  load() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        const base = freshState();
        this.data = { ...base, ...parsed };
        this.data.profile = { ...DEFAULT_PROFILE, ...(parsed.profile || {}) };
        this.data.seeds = { ...base.seeds, ...(parsed.seeds || {}) };
        this.data.bouquet = { ...base.bouquet, ...(parsed.bouquet || {}) };
        if (!Array.isArray(parsed.missions) || parsed.missions.length === 0) {
          this.data.missions = generateMissions(MISSION_COUNT);
        }
      }
    } catch (err) {
      console.warn('[state] failed to load save, starting fresh:', err);
      this.data = freshState();
    }
    return this;
  }

  save() {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(this.data));
    } catch (err) {
      console.warn('[state] save failed:', err);
    }
  }

  reset() {
    this.data = freshState();
    this.save();
  }

  // ----- profile -----
  setProfile(p) {
    this.data.profile = { ...this.data.profile, ...p };
    this.save();
  }

  // ----- economy -----
  addCoins(n) {
    this.data.coins += n;
    if (n > 0) this.data.coinsEarned = (this.data.coinsEarned || 0) + n;
    this.save();
  }
  addSeeds(type, n) {
    this.data.seeds[type] = (this.data.seeds[type] || 0) + n;
  }

  // ----- stats -----
  recordPlant(type) {
    this.data.plantsPlanted += 1;
    if (!this.data.plantedTypes.includes(type)) this.data.plantedTypes.push(type);
  }
  recordHarvest(type) {
    this.data.harvests += 1;
    this.data.bouquet[type] = (this.data.bouquet[type] || 0) + 1;
  }

  // ----- dynamic missions -----
  /** Advance any active mission matching `kind`; returns the ones that just completed. */
  missionEvent(kind, payload = {}) {
    const completed = [];
    for (const m of this.data.missions) {
      if (m.done) continue;
      let inc = 0;
      if (kind === 'plant' && m.type === 'plant') inc = 1;
      else if (kind === 'plant' && m.type === 'plantType' && m.flower === payload.type) inc = 1;
      else if (kind === 'harvest' && m.type === 'harvest') inc = 1;
      else if (kind === 'water' && m.type === 'water') inc = 1;
      else if (kind === 'earn' && m.type === 'earn') inc = payload.amount || 0;
      if (inc > 0) {
        m.progress = Math.min(m.target, m.progress + inc);
        if (m.progress >= m.target) {
          m.done = true;
          completed.push(m);
        }
      }
    }
    if (completed.length) this.save();
    return completed;
  }

  /** Drop completed missions and top back up to MISSION_COUNT with new ones. */
  replaceCompleted() {
    this.data.missions = this.data.missions.filter((m) => !m.done);
    while (this.data.missions.length < MISSION_COUNT) {
      this.data.missions.push(generateMission(this.data.missions.map((m) => m.text)));
    }
    this.save();
  }
}

export const state = new GameState();
