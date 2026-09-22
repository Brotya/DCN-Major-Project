import React, { useRef, useEffect } from 'react';
import {
  AlertCircle,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  CheckCircle,
  Clock,
  Eye,
  FileCode,
  Radio,
  WifiOff,
  Zap,
} from 'lucide-react';
import { PacketFlag, TransportPacket } from '../types/protocol';

interface PacketFlightTimelineProps {
  packets: TransportPacket[];
  onInspectPacket: (pkt: TransportPacket) => void;
  selectedPacketId?: string;
}

export const PacketFlightTimeline: React.FC<PacketFlightTimelineProps> = ({
  packets,
  onInspectPacket,
  selectedPacketId,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new packets
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [packets.length]);

  const getFlagBadges = (flags: number) => {
    const list = [];
    if (flags & PacketFlag.SYN) list.push({ name: 'SYN', color: 'bg-indigo-900/60 text-indigo-300 border-indigo-700' });
    if (flags & PacketFlag.ACK) list.push({ name: 'ACK', color: 'bg-cyan-900/60 text-cyan-300 border-cyan-700' });
    if (flags & PacketFlag.PSH) list.push({ name: 'PSH', color: 'bg-emerald-900/60 text-emerald-300 border-emerald-700' });
    if (flags & PacketFlag.FIN) list.push({ name: 'FIN', color: 'bg-rose-900/60 text-rose-300 border-rose-700' });
    if (flags & PacketFlag.RST) list.push({ name: 'RST', color: 'bg-red-900/60 text-red-300 border-red-700' });
    return list;
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-lg flex flex-col h-[460px]">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800/80 pb-2 mb-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-md bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
            <Clock className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-white flex items-center gap-2">
              Time-Sequence Packet Exchange (Stevens Plot / Wireshark Flow)
            </h2>
            <p className="text-[11px] text-slate-400">
              Interactive UDP Datagram stream with L4 control flags, packet drops, and retransmissions
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-400">
          <span className="text-[11px] font-mono bg-slate-950 px-2 py-1 rounded border border-slate-800">
            {packets.length} Datagrams Logged
          </span>
          <span className="text-[11px] text-slate-500 hidden sm:inline">
            Click any packet to inspect OSI layers
          </span>
        </div>
      </div>

      {/* Column Headers (Client vs Network vs Server) */}
      <div className="grid grid-cols-12 gap-2 text-xs font-mono font-medium text-slate-400 px-3 py-1.5 bg-slate-950/80 rounded-t-lg border border-slate-800/80">
        <div className="col-span-3 text-cyan-400 flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-cyan-400" />
          CLIENT (:19004)
        </div>
        <div className="col-span-6 text-center text-slate-500 flex items-center justify-center gap-1">
          <span>&lt;--- Netem Impairment Channel ---&gt;</span>
        </div>
        <div className="col-span-3 text-right text-emerald-400 flex items-center justify-end gap-1.5">
          SERVER (:9000)
          <span className="w-2 h-2 rounded-full bg-emerald-400" />
        </div>
      </div>

      {/* Packet Stream Container */}
      <div
        ref={containerRef}
        className="flex-1 overflow-y-auto space-y-1.5 p-2 bg-slate-950/40 rounded-b-lg border-x border-b border-slate-800/80 font-mono text-xs"
      >
        {packets.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-500 text-xs gap-2">
            <Radio className="w-6 h-6 text-slate-600 animate-pulse" />
            <p>No packets exchanged yet. Start a file transfer or send a chat message.</p>
          </div>
        ) : (
          packets.map((pkt, idx) => {
            const isC2S = pkt.direction === 'CLIENT_TO_SERVER';
            const flagBadges = getFlagBadges(pkt.header.flags);
            const isSelected = pkt.id === selectedPacketId;

            let rowBg = isSelected
              ? 'bg-cyan-950/60 border-cyan-500/80'
              : 'bg-slate-900/60 hover:bg-slate-850 border-slate-800/80';

            if (pkt.isDropped) {
              rowBg = 'bg-rose-950/30 border-rose-900/50 hover:bg-rose-950/40';
            } else if (pkt.isCorrupted) {
              rowBg = 'bg-amber-950/30 border-amber-900/50 hover:bg-amber-950/40';
            } else if (pkt.isFastRetransmit) {
              rowBg = 'bg-orange-950/30 border-orange-800/60 hover:bg-orange-950/40';
            } else if (pkt.isRetransmission) {
              rowBg = 'bg-blue-950/30 border-blue-800/60 hover:bg-blue-950/40';
            }

            return (
              <div
                key={pkt.id || idx}
                onClick={() => onInspectPacket(pkt)}
                className={`p-2 rounded-lg border transition-all cursor-pointer text-[11px] grid grid-cols-12 gap-2 items-center ${rowBg}`}
              >
                {/* Left Side: Client Marker or Time */}
                <div className="col-span-3 truncate flex items-center gap-1.5">
                  <span className="text-[10px] text-slate-500">#{idx + 1}</span>
                  {isC2S ? (
                    <span className="px-1.5 py-0.5 rounded bg-cyan-950 text-cyan-300 font-bold border border-cyan-800/60 text-[10px]">
                      SEQ={pkt.header.seqNum}
                    </span>
                  ) : (
                    <span className="text-[10px] text-slate-500">
                      ACK={pkt.header.ackNum}
                    </span>
                  )}
                </div>

                {/* Center: Flight Arrow & Netem Event Details */}
                <div className="col-span-6 flex flex-col items-center justify-center">
                  <div className="flex items-center gap-1.5 w-full justify-center">
                    {/* Control Flags */}
                    <div className="flex items-center gap-1">
                      {flagBadges.map((f) => (
                        <span
                          key={f.name}
                          className={`text-[9px] px-1 py-0.2 rounded border font-semibold ${f.color}`}
                        >
                          {f.name}
                        </span>
                      ))}
                    </div>

                    {/* Flight Direction Indicator */}
                    <div className="flex items-center text-slate-400 gap-1 px-1">
                      {isC2S ? (
                        <>
                          <span className="h-0.5 w-8 bg-cyan-500/60" />
                          <ArrowRight className="w-3.5 h-3.5 text-cyan-400" />
                        </>
                      ) : (
                        <>
                          <ArrowLeft className="w-3.5 h-3.5 text-emerald-400" />
                          <span className="h-0.5 w-8 bg-emerald-500/60" />
                        </>
                      )}
                    </div>

                    {/* Status Tags */}
                    {pkt.isDropped && (
                      <span className="px-1.5 py-0.5 rounded bg-rose-950 text-rose-300 border border-rose-800 text-[10px] font-bold flex items-center gap-1">
                        <WifiOff className="w-3 h-3 text-rose-400" />
                        DROPPED
                      </span>
                    )}

                    {pkt.isCorrupted && (
                      <span className="px-1.5 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-800 text-[10px] font-bold flex items-center gap-1">
                        <AlertCircle className="w-3 h-3 text-amber-400" />
                        BAD CHKSUM
                      </span>
                    )}

                    {pkt.isFastRetransmit && (
                      <span className="px-1.5 py-0.5 rounded bg-orange-950 text-orange-300 border border-orange-800 text-[10px] font-bold flex items-center gap-1">
                        <Zap className="w-3 h-3 text-orange-400" />
                        FAST RETX
                      </span>
                    )}

                    {!pkt.isFastRetransmit && pkt.isRetransmission && (
                      <span className="px-1.5 py-0.5 rounded bg-blue-950 text-blue-300 border border-blue-800 text-[10px] font-bold flex items-center gap-1">
                        <Clock className="w-3 h-3 text-blue-400" />
                        RTO RETX
                      </span>
                    )}
                  </div>

                  {/* Summary line */}
                  <div className="text-[10px] text-slate-400 mt-0.5 flex items-center gap-2">
                    {pkt.header.payloadLen > 0 && (
                      <span className="text-slate-400">
                        Payload: {pkt.header.payloadLen}B
                      </span>
                    )}
                    <span className="text-slate-500">
                      WIN={pkt.header.windowSize}
                    </span>
                    <span className="text-slate-500">
                      CHK={pkt.header.checksum.toString(16)}
                    </span>
                    {pkt.simulatedDelayMs && (
                      <span className="text-amber-500/80">
                        +{pkt.simulatedDelayMs}ms
                      </span>
                    )}
                  </div>
                </div>

                {/* Right Side: Server details */}
                <div className="col-span-3 text-right truncate flex items-center justify-end gap-1.5">
                  {!isC2S ? (
                    <span className="px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-300 font-bold border border-emerald-800/60 text-[10px]">
                      ACK={pkt.header.ackNum}
                    </span>
                  ) : (
                    <span className="text-[10px] text-slate-500">
                      Target :9000
                    </span>
                  )}
                  <Eye className="w-3 h-3 text-slate-500 hover:text-cyan-400" />
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
