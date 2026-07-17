import { api } from '@/lib/api';

export const ACADEMY_SET_SIZE = 20;
export type AcademyAnswerType = 'choice' | 'value';

type TallyTableSpec = {
  kind: 'tally_table';
  title: string;
  value_label: string;
  rows: Array<{ label: string; count: number }>;
};

type BalanceScaleSpec = {
  kind: 'balance_scale';
  left: Array<{ label: string; tone: 'mint' | 'sky' | 'sun' }>;
  right: Array<{ label: string; tone: 'mint' | 'sky' | 'sun' }>;
};

type EqualGroupsSpec = {
  kind: 'equal_groups';
  group_label: string;
  group_count: number;
  items_per_group: number;
  item_label: string;
};

export type AcademyShapeName = 'hexagon' | 'diamond' | 'triangle' | 'trapezoid';
export type AcademyShapeFill = 'outline' | 'grid' | 'solid' | 'dots';
export type AcademyShape = { shape: AcademyShapeName; fill: AcademyShapeFill };
export type AcademyPatternSymbol = 'circle' | 'star' | 'oval' | 'triangle';

type ShapeMatrixSpec = {
  kind: 'shape_matrix';
  cells: Array<Array<AcademyShape | { question: true } | null>>;
  choices: AcademyShape[];
};

type SymbolPatternSpec = {
  kind: 'symbol_pattern';
  sequence: AcademyPatternSymbol[];
  choices: AcademyPatternSymbol[][];
};

export type AcademyRenderSpec =
  | { kind: 'none' }
  | TallyTableSpec
  | {
      kind: 'number_range';
      lower: number;
      upper: number;
      lower_inclusive: boolean;
      upper_inclusive: boolean;
    }
  | BalanceScaleSpec
  | EqualGroupsSpec
  | { kind: 'coin_collection'; coins_cents: number[] }
  | ShapeMatrixSpec
  | SymbolPatternSpec
  | { kind: 'route'; from: string; to: string; label: string };

export interface AcademyQuestion {
  id: string;
  source_ref: string;
  exam: string;
  subject: string;
  year_level: string;
  variant: string;
  paper_year: number;
  q_no: number;
  answer_type: AcademyAnswerType;
  stem_text: string | null;
  options: string[] | null;
  render_ready: boolean;
  render_spec: AcademyRenderSpec;
  ac9_code: string | null;
  difficulty: string | null;
}

export interface AcademyAttemptResult {
  is_correct: boolean;
  correct_answer: string;
}

export interface AcademyProgress {
  attempts: number;
  correct: number;
  accuracy: number;
  last_attempt_at: string | null;
}

export interface AcademyProductSummary {
  id: string;
  sku: string;
  slug: string;
  title: string;
  level_key: string;
  subject_key: string;
  exam: { slug: string; title: string };
}

export interface AcademyEntitlement {
  id: string;
  status?: string;
  starts_at: string;
  ends_at: string;
  product: AcademyProductSummary & {
    sales_config?: Record<string, unknown>;
    _count?: { question_links: number };
  };
  kid?: { id: string; nickname: string };
}

export interface AcademyCatalogProduct extends Omit<AcademyProductSummary, 'exam'> {
  edition: string;
  price_aud_cents: number;
  access_days: number;
  sales_config: Record<string, unknown>;
}

export interface AcademyCatalogExam {
  slug: string;
  title: string;
  provider: string | null;
  brand_config: Record<string, unknown>;
  products: AcademyCatalogProduct[];
}

export interface AcademyPublicProduct extends AcademyCatalogProduct {
  exam: { slug: string; title: string; provider: string | null };
  _count: { question_links: number };
}

export const listMyAcademyProducts = () => api<AcademyEntitlement[]>('/academy/me/products');

export const getMyAcademyProduct = (productSlug: string) =>
  api<AcademyEntitlement>(`/academy/me/products/${productSlug}`);

export const listProductQuestions = (productSlug: string, limit = ACADEMY_SET_SIZE) =>
  api<AcademyQuestion[]>(`/academy/me/products/${productSlug}/questions?limit=${limit}`);

export const submitProductAttempt = (args: {
  productSlug: string;
  questionId: string;
  submitted: string;
  timeMs?: number;
}) =>
  api<AcademyAttemptResult>(`/academy/me/products/${args.productSlug}/attempts`, {
    method: 'POST',
    body: {
      question_id: args.questionId,
      submitted: args.submitted,
      time_ms: args.timeMs,
    },
  });

export const getProductProgress = (productSlug: string) =>
  api<AcademyProgress>(`/academy/me/products/${productSlug}/progress`);

export const getAcademyCatalog = () => api<AcademyCatalogExam[]>('/academy/catalog');

export const getAcademyProduct = (slug: string) =>
  api<AcademyPublicProduct>(`/academy/products/${slug}`);

export const listFamilyAcademyEntitlements = (familyId: string) =>
  api<AcademyEntitlement[]>(`/families/${familyId}/academy-entitlements`);

export const startAcademyCheckout = (productId: string, kidId: string) =>
  api<{ payment_intent_id: string; checkout_url: string }>('/academy/checkouts', {
    method: 'POST',
    body: { product_id: productId, kid_id: kidId },
  });

export const getAcademyOrder = (intentId: string) =>
  api<{
    status: string;
    entitlement: { id: string; status: string; ends_at: string } | null;
  }>(`/academy/orders/${intentId}`);
