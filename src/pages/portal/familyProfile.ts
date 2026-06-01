/**
 * Shared option maps for the analytics-relevant family profile fields.
 * Mirrors the platform-backend enums (commit 7dd90e1):
 *   - acquisition_source: organic|search_ads|social_media|referral|school|event|word_of_mouth|other
 *   - preferred_language: "en" | "zh"
 * Reused by both onboarding (RegisterPage) and settings (SettingsPage).
 */

export const AU_STATES = ['NSW', 'VIC', 'QLD', 'SA', 'WA', 'TAS', 'ACT', 'NT'] as const;
export type AuState = (typeof AU_STATES)[number];

/** Backend enum values for `acquisition_source`. */
export const ACQUISITION_SOURCES = [
  'search_ads',
  'social_media',
  'referral',
  'school',
  'event',
  'word_of_mouth',
  'organic',
  'other',
] as const;
export type AcquisitionSource = (typeof ACQUISITION_SOURCES)[number];

/** Friendly, parent-facing labels for the "How did you hear about us?" select. */
export const ACQUISITION_SOURCE_LABELS: Record<AcquisitionSource, string> = {
  search_ads: 'Search',
  social_media: 'Social media',
  referral: 'A friend / referral',
  school: "My child's school",
  event: 'An event',
  word_of_mouth: 'Word of mouth',
  organic: 'Just found you online',
  other: 'Other',
};

export const PREFERRED_LANGUAGES = ['en', 'zh'] as const;
export type PreferredLanguage = (typeof PREFERRED_LANGUAGES)[number];

export const PREFERRED_LANGUAGE_LABELS: Record<PreferredLanguage, string> = {
  en: 'English',
  zh: '中文',
};

/** Best-effort default language from the browser locale; falls back to 'en'. */
export function detectPreferredLanguage(): PreferredLanguage {
  if (typeof navigator !== 'undefined' && navigator.language?.toLowerCase().startsWith('zh')) {
    return 'zh';
  }
  return 'en';
}
