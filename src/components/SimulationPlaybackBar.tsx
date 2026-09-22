import React from 'react';
import {
  AlertOctagon,
  AlertTriangle,
  FastForward,
  Flame,
  Network,
  Pause,
  Play,
  RefreshCw,
  RotateCcw,
  Scissors,
  SkipForward,
  Sparkles,
  Zap,
} from 'lucide-react';

interface SimulationPlaybackBarProps {
  isRunning: boolean;
  isPaused: boolean;
  simulationSpeed: number;
  onPlay: () => void;
  onPause: () => void;
  onStep: () => void;
  onChangeSpeed: (speed: number) => void;
  onForceDrop: () => void;
  onForceCorrupt: () => void;
  onSeverConnection: () => void;
  onResumeTransfer: () => void;
  onOpenPacketCrafting: () => void;
  nextDropForced: boolean;
  nextCorruptForced: boolean;
  isSevered: boolean;
}

export const SimulationPlaybackBar: React.FC<SimulationPlaybackBarProps> = ({
  isRunning,
  isPaused,
  simulationSpeed,
  onPlay,
  onPause,
  onStep,
  onChangeSpeed,
  onForceDrop,
  onForceCorrupt,
  onSeverConnection,
  onResumeTransfer,
  onOpenPacketCrafting,
  nextDropForced,
  nextCorruptForced,
  isSevered,
}) => {
  const speeds = [0.25, 0.5, 1.0, 2.0, 5.0];

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 shadow-lg flex flex-wrap items-center justify-between gap-3">
      {/* Left: Playback Controls (Play, Pause, Step, Speeds) */}
      <div className="flex items-center gap-2">
        {/* Play/Pause Button */}
        {isRunning && !isPaused ? (
          <button
            onClick={onPause}
            className="px-3.5 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-all shadow-md"
            title="Pause Simulation"
          >
            <Pause className="w-3.5 h-3.5 fill-current" />
            Pause
          </button>
        ) : (
          <button
            onClick={onPlay}
            className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-all shadow-md"
            title="Play Simulation"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            {isPaused ? 'Resume' : 'Run Live'}
          </button>
        )}

        {/* Step Forward Button */}
        <button
          onClick={onStep}
          disabled={!isRunning}
          className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 text-xs font-medium flex items-center gap-1.5 transition-colors border border-slate-700"
          title="Advance single transmission cycle"
        >
          <SkipForward className="w-3.5 h-3.5 text-cyan-400" />
          Step 1 Pkt
        </button>

        {/* Speed Selector Chips */}
        <div className="flex items-center bg-slate-950 p-1 rounded-lg border border-slate-800 text-[11px] font-mono">
          <span className="text-slate-500 px-1.5 text-[10px]">Speed:</span>
          {speeds.map((s) => (
            <button
              key={s}
              onClick={() => onChangeSpeed(s)}
              className={`px-2 py-0.5 rounded transition-colors ${
                simulationSpeed === s
                  ? 'bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/40'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {s}x
            </button>
          ))}
        </div>
      </div>

      {/* Right: Chaos Triggers & Custom Injection */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Force Drop Next Button */}
        <button
          onClick={onForceDrop}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all border ${
            nextDropForced
              ? 'bg-rose-950 text-rose-300 border-rose-600 animate-pulse'
              : 'bg-slate-950 hover:bg-rose-950/40 text-rose-400 border-slate-800 hover:border-rose-800'
          }`}
          title="Intentionally drop the very next packet to observe duplicate ACKs and Fast Retransmit"
        >
          <AlertOctagon className="w-3.5 h-3.5 text-rose-400" />
          {nextDropForced ? 'Next Packet Dropped!' : 'Drop Next Packet'}
        </button>

        {/* Force Corrupt Checksum Button */}
        <button
          onClick={onForceCorrupt}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all border ${
            nextCorruptForced
              ? 'bg-amber-950 text-amber-300 border-amber-600 animate-pulse'
              : 'bg-slate-950 hover:bg-amber-950/40 text-amber-400 border-slate-800 hover:border-amber-800'
          }`}
          title="Flip bit in payload to trigger RFC 1071 checksum failure"
        >
          <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
          {nextCorruptForced ? 'Checksum Corrupted!' : 'Corrupt Checksum'}
        </button>

        {/* Sever Link / Resume Button */}
        {isSevered ? (
          <button
            onClick={onResumeTransfer}
            className="px-3 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-semibold flex items-center gap-1.5 shadow-md animate-pulse"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Resume from Byte Offset
          </button>
        ) : (
          <button
            onClick={onSeverConnection}
            disabled={!isRunning}
            className="px-3 py-1.5 rounded-lg bg-slate-950 hover:bg-rose-950/60 disabled:opacity-40 text-slate-300 hover:text-rose-300 text-xs font-medium flex items-center gap-1.5 border border-slate-800"
            title="Simulate sudden connection severance / TCP RST to test L7 resumable transfers"
          >
            <Scissors className="w-3.5 h-3.5 text-rose-400" />
            Sever Link (RST)
          </button>
        )}

        {/* Craft & Inject Custom Datagram */}
        <button
          onClick={onOpenPacketCrafting}
          className="px-3.5 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-all shadow-md"
        >
          <Network className="w-3.5 h-3.5" />
          Craft & Inject Datagram
        </button>
      </div>
    </div>
  );
};
