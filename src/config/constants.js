// Central tuning + palette. Keep gameplay numbers here so balancing is easy.
import * as THREE from 'three';

export const COLORS = {
  skyTop: new THREE.Color('#8fd2ef'),
  skyHorizon: new THREE.Color('#ffe6c4'),
  fog: new THREE.Color('#ffe9cf'),
  grass: '#86c95a',
  grassDark: '#5fa83a',
  soil: '#7a5333',
  soilDark: '#5e3f25',
  soilWet: '#4f3320',
  trunk: '#7a4a2b',
  leaf: '#5fb23c',
  leafDark: '#3f8f2c',
  rock: '#b9b3a6',
  rockDark: '#8c8579',
  cloud: '#fffdf7',
  outline: '#3a2f25',
  // beach / sea
  sand: '#f4e1b0', // sandy beige
  sandDark: '#e6cd95',
  cliff: '#caa777',
  seaDeep: '#2f8fb0',
  seaShallow: '#67c9d6',
  seaFoam: '#f4ffff',
  palmTrunk: '#9c7142',
  palmLeaf: '#57a83f',
  gull: '#fbfbf5',
};

// Procedural-toon: how many shading bands. 3 = classic flat cel look.
export const TOON_STEPS = 4;

// World / garden layout
export const GRID = {
  cols: 4,
  rows: 4,
  tile: 2.2, // world units per plot tile
  gap: 0.12,
};

// Seaside island the garden sits on. Grass plateau, ringed by sand + a short
// cliff, surrounded by the animated sea.
export const ISLAND = {
  grassR: 15, // grass plateau radius
  sandR: 18, // outer sand-ring radius (grass -> sand transition near grassR)
  cliffBottom: -3.2, // y where the cliff skirt ends underwater
  seaY: -0.55, // sea surface height (cliff rises a little above water)
  walkR: 13.5, // avatar can't walk past this (stays on grass/sand)
};

// Avatar movement
export const AVATAR = {
  speed: 4.2, // units / second
  turnSpeed: 10, // rad / second lerp factor
  arriveDist: 0.12,
};

// Flower growth (seconds per stage at normal speed)
export const GROWTH = {
  seedToSprout: 9,
  sproutToBloom: 12,
  waterBoost: 3.0, // growth multiplier while "wet"
  waterDuration: 5, // seconds the boost lasts per watering
};

export const STAGES = { SEED: 0, SPROUT: 1, BLOOM: 2 };
export const STAGE_NAMES = ['seed', 'sprout', 'bloom'];

// Economy
export const HARVEST_COINS = 12;
export const HARVEST_SEED_REWARD = 1; // bonus seeds returned on harvest

// Seed shop prices (coins per seed).
export const SHOP_PRICES = { rose: 8, tulip: 10, sunflower: 12, lily: 18 };

// Dynamic missions: how many are active at once.
export const MISSION_COUNT = 4;

// Day/night cycle length in seconds (full sunrise -> day -> sunset -> night).
export const DAY_LENGTH = 140;

// bumped to v2: dynamic-mission save shape + lily seeds
export const SAVE_KEY = 'flowerGarden.save.v2';
