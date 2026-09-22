import React, { useState } from 'react';
import {
  Activity,
  ArrowRight,
  BarChart3,
  CheckCircle,
  Clock,
  Gauge,
  Layers,
  Play,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Zap,
} from 'lucide-react';
import { BenchmarkResult } from '../types/protocol';

export const BenchmarkSuite: React.FC = () => {
  const [dataSizeKb, setDataSizeKb] = useState<number>(150);
  const [lossRate, setLossRate] = useState<number>(0.08); // 8% loss
  const [useSackCompare, setUseSackCompare] = useState<boolean>(true);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'chart' | 'table'>('chart');

  // Benchmark results
  const [results, setResults] = useState<BenchmarkResult[]>([
    { windowSize: 1, lossRate: 0.08, totalBytes: 150000, transferTimeSec: 6.85, throughputKbps: 175.1, packetsSent: 162, retransmissions: 12, packetLossRecoveryRate: 100, sackEnabled: true },
    { windowSize: 2, lossRate: 0.08, totalBytes: 150000, transferTimeSec: 3.52, throughputKbps: 340.9, packetsSent: 163, retransmissions: 13, packetLossRecoveryRate: 100, sackEnabled: true },
    { windowSize: 4, lossRate: 0.08, totalBytes: 150000, transferTimeSec: 1.88, throughputKbps: 638.2, packetsSent: 164, retransmissions: 14, packetLossRecoveryRate: 100, sackEnabled: true },
    { windowSize: 8, lossRate: 0.08, totalBytes: 150000, transferTimeSec: 1.08, throughputKbps: 1111.1, packetsSent: 165, retransmissions: 15, packetLossRecoveryRate: 100, sackEnabled: true },
    { windowSize: 16, lossRate: 0.08, totalBytes: 150000, transferTimeSec: 0.65, throughputKbps: 1846.1, packetsSent: 166, retransmissions: 16, packetLossRecoveryRate: 100, sackEnabled: true },
    { windowSize: 32, lossRate: 0.08, totalBytes: 150000, transferTimeSec: 0.48, throughputKbps: 2500.0, packetsSent: 168, retransmissions: 18, packetLossRecoveryRate: 100, sackEnabled: true },
    { windowSize: 64, lossRate: 0.08, totalBytes: 150000, transferTimeSec: 0.42, throughputKbps: 2857.1, packetsSent: 170, retransmissions: 20, packetLossRecoveryRate: 100, sackEnabled: true },
  ]);

  const handleRunSweep = async () => {
    setIsRunning(true);
    const windowSizes = [1, 2, 4, 8, 16, 32, 64];
    const totalSegments = Math.ceil(dataSizeKb);
    const baseRttSec = 0.04; // 40ms
    const rtoPenaltySec = useSackCompare ? 0.08 : 0.22; // SACK avoids full Go-Back-N stall!

    const newResults: BenchmarkResult[] = [];

    for (const win of windowSizes) {
      await new Promise((r) => setTimeout(r, 100));
      const retransmits = Math.round(totalSegments * lossRate * (useSackCompare ? 1.05 : 1.35));
      const rtts = (totalSegments / win) + retransmits * (rtoPenaltySec / baseRttSec);
      const transferTime = Math.max(0.1, +(rtts * baseRttSec).toFixed(3));
      const throughputKbps = Math.round((dataSizeKb * 8) / transferTime);

      newResults.push({
        windowSize: win,
        lossRate,
        totalBytes: dataSizeKb * 1024,
        transferTimeSec: transferTime,
        throughputKbps,
        packetsSent: totalSegments + retransmits,
        retransmissions: retransmits,
        packetLossRecoveryRate: 100,
        sackEnabled: useSackCompare,
      });
      setResults([...newResults]);
    }

    setIsRunning(false);
  };

  const maxThroughput = Math.max(...results.map((r) => r.throughputKbps));

  return (
    <div className="space-y-4">
      {/* Benchmark Controls Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-lg space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/80 pb-3">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-md bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              <TrendingUp className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-white flex items-center gap-2">
                Sliding Window & RFC 2018 SACK Performance Suite
              </h2>
              <p className="text-[11px] text-slate-400">
                Evaluate Bandwidth-Delay Product pipelining and SACK selective repeat vs Go-Back-N
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* SACK toggle for benchmark */}
            <button
              onClick={() => setUseSackCompare(!useSackCompare)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 border transition-all ${
                useSackCompare
                  ? 'bg-emerald-950 text-emerald-300 border-emerald-600 shadow-sm'
                  : 'bg-slate-950 text-slate-400 border-slate-800'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              SACK Mode: {useSackCompare ? 'ON' : 'OFF (Go-Back-N)'}
            </button>

            <button
              onClick={handleRunSweep}
              disabled={isRunning}
              className="px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white text-xs font-semibold flex items-center gap-2 transition-all shadow-md"
            >
              {isRunning ? (
                <>
                  <Activity className="w-3.5 h-3.5 animate-spin" />
                  Simulating Sweep...
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5 fill-current" />
                  Run Benchmark Sweep
                </>
              )}
            </button>
          </div>
        </div>

        {/* Sweep Parameters */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="p-3 bg-slate-950/70 rounded-lg border border-slate-800">
            <div className="flex justify-between items-center mb-1.5">
              <span className="text-slate-300 font-medium">Injected Packet Loss Rate:</span>
              <span className="font-mono text-rose-400 font-bold">{(lossRate * 100).toFixed(0)}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="0.25"
              step="0.01"
              value={lossRate}
              onChange={(e) => setLossRate(parseFloat(e.target.value))}
              className="w-full accent-rose-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-500 mt-1">
              <span>0% (Ideal)</span>
              <span>8% (Typical Impairment)</span>
              <span>25% (Extreme)</span>
            </div>
          </div>

          <div className="p-3 bg-slate-950/70 rounded-lg border border-slate-800">
            <div className="flex justify-between items-center mb-1.5">
              <span className="text-slate-300 font-medium">Benchmark Payload Volume:</span>
              <span className="font-mono text-cyan-400 font-bold">{dataSizeKb} KB</span>
            </div>
            <input
              type="range"
              min="50"
              max="500"
              step="50"
              value={dataSizeKb}
              onChange={(e) => setDataSizeKb(parseInt(e.target.value))}
              className="w-full accent-cyan-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-500 mt-1">
              <span>50 KB</span>
              <span>150 KB</span>
              <span>500 KB</span>
            </div>
          </div>
        </div>
      </div>

      {/* Visual Chart & Table Section */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-lg space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
          <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
            <BarChart3 className="w-4 h-4 text-cyan-400" />
            Window Size (Segments) vs Effective Throughput (Kbps)
          </h3>
          <div className="flex items-center bg-slate-950 p-0.5 rounded-lg border border-slate-800 text-[11px]">
            <button
              onClick={() => setActiveTab('chart')}
              className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                activeTab === 'chart' ? 'bg-cyan-500/20 text-cyan-300' : 'text-slate-400'
              }`}
            >
              Visual Bars
            </button>
            <button
              onClick={() => setActiveTab('table')}
              className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                activeTab === 'table' ? 'bg-cyan-500/20 text-cyan-300' : 'text-slate-400'
              }`}
            >
              Data Table
            </button>
          </div>
        </div>

        {activeTab === 'chart' ? (
          <div className="space-y-3">
            {results.map((r) => {
              const barWidth = `${Math.max(4, (r.throughputKbps / maxThroughput) * 100)}%`;
              return (
                <div key={r.windowSize} className="space-y-1">
                  <div className="flex justify-between items-center text-xs font-mono">
                    <span className="text-slate-300 flex items-center gap-2">
                      <span className="w-16 font-bold text-cyan-400">
                        W = {r.windowSize}
                      </span>
                      <span className="text-slate-500 text-[11px]">
                        ({r.windowSize === 1 ? 'Stop-and-Wait' : `${r.windowSize} segments inflight`})
                      </span>
                    </span>
                    <span className="font-bold text-emerald-400">
                      {r.throughputKbps.toLocaleString()} Kbps{' '}
                      <span className="text-slate-500 font-normal">({r.transferTimeSec}s)</span>
                    </span>
                  </div>
                  <div className="w-full bg-slate-950 rounded-full h-3 p-0.5 border border-slate-800/80">
                    <div
                      className="h-full bg-gradient-to-r from-cyan-500 to-emerald-400 rounded-full transition-all duration-300"
                      style={{ width: barWidth }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left font-mono text-xs text-slate-300 border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-slate-500 text-[10px] uppercase">
                  <th className="py-2 px-3">Window Size</th>
                  <th className="py-2 px-3">Loss Rate</th>
                  <th className="py-2 px-3">Transfer Time</th>
                  <th className="py-2 px-3">Throughput</th>
                  <th className="py-2 px-3">Total Sent</th>
                  <th className="py-2 px-3">Retransmissions</th>
                  <th className="py-2 px-3">SACK Mode</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {results.map((r) => (
                  <tr key={r.windowSize} className="hover:bg-slate-950/40">
                    <td className="py-2 px-3 font-bold text-cyan-400">
                      W = {r.windowSize} {r.windowSize === 1 && '(Stop-Wait)'}
                    </td>
                    <td className="py-2 px-3 text-rose-400">{(r.lossRate * 100).toFixed(0)}%</td>
                    <td className="py-2 px-3">{r.transferTimeSec}s</td>
                    <td className="py-2 px-3 text-emerald-400 font-bold">{r.throughputKbps} Kbps</td>
                    <td className="py-2 px-3 text-slate-400">{r.packetsSent} pkts</td>
                    <td className="py-2 px-3 text-amber-400">{r.retransmissions} retx</td>
                    <td className="py-2 px-3 text-emerald-400 font-semibold">
                      {r.sackEnabled ? 'SACK Active' : 'Cumulative Only'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Theoretical Analysis Box */}
        <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800 text-xs space-y-2 text-slate-300">
          <h4 className="font-bold text-white flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-amber-400" />
            Key Insights on Window Pipelining & SACK:
          </h4>
          <ul className="list-disc list-inside space-y-1 text-[11px] text-slate-400">
            <li>
              <strong className="text-slate-200">BDP Pipelining (W=16..64):</strong> Stop-and-Wait ($W=1$) is limited by RTT latency. Increasing window size fills the Bandwidth-Delay Product pipe, yielding up to 16x throughput improvement.
            </li>
            <li>
              <strong className="text-slate-200">SACK RFC 2018 Benefit:</strong> Under packet drops, standard Go-Back-N retransmits all subsequent packets. SACK informs the sender of exact out-of-order blocks $[L..R]$, so only the missing holes are resent.
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
};
