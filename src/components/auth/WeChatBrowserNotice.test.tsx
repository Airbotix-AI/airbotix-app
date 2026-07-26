// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { WeChatBrowserNotice } from './WeChatBrowserNotice';

describe('WeChatBrowserNotice', () => {
  afterEach(cleanup);

  it('renders nothing outside WeChat', () => {
    const { container } = render(<WeChatBrowserNotice inWeChat={false} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('warns and instructs to open in the system browser inside WeChat', () => {
    render(<WeChatBrowserNotice inWeChat />);

    const notice = screen.getByTestId('wechat-browser-notice');
    expect(notice).toHaveAttribute('role', 'alert');
    expect(notice).toHaveTextContent('微信内可能收不到验证码');
    expect(notice).toHaveTextContent('You may not receive the code inside WeChat');
    expect(notice).toHaveTextContent('在浏览器中打开');
    expect(notice).toHaveTextContent('Open in Browser');
  });

  it('copies the current URL for pasting into a real browser', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });

    render(<WeChatBrowserNotice inWeChat />);
    fireEvent.click(screen.getByRole('button', { name: /Copy link/ }));

    expect(writeText).toHaveBeenCalledWith(window.location.href);
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /Link copied/ })).toBeInTheDocument(),
    );
  });
});
