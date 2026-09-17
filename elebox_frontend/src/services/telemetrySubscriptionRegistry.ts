import {
  TelemetryWebSocketClient,
  type TelemetrySocketMessage,
  type WebSocketConnectionStatus,
} from '@/services/websocketService';

type MessageHandler = (message: TelemetrySocketMessage) => void;
type StatusHandler = (status: WebSocketConnectionStatus) => void;

interface SubscriptionEntry {
  boxIds: number[];
  highPriorityBoxIds: number[];
}

export class TelemetrySubscriptionRegistry {
  private entries = new Map<string, SubscriptionEntry>();
  private client: TelemetryWebSocketClient | null = null;
  private messageHandler: MessageHandler | null = null;
  private statusHandler: StatusHandler | null = null;

  setHandlers(onMessage: MessageHandler, onStatus: StatusHandler) {
    this.messageHandler = onMessage;
    this.statusHandler = onStatus;
    if (this.client) {
      this.reconnect();
    }
  }

  connect() {
    if (this.client) return;
    this.client = new TelemetryWebSocketClient(
      (message) => this.messageHandler?.(message),
      (status) => {
        this.statusHandler?.(status);
        if (status === 'connected') {
          this.flushSubscriptions();
        }
      },
    );
    this.client.connect();
  }

  disconnect() {
    this.client?.disconnect();
    this.client = null;
  }

  register(id: string, boxIds: number[], highPriorityBoxIds: number[] = []) {
    this.entries.set(id, { boxIds, highPriorityBoxIds });
    this.flushSubscriptions();
  }

  unregister(id: string) {
    this.entries.delete(id);
    this.flushSubscriptions();
  }

  private mergedSubscription(): { boxIds: number[]; highPriority: number[] } {
    const boxIdSet = new Set<number>();
    const highPriority = new Set<number>();
    this.entries.forEach((entry) => {
      entry.boxIds.forEach((id) => boxIdSet.add(id));
      entry.highPriorityBoxIds.forEach((id) => {
        boxIdSet.add(id);
        highPriority.add(id);
      });
    });
    return {
      boxIds: [...boxIdSet].sort((a, b) => a - b),
      highPriority: [...highPriority].sort((a, b) => a - b),
    };
  }

  private flushSubscriptions() {
    if (!this.client) return;
    const { boxIds, highPriority } = this.mergedSubscription();
    this.client.subscribe(boxIds, highPriority);
  }

  reconnect() {
    this.client?.disconnect();
    this.client = null;
    this.connect();
  }
}

export const telemetrySubscriptionRegistry = new TelemetrySubscriptionRegistry();
