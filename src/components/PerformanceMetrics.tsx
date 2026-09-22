import React from 'react';
import {
  Activity,
  AlertTriangle,
  ArrowUpRight,
  CheckCircle,
  Clock,
  Cpu,
  Gauge,
  RotateCcw,
  TrendingUp,
  Zap,
} from 'lucide-react';
import { MetricPoint } from '../types/protocol';

interface PerformanceMetricsProps {
  metrics: MetricPoint[];
  packetsSent: number;
  packetsDropped: number;
  retransmissions: number;
  fastRetransmits: number;
  corruptedPackets: number;
  cwnd: number;
  rtoMs: number;
  srttMs: number;
  totalBytesDelivered: number;
}

export const PerformanceMetrics: React.FC<PerformanceMetricsProps> = ({
  metrics,
  packetsSent,
  packetsDropped,
  retransmissions,
  fastRetransmits,
  corruptedPackets,
  cwnd,
  rtoMs,
  srttMs,
  totalBytesDelivered,
}) => {
  const currentThroughput =
    metrics.length > 0 ? metrics[metrics.length - 1].throughputKbps : 0;

  // Max throughput in history for scaling the mini-chart
  const maxThroughput = Math.max(10, ...metrics.map((m) => m.throughputKbps));
  const maxCwnd = Math.max(4, ...metrics.map((m) => Math.max(m.cwnd, m.rwnd)));

  // SVG Chart polyline points
  const getPolylinePoints = (getValue: (m: MetricPoint) => number, maxVal: number) => {
    if (metrics.length < 2) return '';
    const width = 280;
    const height = 60;
    return metrics
      .map((m, i) => {
        const x = (i / (metrics.length - 1)) * width;
        const y = height - (getValue(m) / maxVal) * height;
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(' ');
  };

  const recoveryRate =
    packetsDropped > 0
      ? Math.min(100, Math.round(((retransmissions + fastRetransmits) / packetsDropped) * 100))
      : 100;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-lg space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-md bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
            <Gauge className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-white flex items-center gap-2">
              Performance & Telemetry Graphs
            </h2>
            <p className="text-[11px] text-slate-400">
              Throughput, Congestion Window dynamics, and Jacobson/Karels RTT tracking
            </p>
          </div>
        </div>

        <div className="text-xs font-mono text-cyan-400 font-bold">
          {currentThroughput} Kbps Effective Rate
        </div>
      </div>

      {/* 4 Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
        <div className="p-3 bg-slate-950/70 rounded-lg border border-slate-800">
          <span className="text-[11px] text-slate-500 block">Total Sent / Loss Rate</span>
          <div className="flex items-baseline gap-1.5 mt-0.5">
            <span className="text-base font-bold text-slate-200 font-mono">{packetsSent}</span>
            <span className="text-xs text-rose-400 font-mono">
              ({packetsDropped} dropped)
            </span>
          </div>
        </div>

        <div className="p-3 bg-slate-950/70 rounded-lg border border-slate-800">
          <span className="text-[11px] text-slate-500 block">L4 Retransmissions</span>
          <div className="flex items-baseline gap-1.5 mt-0.5">
            <span className="text-base font-bold text-amber-400 font-mono">{retransmissions}</span>
            <span className="text-[11px] text-orange-400 font-mono">
              ({fastRetransmits} Fast Retx)
            </span>
          </div>
        </div>

        <div className="p-3 bg-slate-950/70 rounded-lg border border-slate-800">
          <span className="text-[11px] text-slate-500 block">Jacobson/Karels RTO</span>
          <div className="flex items-baseline gap-1.5 mt-0.5">
            <span className="text-base font-bold text-cyan-400 font-mono">{rtoMs}ms</span>
            <span className="text-[11px] text-slate-500 font-mono">(SRTT: {srttMs}ms)</span>
          </div>
        </div>

        <div className="p-3 bg-slate-950/70 rounded-lg border border-slate-800">
          <span className="text-[11px] text-slate-500 block">L7 Data Integrity</span>
          <div className="flex items-baseline gap-1.5 mt-0.5">
            <span className="text-base font-bold text-emerald-400 font-mono">100%</span>
            <span className="text-[11px] text-slate-400 font-mono">
              ({(totalBytesDelivered / 1024).toFixed(1)} KB)
            </span>
          </div>
        </div>
      </div>

      {/* Mini Graphs Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* Graph 1: Throughput Curve */}
        <div className="p-3 bg-slate-950/80 rounded-lg border border-slate-800 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="text-slate-400 flex items-center gap-1.5 font-medium">
              <TrendingUp className="w-3.5 h-3.5 text-cyan-400" />
              Throughput Curve (Kbps)
            </span>
            <span className="text-[11px] font-mono text-cyan-300 font-bold">
              Peak: {maxThroughput} Kbps
            </span>
          </div>
          <div className="h-16 w-full relative flex items-center justify-center">
            {metrics.length > 2 ? (
              <svg className="w-full h-full overflow-visible" viewBox="0 0 280 60">
                <polyline
                  fill="none"
                  stroke="#06b6d4"
                  strokeWidth="2"
                  points={getPolylinePoints((m) => m.throughputKbps, maxThroughput)}
                />
              </svg>
            ) : (
              <span className="text-[11px] text-slate-600">Gathering transmission telemetry...</span>
            )}
          </div>
          <div className="flex justify-between text-[10px] text-slate-500 mt-1 font-mono">
            <span>T-start</span>
            <span>Live Transmission Flight</span>
            <span>Now</span>
          </div>
        </div>

        {/* Graph 2: CWND (Congestion Window) & In-Flight Dynamics */}
        <div className="p-3 bg-slate-950/80 rounded-lg border border-slate-800 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="text-slate-400 flex items-center gap-1.5 font-medium">
              <Activity className="w-3.5 h-3.5 text-indigo-400" />
              CWND & In-Flight Segments
            </span>
            <span className="text-[11px] font-mono text-indigo-300 font-bold">
              CWND: {cwnd.toFixed(1)} MSS
            </span>
          </div>
          <div className="h-16 w-full relative flex items-center justify-center">
            {metrics.length > 2 ? (
              <svg className="w-full h-full overflow-visible" viewBox="0 0 280 60">
                {/* CWND curve */}
                <polyline
                  fill="none"
                  stroke="#818cf8"
                  strokeWidth="2"
                  points={getPolylinePoints((m) => m.cwnd, maxCwnd)}
                />
                {/* Inflight curve */}
                <polyline
                  fill="none"
                  stroke="#f59e0b"
                  strokeWidth="1.5"
                  strokeDasharray="2"
                  points={getPolylinePoints((m) => m.inflight, maxCwnd)}
                />
              </svg>
            ) : (
              <span className="text-[11px] text-slate-600">Gathering window data...</span>
            )}
          </div>
          <div className="flex justify-between text-[10px] text-slate-500 mt-1 font-mono">
            <span className="text-indigo-400">Solid: CWND</span>
            <span className="text-amber-400">Dashed: In-Flight</span>
            <span>Slow-Start / AIMD</span>
          </div>
        </div>
      </div>
    </div>
  );
};
