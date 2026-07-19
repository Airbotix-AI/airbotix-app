import { useMemo, useSyncExternalStore } from 'react';
import { useQuery } from '@tanstack/react-query';

import { useMe } from '@/auth/useAuth';
import { api } from '@/lib/api';
import {
  EMPTY_FLAGS_SNAPSHOT,
  clearOnboardingFlag,
  parseFlagsSnapshot,
  readFlagsSnapshot,
  setOnboardingFlag,
  subscribeOnboardingFlags,
} from '@/lib/onboardingStorage';
import type { AutoTopupConfig, PaymentMethod } from '../walletTypes';
import { computeOnboardingState, type OnboardingInputs, type OnboardingState } from './onboardingState';

interface WalletSummary {
  stars_balance: number;
  daily_used: number;
  daily_cap: number;
}

interface KidSummary {
  id: string;
  nickname: string;
}

/** Reactive read of the per-parent onboarding localStorage flags. */
function useOnboardingFlags(sub: string) {
  const snapshot = useSyncExternalStore(
    subscribeOnboardingFlags,
    () => readFlagsSnapshot(sub),
    () => EMPTY_FLAGS_SNAPSHOT,
  );
  return useMemo(() => parseFlagsSnapshot(snapshot), [snapshot]);
}

export interface UseOnboardingState {
  state: OnboardingState;
  /** core queries settled — gate rendering to avoid completion flicker */
  isReady: boolean;
  hasFamily: boolean;
  kidName: string;
  familyId: string | null;
  sub: string;
  welcomeSeen: boolean;
  checklistDismissed: boolean;
  markWelcomeSeen: () => void;
  markKidLoginShown: () => void;
  markLimitsReviewed: () => void;
  markGuidesBrowsed: () => void;
  dismissChecklist: () => void;
  /** clears welcomeSeen so the wizard shows again (Settings → Replay intro) */
  replayWelcome: () => void;
}

/**
 * Adapter that composes the parent identity + the existing family/wallet/payment
 * queries + localStorage flags into the pure onboarding state. Reuses the exact
 * query keys other portal pages use so the cache dedupes (no extra requests when
 * the parent has already visited Wallet / Family).
 */
export function useOnboardingState(): UseOnboardingState {
  const me = useMe();
  const user = me.data?.kind === 'user' ? me.data : null;
  const sub = user?.sub ?? '';
  const familyId = user?.family_id ?? null;
  const hasFamily = familyId !== null && familyId !== undefined;

  const flags = useOnboardingFlags(sub);

  const kids = useQuery<KidSummary[]>({
    queryKey: ['family', familyId, 'kids'],
    queryFn: () => api<KidSummary[]>(`/families/${familyId}/kids`),
    enabled: hasFamily,
  });
  const wallet = useQuery<WalletSummary>({
    queryKey: ['wallet', familyId],
    queryFn: () => api<WalletSummary>(`/families/${familyId}/wallet`),
    enabled: hasFamily,
    retry: false, // a brand-new family may 404 — treat as "no stars yet", don't hammer
  });
  const paymentMethods = useQuery<PaymentMethod[]>({
    queryKey: ['family', familyId, 'payment-methods'],
    queryFn: () => api<PaymentMethod[]>(`/families/${familyId}/payment-methods`),
    enabled: hasFamily,
    retry: false,
  });
  const autoTopup = useQuery<AutoTopupConfig>({
    queryKey: ['wallet', familyId, 'auto-topup'],
    queryFn: () => api<AutoTopupConfig>(`/families/${familyId}/wallet/auto-topup`),
    enabled: hasFamily,
    retry: false,
  });

  const inputs: OnboardingInputs = {
    hasFamily,
    kidCount: kids.data?.length ?? 0,
    starsBalance: wallet.data?.stars_balance ?? null,
    paymentMethodCount: paymentMethods.data?.length ?? 0,
    autoTopupEnabled: autoTopup.data?.auto_topup_enabled ?? false,
    kidLoginShown: flags.kidLoginShown,
    limitsReviewed: flags.limitsReviewed,
    guidesBrowsed: flags.guidesBrowsed,
  };

  const state = computeOnboardingState(inputs);

  // Gate on the kids query SUCCEEDING (not merely not-loading): an errored /kids
  // fetch must not degrade a registered family to an empty checklist. Wallet /
  // payment-methods are allowed to error (treated as "not topped up yet").
  const coreSettled = kids.isSuccess && !wallet.isLoading && !paymentMethods.isLoading;
  const isReady = hasFamily && !!sub && coreSettled;

  const kidName = kids.data?.[0]?.nickname ?? 'your child';

  return {
    state,
    isReady,
    hasFamily,
    kidName,
    familyId,
    sub,
    welcomeSeen: flags.welcomeSeen,
    checklistDismissed: flags.checklistDismissed,
    markWelcomeSeen: () => setOnboardingFlag(sub, 'welcomeSeen'),
    markKidLoginShown: () => setOnboardingFlag(sub, 'kidLoginShown'),
    markLimitsReviewed: () => setOnboardingFlag(sub, 'limitsReviewed'),
    markGuidesBrowsed: () => setOnboardingFlag(sub, 'guidesBrowsed'),
    dismissChecklist: () => setOnboardingFlag(sub, 'checklistDismissed'),
    replayWelcome: () => clearOnboardingFlag(sub, 'welcomeSeen'),
  };
}
