/**
 * Protocol Definitions for L4 (Transport over UDP) and L7 (Application Protocol)
 */

export enum PacketFlag {
  SYN = 0x01, // Connection initiation
  ACK = 0x02, // Acknowledgement
  FIN = 0x04, // Connection teardown
  RST = 0x08, // Reset connection
  PSH = 0x10, // Push data immediately to L7
}

export interface SackBlock {
  leftEdge: number;
  rightEdge: number;
}

export interface PacketHeader {
  seqNum: number;       // 32-bit sequence number
  ackNum: number;       // 32-bit acknowledgement number
  windowSize: number;   // 16-bit advertised receive window (rwnd)
  checksum: number;     // 16-bit internet checksum (RFC 1071)
  flags: number;        // 8-bit flags (SYN, ACK, FIN, RST, PSH)
  payloadLen: number;   // 16-bit payload length
  sackBlocks?: SackBlock[]; // RFC 2018 Selective ACKs
}

export interface TransportPacket {
  id: string;
  header: PacketHeader;
  payload: string;      // UTF-8 payload or hex string
  timestamp: number;
  direction: 'CLIENT_TO_SERVER' | 'SERVER_TO_CLIENT';
  // Simulation metadata
  isRetransmission?: boolean;
  isFastRetransmit?: boolean;
  isDuplicateAck?: boolean;
  isDropped?: boolean;
  isCorrupted?: boolean;
  isReordered?: boolean;
  isManualInjection?: boolean;
  dropReason?: string;
  simulatedDelayMs?: number;
  rawHex?: string;
}

export enum ConnectionState {
  CLOSED = 'CLOSED',
  SYN_SENT = 'SYN_SENT',
  SYN_RCVD = 'SYN_RCVD',
  ESTABLISHED = 'ESTABLISHED',
  FIN_WAIT_1 = 'FIN_WAIT_1',
  FIN_WAIT_2 = 'FIN_WAIT_2',
  CLOSE_WAIT = 'CLOSE_WAIT',
  LAST_ACK = 'LAST_ACK',
  TIME_WAIT = 'TIME_WAIT',
}

export type CongestionState = 'SLOW_START' | 'CONGESTION_AVOIDANCE' | 'FAST_RECOVERY' | 'TIMEOUT_RESET';

export type CongestionAlgorithm = 'RENO' | 'TAHOE' | 'FIXED_WINDOW';

export interface NetemConfig {
  lossRate: number;        // 0.0 to 0.5 (0% to 50%)
  baseDelayMs: number;     // 10 to 400 ms
  jitterMs: number;        // 0 to 50 ms
  reorderRate: number;     // 0.0 to 0.3
  corruptRate: number;     // 0.0 to 0.2
  windowSize: number;      // 1 to 32 segments
  congestionControl: CongestionAlgorithm;
  useSack: boolean;        // RFC 2018 Selective Acknowledgment enabled
  mss: number;             // Maximum segment size (bytes)
  initialRtoMs: number;    // Initial RTO timeout in ms
  simulationSpeed: number; // 0.25 to 5.0 (playback multiplier)
  linkBandwidthMbps: number; // For BDP calculator (e.g. 10 Mbps)
}

export interface WindowSlot {
  seqNum: number;
  data: string;
  status: 'ACKED' | 'SENT_UNACKED' | 'USABLE' | 'BLOCKED';
  sendTimestamp?: number;
  retransmissions: number;
  isSacked?: boolean;
}

export interface ReceiverSlot {
  seqNum: number;
  data: string;
  status: 'DELIVERED' | 'BUFFERED_OUT_OF_ORDER' | 'MISSING_HOLE';
}

export interface L7FileTransferState {
  filename: string;
  totalSize: number;
  sentBytes: number;
  receivedBytes: number;
  sourceHash: string;
  receivedHash: string;
  status: 'IDLE' | 'TRANSFERRING' | 'PAUSED' | 'VERIFIED' | 'FAILED' | 'SEVERED';
  chunksTotal: number;
  chunksAcked: number;
  offset: number; // for resume functionality
}

export interface MetricPoint {
  timeSec: number;
  throughputKbps: number;
  cwnd: number;
  rwnd: number;
  inflight: number;
  rttMs: number;
  rtoMs: number;
  bdpBytes: number;
}

export interface BenchmarkResult {
  windowSize: number;
  lossRate: number;
  totalBytes: number;
  transferTimeSec: number;
  throughputKbps: number;
  packetsSent: number;
  retransmissions: number;
  packetLossRecoveryRate: number;
  sackEnabled: boolean;
}
