// Game Guide diagrams — the actual SVG art for `diagram` blocks (PRD
// learn-game-studio-help-prd.md). Authored as type-safe React (NOT injected HTML),
// so they're XSS-safe by construction and theme-aware: lines/labels use
// `currentColor` (inherits the pane's text colour, so they flip light/dark), with a
// few brand accent fills for the shapes. The backend corpus references one of these
// by key (`{ kind:'diagram', diagram:'<key>', alt }`); unknown keys fall back to the
// alt caption, so the backend can name a diagram before it's drawn here.
//
// Kid-friendly + simple on purpose — each one teaches a single idea.

import { useState, type ReactNode } from 'react';

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

// ═══════════════════════════════════════════════════════════════════════════════
// Interactive widgets (D-HELP-08) — plain React + SVG, theme-aware (currentColor),
// keyboard-accessible (native range/buttons). Each teaches ONE idea you can poke at.
// ═══════════════════════════════════════════════════════════════════════════════

/** Small control row under a diagram. */
function Ctrl({ children }: { children: ReactNode }) {
  return <div className="flex flex-wrap items-center justify-center gap-2 text-[12px] text-pg-text-dim">{children}</div>;
}
function Toggle({ on, onClick, children }: { on: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={on}
      className={`rounded-full px-3 py-1 text-[12px] font-bold transition-colors ${
        on ? 'bg-brand-mint text-ink' : 'border border-pg-border text-pg-text-dim hover:text-pg-text'
      }`}
    >
      {children}
    </button>
  );
}
function Range({ value, onChange, min = 0, max = 100, label }: { value: number; onChange: (n: number) => void; min?: number; max?: number; label: string }) {
  return (
    <label className="flex items-center gap-1.5">
      <span className="w-4 font-mono">{label}</span>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-1 w-28 cursor-pointer accent-brand-mint"
        aria-label={label}
      />
    </label>
  );
}

// ── coords explorer: drag/scrub a point; toggle 2D ⇄ 3D ────────────────────────
function CoordsExplorer() {
  const [is3d, setIs3d] = useState(false);
  const [x, setX] = useState(60);
  const [y, setY] = useState(40);
  const [z, setZ] = useState(30);
  // Map 0..100 to the 200×150 stage; 3D nudges by z to fake depth.
  const depth = is3d ? z / 100 : 0;
  const cx = 24 + x * 1.5 + depth * 26;
  const cy = 132 - y * 1.04 - depth * 22; // y grows UP here for intuition
  return (
    <div className="flex w-full max-w-[380px] flex-col items-center gap-2">
      <svg viewBox="0 0 220 150" className="w-full text-pg-text-dim" fill="none" stroke="currentColor" strokeWidth="2">
        <Arrowhead id="ah-ce" />
        <rect x="20" y="14" width="184" height="120" rx="6" className="fill-pg-surface" />
        <line x1="24" y1="130" x2="200" y2="130" markerEnd="url(#ah-ce)" />
        <text x="204" y="134" fontSize="11" fill="currentColor" stroke="none">x</text>
        <line x1="24" y1="130" x2="24" y2="20" markerEnd="url(#ah-ce)" />
        <text x="14" y="20" fontSize="11" fill="currentColor" stroke="none">y</text>
        {is3d && (
          <>
            <line x1="24" y1="130" x2="64" y2="96" markerEnd="url(#ah-ce)" strokeDasharray="3 3" opacity="0.7" />
            <text x="66" y="92" fontSize="11" fill="currentColor" stroke="none">z</text>
          </>
        )}
        <circle cx={cx} cy={cy} r="7" fill={CORAL} stroke="none" />
      </svg>
      <Ctrl>
        <Toggle on={!is3d} onClick={() => setIs3d(false)}>2D</Toggle>
        <Toggle on={is3d} onClick={() => setIs3d(true)}>3D</Toggle>
        <Range label="x" value={x} onChange={setX} />
        <Range label="y" value={y} onChange={setY} />
        {is3d && <Range label="z" value={z} onChange={setZ} />}
      </Ctrl>
      <div className="font-mono text-[12px] text-pg-text">
        position = ({x}, {y}{is3d ? `, ${z}` : ''})
      </div>
    </div>
  );
}

