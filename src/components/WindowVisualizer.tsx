import React from 'react';
import {
  ArrowRight,
  CheckCircle2,
  HelpCircle,
  Layers,
  RotateCcw,
  ShieldCheck,
} from 'lucide-react';
import { ReceiverSlot, WindowSlot } from '../types/protocol';

interface WindowVisualizerProps {
  senderWindow: WindowSlot[];
  receiverBuffer: ReceiverSlot[];
  cwnd: number;
  rwnd: number;
  ssthresh: number;
  clientAck: number;
}

export const WindowVisualizer: React.FC<WindowVisualizerProps> = ({
  senderWindow,
  receiverBuffer,
  cwnd,
  rwnd,
  ssthresh,
  clientAck,
}) => {
  const visibleSenderSlots = senderWindow.slice(0, 32);
  const visibleReceiverSlots = receiverBuffer.slice(0, 32);

  const effectiveWindow = Math.max(1, Math.floor(Math.min(cwnd, rwnd)));

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-lg space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/80 pb-2">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-md bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            <Layers className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-white flex items-center gap-2">
              L4 Sliding Window & Buffer State
            </h2>
            <p className="text-[11px] text-slate-400">
              Sender Sliding Window vs Receiver Out-of-Order Reassembly Buffer
            </p>
          </div>
        </div>

        {/* Window Parameters Badges */}
        <div className="flex items-center gap-2 text-xs font-mono">
          <div className="px-2 py-1 rounded bg-slate-950 border border-slate-800 text-slate-300">
            <span className="text-slate-500 mr-1">Effective Win:</span>
            <span className="font-bold text-cyan-400">{effectiveWindow} pkts</span>
          </div>
          <div className="px-2 py-1 rounded bg-slate-950 border border-slate-800 text-slate-300">
            <span className="text-slate-500 mr-1">CWND:</span>
            <span className="font-bold text-indigo-400">{cwnd.toFixed(1)}</span>
          </div>
          <div className="px-2 py-1 rounded bg-slate-950 border border-slate-800 text-slate-300">
            <span className="text-slate-500 mr-1">RWND:</span>
            <span className="font-bold text-emerald-400">{rwnd}</span>
          </div>
          <div className="px-2 py-1 rounded bg-slate-950 border border-slate-800 text-slate-300">
            <span className="text-slate-500 mr-1">SSTHRESH:</span>
            <span className="font-bold text-amber-400">{ssthresh.toFixed(0)}</span>
          </div>
        </div>
      </div>

      {/* 1. Sender Sliding Window */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 font-medium text-slate-300">
            <span>Sender Sliding Window</span>
            <span className="text-[10px] text-slate-500 font-normal">
              (Capacity: min(cwnd={cwnd.toFixed(1)}, rwnd={rwnd}) = {effectiveWindow} segments)
            </span>
          </div>
          {/* Legend */}
          <div className="flex items-center gap-3 text-[10px] text-slate-400">
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500/40 border border-emerald-500" />
              ACKed
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-sm bg-teal-500/40 border border-teal-400" />
              SACKed (RFC 2018)
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-sm bg-amber-500/40 border border-amber-500" />
              In-Flight (UnACKed)
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-sm bg-cyan-500/30 border border-cyan-500 border-dashed" />
              Usable Window
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-sm bg-slate-800 border border-slate-700" />
              Blocked
            </span>
          </div>
        </div>

        {visibleSenderSlots.length === 0 ? (
          <div className="h-14 bg-slate-950/60 rounded-lg border border-slate-800 flex items-center justify-center text-xs text-slate-500">
            No active transmission. Click "Send via Reliable UDP" below.
          </div>
        ) : (
          <div className="p-2 bg-slate-950/80 rounded-lg border border-slate-800/90 overflow-x-auto">
            <div className="flex items-center gap-1.5 min-w-max pb-1">
              {visibleSenderSlots.map((slot) => {
                let badgeColor = 'bg-slate-800 text-slate-400 border-slate-700';
                if (slot.status === 'ACKED') {
                  badgeColor = 'bg-emerald-950/80 text-emerald-300 border-emerald-600/80';
                } else if (slot.isSacked) {
                  badgeColor = 'bg-teal-950/80 text-teal-300 border-teal-500 ring-1 ring-teal-500/50';
                } else if (slot.status === 'SENT_UNACKED') {
                  badgeColor = 'bg-amber-950/80 text-amber-300 border-amber-500 animate-pulse';
                } else if (slot.status === 'USABLE') {
                  badgeColor = 'bg-cyan-950/40 text-cyan-300 border-cyan-600/60 border-dashed';
                }

                return (
                  <div
                    key={slot.seqNum}
                    className={`relative w-12 h-14 rounded-md border flex flex-col items-center justify-between p-1 transition-all ${badgeColor}`}
                    title={`SEQ: ${slot.seqNum} | Status: ${slot.status} ${slot.isSacked ? '(SACKed by receiver)' : ''} | Retries: ${slot.retransmissions}`}
                  >
                    <span className="text-[9px] font-mono font-bold">
                      #{slot.seqNum % 1000}
                    </span>
                    <span className="text-[8px] font-mono truncate max-w-full text-center">
                      {slot.status === 'ACKED'
                        ? 'ACK'
                        : slot.isSacked
                        ? 'SACK'
                        : slot.status === 'SENT_UNACKED'
                        ? 'SENT'
                        : 'READY'}
                    </span>
                    {slot.retransmissions > 0 && (
                      <span className="absolute -top-1.5 -right-1.5 px-1 py-0.2 bg-rose-600 text-white font-mono text-[8px] rounded-full font-bold shadow">
                        +{slot.retransmissions}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* 2. Receiver Reassembly Buffer */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 font-medium text-slate-300">
            <span>Receiver Reassembly Buffer (Out-of-Order Store)</span>
            <span className="text-[10px] text-slate-500 font-normal">
              (Holes block L7 delivery until plugged by L4 retransmission)
            </span>
          </div>
          {/* Legend */}
          <div className="flex items-center gap-3 text-[10px] text-slate-400">
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500/40 border border-emerald-500" />
              Delivered to L7
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-sm bg-purple-500/40 border border-purple-500" />
              Buffered (Out-of-Order)
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-sm bg-rose-950/60 border border-rose-500 border-dashed" />
              Missing Hole
            </span>
          </div>
        </div>

        {visibleReceiverSlots.length === 0 ? (
          <div className="h-14 bg-slate-950/60 rounded-lg border border-slate-800 flex items-center justify-center text-xs text-slate-500">
            Receiver buffer idle.
          </div>
        ) : (
          <div className="p-2 bg-slate-950/80 rounded-lg border border-slate-800/90 overflow-x-auto">
            <div className="flex items-center gap-1.5 min-w-max pb-1">
              {visibleReceiverSlots.map((slot) => {
                let badgeColor = 'bg-slate-900 text-slate-400 border-slate-800';
                if (slot.status === 'DELIVERED') {
                  badgeColor = 'bg-emerald-950/80 text-emerald-300 border-emerald-600/80';
                } else if (slot.status === 'BUFFERED_OUT_OF_ORDER') {
                  badgeColor = 'bg-purple-950/80 text-purple-300 border-purple-500';
                } else if (slot.status === 'MISSING_HOLE') {
                  badgeColor = 'bg-rose-950/30 text-rose-400 border-rose-800/70 border-dashed';
                }

                return (
                  <div
                    key={slot.seqNum}
                    className={`w-12 h-14 rounded-md border flex flex-col items-center justify-between p-1 transition-all ${badgeColor}`}
                    title={`Receiver Slot SEQ: ${slot.seqNum} | Status: ${slot.status}`}
                  >
                    <span className="text-[9px] font-mono font-bold">
                      #{slot.seqNum % 1000}
                    </span>
                    <span className="text-[8px] font-mono truncate max-w-full text-center">
                      {slot.status === 'DELIVERED'
                        ? 'DELIV'
                        : slot.status === 'BUFFERED_OUT_OF_ORDER'
                        ? 'O-O-O'
                        : 'HOLE'}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
