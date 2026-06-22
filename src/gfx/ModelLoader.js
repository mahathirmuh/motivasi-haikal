// GLTF + DRACO loading, ready for when you swap procedural placeholders for
// real .glb avatars/props. Not required for the procedural build to run.
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';

let _loader = null;

export function getLoader() {
  if (_loader) return _loader;
  const draco = new DRACOLoader();
  // Decoder is pulled from Google's CDN only when a Draco-compressed model is
  // actually loaded. To go fully offline, copy three's draco decoder into
  // /public/draco and call setDecoderPath('/draco/').
  draco.setDecoderPath('https://www.gstatic.com/draco/v1/decoders/');
  const gltf = new GLTFLoader();
  gltf.setDRACOLoader(draco);
  _loader = gltf;
  return _loader;
}

export function loadGLB(url) {
  return new Promise((resolve, reject) => {
    getLoader().load(url, (g) => resolve(g), undefined, reject);
  });
}
