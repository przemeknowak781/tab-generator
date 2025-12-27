import React, { useEffect, useRef, useMemo } from 'react';
import {
  Renderer,
  Stave,
  StaveNote,
  TabStave,
  TabNote,
  Voice,
  Formatter,
  Beam,
  StaveConnector,
  Accidental,
  Stem
} from 'vexflow';
import { RenderableMeasure, RenderableNote } from '../types';

// A4 dimensions at 96 DPI - better spacing for readability
const A4_WIDTH = 794;
const A4_HEIGHT = 1123;
const PAGE_MARGIN = 50;
const STAVE_WIDTH = A4_WIDTH - (PAGE_MARGIN * 2);
const MEASURES_PER_SYSTEM = 2; // Reduced from 4 for cleaner layout
const SYSTEM_HEIGHT = 260; // Increased for more space between systems
const NOTATION_STAVE_Y = 50;
const TAB_STAVE_OFFSET = 120; // More space between notation and tab
const MIN_NOTE_SPACING = 30; // Minimum pixels between notes

// Stem direction threshold (B4)
const STEM_THRESHOLD_MIDI = 71;

interface ScoreRendererProps {
  notes: RenderableNote[];
  measures?: RenderableMeasure[];
  activeNoteIndex: number | null;
  tuning: string;
  timeSignature?: number[];
}

interface SystemData {
  measures: RenderableMeasure[];
  systemIndex: number;
}

