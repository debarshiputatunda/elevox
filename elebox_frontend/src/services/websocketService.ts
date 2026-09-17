import { tokenStorage } from '@/utils/storage';

export type WebSocketConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'error';

export interface TelemetrySocketMessage {
  type: 'telemetry' | 'notification' | 'heartbeat' | 'pong' | 'subscribed' | 'priority';
  data: Record<string, unknown>;
}

const getWebSocketBaseUrl = (): string => {
  const configured = import.meta.env.VITE_WS_BASE_URL;
  if (configured) {
    return configured.replace(/\/$/, '');
  }

  const apiBase = import.meta.env.VITE_API_BASE_URL ?? 'http://127.0.0.1:8001';
  const url = new URL(apiBase);
  url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
  return url.origin;
};

export const buildTelemetryWebSocketUrl = (): string | null => {
  const token = tokenStorage.getAccessToken();
  if (!token) {
    return null;
  }

  const params = new URLSearchParams({ token });
  return `${getWebSocketBaseUrl()}/ws/telemetry?${params.toString()}`;
};

export class TelemetryWebSocketClient {
  private socket: WebSocket | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private pendingBoxIds: number[] = [];
  private pendingHighPriority: number[] = [];
  private shouldReconnect = true;

  constructor(
    private readonly onMessage: (message: TelemetrySocketMessage) => void,
    private readonly onStatusChange: (status: WebSocketConnectionStatus) => void,
  ) {}

  connect() {
    this.shouldReconnect = true;
    this.openSocket();
  }

  disconnect() {
    this.shouldReconnect = false;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
    if (this.socket) {
      this.socket.onclose = null;
      this.socket.close();
      this.socket = null;
    }
    this.onStatusChange('disconnected');
  }

  subscribe(boxIds: number[], highPriorityBoxIds: number[] = []) {
    this.pendingBoxIds = boxIds;
    this.pendingHighPriority = highPriorityBoxIds;
    if (this.socket?.readyState === WebSocket.OPEN) {
      this.sendSubscription();
    }
  }

  private sendSubscription() {
    if (this.socket?.readyState !== WebSocket.OPEN) return;
    this.socket.send(JSON.stringify({
      action: 'subscribe',
      box_ids: this.pendingBoxIds.join(','),
      high_priority_box_ids: this.pendingHighPriority.join(','),
    }));
  }

  private openSocket() {
    const url = buildTelemetryWebSocketUrl();
    if (!url) {
      this.onStatusChange('error');
      return;
    }

    if (this.socket) {
      this.socket.onclose = null;
      this.socket.close();
    }

    this.onStatusChange('connecting');
    this.socket = new WebSocket(url);

    this.socket.onopen = () => {
      this.onStatusChange('connected');
      this.sendSubscription();
      this.startHeartbeat();
    };

    this.socket.onmessage = (event) => {
      try {
        const payload = JSON.parse(String(event.data)) as TelemetrySocketMessage;
        this.onMessage(payload);
      } catch {
        // Ignore malformed payloads.
      }
    };

    this.socket.onerror = () => {
      this.onStatusChange('error');
    };

    this.socket.onclose = () => {
      this.stopHeartbeat();
      this.onStatusChange('disconnected');
      if (this.shouldReconnect) {
        this.reconnectTimer = setTimeout(() => this.openSocket(), 1000);
      }
    };
  }

  private startHeartbeat() {
    this.stopHeartbeat();
    this.heartbeatTimer = setInterval(() => {
      if (this.socket?.readyState === WebSocket.OPEN) {
        this.socket.send(JSON.stringify({ action: 'ping' }));
      }
    }, 25000);
  }

  private stopHeartbeat() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }
}
