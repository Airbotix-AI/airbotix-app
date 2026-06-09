// Game Guide diagrams — the actual SVG art for `diagram` blocks (PRD
// learn-game-studio-help-prd.md). Authored as type-safe React (NOT injected HTML),
// so they're XSS-safe by construction and theme-aware: lines/labels use
// `currentColor` (inherits the pane's text colour, so they flip light/dark), with a
// few brand accent fills for the shapes. The backend corpus references one of these
// by key (`{ kind:'diagram', diagram:'<key>', alt }`); unknown keys fall back to the
// alt caption, so the backend can name a diagram before it's drawn here.
//
// Kid-friendly + simple on purpose — each one teaches a single idea.

import type { ReactNode } from 'react';

// Brand accent fills (illustration art — not chrome; design tokens drive the
// surrounding card, these colour the shapes inside the picture).
const CORAL = '#FF7A66';
const SKY = '#5DAEFF';
const MINT = '#3DD9A9';
const SUN = '#FFD43B';
const BUBBLE = '#FF6BA9';

/** Shared svg props: scale to the card width, inherit text colour for lines/labels. */
const svg = (extra?: string) =>
  `w-full max-w-[380px] text-pg-text-dim ${extra ?? ''}`.trim();

function Arrowhead({ id }: { id: string }) {
  return (
    <defs>
      <marker id={id} markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
        <path d="M0,0 L6,3 L0,6 Z" fill="currentColor" />
      </marker>
    </defs>
  );
}

// ── x/y coordinates ──────────────────────────────────────────────────────────
function XyCoordinates() {
  return (
    <svg viewBox="0 0 300 190" className={svg()} fill="none" stroke="currentColor" strokeWidth="2">
      <Arrowhead id="ah-xy" />
      <rect x="22" y="22" width="250" height="150" rx="6" className="fill-pg-surface" />
      <circle cx="22" cy="22" r="4" fill="currentColor" stroke="none" />
      <text x="30" y="16" fontSize="12" fill="currentColor" stroke="none">0, 0</text>
      {/* x axis → right */}
      <line x1="22" y1="22" x2="250" y2="22" markerEnd="url(#ah-xy)" />
      <text x="256" y="26" fontSize="13" fill="currentColor" stroke="none">x</text>
      {/* y axis → down */}
      <line x1="22" y1="22" x2="22" y2="160" markerEnd="url(#ah-xy)" />
      <text x="10" y="172" fontSize="13" fill="currentColor" stroke="none">y</text>
      {/* a point */}
      <line x1="170" y1="22" x2="170" y2="110" strokeDasharray="4 4" opacity="0.6" />
      <line x1="22" y1="110" x2="170" y2="110" strokeDasharray="4 4" opacity="0.6" />
      <circle cx="170" cy="110" r="7" fill={CORAL} stroke="none" />
      <text x="182" y="106" fontSize="12" fill="currentColor" stroke="none">(x, y)</text>
    </svg>
  );
}

// ── game loop ──────────────────────────────────────────────────────────────────
function box(x: number, y: number, w: number, label: string, fill: string) {
  return (
    <>
      <rect x={x} y={y} width={w} height="44" rx="10" fill={fill} stroke="none" />
      <text x={x + w / 2} y={y + 27} fontSize="13" textAnchor="middle" fill="#1F1B2D" stroke="none" fontWeight="700">
        {label}
      </text>
    </>
  );
}
function GameLoop() {
  return (
    <svg viewBox="0 0 320 170" className={svg()} fill="none" stroke="currentColor" strokeWidth="2">
      <Arrowhead id="ah-loop" />
      {box(14, 30, 78, 'Input', SKY)}
      {box(121, 30, 78, 'Update', MINT)}
      {box(228, 30, 78, 'Draw', SUN)}
      <line x1="92" y1="52" x2="121" y2="52" markerEnd="url(#ah-loop)" />
      <line x1="199" y1="52" x2="228" y2="52" markerEnd="url(#ah-loop)" />
      {/* loop back */}
      <path d="M267 74 C267 130, 53 130, 53 80" markerEnd="url(#ah-loop)" />
      <text x="160" y="150" fontSize="12" textAnchor="middle" fill="currentColor" stroke="none">
        repeat ~60× every second
      </text>
    </svg>
  );
}

