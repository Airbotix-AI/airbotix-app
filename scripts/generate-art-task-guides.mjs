import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const OUTPUT_ROOT = join(process.cwd(), 'public', 'art-tasks');
const VERSION = 'v2';
const INK = '#2C3642';
const PAPER = '#FFFEF7';
const COVER = '#FFF3F8';
const ACTIVE = '#E2528C';

const tasks = [
  {
    slug: 'draw-a-trex',
    alt: 'a friendly T-Rex',
    stages: [
      '<ellipse cx="340" cy="350" rx="145" ry="95"/>',
      '<path d="M235 330c-68 5-116-28-116-78 0-46 44-75 100-65 44 8 67 39 63 82m184 70 95-67-61 112"/>',
      '<path d="M275 405v100m105-72v72m-126 0h54m48 0h55M272 337l-45 34m59-19-34 45"/>',
      '<circle cx="186" cy="232" r="8" fill="#2C3642"/><path d="M145 272c34 20 69 20 104 0"/>',
    ],
  },
  {
    slug: 'draw-a-kitten',
    alt: 'a sitting kitten',
    stages: [
      '<ellipse cx="315" cy="355" rx="112" ry="150"/>',
      '<circle cx="315" cy="215" r="105"/><path d="m235 150 22-84 68 58m70 26-22-84-68 58"/>',
      '<path d="M250 352v122m65-118v118m-86 0h52m15 0h54M420 365c88-55 118 55 55 90-26 15-54 2-59-23"/>',
      '<circle cx="280" cy="205" r="8" fill="#2C3642"/><circle cx="350" cy="205" r="8" fill="#2C3642"/><path d="m315 230-10 10 10 10 10-10-10-10Zm-34 35c23 18 45 18 68 0m-91-34-42-10m43 31-44 6m157-27 42-10m-43 31 44 6"/>',
      '<circle cx="125" cy="480" r="42"/><path d="M84 456c33 7 56 24 78 56m-72-25c29-3 56 8 78 33"/>',
    ],
  },
  {
    slug: 'draw-a-puppy',
    alt: 'a sitting puppy',
    stages: [
      '<ellipse cx="315" cy="355" rx="118" ry="150"/>',
      '<circle cx="315" cy="205" r="104"/><path d="M222 164c-77-64-112-4-73 70 25 48 70 29 84-6m175-64c77-64 112-4 73 70-25 48-70 29-84-6"/>',
      '<path d="M250 350v126m65-120v120m-89 0h57m14 0h58M418 364c75-5 105 60 44 102"/>',
      '<circle cx="280" cy="196" r="8" fill="#2C3642"/><circle cx="350" cy="196" r="8" fill="#2C3642"/><ellipse cx="315" cy="230" rx="18" ry="13"/><path d="M315 243v18m-35 3c23 20 47 20 70 0"/>',
      '<path d="M102 488h80m-65-13-18 13 18 13m50-26 18 13-18 13"/>',
    ],
  },
  {
    slug: 'draw-a-lion',
    alt: 'a friendly lion',
    stages: [
      '<ellipse cx="345" cy="350" rx="155" ry="92"/>',
      '<circle cx="205" cy="250" r="122"/><circle cx="205" cy="250" r="78"/><circle cx="165" cy="184" r="22"/><circle cx="245" cy="184" r="22"/>',
      '<path d="M250 404v105m72-93v93m72-96v96m65-116v116M230 509h48m24 0h45m28 0h44m19 0h47M486 342c71 18 81-74 29-93m0 0 20-16 12 23-32-7Z"/>',
      '<circle cx="180" cy="242" r="7" fill="#2C3642"/><circle cx="230" cy="242" r="7" fill="#2C3642"/><ellipse cx="205" cy="268" rx="15" ry="10"/><path d="M205 278v15m-28 2c18 15 38 15 56 0"/>',
      '<path d="M83 518h70m-44 0-16-35m16 35 4-43m8 43 24-30m342 30h55m-34 0-9-30m9 30 16-37"/>',
    ],
  },
  {
    slug: 'draw-a-shark',
    alt: 'a swimming shark',
    stages: [
      '<path d="M92 314c80-108 304-122 424-28-90 123-306 156-424 28Z"/>',
      '<path d="m267 221 62-88 22 103m-45 170 61 62 12-91m132-91 70-58-26 88 29 83-76-58"/>',
      '<circle cx="185" cy="286" r="8" fill="#2C3642"/><path d="M132 329c54 39 112 39 166 5m-117 17 13 24 15-21 15 17 14-22"/>',
      '<path d="M294 289c18 7 31 21 39 41m-22-49c19 7 33 20 42 39"/>',
      '<circle cx="105" cy="125" r="18"/><circle cx="145" cy="174" r="12"/><circle cx="515" cy="117" r="15"/><path d="M94 511c12-43 30-59 43-84m-22 84c2-52 22-80 45-110m332 110c-6-48 8-79 28-109"/>',
    ],
  },
  {
    slug: 'draw-a-rocket',
    alt: 'a rocket flying through space',
    stages: [
      '<path d="M300 88c84 68 96 231 0 355-96-124-84-287 0-355Z"/>',
      '<circle cx="300" cy="245" r="48"/><path d="m240 323-83 88 91-20m112-68 83 88-91-20"/>',
      '<path d="M258 420c-5 55 16 88 42 113 26-25 47-58 42-113m-57 15c0 31 5 53 15 68 10-15 15-37 15-68"/>',
      '<path d="M263 143h74M252 371h96"/>',
      '<path d="m102 142 11 23 25 4-18 18 4 25-22-12-22 12 4-25-18-18 25-4 11-23Zm398 18 9 18 20 3-14 14 3 20-18-9-18 9 3-20-14-14 20-3 9-18Z"/><circle cx="88" cy="485" r="48"/>',
    ],
  },
  {
    slug: 'draw-a-unicorn',
    alt: 'a standing unicorn',
    stages: [
      '<ellipse cx="355" cy="340" rx="150" ry="88"/>',
      '<path d="M245 340c-46-31-62-100-25-145 33-40 97-31 115 17m-115-17c-45-7-66 26-45 54 18 23 59 21 77 1"/>',
      '<path d="M255 393v126m70-92v92m75-92v92m67-111v111M235 519h47m22 0h48m27 0h48m19 0h48"/>',
      '<path d="m218 177 7-91 31 85m55 40c-34-32-63-41-92-20m32 84c36 28 65 24 94-7M496 330c89-55 104 52 48 95-22 17-46 16-66 3"/>',
      '<circle cx="213" cy="220" r="7" fill="#2C3642"/><path d="M181 245c22 13 44 13 65 0m-81 272h361m-42-375 9 19 21 3-15 15 4 21-19-10-19 10 4-21-15-15 21-3 9-19Z"/>',
    ],
  },
  {
    slug: 'draw-a-race-car',
    alt: 'a racing car',
    stages: [
      '<path d="M88 367c23-80 91-113 187-120l68-72h92l61 75c52 12 85 44 91 96l-24 58H125l-37-37Z"/>',
      '<circle cx="208" cy="404" r="64"/><circle cx="458" cy="404" r="64"/><circle cx="208" cy="404" r="27"/><circle cx="458" cy="404" r="27"/>',
      '<path d="m274 247 82-69 70 69M435 189h105v27H431m28-27v-32m61 32v-32"/>',
      '<ellipse cx="132" cy="337" rx="28" ry="17"/><path d="M92 367h52m335-111 52 31"/>',
      '<path d="M94 494c136 34 297 34 434 0m-32-4 29 4-23 19M72 284h-44m58-31H43"/>',
    ],
  },
];

