import React, { useState } from 'react';
import {
  Check,
  Code2,
  Copy,
  Info,
  Layers,
  Network,
  ShieldAlert,
  Terminal,
  X,
  Zap,
} from 'lucide-react';

interface NetemGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const NetemGuideModal: React.FC<NetemGuideModalProps> = ({ isOpen, onClose }) => {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  if (!isOpen) return null;

  const copyCommand = (text: string, idx: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(idx);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const commands = [
    {
      title: '1. Standard 10% Packet Loss + 50ms Delay',
      desc: 'Adds a netem qdisc on the loopback interface simulating a lossy wireless link.',
      cmd: 'sudo tc qdisc add dev lo root netem loss 10% delay 50ms 10ms distribution normal',
    },
    {
      title: '2. Packet Reordering & Jitter',
      desc: 'Causes 25% of packets to arrive out of order with 100ms lag, testing receiver reassembly.',
      cmd: 'sudo tc qdisc add dev lo root netem delay 40ms 15ms reorder 25% 50%',
    },
    {
      title: '3. Bit Corruption (Checksum Failure)',
      desc: 'Corrupts 2% of datagram bytes at the kernel layer, testing RFC 1071 rejection.',
      cmd: 'sudo tc qdisc add dev lo root netem corrupt 2%',
    },
    {
      title: '4. Check Active tc netem Rules',
      desc: 'Displays the current queuing discipline applied to the interface.',
      cmd: 'tc qdisc show dev lo',
    },
    {
      title: '5. Clean & Remove All Netem Rules',
      desc: 'Restores the loopback interface to normal unimpaired state.',
      cmd: 'sudo tc qdisc del dev lo root',
    },
    {
      title: '6. Cross-Platform Userspace Alternative (macOS / Windows)',
      desc: 'If running on macOS or Windows where tc is not available, use our included proxy:',
      cmd: 'python netem_sim.py --listen 8999 --server-port 9000 --loss 0.10 --delay 40',
    },
  ];

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              <Terminal className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                Linux Traffic Control (tc netem) Reference
              </h3>
              <p className="text-xs text-slate-400">
                How kernel packet impairment works and how to run it in VS Code
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

        {/* Body */}
        <div className="p-5 overflow-y-auto space-y-4 text-xs font-mono text-slate-300">
          <div className="p-3 bg-cyan-950/30 border border-cyan-900/60 rounded-xl space-y-1 text-[11px] font-sans">
            <span className="font-bold text-cyan-300 flex items-center gap-1.5">
              <Info className="w-4 h-4" />
              What is tc netem?
            </span>
            <p className="text-slate-300 leading-relaxed">
              <strong>Netem (Network Emulation)</strong> is an in-kernel Queuing Discipline (qdisc) in Linux that intercepts outgoing IP packets to intentionally drop, delay, duplicate, or reorder them. It tests transport protocols like our custom TCP-over-UDP implementation under realistic chaos.
            </p>
          </div>

          <div className="space-y-3">
            {commands.map((c, i) => (
              <div key={i} className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 space-y-1.5">
                <div className="flex items-center justify-between font-sans">
                  <span className="font-bold text-white text-xs">{c.title}</span>
                  <span className="text-[10px] text-slate-500">Command #{i + 1}</span>
                </div>
                <p className="font-sans text-[11px] text-slate-400">{c.desc}</p>
                <div className="flex items-center justify-between gap-2 p-2 rounded-lg bg-slate-900 border border-slate-800 text-[11px] text-cyan-300">
                  <code className="truncate">{c.cmd}</code>
                  <button
                    onClick={() => copyCommand(c.cmd, i)}
                    className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white shrink-0"
                    title="Copy command"
                  >
                    {copiedIndex === i ? (
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-slate-800 bg-slate-950/70 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition-colors"
          >
            Close Guide
          </button>
        </div>
      </div>
    </div>
  );
};
