// Server-side SSE event emitter for real-time updates
// This is a singleton that manages all SSE connections
// Uses globalThis to persist across Hot Module Replacement in development

declare global {
  // eslint-disable-next-line no-var
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
  | 'rating:updated';

export interface SSEEvent {
  type: SSEEventType;
  data: unknown;
}

type SSEClient = {
  id: string;
  controller: ReadableStreamDefaultController<Uint8Array>;
};

class SSEEventEmitter {
  private readonly clients: Map<string, SSEClient> = new Map();
  private readonly encoder = new TextEncoder();

  addClient(id: string, controller: ReadableStreamDefaultController<Uint8Array>): void {
    this.clients.set(id, { id, controller });
    console.log(`[SSE] Client connected: ${id}. Total clients: ${this.clients.size}`);
  }

  removeClient(id: string): void {
    this.clients.delete(id);
    console.log(`[SSE] Client disconnected: ${id}. Total clients: ${this.clients.size}`);
  }

  broadcast(event: SSEEvent): void {
    const message = `event: ${event.type}\ndata: ${JSON.stringify(event.data)}\n\n`;
    const encoded = this.encoder.encode(message);

    for (const [id, client] of this.clients) {
      try {
        client.controller.enqueue(encoded);
      } catch (error) {
        console.error(`[SSE] Error sending to client ${id}:`, error);
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
    } catch (error) {
      console.error(`[SSE] Error sending to client ${clientId}:`, error);
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
