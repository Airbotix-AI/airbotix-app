// @vitest-environment jsdom
import { renderHook } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { useObjectUrl } from './useObjectUrl';

describe('useObjectUrl', () => {
  beforeEach(() => {
    // jsdom doesn't implement object URLs — stub them so we can assert the contract.
    URL.createObjectURL = vi.fn(() => 'blob:stub-123');
    URL.revokeObjectURL = vi.fn();
  });
  afterEach(() => vi.restoreAllMocks());

  it('turns a large data: URL into a blob: URL and revokes it on unmount', () => {
    const { result, unmount } = renderHook(() => useObjectUrl('data:image/png;base64,aGVsbG8='));
    expect(result.current).toBe('blob:stub-123');
    expect(URL.createObjectURL).toHaveBeenCalledTimes(1);
    unmount();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:stub-123');
  });

  it('passes a non-data: URL (e.g. a CloudFront library asset) through unchanged', () => {
    const { result } = renderHook(() => useObjectUrl('https://cdn.airbotix.ai/lib/x.png'));
    expect(result.current).toBe('https://cdn.airbotix.ai/lib/x.png');
    expect(URL.createObjectURL).not.toHaveBeenCalled();
  });

  it('falls back to the data: URL if blob creation throws (never crashes the viewer)', () => {
    (URL.createObjectURL as ReturnType<typeof vi.fn>).mockImplementation(() => {
      throw new Error('nope');
    });
    const data = 'data:image/png;base64,aGVsbG8=';
    const { result } = renderHook(() => useObjectUrl(data));
    expect(result.current).toBe(data);
  });
});
