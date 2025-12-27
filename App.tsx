import React, { useState, useRef, useEffect } from 'react';
import { Upload, Music2, FileMusic, AlertCircle, Loader2, Moon, Sun, Guitar } from 'lucide-react';
import { parseMidiFile, convertNotesToVexFlow, TUNINGS } from './services/midiService';
import ScoreRenderer from './components/ScoreRenderer';
import PlaybackControls from './components/AnalysisPanel';
import Toast, { useToast } from './components/Toast';
import { MidiTrack, RenderableNote, RenderableMeasure } from './types';

// Tuning options
const TUNING_OPTIONS = [
  { id: 'standard', name: 'Standard E', description: 'E A D G B E' },
  { id: 'drop-d', name: 'Drop D', description: 'D A D G B E' },
  { id: 'dadgad', name: 'DADGAD', description: 'D A D G A D' },
  { id: 'open-g', name: 'Open G', description: 'D G D G B D' },
];

function App() {
  const [tracks, setTracks] = useState<MidiTrack[]>([]);
  const [selectedTrackIndex, setSelectedTrackIndex] = useState<number>(0);

  // Data for rendering
  const [measures, setMeasures] = useState<RenderableMeasure[]>([]);
  // Flattened notes for Playback engine
  const [flatNotes, setFlatNotes] = useState<RenderableNote[]>([]);

  const [tuningInfo, setTuningInfo] = useState<string>("Standard E");
  const [selectedTuning, setSelectedTuning] = useState<string>('standard');
  const [timeSignature, setTimeSignature] = useState<number[]>([4, 4]);
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return document.documentElement.classList.contains('dark');
    }
    return false;
  });

  const { toasts, addToast, removeToast } = useToast();

  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Playback State
  const [isPlaying, setIsPlaying] = useState(false);
  const [activeNoteIndex, setActiveNoteIndex] = useState<number | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const startTimeRef = useRef<number>(0);
  const requestIdRef = useRef<number>(0);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.mid') && !file.name.toLowerCase().endsWith('.midi')) {
      setError("Proszę wybrać poprawny plik MIDI (.mid lub .midi)");
      return;
    }

    handleStop();

    setIsProcessing(true);
    setError(null);
    setTracks([]);
    setMeasures([]);
    setFlatNotes([]);

    try {
      const parsedTracks = await parseMidiFile(file);
      if (parsedTracks.length === 0) {
        throw new Error("Nie znaleziono nut w tym pliku.");
      }
      setTracks(parsedTracks);
      setSelectedTrackIndex(0);

      processTrack(parsedTracks[0]);
      addToast('success', `Wczytano ${parsedTracks.length} ścieżek z pliku MIDI`);

    } catch (err) {
      const message = err instanceof Error ? err.message : "Wystąpił nieoczekiwany błąd";
      setError(message);
      addToast('error', message);
    } finally {
      setIsProcessing(false);
    }
  };

  const toggleDarkMode = () => {
    const newMode = !isDarkMode;
    setIsDarkMode(newMode);
    document.documentElement.classList.toggle('dark', newMode);
    localStorage.setItem('theme', newMode ? 'dark' : 'light');
  };

  const loadDemoFile = async () => {
    setIsProcessing(true);
    setError(null);
    try {
      const response = await fetch('/lully.mid');
      if (!response.ok) throw new Error('Nie udało się załadować pliku demo');
      const blob = await response.blob();
      const file = new File([blob], 'lully.mid', { type: 'audio/midi' });

      const parsedTracks = await parseMidiFile(file);
      if (parsedTracks.length === 0) {
        throw new Error('Nie znaleziono nut w pliku demo.');
      }
      setTracks(parsedTracks);
      setSelectedTrackIndex(0);
      processTrack(parsedTracks[0]);
      addToast('success', 'Załadowano demo: Lully');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Błąd ładowania demo';
      setError(message);
      addToast('error', message);
    } finally {
      setIsProcessing(false);
    }
  };

  const processTrack = (track: MidiTrack, tuningKey: string = selectedTuning) => {
    const tuningNotes = TUNINGS[tuningKey]?.notes || TUNINGS['standard'].notes;
    const result = convertNotesToVexFlow(track, tuningNotes);
    setMeasures(result.measures);

    // Flatten measures into a single list of notes for the Audio Engine
    const allNotes = result.measures.flatMap(m => {
      return [...m.notesVoice1, ...m.notesVoice2];
    });

    // Sort notes by their absolute start time for reliable lookup during playback animation
    setFlatNotes(allNotes.sort((a, b) => a.startTime - b.startTime));

    setTuningInfo(TUNINGS[tuningKey]?.name || "Custom");
    setTimeSignature(result.timeSignature);
    setActiveNoteIndex(null);
  };

  // Re-process if tuning changes
  useEffect(() => {
    if (tracks.length > 0) {
      processTrack(tracks[selectedTrackIndex]);
    }
  }, [selectedTuning]);

  const handleTrackChange = (index: number) => {
    handleStop();
    setSelectedTrackIndex(index);
    processTrack(tracks[index]);
  };

  // --- Audio Engine ---

  const playTone = (freq: number, startTime: number, duration: number) => {
    if (!audioContextRef.current) return;
    const ctx = audioContextRef.current;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.value = freq;

    osc.connect(gain);
    gain.connect(ctx.destination);

    const now = startTime;
    osc.start(now);

    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.3 / (Math.log(freq) || 1), now + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.01, now + duration);

    osc.stop(now + duration + 0.1);
  };

  const midiToFreq = (m: number) => Math.pow(2, (m - 69) / 12) * 440;

  // Optimization: Cursor for O(1) playback lookups
  const playbackCursorRef = useRef(0);

  const handlePlay = () => {
    if (flatNotes.length === 0) return;

    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    const ctx = audioContextRef.current;
    if (ctx.state === 'suspended') {
      ctx.resume();
    }

    setIsPlaying(true);
    startTimeRef.current = ctx.currentTime;
    playbackCursorRef.current = 0; // Reset cursor

    // Schedule all notes
    flatNotes.forEach(note => {
      if (note.isRest) return;
      const duration = note.durationSec || 0.5;
      note.midis.forEach(midi => {
        playTone(
          midiToFreq(midi),
          startTimeRef.current + note.startTime,
          duration
        );
      });
    });

    const animate = () => {
      const elapsed = ctx.currentTime - startTimeRef.current;

      // Cursor-based lookup (O(1) amortized)
      let cursor = playbackCursorRef.current;
      while (cursor < flatNotes.length - 1 && flatNotes[cursor + 1].startTime <= elapsed) {
        cursor++;
      }
      playbackCursorRef.current = cursor;

      const currentNote = flatNotes[cursor];

      // Logic: Highlight the current note if we are overlapping its "window" 
      // (from its start until the next note's start)
      if (currentNote && elapsed >= currentNote.startTime) {
        // Verify we aren't past the end of the track substantially? 
        // (Handled by handleStop below)
        setActiveNoteIndex(currentNote.playbackId);
      } else {
        // Before first note
        setActiveNoteIndex(null);
      }

      const lastNote = flatNotes[flatNotes.length - 1];
      if (lastNote && elapsed > lastNote.startTime + 4) { // +4s buffer end
        handleStop();
        return;
      }

      requestIdRef.current = requestAnimationFrame(animate);
    };

    requestIdRef.current = requestAnimationFrame(animate);
  };

  const handlePause = () => {
    handleStop();
  };

  const handleStop = () => {
    setIsPlaying(false);
    setActiveNoteIndex(null);
    playbackCursorRef.current = 0;
    if (requestIdRef.current) {
      cancelAnimationFrame(requestIdRef.current);
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
  };

  const progress = activeNoteIndex !== null && flatNotes.length > 0 && playbackCursorRef.current > 0
    ? ((playbackCursorRef.current + 1) / flatNotes.length) * 100
    : 0;

  const currentNoteName = activeNoteIndex !== null && flatNotes[activeNoteIndex] && !flatNotes[activeNoteIndex].isRest
    ? flatNotes[activeNoteIndex].keys.map(k => k.split('/')[0].toUpperCase()).join(' + ')
    : null;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 pb-20 transition-colors">
      <header className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-600 p-2 rounded-lg text-white">
              <Music2 size={24} />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 dark:text-white">GuitarTabGen</h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">MIDI to Tab Converter</p>
            </div>
          </div>
          <button
            onClick={toggleDarkMode}
            className="p-2 rounded-lg bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
            aria-label="Toggle dark mode"
          >
            {isDarkMode ? <Sun size={20} className="text-amber-500" /> : <Moon size={20} className="text-slate-600" />}
          </button>
        </div>
      </header>

      <Toast toasts={toasts} removeToast={removeToast} />

      <main className="max-w-7xl mx-auto px-4 py-8">

        {tracks.length === 0 && !isProcessing && (
          <div className="max-w-2xl mx-auto text-center mt-12 mb-12">
            <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-4">
              Zmień MIDI w Tabulaturę
            </h2>
            <p className="text-slate-600 dark:text-slate-400 mb-8 text-lg">
              Wgraj plik MIDI, a aplikacja wygeneruje interaktywną tabulaturę z podziałem na takty.
            </p>

            {/* Tuning Selector */}
            <div className="mb-6 flex justify-center">
              <div className="inline-flex items-center gap-3 bg-white dark:bg-slate-800 px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700">
                <Guitar size={20} className="text-indigo-500" />
                <span className="text-sm font-medium text-slate-600 dark:text-slate-400">Strój:</span>
                <select
                  value={selectedTuning}
                  onChange={(e) => setSelectedTuning(e.target.value)}
                  className="form-select bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-1.5 text-sm font-medium text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                >
                  {TUNING_OPTIONS.map(t => (
                    <option key={t.id} value={t.id}>{t.name} ({t.description})</option>
                  ))}
                </select>
              </div>
            </div>

            <label className="group relative flex flex-col items-center justify-center w-full h-64 border-2 border-slate-300 dark:border-slate-600 border-dashed rounded-2xl cursor-pointer bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 transition-all hover:border-indigo-400">
              <div className="flex flex-col items-center justify-center pt-5 pb-6">
                <div className="p-4 bg-white dark:bg-slate-700 rounded-full shadow-sm mb-4 group-hover:scale-110 transition-transform">
                  <Upload className="w-10 h-10 text-indigo-500" />
                </div>
                <p className="mb-2 text-lg text-slate-700 dark:text-slate-200 font-medium">Kliknij lub upuść plik MIDI tutaj</p>
                <p className="text-sm text-slate-400 dark:text-slate-500">Formaty .mid, .midi</p>
              </div>
              <input type="file" accept=".mid,.midi" className="hidden" onChange={handleFileUpload} />
            </label>

            {error && (
              <div className="mt-6 flex items-center justify-center gap-2 text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/30 p-4 rounded-lg border border-red-200 dark:border-red-800">
                <AlertCircle size={20} />
                <span>{error}</span>
              </div>
            )}

            {/* Demo Button */}
            <div className="mt-6">
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-2">lub</p>
              <button
                onClick={loadDemoFile}
                className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-medium transition-all hover:scale-105 shadow-md"
              >
                <Music2 size={18} />
                Wypróbuj demo (Lully)
              </button>
            </div>
          </div>
        )}

        {isProcessing && (
          <div className="flex flex-col items-center justify-center py-24">
            <Loader2 className="w-12 h-12 text-indigo-600 animate-spin mb-4" />
            <p className="text-lg text-slate-600 dark:text-slate-400">Przetwarzanie pliku MIDI...</p>
          </div>
        )}

        {tracks.length > 0 && !isProcessing && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-fade-in items-start">

            {/* Left Column: Tools */}
            <div className="lg:col-span-4 space-y-6 lg:sticky lg:top-24">
              <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center gap-3 text-indigo-600 dark:text-indigo-400">
                    <Music2 size={24} />
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white">Narzędzia</h2>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-500 dark:text-slate-400 ml-1">
                      Ścieżka MIDI
                    </label>
                    <select
                      value={selectedTrackIndex}
                      onChange={(e) => handleTrackChange(Number(e.target.value))}
                      className="form-select block w-full pl-3 pr-10 py-3 text-base border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent sm:text-sm rounded-xl bg-slate-50 dark:bg-slate-900 dark:text-slate-100 border transition-all"
                    >
                      {tracks.map((track, idx) => (
                        <option key={track.id} value={idx}>
                          {track.name || `Track ${idx + 1}`} ({track.instrument})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="pt-2">
                    <label className="flex items-center justify-center gap-2 w-full px-4 py-3 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-xl cursor-pointer transition-all text-sm font-bold border-2 border-dashed border-slate-300 dark:border-slate-500">
                      <Upload size={18} />
                      <span>Wgraj inny plik</span>
                      <input type="file" accept=".mid,.midi" className="hidden" onChange={handleFileUpload} />
                    </label>
                  </div>
                </div>
              </div>

              <PlaybackControls
                isPlaying={isPlaying}
                onPlay={handlePlay}
                onPause={handlePause}
                onStop={handleStop}
                progress={progress}
                currentNote={currentNoteName}
              />

              <div className="bg-indigo-50 dark:bg-indigo-900/20 p-4 rounded-xl border border-indigo-100 dark:border-indigo-800/50">
                <div className="flex items-start gap-3">
                  <AlertCircle size={18} className="text-indigo-600 dark:text-indigo-400 mt-0.5" />
                  <div className="text-sm text-indigo-900 dark:text-indigo-200">
                    <p className="font-semibold mb-1">Info</p>
                    <p className="opacity-80">Tabulatura jest generowana automatycznie na podstawie wybranej ścieżki i domyślnego stroju.</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: Preview */}
            <div className="lg:col-span-8 space-y-6">
              <div className="bg-white dark:bg-slate-800 p-1 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
                <div className="flex justify-between items-center p-6 border-b border-slate-100 dark:border-slate-700">
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <FileMusic className="text-indigo-600" size={24} />
                    Podgląd Tabulatury
                  </h3>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-widest px-2">Strój:</span>
                    <span className="text-sm font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/40 px-3 py-1.5 rounded-lg border border-indigo-100 dark:border-indigo-800">
                      {tuningInfo}
                    </span>
                  </div>
                </div>
                <div className="p-2 sm:p-6 overflow-x-auto">
                  <ScoreRenderer
                    notes={flatNotes}
                    measures={measures}
                    activeNoteIndex={activeNoteIndex}
                    tuning={tuningInfo}
                    timeSignature={timeSignature}
                  />
                </div>
              </div>
            </div>

          </div>
        )}
      </main>
    </div>
  );
}

export default App;