// ── gravity + jump ───────────────────────────────────────────────────────────
function GravityJump() {
  return (
    <svg viewBox="0 0 300 180" className={svg()} fill="none" stroke="currentColor" strokeWidth="2">
      <Arrowhead id="ah-g" />
      <rect x="0" y="150" width="300" height="30" className="fill-pg-surface" stroke="none" />
      <line x1="0" y1="150" x2="300" y2="150" />
      <rect x="130" y="108" width="40" height="40" rx="6" fill={MINT} stroke="none" />
      {/* gravity down */}
      <line x1="210" y1="60" x2="210" y2="140" markerEnd="url(#ah-g)" />
      <text x="218" y="105" fontSize="12" fill="currentColor" stroke="none">gravity ↓</text>
      {/* jump up */}
      <line x1="90" y1="140" x2="90" y2="60" markerEnd="url(#ah-g)" />
      <text x="20" y="100" fontSize="12" fill="currentColor" stroke="none">jump (−y)</text>
    </svg>
  );
}

// ── collision vs overlap ───────────────────────────────────────────────────────
function CollisionOverlap() {
  return (
    <svg viewBox="0 0 340 170" className={svg()} fill="none" stroke="currentColor" strokeWidth="2">
      {/* overlap (left) */}
      <circle cx="70" cy="80" r="34" fill={SKY} fillOpacity="0.55" stroke="none" />
      <circle cx="105" cy="80" r="34" fill={CORAL} fillOpacity="0.55" stroke="none" />
      <text x="87" y="60" fontSize="18" textAnchor="middle" fill={SUN} stroke="none">✦</text>
      <text x="87" y="150" fontSize="13" textAnchor="middle" fill="currentColor" stroke="none">overlap</text>
      {/* divider */}
      <line x1="170" y1="20" x2="170" y2="150" strokeDasharray="4 5" opacity="0.4" />
      {/* collide (right) */}
      <rect x="225" y="60" width="40" height="40" rx="6" fill={MINT} stroke="none" />
      <rect x="288" y="30" width="16" height="100" rx="3" fill={BUBBLE} stroke="none" />
      <line x1="266" y1="80" x2="284" y2="80" markerEnd="url(#ah-c)" />
      <Arrowhead id="ah-c" />
      <text x="262" y="150" fontSize="13" textAnchor="middle" fill="currentColor" stroke="none">collide</text>
    </svg>
  );
}

// ── sprite shapes ──────────────────────────────────────────────────────────────
function SpriteShapes() {
  return (
    <svg viewBox="0 0 300 150" className={svg()} fill="none" stroke="none">
      <rect x="30" y="40" width="56" height="56" rx="8" fill={CORAL} />
      <text x="58" y="120" fontSize="12" textAnchor="middle" fill="currentColor">player</text>
      <circle cx="150" cy="68" r="28" fill={SUN} />
      <text x="150" y="120" fontSize="12" textAnchor="middle" fill="currentColor">coin</text>
      <path
        d="M242 40 l8 18 20 2 -15 14 4 20 -17 -10 -17 10 4 -20 -15 -14 20 -2 z"
        fill={SKY}
      />
      <text x="242" y="120" fontSize="12" textAnchor="middle" fill="currentColor">star</text>
    </svg>
  );
}

// ── scene flow ─────────────────────────────────────────────────────────────────
function SceneFlow() {
  return (
    <svg viewBox="0 0 340 140" className={svg()} fill="none" stroke="currentColor" strokeWidth="2">
      <Arrowhead id="ah-sf" />
      {box(10, 24, 86, 'Title', SKY)}
      {box(127, 24, 86, 'Game', MINT)}
      {box(244, 24, 86, 'Game Over', CORAL)}
      <line x1="96" y1="46" x2="127" y2="46" markerEnd="url(#ah-sf)" />
      <line x1="213" y1="46" x2="244" y2="46" markerEnd="url(#ah-sf)" />
      <path d="M287 70 C287 116, 170 116, 170 72" markerEnd="url(#ah-sf)" />
      <text x="228" y="132" fontSize="12" textAnchor="middle" fill="currentColor" stroke="none">
        play again
      </text>
    </svg>
  );
}

const DIAGRAMS: Record<string, () => ReactNode> = {
  'xy-coordinates': XyCoordinates,
  'game-loop': GameLoop,
  'gravity-and-jump': GravityJump,
  'collision-overlap': CollisionOverlap,
  'sprite-shapes': SpriteShapes,
  'scene-flow': SceneFlow,
};

/** Render a named diagram in a captioned card. Unknown key → just the alt caption. */
export function HelpDiagram({ diagram, alt }: { diagram: string; alt: string }) {
  const Art = DIAGRAMS[diagram];
  return (
    <figure
      data-testid={`help-diagram-${diagram}`}
      role="img"
      aria-label={alt}
      className="my-1 flex flex-col items-center gap-2 rounded-xl border border-pg-border bg-pg-surface p-3"
    >
      {Art ? <Art /> : null}
      <figcaption className="text-[12px] italic text-pg-text-muted">{alt}</figcaption>
    </figure>
  );
}
