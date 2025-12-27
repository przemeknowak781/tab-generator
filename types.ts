
export interface ParsedNote {
  midi: number;
  time: number;
  duration: number;
  name: string;
  velocity: number;
}

export interface RenderableNote {
  keys: string[];
  duration: string;
  positions: { str: number; fret: number }[];
  accidentals: (string | undefined)[];
  midis: number[];
  originalIndex: number;
  startTime: number;
  durationSec?: number; // Rzeczywisty czas trwania w sekundach dla odtwarzania
  isRest?: boolean;
  voice?: number; // 0 for melody, 1 for bass
  // Added playbackId to track which note is currently being played for highlighting
  playbackId?: number;
}

export interface RenderableMeasure {
  index: number;
  notesVoice1: RenderableNote[]; // Melody
  notesVoice2: RenderableNote[]; // Bass/Accompaniment
  width: number;
}

export interface ProcessedTrack {
  measures: RenderableMeasure[];
  tuning: string;
  transposition: number;
  timeSignature: number[];
  bpm: number;
}

export interface MidiTrack {
  id: number;
  name: string;
  instrument: string;
  notes: ParsedNote[];
  bpm: number;
  timeSignature: number[];
}
