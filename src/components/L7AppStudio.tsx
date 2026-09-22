import React, { useState } from 'react';
import {
  ArrowRight,
  CheckCircle2,
  FileCheck,
  FileCode,
  FileSpreadsheet,
  FileText,
  Hash,
  MessageSquare,
  Play,
  RefreshCw,
  Send,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  UploadCloud,
} from 'lucide-react';
import { L7FileTransferState } from '../types/protocol';

interface L7AppStudioProps {
  l7State: L7FileTransferState;
  isRunning: boolean;
  onStartTransfer: (filename: string, content: string) => void;
  onSendChat: (message: string) => void;
}

const SAMPLE_FILES = [
  {
    name: 'sensor_telemetry.json',
    desc: 'Structured IoT JSON dataset (4.8 KB)',
    icon: FileCode,
    content: JSON.stringify(
      Array.from({ length: 45 }, (_, i) => ({
        timestamp: 1726950000 + i * 10,
        sensor_id: `SENSOR_NODE_${(i % 5) + 1}`,
        temperature_c: +(22.4 + Math.sin(i / 3) * 4.2).toFixed(2),
        pressure_hpa: +(1013.2 + Math.cos(i / 4) * 5.1).toFixed(2),
        status: i % 12 === 0 ? 'ALERT' : 'OK',
      })),
      null,
      2
    ),
  },
  {
    name: 'kernel_firmware_v2.bin',
    desc: 'Simulated binary firmware image (3.2 KB)',
    icon: FileText,
    content:
      '=== FIRMWARE HEADER v2.4.0 ===\n' +
      'BOOT_VECTOR: 0x08000000\n' +
      'STACK_INIT:  0x20010000\n' +
      'MAGIC_KEY:   0xCAFEBABE\n' +
      Array.from({ length: 18 }, (_, idx) => `PAGE_${idx}: ${'A1F099C4B823D517'.repeat(10)}\n`).join('') +
      '=== END OF FIRMWARE IMAGE ===\n',
  },
  {
    name: 'network_architecture.svg',
    desc: 'SVG vector diagram markup (2.4 KB)',
    icon: FileSpreadsheet,
    content:
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 200">\n' +
      '  <rect width="400" height="200" fill="#0f172a"/>\n' +
      '  <circle cx="80" cy="100" r="40" fill="#06b6d4" opacity="0.8"/>\n' +
      '  <text x="80" y="105" text-anchor="middle" fill="#fff" font-family="monospace" font-size="12">Client L4/L7</text>\n' +
      '  <circle cx="320" cy="100" r="40" fill="#10b981" opacity="0.8"/>\n' +
      '  <text x="320" y="105" text-anchor="middle" fill="#fff" font-family="monospace" font-size="12">Server L4/L7</text>\n' +
      '  <line x1="120" y1="100" x2="280" y2="100" stroke="#64748b" stroke-dasharray="4" stroke-width="2"/>\n' +
      '</svg>',
  },
];

