import { Midi } from '@tonejs/midi';
import { ParsedNote, RenderableNote, MidiTrack, ProcessedTrack, RenderableMeasure } from '../types';

// Stroje gitary - MIDI values for strings 1-6 (E4 to E2)
// Struna 1 (najwyższa) -> Struna 6 (najniższa)
export const TUNINGS: Record<string, { notes: number[], name: string }> = {
  'standard': { notes: [64, 59, 55, 50, 45, 40], name: 'Standard E' },      // E4 B3 G3 D3 A2 E2
  'drop-d': { notes: [64, 59, 55, 50, 45, 38], name: 'Drop D' },          // E4 B3 G3 D3 A2 D2
  'dadgad': { notes: [62, 57, 55, 50, 45, 38], name: 'DADGAD' },          // D4 A3 G3 D3 A2 D2
  'open-g': { notes: [62, 59, 55, 50, 47, 38], name: 'Open G' },          // D4 B3 G3 D3 G2 D2
};

// Domyślny strój (można zmienić na UI w przyszłości)
const CURRENT_TUNING = 'standard';
const TUNING_STANDARD = TUNINGS[CURRENT_TUNING].notes;

const getBestVexDuration = (beats: number): string => {
  if (beats >= 3.5) return 'w';
  if (beats >= 2.7) return 'hd';
  if (beats >= 1.7) return 'h';
  if (beats >= 1.3) return 'qd';
  if (beats >= 0.8) return 'q';
  if (beats >= 0.6) return '8d';
  if (beats >= 0.35) return '8';
  if (beats >= 0.18) return '16';
  return '32';
};

const getBeatsFromVex = (dur: string): number => {
  const cleanDur = dur.replace('r', '');
  const map: Record<string, number> = {
    'w': 4, 'hd': 3, 'h': 2, 'qd': 1.5, 'q': 1, '8d': 0.75, '8': 0.5, '16': 0.25, '32': 0.125
  };
  return map[cleanDur] || 0.25;
};

export const parseMidiFile = async (file: File): Promise<MidiTrack[]> => {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const midi = new Midi(arrayBuffer);
    const bpm = midi.header.tempos.length > 0 ? midi.header.tempos[0].bpm : 120;
    let timeSignature: number[] = [4, 4];
    if (midi.header.timeSignatures.length > 0) {
      const ts = midi.header.timeSignatures[0].timeSignature;
      if (Array.isArray(ts) && ts.length >= 2) timeSignature = [ts[0], ts[1]];
    }
    return midi.tracks.map((track, index) => {
      const notes = track.notes.map(n => ({
        midi: n.midi, time: n.time, duration: n.duration, name: n.name, velocity: n.velocity
      })).filter(n => n.velocity > 0);
      return {
        id: index, name: track.name || `Track ${index + 1}`,
        instrument: track.instrument.name || "Instrument",
        bpm, timeSignature, notes: notes.sort((a, b) => a.time - b.time),
      };
    }).filter(t => t.notes.length > 0);
  } catch (err) {
    throw new Error("Błąd podczas przetwarzania pliku MIDI.");
  }
};

// --- Key Detection and Enharmonic Logic (Phase 5) ---
const getBestAccidentalSystem = (notes: ParsedNote[]): 'sharps' | 'flats' => {
  let sharpScore = 0;
  let flatScore = 0;

  notes.forEach(n => {
    const pc = n.midi % 12;
    // C#, Eb, F#, Ab, Bb
    if (pc === 1 || pc === 6) sharpScore++;
    if (pc === 3 || pc === 8 || pc === 10) flatScore++;
  });

  return sharpScore >= flatScore ? 'sharps' : 'flats';
};

