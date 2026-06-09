// Global, app-level AI-generation state for the Game Studio (PRD
// learn-game-studio-assets-prd §3 "Magic Generation"). ONE generation runs at a
// time and lives HERE — not in the Asset Viewer pane — so it survives the pane
// closing/opening and in-app navigation (a full page reload starts fresh; that
// scope was the chosen v1, D-ASSET — resume model). The store owns the async
// call AND the completion (writing the asset into the project VFS), because the
// pane that kicked it off may be unmounted by the time it finishes.

import { create } from 'zustand';

import { runGen, type GenAssetResult } from './assetGen';
import { useProjectStore } from './projectStore';

// Hold the loading state briefly so the magic animation is actually seen (and it
// reads like real generation latency on the offline stub).
const MIN_GEN_MS = 900;

const MIME_EXT: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/gif': 'gif',
  'image/svg+xml': 'svg',
  'image/webp': 'webp',
  'audio/wav': 'wav',
  'audio/mpeg': 'mp3',
  'audio/ogg': 'ogg',
};

function extForResult(result: GenAssetResult): string {
  return MIME_EXT[result.mime] ?? (result.meta?.kind === 'audio' ? 'wav' : 'png');
}

function slugForPrompt(prompt: string, fallback: string): string {
  return prompt.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 24) || fallback;
}

function uniquePath(desired: string, taken: Set<string>): string {
  if (!taken.has(desired)) return desired;
  const dot = desired.lastIndexOf('.');
  const stem = dot > 0 ? desired.slice(0, dot) : desired;
  const ext = dot > 0 ? desired.slice(dot) : '';
  let n = 2;
  while (taken.has(`${stem}_${n}${ext}`)) n += 1;
  return `${stem}_${n}${ext}`;
}

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

export type GenStatus = 'idle' | 'generating' | 'done' | 'error';
export type GenMode = 'create' | 'remix';

export interface StartGenArgs {
  projectId?: string;
  prompt: string;
  mode?: GenMode;
  /** Remix: vary a project asset (VFS path) or a Library asset (URL). */
  refAssetPath?: string;
  refUrl?: string;
}

interface GenerationStore {
  status: GenStatus;
  prompt: string;
  mode: GenMode;
  /** VFS path of the asset created on success (for the pane to reveal it). */
  resultPath: string | null;
  error: string | null;
  /** Internal: abort the in-flight backend call on cancel. Not for UI. */
  _ctrl: AbortController | null;
  /** The last request, so the error state's "Try again" can re-run it. */
  _last: StartGenArgs | null;

  start: (args: StartGenArgs) => Promise<void>;
  retry: () => void;
  cancel: () => void;
  dismiss: () => void;
}

export const useGenerationStore = create<GenerationStore>((set, get) => ({
  status: 'idle',
  prompt: '',
  mode: 'create',
  resultPath: null,
  error: null,
  _ctrl: null,
  _last: null,

  async start(args) {
    const prompt = args.prompt.trim();
    if (get().status === 'generating' || !prompt) return; // one generation at a time

    const ctrl = new AbortController();
    set({
      status: 'generating',
      prompt,
      mode: args.mode ?? 'create',
      resultPath: null,
      error: null,
      _ctrl: ctrl,
      _last: { ...args, prompt },
    });

    try {
      const [result] = await Promise.all([
        runGen(
          {
            projectId: args.projectId,
            prompt,
            refAssetPath: args.refAssetPath,
            refUrl: args.refUrl,
          },
          undefined,
          ctrl.signal,
        ),
        sleep(MIN_GEN_MS),
      ]);
      if (ctrl.signal.aborted) return; // cancelled while in flight — cancel() already reset

      // Completion runs HERE (not in the pane) so a closed pane never loses it.
      const ext = extForResult(result);
      const slug = slugForPrompt(prompt, args.mode === 'remix' ? 'remix' : 'asset');
      const files = useProjectStore.getState().files;
      const path = uniquePath(`assets/generated/${slug}.${ext}`, new Set(files.map((f) => f.path)));
      useProjectStore.getState().createFile(path, 'asset', result.dataUrl);
      set({ status: 'done', resultPath: path, _ctrl: null });
    } catch {
      if (ctrl.signal.aborted) {
        set({ status: 'idle', _ctrl: null });
        return;
      }
      set({ status: 'error', error: "That didn't work — let's try again.", _ctrl: null });
    }
  },

  retry() {
    const last = get()._last;
    if (last) void get().start(last);
  },

  cancel() {
    get()._ctrl?.abort();
    set({ status: 'idle', prompt: '', mode: 'create', resultPath: null, error: null, _ctrl: null });
  },

  // Clear a finished (done/error) card back to the prompt box. No-op mid-flight.
  dismiss() {
    if (get().status === 'generating') return;
    set({ status: 'idle', resultPath: null, error: null });
  },
}));
