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
  {
    id: 'blocks_tsv_a2_s',
    emoji: '⭐',
    title: 'Tiny Star Village · Mission 8',
    desc: 'Choose a home star, then build your own two-step Left or Right path and save where Tuan Tuan arrives.',
  },
  {
    id: 'blocks_tsv_a3_h',
    emoji: '🐱',
    title: 'Tiny Star Village · Mission 9',
    desc: 'Go cannot wake Dot Dot. Run it once, then tap Dot Dot and discover which start makes the rooftop story respond.',
  },
  {
    id: 'blocks_tsv_a3_b',
    emoji: '👆',
    title: 'Tiny Star Village · Mission 10',
    desc: 'On Tap is ready, but Dot Dot needs a response. Add a real Hop or Say block, then tap Dot Dot to test what you built.',
  },
  {
    id: 'blocks_tsv_a3_d',
    emoji: '🎩',
    title: 'Tiny Star Village · Mission 11',
    desc: 'Dot Dot is wearing the wrong start hat. Tap Dot Dot first, then replace Start with On Tap and test the saved repair.',
  },
  {
    id: 'blocks_tsv_a3_s',
    emoji: '✨',
    title: 'Tiny Star Village · Mission 12',
    desc: 'Choose your secret character, add one real Hop, Grow, or Say response, then let someone discover it with a tap.',
  },
  {
    id: 'blocks_tsv_a4_h',
    emoji: '🚙',
    title: 'Tiny Star Village · Mission 13',
    desc: 'Point to where the breakfast cart will stop, choose 3 spaces before Go, then compare the one-space run with the table.',
  },
  {
    id: 'blocks_tsv_a4_b',
    emoji: '3️⃣',
    title: 'Tiny Star Village · Mission 14',
    desc: 'Change only the breakfast cart number from 1 to 3, save it, then run the real cart exactly to the table.',
  },
  {
    id: 'blocks_tsv_a4_d',
    emoji: '🚙',
    title: 'Tiny Star Village · Mission 15',
    desc: 'Run the cart to see it overshoot, choose less, then change only Right 4 to Right 3 and test the saved repair.',
  },
  {
    id: 'blocks_tsv_a4_s',
    emoji: '🎁',
    title: 'Tiny Star Village · Mission 16',
    desc: 'Choose an apple, gift, or star delivery stop, match the cart number to its distance, then run and save your own arrival.',
  },
  {
    id: 'blocks_tsv_a5_h',
    emoji: '💬',
    title: 'Tiny Star Village · Mission 17',
    desc: 'Run two unchanged greetings together, notice that both friends speak at once, then choose who should take the first turn.',
  },
  {
    id: 'blocks_tsv_a5_b',
    emoji: '⏱️',
    title: 'Tiny Star Village · Mission 18',
    desc: 'Add Wait 5 to Tuan Tuan’s open turn, save, predict Lumilo first, then run the two real greeting scripts.',
  },
];
