// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ImageLightbox } from './ImageLightbox';

const SRC = 'data:image/png;base64,AAAA';

afterEach(cleanup);

function open(onClose = vi.fn()) {
  render(<ImageLightbox src={SRC} alt="hero" onClose={onClose} />);
  return onClose;
}

function zoomPct(): number {
  return Number(screen.getByText(/%$/).textContent!.replace('%', ''));
}

describe('ImageLightbox', () => {
  it('renders the image full-screen at 100% with zoom out + reset disabled', () => {
    open();
    expect(screen.getByTestId('image-lightbox-img').getAttribute('src')).toBe(SRC);
    expect(zoomPct()).toBe(100);
    expect((screen.getByLabelText('Zoom out') as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByLabelText('Reset zoom') as HTMLButtonElement).disabled).toBe(true);
  });

  it('zooms in and back out, clamping at 100%', () => {
    open();
    fireEvent.click(screen.getByLabelText('Zoom in'));
    expect(zoomPct()).toBe(150);
    fireEvent.click(screen.getByLabelText('Zoom in'));
    expect(zoomPct()).toBe(200);
    fireEvent.click(screen.getByLabelText('Zoom out'));
    expect(zoomPct()).toBe(150);
    fireEvent.click(screen.getByLabelText('Reset zoom'));
    expect(zoomPct()).toBe(100);
  });

  it('applies a scale transform to the image when zoomed', () => {
    open();
    fireEvent.click(screen.getByLabelText('Zoom in'));
    expect(screen.getByTestId('image-lightbox-img').style.transform).toContain('scale(1.5)');
  });

  it('closes via the ✕ button', () => {
    const onClose = open();
    fireEvent.click(screen.getByTestId('image-lightbox-close'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('closes when the backdrop is clicked', () => {
    const onClose = open();
    fireEvent.click(screen.getByTestId('image-lightbox'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('closes on Escape', () => {
    const onClose = open();
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('does NOT close when the image itself is clicked', () => {
    const onClose = open();
    fireEvent.click(screen.getByTestId('image-lightbox-img'));
    expect(onClose).not.toHaveBeenCalled();
  });
});