export const L7AppStudio: React.FC<L7AppStudioProps> = ({
  l7State,
  isRunning,
  onStartTransfer,
  onSendChat,
}) => {
  const [selectedFile, setSelectedFile] = useState(SAMPLE_FILES[0]);
  const [activeSubTab, setActiveSubTab] = useState<'file' | 'chat'>('file');
  const [chatInput, setChatInput] = useState('PING L7 UDP Server! Status check.');
  const [chatMessages, setChatMessages] = useState<Array<{ sender: string; text: string; time: string }>>([
    { sender: 'Server (:9000)', text: 'Reliable UDP Server daemon ready for L7 commands (PUT/GET/CHAT).', time: 'Init' },
  ]);

  const handleStartUpload = () => {
    onStartTransfer(selectedFile.name, selectedFile.content);
  };

  const handleSendChatMsg = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    const newMsg = { sender: 'Client', text: chatInput, time: new Date().toLocaleTimeString() };
    setChatMessages((prev) => [...prev, newMsg]);
    onSendChat(chatInput);

    setTimeout(() => {
      setChatMessages((prev) => [
        ...prev,
        {
          sender: 'Server (:9000)',
          text: `Echo response: Received "${chatInput}" via Reliable UDP L4 socket. SHA verified.`,
          time: new Date().toLocaleTimeString(),
        },
      ]);
    }, 400);

    setChatInput('');
  };

  const progressPct =
    l7State.chunksTotal > 0
      ? Math.min(100, Math.round((l7State.chunksAcked / l7State.chunksTotal) * 100))
      : 0;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-lg space-y-4">
      {/* Studio Header */}
      <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <UploadCloud className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-white flex items-center gap-2">
              Layer 7 Application Protocol Studio
            </h2>
            <p className="text-[11px] text-slate-400">
              High-level commands: PUT, GET, RESUME, CHAT with SHA-256 bit-exact verification
            </p>
          </div>
        </div>

        {/* Sub tabs: File Transfer vs Chat */}
        <div className="flex items-center bg-slate-950 p-1 rounded-lg border border-slate-800 text-xs">
          <button
            onClick={() => setActiveSubTab('file')}
            className={`px-3 py-1 rounded-md font-medium transition-colors flex items-center gap-1.5 ${
              activeSubTab === 'file'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileCheck className="w-3.5 h-3.5" />
            File Transfer (PUT/GET)
          </button>
          <button
            onClick={() => setActiveSubTab('chat')}
            className={`px-3 py-1 rounded-md font-medium transition-colors flex items-center gap-1.5 ${
              activeSubTab === 'chat'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            Command Chat
          </button>
        </div>
      </div>

      {activeSubTab === 'file' ? (
        <div className="space-y-4">
          {/* File Picker row */}
          <div>
            <span className="text-xs text-slate-400 font-medium block mb-2">
              Select Payload to Send over Lossy UDP:
            </span>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
              {SAMPLE_FILES.map((f) => {
                const Icon = f.icon;
                const isSelected = selectedFile.name === f.name;
                return (
                  <button
                    key={f.name}
                    onClick={() => setSelectedFile(f)}
                    className={`p-3 rounded-lg border text-left transition-all flex flex-col justify-between ${
                      isSelected
                        ? 'bg-emerald-950/40 border-emerald-500/80 shadow-sm'
                        : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <Icon className={`w-4 h-4 ${isSelected ? 'text-emerald-400' : 'text-slate-400'}`} />
                      <span className="text-xs font-mono font-semibold text-slate-200 truncate">
                        {f.name}
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-400">{f.desc}</span>
                    <span className="text-[10px] font-mono text-slate-500 mt-2">
                      {f.content.length} bytes • {Math.ceil(f.content.length / 64)} MSS segments
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Action and Transfer Progress Card */}
          <div className="p-3.5 bg-slate-950/80 rounded-xl border border-slate-800 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <button
                  id="btn-start-transfer"
                  disabled={isRunning}
                  onClick={handleStartUpload}
                  className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-semibold flex items-center gap-2 transition-all shadow-md"
                >
                  {isRunning ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Transferring Chunks...
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4 fill-current" />
                      Send '{selectedFile.name}' via Reliable UDP
                    </>
                  )}
                </button>
              </div>

              {/* Progress Summary */}
              <div className="text-xs font-mono text-slate-300 flex items-center gap-3">
                <span>
                  Segments ACKed:{' '}
                  <strong className="text-emerald-400">
                    {l7State.chunksAcked} / {l7State.chunksTotal || 0}
                  </strong>
                </span>
                <span>
                  Delivered:{' '}
                  <strong className="text-cyan-400">{l7State.receivedBytes} B</strong>
                </span>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="w-full bg-slate-800 rounded-full h-2.5 overflow-hidden">
              <div
                className="bg-emerald-500 h-full rounded-full transition-all duration-150"
                style={{ width: `${progressPct}%` }}
              />
            </div>

            {/* SHA-256 Bit-Exact Verification Box */}
            <div className="p-3 bg-slate-900 rounded-lg border border-slate-800/90 text-xs font-mono space-y-1.5">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-slate-400 flex items-center gap-1.5">
                  <Hash className="w-3.5 h-3.5 text-cyan-400" />
                  Source File SHA-256 Digest:
                </span>
                <span className="text-slate-300 truncate max-w-[280px]">
                  {l7State.sourceHash || 'Pending calculation...'}
                </span>
              </div>

              <div className="flex items-center justify-between text-[11px]">
                <span className="text-slate-400 flex items-center gap-1.5">
                  <Hash className="w-3.5 h-3.5 text-emerald-400" />
                  Receiver Reassembled SHA-256:
                </span>
                <span className="text-slate-300 truncate max-w-[280px]">
                  {l7State.receivedHash || (isRunning ? 'Reassembling segments in L4...' : 'Awaiting transfer')}
                </span>
              </div>

              {/* Verification Outcome */}
              <div className="pt-1.5 border-t border-slate-800 flex items-center justify-between">
                <span className="text-slate-400">L7 Integrity Status:</span>
                {l7State.status === 'VERIFIED' ? (
                  <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-700 font-bold flex items-center gap-1.5 text-[11px]">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    100% BIT-EXACT MATCH (Zero corruption despite packet loss)
                  </span>
                ) : l7State.status === 'TRANSFERRING' ? (
                  <span className="text-amber-400 flex items-center gap-1 text-[11px]">
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    Assembling segments across network impairments...
                  </span>
                ) : l7State.status === 'FAILED' ? (
                  <span className="px-2 py-0.5 rounded bg-rose-950 text-rose-300 border border-rose-700 font-bold flex items-center gap-1 text-[11px]">
                    <ShieldAlert className="w-4 h-4 text-rose-400" />
                    CHECKSUM MISMATCH
                  </span>
                ) : (
                  <span className="text-slate-500 text-[11px]">Idle - Click Send to test</span>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Chat Console */
        <div className="space-y-3">
          <div className="h-44 bg-slate-950/80 rounded-xl p-3 border border-slate-800 overflow-y-auto space-y-2 font-mono text-xs">
            {chatMessages.map((m, i) => (
              <div
                key={i}
                className={`p-2 rounded-lg ${
                  m.sender === 'Client'
                    ? 'bg-cyan-950/40 border border-cyan-900/60 ml-6 text-cyan-200'
                    : 'bg-slate-900 border border-slate-800 mr-6 text-slate-300'
                }`}
              >
                <div className="flex items-center justify-between text-[10px] text-slate-500 mb-0.5">
                  <span className="font-semibold text-slate-400">{m.sender}</span>
                  <span>{m.time}</span>
                </div>
                <div>{m.text}</div>
              </div>
            ))}
          </div>

          <form onSubmit={handleSendChatMsg} className="flex gap-2">
            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder="Type message to send over reliable UDP socket..."
              className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500 font-mono"
            />
            <button
              type="submit"
              className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium flex items-center gap-1.5 transition-colors"
            >
              <Send className="w-3.5 h-3.5" />
              Send
            </button>
          </form>
        </div>
      )}
    </div>
  );
};
