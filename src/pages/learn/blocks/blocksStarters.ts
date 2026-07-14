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
    desc: 'The Bell Tower did not ring, and the morning light has vanished. Become Lumilo’s Story Partner and fix the first light: hop awake first, then say hello.',
  },
  {
    id: 'blocks_tsv_a1_b',
    emoji: '🌟',
    title: 'Tiny Star Village · Mission 2',
    desc: 'Lumi remembers the right morning order. This time the program has only Start — add Hop, Say, and End to send the next wake-up star.',
  },
  {
    id: 'blocks_tsv_a1_d',
    emoji: '🌟',
    title: 'Tiny Star Village · Mission 3',
    desc: 'A breeze flipped Lumi’s two action blocks. Run the backwards morning, then drag the same blocks into the right order—without adding an answer.',
  },
  {
    id: 'blocks_tsv_a1_s',
    emoji: '🌟',
    title: 'Tiny Star Village · Mission 4',
    desc: 'Keep Lumi’s working morning order, choose your own greeting, then run and save the first wake-up story that is truly yours.',
  },
  {
    id: 'blocks_tsv_a2_h',
    emoji: '☁️',
    title: 'Tiny Star Village · Mission 5',
    desc: 'The fourth wake-up star reveals Tuan Tuan on the cloud path. Point to the plaza star, press Go, then decide whether Tuan Tuan moved closer or farther away.',
  },
  {
    id: 'blocks_tsv_a2_b',
    emoji: '➡️',
    title: 'Tiny Star Village · Mission 6',
    desc: 'Tuan Tuan knows the plaza star is on the right. Choose one real direction block, run the path, and help Tuan Tuan reach the star.',
  },
  {
    id: 'blocks_tsv_a2_d',
    emoji: '🛠️',
    title: 'Tiny Star Village · Mission 7',
    desc: 'Tuan Tuan has the right three-step path but the arrow points the wrong way. Run it once, then swap only Left for Right and test your repair.',
  },
];