export const getNoteName = (midi: number, system: 'sharps' | 'flats' = 'sharps'): { key: string, accidental?: string } => {
  const notesSharp = ['c', 'c#', 'd', 'd#', 'e', 'f', 'f#', 'g', 'g#', 'a', 'a#', 'b'];
  const notesFlat = ['c', 'db', 'd', 'eb', 'e', 'f', 'gb', 'g', 'ab', 'a', 'bb', 'b'];
  const names = system === 'sharps' ? notesSharp : notesFlat;

  // Guitar is a transposing instrument: Sounding pitch is 1 octave lower than written.
  // We need to shift the visual key UP by 1 octave to appear correctly on the staff.
  const visualMidi = midi + 12;
  const octave = Math.floor(visualMidi / 12) - 1;
  const noteNameFull = names[visualMidi % 12]; // Use visualMidi here

  // VexFlow requires the base note for the 'key' (e.g., "c/4") 
  // and the accidental as a separate modifier.
  const noteBase = noteNameFull[0];
  let accidental: string | undefined = undefined;
  if (noteNameFull.length > 1) {
    accidental = noteNameFull.slice(1);
  }

  return { key: `${noteBase}/${octave}`, accidental };
};

// --- Biomechanical Optimizer Constants ---
// --- Biomechanical Optimizer Constants (Adapted from 'tuttut') ---
const WEIGHTS = {
  // 'b' parameter for Laplace distribution (Distance).
  // Tuttut uses b=1, which implies cost = |distance_normalized|.
  // Smaller 'b' would penalize movement more heavily.
  b: 1.0,

  // Weights for the log(1 + x * W) terms
  HEIGHT: 1.0,
  STRETCH: 1.0,
  CHANGED_STRINGS: 1.0,

  // Normalization constants
  N_FRETS: 20,
  N_STRINGS: 6,
  MAX_STRETCH_REF: 5
};

interface Fingering {
  str: number;
  fret: number;
  midi: number;
}

interface State {
  fingerings: Fingering[];
  avgFret: number;
  maxStretch: number;
  isBarre: boolean;
}

// Map pitch to all possible (string, fret) combinations
const getPossibleFingerings = (midi: number, tuning: number[]): Fingering[] => {
  const options: Fingering[] = [];
  tuning.forEach((base, strIdx) => {
    const fret = midi - base;
    if (fret >= 0 && fret <= 20) {
      options.push({ str: strIdx + 1, fret, midi });
    }
  });
  return options;
};

// Generate all valid ways to play a set of notes (slice) simultaneously
const generateStateSpace = (midis: number[], tuning: number[]): State[] => {
  if (midis.length === 0) return [{ fingerings: [], avgFret: 0, maxStretch: 0, isBarre: false }];

  const noteOptions = midis.map(m => getPossibleFingerings(m, tuning));

  // Cartesian product with pruning
  let combinations: Fingering[][] = [[]];
  for (const options of noteOptions) {
    const next: Fingering[][] = [];
    for (const combo of combinations) {
      for (const opt of options) {
        // String collision check
        if (!combo.some(c => c.str === opt.str)) {
          next.push([...combo, opt]);
        }
      }
    }
    combinations = next;
    if (combinations.length > 100) combinations.length = 100; // Cap search space
  }

  const finalStates = combinations.map(combo => {
    const frets = combo.filter(f => f.fret > 0).map(f => f.fret);
    const avgFret = frets.length > 0 ? frets.reduce((a, b) => a + b, 0) / frets.length : 0;
    const maxFret = frets.length > 0 ? Math.max(...frets) : 0;
    const minFret = frets.length > 0 ? Math.min(...frets) : 0;

    // Detect Barre: 3+ non-zero notes on the same fret
    const fretCounts = new Map<number, number>();
    frets.forEach(f => fretCounts.set(f, (fretCounts.get(f) || 0) + 1));
    const isBarre = Array.from(fretCounts.values()).some(v => v >= 3);

    return {
      fingerings: combo,
      avgFret,
      maxStretch: maxFret - minFret,
      isBarre
    };
  }).filter(state => state.maxStretch <= 5);

  if (finalStates.length === 0) {
    // Serious Fallback: If no valid biomechanical states found
    if (combinations.length > 0) {
      return [{
        fingerings: combinations[0],
        avgFret: combinations[0].reduce((a, b) => a + (b?.fret || 0), 0) / combinations[0].length,
        maxStretch: 10,
        isBarre: false
      }];
    }
    // Critical: No valid fingerings at all (e.g. note out of range)
    return [{ fingerings: [], avgFret: 0, maxStretch: 0, isBarre: false }];
  }

  return finalStates;
};

