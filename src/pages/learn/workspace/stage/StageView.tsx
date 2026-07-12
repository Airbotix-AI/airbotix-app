// The theater: 5 fixed instrument positions, spotlight, neon marquee,
// performance pulses, walk lights and the composing overlay
// (music-stage-prd.md §3.1–§3.2, mockup v2). Visual assets are emoji glyphs
// (V1, PRD OQ-2). Scenery colors live in stage.css (approved dark scene).

import clsx from 'clsx';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';

import {
  COMPOSING_TITLE,
  EMPTY_STAGE_HINT,
  EMPTY_STAGE_HINT_SUB,
  type StageSlotId,
} from './stageData';
import { STAGE_STEPS } from './scoreUtils';
import './stage.css';

const PULSE_MS = 110; // glyph snap-back ≤120ms (PRD §3.1)
const ENTER_STAGGER_MS = 80;

export interface StageSlotView {
  id: StageSlotId;
  emoji: string;
  label: string;
  /** "⚡ Electric Crunch" — shown under the selected instrument. */
  styleLabel: string | null;
  /** Muted / style None → greyscale dim (PRD §3.1). */
  off: boolean;
}

export function StageView({
  slots,
  empty,
  marquee,
  selected,
  onSelect,
  activeStep,
  composingSubtitle,
  entering,
  registerPulse,
}: {
  slots: StageSlotView[];
  empty: boolean;
  marquee: string;
  selected: StageSlotId | null;
  onSelect: (id: StageSlotId) => void;
  /** Lit walk-light index while playing, null when stopped. */
  activeStep: number | null;
  /** Non-null while a generation is in flight — shows the overlay. */
  composingSubtitle: string | null;
  /** True right after the first generation — staggered pop-in. */
  entering: boolean;
  /** Subscribe stage pulses to note triggers; returns unsubscribe. */
  registerPulse: (cb: (slot: StageSlotId) => void) => () => void;
}) {
  const stageRef = useRef<HTMLDivElement>(null);
  const instRefs = useRef<Partial<Record<StageSlotId, HTMLButtonElement | null>>>({});
  const pulseTimers = useRef<Partial<Record<StageSlotId, number>>>({});
  const [spot, setSpot] = useState<{ beamLeft: number; poolLeft: number; poolTop: number } | null>(null);

  // Spotlight follows the selected instrument (450ms spring via CSS).
  useLayoutEffect(() => {
    const moveSpot = () => {
      const stage = stageRef.current;
      const el = selected ? instRefs.current[selected] : null;
      if (!stage || !el) {
        setSpot(null);
        return;
      }
      const stageR = stage.getBoundingClientRect();
      const r = el.getBoundingClientRect();
      const cx = r.left - stageR.left + r.width / 2;
      setSpot({ beamLeft: cx - 125, poolLeft: cx - 100, poolTop: r.bottom - stageR.top - 12 });
    };
    moveSpot();
    window.addEventListener('resize', moveSpot);
    return () => window.removeEventListener('resize', moveSpot);
  }, [selected, slots]);

  // Performance pulses arrive from the playback engine; toggling a CSS class
  // imperatively keeps 16th-note pulses from re-rendering the whole pane.
  useEffect(() => {
    const timers = pulseTimers.current;
    const unsubscribe = registerPulse((slot) => {
      const el = instRefs.current[slot];
      if (!el) return;
      el.classList.add('is-pulsing');
      const prev = timers[slot];
      if (prev) window.clearTimeout(prev);
      timers[slot] = window.setTimeout(() => el.classList.remove('is-pulsing'), PULSE_MS);
    });
    return () => {
      unsubscribe();
      for (const id of Object.values(timers)) {
        if (id) window.clearTimeout(id);
      }
    };
  }, [registerPulse]);

  return (
    <div ref={stageRef} className={clsx('mstage', empty && 'is-empty')} data-testid="music-stage">
      <div className="mstage-bricks" />
      <div className="mstage-curtain mstage-curtain--left" />
      <div className="mstage-curtain mstage-curtain--right" />
      <div className="mstage-marquee" data-testid="stage-marquee">{marquee}</div>
      <div
        className="mstage-spotlight"
        style={spot ? { left: spot.beamLeft, opacity: 1 } : { left: '50%', opacity: 0 }}
      />
      <div className="mstage-floor" />
      <div
        className="mstage-spot-pool"
        style={spot ? { left: spot.poolLeft, top: spot.poolTop, opacity: 1 } : { left: '50%', top: '70%', opacity: 0 }}
      />

      <div className="mstage-band">
        {slots.map((s, i) => (
          <button
            key={s.id}
            ref={(el) => {
              instRefs.current[s.id] = el;
            }}
            type="button"
            className={clsx(
              'mstage-inst',
              selected === s.id && 'is-selected',
              s.off && 'is-off',
              entering && 'is-entering',
            )}
            style={{ '--mstage-enter-delay': `${i * ENTER_STAGGER_MS}ms` } as React.CSSProperties}
            disabled={empty}
            aria-label={s.styleLabel ? `${s.label} — ${s.styleLabel}` : s.label}
            data-testid={`stage-inst-${s.id}`}
            onClick={() => onSelect(s.id)}
          >
            <span className="mstage-inner">
              <span className="mstage-glyph" aria-hidden="true">{s.emoji}</span>
              <span className="mstage-tag">{s.label}</span>
              <span className="mstage-style-tag" data-testid={`stage-style-${s.id}`}>
                {s.styleLabel ?? ' '}
              </span>
            </span>
          </button>
        ))}
      </div>

      {empty && (
        <div className="mstage-empty-hint" data-testid="stage-empty-hint">
          {EMPTY_STAGE_HINT}
          <br />
          {EMPTY_STAGE_HINT_SUB}
        </div>
      )}

      <div className="mstage-steplights" aria-hidden="true">
        {Array.from({ length: STAGE_STEPS }, (_, i) => (
          <i
            key={i}
            className={clsx(i % 4 === 0 && 'is-beat', activeStep === i && 'is-on')}
          />
        ))}
      </div>

      {composingSubtitle !== null && (
        <div className="mstage-composing" data-testid="stage-composing" role="status">
          <div className="mstage-beam mstage-beam--l" />
          <div className="mstage-beam mstage-beam--r" />
          <span className="mstage-spark" style={{ left: '24%', top: '30%' }}>✦</span>
          <span className="mstage-spark" style={{ left: '70%', top: '22%', animationDelay: '.3s' }}>✧</span>
          <span className="mstage-spark" style={{ left: '56%', top: '60%', animationDelay: '.6s' }}>✦</span>
          <span className="mstage-spark" style={{ left: '34%', top: '68%', animationDelay: '.15s' }}>✧</span>
          <div className="mstage-composing-msg">
            {COMPOSING_TITLE}
            <small>{composingSubtitle}</small>
          </div>
        </div>
      )}
    </div>
  );
}
