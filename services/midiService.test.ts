import { describe, it, expect } from 'vitest';
import { getNoteName } from './midiService';

// Re-implementacja funkcji do testów (bo oryginalne są prywatne)
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

const TUNING_STANDARD = [64, 59, 55, 50, 45, 40];

const getBestPosition = (
    midi: number,
    tuning: number[],
    prevFret: number = 0
): { str: number, fret: number } => {
    const candidates: Array<{ str: number, fret: number, score: number }> = [];

    tuning.forEach((base, i) => {
        const fret = midi - base;
        if (fret >= 0 && fret <= 19) {
            const distancePenalty = Math.abs(fret - prevFret) * 0.3;
            const openStringBonus = fret === 0 ? -1 : 0;
            const score = fret + distancePenalty + openStringBonus;
            candidates.push({ str: i + 1, fret, score });
        }
    });

    if (candidates.length === 0) {
        return { str: 1, fret: 0 };
    }

    candidates.sort((a, b) => a.score - b.score);
    return { str: candidates[0].str, fret: candidates[0].fret };
};

describe('getNoteName', () => {
    it('should return C4 for MIDI 60', () => {
        const result = getNoteName(60);
        expect(result.key).toBe('c/4');
        expect(result.accidental).toBeUndefined();
    });

    it('should return C#4 with accidental for MIDI 61', () => {
        const result = getNoteName(61);
        expect(result.key).toBe('c#/4');
        expect(result.accidental).toBe('#');
    });

    it('should return E4 for MIDI 64 (open string 1)', () => {
        const result = getNoteName(64);
        expect(result.key).toBe('e/4');
    });

    it('should return E2 for MIDI 40 (open string 6)', () => {
        const result = getNoteName(40);
        expect(result.key).toBe('e/2');
    });
});

describe('getBestVexDuration', () => {
    it('should return whole note for 4 beats', () => {
        expect(getBestVexDuration(4)).toBe('w');
    });

    it('should return dotted half for 3 beats', () => {
        expect(getBestVexDuration(3)).toBe('hd');
    });

    it('should return half note for 2 beats', () => {
        expect(getBestVexDuration(2)).toBe('h');
    });

    it('should return dotted quarter for 1.5 beats', () => {
        expect(getBestVexDuration(1.5)).toBe('qd');
    });

    it('should return quarter note for 1 beat', () => {
        expect(getBestVexDuration(1)).toBe('q');
    });

    it('should return eighth note for 0.5 beats', () => {
        expect(getBestVexDuration(0.5)).toBe('8');
    });

    it('should return sixteenth note for 0.25 beats', () => {
        expect(getBestVexDuration(0.25)).toBe('16');
    });
});

describe('getBestPosition', () => {
    it('should return open string 1 for E4 (MIDI 64)', () => {
        const result = getBestPosition(64, TUNING_STANDARD);
        expect(result.str).toBe(1);
        expect(result.fret).toBe(0);
    });

    it('should return fret 1, string 1 for F4 (MIDI 65)', () => {
        const result = getBestPosition(65, TUNING_STANDARD);
        expect(result.str).toBe(1);
        expect(result.fret).toBe(1);
    });

    it('should return open string 6 for E2 (MIDI 40)', () => {
        const result = getBestPosition(40, TUNING_STANDARD);
        expect(result.str).toBe(6);
        expect(result.fret).toBe(0);
    });

    it('should prefer open strings over fretted notes', () => {
        // G3 (MIDI 55) can be played on open string 3 or fret 5 on string 4
        const result = getBestPosition(55, TUNING_STANDARD);
        expect(result.str).toBe(3);
        expect(result.fret).toBe(0);
    });

    it('should consider hand position context', () => {
        // When hand is at fret 7, prefer positions near fret 7
        const result = getBestPosition(64, TUNING_STANDARD, 7);
        // E4 at fret 5 on string 2 is closer to fret 7 than open string 1
        expect(result.fret).toBeGreaterThan(0);
    });
});
