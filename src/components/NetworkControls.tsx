import React from 'react';
import {
  AlertTriangle,
  Clock,
  Gauge,
  Layers,
  Network,
  Radio,
  ShieldCheck,
  Sliders,
  Sparkles,
  Wifi,
  Zap,
} from 'lucide-react';
import { CongestionAlgorithm, NetemConfig } from '../types/protocol';

interface NetworkControlsProps {
  config: NetemConfig;
  onChangeConfig: (newConfig: Partial<NetemConfig>) => void;
  isRunning: boolean;
}

export const NetworkControls: React.FC<NetworkControlsProps> = ({
  config,
  onChangeConfig,
  isRunning,
}) => {
  // Generate equivalent Linux tc netem command for education
  const getEquivalentTcCommand = () => {
    const parts = ['sudo tc qdisc add dev lo root netem'];
    if (config.lossRate > 0) parts.push(`loss ${(config.lossRate * 100).toFixed(0)}%`);
    if (config.baseDelayMs > 0) {
      if (config.jitterMs > 0) {
        parts.push(`delay ${config.baseDelayMs}ms ${config.jitterMs}ms distribution normal`);
      } else {
        parts.push(`delay ${config.baseDelayMs}ms`);
      }
    }
    if (config.reorderRate > 0) parts.push(`reorder ${(config.reorderRate * 100).toFixed(0)}% 50%`);
    if (config.corruptRate > 0) parts.push(`corrupt ${(config.corruptRate * 100).toFixed(0)}%`);
    return parts.join(' ');
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-lg">
      <div className="flex items-center justify-between mb-3 border-b border-slate-800/80 pb-2">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-md bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
            <Sliders className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-white flex items-center gap-2">
              Network Impairment & Protocol Engine Configuration
            </h2>
            <p className="text-[11px] text-slate-400">
              Configure Linux tc netem chaos, SACK (RFC 2018), and AIMD parameters
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* SACK RFC 2018 Toggle */}
          <button
            onClick={() => onChangeConfig({ useSack: !config.useSack })}
            className={`px-2.5 py-1 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-all border ${
              config.useSack
                ? 'bg-emerald-950 text-emerald-300 border-emerald-600 shadow-sm'
                : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-300'
            }`}
            title="Toggle RFC 2018 Selective Acknowledgment (avoids Go-Back-N retransmission penalties)"
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            SACK: {config.useSack ? 'ENABLED' : 'DISABLED'}
          </button>

          <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-[10px] font-mono font-medium bg-slate-800 text-slate-300 border border-slate-700">
            <Radio className="w-3 h-3 text-emerald-400 animate-pulse" />
            {isRunning ? 'Wire Live' : 'Ready'}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Packet Loss Slider */}
        <div className="bg-slate-950/60 p-3 rounded-lg border border-slate-800/90">
          <div className="flex justify-between items-center mb-1.5">
            <span className="text-xs font-medium text-slate-300 flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
              Packet Loss Rate
            </span>
            <span className="text-xs font-mono font-bold text-rose-400 px-1.5 py-0.5 rounded bg-rose-950/50 border border-rose-900/50">
              {(config.lossRate * 100).toFixed(0)}%
            </span>
          </div>
          <input
            id="slider-loss-rate"
            type="range"
            min="0"
            max="0.40"
            step="0.02"
            value={config.lossRate}
            onChange={(e) => onChangeConfig({ lossRate: parseFloat(e.target.value) })}
            className="w-full accent-rose-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
          />
          <div className="flex justify-between text-[10px] text-slate-500 mt-1">
            <span>0% (Ideal)</span>
            <span>10% (Lossy)</span>
            <span>40% (Chaos)</span>
          </div>
        </div>

        {/* Latency / Base Delay Slider */}
        <div className="bg-slate-950/60 p-3 rounded-lg border border-slate-800/90">
          <div className="flex justify-between items-center mb-1.5">
            <span className="text-xs font-medium text-slate-300 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-amber-400" />
              Latency & Jitter
            </span>
            <span className="text-xs font-mono font-bold text-amber-400 px-1.5 py-0.5 rounded bg-amber-950/50 border border-amber-900/50">
              {config.baseDelayMs}ms (±{config.jitterMs}ms)
            </span>
          </div>
          <input
            id="slider-base-delay"
            type="range"
            min="10"
            max="250"
            step="5"
            value={config.baseDelayMs}
            onChange={(e) => onChangeConfig({ baseDelayMs: parseInt(e.target.value) })}
            className="w-full accent-amber-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
          />
          <div className="flex justify-between text-[10px] text-slate-500 mt-1">
            <span>10ms (LAN)</span>
            <span>80ms (WAN)</span>
            <span>250ms (Sat)</span>
          </div>
        </div>

        {/* Sliding Window Size Slider */}
        <div className="bg-slate-950/60 p-3 rounded-lg border border-slate-800/90">
          <div className="flex justify-between items-center mb-1.5">
            <span className="text-xs font-medium text-slate-300 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-cyan-400" />
              Advertised Win (rwnd)
            </span>
            <span className="text-xs font-mono font-bold text-cyan-400 px-1.5 py-0.5 rounded bg-cyan-950/50 border border-cyan-900/50">
              {config.windowSize} segments
            </span>
          </div>
          <input
            id="slider-window-size"
            type="range"
            min="1"
            max="32"
            step="1"
            value={config.windowSize}
            onChange={(e) => onChangeConfig({ windowSize: parseInt(e.target.value) })}
            className="w-full accent-cyan-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
          />
          <div className="flex justify-between text-[10px] text-slate-500 mt-1">
            <span>1 (Stop-Wait)</span>
            <span>16 (BDP Pipe)</span>
            <span>32 (Max)</span>
          </div>
        </div>

        {/* Congestion Control Mode */}
        <div className="bg-slate-950/60 p-3 rounded-lg border border-slate-800/90">
          <div className="flex justify-between items-center mb-1.5">
            <span className="text-xs font-medium text-slate-300 flex items-center gap-1.5">
              <Gauge className="w-3.5 h-3.5 text-indigo-400" />
              Congestion Mode
            </span>
            <span className="text-[10px] text-indigo-400 font-mono">
              {config.congestionControl}
            </span>
          </div>
          <div className="grid grid-cols-3 gap-1">
            {(['RENO', 'TAHOE', 'FIXED_WINDOW'] as CongestionAlgorithm[]).map((algo) => (
              <button
                key={algo}
                onClick={() => onChangeConfig({ congestionControl: algo })}
                className={`py-1 px-1 rounded text-[10px] font-medium transition-all ${
                  config.congestionControl === algo
                    ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 font-bold'
                    : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
                }`}
              >
                {algo === 'RENO' ? 'Reno' : algo === 'TAHOE' ? 'Tahoe' : 'Fixed'}
              </button>
            ))}
          </div>
          <p className="text-[9px] text-slate-500 mt-1">
            {config.congestionControl === 'RENO'
              ? 'AIMD with Fast Retransmit on 3 dup ACKs'
              : config.congestionControl === 'TAHOE'
              ? 'Drops CWND to 1 on loss'
              : 'Static fixed window'}
          </p>
        </div>
      </div>

      {/* Linux tc netem Command Bar */}
      <div className="mt-3 pt-2.5 border-t border-slate-800/70 flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-2 overflow-x-auto max-w-full">
          <span className="text-[11px] text-slate-500 font-mono shrink-0">Linux tc netem command:</span>
          <code className="text-[11px] font-mono text-cyan-300 bg-slate-950 px-2 py-1 rounded border border-slate-800 truncate">
            {getEquivalentTcCommand()}
          </code>
        </div>
        <span className="text-[11px] text-slate-500">
          MSS: 1024 B • RFC 1071 Checksum • RFC 2018 SACK • Jacobson RTO
        </span>
      </div>
    </div>
  );
};