// Helper to count how many strings changed active status
const countChangedStrings = (prev: State, curr: State): number => {
  const prevStrings = new Set(prev.fingerings.filter(f => f.fret > 0).map(f => f.str));
  const currStrings = new Set(curr.fingerings.map(f => f.str));

  // Tuttut logic: n_changed = len(curr) - len(intersection)
  // This counts how many of the CURRENT strings were NOT used in the PREVIOUS shape.
  let intersection = 0;
  currStrings.forEach(s => {
    if (prevStrings.has(s)) intersection++;
  });

  return curr.fingerings.length - intersection;
};

// Calculate cost to transition from state A to state B
// Based on 'tuttut' "Easiness" formula:
// Easiness = Laplace(dHeight) * 1/(1 + height) * 1/(1 + span) * 1/(1 + n_changed)
// Cost = -log(Easiness) ~ |dHeight| + log(1 + height) + log(1 + span) + log(1 + n_changed)
const calculateTransitionCost = (prev: State, curr: State): number => {
  // 1. Normalized Distance (dHeight)
  const dist = Math.abs(curr.avgFret - prev.avgFret);
  const dNoteNorm = dist / WEIGHTS.N_FRETS;

  // Dist cost = -log( 1/2b * exp(-|x|/b) ) = log(2b) + |x|/b
  // We can ignore constant log(2b) for optimization comparison
  const costDist = dNoteNorm / WEIGHTS.b;

  // 2. Normalized Height
  const heightNorm = curr.avgFret / WEIGHTS.N_FRETS;
  const costHeight = Math.log(1 + heightNorm * WEIGHTS.HEIGHT);

  // 3. Normalized Span (Stretch)
  const stretchNorm = curr.maxStretch / WEIGHTS.MAX_STRETCH_REF;
  const costStretch = Math.log(1 + stretchNorm * WEIGHTS.STRETCH);

  // 4. Normalized Changed Strings
  const nChanged = countChangedStrings(prev, curr);
  const changedNorm = nChanged / WEIGHTS.N_STRINGS;
  const costChanged = Math.log(1 + changedNorm * WEIGHTS.CHANGED_STRINGS);

  // Barre penalty (kept as an extra distinct factor or integrated into height/stretch?)
  // Tuttut naturally penalizes barre via 'Span' (covering many strings often requires specific spans)
  // but explicit barre penalty is useful for "Lazy" players.
  // We'll add a small linear penalty for barre to break ties.
  const costBarre = curr.isBarre ? 0.5 : 0;

  // Total Cost
  return costDist + costHeight + costStretch + costChanged + costBarre;
};

// Optimized path finding for a sequence of chords (slices)
const findOptimalPath = (slices: number[][], tuning: number[]): Fingering[][] => {
  if (slices.length === 0) return [];

  const graph: Array<Array<{ state: State, minCost: number, prevIdx: number }>> = [];

  // Initialize first layer
  const firstSlice = slices[0];
  const firstStates = generateStateSpace(firstSlice, tuning);
  graph.push(firstStates.map(s => ({ state: s, minCost: s.avgFret * 0.1, prevIdx: -1 })));

  // Forward pass (Viterbi)
  for (let i = 1; i < slices.length; i++) {
    const currentSlice = slices[i];
    const currentStates = generateStateSpace(currentSlice, tuning);
    const previousLayer = graph[i - 1];

    const layer: Array<{ state: State, minCost: number, prevIdx: number }> = [];

    currentStates.forEach(curr => {
      let bestCost = Infinity;
      let bestPrev = 0;

      previousLayer.forEach((prev, pIdx) => {
        const cost = prev.minCost + calculateTransitionCost(prev.state, curr);
        if (cost < bestCost) {
          bestCost = cost;
          bestPrev = pIdx;
        }
      });

      layer.push({ state: curr, minCost: bestCost, prevIdx: bestPrev });
    });

    // Pruning: if layer is too large, keep only the best 30 states to avoid exponential explosion
    if (layer.length > 50) {
      layer.sort((a, b) => a.minCost - b.minCost);
      layer.splice(50);
    }

    graph.push(layer);
  }

  // Backtracking safety
  if (graph.length === 0) return slices.map(() => []);

  const result: Fingering[][] = [];
  let currentLayerIdx = graph.length - 1;
  let bestNodeIdx = 0;
  let minGlobalCost = Infinity;

  const lastLayer = graph[currentLayerIdx];
  if (!lastLayer || lastLayer.length === 0) return slices.map(() => []);

  lastLayer.forEach((node, idx) => {
    if (node.minCost < minGlobalCost) {
      minGlobalCost = node.minCost;
      bestNodeIdx = idx;
    }
  });

  while (currentLayerIdx >= 0) {
    const layer = graph[currentLayerIdx];
    const bestNode = layer[bestNodeIdx];
    if (bestNode) {
      result.unshift(bestNode.state.fingerings);
      bestNodeIdx = bestNode.prevIdx;
    } else {
      result.unshift([]);
    }
    currentLayerIdx--;
  }

  // Ensure output length matches input length
  while (result.length < slices.length) result.push([]);
  return result;
};

