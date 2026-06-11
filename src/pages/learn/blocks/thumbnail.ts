// Render a small "cover" thumbnail for a Blocks project (the Projects / My Works
// card image). The stage is DOM (emoji sprites over a gradient), so rather than
// rasterise the DOM we redraw the scene onto a canvas: the page's sky gradient +
// hill + sun/moon + each character emoji at its start grid position. Stored
// device-local via projectPersistence.saveThumbnail (no backend image path yet).

import { GRID_H, GRID_W, type Page } from './blocksModel';

const W = 320;
const H = 240;

export function captureBlocksThumbnail(page: Page): string {
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  // sky gradient (matches .bsx-stage.scene-*)
  const grad = ctx.createLinearGradient(0, 0, 0, H);
  if (page.background === 'space') {
    grad.addColorStop(0, '#101B3C');
    grad.addColorStop(0.6, '#22184B');
    grad.addColorStop(1, '#3A1D55');
  } else {
    grad.addColorStop(0, '#9CD7FF');
    grad.addColorStop(0.6, '#C8E9FF');
    grad.addColorStop(1, '#F1FAFF');
  }
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  // hill (a rounded mound along the bottom)
  ctx.fillStyle = page.background === 'space' ? '#241a48' : '#3dd9a9';
  ctx.beginPath();
  ctx.ellipse(W / 2, H * 1.08, W * 0.72, H * 0.42, 0, Math.PI, 0);
  ctx.fill();

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // sun / moon
  ctx.font = '30px serif';
  ctx.fillText(page.background === 'space' ? '🌙' : '☀️', W * 0.86, H * 0.16);

  // characters at their start positions
  for (const c of page.characters) {
    const x = ((c.start.gx + 0.5) / GRID_W) * W;
    const y = ((c.start.gy + 0.5) / GRID_H) * H;
    const size = Math.max(18, Math.round(46 * (c.start.size || 1)));
    ctx.font = `${size}px serif`;
    ctx.fillText(c.emoji, x, y);
  }

  return canvas.toDataURL('image/png');
}
