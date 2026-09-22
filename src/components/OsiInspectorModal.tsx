import React, { useState } from 'react';
import {
  AlertTriangle,
  Binary,
  CheckCircle2,
  Cpu,
  FileCode,
  Globe,
  Layers,
  Network,
  ShieldCheck,
  Terminal,
  X,
} from 'lucide-react';
import { PacketFlag, TransportPacket } from '../types/protocol';

interface OsiInspectorModalProps {
  packet: TransportPacket | null;
  onClose: () => void;
}

export const OsiInspectorModal: React.FC<OsiInspectorModalProps> = ({ packet, onClose }) => {
  const [highlightedField, setHighlightedField] = useState<string | null>(null);

  if (!packet) return null;

  const h = packet.header;

  const getFlagDetails = () => {
    const flags = [];
    if (h.flags & PacketFlag.SYN) flags.push({ bit: '0x01', name: 'SYN', desc: 'Synchronize sequence numbers' });
    if (h.flags & PacketFlag.ACK) flags.push({ bit: '0x02', name: 'ACK', desc: 'Acknowledgement field valid' });
    if (h.flags & PacketFlag.FIN) flags.push({ bit: '0x04', name: 'FIN', desc: 'No more data from sender' });
    if (h.flags & PacketFlag.RST) flags.push({ bit: '0x08', name: 'RST', desc: 'Reset the connection' });
    if (h.flags & PacketFlag.PSH) flags.push({ bit: '0x10', name: 'PSH', desc: 'Push data immediately to L7' });
    return flags;
  };

  // Build raw byte array for hex view
  const rawHexTokens = (packet.rawHex || '').split(' ').filter(Boolean);

  const getByteClass = (index: number) => {
    if (index >= 0 && index <= 3) {
      return highlightedField === 'seq'
        ? 'bg-cyan-500 text-black font-bold ring-2 ring-cyan-300'
        : 'text-cyan-400 hover:bg-cyan-950';
    }
    if (index >= 4 && index <= 7) {
      return highlightedField === 'ack'
        ? 'bg-emerald-500 text-black font-bold ring-2 ring-emerald-300'
        : 'text-emerald-400 hover:bg-emerald-950';
    }
    if (index >= 8 && index <= 9) {
      return highlightedField === 'win'
        ? 'bg-indigo-500 text-white font-bold ring-2 ring-indigo-300'
        : 'text-indigo-400 hover:bg-indigo-950';
    }
    if (index >= 10 && index <= 11) {
      return highlightedField === 'chk'
        ? 'bg-amber-500 text-black font-bold ring-2 ring-amber-300'
        : 'text-amber-400 hover:bg-amber-950';
    }
    if (index === 12) {
      return highlightedField === 'flags'
        ? 'bg-rose-500 text-white font-bold ring-2 ring-rose-300'
        : 'text-rose-400 hover:bg-rose-950';
    }
    if (index === 13) {
      return 'text-slate-500';
    }
    return highlightedField === 'payload'
      ? 'bg-purple-500 text-white font-bold ring-2 ring-purple-300'
      : 'text-purple-300 hover:bg-purple-950';
  };

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                OSI Protocol Dissector: Datagram #{packet.id.split('-')[1]}
                <span className="text-xs px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800 font-mono">
                  {packet.direction === 'CLIENT_TO_SERVER' ? 'Client → Server (:9000)' : 'Server → Client (:19004)'}
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Dissecting Application (L7), Reliable Transport (L4), and UDP Wire Framing
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 overflow-y-auto space-y-4 font-mono text-xs">
          {/* Layer 7: Application Protocol */}
          <div className="border border-indigo-900/60 bg-indigo-950/20 rounded-xl p-3.5 space-y-2">
            <div className="flex items-center justify-between border-b border-indigo-900/50 pb-1.5">
              <span className="font-bold text-indigo-300 flex items-center gap-1.5">
                <Globe className="w-4 h-4" />
                Layer 7: Application Protocol (L7 Framing)
              </span>
              <span className="text-[10px] text-indigo-400">
                {packet.payload ? `${packet.payload.length} bytes payload` : 'Control-only datagram (No L7 payload)'}
              </span>
            </div>
            {packet.payload ? (
              <div className="space-y-1.5">
                <div className="p-2 rounded bg-slate-950 border border-slate-800 text-slate-300 font-mono text-[11px] overflow-x-auto whitespace-pre-wrap">
                  {packet.payload}
                </div>
                <div className="flex items-center justify-between text-[11px] text-slate-400">
                  <span>Framing: <code className="text-cyan-300">COMMAND JSON_HEADER\r\n\r\nPAYLOAD</code></span>
                  <span className="text-emerald-400 flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    SHA-256 Bit-Exact Verification
                  </span>
                </div>
              </div>
            ) : (
              <p className="text-slate-500 text-[11px] italic">
                This packet is an L4 transport control segment (Handshake SYN/ACK, RST, or pure Acknowledgement).
              </p>
            )}
          </div>

          {/* Layer 4: Custom Reliable Transport Header */}
          <div className="border border-cyan-900/60 bg-cyan-950/20 rounded-xl p-3.5 space-y-3">
            <div className="flex items-center justify-between border-b border-cyan-900/50 pb-1.5">
              <span className="font-bold text-cyan-300 flex items-center gap-1.5">
                <Network className="w-4 h-4" />
                Layer 4: 14-Byte Binary Header Wire Fields
              </span>
              <span className="text-[10px] text-cyan-400">
                struct.pack("!IIHHBB", seq, ack, win, chk, flags, 0)
              </span>
            </div>

            {/* Visual Binary Field Table */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <div
                onMouseEnter={() => setHighlightedField('seq')}
                onMouseLeave={() => setHighlightedField(null)}
                className="p-2 bg-slate-950 rounded-lg border border-slate-800 cursor-pointer hover:border-cyan-500 transition-colors"
              >
                <span className="text-[10px] text-slate-500 block">Sequence No. [0..3]</span>
                <span className="text-sm font-bold text-cyan-400 font-mono">{h.seqNum}</span>
              </div>
              <div
                onMouseEnter={() => setHighlightedField('ack')}
                onMouseLeave={() => setHighlightedField(null)}
                className="p-2 bg-slate-950 rounded-lg border border-slate-800 cursor-pointer hover:border-emerald-500 transition-colors"
              >
                <span className="text-[10px] text-slate-500 block">ACK No. [4..7]</span>
                <span className="text-sm font-bold text-emerald-400 font-mono">{h.ackNum}</span>
              </div>
              <div
                onMouseEnter={() => setHighlightedField('win')}
                onMouseLeave={() => setHighlightedField(null)}
                className="p-2 bg-slate-950 rounded-lg border border-slate-800 cursor-pointer hover:border-indigo-500 transition-colors"
              >
                <span className="text-[10px] text-slate-500 block">Advertised Win [8..9]</span>
                <span className="text-sm font-bold text-indigo-400 font-mono">{h.windowSize} pkts</span>
              </div>
              <div
                onMouseEnter={() => setHighlightedField('chk')}
                onMouseLeave={() => setHighlightedField(null)}
                className="p-2 bg-slate-950 rounded-lg border border-slate-800 cursor-pointer hover:border-amber-500 transition-colors"
              >
                <span className="text-[10px] text-slate-500 block">RFC 1071 Chksum [10..11]</span>
                <span className="text-sm font-bold text-amber-400 font-mono">
                  0x{h.checksum.toString(16).padStart(4, '0')}
                </span>
              </div>
            </div>

            {/* Active Flags Breakdown */}
            <div>
              <span className="text-[10px] text-slate-400 block mb-1">
                Active Control Flags [Byte 12]:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {getFlagDetails().map((f) => (
                  <span
                    key={f.name}
                    className="px-2 py-1 rounded bg-slate-950 border border-cyan-800/80 text-cyan-300 text-[11px] flex items-center gap-1.5"
                  >
                    <span className="font-bold">{f.name}</span>
                    <span className="text-[10px] text-slate-500">({f.bit})</span>
                    <span className="text-[10px] text-slate-400">- {f.desc}</span>
                  </span>
                ))}
              </div>
            </div>

            {/* RFC 2018 SACK Blocks Dissection if present */}
            {h.sackBlocks && h.sackBlocks.length > 0 && (
              <div className="p-2.5 rounded-lg bg-emerald-950/40 border border-emerald-800/80 space-y-1">
                <span className="text-[11px] font-bold text-emerald-300 flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  RFC 2018 SACK Option Header Attached:
                </span>
                <div className="flex flex-wrap gap-2 text-[10px] text-slate-300">
                  {h.sackBlocks.map((b, idx) => (
                    <span key={idx} className="px-2 py-0.5 rounded bg-slate-900 border border-emerald-700">
                      Block #{idx + 1}: Left Edge = <strong className="text-emerald-400">{b.leftEdge}</strong>, Right Edge = <strong className="text-emerald-400">{b.rightEdge}</strong>
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Wireshark-Grade Interactive Hex Dissector */}
            <div className="space-y-1.5 pt-1">
              <div className="flex items-center justify-between text-[11px]">
                <span className="font-bold text-slate-300 flex items-center gap-1.5">
                  <Binary className="w-3.5 h-3.5 text-cyan-400" />
                  Wireshark Hex Wire Dump (Hover to Highlight Fields):
                </span>
                <div className="flex items-center gap-2 text-[10px]">
                  <span className="text-cyan-400">■ SEQ</span>
                  <span className="text-emerald-400">■ ACK</span>
                  <span className="text-indigo-400">■ WIN</span>
                  <span className="text-amber-400">■ CHK</span>
                  <span className="text-rose-400">■ FLG</span>
                  <span className="text-purple-400">■ DATA</span>
                </div>
              </div>

              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 font-mono text-[11px] leading-relaxed">
                <div className="flex flex-wrap gap-1.5">
                  {rawHexTokens.map((byte, idx) => (
                    <span
                      key={idx}
                      className={`px-1.5 py-0.5 rounded text-xs transition-colors cursor-pointer ${getByteClass(idx)}`}
                      title={`Byte offset ${idx}`}
                    >
                      {byte}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Network Impairment Annotation */}
            {(packet.isDropped || packet.isCorrupted || packet.isRetransmission || packet.isFastRetransmit) && (
              <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                <div className="text-[11px]">
                  <span className="font-bold text-slate-200">Transport Event: </span>
                  <span className="text-slate-400">
                    {packet.isDropped
                      ? 'Packet was dropped in transit by simulated netem loss rule.'
                      : packet.isCorrupted
                      ? 'Datagram arrived with corrupted bits; failed RFC 1071 checksum verification.'
                      : packet.isFastRetransmit
                      ? 'Fast Retransmit triggered after sender received 3 duplicate ACKs.'
                      : 'Retransmitted after RTO timer expired without receiving ACK.'}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Layer 3/2: Lower Transport Datagram */}
          <div className="border border-slate-800 bg-slate-950/40 rounded-xl p-3 space-y-1.5 text-slate-400 text-[11px]">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-1">
              <span className="font-semibold text-slate-300 flex items-center gap-1.5">
                <Cpu className="w-4 h-4" />
                Layer 3 / 4 Base: Standard UDP Socket (SOCK_DGRAM)
              </span>
              <span>Loopback (lo) / 127.0.0.1</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-[10px]">
              <div>Source: {packet.direction === 'CLIENT_TO_SERVER' ? '127.0.0.1:19004' : '127.0.0.1:9000'}</div>
              <div>Destination: {packet.direction === 'CLIENT_TO_SERVER' ? '127.0.0.1:9000' : '127.0.0.1:19004'}</div>
              <div>Protocol: UDP (17)</div>
              <div>Total Wire Size: {14 + packet.payload.length + 8 + 20} bytes</div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-slate-800 bg-slate-950/70 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition-colors"
          >
            Close Inspector
          </button>
        </div>
      </div>
    </div>
  );
};
