import { beforeEach, describe, expect, it, vi } from 'vitest';

import { readVfsSnapshot, saveVfs } from '../code/codeApi';
import {
  BLOCKS_STORY_PROGRESS_FILE,
  loadBlocksProject,
  saveBlocksProject,
} from './blocksApi';
import { blankProject, serializeProject } from './blocksModel';

vi.mock('../code/codeApi', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../code/codeApi')>();
  return {
    ...actual,
    readVfsSnapshot: vi.fn(),
    saveVfs: vi.fn(),
  };
});

describe('blocks story progress VFS evidence', () => {
  beforeEach(() => vi.clearAllMocks());

  it('loads valid completion evidence separately from other project files', async () => {
    vi.mocked(readVfsSnapshot).mockResolvedValue({
      version: 7,
      files: [
        {
          path: 'project.blocks.json',
          content: serializeProject(blankProject('Story')),
          kind: 'text',
          size: 10,
        },
        {
          path: BLOCKS_STORY_PROGRESS_FILE,
          content: JSON.stringify({
            schemaVersion: 1,
            completed: { 'tsv-s1-a1-d': { completedAt: '2026-07-14T00:00:00.000Z' } },
          }),
          kind: 'text',
          size: 10,
        },
        { path: 'keep.txt', content: 'keep me', kind: 'text', size: 7 },
      ],
    });

    const loaded = await loadBlocksProject('project-1');

    expect(loaded.storyProgress?.completed['tsv-s1-a1-d']).toEqual({
      completedAt: '2026-07-14T00:00:00.000Z',
    });
    expect(loaded.otherFiles.map((file) => file.path)).toEqual(['keep.txt']);
  });

  it('writes completion evidence in the same versioned VFS save as the project', async () => {
    vi.mocked(saveVfs).mockResolvedValue({ version: 8, files: [] });
    const project = blankProject('Story');

    await saveBlocksProject({
      projectId: 'project-1',
      project,
      version: 7,
      otherFiles: [],
      storyProgress: {
        schemaVersion: 1,
        completed: { 'tsv-s1-a1-d': { completedAt: '2026-07-14T00:00:00.000Z' } },
      },
    });

    expect(saveVfs).toHaveBeenCalledWith(
      expect.objectContaining({
        projectId: 'project-1',
        version: 7,
        files: expect.arrayContaining([
          expect.objectContaining({ path: BLOCKS_STORY_PROGRESS_FILE }),
        ]),
      }),
    );
  });
});