// Pomocnicza funkcja do określania czasu trwania (kwantyzacja)
const quantizeDuration = (duration: number, secPerBeat: number): number => {
  const rawBeats = duration / secPerBeat;
  // Kwantyzacja do najbliższej 1/16 nuty (0.25 beata)
  return Math.round(rawBeats * 4) / 4;
};

// Funkcja dzieląca nuty na głosy (Melodia/Bas)
const separateVoices = (notes: ParsedNote[]): { melody: ParsedNote[], bass: ParsedNote[] } => {
  const melody: ParsedNote[] = [];
  const bass: ParsedNote[] = [];

  // 1. Sort all notes chronologically
  const sortedNotes = [...notes].sort((a, b) => a.time - b.time);

  // 2. Group notes by time (using a small tolerance for chords)
  const timeGroups: ParsedNote[][] = [];
  if (sortedNotes.length > 0) {
    let currentGroup = [sortedNotes[0]];
    for (let i = 1; i < sortedNotes.length; i++) {
      if (Math.abs(sortedNotes[i].time - sortedNotes[i - 1].time) < 0.02) {
        currentGroup.push(sortedNotes[i]);
      } else {
        timeGroups.push(currentGroup);
        currentGroup = [sortedNotes[i]];
      }
    }
    timeGroups.push(currentGroup);
  }

  // 3. Process groups to keep voices synchronized
  timeGroups.forEach(group => {
    // Sort group by pitch (ascending)
    group.sort((a, b) => a.midi - b.midi);

    if (group.length > 1) {
      // Multiple notes started at the same time
      bass.push(group[0]); // Lowest to bass
      for (let i = 1; i < group.length; i++) {
        melody.push(group[i]); // Rest to melody
      }
    } else {
      // Single note - determine based on pitch
      if (group[0].midi < 52) { // E3 and below usually bass
        bass.push(group[0]);
      } else {
        melody.push(group[0]);
      }
    }
  });

  return { melody, bass };
};

// Scal nuty startujące w < 20ms w jeden obiekt RenderableNote (akord)
const preprocessChords = (inputNotes: ParsedNote[]): ParsedNote[][] => {
  const chords: ParsedNote[][] = [];
  if (inputNotes.length === 0) return [];

  inputNotes.sort((a, b) => a.time - b.time);
  let currentChord: ParsedNote[] = [inputNotes[0]];

  for (let i = 1; i < inputNotes.length; i++) {
    const n = inputNotes[i];
    const prev = currentChord[0];
    if (Math.abs(n.time - prev.time) < 0.02) { // 20ms tolerance
      currentChord.push(n);
    } else {
      chords.push(currentChord);
      currentChord = [n];
    }
  }
  chords.push(currentChord);
  return chords;
};

