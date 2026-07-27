import { api } from '@/lib/api';

export const ACADEMY_SET_SIZE = 20;
export type AcademyAnswerType =
  | 'choice'
  | 'multi_choice'
  | 'value'
  | 'multi_value'
  | 'expression'
  | 'worked'
  | 'extended';
export type AcademyValueInputsSpec = {
  count: number;
  separator?: string;
  suffixes?: string[];
};

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

type AnalogClockSpec = {
  kind: 'analog_clock';
  hour: number;
  minute: number;
};

type SolidShapeSpec = {
  kind: 'solid_shape';
  shape: 'triangular_prism';
};

export type AcademyTilePattern =
  | 'solid'
  | 'diagonal_upper_left'
  | 'diagonal_lower_left'
  | 'vertical_left'
  | 'vertical_right'
  | 'horizontal_top'
  | 'horizontal_middle'
  | 'horizontal_bottom';

export type AcademyShellKind = 'fan' | 'spiral' | 'conch' | 'spotted';

type ScheduleTableSpec = {
  kind: 'schedule_table';
  title: string;
  columns: string[];
  rows: string[][];
};

type JoinedSolidsSpec = {
  kind: 'joined_solids';
  solids: ['cone', 'cylinder'];
};

type SideViewModelSpec = {
  kind: 'side_view_model';
};

type TileRotationSpec = {
  kind: 'tile_rotation';
  turn: 'clockwise';
  start: AcademyTilePattern[];
  choices: AcademyTilePattern[][];
};

type SymmetryGridSpec = {
  kind: 'symmetry_grid';
  columns: string[];
  rows: number[];
  axis_after_column: string;
  eye_cell: string;
};

type FractionShapesSpec = {
  kind: 'fraction_shapes';
  choices: ['sixth', 'half', 'third', 'quarter'];
};

type ShellBagsSpec = {
  kind: 'shell_bags';
  bags: AcademyShellKind[][];
  choices: AcademyShellKind[][];
};

