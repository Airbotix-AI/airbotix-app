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
    slug: 'draw-a-first-kitten',
    version: 'v1',
    alt: 'a very simple sitting kitten',
    stages: [
      '<ellipse cx="300" cy="390" rx="105" ry="135"/>',
      '<circle cx="300" cy="225" r="115"/><polygon points="213,156 224,65 278,121"/><polygon points="387,156 376,65 322,121"/>',
      '<circle cx="258" cy="220" r="9" fill="#2C3642"/><circle cx="342" cy="220" r="9" fill="#2C3642"/><polygon points="300,247 286,258 314,258"/><path d="M300 258v14m0 0c-17 16-34 16-49 1m49-1c17 16 34 16 49 1M252 432v77m96-77v77"/>',
    ],
  },
  {
    slug: 'draw-a-first-puppy',
    version: 'v1',
    alt: 'a very simple sitting puppy',
    stages: [
      '<ellipse cx="300" cy="390" rx="105" ry="135"/>',
      '<circle cx="300" cy="220" r="115"/><path d="M203 171c-63-42-93 7-62 72 18 37 48 51 76 22M397 171c63-42 93 7 62 72-18 37-48 51-76 22"/>',
      '<circle cx="258" cy="217" r="9" fill="#2C3642"/><circle cx="342" cy="217" r="9" fill="#2C3642"/><ellipse cx="300" cy="253" rx="21" ry="15"/><path d="M300 268v13m0 0c-17 17-36 17-52 0m52 0c17 17 36 17 52 0M251 432v77m98-77v77"/>',
    ],
  },
  {
    slug: 'draw-a-first-turtle',
    version: 'v1',
    alt: 'a very simple little turtle',
    stages: [
      '<ellipse cx="330" cy="315" rx="160" ry="112"/>',
      '<circle cx="130" cy="322" r="62"/><ellipse cx="227" cy="430" rx="41" ry="62"/><ellipse cx="430" cy="430" rx="41" ry="62"/><ellipse cx="223" cy="213" rx="38" ry="54"/><ellipse cx="435" cy="213" rx="38" ry="54"/><polygon points="488,323 550,292 533,350"/>',
      '<path d="M239 250c55 34 128 34 183 0M239 379c55-34 128-34 183 0M330 205v220"/><circle cx="113" cy="310" r="8" fill="#2C3642"/><path d="M111 346c18 15 37 15 55 0"/>',
    ],
  },
  {
    slug: 'draw-a-first-whale',
    version: 'v1',
    alt: 'a very simple happy whale',
    stages: [
      '<path d="M88 331c0-109 92-184 212-184 103 0 154 47 195 116 29 48 55 65 89 50-17 75-85 126-182 126H244c-91 0-156-42-156-108Z"/>',
      '<path d="M493 263c11-78 55-112 102-71 36-42 74-22 68 29-7 55-73 75-137 51"/><ellipse cx="341" cy="413" rx="68" ry="40" transform="rotate(24 341 413)"/>',
      '<circle cx="195" cy="300" r="9" fill="#2C3642"/><path d="M184 350c28 23 58 23 87 0M290 145c-4-47 18-70 43-91m-38 91c16-46 43-59 72-69"/>',
    ],
  },
  {
    slug: 'draw-a-first-car',
    version: 'v1',
    alt: 'a very simple little car',
    stages: [
      '<path d="M79 371c5-67 45-109 116-121h277c72 10 113 52 119 121v85H79Z"/>',
      '<path d="m198 250 72-99h142l69 99M283 158v92m124-92v92"/>',
      '<circle cx="204" cy="456" r="61"/><circle cx="468" cy="456" r="61"/><circle cx="536" cy="348" r="20"/>',
    ],
  },
  {
    slug: 'draw-a-first-rocket',
    version: 'v1',
    alt: 'a very simple toy rocket',
    stages: [
      '<path d="M300 66c93 80 111 247 0 377-111-130-93-297 0-377Z"/>',
      '<circle cx="300" cy="231" r="47"/><polygon points="246,329 130,443 258,397"/><polygon points="354,329 470,443 342,397"/>',
      '<path d="M260 414c-3 65 15 108 40 142 25-34 43-77 40-142M280 434c0 39 8 68 20 89 12-21 20-50 20-89"/>',
    ],
  },
  {
    slug: 'draw-a-first-flower',
    version: 'v1',
    alt: 'a very simple five-petal flower',
    stages: [
      '<circle cx="300" cy="250" r="78"/>',
      '<ellipse cx="300" cy="105" rx="62" ry="91"/><ellipse cx="438" cy="205" rx="62" ry="91" transform="rotate(72 438 205)"/><ellipse cx="385" cy="367" rx="62" ry="91" transform="rotate(144 385 367)"/><ellipse cx="215" cy="367" rx="62" ry="91" transform="rotate(-144 215 367)"/><ellipse cx="162" cy="205" rx="62" ry="91" transform="rotate(-72 162 205)"/>',
      '<path d="M300 328v225M300 453c-54-67-110-70-151-44 27 69 85 88 151 44m0 35c54-67 110-70 151-44-27 69-85 88-151 44"/><circle cx="270" cy="242" r="8" fill="#2C3642"/><circle cx="330" cy="242" r="8" fill="#2C3642"/><path d="M272 276c19 18 37 18 56 0"/>',
    ],
  },
  {
    slug: 'draw-a-first-ice-cream',
    version: 'v1',
    alt: 'a very simple happy ice cream cone',
    stages: [
      '<polygon points="190,310 410,310 300,552"/>',
      '<path d="M168 310c-30-30-12-76 29-79-15-52 32-90 77-65 18-62 99-62 117 0 45-25 92 13 77 65 41 3 59 49 29 79Z"/>',
      '<circle cx="264" cy="248" r="9" fill="#2C3642"/><circle cx="336" cy="248" r="9" fill="#2C3642"/><path d="M270 280c20 18 40 18 60 0"/>',
    ],
  },
  {
    slug: 'draw-a-first-bird',
    version: 'v1',
    alt: 'a very simple little bird',
    stages: [
      '<ellipse cx="320" cy="350" rx="145" ry="112"/>',
      '<circle cx="205" cy="268" r="82"/><ellipse cx="344" cy="356" rx="70" ry="48" transform="rotate(-18 344 356)"/><polygon points="120,268 58,296 123,319"/><polygon points="450,350 535,302 508,390"/>',
      '<circle cx="184" cy="253" r="9" fill="#2C3642"/><path d="M252 451v54m126-54v54M226 505h50m76 0h50"/>',
    ],
  },
  {
    slug: 'draw-a-first-frog',
    version: 'v1',
    alt: 'a very simple friendly frog',
    stages: [
      '<ellipse cx="300" cy="376" rx="145" ry="116"/>',
      '<circle cx="300" cy="266" r="112"/><circle cx="238" cy="181" r="42"/><circle cx="362" cy="181" r="42"/><ellipse cx="143" cy="421" rx="73" ry="44" transform="rotate(-18 143 421)"/><ellipse cx="457" cy="421" rx="73" ry="44" transform="rotate(18 457 421)"/>',
      '<circle cx="238" cy="181" r="9" fill="#2C3642"/><circle cx="362" cy="181" r="9" fill="#2C3642"/><path d="M257 306c27 25 59 25 86 0"/><path d="M235 416v91h-68m198-91v91h68"/>',
    ],
  },
  {
    slug: 'draw-a-first-bee',
    version: 'v1',
    alt: 'a very simple happy bumblebee',
    stages: [
      '<ellipse cx="300" cy="340" rx="155" ry="105"/>',
      '<ellipse cx="240" cy="215" rx="65" ry="82" transform="rotate(-28 240 215)"/><ellipse cx="360" cy="215" rx="65" ry="82" transform="rotate(28 360 215)"/><polygon points="448,340 530,300 530,380"/><path d="M255 245v190M345 245v190"/>',
      '<circle cx="224" cy="324" r="9" fill="#2C3642"/><circle cx="276" cy="324" r="9" fill="#2C3642"/><path d="M228 356c18 17 38 17 56 0M220 253c-18-58-54-75-82-72m242 72c18-58 54-75 82-72"/>',
    ],
  },
  {
    slug: 'draw-a-first-crab',
    version: 'v1',
    alt: 'a very simple friendly crab',
    stages: [
      '<ellipse cx="300" cy="350" rx="154" ry="105"/>',
      '<path d="M159 323c-79-67-123-25-94 40 22 49 74 39 103 2"/><path d="M441 323c79-67 123-25 94 40-22 49-74 39-103 2"/><path d="M174 395 91 443m105-19-65 77M426 395l83 48m-105-19 65 77"/>',
      '<path d="M245 260v-58m110 58v-58"/><circle cx="245" cy="190" r="11" fill="#2C3642"/><circle cx="355" cy="190" r="11" fill="#2C3642"/><path d="M255 358c28 25 62 25 90 0"/>',
    ],
  },
  {
    slug: 'draw-a-first-sailboat',
    version: 'v1',
    alt: 'a very simple little sailboat',
    stages: [
      '<path d="M106 407h388l-69 105H175Z"/>',
      '<path d="M300 120v287"/><polygon points="286,146 286,365 125,365"/><polygon points="314,174 314,365 470,365"/>',
      '<path d="M91 543c64-34 128-34 192 0 64 34 128 34 192 0"/><circle cx="258" cy="452" r="8" fill="#2C3642"/><circle cx="342" cy="452" r="8" fill="#2C3642"/><path d="M268 479c20 17 44 17 64 0"/>',
    ],
  },
  {
    slug: 'draw-a-first-rainbow',
    version: 'v1',
    alt: 'a very simple bright rainbow',
    stages: [
      '<path d="M115 391c0-143 83-243 185-243s185 100 185 243"/>',
      '<path d="M155 391c0-114 65-194 145-194s145 80 145 194"/><path d="M195 391c0-85 47-145 105-145s105 60 105 145"/><path d="M235 391c0-56 29-96 65-96s65 40 65 96"/><path d="M49 416c0-47 56-65 83-31 26-34 82-16 82 31 0 33-27 58-61 58H110c-34 0-61-25-61-58Z"/><path d="M386 416c0-47 56-65 82-31 27-34 83-16 83 31 0 33-27 58-61 58h-43c-34 0-61-25-61-58Z"/>',
      '<circle cx="105" cy="418" r="7" fill="#2C3642"/><circle cx="151" cy="418" r="7" fill="#2C3642"/><path d="M111 442c11 10 23 10 34 0"/><circle cx="449" cy="418" r="7" fill="#2C3642"/><circle cx="495" cy="418" r="7" fill="#2C3642"/><path d="M455 442c11 10 23 10 34 0"/>',
    ],
  },
  {
    slug: 'draw-a-first-cupcake',
    version: 'v1',
    alt: 'a very simple happy cupcake',
    stages: [
      '<polygon points="180,336 420,336 390,540 210,540"/>',
      '<path d="M176 336c-29-31-10-74 31-75-16-51 32-88 76-62 17-57 83-57 100 0 44-26 92 11 76 62 41 1 60 44 31 75Z"/><path d="M267 176c0-48 66-80 99-33 28 40-8 83-66 91-21-14-33-33-33-58Z"/><path d="M295 159c14-36 43-52 81-47"/>',
      '<circle cx="265" cy="286" r="9" fill="#2C3642"/><circle cx="335" cy="286" r="9" fill="#2C3642"/><path d="M270 315c20 18 40 18 60 0M255 361l-16 153m61-153v153m45-153 16 153"/>',
    ],
  },
  {
    slug: 'draw-a-first-house',
    version: 'v1',
    alt: 'a very simple little house',
    stages: [
      '<polygon points="148,278 452,278 452,518 148,518"/>',
      '<polygon points="105,278 300,104 495,278"/><polygon points="265,388 335,388 335,518 265,518"/><polygon points="175,326 245,326 245,396 175,396"/><polygon points="355,326 425,326 425,396 355,396"/>',
      '<polygon points="385,176 435,176 435,260 385,260"/><circle cx="315" cy="452" r="7" fill="#2C3642"/><circle cx="102" cy="438" r="35"/><path d="M102 473v62m0-33-34-23m34 23 34-23"/>',
    ],
  },
  {
    slug: 'draw-a-first-jellyfish',
    version: 'v1',
    alt: 'a very simple happy jellyfish',
    stages: [
      '<path d="M135 310c0-104 74-182 165-182s165 78 165 182Z"/>',
      '<path d="M135 310c32 38 66 38 99 0 32 38 66 38 99 0 32 38 66 38 99 0 11 13 22 20 33 20"/><path d="M185 332c-26 72-26 133 0 184M260 332c-18 72-18 133 0 184M340 332c18 72 18 133 0 184M415 332c26 72 26 133 0 184"/>',
      '<circle cx="252" cy="248" r="9" fill="#2C3642"/><circle cx="348" cy="248" r="9" fill="#2C3642"/><path d="M262 280c24 22 52 22 76 0"/><circle cx="213" cy="286" r="14"/><circle cx="387" cy="286" r="14"/>',
    ],
  },
  {
    slug: 'draw-a-first-octopus',
    version: 'v1',
    alt: 'a very simple friendly octopus',
    stages: [
      '<path d="M170 302c0-94 58-168 130-168s130 74 130 168c0 44-12 76-35 104H205c-23-28-35-60-35-104Z"/>',
      '<path d="M205 397c-71 6-101 52-66 90 31 33 80 1 94-66M250 404c-54 34-65 91-20 113 39 19 71-27 70-92M285 410c-25 55-8 108 40 103 42-5 51-56 25-103M350 404c54 34 65 91 20 113M395 397c71 6 101 52 66 90M178 423c-58-14-99 12-89 57M422 423c58-14 99 12 89 57M300 420c0 49 18 78 49 89"/>',
      '<circle cx="252" cy="278" r="10" fill="#2C3642"/><circle cx="348" cy="278" r="10" fill="#2C3642"/><path d="M258 318c27 25 57 25 84 0"/>',
    ],
  },
  {
    slug: 'draw-a-first-bow-tie',
    version: 'v1',
    alt: 'a very simple bow tie',
    stages: [
      '<polygon points="260,255 340,255 340,345 260,345"/>',
      '<path d="M260 272C188 187 83 195 76 300c7 105 112 113 184 28Z"/><path d="M340 272c72-85 177-77 184 28-7 105-112 113-184 28Z"/>',
      '<path d="M260 276 171 232M260 324l-89 44M340 276l89-44M340 324l89 44"/><circle cx="145" cy="282" r="10"/><circle cx="455" cy="282" r="10"/>',
    ],
  },
  {
    slug: 'draw-a-first-sunflower',
    version: 'v1',
    alt: 'a very simple happy sunflower',
    stages: [
      '<circle cx="300" cy="246" r="92"/>',
      '<ellipse cx="300" cy="92" rx="56" ry="92"/><ellipse cx="428" cy="168" rx="56" ry="92" transform="rotate(60 428 168)"/><ellipse cx="428" cy="324" rx="56" ry="92" transform="rotate(120 428 324)"/><ellipse cx="300" cy="400" rx="56" ry="92"/><ellipse cx="172" cy="324" rx="56" ry="92" transform="rotate(-120 172 324)"/><ellipse cx="172" cy="168" rx="56" ry="92" transform="rotate(-60 172 168)"/>',
      '<polygon points="284,492 316,492 316,528 430,500 453,552 316,540 316,576 284,576 284,540 147,552 170,500 284,528"/><circle cx="264" cy="232" r="9" fill="#2C3642"/><circle cx="336" cy="232" r="9" fill="#2C3642"/><path d="M270 271c20 18 40 18 60 0"/>',
    ],
  },
  {
    slug: 'draw-a-first-apple',
    version: 'v1',
    alt: 'a very simple happy apple',
    stages: [
      '<path d="M300 191c-67-55-176-15-188 112-14 146 92 249 188 249s202-103 188-249c-12-127-121-167-188-112Z"/>',
      '<path d="M300 194c-3-73 25-117 76-132"/><ellipse cx="397" cy="112" rx="75" ry="38" transform="rotate(-28 397 112)"/>',
      '<circle cx="256" cy="337" r="10" fill="#2C3642"/><circle cx="344" cy="337" r="10" fill="#2C3642"/><path d="M262 378c24 22 52 22 76 0"/>',
    ],
  },
  {
    slug: 'draw-a-first-donut',
    version: 'v1',
    alt: 'a very simple happy donut',
    stages: [
      '<circle cx="300" cy="300" r="210"/>',
      '<circle cx="300" cy="268" r="76"/><path d="M102 314c35 39 73 34 105 5 36 42 77 39 108 2 36 40 75 38 108 1 27 29 56 34 85 10"/>',
      '<circle cx="250" cy="392" r="9" fill="#2C3642"/><circle cx="350" cy="392" r="9" fill="#2C3642"/><path d="M260 427c24 22 56 22 80 0M160 198l24 18m39-62 13 27m147-26-17 27m65 44-29 9"/>',
    ],
  },
  {
    slug: 'draw-a-first-hot-air-balloon',
    version: 'v1',
    alt: 'a very simple hot-air balloon',
    stages: [
      '<path d="M300 70c126 0 205 88 181 205-14 68-71 122-119 164H238c-48-42-105-96-119-164C95 158 174 70 300 70Z"/>',
      '<path d="M238 439v62m124-62v62"/><polygon points="225,501 375,501 352,570 248,570"/>',
      '<path d="M300 70c-63 78-74 237-28 369M300 70c63 78 74 237 28 369"/><circle cx="268" cy="257" r="9" fill="#2C3642"/><circle cx="332" cy="257" r="9" fill="#2C3642"/><path d="M274 292c17 16 35 16 52 0"/>',
    ],
  },
  {
    slug: 'draw-a-first-train',
    version: 'v1',
    alt: 'a very simple little train',
    stages: [
      '<path d="M140 280h260c62 0 105 43 105 105v88H140Z"/>',
      '<polygon points="105,168 290,168 290,473 105,473"/><polygon points="380,175 450,175 450,282 380,282"/><circle cx="470" cy="340" r="66"/>',
      '<circle cx="175" cy="473" r="64"/><circle cx="315" cy="473" r="64"/><circle cx="455" cy="473" r="64"/><path d="M414 168c0-57 43-79 82-54m-35-42c0-37 29-55 60-39"/><circle cx="450" cy="326" r="8" fill="#2C3642"/><circle cx="490" cy="326" r="8" fill="#2C3642"/><path d="M449 356c15 14 27 14 42 0"/>',
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