// ── sprite ⇄ mesh: same "thing", flat vs 3D ────────────────────────────────────
function SpriteVsMesh() {
  const [mesh, setMesh] = useState(false);
  return (
    <div className="flex w-full max-w-[380px] flex-col items-center gap-2">
      <svg viewBox="0 0 200 130" className="w-full text-pg-text-dim" fill="none">
        {!mesh ? (
          <>
            <rect x="70" y="35" width="60" height="60" rx="8" fill={CORAL} />
            <text x="100" y="118" fontSize="12" textAnchor="middle" fill="currentColor">flat sprite (2D)</text>
          </>
        ) : (
          <>
            {/* simple iso cube: top, left, right faces */}
            <polygon points="100,28 138,50 100,72 62,50" fill={SUN} />
            <polygon points="62,50 100,72 100,114 62,92" fill={CORAL} />
            <polygon points="138,50 100,72 100,114 138,92" fill={BUBBLE} />
            <text x="100" y="128" fontSize="12" textAnchor="middle" fill="currentColor">3D mesh (geometry + material)</text>
          </>
        )}
      </svg>
      <Ctrl>
        <Toggle on={!mesh} onClick={() => setMesh(false)}>Sprite (2D)</Toggle>
        <Toggle on={mesh} onClick={() => setMesh(true)}>Mesh (3D)</Toggle>
      </Ctrl>
    </div>
  );
}

// ── camera view: pan (2D) vs orbit (3D) ────────────────────────────────────────
function CameraView() {
  const [is3d, setIs3d] = useState(false);
  const [t, setT] = useState(50);
  const a = (t / 100) * Math.PI * 2;
  return (
    <div className="flex w-full max-w-[380px] flex-col items-center gap-2">
      <svg viewBox="0 0 220 130" className="w-full text-pg-text-dim" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="14" y="12" width="192" height="106" rx="6" className="fill-pg-surface" />
        {!is3d ? (
          <>
            {/* pan: shapes slide as the camera moves */}
            <g transform={`translate(${-t * 0.8 + 40} 0)`}>
              <rect x="40" y="50" width="34" height="34" rx="5" fill={MINT} stroke="none" />
              <circle cx="130" cy="67" r="18" fill={SUN} stroke="none" />
              <rect x="180" y="48" width="34" height="38" rx="5" fill={BUBBLE} stroke="none" />
            </g>
            <text x="110" y="110" fontSize="11" textAnchor="middle" fill="currentColor" stroke="none">camera pans across →</text>
          </>
        ) : (
          <>
            {/* orbit: a cube rotates as the camera circles it */}
            <g transform={`translate(110 60)`}>
              <polygon
                points={`${Math.cos(a) * 26},${-18 + Math.sin(a) * 6} ${Math.cos(a) * 26 + 30},${-18} ${Math.cos(a) * 26},${-18 - Math.sin(a) * 6} ${Math.cos(a) * 26 - 30},${-18}`}
                fill={SUN}
                stroke="none"
              />
              <rect x={Math.cos(a) * 26 - 30} y="-18" width="60" height="48" fill={CORAL} stroke="none" opacity="0.9" />
            </g>
            <text x="110" y="110" fontSize="11" textAnchor="middle" fill="currentColor" stroke="none">camera orbits around ↻</text>
          </>
        )}
      </svg>
      <Ctrl>
        <Toggle on={!is3d} onClick={() => setIs3d(false)}>2D pan</Toggle>
        <Toggle on={is3d} onClick={() => setIs3d(true)}>3D orbit</Toggle>
        <Range label="↔" value={t} onChange={setT} />
      </Ctrl>
    </div>
  );
}

// ── game-loop stepper: press Step to advance one frame ─────────────────────────
const LOOP_STEPS = ['Input', 'Update', 'Draw'] as const;
const LOOP_FILL = [SKY, MINT, SUN];
function GameLoopStepper() {
  const [i, setI] = useState(0);
  const frame = Math.floor(i / 3) + 1;
  const active = i % 3;
  const dot = 30 + (active === 2 ? frame * 6 : (frame - 1) * 6); // the "drawn" thing creeps right
  return (
    <div className="flex w-full max-w-[380px] flex-col items-center gap-2">
      <svg viewBox="0 0 320 120" className="w-full text-pg-text-dim" fill="none" stroke="currentColor" strokeWidth="2">
        <Arrowhead id="ah-ls" />
        {LOOP_STEPS.map((s, k) => (
          <g key={s} opacity={active === k ? 1 : 0.35}>
            {box(14 + k * 107, 16, 78, s, LOOP_FILL[k])}
          </g>
        ))}
        <line x1="92" y1="38" x2="121" y2="38" markerEnd="url(#ah-ls)" />
        <line x1="199" y1="38" x2="228" y2="38" markerEnd="url(#ah-ls)" />
        <circle cx={Math.min(dot, 300)} cy="92" r="8" fill={CORAL} stroke="none" />
      </svg>
      <Ctrl>
        <button
          type="button"
          onClick={() => setI((n) => n + 1)}
          className="rounded-full bg-brand-mint px-4 py-1 text-[12px] font-bold text-ink"
        >
          Step ▶
        </button>
        <span className="font-mono">frame {frame} · {LOOP_STEPS[active]}</span>
      </Ctrl>
    </div>
  );
}

