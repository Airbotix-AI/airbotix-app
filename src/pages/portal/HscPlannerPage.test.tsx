// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  api: vi.fn(),
  listHscCourses: vi.fn(),
  listHscPlans: vi.fn(),
  createHscPlan: vi.fn(),
  previewHscClaim: vi.fn(),
  importHscClaim: vi.fn(),
  addHscSubject: vi.fn(),
  addHscTask: vi.fn(),
  deleteHscPlan: vi.fn(),
  deleteHscSubject: vi.fn(),
  deleteHscTask: vi.fn(),
}));

vi.mock('@/auth/useAuth', () => ({
  useMe: () => ({ data: { kind: 'user', sub: 'parent-1', family_id: 'family-1', role: 'parent' } }),
}));
vi.mock('@/lib/api', () => ({
  api: mocks.api,
  ApiError: class ApiError extends Error {},
}));
vi.mock('@/pages/hsc/hscApi', () => ({
  listHscCourses: mocks.listHscCourses,
  listHscPlans: mocks.listHscPlans,
  createHscPlan: mocks.createHscPlan,
  previewHscClaim: mocks.previewHscClaim,
  importHscClaim: mocks.importHscClaim,
  addHscSubject: mocks.addHscSubject,
  addHscTask: mocks.addHscTask,
  deleteHscPlan: mocks.deleteHscPlan,
  deleteHscSubject: mocks.deleteHscSubject,
  deleteHscTask: mocks.deleteHscTask,
}));

import { HscPlannerPage } from './HscPlannerPage';

const PLAN = {
  id: 'plan-1',
  family_id: 'family-1',
  kid: { id: 'kid-1', nickname: 'Mia' },
  school_year: 2026,
  status: 'active',
  version: 1,
  activation_status: 'setup_required',
  subjects: [
    {
      id: 'subject-1',
      course_key: 'biology',
      display_name: 'Biology',
      units: 2,
      confirmation_status: 'confirmed',
      sort_order: 0,
      version: 1,
      progress: { completed_weight: 20, weighted_contribution: 16, running_result_over_completed_work: 80, remaining_weight: 80 },
      tasks: [
        {
          id: 'task-1',
          label: 'Depth study',
          due_date: '2026-07-01',
          weight: 20,
          achieved_mark: 16,
          maximum_mark: 20,
          status: 'completed',
          provenance: 'manual',
          rules_version: '2026.1',
          version: 1,
        },
      ],
    },
  ],
};

function wireDefaults() {
  mocks.api.mockResolvedValue([{ id: 'kid-1', nickname: 'Mia', age: 17, is_active: true }]);
  mocks.listHscCourses.mockResolvedValue({
    version: '2026.1',
    source_url: 'https://curriculum.nsw.edu.au/stages/senior',
    courses: [
      { key: 'biology', display_name: 'Biology', units: 2, requires_school_confirmation: false },
      { key: 'other', display_name: 'Other / confirm with school', units: 2, requires_school_confirmation: true },
    ],
  });
  mocks.listHscPlans.mockResolvedValue([PLAN]);
}

