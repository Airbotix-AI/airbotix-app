import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const OUTPUT_ROOT = join(process.cwd(), 'public', 'art-tasks');
const VERSION = 'v3';
const INK = '#2C3642';
const PAPER = '#FFFEF7';
const COVER = '#FFF3F8';
const ACTIVE = '#E2528C';

const tasks = [
  {
    slug: 'draw-a-trex',
    alt: 'a friendly T-Rex',
    stages: [
      '<ellipse cx="350" cy="350" rx="132" ry="88"/>',
      '<path d="M247 329c-18-55-49-99-96-116H93c-35 0-55 21-51 50 4 27 29 39 73 39h62l-72 33c28 31 77 37 122 7m247-7c59-18 101-56 120-105-2 82-47 154-138 184"/>',
      '<path d="M301 421c-8 45-22 78-48 99l-3 28h73l4-23-25-3m94-93c13 40 14 72 1 96l2 23h72l-2-23-25-5M258 342l-34 34 31 5m17-16-27 41 31 2"/>',
      '<circle cx="96" cy="253" r="8" fill="#2C3642"/><path d="m82 303 15 19 17-19 17 20 17-19 17 17m-85-83 18-6m237 85 18 25m20-36 18 25m18-31 17 23"/>',
    ],
  },
  {
    slug: 'draw-a-kitten',
    alt: 'a sitting kitten',
    stages: [
      '<path d="M230 300c-47 52-58 156-15 215h200c43-59 32-163-15-215"/>',
      '<path d="M229 173 245 80l70 62 70-62 16 93c35 25 50 63 39 99-15 50-64 78-125 78s-110-28-125-78c-11-36 4-74 39-99Z"/>',
      '<path d="M260 348v144m55-138v138m-82 0h57m-4 0h58M408 360c91-70 144 23 98 92-20 30-58 31-81 7"/>',
      '<circle cx="275" cy="225" r="8" fill="#2C3642"/><circle cx="355" cy="225" r="8" fill="#2C3642"/><path d="m315 251-13 11 13 12 13-12-13-11Zm0 23v19m0 0c-18 18-38 18-55 1m55-1c18 18 38 18 55 1m-105-48-52-12m53 34-55 7m159-29 52-12m-53 34 55 7"/>',
    ],
  },
  {
    slug: 'draw-a-puppy',
    alt: 'a sitting puppy',
    stages: [
      '<path d="M227 307c-44 58-51 155-9 209h194c42-54 35-151-9-209"/>',
      '<circle cx="315" cy="217" r="108"/><path d="M221 168c-59-53-101-24-83 49 11 49 44 74 83 47m188-96c59-53 101-24 83 49-11 49-44 74-83 47"/>',
      '<path d="M260 365v130m55-124v124m-84 0h58m-5 0h61M414 369c72 4 105 63 53 105"/>',
      '<circle cx="275" cy="207" r="8" fill="#2C3642"/><circle cx="355" cy="207" r="8" fill="#2C3642"/><ellipse cx="315" cy="250" rx="24" ry="17"/><path d="M315 267v20m0 0c-18 18-40 18-58 0m58 0c18 18 40 18 58 0M245 320c44 17 96 17 140 0"/>',
    ],
  },
  {
    slug: 'draw-a-lion',
    alt: 'a friendly lion',
    stages: [
      '<ellipse cx="375" cy="353" rx="143" ry="90"/>',
      '<path d="M228 128c46 0 94 36 113 87 20 53-1 122-55 155-48 29-115 22-154-18-39-39-45-105-14-153 25-40 68-71 110-71Z"/><circle cx="228" cy="249" r="78"/><path d="m172 185-11-45 44 25m79 20 11-45-44 25"/>',
      '<path d="M293 417v104m73-81v81m66-81v81m64-106v106m-226 0h47m30 0h44m22 0h43m20 0h45M504 350c62-6 88-57 54-91m0 0 22-17 12 27-34-10Z"/>',
      '<circle cx="201" cy="243" r="7" fill="#2C3642"/><circle cx="255" cy="243" r="7" fill="#2C3642"/><ellipse cx="228" cy="275" rx="17" ry="12"/><path d="M228 287v18m0 0c-17 17-35 17-52 1m52-1c17 17 35 17 52 1m35-92 20-13m-123-68 8-27m34 32 21-24"/>',
    ],
  },
  {
    slug: 'draw-a-shark',
    alt: 'a swimming shark',
    stages: [
      '<path d="M67 321c78-103 302-128 431-40-99 126-320 160-431 40Z"/>',
      '<path d="m261 228 76-105 26 112m-69 177 73 67 21-103m104-95 92-61-33 100 36 91-95-57"/>',
      '<circle cx="169" cy="292" r="8" fill="#2C3642"/><path d="M98 337c57 37 125 40 191 8m-134 9 17 23 17-20 18 17 17-21 18 16 17-22"/>',
      '<path d="M279 290c20 9 33 24 40 44m-20-52c21 9 35 23 43 43M407 303c25 5 47 17 67 35"/>',
    ],
  },
  {
    slug: 'draw-a-rocket',
    alt: 'a rocket flying through space',
    stages: [
      '<path d="M300 64c92 75 108 244 0 377-108-133-92-302 0-377Z"/>',
      '<circle cx="300" cy="229" r="52"/><circle cx="300" cy="229" r="35"/><path d="m236 322-91 108 101-30m118-78 91 108-101-30"/>',
      '<path d="M253 421c-9 61 14 102 47 132 33-30 56-71 47-132m-64 18c0 35 6 63 17 82 11-19 17-47 17-82"/>',
      '<path d="M261 131h78M247 371h106m-209 62-36 47m348-47 36 47"/>',
    ],
  },
  {
    slug: 'draw-a-unicorn',
    alt: 'a standing unicorn',
    stages: [
      '<ellipse cx="370" cy="350" rx="140" ry="82"/>',
      '<path d="M267 354c-51-36-70-101-38-151 24-38 78-53 118-25m-118 25c-43-11-75 10-73 42 2 37 47 60 94 40l44-27"/>',
      '<path d="M278 409v118m70-95v95m75-95v95m66-107v107m-233 0h48m23 0h46m30 0h45m22 0h45"/>',
      '<path d="m231 188 1-100 43 91m73 0c-44 5-80 32-104 72m61-17c-7 32 4 62 28 88M510 339c80-58 119 17 82 76-22 35-66 42-96 14m-252-190 20 17m-59-21 17 12"/><circle cx="202" cy="238" r="7" fill="#2C3642"/>',
    ],
  },
  {
    slug: 'draw-a-race-car',
    alt: 'a racing car',
    stages: [
      '<path d="M70 370c20-75 85-115 188-123l76-82h105l67 83c55 12 90 48 97 102l-27 66H112l-42-46Z"/>',
      '<circle cx="205" cy="416" r="66"/><circle cx="468" cy="416" r="66"/><circle cx="205" cy="416" r="28"/><circle cx="468" cy="416" r="28"/>',
      '<path d="m258 247 91-77 78 77m-92-73 22 73m81-55h115v30H435m26-30v-38m69 38v-38"/>',
      '<ellipse cx="121" cy="340" rx="30" ry="18"/><path d="M75 370h61m364-116 56 34M297 279h116m-126 43h155"/>',
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
