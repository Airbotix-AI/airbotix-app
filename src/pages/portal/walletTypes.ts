// Wallet v0.2 types — auto-topup + payment methods + usage.
// Typed against platform-backend-api-spec.md §4.2 (Wallet/PaymentMethod) +
// §5.4 (auto-topup / payment-methods) + §5.13 (usage analytics) and
// parent-portal-prd.md §4.4.1 / §4.9.

export type AutoTopupSku = 'starter_10' | 'family_30' | 'mega_50';

export interface AutoTopupConfig {
  auto_topup_enabled: boolean;
  auto_topup_threshold_stars: number; // 5 / 10 / 20 / 50
  auto_topup_sku: AutoTopupSku | null;
  auto_topup_payment_method_id: string | null;
  auto_topup_daily_cap_aud_cents: number; // max 10000 (A$100)
  auto_topup_monthly_cap_aud_cents: number; // max 50000 (A$500)
  auto_topup_failure_threshold: number; // 1-5
  email_on_charge?: boolean;
  phone_verified?: boolean;
  recent_attempts?: AutoTopupAttempt[];
}

export interface AutoTopupAttempt {
  id: string;
  status: 'skipped' | 'pending' | 'succeeded' | 'failed';
  amount_aud_cents: number;
  stars_credited: number | null;
  reason: string | null; // failure / skip reason
  payment_method_label: string | null;
  created_at: string;
}

export interface PaymentMethod {
  id: string;
  brand: string; // 'visa' | 'mastercard' | ...
  last4: string;
  exp_month: number;
  exp_year: number;
  status: 'active' | 'expired' | 'removed';
  is_default: boolean;
}

export interface SetupIntentResponse {
  client_secret: string;
  setup_intent_id: string;
  // The Airwallex env / customer id the browser SDK needs to tokenize.
  airwallex_env?: 'demo' | 'prod';
  customer_id?: string;
}

/**
 * Body for confirming a tokenized card with the backend after the Airwallex
 * Components SDK creates the payment consent (§5.4 / MIT §5.10). The PAN never
 * reaches us — only the tokenized ids + consent reference.
 */
export interface ConfirmCardBody {
  setup_intent_id: string;
  payment_consent_id?: string;
  airwallex_pm_id?: string;
}

// ── Usage analytics (§5.13) ────────────────────────────────────────────────

export interface UsageSummary {
  range: '24h' | '7d' | '28d';
  total_stars: number;
  total_requests: number;
  total_tokens: number;
  wow_delta_pct: number | null; // week-over-week
  top_model: string | null;
  top_kid: { kid_id: string; nickname: string; stars: number } | null;
}

export interface KidUsageRollup {
  kid_id: string;
  nickname: string;
  stars: number;
  requests: number;
  active_seconds: number;
  flagged_count: number;
}

export interface FamilyUsage {
  from: string;
  to: string;
  total_stars: number;
  total_requests: number;
  total_tokens_in: number;
  total_tokens_out: number;
  by_kid: KidUsageRollup[];
}

export interface KidUsageDetail {
  kid_id: string;
  nickname: string;
  from: string;
  to: string;
  tokens_in: number;
  tokens_out: number;
  stars: number;
  requests: number;
  sessions: number;
  active_seconds: number;
  flagged_count: number;
  approvals_asked: number;
  approvals_granted: number;
  by_task_type: Record<string, { requests: number; stars: number; tokens?: number }>;
  by_model: Record<string, { calls: number; stars: number }>;
  by_project: Record<string, { stars: number; requests: number }>;
}

export interface UsageTrendPoint {
  local_date: string;
  value: number;
}

// ── Shared constants (parent-portal-prd §4.4.1 decision table) ─────────────

export const THRESHOLD_OPTIONS = [5, 10, 20, 50] as const;

export const AUTO_TOPUP_SKUS: Array<{ sku: AutoTopupSku; label: string; price_aud: number; stars: number }> = [
  { sku: 'starter_10', label: 'Starter', price_aud: 10, stars: 100 },
  { sku: 'family_30', label: 'Family', price_aud: 30, stars: 350 },
  { sku: 'mega_50', label: 'Mega', price_aud: 50, stars: 650 },
];

export const DAILY_CAP_OPTIONS_CENTS = [1000, 3000, 5000, 10000] as const; // A$10–100
export const MONTHLY_CAP_OPTIONS_CENTS = [5000, 10000, 20000, 50000] as const; // A$50–500
export const FAILURE_THRESHOLD_OPTIONS = [1, 2, 3, 4, 5] as const;

export function aud(cents: number): string {
  return `A$${(cents / 100).toFixed(0)}`;
}
