import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const OUTPUT_ROOT = join(process.cwd(), 'public', 'art-tasks');
const DEFAULT_VERSION = 'v3';
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
  {
    slug: 'draw-a-first-fish',
    version: 'v1',
    alt: 'a very simple friendly fish',
    stages: [
      '<ellipse cx="285" cy="310" rx="155" ry="108"/>',
      '<polygon points="430,310 545,220 545,400"/><path d="M282 206c34-55 79-67 104 11M282 414c34 55 79 67 104-11"/>',
      '<circle cx="215" cy="286" r="10" fill="#2C3642"/><path d="M211 344c26 22 55 22 81 0"/>',
    ],
  },
  {
    slug: 'draw-a-first-snail',
    version: 'v1',
    alt: 'a very simple smiling snail',
    stages: [
      '<circle cx="295" cy="280" r="142"/>',
      '<path d="M76 430c93-29 176-26 238 8h140c49 0 82-25 82-68 0-57-53-88-103-61-24 13-39 39-43 72H254c-87 0-146 17-178 49Z"/><path d="M421 313 405 245m73 55 22-65"/>',
      '<path d="M321 281c0-69-85-92-123-38-48 68 24 149 96 103 43-27 47-82 12-113"/><circle cx="425" cy="333" r="8" fill="#2C3642"/><circle cx="478" cy="326" r="8" fill="#2C3642"/><path d="M431 367c17 15 35 15 52 0"/>',
    ],
  },
  {
    slug: 'draw-a-first-ladybug',
    version: 'v1',
    alt: 'a very simple four-spot ladybug',
    stages: [
      '<ellipse cx="300" cy="340" rx="155" ry="190"/>',
      '<path d="M173 231c50-92 204-92 254 0M300 151v379m-86-353-39-62m211 62 39-62"/>',
      '<circle cx="238" cy="315" r="31"/><circle cx="362" cy="315" r="31"/><circle cx="238" cy="420" r="31"/><circle cx="362" cy="420" r="31"/><circle cx="260" cy="210" r="8" fill="#2C3642"/><circle cx="340" cy="210" r="8" fill="#2C3642"/><path d="M278 236c15 13 29 13 44 0"/>',
    ],
  },
  {
    slug: 'draw-a-first-dinosaur',
    version: 'v1',
    alt: 'a very simple friendly little dinosaur',
    stages: [
      '<path d="M101 313c0-78 64-134 145-134h143c70 0 117 41 117 101 0 55-44 94-107 103l123 68c-64 20-121 7-166-39H240c-81 0-139-42-139-99Z"/>',
      '<path d="M190 398v103m91-89v89m-113 0h45m45 0h46"/><path d="m245 179 48-72 42 72m20 3 48-61 36 82m-1 17 43-36 22 66"/>',
      '<circle cx="176" cy="279" r="10" fill="#2C3642"/><path d="M166 330c28 22 58 22 87 0"/>',
    ],
  },
  {
    slug: 'draw-a-panda',
    version: 'v1',
    alt: 'a panda holding bamboo',
    stages: [
      '<ellipse cx="315" cy="372" rx="126" ry="145"/>',
      '<circle cx="315" cy="220" r="118"/><circle cx="228" cy="126" r="39"/><circle cx="402" cy="126" r="39"/>',
      '<ellipse cx="247" cy="454" rx="53" ry="35"/><ellipse cx="383" cy="454" rx="53" ry="35"/><path d="M222 322c24 55 54 80 93 83m93-83c-24 55-54 80-93 83M388 442 468 207m-58 169 48-38m-34-5 41-26m-22-30 33-20"/>',
      '<ellipse cx="268" cy="211" rx="31" ry="42"/><ellipse cx="362" cy="211" rx="31" ry="42"/><circle cx="274" cy="215" r="8" fill="#2C3642"/><circle cx="356" cy="215" r="8" fill="#2C3642"/><ellipse cx="315" cy="262" rx="20" ry="14"/><path d="M315 276v18m0 0c-18 17-38 17-54 0m54 0c18 17 38 17 54 0"/><ellipse cx="315" cy="395" rx="62" ry="78"/>',
    ],
  },
  {
    slug: 'draw-a-bunny',
    version: 'v1',
    alt: 'a bunny holding a carrot',
    stages: [
      '<ellipse cx="315" cy="382" rx="116" ry="140"/>',
      '<circle cx="315" cy="233" r="104"/><ellipse cx="265" cy="99" rx="35" ry="103" transform="rotate(-12 265 99)"/><ellipse cx="365" cy="99" rx="35" ry="103" transform="rotate(12 365 99)"/>',
      '<ellipse cx="247" cy="493" rx="72" ry="40" transform="rotate(-10 247 493)"/><ellipse cx="383" cy="493" rx="72" ry="40" transform="rotate(10 383 493)"/><circle cx="436" cy="393" r="39"/><path d="M253 340c24 50 44 72 62 72m62-72c-24 50-44 72-62 72"/>',
      '<circle cx="278" cy="225" r="8" fill="#2C3642"/><circle cx="352" cy="225" r="8" fill="#2C3642"/><path d="m315 254-14 11 14 12 14-12-14-11Zm0 23v18m0 0c-16 15-33 15-48 1m48-1c16 15 33 15 48 1M303 383l55-82 39 26-58 96Z"/><path d="m359 302 7-47m3 49 31-36m-25 42 48-13"/>',
    ],
  },
  {
    slug: 'draw-a-butterfly',
    version: 'v1',
    alt: 'a butterfly with open wings',
    stages: [
      '<ellipse cx="300" cy="338" rx="25" ry="119"/><circle cx="300" cy="205" r="36"/>',
      '<path d="M280 251C205 113 63 97 65 236c1 91 92 126 215 92Z"/><path d="M320 251c75-138 217-154 215-15-1 91-92 126-215 92Z"/><path d="M278 334C170 318 103 386 151 476c42 78 112 19 137-64Z"/><path d="M322 334c108-16 175 52 127 142-42 78-112 19-137-64Z"/>',
      '<path d="M289 174c-18-50-53-61-71-70m93 70c18-50 53-61 71-70M104 222c55 13 105 42 150 86m242-86c-55 13-105 42-150 86M173 401c40-13 74-29 103-53m151 53c-40-13-74-29-103-53"/>',
      '<circle cx="229" cy="216" r="19"/><circle cx="371" cy="216" r="19"/><circle cx="185" cy="271" r="14"/><circle cx="415" cy="271" r="14"/><circle cx="219" cy="399" r="17"/><circle cx="381" cy="399" r="17"/><circle cx="289" cy="207" r="6" fill="#2C3642"/><circle cx="311" cy="207" r="6" fill="#2C3642"/><path d="M286 228c9 10 19 10 28 0"/>',
    ],
  },
  {
    slug: 'draw-a-triceratops',
    version: 'v1',
    alt: 'a friendly triceratops',
    stages: [
      '<ellipse cx="371" cy="359" rx="145" ry="88"/>',
      '<path d="M240 164c75-27 151 15 151 94 0 82-68 126-151 110-77-15-115-87-80-150 17-31 45-48 80-54Z"/><ellipse cx="209" cy="282" rx="82" ry="62"/><polygon points="176,229 132,158 204,213"/><polygon points="238,214 229,131 269,211"/><polygon points="184,281 122,259 175,308"/>',
      '<path d="M278 411v103m61-79v79m87-79v79m62-103v103M257 514h44m20 0h43m42 0h43m20 0h42"/><path d="M494 336c58-16 92-51 103-96-1 71-32 118-96 145"/>',
      '<circle cx="193" cy="272" r="8" fill="#2C3642"/><path d="M157 316c28 20 59 21 91 4M154 337h48"/><circle cx="239" cy="190" r="12"/><circle cx="290" cy="183" r="10"/><circle cx="336" cy="210" r="12"/><circle cx="371" cy="340" r="13"/><circle cx="417" cy="358" r="11"/><circle cx="454" cy="331" r="10"/>',
    ],
  },
  {
    slug: 'draw-a-sea-turtle',
    version: 'v1',
    alt: 'a swimming sea turtle',
    stages: [
      '<ellipse cx="344" cy="318" rx="154" ry="112"/>',
      '<ellipse cx="149" cy="304" rx="68" ry="53"/><path d="M220 271c-63-56-111-40-116 12-4 44 35 76 112 63M250 387c-77 29-98 91-52 112 42 19 90-33 108-89m123-29c61 18 95 66 61 94-35 29-91-12-110-68m100-119c69-39 112-16 101 32-9 40-60 62-111 44M495 325l49 19-48 19"/>',
      '<path d="M344 206v224M208 318h272M251 244c51 35 135 35 186 0m-186 148c51-35 135-35 186 0m-45-169c-20 56-20 135 0 190m-96-190c20 56 20 135 0 190"/>',
      '<circle cx="130" cy="292" r="8" fill="#2C3642"/><path d="M113 326c22 17 46 17 67 1"/><circle cx="88" cy="218" r="12"/><circle cx="62" cy="178" r="8"/><circle cx="96" cy="151" r="6"/>',
    ],
  },
  {
    slug: 'draw-a-robot',
    version: 'v1',
    alt: 'a friendly waving robot',
    stages: [
      '<path d="M221 297h188c26 0 43 17 43 43v145c0 26-17 43-43 43H221c-26 0-43-17-43-43V340c0-26 17-43 43-43Z"/>',
      '<path d="M201 98h228c30 0 50 20 50 50v91c0 30-20 50-50 50H201c-30 0-50-20-50-50v-91c0-30 20-50 50-50Z"/><path d="M240 98 226 55m164 43 14-43"/><circle cx="222" cy="48" r="18"/><circle cx="408" cy="48" r="18"/>',
      '<path d="M178 347 95 403l-20 75m377-131 72-71 31-62M249 528v55m132-55v55M206 583h86m46 0h86"/>',
      '<circle cx="247" cy="187" r="24"/><circle cx="383" cy="187" r="24"/><path d="M274 234c27 25 55 25 82 0M315 389c-39-47-93 4 0 76 93-72 39-123 0-76Z"/><circle cx="248" cy="486" r="10"/><circle cx="382" cy="486" r="10"/>',
    ],
  },
  {
    slug: 'draw-an-excavator',
    version: 'v1',
    alt: 'a friendly excavator',
    stages: [
      '<path d="M235 438h264c45 0 75 27 75 63s-30 63-75 63H235c-45 0-75-27-75-63s30-63 75-63Z"/><path d="M247 467h240c27 0 45 14 45 34s-18 34-45 34H247c-27 0-45-14-45-34s18-34 45-34Z"/><circle cx="278" cy="501" r="24"/><circle cx="456" cy="501" r="24"/>',
      '<path d="M330 232h132c44 0 76 35 76 79v127H287V311c0-44 20-79 43-79Z"/><path d="M350 261h93c29 0 52 24 52 53v69H325v-69c0-29 11-53 25-53Z"/>',
      '<path d="M305 319 188 173l-37 31 113 180"/><path d="m188 173-79-91-37 33 79 89"/><path d="M109 82 43 73 27 161l89 26 35-18"/>',
      '<circle cx="188" cy="173" r="13"/><circle cx="151" cy="204" r="13"/><circle cx="305" cy="319" r="13"/><circle cx="380" cy="316" r="8" fill="#2C3642"/><circle cx="438" cy="316" r="8" fill="#2C3642"/><path d="M387 350c15 13 30 13 45 0m70 43h25m-25 17h25"/>',
    ],
  },
  {
    slug: 'draw-a-baby-dragon',
    version: 'v1',
    alt: 'a friendly baby dragon',
    stages: [
      '<ellipse cx="346" cy="375" rx="122" ry="132"/>',
      '<ellipse cx="214" cy="224" rx="91" ry="73"/><ellipse cx="150" cy="251" rx="54" ry="37"/><path d="M276 263c-51 30-72 70-65 123M449 393c83-14 130 23 118 81-8 38-42 62-82 65"/>',
      '<path d="M364 292c18-90 90-120 139-60l-74 105m-78-38c-30-63-78-80-112-42l63 72M277 465v75m71-50v50m70-50v50m66-75v75M253 540h48m23 0h48m22 0h48m19 0h48"/>',
      '<polygon points="174,171 163,106 208,158"/><polygon points="236,151 260,94 278,167"/><polygon points="542,501 590,480 566,528"/><path d="m431 458 20-25 20 26m27 24 20-24 19 24m-163-190 18-23 18 24"/><circle cx="183" cy="216" r="8" fill="#2C3642"/><circle cx="238" cy="210" r="8" fill="#2C3642"/><path d="M117 273c23 17 49 17 72 0"/>',
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
  const directory = join(OUTPUT_ROOT, task.slug, task.version ?? DEFAULT_VERSION);
  const stepsDirectory = join(directory, 'steps');
  const drawingStages = task.stages.slice(0, 4);
  const stepCountLabel = drawingStages.length === 3 ? 'three' : 'four';
  const completeDrawing = drawingStages.join('\n');
  mkdirSync(stepsDirectory, { recursive: true });

  writeFileSync(
    join(directory, 'ghost.svg'),
    wrapSvg(`A simple outline of ${task.alt} to trace`, completeDrawing),
  );
  writeFileSync(
    join(directory, 'reference.svg'),
    wrapSvg(`A ${stepCountLabel}-step line drawing of ${task.alt}`, completeDrawing, PAPER),
  );
  writeFileSync(
    join(directory, 'cover.svg'),
    wrapSvg(`A simple drawing idea: ${task.alt}`, completeDrawing, COVER),
  );

  drawingStages.forEach((stage, index) => {
    const previous = drawingStages.slice(0, index).join('\n');
    const activeStage = `<g stroke="${ACTIVE}" stroke-dasharray="18 12">${stage}</g>`;
    const content = [previous, activeStage].filter(Boolean).join('\n');
    writeFileSync(
      join(stepsDirectory, `${String(index + 1).padStart(2, '0')}.svg`),
      wrapSvg(`Step ${index + 1} for drawing ${task.alt}`, content, PAPER),
    );
  });
}