function renderPage(path = '/portal/academy/hsc-planner') {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/portal/academy/hsc-planner" element={<HscPlannerPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('HscPlannerPage', () => {
  it('shows family-scoped subjects and keeps the calculation boundary visible', async () => {
    wireDefaults();
    renderPage();

    expect(await screen.findByRole('heading', { name: 'Mia' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Biology' })).toBeInTheDocument();
    expect(screen.getByText('Depth study')).toBeInTheDocument();
    expect(screen.getAllByText(/not a predicted HSC mark/i)).toHaveLength(2);
    expect(mocks.listHscPlans).toHaveBeenCalledWith('family-1');
  });

  it('requires explicit child, course, task name and date confirmation before importing a claim', async () => {
    wireDefaults();
    mocks.previewHscClaim.mockResolvedValue({
      rules_version: '2026.1',
      expires_at: '2026-08-03T12:30:00.000Z',
      tasks: [{ id: 'task-public-1', achieved_mark: 16, maximum_mark: 20, weight: 20 }],
    });
    mocks.importHscClaim.mockResolvedValue(PLAN);
    renderPage(`/portal/academy/hsc-planner?claim=${'x'.repeat(43)}`);

    expect(await screen.findByText('16/20 · weight 20%')).toBeInTheDocument();
    const importPanel = screen.getByTestId('hsc-claim-import');
    fireEvent.change(within(importPanel).getByLabelText('Year 12 child'), { target: { value: 'kid-1' } });
    fireEvent.change(within(importPanel).getByLabelText('Course'), { target: { value: 'biology' } });
    fireEvent.change(within(importPanel).getByLabelText('Assessment name'), { target: { value: 'Biology depth study' } });
    fireEvent.change(within(importPanel).getByLabelText('Assessment date'), { target: { value: '2026-07-01' } });
    fireEvent.click(within(importPanel).getByRole('button', { name: 'Confirm and save to this child' }));

    await waitFor(() => expect(mocks.importHscClaim).toHaveBeenCalledWith('family-1', expect.objectContaining({
      claim_token: 'x'.repeat(43),
      kid_id: 'kid-1',
      course_key: 'biology',
      tasks: [{ claim_task_id: 'task-public-1', label: 'Biology depth study', due_date: '2026-07-01' }],
    })));
  });

  // A governed course takes its name from the NESA catalogue, so the untouched
  // optional field must not travel as ''. It used to, and the API rejected the
  // whole import with "display_name: String must contain at least 1
  // character(s)" — invisible to the objectContaining assertion above, caught
  // only by the hsc-family-plan harness journey.
  it('omits a blank course name for a governed course and keeps the typed one for the fallback', async () => {
    wireDefaults();
    mocks.previewHscClaim.mockResolvedValue({
      rules_version: '2026.1',
      expires_at: '2026-08-03T12:30:00.000Z',
      tasks: [{ id: 'task-public-1', achieved_mark: 16, maximum_mark: 20, weight: 20 }],
    });
    mocks.importHscClaim.mockResolvedValue(PLAN);
    renderPage(`/portal/academy/hsc-planner?claim=${'x'.repeat(43)}`);

    expect(await screen.findByText('16/20 · weight 20%')).toBeInTheDocument();
    const importPanel = screen.getByTestId('hsc-claim-import');
    fireEvent.change(within(importPanel).getByLabelText('Year 12 child'), { target: { value: 'kid-1' } });
    fireEvent.change(within(importPanel).getByLabelText('Course'), { target: { value: 'biology' } });
    fireEvent.change(within(importPanel).getByLabelText('Assessment name'), { target: { value: 'Biology depth study' } });
    fireEvent.change(within(importPanel).getByLabelText('Assessment date'), { target: { value: '2026-07-01' } });
    fireEvent.click(within(importPanel).getByRole('button', { name: 'Confirm and save to this child' }));

    await waitFor(() => expect(mocks.importHscClaim).toHaveBeenCalled());
    expect(mocks.importHscClaim.mock.calls[0][1]).not.toHaveProperty('display_name');
  });

  // An upcoming assessment has no marks yet. z.coerce.number() reads '' as 0,
  // so the number branch matched the blank "Mark achieved" field and sent 0
  // while "Maximum mark" stayed '' — the API then rejected every planned task
  // with "Achieved and maximum marks must be entered together", making it
  // impossible to record a deadline. Caught by the hsc-family-plan journey.
  it('records an upcoming assessment without inventing a zero mark', async () => {
    wireDefaults();
    mocks.addHscTask.mockResolvedValue(PLAN);
    renderPage();

    await screen.findByText('Depth study');
    fireEvent.change(screen.getByLabelText('Task name'), { target: { value: 'Biology practical' } });
    fireEvent.change(screen.getByLabelText('Date'), { target: { value: '2099-11-01' } });
    fireEvent.change(screen.getByLabelText('Weight %'), { target: { value: '20' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save assessment' }));

    await waitFor(() => expect(mocks.addHscTask).toHaveBeenCalled());
    const payload = mocks.addHscTask.mock.calls[0][2];
    expect(payload).toMatchObject({ label: 'Biology practical', due_date: '2099-11-01', weight: 20, status: 'planned' });
    expect(payload).not.toHaveProperty('achieved_mark');
    expect(payload).not.toHaveProperty('maximum_mark');
  });

  it('refuses a blank weight instead of silently saving a 0% assessment', async () => {
    wireDefaults();
    mocks.addHscTask.mockResolvedValue(PLAN);
    renderPage();

    await screen.findByText('Depth study');
    fireEvent.change(screen.getByLabelText('Task name'), { target: { value: 'Biology practical' } });
    fireEvent.change(screen.getByLabelText('Date'), { target: { value: '2099-11-01' } });
    fireEvent.change(screen.getByLabelText('Weight %'), { target: { value: '' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save assessment' }));

    expect(await screen.findByText('Enter the weight')).toBeInTheDocument();
    expect(mocks.addHscTask).not.toHaveBeenCalled();
  });

  // §6.2 — deletion is irreversible and removes a child's marks, so it is armed
  // in two steps and the second step names the cascade.
  describe('deletion', () => {
    it('does not delete on the first click and warns what else goes with it', async () => {
      wireDefaults();
      renderPage();

      await screen.findByText('Depth study');
      fireEvent.click(screen.getByRole('button', { name: 'Delete subject' }));

      expect(screen.getByText(/removes Biology and its 1 saved assessment/i)).toBeInTheDocument();
      expect(mocks.deleteHscSubject).not.toHaveBeenCalled();
    });

    it('deletes the subject only after the named confirmation', async () => {
      wireDefaults();
      mocks.deleteHscSubject.mockResolvedValue(PLAN);
      renderPage();

      await screen.findByText('Depth study');
      fireEvent.click(screen.getByRole('button', { name: 'Delete subject' }));
      fireEvent.click(screen.getByRole('button', { name: 'Delete Biology' }));

      await waitFor(() =>
        expect(mocks.deleteHscSubject).toHaveBeenCalledWith('family-1', 'subject-1'),
      );
    });

    it('backs out without deleting when the parent keeps it', async () => {
      wireDefaults();
      renderPage();

      await screen.findByText('Depth study');
      fireEvent.click(screen.getByRole('button', { name: 'Delete subject' }));
      fireEvent.click(screen.getByRole('button', { name: 'Keep it' }));

      expect(screen.queryByText(/cannot be undone/i)).not.toBeInTheDocument();
      expect(mocks.deleteHscSubject).not.toHaveBeenCalled();
    });

    it('warns that deleting the plan takes every subject and assessment with it', async () => {
      wireDefaults();
      mocks.deleteHscPlan.mockResolvedValue({ deleted: true });
      renderPage();

      await screen.findByText('Depth study');
      fireEvent.click(screen.getByRole('button', { name: 'Delete plan' }));

      expect(
        screen.getByText(/removes every subject and assessment in Mia's 2026 plan/i),
      ).toBeInTheDocument();

      fireEvent.click(screen.getByRole('button', { name: "Delete Mia's 2026 plan" }));
      await waitFor(() => expect(mocks.deleteHscPlan).toHaveBeenCalledWith('family-1', 'plan-1'));
    });

    it('deletes a single assessment', async () => {
      wireDefaults();
      mocks.deleteHscTask.mockResolvedValue(PLAN);
      renderPage();

      await screen.findByText('Depth study');
      fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
      fireEvent.click(screen.getByRole('button', { name: 'Delete Depth study' }));

      await waitFor(() => expect(mocks.deleteHscTask).toHaveBeenCalledWith('family-1', 'task-1'));
    });
  });

  it('sends the typed course name for the explicit school-confirmation fallback', async () => {
    wireDefaults();
    mocks.previewHscClaim.mockResolvedValue({
      rules_version: '2026.1',
      expires_at: '2026-08-03T12:30:00.000Z',
      tasks: [{ id: 'task-public-1', achieved_mark: 16, maximum_mark: 20, weight: 20 }],
    });
    mocks.importHscClaim.mockResolvedValue(PLAN);
    renderPage(`/portal/academy/hsc-planner?claim=${'x'.repeat(43)}`);

    expect(await screen.findByText('16/20 · weight 20%')).toBeInTheDocument();
    const importPanel = screen.getByTestId('hsc-claim-import');
    fireEvent.change(within(importPanel).getByLabelText('Year 12 child'), { target: { value: 'kid-1' } });
    fireEvent.change(within(importPanel).getByLabelText('Course'), { target: { value: 'other' } });
    fireEvent.change(within(importPanel).getByLabelText('Course name used by the school'), {
      target: { value: '  Marine Studies  ' },
    });
    fireEvent.change(within(importPanel).getByLabelText('Assessment name'), { target: { value: 'Biology depth study' } });
    fireEvent.change(within(importPanel).getByLabelText('Assessment date'), { target: { value: '2026-07-01' } });
    fireEvent.click(within(importPanel).getByRole('button', { name: 'Confirm and save to this child' }));

    await waitFor(() => expect(mocks.importHscClaim).toHaveBeenCalled());
    expect(mocks.importHscClaim.mock.calls[0][1]).toMatchObject({
      course_key: 'other',
      display_name: 'Marine Studies',
    });
  });

  it('sends new assessments through the family and subject scoped endpoint helper', async () => {
    wireDefaults();
    mocks.addHscTask.mockResolvedValue(PLAN);
    renderPage();

    await screen.findByText('Depth study');
    fireEvent.change(screen.getByLabelText('Task name'), { target: { value: 'Trial exam' } });
    fireEvent.change(screen.getByLabelText('Date'), { target: { value: '2026-09-01' } });
    fireEvent.change(screen.getByLabelText('Weight %'), { target: { value: '30' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save assessment' }));

    await waitFor(() => expect(mocks.addHscTask).toHaveBeenCalledWith('family-1', 'subject-1', expect.objectContaining({
      label: 'Trial exam',
      due_date: '2026-09-01',
      weight: 30,
      status: 'planned',
    })));
  });

  // The catalogue comes from the published HscRuleSet. An unseeded environment
  // answers /hsc/courses with an error, and the page used to swallow it into
  // `?? []` — the parent saw a "Choose course" dropdown with nothing under it
  // and an "Add subject" button that could never succeed, with no explanation.
  it('says the course list failed instead of showing an empty course dropdown', async () => {
    wireDefaults();
    mocks.listHscCourses.mockRejectedValue(new Error('HSC_RULES_NOT_SEEDED'));
    renderPage();

    expect(await screen.findByTestId('hsc-courses-unavailable')).toHaveTextContent(
      'We could not load the HSC course list',
    );
    expect(screen.getByRole('button', { name: 'Add subject' })).toBeDisabled();
    expect(screen.getByText('The HSC course list is unavailable, so no course can be chosen yet.')).toBeInTheDocument();
  });

  it('keeps the add-subject form usable when the course list loads', async () => {
    wireDefaults();
    renderPage();

    await screen.findByText('Depth study');
    expect(screen.queryByTestId('hsc-courses-unavailable')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Add subject' })).toBeEnabled();
  });
});
