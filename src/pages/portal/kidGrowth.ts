/**
 * Growth-report helpers for the parent surface.
 *
 * Turns the raw usage analytics (`KidUsageDetail` + daily `UsageTrendPoint[]`,
 * the same endpoints the usage dashboard already uses) into a warm, parent-
 * friendly "how is my kid growing?" story — NOT another metrics dashboard.
 *
 * Pure functions only (no React, no fetch) so they stay unit-testable and so
 * both the family list teaser and the full growth page derive identical numbers.
 */
import type { KidUsageDetail, UsageTrendPoint } from './walletTypes';

/** How many days the growth report looks back over. */
export const GROWTH_WINDOW_DAYS = 28;

/** Friendly name + emoji for each creative studio (task_type). */
export interface StudioMeta {
  emoji: string;
  label: string;
  /** What the kid actually makes there — used in narrative copy. */
  noun: string;
}

const STUDIOS: Record<string, StudioMeta> = {
  image: { emoji: '🎨', label: 'Image studio', noun: 'pictures' },
  music: { emoji: '🎵', label: 'Music studio', noun: 'songs' },
  voice: { emoji: '🎙️', label: 'Voice booth', noun: 'voices' },
  video: { emoji: '🎬', label: 'Video studio', noun: 'videos' },
  code: { emoji: '💻', label: 'Code lab', noun: 'programs' },
  game: { emoji: '🎮', label: 'Game studio', noun: 'games' },
  chat: { emoji: '💬', label: 'Chat', noun: 'conversations' },
  mission: { emoji: '🚀', label: 'Missions', noun: 'missions' },
};

export function studioMeta(key: string): StudioMeta {
  return (
    STUDIOS[key.toLowerCase()] ?? {
      emoji: '✨',
      label: key.charAt(0).toUpperCase() + key.slice(1),
      noun: 'creations',
    }
  );
}

/**
 * Longest run of consecutive active days ending on the most recent day in the
 * series — the kid's current streak. We read from the tail of the trend.
 */
export function currentStreak(trend: UsageTrendPoint[]): number {
  let streak = 0;
  for (let i = trend.length - 1; i >= 0; i -= 1) {
    if (trend[i].value > 0) streak += 1;
    else break;
  }
  return streak;
}

/** Total number of days with any activity in the window. */
export function activeDays(trend: UsageTrendPoint[]): number {
  return trend.filter((p) => p.value > 0).length;
}

export interface FavouriteStudio extends StudioMeta {
  key: string;
  requests: number;
}

/** The studio the kid reached for most, by number of creations. */
export function favouriteStudio(detail: KidUsageDetail): FavouriteStudio | null {
  const entries = Object.entries(detail.by_task_type ?? {});
  if (entries.length === 0) return null;
  const [key, v] = entries.reduce((best, cur) => (cur[1].requests > best[1].requests ? cur : best));
  if (!v.requests) return null;
  return { key, requests: v.requests, ...studioMeta(key) };
}

/** Number of distinct studios the kid has tried. */
export function studiosTried(detail: KidUsageDetail): number {
  return Object.values(detail.by_task_type ?? {}).filter((v) => v.requests > 0).length;
}

export interface GrowthSummary {
  /** Things the kid made (AI creations). */
  creations: number;
  /** Minutes spent exploring, rounded. */
  minutes: number;
  /** Distinct learning sessions / sit-downs. */
  sessions: number;
  activeDays: number;
  streak: number;
  studiosTried: number;
  favourite: FavouriteStudio | null;
  /** True when there is genuinely nothing to celebrate yet. */
  isEmpty: boolean;
}

export function summarize(
  detail: KidUsageDetail | undefined | null,
  trend: UsageTrendPoint[] | undefined | null,
): GrowthSummary {
  const t = trend ?? [];
  const creations = detail?.requests ?? 0;
  return {
    creations,
    minutes: Math.round((detail?.active_seconds ?? 0) / 60),
    sessions: detail?.sessions ?? 0,
    activeDays: activeDays(t),
    streak: currentStreak(t),
    studiosTried: detail ? studiosTried(detail) : 0,
    favourite: detail ? favouriteStudio(detail) : null,
    isEmpty: creations === 0 && (detail?.sessions ?? 0) === 0,
  };
}

/**
 * One warm sentence summing up the window — the headline of the report.
 * Falls back to an encouraging line when there's nothing yet.
 */
export function growthHeadline(name: string, s: GrowthSummary): string {
  if (s.isEmpty) {
    return name + " hasn't started creating yet — their first picture, song, or story is just one sign-in away.";
  }
  const bits: string[] = [];
  bits.push(name + ' made ' + s.creations + ' thing' + (s.creations === 1 ? '' : 's') + ' with AI');
  if (s.favourite) bits.push('mostly ' + s.favourite.noun + ' in the ' + s.favourite.label);
  if (s.streak >= 2) bits.push('and is on a ' + s.streak + '-day streak 🔥');
  else if (s.activeDays >= 2) bits.push('across ' + s.activeDays + ' active days');
  return bits.join(', ').replace(', and', ' and') + '.';
}