// ── collision: slide two shapes together; sparkle on overlap ───────────────────
function InteractiveCollision() {
  const [t, setT] = useState(10);
  const bx = 40 + t * 1.4;
  const overlapping = bx < 96; // circles ~r28 meet around here
  return (
    <div className="flex w-full max-w-[380px] flex-col items-center gap-2">
      <svg viewBox="0 0 220 120" className="w-full text-pg-text-dim" fill="none">
        <circle cx="70" cy="60" r="28" fill={SKY} fillOpacity="0.6" />
        <circle cx={bx + 60} cy="60" r="28" fill={CORAL} fillOpacity="0.6" />
        {overlapping && <text x={Math.min(bx + 30, 120)} y="40" fontSize="20" textAnchor="middle" fill={SUN}>✦</text>}
        <text x="110" y="112" fontSize="12" textAnchor="middle" fill="currentColor">
          {overlapping ? 'touching! → run the rule' : 'not touching'}
        </text>
      </svg>
      <Ctrl>
        <Range label="←" value={t} onChange={setT} />
      </Ctrl>
    </div>
  );
}

// ── gravity + jump: shape the arc with sliders, scrub time ─────────────────────
function InteractiveGravity() {
  const [g, setG] = useState(50);
  const [jump, setJump] = useState(60);
  const [t, setT] = useState(30);
  // height(t) = jump*t - 0.5*g*t^2, normalised; clamp to the ground.
  const tt = t / 100;
  const h = Math.max(0, (jump / 100) * tt - 0.5 * (g / 100) * tt * tt) * 240;
  const by = 96 - h;
  // sample the arc for the path
  const pts = Array.from({ length: 21 }, (_, k) => {
    const s = k / 20;
    const hy = Math.max(0, (jump / 100) * s - 0.5 * (g / 100) * s * s) * 240;
    return `${20 + s * 180},${96 - hy}`;
  }).join(' ');
  return (
    <div className="flex w-full max-w-[380px] flex-col items-center gap-2">
      <svg viewBox="0 0 220 120" className="w-full text-pg-text-dim" fill="none" stroke="currentColor" strokeWidth="2">
        <line x1="10" y1="96" x2="210" y2="96" />
        <polyline points={pts} fill="none" stroke={SKY} strokeDasharray="3 3" opacity="0.7" />
        <rect x={20 + tt * 180 - 9} y={by - 18} width="18" height="18" rx="3" fill={MINT} stroke="none" />
      </svg>
      <Ctrl>
        <Range label="g" value={g} onChange={setG} />
        <Range label="↑" value={jump} onChange={setJump} />
        <Range label="t" value={t} onChange={setT} />
      </Ctrl>
      <div className="font-mono text-[11px] text-pg-text-muted">jump pushes up · gravity pulls down → the arc</div>
    </div>
  );
}

// ── scene tree: expand/collapse the scene graph ────────────────────────────────
type TreeNode = { label: string; children?: TreeNode[] };
const SCENE: TreeNode = {
  label: 'Scene',
  children: [
    { label: 'Player' },
    { label: 'Coins', children: [{ label: 'coin 1' }, { label: 'coin 2' }, { label: 'coin 3' }] },
    { label: 'World', children: [{ label: 'ground' }, { label: 'lights' }] },
  ],
};
function TreeRow({ node, depth }: { node: TreeNode; depth: number }) {
  const [open, setOpen] = useState(depth < 1);
  const hasKids = !!node.children?.length;
  return (
    <div>
      <button
        type="button"
        onClick={() => hasKids && setOpen((o) => !o)}
        className="flex w-full items-center gap-1 rounded px-1 py-0.5 text-left text-[12px] text-pg-text hover:bg-pg-text/5"
        style={{ paddingLeft: depth * 14 + 4 }}
        aria-expanded={hasKids ? open : undefined}
      >
        <span className="w-3 text-pg-text-muted">{hasKids ? (open ? '▾' : '▸') : '•'}</span>
        {node.label}
      </button>
      {hasKids && open && node.children!.map((c) => <TreeRow key={c.label} node={c} depth={depth + 1} />)}
    </div>
  );
}
function SceneTree() {
  return (
    <div className="w-full max-w-[300px] rounded-lg border border-pg-border bg-pg-surface p-2">
      <TreeRow node={SCENE} depth={0} />
    </div>
  );
}