export const convertNotesToVexFlow = (
  track: MidiTrack,
  tuningNotes: number[] = TUNING_STANDARD
): ProcessedTrack => {
  const { notes, bpm, timeSignature } = track;
  if (!notes || notes.length === 0) {
    return { measures: [], tuning: "Custom", transposition: 0, timeSignature, bpm };
  }

  const secPerBeat = 60 / bpm;
  const beatsPerBar = timeSignature[0];
  const barDur = beatsPerBar * secPerBeat;

  // --- Phase 1: Global Slice Analysis and Optimization ---
  const allNotes = [...notes].sort((a, b) => a.time - b.time);

  // Fuzzy clustering for the OPTIMIZER as well
  const globalSlicesMidis: number[][] = [];
  const globalSliceObjects: ParsedNote[][] = [];

  if (allNotes.length > 0) {
    let currentSlice = [allNotes[0]];
    let clusterStartTime = allNotes[0].time;

    for (let i = 1; i < allNotes.length; i++) {
      const n = allNotes[i];

      // 35ms tolerance for chord detection globally
      if (Math.abs(n.time - clusterStartTime) < 0.035) {
        currentSlice.push(n);
      } else {
        globalSlicesMidis.push(currentSlice.map(n => n.midi));
        globalSliceObjects.push(currentSlice);

        currentSlice = [n];
        clusterStartTime = n.time;
      }
    }
    globalSlicesMidis.push(currentSlice.map(n => n.midi));
    globalSliceObjects.push(currentSlice);
  }

  // Find globally optimal fingerings using Viterbi
  const optimalFingerings = findOptimalPath(globalSlicesMidis, tuningNotes);

  // Map back to notes using the slice index logic
  const noteFingeringMap = new Map<ParsedNote, Fingering>();

  globalSliceObjects.forEach((sliceNotes, sliceIdx) => {
    const sliceFingerings = optimalFingerings[sliceIdx];
    sliceNotes.forEach(note => {
      const f = sliceFingerings.find(sf => sf.midi === note.midi);
      if (f) noteFingeringMap.set(note, f);
    });
  });

  // Determine best accidental system globally
  const accidentalSystem = getBestAccidentalSystem(notes);

  // --- Phase 2: Measure-by-Measure Rendering ---
  const renderedMeasures: RenderableMeasure[] = [];

  // Group slices into measures
  const measureSlices = new Map<number, ParsedNote[][]>();

  // Determine track duration
  const trackDuration = notes.length > 0
    ? Math.max(...notes.map(n => n.time + n.duration))
    : 0;

  const totalMeasures = Math.ceil(trackDuration / barDur);

  globalSliceObjects.forEach(slice => {
    const startT = slice[0].time; // Use first note time as reference
    // Robust measure assignment: Snap to nearest measure start if very close to boundary
    // Logic: Round to nearest whole bar index? No, standard floor is usually safer
    // but let's accept -0.02s "early" notes as belonging to PREVIOUS measure?
    // Actually standard convention: strict floor, but we might want to shift "slightly early" notes to current bar.
    // Let's stick to simple floor for now, consistent with VexFlow.
    const mIdx = Math.floor((startT + 0.005) / barDur); // +5ms buffer to catch slightly early notes into proper bar?
    // Actually if note is early (time < 0), it goes to -1.

    const targetIdx = Math.max(0, mIdx);
    if (!measureSlices.has(targetIdx)) measureSlices.set(targetIdx, []);
    measureSlices.get(targetIdx)!.push(slice);
  });

  let globalPlaybackId = 0;
  const timeToIdMap = new Map<number, number>();

  const getPlaybackId = (time: number): number => {
    const t = Math.round(time * 1000) / 1000;
    if (timeToIdMap.has(t)) return timeToIdMap.get(t)!;
    const id = globalPlaybackId++;
    timeToIdMap.set(t, id);
    return id;
  };

  for (let currentMeasureIdx = 0; currentMeasureIdx < totalMeasures; currentMeasureIdx++) {
    const mStart = currentMeasureIdx * barDur;
    const slicesInMeasure = measureSlices.get(currentMeasureIdx) || [];

    const melody: RenderableNote[] = [];
    const bass: RenderableNote[] = [];
    let currentMelodyBeat = 0;
    let currentBassBeat = 0;

    const addRests = (target: RenderableNote[], current: number, targetTime: number, isBass: boolean) => {
      let gap = targetTime - current;
      // Quantize gap
      gap = Math.round(gap * 1000) / 1000;

      while (gap > 0.01) { // 10ms minimum rest
        const restDur = getBestVexDuration(gap);
        const restBeats = getBeatsFromVex(restDur);
        target.push({
          keys: [isBass ? "d/4" : "b/4"], duration: restDur + "r",
          positions: [], accidentals: [], midis: [],
          originalIndex: -1, startTime: mStart + current * secPerBeat,
          isRest: true, playbackId: -1, durationSec: restBeats * secPerBeat
        });
        current += restBeats;
        gap -= restBeats;
        gap = Math.round(gap * 1000) / 1000;
      }
      return current;
    };

    slicesInMeasure.forEach(group => {
      const firstNoteTime = group[0].time;
      const t = (firstNoteTime - mStart) / secPerBeat; // In Beats
      const tQuantized = Math.round(t * 100) / 100; // Round to 0.01 beat precision

      const playId = getPlaybackId(firstNoteTime);

      group.sort((a, b) => a.midi - b.midi);

      const bassNoteRaw = (group.length > 1 || group[0].midi < 52) ? group[0] : null;
      // const bassNoteRaw = null; // FORCE DISABLE BASS SPLIT FOR DEBUGGING? No, keep logic.
      const melodyNotesRaw = bassNoteRaw ? group.slice(1) : group;

      if (bassNoteRaw) {
        currentBassBeat = addRests(bass, currentBassBeat, tQuantized, true);
        const fingering = noteFingeringMap.get(bassNoteRaw);
        const { key, accidental } = getNoteName(bassNoteRaw.midi, accidentalSystem);
        const dur = getBestVexDuration(bassNoteRaw.duration / secPerBeat);

        bass.push({
          keys: [key], accidentals: [accidental],
          positions: fingering ? [{ str: fingering.str, fret: fingering.fret }] : [],
          midis: [bassNoteRaw.midi],
          duration: dur, isRest: false, durationSec: getBeatsFromVex(dur) * secPerBeat,
          startTime: firstNoteTime, originalIndex: 0, playbackId: playId
        });
        currentBassBeat += getBeatsFromVex(dur);
      }

      if (melodyNotesRaw.length > 0) {
        currentMelodyBeat = addRests(melody, currentMelodyBeat, tQuantized, false);
        const melodyKeys: string[] = [];
        const melodyAccs: (string | undefined)[] = [];
        const melodyPos: any[] = [];
        const melodyMidis: number[] = [];

        melodyNotesRaw.forEach(n => {
          const fingering = noteFingeringMap.get(n);
          // Note: +12 shift is now inside getNoteName
          const { key, accidental } = getNoteName(n.midi, accidentalSystem);
          melodyKeys.push(key);
          melodyAccs.push(accidental);
          if (fingering) melodyPos.push({ str: fingering.str, fret: fingering.fret });
          melodyMidis.push(n.midi);
        });

        const dur = getBestVexDuration(melodyNotesRaw[0].duration / secPerBeat);
        melody.push({
          keys: melodyKeys, accidentals: melodyAccs, positions: melodyPos, midis: melodyMidis,
          duration: dur, isRest: false, durationSec: getBeatsFromVex(dur) * secPerBeat,
          startTime: firstNoteTime, originalIndex: 0, playbackId: playId
        });
        currentMelodyBeat += getBeatsFromVex(dur);
      }
    });

    addRests(melody, currentMelodyBeat, beatsPerBar, false);
    addRests(bass, currentBassBeat, beatsPerBar, true);

    renderedMeasures.push({
      index: currentMeasureIdx,
      notesVoice1: melody,
      notesVoice2: bass,
      width: Math.max(450, slicesInMeasure.length * 90 + 200)
    });
  }

  return { measures: renderedMeasures, tuning: "Guitar", transposition: 0, timeSignature, bpm };
};
