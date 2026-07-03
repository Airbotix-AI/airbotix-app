// Shared three.js scene plumbing for GLB previews (D-3D-09c): the interactive
// ModelPreview stage AND the grid-card thumbnail renderer use the SAME guard,
// lights, and framing so a model looks identical in both. Everything here
// imports three — only ever load this module lazily (dynamic import / React.lazy)
// so three never enters the main bundle.

import * as THREE from 'three';

/** Camera distance = model size × this, so any model fills the stage nicely. */
export const FRAME_FACTOR = 1.8;
/** Dark stage so lit + unlit models both read clearly. */
export const STAGE_BG = 0x241f33;
/** What a blocked (non-blob:/data:) GLB sub-resource URI resolves to: nothing. */
const BLOCKED_SUBRESOURCE_URL = 'data:application/octet-stream;base64,';

/**
 * A crafted GLB may reference ABSOLUTE http(s) sub-resource URIs
 * (`buffers[].uri` / `images[].uri`) that GLTFLoader would fetch at parse time —
 * from the TRUSTED app origin, that's an egress/beacon channel and live remote
 * content on a minors surface. This manager restricts resolution to the model's
 * own bytes: anything that isn't blob:/data: resolves to an empty data URL, so
 * no request ever leaves the pane.
 */
export function guardedLoadingManager(): THREE.LoadingManager {
  const manager = new THREE.LoadingManager();
  manager.setURLModifier((u) =>
    u.startsWith('blob:') || u.startsWith('data:') ? u : BLOCKED_SUBRESOURCE_URL,
  );
  return manager;
}

/** Sun + soft fill so MeshStandardMaterial models aren't black. */
export function addStageLights(scene: THREE.Scene): void {
  const sun = new THREE.DirectionalLight(0xffffff, 2.6);
  sun.position.set(3, 6, 4);
  scene.add(sun);
  scene.add(new THREE.HemisphereLight(0xffffff, 0x8888aa, 1.2));
}

/**
 * Auto-frame: centre the camera on `object` and pull it back to fit. Writes the
 * model's centre into `target` (the orbit-controls target) and returns it.
 */
export function frameCamera(
  camera: THREE.PerspectiveCamera,
  object: THREE.Object3D,
  target: THREE.Vector3,
): THREE.Vector3 {
  const box = new THREE.Box3().setFromObject(object);
  const centre = box.getCenter(new THREE.Vector3());
  const span = box.getSize(new THREE.Vector3()).length() || 1;
  target.copy(centre);
  camera.position.set(
    centre.x + span * FRAME_FACTOR * 0.5,
    centre.y + span * FRAME_FACTOR * 0.4,
    centre.z + span * FRAME_FACTOR,
  );
  camera.near = span / 100;
  camera.far = span * 100;
  camera.lookAt(centre);
  camera.updateProjectionMatrix();
  return centre;
}
