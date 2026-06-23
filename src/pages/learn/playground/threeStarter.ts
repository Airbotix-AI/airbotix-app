// Seed 3D game for the playground — the three.js sibling of `starterGame.ts`
// (learn-game-studio-3d-prd.md D-3D-06c, the `three_spin` template). A lit,
// orbit-able spinning cube on a disc. It follows the three runtime contract
// (CLAUDE.md "Control channel"): `THREE` is a global, mount into `#game`, create a
// WebGLRenderer with `preserveDrawingBuffer:true` (so snapshots work), drive your
// own requestAnimationFrame loop, and publish `window.__game = { renderer, pause,
// resume }` so the studio's control channel can pause/snapshot and read FPS.
// References no external assets, so it runs as-is in the opaque-origin sandbox.

import type { VfsFile } from '../code/codeApi';

const STARTER_GAME_3D_PATH = 'main.js';

const STARTER_GAME_3D_JS = `
const mount = document.getElementById('game');

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0f172a);

const camera = new THREE.PerspectiveCamera(60, mount.clientWidth / mount.clientHeight, 0.1, 100);
camera.position.set(3, 2.6, 4.2);
camera.lookAt(0, 0, 0);

// preserveDrawingBuffer lets the studio snapshot the WebGL canvas for thumbnails.
const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(window.devicePixelRatio || 1);
renderer.setSize(mount.clientWidth, mount.clientHeight);
mount.appendChild(renderer.domElement);

// Lights: a warm key + cool ambient.
const key = new THREE.DirectionalLight(0xffffff, 2.4);
key.position.set(5, 8, 6);
scene.add(key);
scene.add(new THREE.AmbientLight(0x88aaff, 0.7));

// The hero: a spinning rounded-ish cube.
const cube = new THREE.Mesh(
  new THREE.BoxGeometry(1.6, 1.6, 1.6),
  new THREE.MeshStandardMaterial({ color: 0x6ee7b7, roughness: 0.35, metalness: 0.1 })
);
scene.add(cube);

// A disc it sits on.
const ground = new THREE.Mesh(
  new THREE.CircleGeometry(4, 48),
  new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 1 })
);
ground.rotation.x = -Math.PI / 2;
ground.position.y = -1.5;
scene.add(ground);

// Drag to orbit (OrbitControls is bundled into the THREE global).
let controls = null;
if (THREE.OrbitControls) {
  controls = new THREE.OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.target.set(0, 0, 0);
}

function resize() {
  const w = mount.clientWidth, h = mount.clientHeight;
  if (!w || !h) return;
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderer.setSize(w, h);
}
window.addEventListener('resize', resize);

let running = true;
let rafId = 0;
function loop() {
  rafId = requestAnimationFrame(loop);
  cube.rotation.x += 0.01;
  cube.rotation.y += 0.013;
  if (controls) controls.update();
  renderer.render(scene, camera);
}
loop();

// Control contract for the studio (pause/resume/snapshot/fps via window.__game).
// When paused we stop the loop, so the renderer's frame counter stalls and the
// control shim reports fps:0 — exactly the "is it rendering?" signal.
window.__game = {
  renderer: renderer,
  pause: function () { if (running) { running = false; cancelAnimationFrame(rafId); } },
  resume: function () { if (!running) { running = true; loop(); } },
};
`;

export const STARTER_GAME_3D: VfsFile[] = [
  {
    path: STARTER_GAME_3D_PATH,
    content: STARTER_GAME_3D_JS,
    kind: 'text',
    size: STARTER_GAME_3D_JS.length,
  },
];
