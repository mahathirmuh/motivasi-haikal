import './style.css';
import { App } from './core/App.js';
import { AudioManager } from './audio/AudioManager.js';
import { state } from './core/state.js';
import { IntroScreen } from './screens/IntroScreen.js';
import { CharacterSelectScreen } from './screens/CharacterSelectScreen.js';
import { LoadingScreen } from './screens/LoadingScreen.js';
import { GardenScreen } from './screens/GardenScreen.js';

// load saved profile + progress
state.load();

const canvas = document.getElementById('scene');
const app = new App(canvas);
app.audio = new AudioManager();

app.sm
  .register('intro', IntroScreen)
  .register('character-select', CharacterSelectScreen)
  .register('loading', LoadingScreen)
  .register('garden', GardenScreen);

app.start();
app.sm.go('intro');

// expose for debugging in the console
window.__flowerGarden = { app, state };
