// Blocks Studio backend contract (learn-blocks-studio-prd.md §14). Reuses the
// shared project + VFS plumbing: a Blocks project is `kind='blocks'` whose VFS
// holds `project.blocks.json` (D-BLK-3). Load/save ride the same versioned
// `GET/PUT /projects/:id/code/files` as the Code/Game studios — the PUT is a
// full-VFS replace, so saves carry every file (others preserved verbatim).

import { api } from '@/lib/api';
import {
  readVfsSnapshot,
  saveVfs,
  SaveConflictError,
  type VfsFile,
} from '../code/codeApi';
import {
  BLOCKS_PROJECT_FILE,
  type BlocksProject,
  parseProject,
  serializeProject,
} from './blocksModel';

export const BLOCKS_PROJECT_KIND = 'blocks' as const;

export type BlocksTemplateId = 'blocks_blank' | 'blocks_story';

export interface BlocksProjectMeta {
  id: string;
  title: string;
  kind: string;
  status: string;
  created_at?: string;
  updated_at?: string;
}

export async function createBlocksProject(args: {
  title: string;
  template: BlocksTemplateId;
}): Promise<{ id: string }> {
  return api<{ id: string }>('/projects', {
    method: 'POST',
    body: {
      title: args.title,
      product_line: 'line_b_coding',
      kind: BLOCKS_PROJECT_KIND,
      template: args.template,
    },
  });
}

export async function listBlocksProjects(kidId: string): Promise<BlocksProjectMeta[]> {
  const all = await api<Array<BlocksProjectMeta>>(
    `/kids/${kidId}/projects?kind=${BLOCKS_PROJECT_KIND}`,
  );
  return all.filter((p) => p.kind === BLOCKS_PROJECT_KIND);
}

export interface LoadedBlocksProject {
  project: BlocksProject;
  version: number;
  /** Every OTHER file in the VFS — echoed back on save (PUT replaces the set). */
  otherFiles: VfsFile[];
}

export async function loadBlocksProject(projectId: string): Promise<LoadedBlocksProject> {
  const snap = await readVfsSnapshot(projectId);
  const doc = snap.files.find((f) => f.path === BLOCKS_PROJECT_FILE);
  return {
    project: parseProject(doc?.content ?? ''),
    version: snap.version,
    otherFiles: snap.files.filter((f) => f.path !== BLOCKS_PROJECT_FILE),
  };
}

export type BlocksSaveResult =
  | { status: 'saved'; version: number }
  | { status: 'kept-newest'; project: BlocksProject; version: number };

/**
 * Persist the program. On a stale version (saved elsewhere) the server wins:
 * the caller gets the server's copy to adopt — never a silent overwrite.
 */
export async function saveBlocksProject(args: {
  projectId: string;
  project: BlocksProject;
  version: number;
  otherFiles: VfsFile[];
}): Promise<BlocksSaveResult> {
  const files: VfsFile[] = [
    ...args.otherFiles,
    {
      path: BLOCKS_PROJECT_FILE,
      content: serializeProject(args.project),
      kind: 'text',
      size: 0,
    },
  ];
  try {
    const snap = await saveVfs({ projectId: args.projectId, files, version: args.version });
    return { status: 'saved', version: snap.version };
  } catch (e) {
    if (e instanceof SaveConflictError) {
      const doc = e.current.files.find((f) => f.path === BLOCKS_PROJECT_FILE);
      return {
        status: 'kept-newest',
        project: parseProject(doc?.content ?? ''),
        version: e.current.version,
      };
    }
    throw e;
  }
}
