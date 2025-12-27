import React from 'react';
import { Play, Square, Pause, Volume2 } from 'lucide-react';

interface PlaybackControlsProps {
    isPlaying: boolean;
    onPlay: () => void;
    onPause: () => void;
    onStop: () => void;
    progress: number; // 0 to 100
    currentNote: string | null;
}

const PlaybackControls: React.FC<PlaybackControlsProps> = ({
    isPlaying,
    onPlay,
    onPause,
    onStop,
    progress,
    currentNote
}) => {
    return (
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden transition-colors">
            <div className="bg-slate-800 dark:bg-slate-900 px-6 py-4 flex items-center gap-2">
                <Volume2 className="text-emerald-400 w-5 h-5" />
                <h2 className="text-white font-bold text-lg">Odtwarzacz</h2>
            </div>

            <div className="p-6">
                <div className="flex flex-col gap-6">

                    {/* Status Display */}
                    <div className="flex justify-between items-end">
                        <div>
                            <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">AKTUALNA NUTA</span>
                            <div className="text-2xl font-mono font-bold text-indigo-600 dark:text-indigo-400 h-8 flex items-center">
                                {currentNote || "-"}
                            </div>
                        </div>
                        <div className="text-right">
                            <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">STATUS</span>
                            <div className={`text-sm font-bold ${isPlaying ? 'text-emerald-500 animate-pulse' : 'text-slate-400 dark:text-slate-500'}`}>
                                {isPlaying ? 'ODTWARZANIE' : 'ZATRZYMANO'}
                            </div>
                        </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="space-y-1">
                        <div className="w-full bg-slate-100 dark:bg-slate-700 rounded-full h-2 overflow-hidden">
                            <div
                                className="bg-indigo-600 dark:bg-indigo-500 h-full rounded-full transition-all duration-100 ease-linear shadow-[0_0_8px_rgba(79,70,229,0.4)]"
                                style={{ width: `${progress}%` }}
                            ></div>
                        </div>
                        <div className="flex justify-between text-[10px] font-bold text-slate-400 dark:text-slate-500">
                            <span>0%</span>
                            <span>{Math.round(progress)}%</span>
                            <span>100%</span>
                        </div>
                    </div>

                    {/* Controls */}
                    <div className="flex flex-col sm:flex-row justify-center gap-3">
                        {!isPlaying ? (
                            <button
                                onClick={onPlay}
                                className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold transition-all hover:scale-[1.02] active:scale-95 shadow-lg shadow-indigo-200 dark:shadow-none"
                            >
                                <Play fill="currentColor" size={18} />
                                Odtwórz
                            </button>
                        ) : (
                            <button
                                onClick={onPause}
                                className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-bold transition-all hover:scale-[1.02] active:scale-95 shadow-lg shadow-amber-200 dark:shadow-none"
                            >
                                <Pause fill="currentColor" size={18} />
                                Pauza
                            </button>
                        )}

                        <button
                            onClick={onStop}
                            className="flex items-center justify-center gap-2 px-6 py-3 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-xl font-bold transition-all hover:scale-[1.02] active:scale-95"
                        >
                            <Square fill="currentColor" size={14} />
                            Stop
                        </button>
                    </div>

                    <p className="text-center text-[11px] text-slate-400 dark:text-slate-500 leading-relaxed italic">
                        Odtwarza wygenerowany fragment tabulatury z transpozycją.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default PlaybackControls;