function wrapSvg(title, content, backgroundColor = null) {
  const backgroundMarkup = backgroundColor
    ? `  <rect width="600" height="600" rx="36" fill="${backgroundColor}"/>\n`
    : '';
  const indentedContent = content
    .split('\n')
    .map((line) => `    ${line}`)
    .join('\n');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 600" role="img" aria-labelledby="title">
  <title id="title">${title}</title>
${backgroundMarkup}\
  <g fill="none" stroke="${INK}" stroke-width="11" stroke-linecap="round" stroke-linejoin="round">
${indentedContent}
  </g>
</svg>
`;
}

for (const task of tasks) {
  const directory = join(OUTPUT_ROOT, task.slug, VERSION);
  const stepsDirectory = join(directory, 'steps');
  const simpleStages = task.stages.slice(0, 4);
  const completeDrawing = simpleStages.join('\n');
  mkdirSync(stepsDirectory, { recursive: true });

  writeFileSync(
    join(directory, 'ghost.svg'),
    wrapSvg(`A simple outline of ${task.alt} to trace`, completeDrawing),
  );
  writeFileSync(
    join(directory, 'reference.svg'),
    wrapSvg(`A four-step line drawing of ${task.alt}`, completeDrawing, PAPER),
  );
  writeFileSync(
    join(directory, 'cover.svg'),
    wrapSvg(`A simple drawing idea: ${task.alt}`, completeDrawing, COVER),
  );

  simpleStages.forEach((stage, index) => {
    const previous = simpleStages.slice(0, index).join('\n');
    const activeStage = `<g stroke="${ACTIVE}" stroke-dasharray="18 12">${stage}</g>`;
    const content = [previous, activeStage].filter(Boolean).join('\n');
    writeFileSync(
      join(stepsDirectory, `${String(index + 1).padStart(2, '0')}.svg`),
      wrapSvg(`Step ${index + 1} for drawing ${task.alt}`, content, PAPER),
    );
  });
}
