// 3D model (.glb) preview stage for the Asset Viewer (D-3D-09). Renders the GLB
// with three.js in the TRUSTED pane (a GLB is inert data — GLTFLoader executes
// nothing), auto-frames the camera, and — when the model carries animations —
// lists every clip as a switchable chip with play/pause, so a kid can preview all
// of a model's actions before asking the AI to use them. Loaded lazily (React.lazy
// in AssetPreview) so three.js never enters the main bundle.
//
// Stage colours are inline styles (a QA tool surface, not themeable chrome), same
// as AssetPreview's image stage — no raw hex leaks into Tailwind classes.

import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';

import { Pause, Play, RotateCcw, ZoomIn, ZoomOut } from 'lucide-react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

import { dataUrlToBlob } from '@/pages/learn/code/codeApi';
import { clipLabels } from './assetMeta';
import { CopyButton } from './CopyButton';
import { addStageLights, frameCamera, guardedLoadingManager, STAGE_BG } from './modelScene';

interface ModelPreviewProps {
  /**
   * The asset's VFS `content` (a `data:` URL). Parsed from its raw BYTES — the
   * same path the grid thumbnail (`modelThumbnail.ts`) uses — NOT fetched as a
   * blob: URL via `GLTFLoader.load()`. That means: no object-URL lifecycle to
   * race against StrictMode's dev double-mount (a URL revoked in the first
   * cleanup would poison the second effect run), and no network fetch at all — a
   * strict `connect-src` CSP can't block an in-memory `.parse()`.
   */
  src: string;
}

const CROSSFADE_SEC = 0.25;
/** One zoom-button step: camera-to-target distance × this (in) / ÷ this (out). */
const ZOOM_STEP = 0.8;

interface ModelHandles {
  renderer: THREE.WebGLRenderer;
  camera: THREE.PerspectiveCamera;
  controls: OrbitControls;
  /** The auto-framed view (set once the model loads) — what Reset restores. */
  home: { position: THREE.Vector3; target: THREE.Vector3 } | null;
  mixer: THREE.AnimationMixer | null;
  actions: Map<string, THREE.AnimationAction>;
  current: THREE.AnimationAction | null;
}

