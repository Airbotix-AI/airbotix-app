// @vitest-environment jsdom

// Parent claims a walk-in workshop kid by kid code (auth-system-prd §5.2).

import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import * as apiMod from '@/lib/api';

import { ClaimKidForm } from './ClaimKidForm';

afterEach(() => {
  vi.restoreAllMocks();
  cleanup();
});

function fill({ code = 'abcd-efgh-j3', age = '9' } = {}) {
  fireEvent.input(screen.getByLabelText(/Kid code/), { target: { value: code } });
  fireEvent.input(screen.getByLabelText('Age'), { target: { value: age } });
  fireEvent.input(screen.getByLabelText(/4-digit PIN/), { target: { value: '4321' } });
}

describe('ClaimKidForm', () => {
  it('POSTs the claim with code + age + PIN and reports the claimed kid', async () => {
    const api = vi
      .spyOn(apiMod, 'api')
      .mockResolvedValue({ id: 'kid_w', nickname: 'Zoe' } as never);
    const onClaimed = vi.fn();
    render(<ClaimKidForm familyId="fam_1" onClaimed={onClaimed} />);

    fill();
    fireEvent.click(screen.getByRole('button', { name: /Claim my kid/ }));

    await waitFor(() =>
      expect(api).toHaveBeenCalledWith(
        '/families/fam_1/kids/claim',
        expect.objectContaining({
          method: 'POST',
          body: { claim_code: 'abcd-efgh-j3', age: 9, pin: '4321' },
        }),
      ),
    );
    await waitFor(() => expect(onClaimed).toHaveBeenCalledWith({ id: 'kid_w', nickname: 'Zoe' }));
  });

  it('surfaces a nickname conflict (409) and sends the override on retry', async () => {
    const api = vi
      .spyOn(apiMod, 'api')
      .mockRejectedValueOnce(new apiMod.ApiError(409, 'NICKNAME_TAKEN', 'taken'))
      .mockResolvedValue({ id: 'kid_w', nickname: 'Zoe-W' } as never);
    const onClaimed = vi.fn();
    render(<ClaimKidForm familyId="fam_1" onClaimed={onClaimed} />);

    fill();
    fireEvent.click(screen.getByRole('button', { name: /Claim my kid/ }));
    expect(await screen.findByText(/already used in your family/)).toBeInTheDocument();
    expect(screen.getByText('Nickname (pick a new one)')).toBeInTheDocument();

    fireEvent.input(screen.getByLabelText(/Nickname/), { target: { value: 'Zoe-W' } });
    fireEvent.click(screen.getByRole('button', { name: /Claim my kid/ }));
    await waitFor(() =>
      expect(api).toHaveBeenLastCalledWith(
        '/families/fam_1/kids/claim',
        expect.objectContaining({ body: expect.objectContaining({ nickname: 'Zoe-W' }) }),
      ),
    );
    await waitFor(() => expect(onClaimed).toHaveBeenCalled());
  });

  it('shows the generic no-probing message on a bad code', async () => {
    vi.spyOn(apiMod, 'api').mockRejectedValue(
      new apiMod.ApiError(404, 'INVALID_CLAIM_CODE', 'nope'),
    );
    render(<ClaimKidForm familyId="fam_1" onClaimed={vi.fn()} />);
    fill({ code: 'WRONGCODE1' });
    fireEvent.click(screen.getByRole('button', { name: /Claim my kid/ }));
    expect(await screen.findByText(/doesn't match/)).toBeInTheDocument();
  });

  // A click on the submit button is stopped even earlier by the input's native
  // min={6} constraint; submitting the form directly exercises the zod backstop
  // that guards non-click submits (Enter key, programmatic).
  it('enforces the platform minimum age client-side', async () => {
    const api = vi.spyOn(apiMod, 'api');
    const { container } = render(<ClaimKidForm familyId="fam_1" onClaimed={vi.fn()} />);
    fill({ age: '5' });
    fireEvent.submit(container.querySelector('form')!);
    expect(await screen.findByText(/ages 6\+/)).toBeInTheDocument();
    expect(api).not.toHaveBeenCalled();
  });
});
