import { useRef, useState, type PointerEvent } from 'react';

import {
  decodeDrawnSignature,
  encodeDrawnSignature,
  isMeaningfulSignature,
  type SignaturePoint,
  type SignatureStroke,
} from './signatureValue';

const VIEWBOX_WIDTH = 640;
const VIEWBOX_HEIGHT = 180;
const MIN_POINT_DISTANCE = 0.003;

function pointFromEvent(event: PointerEvent<SVGSVGElement>): SignaturePoint {
  const rect = event.currentTarget.getBoundingClientRect();
  const width = rect.width || VIEWBOX_WIDTH;
  const height = rect.height || VIEWBOX_HEIGHT;
  return [
    Math.max(0, Math.min(1, (event.clientX - rect.left) / width)),
    Math.max(0, Math.min(1, (event.clientY - rect.top) / height)),
  ];
}

function appendPoint(strokes: SignatureStroke[], point: SignaturePoint): SignatureStroke[] {
  const lastStroke = strokes.at(-1);
  if (!lastStroke) return [[point]];
  const previous = lastStroke.at(-1);
  if (previous && Math.hypot(point[0] - previous[0], point[1] - previous[1]) < MIN_POINT_DISTANCE) {
    return strokes;
  }
  return [...strokes.slice(0, -1), [...lastStroke, point]];
}

export function SignatureInput({
  id,
  value,
  onChange,
  onBlur,
  disabled = false,
  labelledBy,
  describedBy,
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
  onBlur: () => void;
  disabled?: boolean;
  labelledBy: string;
  describedBy?: string;
}) {
  const restoredDrawing = decodeDrawnSignature(value);
  const [mode, setMode] = useState<'draw' | 'type'>(restoredDrawing || value === '' ? 'draw' : 'type');
  const [strokes, setStrokes] = useState<SignatureStroke[]>(restoredDrawing ?? []);
  const strokesRef = useRef<SignatureStroke[]>(restoredDrawing ?? []);
  const activePointer = useRef<number | null>(null);

  const replaceStrokes = (next: SignatureStroke[]) => {
    strokesRef.current = next;
    setStrokes(next);
  };

  const clear = () => {
    replaceStrokes([]);
    onChange('');
    onBlur();
  };

  const finishStroke = (event: PointerEvent<SVGSVGElement>) => {
    if (activePointer.current !== event.pointerId) return;
    activePointer.current = null;
    const next = appendPoint(strokesRef.current, pointFromEvent(event));
    replaceStrokes(next);
    onChange(isMeaningfulSignature(next) ? encodeDrawnSignature(next) : '');
    onBlur();
  };

  const cancelStroke = () => {
    if (activePointer.current === null) return;
    activePointer.current = null;
    const next = strokesRef.current.slice(0, -1);
    replaceStrokes(next);
    onChange(isMeaningfulSignature(next) ? encodeDrawnSignature(next) : '');
    onBlur();
  };

  if (mode === 'type') {
    return (
      <div className="mt-2">
        <input
          id={id}
          type="text"
          className="input-k12"
          maxLength={120}
          autoComplete="off"
          placeholder="Type your signature"
          aria-labelledby={labelledBy}
          aria-describedby={describedBy}
          disabled={disabled}
          data-testid="signer-signature"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onBlur={onBlur}
        />
        <button
          type="button"
          className="mt-2 text-[13px] font-bold text-brand-sky disabled:opacity-50"
          disabled={disabled}
          onClick={() => {
            onChange('');
            setMode('draw');
          }}
        >
          Draw my signature instead
        </button>
      </div>
    );
  }

  return (
    <div className="mt-2" data-testid="signer-signature-pad">
      <input
        type="hidden"
        name="signer_signature"
        value={value}
        disabled={disabled}
        data-testid="signer-signature"
      />
      <svg
        id={id}
        viewBox={`0 0 ${VIEWBOX_WIDTH} ${VIEWBOX_HEIGHT}`}
        className="h-44 w-full touch-none rounded-2xl border-2 border-dashed border-brand-sky/50 bg-white shadow-inner"
        role="img"
        aria-labelledby={labelledBy}
        aria-describedby={describedBy}
        data-testid="signature-canvas"
        onPointerDown={(event) => {
          if (disabled) return;
          event.currentTarget.setPointerCapture?.(event.pointerId);
          activePointer.current = event.pointerId;
          const point = pointFromEvent(event);
          replaceStrokes([...strokesRef.current, [point]]);
        }}
        onPointerMove={(event) => {
          if (disabled || activePointer.current !== event.pointerId) return;
          const point = pointFromEvent(event);
          replaceStrokes(appendPoint(strokesRef.current, point));
        }}
        onPointerUp={finishStroke}
        onPointerCancel={cancelStroke}
      >
        <line x1="34" y1="144" x2="606" y2="144" stroke="#cbd5e1" strokeWidth="2" />
        {strokes.map((stroke, strokeIndex) => (
          <polyline
            key={strokeIndex}
            points={stroke
              .map(([x, y]) => `${Math.round(x * VIEWBOX_WIDTH)},${Math.round(y * VIEWBOX_HEIGHT)}`)
              .join(' ')}
            fill="none"
            stroke="#172554"
            strokeWidth="5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ))}
        {strokes.length === 0 && (
          <text x="320" y="84" textAnchor="middle" fill="#64748b" fontSize="20">
            Sign here with your finger, mouse or trackpad
          </text>
        )}
      </svg>
      {value.startsWith('drawn:v1:') && (
        <p className="mt-2 text-[13px] font-bold text-brand-mint" data-testid="signature-captured">
          ✓ Signature captured
        </p>
      )}
      <div className="mt-2 flex flex-wrap gap-x-5 gap-y-2">
        <button
          type="button"
          className="text-[13px] font-bold text-brand-sky disabled:opacity-50"
          disabled={disabled || strokes.length === 0}
          onClick={clear}
          data-testid="clear-signature"
        >
          Clear signature
        </button>
        <button
          type="button"
          className="text-[13px] font-bold text-slate2 disabled:opacity-50"
          disabled={disabled}
          onClick={() => {
            clear();
            setMode('type');
          }}
        >
          Type my signature instead
        </button>
      </div>
    </div>
  );
}
