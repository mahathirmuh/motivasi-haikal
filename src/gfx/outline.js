// Inverted-hull outlines for the cel-shaded look.
//
// We render a back-face copy of the geometry, pushed outward along the view-space
// normal. Added as a CHILD of the source mesh so it inherits all transforms.
import * as THREE from 'three';
import { COLORS } from '../config/constants.js';

const VERT = /* glsl */ `
  uniform float thickness;
  void main() {
    vec3 n = normalize(normalMatrix * normal);
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    mv.xyz += n * thickness;
    gl_Position = projectionMatrix * mv;
  }
`;

const FRAG = /* glsl */ `
  uniform vec3 color;
  void main() {
    gl_FragColor = vec4(color, 1.0);
  }
`;

/**
 * Add an outline to `mesh`. Returns the outline mesh.
 * @param {THREE.Mesh} mesh
 * @param {{thickness?:number, color?:any}} opts
 */
export function addOutline(mesh, opts = {}) {
  const thickness = opts.thickness ?? 0.025;
  const color = new THREE.Color(opts.color ?? COLORS.outline);
  const mat = new THREE.ShaderMaterial({
    uniforms: {
      thickness: { value: thickness },
      color: { value: color },
    },
    vertexShader: VERT,
    fragmentShader: FRAG,
    side: THREE.BackSide,
  });
  const outline = new THREE.Mesh(mesh.geometry, mat);
  outline.userData.isOutline = true;
  outline.castShadow = false;
  outline.receiveShadow = false;
  outline.raycast = () => {}; // never block picking
  mesh.add(outline);
  return outline;
}

/** Convenience: outline every Mesh under `root` (skips existing outlines). */
export function outlineGroup(root, opts = {}) {
  const targets = [];
  root.traverse((o) => {
    if (o.isMesh && !o.userData.isOutline) targets.push(o);
  });
  for (const m of targets) addOutline(m, opts);
  return root;
}
