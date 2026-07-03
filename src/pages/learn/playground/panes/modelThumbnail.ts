// Static thumbnail renderer for GLB grid cards (D-3D-09c): parses the model
// once, renders a single framed still to a small offscreen canvas, and returns
// it as a PNG data URL for a plain <img> — so a grid full of models costs ONE
// shared WebGL context total (a live canvas per card would exhaust the
// browser's context cap and evict the running game's context).
//
// Imports three — only ever load this module lazily (see ModelThumb).

import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

import { dataUrlToBlob } from '@/pages/learn/code/codeApi';
import { addStageLights, frameCamera, guardedLoadingManager } from './modelScene';

/** Square thumbnail edge, px (rendered 2× a 96px card cell for sharpness). */
const THUMB_SIZE = 192;

// One shared offscreen renderer, created on first use and kept for the session;
// renders are serialised through `queue` so concurrent cards never interleave.
let renderer: THREE.WebGLRenderer | null = null;
let queue: Promise<unknown> = Promise.resolve();
const cache = new Map<string, Promise<string | null>>();

function getRenderer(): THREE.WebGLRenderer {
  if (!renderer) {
    // alpha: the card supplies the background, so the PNG keeps transparency.
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
    renderer.setSize(THUMB_SIZE, THUMB_SIZE);
  }
  return renderer;
}

async function renderThumbnail(content: string): Promise<string | null> {
  const bytes = await dataUrlToBlob(content).arrayBuffer();
  const gltf = await new Promise<{ scene: THREE.Group }>((resolve, reject) => {
    new GLTFLoader(guardedLoadingManager()).parse(bytes, '', resolve, reject);
  });

  const scene = new THREE.Scene();
  addStageLights(scene);
  scene.add(gltf.scene);
  const camera = new THREE.PerspectiveCamera(50, 1, 0.01, 1000);
  frameCamera(camera, gltf.scene, new THREE.Vector3());

  const r = getRenderer();
  r.render(scene, camera);
  return r.domElement.toDataURL('image/png');
}

/**
 * The PNG data URL for a model asset's grid thumbnail, cached by the asset's
 * `content` (a changed model re-renders; an unchanged one is free). `null` when
 * the model can't be parsed — the caller falls back to the kind icon.
 */
export function modelThumbnail(content: string): Promise<string | null> {
  const cached = cache.get(content);
  if (cached) return cached;
  // The queued link is the CAUGHT promise — one unparsable model must never
  // poison the chain for every later thumbnail.
  const result = queue.then(() => renderThumbnail(content)).catch(() => null);
  queue = result;
  cache.set(content, result);
  return result;
}
