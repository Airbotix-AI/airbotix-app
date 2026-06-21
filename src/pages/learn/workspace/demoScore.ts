import type { MusicScore } from './MusicScorePlayer';

export const DEMO_SCORE: MusicScore = {
  title: 'Demo Track',
  tempo: 120,
  key: 'C major',
  genre: 'Pop',
  tracks: [
    {
      instrument: 'drums',
      role: 'percussion',
      notes: Array.from({ length: 8 }, (_, i) => [
        { time: i * 2,        note: 'kick',  duration: '4n' },
        { time: i * 2 + 1,   note: 'snare', duration: '4n' },
        { time: i * 2 + 0.5, note: 'hat',   duration: '8n' },
        { time: i * 2 + 1.5, note: 'hat',   duration: '8n' },
      ]).flat(),
    },
    {
      instrument: 'bass',
      role: 'rhythm',
      notes: Array.from({ length: 8 }, (_, i) => ({
        time: i * 2,
        note: ['C2', 'C2', 'G2', 'G2', 'A2', 'A2', 'F2', 'F2'][i],
        duration: '2n',
      })),
    },
    {
      instrument: 'piano',
      role: 'harmony',
      notes: Array.from({ length: 16 }, (_, i) => ({
        time: i,
        note: ['C4', 'E4', 'G4', 'E4', 'C4', 'E4', 'G4', 'B4',
               'A3', 'C4', 'E4', 'C4', 'F3', 'A3', 'C4', 'A3'][i],
        duration: '4n',
      })),
    },
    {
      instrument: 'lead_vocals',
      role: 'lead',
      notes: Array.from({ length: 8 }, (_, i) => ({
        time: i * 2,
        note: ['E4', 'D4', 'C4', 'D4', 'E4', 'E4', 'D4', 'C4'][i],
        duration: '2n',
      })),
    },
    {
      instrument: 'synth',
      role: 'fx',
      notes: Array.from({ length: 8 }, (_, i) => ({
        time: i * 2 + 0.5,
        note: ['G4', 'A4', 'G4', 'F4', 'E4', 'F4', 'G4', 'E4'][i],
        duration: '4n',
      })),
    },
  ],
};
