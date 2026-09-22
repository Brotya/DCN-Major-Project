import React from 'react';
import {
  Activity,
  Cpu,
  Layers,
  Network,
  RotateCcw,
  ShieldCheck,
  Terminal,
  Wifi,
} from 'lucide-react';
import { ConnectionState } from '../types/protocol';

interface HeaderProps {
  connectionState: ConnectionState;
  onReset: () => void;
  onOpenNetemGuide: () => void;
  onSelectPreset: (preset: 'clean' | 'wifi' | 'satellite' | 'chaos') => void;
  activeTab: 'simulator' | 'fsm' | 'benchmark';
  setActiveTab: (tab: 'simulator' | 'fsm' | 'benchmark') => void;
}

export const Header: React.FC<HeaderProps> = ({
  connectionState,
  onReset,
  onOpenNetemGuide,
  onSelectPreset,
  activeTab,
  setActiveTab,
}) => {
  return (
    <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur-md sticky top-0 z-30">
      <div className="max-w-7xl mx-auto px-4 py-3 flex flex-wrap items-center justify-between gap-4">
        {/* Brand & Connection State */}
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shadow-inner">
            <Network className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-base font-bold tracking-tight text-white flex items-center gap-2">
                Reliable Transport Lab
                <span className="text-xs px-2 py-0.5 rounded bg-cyan-950 text-cyan-400 border border-cyan-800 font-mono">
                  L4 TCP over UDP + L7 App
                </span>
              </h1>
              <span
                className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold border ${
                  connectionState === ConnectionState.ESTABLISHED
                    ? 'bg-emerald-950 text-emerald-300 border-emerald-700'
                    : connectionState === ConnectionState.CLOSED
                    ? 'bg-slate-800 text-slate-400 border-slate-700'
                    : 'bg-amber-950 text-amber-300 border-amber-700'
                }`}
              >
                {connectionState}
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Sliding Window • Cumulative & SACK • Reno AIMD • RFC 1071 Checksum • SHA-256 Bit-Exact
            </p>
          </div>
        </div>

        {/* View Switcher Tabs */}
        <div className="flex items-center bg-slate-950 p-1 rounded-lg border border-slate-800">
          <button
            id="tab-simulator"
            onClick={() => setActiveTab('simulator')}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all flex items-center gap-1.5 ${
              activeTab === 'simulator'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 shadow-sm font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            Live Network Lab
          </button>
          <button
            id="tab-fsm"
            onClick={() => setActiveTab('fsm')}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all flex items-center gap-1.5 ${
              activeTab === 'fsm'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 shadow-sm font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Cpu className="w-3.5 h-3.5" />
            Congestion FSM & BDP
          </button>
          <button
            id="tab-benchmark"
            onClick={() => setActiveTab('benchmark')}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all flex items-center gap-1.5 ${
              activeTab === 'benchmark'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 shadow-sm font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            Window Benchmarks
          </button>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {/* Presets quick switcher */}
          <div className="hidden lg:flex items-center text-xs bg-slate-950/60 rounded-lg p-0.5 border border-slate-800">
            <span className="text-[11px] text-slate-500 px-2">Presets:</span>
            <button
              onClick={() => onSelectPreset('clean')}
              className="px-2 py-1 text-slate-300 hover:text-white rounded hover:bg-slate-800 text-[11px]"
              title="0% Loss, 10ms Latency"
            >
              LAN
            </button>
            <button
              onClick={() => onSelectPreset('wifi')}
              className="px-2 py-1 text-slate-300 hover:text-white rounded hover:bg-slate-800 text-[11px]"
              title="8% Loss, 45ms Latency, 12ms Jitter"
            >
              WiFi (8% Loss)
            </button>
            <button
              onClick={() => onSelectPreset('chaos')}
              className="px-2 py-1 text-amber-300 hover:text-amber-200 rounded hover:bg-slate-800 text-[11px]"
              title="20% Loss, Reordering, Bit-Flips"
            >
              Chaos (20% Loss)
            </button>
          </div>

          <button
            id="btn-netem-guide"
            onClick={onOpenNetemGuide}
            className="px-2.5 py-1.5 rounded-lg border border-slate-700 bg-slate-800/80 hover:bg-slate-700 text-slate-200 text-xs font-medium flex items-center gap-1.5 transition-colors"
            title="Linux tc netem Shell Guide"
          >
            <Terminal className="w-3.5 h-3.5 text-cyan-400" />
            tc netem Guide
          </button>

          <button
            id="btn-reset-sim"
            onClick={onReset}
            className="p-1.5 rounded-lg border border-slate-700 bg-slate-800/60 hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition-colors"
            title="Reset Simulation State"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
