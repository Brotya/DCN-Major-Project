import React, { useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  FileCode,
  Network,
  Send,
  Sparkles,
  Terminal,
  X,
} from 'lucide-react';
import { PacketFlag } from '../types/protocol';

interface PacketInjectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInject: (packet: {
    direction: 'CLIENT_TO_SERVER' | 'SERVER_TO_CLIENT';
    seqNum: number;
    ackNum: number;
    windowSize: number;
    flags: number;
    payload: string;
    corruptChecksum: boolean;
  }) => void;
  defaultClientSeq: number;
  defaultServerSeq: number;
}

export const PacketInjectorModal: React.FC<PacketInjectorModalProps> = ({
  isOpen,
  onClose,
  onInject,
  defaultClientSeq,
  defaultServerSeq,
}) => {
  const [direction, setDirection] = useState<'CLIENT_TO_SERVER' | 'SERVER_TO_CLIENT'>('CLIENT_TO_SERVER');
  const [seqNum, setSeqNum] = useState<number>(defaultClientSeq);
  const [ackNum, setAckNum] = useState<number>(defaultServerSeq);
  const [windowSize, setWindowSize] = useState<number>(16);
  const [syn, setSyn] = useState(false);
  const [ack, setAck] = useState(true);
  const [fin, setFin] = useState(false);
  const [rst, setRst] = useState(false);
  const [psh, setPsh] = useState(true);
  const [corruptChecksum, setCorruptChecksum] = useState(false);
  const [payload, setPayload] = useState('CUSTOM_L7_PAYLOAD: test arbitrary packet injection');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    let flags = 0;
    if (syn) flags |= PacketFlag.SYN;
    if (ack) flags |= PacketFlag.ACK;
    if (fin) flags |= PacketFlag.FIN;
    if (rst) flags |= PacketFlag.RST;
    if (psh) flags |= PacketFlag.PSH;

    onInject({
      direction,
      seqNum,
      ackNum,
      windowSize,
      flags,
      payload,
      corruptChecksum,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              <Network className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                Craft & Inject Raw L4 UDP Datagram
              </h3>
              <p className="text-[11px] text-slate-400">
                Test how the receiver state machine responds to arbitrary headers, flags, or bit corruptions
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs font-mono">
          {/* Direction */}
          <div className="space-y-1">
            <label className="text-slate-400 font-sans block text-xs">Transmission Direction:</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setDirection('CLIENT_TO_SERVER')}
                className={`p-2 rounded-lg border text-left transition-colors ${
                  direction === 'CLIENT_TO_SERVER'
                    ? 'bg-cyan-950/50 border-cyan-500 text-cyan-300'
                    : 'bg-slate-950 border-slate-800 text-slate-400'
                }`}
              >
                Client (:19004) → Server (:9000)
              </button>
              <button
                type="button"
                onClick={() => setDirection('SERVER_TO_CLIENT')}
                className={`p-2 rounded-lg border text-left transition-colors ${
                  direction === 'SERVER_TO_CLIENT'
                    ? 'bg-emerald-950/50 border-emerald-500 text-emerald-300'
                    : 'bg-slate-950 border-slate-800 text-slate-400'
                }`}
              >
                Server (:9000) → Client (:19004)
              </button>
            </div>
          </div>

          {/* Sequence and ACK numbers */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-slate-400 block mb-1 text-[11px]">Sequence No. (SEQ):</label>
              <input
                type="number"
                value={seqNum}
                onChange={(e) => setSeqNum(parseInt(e.target.value) || 0)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-cyan-400 focus:outline-none focus:border-cyan-500"
              />
            </div>
            <div>
              <label className="text-slate-400 block mb-1 text-[11px]">ACK Number:</label>
              <input
                type="number"
                value={ackNum}
                onChange={(e) => setAckNum(parseInt(e.target.value) || 0)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-emerald-400 focus:outline-none focus:border-cyan-500"
              />
            </div>
            <div>
              <label className="text-slate-400 block mb-1 text-[11px]">Advertised Win (rwnd):</label>
              <input
                type="number"
                value={windowSize}
                onChange={(e) => setWindowSize(parseInt(e.target.value) || 1)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-indigo-400 focus:outline-none focus:border-cyan-500"
              />
            </div>
          </div>

          {/* Control Flags Selection */}
          <div className="space-y-1.5">
            <label className="text-slate-400 font-sans block text-xs">Active L4 Flags:</label>
            <div className="flex flex-wrap gap-2">
              {[
                { name: 'SYN', val: syn, set: setSyn },
                { name: 'ACK', val: ack, set: setAck },
                { name: 'FIN', val: fin, set: setFin },
                { name: 'RST', val: rst, set: setRst },
                { name: 'PSH', val: psh, set: setPsh },
              ].map((f) => (
                <label
                  key={f.name}
                  className={`px-3 py-1.5 rounded-lg border flex items-center gap-1.5 cursor-pointer text-xs font-semibold ${
                    f.val ? 'bg-cyan-950 text-cyan-300 border-cyan-700' : 'bg-slate-950 text-slate-500 border-slate-800'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={f.val}
                    onChange={(e) => f.set(e.target.checked)}
                    className="accent-cyan-500"
                  />
                  {f.name}
                </label>
              ))}
            </div>
          </div>

          {/* Checksum corruption */}
          <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              <span className="text-xs text-slate-300 font-sans">Corrupt RFC 1071 Checksum:</span>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={corruptChecksum}
                onChange={(e) => setCorruptChecksum(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-500"></div>
            </label>
          </div>

          {/* Payload */}
          <div className="space-y-1">
            <label className="text-slate-400 font-sans block text-xs">Application Payload:</label>
            <textarea
              rows={2}
              value={payload}
              onChange={(e) => setPayload(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-200 focus:outline-none focus:border-cyan-500 text-xs font-mono"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-md"
            >
              <Send className="w-3.5 h-3.5" />
              Transmit Datagram onto Wire
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
