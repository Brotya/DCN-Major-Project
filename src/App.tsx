/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useMemo, useState } from 'react';
import { BenchmarkSuite } from './components/BenchmarkSuite';
import { CongestionFsmCard } from './components/CongestionFsmCard';
import { Header } from './components/Header';
import { L7AppStudio } from './components/L7AppStudio';
import { NetemGuideModal } from './components/NetemGuideModal';
import { NetworkControls } from './components/NetworkControls';
import { OsiInspectorModal } from './components/OsiInspectorModal';
import { PacketFlightTimeline } from './components/PacketFlightTimeline';
import { PacketInjectorModal } from './components/PacketInjectorModal';
import { PerformanceMetrics } from './components/PerformanceMetrics';
import { SimulationPlaybackBar } from './components/SimulationPlaybackBar';
import { WindowVisualizer } from './components/WindowVisualizer';
import { ProtocolSimulator, SimulationState } from './simulator/reliableEngine';
import { NetemConfig, TransportPacket } from './types/protocol';

const DEFAULT_NETEM_CONFIG: NetemConfig = {
  lossRate: 0.08, // 8% initial loss rate to clearly demonstrate recovery
  baseDelayMs: 40,
  jitterMs: 10,
  reorderRate: 0.05,
  corruptRate: 0.02,
  windowSize: 16,
  congestionControl: 'RENO',
  useSack: true,
  mss: 1024,
  initialRtoMs: 250,
  simulationSpeed: 1.0,
  linkBandwidthMbps: 10.0,
};

