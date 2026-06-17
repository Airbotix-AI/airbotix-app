import * as Tone from 'tone';

import { makeSynthFor } from './MusicScorePlayer';
import type { MusicScore } from './MusicScorePlayer';

function parseDurationBeats(d: string): number {
  const m = d.match(/^(\d+)n$/);
  if (m) return 4 / Number(m[1]);
  const f = parseFloat(d);
  return isNaN(f) ? 0.5 : f;
}

function encodeWav(audioBuffer: Tone.ToneAudioBuffer): Blob {
  const raw = audioBuffer.get();
  if (!raw) return new Blob([], { type: 'audio/wav' });

  const sampleRate = raw.sampleRate;
  const samples = raw.getChannelData(0);
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);
  const writeStr = (offset: number, s: string) => {
    for (let i = 0; i < s.length; i++) view.setUint8(offset + i, s.charCodeAt(i));
  };
  writeStr(0, 'RIFF');
  view.setUint32(4, 36 + samples.length * 2, true);
  writeStr(8, 'WAVE');
  writeStr(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeStr(36, 'data');
  view.setUint32(40, samples.length * 2, true);
  let offset = 44;
  for (let i = 0; i < samples.length; i++, offset += 2) {
    view.setInt16(offset, Math.max(-1, Math.min(1, samples[i])) * 0x7fff, true);
  }
  return new Blob([buffer], { type: 'audio/wav' });
}

export async function encodeWavFromScore(
  score: MusicScore,
  muted: Record<number, boolean>,
  singleTrackIdx?: number,
): Promise<Blob> {
  let maxBeat = 0;
  for (const t of score.tracks) {
    for (const n of t.notes) {
      const end = n.time + parseDurationBeats(n.duration);
      if (end > maxBeat) maxBeat = end;
    }
  }
  const duration = (maxBeat * 60) / score.tempo;
  if (duration <= 0) return new Blob([], { type: 'audio/wav' });

  const audioBuffer = await Tone.Offline(({ transport }) => {
    transport.bpm.value = score.tempo;
    score.tracks.forEach((t, idx) => {
      if (singleTrackIdx !== undefined && idx !== singleTrackIdx) return;
      if (singleTrackIdx === undefined && muted[idx]) return;
      const synth = makeSynthFor(t.instrument);
      synth.toDestination();
      const isDrum = t.instrument === 'drums' || t.instrument === 'percussion';
      if (isDrum) {
        const part = new Tone.Part(
          (time, value) => {
            const v = value as { drum: string };
            const note = v.drum === 'kick' ? 'C1' : 'A1';
            const dur = v.drum === 'kick' ? '8n' : '16n';
            (synth as Tone.MembraneSynth).triggerAttackRelease(note, dur, time);
          },
          t.notes.map((n) => ({ time: n.time * (60 / score.tempo), drum: n.note, duration: n.duration })),
        );
        part.start(0);
      } else {
        const part = new Tone.Part(
          (time, value) => {
            const v = value as { note: string; duration: string };
            (synth as Tone.PolySynth).triggerAttackRelease(v.note, v.duration, time);
          },
          t.notes.map((n) => ({ time: n.time * (60 / score.tempo), note: n.note, duration: n.duration })),
        );
        part.start(0);
      }
    });
    transport.start();
  }, duration + 1);

  return encodeWav(audioBuffer);
}
