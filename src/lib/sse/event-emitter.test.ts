import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { sseEmitter } from './event-emitter';

describe('SSEEventEmitter', () => {
  const createMockController = () => {
    const chunks: Uint8Array[] = [];
    return {
      enqueue: vi.fn((chunk: Uint8Array) => chunks.push(chunk)),
      close: vi.fn(),
      error: vi.fn(),
      chunks,
    } as unknown as ReadableStreamDefaultController<Uint8Array>;
  };

  // We need to manually track and remove clients since sseEmitter is a singleton
  const addedClients: string[] = [];

  beforeEach(() => {
    vi.useFakeTimers();
    // Clean up any previously added clients
    addedClients.forEach((id) => sseEmitter.removeClient(id));
    addedClients.length = 0;
  });

  afterEach(() => {
    // Clean up clients added during this test
    addedClients.forEach((id) => sseEmitter.removeClient(id));
    addedClients.length = 0;
    vi.useRealTimers();
  });

  const trackClient = (id: string) => {
    addedClients.push(id);
    return id;
  };

  describe('addClient', () => {
    it('adds a client and increments count', () => {
      const controller = createMockController();
      const initialCount = sseEmitter.getClientCount();

      sseEmitter.addClient(trackClient('test-client-1'), controller);

      expect(sseEmitter.getClientCount()).toBe(initialCount + 1);
    });

    it('adds multiple clients', () => {
      const initialCount = sseEmitter.getClientCount();

      sseEmitter.addClient(trackClient('test-client-1'), createMockController());
      sseEmitter.addClient(trackClient('test-client-2'), createMockController());
      sseEmitter.addClient(trackClient('test-client-3'), createMockController());

      expect(sseEmitter.getClientCount()).toBe(initialCount + 3);
    });

    it('overwrites existing client with same id', () => {
      const controller1 = createMockController();
      const controller2 = createMockController();
      const initialCount = sseEmitter.getClientCount();

      sseEmitter.addClient(trackClient('test-client-1'), controller1);
      const countAfterFirst = sseEmitter.getClientCount();
      sseEmitter.addClient('test-client-1', controller2);

      expect(sseEmitter.getClientCount()).toBe(countAfterFirst);
      expect(sseEmitter.getClientCount()).toBe(initialCount + 1);
    });
  });

  describe('removeClient', () => {
    it('removes a client and decrements count', () => {
      const id = trackClient('test-client-remove');
      sseEmitter.addClient(id, createMockController());
      const countWithClient = sseEmitter.getClientCount();

      sseEmitter.removeClient(id);
      addedClients.pop(); // Remove from tracking since we manually removed it

      expect(sseEmitter.getClientCount()).toBe(countWithClient - 1);
    });

    it('handles removing non-existent client', () => {
      const countBefore = sseEmitter.getClientCount();
      expect(() => sseEmitter.removeClient('non-existent-client')).not.toThrow();
      expect(sseEmitter.getClientCount()).toBe(countBefore);
    });

    it('only removes the specified client', () => {
      sseEmitter.addClient(trackClient('test-client-a'), createMockController());
      sseEmitter.addClient(trackClient('test-client-b'), createMockController());
      const countWithBoth = sseEmitter.getClientCount();

      sseEmitter.removeClient('test-client-a');
      addedClients.shift();

      expect(sseEmitter.getClientCount()).toBe(countWithBoth - 1);
    });
  });

  describe('broadcast', () => {
    it('sends event to all connected clients', () => {
      const controller1 = createMockController();
      const controller2 = createMockController();

      sseEmitter.addClient(trackClient('bc-client-1'), controller1);
      sseEmitter.addClient(trackClient('bc-client-2'), controller2);

      sseEmitter.broadcast({
        type: 'round:created',
        data: { id: 'round-123', title: 'Test Round' },
      });

      expect(controller1.enqueue).toHaveBeenCalled();
      expect(controller2.enqueue).toHaveBeenCalled();
    });

    it('formats event correctly as SSE message', () => {
      const controller = createMockController();
      sseEmitter.addClient(trackClient('format-client'), controller);

      sseEmitter.broadcast({
        type: 'prophecy:updated',
        data: { id: 'prophecy-1' },
      });

      const call = controller.enqueue.mock.calls[0][0];
      const message = new TextDecoder().decode(call);
      expect(message).toContain('event: prophecy:updated');
      expect(message).toContain('data: {"id":"prophecy-1"}');
    });

    it('handles client error during broadcast', () => {
      const failingController = {
        enqueue: vi.fn(() => {
          throw new Error('Connection closed');
        }),
      } as unknown as ReadableStreamDefaultController<Uint8Array>;

      const id = trackClient('failing-client');
      sseEmitter.addClient(id, failingController);
      const countBefore = sseEmitter.getClientCount();

      // Should not throw
      expect(() => sseEmitter.broadcast({ type: 'round:updated', data: {} })).not.toThrow();

      // Client should be removed after error
      expect(sseEmitter.getClientCount()).toBe(countBefore - 1);
      addedClients.pop(); // Remove from tracking since it was auto-removed
    });

    it('continues broadcasting to other clients when one fails', () => {
      const failingController = {
        enqueue: vi.fn(() => {
          throw new Error('Connection closed');
        }),
      } as unknown as ReadableStreamDefaultController<Uint8Array>;
      const workingController = createMockController();

      const failId = trackClient('fail-client');
      const workId = trackClient('work-client');
      sseEmitter.addClient(failId, failingController);
      sseEmitter.addClient(workId, workingController);
      const countBefore = sseEmitter.getClientCount();

      sseEmitter.broadcast({ type: 'user:created', data: { id: 'user-1' } });

      expect(workingController.enqueue).toHaveBeenCalled();
      expect(sseEmitter.getClientCount()).toBe(countBefore - 1);
      // Remove failed client from tracking
      const failIdx = addedClients.indexOf(failId);
      if (failIdx >= 0) addedClients.splice(failIdx, 1);
    });
  });

  describe('sendToClient', () => {
    it('sends event to specific client', () => {
      const controller1 = createMockController();
      const controller2 = createMockController();

      sseEmitter.addClient(trackClient('send-client-1'), controller1);
      sseEmitter.addClient(trackClient('send-client-2'), controller2);

      sseEmitter.sendToClient('send-client-1', {
        type: 'rating:created',
        data: { id: 'rating-1' },
      });

      expect(controller1.enqueue).toHaveBeenCalled();
      expect(controller2.enqueue).not.toHaveBeenCalled();
    });

    it('ignores non-existent client', () => {
      const controller = createMockController();
      sseEmitter.addClient(trackClient('existing-client'), controller);

      // Should not throw
      expect(() =>
        sseEmitter.sendToClient('non-existent', {
          type: 'round:deleted',
          data: { id: 'round-1' },
        })
      ).not.toThrow();

      expect(controller.enqueue).not.toHaveBeenCalled();
    });

    it('removes client on error', () => {
      const failingController = {
        enqueue: vi.fn(() => {
          throw new Error('Connection closed');
        }),
      } as unknown as ReadableStreamDefaultController<Uint8Array>;

      const id = trackClient('error-client');
      sseEmitter.addClient(id, failingController);
      const countBefore = sseEmitter.getClientCount();

      sseEmitter.sendToClient(id, {
        type: 'user:updated',
        data: {},
      });

      expect(sseEmitter.getClientCount()).toBe(countBefore - 1);
      addedClients.pop();
    });
  });

  describe('getClientCount', () => {
    it('returns count after adding clients', () => {
      const initialCount = sseEmitter.getClientCount();

      sseEmitter.addClient(trackClient('count-client-1'), createMockController());
      sseEmitter.addClient(trackClient('count-client-2'), createMockController());

      expect(sseEmitter.getClientCount()).toBe(initialCount + 2);
    });

    it('returns correct count after removing clients', () => {
      sseEmitter.addClient(trackClient('rem-count-1'), createMockController());
      sseEmitter.addClient(trackClient('rem-count-2'), createMockController());
      const countWithBoth = sseEmitter.getClientCount();

      sseEmitter.removeClient('rem-count-1');
      addedClients.shift();

      expect(sseEmitter.getClientCount()).toBe(countWithBoth - 1);
    });
  });

  // Note: heartbeat tests are skipped because the SSEEventEmitter singleton
  // starts its interval at module load time, before we can set up fake timers.
  // The heartbeat behavior is implicitly tested through integration tests.
});