export default function ModelPreview({ src }: ModelPreviewProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const handlesRef = useRef<ModelHandles | null>(null);
  const playingRef = useRef(true);
  const [clips, setClips] = useState<string[]>([]);
  const [activeClip, setActiveClip] = useState<string | null>(null);
  const [playing, setPlaying] = useState(true);
  const [error, setError] = useState(false);
  // Short kid-facing chip labels ("CharacterArmature|Death" → "Death"); the full
  // clip name stays the playback + copy key.
  const labels = useMemo(() => clipLabels(clips), [clips]);

  // Reset per-model state when the model changes (the render-time reset pattern):
  // without this, a previous model's clips linger until the new load settles, and
  // an errored viewer could never recover (the error branch unmounts the stage,
  // so the load effect would have nowhere to run).
  const [lastSrc, setLastSrc] = useState(src);
  if (lastSrc !== src) {
    setLastSrc(src);
    setClips([]);
    setActiveClip(null);
    playingRef.current = true;
    setPlaying(true);
    setError(false);
  }

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return undefined;

    let disposed = false;
    let rafId = 0;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(STAGE_BG);
    const camera = new THREE.PerspectiveCamera(50, 1, 0.01, 1000);
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    mount.appendChild(renderer.domElement);

    addStageLights(scene);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;

    const size = () => {
      const w = mount.clientWidth || 1;
      const h = mount.clientHeight || 1;
      renderer.setSize(w, h);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    size();
    const observer = new ResizeObserver(size);
    observer.observe(mount);

    const handles: ModelHandles = {
      renderer,
      camera,
      controls,
      home: null,
      mixer: null,
      actions: new Map(),
      current: null,
    };
    handlesRef.current = handles;

    // Parse from the model's raw BYTES (identical to the grid thumbnail), not
    // GLTFLoader.load()'s fetch of a blob: URL: no blob lifecycle to race against
    // StrictMode/cleanup and no network fetch in the trusted pane (a strict
    // connect-src CSP would block a blob fetch — parse never touches the network).
    // The sub-resource guard (modelScene.guardedLoadingManager) still blocks any
    // external URIs a crafted GLB might reference.
    const fail = () => {
      // Guarded like the success path: a stale load (model switched away) must
      // not poison the NEXT model's state.
      if (disposed) return;
      cancelAnimationFrame(rafId); // the error view has no stage — stop the loop
      setError(true);
    };
    void dataUrlToBlob(src)
      .arrayBuffer()
      .then((bytes) => {
        if (disposed) return;
        new GLTFLoader(guardedLoadingManager()).parse(
          bytes,
          '',
          (gltf) => {
            if (disposed) return;
            scene.add(gltf.scene);

            frameCamera(camera, gltf.scene, controls.target);
            handles.home = { position: camera.position.clone(), target: controls.target.clone() };

            if (gltf.animations.length > 0) {
              const mixer = new THREE.AnimationMixer(gltf.scene);
              handles.mixer = mixer;
              for (const clip of gltf.animations) {
                handles.actions.set(clip.name, mixer.clipAction(clip));
              }
              const first = gltf.animations[0].name;
              const action = handles.actions.get(first);
              if (action) {
                action.play();
                handles.current = action;
              }
              setClips(gltf.animations.map((c) => c.name));
              setActiveClip(first);
            }
          },
          fail,
        );
      })
      .catch(fail); // malformed content (bad data URL) — same error state

    const clock = new THREE.Clock();
    const loop = () => {
      rafId = requestAnimationFrame(loop);
      const dt = clock.getDelta();
      if (playingRef.current) handles.mixer?.update(dt);
      controls.update();
      renderer.render(scene, camera);
    };
    loop();

    return () => {
      disposed = true;
      cancelAnimationFrame(rafId);
      observer.disconnect();
      controls.dispose();
      renderer.dispose();
      // dispose() alone doesn't release the WebGL context; without this,
      // browsing many models can exhaust the browser's context cap (Chrome
      // then evicts the OLDEST context — potentially the running game's).
      renderer.forceContextLoss();
      mount.removeChild(renderer.domElement);
      handlesRef.current = null;
    };
  }, [src]);

  // Switch the playing clip: fade the old action out and the picked one in.
  function switchClip(name: string) {
    const handles = handlesRef.current;
    const next = handles?.actions.get(name);
    if (!handles || !next) return;
    if (handles.current && handles.current !== next) {
      handles.current.fadeOut(CROSSFADE_SEC);
    }
    next.reset().fadeIn(CROSSFADE_SEC).play();
    handles.current = next;
    setActiveClip(name);
    playingRef.current = true;
    setPlaying(true);
  }

  function togglePlaying() {
    playingRef.current = !playingRef.current;
    setPlaying(playingRef.current);
  }

  /** Dolly the camera toward (factor < 1) / away from (factor > 1) the target. */
  function zoomBy(factor: number) {
    const handles = handlesRef.current;
    if (!handles) return;
    const { camera, controls } = handles;
    const offset = camera.position.clone().sub(controls.target).multiplyScalar(factor);
    camera.position.copy(controls.target.clone().add(offset));
  }

  /** Back to the auto-framed view the model opened with. */
  function resetView() {
    const handles = handlesRef.current;
    if (!handles?.home) return;
    handles.camera.position.copy(handles.home.position);
    handles.controls.target.copy(handles.home.target);
  }


  if (error) {
    return (
      <p className="rounded-xl border border-pg-border bg-pg-surface-2 p-4 text-[13px] text-pg-text-dim">
        Couldn&apos;t open this 3D model — the file may be damaged. Try importing it again.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3" data-testid="model-stage">
      <div className="relative">
        <div
          ref={mountRef}
          className="h-[300px] w-full cursor-grab overflow-hidden rounded-xl active:cursor-grabbing"
        />
        {/* View controls float on the dark stage (scroll also zooms; drag orbits). */}
        <div className="absolute right-2 top-2 flex flex-col gap-1">
          <StageButton
            testId="model-zoom-in"
            label="Zoom in"
            onClick={() => zoomBy(ZOOM_STEP)}
          >
            <ZoomIn size={15} />
          </StageButton>
          <StageButton
            testId="model-zoom-out"
            label="Zoom out"
            onClick={() => zoomBy(1 / ZOOM_STEP)}
          >
            <ZoomOut size={15} />
          </StageButton>
          <StageButton testId="model-reset-view" label="Reset view" onClick={resetView}>
            <RotateCcw size={15} />
          </StageButton>
        </div>
      </div>

      {clips.length > 0 ? (
        <div className="rounded-xl border border-pg-border bg-pg-surface p-3">
          <div className="mb-2 flex items-center gap-2">
            <span className="text-[12.5px] font-extrabold">
              Animations
              <span className="ml-1.5 font-bold text-pg-text-muted">{clips.length}</span>
            </span>
            <div className="ml-auto flex items-center gap-1.5">
              {/* Copies the ACTIVE clip's FULL name — the exact string game code
                  needs (AnimationClip.findByName) — even when its chip shows a
                  short label. */}
              <CopyButton
                text={activeClip ?? ''}
                label="Copy name"
                testId="model-copy-anim"
                disabled={!activeClip}
              />
              <button
                type="button"
                onClick={togglePlaying}
                className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-brand-bubblegum text-white"
                aria-label={playing ? 'Pause' : 'Play'}
              >
                {playing ? <Pause size={14} /> : <Play size={14} />}
              </button>
            </div>
          </div>
          <div className="flex max-h-36 flex-wrap gap-1.5 overflow-auto">
            {clips.map((name) => (
              <button
                key={name}
                type="button"
                data-testid="model-anim-chip"
                title={name}
                aria-pressed={activeClip === name}
                onClick={() => switchClip(name)}
                className={
                  activeClip === name
                    ? 'rounded-lg border border-brand-bubblegum/60 bg-brand-bubblegum/15 px-2.5 py-1 text-[12px] font-bold text-pg-text'
                    : 'rounded-lg border border-pg-border px-2.5 py-1 text-[12px] font-bold text-pg-text-dim hover:text-pg-text'
                }
              >
                {labels.get(name) ?? name}
              </button>
            ))}
          </div>
          <p className="mt-2 text-[11.5px] text-pg-text-muted">
            Tap an animation to preview it. “Copy name” copies its exact name to paste into the
            chat with the AI.
          </p>
        </div>
      ) : (
        <p className="text-[12px] font-semibold text-pg-text-muted">
          Drag to spin it around · this model has no animations
        </p>
      )}
    </div>
  );
}

/** A small square control that floats on the dark preview stage. */
function StageButton({
  label,
  testId,
  onClick,
  children,
}: {
  label: string;
  testId: string;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      data-testid={testId}
      aria-label={label}
      title={label}
      onClick={onClick}
      className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 text-white backdrop-blur-sm transition-colors hover:bg-white/25"
    >
      {children}
    </button>
  );
}