export default function App() {
  const [config, setConfig] = useState<NetemConfig>(DEFAULT_NETEM_CONFIG);
  const [activeTab, setActiveTab] = useState<'simulator' | 'fsm' | 'benchmark'>('simulator');
  const [isNetemGuideOpen, setIsNetemGuideOpen] = useState(false);
  const [isInjectorOpen, setIsInjectorOpen] = useState(false);
  const [inspectedPacket, setInspectedPacket] = useState<TransportPacket | null>(null);

  // Initialize Protocol Simulator
  const simulator = useMemo(() => new ProtocolSimulator(config), []);
  const [simState, setSimState] = useState<SimulationState>(() => (simulator as any).state);

  useEffect(() => {
    const unsubscribe = simulator.subscribe((state) => {
      setSimState(state);
    });
    return unsubscribe;
  }, [simulator]);

  const handleChangeConfig = (newConfig: Partial<NetemConfig>) => {
    const updated = { ...config, ...newConfig };
    setConfig(updated);
    simulator.updateConfig(updated);
  };

  const handleSelectPreset = (preset: 'clean' | 'wifi' | 'satellite' | 'chaos') => {
    if (preset === 'clean') {
      handleChangeConfig({
        lossRate: 0.0,
        baseDelayMs: 10,
        jitterMs: 2,
        reorderRate: 0.0,
        corruptRate: 0.0,
        windowSize: 24,
        congestionControl: 'RENO',
        useSack: true,
      });
    } else if (preset === 'wifi') {
      handleChangeConfig({
        lossRate: 0.08,
        baseDelayMs: 45,
        jitterMs: 12,
        reorderRate: 0.05,
        corruptRate: 0.01,
        windowSize: 16,
        congestionControl: 'RENO',
        useSack: true,
      });
    } else if (preset === 'satellite') {
      handleChangeConfig({
        lossRate: 0.04,
        baseDelayMs: 240,
        jitterMs: 30,
        reorderRate: 0.02,
        corruptRate: 0.0,
        windowSize: 32,
        congestionControl: 'RENO',
        useSack: true,
      });
    } else if (preset === 'chaos') {
      handleChangeConfig({
        lossRate: 0.20,
        baseDelayMs: 60,
        jitterMs: 20,
        reorderRate: 0.15,
        corruptRate: 0.05,
        windowSize: 12,
        congestionControl: 'RENO',
        useSack: false,
      });
    }
  };

  const handleStartTransfer = (filename: string, content: string) => {
    simulator.startTransfer(filename, content);
  };

  const handleReset = () => {
    simulator.reset();
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-cyan-500/20 selection:text-cyan-300">
      {/* Global Header */}
      <Header
        connectionState={simState.connectionState}
        onReset={handleReset}
        onOpenNetemGuide={() => setIsNetemGuideOpen(true)}
        onSelectPreset={handleSelectPreset}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 space-y-5">
        {/* Playback & Chaos Bar (available on simulator and fsm view) */}
        {activeTab !== 'benchmark' && (
          <SimulationPlaybackBar
            isRunning={simState.isRunning}
            isPaused={simState.isPaused}
            simulationSpeed={config.simulationSpeed}
            onPlay={() => simulator.resume()}
            onPause={() => simulator.pause()}
            onStep={() => simulator.step()}
            onChangeSpeed={(speed) => handleChangeConfig({ simulationSpeed: speed })}
            onForceDrop={() => simulator.forceDropNext()}
            onForceCorrupt={() => simulator.forceCorruptNext()}
            onSeverConnection={() => simulator.severConnection()}
            onResumeTransfer={() => simulator.resumeTransfer()}
            onOpenPacketCrafting={() => setIsInjectorOpen(true)}
            nextDropForced={simState.nextDropForced}
            nextCorruptForced={simState.nextCorruptForced}
            isSevered={simState.l7State.status === 'SEVERED'}
          />
        )}

        {activeTab === 'simulator' && (
          <div className="space-y-5 animate-in fade-in duration-150">
            {/* 1. Network Impairment Controls */}
            <NetworkControls
              config={config}
              onChangeConfig={handleChangeConfig}
              isRunning={simState.isRunning}
            />

            {/* 2. L4 Sliding Window & Buffer State */}
            <WindowVisualizer
              senderWindow={simState.senderWindow}
              receiverBuffer={simState.receiverBuffer}
              cwnd={simState.cwnd}
              rwnd={simState.peerRwnd}
              ssthresh={simState.ssthresh}
              clientAck={simState.clientAck}
            />

            {/* 3. Dual Column: Left = L7 App & Metrics | Right = Packet Flight Timeline */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
              {/* Left Column: L7 Studio & Performance Telemetry (7 cols) */}
              <div className="lg:col-span-7 space-y-5">
                <L7AppStudio
                  l7State={simState.l7State}
                  isRunning={simState.isRunning}
                  onStartTransfer={handleStartTransfer}
                  onSendChat={(msg) => {
                    simulator.startTransfer('chat_message.txt', msg);
                  }}
                />

                <PerformanceMetrics
                  metrics={simState.metricsHistory}
                  packetsSent={simState.packetsSent}
                  packetsDropped={simState.packetsDropped}
                  retransmissions={simState.retransmissions}
                  fastRetransmits={simState.fastRetransmits}
                  corruptedPackets={simState.corruptedPackets}
                  cwnd={simState.cwnd}
                  rtoMs={simState.rtoMs}
                  srttMs={simState.srttMs}
                  totalBytesDelivered={simState.totalBytesDelivered}
                />
              </div>

              {/* Right Column: Time-Sequence Packet Exchange Plot (5 cols) */}
              <div className="lg:col-span-5 sticky top-20">
                <PacketFlightTimeline
                  packets={simState.recentPackets}
                  onInspectPacket={(pkt) => setInspectedPacket(pkt)}
                  selectedPacketId={inspectedPacket?.id}
                />
              </div>
            </div>
          </div>
        )}

        {activeTab === 'fsm' && (
          <div className="space-y-5 animate-in fade-in duration-150">
            <CongestionFsmCard
              congestionState={simState.congestionState}
              congestionAlgorithm={config.congestionControl}
              cwnd={simState.cwnd}
              ssthresh={simState.ssthresh}
              rwnd={simState.peerRwnd}
              rttMs={simState.srttMs}
              bdpBytes={Math.round(
                ((config.linkBandwidthMbps * 1_000_000) * (simState.srttMs / 1000)) / 8
              )}
              mss={config.mss}
              useSack={config.useSack}
              activeSackBlocks={simState.activeSackBlocks}
              sackEvents={simState.sackEvents}
            />

            {/* Also show Sliding Window and Real-time Telemetry in FSM view for deep analysis */}
            <WindowVisualizer
              senderWindow={simState.senderWindow}
              receiverBuffer={simState.receiverBuffer}
              cwnd={simState.cwnd}
              rwnd={simState.peerRwnd}
              ssthresh={simState.ssthresh}
              clientAck={simState.clientAck}
            />

            <PerformanceMetrics
              metrics={simState.metricsHistory}
              packetsSent={simState.packetsSent}
              packetsDropped={simState.packetsDropped}
              retransmissions={simState.retransmissions}
              fastRetransmits={simState.fastRetransmits}
              corruptedPackets={simState.corruptedPackets}
              cwnd={simState.cwnd}
              rtoMs={simState.rtoMs}
              srttMs={simState.srttMs}
              totalBytesDelivered={simState.totalBytesDelivered}
            />
          </div>
        )}

        {activeTab === 'benchmark' && (
          <div className="animate-in fade-in duration-150">
            <BenchmarkSuite />
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950/80 py-4 px-6 text-center text-xs text-slate-500 font-mono">
        Reliable Transport Protocol (L4) + Application Protocol (L7) over UDP • RFC 1071 Checksum • RFC 2018 SACK • Jacobson/Karels RTO • TCP Reno AIMD
      </footer>

      {/* OSI Inspector Modal with Wireshark-Grade Hex Wire Dissector */}
      <OsiInspectorModal
        packet={inspectedPacket}
        onClose={() => setInspectedPacket(null)}
      />

      {/* Custom Packet Crafter & Injector Modal */}
      <PacketInjectorModal
        isOpen={isInjectorOpen}
        onClose={() => setIsInjectorOpen(false)}
        onInject={(custom) => simulator.injectCustomPacket(custom)}
        defaultClientSeq={simState.clientSeq}
        defaultServerSeq={simState.serverSeq}
      />

      {/* Linux tc netem Shell Guide Modal */}
      <NetemGuideModal
        isOpen={isNetemGuideOpen}
        onClose={() => setIsNetemGuideOpen(false)}
      />
    </div>
  );
}
