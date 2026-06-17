import { useRef, useState } from 'react';

export type AudioMeta = { bpm: number; key: string; duration: number };

const MAX_BYTES = 5 * 1024 * 1024;

export function AudioReferenceUploader({
  value,
  onAnalyzed,
  onRemove,
}: {
  value: { filename: string; meta: AudioMeta } | null;
  onAnalyzed: (filename: string, meta: AudioMeta) => void;
  onRemove: () => void;
}) {
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    if (file.size > MAX_BYTES) {
      setError('File too large (max 5 MB).');
      return;
    }
    setError(null);
    setAnalyzing(true);
    try {
      const meta = await analyzeAudio(file);
      onAnalyzed(file.name, meta);
    } catch {
      setError('Could not analyze audio. Try a different file.');
    } finally {
      setAnalyzing(false);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    e.target.value = '';
  };

  if (value) {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-hairline bg-canvas-pure px-4 py-3">
        <span className="text-[18px]">🎵</span>
        <div className="flex-1 min-w-0">
          <div className="text-[13px] font-semibold text-ink truncate">{value.filename}</div>
          <div className="text-[11px] text-ink-soft">
            {value.meta.bpm} BPM · {value.meta.key} · {fmtDuration(value.meta.duration)}
          </div>
        </div>
        <button
          type="button"
          onClick={onRemove}
          className="text-[12px] text-steel hover:text-ink-soft font-semibold shrink-0"
        >
          ✕ Remove
        </button>
      </div>
    );
  }

  return (
    <div
      onDrop={handleDrop}
      onDragOver={(e) => e.preventDefault()}
      className="rounded-xl border-2 border-dashed border-hairline hover:border-brand-coral bg-canvas-pure px-4 py-4 text-center cursor-pointer transition-colors"
      onClick={() => inputRef.current?.click()}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') inputRef.current?.click(); }}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".mp3,.wav,.m4a"
        className="hidden"
        onChange={handleChange}
      />
      {analyzing ? (
        <div className="text-[12px] text-ink-soft">
          <span className="inline-block animate-pulse">Analyzing audio…</span>
        </div>
      ) : (
        <>
          <div className="text-[18px] mb-1">🎙</div>
          <div className="text-[12px] text-ink-soft">
            Upload a melody or hum (mp3 / wav / m4a, max 5 MB)
          </div>
          <div className="text-[11px] text-steel mt-1">Click or drag & drop</div>
        </>
      )}
      {error && <div className="mt-2 text-[11px] text-brand-coral">{error}</div>}
    </div>
  );
}

async function analyzeAudio(file: File): Promise<AudioMeta> {
  const arrayBuffer = await file.arrayBuffer();
  const ctx = new AudioContext();
  const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
  await ctx.close();

  const duration = audioBuffer.duration;
  const bpm = estimateBpm(audioBuffer);

  return { bpm, key: 'C major', duration };
}

function estimateBpm(buffer: AudioBuffer): number {
  const data = buffer.getChannelData(0);
  const sampleRate = buffer.sampleRate;
  const frameSize = Math.floor(sampleRate * 0.1);
  const rmsFrames: number[] = [];

  for (let i = 0; i + frameSize <= data.length; i += frameSize) {
    let sum = 0;
    for (let j = i; j < i + frameSize; j++) sum += data[j] * data[j];
    rmsFrames.push(Math.sqrt(sum / frameSize));
  }

  const mean = rmsFrames.reduce((a, b) => a + b, 0) / rmsFrames.length;
  const threshold = mean * 1.4;

  const peakFrames: number[] = [];
  for (let i = 1; i < rmsFrames.length - 1; i++) {
    if (rmsFrames[i] > threshold && rmsFrames[i] >= rmsFrames[i - 1] && rmsFrames[i] >= rmsFrames[i + 1]) {
      peakFrames.push(i);
    }
  }

  if (peakFrames.length < 2) return 120;

  const intervals: number[] = [];
  for (let i = 1; i < peakFrames.length; i++) {
    intervals.push((peakFrames[i] - peakFrames[i - 1]) * 0.1);
  }
  const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
  if (avgInterval <= 0) return 120;

  const rawBpm = 60 / avgInterval;
  if (rawBpm < 40) return Math.round(rawBpm * 2);
  if (rawBpm > 220) return Math.round(rawBpm / 2);
  return Math.round(rawBpm);
}

function fmtDuration(s: number): string {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, '0')}`;
}