const ScoreRenderer: React.FC<ScoreRendererProps> = ({
  measures,
  activeNoteIndex,
  timeSignature = [4, 4]
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const timeSigStr = `${timeSignature[0]}/${timeSignature[1]}`;

  const systems = useMemo<SystemData[]>(() => {
    if (!measures || measures.length === 0) return [];

    const result: SystemData[] = [];
    for (let i = 0; i < measures.length; i += MEASURES_PER_SYSTEM) {
      result.push({
        measures: measures.slice(i, i + MEASURES_PER_SYSTEM),
        systemIndex: Math.floor(i / MEASURES_PER_SYSTEM)
      });
    }
    return result;
  }, [measures]);

  /* ... */

  // Main Rendering Effect - Only runs when measures/structure changes
  useEffect(() => {
    if (!containerRef.current || systems.length === 0) return;

    containerRef.current.innerHTML = '';

    const totalHeight = Math.max(
      SYSTEM_HEIGHT * systems.length + PAGE_MARGIN * 2,
      A4_HEIGHT
    );

    const renderer = new Renderer(
      containerRef.current,
      Renderer.Backends.SVG
    );
    renderer.resize(A4_WIDTH, totalHeight);
    const context = renderer.getContext();
    context.setFont('Arial', 10);

    const svgElement = containerRef.current.querySelector('svg');
    if (svgElement) {
      svgElement.style.width = '100%';
      svgElement.style.height = 'auto';
      svgElement.setAttribute('viewBox', `0 0 ${A4_WIDTH} ${totalHeight}`);
      // Add global style for highlighting
      const style = document.createElement('style');
      style.textContent = `
        .highlighted-note path, .highlighted-note rect { stroke: #ef4444 !important; fill: #ef4444 !important; }
        .highlighted-note text { fill: #ef4444 !important; }
      `;
      svgElement.appendChild(style);
    }

    systems.forEach((system, sysIdx) => {
      // ... (Layout setups remain same)
      const systemY = PAGE_MARGIN + sysIdx * SYSTEM_HEIGHT;
      const clefWidth = 70;
      const availableWidth = STAVE_WIDTH - clefWidth;
      const measureWidth = availableWidth / system.measures.length;

      system.measures.forEach((measure, measureIdx) => {
        const isFirstMeasure = sysIdx === 0 && measureIdx === 0;
        const isFirstInSystem = measureIdx === 0;
        const xOffset = PAGE_MARGIN + (isFirstInSystem ? 0 : clefWidth + measureIdx * measureWidth);
        const width = isFirstInSystem ? measureWidth + clefWidth : measureWidth;

        const notationStave = new Stave(xOffset, systemY + NOTATION_STAVE_Y, width);
        const tabStave = new TabStave(xOffset, systemY + NOTATION_STAVE_Y + TAB_STAVE_OFFSET, width);

        if (isFirstInSystem) {
          notationStave.addClef('treble');
          tabStave.addClef('tab');
          if (isFirstMeasure) {
            notationStave.addTimeSignature(timeSigStr);
            tabStave.addTimeSignature(timeSigStr);
          }
        }

        if (sysIdx === systems.length - 1 && measureIdx === system.measures.length - 1) {
          notationStave.setEndBarType(3);
          tabStave.setEndBarType(3);
        }

        notationStave.setContext(context).draw();
        tabStave.setContext(context).draw();

        if (isFirstInSystem) {
          new StaveConnector(notationStave, tabStave).setType('bracket').setContext(context).draw();
          new StaveConnector(notationStave, tabStave).setType('singleLeft').setContext(context).draw();
        }

        const getVexBeats = (dur: string): number => {
          const clean = dur.replace('r', '').replace('d', '');
          const dots = dur.includes('d') ? 1.5 : 1;
          const map: Record<string, number> = { 'w': 4, 'h': 2, 'q': 1, '8': 0.5, '16': 0.25, '32': 0.125 };
          return (map[clean] || 0.25) * dots;
        };

        const processVoice = (voiceNotes: RenderableNote[], voiceIndex: number) => {
          const staveNotes: StaveNote[] = [];
          const tabNotes: TabNote[] = [];
          const beamGroups: StaveNote[][] = [];

          let currentBeatPos = 0;
          let currentBeamGroup: StaveNote[] = [];
          let currentGroupBeatIndex = -1;

          voiceNotes.forEach((n) => {
            const baseDuration = n.duration.replace('r', '').replace('d', '');
            const isDotted = n.duration.includes('d');
            const noteBeats = getVexBeats(n.duration);
            const noteStartBeatIndex = Math.floor(currentBeatPos);
            // Unique ID for finding DOM element later
            const noteId = `note-${n.playbackId}`;

            if (n.isRest) {
              const sn = new StaveNote({ keys: ['b/4'], duration: n.duration });
              // We don't usually highlight rests, but keep ID just in case
              if (n.playbackId !== -1) sn.setAttribute('id', noteId);
              staveNotes.push(sn);
              if (currentBeamGroup.length > 1) beamGroups.push(currentBeamGroup);
              currentBeamGroup = [];
            } else {
              const highestMidi = Math.max(...n.midis);
              const stemDirection = voiceIndex === 1 ? Stem.DOWN : (highestMidi >= STEM_THRESHOLD_MIDI ? Stem.DOWN : Stem.UP);

              const sn = new StaveNote({
                keys: n.keys,
                duration: baseDuration + (isDotted ? 'd' : ''),
                stemDirection: stemDirection,
                dots: isDotted ? 1 : 0
              });
              n.accidentals.forEach((acc, i) => { if (acc) sn.addModifier(new Accidental(acc), i); });

              if (n.playbackId !== -1) sn.setAttribute('id', `vex-${noteId}`);
              staveNotes.push(sn);

              const tn = new TabNote({
                positions: n.positions.map(p => ({ str: p.str, fret: p.fret })),
                duration: baseDuration + (isDotted ? 'd' : '')
              });

              if (n.playbackId !== -1) tn.setAttribute('id', `tab-${noteId}`);
              tabNotes.push(tn);

              // Beaming
              const isBeamable = ['8', '16', '32'].includes(baseDuration);
              if (isBeamable) {
                if (currentBeamGroup.length === 0) {
                  currentBeamGroup.push(sn);
                  currentGroupBeatIndex = noteStartBeatIndex;
                } else {
                  if (noteStartBeatIndex === currentGroupBeatIndex) {
                    currentBeamGroup.push(sn);
                  } else {
                    if (currentBeamGroup.length > 1) beamGroups.push(currentBeamGroup);
                    currentBeamGroup = [sn];
                    currentGroupBeatIndex = noteStartBeatIndex;
                  }
                }
              } else {
                if (currentBeamGroup.length > 1) beamGroups.push(currentBeamGroup);
                currentBeamGroup = [];
              }
            }
            currentBeatPos += noteBeats;
          });
          if (currentBeamGroup.length > 1) beamGroups.push(currentBeamGroup);
          return { staveNotes, tabNotes, beamGroups };
        };

        const v1 = processVoice(measure.notesVoice1, 0);
        const v2 = processVoice(measure.notesVoice2, 1);
        const formatWidth = width - (isFirstInSystem ? 100 : 40);

        const voices: Voice[] = [];
        let voice1: Voice | null = null;
        let voice2: Voice | null = null;

        if (v1.staveNotes.length > 0) {
          voice1 = new Voice({ numBeats: timeSignature[0], beatValue: timeSignature[1] }).setMode(Voice.Mode.SOFT).addTickables(v1.staveNotes);
          voices.push(voice1);
        }
        if (v2.staveNotes.length > 0) {
          voice2 = new Voice({ numBeats: timeSignature[0], beatValue: timeSignature[1] }).setMode(Voice.Mode.SOFT).addTickables(v2.staveNotes);
          voices.push(voice2);
        }

        if (voices.length > 0) {
          try {
            new Formatter().joinVoices(voices).format(voices, formatWidth);
            try { Accidental.applyAccidentals(voices, 'treble'); } catch (e) { }

            if (voice1) {
              voice1.draw(context, notationStave);
              v1.beamGroups.forEach(group => { if (group.length > 1) new Beam(group).setContext(context).draw(); });
            }
            if (voice2) {
              voice2.draw(context, notationStave);
              v2.beamGroups.forEach(group => { if (group.length > 1) new Beam(group).setContext(context).draw(); });
            }
          } catch (e) { console.warn(e); }
        }

        const tabVoices: Voice[] = [];
        if (v1.tabNotes.length > 0) {
          const tabVoice1 = new Voice({ numBeats: timeSignature[0], beatValue: timeSignature[1] }).setMode(Voice.Mode.SOFT).addTickables(v1.tabNotes);
          tabVoices.push(tabVoice1);
        }
        if (v2.tabNotes.length > 0) {
          const tabVoice2 = new Voice({ numBeats: timeSignature[0], beatValue: timeSignature[1] }).setMode(Voice.Mode.SOFT).addTickables(v2.tabNotes);
          tabVoices.push(tabVoice2);
        }

        if (tabVoices.length > 0) {
          try {
            new Formatter().joinVoices(tabVoices).format(tabVoices, formatWidth);
            tabVoices.forEach(v => v.draw(context, tabStave));
          } catch (e) { }
        }
      });
    });

  }, [systems, timeSignature, timeSigStr]); // Removed activeNoteIndex dependencies

  // Highlighting Effect
  useEffect(() => {
    if (!containerRef.current) return;

    // Clear previous
    const previous = containerRef.current.querySelectorAll('.highlighted-note');
    previous.forEach(el => el.classList.remove('highlighted-note'));

    if (activeNoteIndex !== null && activeNoteIndex !== -1) {
      // Highlight ALL elements with this ID (handles chords/polyphony/tab+notation)
      // We look for IDs starting with vex- or tab- followed by the note ID
      // IDs are like: vex-note-12, tab-note-12

      const noteIdSuffix = `note-${activeNoteIndex}`;
      // Query using attribute selector for partial match or just specific IDs
      const elements = containerRef.current.querySelectorAll(`[id$="${noteIdSuffix}"]`);

      elements.forEach(el => el.classList.add('highlighted-note'));
    }
  }, [activeNoteIndex]);

  return (
    <div className="w-full bg-slate-100 dark:bg-slate-900/50 rounded-2xl border border-slate-200 dark:border-slate-700/50 p-2 sm:p-6 lg:p-10 shadow-inner overflow-hidden">
      <div className="w-full max-w-4xl mx-auto">
        <div
          ref={containerRef}
          className="shadow-2xl bg-white w-full rounded-sm overflow-hidden"
          style={{ minHeight: A4_HEIGHT }}
        />
      </div>
    </div>
  );
};

export default ScoreRenderer;
