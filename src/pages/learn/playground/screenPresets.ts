/**
 * Screen presets for the Game Runner window's preset dropdown (spec §5).
 *
 * Each preset fixes the stage dimensions the running game is sized to (FIT).
 * `id`s are stable kebab-case keys used as `<select>` values and store state.
 */

export interface ScreenPreset {
  id: string
  label: string
  w: number
  h: number
}

export const SCREEN_PRESETS: ScreenPreset[] = [
  { id: 'original', label: 'Original — 754 × 533', w: 754, h: 533 },
  { id: 'iphone', label: 'iPhone — 390 × 844', w: 390, h: 844 },
  { id: 'iphone-landscape', label: 'iPhone (landscape) — 844 × 390', w: 844, h: 390 },
  { id: 'ipad', label: 'iPad — 768 × 1024', w: 768, h: 1024 },
  { id: 'ipad-landscape', label: 'iPad (landscape) — 1024 × 768', w: 1024, h: 768 },
  { id: '720p', label: '720p — 1280 × 720', w: 1280, h: 720 },
  { id: '1080p', label: '1080p — 1920 × 1080', w: 1920, h: 1080 },
]
