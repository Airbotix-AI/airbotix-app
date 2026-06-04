import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ReportModal } from './ReportModal';
import { reportPost } from './classroomApi';

vi.mock('./classroomApi', async (orig) => ({
  ...(await orig<typeof import('./classroomApi')>()),
  reportPost: vi.fn(),
}));

const mockedReportPost = vi.mocked(reportPost);

beforeEach(() => mockedReportPost.mockReset());

describe('ReportModal', () => {
  it('sends a report once a reason is picked and shows the thank-you state', async () => {
    mockedReportPost.mockResolvedValue(undefined as never);
    const onReported = vi.fn();
    render(<ReportModal postId="wp1" classId="c1" onClose={() => {}} onReported={onReported} />);

    await userEvent.click(screen.getAllByRole('radio')[0]); // pick the first reason
    await userEvent.click(screen.getByRole('button', { name: 'Send' }));

    await waitFor(() => expect(mockedReportPost).toHaveBeenCalled());
    expect(await screen.findByText('We told your teacher')).toBeInTheDocument();
    expect(onReported).toHaveBeenCalled();
  });

  it('closes without reporting when Cancel is clicked', async () => {
    const onClose = vi.fn();
    render(<ReportModal postId="wp1" classId="c1" onClose={onClose} />);
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onClose).toHaveBeenCalled();
    expect(mockedReportPost).not.toHaveBeenCalled();
  });
});