type PyramidFacesSpec = {
  kind: 'pyramid_faces';
  square_faces: number;
  triangular_faces: number;
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
  | { kind: 'none'; value_inputs?: AcademyValueInputsSpec }
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
  | AnalogClockSpec
  | SolidShapeSpec
  | ScheduleTableSpec
  | JoinedSolidsSpec
  | SideViewModelSpec
  | TileRotationSpec
  | SymmetryGridSpec
  | FractionShapesSpec
  | ShellBagsSpec
  | PyramidFacesSpec
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
  marks: number | null;
  section: string | null;
  stimulus_id: string | null;
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

export interface AcademyTutorResult {
  explanation: string;
  model: string;
  stars_charged: 0;
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

export interface AcademyPaperSummary {
  id: string;
  title: string;
  mode: 'fixed' | 'blueprint';
  time_limit_minutes: number;
  _count: { questions: number };
}

export interface AcademySessionSummary {
  id: string;
  status: 'submitted' | 'self_graded';
  started_at: string;
  submitted_at: string | null;
  completed_at: string | null;
  paper: { id: string; title: string } | null;
}

export interface AcademyEntitlement {
  id: string;
  status?: string;
  starts_at: string;
  ends_at: string;
  product: AcademyProductSummary & {
    sales_config?: Record<string, unknown>;
    _count?: { question_links: number };
    papers?: AcademyPaperSummary[];
  };
  kid?: { id: string; nickname: string };
  sessions?: AcademySessionSummary[];
}

export type AcademyRubric =
  | {
      kind: 'per_mark';
      total_marks: number;
      criteria: Array<{ text: string; marks: number }>;
    }
  | {
      kind: 'banded';
      total_marks: number;
      bands: Array<{ text: string; marks: number }>;
    };

export interface AcademyPaperQuestion {
  order_index: number;
  marks: number;
  section: string | null;
  question: AcademyQuestion;
}

export interface AcademyStimulus {
  id: string;
  source_ref: string;
  exam: string;
  paper_year: string;
  body_text: string | null;
  figure_keys: string[] | null;
  render_spec: Record<string, unknown> | null;
}

export interface AcademySession {
  id: string;
  entitlement_id: string;
  paper_id: string;
  mode: 'practice' | 'mock' | 'review';
  status: 'in_progress' | 'submitted' | 'self_graded' | 'abandoned';
  started_at: string;
  submitted_at: string | null;
  completed_at: string | null;
  state: {
    current_question_index?: number;
    remaining_seconds?: number;
    answers?: Record<string, string>;
  };
  paper: {
    id: string;
    title: string;
    time_limit_minutes: number;
    questions: AcademyPaperQuestion[];
  } | null;
}

export interface AcademySolution {
  attempt_id: string;
  question_id: string;
  answer_type: AcademyAnswerType;
  correct_answer: string | null;
  official_solution: string | null;
  solution_image_key: string | null;
  rubric: AcademyRubric | null;
  marks_total: number;
  marks_awarded: number | null;
  graded_by: 'auto' | 'self' | 'ai' | 'teacher';
}

export interface AcademySessionReport {
  session_id: string;
  status: string;
  objective: {
    marks_awarded: number;
    marks_total: number;
    correct: number;
    attempts: number;
    accuracy: number;
  };
  self_assessed: {
    marks_awarded: number;
    marks_total: number;
    completed: number;
    attempts: number;
    notice: string;
  };
  total: { marks_awarded: number; marks_total: number };
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

export const getAcademyTutorExplanation = (args: {
  productSlug: string;
  questionId: string;
}) =>
  api<AcademyTutorResult>(`/academy/me/products/${args.productSlug}/tutor`, {
    method: 'POST',
    body: { question_id: args.questionId },
  });

export const getProductProgress = (productSlug: string) =>
  api<AcademyProgress>(`/academy/me/products/${productSlug}/progress`);

export const getAcademyCatalog = () => api<AcademyCatalogExam[]>('/academy/catalog');

export const getAcademyProduct = (slug: string) =>
  api<AcademyPublicProduct>(`/academy/products/${slug}`);

export const listFamilyAcademyEntitlements = (familyId: string) =>
  api<AcademyEntitlement[]>(`/families/${familyId}/academy-entitlements`);

export const startAcademyCheckout = (productId: string, kidId: string) =>
  api<{ payment_intent_id: string; client_secret?: string; checkout_url: string }>('/academy/checkouts', {
    method: 'POST',
    body: { product_id: productId, kid_id: kidId },
  });

export const getAcademyOrder = (intentId: string) =>
  api<{
    status: string;
    entitlement: { id: string; status: string; ends_at: string } | null;
  }>(`/academy/orders/${intentId}`);

export const createAcademySession = (args: {
  entitlementId: string;
  paperId: string;
  mode?: 'practice' | 'mock' | 'review';
}) =>
  api<AcademySession>('/academy/sessions', {
    method: 'POST',
    body: {
      entitlement_id: args.entitlementId,
      paper_id: args.paperId,
      mode: args.mode ?? 'mock',
    },
  });

export const getAcademySession = (sessionId: string) =>
  api<AcademySession>(`/academy/sessions/${sessionId}`);

export const getAcademyStimulus = (stimulusId: string) =>
  api<AcademyStimulus>(`/academy/stimuli/${stimulusId}`);

export const saveAcademySessionState = (
  sessionId: string,
  state: AcademySession['state'],
) =>
  api<AcademySession>(`/academy/sessions/${sessionId}/state`, {
    method: 'PATCH',
    body: state,
  });

export const submitAcademySession = (sessionId: string) =>
  api<AcademySessionReport>(`/academy/sessions/${sessionId}/submit`, {
    method: 'POST',
  });

export const getAcademySessionSolutions = (sessionId: string) =>
  api<AcademySolution[]>(`/academy/sessions/${sessionId}/solutions`);

export const selfGradeAcademyAttempt = (attemptId: string, rubricHits: number[]) =>
  api(`/academy/attempts/${attemptId}/self-grade`, {
    method: 'POST',
    body: { rubric_hits: rubricHits },
  });

export const getAcademySessionReport = (sessionId: string) =>
  api<AcademySessionReport>(`/academy/sessions/${sessionId}/report`);
