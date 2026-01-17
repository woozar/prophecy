// Server-side SSE event emitter for real-time updates
// This is a singleton that manages all SSE connections
// Uses globalThis to persist across Hot Module Replacement in development
import { debug } from '@/lib/logger';

declare global {
  var sseEmitterInstance: SSEEventEmitter | undefined;
}

export type SSEEventType =
  | 'round:created'
  | 'round:updated'
  | 'round:deleted'
  | 'user:created'
  | 'user:updated'
  | 'user:deleted'
  | 'prophecy:created'
  | 'prophecy:updated'
  | 'prophecy:deleted'
  | 'prophecy:rated'
  | 'rating:created'
  | 'rating:updated'
  | 'rating:deleted'
  | 'badge:awarded'
  | 'badge:revoked'
  | 'auditLog:created';

export interface SSEEvent {
  type: SSEEventType;
  data: unknown;
}

type SSEClient = {
  id: string;
  controller: ReadableStreamDefaultController<Uint8Array>;
  lastActivity: number;
};

// Heartbeat interval: 30 seconds
const HEARTBEAT_INTERVAL = 30000;
// Stale client timeout: 60 seconds without activity
const STALE_CLIENT_TIMEOUT = 60000;

class SSEEventEmitter {
  private readonly clients: Map<string, SSEClient> = new Map();
  private readonly encoder = new TextEncoder();
  private heartbeatInterval: ReturnType<typeof setInterval> | null = null;

  constructor() {
    this.startHeartbeat();
  }

  private startHeartbeat(): void {
    // Don't start multiple intervals
    if (this.heartbeatInterval) return;

    this.heartbeatInterval = setInterval(() => {
      const now = Date.now();

      for (const [id, client] of this.clients) {
        // Remove stale clients (no activity for 60s)
        if (now - client.lastActivity > STALE_CLIENT_TIMEOUT) {
          debug.log(`[SSE] Removing stale client: ${id}`);
          this.removeClient(id);
          continue;
        }

        // Send ping to active clients
        try {
          client.controller.enqueue(this.encoder.encode(':ping\n\n'));
        } catch {
          // Client connection failed, remove it
          this.removeClient(id);
        }
      }
    }, HEARTBEAT_INTERVAL);
  }

  addClient(id: string, controller: ReadableStreamDefaultController<Uint8Array>): void {
    this.clients.set(id, { id, controller, lastActivity: Date.now() });
    debug.log(`[SSE] Client connected: ${id}. Total clients: ${this.clients.size}`);
  }

  removeClient(id: string): void {
    this.clients.delete(id);
    debug.log(`[SSE] Client disconnected: ${id}. Total clients: ${this.clients.size}`);
  }

  broadcast(event: SSEEvent): void {
    const message = `event: ${event.type}\ndata: ${JSON.stringify(event.data)}\n\n`;
    const encoded = this.encoder.encode(message);

    for (const [id, client] of this.clients) {
      try {
        client.controller.enqueue(encoded);
        // Update last activity on successful send
        client.lastActivity = Date.now();
      } catch (error) {
        debug.error(`[SSE] Error sending to client ${id}:`, error);
        this.removeClient(id);
      }
    }
  }

  sendToClient(clientId: string, event: SSEEvent): void {
    const client = this.clients.get(clientId);
    if (!client) return;

    const message = `event: ${event.type}\ndata: ${JSON.stringify(event.data)}\n\n`;
    const encoded = this.encoder.encode(message);

    try {
      client.controller.enqueue(encoded);
      // Update last activity on successful send
      client.lastActivity = Date.now();
    } catch (error) {
      debug.error(`[SSE] Error sending to client ${clientId}:`, error);
      this.removeClient(clientId);
    }
  }

  getClientCount(): number {
    return this.clients.size;
  }
}

// Singleton instance - persisted in globalThis to survive HMR
export const sseEmitter = globalThis.sseEmitterInstance ?? new SSEEventEmitter();

if (process.env.NODE_ENV !== 'production') {
  globalThis.sseEmitterInstance = sseEmitter;
}
