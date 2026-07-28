export const TINY_STAR_ASSET_ROOT = '/story-blocks/tiny-star-village'

export interface TinyStarCharacterChoice {
  emoji: string
  name: string
  asset: string
  previewAssets: readonly string[]
}

export const TINY_STAR_CHARACTER_CHOICES: readonly TinyStarCharacterChoice[] = [
  {
    emoji: '⭐',
    name: 'Lumilo',
    asset: `${TINY_STAR_ASSET_ROOT}/characters/little-light/resting-calm-v01.png`,
    previewAssets: [
      `${TINY_STAR_ASSET_ROOT}/characters/little-light/resting-calm-v01.png`,
      `${TINY_STAR_ASSET_ROOT}/characters/little-light/hop-joyful-v01.png`,
      `${TINY_STAR_ASSET_ROOT}/characters/little-light/greeting-friendly-v01.png`,
      `${TINY_STAR_ASSET_ROOT}/characters/little-light/success-joyful-v01.png`,
    ],
  },
  {
    emoji: '🐻',
    name: 'Tuan Tuan',
    asset: `${TINY_STAR_ASSET_ROOT}/characters/cloud-bear/resting-happy-v01.png`,
    previewAssets: [
      `${TINY_STAR_ASSET_ROOT}/characters/cloud-bear/resting-happy-v01.png`,
      `${TINY_STAR_ASSET_ROOT}/characters/cloud-bear/walk-left-v01.png`,
      `${TINY_STAR_ASSET_ROOT}/characters/cloud-bear/walk-right-v01.png`,
      `${TINY_STAR_ASSET_ROOT}/characters/cloud-bear/greeting-friendly-v01.png`,
      `${TINY_STAR_ASSET_ROOT}/characters/cloud-bear/success-joyful-v01.png`,
    ],
  },
  {
    emoji: '🐱',
    name: 'Dot Dot',
    asset: `${TINY_STAR_ASSET_ROOT}/characters/dot-dot/standing-calm-v01.png`,
    previewAssets: [
      `${TINY_STAR_ASSET_ROOT}/characters/dot-dot/standing-calm-v01.png`,
      `${TINY_STAR_ASSET_ROOT}/characters/dot-dot/success-joyful-v01.png`,
    ],
  },
  {
    emoji: '🚙',
    name: 'Breakfast Cart',
    asset: `${TINY_STAR_ASSET_ROOT}/props/breakfast-cart-right-v01.png`,
    previewAssets: [
      `${TINY_STAR_ASSET_ROOT}/props/breakfast-cart-left-v01.png`,
      `${TINY_STAR_ASSET_ROOT}/props/breakfast-cart-right-v01.png`,
    ],
  },
  {
    emoji: '🔔',
    name: 'Morning Bell',
    asset: `${TINY_STAR_ASSET_ROOT}/props/morning-bell-still-v01.png`,
    previewAssets: [
      `${TINY_STAR_ASSET_ROOT}/props/morning-bell-still-v01.png`,
      `${TINY_STAR_ASSET_ROOT}/props/morning-bell-swing-v01.png`,
    ],
  },
]

export const TINY_STAR_WORKBENCH_SCENES = [
  {
    id: 'tsv-choice-workbench-lavender',
    label: 'Star workbench · lavender',
    emoji: '💜',
    asset: `${TINY_STAR_ASSET_ROOT}/backgrounds/choice-workbench-lavender-v01.webp`,
  },
  {
    id: 'tsv-choice-workbench-teal',
    label: 'Star workbench · teal',
    emoji: '🩵',
    asset: `${TINY_STAR_ASSET_ROOT}/backgrounds/choice-workbench-teal-v01.webp`,
  },
  {
    id: 'tsv-choice-workbench-amber',
    label: 'Star workbench · amber',
    emoji: '🧡',
    asset: `${TINY_STAR_ASSET_ROOT}/backgrounds/choice-workbench-amber-v01.webp`,
  },
] as const

export const TINY_STAR_PLAZA_ASSETS = {
  progress: `${TINY_STAR_ASSET_ROOT}/backgrounds/plaza-progress-0-v01.webp`,
  complete: `${TINY_STAR_ASSET_ROOT}/backgrounds/plaza-progress-6-v01.webp`,
} as const

export const TINY_STAR_SHARED_ASSET_PATHS = [
  ...TINY_STAR_CHARACTER_CHOICES.flatMap((choice) => choice.previewAssets),
  ...TINY_STAR_WORKBENCH_SCENES.map((scene) => scene.asset),
  ...Object.values(TINY_STAR_PLAZA_ASSETS),
] as const
