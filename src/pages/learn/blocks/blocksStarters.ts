import type { BlocksTemplateId } from './blocksApi';

export interface BlocksStarter {
  id: BlocksTemplateId;
  emoji: string;
  title: string;
  desc: string;
}

export const BLOCKS_STARTERS: BlocksStarter[] = [
  {
    id: 'blocks_story',
    emoji: '🐱',
    title: 'New project',
    desc: 'Press Go! to watch the cat chase a bouncing ball — then make it your own.',
  },
  {
    id: 'blocks_tsv_a1_h',
    emoji: '🌟',
    title: 'Tiny Star Village · First Mission',
    desc:
      'The Bell Tower did not ring, and the morning light has vanished. Become Little Light’s Story Partner and fix its morning: hop awake first, then say hello.',
  },
];