// ═══ simple static SVGs for the remaining concept diagrams ══════════════════════
function EngineParts() {
  const parts = ['Loop', 'Draw', 'Input', 'Physics', 'Sound', 'Assets'];
  return (
    <svg viewBox="0 0 320 120" className={svg()} fill="none">
      {parts.map((p, k) => (
        <g key={p}>
          <rect x={12 + (k % 3) * 102} y={16 + Math.floor(k / 3) * 52} width="92" height="40" rx="8" fill={k % 2 ? SKY : MINT} />
          <text x={12 + (k % 3) * 102 + 46} y={16 + Math.floor(k / 3) * 52 + 25} fontSize="12" textAnchor="middle" fill="#1F1B2D" fontWeight="700">{p}</text>
        </g>
      ))}
    </svg>
  );
}
function MaterialsLights() {
  return (
    <svg viewBox="0 0 300 120" className={svg()} fill="none" stroke="currentColor" strokeWidth="2">
      <Arrowhead id="ah-ml" />
      <circle cx="70" cy="60" r="30" fill={CORAL} stroke="none" opacity="0.35" />
      <text x="70" y="108" fontSize="11" textAnchor="middle" fill="currentColor" stroke="none">no light → dark</text>
      <line x1="150" y1="20" x2="200" y2="48" markerEnd="url(#ah-ml)" />
      <text x="150" y="22" fontSize="14" fill={SUN} stroke="none">☀</text>
      <circle cx="230" cy="60" r="30" fill={CORAL} stroke="none" />
      <circle cx="220" cy="50" r="9" fill="#fff" stroke="none" opacity="0.7" />
      <text x="230" y="108" fontSize="11" textAnchor="middle" fill="currentColor" stroke="none">+ light → lit</text>
    </svg>
  );
}
function InputKeys() {
  return (
    <svg viewBox="0 0 240 110" className={svg()} fill="none">
      {[['↑', 95, 20], ['←', 60, 58], ['↓', 95, 58], ['→', 130, 58]].map(([k, x, y]) => (
        <g key={String(k)}>
          <rect x={x as number} y={y as number} width="30" height="30" rx="6" fill={SKY} />
          <text x={(x as number) + 15} y={(y as number) + 20} fontSize="15" textAnchor="middle" fill="#1F1B2D" fontWeight="700">{k}</text>
        </g>
      ))}
      <circle cx="195" cy="55" r="10" fill={CORAL} />
      <text x="195" y="92" fontSize="11" textAnchor="middle" fill="currentColor">pointer</text>
    </svg>
  );
}
function Velocity() {
  return (
    <svg viewBox="0 0 300 100" className={svg()} fill="none" stroke="currentColor" strokeWidth="2">
      <Arrowhead id="ah-v" />
      <rect x="30" y="40" width="28" height="28" rx="5" fill={MINT} stroke="none" />
      <line x1="62" y1="54" x2="150" y2="54" markerEnd="url(#ah-v)" stroke={CORAL} />
      <text x="100" y="42" fontSize="12" textAnchor="middle" fill="currentColor" stroke="none">velocity (speed + direction)</text>
      <rect x="210" y="40" width="28" height="28" rx="5" fill={MINT} stroke="none" opacity="0.4" />
      <text x="224" y="92" fontSize="11" textAnchor="middle" fill="currentColor" stroke="none">next frame</text>
    </svg>
  );
}
function TweenCurve() {
  return (
    <svg viewBox="0 0 300 110" className={svg()} fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="20" y1="90" x2="280" y2="90" opacity="0.4" />
      <path d="M20 88 C120 88, 150 20, 280 20" fill="none" stroke={SKY} />
      <circle cx="20" cy="88" r="5" fill={MINT} stroke="none" />
      <circle cx="280" cy="20" r="5" fill={CORAL} stroke="none" />
      <text x="20" y="104" fontSize="11" fill="currentColor" stroke="none">start</text>
      <text x="258" y="14" fontSize="11" fill="currentColor" stroke="none">end</text>
      <text x="150" y="60" fontSize="11" textAnchor="middle" fill="currentColor" stroke="none">smooth (easing)</text>
    </svg>
  );
}
function HudScore() {
  return (
    <svg viewBox="0 0 280 110" className={svg()} fill="none">
      <rect x="14" y="14" width="252" height="82" rx="8" className="fill-pg-surface" stroke="currentColor" />
      <text x="26" y="40" fontSize="14" fill="currentColor">Score: 7</text>
      <text x="26" y="64" fontSize="14" fill="currentColor">Lives: ♥♥♥</text>
      <rect x="150" y="34" width="100" height="44" rx="6" fill={MINT} opacity="0.25" />
      <text x="200" y="60" fontSize="11" textAnchor="middle" fill="currentColor">variables → on screen</text>
    </svg>
  );
}
function WinLose() {
  return (
    <svg viewBox="0 0 300 110" className={svg()} fill="none" stroke="currentColor" strokeWidth="2">
      <Arrowhead id="ah-wl" />
      {box(110, 18, 84, 'each frame', SKY)}
      <line x1="152" y1="62" x2="152" y2="78" markerEnd="url(#ah-wl)" />
      <rect x="40" y="80" width="90" height="24" rx="6" fill={MINT} stroke="none" />
      <text x="85" y="97" fontSize="12" textAnchor="middle" fill="#1F1B2D" stroke="none" fontWeight="700">win?</text>
      <rect x="174" y="80" width="90" height="24" rx="6" fill={CORAL} stroke="none" />
      <text x="219" y="97" fontSize="12" textAnchor="middle" fill="#1F1B2D" stroke="none" fontWeight="700">lose?</text>
    </svg>
  );
}
function Levels() {
  return (
    <svg viewBox="0 0 300 110" className={svg()} fill="none" stroke="currentColor" strokeWidth="2">
      <Arrowhead id="ah-lv" />
      <line x1="20" y1="90" x2="280" y2="40" markerEnd="url(#ah-lv)" stroke={CORAL} />
      <text x="24" y="84" fontSize="11" fill="currentColor" stroke="none">lvl 1</text>
      <text x="240" y="40" fontSize="11" fill="currentColor" stroke="none">lvl 5</text>
      <text x="150" y="100" fontSize="11" textAnchor="middle" fill="currentColor" stroke="none">faster · more enemies</text>
    </svg>
  );
}
function Juice() {
  return (
    <svg viewBox="0 0 300 110" className={svg()} fill="none">
      <circle cx="80" cy="55" r="30" fill={SUN} stroke={CORAL} strokeWidth="3" />
      {[0, 60, 120, 180, 240, 300].map((d) => (
        <line key={d} x1="80" y1="55" x2={80 + Math.cos((d * Math.PI) / 180) * 44} y2={55 + Math.sin((d * Math.PI) / 180) * 44} stroke={SUN} strokeWidth="3" />
      ))}
      <text x="200" y="50" fontSize="12" fill="currentColor">pop! shake! sound!</text>
      <text x="200" y="70" fontSize="11" fill="currentColor" opacity="0.7">= it feels great</text>
    </svg>
  );
}

const DIAGRAMS: Record<string, () => ReactNode> = {
  // existing static
  'xy-coordinates': XyCoordinates,
  'game-loop': GameLoop,
  'sprite-shapes': SpriteShapes,
  'scene-flow': SceneFlow,
  // interactive (D-HELP-08)
  'coords-explorer': CoordsExplorer,
  'sprite-vs-mesh': SpriteVsMesh,
  'camera-view': CameraView,
  'game-loop-stepper': GameLoopStepper,
  'collision-overlap': InteractiveCollision,
  'gravity-jump': InteractiveGravity,
  'scene-tree': SceneTree,
  // new static concept art
  'engine-parts': EngineParts,
  'materials-lights': MaterialsLights,
  'input-keys': InputKeys,
  velocity: Velocity,
  'tween-curve': TweenCurve,
  'hud-score': HudScore,
  'win-lose': WinLose,
  levels: Levels,
  juice: Juice,
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
