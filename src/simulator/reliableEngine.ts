/**
 * In-Browser Faithful Simulation Engine for L4 Transport + L7 App Protocol
 * Enhanced with SACK (RFC 2018), Congestion Control FSM, Single-Step Playback,
 * Manual Packet Injection, and Resumable Interruption.
 */

import {
  CongestionAlgorithm,
  CongestionState,
  ConnectionState,
  L7FileTransferState,
  MetricPoint,
  NetemConfig,
  PacketFlag,
  PacketHeader,
  ReceiverSlot,
  SackBlock,
  TransportPacket,
  WindowSlot,
} from '../types/protocol';

export async function sha256Hex(str: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(str);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

export function computeRFC1071Checksum(data: string): number {
  let total = 0;
  for (let i = 0; i < data.length; i += 2) {
    const c1 = data.charCodeAt(i);
    const c2 = i + 1 < data.length ? data.charCodeAt(i + 1) : 0;
    const word = (c1 << 8) + c2;
    total += word;
    total = (total & 0xffff) + (total >> 16);
  }
  return ~total & 0xffff;
}

export function generatePacketHex(h: PacketHeader, payload: string): string {
  const seqHex = h.seqNum.toString(16).padStart(8, '0');
  const ackHex = h.ackNum.toString(16).padStart(8, '0');
  const winHex = h.windowSize.toString(16).padStart(4, '0');
  const chkHex = h.checksum.toString(16).padStart(4, '0');
  const flagsHex = h.flags.toString(16).padStart(2, '0');
  const rsvHex = '00';

  let hexStr = `${seqHex}${ackHex}${winHex}${chkHex}${flagsHex}${rsvHex}`;
  for (let i = 0; i < Math.min(32, payload.length); i++) {
    hexStr += payload.charCodeAt(i).toString(16).padStart(2, '0');
  }

  // Format into bytes
  const bytes = [];
  for (let i = 0; i < hexStr.length; i += 2) {
    bytes.push(hexStr.slice(i, i + 2).toUpperCase());
  }
  return bytes.join(' ');
}

export interface SimulationState {
  isRunning: boolean;
  isPaused: boolean;
  connectionState: ConnectionState;
  congestionState: CongestionState;
  clientSeq: number;
  serverSeq: number;
  clientAck: number;
  serverAck: number;
  cwnd: number;
  ssthresh: number;
  peerRwnd: number;
  srttMs: number;
  rttvarMs: number;
  rtoMs: number;
  packetsSent: number;
  packetsDropped: number;
  retransmissions: number;
  fastRetransmits: number;
  corruptedPackets: number;
  sackEvents: number;
  totalBytesDelivered: number;
  senderWindow: WindowSlot[];
  receiverBuffer: ReceiverSlot[];
  recentPackets: TransportPacket[];
  metricsHistory: MetricPoint[];
  l7State: L7FileTransferState;
  elapsedSec: number;
  nextDropForced: boolean;
  nextCorruptForced: boolean;
  activeSackBlocks: SackBlock[];
}

export class ProtocolSimulator {
  private config: NetemConfig;
  private state: SimulationState;
  private listeners: ((state: SimulationState) => void)[] = [];
  private chunksToSend: string[] = [];
  private receivedChunksMap = new Map<number, string>();
  private dupAckCounter = 0;
  private lastAckNum = -1;
  private timerInterval: any = null;
  private chunkIndex = 0;

  constructor(config: NetemConfig) {
    this.config = config;
    this.state = this.getInitialState();
  }

  private getInitialState(): SimulationState {
    return {
      isRunning: false,
      isPaused: false,
      connectionState: ConnectionState.CLOSED,
      congestionState: 'SLOW_START',
      clientSeq: 1000,
      serverSeq: 5000,
      clientAck: 0,
      serverAck: 0,
      cwnd: 1.0,
      ssthresh: 16.0,
      peerRwnd: this.config.windowSize,
      srttMs: this.config.baseDelayMs * 2,
      rttvarMs: this.config.jitterMs * 2,
      rtoMs: Math.max(150, this.config.baseDelayMs * 2 + 4 * this.config.jitterMs),
      packetsSent: 0,
      packetsDropped: 0,
      retransmissions: 0,
      fastRetransmits: 0,
      corruptedPackets: 0,
      sackEvents: 0,
      totalBytesDelivered: 0,
      senderWindow: [],
      receiverBuffer: [],
      recentPackets: [],
      metricsHistory: [],
      l7State: {
        filename: 'sample_payload.bin',
        totalSize: 0,
        sentBytes: 0,
        receivedBytes: 0,
        sourceHash: '',
        receivedHash: '',
        status: 'IDLE',
        chunksTotal: 0,
        chunksAcked: 0,
        offset: 0,
      },
      elapsedSec: 0,
      nextDropForced: false,
      nextCorruptForced: false,
      activeSackBlocks: [],
    };
  }

  public updateConfig(newConfig: Partial<NetemConfig>) {
    this.config = { ...this.config, ...newConfig };
    this.state.peerRwnd = this.config.windowSize;
    this.notify();
  }

  public subscribe(fn: (s: SimulationState) => void) {
    this.listeners.push(fn);
    fn(this.state);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== fn);
    };
  }

  private notify() {
    this.listeners.forEach((l) => l({ ...this.state }));
  }

  public reset() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
    this.state = this.getInitialState();
    this.chunksToSend = [];
    this.receivedChunksMap.clear();
    this.dupAckCounter = 0;
    this.lastAckNum = -1;
    this.chunkIndex = 0;
    this.notify();
  }

  public pause() {
    this.state.isPaused = true;
    this.notify();
  }

  public resume() {
    this.state.isPaused = false;
    this.notify();
  }

  public step() {
    if (!this.state.isRunning) return;
    this.executeTransmissionTick();
  }

  public forceDropNext() {
    this.state.nextDropForced = true;
    this.notify();
  }

  public forceCorruptNext() {
    this.state.nextCorruptForced = true;
    this.notify();
  }

  public severConnection() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
    this.state.isRunning = false;
    this.state.connectionState = ConnectionState.CLOSED;
    this.state.l7State.status = 'SEVERED';

    // Log an RST packet
    const rstPkt: TransportPacket = {
      id: 'rst-' + Date.now(),
      header: {
        seqNum: this.state.clientSeq,
        ackNum: this.state.serverSeq,
        windowSize: 0,
        checksum: 0x9999,
        flags: PacketFlag.RST,
        payloadLen: 0,
      },
      payload: '',
      timestamp: Date.now(),
      direction: 'CLIENT_TO_SERVER',
      rawHex: '00 00 00 00 00 00 00 00 00 00 99 99 08 00',
    };
    this.state.recentPackets.push(rstPkt);
    this.notify();
  }

  public async resumeTransfer() {
    if (this.state.l7State.status !== 'SEVERED' && this.state.l7State.status !== 'PAUSED') return;

    // Resuming from acknowledged byte offset
    const resumeOffset = this.state.l7State.receivedBytes;
    this.state.l7State.offset = resumeOffset;
    this.state.l7State.status = 'TRANSFERRING';
    this.state.isRunning = true;
    this.state.isPaused = false;

    // Fast 3-way reconnect
    await this.performHandshake();
    this.runTransmissionLoop();
  }

  public injectCustomPacket(custom: {
    direction: 'CLIENT_TO_SERVER' | 'SERVER_TO_CLIENT';
    seqNum: number;
    ackNum: number;
    windowSize: number;
    flags: number;
    payload: string;
    corruptChecksum: boolean;
  }) {
    let chk = computeRFC1071Checksum(custom.payload);
    if (custom.corruptChecksum) chk = (chk ^ 0xffff) & 0xffff;

    const pkt: TransportPacket = {
      id: 'custom-' + Date.now(),
      header: {
        seqNum: custom.seqNum,
        ackNum: custom.ackNum,
        windowSize: custom.windowSize,
        checksum: chk,
        flags: custom.flags,
        payloadLen: custom.payload.length,
      },
      payload: custom.payload,
      timestamp: Date.now(),
      direction: custom.direction,
      isManualInjection: true,
      rawHex: generatePacketHex(
        {
          seqNum: custom.seqNum,
          ackNum: custom.ackNum,
          windowSize: custom.windowSize,
          checksum: chk,
          flags: custom.flags,
          payloadLen: custom.payload.length,
        },
        custom.payload
      ),
    };

    this.state.recentPackets.push(pkt);
    this.state.packetsSent++;

    if (custom.corruptChecksum) {
      pkt.isCorrupted = true;
      pkt.dropReason = 'Manually injected invalid RFC 1071 checksum';
      this.state.corruptedPackets++;
      this.notify();
      return;
    }

    // Process arrival
    if (custom.direction === 'CLIENT_TO_SERVER') {
      setTimeout(() => {
        this.handleReceiverArrival(pkt, 1001, this.receivedChunksMap);
      }, this.config.baseDelayMs);
    } else {
      setTimeout(() => {
        this.handleAckArrival(pkt, custom.ackNum);
      }, this.config.baseDelayMs);
    }
    this.notify();
  }

  public async startTransfer(filename: string, content: string) {
    this.reset();
    this.state.isRunning = true;
    this.state.isPaused = false;
    const sourceHash = await sha256Hex(content);

    const chunkSize = 64;
    const chunks: string[] = [];
    for (let i = 0; i < content.length; i += chunkSize) {
      chunks.push(content.slice(i, i + chunkSize));
    }

    this.chunksToSend = chunks;
    this.state.l7State = {
      filename,
      totalSize: content.length,
      sentBytes: 0,
      receivedBytes: 0,
      sourceHash,
      receivedHash: '',
      status: 'TRANSFERRING',
      chunksTotal: chunks.length,
      chunksAcked: 0,
      offset: 0,
    };

    // Setup initial window slots
    for (let i = 0; i < chunks.length; i++) {
      this.state.senderWindow.push({
        seqNum: 1001 + i,
        data: chunks[i],
        status: 'USABLE',
        retransmissions: 0,
        isSacked: false,
      });
      this.state.receiverBuffer.push({
        seqNum: 1001 + i,
        data: '',
        status: 'MISSING_HOLE',
      });
    }

    this.notify();
    await this.performHandshake();
    this.runTransmissionLoop();
  }

  private async performHandshake() {
    this.state.connectionState = ConnectionState.SYN_SENT;
    const synH: PacketHeader = {
      seqNum: this.state.clientSeq,
      ackNum: 0,
      windowSize: this.config.windowSize,
      checksum: 0xaa11,
      flags: PacketFlag.SYN,
      payloadLen: 0,
    };
    const synPkt: TransportPacket = {
      id: 'syn-' + Date.now(),
      header: synH,
      payload: '',
      timestamp: Date.now(),
      direction: 'CLIENT_TO_SERVER',
      rawHex: generatePacketHex(synH, ''),
    };
    this.state.recentPackets.push(synPkt);
    this.state.packetsSent++;
    this.state.clientSeq++;
    this.notify();

    await new Promise((r) => setTimeout(r, Math.max(40, this.config.baseDelayMs / this.config.simulationSpeed)));

    this.state.connectionState = ConnectionState.SYN_RCVD;
    const synAckH: PacketHeader = {
      seqNum: this.state.serverSeq,
      ackNum: this.state.clientSeq,
      windowSize: this.config.windowSize,
      checksum: 0xbb22,
      flags: PacketFlag.SYN | PacketFlag.ACK,
      payloadLen: 0,
    };
    const synAckPkt: TransportPacket = {
      id: 'synack-' + Date.now(),
      header: synAckH,
      payload: '',
      timestamp: Date.now(),
      direction: 'SERVER_TO_CLIENT',
      rawHex: generatePacketHex(synAckH, ''),
    };
    this.state.recentPackets.push(synAckPkt);
    this.state.packetsSent++;
    this.state.serverSeq++;
    this.state.clientAck = this.state.clientSeq;
    this.notify();

    await new Promise((r) => setTimeout(r, Math.max(40, this.config.baseDelayMs / this.config.simulationSpeed)));

    this.state.connectionState = ConnectionState.ESTABLISHED;
    const ackH: PacketHeader = {
      seqNum: this.state.clientSeq,
      ackNum: this.state.serverSeq,
      windowSize: this.config.windowSize,
      checksum: 0xcc33,
      flags: PacketFlag.ACK,
      payloadLen: 0,
    };
    const ackPkt: TransportPacket = {
      id: 'ack-' + Date.now(),
      header: ackH,
      payload: '',
      timestamp: Date.now(),
      direction: 'CLIENT_TO_SERVER',
      rawHex: generatePacketHex(ackH, ''),
    };
    this.state.recentPackets.push(ackPkt);
    this.state.packetsSent++;
    this.notify();
  }

  private runTransmissionLoop() {
    const intervalMs = Math.max(20, Math.round(90 / this.config.simulationSpeed));
    const startTime = Date.now();

    this.timerInterval = setInterval(async () => {
      if (!this.state.isRunning || this.state.isPaused) return;

      const now = Date.now();
      this.state.elapsedSec = (now - startTime) / 1000;
      this.executeTransmissionTick();
    }, intervalMs);
  }

  private executeTransmissionTick() {
    const now = Date.now();
    const totalChunks = this.chunksToSend.length;

    // Effective Window: min(cwnd, rwnd)
    const effectiveWindow =
      this.config.congestionControl === 'FIXED_WINDOW'
        ? this.config.windowSize
        : Math.max(1, Math.floor(Math.min(this.state.cwnd, this.state.peerRwnd)));

    // UnACKed and not SACKed inflight slots
    const inflightSlots = this.state.senderWindow.filter(
      (s) => s.status === 'SENT_UNACKED' && !s.isSacked
    );

    // Update FSM Congestion State
    if (this.config.congestionControl !== 'FIXED_WINDOW') {
      if (this.state.cwnd < this.state.ssthresh) {
        this.state.congestionState = 'SLOW_START';
      } else if (this.dupAckCounter >= 3) {
        this.state.congestionState = 'FAST_RECOVERY';
      } else {
        this.state.congestionState = 'CONGESTION_AVOIDANCE';
      }
    }

    // Check RTO on oldest unACKed segment
    if (inflightSlots.length > 0) {
      const oldest = inflightSlots[0];
      if (oldest.sendTimestamp && now - oldest.sendTimestamp > this.state.rtoMs) {
        this.state.retransmissions++;
        oldest.retransmissions++;
        oldest.sendTimestamp = now;

        if (this.config.congestionControl !== 'FIXED_WINDOW') {
          this.state.congestionState = 'TIMEOUT_RESET';
          this.state.ssthresh = Math.max(2, Math.floor(this.state.cwnd / 2));
          this.state.cwnd = 1.0;
          this.state.rtoMs = Math.min(2500, this.state.rtoMs * 1.5);
        }

        this.sendPacket(oldest.seqNum, oldest.data, true, false, (pkt) => {
          this.handleReceiverArrival(pkt, 1001, this.receivedChunksMap);
        });
      }
    }

    // Send next new packet if window allows
    if (inflightSlots.length < effectiveWindow && this.chunkIndex < totalChunks) {
      const slot = this.state.senderWindow[this.chunkIndex];
      if (slot && slot.status === 'USABLE') {
        slot.status = 'SENT_UNACKED';
        slot.sendTimestamp = now;
        this.chunkIndex++;

        this.sendPacket(slot.seqNum, slot.data, false, false, (pkt) => {
          this.handleReceiverArrival(pkt, 1001, this.receivedChunksMap);
        });
      }
    }

    // Compute BDP (Bandwidth Delay Product) = (Bandwidth bps * RTT s) / 8 bytes
    const bdpBytes = Math.round(
      ((this.config.linkBandwidthMbps * 1_000_000) * (this.state.srttMs / 1000)) / 8
    );

    // Metrics point
    const throughputKbps =
      this.state.elapsedSec > 0
        ? (this.state.totalBytesDelivered * 8) / (this.state.elapsedSec * 1000)
        : 0;

    this.state.metricsHistory.push({
      timeSec: Math.round(this.state.elapsedSec * 10) / 10,
      throughputKbps: Math.round(throughputKbps),
      cwnd: Math.round(this.state.cwnd * 10) / 10,
      rwnd: this.state.peerRwnd,
      inflight: inflightSlots.length,
      rttMs: Math.round(this.state.srttMs),
      rtoMs: Math.round(this.state.rtoMs),
      bdpBytes,
    });

    if (this.state.metricsHistory.length > 50) {
      this.state.metricsHistory.shift();
    }

    // Check completion
    if (
      this.state.l7State.chunksAcked >= totalChunks &&
      this.state.l7State.status !== 'VERIFIED'
    ) {
      this.finishTransfer();
    }

    this.notify();
  }

  private sendPacket(
    seqNum: number,
    data: string,
    isRetransmission: boolean,
    isFastRetransmit: boolean,
    onArrival: (pkt: TransportPacket) => void
  ) {
    this.state.packetsSent++;

    let isDropped = Math.random() < this.config.lossRate;
    let isCorrupted = !isDropped && Math.random() < this.config.corruptRate;
    const isReordered = !isDropped && Math.random() < this.config.reorderRate;

    // Check if manually forced chaos
    if (this.state.nextDropForced) {
      isDropped = true;
      this.state.nextDropForced = false;
    }
    if (this.state.nextCorruptForced) {
      isCorrupted = true;
      this.state.nextCorruptForced = false;
    }

    let delay =
      (this.config.baseDelayMs + (Math.random() * 2 - 1) * this.config.jitterMs) /
      this.config.simulationSpeed;
    if (isReordered) delay += 120 / this.config.simulationSpeed;

    const chk = computeRFC1071Checksum(data);
    const header: PacketHeader = {
      seqNum,
      ackNum: this.state.serverSeq,
      windowSize: this.config.windowSize,
      checksum: isCorrupted ? (chk ^ 0x00ff) : chk,
      flags: PacketFlag.ACK | PacketFlag.PSH,
      payloadLen: data.length,
    };

    const pkt: TransportPacket = {
      id: 'pkt-' + seqNum + '-' + Date.now(),
      header,
      payload: data,
      timestamp: Date.now(),
      direction: 'CLIENT_TO_SERVER',
      isRetransmission,
      isFastRetransmit,
      isDropped,
      isCorrupted,
      isReordered,
      dropReason: isDropped
        ? 'Dropped by simulated tc netem loss rule'
        : isCorrupted
        ? 'Checksum mismatch: 16-bit 1s complement error'
        : undefined,
      simulatedDelayMs: Math.round(delay),
      rawHex: generatePacketHex(header, data),
    };

    this.state.recentPackets.push(pkt);
    if (this.state.recentPackets.length > 70) this.state.recentPackets.shift();

    if (isDropped) {
      this.state.packetsDropped++;
      this.notify();
      return;
    }

    if (isCorrupted) {
      this.state.corruptedPackets++;
      this.notify();
      return;
    }

    setTimeout(() => {
      onArrival(pkt);
    }, delay);
  }

  private handleReceiverArrival(
    pkt: TransportPacket,
    _baseSeq: number,
    receivedChunksMap: Map<number, string>
  ) {
    const seq = pkt.header.seqNum;
    const slotIdx = seq - 1001;

    receivedChunksMap.set(seq, pkt.payload);
    if (this.state.receiverBuffer[slotIdx]) {
      this.state.receiverBuffer[slotIdx].data = pkt.payload;
    }

    // Determine contiguous delivered ACK
    let currentInOrderAck = 1001;
    while (receivedChunksMap.has(currentInOrderAck)) {
      const idx = currentInOrderAck - 1001;
      if (this.state.receiverBuffer[idx]) {
        this.state.receiverBuffer[idx].status = 'DELIVERED';
      }
      currentInOrderAck++;
    }

    // Identify out-of-order buffered chunks & compute RFC 2018 SACK blocks
    const sackBlocks: SackBlock[] = [];
    let sackStart: number | null = null;
    let sackEnd: number | null = null;

    const sortedSeqs = Array.from(receivedChunksMap.keys()).sort((a, b) => a - b);
    for (const s of sortedSeqs) {
      if (s >= currentInOrderAck) {
        const idx = s - 1001;
        if (this.state.receiverBuffer[idx]) {
          this.state.receiverBuffer[idx].status = 'BUFFERED_OUT_OF_ORDER';
        }

        if (sackStart === null) {
          sackStart = s;
          sackEnd = s + 1;
        } else if (s === sackEnd) {
          sackEnd = s + 1;
        } else {
          if (sackStart !== null && sackEnd !== null) {
            sackBlocks.push({ leftEdge: sackStart, rightEdge: sackEnd });
          }
          sackStart = s;
          sackEnd = s + 1;
        }
      }
    }
    if (sackStart !== null && sackEnd !== null) {
      sackBlocks.push({ leftEdge: sackStart, rightEdge: sackEnd });
    }

    this.state.activeSackBlocks = sackBlocks;

    // Available receive window
    const bufferedOutOfOrderCount = sortedSeqs.filter((s) => s >= currentInOrderAck).length;
    const advertisedRwnd = Math.max(1, this.config.windowSize - bufferedOutOfOrderCount);
    this.state.peerRwnd = advertisedRwnd;

    // Send ACK back
    const ackH: PacketHeader = {
      seqNum: this.state.serverSeq,
      ackNum: currentInOrderAck,
      windowSize: advertisedRwnd,
      checksum: 0xeeee,
      flags: PacketFlag.ACK,
      payloadLen: 0,
      sackBlocks: this.config.useSack ? sackBlocks : undefined,
    };

    const ackPkt: TransportPacket = {
      id: 'ack-' + currentInOrderAck + '-' + Date.now(),
      header: ackH,
      payload: '',
      timestamp: Date.now(),
      direction: 'SERVER_TO_CLIENT',
      rawHex: generatePacketHex(ackH, ''),
    };

    const isAckDropped = Math.random() < this.config.lossRate * 0.4;
    if (isAckDropped) {
      ackPkt.isDropped = true;
      ackPkt.dropReason = 'ACK dropped by netem';
      this.state.recentPackets.push(ackPkt);
      this.notify();
      return;
    }

    setTimeout(() => {
      this.handleAckArrival(ackPkt, currentInOrderAck);
    }, this.config.baseDelayMs / this.config.simulationSpeed);
  }

  private handleAckArrival(ackPkt: TransportPacket, cumulativeAck: number) {
    this.state.recentPackets.push(ackPkt);
    if (this.state.recentPackets.length > 70) this.state.recentPackets.shift();

    let newlyAckedCount = 0;

    // 1. Process Cumulative ACK
    this.state.senderWindow.forEach((slot) => {
      if (slot.seqNum < cumulativeAck && slot.status !== 'ACKED') {
        slot.status = 'ACKED';
        newlyAckedCount++;
        this.state.totalBytesDelivered += slot.data.length;
        this.state.l7State.sentBytes += slot.data.length;
        this.state.l7State.receivedBytes += slot.data.length;
        this.state.l7State.chunksAcked++;
      }
    });

    // 2. Process SACK Blocks (RFC 2018)
    if (this.config.useSack && ackPkt.header.sackBlocks && ackPkt.header.sackBlocks.length > 0) {
      this.state.sackEvents++;
      for (const block of ackPkt.header.sackBlocks) {
        this.state.senderWindow.forEach((slot) => {
          if (slot.seqNum >= block.leftEdge && slot.seqNum < block.rightEdge) {
            slot.isSacked = true;
          }
        });
      }
    }

    if (newlyAckedCount > 0) {
      // CWND Increase
      if (this.config.congestionControl !== 'FIXED_WINDOW') {
        if (this.state.cwnd < this.state.ssthresh) {
          this.state.cwnd += newlyAckedCount;
          this.state.congestionState = 'SLOW_START';
        } else {
          this.state.cwnd += newlyAckedCount / Math.max(1, this.state.cwnd);
          this.state.congestionState = 'CONGESTION_AVOIDANCE';
        }
      }

      // Jacobson/Karels RTT sample
      const sampleRtt = this.config.baseDelayMs * 2;
      const alpha = 0.125;
      const beta = 0.25;
      this.state.rttvarMs =
        (1 - beta) * this.state.rttvarMs + beta * Math.abs(this.state.srttMs - sampleRtt);
      this.state.srttMs = (1 - alpha) * this.state.srttMs + alpha * sampleRtt;
      this.state.rtoMs = Math.max(
        100,
        Math.min(2500, this.state.srttMs + 4 * this.state.rttvarMs)
      );

      this.dupAckCounter = 0;
      this.lastAckNum = cumulativeAck;
    } else if (cumulativeAck === this.lastAckNum) {
      // Duplicate ACK
      this.dupAckCounter++;
      if (this.dupAckCounter === 3) {
        this.state.fastRetransmits++;
        this.state.congestionState = 'FAST_RECOVERY';

        const targetSlot = this.state.senderWindow.find(
          (s) => s.seqNum === cumulativeAck
        );
        if (targetSlot) {
          if (this.config.congestionControl === 'RENO') {
            this.state.ssthresh = Math.max(2, Math.floor(this.state.cwnd / 2));
            this.state.cwnd = this.state.ssthresh + 3;
          } else if (this.config.congestionControl === 'TAHOE') {
            this.state.ssthresh = Math.max(2, Math.floor(this.state.cwnd / 2));
            this.state.cwnd = 1.0;
          }

          targetSlot.retransmissions++;
          targetSlot.sendTimestamp = Date.now();
          this.sendPacket(targetSlot.seqNum, targetSlot.data, true, true, () => {});
        }
      }
    }

    this.notify();
  }

  private async finishTransfer() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }

    let reconstructed = '';
    for (let i = 0; i < this.chunksToSend.length; i++) {
      reconstructed += this.receivedChunksMap.get(1001 + i) || '';
    }

    const receivedHash = await sha256Hex(reconstructed);
    const passed =
      receivedHash.toLowerCase() === this.state.l7State.sourceHash.toLowerCase();

    this.state.l7State.receivedHash = receivedHash;
    this.state.l7State.status = passed ? 'VERIFIED' : 'FAILED';
    this.state.isRunning = false;
    this.notify();
  }
}
