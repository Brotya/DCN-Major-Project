import React from 'react';
import {
  Activity,
  ArrowRight,
  CheckCircle,
  Clock,
  Cpu,
  Gauge,
  Layers,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  Zap,
} from 'lucide-react';
import { CongestionAlgorithm, CongestionState, SackBlock } from '../types/protocol';

interface CongestionFsmCardProps {
  congestionState: CongestionState;
  congestionAlgorithm: CongestionAlgorithm;
  cwnd: number;
  ssthresh: number;
  rwnd: number;
  rttMs: number;
  bdpBytes: number;
  mss: number;
  useSack: boolean;
  activeSackBlocks: SackBlock[];
  sackEvents: number;
}

export const CongestionFsmCard: React.FC<CongestionFsmCardProps> = ({
  congestionState,
  congestionAlgorithm,
  cwnd,
  ssthresh,
  rwnd,
  rttMs,
  bdpBytes,
  mss,
  useSack,
  activeSackBlocks,
  sackEvents,
}) => {
  const bdpSegments = Math.max(1, Math.round(bdpBytes / mss));
  const currentInflightWindow = Math.floor(Math.min(cwnd, rwnd));

  // Determine BDP status
  let bdpStatus: 'STARVED' | 'OPTIMAL' | 'BUFFERBLOAT' = 'OPTIMAL';
  if (currentInflightWindow < bdpSegments * 0.7) {
    bdpStatus = 'STARVED';
  } else if (currentInflightWindow > bdpSegments * 1.5) {
    bdpStatus = 'BUFFERBLOAT';
  }

  const fsmStates: Array<{
    id: CongestionState;
    title: string;
    rule: string;
    condition: string;
  }> = [
    {
      id: 'SLOW_START',
      title: 'Slow Start',
      rule: 'CWND += 1 MSS per ACK (Exponential growth 2^N per RTT)',
      condition: 'Active while CWND < ssthresh',
    },
    {
      id: 'CONGESTION_AVOIDANCE',
      title: 'Congestion Avoidance',
      rule: 'CWND += 1/CWND per ACK (Linear additive increase: +1 MSS per RTT)',
      condition: 'Active when CWND >= ssthresh',
    },
    {
      id: 'FAST_RECOVERY',
      title: 'Fast Retransmit & Recovery',
      rule: '3 Dup ACKs received: ssthresh = CWND/2, retransmit hole without RTO',
      condition: 'Active on 3 duplicate ACKs (Reno)',
    },
    {
      id: 'TIMEOUT_RESET',
      title: 'RTO Timeout Reset',
      rule: 'Timer expired: CWND collapses to 1 MSS, ssthresh = CWND/2, double RTO',
      condition: 'Triggered when packet loss causes pipeline stall',
    },
  ];

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-lg space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/80 pb-2">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-md bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            <Cpu className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-white flex items-center gap-2">
              L4 Congestion Control FSM & Bandwidth-Delay Product
            </h2>
            <p className="text-[11px] text-slate-400">
              State transitions: TCP Reno/Tahoe AIMD mechanics & RFC 2018 SACK status
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs font-mono">
          <span className="text-slate-400">Mode:</span>
          <span className="px-2 py-0.5 rounded bg-indigo-950 text-indigo-300 border border-indigo-700 font-bold">
            {congestionAlgorithm}
          </span>
          {useSack && (
            <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-700 font-bold flex items-center gap-1 text-[11px]">
              <ShieldCheck className="w-3.5 h-3.5" />
              SACK RFC 2018
            </span>
          )}
        </div>
      </div>

      {/* 4 State Nodes in Flow */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
        {fsmStates.map((st) => {
          const isActive = congestionState === st.id;
          return (
            <div
              key={st.id}
              className={`p-3 rounded-xl border transition-all relative overflow-hidden flex flex-col justify-between ${
                isActive
                  ? 'bg-indigo-950/60 border-indigo-500 shadow-md ring-1 ring-indigo-500/50'
                  : 'bg-slate-950/60 border-slate-800 opacity-65'
              }`}
            >
              {isActive && (
                <div className="absolute top-2 right-2 flex items-center gap-1 text-[10px] font-bold text-indigo-400">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
                  </span>
                  ACTIVE
                </div>
              )}

              <div className="space-y-1">
                <span className="text-xs font-bold text-white block">{st.title}</span>
                <p className="text-[10px] text-slate-300 leading-snug">{st.rule}</p>
              </div>

              <div className="mt-2 pt-2 border-t border-slate-800/80 text-[9px] font-mono text-slate-400">
                {st.condition}
              </div>
            </div>
          );
        })}
      </div>

      {/* SACK & BDP Telemetry Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
        {/* BDP Calculator Card */}
        <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-2 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-slate-300 font-medium flex items-center gap-1.5">
              <Gauge className="w-3.5 h-3.5 text-cyan-400" />
              Bandwidth-Delay Product (BDP):
            </span>
            <span className="font-mono text-cyan-300 font-bold">
              {bdpSegments} Segments ({Math.round(bdpBytes / 1024)} KB)
            </span>
          </div>

          <div className="flex items-center justify-between text-[11px] font-mono">
            <span className="text-slate-400">Current Inflight Pipe:</span>
            <span className="text-slate-200 font-bold">
              {currentInflightWindow} segments (CWND: {cwnd.toFixed(1)})
            </span>
          </div>

          {/* BDP Status Badge */}
          <div className="pt-1.5 border-t border-slate-800/80 flex items-center justify-between">
            <span className="text-slate-500 text-[10px]">Buffer Operating Status:</span>
            {bdpStatus === 'OPTIMAL' ? (
              <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-700 text-[10px] font-bold">
                ✓ Optimal BDP Matched
              </span>
            ) : bdpStatus === 'STARVED' ? (
              <span className="px-2 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-700 text-[10px] font-bold">
                ⚠ Throughput Starved (Window &lt; BDP)
              </span>
            ) : (
              <span className="px-2 py-0.5 rounded bg-rose-950 text-rose-300 border border-rose-700 text-[10px] font-bold">
                ⚠ Bufferbloat (Excess Queue Delay)
              </span>
            )}
          </div>
        </div>

        {/* RFC 2018 SACK Blocks Card */}
        <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-2 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-slate-300 font-medium flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              Selective ACKs (RFC 2018):
            </span>
            <span className="font-mono text-emerald-400 font-bold">
              {sackEvents} SACK Recovery Events
            </span>
          </div>

          <div className="text-[11px] font-mono text-slate-400">
            Active Receiver SACK Blocks:
            {activeSackBlocks.length > 0 ? (
              <div className="flex flex-wrap gap-1.5 mt-1">
                {activeSackBlocks.map((b, i) => (
                  <span
                    key={i}
                    className="px-2 py-0.5 rounded bg-emerald-950/80 border border-emerald-700 text-emerald-300 text-[10px]"
                  >
                    [{b.leftEdge} .. {b.rightEdge}]
                  </span>
                ))}
              </div>
            ) : (
              <span className="text-slate-500 block text-[10px] mt-0.5">
                No out-of-order holes currently buffered.
              </span>
            )}
          </div>

          <p className="text-[10px] text-slate-500 pt-1 border-t border-slate-800/80">
            {useSack
              ? 'SACK allows sender to retransmit ONLY unreceived holes rather than Go-Back-N.'
              : 'Cumulative ACK only. Turn on SACK in controls to prevent Go-Back-N redundant sends.'}
          </p>
        </div>
      </div>
    </div>
  );
};
