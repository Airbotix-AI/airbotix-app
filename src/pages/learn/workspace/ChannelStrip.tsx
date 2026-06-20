import { useState } from 'react';

import { PianoRoll } from './PianoRoll';
import type { InstrumentMeta, ScoreTrack } from './MusicScorePlayer';

export interface TrackEdit {
  displayName: string;
  octaveShift: number;
  pan: number;
  role: ScoreTrack['role'];
}

export function ChannelStrip({
  index,
  track,
  meta,
  position,
  totalDuration,
  isMuted,
  isSolo,
  volume,
  tempo,
  onToggleMute,
  onToggleSolo,
  onVolume,
  onReroll,
  onDownloadTrack,
  onSaveTrack,
  onDeleteTrack,
  savingState,
}: {
  index: number;
  track: ScoreTrack;
  meta: InstrumentMeta;
  position: number;
  totalDuration: number;
  isMuted: boolean;
  isSolo: boolean;
  volume: number;
  tempo: number;
  onToggleMute: () => void;
  onToggleSolo: () => void;
  onVolume: (v: number) => void;
  onReroll?: (idx: number) => void;
  onDownloadTrack?: (idx: number) => void;
  onSaveTrack?: (idx: number) => void;
  onDeleteTrack?: (idx: number) => void;
  savingState?: Record<string, boolean>;
}) {
  const [editOpen, setEditOpen] = useState(false);
  const [edit, setEdit] = useState<TrackEdit>({
    displayName: meta.label,
    octaveShift: 0,
    pan: 0,
    role: track.role,
  });
  const [hovered, setHovered] = useState(false);

  const isSaving = savingState?.[`track-${index}`] ?? false;

  return (
    <div
      className="flex border-b border-slate-800 hover:bg-slate-900/40 transition-colors"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div className="w-48 shrink-0 p-3 border-r border-slate-800 bg-slate-900/30">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-[18px]">{meta.emoji}</span>
          <span className="inline-block w-2 h-2 rounded-full" style={{ backgroundColor: meta.color.hex }} />
          <div className="text-[10px] font-bold tracking-[0.10em] text-slate-400">TRACK {index + 1}</div>
        </div>
        <div className="text-[13px] font-bold text-slate-100 mb-1 truncate">{edit.displayName}</div>
        <div className="text-[10px] text-slate-500 mb-2">{track.notes.length} notes</div>

        <div className="flex items-center gap-1 mb-2 flex-wrap">
          <button
            onClick={onToggleMute}
            className={
              isMuted
                ? 'rounded-md bg-brand-coral text-white w-7 h-7 text-[10px] font-bold inline-flex items-center justify-center'
                : 'rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 w-7 h-7 text-[10px] font-bold inline-flex items-center justify-center'
            }
            title="Mute"
          >
            M
          </button>
          <button
            onClick={onToggleSolo}
            className={
              isSolo
                ? 'rounded-md bg-brand-sunshine text-ink w-7 h-7 text-[10px] font-bold inline-flex items-center justify-center'
                : 'rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 w-7 h-7 text-[10px] font-bold inline-flex items-center justify-center'
            }
            title="Solo"
          >
            S
          </button>
          <button
            onClick={() => setEditOpen((v) => !v)}
            className={
              editOpen
                ? 'rounded-md bg-brand-coral text-white w-7 h-7 text-[10px] inline-flex items-center justify-center'
                : 'rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 w-7 h-7 text-[10px] inline-flex items-center justify-center'
            }
            title="Edit track"
          >
            ✏
          </button>
          {onDeleteTrack && (
            <button
              onClick={() => onDeleteTrack(index)}
              className="rounded-md bg-slate-800 hover:bg-red-900 text-slate-400 hover:text-red-300 w-7 h-7 text-[11px] inline-flex items-center justify-center transition-colors"
              title="Delete track"
            >
              ✕
            </button>
          )}
          {hovered && (
            <>
              {onReroll && (
                <button
                  onClick={() => onReroll(index)}
                  className="rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 w-7 h-7 text-[10px] inline-flex items-center justify-center"
                  title="Re-roll this track"
                >
                  🔄
                </button>
              )}
              {onDownloadTrack && (
                <button
                  onClick={() => onDownloadTrack(index)}
                  className="rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 w-7 h-7 text-[10px] inline-flex items-center justify-center"
                  title="Download track"
                >
                  ↓
                </button>
              )}
              {onSaveTrack && (
                <button
                  onClick={() => onSaveTrack(index)}
                  disabled={isSaving}
                  className="rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 w-7 h-7 text-[10px] inline-flex items-center justify-center disabled:opacity-40"
                  title="Save track"
                >
                  {isSaving ? '…' : '💾'}
                </button>
              )}
            </>
          )}
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[10px] text-slate-500 font-bold">VOL</span>
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={volume}
            onChange={(e) => onVolume(Number(e.target.value))}
            className="flex-1 accent-brand-coral"
          />
        </div>

        {editOpen && (
          <div className="mt-3 rounded-xl bg-slate-900 border border-slate-700 p-3 text-[11px]">
            <div className="font-bold text-slate-300 mb-2">✏ Edit Track</div>
            <label className="block mb-2">
              <span className="text-slate-400 block mb-0.5">Name</span>
              <input
                type="text"
                value={edit.displayName}
                onChange={(e) => setEdit((v) => ({ ...v, displayName: e.target.value }))}
                className="w-full rounded-md bg-slate-800 border border-slate-700 px-2 py-1 text-slate-100 text-[11px] focus:outline-none focus:border-brand-coral"
              />
            </label>
            <label className="block mb-2">
              <span className="text-slate-400 block mb-0.5">Octave shift: {edit.octaveShift > 0 ? `+${edit.octaveShift}` : edit.octaveShift}</span>
              <input
                type="range"
                min={-2}
                max={2}
                step={1}
                value={edit.octaveShift}
                onChange={(e) => setEdit((v) => ({ ...v, octaveShift: Number(e.target.value) }))}
                className="w-full accent-brand-coral"
              />
            </label>
            <label className="block mb-2">
              <span className="text-slate-400 block mb-0.5">Pan: {edit.pan === 0 ? 'Center' : edit.pan > 0 ? `R${edit.pan}` : `L${Math.abs(edit.pan)}`}</span>
              <input
                type="range"
                min={-1}
                max={1}
                step={0.1}
                value={edit.pan}
                onChange={(e) => setEdit((v) => ({ ...v, pan: Number(e.target.value) }))}
                className="w-full accent-brand-coral"
              />
            </label>
            <label className="block mb-3">
              <span className="text-slate-400 block mb-0.5">Role</span>
              <select
                value={edit.role ?? ''}
                onChange={(e) => setEdit((v) => ({ ...v, role: (e.target.value as ScoreTrack['role']) || undefined }))}
                className="w-full rounded-md bg-slate-800 border border-slate-700 px-2 py-1 text-slate-100 text-[11px] focus:outline-none"
              >
                <option value="">— unset —</option>
                <option value="lead">Lead</option>
                <option value="rhythm">Rhythm</option>
                <option value="harmony">Harmony</option>
                <option value="percussion">Percussion</option>
                <option value="fx">FX</option>
              </select>
            </label>
            <div className="flex gap-1.5 flex-wrap">
              {onReroll && (
                <button
                  onClick={() => { onReroll(index); setEditOpen(false); }}
                  className="rounded-full bg-slate-700 hover:bg-slate-600 text-slate-200 px-2 py-1 text-[10px] font-semibold"
                >
                  🔄 Re-roll
                </button>
              )}
              {onDownloadTrack && (
                <button
                  onClick={() => { onDownloadTrack(index); setEditOpen(false); }}
                  className="rounded-full bg-slate-700 hover:bg-slate-600 text-slate-200 px-2 py-1 text-[10px] font-semibold"
                >
                  ↓ Download
                </button>
              )}
              <button
                onClick={() => setEditOpen(false)}
                className="rounded-full bg-brand-coral text-white px-2 py-1 text-[10px] font-semibold"
              >
                ✓ Done
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="flex-1 min-w-0 p-3 relative">
        <PianoRoll
          notes={shiftOctave(track.notes, edit.octaveShift)}
          totalDuration={totalDuration}
          tempo={tempo}
          color={meta.color}
          muted={isMuted}
        />
        <div
          className="absolute top-3 bottom-3 w-px bg-slate-100/80"
          style={{
            left: `calc(0.75rem + (100% - 1.5rem) * ${totalDuration > 0 ? Math.min(1, position / totalDuration) : 0})`,
          }}
        />
      </div>
    </div>
  );
}

function shiftOctave(notes: ScoreTrack['notes'], shift: number) {
  if (shift === 0) return notes;
  return notes.map((n) => {
    const m = n.note.match(/^([A-Ga-g][#b]?)(\d+)$/);
    if (!m) return n;
    const newOctave = Number(m[2]) + shift;
    return { ...n, note: `${m[1]}${Math.max(0, Math.min(9, newOctave))}` };
  });
}
