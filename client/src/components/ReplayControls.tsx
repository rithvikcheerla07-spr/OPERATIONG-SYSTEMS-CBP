import React, { useEffect, useState, useRef } from 'react';
import {
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  Play,
  Pause,
  Clock,
  Keyboard,
  FastForward,
} from 'lucide-react';
import { SimEvent } from '../types.js';

interface ReplayControlsProps {
  events: SimEvent[];
  currentIndex: number;
  onSelectEvent: (index: number) => void;
}

export const ReplayControls: React.FC<ReplayControlsProps> = ({
  events,
  currentIndex,
  onSelectEvent,
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1); // 1 = 1000ms per step
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const totalEvents = events.length;
  const currentEvent = events[currentIndex] || null;

  const handleReset = () => {
    setIsPlaying(false);
    onSelectEvent(0);
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      onSelectEvent(currentIndex - 1);
    }
  };

  const handleNext = () => {
    if (currentIndex < totalEvents - 1) {
      onSelectEvent(currentIndex + 1);
    } else {
      setIsPlaying(false);
    }
  };

  const togglePlay = () => {
    if (currentIndex >= totalEvents - 1) {
      onSelectEvent(0);
      setIsPlaying(true);
    } else {
      setIsPlaying(!isPlaying);
    }
  };

  // Keyboard navigation: Left/Right arrows, Home for Reset
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is typing in an input
      if (['INPUT', 'SELECT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) {
        return;
      }

      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        handlePrevious();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        handleNext();
      } else if (e.key === 'Home') {
        e.preventDefault();
        handleReset();
      } else if (e.key === ' ' || e.code === 'Space') {
        e.preventDefault();
        togglePlay();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentIndex, totalEvents, isPlaying]);

  const currentIndexRef = useRef(currentIndex);
  currentIndexRef.current = currentIndex;

  // Automatic playback timer
  useEffect(() => {
    if (isPlaying) {
      const intervalMs = Math.max(200, 1000 / playbackSpeed);
      timerRef.current = setInterval(() => {
        const nextIdx = currentIndexRef.current + 1;
        if (nextIdx < totalEvents) {
          onSelectEvent(nextIdx);
        } else {
          setIsPlaying(false);
        }
      }, intervalMs);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isPlaying, playbackSpeed, totalEvents, onSelectEvent]);

  if (!events || events.length === 0) {
    return null;
  }

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
      {/* Top Header & Event Info */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 pb-3 border-b border-slate-200">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900">
              State-Aware Execution Replay
            </h2>
            <span className="text-slate-300">·</span>
            <span className="text-xs font-mono font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
              Step {currentIndex + 1} of {totalEvents}
            </span>
          </div>
          <p className="text-xs text-slate-500">
            Deterministic state restoration · Time <span className="font-mono font-bold text-slate-800">t = {currentEvent?.time ?? 0}</span>
          </p>
        </div>

        {/* Current Event Description Banner */}
        {currentEvent && (
          <div className="flex items-center gap-2.5 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200 text-xs">
            <span className="font-mono font-bold text-slate-700 uppercase">
              [{currentEvent.type}]
            </span>
            <span className="text-slate-600 truncate max-w-sm sm:max-w-md">
              {currentEvent.description}
            </span>
          </div>
        )}
      </div>

      {/* Main Scrubber Slider */}
      <div className="space-y-1.5">
        <div className="flex justify-between text-[11px] font-mono text-slate-500">
          <span>Event 1 (t=0)</span>
          <span>Event {currentIndex + 1} (t={currentEvent?.time ?? 0})</span>
          <span>Event {totalEvents} (t={events[totalEvents - 1]?.time ?? 0})</span>
        </div>
        <input
          type="range"
          min={0}
          max={totalEvents - 1}
          value={currentIndex}
          onChange={(e) => {
            setIsPlaying(false);
            onSelectEvent(parseInt(e.target.value, 10));
          }}
          className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600 focus:outline-none"
        />
      </div>

      {/* Control Buttons & Playback Settings */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
        {/* Playback Controls */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleReset}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200/80 active:bg-slate-200 rounded-md transition-colors cursor-pointer"
            title="Reset to Event 0 (Shortcut: Home)"
          >
            <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
            <span>Reset</span>
          </button>

          <button
            type="button"
            onClick={handlePrevious}
            disabled={currentIndex === 0}
            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200/80 active:bg-slate-200 disabled:opacity-40 rounded-md transition-colors cursor-pointer"
            title="Previous Step (Shortcut: Left Arrow)"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Previous</span>
          </button>

          <button
            type="button"
            onClick={togglePlay}
            className={`inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
              isPlaying
                ? 'bg-amber-600 hover:bg-amber-700 text-white'
                : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs'
            }`}
            title="Auto-play simulation steps (Shortcut: Space)"
          >
            {isPlaying ? (
              <>
                <Pause className="w-3.5 h-3.5 fill-current" />
                <span>Pause</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>{currentIndex >= totalEvents - 1 ? 'Replay' : 'Play'}</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={handleNext}
            disabled={currentIndex >= totalEvents - 1}
            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200/80 active:bg-slate-200 disabled:opacity-40 rounded-md transition-colors cursor-pointer"
            title="Next Step (Shortcut: Right Arrow)"
          >
            <span>Next</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Speed Selector & Keyboard Shortcut Hints */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-md border border-slate-200 text-xs font-mono">
            {[0.5, 1, 2].map((spd) => (
              <button
                key={spd}
                type="button"
                onClick={() => setPlaybackSpeed(spd)}
                className={`px-2 py-0.5 rounded transition-colors cursor-pointer ${
                  playbackSpeed === spd
                    ? 'bg-white text-indigo-700 font-bold shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {spd}x
              </button>
            ))}
          </div>

          <div
            className="hidden sm:flex items-center gap-1.5 text-[11px] text-slate-600 bg-slate-50 px-2.5 py-1 rounded border border-slate-200"
            title="Use keyboard arrow keys to step backward and forward, Home to reset, Space to play/pause"
          >
            <Keyboard className="w-3.5 h-3.5 text-slate-500" />
            <span>Shortcuts:</span>
            <kbd className="px-1 bg-white border border-slate-300 rounded text-[10px] font-mono text-slate-700">←</kbd>
            <kbd className="px-1 bg-white border border-slate-300 rounded text-[10px] font-mono text-slate-700">→</kbd>
            <kbd className="px-1 bg-white border border-slate-300 rounded text-[10px] font-mono text-slate-700">Home</kbd>
          </div>
        </div>
      </div>
    </div>
  );
};
